import { query } from '../config/database';
import { generatePDFFromTemplate, readPDFFile } from './pdfGenerationService';
import { validateFilledData } from './templateService';
import { getDocumentTemplateById } from './documentTemplateService';

export interface DocumentInstance {
  id: string;
  templateId: string;
  organizationId: string;
  title: string;
  filledData: Record<string, any>;
  pdfUrl: string;
  status: 'draft' | 'final' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentInstanceFilters {
  status?: 'draft' | 'final' | 'archived';
  templateId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function mapRowToInstance(row: any): DocumentInstance {
  return {
    id: row.id,
    templateId: row.template_id,
    organizationId: row.organization_id,
    title: row.title,
    filledData: row.filled_data || {},
    pdfUrl: row.pdf_url,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Create document instance from template
 */
export async function createDocumentInstance(
  templateId: string,
  filledData: Record<string, any>,
  title: string,
  userId: string,
  organizationId: string
): Promise<DocumentInstance> {
  // Fetch template to validate schema
  const template = await getDocumentTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  if (template.status !== 'active') {
    throw new Error('Template is not active');
  }

  // Validate filled data against template schema
  if (template.templateSchema) {
    const validation = validateFilledData(template.templateSchema, filledData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
  }

  // Generate PDF
  const { pdfUrl } = await generatePDFFromTemplate(templateId, filledData, organizationId);

  // Create instance record
  const result = await query(
    `INSERT INTO document_instances
      (template_id, organization_id, title, filled_data, pdf_url, status, created_by)
    VALUES ($1, $2, $3, $4, $5, 'draft', $6)
    RETURNING *`,
    [templateId, organizationId, title, JSON.stringify(filledData), pdfUrl, userId]
  );

  return mapRowToInstance(result.rows[0]);
}

/**
 * Get document instances with filters
 */
export async function getDocumentInstances(
  organizationId: string,
  userId: string,
  userRole: string,
  filters: DocumentInstanceFilters = {}
): Promise<{ instances: DocumentInstance[]; total: number; page: number; limit: number; totalPages: number }> {
  const {
    status,
    templateId,
    search,
    page = 1,
    limit = 20,
  } = filters;

  let whereConditions: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  // Filter by organization (admins/employees see only their org's documents)
  if (userRole !== 'super_admin') {
    whereConditions.push(`organization_id = $${paramIndex}`);
    queryParams.push(organizationId);
    paramIndex++;
  }

  if (status) {
    whereConditions.push(`status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  if (templateId) {
    whereConditions.push(`template_id = $${paramIndex}`);
    queryParams.push(templateId);
    paramIndex++;
  }

  if (search) {
    whereConditions.push(`(title ILIKE $${paramIndex} OR filled_data::text ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  // Exclude archived by default (unless explicitly requested)
  if (!status || status !== 'archived') {
    whereConditions.push(`status != 'archived'`);
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM document_instances ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get instances
  const result = await query(
    `SELECT * FROM document_instances
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  return {
    instances: result.rows.map(mapRowToInstance),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get document instance by ID
 */
export async function getDocumentInstanceById(
  id: string,
  userId: string,
  userRole: string,
  organizationId?: string
): Promise<DocumentInstance | null> {
  const result = await query(
    `SELECT * FROM document_instances WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const instance = mapRowToInstance(result.rows[0]);

  // Permission check: users can only access their org's documents (unless super_admin)
  if (userRole !== 'super_admin' && instance.organizationId !== organizationId) {
    return null;
  }

  return instance;
}

/**
 * Update document instance (only if draft)
 */
export async function updateDocumentInstance(
  id: string,
  filledData: Record<string, any>,
  title?: string,
  status?: 'draft' | 'final',
  userId?: string
): Promise<DocumentInstance | null> {
  // Get existing instance
  const existing = await query(
    `SELECT * FROM document_instances WHERE id = $1`,
    [id]
  );

  if (existing.rows.length === 0) {
    return null;
  }

  const instance = mapRowToInstance(existing.rows[0]);

  // Check if data is being changed
  const dataChanged = JSON.stringify(instance.filledData) !== JSON.stringify(filledData);
  
  // Check if only status is being updated (no data changes)
  const isStatusOnlyUpdate = !dataChanged && status !== undefined && status !== instance.status;

  // Only draft instances can have their data updated
  // But allow status-only updates (changing status without changing data)
  if (dataChanged && instance.status !== 'draft') {
    throw new Error('Only draft documents can be updated');
  }

  // Fetch template for validation (only if data is being changed)
  if (dataChanged) {
    const template = await getDocumentTemplateById(instance.templateId);
    if (template && template.templateSchema) {
      const validation = validateFilledData(template.templateSchema, filledData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    }
  }

  // Regenerate PDF if data changed
  let pdfUrl = instance.pdfUrl;
  
  if (dataChanged) {
    const { pdfUrl: newPdfUrl } = await generatePDFFromTemplate(
      instance.templateId,
      filledData,
      instance.organizationId
    );
    pdfUrl = newPdfUrl;
  }

  // Build update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  updates.push(`filled_data = $${paramIndex++}`);
  values.push(JSON.stringify(filledData));

  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(title);
  }

  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(status);
  }

  if (dataChanged) {
    updates.push(`pdf_url = $${paramIndex++}`);
    values.push(pdfUrl);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const updatedResult = await query(
    `UPDATE document_instances
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *`,
    values
  );

  if (updatedResult.rows.length === 0) {
    return null;
  }

  return mapRowToInstance(updatedResult.rows[0]);
}

/**
 * Delete/archive document instance
 */
export async function deleteDocumentInstance(
  id: string,
  userId: string,
  userRole: string,
  organizationId?: string
): Promise<boolean> {
  // Check permissions
  const instance = await getDocumentInstanceById(id, userId, userRole, organizationId);
  if (!instance) {
    return false;
  }

  // Soft delete by setting status to archived
  const result = await query(
    `UPDATE document_instances
    SET status = 'archived', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
    [id]
  );

  return result.rowCount > 0;
}

/**
 * Download document instance PDF
 */
export async function downloadDocumentInstance(
  id: string,
  userId: string,
  userRole: string,
  organizationId?: string
): Promise<Buffer | null> {
  const instance = await getDocumentInstanceById(id, userId, userRole, organizationId);
  if (!instance) {
    return null;
  }

  try {
    return await readPDFFile(instance.pdfUrl);
  } catch (error) {
    console.error('Error reading PDF file:', error);
    return null;
  }
}


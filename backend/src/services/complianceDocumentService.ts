import { query } from '../config/database';
import { ComplianceDocument } from '../../shared/src/types';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads/compliance';
const maxFileSize = 10 * 1024 * 1024; // 10MB

// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC files are allowed'));
    }
  },
});

/**
 * Upload compliance document
 */
export async function uploadComplianceDocument(
  complianceId: string,
  file: Express.Multer.File,
  uploadedBy: string
): Promise<ComplianceDocument> {
  // Determine file type
  const ext = path.extname(file.originalname).toLowerCase();
  let fileType: 'PDF' | 'DOC' | 'DOCX' = 'PDF';
  if (ext === '.doc') {
    fileType = 'DOC';
  } else if (ext === '.docx') {
    fileType = 'DOCX';
  }

  // In production, upload to S3 instead of local storage
  // For now, use local file path
  const fileUrl = `/uploads/compliance/${file.filename}`;

  const result = await query(
    `INSERT INTO compliance_documents 
    (compliance_id, file_url, file_type, file_name, file_size, uploaded_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, compliance_id, file_url, file_type, file_name, file_size, uploaded_by, uploaded_at, is_deleted`,
    [
      complianceId,
      fileUrl,
      fileType,
      file.originalname,
      file.size,
      uploadedBy,
    ]
  );

  return mapComplianceDocument(result.rows[0]);
}

/**
 * Get compliance documents
 */
export async function getComplianceDocuments(complianceId: string): Promise<ComplianceDocument[]> {
  const result = await query(
    `SELECT id, compliance_id, file_url, file_type, file_name, file_size, uploaded_by, uploaded_at, is_deleted
     FROM compliance_documents
     WHERE compliance_id = $1 AND is_deleted = FALSE
     ORDER BY uploaded_at DESC`,
    [complianceId]
  );

  return result.rows.map(mapComplianceDocument);
}

/**
 * Delete compliance document (soft delete)
 */
export async function deleteComplianceDocument(
  documentId: string,
  complianceId: string
): Promise<boolean> {
  const result = await query(
    `UPDATE compliance_documents 
     SET is_deleted = TRUE 
     WHERE id = $1 AND compliance_id = $2`,
    [documentId, complianceId]
  );

  return result.rowCount > 0;
}

/**
 * Map database row to ComplianceDocument
 */
function mapComplianceDocument(row: any): ComplianceDocument {
  return {
    id: row.id,
    complianceId: row.compliance_id,
    fileUrl: row.file_url,
    fileType: row.file_type,
    fileName: row.file_name,
    fileSize: row.file_size ? parseInt(row.file_size, 10) : undefined,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at.toISOString(),
    isDeleted: row.is_deleted,
  };
}


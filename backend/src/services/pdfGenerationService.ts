import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { getOrganizationData, formatOrganizationDataForTemplate } from './entityMasterService';
import { mergeHeaderAndBody } from './templateService';

import { renderDocumentFromState } from './builderRendererService';

const PDF_OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || './uploads/document-pdfs';

// Ensure PDF output directory exists
fs.mkdir(PDF_OUTPUT_DIR, { recursive: true }).catch(console.error);

export interface PDFOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
}

/**
 * Generate PDF from HTML string using Puppeteer
 * @param html - HTML content to convert to PDF
 * @param options - PDF generation options
 * @returns PDF buffer
 */
export async function generatePDFFromHTML(
  html: string,
  options: PDFOptions = {}
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      margin: options.margin || {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
      printBackground: options.printBackground !== false,
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Generate PDF from template with auto-filled data
 * @param templateId - Template ID
 * @param filledData - User-filled data for body template
 * @param organizationId - Organization ID for auto-fill
 * @returns PDF buffer and file URL
 */
export async function generatePDFFromTemplate(
  templateId: string,
  filledData: Record<string, any>,
  organizationId: string
): Promise<{ pdfBuffer: Buffer; pdfUrl: string }> {
  let completeHTML = '';

  // Case 1: Document Builder State (Modern)
  // Check if filledData looks like a DocumentBuilder state
  if (filledData && Array.isArray(filledData.sections)) {
    console.log('DEBUG: Using Modern Builder Renderer for PDF');
    // Ensure header details are synchronized if they are missing in the state but present in orgData
    if (!filledData.header?.orgName) {
      const orgData = await getOrganizationData(organizationId);
      filledData.header = {
        ...filledData.header,
        orgName: orgData.name,
        orgAddress: orgData.address || '',
        orgGstin: orgData.gst || '',
        orgEmail: orgData.email || '',
      };
    }
    completeHTML = renderDocumentFromState(filledData as any);
  }
  // Case 2: Legacy Template (Handlebars)
  else {
    console.log('DEBUG: Using Legacy Handlebars Renderer for PDF');
    // Fetch template
    const templateResult = await query(
      `SELECT 
        header_template,
        body_template,
        template_schema,
        auto_fill_fields
      FROM document_templates
      WHERE id = $1 AND status = 'active'`,
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      throw new Error('Template not found or not active');
    }

    const template = templateResult.rows[0];
    const headerTemplate = template.header_template || '';
    const bodyTemplate = template.body_template || '';

    // Fetch organization data for auto-fill
    const orgData = await getOrganizationData(organizationId);
    const headerData = formatOrganizationDataForTemplate(orgData);

    // Prepare body data - merge user-filled data with any additional formatting
    const bodyData = {
      ...filledData,
      // Add common formatting helpers
      formatCurrency: (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(amount);
      },
      formatDate: (date: string) => {
        return new Date(date).toLocaleDateString('en-IN');
      },
    };

    // Merge header and body templates
    completeHTML = mergeHeaderAndBody(
      headerTemplate,
      bodyTemplate,
      headerData,
      bodyData
    );
  }

  // Generate PDF from the final HTML
  const pdfBuffer = await generatePDFFromHTML(completeHTML);

  // Save PDF file
  const filename = `document-${uuidv4()}.pdf`;
  const filePath = path.join(PDF_OUTPUT_DIR, filename);
  await fs.writeFile(filePath, pdfBuffer);

  // Return relative URL for storage
  const pdfUrl = `/uploads/document-pdfs/${filename}`;

  return { pdfBuffer, pdfUrl };
}

/**
 * Get PDF file path from URL
 * @param pdfUrl - PDF URL (relative path)
 * @returns Absolute file path
 */
export function getPDFFilePath(pdfUrl: string): string {
  if (pdfUrl.startsWith('/uploads/')) {
    return path.join(process.cwd(), pdfUrl);
  }
  return pdfUrl;
}

/**
 * Read PDF file as buffer
 * @param pdfUrl - PDF URL
 * @returns PDF buffer
 */
export async function readPDFFile(pdfUrl: string): Promise<Buffer> {
  const filePath = getPDFFilePath(pdfUrl);
  return await fs.readFile(filePath);
}


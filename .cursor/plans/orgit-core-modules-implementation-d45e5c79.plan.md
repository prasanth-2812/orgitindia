<!-- d45e5c79-6cb9-4d66-89f2-186d9b6a9a09 c51b4124-9916-4e23-84d5-90131caea1a4 -->
# Document Management Template System Implementation

## Overview

Complete the Document Management Module with template-based document creation. Super Admin creates templates with placeholders, admins/employees use templates to create document instances with editable body fields, and PDFs are generated automatically with Entity Master Data auto-filled in headers.

## Database Changes

### 1. Update Document Templates Table

- **File**: `database/migrations/026_enhance_document_templates.sql`
- Add `header_template TEXT` column to `document_templates` table (separate from body_template)
- Add `template_schema JSONB` column to define editable fields structure (field names, types, validation rules)
- Add `auto_fill_fields JSONB` column to map Entity Master Data fields to template placeholders
- Example schema:
  ```json
  {
    "editableFields": [
      {"name": "amount", "type": "number", "label": "Amount", "required": true},
      {"name": "date", "type": "date", "label": "Invoice Date", "required": true},
      {"name": "items", "type": "array", "label": "Items", "fields": [...]}
    ]
  }
  ```


### 2. Create Document Instances Table

- **File**: `database/migrations/027_create_document_instances.sql`
- Create `document_instances` table to store generated documents:
  - `id UUID PRIMARY KEY`
  - `template_id UUID REFERENCES document_templates(id)`
  - `organization_id UUID REFERENCES organizations(id)`
  - `title VARCHAR(255)` - e.g., "Invoice #INV-001"
  - `filled_data JSONB` - stores user-filled values
  - `pdf_url TEXT` - path to generated PDF
  - `status VARCHAR(50)` - 'draft', 'final', 'archived'
  - `created_by UUID REFERENCES users(id)`
  - `created_at`, `updated_at TIMESTAMP`
- Add indexes for `template_id`, `organization_id`, `created_by`, `status`

## Backend Implementation

### 3. Install PDF Generation Library

- **File**: `backend/package.json`
- Add `puppeteer` or `pdfkit` for PDF generation
- Add `handlebars` or `mustache` for template variable replacement
- Recommendation: Use `puppeteer` for HTML-to-PDF conversion (better formatting control)

### 4. Entity Master Data Service

- **File**: `backend/src/services/entityMasterService.ts` (new)
- Create service to fetch organization data for auto-fill:
  - `getOrganizationData(organizationId: string)` - returns all Entity Master fields
  - Returns: `{name, logoUrl, address, email, mobile, gst, pan, cin, accountingYearStart}`

### 5. Template Variable Replacement Service

- **File**: `backend/src/services/templateService.ts` (new)
- Create service for template processing:
  - `replaceTemplateVariables(template: string, data: Record<string, any>): string` - replaces `{{variableName}}` placeholders
  - `mergeHeaderAndBody(headerTemplate: string, bodyTemplate: string, headerData: Record<string, any>, bodyData: Record<string, any>): string` - combines templates
  - `validateFilledData(schema: any, filledData: any): {valid: boolean, errors: string[]}` - validates user input against template schema

### 6. PDF Generation Service

- **File**: `backend/src/services/pdfGenerationService.ts` (new)
- Create service for PDF generation:
  - `generatePDFFromHTML(html: string, options?: PDFOptions): Promise<Buffer>` - converts HTML to PDF using puppeteer
  - `generatePDFFromTemplate(templateId: string, filledData: any, organizationId: string): Promise<{pdfBuffer: Buffer, pdfUrl: string}>` - full workflow:

    1. Fetch template (header_template + body_template)
    2. Fetch organization data for auto-fill
    3. Replace header placeholders with Entity Master Data
    4. Replace body placeholders with user-filled data
    5. Merge header and body
    6. Generate PDF
    7. Save PDF file
    8. Return PDF buffer and URL

### 7. Update Document Template Service

- **File**: `backend/src/services/documentTemplateService.ts`
- Add methods:
  - `getTemplateForUser(templateId: string, userId: string)` - returns template with schema for editing
  - `getActiveTemplatesForOrganization(organizationId: string)` - returns all active templates available to org

### 8. Document Instance Service

- **File**: `backend/src/services/documentInstanceService.ts` (new)
- Create service for document instances:
  - `createDocumentInstance(templateId: string, filledData: any, userId: string, organizationId: string)` - creates instance and generates PDF
  - `getDocumentInstances(organizationId: string, filters?: {status?, templateId?, search?})` - lists instances
  - `getDocumentInstanceById(id: string, userId: string)` - gets single instance with PDF URL
  - `updateDocumentInstance(id: string, filledData: any, userId: string)` - updates draft instance and regenerates PDF
  - `deleteDocumentInstance(id: string, userId: string)` - soft delete (set status to 'archived')
  - `downloadDocumentInstance(id: string, userId: string)` - returns PDF file stream

### 9. Document Instance Controller

- **File**: `backend/src/controllers/documentInstanceController.ts` (new)
- Create controller endpoints:
  - `POST /api/document-instances` - create new document from template
  - `GET /api/document-instances` - list document instances (with filters)
  - `GET /api/document-instances/:id` - get document instance details
  - `PUT /api/document-instances/:id` - update draft document
  - `DELETE /api/document-instances/:id` - delete/archive document
  - `GET /api/document-instances/:id/download` - download PDF
  - `POST /api/document-instances/:id/share` - generate shareable link (optional)

### 10. Update Document Template Controller

- **File**: `backend/src/controllers/documentTemplateController.ts`
- Add endpoint:
  - `GET /api/document-templates/active` - get active templates for current user's organization
  - `POST /api/document-templates/:id/preview` - preview template with sample data

### 11. Document Instance Routes

- **File**: `backend/src/routes/documentInstanceRoutes.ts` (new)
- Create routes with authentication middleware
- Add role-based access: admins and employees can create/view their org's documents

### 12. Update Main App Routes

- **File**: `backend/src/index.ts`
- Register `documentInstanceRoutes` at `/api/document-instances`

## Frontend Implementation

### 13. Document Instance Service

- **File**: `web/src/services/documentInstanceService.ts` (new)
- Create frontend service:
  - `list(filters?)` - get document instances
  - `getById(id)` - get single instance
  - `create(templateId, filledData)` - create new document
  - `update(id, filledData)` - update draft
  - `delete(id)` - delete instance
  - `download(id)` - download PDF
  - `share(id)` - get shareable link

### 14. Template Service Updates

- **File**: `web/src/services/documentTemplateService.ts`
- Add method:
  - `getActiveTemplates()` - get active templates for current organization

### 15. Document Creation Screen

- **File**: `web/src/screens/admin/documents/CreateDocument.tsx` (new)
- Create UI for document creation:
  - Template selector (dropdown/list of active templates)
  - Dynamic form based on template schema (editable fields)
  - Preview section showing header (auto-filled, read-only) and body (editable)
  - "Generate PDF" button
  - Save as draft or final
- Use `react-hook-form` with dynamic schema validation

### 16. Document Library Screen

- **File**: `web/src/screens/admin/documents/DocumentLibrary.tsx` (new)
- Create UI for document library:
  - List of all document instances (table/cards)
  - Filters: by template type, status, date range
  - Search functionality
  - Actions: View, Edit (if draft), Download PDF, Delete, Share
  - Pagination

### 17. Document Viewer/Editor

- **File**: `web/src/screens/admin/documents/DocumentViewer.tsx` (new)
- Create UI for viewing/editing documents:
  - Display PDF preview (using iframe or PDF.js)
  - Edit form (if draft status)
  - Download, Share, Delete buttons
  - Version history (if implemented)

### 18. Update Admin Documents Route

- **File**: `web/src/App.tsx`
- Add routes:
  - `/admin/documents` → DocumentLibrary
  - `/admin/documents/create` → CreateDocument
  - `/admin/documents/create/:templateId` → CreateDocument (with template pre-selected)
  - `/admin/documents/:id` → DocumentViewer
- Update AdminSidebar to include Documents link

### 19. Super Admin Template Management

- **File**: `web/src/screens/super-admin/document-templates/DocumentTemplateForm.tsx`
- Update template form to include:
  - Header template editor (HTML/text with placeholders)
  - Body template editor (HTML/text with placeholders)
  - Schema builder UI (define editable fields)
  - Auto-fill field mapping UI (map Entity Master fields to placeholders)
  - Preview functionality

## Implementation Details

### Template Placeholder Format

- Use Handlebars-style syntax: `{{companyName}}`, `{{gst}}`, `{{amount}}`, `{{date}}`
- Header placeholders: `{{org.name}}`, `{{org.logoUrl}}`, `{{org.address}}`, `{{org.gst}}`, `{{org.pan}}`, `{{org.cin}}`
- Body placeholders: User-defined based on template schema

### PDF Generation Flow

```
1. User fills form with editable fields
2. Backend fetches template (header + body)
3. Backend fetches organization data
4. Replace header placeholders with org data
5. Replace body placeholders with user data
6. Merge templates
7. Convert HTML to PDF (puppeteer)
8. Save PDF file
9. Store instance record with PDF URL
10. Return PDF to user
```

### Permissions

- Super Admin: Create/edit templates, view all documents
- Admin: Create documents from templates, view/edit/delete own org's documents
- Employee: Create documents from templates, view own org's documents (edit/delete based on permissions)

## Testing Checklist

- [ ] Super Admin can create template with header and body sections
- [ ] Template auto-fills header from Entity Master Data
- [ ] Admin can create document instance from template
- [ ] Only editable fields (body) can be modified
- [ ] PDF generates correctly with merged data
- [ ] Document instances are saved and retrievable
- [ ] Download PDF works
- [ ] Document library shows all instances with filters
- [ ] Edit draft documents works
- [ ] Delete/archive documents works

### To-dos

- [x] Add password_hash column to users table via database migration
- [x] Create password hashing utility functions using bcryptjs
- [x] Update registration controller to accept and hash password
- [x] Create password login endpoint in auth controller
- [x] Add password login route to auth routes
- [x] Add loginWithPassword method to auth service
- [x] Add password fields to registration page
- [x] Update OTP verification to handle password during registration
- [x] Create Login page with Password and OTP tabs
- [x] Update App routes and add navigation between login/register
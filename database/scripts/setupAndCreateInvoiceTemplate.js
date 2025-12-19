// Script to setup document templates table and create invoice template
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orgit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function setupAndCreateTemplate() {
  try {
    console.log('🚀 Setting up document templates...\n');

    // Step 1: Create document_templates table
    console.log('📋 Creating document_templates table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
        body_template TEXT NOT NULL,
        pdf_settings JSONB DEFAULT '{}',
        version INTEGER NOT NULL DEFAULT 1,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Step 2: Add enhanced columns
    console.log('➕ Adding enhanced columns...');
    await pool.query(`
      ALTER TABLE document_templates
      ADD COLUMN IF NOT EXISTS header_template TEXT,
      ADD COLUMN IF NOT EXISTS template_schema JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS auto_fill_fields JSONB DEFAULT '{}'
    `);

    // Step 3: Create indexes
    console.log('📊 Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(type);
      CREATE INDEX IF NOT EXISTS idx_document_templates_status ON document_templates(status);
      CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by)
    `);

    // Step 4: Create document_template_versions table
    console.log('📋 Creating document_template_versions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_template_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        body_template TEXT NOT NULL,
        pdf_settings JSONB DEFAULT '{}',
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(template_id, version)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_document_template_versions_template_id 
      ON document_template_versions(template_id)
    `);

    console.log('✅ Tables created successfully!\n');

    // Step 5: Get super_admin user
    console.log('👤 Finding super_admin user...');
    const userResult = await pool.query(
      `SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.error('❌ No super_admin user found. Please create one first.');
      process.exit(1);
    }

    const superAdminId = userResult.rows[0].id;
    console.log(`✅ Found super_admin user: ${superAdminId}\n`);

    // Step 6: Check if invoice template already exists
    const existingTemplate = await pool.query(
      `SELECT id FROM document_templates WHERE name = 'Tax Invoice Template' LIMIT 1`
    );

    if (existingTemplate.rows.length > 0) {
      console.log('⚠️  Invoice template already exists. Skipping creation.');
      console.log(`   Template ID: ${existingTemplate.rows[0].id}`);
      await pool.end();
      return;
    }

    // Step 7: Create invoice template
    console.log('📝 Creating invoice template...');

    const headerTemplate = `<div style="text-align: center; padding: 20px; border-bottom: 2px solid #000;">
  <h1 style="margin: 0; color: #1a1a1a;">{{org.name}}</h1>
  <p style="margin: 5px 0; color: #666;">{{org.address}}</p>
  <p style="margin: 5px 0; color: #666;">GST: {{org.gst}} | PAN: {{org.pan}} | CIN: {{org.cin}}</p>
</div>`;

    const bodyTemplate = `<div style="padding: 30px;">
  <h2 style="color: #1a1a1a; margin-bottom: 20px;">TAX INVOICE</h2>
  
  <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
    <div>
      <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
      <p><strong>Invoice Date:</strong> {{invoiceDate}}</p>
    </div>
    <div>
      <p><strong>Bill To:</strong></p>
      <p>{{customerName}}</p>
      <p>{{customerAddress}}</p>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background: #f0f0f0;">
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Description</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Quantity</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Rate</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #ddd; padding: 12px;">{{itemDescription}}</td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">{{quantity}}</td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">₹{{rate}}</td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">₹{{amount}}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 30px; text-align: right;">
    <p style="margin: 5px 0;"><strong>Subtotal:</strong> ₹{{totalAmount}}</p>
    <p style="margin: 5px 0;"><strong>GST (18%):</strong> ₹{{gstAmount}}</p>
    <p style="margin: 10px 0; font-size: 18px;"><strong>Grand Total:</strong> ₹{{grandTotal}}</p>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
    <p style="color: #666; font-size: 12px;">Thank you for your business!</p>
  </div>
</div>`;

    const templateSchema = {
      editableFields: [
        { name: 'invoiceNumber', type: 'text', label: 'Invoice Number', required: true, placeholder: 'INV-001' },
        { name: 'invoiceDate', type: 'date', label: 'Invoice Date', required: true },
        { name: 'customerName', type: 'text', label: 'Customer Name', required: true, placeholder: 'Enter customer name' },
        { name: 'customerAddress', type: 'textarea', label: 'Customer Address', required: true, placeholder: 'Enter customer address' },
        { name: 'itemDescription', type: 'text', label: 'Item Description', required: true, placeholder: 'Product/Service description' },
        { name: 'quantity', type: 'number', label: 'Quantity', required: true, placeholder: '1' },
        { name: 'rate', type: 'number', label: 'Rate (₹)', required: true, placeholder: '0.00' },
        { name: 'amount', type: 'number', label: 'Amount (₹)', required: true, placeholder: '0.00' },
        { name: 'totalAmount', type: 'number', label: 'Subtotal (₹)', required: true, placeholder: '0.00' },
        { name: 'gstAmount', type: 'number', label: 'GST Amount (₹)', required: true, placeholder: '0.00' },
        { name: 'grandTotal', type: 'number', label: 'Grand Total (₹)', required: true, placeholder: '0.00' }
      ]
    };

    const autoFillFields = {
      org: {
        name: 'org.name',
        logoUrl: 'org.logoUrl',
        address: 'org.address',
        gst: 'org.gst',
        pan: 'org.pan',
        cin: 'org.cin'
      }
    };

    const pdfSettings = {
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    };

    const result = await pool.query(
      `INSERT INTO document_templates 
      (name, type, status, header_template, body_template, template_schema, auto_fill_fields, pdf_settings, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, type, status`,
      [
        'Tax Invoice Template',
        'Tax Invoice',
        'active',
        headerTemplate,
        bodyTemplate,
        JSON.stringify(templateSchema),
        JSON.stringify(autoFillFields),
        JSON.stringify(pdfSettings),
        superAdminId
      ]
    );

    const template = result.rows[0];

    // Create initial version
    await pool.query(
      `INSERT INTO document_template_versions 
      (template_id, version, body_template, pdf_settings, created_by)
      VALUES ($1, $2, $3, $4, $5)`,
      [template.id, 1, bodyTemplate, JSON.stringify(pdfSettings), superAdminId]
    );

    console.log('\n✅ Invoice template created successfully!');
    console.log(`   Template ID: ${template.id}`);
    console.log(`   Template Name: ${template.name}`);
    console.log(`   Template Type: ${template.type}`);
    console.log(`   Status: ${template.status}`);
    console.log('\n🎉 Setup complete! You can now use this template from the Admin Dashboard.');

    await pool.end();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    await pool.end();
    process.exit(1);
  }
}

setupAndCreateTemplate();


// Script to create an Invoice Template
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orgit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function createInvoiceTemplate() {
  try {
    // Get a super_admin user
    const userResult = await pool.query(
      `SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`
    );

    if (userResult.rows.length === 0) {
      console.error('❌ No super_admin user found. Please create one first.');
      process.exit(1);
    }

    const superAdminId = userResult.rows[0].id;
    console.log(`Using super_admin user: ${superAdminId}`);

    // Invoice template data
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
        {
          name: 'invoiceNumber',
          type: 'text',
          label: 'Invoice Number',
          required: true,
          placeholder: 'INV-001'
        },
        {
          name: 'invoiceDate',
          type: 'date',
          label: 'Invoice Date',
          required: true
        },
        {
          name: 'customerName',
          type: 'text',
          label: 'Customer Name',
          required: true,
          placeholder: 'Enter customer name'
        },
        {
          name: 'customerAddress',
          type: 'textarea',
          label: 'Customer Address',
          required: true,
          placeholder: 'Enter customer address'
        },
        {
          name: 'itemDescription',
          type: 'text',
          label: 'Item Description',
          required: true,
          placeholder: 'Product/Service description'
        },
        {
          name: 'quantity',
          type: 'number',
          label: 'Quantity',
          required: true,
          placeholder: '1'
        },
        {
          name: 'rate',
          type: 'number',
          label: 'Rate (₹)',
          required: true,
          placeholder: '0.00'
        },
        {
          name: 'amount',
          type: 'number',
          label: 'Amount (₹)',
          required: true,
          placeholder: '0.00'
        },
        {
          name: 'totalAmount',
          type: 'number',
          label: 'Subtotal (₹)',
          required: true,
          placeholder: '0.00'
        },
        {
          name: 'gstAmount',
          type: 'number',
          label: 'GST Amount (₹)',
          required: true,
          placeholder: '0.00'
        },
        {
          name: 'grandTotal',
          type: 'number',
          label: 'Grand Total (₹)',
          required: true,
          placeholder: '0.00'
        }
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
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      }
    };

    // Insert template
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
      [
        template.id,
        1,
        bodyTemplate,
        JSON.stringify(pdfSettings),
        superAdminId
      ]
    );

    console.log('\n✅ Invoice template created successfully!');
    console.log(`Template ID: ${template.id}`);
    console.log(`Template Name: ${template.name}`);
    console.log(`Template Type: ${template.type}`);
    console.log(`Status: ${template.status}`);
    console.log('\nYou can now use this template to create invoices from the Admin Dashboard.');

    await pool.end();
  } catch (error) {
    console.error('❌ Error creating invoice template:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

createInvoiceTemplate();


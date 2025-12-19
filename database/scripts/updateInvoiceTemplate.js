// Script to update invoice template to match the detailed invoice format
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orgit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function updateInvoiceTemplate() {
  try {
    console.log('🔄 Updating invoice template to match detailed format...\n');

    // Find existing template
    const existingTemplate = await pool.query(
      `SELECT id FROM document_templates WHERE name = 'Tax Invoice Template' LIMIT 1`
    );

    if (existingTemplate.rows.length === 0) {
      console.error('❌ Invoice template not found. Please run setupAndCreateInvoiceTemplate.js first.');
      process.exit(1);
    }

    const templateId = existingTemplate.rows[0].id;

    // Updated header template (auto-filled from Entity Master Data)
    const headerTemplate = `<div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #000;">
  <div style="margin-bottom: 15px;">
    {{#if org.logoUrl}}
    <img src="{{org.logoUrl}}" alt="{{org.name}}" style="max-height: 80px; margin-bottom: 10px;" />
    {{else}}
    <div style="width: 100px; height: 80px; border: 1px dashed #ccc; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">Add Logo</div>
    {{/if}}
  </div>
  <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #1a1a1a;">{{org.name}}</h1>
  <p style="margin: 5px 0; color: #666; font-size: 14px;">{{org.address}}</p>
  <p style="margin: 5px 0; color: #666; font-size: 14px;">Mobile: {{org.mobile}} | Email: {{org.email}}</p>
  <p style="margin: 10px 0 0; color: #1a1a1a; font-size: 14px; font-weight: bold;">GSTIN - {{org.gst}}</p>
</div>`;

    // Updated body template matching the invoice image structure
    const bodyTemplate = `<div style="padding: 20px; font-family: Arial, sans-serif;">
  <!-- Invoice Title -->
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 20px; font-weight: bold;">TAX INVOICE</h2>
    <p style="margin: 5px 0; font-size: 12px; color: #666;">Original Copy</p>
  </div>

  <!-- Invoice Details -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px;">
    <div>
      <p style="margin: 3px 0;"><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
      <p style="margin: 3px 0;"><strong>Invoice Date:</strong> {{invoiceDate}}</p>
      <p style="margin: 3px 0;"><strong>Due Date:</strong> {{dueDate}}</p>
      <p style="margin: 3px 0;"><strong>Place of Supply:</strong> {{placeOfSupply}}</p>
      <p style="margin: 3px 0;"><strong>Rate Gold:</strong> {{rateGold}}</p>
      <p style="margin: 3px 0;"><strong>Rate Silver:</strong> {{rateSilver}}</p>
    </div>
  </div>

  <!-- Billing and Shipping Details -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px;">
    <div style="width: 48%; border: 1px solid #ddd; padding: 10px;">
      <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: bold;">Billing Details</h3>
      <p style="margin: 3px 0;"><strong>Name:</strong> {{billingName}}</p>
      <p style="margin: 3px 0;"><strong>GSTIN:</strong> {{billingGSTIN}}</p>
      <p style="margin: 3px 0;"><strong>Mobile:</strong> {{billingMobile}}</p>
      <p style="margin: 3px 0;"><strong>Email:</strong> {{billingEmail}}</p>
      <p style="margin: 3px 0;"><strong>Address:</strong> {{billingAddress}}</p>
    </div>
    <div style="width: 48%; border: 1px solid #ddd; padding: 10px;">
      <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: bold;">Shipping Details</h3>
      <p style="margin: 3px 0;"><strong>Name:</strong> {{shippingName}}</p>
      <p style="margin: 3px 0;"><strong>GSTIN:</strong> {{shippingGSTIN}}</p>
      <p style="margin: 3px 0;"><strong>Mobile:</strong> {{shippingMobile}}</p>
      <p style="margin: 3px 0;"><strong>Email:</strong> {{shippingEmail}}</p>
      <p style="margin: 3px 0;"><strong>Address:</strong> {{shippingAddress}}</p>
    </div>
  </div>

  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
    <thead>
      <tr style="background: #f0f0f0;">
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Sr.</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item Description</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">HSN/SAC</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Qty</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Unit</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">List Price</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Disc.</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Tax %</th>
        <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">{{itemSr}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{itemDescription}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{itemHSN}}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">{{itemQuantity}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{itemUnit}}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">{{itemListPrice}}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">{{itemDiscount}}%</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">{{itemTaxPercent}}%</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">{{itemAmount}}</td>
      </tr>
    </tbody>
  </table>

  <!-- Summary -->
  <div style="margin-bottom: 20px; font-size: 13px;">
    <p style="margin: 3px 0;"><strong>Discount:</strong> - ₹{{discountAmount}}</p>
    <p style="margin: 3px 0;"><strong>Total:</strong> ₹{{totalAmount}}</p>
    <p style="margin: 3px 0;"><strong>Total in Words:</strong> {{totalInWords}}</p>
  </div>

  <!-- Payment Details -->
  <div style="margin-bottom: 20px; font-size: 13px;">
    <p style="margin: 3px 0;"><strong>Settled by - Bank:</strong> ₹{{settledAmount}}</p>
    <p style="margin: 3px 0;"><strong>Invoice Balance:</strong> ₹{{invoiceBalance}}</p>
  </div>

  <!-- Tax Breakdown -->
  <div style="margin-bottom: 20px; font-size: 13px;">
    <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: bold;">Tax Breakdown</h3>
    <p style="margin: 3px 0;">Sale @{{taxPercent}}% = ₹{{saleAmount}}</p>
    <p style="margin: 3px 0;">CGST = ₹{{cgstAmount}}</p>
    <p style="margin: 3px 0;">SGST = ₹{{sgstAmount}}</p>
    <p style="margin: 3px 0;">Total Sale = ₹{{totalSaleAmount}}</p>
    <p style="margin: 3px 0;">Tax = ₹{{totalTaxAmount}}</p>
    <p style="margin: 3px 0;">Cess = ₹{{cessAmount}}</p>
    <p style="margin: 3px 0;">Add. Cess = ₹{{additionalCessAmount}}</p>
  </div>

  <!-- Terms and Bank Details -->
  <div style="display: flex; justify-content: space-between; margin-top: 30px; font-size: 12px;">
    <div style="width: 48%;">
      <h3 style="margin: 0 0 10px; font-size: 13px; font-weight: bold;">Terms and Conditions</h3>
      <p style="margin: 3px 0;">E & O.E</p>
      <p style="margin: 3px 0;">1. Goods once sold will not be taken back.</p>
      <p style="margin: 3px 0;">2. Interest @ 18% p.a. will be charged if the payment for {{org.name}} is not made within the stipulated time.</p>
      <p style="margin: 3px 0;">3. Subject to 'Delhi' Jurisdiction only.</p>
    </div>
    <div style="width: 48%;">
      <h3 style="margin: 0 0 10px; font-size: 13px; font-weight: bold;">Bank Details</h3>
      <p style="margin: 3px 0;"><strong>Account Number:</strong> {{bankAccountNumber}}</p>
      <p style="margin: 3px 0;"><strong>Bank:</strong> {{bankName}}</p>
      <p style="margin: 3px 0;"><strong>IFSC:</strong> {{bankIFSC}}</p>
      <p style="margin: 3px 0;"><strong>Branch:</strong> {{bankBranch}}</p>
      <p style="margin: 20px 0 10px;"><strong>For {{org.name}}:</strong></p>
      <p style="margin: 3px 0;">Signature: ________________</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666;">
    <p style="margin: 0;">Invoice Created by www.mazu.in</p>
  </div>
</div>`;

    // Updated schema with all fields from the invoice image
    const templateSchema = {
      editableFields: [
        // Invoice Details
        { name: 'invoiceNumber', type: 'text', label: 'Invoice Number', required: true, placeholder: '0001/25-26' },
        { name: 'invoiceDate', type: 'date', label: 'Invoice Date', required: true },
        { name: 'dueDate', type: 'date', label: 'Due Date', required: true },
        { name: 'placeOfSupply', type: 'text', label: 'Place of Supply', required: true, placeholder: '09 - Uttar Pradesh' },
        { name: 'rateGold', type: 'text', label: 'Rate Gold', required: false, placeholder: '8500 per gram' },
        { name: 'rateSilver', type: 'text', label: 'Rate Silver', required: false, placeholder: '101000 per Kg' },
        
        // Billing Details
        { name: 'billingName', type: 'text', label: 'Billing Name', required: true },
        { name: 'billingGSTIN', type: 'text', label: 'Billing GSTIN', required: false },
        { name: 'billingMobile', type: 'text', label: 'Billing Mobile', required: false, placeholder: '+91' },
        { name: 'billingEmail', type: 'email', label: 'Billing Email', required: false },
        { name: 'billingAddress', type: 'textarea', label: 'Billing Address', required: true },
        
        // Shipping Details
        { name: 'shippingName', type: 'text', label: 'Shipping Name', required: false },
        { name: 'shippingGSTIN', type: 'text', label: 'Shipping GSTIN', required: false },
        { name: 'shippingMobile', type: 'text', label: 'Shipping Mobile', required: false, placeholder: '+91' },
        { name: 'shippingEmail', type: 'email', label: 'Shipping Email', required: false },
        { name: 'shippingAddress', type: 'textarea', label: 'Shipping Address', required: false },
        
        // Item Details
        { name: 'itemSr', type: 'text', label: 'Item Serial Number', required: true, placeholder: '1' },
        { name: 'itemDescription', type: 'text', label: 'Item Description', required: true, placeholder: 'Item Description I' },
        { name: 'itemHSN', type: 'text', label: 'HSN/SAC', required: true, placeholder: '39231020' },
        { name: 'itemQuantity', type: 'number', label: 'Quantity', required: true, placeholder: '1.00' },
        { name: 'itemUnit', type: 'text', label: 'Unit', required: true, placeholder: 'Pcs.' },
        { name: 'itemListPrice', type: 'number', label: 'List Price (₹)', required: true, placeholder: '100000.00' },
        { name: 'itemDiscount', type: 'number', label: 'Discount (%)', required: true, placeholder: '10.00' },
        { name: 'itemTaxPercent', type: 'number', label: 'Tax %', required: true, placeholder: '18.00' },
        { name: 'itemAmount', type: 'number', label: 'Amount (₹)', required: true, placeholder: '106200.00' },
        
        // Summary
        { name: 'discountAmount', type: 'number', label: 'Discount Amount (₹)', required: true, placeholder: '1000.00' },
        { name: 'totalAmount', type: 'number', label: 'Total Amount (₹)', required: true, placeholder: '105200.00' },
        { name: 'totalInWords', type: 'text', label: 'Total in Words', required: true, placeholder: 'Rs. One Lakh Five Thousand Two Hundred Only' },
        
        // Payment
        { name: 'settledAmount', type: 'number', label: 'Settled by Bank (₹)', required: false, placeholder: '100000.00' },
        { name: 'invoiceBalance', type: 'number', label: 'Invoice Balance (₹)', required: false, placeholder: '5200.00' },
        
        // Tax Breakdown
        { name: 'taxPercent', type: 'number', label: 'Tax Percentage', required: true, placeholder: '18' },
        { name: 'saleAmount', type: 'number', label: 'Sale Amount (₹)', required: true, placeholder: '90000.00' },
        { name: 'cgstAmount', type: 'number', label: 'CGST (₹)', required: true, placeholder: '8100.00' },
        { name: 'sgstAmount', type: 'number', label: 'SGST (₹)', required: true, placeholder: '8100.00' },
        { name: 'totalSaleAmount', type: 'number', label: 'Total Sale (₹)', required: true, placeholder: '90000.00' },
        { name: 'totalTaxAmount', type: 'number', label: 'Total Tax (₹)', required: true, placeholder: '16200.00' },
        { name: 'cessAmount', type: 'number', label: 'Cess (₹)', required: false, placeholder: '0.00' },
        { name: 'additionalCessAmount', type: 'number', label: 'Additional Cess (₹)', required: false, placeholder: '0.00' },
        
        // Bank Details
        { name: 'bankAccountNumber', type: 'text', label: 'Bank Account Number', required: false, placeholder: '123456789' },
        { name: 'bankName', type: 'text', label: 'Bank Name', required: false, placeholder: 'ICICI Bank' },
        { name: 'bankIFSC', type: 'text', label: 'Bank IFSC', required: false, placeholder: 'ICICI1222' },
        { name: 'bankBranch', type: 'text', label: 'Bank Branch', required: false, placeholder: 'Noida' }
      ]
    };

    const autoFillFields = {
      org: {
        name: 'org.name',
        logoUrl: 'org.logoUrl',
        address: 'org.address',
        mobile: 'org.mobile',
        email: 'org.email',
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

    // Update the template
    await pool.query(
      `UPDATE document_templates 
      SET header_template = $1, 
          body_template = $2, 
          template_schema = $3, 
          auto_fill_fields = $4, 
          pdf_settings = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6`,
      [
        headerTemplate,
        bodyTemplate,
        JSON.stringify(templateSchema),
        JSON.stringify(autoFillFields),
        JSON.stringify(pdfSettings),
        templateId
      ]
    );

    console.log('✅ Invoice template updated successfully!');
    console.log(`   Template ID: ${templateId}`);
    console.log(`   Total editable fields: ${templateSchema.editableFields.length}`);
    console.log('\n🎉 Template now matches the detailed invoice format!');

    await pool.end();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    await pool.end();
    process.exit(1);
  }
}

updateInvoiceTemplate();


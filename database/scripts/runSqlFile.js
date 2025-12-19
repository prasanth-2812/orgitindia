// Script to run SQL files using Node.js and pg
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orgit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runSqlFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`\n📄 Running SQL file: ${filePath}`);
    console.log('─'.repeat(50));

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim().length > 0) {
        try {
          await pool.query(statement);
        } catch (error) {
          // Ignore "already exists" errors for CREATE TABLE IF NOT EXISTS
          if (error.code === '42P07' || error.code === '42710') {
            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ SQL file executed successfully!');
  } catch (error) {
    console.error(`❌ Error running SQL file: ${error.message}`);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    process.exit(1);
  }
}

async function main() {
  const files = process.argv.slice(2);

  if (files.length === 0) {
    console.log('Usage: node runSqlFile.js <sql_file1> [sql_file2] ...');
    console.log('Example: node runSqlFile.js setupDocumentTemplates.sql createInvoiceTemplate.sql');
    process.exit(1);
  }

  try {
    for (const file of files) {
      await runSqlFile(file);
    }
    console.log('\n✅ All SQL files executed successfully!');
  } catch (error) {
    console.error('❌ Failed to execute SQL files:', error.message);
  } finally {
    await pool.end();
  }
}

main();


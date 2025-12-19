// Quick script to test database password
const { Pool } = require('pg');

const passwords = ['2812', 'postgres', 'admin', 'password'];

async function testPassword(password) {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'orgit',
    user: 'postgres',
    password: password,
    connectionTimeoutMillis: 2000,
  });

  try {
    const result = await pool.query('SELECT version()');
    console.log(`✓ Password "${password}" WORKS!`);
    console.log(`  PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
    await pool.end();
    return true;
  } catch (error) {
    if (error.code === '28P01') {
      console.log(`✗ Password "${password}" failed: authentication failed`);
    } else {
      console.log(`✗ Password "${password}" failed: ${error.message}`);
    }
    await pool.end();
    return false;
  }
}

async function testAll() {
  console.log('Testing database passwords...\n');
  
  for (const password of passwords) {
    const success = await testPassword(password);
    if (success) {
      console.log(`\n✅ CORRECT PASSWORD FOUND: "${password}"`);
      console.log(`\nUpdate backend/.env with: DB_PASSWORD=${password}`);
      process.exit(0);
    }
  }
  
  console.log('\n❌ None of the tested passwords worked.');
  console.log('Please check your PostgreSQL password manually.');
}

testAll();


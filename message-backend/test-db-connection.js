require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'messaging_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

console.log('Testing database connection...');
console.log('Host:', process.env.DB_HOST || 'localhost');
console.log('Database:', process.env.DB_NAME || 'messaging_db');
console.log('User:', process.env.DB_USER || 'postgres');
console.log('Password:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('');

pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['public'], (err, res) => {
  if (err) {
    console.error('❌ Connection Error:', err.message);
    console.error('Code:', err.code);
    process.exit(1);
  } else {
    console.log('✅ Database connection successful!');
    console.log('');
    console.log('Tables found:', res.rows.length);
    if (res.rows.length > 0) {
      res.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    } else {
      console.log('⚠️  Warning: No tables found.');
      console.log('   Make sure you ran the schema.sql file in pgAdmin 4.');
    }
    process.exit(0);
  }
});


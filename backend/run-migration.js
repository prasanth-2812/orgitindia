const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'orgit',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '2812',
});

async function runMigration() {
    const sqlFile = path.join(__dirname, 'database', 'mobile_integration.sql');

    if (!fs.existsSync(sqlFile)) {
        console.error(`Error: SQL file not found at ${sqlFile}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('--- Running Database Migration ---');
    console.log(`File: ${sqlFile}`);
    console.log('Connecting to database...');

    try {
        const client = await pool.connect();
        console.log('Connected! Executing SQL...');

        await client.query(sql);

        console.log('✅ Migration successful!');
        client.release();
    } catch (err) {
        console.error('❌ Migration failed!');
        console.error(err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'orgit',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '2812',
});

async function checkSchema() {
    try {
        console.log('--- Database Schema Diagnostic ---');

        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables found:', tables.rows.map(r => r.table_name).join(', '));

        for (const table of tables.rows) {
            const columns = await pool.query(
                "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
                [table.table_name]
            );
            console.log(`\nTable: ${table.table_name}`);
            columns.rows.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));
        }

    } catch (err) {
        console.error('Error checking schema:', err.message);
    } finally {
        await pool.end();
    }
}

checkSchema();

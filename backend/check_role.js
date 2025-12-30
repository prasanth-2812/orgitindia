
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'orgit',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function checkAndUpdateRole() {
    try {
        const mobile = '+919652824932';

        // Check current role
        const res = await pool.query('SELECT id, name, mobile, role FROM users WHERE mobile = $1', [mobile]);

        if (res.rows.length === 0) {
            console.log('User not found');
            return;
        }

        const user = res.rows[0];
        console.log('Current User State:', user);

        if (user.role !== 'super_admin') {
            console.log('Updating role to super_admin...');
            await pool.query("UPDATE users SET role = 'super_admin' WHERE id = $1", [user.id]);
            console.log('Role updated successfully.');

            const newRes = await pool.query('SELECT id, name, mobile, role FROM users WHERE mobile = $1', [mobile]);
            console.log('New User State:', newRes.rows[0]);
        } else {
            console.log('User is already super_admin.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkAndUpdateRole();

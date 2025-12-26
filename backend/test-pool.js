const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'orgit',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '2812',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

console.log('Testing with config:', { ...poolConfig, password: '****' });

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ FAIL:', err.message);
        process.exit(1);
    } else {
        console.log('✅ SUCCESS');
        client.query('SELECT 1', (err, res) => {
            if (err) console.error('Query fail:', err.message);
            else console.log('Query success');
            release();
            pool.end();
        });
    }
});

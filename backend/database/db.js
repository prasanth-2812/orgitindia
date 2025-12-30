const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'messaging_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Improved logging wrapper
const originalQuery = pool.query;
pool.query = function (...args) {
  const start = Date.now();
  const text = typeof args[0] === 'string' ? args[0] : args[0].text;
  const params = typeof args[0] === 'string' ? args[1] : args[0].values;

  return originalQuery.apply(this, args)
    .then(res => {
      const duration = Date.now() - start;
      console.log('Query:', { text, duration: `${duration}ms`, rows: res.rowCount });
      return res;
    })
    .catch(err => {
      const duration = Date.now() - start;
      console.error('Query Error:', { text, duration: `${duration}ms`, error: err.message });
      throw err;
    });
};

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;


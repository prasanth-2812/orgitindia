// Script to update user role
// Usage: node database/scripts/updateUserRole.js <mobile> <role>
// Example: node database/scripts/updateUserRole.js 1234567890 admin

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orgit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function updateUserRole(mobileSuffix, role) {
  const validRoles = ['admin', 'employee', 'super_admin'];
  
  if (!validRoles.includes(role)) {
    console.error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  try {
    // Find user
    const findResult = await pool.query(
      `SELECT id, mobile, name, role, status FROM users WHERE mobile LIKE $1`,
      [`%${mobileSuffix}`]
    );

    if (findResult.rows.length === 0) {
      console.log(`No user found with mobile number ending in ${mobileSuffix}`);
      console.log('Available users:');
      const allUsers = await pool.query('SELECT mobile, name, role FROM users LIMIT 10');
      allUsers.rows.forEach(u => console.log(`  - ${u.mobile} (${u.name}) - ${u.role}`));
      process.exit(1);
    }

    const user = findResult.rows[0];
    console.log(`Found user: ${user.mobile} (${user.name}) - Current role: ${user.role}`);

    // Update role
    const updateResult = await pool.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE mobile LIKE $2 RETURNING *`,
      [role, `%${mobileSuffix}`]
    );

    console.log(`\n✅ Successfully updated user role to: ${role}`);
    console.log(`Updated user: ${updateResult.rows[0].mobile} (${updateResult.rows[0].name})`);
    
    await pool.end();
  } catch (error) {
    console.error('Error updating user role:', error);
    await pool.end();
    process.exit(1);
  }
}

const mobileSuffix = process.argv[2];
const role = process.argv[3];

if (!mobileSuffix || !role) {
  console.log('Usage: node database/scripts/updateUserRole.js <mobile_suffix> <role>');
  console.log('Example: node database/scripts/updateUserRole.js 1234567890 admin');
  console.log('Roles: admin, employee, super_admin');
  process.exit(1);
}

updateUserRole(mobileSuffix, role);


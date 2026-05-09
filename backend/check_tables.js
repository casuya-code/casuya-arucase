const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'arucase',
  password: 'Mkalanga1994!@',
  port: 5432,
});

async function checkTables() {
  try {
    const result = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['public']);
    console.log('Existing tables:');
    result.rows.forEach(row => console.log('  -', row.table_name));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTables();

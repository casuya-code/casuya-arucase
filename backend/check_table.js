const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'arucase',
  password: 'Mkalanga1994!@',
  port: 5432,
});

async function checkTable() {
  try {
    const result = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = $2', ['preform_one_interview_subjects', 'public']);
    console.log('Existing columns in preform_one_interview_subjects:');
    result.rows.forEach(row => console.log('  -', row.column_name));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTable();

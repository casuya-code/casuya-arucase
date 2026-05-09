const { query } = require('./backend/config/database');

async function checkStudents() {
  try {
    console.log('Checking for FORM I A 2025 students...');
    
    const result = await query('SELECT COUNT(*) as count, level, stream, year FROM students WHERE level = $1 AND stream = $2 AND year = $3 GROUP BY level, stream, year', ['FORM I', 'A', 2025]);
    console.log('Students for FORM I A 2025:', result.rows);
    
    const allStudents = await query('SELECT COUNT(*) as count FROM students WHERE year = $1', [2025]);
    console.log('All students for 2025:', allStudents.rows[0]);
    
    const formIStudents = await query('SELECT COUNT(*) as count FROM students WHERE level = $1 AND year = $2', ['FORM I', 2025]);
    console.log('All FORM I students for 2025:', formIStudents.rows[0]);
    
    // Check if there are any students with stream A or NA for FORM I 2025
    const streamStudents = await query('SELECT COUNT(*) as count, stream FROM students WHERE level = $1 AND year = $2 AND (stream = $3 OR stream = $4) GROUP BY stream', ['FORM I', 2025, 'A', 'NA']);
    console.log('FORM I 2025 students by stream:', streamStudents.rows);
    
    // Let's also check a few sample students
    const sampleStudents = await query('SELECT adm_no, first_name, surname, level, stream, year FROM students WHERE year = $1 LIMIT 5', [2025]);
    console.log('Sample students 2025:', sampleStudents.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudents();

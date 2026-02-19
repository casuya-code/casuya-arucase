const { query } = require('../config/database');

async function checkStudent() {
  try {
    const admNo = process.argv[2] || '1711';
    console.log(`Checking student: ${admNo}`);
    
    const result = await query(
      'SELECT adm_no, level, stream, year FROM students WHERE adm_no = $1',
      [admNo]
    );
    
    console.log(`Found ${result.rows.length} record(s):`);
    result.rows.forEach((row, idx) => {
      console.log(`\nRecord ${idx + 1}:`);
      console.log(`  adm_no: ${row.adm_no}`);
      console.log(`  level: ${row.level}`);
      console.log(`  stream: ${row.stream}`);
      console.log(`  year: ${row.year}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkStudent();

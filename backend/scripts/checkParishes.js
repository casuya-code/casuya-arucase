const { query } = require('../config/database');

async function checkParishes() {
  try {
    const level = process.argv[2] || 'FORM II';
    const year = parseInt(process.argv[3] || '2025');
    
    console.log(`Checking parishes for: ${level} ${year}`);
    
    // Check all streams
    const result = await query(
      'SELECT level, stream, year, COUNT(*) as count FROM student_parishes WHERE level = $1 AND year = $2 GROUP BY level, stream, year',
      [level, year]
    );
    
    console.log(`\nFound ${result.rows.length} stream(s) with parishes:`);
    result.rows.forEach((row) => {
      console.log(`  ${row.level} ${row.stream} ${row.year}: ${row.count} parishes`);
    });
    
    // Also check for any parishes with stream A or NA
    const allResult = await query(
      'SELECT level, stream, year, COUNT(*) as count FROM student_parishes WHERE level = $1 AND year = $2 AND stream IN ($3, $4) GROUP BY level, stream, year',
      [level, year, 'A', 'NA']
    );
    
    console.log(`\nParishes with stream A or NA:`);
    allResult.rows.forEach((row) => {
      console.log(`  ${row.level} ${row.stream} ${row.year}: ${row.count} parishes`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkParishes();

/**
 * Check all FORM II subjects and compare with FORM I to identify missing ones
 */
const { query } = require('../config/database');

async function checkFormIISubjects() {
  try {
    console.log('\n🔍 Checking FORM II subjects...\n');
    
    // Get all FORM II subjects
    const formIIResult = await query(
      `SELECT * FROM subjects 
       WHERE level = 'FORM II' 
       ORDER BY year, subject_code`
    );
    
    console.log(`📊 Found ${formIIResult.rows.length} FORM II subjects total:\n`);
    
    // Group by year
    const byYear = {};
    formIIResult.rows.forEach(subject => {
      if (!byYear[subject.year]) {
        byYear[subject.year] = [];
      }
      byYear[subject.year].push(subject);
    });
    
    Object.keys(byYear).sort().forEach(year => {
      console.log(`📅 Year ${year}: ${byYear[year].length} subjects`);
      byYear[year].forEach(s => {
        console.log(`   - ${s.subject_code}: ${s.subject_name} (${s.subject_abbreviation || 'N/A'})`);
      });
      console.log('');
    });
    
    // Get FORM I subjects for 2025 to compare
    const formIResult = await query(
      `SELECT * FROM subjects 
       WHERE level = 'FORM I' AND year = 2025 
       ORDER BY subject_code`
    );
    
    console.log(`\n📚 FORM I 2025 has ${formIResult.rows.length} subjects:`);
    formIResult.rows.forEach(s => {
      console.log(`   - ${s.subject_code}: ${s.subject_name}`);
    });
    
    // Check FORM II 2025 specifically
    const formII2025 = formIIResult.rows.filter(s => s.year === 2025);
    console.log(`\n📊 FORM II 2025 currently has ${formII2025.length} subjects`);
    
    if (formII2025.length < 10) {
      console.log(`\n⚠️  Missing ${10 - formII2025.length} subjects for FORM II 2025`);
      console.log('\n💡 You can add the missing subjects using the UI or API.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFormIISubjects();

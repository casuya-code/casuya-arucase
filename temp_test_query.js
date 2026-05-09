const { query } = require('./backend/config/database');
const { normalizeStream } = require('./backend/utils/streamNormalizer');

async function testQuery() {
  try {
    console.log('Testing the exact query that the API would run...');
    
    // Test the normalizeStream function
    const normalizedStream = normalizeStream('A');
    console.log('Normalized stream "A":', normalizedStream);
    
    // Test the exact query from the API
    const { level, stream, year, term } = { level: 'FORM I', stream: 'A', year: '2025', term: null };
    
    let queryText = 'SELECT adm_no, first_name, middle_name, surname, sex, level, stream, year, term, com FROM students WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (level && level.trim()) {
      const normalizedLevel = level.trim().toUpperCase();
      queryText += ` AND level = $${paramCount}`;
      params.push(normalizedLevel);
      paramCount++;
    }
    
    if (stream && stream.trim()) {
      const normalizedStream = normalizeStream(stream.trim());
      console.log('Stream normalization:', { original: stream, normalized: normalizedStream });
      
      // FORM I-IV: return students with stream A or NA so all registered in that class are visible
      const isFormIV = level && /^FORM\s+(I|II|III|IV)$/i.test(level.trim());
      console.log('Is Form I-IV:', isFormIV);
      
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        queryText += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        params.push('A', 'NA');
        paramCount += 2;
        console.log('Using A or NA condition');
      } else {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(normalizedStream);
        console.log('Using single stream condition:', normalizedStream);
      }
    }
    
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        queryText += ` AND year = $${paramCount++}`;
        params.push(yearNum);
      }
    }
    
    queryText += ' ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC LIMIT 500';
    
    console.log('Final query:', queryText);
    console.log('Query params:', params);
    
    const result = await query(queryText, params);
    console.log('Query result count:', result.rows.length);
    console.log('First few students:', result.rows.slice(0, 3));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testQuery();

const { query } = require('./backend/config/database');
const { normalizeStream } = require('./backend/utils/streamNormalizer');

async function testQueryWithTerm() {
  try {
    console.log('Testing query WITH term parameter (like the frontend is sending)...');
    
    // Test the exact query the frontend is sending (includes term)
    const { level, stream, year, term } = { level: 'FORM I', stream: 'A', year: '2025', term: 'First Term' };
    
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
      
      const isFormIV = level && /^FORM\s+(I|II|III|IV)$/i.test(level.trim());
      
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        queryText += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        params.push('A', 'NA');
        paramCount += 2;
      } else {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(normalizedStream);
      }
    }
    
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        queryText += ` AND year = $${paramCount++}`;
        params.push(yearNum);
      }
    }
    
    // This is what the frontend is sending - term filter
    if (term && term.trim()) {
      const termMatchValues = getTermMatchValues(term.trim());
      if (termMatchValues.length > 1) {
        const termPlaceholders = termMatchValues.map((_, i) => `$${paramCount + i}`).join(', ');
        queryText += ` AND term IN (${termPlaceholders})`;
        params.push(...termMatchValues);
        paramCount += termMatchValues.length;
      } else {
        queryText += ` AND term = $${paramCount++}`;
        params.push(term.trim());
      }
    }
    
    queryText += ' ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC LIMIT 500';
    
    console.log('Query with term:', queryText);
    console.log('Query params:', params);
    
    const result = await query(queryText, params);
    console.log('Query result count with term:', result.rows.length);
    
    // Now test without term
    console.log('\nTesting query WITHOUT term parameter...');
    
    queryText = 'SELECT adm_no, first_name, middle_name, surname, sex, level, stream, year, term, com FROM students WHERE 1=1';
    params = [];
    paramCount = 1;
    
    if (level && level.trim()) {
      const normalizedLevel = level.trim().toUpperCase();
      queryText += ` AND level = $${paramCount}`;
      params.push(normalizedLevel);
      paramCount++;
    }
    
    if (stream && stream.trim()) {
      const normalizedStream = normalizeStream(stream.trim());
      
      const isFormIV = level && /^FORM\s+(I|II|III|IV)$/i.test(level.trim());
      
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        queryText += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        params.push('A', 'NA');
        paramCount += 2;
      } else {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(normalizedStream);
      }
    }
    
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        queryText += ` AND year = $${paramCount++}`;
        params.push(yearNum);
      }
    }
    
    // NO term filter
    queryText += ' ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC LIMIT 500';
    
    console.log('Query without term:', queryText);
    console.log('Query params:', params);
    
    const result2 = await query(queryText, params);
    console.log('Query result count without term:', result2.rows.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Copy the getTermMatchValues function from the backend
function getTermMatchValues(term) {
  const t = term != null ? String(term).trim() : '';
  const variants = [t];
  if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t) || /^First\s+Term$/i.test(t)) {
    variants.push('Term I', 'Term 1', 'First Term');
  }
  else if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t) || /^Second\s+Term$/i.test(t)) {
    variants.push('Term II', 'Term 2', 'Second Term');
  }
  else if (/^Term\s+III$/i.test(t) || /^Term\s+3$/i.test(t)) { variants.push('Term III', 'Term 3'); }
  else if (/^Term\s+IV$/i.test(t) || /^Term\s+4$/i.test(t)) { variants.push('Term IV', 'Term 4'); }
  return [...new Set(variants)];
}

testQueryWithTerm();

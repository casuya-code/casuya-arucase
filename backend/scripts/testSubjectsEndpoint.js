/**
 * Test subjects endpoint like the frontend would call it
 */

const http = require('http');

const testCases = [
  { level: 'FORM I', stream: 'A', year: 2025, expected: 'NA' },
  { level: 'FORM I', stream: 'NA', year: 2025, expected: 'NA' },
  { level: 'FORM V', stream: 'EGM', year: 2025, expected: 'EGM' },
];

function testEndpoint(level, stream, year) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      level: level,
      stream: stream || 'NA',
      year: year.toString()
    });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/students/subjects/list?${params.toString()}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Testing Subjects API Endpoint');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('⚠️  Note: This requires the backend server to be running on port 5000\n');
  
  for (const testCase of testCases) {
    try {
      console.log(`Test: level=${testCase.level}, stream=${testCase.stream}, year=${testCase.year}`);
      console.log(`Expected query stream: ${testCase.expected}`);
      
      const result = await testEndpoint(testCase.level, testCase.stream, testCase.year);
      console.log(`Status: ${result.status}`);
      
      if (result.status === 200 && result.data.subjects) {
        console.log(`✅ Found ${result.data.subjects.length} subjects`);
        if (result.data.subjects.length > 0) {
          console.log(`   Sample: ${result.data.subjects[0].subject_name}`);
        }
      } else {
        console.log(`❌ Error:`, result.data);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}\n`);
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runTests().catch(console.error);


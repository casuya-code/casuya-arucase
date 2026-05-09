const axios = require('axios');
const jwt = require('jsonwebtoken');

// Create test token
const createTestToken = () => {
  const JWT_SECRET = process.env.JWT_SECRET_KEY || 'your-super-secret-jwt-key-change-this-in-production';
  const testUser = {
    id: 1,
    username: 'test_admin',
    email: 'test@example.com',
    role: 'admin',
    permissions: {
      modules: ['all'],
      class_subjects: {},
      classes: ['all'],
      subjects: ['all'],
      score_entry_months: ['all'],
      class_permissions: {}
    }
  };
  
  return jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });
};

// Test PDF response with detailed headers
const testPDFResponse = async () => {
  try {
    const token = createTestToken();
    console.log('🔍 Testing PDF response with detailed headers...');
    
    const response = await axios.get('http://localhost:3001/api/pre-form-one/2025/interview-results/pdf', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer',
      timeout: 30000,
      transformResponse: [data => data, headers => headers] // Don't transform, get raw response
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ All Response Headers:', response.headers);
    console.log('✅ Content-Type:', response.headers['content-type']);
    console.log('✅ Content-Disposition:', response.headers['content-disposition']);
    console.log('✅ Content-Length:', response.headers['content-length']);
    
    // Check first few bytes to see what we actually got
    const uint8Array = new Uint8Array(response.data);
    const firstBytes = Array.from(uint8Array.slice(0, 16));
    console.log('🔢 First 16 bytes:', firstBytes);
    
    // Check if it looks like JSON or PDF
    const firstChar = String.fromCharCode(uint8Array[0]);
    console.log('🔢 First character:', firstChar, `(code: ${uint8Array[0]})`);
    
    if (firstChar === '{') {
      console.log('❌ Response appears to be JSON, not PDF');
      // Try to parse as JSON
      try {
        const jsonString = Buffer.from(response.data).toString('utf8');
        const jsonData = JSON.parse(jsonString);
        console.log('📄 Parsed JSON keys:', Object.keys(jsonData));
        console.log('📄 First few JSON entries:', Object.entries(jsonData).slice(0, 5));
      } catch (e) {
        console.log('❌ Could not parse as JSON either');
      }
    } else if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50) {
      console.log('✅ Response appears to be valid PDF');
    } else {
      console.log('❓ Response is neither JSON nor PDF');
    }
    
    return { success: true, firstChar, headers: response.headers };
    
  } catch (error) {
    console.error('❌ PDF response test failed:', error.message);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Error headers:', error.response?.headers);
    
    if (error.response?.data) {
      try {
        const errorText = Buffer.from(error.response.data).toString('utf8');
        console.error('❌ Error Response (first 200 chars):', errorText.substring(0, 200));
      } catch (e) {
        console.error('❌ Could not parse error response');
      }
    }
    
    return { success: false, error: error.message };
  }
};

testPDFResponse().then(result => {
  console.log('\n📋 RESPONSE HEADER TEST RESULT:', result);
  process.exit(result.success ? 0 : 1);
}).catch(console.error);

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

// Test PDF generation directly
const testPDFGeneration = async () => {
  try {
    const token = createTestToken();
    console.log('🔍 Testing PDF generation with fresh token...');
    
    const response = await axios.get('http://localhost:3001/api/pre-form-one/2025/interview-results/pdf', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    console.log('✅ PDF Response Status:', response.status);
    console.log('✅ PDF Response Headers:', response.headers);
    console.log('✅ PDF Buffer Size:', response.data.length);
    
    // Check if it's a valid PDF
    const uint8Array = new Uint8Array(response.data);
    const isPDF = uint8Array.length >= 4 && 
      uint8Array[0] === 0x25 && 
      uint8Array[1] === 0x50 && 
      uint8Array[2] === 0x44 && 
      uint8Array[3] === 0x46;
    
    console.log('✅ Valid PDF Check:', isPDF);
    
    if (isPDF) {
      // Save PDF to file for verification
      const fs = require('fs');
      fs.writeFileSync('test_interview_results.pdf', response.data);
      console.log('✅ PDF saved as test_interview_results.pdf');
    }
    
    return { success: true, size: response.data.length, isPDF };
    
  } catch (error) {
    console.error('❌ PDF Generation Test Failed:');
    console.error('❌ Error:', error.message);
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Status Text:', error.response?.statusText);
    
    if (error.response?.data) {
      try {
        const errorText = Buffer.from(error.response.data).toString('utf8');
        console.error('❌ Error Response:', errorText);
      } catch (e) {
        console.error('❌ Could not parse error response');
      }
    }
    
    return { success: false, error: error.message };
  }
};

testPDFGeneration().then(result => {
  console.log('\n📋 TEST RESULT:', result);
  process.exit(result.success ? 0 : 1);
}).catch(console.error);

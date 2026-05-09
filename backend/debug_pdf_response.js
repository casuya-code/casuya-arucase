const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');

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

// Debug PDF response
const debugPDFResponse = async () => {
  try {
    const token = createTestToken();
    console.log('🔍 Debugging PDF response...');
    
    const response = await axios.get('http://localhost:3001/api/pre-form-one/2025/interview-results/pdf', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Content-Type:', response.headers['content-type']);
    console.log('✅ Content-Length:', response.headers['content-length']);
    
    // Try to parse as text to see what we actually got
    const responseText = Buffer.from(response.data).toString('utf8');
    console.log('📄 First 500 characters of response:');
    console.log(responseText.substring(0, 500));
    
    // Save raw response for inspection
    fs.writeFileSync('debug_pdf_response.raw', response.data);
    fs.writeFileSync('debug_pdf_response.txt', responseText);
    
    // Check PDF header bytes
    const uint8Array = new Uint8Array(response.data);
    const headerBytes = Array.from(uint8Array.slice(0, 16));
    console.log('🔢 First 16 bytes:', headerBytes);
    
    // Check if it's HTML
    const isHTML = responseText.toLowerCase().includes('<!doctype') || responseText.toLowerCase().includes('<html');
    console.log('📄 Is HTML response:', isHTML);
    
    return { success: true, isHTML, size: response.data.length };
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response?.data) {
      const errorText = Buffer.from(error.response.data).toString('utf8');
      console.error('❌ Error Response:', errorText.substring(0, 500));
    }
    return { success: false, error: error.message };
  }
};

debugPDFResponse().then(result => {
  console.log('\n📋 DEBUG RESULT:', result);
  process.exit(result.success ? 0 : 1);
}).catch(console.error);

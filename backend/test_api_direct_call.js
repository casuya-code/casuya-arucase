const axios = require('axios');
const jwt = require('jsonwebtoken');

// Create test token
const token = jwt.sign({
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
}, process.env.JWT_SECRET_KEY || 'your-super-secret-jwt-key-change-this-in-production', { expiresIn: '24h' });

// Test direct API call without axios interceptors
const testDirectAPI = async () => {
  try {
    console.log('🔍 Testing direct API call...');
    
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
    console.log('✅ Response Data Type:', typeof response.data);
    console.log('✅ Response Data Constructor:', response.data.constructor.name);
    console.log('✅ Response Data Length:', response.data.length);
    
    // Check first few bytes
    const firstBytes = Array.from(new Uint8Array(response.data).slice(0, 16));
    console.log('🔢 First 16 bytes:', firstBytes);
    
    // Check if it's PDF or JSON
    const firstChar = String.fromCharCode(response.data[0]);
    if (firstChar === '{') {
      console.log('❌ Got JSON instead of PDF');
      const jsonText = Buffer.from(response.data).toString('utf8');
      console.log('📄 JSON preview:', jsonText.substring(0, 200));
    } else if (response.data[0] === 0x25 && response.data[1] === 0x50) {
      console.log('✅ Got valid PDF');
      // Save PDF
      const fs = require('fs');
      fs.writeFileSync('direct_api_test.pdf', response.data);
      console.log('✅ PDF saved as direct_api_test.pdf');
    } else {
      console.log('❓ Unknown response type');
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Direct API call failed:', error.message);
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Headers:', error.response?.headers);
    
    if (error.response?.data) {
      const errorText = Buffer.from(error.response.data).toString('utf8');
      console.error('❌ Error response:', errorText.substring(0, 200));
    }
    
    return { success: false, error: error.message };
  }
};

testDirectAPI().then(result => {
  console.log('\n📋 DIRECT API TEST RESULT:', result);
  process.exit(result.success ? 0 : 1);
}).catch(console.error);

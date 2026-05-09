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

// Test PDF endpoint and validate response
const testPDFValidation = async () => {
  try {
    const token = createTestToken();
    console.log('🔍 Testing PDF endpoint validation...');
    console.log('🔍 URL: http://localhost:3001/api/pre-form-one/2025/interview-results/pdf');
    
    const response = await axios.get('http://localhost:3001/api/pre-form-one/2025/interview-results/pdf', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      },
      responseType: 'arraybuffer',
      timeout: 60000
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Headers:', response.headers);
    console.log('✅ Content-Type:', response.headers['content-type']);
    console.log('✅ Content-Length:', response.headers['content-length']);
    console.log('✅ Data Size:', response.data.length, 'bytes');
    
    // Check if response is valid PDF
    const data = Buffer.from(response.data);
    
    // Check PDF signature (%PDF)
    if (data.length >= 4) {
      const header = data.toString('ascii', 0, 4);
      console.log('🔍 File Header:', header);
      
      if (header === '%PDF') {
        console.log('✅ Valid PDF signature detected');
        
        // Save the PDF for inspection
        const pdfPath = 'test_download.pdf';
        fs.writeFileSync(pdfPath, data);
        console.log('📄 PDF saved as:', pdfPath);
        
        return { success: true, message: 'Valid PDF generated', size: data.length };
      } else {
        console.log('❌ Invalid PDF signature:', header);
        
        // Check if it's JSON response
        try {
          const jsonData = JSON.parse(data.toString('utf8'));
          console.log('🔍 Received JSON instead of PDF:', jsonData);
          return { success: false, error: 'JSON response instead of PDF', data: jsonData };
        } catch (e) {
          console.log('🔍 Received unknown data type');
          console.log('🔍 First 100 bytes:', data.toString('ascii', 0, 100));
          return { success: false, error: 'Unknown response type', preview: data.toString('ascii', 0, 100) };
        }
      }
    } else {
      console.log('❌ Response too small:', data.length, 'bytes');
      return { success: false, error: 'Response too small', size: data.length };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Headers:', error.response?.headers);
    
    if (error.response?.data) {
      try {
        const errorData = error.response.data;
        if (Buffer.isBuffer(errorData)) {
          console.error('❌ Error Response (first 200 bytes):', errorData.toString('ascii', 0, 200));
        } else {
          console.error('❌ Error Response:', errorData);
        }
      } catch (e) {
        console.error('❌ Could not parse error response');
      }
    }
    
    return { success: false, error: error.message };
  }
};

testPDFValidation().then(result => {
  console.log('\n📋 PDF VALIDATION RESULT:', result);
  process.exit(result.success ? 0 : 1);
}).catch(console.error);

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

// Simulate frontend axios call exactly
const testFrontendSimulation = async () => {
  try {
    const token = createTestToken();
    console.log('🔍 Simulating frontend axios PDF request...');
    
    // Simulate exact frontend API call
    const response = await axios.get('http://localhost:3001/api/pre-form-one/2025/interview-results/pdf', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'blob', // This is what frontend uses
      timeout: 60000
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Headers:', response.headers);
    console.log('✅ Content-Type:', response.headers['content-type']);
    console.log('✅ Content-Length:', response.headers['content-length']);
    console.log('✅ Response data type:', typeof response.data);
    console.log('✅ Response data constructor:', response.data.constructor.name);
    console.log('✅ Response data size:', response.data.size || response.data.length);
    
    // Test the exact validation logic from frontend
    let blob;
    if (response.data instanceof Blob) {
      blob = response.data;
      console.log('✅ Data is Blob');
    } else if (response.data instanceof ArrayBuffer) {
      blob = new Blob([response.data], { type: 'application/pdf' });
      console.log('✅ Data converted from ArrayBuffer to Blob');
    } else if (response.data instanceof Uint8Array) {
      blob = new Blob([response.data], { type: 'application/pdf' });
      console.log('✅ Data converted from Uint8Array to Blob');
    } else if (typeof response.data === 'string') {
      // Convert string to Uint8Array then to Blob
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(response.data);
      blob = new Blob([uint8Array], { type: 'application/pdf' });
      console.log('✅ Converted string response to Blob');
    } else {
      console.log('❌ Unexpected data type:', typeof response.data);
      return { success: false, error: 'Unexpected response data type' };
    }
    
    if (blob.size === 0) {
      console.log('❌ Blob is empty');
      return { success: false, error: 'PDF file is empty' };
    }
    
    console.log('✅ Blob size:', blob.size);
    
    // Test validation
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('🔍 Array length:', uint8Array.length);
    console.log('🔍 First 4 bytes:', uint8Array.slice(0, 4));
    console.log('🔍 Expected bytes:', [0x25, 0x50, 0x44, 0x46]); // %PDF
    
    if (uint8Array.length >= 4) {
      const isValidPDF = (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46);
      
      if (isValidPDF) {
        console.log('✅ Valid PDF signature detected');
        console.log('🔍 First 10 bytes as string:', String.fromCharCode.apply(null, uint8Array.slice(0, 10)));
        
        return { success: true, message: 'Valid PDF', size: blob.size };
      } else {
        console.log('❌ Invalid PDF signature');
        console.log('uint8Array[0]:', uint8Array[0], 'expected: 0x25 (37)');
        console.log('uint8Array[1]:', uint8Array[1], 'expected: 0x50 (80)');
        console.log('uint8Array[2]:', uint8Array[2], 'expected: 0x44 (68)');
        console.log('uint8Array[3]:', uint8Array[3], 'expected: 0x46 (70)');
        console.log('First 10 bytes:', Array.from(uint8Array.slice(0, 10)));
        console.log('As string:', String.fromCharCode.apply(null, uint8Array.slice(0, 10)));
        
        // Check if it's JSON
        try {
          const jsonText = new TextDecoder().decode(uint8Array);
          const jsonData = JSON.parse(jsonText);
          console.log('🔍 Received JSON instead of PDF:', jsonData);
          return { success: false, error: 'JSON response instead of PDF', data: jsonData };
        } catch (e) {
          console.log('🔍 Not JSON, unknown data type');
          return { success: false, error: 'Invalid PDF signature', bytes: Array.from(uint8Array.slice(0, 10)) };
        }
      }
    } else {
      console.log('❌ Array too short:', uint8Array.length);
      return { success: false, error: 'Response too small', size: uint8Array.length };
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

testFrontendSimulation().then(result => {
  console.log('\n📋 FRONTEND SIMULATION RESULT:', result);
  process.exit(result.success ? 0 : 1);
}).catch(console.error);

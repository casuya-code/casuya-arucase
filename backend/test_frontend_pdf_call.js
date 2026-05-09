const axios = require('axios');
const jwt = require('jsonwebtoken');

// Create test token exactly like frontend would
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

// Test exactly like frontend service
const testFrontendCall = async () => {
  try {
    const token = createTestToken();
    console.log('🔍 Testing frontend-style PDF call...');
    
    // Simulate frontend API call exactly
    const api = axios.create({
      baseURL: 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });
    
    // Add auth interceptor like frontend
    api.interceptors.request.use(
      (config) => {
        // Use the token directly since localStorage doesn't exist in Node.js
        if (token && !config.headers?.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      }
    );
    
    const response = await api.get(`/pre-form-one/2025/interview-results/pdf`, {
      responseType: 'blob'
    });
    
    console.log('✅ Frontend-style Response Status:', response.status);
    console.log('✅ Frontend-style Content-Type:', response.headers['content-type']);
    console.log('✅ Frontend-style Response Data Type:', typeof response.data);
    console.log('✅ Frontend-style Response Data Constructor:', response.data.constructor.name);
    
    // Check if it's a blob
    if (response.data instanceof Blob) {
      console.log('✅ Response is Blob, size:', response.data.size);
      
      const arrayBuffer = await response.data.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Check PDF header
      const isPDF = uint8Array.length >= 4 && 
        uint8Array[0] === 0x25 && 
        uint8Array[1] === 0x50 && 
        uint8Array[2] === 0x44 && 
        uint8Array[3] === 0x46;
      
      console.log('✅ PDF Header Check:', isPDF);
      console.log('🔢 First 8 bytes:', Array.from(uint8Array.slice(0, 8)));
      
      if (isPDF) {
        const fs = require('fs');
        fs.writeFileSync('frontend_test_pdf.pdf', Buffer.from(arrayBuffer));
        console.log('✅ Frontend-style PDF saved');
      }
    } else {
      console.log('❌ Response is not a Blob:', response.data);
      // Try to read as text
      const text = Buffer.from(response.data).toString('utf8');
      console.log('📄 Response as text (first 200 chars):', text.substring(0, 200));
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Frontend-style call failed:', error.message);
    console.error('❌ Error status:', error.response?.status);
    
    if (error.response?.data) {
      try {
        const text = Buffer.from(error.response.data).toString('utf8');
        console.error('❌ Error response (first 200 chars):', text.substring(0, 200));
      } catch (e) {
        console.error('❌ Could not parse error response');
      }
    }
    
    return { success: false, error: error.message };
  }
};

testFrontendCall().then(result => {
  console.log('\n📋 FRONTEND TEST RESULT:', result);
  process.exit(result.success ? 0 : 1);
}).catch(console.error);

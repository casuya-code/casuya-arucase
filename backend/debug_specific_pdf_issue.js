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

// Test the exact URL that's failing
const testSpecificURL = async () => {
  try {
    const token = createTestToken();
    console.log('🔍 Testing the exact failing URL...');
    console.log('🔍 URL: http://localhost:3001/admin/pre-form-one/2025/interview-results');
    
    const response = await axios.get('http://localhost:3001/admin/pre-form-one/2025/interview-results', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Headers:', response.headers);
    console.log('✅ Content-Type:', response.headers['content-type']);
    
    // Check if we get HTML page (which means frontend is loading)
    const responseText = response.data;
    const isHTMLPage = responseText.includes('<!DOCTYPE html>') || responseText.includes('<html>');
    
    if (isHTMLPage) {
      console.log('📄 Got HTML page (frontend is loading)');
      console.log('📄 Looking for PDF download button...');
      
      // Check if PDF download button exists in the HTML
      const hasPDFButton = responseText.includes('downloadInterviewResultsPDF') || 
                           responseText.includes('Download Interview Results (PDF)') ||
                           responseText.includes('downloadResultsBtn');
      
      console.log('🔍 Has PDF Button:', hasPDFButton);
      
      if (hasPDFButton) {
        console.log('✅ PDF button found - frontend should work');
      } else {
        console.log('❌ PDF button NOT found - frontend issue');
      }
    } else {
      console.log('❌ Got unexpected response - not HTML page');
      console.log('📄 First 500 chars:', responseText.substring(0, 500));
    }
    
    return { success: true, isHTMLPage, hasPDFButton };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Status:', error.response?.status);
    return { success: false, error: error.message };
  }
};

testSpecificURL().then(result => {
  console.log('\n📋 SPECIFIC URL TEST RESULT:', result);
  process.exit(result.success ? 0 : 1);
}).catch(console.error);

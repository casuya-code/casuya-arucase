const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing PreFormOne interview results API...');
    const response = await axios.get('http://localhost:5000/api/pre-form-one/2025/interview-results', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAPI();

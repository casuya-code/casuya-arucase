const axios = require('axios');

async function testPDFAPI() {
  try {
    console.log('Testing PreFormOne interview results PDF API...');
    const response = await axios.get('http://localhost:5000/api/pre-form-one/2025/interview-results/pdf', {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      responseType: 'text'
    });
    console.log('PDF Response received successfully!');
    console.log('Content type:', response.headers['content-type']);
    console.log('Content length:', response.data.length);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPDFAPI();

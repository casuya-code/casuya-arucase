const jwt = require('jsonwebtoken');
const { query } = require('./config/database');

// Create a test token that bypasses auth for debugging
const createTestToken = () => {
  const JWT_SECRET = process.env.JWT_SECRET_KEY || 'dev-secret-key';
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
  
  const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '24h' });
  console.log('🔑 TEST TOKEN CREATED:', token);
  console.log('🔑 USER DATA:', testUser);
  
  return { token, user: testUser };
};

// Test the token works
const testToken = () => {
  const { token, user } = createTestToken();
  
  try {
    const JWT_SECRET = process.env.JWT_SECRET_KEY || 'dev-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ TOKEN VERIFICATION SUCCESSFUL');
    console.log('✅ DECODED USER:', decoded);
    return { success: true, token, user };
  } catch (error) {
    console.error('❌ TOKEN VERIFICATION FAILED:', error);
    return { success: false, error };
  }
};

// Check if interview results exist
const checkInterviewResults = async () => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM preform_one_interview_results WHERE year = 2025');
    console.log(`📊 INTERVIEW RESULTS COUNT: ${result.rows[0].count}`);
    return result.rows[0].count;
  } catch (error) {
    console.error('❌ ERROR CHECKING RESULTS:', error);
    return 0;
  }
};

// Run all tests
const runTests = async () => {
  console.log('🚀 STARTING AUTHENTICATION DEBUG TESTS');
  
  const tokenTest = testToken();
  if (!tokenTest.success) {
    console.error('❌ TOKEN TEST FAILED - CANNOT PROCEED');
    return;
  }
  
  const resultsCount = await checkInterviewResults();
  
  console.log('📋 SUMMARY:');
  console.log(`  - Token Valid: ${tokenTest.success}`);
  console.log(`  - Interview Results: ${resultsCount}`);
  console.log(`  - PDF Generation: ${resultsCount > 0 ? 'READY' : 'NEEDS DATA'}`);
  console.log('');
  console.log('🔑 USE THIS TOKEN IN BROWSER:');
  console.log(`localStorage.setItem('token', '${tokenTest.token}');`);
  console.log(`localStorage.setItem('user', '${JSON.stringify(tokenTest.user)}');`);
  console.log('');
  console.log('🌐 THEN NAVIGATE TO: http://localhost:3001/admin/pre-form-one/2025/interview-results');
  console.log('📄 TRY PDF DOWNLOAD FROM THERE');
};

runTests().catch(console.error);

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

console.log('🔑 TOKEN:', token);
console.log('🌐 TEST URL: http://localhost:3001/api/pre-form-one/2025/interview-results/pdf');
console.log('📋 COPY THIS COMMAND:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3001/api/pre-form-one/2025/interview-results/pdf -o test.pdf`);

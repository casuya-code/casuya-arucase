const jwt = require('jsonwebtoken');

// Test token generation and validation
async function testAuth() {
  try {
    // Check JWT secret
    const JWT_SECRET = process.env.JWT_SECRET_KEY || 'dev-secret-key';
    console.log('JWT Secret:', JWT_SECRET ? 'Set' : 'Not set');
    
    // Create a test token
    const testUser = {
      user_id: 'testuser',
      role: 'admin',
      permissions: { 'admin': true }
    };
    
    const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '5m' });
    console.log('Generated token:', token.substring(0, 50) + '...');
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verification successful:', decoded);
    
    // Check if token exists in localStorage pattern
    console.log('\nChecking if we can find any existing tokens...');
    const fs = require('fs');
    const path = require('path');
    
    // Look for any localStorage files or config that might have tokens
    const possibleFiles = [
      '.env',
      '.env.local',
      '.env.development'
    ];
    
    for (const file of possibleFiles) {
      try {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          console.log(`\n${file} contents:`, content);
        }
      } catch (err) {
        console.log(`Could not read ${file}:`, err.message);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAuth();

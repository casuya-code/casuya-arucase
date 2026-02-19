/**
 * Wait for PostgreSQL connections to close, then run migration
 * Run: node backend/scripts/waitAndMigrate.js
 */

console.log('⏳ Waiting 10 seconds for PostgreSQL connections to close...');
console.log('💡 If this persists, you may need to restart your PostgreSQL server or close other connections.\n');

setTimeout(async () => {
  const { spawn } = require('child_process');
  
  process.env.MYSQL_PASSWORD = 'Mkalanga1994!@';
  process.env.MYSQL_HOST = 'localhost';
  process.env.MYSQL_PORT = '3306';
  process.env.MYSQL_USER = 'root';
  process.env.MYSQL_DATABASE = 'arucase';
  
  const migration = spawn('node', ['scripts/migrateMySQLtoPostgreSQL.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  migration.on('close', (code) => {
    process.exit(code);
  });
}, 10000);


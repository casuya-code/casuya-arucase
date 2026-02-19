/**
 * Create Database Script
 * Creates the arucase database if it doesn't exist
 */
require('dotenv').config();
const { Pool } = require('pg');

async function createDatabase() {
  // Connect to default postgres database to create our database
  const adminPool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: 'postgres', // Connect to default postgres database
  });

  const dbName = process.env.PGDATABASE || 'arucase';

  try {
    console.log(`Creating database "${dbName}"...`);
    
    // Check if database exists
    const checkResult = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`✅ Database "${dbName}" already exists!`);
    } else {
      // Create database (cannot use parameterized query for CREATE DATABASE)
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully!`);
    }
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
}

createDatabase()
  .then(() => {
    console.log('Database setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create database:', error);
    process.exit(1);
  });


/**
 * Close idle PostgreSQL connections to free up connection slots
 * Run: node backend/scripts/closeIdleConnections.js
 */

require('dotenv').config();
const { Client } = require('pg');

const pgConfig = {
  host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432'),
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'railway',
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
};

async function closeIdleConnections() {
  let client = null;
  
  try {
    console.log('📡 Connecting to PostgreSQL...');
    client = new Client(pgConfig);
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Get current connections
    const connectionsResult = await client.query(`
      SELECT 
        pid,
        usename,
        application_name,
        client_addr,
        state,
        state_change,
        query_start,
        LEFT(query, 50) as query_preview
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
      ORDER BY state_change DESC
    `);

    console.log(`📊 Current Connections: ${connectionsResult.rows.length}\n`);
    
    if (connectionsResult.rows.length > 0) {
      console.log('Active Connections:');
      connectionsResult.rows.forEach((conn, idx) => {
        console.log(`  ${idx + 1}. PID: ${conn.pid}, State: ${conn.state}, App: ${conn.application_name || 'N/A'}, Query: ${conn.query_preview || 'N/A'}`);
      });
    }

    // Close idle connections
    const idleResult = await client.query(`
      SELECT pid
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'idle'
        AND pid <> pg_backend_pid()
    `);

    if (idleResult.rows.length > 0) {
      console.log(`\n🔄 Closing ${idleResult.rows.length} idle connection(s)...`);
      
      for (const row of idleResult.rows) {
        try {
          await client.query(`SELECT pg_terminate_backend(${row.pid})`);
          console.log(`  ✅ Closed connection PID: ${row.pid}`);
        } catch (error) {
          console.log(`  ⚠️  Could not close PID ${row.pid}: ${error.message}`);
        }
      }
      
      console.log(`\n✅ Closed ${idleResult.rows.length} idle connection(s)`);
    } else {
      console.log('\n✅ No idle connections to close');
    }

    // Show remaining connections
    const remainingResult = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);
    
    console.log(`\n📊 Remaining connections: ${remainingResult.rows[0].count}`);
    console.log('✅ Ready for migration!\n');

  } catch (error) {
    if (error.message && error.message.includes('too many clients')) {
      console.error('❌ Cannot connect - too many clients already!');
      console.error('💡 You may need to restart PostgreSQL or wait longer.');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('🔌 Connection closed');
    }
    process.exit(0);
  }
}

closeIdleConnections();


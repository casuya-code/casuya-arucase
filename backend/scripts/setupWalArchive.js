/**
 * Configure PostgreSQL WAL archiving for point-in-time recovery.
 * Run: node scripts/setupWalArchive.js
 * Requires PostgreSQL superuser access.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'wal');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runPsql(query) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    const args = ['-c', query];
    if (env.DATABASE_URL) {
      args.unshift(env.DATABASE_URL);
      args.unshift('-d');
    }
    const child = spawn('psql', args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`psql exited ${code}: ${stderr}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  console.log('Checking WAL archiving status...');
  try {
    const { stdout } = await new Promise((resolve, reject) => {
      const env = { ...process.env };
      const args = [
        '-c', "SELECT pg_is_in_recovery(), current_setting('archive_mode'), current_setting('archive_command')",
        '-t', '-A',
      ];
      if (env.DATABASE_URL) {
        args.unshift(env.DATABASE_URL);
        args.unshift('-d');
      }
      const child = spawn('psql', args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = '';
      child.stdout.on('data', (d) => { out += d.toString(); });
      child.stderr.on('data', (d) => { err += d.toString(); });
      child.on('close', (code) => {
        if (code === 0) resolve({ stdout: out });
        else reject(new Error(`psql exited ${code}: ${err}`));
      });
      child.on('error', reject);
    });

    const parts = stdout.trim().split('|');
    const inRecovery = parts[0]?.trim() === 't';
    const archiveMode = parts[1]?.trim();
    const archiveCmd = parts[2]?.trim();

    console.log('  In recovery:', inRecovery);
    console.log('  archive_mode:', archiveMode);
    console.log('  archive_command:', archiveCmd);

    if (inRecovery) {
      console.log('This is a replica — WAL archiving is managed by the primary.');
      return;
    }

    if (archiveMode === 'on' && archiveCmd && archiveCmd !== '(disabled)') {
      console.log('WAL archiving is already configured.');
      return;
    }

    console.log('WAL archiving is not configured. To enable:');
    console.log();
    console.log('1. Edit postgresql.conf:');
    console.log('   wal_level = replica');
    console.log('   archive_mode = on');
    console.log(`   archive_command = 'cp %p ${BACKUP_DIR.replace(/\\/g, '/')}/%f'`);
    console.log('2. Restart PostgreSQL.');
    console.log('3. Run: SELECT pg_create_restore_point(\'before-upgrade\');');
    console.log();
    console.log('For Railway managed Postgres, WAL archiving is handled by Railway.');
    console.log('Enable point-in-time recovery in Railway dashboard → PostgreSQL settings.');
  } catch (err) {
    console.error('Error:', err.message);
    console.log('Make sure psql is installed and DATABASE_URL is set.');
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

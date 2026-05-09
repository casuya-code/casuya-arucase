const { query } = require('./config/database');

(async () => {
  try {
    console.log('Checking if preform_one_scores table exists...');
    const result = await query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2', ['public', 'preform_one_scores']);
    console.log('Table exists:', result.rowCount > 0);
    
    if (result.rowCount > 0) {
      console.log('Table exists! Getting structure...');
      const desc = await query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', ['preform_one_scores']);
      console.log('Table structure:', desc.rows);
      
      console.log('Checking sample data...');
      const sample = await query('SELECT COUNT(*) as count FROM preform_one_scores');
      console.log('Records in table:', sample.rows[0].count);
    } else {
      console.log('Table does not exist!');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
})();

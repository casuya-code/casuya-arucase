/**
 * One-off test for interview results calculate (run: node scripts/testInterviewCalculate.js)
 */
const { withTransaction } = require('../config/database');
const { calculateAndSavePreFormOneResults } = require('../utils/preFormOneResultsCalculate');

async function main() {
  const year = '2025';
  try {
    const result = await withTransaction(async (client) =>
      calculateAndSavePreFormOneResults(client, {
        year,
        scoreType: 'interview',
        subjectsTable: 'preformone_interview_subjects',
        resultsTable: 'preform_one_interview_results',
      })
    );
    console.log('OK', result.length);
    process.exit(0);
  } catch (e) {
    console.error('FAIL', e.message);
    console.error(e);
    process.exit(1);
  }
}

main();

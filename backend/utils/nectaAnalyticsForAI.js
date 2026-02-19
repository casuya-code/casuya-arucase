/**
 * Build a text summary of NECTA stored results for AI context.
 * Used by public chatbot and admin AI Matters so the AI can answer NECTA questions.
 */
function gradeToPoint(grade) {
  const g = (grade || '').toString().trim().toUpperCase();
  if (['I', 'A', '1'].includes(g)) return 5;
  if (['II', 'B', '2'].includes(g)) return 4;
  if (['III', 'C', '3'].includes(g)) return 3;
  if (['IV', 'D', '4'].includes(g)) return 2;
  if (['0', 'E', '5'].includes(g)) return 1;
  return 0;
}

/**
 * @param {Function} query - database query(path, params)
 * @param {{ includeTopCandidates?: boolean }} opts - includeTopCandidates: include top 15 names (admin only; use false for public)
 * @returns {Promise<string>} Summary text for AI
 */
async function getNectaSummaryForAI(query, opts = {}) {
  const { includeTopCandidates = false } = opts;
  let text = '';
  try {
    const overview = await query(
      'SELECT exam_type, year, COUNT(*) as total FROM necta_candidates GROUP BY exam_type, year ORDER BY year DESC, exam_type LIMIT 20'
    );
    const rows = overview.rows || [];
    if (rows.length === 0) {
      return 'No NECTA result data has been imported yet. Admin can import from Admin → NECTA URLs and then use "Import" to fetch and store results.';
    }
    text += 'NECTA RESULTS DATA (our school). Grade scale: I/1=5 pts, II/2=4, III/3=3, IV/4=2, 0/E/5=1. GPA = average points per subject.\n';
    for (const r of rows) {
      const exam = (r.exam_type || '').toUpperCase();
      const year = r.year;
      const total = parseInt(r.total, 10) || 0;
      text += `\n--- ${exam} ${year} (${total} candidates) ---\n`;

      const grades = await query(
        'SELECT subject_name, grade FROM necta_subject_grades WHERE exam_type = $1 AND year = $2',
        [r.exam_type, r.year]
      );
      const bySubject = {};
      for (const row of (grades.rows || [])) {
        const name = (row.subject_name || 'Unknown').trim();
        if (!bySubject[name]) bySubject[name] = { count: 0, sumPoints: 0, grade_counts: {} };
        bySubject[name].count++;
        bySubject[name].sumPoints += gradeToPoint(row.grade);
        const g = (row.grade || '').toString().trim().toUpperCase();
        bySubject[name].grade_counts[g] = (bySubject[name].grade_counts[g] || 0) + 1;
      }
      const subjectStats = Object.entries(bySubject)
        .map(([name, s]) => {
          const gpa = s.count ? (s.sumPoints / s.count).toFixed(2) : '0';
          const counts = Object.entries(s.grade_counts).map(([k, v]) => `${k}=${v}`).join(', ');
          return `  ${name}: GPA ${gpa}, counts: ${counts}`;
        })
        .join('\n');
      text += subjectStats + '\n';

      if (includeTopCandidates) {
        const candidates = await query(
          'SELECT candidate_no, candidate_name, division, points FROM necta_candidates WHERE exam_type = $1 AND year = $2 ORDER BY points DESC NULLS LAST LIMIT 15',
          [r.exam_type, r.year]
        );
        const top = (candidates.rows || []).map((c, i) => `${i + 1}. ${c.candidate_name || c.candidate_no} (Div ${c.division || '-'}, ${c.points ?? '-'} pts)`).join('\n');
        text += 'Top 15 by points:\n' + (top || ' (no points data)') + '\n';
      }
    }
  } catch (e) {
    text = 'NECTA data unavailable: ' + (e.message || 'error');
  }
  return text;
}

module.exports = { getNectaSummaryForAI };

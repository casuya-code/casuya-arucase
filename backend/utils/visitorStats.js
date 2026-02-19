/**
 * Visitor Statistics Utility
 */
const { query } = require('../config/database');

const updateVisitorStats = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const week = `${new Date().getFullYear()}-W${getWeekNumber(new Date())}`;
    
    // Update total
    await query(
      `INSERT INTO visitor_stats (stat_type, stat_key, stat_value)
       VALUES ('total', 'total_visits', 1)
       ON CONFLICT (stat_type, stat_key)
       DO UPDATE SET stat_value = visitor_stats.stat_value + 1`
    );
    
    // Update daily
    await query(
      `INSERT INTO visitor_stats (stat_type, stat_key, stat_value)
       VALUES ('daily', $1, 1)
       ON CONFLICT (stat_type, stat_key)
       DO UPDATE SET stat_value = visitor_stats.stat_value + 1`,
      [today]
    );
    
    // Update weekly
    await query(
      `INSERT INTO visitor_stats (stat_type, stat_key, stat_value)
       VALUES ('weekly', $1, 1)
       ON CONFLICT (stat_type, stat_key)
       DO UPDATE SET stat_value = visitor_stats.stat_value + 1`,
      [week]
    );
  } catch (error) {
    console.error('Error updating visitor stats:', error);
    throw error;
  }
};

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = {
  updateVisitorStats
};


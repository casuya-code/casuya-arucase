/**
 * User Activity Logger
 */
const { query } = require('../config/database');

const saveUserActivity = async (activity) => {
  try {
    // Ensure username is provided and not null/undefined
    const username = activity.username || 'unknown';
    
    if (!username || username === 'null' || username === 'undefined') {
      console.warn('Cannot save activity: username is missing or invalid');
      return;
    }
    
    await query(
      `INSERT INTO user_activity (username, activity_type, description, details, timestamp)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        username,
        activity.activity_type,
        activity.description,
        JSON.stringify(activity.details || {})
      ]
    );
  } catch (error) {
    console.error('Error saving user activity:', error);
    // Don't throw - logging shouldn't break the main flow
  }
};

module.exports = {
  saveUserActivity
};


const crypto = require('crypto');

function createAlerter({ webhookUrl, signingKey = 'change-me' }) {
  function send(event) {
    if (!webhookUrl) return;
    const payload = Buffer.from(JSON.stringify(event)).toString('base64');
    const signature = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');

    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, signature }),
    }).catch(() => {});
  }

  return { send };
}

module.exports = { createAlerter };

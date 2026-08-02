const fs = require('fs');
const path = require('path');

const HONEYTOKENS_DIR = path.join(__dirname, '..', 'assets', 'honeytokens');

function listHoneytokens() {
  try {
    return fs.readdirSync(HONEYTOKENS_DIR);
  } catch {
    return [];
  }
}

function isHoneytokenPath(requestPath) {
  return listHoneytokens().some((file) => requestPath.endsWith(`/${file}`));
}

module.exports = { listHoneytokens, isHoneytokenPath };

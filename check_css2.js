const fs = require('fs');
const c = fs.readFileSync('src/pages/analytics/Promo.css', 'utf8');
const lines = c.split('\n');

// Find duplicate selectors
const selectors = {};
lines.forEach((l, i) => {
  const m = l.match(/^\.([a-z][a-z0-9-]*)\s*\{/i);
  if (m) {
    selectors[m[1]] = selectors[m[1]] || [];
    selectors[m[1]].push(i + 1);
  }
});
const dups = Object.entries(selectors).filter(([k, v]) => v.length > 1);
console.log('Duplicate selectors:', dups.length);
dups.forEach(([k, v]) => console.log(k, 'at lines:', v.join(',')));

// Check for !important
const important = c.match(/!important/g);
console.log('!important count:', important ? important.length : 0);

// Check admin-main-content rules
const rules = c.match(/\.admin-main-content\s*\{[^}]*\}/g);
console.log('admin-main-content rules:', rules);

// Check for duplicate CSS rules (same property in same selector)
const blocks = c.match(/[^{}]+\{[^{}]*\}/g) || [];
console.log('Total CSS blocks:', blocks.length);

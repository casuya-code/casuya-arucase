/**
 * Compare Backend Routes with Frontend Pages
 * Identifies backend features missing in frontend
 * Run: node backend/scripts/compareBackendFrontend.js
 */

const fs = require('fs');
const path = require('path');

// Extract routes from backend files
function extractBackendRoutes() {
  const routesDir = path.join(__dirname, '../routes');
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  const routes = {
    admin: [],
    students: [],
    auth: [],
    public: [],
    reports: [],
    analytics: [],
    logs: []
  };

  routeFiles.forEach(file => {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const routePrefix = file.replace('.js', '');
    
    // Extract route definitions
    const routeRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const route = match[2];
      const fullRoute = `${method} /api/${routePrefix}${route}`;
      
      if (routes[routePrefix]) {
        routes[routePrefix].push(fullRoute);
      }
    }
  });

  return routes;
}

// Extract frontend pages
function extractFrontendPages() {
  const pagesDir = path.join(__dirname, '../../frontend/src/pages');
  const pages = {
    admin: [],
    students: [],
    academic: [],
    comments: [],
    reports: [],
    analytics: [],
    results: [],
    public: []
  };

  function scanDirectory(dir, category) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        const subCategory = item;
        scanDirectory(itemPath, subCategory);
      } else if (item.endsWith('.jsx') && !item.includes('Selection') && !item.includes('Track')) {
        const pageName = item.replace('.jsx', '');
        if (pages[category]) {
          pages[category].push(pageName);
        }
      }
    });
  }

  scanDirectory(pagesDir, '');
  return pages;
}

// Main comparison
function compareBackendFrontend() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Comparing Backend Routes vs Frontend Pages');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const backendRoutes = extractBackendRoutes();
  const frontendPages = extractFrontendPages();

  console.log('📊 BACKEND ROUTES SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Object.keys(backendRoutes).forEach(key => {
    console.log(`${key}: ${backendRoutes[key].length} routes`);
  });

  console.log('\n📊 FRONTEND PAGES SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Object.keys(frontendPages).forEach(key => {
    console.log(`${key}: ${frontendPages[key].length} pages`);
  });

  console.log('\n\n🔍 DETAILED BACKEND ROUTES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Object.keys(backendRoutes).forEach(key => {
    if (backendRoutes[key].length > 0) {
      console.log(`\n${key.toUpperCase()} Routes:`);
      backendRoutes[key].forEach(route => {
        console.log(`  - ${route}`);
      });
    }
  });

  console.log('\n\n📄 DETAILED FRONTEND PAGES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Object.keys(frontendPages).forEach(key => {
    if (frontendPages[key].length > 0) {
      console.log(`\n${key.toUpperCase()} Pages:`);
      frontendPages[key].forEach(page => {
        console.log(`  - ${page}`);
      });
    }
  });

  console.log('\n\n✅ Comparison complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

compareBackendFrontend();


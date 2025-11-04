#!/usr/bin/env node
/**
 * Post-build script to inject Tailwind CSS into Expo-generated HTML
 * This runs after expo export to ensure CSS is properly linked
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');
const cssPath = path.join(distDir, 'styles.css');

console.log('[Post-build] Injecting Tailwind CSS...');

// Check if CSS file exists
if (!fs.existsSync(cssPath)) {
  console.error('[Post-build] ERROR: styles.css not found at', cssPath);
  console.error('[Post-build] Make sure web:build:css ran successfully');
  process.exit(1);
}

// Check if index.html exists
if (!fs.existsSync(indexPath)) {
  console.error('[Post-build] ERROR: index.html not found at', indexPath);
  console.error('[Post-build] Make sure expo export ran successfully');
  process.exit(1);
}

// Read index.html
let html = fs.readFileSync(indexPath, 'utf8');

// Check if CSS link already exists
if (html.includes('styles.css')) {
  console.log('[Post-build] CSS link already exists in HTML');
  process.exit(0);
}

// Inject CSS link before </head>
const cssLink = '    <link rel="stylesheet" href="/styles.css" />\n';
const headClosingIndex = html.indexOf('</head>');

if (headClosingIndex === -1) {
  console.error('[Post-build] ERROR: Could not find </head> tag');
  process.exit(1);
}

// Insert CSS link before </head>
html = html.slice(0, headClosingIndex) + cssLink + html.slice(headClosingIndex);

// Write updated HTML
fs.writeFileSync(indexPath, html, 'utf8');

console.log('[Post-build] ✅ Successfully injected Tailwind CSS into index.html');
console.log('[Post-build] CSS file size:', fs.statSync(cssPath).size, 'bytes');


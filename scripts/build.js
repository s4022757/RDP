#!/usr/bin/env node
/**
 * CONSTELLATE • Build Script for Cloudflare Pages
 * Copies static kiosk client assets to dist/ for clean CDN deployment.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

console.log('Building CONSTELLATE static kiosk assets...');

// Clean existing dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Core files and directories required by the kiosk PWA
const targets = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'star-visualizer.js',
  'icons',
  'styles',
  'scripts',
  'audio'
];

for (const target of targets) {
  const src = path.join(rootDir, target);
  const dest = path.join(distDir, target);

  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, {
      recursive: true,
      filter: (srcPath) => {
        const basename = path.basename(srcPath);
        // Exclude build script, temp files, and DS_Store from client bundle
        if (basename === 'build.js' || basename === '.DS_Store' || basename.endsWith('.tmp')) {
          return false;
        }
        return true;
      }
    });
    console.log(`✓ Copied ${target} -> dist/${target}`);
  } else {
    console.warn(`! Target not found: ${target}`);
  }
}

console.log('\n✨ Build complete! Output directory: dist/');

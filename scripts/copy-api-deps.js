#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Copying server dependencies to api directory...');

// Copy necessary directories
const dependencies = [
  { src: 'src/server', dest: 'api' },
  { src: 'src/models', dest: 'api/models' },
  { src: 'src/lib', dest: 'api/lib' },
  { src: 'src/types', dest: 'api/types' }
];

dependencies.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    console.log(`  Copying ${src} -> ${dest}`);
    if (src === 'src/server') {
      // For server directory, copy contents to api root
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          copyDirSync(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    } else {
      copyDirSync(src, dest);
    }
  } else {
    console.log(`  ⚠️  ${src} not found, skipping...`);
  }
});

console.log('✅ API dependencies copied successfully!'); 
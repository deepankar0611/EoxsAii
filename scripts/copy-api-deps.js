#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

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

// Function to fix import paths in copied files
function fixImportPaths(filePath) {
  if (!fs.existsSync(filePath) || !filePath.endsWith('.ts')) {
    return;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Define import path mappings for different file locations
    const importMappings = [
      // For files in api/lib/
      { from: "import config from '../server/config'", to: "import config from '../config'" },
      
      // For files in api/services/
      { from: "import { IMessage, Message } from '../../models/message.js'", to: "import { IMessage, Message } from '../models/message'" },
      { from: "import { IMessage } from '../../models/message.js'", to: "import { IMessage } from '../models/message'" },
      { from: "import { EmbeddingService } from './embeddingService.js'", to: "import { EmbeddingService } from './embeddingService'" },
      
      // For files in api/api/routes/
      { from: "import { Message, IMessage } from '../../../models/message.js'", to: "import { Message, IMessage } from '../../models/message'" },
      { from: "import { Thread } from '../../../models/thread.js'", to: "import { Thread } from '../../models/thread'" },
      { from: "import { withDatabase } from '../../../lib/db.js'", to: "import { withDatabase } from '../../lib/db'" },
      { from: "} from '../middleware.js'", to: "} from '../middleware'" },
      { from: "import { isTrivialMessage } from '../../../utils/messageUtils.js'", to: "import { isTrivialMessage } from '../../utils/messageUtils'" },
      { from: "import { embeddingService, openaiService } from '../index.js'", to: "import { embeddingService, openaiService } from '../index'" },
      
      // Remove .js extensions from all imports
      { from: /from '([^']+)\.js'/g, to: "from '$1'" },
      { from: /from "([^"]+)\.js"/g, to: 'from "$1"' }
    ];
    
    // Apply mappings
    for (const mapping of importMappings) {
      if (typeof mapping.from === 'string') {
        if (content.includes(mapping.from)) {
          content = content.replace(mapping.from, mapping.to);
          modified = true;
        }
      } else {
        // RegExp mapping
        if (mapping.from.test(content)) {
          content = content.replace(mapping.from, mapping.to);
          modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`    🔧 Fixed import paths in ${path.relative('api', filePath)}`);
    }
  } catch (error) {
    console.warn(`    ⚠️  Could not fix imports in ${filePath}: ${error.message}`);
  }
}

// Function to recursively fix import paths in a directory
function fixImportPathsInDir(dir) {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      fixImportPathsInDir(fullPath);
    } else if (entry.name.endsWith('.ts')) {
      fixImportPaths(fullPath);
    }
  }
}

console.log('📦 Copying server dependencies to api directory...');

// Copy necessary directories
const dependencies = [
  { src: 'src/server', dest: 'api' },
  { src: 'src/models', dest: 'api/models' },
  { src: 'src/lib', dest: 'api/lib' },
  { src: 'src/types', dest: 'api/types' },
  { src: 'src/utils', dest: 'api/utils' }
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

console.log('🔧 Fixing import paths in copied files...');
fixImportPathsInDir('api');

console.log('✅ API dependencies copied and import paths fixed successfully!'); 
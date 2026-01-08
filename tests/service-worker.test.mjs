// ABOUTME: Validates that download renaming relies on the determining filename hook.
// ABOUTME: Ensures unsupported APIs are not referenced in the service worker.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceWorkerPath = path.resolve(__dirname, '..', 'service_worker.js');
const contents = fs.readFileSync(serviceWorkerPath, 'utf8');

assert.ok(
  contents.includes('chrome.downloads.onDeterminingFilename'),
  'service_worker.js should register onDeterminingFilename'
);
assert.ok(
  !contents.includes('chrome.downloads.setFilename'),
  'service_worker.js should not use setFilename'
);

console.log('Service worker API usage tests passed.');

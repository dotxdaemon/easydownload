// ABOUTME: Runs filename generation tests for the download renaming logic.
// ABOUTME: Ensures template rendering and sanitization behave as expected.
import assert from 'node:assert/strict';
import { buildFilename, sanitizeTitle, formatDate } from '../util.js';

const settings = {
  template: '{domain}_{title}_{date}.{ext}',
  maxTitleLength: 20,
  removeWww: true,
};

const date = new Date('2024-05-02T12:00:00');
const sample = {
  domain: 'example.com',
  title: 'Hello, world! This is a test.',
  ext: 'pdf',
  date,
};

assert.equal(formatDate(date), '2024-05-02');
assert.equal(sanitizeTitle(sample.title, settings.maxTitleLength), 'Hello_world_This_is');
assert.equal(
  buildFilename(sample, settings),
  'example.com_Hello_world_This_is_2024-05-02.pdf'
);

const noExt = {
  domain: 'example.com',
  title: 'Plain Title',
  ext: '',
  date,
};

assert.equal(
  buildFilename(noExt, settings),
  'example.com_Plain_Title_2024-05-02'
);

const emptyTitle = {
  domain: '',
  title: '***',
  ext: 'txt',
  date,
};

assert.equal(
  buildFilename(emptyTitle, settings),
  'unknown-domain_download_2024-05-02.txt'
);

console.log('All filename tests passed.');

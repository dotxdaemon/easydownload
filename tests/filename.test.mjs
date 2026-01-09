// ABOUTME: Runs filename generation tests for the download renaming logic.
// ABOUTME: Ensures template rendering and sanitization behave as expected.
import assert from 'node:assert/strict';
import {
  buildFilename,
  buildReferrerPattern,
  formatDate,
  pickTabByReferrer,
  resolveDownloadTitle,
  resolveExtensionFromDownload,
  sanitizeFilename,
  sanitizeTitle,
} from '../utils.js';

const settings = {
  filenamePattern: '%domain%_%title%_%date%.%ext%',
  maxTitleLength: 20,
  removeWww: true,
};

const date = new Date('2024-05-02T12:00:00');
const sample = {
  domain: 'example.com',
  title: 'Hello, world! This is a test.',
  ext: 'pdf',
  date,
  originalName: 'My Document',
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
  originalName: 'Plain Title',
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
  originalName: 'download.txt',
};

assert.equal(
  buildFilename(emptyTitle, settings),
  'unknown-domain_download_2024-05-02.txt'
);

assert.equal(
  resolveDownloadTitle(
    {
      tabTitle: '',
      urlValue: '',
      filename: 'download.jpg',
    },
    settings.maxTitleLength
  ),
  'download'
);

assert.equal(
  buildReferrerPattern('https://example.com/path/page.html?query=1'),
  'https://example.com/*'
);

assert.equal(buildReferrerPattern(''), '');

const matchingTab = {
  id: 1,
  url: 'https://example.com/path/page.html?query=1',
  title: 'Example Page',
};
const referrerTabs = [
  {
    id: 2,
    url: 'https://example.com/other',
    title: 'Other Page',
  },
  matchingTab,
];

assert.equal(pickTabByReferrer('', referrerTabs), null);
assert.equal(pickTabByReferrer('https://example.com/path/page.html?query=1', []), null);
assert.equal(
  pickTabByReferrer('https://example.com/path/page.html?query=1', referrerTabs),
  matchingTab
);

assert.equal(sanitizeFilename('report<2024>|draft*'), 'report_2024__draft_');
assert.equal(sanitizeFilename('folder/name<one>'), 'folder/name_one_');
assert.equal(sanitizeFilename('a'.repeat(300)).length, 250);

const patternSettings = {
  ...settings,
  filenamePattern: '%domain%/%year%/%title%.%ext%',
};

assert.equal(
  buildFilename(sample, patternSettings),
  'example.com/2024/Hello_world_This_is.pdf'
);

const originalNameSettings = {
  ...settings,
  filenamePattern: '%original_name%_%date%.%ext%',
};

assert.equal(
  buildFilename(
    {
      ...sample,
      originalName: 'Photo 1.jpg',
      ext: 'jpg',
    },
    originalNameSettings
  ),
  'Photo 1_2024-05-02.jpg'
);

assert.equal(
  resolveExtensionFromDownload({
    filename: 'image.jpg',
    mime: 'image/webp',
    finalUrl: '',
    url: '',
  }),
  'webp'
);

console.log('All filename tests passed.');

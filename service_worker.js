// ABOUTME: Renames downloads based on page context and user settings.
// ABOUTME: Listens for download events and applies sanitized templates.

import {
  buildFilename,
  defaultSettings,
  extractBasename,
  extractExtensionFromName,
  extractExtensionFromUrl,
  extractHostname,
  resolveDownloadTitle,
  sanitizeDomain,
  sanitizeExtension,
} from './util.js';

const processedDownloadIds = new Set();
const pendingDownloads = new Map();
const maxAttempts = 5;
const retryDelayMs = 500;

function getStorageArea() {
  return chrome.storage?.sync || chrome.storage.local;
}

function readSettings() {
  return new Promise((resolve) => {
    getStorageArea().get(defaultSettings, (items) => {
      resolve(items);
    });
  });
}

function writeSettings(settings) {
  return new Promise((resolve) => {
    getStorageArea().set(settings, () => resolve());
  });
}

function getDateString() {
  return new Date();
}

function getDomainFromDownload(downloadItem, tabInfo, settings) {
  const tabUrl = tabInfo?.url || '';
  const urlValue = tabUrl || downloadItem.finalUrl || downloadItem.url || '';
  const hostname = extractHostname(urlValue);
  const sanitized = sanitizeDomain(hostname, settings.removeWww);
  return sanitized || 'unknown-domain';
}

function getTitleFromDownload(downloadItem, tabInfo, settings) {
  return resolveDownloadTitle(
    {
      tabTitle: tabInfo?.title || '',
      urlValue: downloadItem.finalUrl || downloadItem.url || '',
      filename: downloadItem.filename || '',
    },
    settings.maxTitleLength
  );
}

function getExtensionFromDownload(downloadItem) {
  const fromFilename = extractExtensionFromName(downloadItem.filename || '');
  if (fromFilename) {
    return sanitizeExtension(fromFilename);
  }
  const fromFinalUrl = extractExtensionFromUrl(downloadItem.finalUrl || '');
  if (fromFinalUrl) {
    return sanitizeExtension(fromFinalUrl);
  }
  const fromUrl = extractExtensionFromUrl(downloadItem.url || '');
  return sanitizeExtension(fromUrl);
}

function buildTargetFilename(context, settings) {
  const filename = buildFilename(context, settings);
  return filename || 'download';
}

function getCurrentBasename(downloadItem) {
  return extractBasename(downloadItem.filename || '');
}

function shouldRename(downloadItem, targetFilename) {
  const currentBase = getCurrentBasename(downloadItem);
  return currentBase !== targetFilename;
}

function queueRetry(downloadId, attempt) {
  pendingDownloads.set(downloadId, attempt);
  setTimeout(() => {
    chrome.downloads.search({ id: downloadId }, (items) => {
      if (!items || items.length === 0) {
        pendingDownloads.delete(downloadId);
        return;
      }
      const item = items[0];
      attemptRename(item, attempt + 1);
    });
  }, retryDelayMs);
}

async function attemptRename(downloadItem, attempt = 0) {
  if (!downloadItem || processedDownloadIds.has(downloadItem.id)) {
    return;
  }
  const settings = await readSettings();
  if (!settings.enabled) {
    return;
  }
  if (attempt >= maxAttempts) {
    pendingDownloads.delete(downloadItem.id);
    return;
  }

  const tabInfo = await getTabInfo(downloadItem.tabId);
  const hasFilename = Boolean(downloadItem.filename);

  if (!hasFilename) {
    queueRetry(downloadItem.id, attempt);
    return;
  }

  const context = {
    domain: getDomainFromDownload(downloadItem, tabInfo, settings),
    title: getTitleFromDownload(downloadItem, tabInfo, settings),
    ext: getExtensionFromDownload(downloadItem),
    date: getDateString(),
  };

  const targetFilename = buildTargetFilename(context, settings);
  if (!targetFilename || !/[a-zA-Z0-9]/.test(targetFilename)) {
    pendingDownloads.delete(downloadItem.id);
    return;
  }
  if (!shouldRename(downloadItem, targetFilename)) {
    processedDownloadIds.add(downloadItem.id);
    pendingDownloads.delete(downloadItem.id);
    return;
  }

  chrome.downloads.setFilename(
    downloadItem.id,
    { filename: targetFilename, conflictAction: 'uniquify' },
    () => {
      processedDownloadIds.add(downloadItem.id);
      pendingDownloads.delete(downloadItem.id);
    }
  );
}

function getTabInfo(tabId) {
  if (typeof tabId !== 'number' || tabId < 0) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(tab);
    });
  });
}

chrome.downloads.onCreated.addListener((downloadItem) => {
  attemptRename(downloadItem, 0);
});

chrome.downloads.onChanged.addListener((delta) => {
  if (!delta || typeof delta.id !== 'number') {
    return;
  }
  if (!pendingDownloads.has(delta.id)) {
    return;
  }
  chrome.downloads.search({ id: delta.id }, (items) => {
    if (!items || items.length === 0) {
      pendingDownloads.delete(delta.id);
      return;
    }
    const item = items[0];
    const attempt = pendingDownloads.get(delta.id) || 0;
    attemptRename(item, attempt + 1);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  writeSettings(defaultSettings);
});

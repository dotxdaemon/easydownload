// ABOUTME: Renames downloads based on page context and user settings.
// ABOUTME: Listens for download events and applies sanitized templates.

import {
  buildFilename,
  buildReferrerPattern,
  defaultSettings,
  extractBasename,
  extractExtensionFromName,
  extractExtensionFromUrl,
  extractHostname,
  pickTabByReferrer,
  resolveDownloadTitle,
  sanitizeDomain,
  sanitizeExtension,
} from './util.js';

const processedDownloadIds = new Set();

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

async function getSuggestedFilename(downloadItem) {
  if (!downloadItem || processedDownloadIds.has(downloadItem.id)) {
    return null;
  }
  const settings = await readSettings();
  if (!settings.enabled) {
    return null;
  }
  const tabInfo = await getTabInfo(downloadItem);
  const context = {
    domain: getDomainFromDownload(downloadItem, tabInfo, settings),
    title: getTitleFromDownload(downloadItem, tabInfo, settings),
    ext: getExtensionFromDownload(downloadItem),
    date: getDateString(),
  };
  const targetFilename = buildTargetFilename(context, settings);
  if (!targetFilename || !/[a-zA-Z0-9]/.test(targetFilename)) {
    return null;
  }
  if (!shouldRename(downloadItem, targetFilename)) {
    return null;
  }
  return targetFilename;
}

function getTabInfo(downloadItem) {
  const tabId = downloadItem?.tabId;
  if (typeof tabId === 'number' && tabId >= 0) {
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
  const referrer = downloadItem?.referrer || '';
  const referrerPattern = buildReferrerPattern(referrer);
  if (!referrerPattern) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    chrome.tabs.query({ url: referrerPattern }, (tabs) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(pickTabByReferrer(referrer, tabs));
    });
  });
}

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  if (!downloadItem || typeof suggest !== 'function') {
    return;
  }
  void (async () => {
    const targetFilename = await getSuggestedFilename(downloadItem);
    if (!targetFilename) {
      suggest();
      return;
    }
    processedDownloadIds.add(downloadItem.id);
    suggest({ filename: targetFilename, conflictAction: 'uniquify' });
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  writeSettings(defaultSettings);
});

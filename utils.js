// ABOUTME: Provides filename construction utilities for download renaming.
// ABOUTME: Centralizes sanitization and template rendering for reuse.

const mimeExtensionMap = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
};

export const defaultSettings = {
  enabled: true,
  filenamePattern: '%domain%_%title%_%date%',
  maxTitleLength: 80,
  removeWww: true,
  domainBlacklist: [],
};

export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeFilenamePart(value) {
  return (value || '').replace(/[<>:"/\\|?*]/g, '_');
}

export function sanitizeFilename(name) {
  const parts = String(name || '').split('/');
  const sanitized = parts.map((part) => sanitizeFilenamePart(part)).join('/');
  return sanitized.slice(0, 250);
}

export function sanitizeTitle(title, maxLength) {
  const trimmed = (title || '').trim();
  const replaced = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const collapsed = replaced.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!maxLength || maxLength <= 0) {
    return collapsed;
  }
  return collapsed.slice(0, maxLength).replace(/^_+|_+$/g, '');
}

export function sanitizeExtension(ext) {
  return (ext || '').replace(/[^a-zA-Z0-9]+/g, '');
}

export function sanitizeDomain(hostname, removeWww) {
  if (!hostname) {
    return '';
  }
  const normalized = hostname.toLowerCase();
  if (removeWww && normalized.startsWith('www.')) {
    return normalized.slice(4);
  }
  return normalized;
}

export function extractHostname(urlString) {
  if (!urlString) {
    return '';
  }
  try {
    const parsed = new URL(urlString);
    return parsed.hostname;
  } catch (error) {
    return '';
  }
}

export function extractBasename(pathValue) {
  if (!pathValue) {
    return '';
  }
  const parts = pathValue.split('/');
  return parts[parts.length - 1] || '';
}

export function buildReferrerPattern(referrer) {
  if (!referrer) {
    return '';
  }
  try {
    const parsed = new URL(referrer);
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch (error) {
    return '';
  }
}

export function pickTabByReferrer(referrer, tabs) {
  if (!referrer || !Array.isArray(tabs) || tabs.length === 0) {
    return null;
  }
  const exact = tabs.find((tab) => tab?.url === referrer);
  if (exact) {
    return exact;
  }
  const firstWithUrl = tabs.find((tab) => tab?.url);
  return firstWithUrl || null;
}

export function resolveDownloadTitle(context, maxLength) {
  const tabTitle = context?.tabTitle || '';
  if (tabTitle) {
    return sanitizeTitle(tabTitle, maxLength) || 'download';
  }
  const urlValue = context?.urlValue || '';
  const nameFromUrl = extractBasename(urlValue);
  if (nameFromUrl) {
    const stripped = nameFromUrl.replace(/\.[^/.]+$/, '');
    const sanitized = sanitizeTitle(stripped, maxLength);
    if (sanitized) {
      return sanitized;
    }
  }
  const filename = context?.filename || '';
  const nameFromFilename = extractBasename(filename);
  if (nameFromFilename) {
    const stripped = nameFromFilename.replace(/\.[^/.]+$/, '');
    const sanitized = sanitizeTitle(stripped, maxLength);
    if (sanitized) {
      return sanitized;
    }
  }
  return 'download';
}

export function extractExtensionFromName(name) {
  const base = extractBasename(name);
  const dotIndex = base.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === base.length - 1) {
    return '';
  }
  return base.slice(dotIndex + 1);
}

export function extractExtensionFromUrl(urlString) {
  if (!urlString) {
    return '';
  }
  try {
    const parsed = new URL(urlString);
    return extractExtensionFromName(parsed.pathname);
  } catch (error) {
    return '';
  }
}

function resolveExtensionFromMimeType(mime) {
  if (!mime) {
    return '';
  }
  const [value] = String(mime).split(';');
  const parts = value.trim().split('/');
  if (parts.length !== 2) {
    return '';
  }
  const subtype = parts[1].trim().toLowerCase();
  if (!subtype) {
    return '';
  }
  const withoutSuffix = subtype.split('+')[0];
  const vendorPart = withoutSuffix.split('.').pop() || '';
  const withoutPrefix = vendorPart.startsWith('x-') ? vendorPart.slice(2) : vendorPart;
  const dashedParts = withoutPrefix.split('-');
  if (vendorPart.startsWith('x-') && dashedParts.length > 1) {
    return sanitizeExtension(dashedParts[0]);
  }
  const dashValue = dashedParts.length > 1 ? dashedParts[dashedParts.length - 1] : withoutPrefix;
  return sanitizeExtension(dashValue);
}

export function resolveExtensionFromDownload(downloadItem) {
  const fromFilename = sanitizeExtension(extractExtensionFromName(downloadItem?.filename || ''));
  const fromFinalUrl = sanitizeExtension(extractExtensionFromUrl(downloadItem?.finalUrl || ''));
  const fromUrl = sanitizeExtension(extractExtensionFromUrl(downloadItem?.url || ''));
  const mimeValue = downloadItem?.mime || '';
  const mimeExt = sanitizeExtension(mimeExtensionMap[mimeValue] || '') ||
    resolveExtensionFromMimeType(mimeValue);
  if (mimeExt && fromFilename && mimeExt !== fromFilename) {
    return mimeExt;
  }
  if (mimeExt && !fromFilename && !fromFinalUrl && !fromUrl) {
    return mimeExt;
  }
  return fromFilename || fromFinalUrl || fromUrl || mimeExt;
}

function applyFilenamePattern(pattern, tokens) {
  let result = pattern || '';
  if (!tokens.ext) {
    result = result.replace(/\.%ext%/g, '');
  }
  result = result
    .replace(/%domain%/g, tokens.domain)
    .replace(/%title%/g, tokens.title)
    .replace(/%date%/g, tokens.date)
    .replace(/%year%/g, tokens.year)
    .replace(/%original_name%/g, tokens.originalName)
    .replace(/%ext%/g, tokens.ext);
  return result;
}

function stripExtension(name) {
  return (name || '').replace(/\.[^/.]+$/, '');
}

export function buildFilename(context, settings) {
  const baseSettings = settings || defaultSettings;
  const domain = sanitizeDomain(context.domain, baseSettings.removeWww) || 'unknown-domain';
  const title = sanitizeTitle(context.title, baseSettings.maxTitleLength) || 'download';
  const date = formatDate(context.date);
  const year = String(context.date.getFullYear());
  const ext = sanitizeExtension(context.ext);
  const originalName = sanitizeFilenamePart(stripExtension(context.originalName || '')) || title;
  const rendered = applyFilenamePattern(baseSettings.filenamePattern, {
    domain,
    title,
    date,
    year,
    originalName,
    ext,
  });
  const sanitized = sanitizeFilename(rendered);
  if (!sanitized || !/[a-zA-Z0-9]/.test(sanitized)) {
    const fallback = `${domain}_${title}_${date}${ext ? `.${ext}` : ''}`;
    return sanitizeFilename(fallback);
  }
  if (!ext) {
    return sanitized.replace(/\.+$/, '');
  }
  return sanitized;
}

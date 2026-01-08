// ABOUTME: Provides filename construction utilities for download renaming.
// ABOUTME: Centralizes sanitization and template rendering for reuse.

export const defaultSettings = {
  enabled: true,
  template: '{domain}_{title}_{date}.{ext}',
  maxTitleLength: 80,
  removeWww: true,
  folderRoutingEnabled: false,
  folderRules: [],
};

export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

export function applyTemplate(template, tokens) {
  let result = template || '';
  if (!tokens.ext) {
    result = result.replace(/\.\{ext\}/g, '');
  }
  result = result
    .replace(/\{domain\}/g, tokens.domain)
    .replace(/\{title\}/g, tokens.title)
    .replace(/\{date\}/g, tokens.date)
    .replace(/\{ext\}/g, tokens.ext);
  return result;
}

export function buildFilename(context, settings) {
  const baseSettings = settings || defaultSettings;
  const domain = sanitizeDomain(context.domain, baseSettings.removeWww) || 'unknown-domain';
  const title = sanitizeTitle(context.title, baseSettings.maxTitleLength) || 'download';
  const date = formatDate(context.date);
  const ext = sanitizeExtension(context.ext);
  const rendered = applyTemplate(baseSettings.template, {
    domain,
    title,
    date,
    ext,
  });
  if (!rendered || !/[a-zA-Z0-9]/.test(rendered)) {
    return `${domain}_${title}_${date}${ext ? `.${ext}` : ''}`;
  }
  if (!ext) {
    return rendered.replace(/\.+$/, '');
  }
  return rendered;
}

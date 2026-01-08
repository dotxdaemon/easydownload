// ABOUTME: Handles options UI interactions and storage updates.
// ABOUTME: Generates live previews from template settings.

import { buildFilename, defaultSettings } from './util.js';

const elements = {
  enabled: document.getElementById('enabled'),
  template: document.getElementById('template'),
  maxTitleLength: document.getElementById('maxTitleLength'),
  removeWww: document.getElementById('removeWww'),
  previewOutput: document.getElementById('previewOutput'),
  save: document.getElementById('save'),
  reset: document.getElementById('reset'),
};

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

function getFormValues() {
  return {
    enabled: elements.enabled.checked,
    template: elements.template.value.trim(),
    maxTitleLength: Number(elements.maxTitleLength.value),
    removeWww: elements.removeWww.checked,
    folderRoutingEnabled: false,
    folderRules: [],
  };
}

function setFormValues(settings) {
  elements.enabled.checked = settings.enabled;
  elements.template.value = settings.template;
  elements.maxTitleLength.value = settings.maxTitleLength;
  elements.removeWww.checked = settings.removeWww;
}

function updatePreview() {
  const settings = getFormValues();
  const context = {
    domain: settings.removeWww ? 'example.com' : 'www.example.com',
    title: 'Sample Page',
    ext: 'pdf',
    date: new Date('2024-05-02T12:00:00'),
  };
  elements.previewOutput.textContent = buildFilename(context, settings);
}

async function loadSettings() {
  const settings = await readSettings();
  setFormValues(settings);
  updatePreview();
}

async function saveSettings() {
  const settings = getFormValues();
  const merged = {
    ...defaultSettings,
    ...settings,
  };
  await writeSettings(merged);
  updatePreview();
}

async function resetSettings() {
  setFormValues(defaultSettings);
  await writeSettings(defaultSettings);
  updatePreview();
}

['change', 'input'].forEach((eventName) => {
  elements.template.addEventListener(eventName, updatePreview);
  elements.maxTitleLength.addEventListener(eventName, updatePreview);
  elements.removeWww.addEventListener(eventName, updatePreview);
});

elements.save.addEventListener('click', () => {
  saveSettings();
});

elements.reset.addEventListener('click', () => {
  resetSettings();
});

loadSettings();

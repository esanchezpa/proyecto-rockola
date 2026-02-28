const fs = require('fs');
const path = require('path');
const os = require('os');

const SETTINGS_FILE = path.join(__dirname, '..', '..', 'rockola-settings.json');

const defaultSettings = {
  audioPath: path.join(os.homedir(), 'Music', 'Rockola', 'audio'),
  videoPath: path.join(os.homedir(), 'Music', 'Rockola', 'video'),
  karaokePath: path.join(os.homedir(), 'Music', 'Rockola', 'karaoke'),
};

function ensureSettingsFile() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  }
}

function getSettings() {
  ensureSettingsFile();
  const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function saveSettings(newSettings) {
  const current = getSettings();
  const merged = { ...current, ...newSettings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

module.exports = { getSettings, saveSettings };

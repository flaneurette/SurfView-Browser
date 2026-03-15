// spoof.js - consistent profiles, pick one

// Spoofed Chrome.
const chromeMajor = '146';
const chromeVersion = '146.0.7680.80';
const brandName = 'Not A Brand';
const brandVersion = '99';

const profiles = {
  amsterdam: {
    timezone: 'Europe/Amsterdam',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  berlin: {
    timezone: 'Europe/Berlin',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  brussels: {
    timezone: 'Europe/Brussels',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  newYork: {
    timezone: 'America/New_York',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  london: {
    timezone: 'Europe/London',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  chicago: {
    timezone: 'America/Chicago',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  losAngeles: {
    timezone: 'America/Los_Angeles',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  toronto: {
    timezone: 'America/Toronto',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  sydney: {
    timezone: 'Australia/Sydney',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  dublin: {
    timezone: 'Europe/Dublin',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  auckland: {
    timezone: 'Pacific/Auckland',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  singapore: {
    timezone: 'Asia/Singapore',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  houston: {
    timezone: 'America/Chicago',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  phoenix: {
    timezone: 'America/Phoenix',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  denver: {
    timezone: 'America/Denver',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  miami: {
    timezone: 'America/New_York',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  vancouver: {
    timezone: 'America/Vancouver',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
  johannesburg: {
    timezone: 'Africa/Johannesburg',
    locale: 'en-US',
    language: 'en-US',
    languages: ['en-US', 'en'],
    accept: 'en-US,en;q=0.9'
  },
};

// pick randomly once at startup, stays consistent for session
const keys = Object.keys(profiles);
const picked = profiles[keys[Math.floor(Math.random() * keys.length)]];

module.exports = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/'+chromeVersion+' Safari/537.36',
  width: '1920',
  height: '1080',
  timezone: picked.timezone,
  locale: picked.locale,
  language: picked.language,
  accept: picked.accept,
  userAgentMetadata: {
    brands: [
      { brand: 'Google Chrome', version: chromeMajor },
      { brand: brandName, version: brandVersion },
      { brand: 'Chromium', version: chromeMajor },
    ],
    fullVersionList: [
      { brand: 'Google Chrome', version: chromeVersion },
      { brand: 'Chromium', version: chromeMajor },
    ],
    uaFullVersion: chromeVersion, 
    fullVersion: chromeVersion,
    platform: 'Windows',
    platformVersion: '10.0.0',
    architecture: 'x86',
    width: '1920',
    height: '1080',
    // no need, its much better to have actual real values for better randomness.
    colorDepth: '24',
    pixelDepth: '24',
    model: '',
    mobile: false,
    bitness: '64',
    wow64: false
  }
};


// spoof.js
// Be careful with changing things. It can unmask you.

// Spoofed Chrome version.
const chromeMajor = '146';
const chromeVersion = '146.0.7680.164';
const brandName = 'Not-A.Brand';
const brandVersionMaj = '24';
const brandVersion = '24.0.0.0';
const fullUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/'+chromeVersion+' Safari/537.36';

// Computer specifics for navigator. (must match the full user-agent)
const screenWidth = '1920';
const screenHeight = '1080';
const platform = 'Windows';
const platformVersion = '10.0.0';
const architecture = 'x86'; // = counter intuitive, but it must be like this.
const colorDepth = '24';
const pixelDepth = '24';
const model = '';
const bitness = '64';
const mobile = false;
const wow64 = false;

// pick randomly once at startup, stays consistent for session
const keys = Object.keys(profiles);
const picked = profiles[keys[Math.floor(Math.random() * keys.length)]];

// Build full spoofed meta-data:
spoof = {
  userAgent: fullUserAgent,
  width: screenWidth,
  height: screenHeight,
  timezone: picked.timezone,
  locale: picked.locale,
  language: picked.language,
  accept: picked.accept,
  userAgentMetadata: {
    brands: [
      { brand: 'Chromium', version: chromeMajor },
      { brand: brandName, version: brandVersionMaj },
      { brand: 'Google Chrome', version: chromeMajor },
    ],
    fullVersionList: [
      { brand: 'Chromium', version: chromeMajor },
      { brand: brandName, version: brandVersion },
      { brand: 'Google Chrome', version: chromeVersion },
    ],
    uaFullVersion: chromeVersion, 
    fullVersion: chromeVersion,
    platform: platform,
    platformVersion: platformVersion,
    architecture: architecture,
    width: screenWidth,
    height: screenHeight,
    colorDepth: colorDepth,
    pixelDepth: pixelDepth,
    model: model,
    mobile: mobile,
    bitness: bitness,
    wow64: wow64
  }
};

// Spoofed UA
const SPOOFED_UA = spoof.userAgent;

// Specific Optimizations
defaultArgs.push('--lang='+spoof.locale); // Avoids locale leaks
defaultArgs.push('--languages='+spoof.languages); // Avoids locale leaks
defaultArgs.push('--window-size='+spoof.width+','+spoof.height); // Standardized viewport

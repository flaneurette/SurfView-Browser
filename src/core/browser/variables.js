// #####################################################################
// VARIABLES
// #####################################################################

// Main window
let mainWindow = null;
let surfModalWindow = null;
let SurfBrowserView;
let SurfBrowserWidth = 1012;
let SurfBrowserHeight = 650;
let currentIndex = 0;
let urlInputField = null;
let bookmarkfolderSelected = null;
let isDebuggerAttached = false;

// Webview javascript
let jsEnabled = false; // default: off

// Privacy
let privacyEnabled = true; // default: on

// Webscanner
let webscannerEnabled = false; // default: off

// Image mode
var imageModeEnabled = false;

// Tor process management
let torEnabled = false; // default: off
let torPort = 9050;
let torAddress = 'socks5://127.0.0.1';
let torProcess = null;
let torReady = false;

let torPath, torDataDir, geoipPath, geoip6Path;

if(devdebug) {
    torPath = path.join(process.resourcesPath, '../../../../src/tor/tor.exe');
    torDataDir = path.join(process.resourcesPath, '../../../../src/tor/tor-data');
    geoipPath = path.join(process.resourcesPath, '../../../../src/tor/geoip');
    geoip6Path = path.join(process.resourcesPath, '../../../../src/tor/geoip6');
    } else {
    torPath = path.join(process.resourcesPath, 'tor/tor.exe');
    torDataDir = path.join(process.resourcesPath, 'tor/tor-data');
    geoipPath = path.join(process.resourcesPath, 'tor/geoip');
    geoip6Path = path.join(process.resourcesPath, 'tor/geoip6');
}
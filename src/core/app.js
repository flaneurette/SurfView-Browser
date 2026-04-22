(function() {
// ===== START OF build.js =====

// Dev debugging
var devdebug = false;
let debugLog = [];


// ===== END OF build.js =====

// ===== START OF browser\constants.js =====

// #####################################################################
// CONSTANTS
// #####################################################################

const {
    app,
    BrowserWindow,
    WebContentsView,
    ipcMain,
    shell,
    session,
    dialog,
    net,
    protocol,
    webContents,
    Menu, 
    MenuItem,
    screen,
    globalShortcut
} = require('electron');

const path = require('path');
const {spawn} = require('child_process');
const fs = require('fs');

const puppeteer = require('puppeteer');


// ===== END OF browser\constants.js =====

// ===== START OF browser\variables.js =====

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
let sessionManager = null;
let tmpMasterPassword = null;
let PWMvault = null;

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

// ===== END OF browser\variables.js =====

// ===== START OF browser\arguments.js =====

// #####################################################################
// ARGUMENTS
// #####################################################################

let torArgs = [
    '--CircuitBuildTimeout', '10',
    '--LearnCircuitBuildTimeout', '0',
    '--NumEntryGuards', '8',
    '--KeepalivePeriod', '60',
    '--NewCircuitPeriod', '15',
    '--SocksTimeout', '15',
    '--DisableNetwork', '0', // Ensure network is enabled
    '--DormantCanceledByStartup', '1', // Prevent Tor from going dormant
    '--ClientOnly', '1', // Ensure Tor is in client mode
    '--NoExec', '1', // Prevent Tor from spawning child processes
];

let torChromeArgs = [
    '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1',
    // WebRTC protection
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--enforce-webrtc-ip-permission-check',
    '--disable-webrtc',
    '--disable-features=WebRtc,WebRtcHideLocalIpsWithMdns,RTCUseNetworkInformation,WebRtcAllowInputVolumeAdjustment'
];

let defaultArgs = [

    '--disable-webgl',
    '--disable-webgl2',      
    '--disable-3d-apis',
    '--disable-udp',
    '--disable-geolocation',
    '--disable-voice-input',
    '--disable-notifications',
    '--disable-infobars',
    '--disable-breakpad',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-domain-reliability',
    '--disable-sync',
    '--disable-sync-preferences',
    '--disable-sync-app-settings',
    '--disable-sync-bookmarks',
    '--disable-sync-extensions',
    '--disable-sync-passwords',
    '--disable-sync-sessions',
    '--disable-sync-tabs',
    '--disable-translate',
    '--disable-wake-on-wifi',
    '--password-store=basic', // Avoids keychain prompts
    '--use-mock-keychain', // Avoids macOS keychain issues
    '--disable-plugins',
    '--disable-java',
    '--disable-reading-from-canvas',    // canvas fingerprint
    '--disable-2d-canvas-clip-aa',
    '--disable-2d-canvas-image-chromium',
    '--disable-file-system',
    '--disable-local-storage',
    '--disable-shared-workers',
    '--disable-speech-api',
    '--disable-remote-fonts',         // font fingerprinting
    '--no-pings',                 // hyperlink auditing

    // Process isolation
    '--site-per-process',
    '--isolate-origins=*',

    // Performance & Stability
    '--disable-dev-shm-usage', // Fixes Docker/WSL crashes
    '--disable-gpu', // Avoids GPU-related crashes
    '--disable-software-rasterizer',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-logging', // Reduces noise in logs
    '--metrics-recording-only', // Minimal telemetry
    '--no-first-run',
    '--disk-cache-size=0', // Disables disk cache
    '--media-cache-size=0', // Disables media cache
    '--incognito', // Avoids local storage
    '--safebrowsing-disable-auto-update', // Disables Google Safe Browsing
];


// ===== END OF browser\arguments.js =====

// ===== START OF browser\configs.js =====

// #####################################################################
// CONFIGS
// #####################################################################

// configs that cannot be anywhere else.
// must be set after all other includes.

// add to arguments.
torChromeArgs.push('--proxy-server='+torAddress +':'+torPort);

// add to arguments.
torArgs.push('--SocksPort', torPort);
torArgs.push('--DataDirectory', torDataDir);
torArgs.push('--GeoIPFile', geoipPath);
torArgs.push('--GeoIPv6File', geoip6Path);



// ===== END OF browser\configs.js =====

// ===== START OF browser\switches.js =====

// #####################################################################
// SWITCHES
// #####################################################################

app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('log-level', '3');

function netErrorCode(errorDescription) {

    switch (errorDescription) {
        case 'ERR_NAME_NOT_RESOLVED':
            errorMsg = 'ERR_NAME_NOT_RESOLVED';
            errorMsgExplain = 'The website address could not be found. Please check the URL and try again.';
            break;
        case 'ERR_INTERNET_DISCONNECTED':
            errorMsg = 'ERR_INTERNET_DISCONNECTED';
            errorMsgExplain = 'No internet connection. Please check your network settings and try again.';
            break;
        case 'ERR_CONNECTION_REFUSED':
            errorMsg = 'ERR_CONNECTION_REFUSED';
            errorMsgExplain = 'The server refused the connection. The website may be down or blocking requests.';
            break;
        case 'ERR_CONNECTION_TIMED_OUT':
            errorMsg = 'ERR_CONNECTION_TIMED_OUT';
            errorMsgExplain = 'The connection timed out. The website may be slow or unreachable.';
            break;
        case 'ERR_CONNECTION_CLOSED':
            errorMsg = 'ERR_CONNECTION_CLOSED';
            errorMsgExplain = 'The connection was closed unexpectedly. Please refresh the page.';
            break;
        case 'ERR_CONNECTION_RESET':
            errorMsg = 'ERR_CONNECTION_RESET';
            errorMsgExplain = 'The connection was reset. This may be due to network issues.';
            break;
        case 'ERR_CONNECTION_ABORTED':
            errorMsg = 'ERR_CONNECTION_ABORTED';
            errorMsgExplain = 'The connection was aborted. This may be due to network issues.';
            break;
        case 'ERR_CONNECTION_FAILED':
            errorMsg = 'ERR_CONNECTION_FAILED';
            errorMsgExplain = 'The connection failed. Please check your network and try again.';
            break;
        case 'ERR_NETWORK_CHANGED':
            errorMsg = 'ERR_NETWORK_CHANGED';
            errorMsgExplain = 'The network changed. Please refresh the page.';
            break;
        case 'ERR_TUNNEL_CONNECTION_FAILED':
            errorMsg = 'ERR_TUNNEL_CONNECTION_FAILED';
            errorMsgExplain = 'The tunnel connection failed. This may be due to network issues.';
            break;
        case 'ERR_SSL_PROTOCOL_ERROR':
            errorMsg = 'ERR_SSL_PROTOCOL_ERROR';
            errorMsgExplain = 'SSL protocol error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_BAD_CERT_DOMAIN':
            errorMsg = 'ERR_SSL_BAD_CERT_DOMAIN';
            errorMsgExplain = 'SSL certificate domain error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_PINNED_KEY_NOT_IN_CERT_CHAIN':
            errorMsg = 'ERR_SSL_PINNED_KEY_NOT_IN_CERT_CHAIN';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_WEAK_SERVER_CERT_KEY':
            errorMsg = 'ERR_SSL_WEAK_SERVER_CERT_KEY';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_WEAK_SERVER_EPHEMERAL_KEY':
            errorMsg = 'ERR_SSL_WEAK_SERVER_EPHEMERAL_KEY';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_SERVER_CERT_REVOKED':
            errorMsg = 'ERR_SSL_SERVER_CERT_REVOKED';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_DATE_INVALID':
            errorMsg = 'ERR_SSL_CERT_DATE_INVALID';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_VALIDITY_TOO_LONG':
            errorMsg = 'ERR_SSL_CERT_VALIDITY_TOO_LONG';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_REQUIRED':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_REQUIRED';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_NOT_FOUND':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_NOT_FOUND';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_REVOKED':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_REVOKED';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_NOT_YET_VALID':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_NOT_YET_VALID';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_TOO_MANY_LOGGERS':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_TOO_MANY_LOGGERS';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_NOT_FOUND':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_NOT_FOUND';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_NOT_YET_VALID':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_NOT_YET_VALID';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        case 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_REVOKED':
            errorMsg = 'ERR_SSL_CERT_TRANSPARENCY_LOGGERS_REVOKED';
            errorMsgExplain = 'SSL certificate error. The website may have an invalid security certificate.';
            break;
        default:
            errorMsg = 'UNKNOWN_ERROR';
            errorMsgExplain = 'An unknown error occurred. Please try again later.';
            break;
    }

    return {errorMsg, errorMsgExplain};
}

// ===== END OF browser\switches.js =====

// ===== START OF browser\arrays.js =====

// #####################################################################
// ARRAYS
// #####################################################################

let largeUriList = [];
let historyStack = [];




// ===== END OF browser\arrays.js =====

// ===== START OF browser\objects.js =====

// #####################################################################
// OBJECTS
// #####################################################################

// Webpreferences for a new user invoked webview window. 
// Must be very restricted. Be careful modifying things here.

const WEBVIEW_PREFERENCES = { 
    nodeIntegration:            false,
    nodeIntegrationInSubFrames:     false,
    nodeIntegrationInWorker:      false,
    sandbox:                true,
    contextIsolation:           true,
    webSecurity:              true,
    allowRunningInsecureContent:    false,
    experimentalFeatures:         false,
    disableDialogs:             true,
    safeDialogs:              true,
    safeDialogsMessage:         'Blocked',
    spellcheck:               false,
    enableWebSQL:             false,
    webviewTag:               true,
    plugins:                false,
    disableCache:             true,
    disableWebRTC:            true,
    enableBlinkFeatures:        '',
    disableBlinkFeatures:         'Autofill,ServiceWorker',
    images:                 true,
    navigateOnDragDrop:         false,
    autoplayPolicy:             'user-gesture-required',
};

// ===== END OF browser\objects.js =====

// ===== START OF browser\surfvalues.js =====

var surfvalues = {
    vaultStatus: 'first-run',
};

// ===== END OF browser\surfvalues.js =====

// ===== START OF browser\ipc.js =====

// #####################################################################
// IPC
// #####################################################################


/*
More efficient:
=================================
// Shared logic
async function openSourceWindow(url) {
    await closeModalWindow();
    const bounds = mainWindow.getBounds();
    showWindow(300, 150, bounds.x + 20, bounds.y + 80, 'src/core/forms/source.html');
}

// IPC Handler
ipcMain.handle('modal-source', (event, url) => openSourceWindow(url));

// Internal call
async function someOtherFunction() {
    await openSourceWindow('some-url');
}

*/

/*
// diagnostics
setInterval(() => {
  try {console.log('MP:' + tmpMasterPassword); } catch(e) {}
  try {console.log('VAULT:' + PWMvault); } catch(e) {}
  try { console.log('PIN:' + pin); } catch(e) {}
  try {console.log('CREDS:' + creds); } catch(e) {}
  try {console.log('CREDS 2:' + credentials); } catch(e) {}
  try {console.log('password:' + password); } catch(e) {}
}, 5000);
*/

async function messageBox(message) {
  dialog.showMessageBox({
    type: 'info',
    title: 'Surfview Notification',
    message: message,
    buttons: ['OK'],
    cancelId: 0,
    noLink: true
  });
}

async function closeModalWindow() {
    if (surfModalWindow) {
        surfModalWindow.removeAllListeners();
        surfModalWindow.close();
        surfModalWindow = null;
    }
}

ipcMain.handle('modal-inspect-domain', (event) =>  {
    let url = SurfBrowserView.webContents.getURL();
    url = sanitizeUrl(url,'host');
    let vt = 'https://www.example.com' + url;
    SurfBrowserView.webContents.loadURL(vt);
    closeModalWindow();
});

ipcMain.handle('modal-inspect-dev', (event, url) =>  {
    SurfBrowserView.webContents.openDevTools();
});

ipcMain.handle('modal-save', (event, url) =>  {

});

ipcMain.handle('modal-folder', async (event, url) => {
    try {
        await closeModalWindow();
        showWindow(350, 120, event.clientX, 80, 'src/core/forms/bookmark.html');
        } catch (error) {
        console.error('Error:', error);
    }
});
 
ipcMain.handle('modal-source', async (event) => {
    let url = SurfBrowserView.webContents.getURL();
    if(url) {
        SurfBrowserView.webContents.loadURL('view-source:'+url);
        closeModalWindow();
    }
});

ipcMain.handle('check-pin', async (event, pin) => {
    
    let credentials = decodePWMVault(pin);
    let url = SurfBrowserView.webContents.getURL();
    
    let uri = new URL(url).hostname;

    const obj = JSON.parse(credentials);
    let returner = {};
    
    for(const key in obj) {
        
        const entry = obj[key];
        
        if(entry['host'] == uri) {
            returner.username = decodeData(Buffer.from(entry['username'], 'base64'), pin);
            returner.password = decodeData(Buffer.from(entry['password'], 'base64'), pin);
            returner.ok = true;
        }
        
    }
    
    if(devdebug) console.log(returner);
    
    return returner;
});

ipcMain.handle('unlock-website', async (event, credentials) => {
    
    let result = {};

        if(credentials) {
            
            let pwm_script = `
            
                let creds = ${JSON.stringify({
                    username: credentials.username,
                    password: credentials.password
                })};
             
                const usernameField = document.querySelector(
                  'input[type="email"], input[name*="email"], input[name*="user"], input[name*="username"], input[id*="user"], input[id*="email"], input[id*="username"]'
                );
                
                const passwordField = document.querySelector(
                  'input[type="password"], input[name*="pass"], input[name*="password"], input[id*="password"], input[id*="pass"], input[id*="password"]'
                );
                
                if (usernameField && passwordField) {
                    usernameField.value = creds.username;
                    passwordField.value = creds.password;
                }
                
                creds = null;
            `;
            
            SurfBrowserView.webContents.executeJavaScript(pwm_script);

            result.ok = true;
            } else {
            result.ok = false;
        }
        
    return result;
});

ipcMain.handle('pin-box', async (event) => {
    const { width } = SurfBrowserView.getBounds();            
    let w = parseInt(SurfBrowserView.webContents.innerWidth / 2);
    showWindow(300,170,w,150,'src/core/forms/ask-pin.html',false);
});

async function showWindow(w,h,x,y,f) {
    
    let preferences = {
        width: w,
        height: h,
        parent: mainWindow,
        modal: true,
        frame: false,
        resizable: false,
        webPreferences: {
            partition: 'nopersist',
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInSubFrames:false,
            nodeIntegrationInWorker:false,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            disableCache: true,
            disableWebRTC: true,
            webgl: false,
            webviewTag: true,
            experimentalFeatures: false,
            disableDialogs : true,
            safeDialogs : true,
            spellcheck: false,
            enableWebSQL : false,
            plugins : false,
            disableCache : true,
            navigateOnDragDrop: false,
            disableBlinkFeatures: 'Autofill,ServiceWorker',
            safeDialogsMessage :'Blocked',
            disableBlinkFeatures:'Autofill,ServiceWorker',
            autoplayPolicy : 'user-gesture-required',
            referrerpolicy: "no-referrer"
        }
      };
      
    if(x || y) {
        preferences.x = x;
        preferences.y = y;
    }
    
    try {
        
        surfModalWindow.removeAllListeners();
    
    } catch(e) {} 
    
        surfModalWindow = new BrowserWindow(preferences);
    
    if(x) {
        surfModalWindow.setBounds({ x: x, y: y, width: w, height: h });
    }
    
    surfModalWindow.loadFile(f);
    surfModalWindow.id = 'surfModalWindow';
}

ipcMain.handle('show-window',  async (event, w,h,x=false,y=false,f) =>  {

    let preferences = {
        width: w,
        height: h,
        parent: mainWindow,
        modal: true,
        frame: false,
        resizable: false,
        webPreferences: {
            partition: 'nopersist',
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInSubFrames:false,
            nodeIntegrationInWorker:false,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            disableCache: true,
            disableWebRTC: true,
            webgl:false,
            webviewTag:true,
            experimentalFeatures:false,
            disableDialogs : true,
            safeDialogs : true,
            spellcheck: false,
            enableWebSQL : false,
            plugins : false,
            disableCache : true,
            navigateOnDragDrop: false,
            disableBlinkFeatures: 'Autofill,ServiceWorker',
            safeDialogsMessage :'Blocked',
            disableBlinkFeatures:'Autofill,ServiceWorker',
            autoplayPolicy : 'user-gesture-required',
            referrerpolicy: "no-referrer"
        }
      };
      
    if(x || y) {
        preferences.x = x;
        preferences.y = y;
    }
    
    try {
    surfModalWindow.removeAllListeners();
    } catch(e) {} 
    surfModalWindow = new BrowserWindow(preferences)
    surfModalWindow.loadFile(f);
    surfModalWindow.id = 'surfModalWindow';
    surfModalWindow.setBounds({ x: x, y: y, width: w, height: h });
});

ipcMain.handle('close-window', (event) => {
    closeModalWindow();
});

ipcMain.handle('go-back', (event) =>  {
  if (currentIndex >=1) {
    currentIndex--;
    launchBrowser(historyStack[currentIndex]);
  }
});

ipcMain.handle('go-forward', (event) =>  {
    if (currentIndex < historyStack.length - 1) {
    currentIndex++;
    launchBrowser(historyStack[currentIndex]);
  }
});

ipcMain.handle('reload', (event) =>  {
    if (SurfBrowserView) {
        SurfBrowserView.webContents.reload();
    }
});

// Shrink
ipcMain.handle('shrink-browserview', () => {
  const { width: winW, height: winH } = mainWindow.getContentBounds()

  const targetW = 400
  const targetH = 400

  // Center it
  const targetX = Math.round((winW - targetW) / 2)-50
  const targetY = Math.round((winH - targetH) / 2)

  animateBrowserView(SurfBrowserView, {
    x: targetX,
    y: targetY,
    width: targetW,
    height: targetH
  }, {
    duration: 500,
    easing: 'easeOutBack'
  })
})

// Expand back
ipcMain.handle('expand-browserview', () => {
  const { width, height } = mainWindow.getBounds()
  animateBrowserView(SurfBrowserView, { x: 0, y: 81, 
  width: parseInt(mainWindow.getContentSize()[0] - 251), 
  height: parseInt(mainWindow.getContentSize()[1] - 105) }, {
    duration: 400,
    easing: 'easeInOut'
  })
})

ipcMain.handle('toggle-tor', async (_event, enabled) => {
    
    torEnabled = enabled;

    if (torEnabled) {
        try {
            await proxyManagement();
            await startTor();
            return { ok: true, torEnabled: true };
        } catch (err) {
            return { ok: false, status: 'Tor error', error: err.message, torEnabled: false };
        }
    } else {
        await proxyManagement();
        stopTor();
        return { ok: true, torEnabled: false };
    }
});

ipcMain.handle('tor-status', () => {
    return {
        ready: torReady,
        enabled: torEnabled
    };
});

ipcMain.handle('hideScreen', async (_event) => {
    mainWindow.setBrowserView(null);
});

ipcMain.handle('showScreen', async (_event) => {
    mainWindow.setBrowserView(SurfBrowserView);
});

ipcMain.handle('set-image-mode', async (_event, val) => {
    imageModeEnabled = val; 
    if(devdebug) console.log('ImageMode enabled: ' + val);
});

ipcMain.handle('set-js', async (_event, val) => {
    jsEnabled = val;
    webscannerEnabled = val; 
    if(devdebug) console.log('Javascript + webscanner enabled: ' + val);
});

ipcMain.handle('set-webscanner', async (_event, val) => {
    webscannerEnabled = val;
    if(devdebug) console.log('Webscanner enabled: ' + val);
});

ipcMain.handle('set-privacy', async (_event, val) => {
    privacyEnabled = val;
    if(devdebug) console.log('Privacy enabled: ' + val);
});

ipcMain.handle('dialog', async (_event, message) => {
  await dialog.showMessageBox({
    type: 'info',
    title: 'Surfview Notification',
    message: message,
    buttons: ['OK'],
    cancelId: 0,
    noLink: true
  });
});

ipcMain.handle('listener', async (_event, type) => {
    document.addEventListener(type, (_event) => {
      callback(event.target);
    }, true);
});

ipcMain.handle('read-bookmarks', (_event) => {
    try {
        const data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
        return data;
        } catch (e) {
       if(devdebug) console.log(e);
    }
});

ipcMain.handle('load-folders', (event) =>  {
    try {
        const data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
        return data;
        } catch (e) {
       if(devdebug) console.log(e);
    }
});

ipcMain.handle('booklist', async (event, folder) =>  {
    let data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
    let bookmarks = data[folder];    
    if(bookmarks) {
        const mousePos = screen.getCursorScreenPoint();
        bookmarkfolderSelected = folder;
        let total = bookmarks.length;
        let offset = 40;
        let padding = 30;
        let height = (total * 12) + offset + padding;
        showWindow(250, height, (mousePos.x - 60), 80, 'src/core/forms/bookmarks-folder.html');
    }
});

ipcMain.handle('load-bookmark-folder', async (event) =>  {
    if(bookmarkfolderSelected) {
        let data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
        if(data) {
            let result = data[bookmarkfolderSelected];
            if(result) return result;
        }
        return false;
    }
});

ipcMain.handle('get-url', async (event) =>  {
    if(urlInputField) {
        return urlInputField;
        } else {
     return false; 
    }
});

ipcMain.handle('add-pass', async (event, url, user, passwd, pin) =>  {
   return addPassword(url, user, passwd, pin);
});

ipcMain.handle('decode-entry-pwm', async (event,method,data,pin) =>  {
   return decodeUserField(method,data,pin);
});

ipcMain.handle('check-pwm-status', async (event, variable) =>  {
    if(PWMvault) {
        return true;
        } else {
        return false;
    }
});

ipcMain.handle('update-pwm-status', async (event) => {
    mainWindow.webContents.executeJavaScript(`
        let btnkey1 = document.getElementById('keyhide');
        if (btnkey1) {
            btnkey1.id = 'btnKey';
            } else {
            console.error('Element #btnKey not found!');
        }
    `);
});

ipcMain.handle('get-value', async (event, name) =>  {

    if(name) {
        
        let url1 = mainWindow.webContents.getURL();
        let url2 = SurfBrowserView.webContents.getURL();
        
        if(url1.includes('http')) {
            return url1;
            } else if(url2.includes('http')) {
            return url2;
            } else {
        }
        
        let sv = getFilePath('surfvalues.json');
        let data = JSON.parse(fs.readFileSync(sv, 'utf8'));
        
        return data[name];
    }
    
});

ipcMain.handle('fetch-pw', async (event, pw) =>  {
    return unlockVault(pw);
});

ipcMain.handle('set-value', async (event, name, value) =>  {
    if(name) {
        let sv = getFilePath('surfvalues.json');
        let data = JSON.parse(fs.readFileSync(sv, 'utf8'));
        if(!data) {
            try { 
                fs.writeFileSync(sv, JSON.stringify(data, null, 2)).then(function() {
                    data = JSON.parse(fs.readFileSync(sv, 'utf8'));
                });
            } catch(e) { }
        }
        data[name] = value;
        fs.writeFileSync(sv, JSON.stringify(data, null, 2));
        if(devdebug) console.log('Saved surfvalues to file!');
        return true;
    }
});

ipcMain.handle('add-bookmark', async (event, url) =>  {
    const mousePos = screen.getCursorScreenPoint();
    let offset = 40;
    let padding = 30;
    let height = (5 * 12) + offset + padding;
    showWindow(350, height, (mousePos.x - 350), 80, 'src/core/forms/add-bookmark.html');
});

ipcMain.handle('init-browser-vault', async (event, pw, pin) =>  {
    return initVault(pw,pin);
});

ipcMain.handle('clear-pass', async (event, pw) =>  {
    tmpMasterPassword = null;
    flushKey();
});

ipcMain.handle('unlock-vault', async (event, pw) =>  {
    return unlockVault(pw);
});

ipcMain.handle('load-passwords', async (event) =>  {
    let data = JSON.parse(fs.readFileSync(getPWMPath(), 'utf8'));
    if(data) {
        let result = data;
        if(result) return result;
    }
    return;
});

ipcMain.handle('process-form', async (event, type, value) =>  {
    
  if(type == 'bookmark-folder') {
   
    let data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
   
    if(value) {
        
        folder = value;
        
        if(folder.match(/[~!@#$%^()+|}{"'`><,/?]+/gi)) {
        
          await dialog.showMessageBox({
            type: 'info',
            title: 'Surfview Notification',
            message: 'Cannot add folder, only use alphanumeric characters.',
            buttons: ['OK'],
            cancelId: 0,
            noLink: true
          }); 
        
        } else {
         
        if (!data[folder]) {
           data[folder] = [];
           newfolder = data[folder];
           } else {
           newfolder = data[folder];
        }

            try {
                
                try { 
                    fs.writeFileSync(getBookmarksPath(), JSON.stringify(data, null, 2));
                } catch(e) { }
                
                mainWindow.webContents.executeJavaScript(`
                
                    const dom = document.getElementById('bookmarks-ul');
                    let fold = document.createElement('li'); 
                    fold.className = 'book-folder'; 
                    let a = document.createElement('a');
                    
                    if(!selectedBookmarkFolder) { 
                        let selectedBookmarkFolder = '${folder}';
                        } else { 
                        selectedBookmarkFolder = '${folder}';
                    } 
                    
                    a.onclick = function(e) {
                        e.preventDefault();
                        a.id = '${folder}';
                        window.surfview.showBookList(this.id);
                        e.stopPropagation();
                        window.focus();
                        document.body.focus();
                    };
                    
                    a.innerHTML = '<span class="foldericon">🗀</span>' + ' ' + '${folder}';
                    fold.appendChild(a);
                    dom.appendChild(fold); 
                `);
                } catch(e) {
                    if(devdebug) console.log(e);
                }   
        }  
    }
  }
  closeModalWindow();
});

ipcMain.handle('save-bookmark', async (_event, folder=false, uri) => {
    
    let data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
    
    if(devdebug) console.log(data);
    
    if (!Array.isArray(data.bookmarks)) {
        data.bookmarks = [];
    }
    
    if(folder) {
        
        if(!data[folder]) {
            data[folder] = [];
            try {
                fs.writeFileSync(getBookmarksPath(), JSON.stringify(data, null, 2));
            } catch(e) {}
        }
        
        let newfolder = data[folder];
        
        // add bookmark to folder
        let lnk = sanitizeUrl(uri,'hyperlink');
        
        if (newfolder.length >= 150) {
            return { success: false, reason: 'limit' };
        }

        if (newfolder.includes(lnk)) {
            return { success: false, reason: 'duplicate' };
        }

        newfolder.push(lnk);
        
        try {
            fs.writeFileSync(getBookmarksPath(), JSON.stringify(data, null, 2));
        } catch(e) {}
        
        closeModalWindow();
        
    } else {
        
        // Bookmarksbar.
        try {
            
            let lnk = sanitizeUrl(uri,'hyperlink');
            
            if (!Array.isArray(data.bookmarksbar)) {
                data.bookmarksbar = [];
            }
    
            if (data.bookmarksbar.length >= 150) {
                return { success: false, reason: 'limit' };
            }

            if (data.bookmarksbar.includes(lnk)) {
                return { success: false, reason: 'duplicate' };
            }

            data.bookmarksbar.push(lnk);
            
            try {
                fs.writeFileSync(getBookmarksPath(), JSON.stringify(data, null, 2));
                } catch(e) {}
            
            return { success: true };
            
        } catch (e) {
            
            if (devdebug) console.log(e);
            
            return { success: false, reason: 'error' };
        }
    }
});

ipcMain.handle('remove-bookmark', async (_event, url) => {
    try {
        let url = sanitizeUrl(url);
        const data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
        if (!Array.isArray(data.url)) return false;
        data.url = data.url.filter((u) => u !== url);
        try { 
            fs.writeFileSync(getBookmarksPath(), JSON.stringify(data, null, 2));
        } catch(e) {}
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('intercept', async (_event, url) => {
        if (!url || url === 'about:blank') return;
        // console.log('Intercepted navigation request:', url);
        // contents.stop();
        // contents.loadURL('about:blank');
});

ipcMain.handle('resizer', async (_event, w, h) => {
    SurfBrowserWidth = w;
    SurfBrowserHeight = h;
});

ipcMain.handle('open-external', async (_event, rawUrl) => {
    const url = sanitizeUrl(rawUrl);
    if (!url) return;
    try {
        await shell.openExternal(url);
    } catch (_) {}
});

ipcMain.handle('render-url', async (_event, rawUrl, vT) => {
 
    if(vT == 'bookmark') {
        if(jsEnabled) {
            vT = 'js';
            } else if(imageModeEnabled) {
            vT = 'image';
            } else {
            vT = 'live';
        }
    }
    
    let eventLog = [];
    let scanned = {};

    const url = sanitizeUrl(rawUrl);
    let view = vT;
    let screenshotBuffer = null;

    if (!url) {
        return {
            ok: false,
            status: 'URL error',
            error: 'Invalid or unsafe URL.'
        };
    }

    if (torEnabled && !torReady) {
        return {
            ok: false,
            status: 'Tor error',
            error: 'Tor is not connected. Please wait and try again.'
        };
    }

    if (torEnabled && (view === 'live' || view === 'js')) {
        if (!torReady) return { ok: false, status: 'Tor error', 
        error: 'Tor not ready yet.' };
    }
    
    let browser = null;
    let chromeArgs = [];
    
    chromeArgs.push(...defaultArgs)
    
    if (torEnabled) {
        chromeArgs.push(...torChromeArgs);
    }
    
    launchBrowser(url);
   
});


// ===== END OF browser\ipc.js =====

// ===== START OF browser\functions.js =====

// #####################################################################
// FUNCTIONS
// #####################################################################

// Utilities
function escHtml(s) {
    return String(s)
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
        .replaceAll('`', '&#96;');
}

function sanitizeUrl(input, method=false) {

    input = String(input).trim();

    const schemes = new RegExp(
        "^(javascript|data|vbscript|file|about|chrome|" + 
        "settings|mailto|mailbox|blob|xlink|navigation|" +
        "navigator|window):", "gi"
    );
    
    if (schemes.test(input)) {
        input = input.replaceAll(schemes, '');
    }
    
    const replacer = (str) => {
        try {
            str = str.replace(/^http:\/\//i,'');
            str = str.replace(/^https:\/\//i,'');
            str = str.replace(/^www\./i, '');
            return str;
            } catch {
            return str;
        }
    };
    
    const base = (str) => {
        try {
            str = replacer(str);
            str = new URL('https://' + str);
            str = str.hostname;
            return replacer(str);
            } catch {
            return str;
        }
    };

    switch (method) {
        
        case 'base':
        case 'host':
            return base(input);

        case 'domain':
            return 'www.' + base(input);
            
        case 'hyperlink':
            return 'https://' + replacer(input);

        case 'secure':
        case 'ssl':
        case 'https':
            return input.replace(/^http:\/\//i, 'https://');
            
        case 'sanitize': 
            input = input.replaceAll(/[\x00-\x1F\x7F]/gim, '');
            input = input.replaceAll(/[(){}\[\]`]/gi, '');
            input = input.replaceAll(/%00|%1F|%0D|%0A/gi, '');
            input = replacer(input);
            return 'https://' + input;
            
        default:
            input = input.replaceAll(/[\x00-\x1F\x7F]/gim, '');
            input = input.replaceAll(/[(){}\[\]`]/gi, '');
            input = input.replaceAll(/%00|%1F|%0D|%0A/gi, '');
            input = replacer(input);
            return 'https://' + input;
    }
    return input;
}

function sortUrls(urls) {
    
    const order = (url) => {
        const lower = url.toLowerCase();
        if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.tsx') || lower.endsWith('.java')) return 0;
        if (lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.php')) return 1;
        if (!/\.[^/]+$/.test(url)) return 2; // no extension
        if (lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.avif')) return 4;
        return 3; // other extensions
    };

    return urls.sort((a, b) => order(a) - order(b));
}

function ErrorMessage(errorString) {
    let sep = '-----------------------------------------------------';
    errorString = '<div class="error-detail-container">' +  errorString;
    errorString = errorString.replaceAll('\n\n','\n'+sep+sep+'\n');
    errorString = errorString + '<div>';
    return errorString;
}
    
function getStatus(status,url,location) { 
                        
    let statusMessages = {
        301: escHtml(status) + '\n\nSite tried to redirect (permanent).\n\nResponse url: ' + escHtm(url) + '\n\nLocation: ' + escHtml(location || ''),
        302: escHtml(status) + '\n\nSite tried to redirect (temporary).\n\nResponse url: ' + escHtml(url) + '\n\nLocation: ' + escHtml(location || ''),
        303: escHtml(status) + '\n\nSite tried to redirect (see other).',
        307: escHtml(status) + '\n\nSite tried to redirect (temporary).',
        308: escHtml(status) + '\n\nSite tried to redirect (permanent).',
        400: escHtml(status) + '\n\nBad request.',
        401: escHtml(status) + '\n\nUnauthorized - login required.',
        403: escHtml(status) + '\n\nForbidden - access denied.',
        404: escHtml(status) + '\n\nPage not found.',
        405: escHtml(status) + '\n\nMethod not allowed.',
        429: escHtml(status) + '\n\nToo many requests - rate limited.',
        500: escHtml(status) + '\n\nInternal server error.',
        502: escHtml(status) + '\n\nBad gateway.',
        503: escHtml(status) + '\n\nService unavailable.',
        504: escHtml(status) + '\n\nGateway timeout.',
      };
    return statusMessages[status] ?? `Unknown status: ${escHtml(status)}`;
}


// ===== END OF browser\functions.js =====

// ===== START OF browser\functions\route.js =====

// #####################################################################
// TOR
// #####################################################################

async function proxyManagement() {
    
    await SurfBrowserView.webContents.session.setProxy({
        proxyRules: torEnabled && torReady 
            ? torAddress+':'+torPort 
            : 'direct://'
    }); 
    
    await session.defaultSession.setProxy({
        proxyRules: torEnabled && torReady 
            ? torAddress+':'+torPort 
            : 'direct://'
    }); 
}

function startTor() {

    try { 
    
        return new Promise((resolve, reject) => {
            // Ensure data directory exists
            if (!fs.existsSync(torDataDir)) {
                fs.mkdirSync(torDataDir, {
                    recursive: true
                });
            }

            torProcess = spawn(torPath, torArgs);

            const timeout = setTimeout(() => {
                reject(new Error('Tor failed to bootstrap within 60 seconds'));
            }, 60000);

            const onData = (data) => {
                const line = data.toString();
                if(devdebug) console.log('[Tor]:', line.trim());
                if (line.includes('Bootstrapped 100%')) {
                    clearTimeout(timeout);
                    torReady = true;
                    resolve();
                }
            };

            // Tor may log to stdout or stderr depending on build
            torProcess.stdout.on('data', onData);
            torProcess.stderr.on('data', onData);

            torProcess.on('error', (err) => {
                clearTimeout(timeout);
                if(devdebug) console.error('[Tor] Failed to start:', err.message);
                reject(err);
            });

            torProcess.on('exit', (code) => {
                if(devdebug) console.log('[Tor] Exited with code', code);
                torReady = false;
                torProcess = null;
            });
        });
    
    } catch(e) {}
}

function stopTor() {
    if (torProcess) {
        try {
            torProcess.kill();
        } catch (_) {}
        torProcess = null;
        torReady = false;
    }
}


// ===== END OF browser\functions\route.js =====

// ===== START OF browser\functions\bookmarks.js =====

// #####################################################################
// BOOKMARKS
// #####################################################################

// Bookmarks
function getBookmarksPath() {
    
    const userPath = path.join(app.getPath('userData'), 'bookmarks.json');
    
    if (!fs.existsSync(userPath)) {
        const defaultPath = path.join(__dirname, 'data/bookmarks.json');
        if (fs.existsSync(defaultPath)) {
            fs.copyFileSync(defaultPath, userPath);
        } else {
            fs.writeFileSync(userPath, JSON.stringify({
                url: []
            }, null, 2));
        }
    }
    
    return userPath;
}

function getFilePath(file) {
    
    const userPath = path.join(app.getPath('userData'), file);
    
    if (!fs.existsSync(userPath)) {
        const defaultPath = path.join(__dirname, 'data/'+ file);
        if (fs.existsSync(defaultPath)) {
            fs.copyFileSync(defaultPath, userPath);
        } else {
            fs.writeFileSync(userPath, JSON.stringify({
            }, null, 2));
        }
    }
    
    return userPath;
}

// ===== END OF browser\functions\bookmarks.js =====

// ===== START OF browser\functions\encode.js =====

// #####################################################################
// 
// #####################################################################

const c = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 10000000;
const DIGEST = 'sha512';
let scrambled = null;
let plain = null;
const xorKey = c.randomBytes(32);

async function generateHash(rawData) {
    // Escape all data first
    const escapedData = escHtml(rawData);
    const encoder = new TextEncoder();
    const data = encoder.encode(escapedData);
    const hashBuffer = await c.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    if(devdebug) console.log('Web Crypto SHA-256:', hashHex);
    return hashHex;
}

function getPWMPath() {
    return path.join(app.getPath('userData'), 'passwords.json');
}

function storeKey(password) {
    scrambled = Buffer.from(password).map((b, i) => b ^ xorKey[i % xorKey.length]);
    password = null;
}

function useKey() {
    plain = scrambled.map((b, i) => b ^ xorKey[i % xorKey.length]);
    return plain; // caller must wipe after use
}

function flushKey() {
    if (scrambled) scrambled.fill(0);
    if (plain) plain.fill(0);
    scrambled = null;
    plain = null;
}

/*
    // Usage
    storeKey(password);

    // Then:
    const key = useKey();
    
    // Do something.
    
    // Then:
    key.fill(0);
    flushKey();
*/

function encodeData(data, password) {
    
    try {
        if (typeof data !== 'string') {
            throw new Error('Data must be a string');
        }
        if (typeof password !== 'string') {
            throw new Error('Password must be a string');
        }

        const secret = c.randomBytes(16);
        const iv = c.randomBytes(12);
        const key = c.scryptSync(password, secret, 32, { N: 32768, r: 8, p: 1, maxmem: 1 * 1024 * 1024 * 1024 });
        const cipher = c.createCipheriv('aes-256-gcm', key, iv);
        
        const encodedData = Buffer.concat([
            cipher.update(data, 'utf8'),
            cipher.final()
        ]);

        const authTag = cipher.getAuthTag();
        return Buffer.concat([secret, iv, authTag, encodedData]);

    } catch (e) {
        console.error('Encryption error:', e.message);
        return null;
    }
}

function decodeData(encodedBuffer, password) {
    
    try {
        
        if (!Buffer.isBuffer(encodedBuffer)) {
            throw new Error('Encrypted data must be a Buffer');
        }
        
        if (typeof password !== 'string') {
            throw new Error('Password must be a string');
        }
        
        const secret = encodedBuffer.subarray(0, 16);
        const iv = encodedBuffer.subarray(16, 28);
        const authTag = encodedBuffer.subarray(28, 44);
        const encodedData = encodedBuffer.subarray(44);
        const key = c.scryptSync(password, secret, 32, { N: 32768, r: 8, p: 1, maxmem: 1 * 1024 * 1024 * 1024 });
        const decipher = c.createDecipheriv('aes-256-gcm', key, iv);
       
        decipher.setAuthTag(authTag);
        
        const decodedData = Buffer.concat([
            decipher.update(encodedData),
            decipher.final()
        ]);

        return decodedData.toString('utf8');

    } catch (e) {
        console.error('Decryption error:', e.message);
        return null;
    }
}

function decodeUserField(method,data,pin) {
    let dec = decodeData(Buffer.from(data, 'base64'), pin);
    return dec;
}

function encodePWM(file, data, password) {
    try {
        let encoded = encodeData(data, password);
        fs.writeFileSync(file, encoded);
        return true;
        } catch(e) {
        if(devdebug) console.log(e);
        return false;
    }
}

function createSessionPass() {
    window.surfview.setValue('sessionPWM', 'active');
    return true;
}

function revokeSessionPass() {
    window.surfview.setValue('sessionPWM', 'inactive');
    return true;
}

function decodePWM(file, password) {
    try {
        const encoded = fs.readFileSync(file);
        return decodeData(encoded, password);
        } catch (e) {
        if(devdebug) console.log(e);
        return false;
    }
}

function PINsalt() {
    
    let secretsalt = '';
    
        let ab = ['a','b','c','d','e','f','g','h','i','j','k','l',
        'm','n','o','p','q','r','s','t','u','v','w','x','y','z'];
        
        for(i=0;i<64;i++) {
            if(Math.floor(Math.random() * 2) == 0) {
                secretsalt += ab[Math.floor(Math.random() * 26)].toUpperCase();
                } else {
                secretsalt += ab[Math.floor(Math.random() * 26)];
            }
        }
        
    return secretsalt;
}

function readSalt() {
    let file = getFilePath('surfvalues.json');
    let decoded = fs.readFileSync(file);
    let decodedData = JSON.parse(decoded);
    let secretsalt = decodedData["salt"];
    return secretsalt;
}

function storeSalt(salt) {
    
    let sv = getFilePath('surfvalues.json');
    let data = JSON.parse(fs.readFileSync(sv, 'utf8'));
    
    if(!data) {
        fs.writeFileSync(sv, JSON.stringify(data, null, 2)).then(function() {
            data = JSON.parse(fs.readFileSync(sv, 'utf8'));
        });
    }
    
    data['salt'] = salt;
    fs.writeFileSync(sv, JSON.stringify(data, null, 2));
}

function encodePIN(pin, pinsalt) {
    return sha256(pin + pinsalt);
}

function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function comparePIN(password, pin) {
    
    let salt = readSalt();
    let hash = sha256(pin + salt);

    let file = getPWMPath();
    let decoded = decodePWM(file, password);
    let decodedData = JSON.parse(decoded);
    
    let userPIN = hash;
    let storedPIN = decodedData["master-pincode"]; //sha256
    
    if(userPIN == storedPIN) {
        return true;
        } else {
        return false;
    }
}

function initVault(password,pin) {
    
    try {
        
        let file = getFilePath('passwords.json');
        
        // Create one-time pinsalt
        let pinsalt = PINsalt();
        
        // Store one-time pinsalt
        storeSalt(pinsalt);
        
        let pincode = encodePIN(pin, pinsalt);
        let enc = encodePWM(file, JSON.stringify({"master-pincode": pincode}), password);
     
        return enc;
        
        } catch (e) { 
        
        if(devdebug) console.log(e);
        return false;
    }
}

function decodePWMVault(pin) {
    let pinsalt = readSalt();
    let sha = encodePIN(pin, pinsalt);
    return decodeData(Buffer.from(PWMvault, 'base64'), sha);
}

function unlockVault(password) {
    
    tmpMasterPassword = password;
    let file = getPWMPath();

    let decoded = decodePWM(file, password);
    let decodedData = JSON.parse(decoded);
    
    PWMvault = encodeData(decoded, decodedData["master-pincode"]).toString('base64');
    
    return decoded;
}

function freePIN() {
    encodedTmpPIN = null;
}

function addPassword(domain, username, password, pin) {

  if(!domain || !username || !password || !pin) {
      if(devdebug) console.log('Missing parameter, cannot add new vault entry.');
      return false;
  }
  
  try {

    if(tmpMasterPassword) {

        const vaultPath = getPWMPath();
        
        let decoded = decodePWM(vaultPath, tmpMasterPassword);
        let data = JSON.parse(decoded);
        
        let domainName = sanitizeUrl(domain, 'host');
        
        if (!data[domainName]) {
            data[domainName] = {
                host: domainName,
                url: domain,
                username: encodeData(username, pin).toString('base64'),
                password: encodeData(password, pin).toString('base64'),
                date: Date.now(),
            };
        }
        
        fs.writeFileSync(vaultPath, encodeData(JSON.stringify(data), tmpMasterPassword));
        
        // Update temp vault.
        PWMvault = encodeData(decoded, data["master-pincode"]).toString('base64');
        console.log('2: ' + PWMvault);
        
    } else {
        return false;
    }

    return true;

  } catch (err) {
    console.error('Failed to add password:', err);
    return false;
  }
}


// ===== END OF browser\functions\encode.js =====

// ===== START OF browser\functions\privacy.js =====

// #####################################################################
// PRIVACY
// #####################################################################

function injectPrivacyScript1(page,msg) {
    if(devdebug) console.log(msg);
    if(privacyEnabled === true) {
        return page.evaluateOnNewDocument(privacyScript);
        } else {
        return page.evaluateOnNewDocument(dummyScript);
    }
}

function injectPrivacyScript(contents,msg) {
    if(devdebug) console.log(msg);
    if(privacyEnabled === true) {
        //return contents.executeJavaScript(privacyScript);
        } else {
        //return contents.executeJavaScript(dummyScript);
    }
}

// ===== END OF browser\functions\privacy.js =====

// ===== START OF browser\functions\websecurity.js =====

// #####################################################################
// WEBSECURITY
// #####################################################################

async function setupWebSecurity() {
    
    await proxyManagement();
    
    session.defaultSession.clearCache();

    const noCacheHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma':    'no-cache',
    'Expires':       '0'
    };

    [session.defaultSession].forEach(sess => {
        sess.webRequest.onBeforeSendHeaders((details, callback) => {
            Object.assign(details.requestHeaders, noCacheHeaders);
            details.requestHeaders['User-Agent'] = SPOOFED_UA;
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });
    });
}


// ===== END OF browser\functions\websecurity.js =====

// ===== START OF browser\functions\webscan.js =====

// #####################################################################
// WEBSCAN
// #####################################################################

async function WebRTCscan(url) {
    
    await proxyManagement();
    
    // returns array of scanned links.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    // Direct Nodescan.
    const res = await net.fetch(url, {
        headers: {
            'DNT': '1',
            'User-Agent': spoof.userAgent,
            'Accept-Language': spoof.locale,
            'Referer': escHtml(new URL(url).origin) + '/',
        },
         signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
        return {
            ok: false,
            status: 'Error',
            error: `\n\nHTTP Error: ${res.status} ${res.statusText}\n\n`,
        };
    }
    
    const sourcecode = await res.text();
            
    if(devdebug) console.log('Started webRTC scan.');
    
    let scan = detectWebRTC(sourcecode,false);

    if(devdebug) console.log('WebRTC done.');

    if (scan === 10) {
        return {
            ok: false,
            status: 'Permanent configuration error',
            error: '\n\nPermanent error:\n\npattern array in /src/core/security/webscanner.js corrupted!\n\n'
        };
    }
    
    if (scan === 1) {
        return {
            ok: false,
            status: 'Possible unmasking attempt blocked.',
            error: '\n\nCould not load page, possible unmasking attempt blocked.\n\n'
        };
    }

    // Fetch and scan externals in Node.js since JS is disabled
    // We scan everything with a src, as even images can hold js.
    const matches = sourcecode.matchAll(/(script|object|embed|frame|frameset|applet|source)[^>]*(src|code|source|data-url|data|action)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gim);
    const matches_source = sourcecode.matchAll(/\.\s*(src|data)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gim);
    
    const validUrls = [];
    // Push base url also:
    validUrls.push(url);
    let base = escHtml(url);
    
    if(matches.length > 250) {
        return {
            ok: false,
            status: 'Permanent error',
            error: 'Permanent error: page has more than 250 src files. Cannot do recon.'
        };
    } 
    
    for (let match of matches) {
         let value = match[3] || match[4] || match[5];
          if (value) {
            if(['),','((','[[',']]','{','}','||',']=','=[','!=','=(','("','&(','="','= "'].some(bad => value.includes(bad))) {
                // url contains illegal chars.
                } else {
                let url = nodeJSurl(base, value);
                if (url != false) validUrls.push(url);
            }
          }
    }

    for (let match2 of matches_source) {
         let value2 = match2[3] || match2[4] || match2[5];
          if (value2) {
            if(['),','((','[[',']]','{','}','||',']=','=[','!=','=(','("','&(','="','= "'].some(bad => value2.includes(bad))) {
                // url contains illegal chars.
                } else { 
                let url2 = nodeJSurl(base, value2);
                if (url2 != false) validUrls.push(url2);
            }
          }
    }

    let uniqueUris = [...new Set(validUrls)];

    let njs = false;
    
    // Sort by importance.
    uniqueUris = sortUrls(uniqueUris);
     
    // Extra sanitization round.
    for (let i = 0; i < uniqueUris.length; i++) {
        
        njs = nodeJSurl(base, uniqueUris[i]);
        
        if(njs != false) { 
            uniqueUris[i] = njs;
            if (!largeUriList.includes(uniqueUris[i])) {
                largeUriList.push({file: uniqueUris[i],
                hash: false
                });
            }
        }
    }

    if(devdebug) console.log(uniqueUris);
    
    let extScan = 0;
    let shouldWeScan = true;
    let scanResults = [];
    
    await proxyManagement();
    
    for (const scriptUrl of uniqueUris) {
        
        if(devdebug) console.log('Testing URI:' + scriptUrl);
        
        try {
            
            // Direct Nodescan.
            const res = await net.fetch(scriptUrl, {
              headers: {
                'DNT': '1',
                'User-Agent': spoof.userAgent,
                'Accept-Language': spoof.locale,
                'Referer': escHtml(new URL(url).origin) + '/',
              },
            });

            const code = await res.text();
       
            // Generate a hash of the file.
            let pageHash = await generateHash(code);
            
            let foundItem = uniqueUris.find(item => item.hash === pageHash && item.file === scriptUrl);
            
            if(foundItem) {
                shouldWeScan = false;
            }
            
            if(shouldWeScan === true) {
                
                uniqueUris = uniqueUris.map(file => ({
                  file,
                  hash: file === scriptUrl ? pageHash : false
                }));

                if(devdebug) console.log('detect WebRTC scan init...');
                
                let scan = detectWebRTC(code,scriptUrl);
                
                if(devdebug) console.log('Scan done!');
                
                if (scan.status === 10) {
                    if(devdebug) console.log('Pattern database corrupted!');
                    extScan++;
                }
                
                if (scan.status === 1) {
                    if(devdebug) console.log('Found a pattern in: ' +escHtml(scriptUrl)+ ', with hash:' + escHtml(pageHash));
                    let showMsg = '\n\nCould not load page, possible unmasking attempt blocked.\n\nFound a signature pattern with RegExp: '+scan.pattern+'\n\nOn URL:\n\n' +escHtml(scan.file)+'\n\n';
                    scanResults.push(showMsg);
                    extScan++;
                }
                
            }
        
        } catch (_) { }
    }
 
    if (extScan >=1) {
        return {
            ok: false,
            pages: uniqueUris,
            error: scanResults,
        };
    }
    
    return {
        ok: true,
        pages: uniqueUris,
    };
}

function nodeJSurl(base, matched) {
    
   if (!matched) return false;
   if (matched === null) return false;
   if (matched === undefined) return false;
   if (matched === false) return false;
   
   let intern = false;
   
   // Typepcast.
   matched = String(matched);
   
   let test = earlyReturn(matched,base);
   
   if(test === false) {
       return false;
       } else {
       matched = test;
   }
   
   let prebase = base.replace('https://','');
   prebase = prebase.replace('http://','');
   prebase = prebase.replace('www.','');
    
   let presub = matched.match(/(?:https?:\/\/|wss?:\/\/|turns?:\/\/|stuns?:\/\/|ftp:\/\/|ww[w0-9]\.(?=\S))(?:[\p{L}\p{N}-]+\.)+(?:[\p{L}]{2,})/gui);

   if(matched.includes(prebase)) {
        intern = true;
        } else if(presub) {
        intern = false;
        } else {
        intern = true;
   }
   
    if(matched.startsWith("/") || matched.startsWith("./")) {
        intern = true;
    } 

    test = earlyReturn(matched,base);
   
    if(test === false) {
       return false;
       } else {
       matched = test;
    }
 
    if(matched.startsWith('./')) {
        matched = matched.replace('./','');
    }
  
    if(intern) { 
    
       let afterScan = matched.match(/(?:https?:\/\/|wss?:\/\/|turns?:\/\/|stuns?:\/\/|ftp:\/\/|ww[w0-9]\.)/gi);
      
       if(afterScan) {
       // dont rewrite, it's already internal.
       } else {
           
        if(matched.startsWith("/") || matched.startsWith("./")) {
            var urlnew = new URL('https://' + prebase);
            matched = urlnew.origin + '***_***' + matched;
            } else {
                // reconstruct url.
                matched = matched.trim();
                matched = matched.replace(base,'');
                matched = matched.replace(prebase,'');
                matched = 'https://' + prebase + '***_***' + matched;
            }
       }
     }

    if(matched.includes('../')) {
       matched = matched.replaceAll('../','_**_**_/');
    }
    
    matched = matched.replaceAll('https://','');
    matched = matched.replaceAll('http://','');
    matched = matched.replace(/[,>;]\s*$/, '').trim();
    matched = matched.replace(/^(src\s*=\s*['"]?|['"])/i, '').trim();
    matched = matched.replace(/^(https?:)?\/\/+/i, '');
    matched = matched.replaceAll(/\/\/+/gi, '');
    matched = matched.replaceAll('***_***', '/');
    matched = matched.replace('//', '/');
    matched = 'https://' + matched.replace('//', '/');
    matched = matched.replace('///', '//');
    
    matched = matched.replaceAll('>','');
    matched = matched.replaceAll('<','');
    matched = matched.replaceAll('\'','');
    matched = matched.replaceAll(';','');
    matched = matched.replaceAll('`','');
    matched = matched.replaceAll('../','');

    matched = matched.replaceAll('_**_**_/','../');
    
    // Edge cases
    if(matched.match(/\(('|"|`|\$|)[{|]*\s*[a-z0-9]*\s*[}|]*('|"|`|)\)/gi)) {
        return false;
    }
    
    if (
        matched.match(/\$\{.*\}/g) ||
        matched.match(/\beval\s*\(\b/gi) ||
        matched.match(/\.toString\s*\(/gi) || 
        matched.match(/\.atob\s*\(/gi) || 
        matched.match(/\.btoa\s*\(/gi)
    ) {
        return false;
    }
    
    if(matched.length <=11 ) {
        return false;
    }
    
    test = earlyReturn(matched,base);
   
    if(test === false) {
       return false;
       } else {
       matched = test;
    }
    
  return matched;
}

function earlyReturn(matched,base) {
    
    matched = matched.trim();

    if(
        matched == 'undefined'
        || matched == 'null'
        || matched == ''
        || matched == 'https://' 
        || matched == 'http://'
        || matched == 'https://src' 
        || matched == 'https://href' 
        || matched == base
        || matched == '#'    
        || matched == '//'
        || matched == '=='
        || matched == '='
        || matched == 'href'
        || matched == 'src'
        || matched == 'let'
        || matched == 'var'
        || matched == 'about:blank'
    )
    {
        return false;
    }
    
    if (
        matched.startsWith('https://chrome-') ||
        matched.startsWith('https://about:') ||
        matched.startsWith('javascript:') ||
        matched.startsWith('data:') ||
        matched.startsWith('file:') || 
        matched.startsWith('chrome:') || 
        matched.startsWith('edge:') || 
        matched.startsWith('moz-extension:') ||
        matched.startsWith('blob:') 
    ) {
        return false;
    }
    
    return matched;
}


// ===== END OF browser\functions\webscan.js =====

// ===== START OF security\strict.js =====

// Add your own strict patterns here
// Some sites need these...

const STRICT_PATTERNS = [

    // block canvas
    ///<\s*canvas/i,
    ///createElement\(\'canvas\'\)/i,
    //toDataURL/i,
    ///fillRect/i,
    /captureStream/i,
    /getImageData/i,
    /getSupportedExtensions/i,
    /SHADING_LANGUAGE_VERSION/i,
    /UNMASKED_VENDOR_WEBGL/i,
    /UNMASKED_RENDERER_WEBGL/i,
    /WEBGL_debug_renderer_info/i,

    ///toBlob/i,
    ///new\s*Blob/i,
    
    // iframes (we already scan iframes, but you could block them all)
    ///\(\s*\'iframe\'\s*\)/i,
    ///\(\s*\'webview\'\s*\)/i,
    ///\(\s*\'object\'\s*\)/i,
    
    // Extra strict: deny sockets.
    ///postMessage/i,
    ///WebSocket/i,
    ///addTrack/i,
    ///removeTrack/i,
    ///onmessage/,
];


// ===== END OF security\strict.js =====

// ===== START OF privacy\profiles.js =====

// #####################################################################
// PROFILES
// #####################################################################

// Language/Languages can be tricky to spoof, 
// as it can be detected in many more locations than just 'navigator'. 
// we keep 'en-US' as default. Easier, and causes fewer discrepancies.

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


// ===== END OF privacy\profiles.js =====

// ===== START OF privacy\spoof.js =====

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


// ===== END OF privacy\spoof.js =====

// ===== START OF browser\special.js =====

// #####################################################################
// SPECIAL SCRIPTS
// #####################################################################

// Required to be empty.
const dummyScript = `(function(){console.log('Privacy script not loaded.');})();`;



// ===== END OF browser\special.js =====

// ===== START OF security\webscanner.js =====

// #####################################################################
// WEBSCANNER
// #####################################################################

// Set to false on production builds, as we can't see scanner_logging anyway.
let scanner_logging = true;

let PATTERNS = [

    /RTC\s*Peer/ig,
    /RTC\s*Dat/ig,
    /RTC\s*Ses/ig,
    /RTC\s*Ice/ig,
    /RTC\s*Rtp/ig,
    /RTC\s*Enc/ig,
    /RTCD\s*tls/ig,
    /RTCS\s*rtp/ig,
    /RTCS\s*udp/ig,
    /RTCS\s*tcp/ig,
    /RTC\s*Cert/ig,
    /RTC\s*Stat/ig,
    /RTC\s*Track/ig,
    /RTC\s*Add/ig,
    /RTC\s*Sen/ig,
    /RTC\s*Rec/ig,
    /RTC\s*Con/ig,
    /mediaDevices/ig,
    /getUserMedia/ig,
    /getDisplayMedia/ig,
    /webkitGetUserMedia/ig,
    /mozGetUserMedia/ig,
    /igceServers/ig,
    /createOffer/ig,
    /createAnswer/ig,
    /setLocalDescription/ig,
    /setRemoteDescription/ig,
    /onicecandidate/ig,
    /addIceCandidate/ig,
    /igceConnectionState/ig,
    /igceGatheringState/ig,
    /signalingState/ig,
    /connectionState/ig,
    /createDataChannel/ig,
    /ondatachannel/ig,
    /addStream/ig,
    /getSenders/ig,
    /getReceivers/ig,
    /getTransceivers/ig,
    /getStats/ig,
    /captureStream/ig,
    /\bontrack\s*=/ig,
    /createEncodedStreams/ig,
    /generateCertificate/ig,
    /getFingerprints/ig,
    /\bstun\s*:.*(\d+)/ig,
    /\bturn\s*:.*(\d+)/ig,
    /\bturns\s*:.*(\d+)/ig,
    /:\s*(3478|5349|19302)/,
    /\bstun\s*:/ig,
    /\bturn\s*:/ig,
    /\burls\s*:/ig,
    /wss\s*:\s*\/\//ig,
    /ws\s*:\s*\/\//ig,
    /OfflineAudioContext/ig,
    /createOscillator/ig,
    /createDynamicsCompressor/ig,
    /getFloatFrequencyData/ig,
    /getChannelData/ig,
    /startRendering/ig,
    /simple-peer/ig,
    /SimplePeer/ig,
    /peerjs/ig,
    /mediasoup/ig,
    /janus\.js/ig,
    /proxy\.js/ig,
    /rtc\.js/ig,
    /webrtc-adapter/ig,
    /adapter\.js/ig,
    /socket\.io/ig,
    /\.on\s*\(\s*['"`]offer/ig,
    /\.on\s*\(\s*['"`]answer/ig,
    /\.on\s*\(\s*['"`]candidate/ig,
    /a=candidate/ig,
    /a=ice-/ig,
    /a=fingerprint/ig,
];

PATTERNS = [...PATTERNS, ...STRICT_PATTERNS];

function filterFalsepositives(code) {
    // Noticed these in next.js, very odd, but false positives.
    // We only do replacements in js recon, we're not parsing/replacing live js.
    code = code.replaceAll(/turn\s*:\s*(0|1)\s*}/ig,'');
    code = code.replaceAll(/turn\s*:\s*function/ig,'');
    code = code.replaceAll(/return\s*:/ig,'');
    code = code.replaceAll(/returns\s*:/ig,'');
    return code;
}

function detectWebRTC(code,uri) {

    code = filterFalsepositives(code);
    
    // Redundant check, if array is good.
    if(PATTERNS.length < 10) {
       // Serious error, stop loading page.
            return {
                status:10,
                file: false, 
                pattern:false
            };
    }

    for (const p of PATTERNS) {
        if (p.test(code)) {
            if(scanner_logging == true) console.log(p,uri);
            return {
                status:1,
                file: uri, 
                pattern:p
            };
        }
    }
   
    let deep = detectInSource(code,uri);
        if(deep.status == 1) {
            return {
                status:1,
                file: uri, 
                pattern: 'detected in source'
            };
        }
    
    return {
        status:0,
        file: false, 
        pattern: false
    };
}

function matchPatterns(source,uri) {
    
    for (const p of PATTERNS) {
        if (p.test(source)) {
            if(scanner_logging == true) console.log(p,uri);
            return {
                status:1,
                file: uri, 
                pattern: p
            };
        }
    }
    
    return {
        status:0,
        file: false, 
        pattern: false
    };
}

function cleaner(source) {
    
    // Arrays
    if(source.includes('[')) {
        source = source.replace(/\[([^\]]+)\]/g, (_, inner) => {
            const parts = [...inner.matchAll(/['"`]([^'"`]*)['"`]/g)].map(m => m[1]);
            return "'" + parts.join('') + "'";
        });  
    }
    
    source = source.replaceAll(/['"`]\s*\+\s*['"`]/g, '');
    source = source.replaceAll(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    source = source.replaceAll(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    source = source.replaceAll(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
    source = source.replaceAll(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d)));  
    source = source.replaceAll(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    source = source.replaceAll(/['"`]\s*\+\s*['"`]/g, '');
    source = source.replaceAll(/\s+/g, ' ');
    
    // Arrays
    if(source.includes('[')) {
        source = source.replace(/\[([^\]]+)\]/g, (_, inner) => {
            const parts = [...inner.matchAll(/['"`]([^'"`]*)['"`]/g)].map(m => m[1]);
            return "'" + parts.join('') + "'";
        });  
    }
    
    return source;
}

function resolveStringVars(source) {
    
    const vars = {};
    const arrays = {};

    const arrRegex = /(?:var|let|const)\s+(\w+)\s*=\s*\[([^\]]+)\]/g;
    let match;
    while ((match = arrRegex.exec(source)) !== null) {
        const parts = [...match[2].matchAll(/['"`]([^'"`]*)['"`]/g)].map(m => m[1]);
        if (parts.length > 0) arrays[match[1]] = parts;
    }

    const declRegex = /(?:var|let|const)\s+(\w+)\s*=\s*['"`]([^'"`]*)['"`]/g;
    while ((match = declRegex.exec(source)) !== null) {
        if (!(match[1] in arrays)) {
            vars[match[1]] = match[2];
        }
    }

    for (const [arrName, parts] of Object.entries(arrays)) {
        source = source.replace(
            new RegExp(`\\b${arrName}\\[(\\d+)\\]`, 'g'),
            (_, i) => `'${parts[parseInt(i)] ?? ''}'`
        );
    }

    for (const [varName, value] of Object.entries(vars)) {
        source = source.replace(
            new RegExp(`(?<!(?:var|let|const)\\s{0,10})\\b${varName}\\b`, 'g'),
            `'${value}'`
        );
    }

    let prev;
    do {
        prev = source;
        source = source.replace(/['"`]([^'"`]*?)['"`]\s*\+\s*['"`]([^'"`]*?)['"`]/g, "'$1$2'");
    } while (source !== prev);

    return source;
}

function looksLikeJavaScript(source) {
  return (
    /=\s*\[/.test(source)  ||
    /\+\s*=/.test(source) ||
    /\b(var|let|const)\s+[_$a-zA-Z0-9]+\s*=/.test(source) ||
    /[!$_]\w+?\s*=/.test(source) ||
    /\(\s*\)\s*=>/.test(source) ||
    /\beval\s*\(/.test(source) ||
    /\b(forEach|map|filter|reduce)\s*\(/.test(source) ||
    /\b(atob|btoa)\s*\(/.test(source) ||
    /\b(navigator|window|document)\s*\./.test(source) ||
    /\b(function\s+[_$a-zA-Z0-9]+\s*\(|return|typeof|instanceof)/.test(source) ||
    /\brequire\s*\(/.test(source) ||
    /\bimport\s+.+\bfrom\b/.test(source)
  );
}

function detectInSource(source,uri) {

    let prepare = false;
    let scanstart = false;
    
    // First detect if it's JavaScript, otherwise we waste resources.    
    prepare = looksLikeJavaScript(source);
   
    if(prepare == true || prepare === true || prepare === 'true') {
        scanstart = true;
    }

    if(scanstart) {

    let current = source;
    const seen = new Set();
    
        while (true) {
            // Avoid infinite loops
            if (seen.has(current)) break;
            seen.add(current);

            // First unwrap all vars and arrays, and concatenate them.
            const unwrap1 = resolveStringVars(source)
            if (matchPatterns(unwrap1,uri).status == 1) return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious code after string deobfuscation.'
            };

            // clean obfuscation
            const cleaned1 = cleaner(unwrap1);
            if (matchPatterns(cleaned1,uri).status == 1) return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious code after deobfuscation unwrapping.'
            };
            
            // clean obfuscation
            const cleaned = cleaner(cleaned1);
            if (matchPatterns(cleaned,uri).status == 1)return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious code after cleaning.'
            };

            // decode base64 then clean again
            const decoded = cleaner(decodeBase64Strings(cleaned));
            if (matchPatterns(decoded,uri).status == 1) return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious bas64 encoded data.'
            };

            // Unwrap again.
            const unwrap2 = resolveStringVars(decoded)
            if (matchPatterns(unwrap2,uri).status == 1) return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious code after deobfuscation'
            };
            
            // nothing changed, stop
            if (decoded === cleaned) break;

            current = decoded;
        }
    }
    
    return {
        status:0,
        file: false, 
        pattern: false
    };
}

function decodeBase64Strings(source) {
    
    if(!source.includes('atob')) {
        return source;
    }
    
    const base64Regex = /\batob\((.*?)\)/g;
    
    let decoded = source;
    let match;

    while ((match = base64Regex.exec(source)) !== null) {
        const b64 = match[1].replace(/['"`]/g, ''); // strip quotes
        try {
            const decodedStr = atob(b64);
            decoded = decoded.replace(match[0], `'${decodedStr}'`);
        } catch (e) {
            // not valid base64, skip
        }
    }

    return decoded;
}


// ===== END OF security\webscanner.js =====

// ===== START OF browser\webpreferences.js =====


let webPreferences = {
    partition: 'nopersist',
    contextIsolation: true,
    nodeIntegration: false,
    nodeIntegrationInSubFrames:false,
    nodeIntegrationInWorker:false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    disableCache: true,
    disableWebRTC: true,
    webgl:false,
    webviewTag:true,
    experimentalFeatures:false,
    disableDialogs : true,
    safeDialogs : true,
    spellcheck: false,
    enableWebSQL : false,
    plugins : false,
    disableCache : true,
    navigateOnDragDrop: false,
    disableBlinkFeatures: 'Autofill,ServiceWorker',
    safeDialogsMessage :'Blocked',
    disableBlinkFeatures:'Autofill,ServiceWorker',
    autoplayPolicy : 'user-gesture-required',
    referrerpolicy: "no-referrer"
}

// ===== END OF browser\webpreferences.js =====

// ===== START OF browser\browserview.js =====

// #####################################################################
// BROWSER LOGIC
// #####################################################################

app.on('ready', () => {

    setupWebSecurity();
    defaultArgs.forEach(arg => {
        app.commandLine.appendSwitch(arg);
    });
    
    let webPreferencesView = structuredClone(webPreferences);
    webPreferences.preload = path.join(__dirname, 'preload.js');
    webPreferences.nodeIntegration = true;
    webPreferencesView.javascript = jsEnabled;
    webPreferencesView.preload = path.join(__dirname, 'inject.js');
    
    // Create the main window
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 800,
        minHeight: 500,
        backgroundColor: '#0e0f11',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: webPreferences,
    });

    // Create BrowserView
    SurfBrowserView = new WebContentsView({
        webPreferences: webPreferencesView,
    });

    // Set the BrowserView reference in the IPC module
    mainWindow.contentView.addChildView(SurfBrowserView);

    ipcMain.handle('PWMmanager', async (_event) => {
        
        const currentURL = SurfBrowserView.webContents.getURL();
        
        let url = new URL(currentURL).hostname;
        
        if(url) {

            let vault = decodePWMVault(pin);
            credentials = {};
            // crypto.
            credentials.username = '';
            credentials.password = '';
            
            return credentials;            
        }
        
    });

    SurfBrowserView.setBounds({
        x: 0,
        y: 81,
        width: parseInt(mainWindow.getContentSize()[0] - 251),
        height: 650
    });

    // Load the initial URL
    SurfBrowserView.webContents.loadURL( path.join(__dirname, 'default.html'));
    // Handle window resize
    mainWindow.on('resize', () => {
        SurfBrowserView.setBounds({
            x: 0,
            y: 81,
            width: parseInt(mainWindow.getContentSize()[0] - 251),
            height: parseInt(mainWindow.getContentSize()[1] - 105)
        });
    });
    
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
});

async function launchWebscanner(url) {

    if(!url) return false;
    let basedomain = url; 
    const domainExists = largeUriList.some(entry => entry.domain === basedomain);
    if (!domainExists) {
        // Do source code scan.
        scanned = await WebRTCscan(url);      
        if(devdebug) console.log('FULL detectWebRTC scan done!'); 
    }
    
    if(scanned.pages) { 
        
        let basedomain = url;
        let visitedDomain = {};
        
        if(scanned.ok == false) {
            
            visitedDomain = {
                domain: basedomain,
                insecure: true,
                requestedFiles: [...scanned.pages]
            };
            
        } else {
            
            visitedDomain = {
                domain: basedomain,
                insecure: false,
                requestedFiles: [...scanned.pages]
            };
        }
                
        largeUriList.push(visitedDomain);
    }
    
    return scanned;
}

function scanUrls(url) {
    
    if(largeUriList.length >=1) {
        largeUriList.forEach(webtest => {
            if(webtest.domain == url && webtest.insecure == true) {
                return true;
            }
        });
    }
    
    return false;
}

async function applySpoofing() {

    app.commandLine.appendSwitch('lang', spoof.locale);
    app.commandLine.appendSwitch('timezone', spoof.timezone);

    try {
        SurfBrowserView.webContents.debugger.attach('1.3');
    } catch(e){
        
    }
    
    await SurfBrowserView.webContents.debugger.sendCommand('Emulation.setUserAgentOverride', {
        userAgent: spoof.userAgent,
        userAgentMetadata: {
            ...spoof.userAgentMetadata
        }
    });

    await SurfBrowserView.webContents.debugger.sendCommand('Emulation.setTimezoneOverride', {
        timezoneId: spoof.timezone
    });

    await SurfBrowserView.webContents.debugger.sendCommand('Emulation.setLocaleOverride', {
        locale: spoof.locale
    });
    
    SurfBrowserView.webContents.debugger.on('message', (event, method, params) => {
        try {
            if (method === 'Page.frameAttached') {
                SurfBrowserView.webContents.debugger.sendCommand('Emulation.setUserAgentOverride', {
                    userAgent: spoof.userAgent,
                    userAgentMetadata: spoof.userAgentMetadata
                });
            }
         } catch(e) {}
    });
    
    SurfBrowserView.webContents.debugger.on('detach', (event, reason) => {
        try {
            if(devdebug) console.log("Debugger detached:", reason);
                if (reason !== 'target_closed' || reason !== 'target closed' ) { 
                    SurfBrowserView.webContents.debugger.attach('1.3');
                }
        } catch(e) {}
    });          
}

async function launchBrowser(url) {

    urlInputField = url;

    await proxyManagement();

    let insecure = false;
    let livemode = true;
    
    if(imageModeEnabled) {
        SurfBrowserView.setBounds({x:0,y:0,width:0,height: 0});
        const base64Screenshot = await takeFullPageScreenshotAsBase64(url);
        try {
        addScript(`
            liveWrap.className = 'live-wrap hide';
            loadingState.className = 'loading-state hide';
            loadingStateLive.className = 'loading-state hide';
            pageImageWrap.className = 'page-image-wrap active';
            pageImage.src = 'data:image/png;base64,${base64Screenshot}';
            pageImage.className = 'page-image active';
        `);
        } catch(e) {console.log(e);}
        livemode = false;
    } 
            
    if(webscannerEnabled) {

        let existingEntry = largeUriList.find(entry => entry.domain === url);
        if (existingEntry) {
             if (existingEntry.insecure) {
                // Hide BrowserView
                SurfBrowserView.setBounds({x:0,y:0,width:0,height: 0});
                // Show error.
                addScript(`
                        errorState.className = 'error-state active';
                        loadingState.className = 'loading-state hide';
                        loadingStateLive.className = 'loading-state hide';
                        errorMsgStatus.textContent = 'Webscanner found insecure code.';
                        errorMsg.innerHTML = \`Cannot revisit, found insecure code before.\`;
                        launchReload.className = 'launchReload hide';
                        launchReport.className = 'launchReport hide';
                `);
                insecure = true;
            }
        }  else {
            let scannerresult = await launchWebscanner(url);
            if(scannerresult.ok == false) {
                // Hide BrowserView
                SurfBrowserView.setBounds({x:0,y:0,width:0,height: 0});
                // Show error.
                addScript(`
                    errorState.className = 'error-state active';
                    loadingState.className = 'loading-state hide';
                    loadingStateLive.className = 'loading-state hide';
                    errorMsgStatus.textContent = 'Webscanner found insecure code.';
                    errorExplainer.innerHTML = \`${ErrorMessage(scannerresult.error.toString())}\`;
                    launchReload.className = 'launchReload hide';
                    launchReport.className = 'launchReport active';
                `);
                insecure = true;
            } 
        }
    }
    
    if(insecure == false && livemode == true) {
        
        if (url) {
            if (!historyStack.includes(url)) {
                historyStack.push(url);
                currentIndex++;
            }
        }
      
        if (SurfBrowserView) {
            
            try {
                mainWindow.removeAllListeners();
            } catch(e) {} 
            
            mainWindow.contentView.removeChildView(SurfBrowserView ); 
            
            try {
                SurfBrowserView.webContents.removeAllListeners();
            } catch(e) {} 
            
            SurfBrowserView.webContents.close();
            SurfBrowserView.webContents.destroy();
            SurfBrowserView = null;
            
        }
        
        setupWebSecurity();
        let webPreferencesView = structuredClone(webPreferences);
        
        if(jsEnabled) { 
            if(devdebug) console.log('JS: ' + jsEnabled);
            webPreferencesView.preload = path.join(__dirname, 'inject.js');
        }
        
        webPreferencesView.javascript = jsEnabled;
        
        SurfBrowserView = new WebContentsView({
            webPreferences: webPreferencesView,
        });

        mainWindow.contentView.addChildView(SurfBrowserView);

        SurfBrowserView.setBounds({
            x: 0,
            y: 81,
            width: parseInt(mainWindow.getContentSize()[0] - 251),
            height: parseInt(mainWindow.getContentSize()[1] - 105)
        });
                
        SurfBrowserView.webContents.setUserAgent(spoof.userAgent);
        
        if(privacyEnabled) { 
            if(devdebug) console.log('Privacy: ' + privacyEnabled);
            applySpoofing();
        }
            
        let events = setupBrowserViewEventListeners();
        
        if(events) {
            SurfBrowserView.webContents.loadURL(url);
            mainWindow.on('resize', () => {
                SurfBrowserView.setBounds({
                    x: 0,
                    y: 81,
                    width: parseInt(mainWindow.getContentSize()[0] - 251),
                    height: parseInt(mainWindow.getContentSize()[1] - 105)
                });
            });
        }
    }
}

async function addScript(code) {
    mainWindow.webContents.executeJavaScript(`
        function SurfBoard() {` + code + `}
    `);
    mainWindow.webContents.executeJavaScript(`SurfBoard();`);
}

async function setupBrowserViewEventListeners() {
    
    // Listen for load failures.
    SurfBrowserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (isMainFrame) {
            let err = netErrorCode(errorDescription);
            // Hide BrowserView
            SurfBrowserView.setBounds({x:0,y:0,width:0,height: 0});
            // Show error.
            addScript(`
                errorState.className = 'error-state active';
                loadingState.className = 'loading-state hide';
                loadingStateLive.className = 'loading-state hide';
                errorMsgStatus.textContent = '${err.errorMsg}';
                errorExplainer.textContent = '${err.errorMsgExplain}';
                launchReload.className = 'launchReload hide';
                launchReport.className = 'launchReport active';
            `);
        }
    });
        
    // Listen for provisional load failures (fires before navigation starts)
    SurfBrowserView.webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`Provisional load failed (did-fail-provisional-load): ${errorDescription} (Code: ${errorCode})`);
        // Handle the error (e.g., show a user-friendly message)
    });
    
    // Navigation start event
    SurfBrowserView.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
        if(jsEnabled) { 
            if (isMainFrame) {
            }
        }
    });

    // Frame finish load event
    SurfBrowserView.webContents.on('did-frame-finish-load', async (event, isMainFrame) => {
            const { root } = await SurfBrowserView.webContents.debugger.sendCommand('DOM.getDocument');
            const { outerHTML } = await SurfBrowserView.webContents.debugger.sendCommand('DOM.getOuterHTML', {
                nodeId: root.nodeId
            });
            //console.log(outerHTML);
    });

    // Page finish load event
    SurfBrowserView.webContents.on('did-frame-finish-load', async () => {
        try {
            const currentUrl = SurfBrowserView.webContents.getURL();
            await mainWindow.webContents.executeJavaScript(`
                (function() {
                    urlInputField = document.getElementById('urlInput');
                    if (urlInputField) {
                        urlInputField.value = ${JSON.stringify(currentUrl)};
                        urlInputField.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                })();
            `);
        } catch(e) {
            console.error('Error updating URL input:', e);
        }
    });

    // Page finish load event
    SurfBrowserView.webContents.on('did-finish-load', async () => {

    });

    // Navigation event
    SurfBrowserView.webContents.on('will-navigate', (event) => {
        if (!event.url.startsWith('file://')) {
            // event.preventDefault();
            // console.warn(`[Main] Navigation blocked: ${event.url}`);
        }
    });

    // Crash event
    SurfBrowserView.webContents.on('crashed', () => {
        // Reload the page
        SurfBrowserView.webContents.reload();
    });

    // Closed event
    SurfBrowserView.webContents.on('closed', () => {
    });
    
    return true;
}

async function takeFullPageScreenshotAsBase64(url) {
    
    await proxyManagement();
    
    // Declare browser in the outer scope
    let browser;
    let args = [...defaultArgs]; // Create a copy of default args

    if (torEnabled) {
        if (Array.isArray(torChromeArgs)) {
            args.push(...torChromeArgs);
        } else if (typeof torChromeArgs === 'string') {
            args.push(torChromeArgs);
        }
    }

    try {
        // Launch Puppeteer with proper configuration
        browser = await puppeteer.launch({
            headless: 'new',
            args: args,
        });

        const page = await browser.newPage();
        await page.setJavaScriptEnabled(false); 

        // Set user agent
        if (typeof SPOOFED_UA === 'string') {
            await page.setUserAgent(SPOOFED_UA);
        }

        // Set viewport with proper validation
        const viewport = {
            width: parseInt(spoof.width) || 1920,
            height: parseInt(spoof.height) || 1080,
            deviceScaleFactor: 1,
            hasTouch: false,
            isMobile: false,
            isLandscape: false
        };

        await page.setViewport(viewport);

        // Navigate to URL with comprehensive loading checks
        await page.goto(url, {
            waitUntil: ['domcontentloaded', 'networkidle2'],
            timeout: 30000,
        });

        // Take full-page screenshot as base64
        const base64String = await page.screenshot({
            type: 'png',
            fullPage: true,
            encoding: 'base64',
            omitBackground: false // Explicitly set to avoid transparency issues
        });

        return base64String;

    } catch (error) {
        console.error('Screenshot failed:', error);
        throw error; // Re-throw to let the caller handle it
    } finally {
        // Close browser if it was opened
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Failed to close browser:', closeError);
            }
        }
    }
}

/*

// menu...

    win.webContents.on('did-finish-load', async () => {
      win.webContents.savePage('/tmp/test.html', 'HTMLComplete').then(() => {
        console.log('Page was saved successfully.')
      }).catch(err => {
        console.log(err)
      })
    })
    
    mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
        event.preventDefault();
        SurfBrowserView.webContents.openDevTools();
    }
    });

    // Right-click menu
    const contextMenu = new Menu();
    contextMenu.append(new MenuItem({ label: 'Cut', role: 'cut', dark: true }));
    contextMenu.append(new MenuItem({ label: 'Copy', role: 'copy', dark: true }));
    contextMenu.append(new MenuItem({ label: 'Paste', role: 'paste', dark: true }));
    contextMenu.append(new MenuItem({ type: 'separator' }));
    contextMenu.append(new MenuItem({
    label: 'Inspect Element',
    click: () => SurfBrowserView.webContents.openDevTools(), // Open DevTools for BrowserView
    dark: true,
    }));
    contextMenu.append(new MenuItem({ type: 'separator' }));
    contextMenu.append(new MenuItem({
    label: 'Save Page to Downloads',
    click: async () => {
        const url = SurfBrowserView.webContents.getURL();
        mainWindow.webContents.downloadURL(url);
    },
    dark: true,
    }));

    // Attach right-click menu to BrowserView
    SurfBrowserView.webContents.on('context-menu', (e, params) => {
    contextMenu.popup(mainWindow, params.x, params.y);
    });

    // Download handling (same as before)
    mainWindow.webContents.session.on('will-download', (event, item) => {
    const savePath = path.join(app.getFilePath('downloads'), item.getFilename());
    item.setSavePath(savePath);
    item.on('done', (e, state) => {
        if (state === 'completed') {
        messageBox(`Download saved to: ${savePath}`);
        }
    });
    });

    // Search in BrowserView (updated)
    ipcMain.handle('search-in-webview', async (event, text, options = {}) => {
    if (!text) {
    mainWindow.webContents.executeJavaScript(`
    document.getElementById('search-results').textContent = '0/0';
    `);
    return;
    }

    SurfBrowserView.webContents.findInPage(text, {
    forward: options.forward !== false,
    findNext: true,
    matchCase: false,
    });

    SurfBrowserView.webContents.once('found-in-page', (event, result) => {
    if (result.finalUpdate) {
    mainWindow.webContents.executeJavaScript(`
    document.getElementById('search-results').textContent =
    '${result.activeMatchOrdinal}/${result.matches}';
    `);
    }
    });
    });

    // Stop search (updated)
    ipcMain.handle('stop-search-in-webview', async () => {
    SurfBrowserView.webContents.stopFindInPage('clearSelection');
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
});

*/

// ===== END OF browser\browserview.js =====

// ===== START OF browser\on.js =====

// #####################################################################
// APP ON EVENTS
// #####################################################################

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

process.on('unhandledRejection', () => {});

app.whenReady().then(async () => {});

app.on('did-attach-webview', (event, contents) => {
    
  try { contents.debugger.attach('1.3'); } catch(e) {}

        contents.debugger.sendCommand('Emulation.setUserAgentOverride', {
          userAgent: spoof.userAgent,
          userAgentMetadata: {
            ...spoof.userAgentMetadata
          }
        });

        contents.debugger.sendCommand('Emulation.setTimezoneOverride', {
          timezoneId: spoof.timezone
        });

        contents.debugger.sendCommand('Emulation.setLocaleOverride', {
          locale: spoof.locale
        });
        
});

protocol.registerSchemesAsPrivileged([
    { scheme: 'source-view', privileges: { supportFetchAPI: true, standard: true, secure: true } }
])

app.on('ready', () => {
    session.defaultSession.clearCache()
    session.defaultSession.clearStorageData()
})

app.on('will-attach-webview', (event, webPreferences, params) => {});
app.on('did-attach-webview', (event, contents) => {});
app.on('web-contents-created', (event, contents) => {});

app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    stopTor();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    globalShortcut.unregisterAll();
    stopTor();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopTor();
});


// ===== END OF browser\on.js =====

// ===== START OF animate\ease.js =====

const easings = {
  // Smooth start and end
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // Slow start, fast end
  easeIn: t => t * t * t,

  // Fast start, slow end
  easeOut: t => 1 - Math.pow(1 - t, 3),

  // Overshoots then settles (springy!)
  easeOutBack: t => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },

  // Bouncy!
  easeOutBounce: t => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1)       return n1 * t * t
    else if (t < 2 / d1)  return n1 * (t -= 1.5 / d1) * t + 0.75
    else if (t < 2.5 / d1)return n1 * (t -= 2.25 / d1) * t + 0.9375
    else                   return n1 * (t -= 2.625 / d1) * t + 0.984375
  }
}



// ===== END OF animate\ease.js =====

// ===== START OF animate\animateBrowserView.js =====

function animateBrowserView(browserView, targetBounds, options = {}) {
  
  const {
    duration = 400,      // ms
    easing = 'easeInOut',
    onDone = () => {}
  } = options

  const startBounds = browserView.getBounds()
  const easeFn = easings[easing] ?? easings.easeInOut
  const fps = 60
  const intervalMs = 1000 / fps
  const steps = Math.round(duration / intervalMs)
  let count = 0

  const interval = setInterval(() => {
    count++
    const progress = Math.min(count / steps, 1)
    const eased = easeFn(progress)

    browserView.setBounds({
      x:      Math.round(startBounds.x      + (targetBounds.x      - startBounds.x)      * eased),
      y:      Math.round(startBounds.y      + (targetBounds.y      - startBounds.y)      * eased),
      width:  Math.round(startBounds.width  + (targetBounds.width  - startBounds.width)  * eased),
      height: Math.round(startBounds.height + (targetBounds.height - startBounds.height) * eased),
    })

    if (count >= steps) {
      clearInterval(interval)
      browserView.setBounds(targetBounds) // snap clean
      onDone()
    }
  }, intervalMs)

  // Return cancel function
  return () => clearInterval(interval)
}



// ===== END OF animate\animateBrowserView.js =====


})();

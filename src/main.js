// src/main.js
// Electron main process.
// All network access and rendering happens here.
// The renderer process only ever receives pixels and structured data.

const {
    app,
    BrowserWindow,
    ipcMain,
    shell,
    session,
    dialog,
    webContents
} = require('electron');

const path = require('path');
const puppeteer = require('puppeteer');
const {spawn} = require('child_process');
const fs = require('fs');

// Tor toggle state
let torEnabled = false; // default: off

// Webview javascript
let jsEnabled = false; // default: off
    
// Spoofed UA
// We set fake chrome, but actually run a nightly build.
const SPOOFED_UA = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'AppleWebKit/537.36 (KHTML, like Gecko)',
    'Chrome/146.0.7680.80',
    'Safari/537.36',
].join(' ');

// Tor path
let torPath = path.join(process.resourcesPath, 'tor/tor.exe');
let torDataDir = path.join(process.resourcesPath, 'tor/tor-data');
let geoipPath = path.join(process.resourcesPath, 'tor/geoip');
let geoip6Path = path.join(process.resourcesPath, 'tor/geoip6');

ipcMain.handle('toggle-tor', async (_event, enabled) => {
    torEnabled = enabled;

    const wvSession = getWebviewSession();
    if (torEnabled) {
        try {
            await startTor();
            await wvSession.setProxy({ proxyRules: 'socks5://127.0.0.1:9050' });
            return { ok: true, torEnabled: true };
        } catch (err) {
            return { ok: false, error: err.message, torEnabled: false };
        }
    } else {
        stopTor();
        await wvSession.setProxy({ proxyRules: 'direct://' });
        return { ok: true, torEnabled: false };
    }
});

ipcMain.handle('tor-status', () => {
    return {
        ready: torReady,
        enabled: torEnabled
    };
});

ipcMain.handle('set-js', async (_event, val) => {
    jsEnabled = val;
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

// Tor process management
let torProcess = null;
let torReady = false;

function startTor() {

    return new Promise((resolve, reject) => {
        // Ensure data directory exists
        if (!fs.existsSync(torDataDir)) {
            fs.mkdirSync(torDataDir, {
                recursive: true
            });
        }

        torProcess = spawn(torPath, [
            '--SocksPort', String(9050),
            '--DataDirectory', torDataDir,
            '--GeoIPFile', geoipPath,
            '--GeoIPv6File', geoip6Path,
            '--CircuitBuildTimeout', '10', // fail slow circuits faster (default 60)
            '--LearnCircuitBuildTimeout', '0', // don't auto-adjust, keep it tight
            '--NumEntryGuards', '8', // more entry options = faster initial pick
            '--KeepalivePeriod', '60', // keep circuits alive
            '--NewCircuitPeriod', '15', // try new circuits sooner if needed
            '--SocksTimeout', '15', // fail hung SOCKS connections faster 
        ]);

        const timeout = setTimeout(() => {
            reject(new Error('Tor failed to bootstrap within 60 seconds'));
        }, 60000);

        const onData = (data) => {
            const line = data.toString();
            console.log('[Tor]:', line.trim());
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
            console.error('[Tor] Failed to start:', err.message);
            reject(err);
        });

        torProcess.on('exit', (code) => {
            console.log('[Tor] Exited with code', code);
            torReady = false;
            torProcess = null;
        });
    });
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

ipcMain.handle('read-bookmarks', async (_event) => {
    try {
        const data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
        if (!Array.isArray(data.url)) return [];
        return data.url.slice(0, 50);
    } catch (e) {
        return [];
    }
});

ipcMain.handle('save-bookmark', async (_event, url) => {
    try {
        const data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
        if (!Array.isArray(data.url)) data.url = [];
        if (data.url.length >= 50) return false;
        if (data.url.includes(url)) return false;
        data.url.push(url);
        fs.writeFileSync(getBookmarksPath(), JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        return false;
    }
});

ipcMain.handle('remove-bookmark', async (_event, url) => {
    try {
        const data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
        if (!Array.isArray(data.url)) return false;
        data.url = data.url.filter((u) => u !== url);
        fs.writeFileSync(getBookmarksPath(), JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        return false;
    }
});

// Utilities
function escHtml(s) {
    return String(s)
        .replaceAll(/&/gim, '&amp;')
        .replaceAll(/</gim, '&lt;')
        .replaceAll(/>/gim, '&gt;')
        .replaceAll(/"/gim, '&quot;');
}

function sanitizeUrl(raw) {
    let url = String(raw).trim();

    url = url.replaceAll(/[\x00-\x20\x7F]/gim, '');
    url = url.replaceAll(/[(){}\[\]`]/g, '');

    if (/^(javascript|data|vbscript|file|about|chrome|settings|mailto|mailbox|blob|xlink|navigation|navigator|window):/i.test(url)) {
        return null;
    }

    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return null;
        }
        var stripped = parsed.href.replaceAll(/[\x00-\x1F\x7F]/gim, '');
        var enc = ['%00', '%1F', '%0D', '%0A'];
        enc.forEach(function(code) {
            stripped = stripped.replaceAll(new RegExp(code, 'gim'), '');
        });
        return stripped;
    } catch (e) {
        return null;
    }
}

// Main window

let mainWindow = null;

function setupWebSecurity() {
    const webviewSession = session.fromPartition('temp:webview');

    webviewSession.setProxy({
        proxyRules: torEnabled && torReady 
            ? 'socks5://127.0.0.1:9050' 
            : 'direct://'
    });

    webviewSession.clearCache();
    session.defaultSession.clearCache();

    const noCacheHeaders = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma':        'no-cache',
        'Expires':       '0'
    };

    [webviewSession, session.defaultSession].forEach(sess => {
        sess.webRequest.onBeforeSendHeaders((details, callback) => {
            Object.assign(details.requestHeaders, noCacheHeaders);
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });
    });

    webviewSession.setPermissionRequestHandler(
        (webContents, permission, callback) => {
            const allowedPermissions = [
                // 'media', // uncomment only if required
            ];
            if (!allowedPermissions.includes(permission)) {
                console.warn(`[WebView] Permission denied: ${permission}`);
            }
            callback(allowedPermissions.includes(permission));
        }
    );

    webviewSession.setCertificateVerifyProc((request, callback) => {
        callback(0); // 0 = default OS verification (never use -2)
    });
}

app.on('web-contents-created', (event, contents) => {

    contents.setWindowOpenHandler(() => {
        console.warn('[Security] Blocked new window');
        return { action: 'deny' };
    });

    contents.on('will-attach-webview', (event, webPreferences, params) => {

        // Validate source URL
        let srcUrl;
        try {
            srcUrl = new URL(params.src);
        } catch {
            console.warn(`[WebView] Invalid src: ${params.src}`);
            event.preventDefault();
            return;
        }

        // Validate partition
        const allowedPartitions = ['temp:webview'];
        if (params.partition && !allowedPartitions.includes(params.partition)) {
            console.warn(`[WebView] Blocked partition: ${params.partition}`);
            event.preventDefault();
            return;
        }

        // Strip preload scripts
        delete webPreferences.preload;
        delete webPreferences.preloadURL;

        // Force secure preferences
        Object.assign(webPreferences, {
            nodeIntegration:             false,
            nodeIntegrationInSubFrames:  false,
            nodeIntegrationInWorker:     false,
            sandbox:                     true,
            contextIsolation:            true,
            webSecurity:                 true,
            allowRunningInsecureContent: false,
            experimentalFeatures:        false,
            disableDialogs:              true,
            safeDialogs:                 true,
            safeDialogsMessage:          'Blocked',
            spellcheck:                  false,
            enableWebSQL:                false,
            plugins:                     false,
            disableCache:                true,
            enableBlinkFeatures:         '',
            disableBlinkFeatures:        'Autofill,ServiceWorker',
            images:                      true,
            navigateOnDragDrop:          false,
            autoplayPolicy:              'user-gesture-required',
        });
    });
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width:           1280,
        height:          820,
        minWidth:        800,
        minHeight:       500,
        backgroundColor: '#0e0f11',
        titleBarStyle:   process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: {
            preload:                     path.join(__dirname, 'preload.js'),
            contextIsolation:            true,
            nodeIntegration:             false,
            sandbox:                     true,
            webSecurity:                 true,
            allowRunningInsecureContent: false,
            disableCache:                true,
            webviewTag:                  true,
            disableBlinkFeatures:        'Autofill,ServiceWorker',
        }
    });

    mainWindow.webContents.on('will-navigate', (e) => {
        if (!e.url.startsWith('file://')) {
            e.preventDefault();
            console.warn(`[Main] Navigation blocked: ${e.url}`);
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

// App lifecycle

app.whenReady().then(async () => {
    session.defaultSession.clearCache()
    
    session.defaultSession.setUserAgent(SPOOFED_UA);
    
    const wvSession = getWebviewSession();
    wvSession.setUserAgent(SPOOFED_UA);
    
    setupWebSecurity();
    
    initJsBlocking(); 
    initCSP();
    
    createWindow();
});

app.on('window-all-closed', () => {
    stopTor();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    stopTor();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Before loading a new URL, reload with js disabled
function getWebviewSession() {
    return session.fromPartition('temp:webview');
}

function initJsBlocking() {
    const wvSession = getWebviewSession();

    wvSession.webRequest.onBeforeRequest(
        { urls: ['*://*/*'] },
        (details, callback) => {
            if (!jsEnabled && details.resourceType === 'script') {
                callback({ cancel: true });
            } else {
                callback({});
            }
        }
    );
}

function initCSP() {
    const wvSession = getWebviewSession();
    wvSession.webRequest.onHeadersReceived(
        { urls: ['*://*/*'] },
        (details, callback) => {
            if (!jsEnabled) {
                callback({
                    responseHeaders: {
                        ...details.responseHeaders,
                        'Content-Security-Policy': [
                            "script-src 'none'; script-src-elem 'none'; script-src-attr 'none'"
                        ],
                    }
                });
            } else {
                callback({ responseHeaders: details.responseHeaders });
            }
        }
    );
}

// Render URL via Puppeteer + Tor 
ipcMain.handle('render-url', async (_event, rawUrl, vT) => {
    
    session.defaultSession.clearCache()
    
    const url = sanitizeUrl(rawUrl);
    let view = vT;
    let screenshotBuffer = null;

    if (!url) {
        return {
            ok: false,
            error: 'Invalid or unsafe URL.'
        };
    }

    if (torEnabled && !torReady) {
        return {
            ok: false,
            error: 'Tor is not connected. Please wait and try again.'
        };
    }

    if (torEnabled && (view === 'live' || view === 'js')) {
        if (!torReady) return { ok: false, error: 'Tor not ready yet.' };
        return { ok: true, live: true, url: url, links: [], title: '', renderMs: 0 };
    }
    
    let browser = null;

    const defaultArgs = [
    
        // see:
        // https://peter.sh/experiments/chromium-command-line-switches/

        '--disable-webrtc', // Blocks IP leaks (MANDATORY for Tor)
        '--disable-features=WebRtcHideLocalIpsWithMdns', // Extra WebRTC protection
        '--disable-features=WebRtcAllowInputVolumeAdjustment', // Extra hardening
        '--disable-webgl', // Prevents GPU fingerprinting
        '--disable-geolocation',
        '--disable-voice-input',
        '--disable-notifications',
        '--disable-infobars',
        '--disable-breakpad', // Disables crash reporting
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
        '--disable-3d-apis',
        '--disable-file-system',
        '--disable-local-storage',
        '--disable-shared-workers',
        '--disable-speech-api',
        '--disable-remote-fonts',           // font fingerprinting
        '--no-pings',                       // hyperlink auditing

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

        // Specific Optimizations
        '--lang=en-US', // Avoids locale leaks
        '--window-size=1920,1080', // Standardized viewport
        '--disk-cache-size=0', // Disables disk cache
        '--media-cache-size=0', // Disables media cache
        '--incognito', // Avoids local storage
        '--safebrowsing-disable-auto-update', // Disables Google Safe Browsing
    ];

    // Only route through Tor if enabled
    if (torEnabled) {
        defaultArgs.push(
            `--proxy-server=socks5://127.0.0.1:9050`,
            '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1',
        );
    }

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: defaultArgs,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                webSecurity: true,
                webviewTag: true,
                allowRunningInsecureContent: false, 
                disableCache: true,
            },
        });

        const page = await browser.newPage();

        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 2
        });
        await page.setUserAgent(SPOOFED_UA);

        if (view == "image" || view == "js") {
            await page.setJavaScriptEnabled(true);
        } else {
            await page.setJavaScriptEnabled(false);
        }

        await page.setRequestInterception(true);

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });

        if (view == "image") {
            await page.addStyleTag({
                content: `
            [class*="modal"], [id*="modal"],
            [class*="dialog"], [id*="dialog"],
            [class*="overlay"], [id*="overlay"],
            [class*="cookie"], [id*="cookie"],
            [class*="consent"], [class*="gdpr"],
            [class*="privacy"], [class*="popup"], [class*="modal"],
            [class*="overlay"], [class*="banner"],
            [id*="consent"], [id*="gdpr"], [id*="privacy"],
            #onetrust-consent-sdk, .cc-window, .cookielaw-banner,
            .cookie-notice, .cookie-popup, .gdpr-popup {
              display: none !important;
            }
          `,
            });
        }

        page.on('request', (req) => {
            const type = req.resourceType();
            const blocked = ['script', 'xhr', 'fetch', 'websocket', 'media', 'eventsource', 'other'];
            if (blocked.includes(type)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        const t0 = Date.now();

        // Cookie pre-flight
        const originalHost = new URL(url).hostname;
        const baseDomain = originalHost.split('.').slice(-2).join('.');
        const cookiePage = await browser.newPage();

        try {
            await cookiePage.setUserAgent(SPOOFED_UA);
            await cookiePage.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
            });

            if (view == "image") {
                await cookiePage.setJavaScriptEnabled(false);
            }

            if (view == "js") {
                await cookiePage.setJavaScriptEnabled(true);
            }
            
            await cookiePage.setRequestInterception(true);
            cookiePage.on('request', (req) => {
                if (req.resourceType() === 'document') {
                    req.continue();
                } else {
                    req.abort();
                }
            });
            try {
                await cookiePage.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 15000,
                });
            } catch (_) {}
            const safeCookies = (await cookiePage.cookies()).filter((c) => {
                const cookieDomain = c.domain.replaceAll(/^\./gim, '');
                return cookieDomain === baseDomain || cookieDomain.endsWith('.' + baseDomain);
            });
            if (safeCookies.length > 0) {
                await page.setCookie(...safeCookies);
            }
        } finally {
            await cookiePage.close();
        }

        const response = await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000, // Tor is slower, give it more time
        });

        const renderMs = Date.now() - t0;

        /*
        // TODO: read user preference/setting to restrict mime. Idea:
        const contentType = response.headers()['content-type'] || '';
        if (!contentType.includes('text/html')) {
          await browser.close();
          return { ok: false, error: 'Not an HTML page: ' + escHtml(contentType) };
        }
        */

        // In case of overflow...
        // small risk, but might be possible if size > 15MB.
        const pageLen = await page.evaluate(() => {
            return document.documentElement.outerHTML.length;
        });

        if (pageLen >= 1) {
            let dlenMB = pageLen / (1024 * 1024);
            if (dlenMB > 15) {
                await browser.close();
                return {
                    ok: false,
                    error: 'Page-size larger than 15MB!'
                };
            }
        }

        if (view == "image") {
            screenshotBuffer = await page.screenshot({
                type: 'png',
                fullPage: true,
                encoding: 'base64',
            });
        }

        const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a[href]')).slice(0, 500);
            return anchors.map((a) => {
                const href = a.href;
                const label = (a.innerText || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim();
                return {
                    href,
                    label
                };
            });
        });

        const seenHrefs = new Set();
        const cleanLinks = [];

        for (const link of links) {
            if (!link.href || seenHrefs.has(link.href)) continue;

            const safeHref = sanitizeUrl(link.href);
            if (!safeHref) continue;

            seenHrefs.add(safeHref);

            let type = 'internal';
            try {
                const linkUrl = new URL(safeHref);
                const pageUrl = new URL(url);
                if (safeHref.startsWith('mailto:')) {
                    continue;
                } else if (safeHref.startsWith('#') || (linkUrl.pathname === pageUrl.pathname && linkUrl.hash)) {
                    type = 'anchor';
                } else if (linkUrl.hostname !== pageUrl.hostname) {
                    type = 'external';
                } else {
                    type = 'internal';
                }
                const ext = linkUrl.pathname.split('.').pop().toLowerCase();
                if (['pdf', 'zip', 'tar', 'gz', 'exe', 'dmg', 'pkg', 'docx', 'xlsx'].includes(ext)) {
                    type = 'download';
                }
            } catch (e) {
                continue;
            }

            cleanLinks.push({
                href: safeHref,
                label: (escHtml(link.label) || safeHref).slice(0, 120),
                type,
            });
        }

        const pageTitle = await page.title();

        if (view == "live" || view == "js") {

            return {
                ok: true,
                live: true,
                links: cleanLinks,
                title: escHtml(pageTitle),
                url: escHtml(page.url()),
                renderMs,
            };

        } else if (view == "image") {

            return {
                ok: true,
                imageBase64: screenshotBuffer,
                links: cleanLinks,
                title: escHtml(pageTitle),
                url: escHtml(page.url()),
                renderMs,
            };
        }

    } catch (err) {
        return {
            ok: false,
            error: err.message
        };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (_) {}
        }
    }
});

ipcMain.handle('open-external', async (_event, rawUrl) => {
    const url = sanitizeUrl(rawUrl);
    if (!url) return;
    try {
        await shell.openExternal(url);
    } catch (_) {}
});

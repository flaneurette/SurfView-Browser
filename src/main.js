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
    net,
    webContents
} = require('electron');

const path = require('path');
const puppeteer = require('puppeteer');
const {spawn} = require('child_process');
const fs = require('fs');
const spoof = require('./spoof.js');
const strictjs = require('./strict.js');
const webrtc = require('./webrtc.js');

app.commandLine.appendSwitch('enable-experimental-web-platform-features');

// Tor toggle state
let torEnabled = false; // default: off
let torPort = '9050';
let torAddress = 'socks5://127.0.0.1';

// Webview javascript
let jsEnabled = false; // default: off
// Dev debugging
let devdebug = false;
    
// Spoofed UA
// We set fake chrome, but actually run a nightly build.
// Remember to update: spoof.js!
const SPOOFED_UA = spoof.userAgent;

let torPath = path.join(process.resourcesPath, 'tor/tor.exe');
let torDataDir = path.join(process.resourcesPath, 'tor/tor-data');
let geoipPath = path.join(process.resourcesPath, 'tor/geoip');
let geoip6Path = path.join(process.resourcesPath, 'tor/geoip6');

// development
/*
let devdebug = true;
let torPath = path.join(process.resourcesPath, '../../../../src/tor/tor.exe');
let torDataDir = path.join(process.resourcesPath, '../../../../src/tor/tor-data');
let geoipPath = path.join(process.resourcesPath, '../../../../src/tor/geoip');
let geoip6Path = path.join(process.resourcesPath, '../../../../src/tor/geoip6');
*/

// Tor process management
let torProcess = null;
let torReady = false;

// Main window
let mainWindow = null;

// Arrays

let largeUriList = [];

// Arguments
let torArgs = [
    '--SocksPort', torPort,
    '--DataDirectory', torDataDir,
    '--GeoIPFile', geoipPath,
    '--GeoIPv6File', geoip6Path,
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
    '--proxy-server='+torAddress +':'+torPort ,
    '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1',
    // WebRTC protection
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--enforce-webrtc-ip-permission-check',
    '--disable-webrtc',
    '--disable-features=WebRtc,WebRtcHideLocalIpsWithMdns,RTCUseNetworkInformation,WebRtcAllowInputVolumeAdjustment'
];

let defaultArgs = [

    // https://peter.sh/experiments/chromium-command-line-switches/
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
    '--lang='+spoof.locale, // Avoids locale leaks
    '--languages='+spoof.languages, // Avoids locale leaks
    '--window-size='+spoof.width+','+spoof.height, // Standardized viewport
    '--disk-cache-size=0', // Disables disk cache
    '--media-cache-size=0', // Disables media cache
    '--incognito', // Avoids local storage
    '--safebrowsing-disable-auto-update', // Disables Google Safe Browsing
];
    
ipcMain.handle('toggle-tor', async (_event, enabled) => {
    
    torEnabled = enabled;
    const wvSession = getWebviewSession();
    
    if (torEnabled) {
        try {
            await proxyManagement();
            await startTor();
            return { ok: true, torEnabled: true };
        } catch (err) {
            return { ok: false, error: err.message, torEnabled: false };
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
        let url = sanitizeUrl(url);
        const data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
        if (!Array.isArray(data.url)) data.url = [];
        if (data.url.length >= 50) return { success: false, reason: 'limit' };
        if (data.url.includes(url)) return { success: false, reason: 'duplicate' };
        data.url.push(url);
        fs.writeFileSync(getBookmarksPath(), JSON.stringify(data, null, 2));
        return { success: true };
    } catch (e) {
        return { success: false, reason: 'error' };
    }
});


ipcMain.handle('remove-bookmark', async (_event, url) => {
    try {
        let url = sanitizeUrl(url);
        const data = JSON.parse(fs.readFileSync(getBookmarksPath(), 'utf8'));
        if (!Array.isArray(data.url)) return false;
        data.url = data.url.filter((u) => u !== url);
        fs.writeFileSync(getBookmarksPath(), JSON.stringify(data, null, 2));
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

// Render URL via Puppeteer + Tor 
ipcMain.handle('render-url', async (_event, rawUrl, vT) => {
 
    let eventLog = [];
    let scanned = {};
                
    eventLog.push('Starting browser.');

    const filter = {
        urls: [
          "stun:*",
          "turn:*",
          "turns:*",
          "*://*/*stun*"
        ]
    };

    session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        callback({ cancel: true });
    });

    const customSession = session.fromPartition('temp:webview');

    customSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        callback({ cancel: true });
    });
    
    session.defaultSession.clearCache();
    
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
    }
    
    
    let browser = null;
    let chromeArgs = [];
    
    chromeArgs.push(...defaultArgs)
    
    if (torEnabled) {
        chromeArgs.push(...torChromeArgs);
    }
    
    eventLog.push('Browser init.');

    try {
        
        eventLog.push('Starting webrtc checks.');
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: chromeArgs
        });

        // Recon request.
        const originalHost = new URL(url).hostname;
        const baseDomain = originalHost.split('.').slice(-2).join('.');
        const reconPage = await browser.newPage();

        try {
            await reconPage.setUserAgent(SPOOFED_UA);
            await reconPage.setExtraHTTPHeaders({
            'Accept-Language': spoof.accept,
            });

            await reconPage.setJavaScriptEnabled(false);
            
            await reconPage.setRequestInterception(true);
            reconPage.on('request', (req) => {
                if (req.resourceType() === 'document') {
                    req.continue();
                } else {
                    req.abort();
                }
            });

            try {
                await reconPage.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 15000,
                });
            } catch (_) {}
            
            // Get server cookies.
            const safeCookies = (await reconPage.cookies()).filter((c) => {
                const cookieDomain = c.domain.replaceAll(/^\./gim, '');
                return cookieDomain === baseDomain || cookieDomain.endsWith('.' + baseDomain);
            });
            
            if (safeCookies.length > 0) {
                await reconPage.setCookie(...safeCookies);
            }
            
            // Try to detect WebRTC, or unsafe JavaScript.
            const source = await reconPage.evaluate(() => {
               
               const html = document.documentElement?.outerHTML ?? '';
            
                if(!html) {
                    return {
                        ok: false,
                        error: 'Could not load page, it is faulty, DNS lookup failed or could not be found...'
                    };   
                }
                
                const rawPage = html;
                
                const pageLen = rawPage.length;

                if (pageLen >= 1) {
                    let dlenMB = pageLen / (1024 * 1024);
                    if (dlenMB > 15) {
                        return {
                            ok: false,
                            error: 'Could not load page, page was larger than 15MB.'
                        };
                    }
                }

                return { ok: true, html: rawPage };
            });

            if (!source.ok) return source;

            const rawPage = source.html;

            let basedomain = new URL(reconPage.url()).hostname;
            const domainExists = largeUriList.some(entry => entry.domain === basedomain);

            if (!domainExists) {
                
                // Do source code scan.
                scanned = await WebRTCscan(reconPage,rawPage);
                
                if(scanned.pages) { 
                
                    let visitedDomain = {
                        domain: basedomain,
                        requestedFiles: [...scanned.pages]
                    };
                    
                    largeUriList.push(visitedDomain);
                }
            } else {
                scanned.ok = true;
            }
            
        } finally {
            await reconPage.close();
        }
        
        if(scanned.ok == false) { 
            return {
                ok: false,
                error: scanned.error
            };
        }
                
        // Mimic user page refreshing.
        function delay(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }

        async function runWithDelay() {
          const randomDelay = Math.random() * 2500;
          await delay(randomDelay);
        }

        runWithDelay();

        eventLog.push('Live page request made.');
        
        // Final request.
        const page = await browser.newPage();
        await page.setUserAgent(SPOOFED_UA);
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 2
        });

        if (view == "image" || view == "js") {
            await page.setJavaScriptEnabled(true);
        } else {
            await page.setJavaScriptEnabled(false);
        }

        await page.setRequestInterception(true);

        await page.setExtraHTTPHeaders({
        'Accept-Language': spoof.accept,
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

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
        });
                
        const t0 = Date.now();
        const renderMs = Date.now() - t0;

        // In case of overflow...
        // small risk, but might be possible if size > 15MB.
        const pageLen = await page.evaluate(() => {
            const html = document.documentElement?.outerHTML ?? '';
            if (!html) return;
            if(html) {
                return document.documentElement.outerHTML.length;
            }
        });

        if (pageLen >= 1) {
            let dlenMB = pageLen / (1024 * 1024);
            if (dlenMB > 15) {
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

// Functions.

async function proxyManagement() {

    await session.defaultSession.setProxy({
        proxyRules: torEnabled && torReady 
            ? torAddress+':'+torPort 
            : 'direct://'
    }); 

    const webviewSession = session.fromPartition('temp:webview');
    const wvSession = getWebviewSession();
    
    webviewSession.setProxy({
        proxyRules: torEnabled && torReady 
            ? torAddress+':'+torPort 
            : 'direct://'
    });   

    wvSession.setProxy({
        proxyRules: torEnabled && torReady 
            ? torAddress+':'+torPort 
            : 'direct://'
    });
}

async function WebRTCscan(reconPage,rawPage) {
    
    // returns array of scanned links.
    
    let scan = webrtc.detectWebRTC(rawPage,false);

    if (scan === 10) {
        return {
            ok: false,
            error: 'Permanent error: pattern array in webrtc.js corrupted!'
        };
    }
    
    if (scan === 1) {
        return {
            ok: false,
            error: 'Could not load page, possible unmasking attempt blocked.'
        };
    }

    // Fetch and scan externals in Node.js since JS is disabled
    // We scan everything with a src, as even images can hold js.
    const urlMatches = [
      ...rawPage.matchAll(/(?:src|href|data-url)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gim),
      ...rawPage.matchAll(/["']\s*https?:\s*\/\/[^"'\s]+/gim),
      ...rawPage.matchAll(/["']\s*\/\/[^"'\s]+/gim)
    ];
    
    let base = escHtml(reconPage.url());
    const urls = urlMatches
      .flatMap(match => {
    const validUrls = [];
    for (let i = 1; i <= 3; i++) {
      if (match[i]) {
        const url = nodeJSurl(base, match[i]);
        if (url) validUrls.push(url);
      }
    }
    return validUrls;
      })
      .filter(Boolean);
    
    const uniqueUris = [...new Set(urls)];
    
    // Extra sanitization round.
    for (let i = 0; i < uniqueUris.length; i++) {
        uniqueUris[i] = nodeJSurl(base, uniqueUris[i]);
        if (!largeUriList.includes(uniqueUris[i])) {
            largeUriList.push(uniqueUris[i]);
        }
    }

    if(devdebug) console.log(uniqueUris);
    
    let extScan = 0;
    
    await proxyManagement();
    
    for (const scriptUrl of uniqueUris) {
        try {
            // Direct Nodescan.
            const res = await net.fetch(scriptUrl, {
              headers: {
                'DNT': '1',
                'User-Agent': SPOOFED_UA,
                'Accept-Language': spoof.locale,
                'Referer': escHtml(reconPage.url()),
              },
            });

            const code = await res.text();
            
            let scan = webrtc.detectWebRTC(code,scriptUrl);
        
            if (scan === 10) {
                return {
                    ok: false,
                    pages: uniqueUris,
                    error: 'Permanent error: pattern array in webrtc.js corrupted!'
                };
            }
            
            if (scan === 1) {
                extScan = 1;
                break;
            }
        
        } catch (_) { }
    }
    
    if (extScan === 1) {
        return {
            ok: false,
            pages: uniqueUris,
            error: 'Could not load page, possible unmasking attempt blocked in external scripts.'
        };
    }
    
    return {
        ok: true,
        pages: uniqueUris,
    };
}

function nodeJSurl(base, matched) {
    
    if (!matched) return null;
    
    base = new URL(base).hostname;
    
    if(
    matched === undefined
    || matched === null
    || matched === ''
    || matched === 'https://' 
    || matched === 'http://' 
    || matched === '//' 
    || matched === base
    )
    {
        return null;
    }
    
    if(matched.includes('#')) {
        return null;
    }

    if(matched.includes('data:image') || matched.includes('data:blob')) {
        return null;
    }
    
    if(matched.startsWith('/')) {
        matched = base + '***' + matched;
    }
    
    matched = matched.replaceAll('https://','');
    matched = matched.replaceAll('http://','');
    matched = matched.replace(/[,>;]\s*$/, '').trim();
    matched = matched.replace(/^(src\s*=\s*['"]?|['"])/i, '').trim();
    matched = matched.replace(/^(https?:)?\/\/+/i, '');
    matched = matched.replaceAll(/\/\/+/gi, '');
    matched = matched.replaceAll('***', '/');
    matched = matched.replace('//', '/');
    matched = 'https://' + matched.replace('//', '/');
    matched = matched.replace('///', '//');
    
    matched = matched.replaceAll('>','');
    matched = matched.replaceAll('<','');
    matched = matched.replaceAll('\'','');
    matched = matched.replaceAll(';','');
    matched = matched.replaceAll('`','');
    matched = matched.replaceAll('../','');

    // Edge cases
    if(matched.match(/\(('|"|`|\$|)[{|]*\s*[a-z0-9]*\s*[}|]*('|"|`|)\)/gi)) {
        return null;
    }

    if (
        // matched.match(/\(.*\)/g) ||           // any parentheses like foo()
        matched.match(/\$\{.*\}/g) ||         // template literals ${...}
        matched.match(/javascript:/gi) ||      // javascript: protocol
        matched.match(/\beval\b/gi) ||         // eval
        matched.match(/\.toString\(\)/gi) ||   // .toString()
        matched.match(/on\w+\s*=/gi)           // event handlers like onclick=
    ) {
        return null;
    }

    if(
    matched === undefined
    || matched === null
    || matched === ''
    || matched === 'https://' 
    || matched === 'http://' 
    || matched === '//' 
    || matched === 'https://src' 
    || matched === 'https://href' 
    || matched === base
    )
    {
        return null;
    }
    
    return matched;
}
            
function startTor() {

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

function injectPrivacyScript(contents) {
    return contents.executeJavaScript(`
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(navigator, 'mediaDevices', { get: () => {}});
        Object.defineProperty(navigator, 'permissions', { get: () => {}});
        Object.defineProperty(navigator, 'connection', { get: () => {}});
        Object.defineProperty(navigator, 'geolocation', { get: () => {}});
        Object.defineProperty(navigator, 'getBattery', { get: () => {}});
        Object.defineProperty(navigator, 'getUserMedia', { get: () => {}});
        Object.defineProperty(navigator, 'mediaDevices.getUserMedia', { get: () => {}});
        Object.defineProperty(window, 'RTCPeerConnection', { value: undefined });
        Object.defineProperty(window, 'webkitRTCPeerConnection', { value: undefined });
    `);
}

async function setupWebSecurity() {
    
    const webviewSession = session.fromPartition('temp:webview');

    await proxyManagement();

    webviewSession.clearCache();
    session.defaultSession.clearCache();

    const noCacheHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma':    'no-cache',
    'Expires':       '0'
    };

    [webviewSession, session.defaultSession].forEach(sess => {
        sess.webRequest.onBeforeSendHeaders((details, callback) => {
            Object.assign(details.requestHeaders, noCacheHeaders);
            details.requestHeaders['User-Agent'] = SPOOFED_UA;
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
            disableWebRTC:               true, // Disable WebRTC in Electron
            contextIsolation:            true,
            nodeIntegration:             false,
            sandbox:                     true,
            webSecurity:                 true,
            allowRunningInsecureContent: false,
            disableCache:                true,
            webviewTag:                  true,
            disableWebRTC:               true,
            disableBlinkFeatures:    'Autofill,ServiceWorker',
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

// App ON.

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

        injectPrivacyScript(contents);
});

app.on('web-contents-created', (event, contents) => {

 if (contents.getType() === 'webview') {
      
    contents.on('will-navigate', (e, url) => {
        console.log('Navigated:', url);
        e.preventDefault();
        // check here
    });

    contents.on('dom-ready', () => {
      try {
        contents.debugger.attach('1.3');
      } catch(e) {}
     
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

        injectPrivacyScript(contents); 
    });
  }

    injectPrivacyScript(contents);
    
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
            console.warn(`[WebView] Invalid src`);
            event.preventDefault();
            return;
        }

        // Validate partition
        const allowedPartitions = ['temp:webview'];
        if (params.partition && !allowedPartitions.includes(params.partition)) {
            console.warn(`[WebView] Blocked partition`);
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
            safeDialogsMessage:    'Blocked',
            spellcheck:                  false,
            enableWebSQL:                false,
            webviewTag:                  true,
            plugins:                     false,
            disableCache:                true,
            disableWebRTC: true,
            enableBlinkFeatures:     '',
            disableBlinkFeatures:    'Autofill,ServiceWorker',
            images:                      true,
            navigateOnDragDrop:          false,
            autoplayPolicy:    'user-gesture-required',
        });
    });
});

// App lifecycle
app.whenReady().then(async () => {

    session.fromPartition('temp:webview').webRequest.onBeforeRequest((details, callback) => {
        const url = details.url;
        console.log('cancelled');
        callback({ cancel: true });
    })

    const filter = {
        urls: [
          "stun:*",
          "turn:*",
          "turns:*",
          "*://*/*stun*"
        ]
    };

    session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        callback({ cancel: true });
    });

    const customSession = session.fromPartition('temp:webview');

    customSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        callback({ cancel: true });
    });

    session.defaultSession.clearCache();
    session.defaultSession.setUserAgent(SPOOFED_UA);

    const wvSession = getWebviewSession();
    wvSession.setUserAgent(SPOOFED_UA);

    await setupWebSecurity();
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


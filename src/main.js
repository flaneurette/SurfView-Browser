// src/main.js
// Electron main process.
// All network access and rendering happens here.
// The renderer process only ever receives pixels and structured data.

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer');

// -- find the bundled Chromium that puppeteer ships with ---------------
function getChromePath() {
  // use puppeteer's own bundled Chromium - no system Chrome needed
  try {
    const puppeteer = require('puppeteer');
    const chromePath = puppeteer.executablePath();
    if (chromePath) return chromePath;
  } catch(e) {
    // fall through to env var or error
  }

  // allow override via env var as a fallback
  if (process.env.SURFVIEW_CHROME) {
    return process.env.SURFVIEW_CHROME;
  }

  throw new Error(
    'Could not find Chromium. Try running npm install, or set SURFVIEW_CHROME to your Chrome path.'
  );
}

// -- main window -------------------------------------------------------
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#0e0f11',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // prevent the shell window itself from navigating anywhere
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault());
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// -- renderer request: render a URL ------------------------------------
ipcMain.handle('render-url', async (_event, rawUrl) => {
  let url = rawUrl.trim();

  // ensure a scheme is present
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  // basic sanity check - reject non-http schemes
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return { ok: false, error: 'Invalid URL: ' + url };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Only http and https are supported.' };
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        // no persistent state
        '--incognito',
        '--disk-cache-size=0',
        '--media-cache-size=0',
		// note: --no-sandbox and --disable-setuid-sandbox are intentionally
		// omitted to keep Chromium's process sandbox fully active.
      ],
    });

    const page = await browser.newPage();

    // viewport width matches a standard desktop render
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    // spoof a real Chrome user agent so sites don't block headless requests
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    // block all javascript from executing
    await page.setJavaScriptEnabled(false);

    // block resource types we do not need for a screenshot
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      // allow: document, stylesheet, image, font
      // block: script, xhr, fetch, websocket, media, other
      const blocked = ['script', 'xhr', 'fetch', 'websocket', 'media', 'eventsource', 'other'];
      if (blocked.includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const t0 = Date.now();

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

    const renderMs = Date.now() - t0;

    // -- screenshot as base64 PNG
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: true,
      encoding: 'base64',
    });

    // -- extract links from the DOM before killing the page
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors.map((a) => {
        const href = a.href; // already resolved to absolute by the browser
        const label = (a.innerText || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim();
        return { href, label };
      });
    });

    // -- sanitize and classify links
    const seenHrefs = new Set();
    const cleanLinks = [];

    for (const link of links) {
      if (!link.href || seenHrefs.has(link.href)) continue;
      seenHrefs.add(link.href);

      let type = 'internal';
      try {
        const linkUrl = new URL(link.href);
        const pageUrl = new URL(url);
        if (link.href.startsWith('mailto:')) {
          type = 'mailto';
        } else if (link.href.startsWith('#') || (linkUrl.pathname === pageUrl.pathname && linkUrl.hash)) {
          type = 'anchor';
        } else if (linkUrl.hostname !== pageUrl.hostname) {
          type = 'external';
        } else {
          type = 'internal';
        }
        // detect common download extensions
        const ext = linkUrl.pathname.split('.').pop().toLowerCase();
        if (['pdf','zip','tar','gz','exe','dmg','pkg','docx','xlsx'].includes(ext)) {
          type = 'download';
        }
      } catch (e) {
        // malformed href, skip
        continue;
      }

      cleanLinks.push({
        href: link.href,
        label: link.label.slice(0, 120) || link.href.slice(0, 80),
        type,
      });
    }

    const pageTitle = await page.title();

    return {
      ok: true,
      imageBase64: screenshotBuffer,
      links: cleanLinks,
      title: pageTitle,
      url: page.url(), // final URL after any redirects
      renderMs,
    };

  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    // always kill the browser, even on error
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }
});

// -- renderer request: open a URL in the system browser ---------------
// used for "open in real browser" fallback
ipcMain.handle('open-external', async (_event, url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      await shell.openExternal(url);
    }
  } catch (_) {}
});
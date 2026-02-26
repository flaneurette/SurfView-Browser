// src/main.js
	// Electron main process.
	// All network access and rendering happens here.
	// The renderer process only ever receives pixels and structured data.

	const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
	const path = require('path');
	const puppeteer = require('puppeteer');

	// spoofed user agent 
	// process.versions.chrome is set by Electron and reflects the actual
	// bundled Chromium version. We build the UA once here and reuse it in
	// both the session (live webview) and Puppeteer (image mode) so the
	// app never leaks its identity via either code path.
	const SPOOFED_UA = [
	  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
	  'AppleWebKit/537.36 (KHTML, like Gecko)',
	  'Chrome/' + (process.versions.chrome || '124.0.0.0'),
	  'Safari/537.36',
	].join(' ');
	
	// sanitize a url, returns null if invalid or unsafe -----------------
	// mirrors the sanitizeUrl function in renderer.js
	// main.js must validate independently - never trust renderer input
	function sanitizeUrl(raw) {
	  let url = String(raw).trim();

	  // block dangerous schemes entirely
	  if (/^(javascript|data|vbscript|file|about|chrome|settings|mailto|blob):/i.test(url)) {
		return null;
	  }

	  // ensure http or https scheme
	  if (!/^https?:\/\//i.test(url)) {
		url = 'https://' + url;
	  }

	  // validate it parses as a real URL
	  try {
		const parsed = new URL(url);
		// only allow http and https through
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		  return null;
		}
		// strip null bytes and control characters after normalization
		var stripped = parsed.href.replaceAll(/[\x00-\x1F\x7F]/gi, '');
		var enc = ['%00', '%1F', '%0D', '%0A'];
		enc.forEach(function(code) { 
		  stripped = stripped.replaceAll(new RegExp(code, 'gi'), '');
		});

		return stripped;
	  } catch(e) {
		return null;
	  }
	}

	// main window -------------------------------------------------------
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

	app.whenReady().then(() => {
	  // override UA on the default session so every webview request uses
	  // the spoofed string instead of the Electron/surfview default
	  session.defaultSession.setUserAgent(SPOOFED_UA);
	  createWindow();
	});

	app.on('window-all-closed', () => {
	  if (process.platform !== 'darwin') app.quit();
	});

	app.on('activate', () => {
	  if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});

	// renderer request: render a URL ------------------------------------
	ipcMain.handle('render-url', async (_event, rawUrl) => {

	  // sanitize and validate in main process independently of renderer
	  const url = sanitizeUrl(rawUrl);
	  if (!url) {
		return { ok: false, error: 'Invalid or unsafe URL.' };
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

		// use the shared spoofed UA - same string used by the live webview session
		await page.setUserAgent(SPOOFED_UA);

		// block all javascript from executing
		await page.setJavaScriptEnabled(false);

		// block resource types we do not need for a screenshot
		await page.setRequestInterception(true);
		
		// Try hiding consent css, as it messes up the screenshot.
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
		  `
		});
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

		// --cookie handling: follow (redirect) chain and harvest cookies ----
		// for security, we only capture server-side set cookies, not javascript cookies! after capture, we empty the cookie jar.
		// we do this because many sites check server side cookies, for consent cookies, session cookies and check if it's a bot or not.
		// do a lightweight navigation to collect any consent/session cookies
		// the server sets before we do the real page load. only cookies that
		// belong to the original hostname or its parent domain are replayed -
		// anything set by third-party redirect destinations is discarded.
		const originalHost = new URL(url).hostname;
		const baseDomain = originalHost.split('.').slice(-2).join('.');
		const cookiePage = await browser.newPage();
		try {
		  await cookiePage.setUserAgent(SPOOFED_UA);
		  await cookiePage.setJavaScriptEnabled(false);
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
			  timeout: 5000,
			});
		  } catch (_) {
			// ignore navigation errors, we just want whatever cookies were set
		  }
		  const safeCookies = (await cookiePage.cookies()).filter(c => {
			const cookieDomain = c.domain.replaceAll(/^\./gi, '');
			return cookieDomain === baseDomain || cookieDomain.endsWith('.' + baseDomain);
		  });
		  if (safeCookies.length > 0) {
			await page.setCookie(...safeCookies);
		  }
		} finally {
		  await cookiePage.close();
		}
		// end cookie handling

		await page.goto(url, {
		  waitUntil: 'networkidle2',
		  timeout: 20000,
		});

		const renderMs = Date.now() - t0;

		// screenshot as base64 PNG
		const screenshotBuffer = await page.screenshot({
		  type: 'png',
		  fullPage: true,
		  encoding: 'base64',
		});

		// extract links from the DOM before closing the page
		const links = await page.evaluate(() => {
		  const anchors = Array.from(document.querySelectorAll('a[href]'));
		  return anchors.map((a) => {
			const href = a.href; // already resolved to absolute by the browser
			const label = (a.innerText || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim();
			return { href, label };
		  });
		});

		// sanitize and classify links
		const seenHrefs = new Set();
		const cleanLinks = [];

		for (const link of links) {
		  if (!link.href || seenHrefs.has(link.href)) continue;

		  // sanitize each link href
		  const safeHref = sanitizeUrl(link.href);
		  if (!safeHref) continue;

		  seenHrefs.add(safeHref);

		  let type = 'internal';
		  try {
			const linkUrl = new URL(safeHref);
			const pageUrl = new URL(url);
			if (safeHref.startsWith('mailto:')) {
				// not allowing, phishing risk.
			  continue;
			} else if (safeHref.startsWith('#') || (linkUrl.pathname === pageUrl.pathname && linkUrl.hash)) {
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
			href: safeHref,
			label: (link.label || safeHref).slice(0, 120),
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
		// always close the browser, even on error
		if (browser) {
		  try { await browser.close(); } catch (_) {}
		}
	  }
	});

	// renderer request: open a URL in the system browser ---------------
	// used for "open in real browser" fallback
	ipcMain.handle('open-external', async (_event, rawUrl) => {
	  const url = sanitizeUrl(rawUrl);
	  if (!url) return;
	  try {
		await shell.openExternal(url);
	  } catch (_) {}
	});
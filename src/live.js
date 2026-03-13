
// Render live
ipcMain.handle('render-live', async (_event, rawUrl) => {
    
  const url = sanitizeUrl(rawUrl);

  if (!url) {
    return { ok: false, error: 'Invalid or unsafe URL.' };
  }

  if (torEnabled && !torReady) {
    return { ok: false, error: 'Tor is not connected. Please wait and try again.' };
  }

  let browser = null;

    const defaultArgs = [
    
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
      '--lang=en-US,en;q=0.9', // Avoids locale leaks
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
    '--ignore-certificate-errors', // For Tor hidden services
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
          javascript: false,
          partition: 'persist:tor-session',
        },
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    await page.setUserAgent(SPOOFED_UA);
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

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
    
    if(pageLen >=1 ) {
        let dlenMB = pageLen / (1024 * 1024);
            if (dlenMB > 15) {
               await browser.close();
               return { ok: false, error: 'Page-size larger than 15MB!' };
            }
    }
    
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: true,
      encoding: 'base64',
    });

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]')).slice(0, 500);
      return anchors.map((a) => {
        const href = a.href;
        const label = (a.innerText || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim();
        return { href, label };
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

    return {
      ok: true,
      imageBase64: escHtml(screenshotBuffer),
      links: cleanLinks,
      title: escHtml(pageTitle),
      url: escHtml(page.url()),
      renderMs,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
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

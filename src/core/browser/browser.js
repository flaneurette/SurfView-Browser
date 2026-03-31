// #####################################################################
// BROWSER
// #####################################################################
 /* 
    try {
    
        if(devdebug) console.log('Live page request made!');
        
        var originalHost = new URL(url).hostname;
        var baseDomain = originalHost.split('.').slice(-2).join('.');

        let pageStatusError1 = false;
        let pageQuit1 = false;
        let reconErrors1 = null;
        let counts1 = 0;
        let pageRedirect1 = false;
        let redirectUrl1 = false;
        let pageStatus1 = '000';
        let origUrl1 = originalHost;
            
        const page = await browser.newPage();
        await page.setUserAgent(SPOOFED_UA);
        await page.setViewport({
            width: spoof.width,
            height: spoof.height,
            deviceScaleFactor: 2
        });

        if(view == "js") {
           await page.setJavaScriptEnabled(true);
           } else {
           await page.setJavaScriptEnabled(false); 
        }

        if (devdebug) console.log('Live page interception');

        await page.setRequestInterception(true);

        await page.setExtraHTTPHeaders({
            'Accept-Language': spoof.accept,
        });

        if (view !== "js") {
            page.on('request', (req) => {
                const type = req.resourceType();
                const blocked = ['script', 'xhr', 'fetch', 'websocket', 'media', 'eventsource', 'other'];
                if (blocked.includes(type)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
        }

        if (devdebug) console.log('Live page loading...');
                
        page.on('request', (req) => {
            if (req.resourceType() === 'document') {
                    req.continue();
                } else {
                    req.abort();
            }
        });
                
        page.on('response', (response) => {

            if(counts1 == 0) {

            counts1++;
            
            status = response.status();
            
                if (devdebug) console.log(escHtml(status));
            
                if ([301,302,303,307,308].includes(status)) { 
                    pageRedirect1 = true;
                    redirectUrl1 = escHtml(response.headers()['location']).replaceAll(',','').replaceAll('&amp;','&');
                }
            
                if (![200, 201, 204].includes(status)) {   
                    pageStatusError1 = getStatus(status,response.url(),response.headers()['location']);
                    pageQuit1 = true;   
                    pageStatus1 = escHtml(status);                
                }
            }      
                
        });
        
        if(devdebug) console.log('Going to url');
        
        //if(devdebug) page.on('console', msg => console.log('[PAGE]', msg.text()));
        
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000,
        });
 
        let pageResult = {
            ok: false,
            redirect: pageRedirect1,
            to: redirectUrl1,
            status: pageStatus1,
            original: origUrl1,
            error: 'Page load failed.\n\nPage might redirect or is giving errors. Try to reload, or follow redirect.',
        };
     
        if(pageQuit1) {
            return pageResult;
        } 
            
        if(devdebug) console.log('Live page loaded.');
        
        const t0 = Date.now();
        const renderMs = Date.now() - t0;

        // In case of overflow...
        // small risk, but might be possible if size > 15MB.
        const pageLen = await page.evaluate(() => {
            
            const html = document.documentElement?.outerHTML ?? '';
            if (!html)  {
                return {
                    ok: false,
                    status: 'ERR',
                    error: 'Document HTML could not be found.'
                };
            }
            if(html) {
                return document.documentElement.outerHTML.length;
            }
        });

        if (pageLen >= 1) {
            let dlenMB = pageLen / (1024 * 1024);
            if (dlenMB > 15) {
                return {
                    ok: false,
                    status: 'Page size error',
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

        if (browser) {
            try {
                await browser.close();
            } catch (_) {}
        }  
    
    } catch (err) {
        return {
            ok: false,
            status: 'undefined',
            error: err.message
        };
    }
    
*/
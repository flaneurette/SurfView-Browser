// #####################################################################
// RECON
// #####################################################################
    
    try {
        
        try {
            if (reconPage) {
                await reconPage.close();
            }
        } catch(e) {}

        console.log('Started webscanner...');
        
        // Recon request.
        var originalHost = new URL(url).hostname;
        var baseDomain = originalHost.split('.').slice(-2).join('.');
        let reconPage = await browser.newPage();
        
        reconPage.removeAllListeners('request');
        reconPage.removeAllListeners('response');

        let pageStatusError = false;
        let pageQuit = false;
        let reconErrors = null;
        let counts = 0;
        let reconURI = url;
        let pageRedirect = false;
        let redirectUrl = false;
        let pageStatus = '000';
        let origUrl = originalHost;
        
        try {
            
            await reconPage.setUserAgent(SPOOFED_UA);
            await reconPage.setExtraHTTPHeaders({
            'Accept-Language': spoof.accept,
            });

            await reconPage.setJavaScriptEnabled(false);
            await reconPage.setRequestInterception(true);
        
            //if(devdebug) page.on('console', msg => console.log('[PAGE]', msg.text()));
        
            reconPage.on('request', (req) => {
                if (req.resourceType() === 'document') {
                req.continue();
                } else {
                req.abort();
                }
            });

            reconPage.on('response', (response) => {

                if(counts == 0) {
                
                if (devdebug) console.log('Got response... counted:' + counts);
                if (devdebug) console.log('Status check.');
                
                counts++;
                
                status = response.status();

                if (devdebug) console.log(escHtml(status));
                
                if ([301,302,303,307,308].includes(status)) { 
                    pageRedirect = true;
                    redirectUrl = escHtml(response.headers()['location']).replaceAll(',','').replaceAll('&amp;','&');
                }
                
                if (![200, 201, 204].includes(status)) {   
                    pageStatusError = getStatus(status,response.url(),response.headers()['location']);
                    reconErrors = 'Status code: ' + escHtml(pageStatusError).replace(',','') + '\n\n' + escHtml(response.url()).replace(',','');
                    if (devdebug) console.log('Bad status:' + reconErrors);
                    pageQuit = true;   
                    pageStatus = escHtml(status);                    
                }
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
                    status: 'ERR',
                    to: false,
                    error: '\n\nCould not load page, it is faulty, DNS lookup failed or could not be found...\n\n'
                };   
                }
                
                const rawPage = html;
                
                const pageLen = rawPage.length;

                if (pageLen >= 1) {
                let dlenMB = pageLen / (1024 * 1024);
                if (dlenMB > 15) {
                    return {
                        ok: false,
                        status: 'Page error',
                        to: false,
                        error: '\n\nCould not load page, page was larger than 15MB.\n\n'
                    };
                }
                }

                return { ok: true, html: rawPage };
            });

            if (!source.ok) return source;

            const rawPage = source.html;

            let basedomain = reconURI; 
            const domainExists = largeUriList.some(entry => entry.domain === basedomain);

            if (!domainExists) {
                
                // Do source code scan.
                scanned = await WebRTCscan(reconPage,rawPage);
                
                if(devdebug) console.log('FULL detectWebRTC scan done!');
                
            } else {
                scanned.ok = true;
            }

        } catch(e) {
            
            console.log('Error:' + e);
        } 
        
        if(devdebug) console.log('Recon done!');

        let reconResult = {
            ok: false,
            redirect: pageRedirect,
            to: redirectUrl,
            status: pageStatus,
            reconresult: scanned.ok,
            original: origUrl,
            error: 'Recon failed.\n\nPage might redirect or is giving errors. Try to reload, or quit. What we know: \n\n' + reconErrors,
        };
            
        await reconPage.close();
        
        reconPage = null;
            
        if(pageQuit) {
            return reconResult;
        } 
        
        if(scanned.pages) { 
        
            let basedomain = reconURI;
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
                
        if(scanned.ok == false) { 
            return {
                ok: false,
                status: 'Scanner error',
                error: scanned.error
            };
        }

        let basedomainCheck = reconURI;
        let existingEntry = largeUriList.find(entry => entry.domain === basedomainCheck);

        if (existingEntry) {
            if (existingEntry.insecure) {
                return {
                ok: false,
                status: 'Cannot revisit',
                error: '\n\nCannot revisit, previous webscanner recon found insecure material.\n\n'
                };
            }
        }
        
        if (browser) {
            try {
                await browser.close();
            } catch (_) {}
        }  
    
    } catch(e) {}

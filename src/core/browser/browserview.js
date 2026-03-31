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
            if (reason !== 'target_closed' || reason !== 'target closed' ) { // Avoid infinite loop if the page is gone
                SurfBrowserView.webContents.debugger.attach('1.3');
            }
        } catch(e) {}
    });          
}

async function launchBrowser(url) {

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
                    errorMsg.innerHTML = \`${ErrorMessage(scannerresult.error.toString())}\`;
                    launchReload.className = 'launchReload hide';
                    launchReport.className = 'launchReport hide';
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
                errorMsg.textContent = '${err.errorMsgExplain}';
                launchReload.className = 'launchReload hide';
                launchReport.className = 'launchReport hide';
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
    SurfBrowserView.webContents.on('did-finish-load', async (event) => {
        
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
    const savePath = path.join(app.getPath('downloads'), item.getFilename());
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
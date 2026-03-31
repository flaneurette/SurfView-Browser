// #####################################################################
// IPC
// #####################################################################

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
    surfModalWindow.close();
    surfModalWindow = null;
  }
}

ipcMain.handle('show-window', (event, w,h,x=false,y=false,f) =>  {

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

ipcMain.handle('process-form', (event, type,value) =>  {
  if(type == 'bookmark-folder') {
    // create new bookmark folder.
  }
  closeModalWindow();
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
      callback(_event.target);
    }, true);
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

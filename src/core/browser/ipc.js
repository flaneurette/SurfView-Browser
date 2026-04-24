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
            data = {};
        }
        
        data[name] = value;
        
        fs.writeFileSync(sv, JSON.stringify(data));
        
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
                } catch(e) {}
                
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
        } catch(e) { if(devdebug) console.log(e); }
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

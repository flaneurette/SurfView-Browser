// #####################################################################
// APP ON EVENTS
// #####################################################################

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

process.on('unhandledRejection', () => {});

app.whenReady().then(async () => {});

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
        
});

protocol.registerSchemesAsPrivileged([
    { scheme: 'source-view', privileges: { supportFetchAPI: true, standard: true, secure: true } }
])

app.on('ready', () => {
    session.defaultSession.clearCache()
    session.defaultSession.clearStorageData()
})

app.on('will-attach-webview', (event, webPreferences, params) => {});
app.on('did-attach-webview', (event, contents) => {});
app.on('web-contents-created', (event, contents) => {});

app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    stopTor();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    globalShortcut.unregisterAll();
    stopTor();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopTor();
});

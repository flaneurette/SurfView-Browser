// #####################################################################
// WEBSECURITY
// #####################################################################

async function setupWebSecurity() {
    
    await proxyManagement();
    
    session.defaultSession.clearCache();

    const noCacheHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma':    'no-cache',
    'Expires':       '0'
    };

    [session.defaultSession].forEach(sess => {
        sess.webRequest.onBeforeSendHeaders((details, callback) => {
            Object.assign(details.requestHeaders, noCacheHeaders);
            details.requestHeaders['User-Agent'] = SPOOFED_UA;
            callback({ cancel: false, requestHeaders: details.requestHeaders });
        });
    });
}

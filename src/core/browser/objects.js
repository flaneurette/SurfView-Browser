// #####################################################################
// OBJECTS
// #####################################################################

// Webpreferences for a new user invoked webview window. 
// Must be very restricted. Be careful modifying things here.

const WEBVIEW_PREFERENCES = { 
    nodeIntegration:            false,
    nodeIntegrationInSubFrames:     false,
    nodeIntegrationInWorker:      false,
    sandbox:                true,
    contextIsolation:           true,
    webSecurity:              true,
    allowRunningInsecureContent:    false,
    experimentalFeatures:         false,
    disableDialogs:             true,
    safeDialogs:              true,
    safeDialogsMessage:         'Blocked',
    spellcheck:               false,
    enableWebSQL:             false,
    webviewTag:               true,
    plugins:                false,
    disableCache:             true,
    disableWebRTC:            true,
    enableBlinkFeatures:        '',
    disableBlinkFeatures:         'Autofill,ServiceWorker',
    images:                 true,
    navigateOnDragDrop:         false,
    autoplayPolicy:             'user-gesture-required',
};
// #####################################################################
// ARGUMENTS
// #####################################################################

let torArgs = [
    '--CircuitBuildTimeout', '10',
    '--LearnCircuitBuildTimeout', '0',
    '--NumEntryGuards', '8',
    '--KeepalivePeriod', '60',
    '--NewCircuitPeriod', '15',
    '--SocksTimeout', '15',
    '--DisableNetwork', '0', // Ensure network is enabled
    '--DormantCanceledByStartup', '1', // Prevent Tor from going dormant
    '--ClientOnly', '1', // Ensure Tor is in client mode
    '--NoExec', '1', // Prevent Tor from spawning child processes
];

let torChromeArgs = [
    '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1',
    // WebRTC protection
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--webrtc-ip-handling-policy=disable_non_proxied_udp',
    '--enforce-webrtc-ip-permission-check',
    '--disable-webrtc',
    '--disable-features=WebRtc,WebRtcHideLocalIpsWithMdns,RTCUseNetworkInformation,WebRtcAllowInputVolumeAdjustment'
];

let defaultArgs = [

    '--disable-webgl',
    '--disable-webgl2',      
    '--disable-3d-apis',
    '--disable-udp',
    '--disable-geolocation',
    '--disable-voice-input',
    '--disable-notifications',
    '--disable-infobars',
    '--disable-breakpad',
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
    '--disable-plugins',
    '--disable-java',
    '--disable-reading-from-canvas',    // canvas fingerprint
    '--disable-2d-canvas-clip-aa',
    '--disable-2d-canvas-image-chromium',
    '--disable-file-system',
    '--disable-local-storage',
    '--disable-shared-workers',
    '--disable-speech-api',
    '--disable-remote-fonts',         // font fingerprinting
    '--no-pings',                 // hyperlink auditing

    // Process isolation
    '--site-per-process',
    '--isolate-origins=*',

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
    '--disk-cache-size=0', // Disables disk cache
    '--media-cache-size=0', // Disables media cache
    '--incognito', // Avoids local storage
    '--safebrowsing-disable-auto-update', // Disables Google Safe Browsing
];

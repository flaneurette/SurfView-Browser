const { webFrame, contextBridge, ipcRenderer } = require('electron');

const privacy_script = `

    (function() {
    
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: HTMLCanvasElement.prototype.getContext,
        writable: false,
        configurable: false
    });
    
    ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection',
     'RTCSessionDescription', 'RTCIceCandidate', 'RTCDataChannel',
     'RTCDTMFSender', 'RTCRtpSender', 'RTCRtpReceiver', 'RTCRtpTransceiver',
     'RTCSctpTransport', 'RTCStatsReport', 'RTCCertificate',
     'RTCEncodedAudioFrame', 'RTCEncodedVideoFrame', 'RTCDtlsTransport',
     'RTCIceTransport'].forEach(key => {
        Object.defineProperty(window, key, {
            value: function() { return undefined; },
            writable: false,
            configurable: false
        });
    });

    // Block audio contexts
    ['OfflineAudioContext', 'AudioContext', 'webkitOfflineAudioContext'].forEach(key => {
        try {
            Object.defineProperty(window, key, { get: () => undefined });
        } catch(e) {}
    });

    Object.defineProperty(navigator, 'mediaDevices', {
        value: {
            getUserMedia: () => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')),
            enumerateDevices: () => Promise.resolve([]),
            getDisplayMedia: () => Promise.reject(new DOMException('Not allowed', 'NotAllowedError'))
        },
        writable: false,
        configurable: false
    });

    ['GPU', 'GPUAdapter', 'GPUDevice', 'GPUBuffer', 'GPUTexture',
     'GPUTextureView', 'GPUSampler', 'GPUBindGroup', 'GPUBindGroupLayout',
     'GPUPipelineLayout', 'GPUShaderModule', 'GPUComputePipeline',
     'GPURenderPipeline', 'GPUCommandEncoder', 'GPUComputePassEncoder',
     'GPURenderPassEncoder', 'GPUCommandBuffer', 'GPUQueue',
     'GPURenderBundle', 'GPURenderBundleEncoder', 'GPUQuerySet',
     'GPUCanvasContext', 'GPUExternalTexture', 'GPUAdapterInfo',
     'GPUSupportedFeatures', 'GPUSupportedLimits', 'GPUDeviceLostInfo',
     'GPUError', 'GPUValidationError', 'GPUOutOfMemoryError',
     'GPUInternalError', 'GPUPipelineError', 'GPUUncapturedErrorEvent'
    ].forEach(key => {
        Object.defineProperty(window, key, {
            value: function() { return false; },
            writable: false,
            configurable: false
        });
    });

    Object.defineProperty(navigator, 'gpu', {
        value: {
            requestAdapter: () => Promise.resolve(null),
            getPreferredCanvasFormat: () => null
        },
        writable: false,
        configurable: false
    });

    [
        ['hardwareConcurrency', 4],
        ['deviceMemory', 8],
        ['plugins', []],
        ['mimeTypes', []],
        ['permissions', { query: () => Promise.reject('Not allowed') }],
        ['geolocation', { getCurrentPosition: () => {}, watchPosition: () => {} }],
        ['connection', undefined],
        ['getUserMedia', undefined],
        ['webkitGetUserMedia', undefined],
        ['requestMIDIAccess', undefined],
        ['requestMediaKeySystemAccess', undefined],
        ['getInstalledRelatedApps', undefined],
        ['registerProtocolHandler', () => {}],
        ['adAuctionComponents', undefined],
        ['runAdAuction', undefined],
        ['canLoadAdAuctionFencedFrame', undefined],
        ['joinAdInterestGroup', undefined],
        ['leaveAdInterestGroup', undefined],
        ['updateAdInterestGroups', undefined],
        ['clearOriginJoinedAdInterestGroups', undefined],
        ['createAuctionNonce', undefined],
        ['getInterestGroupAdAuctionData', undefined],
        ['deprecatedReplaceInURN', undefined],
        ['deprecatedURNToURL', undefined],
        ['sendBeacon', false],
        ['createHandwritingRecognizer', undefined],
        ['queryHandwritingRecognizer', undefined],
        ['setAppBadge', undefined],
        ['clearAppBadge', undefined]
    ].forEach(([key, value]) => {
        try {
            Object.defineProperty(navigator, key, {
                get: () => value,
                configurable: true
            });
        } catch(e) {}
    });

    // Block additional navigator properties
    [
        'PluginArray', 'MimeTypeArray', 'NetworkInformation', 'Scheduling',
        'UserActivation', 'Geolocation', 'DeprecatedStorageQuota',
        'ModelContextTesting', 'WindowControlsOverlay', 'PreferenceManager',
        'ModelContext', 'ProtectedAudience', 'Bluetooth', 'Clipboard',
        'CredentialsContainer', 'Keyboard', 'NavigatorManagedData',
        'ServiceWorkerContainer', 'VirtualKeyboard', 'WakeLock',
        'NavigatorUAData', 'LockManager', 'StorageManager', 'GPU',
        'NavigatorLogin', 'Ink', 'MediaCapabilities', 'DevicePosture',
        'HID', 'MediaSession', 'Permissions', 'Presentation', 'Serial',
        'USB', 'XRSystem', 'StorageBucketManager'
    ].forEach(key => {
        try {
            Object.defineProperty(navigator, key, { get: () => undefined });
        } catch(e) {}
    });
    
    navigator.getGamepads = () => [];
   
    [
        ['indexedDB', undefined],
        ['localStorage', undefined],
        ['sessionStorage', undefined],
        ['WebAssembly', undefined],
        ['Blob', undefined],
        ['WebGLRenderingContext', undefined],
        ['getComputedStyle', undefined],
        ['postMessage', undefined],
        ['atob', window.atob],
        ['btoa', window.btoa]
    ].forEach(([key, value]) => {
        try {
            Object.defineProperty(window, key, {
                get: () => value,
                configurable: true
            });
        } catch(e) {}
    });

    // Performance override
    try {
        Object.defineProperty(window, 'performance', {
            get: () => ({
                memory: {
                    usedJSHeapSize: 0,
                    totalJSHeapSize: 0,
                    jsHeapSizeLimit: 0
                }
            })
        });
    } catch(e) {}

    // Document overrides
    try {
        Object.defineProperty(document, 'fonts', { get: () => [] });
    } catch(e) {}

    // Override getClientRects
    Element.getClientRects = function() { return false; }
    Element.getBoundingClientRect = function() { return false; }

    // Various
    Object.defineProperty(navigator, 'doNotTrack', { value: null });
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined });
    Object.defineProperty(window, 'speechSynthesis', { value: undefined });
    window.SpeechSynthesisUtterance = undefined;

    })();
`;

webFrame.executeJavaScript(privacy_script);

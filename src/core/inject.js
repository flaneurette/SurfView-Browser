const { contextBridge, webFrame, ipcRenderer} = require('electron');

const privacy_script = `
    (function() {

    Object.defineProperty(navigator, 'gpu', { get: () => "not supported" });

    [
        ['hardwareConcurrency', 4],
        ['deviceMemory', 8],
        ['plugins', []],
        ['mimeTypes', []],
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
        } catch(e) {
            Object.defineProperty(navigator, key, { get: () => "not supported" });
             }
    });

        try {
            Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
                value: HTMLCanvasElement.prototype.getContext,
                writable: false,
                configurable: false
            });
        } catch(e) {  }
        
        ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection',
         'RTCSessionDescription', 'RTCIceCandidate', 'RTCDataChannel',
         'RTCDTMFSender', 'RTCRtpSender', 'RTCRtpReceiver', 'RTCRtpTransceiver',
         'RTCSctpTransport', 'RTCStatsReport', 'RTCCertificate',
         'RTCEncodedAudioFrame', 'RTCEncodedVideoFrame', 'RTCDtlsTransport',
         'RTCIceTransport'].forEach(key => {
            try {
                Object.defineProperty(window, key, {
                    value: function() { return undefined; },
                    writable: false,
                    configurable: false
                });
            } catch(e) {  }
        });

        ['OfflineAudioContext', 'AudioContext', 'webkitOfflineAudioContext'].forEach(key => {
            try {
                Object.defineProperty(window, key, { get: () => undefined });
            } catch(e) {  }
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
            try {
                    Object.defineProperty(window, key, {
                        value: function() { return false; },
                        writable: false,
                        configurable: false
                    });
                } catch(e) {
                Object.defineProperty(navigator, key, { value: "not supported" });
                
            }
        });
       
        
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
                Object.defineProperty(navigator, key, { value: "not supported" });
                } catch(e) { 
                Object.defineProperty(navigator, key, { get: () => undefined });
                 
            }
            
        });
       
        [
            ['indexedDB', undefined],
            //['localStorage', undefined],
            //['sessionStorage', undefined],
            ['WebAssembly', undefined],
            //['Blob', undefined],
            ['WebGLRenderingContext', undefined],
            //['getComputedStyle', undefined],
            ['postMessage', undefined],
            ['atob', window.atob],
            ['btoa', window.btoa]
            
        ].forEach(([key, value]) => {
            
            try {
                Object.defineProperty(window, key, {
                    get: () => value,
                    configurable: true
                });
            } catch(e) {    }
            
        });

        /*
        try {
            Object.defineProperty(window, 'performance', {
                get: () => ({
                    memory: {
                        usedJSHeapSize: Math.floor(Math.random() * 60),
                        totalJSHeapSize: Math.floor(Math.random() * 60),
                        jsHeapSizeLimit: Math.floor(Math.random() * 60)
                    }
                })
            });
            
        } catch(e) {  }
        */
        
   })();
`;

webFrame.executeJavaScript(privacy_script);

webFrame.executeJavaScript(`
(function() {

    try { 
    
        Object.defineProperty(window, 'OfflineAudioContext', { value: false, configurable: true  });
        Object.defineProperty(window, 'webkitOfflineAudioContext', { value: false, configurable: true  });
        Object.defineProperty(navigator, 'connection', { value: false, configurable: true });
        Object.defineProperty(navigator, 'mozConnection', { value: false, configurable: true });
        Object.defineProperty(navigator, 'webkitConnection', { value: false, configurable: true });
        Object.defineProperty(navigator, 'permissions', { value: false, configurable: true  });
        Object.defineProperty(navigator, 'battery', { value: false, configurable: true  });
        Object.defineProperty(navigator, 'plugins', { value: false, configurable: true  });
        
        const desktopResolutions = [
          { width: 1024, height: 768 },
          { width: 1280, height: 720 },
          { width: 1280, height: 800 },
          { width: 1366, height: 768 },
          { width: 1440, height: 900 },
          { width: 1600, height: 900 },
          { width: 1920, height: 1080 },
          { width: 2560, height: 1440 },
          { width: 3840, height: 2160 },
          { width: 5120, height: 2880 },
        ];
        
        let cores = [4,8,12,16];
        let digits = [4,8,16,32];
        
        let resolute = desktopResolutions[Math.floor(Math.random() * desktopResolutions.length)];
        
        try { 
            Object.defineProperty(window.screen, 'width', { value: resolute.width, configurable: true });
            Object.defineProperty(window.screen, 'height', { value: resolute.height, configurable: true });
            Object.defineProperty(window.screen, 'availWidth', { value: resolute.width, configurable: true });
            Object.defineProperty(window.screen, 'availHeight', { value: resolute.height, configurable: true });
            Object.defineProperty(navigator, 'hardwareConcurrency', { value: cores[Math.floor(Math.random() * cores.length)], configurable: true });
            Object.defineProperty(navigator, 'deviceMemory', { value: digits[Math.floor(Math.random() * digits.length)], configurable: true });
            Object.defineProperty(navigator, 'mediaDevices', { value: "not supported" });
            Object.defineProperty(navigator, 'misc', { value: "not supported" });
            Object.defineProperty(navigator, 'getGamepads', { value: "not supported" });
            Object.defineProperty(navigator, 'adapters', { value: "not supported" });
        } catch(e) {
            
        }
        navigator.getGamepads = () => [];
        Element.getClientRects = function() { return false; }
        Element.getBoundingClientRect = function() { return false; }
        Object.defineProperty(navigator, 'doNotTrack', { value: null });
        Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined });
        Object.defineProperty(window, 'speechSynthesis', { value: undefined });
        window.SpeechSynthesisUtterance = undefined;
            
    } catch(e) {
        
    }
    
})();

`);

webFrame.executeJavaScript(`
(function() {

            try {
            
            Object.defineProperty(document, 'fonts', { get: () => [] });
            Object.defineProperty(document.fonts, 'ready', {
              get: function() {
                return undefined;
              },
              configurable: true
            });

            } catch(e) {  }

            try {
                
            const originalLoad = document.fonts.load;
            document.fonts.load = function() {
              return undefined;
            };
            
            } catch(e) {  }

            try {
                
            ['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight'].forEach(prop => {
              let proto = HTMLElement.prototype;
              let descriptor;

              while (proto && !descriptor) {
                descriptor = Object.getOwnPropertyDescriptor(proto, prop);
                proto = Object.getPrototypeOf(proto);
              }
              
              const originalGet = descriptor.get;

              Object.defineProperty(HTMLElement.prototype, prop, {
                get: function() {
                  const realValue = originalGet.call(this);

                  if (
                    this.textContent.trim() !== '' ||
                    this.tagName === 'SPAN' ||
                    this.tagName === 'DIV' ||
                    this.tagName === 'P' ||
                    this.tagName === 'A'
                  ) {

                    const noise = Math.floor(realValue * 0.1 * (Math.random() * 2 - 1));
                    return Math.max(1, realValue + noise); // Ensure value is at least 1
                  }

                  return realValue;
                },
                configurable: true // Allow redefinition later
              });
            });
            
            } catch(e) {  }
         
            try {
                
                CanvasRenderingContext2D.prototype.measureText = function(text) {
                  return { width: Math.floor(Math.random() * 100) + 50 };
                };
                
                const OriginalFontFace = FontFace;
                window.FontFace = function(family, source, descriptors) {
                  return new OriginalFontFace('Arial', '', {});
                };
            
            } catch(e) {  }
            
            try {
                
                ['scrollWidth', 'scrollHeight'].forEach(prop => {
                  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
                  if (!original) return;

                  Object.defineProperty(HTMLElement.prototype, prop, {
                    get: function() {
                      const realValue = original.get.call(this);
                      if (this.textContent.trim() !== '') {
                        return Math.max(1, realValue + (Math.random() * 6 - 3));
                      }
                      return realValue;
                    },
                    configurable: true
                  });
                });

            } catch(e) {  }

            try {
                
                // Randomize getBoundingClientRect()
                const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
                Element.prototype.getBoundingClientRect = function() {
                  const rect = originalGetBoundingClientRect.call(this);
                  if (this.textContent.trim() !== '') {
                    rect.width += (Math.random() * 14 - 2); 
                    rect.height += (Math.random() * 14 - 2);
                  }
                  return rect;
                };
                /*
                    Object.defineProperty(HTMLElement.prototype, 'style', {
                      get: function() {
                        const style = originalStyleDescriptor.get.call(this);
                        Object.defineProperty(style, 'fontFamily', {
                          get: () => 'Arial, sans-serif',
                          set: () => {
                          },
                          configurable: true
                        });

                        return style;
                      },
                      configurable: true
                    });
                */
            } catch(e) {  }
})();
  
`);

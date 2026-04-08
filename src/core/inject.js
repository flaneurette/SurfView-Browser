const { webFrame } = require('electron');

const privacy_script = `

    //(function() {
    
    try { 
    
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

    try {
        
        Object.defineProperty(document, 'fonts', { get: () => [] });
        window.getComputedStyle = function() {
            return false;
        }

        Object.defineProperty(document.fonts, 'ready', {
          get: function() {
            return Promise.resolve();
          },
          configurable: true
        });

        const originalLoad = document.fonts.load;
        document.fonts.load = function() {
          return Promise.resolve([]);
        };

        ['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight'].forEach(prop => {
          let proto = HTMLElement.prototype;
          let descriptor;

          while (proto && !descriptor) {
            descriptor = Object.getOwnPropertyDescriptor(proto, prop);
            proto = Object.getPrototypeOf(proto);
          }

          if (!descriptor) return;

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

        const originalGetComputedStyle = window.getComputedStyle;
        window.getComputedStyle = function(element, pseudoElt) {
          const style = originalGetComputedStyle.call(this, element, pseudoElt);

          Object.defineProperty(style, 'fontFamily', {
            get: () => ['Arial', 'Times New Roman', 'Courier New'][Math.floor(Math.random() * 3)]
          });

          Object.defineProperty(style, 'fontSize', {
            get: () => {
              const realSize = parseFloat(originalGetComputedStyle.call(this, element, pseudoElt).fontSize);
              return Math.floor(realValue * 0.1 * (Math.random() * 2 - 1));
            }
          });

          return style;
        };

        CanvasRenderingContext2D.prototype.measureText = function(text) {
          return { width: Math.floor(Math.random() * 100) + 50 };
        };
        
        const OriginalFontFace = FontFace;
        window.FontFace = function(family, source, descriptors) {
          return new OriginalFontFace('Arial', '', {});
        };
 
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
          
        // Override HTMLElement.prototype.style to block fontFamily assignments
        const originalStyleDescriptor = Object.getOwnPropertyDescriptor(
          HTMLElement.prototype,
          'style'
        );

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
          
       } catch(e) {}

        Element.getClientRects = function() { return false; }
        Element.getBoundingClientRect = function() { return false; }
        Object.defineProperty(navigator, 'doNotTrack', { value: null });
        Object.defineProperty(navigator, 'globalPrivacyControl', { value: undefined });
        Object.defineProperty(window, 'speechSynthesis', { value: undefined });
        window.SpeechSynthesisUtterance = undefined;

        } catch(e) {}
    
   //})();
`;

webFrame.executeJavaScript(privacy_script);

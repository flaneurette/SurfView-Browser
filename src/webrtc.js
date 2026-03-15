
let strictjs = require('./strict.js');

let logging = true;

let WEBRTC_SIGNATURES = [

    // Core APIs
    'RTCPeerConnection',
    'RTCDataChannel',
    'RTCSessionDescription',
    'RTCIceCandidate',
    'mediaDevices',
    'getUserMedia',
    'getDisplayMedia',

    // Prefixed (older browsers)
    'webkitRTCPeerConnection',
    'mozRTCPeerConnection',
    'webkitGetUserMedia',
    'mozGetUserMedia',

    // STUN/TURN servers
    'iceServers',

    // Common patterns
    'createOffer',
    'createAnswer',
    'setLocalDescription',
    'setRemoteDescription',
    'onicecandidate',
    'addIceCandidate',
    'iceConnectionState',
    'iceGatheringState',
    'signalingState',
    'connectionState',

    // Data channels
    'createDataChannel',
    'ondatachannel',
    //'onmessage',

    // Media streams
    'addStream',
    'getSenders',
    'getReceivers',
    'getTransceivers',
    'RTCRtpSender',
    'RTCRtpReceiver',

    // Stats (used to fingerprint/leak IPs)
    'getStats',
    'RTCStatsReport',

    // Screen/media capture
    'getDisplayMedia',
    'captureStream',
    'RTCSessionDescriptionInit',
    
    // WebSockets (often paired with WebRTC signaling)
    'wss://',
    'ws://',
    
    // audio patterns
    'OfflineAudioContext',
    'createOscillator',
    'createDynamicsCompressor',
    'getFloatFrequencyData', 
    'getChannelData',
    'startRendering',
];

let PATTERNS = [

    // Quick lookup
    /RTC\s*Peer/i,
    /\bRTC\s*Data/i,
    /RTC\s*Ses/i,
    /RTC\s*Ice/i,
    // Core APIs
    /RTCPeerConnection/i,
    /RTCDataChannel/i,
    /RTCSessionDescription/i,
    /RTCIceCandidate/i,
    /mediaDevices/i,
    /getUserMedia/i,
    /getDisplayMedia/i,

    // Prefixed (older browsers)
    /webkitRTCPeerConnection/i,
    /mozRTCPeerConnection/i,
    /webkitGetUserMedia/i,
    /mozGetUserMedia/i,

    // STUN/TURN servers
    /\bstun\s*:.*(\d+)/i,
    /\bturn\s*:.*(\d+)/i,
    /\bturns\s*:.*(\d+)/i,
    /:\/\/s*stun/i,
          
    // or specific suspicious ports
    /:\s*(3478|5349|19302)/,
    /\bstun\s*:/i,
    /\bturn\s*:/i,
    /\burls\s*:/i,
    /iceServers/i,
    /wss\s*:\s*\/\//i,
    /ws\s*:\s*\/\//i,

    // Common patterns
    /createOffer/i,
    /createAnswer/i,
    /setLocalDescription/i,
    /setRemoteDescription/i,
    /onicecandidate/i,
    /addIceCandidate/i,
    /iceConnectionState/i,
    /iceGatheringState/i,
    /signalingState/i,
    /connectionState/i,

    // Data channels
    /createDataChannel/i,
    /ondatachannel/i,

    // Media streams
    /addStream/i,
    /getSenders/i,
    /getReceivers/i,
    /getTransceivers/i,
    /RTCRtpSender/i,
    /RTCRtpReceiver/i,

    // Stats
    /getStats/i,
    /RTCStatsReport/i,

    // Screen/media capture
    /captureStream/i,
    /RTCSessionDescriptionInit/i,

    // Newer APIs
    /RTCPeerConnectionIceEvent/i,
    /RTCTrackEvent/i,
    /\bontrack\s*=/i,

    // ORTC (Edge legacy)
    /RTCIceGatherer/i,
    /RTCIceTransport/i,
    /RTCDtlsTransport/i,
    /RTCSrtpSdesTransport/i,

    // Encoded transforms (newer)
    /RTCEncodedAudioFrame/i,
    /RTCEncodedVideoFrame/i,
    /createEncodedStreams/i,

    // Identity/certificates
    /RTCCertificate/i,
    /generateCertificate/i,
    /getFingerprints/i,

    // Common library signatures
    /simple-peer/i,
    /SimplePeer/i,
    /peerjs/i,
    /PeerJS/i,
    /mediasoup/i,
    /Janus/i,
    /janus\.js/i,
    /webrtc-adapter/i,
    /adapter\.js/i,

    // Signaling patterns
    /socket\.io/i,
    /\.on\s*\(\s*['"`]offer/i,
    /\.on\s*\(\s*['"`]answer/i,
    /\.on\s*\(\s*['"`]candidate/i,

    // SDP patterns
    /a=candidate/i,
    /a=ice-/i,
    /a=fingerprint/i,
];

PATTERNS = [...PATTERNS, ...strictjs.STRICT_PATTERNS];

function filterFalsepositives(code) {
    // Noticed these in next.js, very odd, but false positives.
    code =  code.replace(/turn\s*:\s*1\s*}/i,'');
    code =  code.replace(/turn\s*:\s*function/i,'');
    return code;
}

function detectWebRTC(code,uri) {

    code = filterFalsepositives(code);
    
    // Redundant check, if array is good.
    if(PATTERNS.length < 10) {
       // Serious error, stop loading page.
       return 10;
    }

    for (const p of PATTERNS) {
        if (p.test(code)) {
            if(logging == true) console.log(p,uri);
            return 1;
        }
    }
    
    for (const sig of WEBRTC_SIGNATURES) {
        if (code.includes(sig)) {
            if(logging == true) console.log(sig,uri);
            return 1;
        }
    }
    
    let deep = detectInSource(code);
        if(deep == 1) {
            return 1;
        }
    return 0;
}

function matchPatterns(source) {
    for (const p of PATTERNS) {
        if (p.test(source)) {
            if(logging == true) console.log(p,uri);
            return 1;
        }
    }
    return 0;
}

function cleaner(source) {
    return source
        .replace(/['"]\s*\+\s*['"]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function detectInSource(source) {
    
    let current = source;
    const seen = new Set();

    while (true) {
        // avoid infinite loops
        if (seen.has(current)) break;
        seen.add(current);

        // clean obfuscation
        const cleaned = cleaner(current);
        if (matchPatterns(cleaned)) return 1;

        // decode base64 then clean again
        const decoded = cleaner(decodeBase64Strings(cleaned));
        if (matchPatterns(decoded)) return 1;

        // nothing changed, stop
        if (decoded === cleaned) break;

        current = decoded;
    }

    return 0;
}

function decodeBase64Strings(source) {
    const base64Regex = /\batob\((.*?)\)/g;
    
    let decoded = source;
    let match;

    while ((match = base64Regex.exec(source)) !== null) {
        const b64 = match[1].replace(/['"`]/g, ''); // strip quotes
        try {
            const decodedStr = atob(b64);
            decoded = decoded.replace(match[0], `'${decodedStr}'`);
        } catch (e) {
            // not valid base64, skip
        }
    }

    return decoded;
}

module.exports = { detectWebRTC };
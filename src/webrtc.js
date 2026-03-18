
let strictjs = require('./strict.js');

// Set to false on production builds, as we can't see logging anyway.
let logging = true;

let PATTERNS = [

    /RTC\s*Peer/ig,
    /RTC\s*Dat/ig,
    /RTC\s*Ses/ig,
    /RTC\s*Ice/ig,
    /RTC\s*Rtp/ig,
    /RTC\s*Enc/ig,
    /RTCD\s*tls/ig,
    /RTCS\s*rtp/ig,
    /RTCS\s*udp/ig,
    /RTCS\s*tcp/ig,
    /RTC\s*Cert/ig,
    /RTC\s*Stat/ig,
    /RTC\s*Track/ig,
    /RTC\s*Add/ig,
    /RTC\s*Sen/ig,
    /RTC\s*Rec/ig,
    /RTC\s*Con/ig,
    /mediaDevices/ig,
    /getUserMedia/ig,
    /getDisplayMedia/ig,
    /webkitGetUserMedia/ig,
    /mozGetUserMedia/ig,
    /igceServers/ig,
    /createOffer/ig,
    /createAnswer/ig,
    /setLocalDescription/ig,
    /setRemoteDescription/ig,
    /onicecandidate/ig,
    /addIceCandidate/ig,
    /igceConnectionState/ig,
    /igceGatheringState/ig,
    /signalingState/ig,
    /connectionState/ig,
    /createDataChannel/ig,
    /ondatachannel/ig,
    /addStream/ig,
    /getSenders/ig,
    /getReceivers/ig,
    /getTransceivers/ig,
    /getStats/ig,
    /captureStream/ig,
    /\bontrack\s*=/ig,
    /createEncodedStreams/ig,
    /generateCertificate/ig,
    /getFingerprints/ig,
    /\bstun\s*:.*(\d+)/ig,
    /\bturn\s*:.*(\d+)/ig,
    /\bturns\s*:.*(\d+)/ig,
    /:\s*(3478|5349|19302)/,
    /\bstun\s*:/ig,
    /\bturn\s*:/ig,
    /\burls\s*:/ig,
    /wss\s*:\s*\/\//ig,
    /ws\s*:\s*\/\//ig,
    /OfflineAudioContext/ig,
    /createOscillator/ig,
    /createDynamicsCompressor/ig,
    /getFloatFrequencyData/ig,
    /getChannelData/ig,
    /startRendering/ig,
    /simple-peer/ig,
    /SimplePeer/ig,
    /peerjs/ig,
    /mediasoup/ig,
    /janus\.js/ig,
    /proxy\.js/ig,
    /rtc\.js/ig,
    /webrtc-adapter/ig,
    /adapter\.js/ig,
    /socket\.io/ig,
    /\.on\s*\(\s*['"`]offer/ig,
    /\.on\s*\(\s*['"`]answer/ig,
    /\.on\s*\(\s*['"`]candidate/ig,
    /a=candidate/ig,
    /a=ice-/ig,
    /a=fingerprint/ig,

];

PATTERNS = [...PATTERNS, ...strictjs.STRICT_PATTERNS];

function filterFalsepositives(code) {
    // Noticed these in next.js, very odd, but false positives.
    // We only do replacements in js recon, we're not parsing/replacing live js.
    code = code.replaceAll(/turn\s*:\s*(0|1)\s*}/ig,'');
    code = code.replaceAll(/turn\s*:\s*function/ig,'');
    code = code.replaceAll(/return\s*:/ig,'');
    code = code.replaceAll(/returns\s*:/ig,'');
    return code;
}

function detectWebRTC(code,uri) {

    code = filterFalsepositives(code);
    
    // Redundant check, if array is good.
    if(PATTERNS.length < 10) {
       // Serious error, stop loading page.
            return {
                status:10,
                file: false, 
                pattern:false
            };
    }

    for (const p of PATTERNS) {
        if (p.test(code)) {
            if(logging == true) console.log(p,uri);
            return {
                status:1,
                file: uri, 
                pattern:p
            };
        }
    }
   
    let deep = detectInSource(code,uri);
        if(deep.status == 1) {
            return {
                status:1,
                file: uri, 
                pattern: 'detected in source'
            };
        }
    
    return {
        status:0,
        file: false, 
        pattern: false
    };
}

function matchPatterns(source,uri) {
    
    for (const p of PATTERNS) {
        if (p.test(source)) {
            if(logging == true) console.log(p,uri);
            return {
                status:1,
                file: uri, 
                pattern: p
            };
        }
    }
    
    return {
        status:0,
        file: false, 
        pattern: false
    };
}

function cleaner(source) {
    
    // Arrays
    if(source.includes('[')) {
        source = source.replace(/\[([^\]]+)\]/g, (_, inner) => {
            const parts = [...inner.matchAll(/['"`]([^'"`]*)['"`]/g)].map(m => m[1]);
            return "'" + parts.join('') + "'";
        });  
    }
    
    source = source.replaceAll(/['"`]\s*\+\s*['"`]/g, '');
    source = source.replaceAll(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    source = source.replaceAll(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    source = source.replaceAll(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
    source = source.replaceAll(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d)));  
    source = source.replaceAll(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    source = source.replaceAll(/['"`]\s*\+\s*['"`]/g, '');
    source = source.replaceAll(/\s+/g, ' ');
    
    // Arrays
    if(source.includes('[')) {
        source = source.replace(/\[([^\]]+)\]/g, (_, inner) => {
            const parts = [...inner.matchAll(/['"`]([^'"`]*)['"`]/g)].map(m => m[1]);
            return "'" + parts.join('') + "'";
        });  
    }
    
    return source;
}

function resolveStringVars(source) {
    
    const vars = {};
    const arrays = {};

    const arrRegex = /(?:var|let|const)\s+(\w+)\s*=\s*\[([^\]]+)\]/g;
    let match;
    while ((match = arrRegex.exec(source)) !== null) {
        const parts = [...match[2].matchAll(/['"`]([^'"`]*)['"`]/g)].map(m => m[1]);
        if (parts.length > 0) arrays[match[1]] = parts;
    }

    const declRegex = /(?:var|let|const)\s+(\w+)\s*=\s*['"`]([^'"`]*)['"`]/g;
    while ((match = declRegex.exec(source)) !== null) {
        if (!(match[1] in arrays)) {
            vars[match[1]] = match[2];
        }
    }

    for (const [arrName, parts] of Object.entries(arrays)) {
        source = source.replace(
            new RegExp(`\\b${arrName}\\[(\\d+)\\]`, 'g'),
            (_, i) => `'${parts[parseInt(i)] ?? ''}'`
        );
    }

    for (const [varName, value] of Object.entries(vars)) {
        source = source.replace(
            new RegExp(`(?<!(?:var|let|const)\\s{0,10})\\b${varName}\\b`, 'g'),
            `'${value}'`
        );
    }

    let prev;
    do {
        prev = source;
        source = source.replace(/['"`]([^'"`]*?)['"`]\s*\+\s*['"`]([^'"`]*?)['"`]/g, "'$1$2'");
    } while (source !== prev);

    return source;
}

function looksLikeJavaScript(source) {
  return (
    /=\s*\[/.test(source)  ||
    /\+\s*=/.test(source) ||
    /\b(var|let|const)\s+[_$a-zA-Z0-9]+\s*=/.test(source) ||
    /[!$_]\w+?\s*=/.test(source) ||
    /\(\s*\)\s*=>/.test(source) ||
    /\beval\s*\(/.test(source) ||
    /\b(forEach|map|filter|reduce)\s*\(/.test(source) ||
    /\b(atob|btoa)\s*\(/.test(source) ||
    /\b(navigator|window|document)\s*\./.test(source) ||
    /\b(function\s+[_$a-zA-Z0-9]+\s*\(|return|typeof|instanceof)/.test(source) ||
    /\brequire\s*\(/.test(source) ||
    /\bimport\s+.+\bfrom\b/.test(source)
  );
}

function detectInSource(source,uri) {

    let prepare = false;
    let scanstart = false;
    
    // first detect if it's js, otherwise we waste resources.    
    prepare = looksLikeJavaScript(source);
   
    if(prepare == true || prepare === true || prepare === 'true') {
        scanstart = true;
    }

    if(scanstart) {

    let current = source;
    const seen = new Set();
    
        while (true) {
            // avoid infinite loops
            if (seen.has(current)) break;
            seen.add(current);

            // First unwrap all vars and arrays, and concatenate them.
            const unwrap1 = resolveStringVars(source)
            if (matchPatterns(unwrap1,uri).status == 1) return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious code after string deobfuscation.'
            };

            // clean obfuscation
            const cleaned1 = cleaner(unwrap1);
            if (matchPatterns(cleaned1,uri).status == 1) return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious code after deobfuscation unwrapping.'
            };
            
            // clean obfuscation
            const cleaned = cleaner(cleaned1);
            if (matchPatterns(cleaned,uri).status == 1)return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious code after cleaning.'
            };

            // decode base64 then clean again
            const decoded = cleaner(decodeBase64Strings(cleaned));
            if (matchPatterns(decoded,uri).status == 1) return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious bas64 encoded data.'
            };

            // Unwrap again.
            const unwrap2 = resolveStringVars(decoded)
            if (matchPatterns(unwrap2,uri).status == 1) return {
                status:1,
                file: uri, 
                pattern: 'Detected malicious code after deobfuscation'
            };
            
            // nothing changed, stop
            if (decoded === cleaned) break;

            current = decoded;
        }
    }
    
    return {
        status:0,
        file: false, 
        pattern: false
    };
}

function decodeBase64Strings(source) {
    
    if(!source.includes('atob')) {
        return source;
    }
    
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
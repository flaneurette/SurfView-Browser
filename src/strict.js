// Add your own strict patterns here
// Some sites need these...

const STRICT_PATTERNS = [

    /\bMy\s*Special\s*Pattern/i,
    
    // iframes (we already scan iframes, but you could block them all)
    ///\(\s*\'iframe\'\s*\)/i,
    ///\(\s*\'webview\'\s*\)/i,
    ///\(\s*\'object\'\s*\)/i,
    
    // Extra strict: deny sockets.
    ///postMessage/i,
    ///WebSocket/i,
    ///addTrack/i,
    ///removeTrack/i,
    ///onmessage/,
];

module.exports = { STRICT_PATTERNS };

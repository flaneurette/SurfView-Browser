// Add your own strict patterns here
// Some sites need these...

const STRICT_PATTERNS = [

    // block canvas
    ///<\s*canvas/i,
    ///createElement\(\'canvas\'\)/i,
    //toDataURL/i,
    ///fillRect/i,
    /captureStream/i,
    /getImageData/i,
    /getSupportedExtensions/i,
    /SHADING_LANGUAGE_VERSION/i,
    /UNMASKED_VENDOR_WEBGL/i,
    /UNMASKED_RENDERER_WEBGL/i,
    /WEBGL_debug_renderer_info/i,

    ///toBlob/i,
    ///new\s*Blob/i,
    
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

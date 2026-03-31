// #####################################################################
// FUNCTIONS
// #####################################################################

// Utilities
function escHtml(s) {
    return String(s)
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
        .replaceAll('`', '&#96;');
}

function sanitizeUrl(raw) {
    
    let url = String(raw).trim();

    url = url.replaceAll(/[\x00-\x20\x7F]/gim, '');
    url = url.replaceAll(/[(){}\[\]`]/g, '');

    if (/^(javascript|data|vbscript|file|about|chrome|settings|mailto|mailbox|blob|xlink|navigation|navigator|window):/i.test(url)) {
        return null;
    }

    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return null;
        }
        var stripped = parsed.href.replaceAll(/[\x00-\x1F\x7F]/gim, '');
        var enc = ['%00', '%1F', '%0D', '%0A'];
        enc.forEach(function(code) {
            stripped = stripped.replaceAll(new RegExp(code, 'gim'), '');
        });
        return stripped;
    } catch (e) {
        return null;
    }
}

function sortUrls(urls) {
    const order = (url) => {
        const lower = url.toLowerCase();
        if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.tsx') || lower.endsWith('.java')) return 0;
        if (lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.php')) return 1;
        if (!/\.[^/]+$/.test(url)) return 2; // no extension
        if (lower.endsWith('.png') || lower.endsWith('.gif') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.avif')) return 4;
        return 3; // other extensions
    };

    return urls.sort((a, b) => order(a) - order(b));
}

function ErrorMessage(errorString) {
    let sep = '-----------------------------------------------------';
    errorString = '<div class="error-detail-container">' +  errorString;
    errorString = errorString.replaceAll('\n\n','\n'+sep+sep+'\n');
    errorString = errorString + '<div>';
    return errorString;
}
    
function getStatus(status,url,location) { 
                        
    let statusMessages = {
        301: escHtml(status) + '\n\nSite tried to redirect (permanent).\n\nResponse url: ' + escHtm(url) + '\n\nLocation: ' + escHtml(location || ''),
        302: escHtml(status) + '\n\nSite tried to redirect (temporary).\n\nResponse url: ' + escHtml(url) + '\n\nLocation: ' + escHtml(location || ''),
        303: escHtml(status) + '\n\nSite tried to redirect (see other).',
        307: escHtml(status) + '\n\nSite tried to redirect (temporary).',
        308: escHtml(status) + '\n\nSite tried to redirect (permanent).',
        400: escHtml(status) + '\n\nBad request.',
        401: escHtml(status) + '\n\nUnauthorized - login required.',
        403: escHtml(status) + '\n\nForbidden - access denied.',
        404: escHtml(status) + '\n\nPage not found.',
        405: escHtml(status) + '\n\nMethod not allowed.',
        429: escHtml(status) + '\n\nToo many requests - rate limited.',
        500: escHtml(status) + '\n\nInternal server error.',
        502: escHtml(status) + '\n\nBad gateway.',
        503: escHtml(status) + '\n\nService unavailable.',
        504: escHtml(status) + '\n\nGateway timeout.',
      };
    return statusMessages[status] ?? `Unknown status: ${escHtml(status)}`;
}

// #####################################################################
// WEBSCAN
// #####################################################################

async function WebRTCscan(url) {
    
    // returns array of scanned links.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 10s timeout
    await proxyManagement();
    // Direct Nodescan.
    const res = await net.fetch(url, {
        headers: {
            'DNT': '1',
            'User-Agent': spoof.userAgent,
            'Accept-Language': spoof.locale,
            'Referer': escHtml(new URL(url).origin) + '/',
        },
         signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
        return {
            ok: false,
            status: 'Error',
            error: `\n\nHTTP Error: ${res.status} ${res.statusText}\n\n`,
        };
    }
    
    const sourcecode = await res.text();
            
    if(devdebug) console.log('Started webRTC scan.');
    
    let scan = detectWebRTC(sourcecode,false);

    if(devdebug) console.log('WebRTC done.');

    if (scan === 10) {
        return {
            ok: false,
            status: 'Permanent configuration error',
            error: '\n\nPermanent error:\n\npattern array in /src/core/security/webscanner.js corrupted!\n\n'
        };
    }
    
    if (scan === 1) {
        return {
            ok: false,
            status: 'Possible unmasking attempt blocked.',
            error: '\n\nCould not load page, possible unmasking attempt blocked.\n\n'
        };
    }

    // Fetch and scan externals in Node.js since JS is disabled
    // We scan everything with a src, as even images can hold js.
    const matches = sourcecode.matchAll(/(script|object|embed|frame|frameset|applet|source)[^>]*(src|code|source|data-url|data|action)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gim);
    const matches_source = sourcecode.matchAll(/\.\s*(src|data)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gim);
    
    const validUrls = [];
    // Push base url also:
    validUrls.push(url);
    let base = escHtml(url);
    
    if(matches.length > 250) {
        return {
            ok: false,
            status: 'Permanent error',
            error: 'Permanent error: page has more than 250 src files. Cannot do recon.'
        };
    } 
    
    for (let match of matches) {
         let value = match[3] || match[4] || match[5];
          if (value) {
            if(['),','((','[[',']]','{','}','||',']=','=[','!=','=(','("','&(','="','= "'].some(bad => value.includes(bad))) {
                // url contains illegal chars.
                } else {
                let url = nodeJSurl(base, value);
                if (url != false) validUrls.push(url);
            }
          }
    }

    for (let match2 of matches_source) {
         let value2 = match2[3] || match2[4] || match2[5];
          if (value2) {
            if(['),','((','[[',']]','{','}','||',']=','=[','!=','=(','("','&(','="','= "'].some(bad => value2.includes(bad))) {
                // url contains illegal chars.
                } else { 
                let url2 = nodeJSurl(base, value2);
                if (url2 != false) validUrls.push(url2);
            }
          }
    }

    let uniqueUris = [...new Set(validUrls)];

    let njs = false;
    
    // Sort by importance.
    uniqueUris = sortUrls(uniqueUris);
     
    // Extra sanitization round.
    for (let i = 0; i < uniqueUris.length; i++) {
        
        njs = nodeJSurl(base, uniqueUris[i]);
        
        if(njs != false) { 
            uniqueUris[i] = njs;
            if (!largeUriList.includes(uniqueUris[i])) {
                largeUriList.push({file: uniqueUris[i],
                hash: false
                });
            }
        }
    }

    if(devdebug) console.log(uniqueUris);
    
    let extScan = 0;
    let shouldWeScan = true;
    let scanResults = [];
    
    await proxyManagement();
    
    for (const scriptUrl of uniqueUris) {
        
        if(devdebug) console.log('Testing URI:' + scriptUrl);
        
        try {
            
            // Direct Nodescan.
            const res = await net.fetch(scriptUrl, {
              headers: {
                'DNT': '1',
                'User-Agent': spoof.userAgent,
                'Accept-Language': spoof.locale,
                'Referer': escHtml(new URL(url).origin) + '/',
              },
            });

            const code = await res.text();
       
            // Generate a hash of the file.
            let pageHash = await generateHash(code);
            
            let foundItem = uniqueUris.find(item => item.hash === pageHash && item.file === scriptUrl);
            
            if(foundItem) {
                shouldWeScan = false;
            }
            
            if(shouldWeScan === true) {
                
                uniqueUris = uniqueUris.map(file => ({
                  file,
                  hash: file === scriptUrl ? pageHash : false
                }));

                if(devdebug) console.log('detect WebRTC scan init...');
                
                let scan = detectWebRTC(code,scriptUrl);
                
                if(devdebug) console.log('Scan done!');
                
                if (scan.status === 10) {
                    if(devdebug) console.log('Pattern database corrupted!');
                    extScan++;
                }
                
                if (scan.status === 1) {
                    if(devdebug) console.log('Found a pattern in: ' +escHtml(scriptUrl)+ ', with hash:' + escHtml(pageHash));
                    let showMsg = '\n\nCould not load page, possible unmasking attempt blocked.\n\nFound a signature pattern with RegExp: '+scan.pattern+'\n\nOn URL:\n\n' +escHtml(scan.file)+'\n\n';
                    scanResults.push(showMsg);
                    extScan++;
                }
                
            }
        
        } catch (_) { }
    }
 
    if (extScan >=1) {
        return {
            ok: false,
            pages: uniqueUris,
            error: scanResults,
        };
    }
    
    return {
        ok: true,
        pages: uniqueUris,
    };
}

function nodeJSurl(base, matched) {
    
   if (!matched) return false;
   if (matched === null) return false;
   if (matched === undefined) return false;
   if (matched === false) return false;
   
   let intern = false;
   
   // Typepcast.
   matched = String(matched);
   
   let test = earlyReturn(matched,base);
   
   if(test === false) {
       return false;
       } else {
       matched = test;
   }
   
   let prebase = base.replace('https://','');
   prebase = prebase.replace('http://','');
   prebase = prebase.replace('www.','');
    
   let presub = matched.match(/(?:https?:\/\/|wss?:\/\/|turns?:\/\/|stuns?:\/\/|ftp:\/\/|ww[w0-9]\.(?=\S))(?:[\p{L}\p{N}-]+\.)+(?:[\p{L}]{2,})/gui);

   if(matched.includes(prebase)) {
        intern = true;
        } else if(presub) {
        intern = false;
        } else {
        intern = true;
   }
   
    if(matched.startsWith("/") || matched.startsWith("./")) {
        intern = true;
    } 

    test = earlyReturn(matched,base);
   
    if(test === false) {
       return false;
       } else {
       matched = test;
    }
 
    if(matched.startsWith('./')) {
        matched = matched.replace('./','');
    }
  
    if(intern) { 
    
       let afterScan = matched.match(/(?:https?:\/\/|wss?:\/\/|turns?:\/\/|stuns?:\/\/|ftp:\/\/|ww[w0-9]\.)/gi);
      
       if(afterScan) {
       // dont rewrite, it's already internal.
       } else {
           
        if(matched.startsWith("/") || matched.startsWith("./")) {
            var urlnew = new URL('https://' + prebase);
            matched = urlnew.origin + '***_***' + matched;
            } else {
                // reconstruct url.
                matched = matched.trim();
                matched = matched.replace(base,'');
                matched = matched.replace(prebase,'');
                matched = 'https://' + prebase + '***_***' + matched;
            }
       }
     }

    if(matched.includes('../')) {
       matched = matched.replaceAll('../','_**_**_/');
    }
    
    matched = matched.replaceAll('https://','');
    matched = matched.replaceAll('http://','');
    matched = matched.replace(/[,>;]\s*$/, '').trim();
    matched = matched.replace(/^(src\s*=\s*['"]?|['"])/i, '').trim();
    matched = matched.replace(/^(https?:)?\/\/+/i, '');
    matched = matched.replaceAll(/\/\/+/gi, '');
    matched = matched.replaceAll('***_***', '/');
    matched = matched.replace('//', '/');
    matched = 'https://' + matched.replace('//', '/');
    matched = matched.replace('///', '//');
    
    matched = matched.replaceAll('>','');
    matched = matched.replaceAll('<','');
    matched = matched.replaceAll('\'','');
    matched = matched.replaceAll(';','');
    matched = matched.replaceAll('`','');
    matched = matched.replaceAll('../','');

    matched = matched.replaceAll('_**_**_/','../');
    
    // Edge cases
    if(matched.match(/\(('|"|`|\$|)[{|]*\s*[a-z0-9]*\s*[}|]*('|"|`|)\)/gi)) {
        return false;
    }
    
    if (
        matched.match(/\$\{.*\}/g) ||
        matched.match(/\beval\s*\(\b/gi) ||
        matched.match(/\.toString\s*\(/gi) || 
        matched.match(/\.atob\s*\(/gi) || 
        matched.match(/\.btoa\s*\(/gi)
    ) {
        return false;
    }
    
    if(matched.length <=11 ) {
        return false;
    }
    
    test = earlyReturn(matched,base);
   
    if(test === false) {
       return false;
       } else {
       matched = test;
    }
    
  return matched;
}

function earlyReturn(matched,base) {
    
    matched = matched.trim();

    if(
        matched == 'undefined'
        || matched == 'null'
        || matched == ''
        || matched == 'https://' 
        || matched == 'http://'
        || matched == 'https://src' 
        || matched == 'https://href' 
        || matched == base
        || matched == '#'    
        || matched == '//'
        || matched == '=='
        || matched == '='
        || matched == 'href'
        || matched == 'src'
        || matched == 'let'
        || matched == 'var'
        || matched == 'about:blank'
    )
    {
        return false;
    }
    
    if (
        matched.startsWith('https://chrome-') ||
        matched.startsWith('https://about:') ||
        matched.startsWith('javascript:') ||
        matched.startsWith('data:') ||
        matched.startsWith('file:') || 
        matched.startsWith('chrome:') || 
        matched.startsWith('edge:') || 
        matched.startsWith('moz-extension:') ||
        matched.startsWith('view-source:') || 
        matched.startsWith('blob:') 
    ) {
        return false;
    }
    
    return matched;
}

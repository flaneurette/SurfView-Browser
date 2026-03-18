// src/renderer.js
// Runs in the sandboxed Electron renderer process.
// Communicates with main only via window.surfview (exposed by preload.js).
// Never touches the network directly.

(function() {

    'use strict';

    // state
    var allLinks = [];
    var currentTab = 'all';
    var navHistory = [];
    var navIndex = -1;
    var loading = false;
    let loadTimeout = null;
    var imageModeEnabled = true;

    // Webview javascript
    let jsEnabled1 = false; // default: off

    // elements
    var urlInput = document.getElementById('urlInput');
    var btnRender = document.getElementById('btnRender');
    var btnBookmark = document.getElementById('btnBookmark');
    var btnBack = document.getElementById('btnBack');
    var btnFwd = document.getElementById('btnFwd');
    var btnReload = document.getElementById('btnReload');
    var emptyState = document.getElementById('emptyState');
    var loadingState = document.getElementById('loadingState');
    var loadingStateLive = document.getElementById('loadingStateLive');
    var errorState = document.getElementById('errorState');
    var errorMsg = document.getElementById('errorMsg');
    var pageImageWrap = document.getElementById('pageImageWrap');
    var pageImage = document.getElementById('pageImage');
    var liveWrap = document.getElementById('liveWrap');
    var liveWebview = document.getElementById('liveWebview');
    var liveWarningClose = document.getElementById('liveWarningClose');
    var liveWarning = document.getElementById('liveWarning');
    var linkList = document.getElementById('linkList');
    var linkCount = document.getElementById('linkCount');
    var filterInput = document.getElementById('filterInput');
    var statusSafe = document.getElementById('statusSafe');
    var statusDomain = document.getElementById('statusDomain');
    var statusTitle = document.getElementById('statusTitle');
    var statusLinks = document.getElementById('statusLinks');
    var statusTime = document.getElementById('statusRenderTime');
    var shieldBadge = document.getElementById('shieldBadge');
    var shieldDot = document.getElementById('shieldDot');
    var shieldLabel = document.getElementById('shieldLabel');
    var modeLabel = document.getElementById('modeLabel');
    var imageModeToggle = document.getElementById('imageModeToggle');
    var torSwitch = document.getElementById('torSwitch');
    var torLabel = document.getElementById('torLabel');
    var statusJS = document.getElementById('statusJS');
    var jsStatus = document.getElementById('jsStatus');
    var statusSafe = document.getElementById('statusSafe');
    var launchReport = document.getElementById('launchReport');
    var launchReload = document.getElementById('launchReload');
    var errorExplainer = document.getElementById('errorExplainer');
   
    var liveModal = 'inactive';
    liveWarning.style.display = 'none';
    
    errorExplainer.className = 'error-explainer hide';
    errorState.className = 'error-state hide';
    
    liveWebview.addEventListener('did-fail-load', (event) => {
      console.log('Load failed:', event.errorCode, event.errorDescription)
    })

    // Search on input
    document.getElementById('search-input').addEventListener('input', (e) => {
        window.surfview.searchInWebview(e.target.value);
    });

    // Next/Previous buttons
    document.getElementById('search-next').addEventListener('click', () => {
        window.surfview.searchInWebview(
          document.getElementById('search-input').value,
          { forward: true }
        );
    });
    
    document.getElementById('search-prev').addEventListener('click', () => {
        window.surfview.searchInWebview(
          document.getElementById('search-input').value,
          { forward: false }
        );
    });

    // Close button
        document.getElementById('search-close').addEventListener('click', () => {
        document.getElementById('searchBox').style.display = 'none';
        window.surfview.stopSearchInWebview();
    });
         
         
    // Right-click anywhere in the window
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      window.surfview.showContextMenu();
    });

    // Right-click on URL bar (if needed)
    document.getElementById('urlbar')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      window.surfview.showContextMenu();
    });
   
    // Error reports
    launchReport.addEventListener('click', function() {
        launchReport.style.display = 'none';
        errorExplainer.className = 'error-explainer active';
        errorState.className = 'error-state hide';
    });

    liveWebview.addEventListener('will-navigate', (e) => {
        window.surfview.navigateIntercept(e.url);
        liveWebview.src='';
        if(jsEnabled1 == true) {
            loadUrl(e.url, true, "js")
            } else {
            loadUrl(e.url, true, "live")
        }
    });

    liveWebview.addEventListener('new-window', (e) => {
        window.surfview.navigateIntercept(e.url);
        liveWebview.src='';
        if(jsEnabled1 == true) {
            loadUrl(e.url, true, "js")
            } else {
            loadUrl(e.url, true, "live")
        }
    });
 
    try {
    // focus urlbar by default
    urlInput.focus();
    } catch (e) {}

    let rawUrl = urlInput.value.trim();
    let uri = sanitizeUrl(rawUrl);

    statusJS.addEventListener('click', () => {

        if(jsEnabled1 == false) {
            jsEnabled1 = true;
            } else if(jsEnabled1 == true) {
            jsEnabled1 = false;
        }
        
        jsStatus.textContent = jsEnabled1 ? 'JS ON' : 'JS OFF';
        jsStatus.style.color = jsEnabled1 ? 'var(--danger)' : 'var(--accent)';
        statusSafe.textContent = jsEnabled1 ? 'javascript enabled on webview.' : 'scripts blocked';
        statusSafe.style.color = jsEnabled1 ? 'var(--danger)' : 'var(--accent)';

        if(jsEnabled1 == true) { 
            window.surfview.setJS(true);
            liveWarning.style.display = 'none';
            if (!uri) return;
            loadUrl(uri, true, "js");
            } else {
            window.surfview.setJS(false);
            liveWarning.style.display = 'none';
            if (!uri) return;
            loadUrl(uri, true, "live");
        }
        
    });

    // bookmarking
    btnBookmark.addEventListener('click', function() {
        bookmarkUrl(urlInput.value.trim());
    });

    // url bar events
    urlInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            whatIsAllowed(urlInput.value);
        }
    });

    btnRender.addEventListener('click', function() {
        whatIsAllowed(urlInput.value);
    });

    btnBack.addEventListener('click', function() {
        if (navIndex <= 0) return;
        navIndex--;
        console.log(navHistory[navIndex]);
        whatIsAllowed(navHistory[navIndex]);
    });

    btnFwd.addEventListener('click', function() {
        if (navIndex >= navHistory.length - 1) return;
        navIndex++;
        console.log(navHistory[navIndex]);
        whatIsAllowed(navHistory[navIndex]);
    });

    btnReload.addEventListener('click', function() {
        liveWarning.style.display = 'none';
        var url = sanitizeUrl(urlInput.value.trim());
        if (!url) return;
        whatIsAllowed(url);
    });

    liveWarningClose.addEventListener('click', function() {
        document.getElementById('liveWarning').style.display = 'none';
    });

    // webview navigation events: keep url bar in sync
    liveWebview.addEventListener('did-navigate', function(e) {
        var url = sanitizeUrl(e.url);
        if (!url || url === 'about:blank') return;
        urlInput.value = url.replaceAll(/^https?:\/\//gi, '');
        try {
            statusDomain.textContent = new URL(url).hostname;
        } catch (_) {}
    });

    liveWebview.addEventListener('did-navigate-in-page', function(e) {
        var url = sanitizeUrl(e.url);
        if (!url || url === 'about:blank') return;
        urlInput.value = url.replaceAll(/^https?:\/\//gi, '');
    });

    liveWebview.addEventListener('page-title-updated', function(e) {
        statusTitle.textContent = e.title ? '- ' + escHtml(e.title) : '';
    });

    // filter + tabs
    filterInput.addEventListener('input', renderLinks);

    document.querySelectorAll('.panel-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.panel-tab').forEach(function(t) {
                t.className = 'panel-tab';
            });
            tab.className = 'panel-tab active';
            currentTab = tab.getAttribute('data-tab');
            renderLinks();
        });
    });

    // image mode toggle
    imageModeToggle.addEventListener('change', function() {
        
        imageModeEnabled = this.checked;
        var rawUrl = urlInput.value.trim();

        if (imageModeEnabled) {
            
            if(liveModal != 'active') {
                setShield(true);
            } else {
                setShield(false);   
            }
            
            liveWrap.className = 'live-wrap';
            liveModal = 'active';
            if (rawUrl) {
                loadUrl(sanitizeUrl(rawUrl), true, "image");
            }
        } else {
            setShield(false);
            liveWrap.className = 'live-wrap';
            pageImageWrap.className = 'page-image-wrap';
            emptyState.style.display = 'none';
            liveWarning.style.display = 'block';
            liveWrap.style.display = 'block';
            if (rawUrl) {
                var url = sanitizeUrl(rawUrl);
                if (!url) return;
                loadUrl(url, true, "live");
                statusDomain.textContent = 'loading...';
                statusTime.textContent = '';
            }
            setLinks([]);
        }
    });

    function removeLiveMessage() {
            
        if(window.getComputedStyle(liveWarning).display != 'none') {
            liveWarning.style.display = 'none';
        } else if(liveModal == 'active') {
            liveWarning.style.display = 'none';
        }
        
        return;
    }
    
    function whatIsAllowed(url) {
        if (imageModeEnabled) {
            loadUrl(url, true, "image");
            return;
        } else if (jsEnabled1) {
            loadUrl(url, true, "js");
            return;
        } else {
            loadUrl(url, true, "live");
            return;
        }
    }
    
    function updateTorLabel(enabled, ready) {
        if (!enabled) {
            torLabel.textContent = 'tor: off';
            torLabel.style.color = 'var(--danger)';
        } else if (ready) {
            torLabel.textContent = 'tor: connected';
            torLabel.style.color = '#4caf50';
        } else {
            torLabel.textContent = 'tor: connecting...';
            torLabel.style.color = '#ff9800';
        }
    }

    // Poll status until ready on startup
    const torPoll = setInterval(async () => {
        const status = await window.surfview.torStatus();
        updateTorLabel(status.enabled, status.ready);
        if (status.ready || !status.enabled) clearInterval(torPoll);
    }, 1000);

    torSwitch.addEventListener('change', async () => {
        const enabled = torSwitch.checked;
        torSwitch.disabled = true;
        updateTorLabel(enabled, false);

        const result = await window.surfview.toggleTor(enabled);
        updateTorLabel(result.torEnabled, result.torEnabled ? result.ok : false);

        // If turning on, poll until connected
        if (result.torEnabled && result.ok) {
            updateTorLabel(true, true);
        }

        torSwitch.disabled = false;
    });

    function setShield(safe) {
        if (safe) {
            shieldBadge.style.borderColor = 'rgba(74,240,160,0.2)';
            shieldBadge.style.color = 'var(--accent)';
            shieldDot.style.background = 'var(--accent)';
            shieldDot.style.boxShadow = '0 0 6px var(--accent)';
            shieldLabel.textContent = 'SAFE MODE';
            modeLabel.textContent = 'image mode';
            statusSafe.className = 'status-item status-ok';
        } else {
            shieldBadge.style.borderColor = 'rgba(240,74,106,0.2)';
            shieldBadge.style.color = 'var(--danger)';
            shieldDot.style.background = 'var(--danger)';
            shieldDot.style.boxShadow = '0 0 6px var(--danger)';
            shieldLabel.textContent = 'LIVE MODE';
            modeLabel.textContent = 'live mode';
        }
    }

    // keyboard shortcut: Ctrl+L / Cmd+L to focus url bar
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            urlInput.focus();
            urlInput.select();
        }
    });

    // bookmarking urls

    function shortUrl(url) {
        return url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]; // domain only
    }

    function bookmarkUrl(raw) {
        
        if (!raw) return;

        if (raw.length >= 512) {
            window.surfview.dialog("URL length exceeds maximum length of 512 characters. Cannot add bookmark.")
            return;
        }

        if (raw.length <= 2) {
            window.surfview.dialog("URL length is too short. Cannot add bookmark.")
            return;
        }

        var url = sanitizeUrl(raw);
        url = url.replace(/\/$/, '');
        url = url.replace('https://', '');
        url = url.replace('www.', '');
        
        const dom = document.getElementById('bookmarks-ul');
        const pipe = document.createElement('li');

        pipe.appendChild(document.createTextNode('/'));
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.onclick = function(e) {
            e.preventDefault();
            whatIsAllowed(url);
        };
        a.oncontextmenu = function(e) {
            e.preventDefault();
            removeBookmark(url);
            e.stopPropagation();
            window.focus();
            document.body.focus();
        };
        a.appendChild(document.createTextNode(shortUrl(url)));
        li.appendChild(a);
        dom.appendChild(pipe);
        dom.appendChild(li);

        // write to bookmarks file.
        var store = jsoncmd(url);
        return;
    }


    function jsoncmd(uri) {
        window.surfview.saveBookmark(uri).then(function(result) {
            if (!result.success) {
                if (result.reason === 'duplicate') {
                    window.surfview.dialog('Bookmark already exists.');
                    } else if (result.reason === 'limit') {
                    window.surfview.dialog('Bookmark limit reached.');
                }
            }
        }).catch(function(err) {
            console.error('saveBookmark failed:', err);
        });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const searchBox = document.getElementById('search-input');
        if (searchBox) {
          window.surfview.stopSearchInWebview();
          searchBox.closest('div').remove();
        }
      }
    });
 
    function loadBookmarks() {
        window.surfview.readBookmarks().then(function(urls) {
            const dom = document.getElementById('bookmarks-ul');
            dom.innerHTML = ''; // clears all existing li's before redraw
            urls.forEach(function(url) {
                const pipe = document.createElement('li');
                pipe.appendChild(document.createTextNode('/'));
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#';
                a.onclick = function(e) {
                    e.preventDefault();
                    whatIsAllowed(url);
                };
                a.oncontextmenu = function(e) {
                    e.preventDefault();
                    removeBookmark(url);
                    e.stopPropagation();
                    window.focus();
                    document.body.focus();
                };
                a.appendChild(document.createTextNode(shortUrl(url)));
                li.appendChild(a);
                dom.appendChild(pipe);
                dom.appendChild(li);
            });
        });
    }

    // call it when the page loads
    loadBookmarks();

    function removeBookmark(url) {
        var box = document.getElementById('confirmBox');
        document.getElementById('confirmMsg').textContent = 'Remove ' + sanitizeUrl(shortUrl(url)) + '?';
        box.style.display = 'block';

        document.getElementById('confirmYes').onclick = function() {
            box.style.display = 'none';
            window.surfview.removeBookmark(url).then(function(ok) {
                if (ok) loadBookmarks();
            });
        };
        document.getElementById('confirmNo').onclick = function() {
            box.style.display = 'none';
        };
    }

    // main load function
    function loadUrl(raw, isNavigation = false, vType = "image") {

        removeLiveMessage();

        var url = sanitizeUrl(raw);

        let loadingStatePage = "live";
        
        let viewType = "image";

        if (vType) {
            viewType = vType;
        }

        if (!imageModeEnabled) {
            viewType = "live";
            loadingStatePage = "live";
        }

        if (vType == "js") {
            viewType = "js";
            loadingStatePage = "live";
        }

        if (vType == "image") {
            loadingStatePage = "image";
        }
        
        if (!url) {
            showError('Invalid or unsafe URL.');
            return;
        }

        urlInput.value = url.replaceAll(/^https?:\/\//gi, '');

        liveWebview.style.display='none';
        pageImage.style.display='none';
        
        setLoadingUi(true,loadingStatePage);

        if(loadingStatePage == "live") {
            var steps = ['live-step1', 'live-step2', 'live-step3', 'live-step4'];
            var delays = [0, 200, 400, 600];
            var ls = '-live';
            } else {
            var steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
            var delays = [0, 200, 400, 600, 800];
            var ls = '';
        }
        
        // animate steps visually while waiting for IPC response
        steps.forEach(function(id, i) {
            setTimeout(function() {
                if (i > 0) {
                    var prev = document.getElementById(steps[i - 1]);
                    if (prev) prev.className = 'loading-step'+ls+' done';
                }
                var el = document.getElementById(id);
                if (el) el.className = 'loading-step'+ls+' active-step';
            }, delays[i]);
        });
        
        window.surfview.renderUrl(url, viewType).then(function(result) {

            setLoadingUi(false);

            if(viewType == 'live' || viewType == 'js') {
                liveWrap.className = 'live-wrap';
                liveWebview.style.display='flex';
                } else {
                pageImageWrap.className = 'page-image-wrap';
                pageImage.style.display='block';
            }
        
            if (!result.ok) {
                showError(result);
                return;
            }

            if (!isNavigation) {
                navHistory.splice(navIndex + 1);
                navHistory.push(url);
                navIndex = navHistory.length - 1;
            }

            updateNavButtons();
            showPage(result);

        }).catch(function(err) {
            loading = false;
            setLoadingUi(false);
            liveWebview.src='';
            showError(err || 'Unknown error');
        });
    }

    function setLoadingUi(on,type) {
        
        removeLiveMessage();
        
        liveWebview.src = 'about:blank';
        emptyState.style.display = 'none';
        errorState.className = 'error-state';
        errorExplainer.className = 'error-explainer hide';
        
        if(type == "live") {
            loadingStateLive.className = 'loading-state-live active';
            ['live-step1', 'live-step2', 'live-step3', 'live-step4'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.className = 'loading-step-live';
            });
            } else {
            loadingState.className = 'loading-state active';
            ['step1', 'step2', 'step3', 'step4', 'step5'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.className = 'loading-step';
            });
        }
        
        if (on) {
            setLinks([]);
            statusDomain.textContent = 'loading...';
            statusTitle.textContent = '';
            statusTime.textContent = '';    
        }
    }

    function setWebviewURL(url) {
        
      clearTimeout(loadTimeout)

      loadTimeout = setTimeout(() => {
        if (!url) return

        url = sanitizeUrl(url);
        
        const load = () => {
          liveWebview.loadURL(url, {
            httpReferrer: url
            }).catch(err => {
            if (err.code === 'ERR_ABORTED') return // Ignore aborts
            console.error('Failed to load:', err);
            console.error('URL that failed to load:', url);
          })
        }

        // Check if webview is ready
        if (liveWebview.isConnected) {
          load()
        } else {
          liveWebview.addEventListener('dom-ready', load, { once: true })
        }
      }, 100) // Small debounce delay
    }

    function showPage(result) {
        
        // reset animation
        loadingState.className = 'loading-state';
        loadingStateLive.className = 'loading-state-live';
        
        pageImageWrap.className = 'page-image-wrap active';
        if (result.live) {
            // show webview, hide image
            pageImageWrap.className = 'page-image-wrap'; // hide image wrap
            liveWrap.className = 'live-wrap.active'; // show live wrap
            setWebviewURL(result.url);
            // reset image to blank.
            pageImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        } else {
            // show screenshot, hide webview
            liveWebview.src = '';
            liveWrap.className = 'live-wrap.hide'; // hide live wrap
            pageImageWrap.className = 'page-image-wrap active'; // show image wrap
            pageImage.src = 'data:image/png;base64,' + result.imageBase64;
            pageImage.style.display = 'block';
        }

        setLinks(result.links);

        var finalUrl = sanitizeUrl(result.url);
        if (finalUrl) {
            try {
                statusDomain.textContent = new URL(finalUrl).hostname;
            } catch (e) {
                statusDomain.textContent = escHtml(finalUrl);
            }
        } else {
            statusDomain.textContent = '';
        }

        statusTitle.textContent = result.title ? '- ' + escHtml(result.title) : '';
        statusTime.textContent = result.renderMs + 'ms';
    }

    function showError(msg) {

        let msg1 = null;
        let loadingState = document.getElementById('loadingState');
        let loadingStateLive = document.getElementById('loadingStateLive');
        let errorState = document.getElementById('errorState');
        let launchReport = document.getElementById('launchReport');
        let errorMsgStatus = document.getElementById('errorMsgStatus');
        let wantsToGoTo = document.getElementById('wantsToGoTo');
        let launchReload = document.getElementById('launchReload');
 
        errorMsgStatus.textContent = escHtml(msg.status);
 
        if(msg.message) {
            msg.error = msg.message;
        } 
        
        // Is there an error?
        if(msg.error) {
            if(msg.redirect == true) {
                launchReload.style.display = 'flex';
            }
        }

        // Compare if double requests are made.
        if(msg.original) {
            
            var a = sanitizeUrl(msg.original);
            var b = sanitizeUrl(urlInput.value);
            
            a = new URL(a).hostname
            b = new URL(b).hostname
            
            if(a != b) {
                wantsToGoTo.style.display = 'none';
                launchReload.style.display = 'none';
            }
        }
        
        var gotoUrl = msg.to;
        
        console.log(msg);
        
        // Not a redirect.
        if(!msg.redirect || msg.redirect == false) {
            wantsToGoTo.style.display = 'none';
            launchReload.style.display = 'none'; 
        }
        
        if(msg.redirect) {
            gotoUrl = sanitizeUrl(msg.to);
            wantsToGoTo.textContent = 'Wants to go to: \n\n' + gotoUrl;
            wantsToGoTo.style.display = 'flex'; 
        }  
        
        // We found a signature.
        if(msg.reconresult == false) {
            wantsToGoTo.style.display = 'none';
            launchReload.style.display = 'none';      
        }
        
        if(msg.status == 'undefined') {
            msg.error = 'DNS failed lookup.';
            errorMsgStatus.textContent = msg.error;
        }
        
        // Found a status, we might need a redirect.
        if(msg.status && msg.status != 'ERR') {
            
            gotoUrl = sanitizeUrl(msg.to);
            if (['301','302','303','307','308'].includes(msg.status)) { 
                wantsToGoTo.textContent = 'Wants to go to: \n\n' + gotoUrl;
                wantsToGoTo.style.display = 'flex'; 
                launchReload.style.display = 'flex';
            }  
            
            launchReload.onclick = ()=> { 
                if(gotoUrl) {
                    urlInput.value = sanitizeUrl(gotoUrl);
                    whatIsAllowed(gotoUrl);
                    } else {
                    whatIsAllowed(urlInput.value);
                }
            }
        }
        
        // Format message.
        let formatted = formatErrorMessage(escHtml(msg.error));
        
        loadingState.className = 'loading-state';
        loadingStateLive.className = 'loading-state-live';
        errorExplainer.innerHTML = formatted;
        errorState.className = 'error-state active';
        statusDomain.textContent = 'error';
        launchReport.style.display = 'flex';
        liveWebview.src = 'about:blank';
    }

    function updateNavButtons() {
        btnBack.disabled = navIndex <= 0;
        btnFwd.disabled = navIndex >= navHistory.length - 1;
    }

    // link panel
    function setLinks(links) {
        allLinks = links || [];
        linkCount.textContent = allLinks.length;
        statusLinks.textContent = allLinks.length + ' links';
        renderLinks();
    }

    function renderLinks() {
        var filter = filterInput.value.toLowerCase();

        var filtered = allLinks.filter(function(l) {
            var tabOk =
                currentTab === 'all' ||
                currentTab === l.type ||
                (currentTab === 'other' && (l.type === 'mailto' || l.type === 'download' || l.type === 'anchor'));
            var filterOk = !filter ||
                l.label.toLowerCase().includes(filter) ||
                l.href.toLowerCase().includes(filter);
            return tabOk && filterOk;
        });

        if (filtered.length === 0) {
            linkList.innerHTML = '<div class="panel-empty">' +
                '<span style="font-size:20px;opacity:0.3">&#9135;</span>' +
                (allLinks.length === 0 ? 'no links yet' : 'no matches') +
                '</div>';
            return;
        }

        var html = '';

        filtered.forEach(function(link) {
            var safeHref = sanitizeUrl(link.href);
            if (!safeHref) return;

            var dotClass = 'dot-' + escHtml(link.type);
            var badge = '';
            if (link.type === 'external') badge = '<span class="link-badge badge-ext">ext</span>';
            else if (link.type === 'mailto') badge = '<span class="link-badge badge-mail">mail</span>';
            else if (link.type === 'download') badge = '<span class="link-badge badge-dl">dl</span>';
            else if (link.type === 'anchor') badge = '<span class="link-badge badge-anc">#</span>';

            var displayHref = safeHref.length > 42 ? safeHref.slice(0, 40) + '...' : safeHref;

            html += '<div class="link-item" data-href="' + escAttr(safeHref) + '" data-type="' + escAttr(link.type) + '">' +
                '<div class="link-type-dot ' + escHtml(dotClass) + '"></div>' +
                '<div class="link-content">' +
                '<div class="link-label">' + escHtml(link.label) + '</div>' +
                '<div class="link-url">' + escHtml(displayHref) + '</div>' +
                '</div>' +
                badge +
                '</div>';
        });

        linkList.innerHTML = html;

        linkList.querySelectorAll('.link-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var href = item.getAttribute('data-href');
                var type = item.getAttribute('data-type');
                var url = sanitizeUrl(href);
                if (!url) return;
                if (type === 'anchor') return;
                if (type === 'mailto' || type === 'download') {
                    //window.surfview.openExternal(url);
                    return;
                }
                whatIsAllowed(url);
            });
        });
    }

    function formatErrorMessage(errorString) {

      let sep = '-----------------------------------------------------';
      errorString = '<div class="error-detail-container">' +  errorString;
      errorString = errorString.replaceAll('\n\n','\n'+sep+sep+'\n');
      errorString = errorString + '<div>';
      return errorString;

    }

    // sanitize a url, returns null if invalid or unsafe
    function sanitizeUrl(raw) {

        var url = String(raw).trim();

        // pre-strip
        url = url.replaceAll(/[\x00-\x20\x7F]/gim, '');
        url = url.replaceAll(/[(){}\[\]`]/g, '');

        // block dangerous schemes entirely
        var blocked = /^(javascript|data|vbscript|file|about|mailto|mailbox|settings|chrome|blob|xlink|navigation|navigator|window):/gi;
        if (blocked.test(url)) return null;

        // ensure http or https scheme
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        // validate it parses as a real URL
        try {
            var parsed = new URL(url);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                return null;
            }
            // strip null bytes and control characters after normalization
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

    function escHtml(s) {
        return String(s)
            .replaceAll(/&/gim, '&amp;')
            .replaceAll(/</gim, '&lt;')
            .replaceAll(/>/gim, '&gt;')
            .replaceAll(/"/gim, '&quot;');
    }

    function escAttr(s) {
        return String(s).replaceAll(/"/gim, '&quot;').replaceAll(/'/gim, '&#39;');
    }

    // resize handle
    var resizing = false;
    var resizeStartX = 0;
    var panelStartW = 280;

    document.getElementById('resizeHandle').addEventListener('mousedown', function(e) {
        resizing = true;
        resizeStartX = e.clientX;
        panelStartW = document.getElementById('sidePanel').offsetWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e) {
        if (!resizing) return;
        var delta = resizeStartX - e.clientX;
        var newW = Math.max(180, Math.min(520, panelStartW + delta));
        document.getElementById('sidePanel').style.width = newW + 'px';
    });

    document.addEventListener('mouseup', function() {
        if (resizing) {
            resizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

})();

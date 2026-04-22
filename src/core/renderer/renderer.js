// src/core/renderer/renderer.js
// Runs in the sandboxed Electron renderer process.
// Communicates with main only via window.surfview (exposed by preload.js).
// Never touches the network directly.

// disable anon function when debugging:

//(function() {

    'use strict';
    
    // Reset PWM session.
    window.surfview.setValue('sessionPWM', 'reset');

    // state
    var allLinks = [];
    var currentTab = 'all';
    var navHistory = [];
    var navIndex = -1;
    var loading = false;
    let loadTimeout = null;
    var imageModeEnabled = false;
    var webscannerEnabled = false;
    var privacyEnabled = true;
    var selectedBookmarkFolder = null;
    
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
    var searchBox = document.getElementById('searchBox');
    var liveModeToggle = document.getElementById('liveModeToggle');
    var webscanner = document.getElementById('webscanner');
    var privacy = document.getElementById('privacy');
    var mainBar = document.getElementById('mainBar');
    var bookmarkMenu = document.getElementById('bookmarkMenu');
    var viewport = document.getElementById('viewport');
    var main = document.getElementById('main');
    var inputCreateFolder = document.getElementById('inputCreateFolder');
    var pwManager = document.getElementById('btnPasswordManager');
    var btnKey = document.getElementById('btnKey');
    
    let resized = false;
    let whx = window.innerHeight;
    let wwx = window.innerWidth;

    try {
        
        var liveModal = 'inactive';
        liveWarning.className = 'hideElement';

        errorExplainer.className = 'error-explainer hide';
        errorState.className = 'error-state hide';
        searchBox.className = 'search-box hide';
        
        // Set default to "live mode";
        setJSstyles(2);
    
        if(webscannerEnabled == true) webscanner.checked = true;
        if(privacyEnabled == true) privacy.checked = true;
        
        // Define the handler
        const onResize = () => {
            resized = true;
            whx = window.innerHeight;
            wwx = window.innerWidth;
        };

        // Function to setup listeners
        const setupListeners = () => {
            // First remove any existing listeners to prevent duplicates
            ['resize', 'fullscreenchange'].forEach(e => window.removeEventListener(e, onResize));

            // Then add new listeners
            ['resize', 'fullscreenchange'].forEach(e => window.addEventListener(e, onResize));
        };

        // Initial setup
        setupListeners();

        mainBar.addEventListener('mousedown', (event) => {
            // Bookmark click boundary.
            whx = window.innerHeight;
            wwx = window.innerWidth;
            if(event.button == 2 && event.clientX > 180 && event.clientX < (wwx-250)) {
                // Right click.
                window.surfview.showWindow(200,260,event.clientX,80,'src/core/forms/rightclick.html');
            }
        });

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

        pwManager.addEventListener('click', () => {
            let w = parseInt(window.innerWidth / 2);
            window.surfview.showWindow(600,500,w,150,'src/core/forms/password-manager.html');
        });
        
        // Close button
        document.getElementById('search-close').addEventListener('click', () => {
            document.getElementById('searchBox').className = 'hideElement';
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
            launchReport.className = 'launchReport hide';
            errorExplainer.className = 'error-explainer active';
            errorState.className = 'error-state hide';
        });

        liveWebview.addEventListener('will-navigate', (e) => {
            e.preventDefault();
            window.surfview.navigateIntercept(e.url);
            liveWebview.src = '';
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

        // bookmarking
        btnBookmark.addEventListener('click', function() {
            window.surfview.setValue('bookmark',urlInput.value.trim());
            window.surfview.addBookmark();
        });
        
        // pinbox
        btnKey.addEventListener('click', function() {
            window.surfview.loadPINbox();
        });

        window.surfview.checkPWMStatus().then(
            function(result) {
                if(result == false) {
                    btnKey.id = 'keyhide'; 
                }
            }
        );
        
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
            window.surfview.goBack();
        });

        btnFwd.addEventListener('click', function() {
            window.surfview.goForward();
        });

        btnReload.addEventListener('click', function() {
            liveWarning.className = 'hideElement';
            var url = sanitizeUrl(urlInput.value.trim());
            if (!url) return;
            whatIsAllowed(url);
        });

        liveWarningClose.addEventListener('click', function() {
            document.getElementById('liveWarning').className = 'hideElement';
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
    
    } catch(e) { console.log(e); }
    
    
    try {
    // focus urlbar by default
    urlInput.focus();

    let rawUrl = urlInput.value.trim();
    let uri = sanitizeUrl(rawUrl);

    } catch (e) {}

    function getValue(val) {
        window.surfview.getValue(val);    
    }

    function setValue(name,val) {
        window.surfview.setValue(name,val);    
    }
    
    function removeLiveMessage() {
            
        if(window.getComputedStyle(liveWarning).display != 'none') {
            liveWarning.className = 'hideElement';
        } else if(liveModal == 'active') {
            liveWarning.className = 'hideElement';
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
    
    function decodeEntry(method,data,pin) {
        return window.surfview.decodeEntry(method,data,pin);
    }
    
    function updateTorLabel(enabled, ready) {
      // Remove all state classes first
      torLabel.classList.remove('tor-off', 'tor-connected', 'tor-connecting');
      if (!enabled) {
        torLabel.textContent = 'Tor: off';
        torLabel.classList.add('tor-off');
      } else if (ready) {
        torLabel.textContent = 'Tor: connected';
        torLabel.classList.add('tor-connected');
      } else {
        torLabel.textContent = 'Tor: connecting...';
        torLabel.classList.add('tor-connecting');
      }
    }
    
    function setJSstyles(status) {
 
        /*
            1: js enabled = image mode off, live mode on.
            2: js disabled = image mode on, or live mode on.
            3: image mode enabled = js and live mode off.
            4: live mode enabled = image and live mode off.
        */
    
        if(status == 1) {
            // js on.
            statusJS.checked = true;
            setShield(false);
            liveWarning.className = 'hideElement';
            liveWrap.className = 'live-wrap hide';
            window.surfview.setJS(true);
            window.surfview.setImageMode(false);
            imageModeEnabled = false;
            imageModeToggle.checked = false;
            liveModeToggle.checked = true;
            webscannerEnabled = true;
            webscanner.checked = true;
            privacyEnabled = true;
            privacy.checked = true;
        } else if(status == 2) {
            // Live mode
            pageImageWrap.className = 'page-image-wrap';
            emptyState.className = 'empty-state hide';
            liveWarning.className = 'showElement';
            liveWrap.className = 'live-wrap active';
            jsEnabled1 = false;
            statusJS.checked = false;
            setShield(false);
            liveWarning.className = 'showElement';
            liveWrap.className = 'live-wrap active';
            window.surfview.setJS(false,'on');
            window.surfview.setImageMode(false);
            imageModeEnabled = false;
            imageModeToggle.checked = false;
            liveModeToggle.checked = true;
            statusTime.textContent = ''; 
            webscannerEnabled = false;
            webscanner.checked = false;            
        } else {
            // Image only
            liveWrap.className = 'live-wrap hide';
            liveModal = 'active';
            jsEnabled1 = false;
            statusJS.checked = false;
            setShield(true);
            liveWarning.className = 'showElement';
            liveWrap.className = 'live-wrap active';
            window.surfview.setJS(false,'on');
            window.surfview.setImageMode(true);
            imageModeEnabled = true;
            imageModeToggle.checked = true;
            liveModeToggle.checked = false;
            webscannerEnabled = false;
            webscanner.checked = false;
        }
    }
    
    try {
        
        statusJS.addEventListener('click', () => {

            if(jsEnabled1 == false) {
                jsEnabled1 = true;
                } else if(jsEnabled1 == true) {
                jsEnabled1 = false;
            }
              
            if(jsEnabled1 == true) { 
                setJSstyles(1);
                } else {
                setJSstyles(2);
            }
            
        });

        // Live mode toggle
        liveModeToggle.addEventListener('change', function() {
            if(liveModeToggle.checked == true) {
                setJSstyles(2);
                } else {
                setJSstyles(3);
            }
        });

        // Webscanner mode toggle
        webscanner.addEventListener('change', function() {
            if(webscanner.checked == true) {
                webscannerEnabled = true;
                window.surfview.setWebscanner(true);
                } else {
                webscannerEnabled = false;
                window.surfview.setWebscanner(false);
            }
        });

        // Privacy mode toggle
        privacy.addEventListener('change', function() {
            if(privacy.checked == true) {
                privacyEnabled = true;
                window.surfview.setPrivacy(true);
                } else {
                privacyEnabled = false;
                window.surfview.setPrivacy(false);
            }
        });
        
        // image mode toggle
        imageModeToggle.addEventListener('change', function() {

            imageModeEnabled = this.checked;
            var rawUrl = urlInput.value.trim();

            if (imageModeEnabled) {
                
                // Image mode
                setJSstyles(3);
                
                if(liveModal != 'active') {
                    setShield(true);
                    } else {
                    setShield(false);   
                }
                
                setShield(true);
                
            } else {
                // Live mode.
                setJSstyles(2);
                setLinks([]);
            }
        });
    
        torSwitch.addEventListener('change', async () => {
            const enabled = torSwitch.checked;
            torSwitch.disabled = true;
            updateTorLabel(enabled, false);

            if(enabled) {
                setJSstyles(2);
            }

            const result = await window.surfview.toggleTor(enabled);
            updateTorLabel(result.torEnabled, result.torEnabled ? result.ok : false);
            // If turning on, poll until connected
            if (result.torEnabled && result.ok) {
                updateTorLabel(true, true);
            }

            torSwitch.disabled = false;
        });

        // Poll status until ready on startup
        const torPoll = setInterval(async () => {
            const status = await window.surfview.torStatus();
            updateTorLabel(status.enabled, status.ready);
            if (status.ready || !status.enabled) clearInterval(torPoll);
        }, 1000);

        // keyboard shortcut: Ctrl+L / Cmd+L to focus url bar
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                urlInput.focus();
                urlInput.select();
            }
        });
    
    } catch(e) { console.log(e); }
    
    function setShield(safe) {
      // Remove old states
      shieldBadge.classList.remove('shield-safe', 'shield-danger');
      shieldDot.classList.remove('shield-safe', 'shield-danger');

      if (safe) {
        shieldBadge.classList.add('shield-safe');
        shieldDot.classList.add('shield-safe');
        shieldLabel.textContent = 'SAFE MODE';
      } else {
        shieldBadge.classList.add('shield-danger');
        shieldDot.classList.add('shield-danger');
        shieldLabel.textContent = 'LIVE MODE';
      }
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

        console.log();
        
        urlInput.value = url.replaceAll(/^https?:\/\//gi, '');

        liveWebview.className = 'live-webview hide';
        pageImage.className = 'page-image hide';
        
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
        
        window.surfview.renderUrl(url, viewType)
    }
        
        /*.then(function(result) {

            setLoadingUi(false);

            if(viewType == 'live' || viewType == 'js') {
                liveWrap.className = 'live-wrap active';
                liveWebview.className = 'live-webview active';
                } else {
                pageImageWrap.className = 'page-image-wrap';
                pageImage.className = 'page-image active';
            }

            if (!result.ok) {
                showError(result);
                return;
            }

            if (isNavigation) {
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

    */

    function setLoadingUi(on,type) {
        
        removeLiveMessage();
        
        liveWebview.src = '';
        
        emptyState.className = 'empty-state hide';
        errorState.className = 'error-state hide';
        errorExplainer.className = 'error-explainer hide';
        
        if(type == "live") {
            loadingState.className = 'loading-state hide';
            loadingStateLive.className = 'loading-state-live active';
            ['live-step1', 'live-step2', 'live-step3', 'live-step4'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.className = 'loading-step-live';
            });
            } else {
            loadingStateLive.className = 'loading-state-live hide';
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
            liveWrap.className = 'live-wrap active'; // show live wrap
            //setWebviewURL(result.url);
            liveWebview.src = result.url;
            // reset image to blank.
            pageImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        } else {
            // show screenshot, hide webview
            liveWebview.src = '';
            liveWrap.className = 'live-wrap hide'; // hide live wrap
            pageImageWrap.className = 'page-image-wrap active'; // show image wrap
            pageImage.src = 'data:image/png;base64,' + result.imageBase64;
            pageImage.className = 'page-image active';
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
                launchReload.className = 'launchReload active';
            }
        }

        // Compare if double requests are made.
        if(msg.original) {
            
            var a = sanitizeUrl(msg.original);
            var b = sanitizeUrl(urlInput.value);
            
            a = new URL(a).hostname
            b = new URL(b).hostname
            
            if(a != b) {
                wantsToGoTo.className = 'toGoTo hide';
                launchReload.className = 'launchReload hide';
            }
        }
        
        var gotoUrl = msg.to;
        
        // console.log(msg);
        
        // Not a redirect.
        if(!msg.redirect || msg.redirect == false) {
            wantsToGoTo.className = 'toGoTo hide';
            launchReload.className = 'launchReload hide';
        }
        
        if(msg.redirect) {
            gotoUrl = sanitizeUrl(msg.to);
            wantsToGoTo.textContent = 'Wants to go to: \n\n' + gotoUrl;
            wantsToGoTo.className = 'toGoTo active';            
        }  
        
        // We found a signature.
        if(msg.reconresult == false) {
            wantsToGoTo.className = 'toGoTo hide';
            launchReload.className = 'launchReload hide';     
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
                wantsToGoTo.className = 'toGoTo active';
                launchReload.className = 'launchReload active';
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
        launchReport.className = 'launchReport active';
        liveWebview.src = '';
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
                '<span id="panelSymbol">&#9135;</span>' +
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

    function sanitizeUrl(input, method=false) {

        input = String(input).trim();

        const schemes = new RegExp(
            "^(javascript|data|vbscript|file|about|chrome|" + 
            "settings|mailto|mailbox|blob|xlink|navigation|" +
            "navigator|window):", "gi"
        );
        
        if (schemes.test(input)) {
            input = input.replaceAll(schemes, '');
        }
        
        const replacer = (str) => {
            try {
                str = str.replace(/^http:\/\//gi,'');
                str = str.replace(/^https:\/\//gi,'');
                str = str.replace(/^www\./gi, '');
                return str;
            } catch {
                return str;
            }
        };
        
        const base = (str) => {
            try {
                str = replacer(str);
                str = new URL('https://' + str);
                return str.hostname;
            } catch {
                return str;
            }
        };

        switch (method) {
            case 'base':
            case 'host':
                return base(input);

            case 'domain':
                return 'www.' + base(input);
                
            case 'hyperlink':
                return 'https://www.' + replacer(input);

            case 'secure':
            case 'ssl':
            case 'https':
                return input.replace(/^http:\/\//gi, 'https://');
            case 'sanitize': 
                input = input.replaceAll(/[\x00-\x1F\x7F]/gim, '');
                input = input.replaceAll(/[(){}\[\]`]/gi, '');
                input = input.replaceAll(/%00|%1F|%0D|%0A/gi, '');
                input = replacer(input);
                return 'https://' + input;
                
            default:
                input = input.replaceAll(/[\x00-\x1F\x7F]/gim, '');
                input = input.replaceAll(/[(){}\[\]`]/gi, '');
                input = input.replaceAll(/%00|%1F|%0D|%0A/gi, '');
                input = replacer(input);
                return 'https://' + input;
        }
        return input;
    }

    function escHtml(s) {
        return String(s)
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
        .replaceAll('`', '&#96;');
    }

    function escAttr(s) {
        return String(s).replaceAll(/"/gim, '&quot;').replaceAll(/'/gim, '&#39;');
    }

    try {
        
        // resize handle
        var resizing = false;
        var resizeStartX = 0;
        var panelStartW = 280;

        document.getElementById('resizeHandle').addEventListener('mousedown', function(e) {
            resizing = true;
            resizeStartX = e.clientX;
            panelStartW = document.getElementById('sidePanel').offsetWidth;
            document.body.classList.add('resizing');
        });

        document.addEventListener('mousemove', function(e) {
            if (!resizing) return;
            var delta = resizeStartX - e.clientX;
            var newW = Math.max(180, Math.min(520, panelStartW + delta));
            // document.getElementById('sidePanel').style.width = newW + 'px';
            const panel = document.getElementById('sidePanel');
            panel.style.setProperty('--side-panel-width', newW + 'px');
        });

        document.addEventListener('mouseup', function() {
            if (resizing) {
                resizing = false;
                document.body.classList.remove('resizing');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchBox').className = 'search-box active';
                document.getElementById('search-input').focus();
            }
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            const searchBox = document.getElementById('search-input');
            if (searchBox) {
              window.surfview.stopSearchInWebview();
              searchBox.closest('div').remove();
            }
          }
        });
    
    } catch(e) { }
    
    // bookmarking urls

    function shortUrl(url) {
        return url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]; // domain only
    }

    function bookmarkUrl(folder) {
        
        window.surfview.getValue('bookmark').then(function(raw) {

        console.log(folder);
        console.log(raw);
        
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
        
        window.surfview.saveBookmark(folder,raw).then(function(result) {
            
            if(result.success == true) {

                if(folder == 'bookmarksbar') {
                    
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
                }
            
            } else {
                
                if (result.reason == 'duplicate') {
                    window.surfview.dialog('Bookmark already exists.');
                    } else if (result.reason == 'limit') {
                    window.surfview.dialog('Bookmark limit reached.');
                    } else {
                    window.surfview.dialog('Failed to add bookmark.');
                }
            }
            
        }).catch(function(err) {
            window.surfview.dialog('Failed to add bookmark.');
        });

        });
        
        return;
    }
 
    function loadBookmarks() {
        
        try {
            
            window.surfview.readBookmarks().then(function(urls) {
                
            try { 
            
            const dom = document.getElementById('bookmarks-ul');
            
            dom.innerHTML = '';
           

            for (const [key, array] of Object.entries(urls)) {
                
                if(JSON.stringify(key) == "bookmarksbar") {
                  
                    if(array.length >=1) {
                        
                        array.forEach(function(url) {
                            
                            const pipe = document.createElement('li');
                            pipe.appendChild(document.createTextNode('/'));
                            const li = document.createElement('li');
                            const a = document.createElement('a');
                            
                            a.href = '#';
                            a.onclick = function(e) {
                                e.preventDefault();
                                whatIsAllowed(url);
                            };
                            
                            a.appendChild(document.createTextNode(shortUrl(url)));
                            li.appendChild(a);
                            dom.appendChild(pipe);
                            dom.appendChild(li);
                            
                        });
                    }
                
                } else {
                  
                    if(array.length >=0) {

                        let fold = document.createElement('li'); 
                        fold.className = 'book-folder'; 
                        let a = document.createElement('a');
                        a.onclick = function(e) {
                            e.preventDefault();
                            a.id = key;
                            window.surfview.showBookList(this.id);
                            e.stopPropagation();
                            window.focus();
                            document.body.focus();
                        };
                        
                        a.innerHTML = '<span class="foldericon">🗀</span>' + ' ' +key
                        fold.appendChild(a);
                        dom.appendChild(fold);    
                    }
              }
              
            }

            } catch(e) { console.log(e); }

            });
        
        } catch(e) { console.log(e); }
    }

    function removeBookmark(url) {
        
        var box = document.getElementById('confirmBox');
        document.getElementById('confirmMsg').textContent = 'Remove ' + sanitizeUrl(shortUrl(url)) + '?';
        box.className = 'confirm-box active';
        document.getElementById('confirmYes').onclick = function() {
            box.className = 'confirm-box hide';
            window.surfview.removeBookmark(url).then(function(ok) {
                if (ok) loadBookmarks();
            });
        };
        
        document.getElementById('confirmNo').onclick = function() {
            box.className = 'confirm-box hide';
        };
    }
 
    // call it when the page loads
    loadBookmarks();

// disable anon function when debugging:
 
//})();
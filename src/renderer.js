// src/renderer.js
// Runs in the sandboxed Electron renderer process.
// Communicates with main only via window.surfview (exposed by preload.js).
// Never touches the network directly.

(function() {
  'use strict';

  // -- state
  var allLinks = [];
  var currentTab = 'all';
  var navHistory = [];
  var navIndex = -1;
  var loading = false;
  var imageModeEnabled = true;

  // -- elements
  var urlInput         = document.getElementById('urlInput');
  var btnRender        = document.getElementById('btnRender');
  var btnBack          = document.getElementById('btnBack');
  var btnFwd           = document.getElementById('btnFwd');
  var btnReload        = document.getElementById('btnReload');
  var emptyState       = document.getElementById('emptyState');
  var loadingState     = document.getElementById('loadingState');
  var errorState       = document.getElementById('errorState');
  var errorMsg         = document.getElementById('errorMsg');
  var pageImageWrap    = document.getElementById('pageImageWrap');
  var pageImage        = document.getElementById('pageImage');
  var liveWrap         = document.getElementById('liveWrap');
  var liveWebview      = document.getElementById('liveWebview');
  var liveWarningClose = document.getElementById('liveWarningClose');
  var linkList         = document.getElementById('linkList');
  var linkCount        = document.getElementById('linkCount');
  var filterInput      = document.getElementById('filterInput');
  var statusSafe       = document.getElementById('statusSafe');
  var statusDomain     = document.getElementById('statusDomain');
  var statusTitle      = document.getElementById('statusTitle');
  var statusLinks      = document.getElementById('statusLinks');
  var statusTime       = document.getElementById('statusRenderTime');
  var shieldBadge      = document.getElementById('shieldBadge');
  var shieldDot        = document.getElementById('shieldDot');
  var shieldLabel      = document.getElementById('shieldLabel');
  var modeLabel        = document.getElementById('modeLabel');
  var imageModeToggle  = document.getElementById('imageModeToggle');

  // -- url bar events
  urlInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loadUrl(urlInput.value);
  });

  btnRender.addEventListener('click', function() {
    loadUrl(urlInput.value);
  });

  btnBack.addEventListener('click', function() {
    if (navIndex <= 0) return;
    navIndex--;
    urlInput.value = navHistory[navIndex];
    loadUrl(navHistory[navIndex], true);
  });

  btnFwd.addEventListener('click', function() {
    if (navIndex >= navHistory.length - 1) return;
    navIndex++;
    urlInput.value = navHistory[navIndex];
    loadUrl(navHistory[navIndex], true);
  });

  btnReload.addEventListener('click', function() {
    var url = urlInput.value.trim();
    if (!url) return;
    if (imageModeEnabled) {
      loadUrl(url, true);
    } else {
      liveWebview.reload();
    }
  });

  liveWarningClose.addEventListener('click', function() {
    document.getElementById('liveWarning').style.display = 'none';
  });

  // -- webview navigation events: keep url bar in sync
  liveWebview.addEventListener('did-navigate', function(e) {
    var url = e.url;
    if (url && url !== 'about:blank') {
      urlInput.value = url.replace(/^https?:\/\//i, '');
      try {
        statusDomain.textContent = new URL(url).hostname;
      } catch(_) {}
    }
  });

  liveWebview.addEventListener('did-navigate-in-page', function(e) {
    var url = e.url;
    if (url && url !== 'about:blank') {
      urlInput.value = url.replace(/^https?:\/\//i, '');
    }
  });

  liveWebview.addEventListener('page-title-updated', function(e) {
    statusTitle.textContent = e.title ? '- ' + e.title : '';
  });

  // -- filter + tabs
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

  // -- image mode toggle
  imageModeToggle.addEventListener('change', function() {
    imageModeEnabled = this.checked;
    var url = urlInput.value.trim();

    if (imageModeEnabled) {
      // switching to image mode
      setShield(true);
      // hide live webview and stop it
      liveWrap.className = 'live-wrap';
      liveWebview.src = 'about:blank';
      // re-render current url as image if one is loaded
      if (url) {
        loadUrl(url, true);
      }
    } else {
      // switching to live mode
      setShield(false);
      // hide image states, show webview
      pageImageWrap.className = 'page-image-wrap';
      emptyState.style.display = 'none';
      loadingState.className = 'loading-state';
      errorState.className = 'error-state';
      liveWrap.className = 'live-wrap active';
      document.getElementById('liveWarning').style.display = 'flex';
      // navigate webview to current url
      if (url) {
        var fullUrl = 'https://' + url.replace(/^https?:\/\//i, '');
        liveWebview.src = fullUrl;
        statusDomain.textContent = 'loading...';
        statusTime.textContent = '';
      }
      // link panel not available in live mode
      setLinks([]);
    }
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
      statusSafe.textContent = '+ scripts blocked';
    } else {
      shieldBadge.style.borderColor = 'rgba(240,74,106,0.2)';
      shieldBadge.style.color = 'var(--danger)';
      shieldDot.style.background = 'var(--danger)';
      shieldDot.style.boxShadow = '0 0 6px var(--danger)';
      shieldLabel.textContent = 'LIVE MODE';
      modeLabel.textContent = 'live mode';
      statusSafe.className = 'status-item status-warn';
      statusSafe.textContent = '! scripts active';
    }
  }

  // -- keyboard shortcut: Ctrl+L / Cmd+L to focus url bar
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      urlInput.focus();
      urlInput.select();
    }
  });

  // -- main load function
  function loadUrl(raw, isNavigation) {
    var url = raw.trim();
    if (!url) return;

    // strip scheme prefix since url bar shows its own prefix label
    url = url.replace(/^https?:\/\//i, '');
    urlInput.value = url;

    // in live mode just point the webview at the url directly
    if (!imageModeEnabled) {
      var fullUrl = 'https://' + url;
      liveWebview.src = fullUrl;
      statusDomain.textContent = 'loading...';
      if (!isNavigation) {
        navHistory.splice(navIndex + 1);
        navHistory.push(url);
        navIndex = navHistory.length - 1;
      }
      updateNavButtons();
      return;
    }

    // image mode: go through Puppeteer pipeline in main process
    if (loading) return;
    loading = true;
    setLoadingUi(true);

    // animate steps visually while waiting for IPC response
    var steps = ['step1','step2','step3','step4','step5'];
    var delays = [0, 200, 400, 600, 800];
    steps.forEach(function(id, i) {
      setTimeout(function() {
        if (i > 0) {
          var prev = document.getElementById(steps[i - 1]);
          if (prev) prev.className = 'loading-step done';
        }
        var el = document.getElementById(id);
        if (el) el.className = 'loading-step active-step';
      }, delays[i]);
    });

    window.surfview.renderUrl(url).then(function(result) {
      loading = false;
      setLoadingUi(false);

      if (!result.ok) {
        showError(result.error);
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
      showError(err.message || 'Unknown error');
    });
  }

  function setLoadingUi(on) {
    btnRender.disabled = on;
    btnReload.disabled = on;
    emptyState.style.display = 'none';
    errorState.className = 'error-state';
    pageImageWrap.className = 'page-image-wrap';
    liveWrap.className = 'live-wrap';
    loadingState.className = on ? 'loading-state active' : 'loading-state';

    if (on) {
      ['step1','step2','step3','step4','step5'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.className = 'loading-step';
      });
      setLinks([]);
      statusDomain.textContent = 'loading...';
      statusTitle.textContent = '';
      statusTime.textContent = '';
    }
  }

  function showPage(result) {
    loadingState.className = 'loading-state';
    pageImageWrap.className = 'page-image-wrap active';
    pageImage.src = 'data:image/png;base64,' + result.imageBase64;

    setLinks(result.links);

    try {
      var domain = new URL('https://' + result.url.replace(/^https?:\/\//, '')).hostname;
      statusDomain.textContent = domain;
    } catch(e) {
      statusDomain.textContent = result.url || '';
    }

    statusTitle.textContent = result.title ? '- ' + result.title : '';
    statusTime.textContent = result.renderMs + 'ms';
  }

  function showError(msg) {
    loadingState.className = 'loading-state';
    errorMsg.textContent = msg;
    errorState.className = 'error-state active';
    statusDomain.textContent = 'error';
  }

  function updateNavButtons() {
    btnBack.disabled = navIndex <= 0;
    btnFwd.disabled = navIndex >= navHistory.length - 1;
  }

  // -- link panel
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
      linkList.innerHTML = '<div class="panel-empty">'
        + '<span style="font-size:20px;opacity:0.3">&#9135;</span>'
        + (allLinks.length === 0 ? 'no links yet' : 'no matches')
        + '</div>';
      return;
    }

    var html = '';
    filtered.forEach(function(link) {
      var dotClass = 'dot-' + link.type;
      var badge = '';
      if (link.type === 'external') badge = '<span class="link-badge badge-ext">ext</span>';
      else if (link.type === 'mailto') badge = '<span class="link-badge badge-mail">mail</span>';
      else if (link.type === 'download') badge = '<span class="link-badge badge-dl">dl</span>';
      else if (link.type === 'anchor') badge = '<span class="link-badge badge-anc">#</span>';

      var displayHref = link.href.length > 42 ? link.href.slice(0, 40) + '...' : link.href;

      html += '<div class="link-item" data-href="' + escAttr(link.href) + '" data-type="' + link.type + '">'
        + '<div class="link-type-dot ' + dotClass + '"></div>'
        + '<div class="link-content">'
        + '<div class="link-label">' + escHtml(link.label) + '</div>'
        + '<div class="link-url">' + escHtml(displayHref) + '</div>'
        + '</div>'
        + badge
        + '</div>';
    });

    linkList.innerHTML = html;

    linkList.querySelectorAll('.link-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var href = item.getAttribute('data-href');
        var type = item.getAttribute('data-type');
        if (type === 'anchor') return;
        if (type === 'mailto' || type === 'download') {
          window.surfview.openExternal(href);
          return;
        }
        var clean = href.replace(/^https?:\/\//i, '');
        urlInput.value = clean;
        loadUrl(clean);
      });
    });
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // -- resize handle
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
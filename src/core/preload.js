// src/core/preload.js
// This is the only bridge between the sandboxed renderer and the main process.
// We expose only the exact functions the UI needs, nothing else.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('surfview', {
  // ask main to render a URL, returns { ok, imageBase64, links, title, url, renderMs, error }
  renderUrl: (url, viewType) => ipcRenderer.invoke('render-url', url, viewType),
  saveBookmark: (folder, url) => ipcRenderer.invoke('save-bookmark', folder, url),
  readBookmarks: () => ipcRenderer.invoke('read-bookmarks'),
  removeBookmark: (url) => ipcRenderer.invoke('remove-bookmark', url),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  toggleTor: (enabled) => ipcRenderer.invoke('toggle-tor', enabled),
  torStatus: () => ipcRenderer.invoke('tor-status'),
  setJS: (val) => ipcRenderer.invoke('set-js', val),
  setImageMode: (val) => ipcRenderer.invoke('set-image-mode', val),
  setWebscanner: (val) => ipcRenderer.invoke('set-webscanner', val),
  setPrivacy: (val) => ipcRenderer.invoke('set-privacy', val),
  dialog: (msg) => ipcRenderer.invoke('dialog', msg),
  navigateIntercept: (url) => ipcRenderer.invoke('intercept', url),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  onContextMenu: (callback) => ipcRenderer.on('context-menu', callback),
  searchInWebview: (text, options) => ipcRenderer.invoke('search-in-webview', text, options),
  stopSearchInWebview: () => ipcRenderer.invoke('stop-search-in-webview'),
  resizeBrowser: (w,h) =>  ipcRenderer.invoke('resizer',w,h),
  hideScreen: () => ipcRenderer.invoke('hideScreen'),
  showScreen: () => ipcRenderer.invoke('showScreen'),
  shrinkWindow: () => ipcRenderer.invoke('shrink-browserview'),
  expandWindow: () => ipcRenderer.invoke('expand-browserview'),
  showWindow: (w,h,x,y,f) => ipcRenderer.invoke('show-window',w,h,x,y,f),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  processForm: (type,value) => ipcRenderer.invoke('process-form', type, value),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  modalInspectDomain: () => ipcRenderer.invoke('modal-inspect-domain'),
  modalInspectDev: () => ipcRenderer.invoke('modal-inspect-dev'),
  modalSave: () => ipcRenderer.invoke('modal-save'),
  modalSource: () => ipcRenderer.invoke('modal-source'),
  modalFolder: () => ipcRenderer.invoke('modal-folder'),
  showBookList: (value) => ipcRenderer.invoke('booklist', value),
  loadBookmarkFolder: () => ipcRenderer.invoke('load-bookmark-folder'),
  loadFolders: () => ipcRenderer.invoke('load-folders'),
  addBookmark: () => ipcRenderer.invoke('add-bookmark'),
  getValue: (name) => ipcRenderer.invoke('get-value', name),
  setValue: (name, value) => ipcRenderer.invoke('set-value', name, value),
  loadPasswords: () => ipcRenderer.invoke('load-passwords'),
  unlockVault: (pw) =>  ipcRenderer.invoke('unlock-vault', pw),
  fetchPw: (pw) =>  ipcRenderer.invoke('fetch-pw', pw),
  getUrl: () =>  ipcRenderer.invoke('get-url'),
  initVault: (pw) =>  ipcRenderer.invoke('init-vault', pw),
  clearPass: (pw) =>  ipcRenderer.invoke('clear-pass', pw),
  addPass: (url, user, passwd, pin) =>   ipcRenderer.invoke('add-pass', url, user, passwd, pin),
  decryptEntry: (method,data,pin) =>   ipcRenderer.invoke('decrypt-entry-pwm', method,data,pin),
  getElementById: (id) => document.getElementById(id),
});

ipcRenderer.send('preload-ready');
// src/preload.js
// This is the only bridge between the sandboxed renderer and the main process.
// We expose only the exact functions the UI needs, nothing else.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('surfview', {
  // ask main to render a URL, returns { ok, imageBase64, links, title, url, renderMs, error }
  renderUrl: (url, viewType) => ipcRenderer.invoke('render-url', url, viewType),
  saveBookmark: (url) => ipcRenderer.invoke('save-bookmark', url),
  readBookmarks: () => ipcRenderer.invoke('read-bookmarks'),
  removeBookmark: (url) => ipcRenderer.invoke('remove-bookmark', url),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  toggleTor: (enabled) => ipcRenderer.invoke('toggle-tor', enabled),
  torStatus: () => ipcRenderer.invoke('tor-status'),
  setJS: (val) => ipcRenderer.invoke('set-js', val),
  dialog: (msg) => ipcRenderer.invoke('dialog', msg),
  navigateIntercept: (url) => ipcRenderer.invoke('intercept', url)
});

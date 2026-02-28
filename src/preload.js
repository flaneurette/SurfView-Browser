// src/preload.js
// This is the only bridge between the sandboxed renderer and the main process.
// We expose only the exact functions the UI needs, nothing else.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('surfview', {
  // ask main to render a URL, returns { ok, imageBase64, links, title, url, renderMs, error }
  renderUrl: (url) => ipcRenderer.invoke('render-url', url),
  // bookmark handler
  saveBookmark: (url) => ipcRenderer.invoke('save-bookmark', url),
  readBookmarks: (url) => ipcRenderer.invoke('read-bookmarks', url),
  removeBookmark: (url) => ipcRenderer.invoke('remove-bookmark', url),
  // open a URL in the user's real system browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});

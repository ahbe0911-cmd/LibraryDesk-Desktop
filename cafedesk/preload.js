const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cafeDesk', {
  copyText: (value) => ipcRenderer.invoke('clipboard:write', String(value || '')),
  getVersion: () => ipcRenderer.invoke('app:version'),
  setUiZoom: (percent) => ipcRenderer.invoke('ui:set-zoom', Number(percent || 100)),
  getDownloadFolder: () => ipcRenderer.invoke('downloads:get-folder'),
  chooseDownloadFolder: () => ipcRenderer.invoke('downloads:choose-folder'),
  openDownloads: () => ipcRenderer.invoke('downloads:open'),
  getCredentials: (url) => ipcRenderer.invoke('credentials:get', String(url || '')),
  saveCredential: (payload) => ipcRenderer.invoke('credentials:save', payload || {}),
  listCredentials: () => ipcRenderer.invoke('credentials:list'),
  deleteCredential: (payload) => ipcRenderer.invoke('credentials:delete', payload || {}),
  exportPageCapture: (webContentsId, label, format) => ipcRenderer.invoke('capture:export-page', Number(webContentsId), String(label || ''), String(format || 'jpg')),
  listDownloadFolder: (requestedPath) => ipcRenderer.invoke('files:list-download-folder', requestedPath || ''),
  openDownloadItem: (targetPath) => ipcRenderer.invoke('files:open-download-item', String(targetPath || '')),
  showDownloadItem: (targetPath) => ipcRenderer.invoke('files:show-download-item', String(targetPath || '')),
  openDownloadRoot: () => ipcRenderer.invoke('files:open-download-root'),
  showFileContextMenu: (targetPath, isDirectory) => ipcRenderer.invoke('files:context-menu', String(targetPath || ''), Boolean(isDirectory)),
  getMediaSourceId: (webContentsId) => ipcRenderer.invoke('capture:get-media-source-id', Number(webContentsId)),
  startRecordingFile: (label) => ipcRenderer.invoke('capture:recording-start', String(label || '')),
  appendRecordingChunk: (sessionId, chunk) => ipcRenderer.invoke('capture:recording-chunk', String(sessionId || ''), chunk),
  finishRecordingFile: (sessionId) => ipcRenderer.invoke('capture:recording-finish', String(sessionId || '')),
  abortRecordingFile: (sessionId) => ipcRenderer.invoke('capture:recording-abort', String(sessionId || '')),
  onGuestOpenTab: (callback) => {
    ipcRenderer.on('cafedesk:guest-open-tab', (_event, payload) => {
      if (typeof callback === 'function') callback(payload);
    });
  }
});

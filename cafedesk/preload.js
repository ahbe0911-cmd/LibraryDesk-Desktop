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
  getDownloadThumbnail: (targetPath) => ipcRenderer.invoke('files:get-thumbnail', String(targetPath || '')),
  openDownloadItems: (targetPaths) => ipcRenderer.invoke('files:open-download-items', Array.isArray(targetPaths) ? targetPaths : [targetPaths]),
  openDownloadItem: (targetPath) => ipcRenderer.invoke('files:open-download-item', String(targetPath || '')),
  showDownloadItem: (targetPath) => ipcRenderer.invoke('files:show-download-item', String(targetPath || '')),
  openDownloadRoot: () => ipcRenderer.invoke('files:open-download-root'),
  showFileContextMenu: (targetPaths) => ipcRenderer.invoke('files:context-menu', Array.isArray(targetPaths) ? targetPaths : [targetPaths]),
  printDownloadItems: (targetPaths) => ipcRenderer.invoke('files:print-download-items', Array.isArray(targetPaths) ? targetPaths : [targetPaths]),
  getPrinters: () => ipcRenderer.invoke('print:get-printers'),
  preparePrint: (webContentsId, options) => ipcRenderer.invoke('print:prepare', Number(webContentsId), options || {}),
  printGuest: (webContentsId, options) => ipcRenderer.invoke('print:guest', Number(webContentsId), options || {}),
  printGuestSystem: (webContentsId) => ipcRenderer.invoke('print:guest-system', Number(webContentsId)),
  repairSocialApp: (key) => ipcRenderer.invoke('social:repair', String(key || '')),
  onGuestOpenTab: (callback) => {
    ipcRenderer.on('cafedesk:guest-open-tab', (_event, payload) => {
      if (typeof callback === 'function') callback(payload);
    });
  },
  onDownloadStatus: (callback) => {
    ipcRenderer.on('cafedesk:download-status', (_event, payload) => {
      if (typeof callback === 'function') callback(payload);
    });
  }
});

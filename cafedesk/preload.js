const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cafeDesk', {
  copyText: (value) => ipcRenderer.invoke('clipboard:write', String(value || '')),
  getVersion: () => ipcRenderer.invoke('app:version'),
  setUiZoom: (percent) => ipcRenderer.invoke('ui:set-zoom', Number(percent || 100)),
  openDownloads: () => ipcRenderer.invoke('downloads:open'),
  getCredential: (url) => ipcRenderer.invoke('credentials:get', String(url || '')),
  saveCredential: (payload) => ipcRenderer.invoke('credentials:save', payload || {})
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cafeDesk', {
  copyText: (value) => ipcRenderer.invoke('clipboard:write', String(value || '')),
  getVersion: () => ipcRenderer.invoke('app:version'),
  setUiZoom: (percent) => ipcRenderer.invoke('ui:set-zoom', Number(percent || 100))
});

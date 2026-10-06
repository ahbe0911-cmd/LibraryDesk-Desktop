const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cafeSocial',{
  getDownloadFolder:()=>ipcRenderer.invoke('downloads:get-folder'),
  chooseDownloadFolder:()=>ipcRenderer.invoke('downloads:choose-folder'),
  openDownloadFolder:()=>ipcRenderer.invoke('downloads:open'),
  pinRight:()=>ipcRenderer.invoke('window:right-half'),
  checkForUpdates:()=>ipcRenderer.invoke('updates:check'),
  openUpdate:(url)=>ipcRenderer.invoke('updates:open',String(url||'')),
  onDownloadStatus:(callback)=>{
    const handler=(_event,payload)=>callback(payload);
    ipcRenderer.on('cafesocial:download-status',handler);
    return ()=>ipcRenderer.removeListener('cafesocial:download-status',handler);
  },
  onDownloadNeedsFolder:(callback)=>{
    const handler=(_event,payload)=>callback(payload);
    ipcRenderer.on('cafesocial:download-needs-folder',handler);
    return ()=>ipcRenderer.removeListener('cafesocial:download-needs-folder',handler);
  }
});

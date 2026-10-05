const { app, BrowserWindow, ipcMain, dialog, shell, session, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_NAME = 'CafeSocial';
const SETTINGS_FILE = 'settings.json';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
let mainWindow = null;
const configuredPartitions = new Set();

function settingsPath() {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}
function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath(),'utf8')) || {}; } catch { return {}; }
}
function writeSettings(value) {
  fs.mkdirSync(path.dirname(settingsPath()), {recursive:true});
  fs.writeFileSync(settingsPath(), JSON.stringify(value,null,2), 'utf8');
}
function selectedDownloadFolder() {
  const folder = String(readSettings().downloadFolder || '').trim();
  if (folder) {
    try { if (fs.statSync(folder).isDirectory()) return folder; } catch {}
  }
  return '';
}
function folderInfo() {
  const folder = selectedDownloadFolder();
  return {
    selected:Boolean(folder),
    path:folder,
    label:folder ? (path.basename(folder) || folder) : 'هنوز انتخاب نشده'
  };
}
function nextAvailable(folder, filename) {
  fs.mkdirSync(folder,{recursive:true});
  const safe = path.basename(String(filename || 'download'));
  let out = path.join(folder,safe);
  if (!fs.existsSync(out)) return out;
  const ext=path.extname(safe), stem=path.basename(safe,ext);
  for(let i=1;i<10000;i++){
    out=path.join(folder,`${stem} (${i})${ext}`);
    if(!fs.existsSync(out)) return out;
  }
  return path.join(folder,`${stem}-${Date.now()}${ext}`);
}
function configureSocialSession(ses){
  let partition='';
  try { partition=ses.getPartition() || 'default'; } catch { partition='default'; }
  if(configuredPartitions.has(partition)) return;
  configuredPartitions.add(partition);

  ses.setPermissionRequestHandler((_wc, permission, callback)=>{
    const allowed = new Set(['clipboard-read','clipboard-sanitized-write']);
    callback(allowed.has(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission)=>{
    if(permission==='notifications') return false;
    return ['clipboard-read','clipboard-sanitized-write'].includes(permission);
  });
  try { ses.spellCheckerEnabled=false; } catch {}

  ses.on('will-download', (event,item,sourceContents)=>{
    const folder=selectedDownloadFolder();
    if(!folder){
      event.preventDefault();
      const host=sourceContents?.hostWebContents || sourceContents;
      try { host?.send('cafesocial:download-needs-folder', {filename:item.getFilename()}); } catch {}
      return;
    }
    try { item.setSavePath(nextAvailable(folder,item.getFilename())); } catch {}
    item.once('done',(_e,state)=>{
      const host=sourceContents?.hostWebContents || sourceContents;
      try {
        host?.send('cafesocial:download-status',{
          state,
          filename:item.getFilename(),
          savePath:item.getSavePath()
        });
      } catch {}
    });
  });
}

function rightHalfBounds(){
  const display=screen.getPrimaryDisplay();
  const wa=display.workArea;
  const width=Math.floor(wa.width/2);
  return {x:wa.x+wa.width-width,y:wa.y,width,height:wa.height};
}
function createWindow(){
  const b=rightHalfBounds();
  mainWindow=new BrowserWindow({
    ...b,
    minWidth:520,
    minHeight:620,
    resizable:false,
    movable:false,
    maximizable:false,
    fullscreenable:false,
    show:false,
    autoHideMenuBar:true,
    title:APP_NAME,
    backgroundColor:'#eaf2f7',
    webPreferences:{
      preload:path.join(__dirname,'preload.js'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      webviewTag:true
    }
  });
  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname,'app','index.html'));
  mainWindow.once('ready-to-show',()=>mainWindow.show());
  mainWindow.on('closed',()=>{mainWindow=null;});
}
app.whenReady().then(()=>{
  app.setName(APP_NAME);
  createWindow();
  app.on('activate',()=>{if(!mainWindow) createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin') app.quit();});

app.on('web-contents-created',(_event,contents)=>{
  try {
    const partition=contents.session.getPartition() || '';
    if(partition.startsWith('persist:cafesocial-')){
      contents.setUserAgent(MOBILE_UA);
      configureSocialSession(contents.session);
      contents.setWindowOpenHandler(({url})=>{
        if(/^https?:/i.test(url)){
          contents.loadURL(url).catch(()=>{});
        } else if(/^(mailto|tel):/i.test(url)){
          shell.openExternal(url).catch(()=>{});
        }
        return {action:'deny'};
      });
    }
  } catch {}
});

ipcMain.handle('downloads:get-folder',()=>folderInfo());
ipcMain.handle('downloads:choose-folder',async(event)=>{
  const owner=BrowserWindow.fromWebContents(event.sender);
  const result=await dialog.showOpenDialog(owner || undefined,{
    title:'انتخاب پوشه ثابت دانلود شبکه‌های اجتماعی',
    defaultPath:selectedDownloadFolder() || app.getPath('downloads'),
    properties:['openDirectory','createDirectory']
  });
  if(result.canceled || !result.filePaths?.[0]) return {ok:false,canceled:true,...folderInfo()};
  const settings=readSettings();
  settings.downloadFolder=result.filePaths[0];
  writeSettings(settings);
  return {ok:true,canceled:false,...folderInfo()};
});
ipcMain.handle('downloads:open',async()=>{
  const folder=selectedDownloadFolder();
  if(!folder) return {ok:false,needsFolder:true};
  const message=await shell.openPath(folder);
  return {ok:!message,message:message || '',...folderInfo()};
});
ipcMain.handle('window:right-half',()=>{
  if(!mainWindow) return {ok:false};
  mainWindow.setBounds(rightHalfBounds(),true);
  return {ok:true};
});

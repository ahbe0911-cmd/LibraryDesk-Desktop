const { app, BrowserWindow, ipcMain, dialog, shell, session, screen, Menu, clipboard, net } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_NAME = 'CafeSocial';
const APP_VERSION = '1.0.2';
const UPDATE_API = 'https://api.github.com/repos/ahbe0911-cmd/LibraryDesk-Desktop/releases?per_page=30';
const SETTINGS_FILE = 'settings.json';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
let mainWindow = null;
const configuredPartitions = new Set();
const SOCIAL_KEYS = ['rubika','shad','eitaa','telegram'];

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
function parseCafeSocialVersion(tag) {
  const match = String(tag || '').match(/^cafesocial-v(\d+)\.(\d+)\.(\d+)$/i);
  return match ? match.slice(1).map(Number) : null;
}
function compareVersion(a,b){
  for(let i=0;i<3;i++){ if((a[i]||0)!==(b[i]||0)) return (a[i]||0)-(b[i]||0); }
  return 0;
}
async function checkForUpdates(){
  try{
    const response=await net.fetch(UPDATE_API,{headers:{'User-Agent':'CafeSocial/'+APP_VERSION,'Accept':'application/vnd.github+json'}});
    if(!response.ok) throw new Error('HTTP '+response.status);
    const releases=await response.json();
    const current=APP_VERSION.split('.').map(Number);
    const candidates=(Array.isArray(releases)?releases:[])
      .map(r=>({release:r,version:parseCafeSocialVersion(r.tag_name)}))
      .filter(x=>x.version)
      .sort((a,b)=>compareVersion(b.version,a.version));
    const latest=candidates[0];
    if(!latest) return {ok:true,updateAvailable:false,currentVersion:APP_VERSION};
    const updateAvailable=compareVersion(latest.version,current)>0;
    const asset=(latest.release.assets||[]).find(a=>/^CafeSocial-Setup-.*-Win10-x64\.exe$/i.test(a.name));
    return {
      ok:true,
      updateAvailable,
      currentVersion:APP_VERSION,
      latestVersion:latest.version.join('.'),
      downloadUrl:asset?.browser_download_url || latest.release.html_url || '',
      releaseUrl:latest.release.html_url || ''
    };
  }catch(error){
    return {ok:false,updateAvailable:false,currentVersion:APP_VERSION,message:error?.message || String(error)};
  }
}
function showSocialContextMenu(contents,params){
  const t=[];
  const edit=params.editFlags || {};
  if(params.isEditable){
    if(edit.canUndo)t.push({label:'واگرد',role:'undo',accelerator:'Ctrl+Z'});
    if(edit.canRedo)t.push({label:'از نو',role:'redo',accelerator:'Ctrl+Y'});
    if(t.length)t.push({type:'separator'});
    if(edit.canCut)t.push({label:'برش',role:'cut',accelerator:'Ctrl+X'});
    if(edit.canCopy)t.push({label:'کپی',role:'copy',accelerator:'Ctrl+C'});
    if(edit.canPaste)t.push({label:'چسباندن',role:'paste',accelerator:'Ctrl+V'});
    if(edit.canPaste){
      t.push({
        label:'چسباندن بدون قالب',
        accelerator:'Ctrl+Shift+V',
        click:()=>{try{contents.pasteAndMatchStyle();}catch{}}
      });
    }
    t.push({
      label:'ایموجی',
      accelerator:'Super+.',
      click:()=>{
        try{
          contents.focus();
          contents.sendInputEvent({type:'keyDown',keyCode:'.',modifiers:['meta']});
          contents.sendInputEvent({type:'keyUp',keyCode:'.',modifiers:['meta']});
        }catch{}
      }
    });
    if(edit.canSelectAll)t.push({label:'انتخاب همه',role:'selectAll',accelerator:'Ctrl+A'});
  }else if(params.selectionText){
    t.push({label:'کپی',role:'copy',accelerator:'Ctrl+C'});
    t.push({label:'انتخاب همه',role:'selectAll',accelerator:'Ctrl+A'});
  }
  const mediaUrl = String(params.srcURL || '');
  const linkUrl = String(params.linkURL || '');

  if(params.mediaType === 'image' && /^(https?:|blob:|data:)/i.test(mediaUrl)){
    if(t.length)t.push({type:'separator'});
    t.push({
      label:'دانلود تصویر',
      click:()=>{ try { contents.downloadURL(mediaUrl); } catch {} }
    });
    t.push({
      label:'کپی تصویر',
      role:'copyImage'
    });
  }

  if(linkUrl && /^(https?:|blob:)/i.test(linkUrl)){
    if(t.length)t.push({type:'separator'});
    t.push({label:'باز کردن لینک',click:()=>contents.loadURL(linkUrl).catch(()=>{})});
    t.push({
      label:'دانلود فایل / لینک',
      click:()=>{ try { contents.downloadURL(linkUrl); } catch {} }
    });
    t.push({label:'کپی آدرس لینک',click:()=>clipboard.writeText(linkUrl)});
  }
  if(t.length)t.push({type:'separator'});
  t.push({label:'بارگذاری مجدد',role:'reload'});
  t.push({label:'بررسی عنصر',click:()=>{try{contents.inspectElement(params.x,params.y);}catch{}}});
  Menu.buildFromTemplate(t).popup({window:BrowserWindow.fromWebContents(contents.hostWebContents || contents) || undefined});
}

function applyLockedDownloadPathToSession(ses) {
  const folder = selectedDownloadFolder();
  if (!folder || !ses) return false;
  try { fs.mkdirSync(folder,{recursive:true}); } catch {}
  try {
    ses.setDownloadPath(folder);
    return true;
  } catch {
    return false;
  }
}
function applyLockedDownloadPathToAllSocialSessions() {
  const folder = selectedDownloadFolder();
  if (!folder) return;
  for (const key of SOCIAL_KEYS) {
    try {
      const ses = session.fromPartition('persist:cafesocial-' + key);
      applyLockedDownloadPathToSession(ses);
    } catch {}
  }
}

function configureSocialSession(ses){
  let partition='';
  try { partition=ses.getPartition() || 'default'; } catch { partition='default'; }

  // Always refresh the Chromium-level download directory, even for an
  // already configured social session. This mirrors Chrome's fixed download
  // folder behavior and suppresses Save As after the user chooses the folder.
  applyLockedDownloadPathToSession(ses);

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
    const lockedPath = nextAvailable(folder,item.getFilename());
    try { item.setSavePath(lockedPath); } catch {}
    try { item.savePath = lockedPath; } catch {}
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
    icon:path.join(__dirname,'build','icon.png'),
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
  // Configure all persistent social sessions before any webview starts.
  // This prevents Chromium from ever falling back to its Save As prompt.
  for (const key of SOCIAL_KEYS) {
    try { configureSocialSession(session.fromPartition('persist:cafesocial-' + key)); } catch {}
  }
  applyLockedDownloadPathToAllSocialSessions();
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
      contents.on('context-menu',(_event,params)=>showSocialContextMenu(contents,params));
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

  // Apply immediately to every social session. The user should never have to
  // restart CafeSocial after choosing the download folder.
  applyLockedDownloadPathToAllSocialSessions();

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


ipcMain.handle('updates:check',()=>checkForUpdates());
ipcMain.handle('updates:open',async(_event,url)=>{
  const target=String(url||'');
  if(!/^https:\/\/(github\.com|objects\.githubusercontent\.com|github-releases\.githubusercontent\.com)/i.test(target)) return {ok:false};
  await shell.openExternal(target);
  return {ok:true};
});

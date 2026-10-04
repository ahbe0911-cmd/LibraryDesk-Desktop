const { app, BrowserWindow, ipcMain, clipboard, session, shell } = require('electron');
const path = require('path');

app.setName('CafeDesk');

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

function clampZoom(percent) {
  const value = Number(percent);
  if (!Number.isFinite(value)) return 1;
  return Math.min(1.5, Math.max(0.5, value / 100));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    backgroundColor: '#091321',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true
    }
  });

  win.maximize();
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  ipcMain.handle('clipboard:write', (_event, value) => {
    clipboard.writeText(String(value || ''));
    return true;
  });

  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('ui:set-zoom', (event, percent) => {
    const factor = clampZoom(percent);
    event.sender.setZoomFactor(factor);
    return factor;
  });

  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));

  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return;

    contents.setUserAgent(DESKTOP_UA);

    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) contents.loadURL(url).catch(() => {});
      return { action: 'deny' };
    });

    contents.on('will-navigate', (event, url) => {
      if (!/^https?:/i.test(url)) event.preventDefault();
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const { app, BrowserWindow, ipcMain, clipboard, session, shell, safeStorage, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('CafeDesk');

const DESKTOP_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
const configuredPartitions = new Set();

function clampZoom(percent) {
  const value = Number(percent);
  if (!Number.isFinite(value)) return 1;
  return Math.min(1.5, Math.max(0.5, value / 100));
}

function credentialFile() {
  return path.join(app.getPath('userData'), 'credentials.secure.json');
}

function originKey(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''));
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.origin.toLowerCase();
  } catch {
    return '';
  }
}

function readCredentialStore() {
  try {
    const file = credentialFile();
    if (!fs.existsSync(file)) return { version: 1, entries: {} };
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' && parsed.entries
      ? parsed
      : { version: 1, entries: {} };
  } catch {
    return { version: 1, entries: {} };
  }
}

function writeCredentialStore(store) {
  const file = credentialFile();
  const tmp = file + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function getCredential(rawUrl) {
  const key = originKey(rawUrl);
  if (!key || !safeStorage.isEncryptionAvailable()) return null;

  const entry = readCredentialStore().entries[key];
  if (!entry?.username || !entry?.password) return null;

  try {
    return {
      origin: key,
      username: safeStorage.decryptString(Buffer.from(entry.username, 'base64')),
      password: safeStorage.decryptString(Buffer.from(entry.password, 'base64')),
      updatedAt: Number(entry.updatedAt || 0)
    };
  } catch {
    return null;
  }
}

function saveCredential(payload) {
  const key = originKey(payload?.url);
  const username = String(payload?.username || '').slice(0, 512);
  const password = String(payload?.password || '').slice(0, 4096);

  if (!key || !password) return { ok: false, message: 'اطلاعات ورود کامل نیست.' };
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, message: 'رمزگذاری امن ویندوز در دسترس نیست؛ رمز ذخیره نشد.' };
  }

  const store = readCredentialStore();
  store.entries[key] = {
    username: safeStorage.encryptString(username).toString('base64'),
    password: safeStorage.encryptString(password).toString('base64'),
    updatedAt: Date.now()
  };
  writeCredentialStore(store);
  return { ok: true, origin: key };
}


function appSettingsFile() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readAppSettings() {
  try {
    const file = appSettingsFile();
    if (!fs.existsSync(file)) return {};
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAppSettings(settings) {
  const file = appSettingsFile();
  const tmp = file + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function getDownloadFolder() {
  const configured = String(readAppSettings().downloadFolder || '').trim();
  if (configured) {
    try {
      if (fs.statSync(configured).isDirectory()) return configured;
    } catch {}
  }
  return app.getPath('downloads');
}

function downloadFolderInfo() {
  const folder = getDownloadFolder();
  return {
    path: folder,
    label: path.basename(folder) || folder,
    isDefault: folder === app.getPath('downloads')
  };
}

function nextAvailableDownloadPath(folder, filename) {
  fs.mkdirSync(folder, { recursive: true });
  const safeName = path.basename(String(filename || 'download'));
  let candidate = path.join(folder, safeName);
  if (!fs.existsSync(candidate)) return candidate;

  const ext = path.extname(safeName);
  const stem = path.basename(safeName, ext);
  for (let i = 1; i < 10000; i += 1) {
    candidate = path.join(folder, `${stem} (${i})${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return path.join(folder, `${stem}-${Date.now()}${ext}`);
}

async function chooseDownloadFolder(ownerWindow) {
  const result = await dialog.showOpenDialog(ownerWindow || undefined, {
    title: 'انتخاب پوشه پیش‌فرض دانلود CafeDesk',
    defaultPath: getDownloadFolder(),
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true, ...downloadFolderInfo() };
  }

  const folder = result.filePaths[0];
  const settings = readAppSettings();
  settings.downloadFolder = folder;
  writeAppSettings(settings);
  return { ok: true, canceled: false, ...downloadFolderInfo() };
}

function configureGuestSession(ses) {
  let partition = '';
  try { partition = ses.getPartition() || 'default'; } catch { partition = 'default'; }
  if (configuredPartitions.has(partition)) return;
  configuredPartitions.add(partition);

  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = new Set([
      'clipboard-read',
      'clipboard-sanitized-write',
      'notifications'
    ]);
    callback(allowed.has(permission));
  });

  ses.on('will-download', (_event, item) => {
    try {
      const folder = getDownloadFolder();
      item.setSavePath(nextAvailableDownloadPath(folder, item.getFilename()));
    } catch {}
  });
}

function showGuestContextMenu(contents, params) {
  const template = [];

  if (params.isEditable) {
    if (params.editFlags?.canCut) template.push({ label: 'برش', role: 'cut' });
    if (params.editFlags?.canCopy) template.push({ label: 'کپی', role: 'copy' });
    if (params.editFlags?.canPaste) template.push({ label: 'چسباندن', role: 'paste' });
    if (params.editFlags?.canSelectAll) template.push({ label: 'انتخاب همه', role: 'selectAll' });
  } else if (params.selectionText) {
    template.push({ label: 'کپی', role: 'copy' });
  }

  if (params.linkURL && /^https?:/i.test(params.linkURL)) {
    if (template.length) template.push({ type: 'separator' });
    template.push(
      { label: 'باز کردن لینک در همین پنل', click: () => contents.loadURL(params.linkURL).catch(() => {}) },
      { label: 'کپی آدرس لینک', click: () => clipboard.writeText(params.linkURL) }
    );
  }

  if (!template.length) template.push({ label: 'بارگذاری مجدد', role: 'reload' });
  Menu.buildFromTemplate(template).popup();
}

function configureGuestContents(contents) {
  contents.setUserAgent(DESKTOP_UA);
  configureGuestSession(contents.session);

  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          backgroundColor: '#ffffff',
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
          }
        }
      };
    }

    if (/^(mailto|tel):/i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, url) => {
    if (/^https?:/i.test(url) || /^about:blank$/i.test(url)) return;
    event.preventDefault();
    if (/^(mailto|tel):/i.test(url)) shell.openExternal(url).catch(() => {});
  });

  contents.on('context-menu', (_event, params) => showGuestContextMenu(contents, params));
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
    if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
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

  ipcMain.handle('downloads:get-folder', () => downloadFolderInfo());

  ipcMain.handle('downloads:choose-folder', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    return chooseDownloadFolder(owner);
  });

  ipcMain.handle('downloads:open', async () => {
    const result = await shell.openPath(getDownloadFolder());
    return { ok: !result, message: result || '', ...downloadFolderInfo() };
  });

  ipcMain.handle('credentials:get', (_event, url) => getCredential(url));
  ipcMain.handle('credentials:save', (_event, payload) => saveCredential(payload));

  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));

  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return;
    configureGuestContents(contents);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

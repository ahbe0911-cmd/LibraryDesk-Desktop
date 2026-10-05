const { app, BrowserWindow, ipcMain, clipboard, session, shell, safeStorage, Menu, dialog, webContents, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

app.setName('CafeDesk');

const DESKTOP_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
const MOBILE_UA = `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Mobile Safari/537.36`;
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
    if (!fs.existsSync(file)) return { version: 2, entries: {} };
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return { version: 2, entries: {} };
    if (!parsed.entries || typeof parsed.entries !== 'object') parsed.entries = {};
    return parsed;
  } catch {
    return { version: 2, entries: {} };
  }
}

function writeCredentialStore(store) {
  const file = credentialFile();
  const tmp = file + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  store.version = 2;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function decryptStoredAccount(entry) {
  if (!entry?.username || !entry?.password || !safeStorage.isEncryptionAvailable()) return null;
  try {
    return {
      username: safeStorage.decryptString(Buffer.from(entry.username, 'base64')),
      password: safeStorage.decryptString(Buffer.from(entry.password, 'base64')),
      updatedAt: Number(entry.updatedAt || 0)
    };
  } catch {
    return null;
  }
}

function encryptedAccountsForOrigin(store, key) {
  const raw = store.entries[key];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (raw.username && raw.password) return [raw];
  return [];
}

function getCredentials(rawUrl) {
  const key = originKey(rawUrl);
  if (!key || !safeStorage.isEncryptionAvailable()) return [];
  const store = readCredentialStore();
  return encryptedAccountsForOrigin(store, key)
    .map(decryptStoredAccount)
    .filter(Boolean)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((entry) => ({ ...entry, origin: key }));
}

function saveCredential(payload) {
  const key = originKey(payload?.url);
  const username = String(payload?.username || '').trim().slice(0, 512);
  const password = String(payload?.password || '').slice(0, 4096);

  if (!key || !password) return { ok: false, message: 'اطلاعات ورود کامل نیست.' };
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, message: 'رمزگذاری امن ویندوز در دسترس نیست؛ رمز ذخیره نشد.' };
  }

  const existing = getCredentials(key);
  const normalizedUser = username.toLocaleLowerCase();
  const next = existing.filter((item) => String(item.username || '').toLocaleLowerCase() !== normalizedUser);
  next.unshift({ username, password, updatedAt: Date.now() });

  const store = readCredentialStore();
  store.entries[key] = next.slice(0, 25).map((item) => ({
    username: safeStorage.encryptString(String(item.username || '')).toString('base64'),
    password: safeStorage.encryptString(String(item.password || '')).toString('base64'),
    updatedAt: Number(item.updatedAt || Date.now())
  }));
  writeCredentialStore(store);
  return { ok: true, origin: key, username };
}

function listCredentials() {
  if (!safeStorage.isEncryptionAvailable()) return [];
  const store = readCredentialStore();
  const out = [];
  for (const [origin, entries] of Object.entries(store.entries || {})) {
    for (const encrypted of (Array.isArray(entries) ? entries : [entries])) {
      const account = decryptStoredAccount(encrypted);
      if (!account) continue;
      out.push({ origin, username: account.username, updatedAt: account.updatedAt });
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

function deleteCredential(payload) {
  const key = originKey(payload?.origin || payload?.url);
  const username = String(payload?.username || '');
  if (!key) return { ok: false };

  const store = readCredentialStore();
  const remaining = encryptedAccountsForOrigin(store, key).filter((encrypted) => {
    const account = decryptStoredAccount(encrypted);
    return account && account.username !== username;
  });

  if (remaining.length) store.entries[key] = remaining;
  else delete store.entries[key];

  writeCredentialStore(store);
  return { ok: true };
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

function getGuestForHost(event, webContentsId) {
  const guest = webContents.fromId(Number(webContentsId));
  if (!guest || guest.isDestroyed()) throw new Error('صفحه مرورگر در دسترس نیست.');
  if (guest.hostWebContents !== event.sender) throw new Error('دسترسی به این صفحه مجاز نیست.');
  return guest;
}

function timestampForFile() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function cleanFileStem(value, fallback = 'CafeDesk') {
  const cleaned = String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

function invokeWindowsPrint(paths) {
  const files = Array.isArray(paths) ? paths : [];
  for (const file of files) {
    const escaped = String(file).replace(/'/g, "''");
    const command = `Start-Process -FilePath '${escaped}' -Verb Print`;
    try {
      const child = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-Command', command
      ], {
        windowsHide: true,
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } catch {}
  }
}

function configureGuestSession(ses) {
  let partition = '';
  try { partition = ses.getPartition() || 'default'; } catch { partition = 'default'; }
  if (configuredPartitions.has(partition)) return;
  configuredPartitions.add(partition);

  const isSocialPartition = partition.startsWith('persist:cafedesk-social-');

  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = new Set([
      'clipboard-read',
      'clipboard-sanitized-write'
    ]);
    // Social apps are intentionally quiet inside CafeDesk. Other browser panes
    // retain their normal notification behavior.
    if (!isSocialPartition) allowed.add('notifications');
    callback(allowed.has(permission));
  });

  ses.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'notifications') return !isSocialPartition;
    return ['clipboard-read', 'clipboard-sanitized-write'].includes(permission);
  });

  try { ses.spellCheckerEnabled = false; } catch {}

  ses.on('will-download', (_event, item, sourceContents) => {
    try {
      const folder = getDownloadFolder();
      item.setSavePath(nextAvailableDownloadPath(folder, item.getFilename()));
    } catch {}

    item.once('done', (_doneEvent, state) => {
      const host = sourceContents?.hostWebContents || sourceContents;
      if (!host || host.isDestroyed?.()) return;

      try {
        host.send('cafedesk:download-status', {
          state,
          sourceId: sourceContents?.id || 0,
          filename: item.getFilename(),
          savePath: item.getSavePath(),
          receivedBytes: item.getReceivedBytes(),
          totalBytes: item.getTotalBytes()
        });
      } catch {}
    });
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
  let partition = '';
  try { partition = contents.session.getPartition() || ''; } catch {}
  contents.setUserAgent(partition.startsWith('persist:cafedesk-social-') ? MOBILE_UA : DESKTOP_UA);
  configureGuestSession(contents.session);

  contents.setWindowOpenHandler((details) => {
    const url = String(details?.url || '');
    if (/^https?:/i.test(url) || /^blob:https?:/i.test(url) || /^data:application\/pdf/i.test(url)) {
      const host = contents.hostWebContents;
      if (host && !host.isDestroyed()) {
        host.send('cafedesk:guest-open-tab', {
          sourceId: contents.id,
          url,
          disposition: details.disposition || 'new-window',
          referrer: details.referrer?.url || ''
        });
      }
      return { action: 'deny' };
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

  function resolveInsideDownloadFolder(candidate) {
    const base = path.resolve(getDownloadFolder());
    const target = path.resolve(String(candidate || base));
    const relative = path.relative(base, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('مسیر خارج از پوشه انتخاب‌شده است.');
    }
    return { base, target };
  }

  ipcMain.handle('files:list-download-folder', async (_event, requestedPath) => {
    const { base, target } = resolveInsideDownloadFolder(requestedPath);
    const stat = await fs.promises.stat(target);
    if (!stat.isDirectory()) throw new Error('مسیر انتخاب‌شده پوشه نیست.');

    const dirEntries = await fs.promises.readdir(target, { withFileTypes: true });
    const entries = await Promise.all(dirEntries.map(async (entry) => {
      const fullPath = path.join(target, entry.name);
      let itemStat = null;
      try { itemStat = await fs.promises.stat(fullPath); } catch {}
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: itemStat?.size || 0,
        mtimeMs: itemStat?.mtimeMs || 0,
        extension: entry.isDirectory() ? '' : path.extname(entry.name).toLowerCase()
      };
    }));

    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name, 'fa');
    });

    return {
      root: base,
      current: target,
      parent: target === base ? null : path.dirname(target),
      entries
    };
  });

  ipcMain.handle('files:get-thumbnail', async (_event, targetPath) => {
    const { target } = resolveInsideDownloadFolder(targetPath);
    try {
      const stat = await fs.promises.stat(target);
      if (!stat.isFile()) return { ok: false, dataUrl: '' };
      const thumbnail = await nativeImage.createThumbnailFromPath(target, { width: 176, height: 132 });
      if (!thumbnail || thumbnail.isEmpty()) return { ok: false, dataUrl: '' };
      return { ok: true, dataUrl: thumbnail.toDataURL() };
    } catch {
      return { ok: false, dataUrl: '' };
    }
  });

  ipcMain.handle('files:open-download-items', async (_event, targetPaths) => {
    const requested = Array.isArray(targetPaths) ? targetPaths : [targetPaths];
    const resolved = requested
      .filter(Boolean)
      .map((value) => resolveInsideDownloadFolder(value).target)
      .filter((value, index, array) => array.indexOf(value) === index);

    const results = await Promise.all(resolved.map((target) => shell.openPath(target).catch(() => 'open failed')));
    return { ok: resolved.length > 0, count: resolved.length, errors: results.filter(Boolean) };
  });

  ipcMain.handle('files:open-download-item', async (_event, targetPath) => {
    const { target } = resolveInsideDownloadFolder(targetPath);
    const result = await shell.openPath(target);
    return { ok: !result, message: result || '' };
  });

  ipcMain.handle('files:show-download-item', (_event, targetPath) => {
    const { target } = resolveInsideDownloadFolder(targetPath);
    shell.showItemInFolder(target);
    return { ok: true };
  });

  ipcMain.handle('files:open-download-root', async () => {
    const result = await shell.openPath(getDownloadFolder());
    return { ok: !result, message: result || '' };
  });

  ipcMain.handle('files:context-menu', (event, targetPaths) => {
    const requested = Array.isArray(targetPaths) ? targetPaths : [targetPaths];
    const resolved = requested
      .filter(Boolean)
      .map((value) => resolveInsideDownloadFolder(value).target)
      .filter((value, index, array) => array.indexOf(value) === index);

    if (!resolved.length) return { ok: false };

    const owner = BrowserWindow.fromWebContents(event.sender);
    const items = resolved.map((target) => {
      let stat = null;
      try { stat = fs.statSync(target); } catch {}
      return { target, isDirectory: Boolean(stat?.isDirectory()) };
    });

    const files = items.filter((item) => !item.isDirectory).map((item) => item.target);
    const first = items[0];
    const template = [];

    if (items.length === 1) {
      template.push({
        label: first.isDirectory ? 'باز کردن پوشه' : 'باز کردن با برنامه پیش‌فرض ویندوز',
        click: () => shell.openPath(first.target).catch(() => {})
      });
    } else if (files.length > 1) {
      template.push({
        label: `باز کردن ${files.length} فایل با برنامه پیش‌فرض ویندوز`,
        click: () => files.forEach((target) => shell.openPath(target).catch(() => {}))
      });
    }

    if (files.length) {
      template.push({
        label: files.length > 1 ? `چاپ ${files.length} فایل با ویندوز` : 'چاپ با برنامه پیش‌فرض ویندوز',
        click: () => invokeWindowsPrint(files)
      });
    }

    template.push({ type: 'separator' });

    if (items.length === 1) {
      template.push({
        label: 'نمایش در File Explorer',
        click: () => shell.showItemInFolder(first.target)
      });
    }

    template.push({
      label: items.length > 1 ? 'کپی مسیر فایل‌های انتخاب‌شده' : 'کپی مسیر',
      click: () => clipboard.writeText(items.map((item) => item.target).join('\r\n'))
    });

    Menu.buildFromTemplate(template).popup({ window: owner || undefined });
    return { ok: true, count: items.length };
  });

  ipcMain.handle('files:print-download-items', (_event, targetPaths) => {
    const requested = Array.isArray(targetPaths) ? targetPaths : [targetPaths];
    const files = requested
      .filter(Boolean)
      .map((value) => resolveInsideDownloadFolder(value).target)
      .filter((target) => {
        try { return fs.statSync(target).isFile(); } catch { return false; }
      });

    invokeWindowsPrint(files);
    return { ok: files.length > 0, count: files.length };
  });

  ipcMain.handle('print:get-printers', async (event) => {
    try {
      const printers = await event.sender.getPrintersAsync();
      return printers.map((printer) => ({
        name: printer.name,
        displayName: printer.displayName || printer.name,
        description: printer.description || '',
        status: printer.status,
        isDefault: Boolean(printer.isDefault),
        options: printer.options || {}
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle('print:prepare', async (event, webContentsId) => {
    const guest = getGuestForHost(event, webContentsId);
    const response = { ok: true, previewDataUrl: '', pageCount: 1, title: guest.getTitle() || '' };

    try {
      const image = await guest.capturePage();
      if (image && !image.isEmpty()) response.previewDataUrl = image.resize({ width: 720 }).toDataURL();
    } catch {}

    try {
      const pdf = await guest.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        preferCSSPageSize: false
      });
      const raw = Buffer.from(pdf).toString('latin1');
      const pages = raw.match(/\/Type\s*\/Page\b/g);
      if (pages?.length) response.pageCount = pages.length;
    } catch {}

    return response;
  });

  ipcMain.handle('print:guest', async (event, webContentsId, rawOptions) => {
    const guest = getGuestForHost(event, webContentsId);
    const input = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};

    const options = {
      silent: true,
      printBackground: input.printBackground !== false,
      color: input.color !== false,
      landscape: Boolean(input.landscape),
      copies: Math.max(1, Math.min(99, Number(input.copies) || 1)),
      collate: input.collate !== false,
      pagesPerSheet: [1, 2, 4, 6, 9, 16].includes(Number(input.pagesPerSheet)) ? Number(input.pagesPerSheet) : 1,
      scaleFactor: Math.max(10, Math.min(200, Number(input.scaleFactor) || 100)),
      duplexMode: ['simplex', 'shortEdge', 'longEdge'].includes(input.duplexMode) ? input.duplexMode : 'simplex',
      margins: { marginType: ['default', 'none', 'printableArea'].includes(input.marginType) ? input.marginType : 'printableArea' }
    };

    if (input.deviceName) options.deviceName = String(input.deviceName);
    if (['A3','A4','A5','Letter','Legal','Tabloid'].includes(input.pageSize)) options.pageSize = input.pageSize;

    if (Array.isArray(input.pageRanges) && input.pageRanges.length) {
      options.pageRanges = input.pageRanges
        .map((range) => ({
          from: Math.max(0, Number(range?.from) || 0),
          to: Math.max(0, Number(range?.to) || 0)
        }))
        .filter((range) => range.to >= range.from);
    }

    return await new Promise((resolve) => {
      try {
        guest.print(options, (success, failureReason) => {
          resolve({ ok: Boolean(success), message: failureReason || '' });
        });
      } catch (error) {
        resolve({ ok: false, message: error?.message || String(error) });
      }
    });
  });

  ipcMain.handle('print:guest-system', async (event, webContentsId) => {
    const guest = getGuestForHost(event, webContentsId);
    return await new Promise((resolve) => {
      try {
        guest.print({ silent: false, printBackground: true }, (success, failureReason) => {
          resolve({ ok: Boolean(success), message: failureReason || '' });
        });
      } catch (error) {
        resolve({ ok: false, message: error?.message || String(error) });
      }
    });
  });

  ipcMain.handle('social:repair', async (_event, key) => {
    const safeKey = String(key || '');
    if (!['rubika','shad','eitaa','telegram'].includes(safeKey)) return { ok: false };
    const ses = session.fromPartition('persist:cafedesk-social-' + safeKey);
    try { await ses.clearCache(); } catch {}
    try {
      await ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });
    } catch {}
    return { ok: true };
  });

  ipcMain.handle('credentials:get', (_event, url) => getCredentials(url));
  ipcMain.handle('credentials:save', (_event, payload) => saveCredential(payload));
  ipcMain.handle('credentials:list', () => listCredentials());
  ipcMain.handle('credentials:delete', (_event, payload) => deleteCredential(payload));

  ipcMain.handle('capture:export-page', async (event, webContentsId, label) => {
    const guest = getGuestForHost(event, webContentsId);
    const stem = `${cleanFileStem(label, 'CafeDesk-Screenshot')}-${timestampForFile()}`;
    const target = nextAvailableDownloadPath(getDownloadFolder(), `${stem}.png`);

    const image = await guest.capturePage();
    if (!image || image.isEmpty()) throw new Error('تصویر صفحه در دسترس نیست.');
    fs.writeFileSync(target, image.toPNG());

    return { ok: true, format: 'png', path: target, label: path.basename(target) };
  });

  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    const isLocalCafeDesk = String(wc?.getURL?.() || '').startsWith('file://');
    callback(permission === 'media' && isLocalCafeDesk);
  });

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

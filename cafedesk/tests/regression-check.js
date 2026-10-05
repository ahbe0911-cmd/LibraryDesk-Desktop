const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const app = read('app/app.js');
const html = read('app/index.html');
const css = read('app/styles.css');
const main = read('main.js');
const preload = read('preload.js');
const guest = read('webview-preload.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Social rail is cropped to the four cards, while social logic stays unchanged.
assert(app.includes('activateSocial(activeSocial)') && !app.includes('openSite(site, activePane)'), 'social apps must remain separate');
assert((html.match(/class="social-logo-image"/g) || []).length === 4, 'four social icons missing');
assert(css.includes('margin-top:44px!important') && css.includes('align-self:start!important'), 'social rail should move down without tall background');
assert(css.includes('height:auto!important') && css.includes('flex:none!important'), 'social rail must end after Telegram');

// Tab switching must never reopen the site picker.
assert(app.includes("item.addEventListener('click', (event) =>"), 'tab click handler missing');
assert(app.includes('event.stopPropagation();\n        activatePaneTab(side, tab.id);'), 'tab click must stop propagation');
assert(app.includes("pane.slot.removeAttribute('data-empty-side')"), 'occupied pane must lose empty-pane marker');
assert(!app.includes("document.querySelectorAll('[data-empty-side]').forEach"), 'permanent empty-pane listeners must be removed');
assert(app.includes("if (!pane.slot.classList.contains('empty-pane')) return;"), 'site picker must only open from actually empty pane');

// Eblagh/new-window behavior.
assert(main.includes("if (/^about:blank$/i.test(url))"), 'about:blank popup bridge missing');
assert(main.includes("contents.on('did-create-window'"), 'hidden child redirect handler missing');
assert(main.includes("sendGuestOpenTab(contents, url, 'about-blank-redirect'"), 'about:blank PDF redirect must become an internal tab');
assert(main.includes("label: 'باز کردن در تب جدید'"), 'manual context-menu open-in-new-tab missing');
assert(main.includes("canOpenInsideCafeDesk(linkUrl)"), 'context-menu URL validation missing');
assert(main.includes("/^blob:https?:/i.test(url)") && main.includes("/^data:application\\/pdf/i.test(url)"), 'PDF popup URL schemes missing');

// All normal printing uses the CafeDesk print panel.
assert(guest.includes("document.addEventListener('cafedesk-print-request'"), 'website print bridge receiver missing');
assert(app.includes("window.__cafedeskPrintBridgeInstalled"), 'website window.print override missing');
assert(app.includes("printWebview(webview)") && app.includes("event.channel === 'print-request'"), 'site print must route to CafeDesk print dialog');
assert(html.includes('id="printDialog"') && html.includes('id="printPreviewGrid"'), 'print dialog/live grid missing');

// Print controls are real and preview updates with settings.
assert(preload.includes("preparePrint: (webContentsId, options)"), 'print preview options bridge missing');
assert(main.includes("ipcMain.handle('print:prepare'") && main.includes("rawOptions"), 'live print preparation backend missing');
assert(main.includes("guest.printToPDF({") && main.includes("scale,") && main.includes("pageRanges,"), 'backend preview must use real print settings');
assert(main.includes("pagesPerSheet") && main.includes("duplexMode") && main.includes("scaleFactor"), 'actual print settings missing');
assert(app.includes('renderLivePrintPreview') && app.includes('schedulePrintPreviewRefresh'), 'live preview updater missing');
assert(app.includes("image.style.filter = options.color ? 'none' : 'grayscale(1)'"), 'color setting must affect preview');
assert(app.includes("paper.style.aspectRatio = printPaperRatio"), 'paper/orientation setting must affect preview');
assert(app.includes("printPreviewGrid.style.gridTemplateColumns"), 'pages-per-sheet must affect preview layout');

// Existing 1.0.13 features stay intact.
assert(main.includes("const isSocialPartition = partition.startsWith('persist:cafedesk-social-')"), 'social notification isolation missing');
assert(main.includes("item.setSavePath(nextAvailableDownloadPath(folder, item.getFilename()))"), 'shared automatic download folder missing');
assert(app.includes('persianOrdinalDays') && app.includes('headerDateTime.dataset.tone'), 'Jalali date styling missing');
assert(app.includes('normalizeCalcKeyboardKey') && app.includes('calcToPersian'), 'Persian keyboard calculator missing');
assert(guest.includes('EBLAGH_PENDING_KEY') && guest.includes('commitPendingEblaghIfVerified'), 'verified Eblagh password save missing');
assert(app.includes("if (isEblaghCredential && data?.verified !== true) return;"), 'premature Eblagh save guard missing');
assert(main.includes('image.toPNG()'), 'lossless screenshot missing');
assert(!app.includes('MediaRecorder'), 'screen recorder must remain removed');

console.log('CafeDesk 1.0.14 regression checks passed.');

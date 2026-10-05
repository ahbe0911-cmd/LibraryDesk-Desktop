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

// Existing dual browser and separate social behavior.
assert(app.includes("persist:cafedesk-pane-${side}"), 'independent dual browser sessions missing');
assert(app.includes('activateSocial(activeSocial)') && !app.includes('openSite(site, activePane)'), 'social apps must remain separate');
assert((html.match(/class="social-logo-image"/g) || []).length === 4, 'four supplied social icons missing');
assert(css.includes('padding:52px 6px 6px!important'), 'social icon column must be visually lowered');

// Jalali date sentence and daily accent.
assert(app.includes('persianOrdinalDays'), 'Persian ordinal day names missing');
assert(app.includes('امروز، ${weekday}، ${ordinal} ${month} سال ${year}'), 'requested Jalali sentence format missing');
assert(app.includes('headerDateTime.dataset.tone'), 'daily date color tone missing');
assert(css.includes('.header-datetime[data-tone="6"]'), 'date color palette missing');

// Chrome-inspired print UI and backend options.
assert(html.includes('id="printDialog"'), 'print preview dialog missing');
assert(html.includes('id="printDestination"') && html.includes('id="printPagesMode"'), 'printer/pages controls missing');
assert(html.includes('id="printDuplex"') && html.includes('id="printPaperSize"'), 'duplex/paper controls missing');
assert(preload.includes("print:get-printers") && preload.includes("print:guest"), 'print bridge missing');
assert(main.includes("ipcMain.handle('print:get-printers'"), 'printer discovery backend missing');
assert(main.includes("ipcMain.handle('print:guest'"), 'configured print backend missing');
assert(main.includes('pagesPerSheet') && main.includes('duplexMode') && main.includes('scaleFactor'), 'advanced print settings missing');
assert(app.includes('parsePrintRanges') && app.includes('submitCafeDeskPrint'), 'print controller missing');

// Social notifications disabled, downloads remain fixed to one CafeDesk folder.
assert(main.includes("const isSocialPartition = partition.startsWith('persist:cafedesk-social-')"), 'social permission isolation missing');
assert(main.includes("if (permission === 'notifications') return !isSocialPartition;"), 'social notification blocking missing');
assert(main.includes('item.setSavePath(nextAvailableDownloadPath(folder, item.getFilename()))'), 'single automatic download folder missing');

// Persian RTL calculator with keyboard.
assert(html.includes('data-calc="7">۷</button>') && html.includes('data-calc="0" class="wide">۰</button>'), 'Persian calculator key labels missing');
assert(app.includes('function calcToPersian'), 'Persian calculator display missing');
assert(app.includes('normalizeCalcKeyboardKey') && app.includes("key === 'Backspace'"), 'calculator keyboard support missing');
assert(css.includes('.tool.calculator{direction:rtl}'), 'RTL calculator styling missing');

// Eblagh/PDF reliability: plugin enabled and blob/data PDF popup routes accepted.
assert(app.includes("webview.setAttribute('plugins', '')"), 'Chromium plugin/PDF support missing');
assert(app.includes('/^blob:https?:/i.test(targetUrl)') && app.includes('/^data:application\\/pdf/i.test(targetUrl)'), 'blob/data PDF internal tab support missing');
assert(main.includes('/^blob:https?:/i.test(url)') && main.includes('/^data:application\\/pdf/i.test(url)'), 'main-process PDF popup routing missing');
assert(guest.includes('/^blob:https?:/i.test(targetUrl)'), 'guest PDF link routing missing');

// Eblagh verified password save protection stays intact.
assert(guest.includes('EBLAGH_PENDING_KEY') && guest.includes('commitPendingEblaghIfVerified'), 'verified Eblagh password flow missing');
assert(app.includes("if (isEblaghCredential && data?.verified !== true) return;"), 'premature Eblagh save guard missing');
assert(guest.includes("if (fields.eblaghStage === 'otp') return;"), 'OTP autofill protection missing');

// Existing screenshot/recorder behavior stays intact.
assert(main.includes('const image = await guest.capturePage()') && main.includes('image.toPNG()'), 'lossless screenshot missing');
assert(!app.includes('MediaRecorder') && !main.includes('capture:get-media-source-id'), 'screen recorder must remain removed');

console.log('CafeDesk 1.0.13 regression checks passed.');

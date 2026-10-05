const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const app = read('app/app.js');
const html = read('app/index.html');
const css = read('app/styles.css');
const main = read('main.js');
const preload = read('preload.js');
const guestPreload = read('webview-preload.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Dual independent browser panes restored.
assert(html.includes('id="rightSlot"') && html.includes('id="leftSlot"'), 'dual browser placement zones missing');
assert(app.includes("persist:cafedesk-pane-${side}"), 'independent right/left browser sessions missing');
assert(!app.includes("if (panes[otherSide]?.webview) closePane(otherSide);"), 'second pane must not close when another pane opens');
assert(html.includes('id="closeWorkspaceBtn"'), 'close-all workspace button missing');
assert(app.includes("closePane('right')") && app.includes("closePane('left')"), 'close-all workspace logic missing');

// Popup/new-tab behavior.
assert(app.includes('function openInternalTab(side, url, sourceSite, navigation = null)'), 'internal popup tab handler missing');
assert(app.includes("webview.addEventListener('new-window'"), 'webview popup fallback missing');
assert(guestPreload.includes("form[target=\"_blank\"]"), 'target blank form handling missing');
assert(guestPreload.includes("method: 'post'"), 'POST target blank internal-tab support missing');
assert(app.includes('postSubmitted = false'), 'POST tab navigation replay missing');

// Social remains separate and print is removed.
assert(app.includes('activateSocial(activeSocial)'), 'separate social browser missing');
assert(!app.includes('openSite(site, activePane)'), 'social must not open inside normal browser panes');
assert(html.includes('class="iphone18-frame"'), 'iPhone-style social frame missing');
assert(!html.includes('id="openPrintFolderSocialBtn"'), 'print entry must be removed from social navigation');
assert(!html.includes('id="printFolderPanel"'), 'print panel must be removed from social dialog');
assert(app.includes("showSocialToast('✓ دانلود شد: '"), 'social green download notification missing');

// Fixed download path.
assert(main.includes('item.setSavePath(nextAvailableDownloadPath(folder, item.getFilename()))'), 'automatic fixed-folder download path missing');

// Digital header clock/date and full-width sites.
assert(html.includes('id="digitalClock"') && html.includes('id="jalaliDateText"'), 'digital clock/date header missing');
assert(!html.includes('id="hourHand"') && !html.includes('calendarGrid'), 'analog clock/calendar must be removed');
assert(app.includes('function updateHeaderDateTime()'), 'digital date/time updater missing');
assert(css.includes('.hero-grid') && css.includes('display:block!important'), 'site dashboard must use full width');

// Existing protections/features stay.
assert(main.includes('const image = await guest.capturePage()') && main.includes('image.toPNG()'), 'lossless viewport screenshot missing');
assert(!app.includes('MediaRecorder') && !main.includes('capture:get-media-source-id'), 'screen recorder must remain removed');
assert(guestPreload.includes('function eblaghStage()') && guestPreload.includes("stage === 'otp'"), 'Eblagh OTP protection missing');
assert(app.includes('const persistZoom = (value) =>') && app.includes('saveSiteZoom(site, value)'), 'persistent site zoom missing');

console.log('CafeDesk 1.0.11 regression checks passed.');

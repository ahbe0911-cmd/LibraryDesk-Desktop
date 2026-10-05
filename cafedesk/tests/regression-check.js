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

assert(html.includes('id="rightSlot"') && html.includes('id="leftSlot"'), 'two 50% placement zones missing');
assert(css.includes('grid-template-columns:minmax(0,1fr) 4px minmax(0,1fr)!important'), 'workspace must remain 50/50');
assert(app.includes("const otherSide = side === 'right' ? 'left' : 'right';"), 'single-browser opposite-side logic missing');
assert(app.includes('if (panes[otherSide]?.webview) closePane(otherSide);'), 'opening a browser must close the other occupied half');
assert(!app.includes('const available = [...socialSites, ...sites]'), 'social apps must not appear in browser site picker');

assert(app.includes('activateSocial(activeSocial)'), 'social dialog must activate its own social webview');
assert(app.includes("button.addEventListener('click', () => activateSocial(button.dataset.social))"), 'social buttons must switch social webviews');
assert(!app.includes('openSite(site, activePane)'), 'social apps must never open in browser panes');
assert(html.includes('class="iphone18-frame"'), 'iPhone-style social frame missing');
assert(html.includes('class="iphone18-dynamic-island"'), 'phone Dynamic Island graphic missing');
assert(css.includes('.iphone18-frame') && css.includes('.iphone18-screen'), 'phone-frame styling missing');
assert(app.includes('showSocialToast'), 'social save notification must stay inside phone frame');

assert(app.includes('const persistZoom = (value) =>'), 'persistent zoom helper missing');
assert(app.includes('saveSiteZoom(site, value)'), 'zoom value must be stored');
assert(app.includes('current - 5') && app.includes('current + 5'), 'zoom in/out controls missing');
assert(app.includes('applySiteZoom(webview, getSiteZoom(site))'), 'saved zoom must be reapplied after page load');

assert(main.includes('const image = await guest.capturePage()'), 'visible viewport capture missing');
assert(main.includes('image.toPNG()'), 'lossless PNG screenshot missing');
assert(main.includes('.png'), 'PNG screenshot filename missing');
assert(!main.includes('Page.captureScreenshot'), 'synthetic full-page capture must stay removed');
assert(app.includes("showPaneToast(side, '✓ عکس صفحه ذخیره شد', 'success')"), 'green screenshot saved notification missing');

assert(!app.includes('MediaRecorder'), 'screen recorder must remain removed');
assert(!main.includes('capture:get-media-source-id'), 'screen recorder backend must remain removed');
assert(!preload.includes('startRecordingFile'), 'screen recorder bridge must remain removed');

assert(main.includes('files:get-thumbnail'), 'Explorer thumbnail backend missing');
assert(app.includes('print-file-thumbnail'), 'Explorer image thumbnail renderer missing');
assert(app.includes('printFolderSelection'), 'Explorer multi-select missing');
assert(guestPreload.includes('function eblaghStage()'), 'Eblagh stage detector missing');
assert(guestPreload.includes("stage === 'otp'"), 'Eblagh OTP protection missing');

console.log('CafeDesk 1.0.10 regression checks passed.');

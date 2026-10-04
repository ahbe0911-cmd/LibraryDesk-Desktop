const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const app = read('app/app.js');
const html = read('app/index.html');
const css = read('app/styles.css');
const main = read('main.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('class="pane-slot empty-pane" id="rightSlot"'), 'right pane persistent slot class missing');
assert(html.includes('class="pane-slot empty-pane" id="leftSlot"'), 'left pane persistent slot class missing');
assert(!app.includes("pane.slot.className = '';"), 'regression: openSite still strips the slot sizing class');
assert(app.includes("pane.slot.className = 'pane-slot';"), 'openSite must keep pane-slot');
assert(app.includes("pane.slot.className = 'pane-slot empty-pane';"), 'closePane must keep pane-slot');
assert(/\.pane-slot\s*\{[\s\S]*?height:\s*100%/.test(css), 'pane-slot must have definite 100% height');
assert(/\.pane-slot\s*\{[\s\S]*?min-height:\s*0/.test(css), 'pane-slot must allow flex/grid shrinking');
assert(app.includes("https://m.rubika.ir/"), 'Rubika URL is not the requested mobile web address');
assert(app.includes("https://my.shad.ir/"), 'Shad URL is not the requested address');

const rubika = html.indexOf('data-social="rubika"');
const shad = html.indexOf('data-social="shad"');
const eitaa = html.indexOf('data-social="eitaa"');
const telegram = html.indexOf('data-social="telegram"');
assert(rubika >= 0 && rubika < shad && shad < eitaa && eitaa < telegram, 'social order must be Rubika, Shad, Eitaa, Telegram');

assert(main.includes("downloads:choose-folder"), 'download-folder chooser IPC missing');
assert(main.includes("item.setSavePath(nextAvailableDownloadPath"), 'downloads are not routed to the configured folder');

console.log('CafeDesk 1.0.5 regression checks passed.');


const preload = read('preload.js');
const guestPreload = read('webview-preload.js');

assert(main.includes("host.send('cafedesk:guest-open-tab'"), 'new-window requests must be routed into CafeDesk');
assert(!main.includes("action: 'allow',\n        overrideBrowserWindowOptions"), 'guest popups must not create external BrowserWindow windows');
assert(app.includes('pane-tabbar'), 'internal pane tabs missing');
assert(app.includes('openInternalTab'), 'internal tab routing missing');
assert(app.includes('captureScreenshot'), 'screenshot UI missing');
assert(app.includes('toggleRecording'), 'screen recorder UI missing');
assert(main.includes("capture:get-media-source-id"), 'tab media capture IPC missing');
assert(main.includes("guest.getMediaSourceId(event.sender)"), 'recording must capture the selected guest WebContents');
assert(main.includes("guest.capturePage()"), 'screenshot must capture the selected guest WebContents');
assert(app.includes('getCredentials'), 'multi-account password retrieval missing');
assert(main.includes('function listCredentials()'), 'password manager list missing');
assert(guestPreload.includes('savedCredentials'), 'guest autofill state missing');
assert(guestPreload.includes('typedUsername'), 'username-matched password autofill missing');
assert(css.includes('max-width:430px'), 'social browser portrait width missing');
assert(main.includes("persist:cafedesk-social-") && main.includes('MOBILE_UA'), 'social mobile user-agent switching missing');

console.log('CafeDesk 1.0.6 extended regression checks passed.');

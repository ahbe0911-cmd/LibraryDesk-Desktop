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

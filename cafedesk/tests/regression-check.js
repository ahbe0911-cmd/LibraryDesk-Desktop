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

// Existing 1.0.11 dual browser and popup behavior stays intact.
assert(html.includes('id="rightSlot"') && html.includes('id="leftSlot"'), 'dual browser panes missing');
assert(app.includes("persist:cafedesk-pane-${side}"), 'independent pane sessions missing');
assert(html.includes('id="closeWorkspaceBtn"'), 'close-all browser control missing');
assert(app.includes('function openInternalTab(side, url, sourceSite, navigation = null)'), 'internal new-tab support missing');
assert(guestPreload.includes("method: 'post'"), 'POST target blank support missing');

// Supplied social app graphics replace only the old letter badges.
assert((html.match(/class="social-logo-image"/g) || []).length === 4, 'four supplied social icons must be present');
assert(html.includes('data:image/webp;base64,'), 'social icons must be embedded in the app');
assert(!html.includes('<span class="social-badge rubika">ر</span>'), 'old Rubika letter badge still present');
assert(!html.includes('<span class="social-badge shad">ش</span>'), 'old Shad letter badge still present');
assert(!html.includes('<span class="social-badge eitaa">ا</span>'), 'old Eitaa letter badge still present');
assert(!html.includes('<span class="social-badge telegram">ت</span>'), 'old Telegram letter badge still present');
assert(css.includes('.social-logo-image'), 'social icon sizing styles missing');
assert(app.includes('activateSocial(activeSocial)') && !app.includes('openSite(site, activePane)'), 'social apps must remain separate from browser panes');

// Eblagh credentials are pending until the login flow proves success.
assert(guestPreload.includes("EBLAGH_PENDING_KEY"), 'Eblagh pending credential store missing');
assert(guestPreload.includes('rememberPendingEblaghCredential(payload)'), 'Eblagh submit must store pending credential');
assert(guestPreload.includes('commitPendingEblaghIfVerified'), 'Eblagh success verifier missing');
assert(guestPreload.includes("stage === 'otp'"), 'OTP success stage must be recognized');
assert(guestPreload.includes('movedToNextUrl'), 'post-login URL advance must be recognized');
assert(guestPreload.includes('hasEblaghLoginError()'), 'Eblagh login error check missing');
assert(guestPreload.includes('verified: true'), 'verified credential flag missing');
assert(app.includes("if (isEblaghCredential && data?.verified !== true) return;"), 'renderer must reject premature Eblagh saves');

// Security and UX features remain.
assert(guestPreload.includes("if (fields.eblaghStage === 'otp') return;"), 'saved password must never fill OTP input');
assert(main.includes('const image = await guest.capturePage()') && main.includes('image.toPNG()'), 'lossless screenshot missing');
assert(!app.includes('MediaRecorder') && !main.includes('capture:get-media-source-id'), 'screen recorder must remain removed');
assert(app.includes("showSocialToast('✓ دانلود شد: '"), 'social download confirmation missing');
assert(main.includes('item.setSavePath(nextAvailableDownloadPath(folder, item.getFilename()))'), 'fixed automatic download folder missing');

console.log('CafeDesk 1.0.12 regression checks passed.');

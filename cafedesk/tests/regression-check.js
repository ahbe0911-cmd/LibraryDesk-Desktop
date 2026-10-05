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

// Existing browser/social logic stays intact.
assert(app.includes("persist:cafedesk-pane-${side}"), 'dual browser sessions missing');
assert(app.includes('activateSocial(activeSocial)') && !app.includes('openSite(site, activePane)'), 'social apps must remain separate');
assert((html.match(/class="social-logo-image"/g) || []).length === 4, 'social icons missing');

// Dedicated social download-folder tools.
assert(html.includes('id="chooseSocialStorageBtn"'), 'social choose-address tool missing');
assert(html.includes('id="openSocialStorageBtn"'), 'social Windows-folder tool missing');
assert(html.includes('<strong>انتخاب آدرس</strong>') && html.includes('<strong>پوشه چاپ</strong>'), 'requested social tool labels missing');
assert(css.includes('.social-storage-tools') && css.includes('.social-left-stack'), 'separate social storage card styling missing');
assert(preload.includes("social-downloads:get-folder") && preload.includes("social-downloads:choose-folder") && preload.includes("social-downloads:open"), 'social storage preload bridge missing');
assert(main.includes('function getSocialDownloadFolder()'), 'persistent social folder getter missing');
assert(main.includes('settings.socialDownloadFolder = folder'), 'social folder persistence missing');
assert(main.includes('const folder = isSocialPartition ? getSocialDownloadFolder() : getDownloadFolder();'), 'social downloads must route to chosen social folder');
assert(main.includes("ipcMain.handle('social-downloads:open'"), 'social folder must open externally in Windows');
assert(app.includes('refreshSocialStorageFolder') && app.includes('openSocialDownloadFolder'), 'social folder UI handlers missing');

// Print preview must avoid jitter/heavy recalculation on every change.
assert(app.includes('printPreviewRequestVersion'), 'stale print-preview request guard missing');
assert(app.includes('requestAnimationFrame'), 'batched print preview rendering missing');
assert(app.includes('setTimeout(run, 720)'), 'heavy printToPDF refresh must be debounced');
assert(app.includes("schedulePrintPreviewRefresh({ backend: false })"), 'lightweight preview path missing');
assert(app.includes("schedulePrintPreviewRefresh({ backend: true })"), 'deferred backend preview path missing');
assert(!css.includes('.print-paper-preview{\n  transition:aspect-ratio .18s ease,width .18s ease;'), 'aspect-ratio animation should not remain');
assert(css.includes('.print-paper-preview') && css.includes('transition:none!important'), 'stable preview CSS missing');
assert(css.includes('scrollbar-gutter:stable both-edges'), 'stable print preview scrollbar missing');

// Eblagh credential manager: search, copy, replace, autofill.
assert(html.includes('id="passwordManagerSearch"'), 'credential search field missing');
assert(html.includes('id="passwordManagerAutoCopy"'), 'automatic credential copy toggle missing');
assert(html.includes('ثنا / ابلاغ'), 'Eblagh manager label missing');
assert(app.includes('normalizeCredentialSearch'), 'credential search normalization missing');
assert(app.includes('copyManagedCredential'), 'credential copy helper missing');
assert(app.includes("copyPassword.textContent = 'کپی رمز'"), 'copy-password control missing');
assert(app.includes("copyUser.textContent = eblagh ? 'کپی کد ملی' : 'کپی نام'"), 'copy-national-ID control missing');
assert(main.includes('function credentialUsernameKey(value)'), 'main-process national-ID normalization missing');
assert(main.includes('credentialUsernameKey(item.username) !== normalizedUser'), 'same national ID must replace old password');
assert(guest.includes('function normalizeCredentialUsername(value)'), 'webview national-ID normalization missing');
assert(guest.includes('normalizeCredentialUsername(entry.username) === typedUsernameKey'), 'instant normalized autofill missing');
assert(guest.includes('EBLAGH_PENDING_KEY') && guest.includes('commitPendingEblaghIfVerified'), 'verified Eblagh save flow missing');
assert(app.includes("if (isEblaghCredential && data?.verified !== true) return;"), 'premature Eblagh save guard missing');

// Existing important features remain.
assert(main.includes("label: 'باز کردن در تب جدید'"), 'manual open-in-new-tab missing');
assert(main.includes('about-blank-redirect'), 'Eblagh about:blank PDF redirect missing');
assert(html.includes('id="printDialog"') && app.includes('submitCafeDeskPrint'), 'unified print panel missing');
assert(main.includes('image.toPNG()'), 'lossless screenshot missing');
assert(!app.includes('MediaRecorder'), 'screen recorder must stay removed');
assert(main.includes("if (permission === 'notifications') return !isSocialPartition;"), 'social notifications must remain disabled');

console.log('CafeDesk 1.0.15 regression checks passed.');

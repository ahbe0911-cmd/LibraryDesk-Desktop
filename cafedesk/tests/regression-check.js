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

assert(html.includes('class="pane-slot empty-pane" id="rightSlot"'), 'right independent pane missing');
assert(html.includes('class="pane-slot empty-pane" id="leftSlot"'), 'left independent pane missing');
assert(app.includes("persist:cafedesk-pane-${side}"), 'independent right/left persistent sessions missing');
assert(app.includes("rubika: { id: 'social-rubika', kind: 'social'"), 'social apps must be pane sources');
assert(app.includes("openSite(site, activePane)"), 'social launcher must open inside active pane');
assert(app.includes("const available = [...socialSites, ...sites]"), 'site picker must include social apps');

assert(!app.includes('MediaRecorder'), 'screen recorder must be removed');
assert(!app.includes('toggleRecording'), 'screen recorder controls must be removed');
assert(!main.includes("capture:get-media-source-id"), 'screen recorder backend must be removed');
assert(!preload.includes('startRecordingFile'), 'screen recorder preload bridge must be removed');

assert(main.includes('const image = await guest.capturePage()'), 'screenshot must capture visible viewport');
assert(main.includes('image.toJPEG(100)'), 'screenshot must save at JPEG quality 100');
assert(!main.includes('Page.captureScreenshot'), 'full-page synthetic DevTools capture must be removed');
assert(!main.includes('captureBeyondViewport'), 'off-screen synthetic capture must be removed');
assert(app.includes('اسکرین‌شات واقعی از نمای فعلی'), 'screenshot UI must describe visible capture');

assert(app.includes('showPaneToast'), 'per-pane save notification missing');
assert(main.includes('sourceId: sourceContents?.id || 0'), 'download event must identify originating browser');
assert(app.includes('✓ اطلاعات ورود ذخیره شد'), 'credential save confirmation missing');

assert(main.includes("files:get-thumbnail"), 'Explorer thumbnail backend missing');
assert(preload.includes('getDownloadThumbnail'), 'Explorer thumbnail bridge missing');
assert(app.includes('print-file-thumbnail'), 'Explorer thumbnail renderer missing');
assert(main.includes("files:open-download-items"), 'multi-file default-open API missing');
assert(main.includes('باز کردن ${files.length} فایل با برنامه پیش‌فرض ویندوز'), 'multi-file context menu open missing');
assert(app.includes('printFolderSelection'), 'Explorer multi-select missing');
assert(html.includes('id="printViewDetailsBtn"') && html.includes('id="printViewListBtn"') && html.includes('id="printViewIconsBtn"'), 'Explorer view modes missing');

assert(app.includes('backgroundThrottling=no'), 'smooth browser rendering setting missing');
assert(css.includes('.pane-loading-bar'), 'browser loading animation missing');
assert(!app.includes('prewarmSocialViews();'), 'hidden social prewarming must not slow startup');

assert(guestPreload.includes('function eblaghStage()'), 'Eblagh stage detector missing');
assert(guestPreload.includes("stage === 'otp'"), 'Eblagh OTP exclusion missing');

console.log('CafeDesk 1.0.9 regression checks passed.');

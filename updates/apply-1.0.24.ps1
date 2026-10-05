$ErrorActionPreference = "Stop"

$root = "build-src"
$newtabPath = Join-Path $root "app\newtab.html"
$appJsPath = Join-Path $root "app\app.js"
$viewerJsPath = Join-Path $root "app\viewer.js"
$stylesPath = Join-Path $root "app\styles.css"
$pkgPath = Join-Path $root "package.json"
$utf8 = New-Object Text.UTF8Encoding($false)

function Replace-Required([string]$text,[string]$old,[string]$new,[string]$label) {
  if (-not $text.Contains($old)) { throw "1.0.24 missing target: $label" }
  return $text.Replace($old,$new)
}

# Main dashboard HTML — only calendar shortcut and messenger section.
$html = Get-Content $newtabPath -Raw
if (-not $html.Contains('id="calendarTodayBtn"')) {
  $old = '        <div id="holidayInfo" class="calendar-day-note">برای دیدن مناسبت هر روز، روی تاریخ بزنید.</div>'
  $new = $old + [Environment]::NewLine + '        <button id="calendarTodayBtn" class="calendar-today-btn" type="button" title="بازگشت تقویم به امروز">امروز</button>'
  $html = Replace-Required $html $old $new "calendar Today button"
}
$html = $html.Replace('نسخه وب بله و روبیکا با نمایش راست‌چین و فونت وزیر','نسخه وب بله، روبیکا و ایتا')
if (-not $html.Contains('webapp-eitaa')) {
  $rubika = @'
              <button class="webapp-card webapp-rubika" type="button" data-library-webapp data-url="https://m.rubika.ir/" data-name="روبیکای کتابخانه">
                <span class="webapp-icon" aria-hidden="true"><img src="assets/rubika-user.png" alt=""></span>
                <span class="webapp-copy"><b>روبیکای کتابخانه</b><small>باز کردن وب روبیکا</small><em>m.rubika.ir</em></span>
                <span class="webapp-arrow" aria-hidden="true">←</span>
              </button>
'@
  $eitaa = @'
              <button class="webapp-card webapp-eitaa" type="button" data-library-webapp data-url="https://web.eitaa.com/" data-name="ایتای کتابخانه">
                <span class="webapp-icon webapp-icon-letter" aria-hidden="true">ا</span>
                <span class="webapp-copy"><b>ایتای کتابخانه</b><small>باز کردن وب ایتا</small><em>web.eitaa.com</em></span>
                <span class="webapp-arrow" aria-hidden="true">←</span>
              </button>
'@
  if (-not $html.Contains($rubika.TrimEnd())) { throw "1.0.24 Rubika card target missing" }
  $html = $html.Replace($rubika.TrimEnd(),($rubika + $eitaa).TrimEnd())
}
[IO.File]::WriteAllText($newtabPath,$html,$utf8)

# Calendar Today behavior — preserve all existing calendar logic.
$appJs = Get-Content $appJsPath -Raw
if (-not $appJs.Contains('function goCalendarToday()')) {
  $old = 'function moveMonth(n){vm+=n;if(vm<1){vm=12;vy--}if(vm>12){vm=1;vy++}selected=null;renderCalendar()}'
  $new = $old + [Environment]::NewLine + 'function goCalendarToday(){const t=nowJ();vy=t[0];vm=t[1];selected=key(t[0],t[1],t[2]);renderCalendar();const info=document.querySelector("#holidayInfo");if(info)info.textContent=`امروز: ${fa(t[2])} ${pMonths[t[1]-1]} ${fa(t[0])}`}'
  $appJs = Replace-Required $appJs $old $new "goCalendarToday"
}
if (-not $appJs.Contains("$('#calendarTodayBtn')?.addEventListener('click',goCalendarToday);")) {
  $anchor = " $('#settingsBtn').onclick"
  $idx = $appJs.IndexOf($anchor)
  if ($idx -lt 0) { throw "1.0.24 missing target: calendar Today listener anchor" }
  $appJs = $appJs.Insert($idx, " $('#calendarTodayBtn')?.addEventListener('click',goCalendarToday);" + [Environment]::NewLine)
}
[IO.File]::WriteAllText($appJsPath,$appJs,$utf8)

# Let Eitaa use the existing messenger WebView behavior.
$viewerJs = Get-Content $viewerJsPath -Raw
$viewerJs = $viewerJs.Replace("['web.bale.ai','web.rubika.ir']","['web.bale.ai','web.rubika.ir','web.eitaa.com']")
[IO.File]::WriteAllText($viewerJsPath,$viewerJs,$utf8)

# Visual-only refinements. Card sizes / business logic remain unchanged.
$styles = Get-Content $stylesPath -Raw
if (-not $styles.Contains('LibraryDesk 1.0.24 — silver clock + Eitaa + Today shortcut')) {
$styles += @'

/* ===== LibraryDesk 1.0.24 — silver clock + Eitaa + Today shortcut ===== */
/* Clock dimensions are untouched; only the visual language follows the supplied silver/white wall-clock reference. */
.analog-clock{
  background:
    radial-gradient(circle at 50% 47%,#fff 0 68%,#fbfbfb 69% 72%,#eceff0 73% 76%,#fff 77% 78%,#c9ced1 79% 83%,#f7f8f8 84% 87%,#aeb4b8 88% 92%,#eef0f1 93% 96%,#92989c 97% 100%)!important;
  border-color:#aeb4b8!important;
  box-shadow:
    inset 0 0 0 2px rgba(255,255,255,.96),
    inset 0 0 0 5px rgba(130,137,141,.24),
    inset 0 2px 10px rgba(0,0,0,.10),
    0 8px 18px rgba(17,30,36,.20)!important;
}
body.light .analog-clock{
  background:
    radial-gradient(circle at 50% 47%,#fff 0 68%,#fbfbfb 69% 72%,#eceff0 73% 76%,#fff 77% 78%,#c9ced1 79% 83%,#f7f8f8 84% 87%,#aeb4b8 88% 92%,#eef0f1 93% 96%,#92989c 97% 100%)!important;
}
.analog-clock::before{
  background:
    repeating-conic-gradient(from -1.5deg,#202427 0 1deg,transparent 1deg 6deg)!important;
  -webkit-mask:radial-gradient(circle,transparent 0 74%,#000 74.5% 78%,transparent 78.5%)!important;
  mask:radial-gradient(circle,transparent 0 74%,#000 74.5% 78%,transparent 78.5%)!important;
  opacity:.88!important;
}
.analog-clock::after{
  background:
    repeating-conic-gradient(from -1deg,#0b0d0f 0 2.1deg,transparent 2.1deg 30deg)!important;
  -webkit-mask:radial-gradient(circle,transparent 0 72%,#000 72.5% 80%,transparent 80.5%)!important;
  mask:radial-gradient(circle,transparent 0 72%,#000 72.5% 80%,transparent 80.5%)!important;
  opacity:.96!important;
}
.clock-face-ring{
  border-color:rgba(74,82,86,.18)!important;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.9)!important;
}
.clock-number{
  display:block!important;
  color:#090a0b!important;
  font-family:"Segoe UI",Arial,sans-serif!important;
  font-weight:900!important;
  text-shadow:0 1px 0 #fff!important;
}
.clock-number.n12,.clock-number.n3,.clock-number.n6,.clock-number.n9{
  color:#050607!important;
}
.hour-hand,.minute-hand{
  background:linear-gradient(90deg,#08090a,#202326 54%,#050607)!important;
  box-shadow:1px 1px 3px rgba(0,0,0,.42)!important;
}
.second-hand{
  background:#d11418!important;
  box-shadow:0 0 2px rgba(133,0,0,.35)!important;
}
.clock-pin{
  background:#d31519!important;
  border:3px solid #24272a!important;
  box-shadow:0 0 0 2px #b28b39,0 2px 5px rgba(0,0,0,.42)!important;
}

/* Calendar is slightly larger/readable but stays inside the existing card. */
.month-calendar-card{padding:9px 10px 8px!important}
.month-calendar-head{grid-template-columns:31px 1fr 31px!important;margin-bottom:6px!important}
.month-calendar-head strong{font-size:13px!important}
.month-weekdays{gap:3px!important;margin-bottom:4px!important}
.month-weekdays div{font-size:9px!important}
.month-calendar-grid{gap:3px!important}
.month-calendar-grid .day{height:27px!important;font-size:10px!important;border-radius:8px!important}
.calendar-day-note{font-size:8px!important;margin-top:5px!important}
.calendar-today-btn{
  display:block;width:100%;height:29px;margin-top:5px;border:1px solid rgba(28,169,145,.28);
  border-radius:9px;background:linear-gradient(145deg,rgba(27,176,151,.15),rgba(41,190,159,.07));
  color:var(--text);font:900 9px/1 "Vazirmatn";cursor:pointer;transition:.16s ease
}
.calendar-today-btn:hover{transform:translateY(-1px);border-color:rgba(29,183,155,.48);background:rgba(31,184,157,.17)}

/* Messenger row: Bale, Rubika, Eitaa — compact and equal. */
.embedded-webapps .webapps-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
.embedded-webapps .webapp-card{min-width:0!important;min-height:58px!important;padding:6px!important;border-radius:13px!important;gap:5px!important}
.embedded-webapps .webapp-icon{width:38px!important;height:38px!important;border-radius:11px!important}
.embedded-webapps .webapp-copy{min-width:0!important}
.embedded-webapps .webapp-copy b{font-size:10px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.embedded-webapps .webapp-copy small{font-size:7.5px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.embedded-webapps .webapp-arrow{font-size:11px!important}
.webapp-eitaa::after{background:#f58a2a!important}
.webapp-icon-letter{
  display:grid!important;place-items:center!important;
  color:#fff!important;background:linear-gradient(145deg,#ff9d3f,#e86a16)!important;
  font:950 19px/1 "Vazirmatn"!important
}

/* Existing top-control functions stay intact; only placement/presence is refined. */
.top-controls{
  top:24px!important;left:50%!important;right:auto!important;transform:translateX(-50%)!important;
  padding:6px 8px!important;gap:8px!important;border-radius:18px!important;
  box-shadow:0 14px 34px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.14)!important;
}
.top-controls .main-zoom{align-self:center!important}
.top-controls .icon-btn{align-self:center!important}

@media(max-width:1180px){
  .embedded-webapps .webapps-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .embedded-webapps .webapp-icon{width:34px!important;height:34px!important}
}
@media(max-width:700px){
  .top-controls{top:14px!important;max-width:calc(100% - 24px)!important}
  .embedded-webapps .webapps-grid{grid-template-columns:1fr!important}
}
'@
}
[IO.File]::WriteAllText($stylesPath,$styles,$utf8)

$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$pkg.version = "1.0.24"
$pkg.description = "LibraryDesk Windows — silver reference analog clock, Eitaa quick access, centered controls and calendar Today shortcut"
[IO.File]::WriteAllText($pkgPath,($pkg | ConvertTo-Json -Depth 20),$utf8)

# Guardrails
$htmlCheck = Get-Content $newtabPath -Raw
$appCheck = Get-Content $appJsPath -Raw
$viewerCheck = Get-Content $viewerJsPath -Raw
$stylesCheck = Get-Content $stylesPath -Raw
$pkgCheck = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkgCheck.version -ne "1.0.24") { throw "1.0.24 version update failed" }
if ($htmlCheck -notmatch 'calendarTodayBtn' -or $htmlCheck -notmatch 'webapp-eitaa') { throw "Today/Eitaa UI missing" }
if ($appCheck -notmatch 'goCalendarToday') { throw "Calendar Today logic missing" }
if ($viewerCheck -notmatch 'web\.eitaa\.com') { throw "Eitaa viewer compatibility missing" }
if ($stylesCheck -notmatch 'LibraryDesk 1.0.24') { throw "1.0.24 visual styles missing" }

Write-Host "LibraryDesk 1.0.24 update applied."

$ErrorActionPreference = "Stop"

$root = "build-src"
$newtabPath = Join-Path $root "app\newtab.html"
$stylesPath = Join-Path $root "app\styles.css"
$pkgPath = Join-Path $root "package.json"
$eitaaB64 = "updates\eitaa-icon-128.png.b64"
$eitaaAsset = Join-Path $root "app\assets\eitaa-user.png"
$utf8 = New-Object Text.UTF8Encoding($false)

function Replace-Required([string]$text,[string]$old,[string]$new,[string]$label) {
  if (-not $text.Contains($old)) { throw "1.0.25 missing target: $label" }
  return $text.Replace($old,$new)
}

# Use the exact Eitaa logo supplied by the user.
if (-not (Test-Path $eitaaB64)) { throw "Eitaa icon payload missing" }
[IO.File]::WriteAllBytes($eitaaAsset,[Convert]::FromBase64String((Get-Content $eitaaB64 -Raw)))

# Main dashboard HTML: Persian clock digits and icon-only messenger buttons.
$html = Get-Content $newtabPath -Raw
$clockDigits = [ordered]@{
  '<span class="clock-number n12">12</span>' = '<span class="clock-number n12">۱۲</span>'
  '<span class="clock-number n1">1</span>'   = '<span class="clock-number n1">۱</span>'
  '<span class="clock-number n2">2</span>'   = '<span class="clock-number n2">۲</span>'
  '<span class="clock-number n3">3</span>'   = '<span class="clock-number n3">۳</span>'
  '<span class="clock-number n4">4</span>'   = '<span class="clock-number n4">۴</span>'
  '<span class="clock-number n5">5</span>'   = '<span class="clock-number n5">۵</span>'
  '<span class="clock-number n6">6</span>'   = '<span class="clock-number n6">۶</span>'
  '<span class="clock-number n7">7</span>'   = '<span class="clock-number n7">۷</span>'
  '<span class="clock-number n8">8</span>'   = '<span class="clock-number n8">۸</span>'
  '<span class="clock-number n9">9</span>'   = '<span class="clock-number n9">۹</span>'
  '<span class="clock-number n10">10</span>' = '<span class="clock-number n10">۱۰</span>'
  '<span class="clock-number n11">11</span>' = '<span class="clock-number n11">۱۱</span>'
}
foreach ($pair in $clockDigits.GetEnumerator()) {
  $html = Replace-Required $html $pair.Key $pair.Value "Persian clock number $($pair.Key)"
}

$oldBale = @'
              <button class="webapp-card webapp-bale" type="button" data-library-webapp data-url="https://web.bale.ai/" data-name="بله کتابخانه">
                <span class="webapp-icon" aria-hidden="true"><img src="assets/bale-user.jpg" alt=""></span>
                <span class="webapp-copy"><b>بله کتابخانه</b><small>باز کردن وب بله</small><em>web.bale.ai</em></span>
                <span class="webapp-arrow" aria-hidden="true">←</span>
              </button>
'@
$newBale = @'
              <button class="webapp-card webapp-bale webapp-icon-only" type="button" data-library-webapp data-url="https://web.bale.ai/" data-name="بله کتابخانه" title="بله کتابخانه" aria-label="بله کتابخانه">
                <span class="webapp-icon" aria-hidden="true"><img src="assets/bale-user.jpg" alt=""></span>
              </button>
'@
$html = Replace-Required $html $oldBale.TrimEnd() $newBale.TrimEnd() "Bale icon-only card"

$oldRubika = @'
              <button class="webapp-card webapp-rubika" type="button" data-library-webapp data-url="https://m.rubika.ir/" data-name="روبیکای کتابخانه">
                <span class="webapp-icon" aria-hidden="true"><img src="assets/rubika-user.png" alt=""></span>
                <span class="webapp-copy"><b>روبیکای کتابخانه</b><small>باز کردن وب روبیکا</small><em>m.rubika.ir</em></span>
                <span class="webapp-arrow" aria-hidden="true">←</span>
              </button>
'@
$newRubika = @'
              <button class="webapp-card webapp-rubika webapp-icon-only" type="button" data-library-webapp data-url="https://m.rubika.ir/" data-name="روبیکای کتابخانه" title="روبیکای کتابخانه" aria-label="روبیکای کتابخانه">
                <span class="webapp-icon" aria-hidden="true"><img src="assets/rubika-user.png" alt=""></span>
              </button>
'@
$html = Replace-Required $html $oldRubika.TrimEnd() $newRubika.TrimEnd() "Rubika icon-only card"

$oldEitaa = @'
              <button class="webapp-card webapp-eitaa" type="button" data-library-webapp data-url="https://web.eitaa.com/" data-name="ایتای کتابخانه">
                <span class="webapp-icon webapp-icon-letter" aria-hidden="true">ا</span>
                <span class="webapp-copy"><b>ایتای کتابخانه</b><small>باز کردن وب ایتا</small><em>web.eitaa.com</em></span>
                <span class="webapp-arrow" aria-hidden="true">←</span>
              </button>
'@
$newEitaa = @'
              <button class="webapp-card webapp-eitaa webapp-icon-only" type="button" data-library-webapp data-url="https://web.eitaa.com/" data-name="ایتای کتابخانه" title="ایتای کتابخانه" aria-label="ایتای کتابخانه">
                <span class="webapp-icon" aria-hidden="true"><img src="assets/eitaa-user.png" alt=""></span>
              </button>
'@
$html = Replace-Required $html $oldEitaa.TrimEnd() $newEitaa.TrimEnd() "Eitaa icon-only card"
[IO.File]::WriteAllText($newtabPath,$html,$utf8)

# Visual-only refinements requested by the user. No business logic changes.
$styles = Get-Content $stylesPath -Raw
if (-not $styles.Contains('LibraryDesk 1.0.25 — Persian clock numbers + left controls + icon-only messengers')) {
$styles += @'

/* ===== LibraryDesk 1.0.25 — Persian clock numbers + left controls + icon-only messengers ===== */

/* Keep the supplied silver clock face and live hands; refine only numeral typography. */
.clock-number{
  font-family:'Vazirmatn','Segoe UI',Tahoma,sans-serif!important;
  font-weight:900!important;
  color:#07090a!important;
  text-shadow:0 1px 0 rgba(255,255,255,.96),0 1px 2px rgba(0,0,0,.10)!important;
  line-height:1!important;
}
.clock-number.n12,.clock-number.n3,.clock-number.n6,.clock-number.n9{
  font-size:24px!important;
  min-width:24px!important;
}
.clock-number.n1,.clock-number.n2,.clock-number.n4,.clock-number.n5,
.clock-number.n7,.clock-number.n8,.clock-number.n10,.clock-number.n11{
  font-size:16px!important;
  min-width:18px!important;
  font-weight:850!important;
}

/* Keep the occasion card fully inside the clock/calendar card and visually lift it. */
.time-calendar{
  overflow:hidden!important;
  gap:6px!important;
  padding-bottom:12px!important;
}
.compact-occasion-card{
  min-height:40px!important;
  margin-top:-3px!important;
  padding:5px 8px!important;
  border-radius:12px!important;
  grid-template-columns:24px minmax(0,1fr) auto!important;
  gap:5px!important;
  align-self:end!important;
  box-shadow:0 8px 18px rgba(20,80,70,.08),inset 0 1px 0 rgba(255,255,255,.12)!important;
}
.compact-occasion-card .occasion-card-icon{
  width:24px!important;height:24px!important;border-radius:7px!important;font-size:11px!important;
}
.compact-occasion-card .occasion-card-copy b{font-size:8.4px!important;line-height:1.15!important}
.compact-occasion-card .occasion-card-copy small{
  font-size:6.9px!important;line-height:1.25!important;max-height:17px!important;
}
.compact-occasion-card .occasion-card-link{
  font-size:6.7px!important;line-height:1!important;opacity:.88!important;white-space:nowrap!important;
}

/* Top controls: far left, safely inside the viewport, with the same functions. */
.top-controls{
  top:22px!important;
  left:18px!important;
  right:auto!important;
  transform:none!important;
  max-width:calc(100vw - 36px)!important;
  box-sizing:border-box!important;
  z-index:30!important;
  padding:6px 8px!important;
  gap:7px!important;
  border-radius:18px!important;
  box-shadow:0 13px 30px rgba(0,0,0,.16),0 2px 7px rgba(0,0,0,.08),inset 0 1px 0 rgba(255,255,255,.14)!important;
}

/* Library messengers: only the three recognizable icons; no arrows or extra text. */
.embedded-webapps .webapps-heading p{display:none!important}
.embedded-webapps .webapps-grid{
  grid-template-columns:repeat(3,50px)!important;
  gap:8px!important;
  justify-content:start!important;
  align-items:center!important;
}
.embedded-webapps .webapp-card.webapp-icon-only{
  width:50px!important;
  min-width:50px!important;
  height:50px!important;
  min-height:50px!important;
  padding:4px!important;
  display:grid!important;
  place-items:center!important;
  border-radius:14px!important;
  gap:0!important;
  overflow:hidden!important;
}
.embedded-webapps .webapp-card.webapp-icon-only::after{display:none!important}
.embedded-webapps .webapp-icon-only .webapp-copy,
.embedded-webapps .webapp-icon-only .webapp-arrow{display:none!important}
.embedded-webapps .webapp-icon-only .webapp-icon{
  width:40px!important;
  height:40px!important;
  min-width:40px!important;
  border-radius:11px!important;
  margin:0!important;
  overflow:hidden!important;
  display:grid!important;
  place-items:center!important;
  background:transparent!important;
}
.embedded-webapps .webapp-icon-only .webapp-icon img{
  width:100%!important;
  height:100%!important;
  object-fit:cover!important;
  display:block!important;
  border-radius:10px!important;
}
.webapp-eitaa.webapp-icon-only{
  background:linear-gradient(145deg,rgba(247,139,27,.12),rgba(255,255,255,.035))!important;
  border-color:rgba(242,128,24,.24)!important;
}
.webapp-rubika.webapp-icon-only{
  background:linear-gradient(145deg,rgba(68,132,230,.10),rgba(255,255,255,.035))!important;
}
.webapp-bale.webapp-icon-only{
  background:linear-gradient(145deg,rgba(39,198,164,.10),rgba(255,255,255,.035))!important;
}

@media(max-width:700px){
  .top-controls{top:12px!important;left:10px!important;max-width:calc(100vw - 20px)!important}
  .embedded-webapps .webapps-grid{grid-template-columns:repeat(3,48px)!important}
  .embedded-webapps .webapp-card.webapp-icon-only{width:48px!important;min-width:48px!important;height:48px!important;min-height:48px!important}
  .embedded-webapps .webapp-icon-only .webapp-icon{width:38px!important;height:38px!important;min-width:38px!important}
}
'@
}
[IO.File]::WriteAllText($stylesPath,$styles,$utf8)

$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$pkg.version = "1.0.25"
$pkg.description = "LibraryDesk Windows — Persian clock numerals, corrected occasion card, left-aligned controls and icon-only Bale/Rubika/Eitaa quick access"
[IO.File]::WriteAllText($pkgPath,($pkg | ConvertTo-Json -Depth 20),$utf8)

# Guardrails.
$htmlCheck = Get-Content $newtabPath -Raw
$stylesCheck = Get-Content $stylesPath -Raw
$pkgCheck = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkgCheck.version -ne "1.0.25") { throw "1.0.25 version update failed" }
if ($htmlCheck -notmatch 'clock-number n12">۱۲<' -or $htmlCheck -notmatch 'clock-number n11">۱۱<') { throw "Persian clock numerals missing" }
if ($htmlCheck -notmatch 'assets/eitaa-user.png') { throw "User Eitaa icon missing" }
if ($htmlCheck -match 'webapp-icon-letter') { throw "Old Eitaa letter icon still present" }
if ($htmlCheck -match 'webapp-arrow') { throw "Messenger arrows were not removed" }
if (-not (Test-Path $eitaaAsset)) { throw "Decoded Eitaa asset missing" }
if ($stylesCheck -notmatch 'LibraryDesk 1.0.25') { throw "1.0.25 visual styles missing" }

Write-Host "LibraryDesk 1.0.25 update applied."

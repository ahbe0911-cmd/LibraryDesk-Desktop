$ErrorActionPreference = "Stop"

$mainPath = "build-src\main.js"
$stylesPath = "build-src\app\styles.css"
$pkgPath = "build-src\package.json"

$utf8 = New-Object Text.UTF8Encoding($false)

# Fix the desktop Settings button without changing the rest of the main-page logic.
$main = Get-Content $mainPath -Raw
$oldExpected = "    const expected = pathToFileURL(path.join(__dirname, 'app', 'newtab.html')).href;"
$oldGuard = "    if (url !== expected) event.preventDefault();"
if (-not $main.Contains($oldExpected) -or -not $main.Contains($oldGuard)) {
  throw "1.0.23 settings navigation target was not found"
}
$newAllowed = "    const allowed = new Set([`r`n      pathToFileURL(path.join(__dirname, 'app', 'newtab.html')).href,`r`n      pathToFileURL(path.join(__dirname, 'app', 'settings.html')).href`r`n    ]);"
$main = $main.Replace($oldExpected, $newAllowed)
$main = $main.Replace($oldGuard, "    if (!allowed.has(url)) event.preventDefault();")
[IO.File]::WriteAllText($mainPath, $main, $utf8)

# Visual-only dashboard rebalance: equal card widths/heights and a tidier top-control cluster.
$styles = Get-Content $stylesPath -Raw
$marker = "LibraryDesk 1.0.23 — balanced dashboard cards + reliable settings control"
if (-not $styles.Contains($marker)) {
$append = @'

/* ===== LibraryDesk 1.0.23 — balanced dashboard cards + reliable settings control ===== */
/* Visual balance only: on wide screens the four primary dashboard cards share one equal grid. */
@media(min-width:1121px){
  .hero{
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    align-items:stretch!important;
    gap:15px!important;
  }
  .time-calendar,
  .loan-change-card,
  .sites-workspace,
  .notes-wrap{
    width:100%!important;
    min-width:0!important;
    height:560px!important;
    min-height:560px!important;
    max-height:560px!important;
    align-self:stretch!important;
  }
  .sites-workspace{
    padding:16px!important;
    gap:10px!important;
  }
  .sites-workspace .categories{
    max-height:225px!important;
  }
  .embedded-webapps{
    padding-top:9px!important;
  }
  .embedded-webapps .webapp-card{
    min-height:66px!important;
  }
  .notes-wrap{
    padding:16px!important;
  }
  .notes-wrap .notes-list,
  .notes-wrap .reminders-list{
    max-height:318px!important;
  }
  .loan-change-card{
    padding:16px!important;
  }
  .time-calendar{
    padding:16px 15px 13px!important;
  }
}

/* Compact, cleaner top controls. Settings keeps its original function, with a reliable in-app route. */
.top-controls{
  gap:7px!important;
  padding:4px!important;
  border:1px solid color-mix(in srgb,var(--border) 82%,transparent)!important;
  border-radius:17px!important;
  background:color-mix(in srgb,var(--card) 86%,transparent)!important;
  backdrop-filter:blur(18px) saturate(135%)!important;
  -webkit-backdrop-filter:blur(18px) saturate(135%)!important;
  box-shadow:0 10px 28px rgba(0,0,0,.14),inset 0 1px 0 rgba(255,255,255,.09)!important;
}
.top-controls .main-zoom{
  box-shadow:none!important;
  border-color:transparent!important;
  background:transparent!important;
  backdrop-filter:none!important;
}
.top-controls .icon-btn{
  width:38px!important;
  height:38px!important;
  border-radius:11px!important;
  box-shadow:none!important;
  font-size:17px!important;
}
#themeBtn{
  background:linear-gradient(145deg,rgba(244,200,105,.17),rgba(255,255,255,.055))!important;
  border-color:rgba(244,200,105,.28)!important;
}
#settingsBtn{
  background:linear-gradient(145deg,rgba(47,184,171,.18),rgba(255,255,255,.055))!important;
  border-color:rgba(47,184,171,.32)!important;
}
#settingsBtn:hover{box-shadow:0 7px 18px rgba(25,157,142,.16)!important}

@media(max-width:1380px) and (min-width:1121px){
  .hero{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important}
  .time-calendar,.loan-change-card,.sites-workspace,.notes-wrap{height:548px!important;min-height:548px!important;max-height:548px!important}
}
'@
  [IO.File]::WriteAllText($stylesPath, $styles + $append, $utf8)
}

$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$pkg.version = "1.0.23"
$pkg.description = "LibraryDesk Windows — balanced equal dashboard cards, compact top controls and fixed Settings navigation"
[IO.File]::WriteAllText($pkgPath, ($pkg | ConvertTo-Json -Depth 20), $utf8)

# Build-time guardrails.
$mainCheck = Get-Content $mainPath -Raw
$stylesCheck = Get-Content $stylesPath -Raw
$pkgCheck = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkgCheck.version -ne "1.0.23") { throw "1.0.23 version update failed" }
if ($mainCheck -notmatch "settings\.html") { throw "Settings navigation fix missing" }
if ($stylesCheck -notmatch "repeat\(4,minmax\(0,1fr\)\)") { throw "Equal dashboard grid missing" }
if ($stylesCheck -notmatch "height:560px") { throw "Equal desktop card height missing" }

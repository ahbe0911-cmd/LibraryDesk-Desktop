$ErrorActionPreference = "Stop"

$root = "build-src"
$mainPath = Join-Path $root "main.js"
$stylesPath = Join-Path $root "app\styles.css"
$pkgPath = Join-Path $root "package.json"
$utf8 = New-Object Text.UTF8Encoding($false)

# 1) Startup fix: never pre-create the viewer window at launch.
# The dashboard remains the only visible startup window; the viewer is created on explicit site/webapp click.
$main = Get-Content $mainPath -Raw
$startupCall = "      setTimeout(prewarmPreviewWindow, 900);"
if (-not $main.Contains($startupCall)) { throw "1.0.26 startup prewarm target not found" }
$main = $main.Replace($startupCall, "      // LibraryDesk 1.0.26: create the viewer only after an explicit user action.")
[IO.File]::WriteAllText($mainPath,$main,$utf8)

# 2) Visual-only occasion card lift/prominence.
$styles = Get-Content $stylesPath -Raw
$marker = "LibraryDesk 1.0.26 — dashboard-first startup + lifted occasion card"
if (-not $styles.Contains($marker)) {
$styles += @'

/* ===== LibraryDesk 1.0.26 — dashboard-first startup + lifted occasion card ===== */
/* Visual-only: keep the existing card/layout, but lift the BaHesab occasion row so it is fully visible and clearer. */
.compact-occasion-card{
  position:relative!important;
  z-index:4!important;
  transform:translateY(-10px)!important;
  min-height:44px!important;
  padding:6px 9px!important;
  border-color:rgba(30,174,151,.34)!important;
  background:linear-gradient(135deg,rgba(247,190,72,.16),rgba(72,190,164,.11),rgba(139,114,232,.09))!important;
  box-shadow:0 12px 26px rgba(20,80,70,.15),0 3px 8px rgba(0,0,0,.07),inset 0 1px 0 rgba(255,255,255,.22)!important;
}
.compact-occasion-card:hover{
  transform:translateY(-11px)!important;
  border-color:rgba(26,176,150,.58)!important;
  box-shadow:0 15px 30px rgba(20,90,76,.18),0 4px 10px rgba(0,0,0,.08),inset 0 1px 0 rgba(255,255,255,.25)!important;
}
.compact-occasion-card .occasion-card-copy b{
  font-size:9px!important;
  font-weight:950!important;
}
.compact-occasion-card .occasion-card-copy small{
  font-size:7.4px!important;
  line-height:1.35!important;
  max-height:20px!important;
}
.compact-occasion-card .occasion-card-link{
  font-size:7.2px!important;
  font-weight:900!important;
  opacity:1!important;
}
body.light .compact-occasion-card{
  background:linear-gradient(135deg,rgba(255,247,220,.97),rgba(232,250,244,.96),rgba(247,241,255,.96))!important;
}
'@
}
[IO.File]::WriteAllText($stylesPath,$styles,$utf8)

$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$pkg.version = "1.0.26"
$pkg.description = "LibraryDesk Windows — dashboard-first startup and a lifted, fully visible BaHesab occasion card; all other UI/logic preserved"
[IO.File]::WriteAllText($pkgPath,($pkg | ConvertTo-Json -Depth 20),$utf8)

# Guardrails: exactly the requested two fixes are present.
$mainCheck = Get-Content $mainPath -Raw
$stylesCheck = Get-Content $stylesPath -Raw
$pkgCheck = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkgCheck.version -ne "1.0.26") { throw "1.0.26 version update failed" }
if ($mainCheck -match 'setTimeout\(prewarmPreviewWindow, 900\)') { throw "Startup viewer prewarm still enabled" }
if ($mainCheck -notmatch 'create the viewer only after an explicit user action') { throw "Startup dashboard guard missing" }
if ($stylesCheck -notmatch 'LibraryDesk 1.0.26') { throw "1.0.26 occasion-card styles missing" }
if ($stylesCheck -notmatch 'transform:translateY\(-10px\)') { throw "Occasion card lift missing" }

Write-Host "LibraryDesk 1.0.26 update applied."

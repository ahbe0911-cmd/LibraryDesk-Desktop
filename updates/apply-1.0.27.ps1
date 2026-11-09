$ErrorActionPreference = "Stop"
$root = "build-src"
$cssPath = Join-Path $root "app\styles.css"
$pkgPath = Join-Path $root "package.json"
$utf8 = New-Object Text.UTF8Encoding($false)
$css = Get-Content $cssPath -Raw
$marker = "LibraryDesk 1.0.27 Fluent Windows 10 refinement"
if (-not $css.Contains($marker)) {
$css += @'

/* LibraryDesk 1.0.27 Fluent Windows 10 refinement */
/* Non-destructive visual refresh. Existing functionality and RTL DOM are preserved. */
:root {
  --fluent-radius: 20px;
  --fluent-shadow: 0 12px 32px rgba(28,45,65,.11), 0 2px 7px rgba(28,45,65,.055);
  --fluent-accent: #087f80;
}
html, body {
  font-family: 'Vazirmatn', sans-serif !important;
  direction: rtl;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
button, input, textarea, select, option {
  font-family: 'Vazirmatn', sans-serif !important;
}
button, a, input, textarea {
  transition: background-color .18s ease, border-color .18s ease,
              box-shadow .18s ease, transform .18s ease, opacity .18s ease;
}
button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--fluent-accent) !important;
  outline-offset: 3px;
}
.top-controls {
  border-radius: 15px !important;
  box-shadow: var(--fluent-shadow) !important;
  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
}
.top-controls button {
  border-radius: 11px !important;
}
.top-controls button:hover {
  transform: translateY(-1px);
}
.time-calendar {
  border-radius: var(--fluent-radius) !important;
  box-shadow: var(--fluent-shadow) !important;
}
.compact-occasion-card {
  border-radius: 13px !important;
}
.embedded-webapps .webapp-card {
  border-radius: 14px !important;
}
.embedded-webapps .webapp-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(26,56,75,.14) !important;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
'@
}
[IO.File]::WriteAllText($cssPath,$css,$utf8)
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if ($pkg.version -ne "1.0.26") { throw "Expected base version 1.0.26" }
$pkg.version = "1.0.27"
[IO.File]::WriteAllText($pkgPath,($pkg | ConvertTo-Json -Depth 20),$utf8)
Write-Host "LibraryDesk 1.0.27 Fluent refinement applied."

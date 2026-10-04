$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\build-src")

function ReadUtf8([string]$path) {
  return [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
}
function WriteUtf8([string]$path, [string]$text) {
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding($false)))
}

# ---- Final card order: clock -> overdue loans -> sites/library -> notes/reminders ----
$cssPath = Join-Path $root "app\styles.css"
$css = ReadUtf8 $cssPath
$css = $css.Replace('grid-template-areas:"brand brand brand brand" "delay notes mid clock"!important;', 'grid-template-areas:"brand brand brand brand" "clock delay mid notes"!important;')
$css = $css.Replace('grid-template-areas:"brand brand" "delay notes" "mid clock"!important', 'grid-template-areas:"brand brand" "clock delay" "mid notes"!important')
$css = $css.Replace('grid-template-areas:"brand" "delay" "notes" "clock" "mid"!important', 'grid-template-areas:"brand" "clock" "delay" "mid" "notes"!important')
WriteUtf8 $cssPath $css

# ---- Automatic stable color for each national ID ----
$appPath = Join-Path $root "app\app.js"
$appjs = ReadUtf8 $appPath
$anchor = "const LOAN_DELAY_COLORS=['#ef6b6b','#f4b942','#2fb8ab','#5f8df5','#9a6fe8','#ef7eb4','#ff865c','#55a86e'];"
$colorFn = @'
const LOAN_DELAY_COLORS=['#ef6b6b','#f4b942','#2fb8ab','#5f8df5','#9a6fe8','#ef7eb4','#ff865c','#55a86e'];
function loanColorForNationalId(value){
 const code=String(value||'').replace(/\D/g,'');
 let h=2166136261;
 for(const ch of code){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
 const r=88+((h>>>0)&95),g=88+((h>>>8)&95),b=88+((h>>>16)&95);
 return '#'+[r,g,b].map(v=>Math.max(68,Math.min(196,v)).toString(16).padStart(2,'0')).join('');
}
'@
if (-not $appjs.Contains($anchor)) { throw "Loan color anchor not found" }
$appjs = $appjs.Replace($anchor, $colorFn.TrimEnd())

# Make the color field follow the entered national ID automatically.
$oldState = "const code=cleanNationalId(input.value);if(input.value!==code)input.value=code;"
$newState = "const code=cleanNationalId(input.value);if(input.value!==code)input.value=code;const colorInput=$('#loanColor');if(colorInput&&code)colorInput.value=loanColorForNationalId(code);"
if (-not $appjs.Contains($oldState)) { throw "National ID state anchor not found" }
$appjs = $appjs.Replace($oldState, $newState)

# Save the generated color from the national ID, rather than one shared default.
$oldAdd = "nationalId=cleanNationalId($('#loanNationalId')?.value),color=$('#loanColor')?.value||LOAN_DELAY_COLORS[0];"
$newAdd = "nationalId=cleanNationalId($('#loanNationalId')?.value),color=loanColorForNationalId(nationalId);"
if (-not $appjs.Contains($oldAdd)) { throw "Loan add color anchor not found" }
$appjs = $appjs.Replace($oldAdd, $newAdd)

# No need to reset a hidden/manual color after save.
$appjs = $appjs.Replace("if($('#loanColor'))$('#loanColor').value=LOAN_DELAY_COLORS[0];", "")
WriteUtf8 $appPath $appjs

# ---- Remove the manual color picker from the add form; color is automatic ----
$htmlPath = Join-Path $root "app\newtab.html"
$html = ReadUtf8 $htmlPath
$html = [regex]::Replace($html, '(?s)\s*<label class="loan-color-label"[^>]*>.*?<input id="loanColor"[^>]*></label>', '')
WriteUtf8 $htmlPath $html

# ---- Version ----
$packagePath = Join-Path $root "package.json"
$pkg = Get-Content $packagePath -Raw -Encoding UTF8 | ConvertFrom-Json
$pkg.version = "1.0.15"
$pkg.description = "LibraryDesk Windows — reordered dashboard, overdue-loan card with national-ID validation and automatic per-member colors"
$pkg | ConvertTo-Json -Depth 20 | Set-Content $packagePath -Encoding UTF8

Write-Host "LibraryDesk 1.0.15 final layout update applied."

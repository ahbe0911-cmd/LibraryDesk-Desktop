$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\build-src")

function ReadUtf8([string]$path) {
  return [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
}
function WriteUtf8([string]$path, [string]$text) {
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding($false)))
}

$htmlPath = Join-Path $root "app\newtab.html"
$html = ReadUtf8 $htmlPath
$html = $html.Replace(">تغییر امانات<", ">تأخیر امانات<")
WriteUtf8 $htmlPath $html

$cssPath = Join-Path $root "app\styles.css"
$css = ReadUtf8 $cssPath
$visualCss = @'

/* ===== LibraryDesk 1.0.17 — Visual-only glass redesign ===== */
:root{
  --ld-glass:rgba(10,42,45,.58);
  --ld-glass-strong:rgba(9,40,43,.72);
  --ld-glass-soft:rgba(255,255,255,.075);
  --ld-line:rgba(255,255,255,.14);
  --ld-glow:rgba(55,205,176,.18);
}
body.light{
  --ld-glass:rgba(255,255,255,.72);
  --ld-glass-strong:rgba(255,255,255,.88);
  --ld-glass-soft:rgba(255,255,255,.58);
  --ld-line:rgba(24,117,101,.14);
  --ld-glow:rgba(29,174,143,.12);
}
body{
  background-position:center!important;
  background-size:cover!important;
}
.bg-overlay{
  background:
    radial-gradient(circle at 9% 18%,rgba(50,197,166,.18),transparent 28%),
    radial-gradient(circle at 92% 10%,rgba(244,200,105,.12),transparent 26%),
    linear-gradient(135deg,rgba(7,34,39,.54),rgba(8,54,53,.28) 48%,rgba(8,37,43,.48))!important;
}
body.light .bg-overlay{
  background:
    radial-gradient(circle at 10% 12%,rgba(46,190,158,.18),transparent 28%),
    radial-gradient(circle at 92% 12%,rgba(244,200,105,.14),transparent 25%),
    linear-gradient(135deg,rgba(239,250,245,.78),rgba(229,247,239,.62) 50%,rgba(247,244,233,.72))!important;
}
.page{
  width:min(1680px,calc(100% - 28px))!important;
  padding:18px 0 24px!important;
}
.hero{
  position:relative!important;
  display:grid!important;
  direction:rtl!important;
  grid-template-columns:minmax(245px,.84fr) minmax(300px,1.03fr) minmax(360px,1.38fr) minmax(305px,1.03fr)!important;
  grid-template-areas:
    "brand brand brand brand"
    "clock loans sites notes"!important;
  gap:18px!important;
  align-items:start!important;
  margin-bottom:18px!important;
}
.hero::before{
  content:""!important;
  position:absolute!important;
  inset:82px -8px -10px!important;
  border-radius:34px!important;
  pointer-events:none!important;
  background:
    linear-gradient(115deg,rgba(65,210,180,.035),transparent 38%,rgba(244,200,105,.03) 70%,transparent),
    radial-gradient(circle at 50% 0,rgba(255,255,255,.035),transparent 38%)!important;
  border:1px solid rgba(255,255,255,.025)!important;
  z-index:-1!important;
}
.brand-top{
  grid-area:brand!important;
  min-height:74px!important;
  padding:10px 18px!important;
  border:1px solid var(--ld-line)!important;
  border-radius:24px!important;
  background:linear-gradient(135deg,var(--ld-glass-strong),rgba(255,255,255,.045))!important;
  backdrop-filter:blur(24px) saturate(135%)!important;
  -webkit-backdrop-filter:blur(24px) saturate(135%)!important;
  box-shadow:0 18px 42px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.13)!important;
  overflow:hidden!important;
}
body.light .brand-top{
  box-shadow:0 18px 40px rgba(28,90,76,.11),inset 0 1px 0 rgba(255,255,255,.95)!important;
}
.brand-top::after{
  inset:auto 22px 0 22px!important;
  height:1px!important;
  background:linear-gradient(90deg,transparent,rgba(81,212,181,.48),rgba(244,200,105,.38),transparent)!important;
}
.brand-mark{
  width:54px!important;height:54px!important;border-radius:17px!important;
  box-shadow:0 10px 24px rgba(3,70,66,.25),inset 0 1px 0 rgba(255,255,255,.26)!important;
}
.brand-mark svg{width:36px!important;height:36px!important}
.brand{font-size:clamp(21px,2.05vw,31px)!important}
.subtitle{font-size:12px!important;margin-top:2px!important}

.card{
  border:1px solid var(--ld-line)!important;
  border-radius:24px!important;
  background:
    linear-gradient(150deg,rgba(255,255,255,.085),rgba(255,255,255,.018)),
    var(--ld-glass)!important;
  backdrop-filter:blur(24px) saturate(140%)!important;
  -webkit-backdrop-filter:blur(24px) saturate(140%)!important;
  box-shadow:
    0 20px 44px rgba(0,0,0,.19),
    inset 0 1px 0 rgba(255,255,255,.12)!important;
  overflow:hidden!important;
}
body.light .card{
  background:
    linear-gradient(145deg,rgba(255,255,255,.86),rgba(245,255,251,.64)),
    var(--ld-glass)!important;
  box-shadow:
    0 18px 40px rgba(31,101,84,.12),
    inset 0 1px 0 rgba(255,255,255,.98)!important;
}
.card::before{
  inset:0 26px auto 26px!important;
  height:2px!important;
  opacity:.72!important;
  background:linear-gradient(90deg,transparent,rgba(71,213,181,.65),rgba(244,200,105,.55),transparent)!important;
}
.card::after{
  content:""!important;
  position:absolute!important;
  width:150px!important;height:150px!important;
  border-radius:50%!important;
  left:-78px!important;top:-88px!important;
  background:radial-gradient(circle,rgba(79,214,183,.13),transparent 68%)!important;
  pointer-events:none!important;
}

.time-calendar{
  grid-area:clock!important;
  width:100%!important;
  max-width:none!important;
  min-height:535px!important;
  padding:18px 16px!important;
  display:flex!important;
  flex-direction:column!important;
  align-items:stretch!important;
  gap:14px!important;
  background:
    radial-gradient(circle at 10% 7%,rgba(244,200,105,.12),transparent 27%),
    linear-gradient(150deg,rgba(255,255,255,.09),rgba(34,180,150,.045)),
    var(--ld-glass)!important;
}
body.light .time-calendar{
  background:
    radial-gradient(circle at 12% 6%,rgba(244,200,105,.17),transparent 29%),
    linear-gradient(150deg,rgba(255,255,255,.93),rgba(232,250,243,.72))!important;
}
.analog-clock-shell{
  min-height:210px!important;
  display:grid!important;
  place-items:center!important;
  padding:5px 0 0!important;
}
.analog-clock{
  width:184px!important;height:184px!important;
  border:3px solid #202528!important;
  outline:5px solid rgba(255,255,255,.18)!important;
  outline-offset:1px!important;
  box-shadow:
    0 18px 34px rgba(0,0,0,.20),
    0 0 0 1px rgba(0,0,0,.12),
    inset 0 0 0 2px #dedbd4,
    inset 0 0 0 5px #faf9f5!important;
}
.clock-number{font-size:20px!important;min-width:23px!important}
.n12{top:14%!important}.n1{left:68%!important;top:19%!important}.n2{left:81%!important;top:32%!important}
.n3{left:86%!important}.n4{left:81%!important;top:68%!important}.n5{left:68%!important;top:81%!important}
.n6{top:86%!important}.n7{left:32%!important;top:81%!important}.n8{left:19%!important;top:68%!important}
.n9{left:14%!important}.n10{left:19%!important;top:32%!important}.n11{left:32%!important;top:19%!important}
.hour-hand{height:44px!important;width:7px!important;margin-left:-3.5px!important}
.minute-hand{height:61px!important;width:4.5px!important;margin-left:-2.25px!important}
.second-hand{height:67px!important}
.today-date-box{
  min-height:74px!important;
  padding:11px 12px!important;
  border-radius:18px!important;
  border:1px solid var(--ld-line)!important;
  background:linear-gradient(135deg,rgba(45,190,157,.15),rgba(255,255,255,.055),rgba(244,200,105,.09))!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10)!important;
}
body.light .today-date-box{
  background:linear-gradient(135deg,rgba(222,249,240,.92),rgba(255,255,255,.88),rgba(255,245,218,.78))!important;
}
.today-date-icon{border-radius:14px!important}
.today-occasion-card{
  min-height:78px!important;
  border-radius:18px!important;
  border:1px solid var(--ld-line)!important;
  background:linear-gradient(135deg,rgba(244,200,105,.13),rgba(255,255,255,.045),rgba(74,207,178,.08))!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important;
}

.loan-change-card{
  grid-area:loans!important;
  min-height:535px!important;
  padding:18px!important;
  gap:12px!important;
  background:
    radial-gradient(circle at 90% 5%,rgba(244,200,105,.12),transparent 28%),
    linear-gradient(150deg,rgba(255,255,255,.085),rgba(45,190,157,.035)),
    var(--ld-glass)!important;
}
body.light .loan-change-card{
  background:
    radial-gradient(circle at 90% 5%,rgba(244,200,105,.16),transparent 28%),
    linear-gradient(150deg,rgba(255,255,255,.93),rgba(239,251,246,.75))!important;
}
.loan-card-head{padding-bottom:8px!important;border-bottom:1px solid var(--ld-line)!important}
.loan-card-head .card-title{font-size:16px!important;margin-bottom:1px!important}
.loan-card-head p{font-size:10px!important}
.loan-card-icon,.workspace-head>span{
  width:42px!important;height:42px!important;border-radius:14px!important;
  background:linear-gradient(145deg,rgba(49,193,162,.20),rgba(244,200,105,.14))!important;
  border:1px solid var(--ld-line)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10)!important;
}
.loan-change-form{gap:10px!important}
.loan-change-form label{font-size:11px!important}
.loan-change-form input{
  min-height:39px!important;
  border-radius:12px!important;
  border-color:var(--ld-line)!important;
  background:rgba(255,255,255,.055)!important;
}
body.light .loan-change-form input{background:rgba(247,252,250,.88)!important}
.loan-save-btn{
  min-height:41px!important;border-radius:13px!important;
  background:linear-gradient(135deg,#12988a,#18b09b)!important;
  box-shadow:0 9px 20px rgba(11,126,112,.20),inset 0 1px 0 rgba(255,255,255,.22)!important;
}
.loan-table-wrap{
  max-height:225px!important;
  border-radius:14px!important;
  border-color:var(--ld-line)!important;
  background:rgba(255,255,255,.035)!important;
}
body.light .loan-table-wrap{background:rgba(248,252,250,.72)!important}

.sites-workspace{
  grid-area:sites!important;
  min-height:535px!important;
  max-height:none!important;
  padding:18px!important;
  gap:12px!important;
  background:
    radial-gradient(circle at 95% 7%,rgba(60,204,175,.12),transparent 27%),
    linear-gradient(150deg,rgba(255,255,255,.085),rgba(64,200,172,.03)),
    var(--ld-glass)!important;
}
body.light .sites-workspace{
  background:
    radial-gradient(circle at 94% 7%,rgba(47,188,157,.13),transparent 28%),
    linear-gradient(150deg,rgba(255,255,255,.94),rgba(235,250,244,.76))!important;
}
.workspace-head{padding-bottom:8px!important;border-bottom:1px solid var(--ld-line)!important}
.workspace-head strong{font-size:16px!important}
.workspace-head small{font-size:10px!important}
.site-search-section{
  border-radius:16px!important;
  border:1px solid var(--ld-line)!important;
  background:rgba(255,255,255,.05)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important;
}
body.light .site-search-section{background:rgba(247,252,250,.82)!important}
.sites-workspace .categories{
  max-height:245px!important;
  padding:2px 3px 2px 0!important;
}
.category,.site-btn,.webapp-card{
  border-color:var(--ld-line)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.07)!important;
}
.embedded-webapps{padding-top:12px!important}
.embedded-webapps .webapp-card{min-height:74px!important;border-radius:16px!important}

.notes-wrap{
  grid-area:notes!important;
  min-height:535px!important;
  max-height:none!important;
  padding:18px!important;
  background:
    radial-gradient(circle at 92% 5%,rgba(139,114,232,.09),transparent 27%),
    linear-gradient(150deg,rgba(255,255,255,.08),rgba(79,195,167,.03)),
    var(--ld-glass)!important;
}
body.light .notes-wrap{
  background:
    radial-gradient(circle at 92% 5%,rgba(139,114,232,.09),transparent 28%),
    linear-gradient(150deg,rgba(255,255,255,.94),rgba(240,249,246,.76))!important;
}
.notebook-tabs{
  padding:5px!important;border-radius:15px!important;
  background:rgba(255,255,255,.055)!important;
  border:1px solid var(--ld-line)!important;
}
body.light .notebook-tabs{background:rgba(242,250,247,.88)!important}
.notebook-tab{min-height:38px!important;border-radius:11px!important}
.notebook-tab.active{
  background:linear-gradient(135deg,#119486,#18a995)!important;
  color:#fff!important;
  box-shadow:0 8px 18px rgba(10,129,115,.18)!important;
}
.note-add textarea,.reminder-form input,.reminder-form select,.reminder-picker-btn{
  border-color:var(--ld-line)!important;
  background:rgba(255,255,255,.055)!important;
}
body.light .note-add textarea,
body.light .reminder-form input,
body.light .reminder-form select,
body.light .reminder-picker-btn{background:rgba(248,252,250,.88)!important}
.notes-list,.reminders-list{max-height:350px!important}

.site-footer{
  width:min(1680px,calc(100% - 28px))!important;
  margin:0 auto!important;
  padding:8px 0 18px!important;
  opacity:.8!important;
}

@media(max-width:1380px){
  .page{width:min(1320px,calc(100% - 24px))!important}
  .hero{
    grid-template-columns:minmax(225px,.82fr) minmax(270px,1fr) minmax(330px,1.3fr) minmax(270px,1fr)!important;
    gap:14px!important;
  }
  .card{border-radius:21px!important}
}
@media(max-width:1120px){
  .hero{
    grid-template-columns:1fr 1fr!important;
    grid-template-areas:
      "brand brand"
      "clock loans"
      "sites notes"!important;
  }
  .time-calendar,.loan-change-card,.sites-workspace,.notes-wrap{min-height:0!important}
}
@media(max-width:760px){
  .page{width:min(100% - 16px,720px)!important;padding-top:12px!important}
  .hero{
    grid-template-columns:1fr!important;
    grid-template-areas:"brand" "clock" "loans" "sites" "notes"!important;
    gap:12px!important;
  }
  .brand-top{padding:10px 12px!important}
  .brand-mark{width:46px!important;height:46px!important}
  .time-calendar,.loan-change-card,.sites-workspace,.notes-wrap{width:100%!important}
  .analog-clock{width:174px!important;height:174px!important}
}
'@
$css += $visualCss
WriteUtf8 $cssPath $css

$packagePath = Join-Path $root "package.json"
$pkg = Get-Content $packagePath -Raw -Encoding UTF8 | ConvertFrom-Json
$pkg.version = "1.0.17"
$pkg.description = "LibraryDesk Windows — visual-only glass dashboard redesign; delay-loans label corrected"
[IO.File]::WriteAllText($packagePath, ($pkg | ConvertTo-Json -Depth 20), (New-Object Text.UTF8Encoding($false)))

Write-Host "LibraryDesk 1.0.17 visual redesign applied."

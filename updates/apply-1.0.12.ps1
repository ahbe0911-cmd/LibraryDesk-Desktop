$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\build-src")
$nl = [Environment]::NewLine

function ReadUtf8([string]$path) {
  return [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
}
function WriteUtf8([string]$path, [string]$text) {
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding($false)))
}

$htmlPath = Join-Path $root "app\newtab.html"
$html = ReadUtf8 $htmlPath
$clockPattern = '(?s)(<div class="analog-clock" id="analogClock"[^>]*>).*?(</div>)'
$clockInner = @'
          <span class="clock-face-ring" aria-hidden="true"></span>
          <span class="clock-number n12">۱۲</span>
          <span class="clock-number n1">۱</span>
          <span class="clock-number n2">۲</span>
          <span class="clock-number n3">۳</span>
          <span class="clock-number n4">۴</span>
          <span class="clock-number n5">۵</span>
          <span class="clock-number n6">۶</span>
          <span class="clock-number n7">۷</span>
          <span class="clock-number n8">۸</span>
          <span class="clock-number n9">۹</span>
          <span class="clock-number n10">۱۰</span>
          <span class="clock-number n11">۱۱</span>
          <span class="clock-hand hour-hand" id="hourHand"></span>
          <span class="clock-hand minute-hand" id="minuteHand"></span>
          <span class="clock-hand second-hand" id="secondHand"></span>
          <span class="clock-pin"></span>
'@
$rx = [regex]::new($clockPattern)
if (-not $rx.IsMatch($html)) { throw "Analog clock block not found" }
$html = $rx.Replace($html, { param($m) $m.Groups[1].Value + $nl + $clockInner + "        " + $m.Groups[2].Value }, 1)
WriteUtf8 $htmlPath $html

$cssPath = Join-Path $root "app\styles.css"
$css = ReadUtf8 $cssPath
$clockCss = @'

/* ===== LibraryDesk 1.0.12 — ساعت دیواری واقعی ===== */
.time-calendar.analog-clock-card{
  gap:14px;
}
.analog-clock{
  position:relative;
  width:226px;
  height:226px;
  border-radius:50%;
  border:4px solid #151718;
  outline:1px solid rgba(255,255,255,.22);
  outline-offset:1px;
  overflow:hidden;
  background:
    radial-gradient(circle at 38% 28%,rgba(255,255,255,.96) 0 13%,rgba(255,255,255,0) 37%),
    radial-gradient(circle at 50% 52%,#fffef9 0 61%,#f3f1ea 82%,#e7e4dc 100%);
  box-shadow:
    0 16px 32px rgba(0,0,0,.30),
    0 3px 7px rgba(0,0,0,.28),
    inset 0 0 0 3px #d8d6d0,
    inset 0 0 0 7px #f7f6f2,
    inset 0 -7px 18px rgba(0,0,0,.07);
}
body.light .analog-clock{
  border-color:#17191a;
  background:
    radial-gradient(circle at 38% 28%,#fff 0 13%,rgba(255,255,255,0) 37%),
    radial-gradient(circle at 50% 52%,#fffef9 0 61%,#f5f3ed 82%,#e9e6df 100%);
  box-shadow:
    0 16px 30px rgba(28,42,40,.20),
    0 3px 7px rgba(0,0,0,.18),
    inset 0 0 0 3px #d9d7d1,
    inset 0 0 0 7px #fbfaf6,
    inset 0 -7px 18px rgba(0,0,0,.06);
}
.analog-clock::before{
  content:"";
  position:absolute;
  inset:7px;
  border-radius:50%;
  z-index:1;
  pointer-events:none;
  box-shadow:
    inset 0 1px 3px rgba(255,255,255,.94),
    inset 0 -2px 6px rgba(0,0,0,.08);
}
.analog-clock::after{
  content:"";
  position:absolute;
  inset:9px;
  border-radius:50%;
  z-index:2;
  pointer-events:none;
  background:repeating-conic-gradient(
    from -1.25deg,
    #141617 0 2.5deg,
    transparent 2.5deg 30deg
  );
  -webkit-mask:radial-gradient(circle,transparent 0 91px,#000 92px 99px,transparent 100px);
  mask:radial-gradient(circle,transparent 0 91px,#000 92px 99px,transparent 100px);
}
.clock-face-ring{
  position:absolute;
  inset:10px;
  border-radius:50%;
  z-index:2;
  pointer-events:none;
  opacity:.58;
  background:repeating-conic-gradient(
    from -.55deg,
    #55585a 0 1.1deg,
    transparent 1.1deg 6deg
  );
  -webkit-mask:radial-gradient(circle,transparent 0 88px,#000 89px 96px,transparent 97px);
  mask:radial-gradient(circle,transparent 0 88px,#000 89px 96px,transparent 97px);
}
.clock-number{
  --a:0deg;
  position:absolute;
  left:50%;
  top:50%;
  z-index:5;
  min-width:30px;
  height:31px;
  display:grid;
  place-items:center;
  transform:
    translate(-50%,-50%)
    rotate(var(--a))
    translateY(-72px)
    rotate(calc(-1 * var(--a)));
  color:#111314;
  font-family:Vazirmatn,Tahoma,Arial,sans-serif;
  font-size:23px;
  line-height:1;
  font-weight:700;
  letter-spacing:-.7px;
  text-shadow:0 1px 0 rgba(255,255,255,.55);
  font-variant-numeric:tabular-nums;
  pointer-events:none;
}
.n12{--a:0deg}.n1{--a:30deg}.n2{--a:60deg}.n3{--a:90deg}
.n4{--a:120deg}.n5{--a:150deg}.n6{--a:180deg}.n7{--a:210deg}
.n8{--a:240deg}.n9{--a:270deg}.n10{--a:300deg}.n11{--a:330deg}
.clock-hand{
  position:absolute;
  left:50%;
  bottom:50%;
  transform-origin:50% 100%;
  border-radius:999px 999px 3px 3px;
  box-shadow:0 1px 2px rgba(0,0,0,.28);
  will-change:transform;
}
.hour-hand{
  width:8px;
  height:55px;
  margin-left:-4px;
  z-index:7;
  background:linear-gradient(90deg,#0d0f10 0%,#3c3e40 46%,#0b0d0e 100%);
}
.minute-hand{
  width:5px;
  height:76px;
  margin-left:-2.5px;
  z-index:8;
  background:linear-gradient(90deg,#0b0d0e 0%,#343638 48%,#080a0b 100%);
}
.second-hand{
  width:1.6px;
  height:84px;
  margin-left:-.8px;
  z-index:10;
  background:#1b1d1e;
  box-shadow:none;
}
.second-hand::after{
  content:"";
  position:absolute;
  left:50%;
  bottom:-24px;
  width:2px;
  height:25px;
  transform:translateX(-50%);
  background:#1b1d1e;
  border-radius:0 0 2px 2px;
}
.clock-pin{
  position:absolute;
  left:50%;
  top:50%;
  z-index:12;
  width:13px;
  height:13px;
  transform:translate(-50%,-50%);
  border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#fff2ad 0 16%,#d6aa37 34%,#8b6517 74%,#4f380d 100%);
  border:1px solid rgba(54,39,7,.75);
  box-shadow:0 1px 3px rgba(0,0,0,.35);
}
.clock-week-orbit,.clock-weekday,.clock-current-day,.clock-mark{display:none!important}
@media(max-width:1020px){
  .analog-clock{width:206px;height:206px}
  .analog-clock::after{
    -webkit-mask:radial-gradient(circle,transparent 0 82px,#000 83px 90px,transparent 91px);
    mask:radial-gradient(circle,transparent 0 82px,#000 83px 90px,transparent 91px);
  }
  .clock-face-ring{
    -webkit-mask:radial-gradient(circle,transparent 0 79px,#000 80px 87px,transparent 88px);
    mask:radial-gradient(circle,transparent 0 79px,#000 80px 87px,transparent 88px);
  }
  .clock-number{font-size:21px;transform:translate(-50%,-50%) rotate(var(--a)) translateY(-65px) rotate(calc(-1 * var(--a)))}
  .hour-hand{height:50px}
  .minute-hand{height:69px}
  .second-hand{height:76px}
}
'@
$css += $clockCss
WriteUtf8 $cssPath $css

$packagePath = Join-Path $root "package.json"
$pkg = Get-Content $packagePath -Raw -Encoding UTF8 | ConvertFrom-Json
$pkg.version = "1.0.12"
$pkg.description = "کتابخانه سید احمد خمینی صفی‌آباد — نسخه ویندوز با ساعت عقربه‌ای زنده و واقع‌گرایانه"
$pkg | ConvertTo-Json -Depth 20 | Set-Content $packagePath -Encoding UTF8

Write-Host "LibraryDesk 1.0.12 realistic clock update applied."

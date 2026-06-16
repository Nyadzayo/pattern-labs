/* Render branded social cards (OG link card + X/LinkedIn product cards) to PNG.
   Run: node render-social.cjs */
const fs = require('fs')
const path = require('path')
// Resolve puppeteer portably: env override, then a local install, then a global one.
const puppeteer = (() => {
  for (const p of [process.env.PUPPETEER_PATH, 'puppeteer', `${process.env.HOME}/.nvm/versions/node/v18.20.8/lib/node_modules/puppeteer-mcp-claude/node_modules/puppeteer`].filter(Boolean)) {
    try { return require(p) } catch { /* try next */ }
  }
  throw new Error('puppeteer not found — `npm i -g puppeteer` or set PUPPETEER_PATH')
})()

const OUT = path.join(__dirname, 'social')
const SHOTS = path.join(__dirname, 'screenshots')
const dataUri = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, f)).toString('base64')

const FONT = `-apple-system, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
const css = `
  *{margin:0;padding:0;box-sizing:border-box;font-family:${FONT};-webkit-font-smoothing:antialiased}
  body{background:#08090d}
  .card{position:relative;overflow:hidden;background:
    radial-gradient(1100px 600px at 78% -10%, rgba(99,102,241,.28), transparent 60%),
    radial-gradient(800px 500px at 5% 115%, rgba(129,140,248,.16), transparent 55%), #08090d;color:#f3f4f7}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(70% 70% at 50% 30%,#000,transparent)}
  .brand{display:flex;align-items:center;gap:14px}
  .logo{width:54px;height:54px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#818cf8);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;color:#fff;box-shadow:0 8px 30px rgba(99,102,241,.45)}
  .wm{font-size:30px;font-weight:650;letter-spacing:-.02em}
  .accent{color:#a5b4fc}
  .chips{display:flex;flex-wrap:wrap;gap:12px}
  .chips span{font-size:21px;font-weight:550;color:#c7cad4;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);padding:9px 18px;border-radius:999px}
  .foot{color:#8b8f9c;font-size:21px;font-weight:500;letter-spacing:.01em}
  .frame{border:1px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.55)}
  .frame img{display:block;width:100%}
`

const cards = [
  {
    name: 'og-1200x630.png', w: 1200, h: 630,
    html: `<div class="card" style="width:1200px;height:630px;padding:74px 76px;display:flex;flex-direction:column;justify-content:space-between">
      <div class="grid"></div>
      <div class="brand" style="position:relative"><div class="logo">λ</div><span class="wm">Pattern Lab</span></div>
      <div style="position:relative">
        <h1 style="font-size:74px;font-weight:760;line-height:1.04;letter-spacing:-.03em">Train pattern <span class="accent">recognition.</span><br>Not problem count.</h1>
        <p style="margin-top:22px;font-size:27px;line-height:1.45;color:#c2c6d2;max-width:880px">Spot the pattern, recall the idiom, transfer the structure — the skills interviews actually test, drilled directly. Runs entirely in your browser.</p>
      </div>
      <div style="position:relative;display:flex;flex-direction:column;gap:24px">
        <div class="chips"><span>Subgoal labeling</span><span>Pattern Sprint</span><span>Code Katas</span><span>Calibration</span></div>
        <div class="foot">19 patterns · in-browser Python · spaced repetition · no account, no subscription</div>
      </div>
    </div>`,
  },
  {
    name: 'x-card.png', w: 1200, h: 675,
    html: `<div class="card" style="width:1200px;height:675px;padding:64px;display:flex;align-items:center;gap:54px">
      <div class="grid"></div>
      <div style="position:relative;width:470px;flex:none;display:flex;flex-direction:column;gap:26px">
        <div class="brand"><div class="logo">λ</div><span class="wm">Pattern Lab</span></div>
        <h1 style="font-size:54px;font-weight:760;line-height:1.06;letter-spacing:-.03em">Label a solution's steps <span class="accent">in your own words.</span></h1>
        <p style="font-size:25px;line-height:1.45;color:#c2c6d2">The research-backed way to make patterns transfer to problems you've never seen — graded and corrected, not just read.</p>
        <div class="chips"><span>Generate-then-reveal</span><span>19 patterns</span></div>
      </div>
      <div class="frame" style="position:relative;flex:1"><img src="${dataUri('02-subgoal-reveal.png')}"/></div>
    </div>`,
  },
  {
    name: 'linkedin-card.png', w: 1200, h: 627,
    html: `<div class="card" style="width:1200px;height:627px;padding:60px;display:flex;align-items:center;gap:52px">
      <div class="grid"></div>
      <div style="position:relative;width:470px;flex:none;display:flex;flex-direction:column;gap:24px">
        <div class="brand"><div class="logo">λ</div><span class="wm">Pattern Lab</span></div>
        <h1 style="font-size:52px;font-weight:760;line-height:1.07;letter-spacing:-.03em">See exactly where you're <span class="accent">overconfident.</span></h1>
        <p style="font-size:24px;line-height:1.45;color:#c2c6d2">Predict before every answer, then check. Calibration turns "I think I know this pattern" into data — and points you at the one to drill.</p>
        <div class="chips"><span>Predict-then-check</span><span>Mock + report</span></div>
      </div>
      <div class="frame" style="position:relative;flex:1"><img src="${dataUri('01-hero-dashboard.png')}"/></div>
    </div>`,
  },
]

;(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--force-color-profile=srgb'] })
  const page = await browser.newPage()
  for (const c of cards) {
    await page.setViewport({ width: c.w, height: c.h, deviceScaleFactor: 2 })
    await page.setContent(`<!doctype html><html><head><meta charset="utf8"><style>${css}</style></head><body>${c.html}</body></html>`, { waitUntil: 'load' })
    await new Promise((r) => setTimeout(r, 250))
    await page.screenshot({ path: path.join(OUT, c.name), clip: { x: 0, y: 0, width: c.w, height: c.h } })
    console.log('  ✓', c.name)
  }
  await browser.close()
  console.log('done')
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })

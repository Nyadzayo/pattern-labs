/* Build clean GIFs of the headline interactions: capture PNG frame sequences from
   headless Chrome, assemble with ffmpeg (palettegen). Run: node gifs.cjs
   Requires the dev server at http://localhost:5176 and ffmpeg on PATH. */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
// Resolve puppeteer portably: env override, then a local install, then a global one.
const puppeteer = (() => {
  for (const p of [process.env.PUPPETEER_PATH, 'puppeteer', `${process.env.HOME}/.nvm/versions/node/v18.20.8/lib/node_modules/puppeteer-mcp-claude/node_modules/puppeteer`].filter(Boolean)) {
    try { return require(p) } catch { /* try next */ }
  }
  throw new Error('puppeteer not found — `npm i -g puppeteer` or set PUPPETEER_PATH')
})()

const BASE = 'http://localhost:5176/#'
const OUT = path.join(__dirname, 'gifs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const SEED = { version: 1, theme: 'dark', conceptRead: { 'two-pointers': true }, attemptFirst: false }

async function clickText(page, text) {
  await page.waitForFunction((t) => [...document.querySelectorAll('button,a,summary,label')].some((e) => e.textContent.trim().includes(t)), { timeout: 8000 }, text)
  await page.evaluate((t) => { const e = [...document.querySelectorAll('button,a,summary,label')].find((x) => x.textContent.trim().includes(t)); if (e) e.click() }, text)
}
async function clickAttr(page, needle) {
  return page.evaluate((s) => { const b = [...document.querySelectorAll('button')].find((x) => ((x.getAttribute('title') || '') + (x.getAttribute('aria-label') || '')).toLowerCase().includes(s)); if (b) { b.click(); return true } return false }, needle)
}

function assemble(frameDir, outFile, { fps = 2, width = 1000, holdLast = 4 }) {
  const frames = fs.readdirSync(frameDir).filter((f) => f.endsWith('.png')).sort()
  // duplicate the last frame so the GIF pauses on the result before looping
  const last = frames[frames.length - 1]
  let n = frames.length
  for (let k = 0; k < holdLast; k++) fs.copyFileSync(path.join(frameDir, last), path.join(frameDir, `z${String(n++).padStart(3, '0')}.png`))
  execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-pattern_type', 'glob', '-i', path.join(frameDir, '*.png'),
    '-vf', `scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`,
    '-loop', '0', outFile], { stdio: 'ignore' })
  fs.rmSync(frameDir, { recursive: true, force: true })
}

;(async () => {
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 }, args: ['--no-sandbox', '--force-color-profile=srgb'], protocolTimeout: 120000 })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((s) => localStorage.setItem('pattern-lab:v1', JSON.stringify(s)), SEED)

  // ---------- GIF 1: visualizer step-through (the animated walk + subgoal chips) ----------
  {
    const dir = path.join(OUT, '_viz'); fs.mkdirSync(dir, { recursive: true })
    await page.goto(BASE + '/module/two-pointers?tab=visualize', { waitUntil: 'load' }); await sleep(1000)
    const clip = { x: 224, y: 150, width: 1072, height: 404 }
    let f = 0
    await page.screenshot({ path: path.join(dir, `f${String(f++).padStart(3, '0')}.png`), clip })
    for (let i = 0; i < 11; i++) {
      const ok = await clickAttr(page, 'forward')
      if (!ok) { await page.keyboard.press('ArrowRight') }
      await sleep(320)
      await page.screenshot({ path: path.join(dir, `f${String(f++).padStart(3, '0')}.png`), clip })
    }
    assemble(dir, path.join(OUT, 'visualizer.gif'), { fps: 2.2, width: 920, holdLast: 3 })
    console.log('  ✓ visualizer.gif')
  }

  // ---------- GIF 2: label-the-subgoals (type -> reveal -> feedback) ----------
  {
    const dir = path.join(OUT, '_label'); fs.mkdirSync(dir, { recursive: true })
    await page.goto(BASE + '/module/two-pointers/problem/voltage-pair', { waitUntil: 'load' }); await sleep(800)
    await clickText(page, 'Show solution'); await sleep(350)
    await clickText(page, 'Show me the solution'); await sleep(600)
    await clickText(page, 'Confident'); await sleep(600) // solution-reveal confidence
    await clickText(page, 'Start'); await sleep(500)
    await page.evaluate(() => { const el = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === 'Label the subgoals'); if (el) el.scrollIntoView({ block: 'start' }) })
    await sleep(400)
    const clip = { x: 140, y: 70, width: 760, height: 760 }
    let f = 0
    const snap = async () => page.screenshot({ path: path.join(dir, `f${String(f++).padStart(3, '0')}.png`), clip })
    await snap() // empty
    const labels = ['pointers at both ends', 'sum the two ends', 'match returns the pair']
    const inputs = (await page.$$('input'))
    const fields = []
    for (const h of inputs) { const ph = await (await h.getProperty('placeholder')).jsonValue(); if (ph && ph.startsWith('e.g.')) fields.push(h) }
    for (let i = 0; i < labels.length && i < fields.length; i++) { await fields[i].click({ clickCount: 3 }); await fields[i].type(labels[i], { delay: 22 }); await sleep(120); await snap() }
    await clickText(page, 'Reveal & compare'); await sleep(500)
    await clickText(page, 'Confident'); await sleep(800) // subgoal confidence, then reveal
    await snap()
    assemble(dir, path.join(OUT, 'label-the-subgoals.gif'), { fps: 1.5, width: 720, holdLast: 5 })
    console.log('  ✓ label-the-subgoals.gif')
  }

  await browser.close()
  console.log('done')
})().catch((e) => { console.error('GIF FAILED:', e.message); process.exit(1) })

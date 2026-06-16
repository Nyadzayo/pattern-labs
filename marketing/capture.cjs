/* Launch-asset capture: drives the live Pattern Lab dev server in headless Chrome,
   seeds a realistic demo profile, and writes retina PNGs of each headline feature.
   Run:  node capture.cjs   (dev server must be up at http://localhost:5176) */
const path = require('path')
// Resolve puppeteer portably: env override, then a local install, then a global one.
const puppeteer = (() => {
  for (const p of [process.env.PUPPETEER_PATH, 'puppeteer', `${process.env.HOME}/.nvm/versions/node/v18.20.8/lib/node_modules/puppeteer-mcp-claude/node_modules/puppeteer`].filter(Boolean)) {
    try { return require(p) } catch { /* try next */ }
  }
  throw new Error('puppeteer not found — `npm i -g puppeteer` or set PUPPETEER_PATH')
})()

const BASE = 'http://localhost:5176/#'
const OUT = path.join(__dirname, 'screenshots')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TODAY = new Date().toISOString().slice(0, 10) // keep the seeded streak "active" today

// ---- realistic demo profile (a mid-prep learner) ----
const cal = (confidence, correct, moduleId) => ({ at: '2026-06-12T10:00:00Z', surface: 'quiz', confidence, moduleId, correct })
const calibration = [
  cal(3, false, 'binary-search'), cal(3, false, 'binary-search'), cal(2, false, 'binary-search'), cal(3, true, 'binary-search'), cal(2, true, 'binary-search'),
  cal(3, true, 'two-pointers'), cal(2, true, 'two-pointers'), cal(3, true, 'two-pointers'), cal(1, false, 'two-pointers'),
  cal(2, true, 'sliding-windows'), cal(2, false, 'sliding-windows'), cal(3, true, 'sliding-windows'),
  cal(1, true, 'hash-maps-sets'), cal(0, false, 'hash-maps-sets'), cal(2, true, 'hash-maps-sets'),
  cal(0, false, 'stacks'), cal(0, true, 'stacks'), cal(1, false, 'trees'), cal(1, true, 'trees'),
  cal(3, true, 'linked-lists'), cal(2, true, 'linked-lists'), cal(0, false, 'graphs'),
]
const solved = {
  'two-pointers/voltage-pair': 'solved-clean', 'two-pointers/telemetry-retention': 'solved-clean',
  'hash-maps-sets/gift-card-pair': 'solved-with-help', 'hash-maps-sets/scrambled-tags': 'solved-clean',
  'sliding-windows/solar-sprint': 'solved-clean', 'sliding-windows/unique-scan-streak': 'solved-with-help',
  'binary-search/build-archive-lookup': 'solved-clean', 'binary-search/section-scan-span': 'solved-with-help',
  'linked-lists/turntable-recoupling': 'solved-clean', 'linked-lists/replica-log-merge': 'solved-clean',
  'stacks/manifest-linter': 'solved-clean', 'stacks/rollout-rules': 'solved-with-help',
  'trees/mast-tolerance': 'solved-clean', 'trees/tier-averages': 'solved-clean',
}
const problems = {}
for (const [k, status] of Object.entries(solved)) problems[k] = { status, hintsUsed: status === 'solved-with-help' ? 2 : 0, viewedSolution: status === 'solved-with-help' }
const conceptRead = {}
;['two-pointers', 'hash-maps-sets', 'sliding-windows', 'binary-search', 'linked-lists', 'stacks', 'trees'].forEach((m) => (conceptRead[m] = true))
const STATE = {
  version: 1, theme: 'dark', conceptRead, problems, quizAttempts: {}, cards: {}, drafts: {},
  lastVisited: { moduleId: 'two-pointers', tab: 'practice' },
  streak: { lastActive: TODAY, count: 6 }, mockReports: [],
  drills: {
    'tp-opposite-ends': { rung: 7, schedule: { reps: 4, intervalDays: 8, ease: 2.6, due: '2026-06-20', lapses: 0 }, rung6PassDates: ['2026-06-10', '2026-06-12'], mastered: true },
    'sw-shrink-left': { rung: 4, schedule: { reps: 2, intervalDays: 2, ease: 2.5, due: '2026-06-14', lapses: 0 }, rung6PassDates: [], mastered: false },
    'hash-complement-lookup': { rung: 6, schedule: { reps: 3, intervalDays: 4, ease: 2.5, due: '2026-06-15', lapses: 0 }, rung6PassDates: ['2026-06-11'], mastered: false },
  },
  sprint: {}, sprintStats: { bestSprint: 5200, bestSuddenDeath: 17 },
  katas: { 'tp-opposite-ends': { bestSeconds: 38, attempts: [{ at: '2026-06-10', mode: 'blank', seconds: 52, accuracy: 1, wpm: 34 }, { at: '2026-06-12', mode: 'blank', seconds: 38, accuracy: 1, wpm: 41 }], automaticDates: ['2026-06-10', '2026-06-12'], automatic: true } },
  lastWarmup: '',
  subgoals: {}, calibration,
  productiveFailure: { 'two-pointers': { attemptCode: 'def find_voltage_pair(voltages, target):\n    pass  # sort then scan from both ends?', attemptedAt: '2026-06-12T09:00:00Z', skipped: false } },
  attemptFirst: true,
}

async function clickText(page, text) {
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('button,a,summary,label,[role=switch]')].some((e) => e.textContent.trim().includes(t)),
    { timeout: 8000 }, text,
  )
  await page.evaluate((t) => {
    const e = [...document.querySelectorAll('button,a,summary,label,[role=switch]')].find((x) => x.textContent.trim().includes(t))
    if (e) e.click()
  }, text)
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name) })
  console.log('  ✓', name)
}

async function goto(page, route) {
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 30000 })
  await sleep(700)
}

;(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--force-color-profile=srgb'],
    protocolTimeout: 120000,
  })
  const page = await browser.newPage()

  // Seed the profile BEFORE any app code runs on every navigation, so storage.ts
  // load() reads it on first paint (a post-load setItem races the initial persist).
  await page.evaluateOnNewDocument((s) => {
    localStorage.setItem('pattern-lab:v1', JSON.stringify(s))
  }, STATE)

  // 01 hero dashboard
  await goto(page, '/')
  await sleep(600)
  await shot(page, '01-hero-dashboard.png')

  // 06 confidence + 02 subgoal reveal (one flow)
  await goto(page, '/module/two-pointers/problem/voltage-pair')
  await clickText(page, 'Show solution'); await sleep(400)
  await clickText(page, 'Show me the solution'); await sleep(700)
  await shot(page, '06-confidence.png')
  await clickText(page, 'Confident'); await sleep(700)
  await clickText(page, 'Start'); await sleep(500)
  const labels = ['place a pointer at each end', 'loop inward summing the two ends', 'on an exact match return the pair', 'sum too small advance left', 'sum too big retreat right', 'pointers met no pair']
  const inputs = await page.$$('input')
  let i = 0
  for (const h of inputs) {
    const ph = await (await h.getProperty('placeholder')).jsonValue()
    if (ph && ph.startsWith('e.g.') && i < labels.length) { await h.click({ clickCount: 3 }); await h.type(labels[i]); i++ }
  }
  await sleep(300)
  await clickText(page, 'Reveal & compare'); await sleep(700)
  await clickText(page, 'Confident'); await sleep(800) // answer the subgoal confidence modal, then it reveals
  await page.evaluate(() => { const el = [...document.querySelectorAll('*')].find((e) => e.textContent.trim() === 'Label the subgoals'); if (el) el.scrollIntoView({ block: 'start' }) })
  await sleep(500)
  await shot(page, '02-subgoal-reveal.png')

  // 03 visualizer with subgoal chip
  await goto(page, '/module/two-pointers?tab=visualize')
  await sleep(800)
  await page.keyboard.press('ArrowRight'); await sleep(400)
  await page.keyboard.press('ArrowRight'); await sleep(600)
  await shot(page, '03-visualizer.png')

  // 04 sprint
  await goto(page, '/sprint')
  await sleep(400)
  await clickText(page, 'Warmup'); await sleep(900)
  await shot(page, '04-sprint.png')

  // 05 katas catalog
  await goto(page, '/katas')
  await sleep(700)
  await shot(page, '05-katas.png')

  // 07 productive-failure gate (tries: no progress seeded)
  await goto(page, '/module/tries?tab=learn')
  await sleep(700)
  await shot(page, '07-first-attempt.png')

  // 08 cheat sheet structure skeleton
  await goto(page, '/cheatsheet/two-pointers')
  await sleep(500)
  await page.evaluate(() => { const el = [...document.querySelectorAll('h2')].find((e) => e.textContent.includes('Structure skeleton')); if (el) el.scrollIntoView({ block: 'center' }) })
  await sleep(500)
  await shot(page, '08-cheatsheet.png')

  await browser.close()
  console.log('done')
})().catch((e) => { console.error('CAPTURE FAILED:', e.message); process.exit(1) })

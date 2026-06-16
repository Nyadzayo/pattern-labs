# Pattern Lab — Launch Kit

Everything you need to announce Pattern Lab and drive traffic. All assets are captured from the
real app. Drop in your live link and post.

## What Pattern Lab is (the value prop)

**An interview-prep app that trains pattern recognition and transfer — not problem count.**

You can grind hundreds of LeetCode problems and still freeze on a new one, because grinding builds a
*list*, not a *reflex*. Pattern Lab drills the three meta-skills interviews actually test, plus the
metacognition that quietly decides them — all in the browser, no account, nothing leaving your machine.

## Feature capabilities (lead with these)

| Capability | What it does | Why it drives interest |
|---|---|---|
| **Subgoal labeling** ⭐ | Label each step of a worked solution in your own words → graded → corrected ("that's step 1, not this one") | Novel + research-backed for *transfer*; nobody else does this. Lead asset. |
| **Pattern Sprint** | Timed game: name the pattern from a stem before writing code; look-alikes are the distractors | Trains the "which pattern?" instinct interviews test first |
| **Code Katas** | Type the core idioms from memory — guided → fading → blank page, judged in real Python; hesitation map + WPM | Muscle memory; satisfying, visual |
| **Confidence calibration** | Predict-then-check before every answer; a chart shows where you're *overconfident* | Targets the exact failure of thinking you know a pattern you don't |
| **Productive failure** | Attempt one problem before the lesson; then your attempt vs the worked approach | Learning-science angle; differentiates from "watch a tutorial" |
| **19 pattern modules** | Animated step-through visualizers + in-browser Python + original problems | Breadth + polish |
| **Primitives Lab** | 40 micro-patterns on a fading ladder (predict → … → write) | Depth; the "drills under the patterns" |
| Spaced repetition · 45-min mock + report · printable cheat sheets · decision tree | The supporting cast | Completeness |

**Stack (for HN/dev audiences):** React + TypeScript, Vite, Tailwind, Pyodide in a Web Worker for the
in-browser judge, SM-2 scheduling, all state in localStorage. Hash-routed (runs from `file://` and as a
Tauri desktop app). All content is original writing.

## Assets in this kit

```
screenshots/   8 true-fidelity retina PNGs of each headline feature (manifest below)
gifs/          label-the-subgoals.gif (⭐ lead with this) · visualizer.gif
social/        og-1200x630.png (universal link card) · x-card.png · linkedin-card.png
COPY.md        ready-to-paste posts: X thread, Reddit (3 subs), Show HN, LinkedIn, Product Hunt, TikTok
CAPTIONS.md    per-image captions + alt text, ready blocks (caption+hashtags), carousel script
LANDING-PAGE-PROMPT.md   paste-into-Lovable spec for a premium site (downloads + email + BMC)
PRIVACY.md     a /privacy page prompt + plain-English policy copy (you collect emails)
WELCOME-EMAIL.md   the automated welcome email for new newsletter subscribers
capture.cjs / render-social.cjs / gifs.cjs   the scripts that generated the visuals
               (re-run any time after a UI change: `node capture.cjs` etc., dev server up at :5176)
```

> Screenshots use a seeded demo profile (a realistic mid-prep learner) so the dashboard and
> Calibration card show live data instead of an empty zero-state. Re-run the scripts to refresh.

### Screenshot manifest
- `01-hero-dashboard.png` — the overview (use as the LinkedIn/PH hero)
- `02-subgoal-reveal.png` — ⭐ the signature: your label vs the canonical role + feedback
- `03-visualizer.png` — animated two-pointers walk with the subgoal chip
- `04-sprint.png` — Pattern Sprint recognition card
- `05-katas.png` — Code Katas typing / catalog
- `06-confidence.png` — the predict-then-check confidence modal
- `07-first-attempt.png` — productive-failure "try it first" gate
- `08-cheatsheet.png` — cheat sheet with the Structure skeleton

## Posting playbook (highest → lowest traffic for this audience)

1. **Reddit r/leetcode** — biggest driver. Honest, problem-first, link last. (Copy in COPY.md.)
2. **Show HN** — post the first comment immediately; engage in replies for hours.
3. **X thread** — lead with `gifs/label-the-subgoals.gif`; pin it.
4. **Product Hunt** — schedule for 12:01am PT; gallery order in COPY.md.
5. **LinkedIn** — the learning-science framing lands well with a more senior audience.
6. **TikTok/Reels/Shorts** — the existing vertical video (`~/Projects/pattern-lab-video/out/pattern-lab.mp4`).

**One rule that matters most:** lead with the *problem* ("solved 400, still froze"), not the product.
The subgoal-labeling GIF is your strongest single asset — it's the most novel thing here.

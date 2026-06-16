# Lovable Prompt — Pattern Lab landing page

Paste everything in the block below into Lovable as your build prompt. Replace the **[BRACKETED]**
placeholders first (download URLs, Buy-Me-a-Coffee handle, domain, social links). Upload the images
from this kit (`screenshots/`, `gifs/`, `social/og-1200x630.png`) when Lovable asks for assets, or
drag them in and reference the filenames noted in the "Assets" section.

---

````
Build a premium, conversion-optimized marketing landing page for "Pattern Lab" — a coding-interview
study app. This is a single-page site (with anchor navigation) plus a couple of small backend pieces:
a newsletter email-capture and multi-OS download links. Aim for best-in-class, "Linear / Vercel /
Raycast"-grade polish: fast, dark, crisp, with tasteful motion. No fluff, no stock-photo clichés.

## 1. Product (use this exact positioning — do not invent generic copy)

Pattern Lab is an interview-prep app that trains pattern RECOGNITION and TRANSFER, not problem count.
The insight: you can grind 400 LeetCode problems and still freeze on a new one, because grinding
builds a list, not a reflex. Pattern Lab drills the three meta-skills interviews actually test —
spotting the pattern, recalling the idiom under pressure, and mapping a known solution's STRUCTURE
onto a problem you've never seen — plus the metacognition (confidence calibration, productive
failure) that quietly decides interviews. It runs entirely in the browser (in-browser Python via
Pyodide) and as a desktop app. No account, no subscription, nothing leaves the user's machine. All
content is original.

## 2. Brand & design system

- Theme: DARK by default (no light mode needed). Background near-black #08090D. Surfaces #0E1018 /
  #14161F with subtle 1px borders rgba(255,255,255,0.08).
- Accent: indigo. Primary #6366F1, bright #818CF8, soft glows rgba(99,102,241,0.25). Use accent
  sparingly for CTAs, highlights, and one or two radial background glows.
- Semantic: emerald #10B981 (success/positive), rose #F43F5E (negative), amber #F59E0B (warning).
- Typography: a clean geometric/grotesk sans (Inter or similar) for UI; tight headings
  (letter-spacing ~ -0.03em, weight 700–760, large). Monospace (JetBrains Mono / SF Mono) for any
  code snippets.
- Logo: a lowercase Greek lambda "λ" in white, centered in a rounded-square (14px radius) with an
  indigo→violet gradient (#6366F1 → #818CF8) and a soft indigo shadow. Use it as the favicon, the
  nav mark, and the OG image mark. Generate it as inline SVG.
- Texture: a very subtle dotted/线 grid in hero/section backgrounds (low opacity, radial-masked), and
  one or two large blurred indigo radial glows drifting behind the hero. Keep it restrained.
- Motion: Framer Motion. On-scroll reveal (fade + 12px rise, staggered), smooth-scroll anchors,
  subtle hover lifts on cards/buttons, a slow parallax/float on the hero glow. Respect
  prefers-reduced-motion. Nothing bouncy or gimmicky.
- Rounded corners (xl/2xl), generous whitespace, strong type hierarchy. Looks expensive.

## 3. Tech & integrations

- Stack: React + TypeScript + Tailwind + shadcn/ui (Lovable defaults). Fully responsive
  (mobile-first; perfect on 375px, 768px, 1280px+). Lighthouse 95+ on performance/accessibility/SEO.
- SEO/meta: title "Pattern Lab — Train coding-interview pattern recognition, not problem count".
  Meta description from the positioning above. Open Graph + Twitter card tags using the uploaded
  og-1200x630.png (twitter:card = summary_large_image). Set theme-color #08090D. Favicon = the λ mark.
  Semantic HTML, proper headings, alt text on every image.
- Newsletter email capture (Supabase): create a `subscribers` table (id uuid pk, email text unique
  not null, source text, created_at timestamptz default now()). Wire the signup form to insert a row.
  Validate email format client-side; handle duplicates gracefully ("You're already on the list");
  show an inline success state ("You're in — watch your inbox."); disable the button while
  submitting; never block on errors. (If the user prefers a managed provider, leave a clearly
  commented swap point to plug in ConvertKit / Buttondown / Mailchimp embed instead.)
- Downloads: three OS buttons — macOS (.dmg), Windows (.msi), Linux (.AppImage). For macOS provide
  BOTH "Apple Silicon" and "Intel" links. Each links to a URL constant at the top of the file:
  DOWNLOAD_MACOS_ARM = "[URL]", DOWNLOAD_MACOS_INTEL = "[URL]", DOWNLOAD_WINDOWS = "[URL]",
  DOWNLOAD_LINUX_APPIMAGE = "[URL]", DOWNLOAD_LINUX_DEB = "[URL]". Detect the visitor's OS from
  navigator.userAgent/platform and render the matching button as the big primary CTA, with the other
  platforms shown as smaller secondary links beneath ("Also for Windows · Linux · Intel Mac"). Show a
  small "v1.0 · ~[SIZE] · free forever" line. Fire an analytics event on each download click.
- Buy Me a Coffee: a tasteful "☕ Buy me a coffee" button in the nav (ghost style) and a dedicated
  small support card near the footer, linking to https://www.buymeacoffee.com/[BMC_HANDLE] (open in
  new tab, rel="noopener"). Optional: embed the official BMC widget button, but a styled link is fine.
- Analytics: include a Plausible/Umami-friendly script placeholder (commented) and a generic
  trackEvent() helper used by the download + signup + BMC buttons.

## 4. Page structure & copy (in this order)

**Sticky nav (glassy, blurs on scroll):** λ Pattern Lab · links: Features, How it works, Download,
FAQ · right side: "☕ Buy me a coffee" (ghost) + "Download" (primary). Collapses to a clean mobile menu.

**Hero (full-viewport):**
- Eyebrow chip: "Free · In your browser & desktop · No account"
- H1: "Train pattern recognition. Not problem count."  (make "recognition." accent-colored)
- Subhead: "You can solve 400 problems and still freeze on a new one — grinding builds a list, not a
  reflex. Pattern Lab drills the three skills interviews actually test: spotting the pattern,
  recalling the idiom, and transferring a known structure to a problem you've never seen."
- CTAs: primary "Download free" (smooth-scrolls to Download) + secondary "See how it works" (ghost,
  scrolls to How it works).
- Hero visual: a clean browser/app frame on the right (or below on mobile) showing 01-hero-dashboard.png,
  slightly tilted with a soft shadow and the indigo glow behind it. On desktop, autoplay
  label-the-subgoals.gif in a smaller floating card overlapping the corner for motion.
- Trust strip under the hero (muted, small, icon + label): "No account · No subscription · No tracking
  · Your data never leaves your machine · In-browser Python".

**The problem (short, punchy, one column, centered):**
- Headline: "Solved hundreds of problems. Still froze."
- Body: "Because memorizing problems isn't the same as recognizing patterns. The skills that decide
  an interview — recognition, recall, and transfer — are trainable, and almost nobody drills them
  directly. Pattern Lab does."

**Features (the core — a responsive grid of cards; lead with the first three):**
Each card: a small accent icon, a short bold title, 1–2 sentences. Use these EXACT features:
1. ⭐ Subgoal labeling — "Label each step of a worked solution in your own words, then compare to the
   canonical role. The best-evidenced technique for transferring structure to new problems — it even
   catches swapped roles." (Make this card visually prominent / featured — wider, with the
   02-subgoal-reveal.png screenshot inside it.)
2. Pattern Sprint — "A timed game: read a problem stem and name the pattern before you write a line.
   The tempting look-alikes are the distractors. Warmup → Sprint → Sudden-Death."
3. Code Katas — "Type the core idioms from memory — guided, then fading, then a blank page judged in
   real in-browser Python. Hesitation map + WPM trend included."
4. 19 pattern modules — "Each with an animated, step-through visualizer and original problems you can
   solve and run right in the page."
5. Confidence calibration — "Predict-then-check before every answer. A chart shows exactly where your
   confidence outruns your accuracy — and which pattern to drill."
6. Productive failure — "Attempt one problem before the lesson unlocks. Struggling first makes the
   explanation stick; then see your attempt next to the worked approach."
7. Primitives Lab — "40 micro-patterns drilled on a fading ladder, from predicting the next line to
   writing it cold."
8. Spaced repetition + 45-min mock — "SM-2 review keeps it in memory; a full mock interview gives you
   a report on where you cracked."

**How it works (3 steps, horizontal on desktop, numbered):**
1. "Learn the shape" — watch each pattern move frame-by-frame in an animated visualizer.
2. "Train the skill" — drill recognition (Sprint), recall (Katas), and transfer (subgoal labeling).
3. "Prove it" — solve real problems judged live in Python, then run a timed mock interview.

**Visual showcase (a tabbed or alternating screenshot/GIF gallery):** alternate left/right rows of a
framed screenshot + a short caption. Use, in order: 04-sprint.png ("Which pattern? 10 seconds."),
03-visualizer.png ("Watch the algorithm move, each step labeled."), 05-katas.png ("Type it from
memory."), 01-hero-dashboard.png ("See where you're overconfident."). Lazy-load images.

**Download (the conversion section — anchor #download):**
- Headline: "Get Pattern Lab — free, forever."
- Sub: "Use it in your browser, or install the desktop app. No account, no payment, no catch."
- The OS-aware download block described in section 3 (big primary = detected OS, others secondary).
- Also a clear "Or open it in your browser →" button to [WEB_APP_URL] for the no-install path.
- A tiny reassurance line: "Open source-friendly · works offline after first load · ~[SIZE]".

**Newsletter (email capture — its own band with the accent glow):**
- Headline: "Get new patterns, drills, and tips."
- Sub: "Occasional emails when new content and features ship. No spam, unsubscribe anytime."
- Inline form: email input + "Subscribe" button, with the Supabase wiring and success state from
  section 3. Set source = "landing".

**Support / Buy me a coffee (small, warm, not pushy):**
- "Pattern Lab is free and built by one person. If it helped, you can ☕ buy me a coffee." + the BMC
  button. Keep it a single tasteful card.

**FAQ (accordion):**
- Is it really free? — "Yes. No account, no subscription, no paywalled content."
- Does it work offline? — "Yes — after the first load it runs locally; the desktop app is fully
  offline. Your progress lives on your device."
- Where does my data go? — "Nowhere. Everything is stored in your browser / on your machine. No
  servers, no tracking."
- Which platforms? — "Browser (any modern one), plus desktop apps for macOS (Apple Silicon & Intel),
  Windows, and Linux."
- Is the content original? — "Every explanation, problem, and solution is original writing — no copied
  material."
- Who is it for? — "Anyone prepping for coding interviews who's tired of grinding problems without
  getting better at recognizing patterns."

**Final CTA band:** big centered "Stop grinding problems. Start training patterns." + the primary
Download button + the browser link.

**Footer:** λ Pattern Lab · short tagline · links (Features, Download, FAQ, [GitHub], [Twitter/X],
Privacy) · "Made with care. No trackers." · ☕ Buy me a coffee · © [YEAR].

## 5. Assets (upload these from the kit; reference by filename)

- og-1200x630.png — OG/Twitter share image + can inform the hero styling.
- 01-hero-dashboard.png — hero visual + a showcase row.
- 02-subgoal-reveal.png — inside the featured "Subgoal labeling" card.
- 03-visualizer.png, 04-sprint.png, 05-katas.png — showcase gallery.
- gifs/label-the-subgoals.gif — small autoplaying motion card in the hero (muted, loop, lazy).
If an asset is missing, render a tasteful placeholder frame with the λ mark rather than a broken image.

## 6. Quality bar

Mobile-perfect and keyboard-accessible. Fast (lazy-load images/gifs, no layout shift, system fonts or
one preloaded webfont). Smooth-scroll anchor nav with an active-section indicator. All interactive
elements have visible focus states and aria labels. Buttons show loading/disabled/success states.
Copy stays in the confident, specific voice above — never generic "supercharge your coding" filler.

## 7. Placeholders for me to fill before publishing

[BMC_HANDLE], the five DOWNLOAD_* URLs, [WEB_APP_URL], [SIZE], [GitHub], [Twitter/X], [YEAR], domain,
and the Supabase project connection (or the chosen email provider).
````

---

## After Lovable builds it — quick checklist
- Connect Supabase (or swap in ConvertKit/Buttondown) so the email form actually stores signups.
- Paste your real download URLs (GitHub Releases is the easiest host for the Tauri `.dmg/.msi/.AppImage`).
- Set your Buy-Me-a-Coffee handle and test the link.
- Re-upload `og-1200x630.png` and confirm the link preview renders (test with X's card validator / a Slack paste).
- Point your domain, enable HTTPS, and add the analytics snippet.
- Tell me the live URL and I'll plug it into the launch copy (`COPY.md` / `CAPTIONS.md`) replacing [LINK].

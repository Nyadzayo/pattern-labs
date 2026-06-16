# Pattern Lab — Welcome email (new subscribers)

Set this as the automated welcome / first email in Buttondown or ConvertKit (both accept Markdown).
Keep it plain and personal — a plain-text-feeling email from a person outperforms a glossy template on
both deliverability and replies. Fill the **[BRACKETS]**.

---

## Subject line (pick one — A is the safest for inbox placement)
- A: Welcome to Pattern Lab 👋
- B: You're in. Here's where to start.
- C: Stop grinding problems — start here

## Preheader (the gray preview text)
> The fastest way to feel the difference, plus what to expect from these emails.

---

## Body (Markdown — works as-is in Buttondown / ConvertKit)

```markdown
Hey,

Thanks for signing up for Pattern Lab — and for caring about *actually* getting better at interviews,
not just grinding more problems.

Quick context if you're new: Pattern Lab trains the three things that decide a coding interview but
that problem-grinding skips —

- **Recognition** — naming the pattern before you write code
- **Recall** — typing the core idioms from memory
- **Transfer** — mapping a known solution's structure onto a problem you've never seen

If you've got two minutes, here's the fastest way to feel the difference:

👉 **[Open Pattern Lab]([WEB_APP_URL])** (or grab the desktop app: **[Download]([DOWNLOAD_URL])**)

Try **"Label the subgoals"** on any solution — you write what each step is *for*, in your own words,
and it corrects you. It's the part people tell me finally made patterns click on *new* problems.

**What to expect from me:** an occasional email when I ship new patterns, drills, or features. No spam,
no daily nagging — and you can leave with one click any time.

One favor: just **hit reply and tell me what you're prepping for** (a specific company? a timeline? a
pattern that keeps tripping you up?). I read every reply, and it genuinely shapes what I build next.

Talk soon,
[YOUR_NAME]
Creator of Pattern Lab

*P.S. It's free, runs in your browser, and your progress never leaves your device. No catch.*
```

---

## Plain-text fallback (if your tool sends a separate text version)

```
Hey,

Thanks for signing up for Pattern Lab — and for caring about actually getting better at interviews,
not just grinding more problems.

Pattern Lab trains the three things that decide a coding interview but that grinding skips:
- Recognition: naming the pattern before you write code
- Recall: typing the core idioms from memory
- Transfer: mapping a known solution's structure onto a new problem

Fastest way to feel the difference:
Open Pattern Lab: [WEB_APP_URL]
Or download the desktop app: [DOWNLOAD_URL]

Try "Label the subgoals" on any solution — you write what each step is for, in your own words, and it
corrects you. It's the part that finally makes patterns click on new problems.

What to expect: an occasional email when I ship new patterns, drills, or features. No spam, one-click
unsubscribe any time.

One favor: reply and tell me what you're prepping for. I read every reply and it shapes what I build.

Talk soon,
[YOUR_NAME] — Creator of Pattern Lab

P.S. Free, runs in your browser, and your progress never leaves your device.
```

---

## Setup notes
- **Buttondown:** Settings → put this in the "Welcome email" / first automated email. Markdown above
  works directly. Make sure the footer has the unsubscribe tag (Buttondown adds it automatically).
- **ConvertKit:** create a Sequence with this as email 1 (send immediately), and set your signup form
  to subscribe people to it. Or use it as the form's "Incentive/confirmation" follow-up.
- Send from a **real personal-looking from-name** ("[YOUR_NAME] from Pattern Lab") — it lifts opens and
  replies. Avoid no-reply@ so people can actually reply.
- Keep links to **two max** (open + download) — more links can hurt deliverability on a first send.
- Placeholders: [WEB_APP_URL] · [DOWNLOAD_URL] · [YOUR_NAME].
```

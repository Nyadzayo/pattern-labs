# Pattern Lab — Privacy Policy (+ Lovable prompt)

Two parts: (A) a short prompt to add a `/privacy` page in Lovable, and (B) the actual policy copy to
drop in. Fill the **[BRACKETS]**. This is a plain-English template, **not legal advice** — if you'll
have EU/UK users (GDPR) or California users (CCPA/CPRA), have a professional review it.

---

## A) Lovable prompt — add the privacy page

````
Add a /privacy route to the Pattern Lab site, styled with the SAME dark design system, nav, and footer
as the landing page (near-black #08090D background, indigo #6366F1 accent, the λ mark, same typography).
Render a clean, readable long-form document: a centered single column, max-width ~720px, comfortable
line-height, clear h2 section headings with generous spacing, small muted "Last updated" line at the
top, and a "← Back to home" link. Add a "Privacy" link in the footer that routes here. Use the exact
copy below. Make every email address a mailto: link and keep it fully responsive and accessible.
````

---

## B) Privacy policy copy

**Pattern Lab — Privacy Policy**
**Last updated: [EFFECTIVE_DATE]**

This policy explains what information Pattern Lab handles, and what it deliberately does not. It covers
both this website ([DOMAIN]) and the Pattern Lab application (the web app and the desktop apps).

### The short version
Pattern Lab is built to be private by default. The app keeps your study progress on your own device —
there is no account and no server that stores it. The only personal information we ever collect is your
email address, and only if you choose to subscribe to the newsletter.

### The Pattern Lab app
- **Your progress stays on your device.** All of your activity — solved problems, drill and review
  schedules, quiz history, settings — is stored locally in your browser's storage (or on your computer,
  for the desktop apps). It is never transmitted to us or anyone else.
- **No account, no sign-in.** We don't ask who you are, and we have no database of users.
- **No analytics or tracking inside the app.**
- **One external request:** the in-browser code runner loads the Pyodide Python runtime from a public
  CDN the first time you use it. That request is handled by the CDN provider under their own terms; we
  receive nothing from it. The desktop apps and offline use avoid this after first load.
- You can export or erase all of your local data at any time from the app's Settings.

### This website
- **Newsletter signup (optional).** If you enter your email to subscribe, we store your email address,
  the date, and the source ("landing") so we can send you occasional product updates. We use
  [EMAIL_PROVIDER, e.g. Supabase / Buttondown / ConvertKit] to store this and send email. We do not
  sell, rent, or share your email with advertisers or other third parties.
- **Analytics.** We use [ANALYTICS_TOOL, e.g. Plausible / Umami / none], a privacy-friendly,
  cookieless analytics tool that records aggregate, non-identifying usage (page views, referrers). It
  does not build a profile of you or track you across sites. *(Delete this line if you use no analytics.)*
- **Cookies.** This site uses no advertising or tracking cookies. [Any cookies are limited to what's
  strictly necessary for the site to function.]
- **Downloads.** Clicking a download link sends you to [DOWNLOAD_HOST, e.g. GitHub Releases], which is
  governed by that host's privacy policy.

### How we use your email
Only to send you Pattern Lab updates (new patterns, drills, features). Every email includes a
one-click unsubscribe link, and you can opt out at any time. We keep your address until you unsubscribe
or ask us to delete it.

### Your choices and rights
- **Unsubscribe** any time via the link in any email.
- **Access or delete** the email we hold for you — email [CONTACT_EMAIL] and we'll action it promptly.
- **Your in-app data** is yours and local; manage or erase it from Settings without contacting us.
Depending on where you live (e.g. the EU/UK or California), you may have additional rights to access,
correct, delete, or port your data. Email [CONTACT_EMAIL] and we'll honor applicable requests.

### Data retention & security
We keep newsletter emails only as long as you stay subscribed. We rely on reputable providers and
standard safeguards to protect the limited data we hold, though no method of transmission or storage is
100% secure.

### Children
Pattern Lab isn't directed to children under [13/16, per your jurisdiction], and we don't knowingly
collect their information.

### Changes
We'll update this page if our practices change and revise the "Last updated" date above. Material
changes affecting subscribers will be noted in the newsletter.

### Contact
Questions or requests: **[CONTACT_EMAIL]**.

---

### Placeholders to fill
[EFFECTIVE_DATE] · [DOMAIN] · [EMAIL_PROVIDER] · [ANALYTICS_TOOL] (or remove that line) ·
[DOWNLOAD_HOST] · [CONTACT_EMAIL] · the children's age threshold for your jurisdiction.

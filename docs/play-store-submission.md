# FinSage AI — Google Play Submission Package

Generated: October 5, 2026
Package: `com.finsage.ai` · Version 1.0 (versionCode 1)
Release AAB: `android/app/build/outputs/bundle/release/app-release.aab` (release-signed)

> Every answer below is derived from the actual codebase. Where a value cannot be
> invented (contact inbox, screenshots, console accounts), it is marked **MANUAL**.

---

## 1. Store listing text

### App name / Title (max 30 characters)
```
FinSage AI: Budget & Finance
```
(28 characters. Alternative: `FinSage AI` — 10 characters.)

### Short description (max 80 characters)
```
Track expenses, budgets and savings with your own AI financial advisor.
```
(71 characters.)

### Full description (max 4000 characters)
```
FinSage AI is a personal finance assistant that turns your day-to-day spending into clear, actionable decisions.

Track income and expenses in seconds, set budgets that actually fit your life, and watch savings goals move forward with a live progress view.

Everything you enter stays yours. The dashboard gives you the numbers that matter: monthly burn, savings rate, net worth, recurring bills, and a category breakdown of where the money went.

Where FinSage AI goes further is the advisor. Ask questions in plain language and get answers built from your own figures — "how much can I spend this month?", "can I afford this trip?", "what happens if I raise my savings target by 10%?". The advisor reads your real income, budgets and goals before it responds, so the advice is specific to you rather than generic tips.

Features:

• Income, expense and category tracking with notes, payment methods and recurring entries
• Monthly budgets with clear over/under status
• Savings goals and projections so you can see the finish line
• Bills and due-date reminders so nothing slips
• Investments and net worth tracking in your own currency
• Monthly reports and PDF export, plus CSV export of your data
• Spending anomaly detection and trend predictions
• Health score and benchmarks against your own history
• Weekly reports and smart budget suggestions
• Full conversation history with the AI advisor
• Account protection with secure sign-in and Google sign-in

FinSage AI does not place ads and does not sell your data. Your financial records are used only to provide the features you asked for.

Take control of your money with an advisor that actually knows your numbers. Install FinSage AI and start budgeting smarter today.
```

### Categorisation
| Field | Value |
|---|---|
| App name | FinSage AI |
| Category | **Finance** |
| Tags | budgeting, personal finance, expense tracker, AI advisor |
| Contact email | **MANUAL** — an inbox you monitor (must match Play Developer account contact) |
| Privacy policy URL | `https://finsage-ai-omega.vercel.app/privacy-policy` (**live after next deploy**) |

### Graphics status
| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, <8 MB | ✅ `play/icon-512x512.png` (also `public/icon-512x512.png`) |
| Feature graphic | 1024×500 PNG | ✅ `play/feature-graphic-1024x500.png` |
| Phone screenshots | ≥2, min 1080px long edge | ❌ **MANUAL** — none exist; capture from a device/emulator after deploy |

Regenerate graphics with: `bun scripts/generate-play-assets.ts`

---

## 2. Content rating (IARC questionnaire)

Answer every item; the expected rating is **3+ / Everyone**.

| IARC question | Answer |
|---|---|
| Violence | None |
| Fear / horror / scare themes | None |
| Sexual content / nudity | None |
| Language | None |
| Controlled substances (drugs, alcohol, tobacco) | None |
| Discrimination / hate speech | None |
| User-generated content | None — users cannot post content visible to others |
| Blood / gore | None |
| Realistic gambling | None |
| Casino-style gambling | None |
| Threats / intimidation | None |
| Medical or health content | None (financial information only) |
| Can users communicate with other users? | **No** — no messaging, social feed or multiplayer |
| Is there a chat feature? | AI assistant only, not person-to-person and not exposed to other users |
| Does the app collect location, camera, microphone, contacts? | **No** |
| Does the app contain ads? | **No** |
| Does it link out to external websites? | No third-party marketing links |
| Is real money involved? | **No** — no purchases, no in-app currency, no betting |
| Does it ask for personal/sensitive data? | Account email + name; user-entered financial records |
| Target age | General audience / not directed at children |

**Expected rating: 3+ (Everyone).** No age-restricted warnings apply.

---

## 3. Data safety form

### Data collected

| Data type | Data collected | Data shared | Purpose | Collected or derived | Is data deleted on request? |
|---|---|---|---|---|---|
| **Personal info — Name** | Yes | No | Account management, personalisation | Collected from user | Via contact request |
| **Personal info — Email address** | Yes | No | Account creation, sign-in, password reset email | Collected from user | Via contact request |
| **Financial info — Other financial info** (income, expenses, budgets, savings goals, bills, investments, net-worth entries) | Yes | No | Core app functionality | Collected from user | Via contact request |
| **User content — Other user content** (messages you send to the AI advisor and its replies) | Yes | No | Provide AI advisor feature | Collected from user | ✅ Delete chat history in-app |
| **Identifiers — Email address** | Yes | No | Login/account | Collected from user | Via contact request |
| **Location (approximate / precise)** | No | — | — | — | — |
| **Photos / videos / audio / contacts** | No | — | — | — | — |
| **Device IDs / Advertising IDs** | No | — | — | — | — |
| **Usage data / Analytics** | No | — | — | — | — |
| **Web browsing / search history** | No | — | — | — | — |
| **App activity / in-app search** | No | — | — | — | — |
| **Purchase history / financial transactions for payment** | No | — | — | — | — |

### Other data-safety declarations

| Question | Answer |
|---|---|
| Is data collected processed **ephemerally**? | **No** — records persist while the account exists |
| Is data **encrypted in transit**? | **Yes** — all traffic is HTTPS/TLS |
| Is data encrypted **at rest**? | **Yes** — stored in Google Cloud Firestore (service-managed encryption) |
| Can users **request data deletion**? | **Yes, via contact** — privacy policy provides an email route; **no in-app deletion button exists** |
| Is data shared with third parties? | **No** for advertising/marketing purposes |
| Are there third-party **service providers** that process data? | **Yes**: Google Firebase (database, auth), Groq (AI inference), Resend/Gmail SMTP (transactional email) |
| Does the app contain **ads**? | **No** |
| Does the app use the **camera/microphone/location/contacts**? | **No** |

**Declaration summary:** FinSage AI collects account details, user-entered financial records and AI chat history; encrypts them in transit and at rest; does not sell, advertise with, or share them with third parties; and does not collect location, contacts, device identifiers or analytics.

> **Reviewer note:** the Android build declares `firebase-analytics` as a native dependency,
> but the app contains **zero native Firebase code** and its `google-services.json` holds
> non-functional placeholder values, so no analytics data is collected or transmitted.
> Either ship the real Firebase config or remove the unused native Firebase dependencies
> before launch so the Data Safety declaration is unambiguous.

---

## 4. App access (for review)

Play asks for a way to log in if your app requires an account.

| Item | Value |
|---|---|
| Login required? | **Yes** — or visitor/guest mode if enabled |
| Test credentials | **MANUAL** — create a dedicated test account in production (or enable an existing demo account) and supply the email + password in Play Console → App access |
| Demo video | **MANUAL** — optional but recommended for finance apps |

---

## 5. Manual steps required (blocked on your credentials)

1. **Google Play Developer account** — $25 one-time. (You said you'd handle this yourself.)
2. **Privacy policy contact inbox** — `src/app/privacy-policy/page.tsx` contains
   `const CONTACT_EMAIL = "REPLACE_WITH_CONTACT_EMAIL"`. Replace it with a real address
   you monitor, then commit + push so the page deploys. Play **rejects** submissions with a
   missing/placeholder contact.
3. **Deploy** — push to GitHub so Vercel publishes `/privacy-policy` to
   `https://finsage-ai-omega.vercel.app/privacy-policy`, then paste that URL into Play Console.
4. **Screenshots** — take ≥2 phone screenshots after the deploy (1080px+ long edge).
5. **Firebase config (optional but recommended)** — download the real `google-services.json`
   from Firebase Console (project `finbee-5b187`, Android app `com.finsage.ai`) and replace
   `android/app/google-services.json`. Current file has fabricated `project_number`,
   `mobilesdk_app_id`, `oauth_client` and `tracking_id`. The app builds without it because no
   native Firebase code exists.
6. **Vercel `APP_URL`** — change `https://api.example.com` → `https://finsage-ai-omega.vercel.app`
   (password-reset links are already hardened to fall back to the live request host, so this is
   non-blocking but should be corrected).
7. **Firebase Authorized domains** — add `finsage-ai-omega.vercel.app` in Firebase Console →
   Authentication → Settings.
8. **Data deletion path** — Play increasingly expects in-app account deletion. Current options:
   add a "Delete account" action, or rely on the privacy-policy contact route and state it clearly.
9. **Upload AAB**, complete Store listing / Content rating / Data safety / App access, then submit.

---

## 6. Release readiness

| Area | Status |
|---|---|
| Production web build (`npm run build`) | ✅ exit 0 |
| Release AAB build | ✅ 25.1 MB |
| AAB signed with release keystore | ✅ SHA256 `3A:D5:34:…:C2` (matches `finsage-release.keystore`, not debug) |
| Package name | ✅ `com.finsage.ai` |
| Signing secrets excluded from git | ✅ `keystore.properties`, `*.keystore` gitignored |
| WebView loads production backend | ✅ `server.url` set in `capacitor.config.ts`, verified inside AAB |
| Store icon + feature graphic | ✅ generated in `play/` |
| Privacy policy page | ✅ created — **needs contact email + deploy** |
| Store listing / IARC / Data safety answers | ✅ documented above |
| Screenshots | ❌ manual |
| Play Console account + upload | ❌ manual |

**Status: READY FOR GOOGLE PLAY CONSOLE, subject to the manual steps in §5**
(no code blockers remain; the only hard requirement before submission is a real contact email
and the privacy-policy deploy).

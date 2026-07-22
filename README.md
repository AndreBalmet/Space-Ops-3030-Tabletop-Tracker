# Space-Ops 3030 Team Builder

The team-building companion tool for the Space-Ops 3030 tabletop miniatures game: build your team, equip it from the Armory, and use Team View as your reference at the table.

**Play now:** [https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/](https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/)

---

## What It Is

A browser companion (no install needed) for the Space-Ops 3030 tabletop game, focused on **building and viewing teams**. Runs on any device with a browser — phones, tablets, laptops.

> The original multiplayer session/combat tracker was retired in v15.4.0 (hosting/joining live sessions may return later). Its code is preserved at [`legacy/tracker.html`](legacy/tracker.html) and the git tag `legacy-tracker-final`.

---

## Features

### Team Builder
- Build teams from faction rosters (Arc Rangers, Space-Wyrm, Maligeist, Kippin, and more)
- Equip weapons and gear from a data-driven Armory, filtered by faction, asset type (Operator / Support), and model — so you only see what a given asset can actually take
- Manage your team's Rating budget with live cost tracking
- **Player accounts**: sign up with a username, email, and password (email confirmation included); log in with your username or email from any device. Forgot your password? Reset it by email. Your email is only used for login/recovery — plus optional news updates if you tick the box at signup
- **Cloud sync**: your account in the cloud is the source of truth — every edit publishes automatically, the same teams appear on every device you sign into, and each account only sees its own teams. A device that's behind picks up the newest published copy automatically when you return to the app. Edits while offline sync when you reconnect, and logging out clears the device
- **Custom asset names** that persist with the team across devices
- **Dual Wield**: when an asset carries two of the same melee weapon, that weapon shows an `x2` suffix, gains the Dual Wield trait, and has its Attack stat auto-bumped +1 — the trait and the modified stat highlighted in teal so you can see the buff was applied
- Tap any item, trait, or condition for a hover card explaining it
- Deleting a team asks for confirmation, then removes it from your account on every device (it won't reappear from an old device's copy)
- Team View roster page with PDF export; each model sits in its own light gray card so its loadout reads as one block; responsive 1 / 2 / 3-column layout for phone / iPad-portrait / iPad-landscape
- An update banner prompts a reload when a new build or new game data is published
- First-time-user tutorial: a welcome popup plus spotlight tours that walk through each screen as you reach it (replay anytime from the hamburger menu)

### Data-Driven Game Content
- All game data is loaded from XLSX uploads: models, weapons, equipment, factions, effects, traits, special actions, starter squads
- Hover tooltips pulled from Excel data -- weapon stats, trait descriptions, equipment details
- Fuzzy name matching handles mismatches between data sheets
- Missing data displays placeholder text instead of breaking the UI

### Export
- PDF team roster export via jsPDF

### Responsive Design
- Works on desktop, tablet (iPad), and mobile
- Card grid layout collapses gracefully at smaller viewports
- Compact and expanded view modes for model cards

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Team Builder | React 18 (CDN + in-browser Babel), single `app.jsx` + `styles.css`, vanilla CSS Grid/Flexbox |
| Backend | Firebase Realtime Database (REST) + Firebase Authentication (REST) |
| Game Data | XLSX import (SheetJS) → Firebase `/gameData` |
| PDF Export | jsPDF |
| Hosting | GitHub Pages (deploys from `main`) |

No build step — dependencies load from CDNs. Static asset URLs carry a `?v=` cache-bust that bumps on every release.

---

## How to Use

1. Open the [play link](https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/)
2. Log in (or create an account) so your teams sync to the cloud
3. Build a team from available factions, or load a previously saved one; hit **Save Team** to publish it to your account
4. At the table, open **Team View** — every model's stats, weapons, and gear on one screen, with tap-for-rules on every term, plus PDF export

---

## Local Development

Start a local server from the project root:

```bash
python3 -m http.server 8091
```

- Team Builder: `http://localhost:8091/space-ops-team-builder/`

Always test locally before pushing to main. The GitHub Pages deployment serves directly from the `main` branch. After changing `app.jsx` or `styles.css`, bump the `?v=` query in `space-ops-team-builder/index.html` so browsers fetch the new build.

---

## Project History

Over 100 versions across 84+ git commits.

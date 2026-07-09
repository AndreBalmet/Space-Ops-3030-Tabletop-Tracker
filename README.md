# Space-Ops 3030 Tabletop Tracker

A real-time multiplayer companion tool for the Space-Ops 3030 tabletop miniatures game.

**Play now:** [https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/](https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/)

---

## What It Is

A browser companion (no install needed) for the Space-Ops 3030 tabletop game. As of v15 it ships as **two coexisting apps** that share the same Firebase game data:

- **Team Builder** (the root URL) — a React app focused on building, viewing, and exporting teams, with cross-device cloud sync.
- **Legacy Tracker** (`/tracker.html`) — the original single-file app: admin sign-in, multiplayer sessions, combat tracker, dice/timer/VP tools, XLSX upload, PDF export.

Runs on any device with a browser -- phones, tablets, laptops. Open the link and start playing.

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

### Session Management
- Create or join multiplayer sessions with a session code
- Real-time Firebase sync -- all players see the same game state
- Team instancing: your saved team is deep-copied into the session, so edits in-game never overwrite your roster
- Multi-player teams: multiple players can join and control the same team

### Combat Tracker
- Turn-by-turn tracking with a shared turn counter synced across all devices
- Health management with optimistic local updates and atomic Firebase transactions
- Damage and heal flash animations for visual feedback
- Status effects (Overwatch, Suppressed, Stunned, and others) with duration tracking and auto-expiry on turn advance
- "Add Effect..." dropdown on every model card
- Next Turn resets all models to Ready across all teams

### Game Tools
- Dice roller supporting D4, D6, D8, D12, and D20
- Session timer
- Turn counter with increment/decrement controls
- Per-team Victory Points tracker with live sync and combat log entries

### Data-Driven Game Content
- All game data is loaded from XLSX uploads: models, weapons, equipment, factions, effects, traits, special actions, starter squads
- Hover tooltips pulled from Excel data -- weapon stats, trait descriptions, equipment details
- Fuzzy name matching handles mismatches between data sheets
- Missing data displays placeholder text instead of breaking the UI

### Multiplayer and Ownership
- Real-time health and status sync across all connected devices
- Team-only ownership: you can only edit your own team's models
- Backend ownership checks via team member arrays
- Session host retains admin-level access
- Reconnection handling for backgrounded tabs (iPad/mobile)

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
| Legacy Tracker | Single HTML file (~8,000+ lines), vanilla JavaScript |
| Backend | Firebase Realtime Database (REST from the team-builder; JS SDK in the legacy tracker) |
| Game Data | XLSX import (SheetJS) → Firebase `/gameData` |
| PDF Export | jsPDF |
| Hosting | GitHub Pages (deploys from `main`) |

No build step — both apps load their dependencies from CDNs. Static asset URLs carry a `?v=` cache-bust that bumps on every release.

---

## How to Use

1. Open the [play link](https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/) (the Team Builder)
2. Enter your player name (signs you into your cloud team list)
3. Build a team from available factions, or load a previously saved one; hit **Save Team** to publish it to your account
4. For multiplayer play, open `/tracker.html` (the legacy tracker): create or join a session by code
5. Play -- health, status effects, turns, and Victory Points sync live across all connected devices

---

## Local Development

Start a local server from the project root:

```bash
python3 -m http.server 8091
```

- Team Builder: `http://localhost:8091/space-ops-team-builder/`
- Legacy Tracker: `http://localhost:8091/tracker.html`

Always test locally before pushing to main. The GitHub Pages deployment serves directly from the `main` branch. After changing `app.jsx` or `styles.css`, bump the `?v=` query in `space-ops-team-builder/index.html` so browsers fetch the new build.

---

## Project History

Over 100 versions across 84+ git commits.

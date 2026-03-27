# Space-Ops 3030 Tabletop Tracker

A real-time multiplayer companion tool for the Space-Ops 3030 tabletop miniatures game.

**Play now:** [https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/](https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/)

---

## What It Is

A single-file HTML web app (no install needed) that handles team building, session management, combat tracking, and live multiplayer sync for the Space-Ops 3030 tabletop game. Runs on any device with a browser -- phones, tablets, laptops. Open the link and start playing.

---

## Features

### Team Builder
- Build teams from faction rosters (Arc Rangers, Space-Wyrm, Kippin, and more)
- Equip weapons and gear from data-driven loadouts
- Manage your team's Rating budget with live cost tracking
- Save and load teams to the cloud
- Auto Pilot pairing for vehicles (adding a vehicle automatically adds a matched Pilot)
- Starter squad quick-build for fast setup
- Weapon and equipment swap within loadout constraints

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
| Frontend | Single HTML file (~8,000+ lines), vanilla JavaScript, CSS Grid/Flexbox |
| Backend | Firebase Realtime Database |
| Game Data | XLSX import (SheetJS) |
| PDF Export | jsPDF |
| Hosting | GitHub Pages |

No frameworks. No build step. No dependencies to install.

---

## How to Use

1. Open the [play link](https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/)
2. Enter your player name
3. Build a team from available factions, or load a previously saved one
4. Create a new session or join an existing one by code
5. Play -- health, status effects, turns, and Victory Points sync live across all connected devices

---

## Local Development

Start a local server from the project root:

```bash
python3 -m http.server 8091
```

Then open `http://localhost:8091/index.html` in your browser.

Always test locally before pushing to main. The GitHub Pages deployment serves directly from the `main` branch.

---

## Project History

Over 100 versions across 84+ git commits. Built with Claude Code assistance.

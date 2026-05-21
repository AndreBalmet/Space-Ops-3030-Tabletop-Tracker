# SPACE-OPS 3030 Team Builder

React-based team-builder for SPACE-OPS 3030. Deployed at the **root URL**
(`andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/`) as of v15.0.
The legacy single-file tracker (admin / sessions / combat) lives at
`/tracker.html`.

## Files

- `index.html` — Babel-in-browser bootstrap (loads React, jsPDF, SheetJS, the
  data file, and `app.jsx`)
- `styles.css` — all styles
- `app.jsx` — single React file with every component
- `data/space-ops-data.js` — bundled fallback game data
  (`window.SPACE_OPS_DATA = { factions, models, weapons, equipment, traits, actions, actionCategories, conditions }`).
  The live source of truth is Firebase `/gameData` — this file is only used
  if Firebase is unreachable.

## Features

- **Landing page** — Player login (with admin password flow when the name is
  `admin`), Create Team, Load Team
- **Builder** — 3-column fixed-width layout. Asset picker (col 1) → asset
  detail with stat row, loadout, carry capacity (col 2) → armory with filter
  tabs and expandable item info (col 3)
- **Team View** — responsive card grid for play-time reference. Editable
  model names, weapons always expanded (RANGE/ATTACKS/POWER/DAMAGE inline),
  equipment collapsed by default (click to expand). Dangerous trait shown in
  red+bold. Export to PDF + Load Team buttons
- **HoverBox** — click any term (loadout item, equipped pill, weapon name,
  trait name) to see its full details. Traits inside a HoverBox are
  themselves clickable
- **PDF export** — jsPDF, US Letter portrait, 2×3 grid of model cards per
  page in the `//SPACE-OPS 3030/ROSTER` style. Same format as the legacy
  tracker
- **Admin XLSX upload** — when signed in as admin, the home menu surfaces
  an "Update Game Data (Admin)" entry. Parses .xlsx with SheetJS and writes
  each recognized sheet to its `/gameData/{key}` Firebase path

## Data: live Firebase sync

On startup the app fetches `/gameData` from
`https://space-ops-3030-default-rtdb.firebaseio.com`. It also polls
`/gameData/lastUpdated` every 60 seconds and on `visibilitychange` — if the
timestamp moved (i.e. an admin pushed a new XLSX), the team-builder
refetches and cascades a re-render so all open clients see fresh data
without a manual reload.

The bundled `space-ops-data.js` is now only a fallback. When the master XLSX
changes, admins should upload via the team-builder's admin panel OR the
legacy `/tracker.html` — both write to the same Firebase `/gameData` paths.

## Admin login

Type `admin` as the player name → a password field appears → enter the
admin password. Password is SHA-256-hashed in the browser and compared
against Firebase `/admin/passwordHash`. Same hash as the legacy tracker, so
the same credentials work in both apps.

## Persistence

LocalStorage keys:

| Key | Stores |
|---|---|
| `spaceops.player.v1` | Current player name |
| `spaceops.isAdmin.v1` | `"true"` if admin signed in |
| `spaceops.screen.v1` | `"builder"` / `"view"` (home = no entry) |
| `spaceops.current.v1` | Current team (auto-saved on every change) |
| `spaceops.teams.v1` | Saved teams list (auto-saved with 500ms debounce) |

All edits — model renames, slot equips, asset add/remove, faction changes —
are auto-saved. No "Save Team" click required (the button exists as a
"save now + toast" shortcut). Session is restored on remount so iPad
pull-to-refresh no longer wipes in-progress work.

## How to run locally

No build step. Open in a modern browser served over HTTP (not `file://`
— in-browser Babel needs proper script loading).

```bash
cd space-ops-team-builder
python3 -m http.server 8000
# then open http://localhost:8000
```

Or via Claude Code preview: `team-builder` launch config (port 8093).

## Architecture notes

- React 18 via CDN, JSX transformed in-browser by Babel
- No build tooling, no bundler
- Firebase access via REST API (no Firebase SDK) — read `/gameData`,
  read `/players/<name>/teams`, read `/admin/passwordHash`, write
  `/gameData/*` for admin upload
- jsPDF 2.5.1 + SheetJS 0.20.3 via CDN (same versions as legacy tracker)
- All styles in `styles.css` — no CSS-in-JS, no preprocessor

See `../CHANGELOG.md` for the full change history and `../CLAUDE.md` for
project-wide context.

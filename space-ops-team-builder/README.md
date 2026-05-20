# SPACE-OPS 3030 Team Builder

Interactive prototype rebuild of the team builder.

## Files

- `index.html` — entry point
- `styles.css` — all visual styles
- `app.jsx` — React app (mounts on `#app`)
- `data/space-ops-data.js` — auto-generated from your master XLSX
  (factions, models, weapons, equipment, traits, actions, conditions)

## How to run

Open `index.html` in any modern browser. No build step.

**Note:** Browsers won't let JSX work from `file://` due to script-loading
quirks. Either:

- Drag `index.html` into Chrome and accept (sometimes it works), or
- Run a tiny static server from this folder:

  ```bash
  cd space-ops-team-builder
  python3 -m http.server 8000
  ```

  Then open http://localhost:8000

## Updating the data

When the master XLSX changes, regenerate `data/space-ops-data.js`. The
JS module just contains `window.SPACE_OPS_DATA = { factions, models, weapons, equipment, traits, actions, actionCategories, conditions }`.

## Persistence

Saved teams + current player are stored in `localStorage` under the keys
`spaceops.teams.v1`, `spaceops.current.v1`, `spaceops.player.v1`.
Swap these helpers in `app.jsx` (`loadSavedTeams`, `writeSavedTeams`,
`loadCurrent`, `writeCurrent`) for Firebase calls when integrating with
the existing backend.

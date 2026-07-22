# Legacy Tracker (retired 2026-07-22, v15.4.0)

`tracker.html` is the original single-file Space-Ops 3030 app: multiplayer
sessions (host/join by code), combat tracker (initiative, health, status
effects, timer), dice roller, VP tools, admin XLSX upload, and PDF export.

It was retired from the live site when the app was refocused on **team
building + team viewing only**. Hosting/joining live sessions may return
later — when it does, start from this file and the git tag
`legacy-tracker-final` (the last commit where it was live at `/tracker.html`
with the team-builder integration intact).

Notes for a future revival:
- It reads teams from the legacy name-keyed path `/players/<name>/teams`;
  the team builder mirrored every save there for exactly this reason (see
  `teamStorage()` in `space-ops-team-builder/app.jsx`).
- It uses the Firebase JS SDK (the team builder uses plain REST).
- The admin XLSX upload it hosted also exists in the team builder now, so
  nothing else depends on this file.

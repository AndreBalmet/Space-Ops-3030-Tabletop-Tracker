# Space-Ops 3030 Tracker — Changelog
### v14.76 Patch Notes

---

## Hover Info & Tooltips
- **Trait tooltips from Excel** — All 20 weapon traits (Doorbreaker, Weaken, Overheats, Critical Hit, Bleed, Headshot, Electro, Heavy, AoE, etc.) now show hover descriptions pulled from the Excel Traits sheet
- **Trait fuzzy matching** — Handles name mismatches between sheets: "Overheats" → "Overheat", "AoE" → "AOE". Unknown traits show "No description yet — update Excel sheet"
- **Weapon tooltips everywhere** — Hovering any weapon name shows full stats (type, A/P/D, traits, points, description). Works in session game cards, team builder available models, roster cards, and expanded cards
- **Equipment tooltips expanded** — Now shows: Type, Points, Passive Ability, Action Name + Description, Traits, weapon stats, HP, Firewall, Memory, CPU. Missing data shows "No data yet — update Excel sheet"
- **Tooltip system foundation** — CSS tooltip system using fixed positioning, event delegation, `data-tt-title` / `data-tt-body` attributes

---

## Weapon & Equipment Data Fixes
- **Cyber Bite "Aundefined" fix** — Excel uses `RANGE` (Melee/Full) and `TRAITS` columns, but display code expected `type` and `effects`. Created `_enrichWeapon()` helper that checks both naming conventions and enriches from gameData
- **Fuzzy name matching** — Strips hyphens, removes parenthetical suffixes like `(War-dog)` and `(Vehicle)`, lowercases. Fixes: "Cyber Bite" ↔ "Cyber-Bite (War-dog)", "War Harness" ↔ "War-Harness (War-Dog)", "Pintel Carbine Array" ↔ "Pintel Carbine Array (Vehicle)", etc.
- **"?" placeholder for missing data** — Any weapon/equipment stat not filled in the Excel shows `?` instead of `undefined`
- **Weapon property normalization** — All weapon creation paths (team builder, quick build, starter squads, weapon swaps) now store normalized property names
- **Passive ability typo handled** — Excel column header `PASSIOVE ABILITY` (typo) now detected and displayed correctly

---

## Gameplay Features
- **Turn number tracking** — Turn counter in Firebase, real-time sync, `−` / `+` buttons centered above the toolbar. Next turn resets ALL models to Ready across all teams
- **Team Victory Points** — Per-team `gamePoints` with `−` / `+` controls in team headers and summary cards. Logged to combat log
- **Multi-player teams** — `members` array on teams, join/leave buttons, member list in headers. Multiple players can edit the same team
- **Equipment-granted Unique Actions** — Equipment with an `actionName` (e.g., Flashbang → Flash, Jetpack → Ammo (1)) auto-adds to the Unique Actions section. Shows "(from Jetpack)" tag
- **"Special Actions" → "Unique Actions"** — Renamed display text across the app

---

## Bug Fixes
- **Team data corruption on leave session** — Was hardcoding `points: 15` for every model. Fixed to look up actual points from gameData. Also preserves specialActions, consumables, portrait, color, firewall
- **Health button lag** — Replaced two sequential Firebase calls with optimistic local UI update + atomic `transaction()`. Added damage/heal flash animations
- **IIFE template literal crash** — A `${(function(){...})()}` inside a template literal broke the entire 370KB inline script (all buttons stopped working). Extracted to standalone helper function
- **Missing closing brace** — `${renderUniqueActions(char)` was missing `}` — broke entire script
- **Starter squad empty weapons** — `addQuickTeamModel()` was creating characters with empty weapon arrays. Now resolves starting weapons + loadout from gameData
- **loadTeamIntoSession missing fields** — Added `firewall`, `color`, `portraitColor` preservation

---

## UI / Cosmetic
- **Menu font** — Roboto Light 300, Roboto Bold 700 on hover (black, not orange)
- **Menu order** — Login, Build Team, Join Session
- **Turn counter redesign** — Replaced "Next Turn" button with `−` / `+` buttons in centered section
- **View mode buttons renamed** — "Compact" → "Large", "Tiny" → "Small"
- **Firewall stat display** — Shows in game session character cards for models that have it (e.g., Mono Tank)
- **Campaign section hidden** — Commented out in 3 flows for future re-enable

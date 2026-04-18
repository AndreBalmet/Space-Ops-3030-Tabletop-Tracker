# Space-Ops 3030 Tracker — Changelog

All notable changes to the Space-Ops 3030 Tracker are documented in this file. Newest version first.

---

## v14.78 — 2026-04-18

### Bug Fixes
- **Default gear no longer refunds Rating when unequipped** — Unequipping a model's starting weapon or equipment (e.g. a Ranger's Pulse Carbine) no longer gives back points. Default gear is baked into the model's base Rating; you only pay the **upgrade delta** when replacing it (e.g. Pulse Carbine → Pulse Cannon costs +5, not +7). Downgrades also refund 0. Previously, emptying a default slot shaved points off the team total, which could be exploited when combined with added upgrades.

---

## v14.77 — 2026-03-26

### Bug Fixes
- **Rating calculations fixed** — Team totals now correctly include equipment/upgrade costs. Previously some +1 or +2 gear wasn't counted in the team total.
- **Stale data refresh** — Loading a saved team now refreshes ALL weapon, equipment, and model data from the latest XLSX. Old teams built before data updates will auto-correct their ratings on load.
- **Custom names transfer to sessions** — Character names set in team builder now properly carry over when joining a session.
- **Live health updates on iPad** — Fixed Firebase disconnecting when iPads go to background. Health changes now sync reliably across all devices.
- **Game & Tools tabs visible to all players** — Timer and session tools now appear for everyone, not just the host.
- **Stat grid wrapping on vehicles** — Models with 6 stats (e.g. Mono Tank with Firewall) no longer break to a second row.
- **Save button stays on builder** — Saving a team no longer kicks you to a confirmation screen. Button flashes "Saved!" briefly and stays put.

### Terminology Changes
- **"Points/pts" renamed to "Rating"** — All references to model and gear cost now say "Rating" everywhere (team builder, cards, tooltips, PDF export, etc.).
- **A/D/P replaced with full words** — Weapon stats now display "Attack", "Power", "Damage" instead of abbreviations.

### New Features
- **Auto Pilot for vehicles** — Adding a Mono Tank (or any vehicle) auto-adds a Pilot to the roster. Removing the vehicle auto-removes the Pilot.
- **Team-only ownership** — Only your own team can adjust health, toggle turns, or manage status effects. No more accidentally editing someone else's models.
- **Status effects system** — Each model card now has an "Add Effect..." dropdown (Overwatch, Suppressed, Stunned, Poisoned, Shaken, Burning, Hacked, Boosted, Hidden, Inspired, or Custom). Effects show as pill tags with duration and auto-expire when turns advance.
- **XLSX-driven effects** — Adding an EFFECTS sheet (columns: Name, Duration, Description) to the game data XLSX will auto-populate the status effects dropdown.
- **Save button UX** — Save stays on builder, flashes "Saved!" confirmation inline.

### Architecture Note
- Teams are instanced when joining sessions. Edits made in-session do NOT write back to your saved teams in the team builder.

---

## v14.76 — 2026-03-15

### Hover Info & Tooltips
- **Trait tooltips from Excel** — All 20 weapon traits (Doorbreaker, Weaken, Overheats, Critical Hit, Bleed, Headshot, Electro, Heavy, AoE, etc.) now show hover descriptions pulled from the Excel Traits sheet.
- **Trait fuzzy matching** — Handles name mismatches between sheets: "Overheats" to "Overheat", "AoE" to "AOE". Unknown traits show "No description yet — update Excel sheet."
- **Weapon tooltips everywhere** — Hovering any weapon name shows full stats (type, A/P/D, traits, points, description). Works in session game cards, team builder available models, roster cards, and expanded cards.
- **Equipment tooltips expanded** — Now shows: Type, Points, Passive Ability, Action Name + Description, Traits, weapon stats, HP, Firewall, Memory, CPU. Missing data shows "No data yet — update Excel sheet."
- **Tooltip system foundation** — CSS tooltip system using fixed positioning, event delegation, `data-tt-title` / `data-tt-body` attributes.

### Weapon & Equipment Data Fixes
- **Cyber Bite "Aundefined" fix** — Excel uses `RANGE` and `TRAITS` columns, but display code expected `type` and `effects`. Created `_enrichWeapon()` helper that checks both naming conventions and enriches from gameData.
- **Fuzzy name matching** — Strips hyphens, removes parenthetical suffixes, lowercases. Fixes matching between display names and data names.
- **"?" placeholder for missing data** — Any weapon/equipment stat not filled in the Excel shows `?` instead of `undefined`.
- **Weapon property normalization** — All weapon creation paths (team builder, quick build, starter squads, weapon swaps) now store normalized property names.
- **Passive ability typo handled** — Excel column header `PASSIOVE ABILITY` (typo) now detected and displayed correctly.

### Gameplay Features
- **Turn number tracking** — Turn counter in Firebase, real-time sync, minus/plus buttons centered above the toolbar. Next turn resets ALL models to Ready across all teams.
- **Team Victory Points** — Per-team `gamePoints` with minus/plus controls in team headers and summary cards. Logged to combat log.
- **Multi-player teams** — `members` array on teams, join/leave buttons, member list in headers. Multiple players can edit the same team.
- **Equipment-granted Unique Actions** — Equipment with an `actionName` auto-adds to the Unique Actions section with "(from [item])" tag.
- **"Special Actions" renamed to "Unique Actions"** — Display text updated across the app.

### Bug Fixes
- **Team data corruption on leave session** — Was hardcoding `points: 15` for every model. Fixed to look up actual points from gameData. Also preserves specialActions, consumables, portrait, color, firewall.
- **Health button lag** — Replaced two sequential Firebase calls with optimistic local UI update + atomic `transaction()`. Added damage/heal flash animations.
- **IIFE template literal crash** — A complex IIFE inside a template literal broke the entire 370KB inline script. Extracted to standalone helper function.
- **Missing closing brace** — `renderUniqueActions` call was missing closing brace — broke entire script.
- **Starter squad empty weapons** — `addQuickTeamModel()` was creating characters with empty weapon arrays. Now resolves starting weapons + loadout from gameData.
- **loadTeamIntoSession missing fields** — Added `firewall`, `color`, `portraitColor` preservation.

### UI / Cosmetic
- **Menu font** — Roboto Light 300, Roboto Bold 700 on hover.
- **Menu order** — Login, Build Team, Join Session.
- **Turn counter redesign** — Replaced "Next Turn" button with minus/plus buttons in centered section.
- **View mode buttons renamed** — "Compact" to "Large", "Tiny" to "Small".
- **Firewall stat display** — Shows in game session character cards for models that have it.
- **Campaign section hidden** — Commented out for future re-enable.

---

## v14.76-dev — 2026-03-16

Incremental development commits between v14.76 release and v14.77.

- **Nerve renamed to Grit** — Stat label updated across all model cards and data references.
- **Defense stat added** — All model cards now display a Defense stat.
- **Physical-card-style stat grid** — Stat boxes restyled with dark headers, full labels, and bold values to match printed game cards.
- **Prominent HEALTH bar** — Added above stat grid in team builder cards.
- **Recalculate team rating on load** — Team points recalculated from current gameData on load; removed individual CSV upload feature.
- **Fix model points floor** — Model points no longer drop below base cost when swapping to cheaper weapons.
- **Unified equipment slots** — Equipment consolidated into 4 generic slots. Added melee warning and notes on collapsed cards.
- **6-stat consistency** — All models now show all 6 stats consistently. Removed hardcoded data; XLSX-only pipeline.
- **Equipment renamed to Gear** — Label change across all UI. Removed portraits. Stats made read-only. Added categorized gear dropdowns.
- **Unique actions from all gear sources** — Ammo tracking with minus/plus buttons.
- **Landing page logo updated** — Space Ops 3030 Alpha (transparent background).

---

## v14.75 — 2025-12-21

- Major pre-release build with accumulated features and fixes from v14.39 through v14.47.

---

## v14.47 — 2025-12-21

- Continued iteration on session and team management features.

---

## v14.44 — 2025-12-21

- Incremental feature and stability improvements.

---

## v14.39 — 2025-12-21

- Large batch of feature additions and refactoring.

---

## v14.15 — 2025-12-20

- Stability improvements and testing fixes.

---

## v14.14 — 2025-12-20

- Bug fix release.

---

## v14.13 — 2025-12-20

- Testing and iteration on portrait input features.

---

## v14.8 — 2025-12-20

- Sanitize player names for security.
- Refactored team editing buttons.
- Improved portrait input features.

---

## v14.5 — 2025-12-20

- Enhanced inventory management.
- Added version info display.
- Removed starfield animation and related functions.
- Updated button functions.

---

## v14.1 — 2025-12-20

- Bug fixes for saving functionality.
- Inventory management enhancements.

---

## v14 — 2025-12-20

- Major version bump with saving hotfix.
- Core architecture changes from v13.

---

## v13.2 — 2025-12-20

- Incremental improvements to v13 features.

---

## v13.1 — 2025-12-20

- Bug fixes and polish for v13 release.

---

## v13 — 2025-12-20

- Major version with significant feature additions over v12.

---

## v12.17 — 2025-12-19

- Feature updates with hotfix follow-up.

---

## v12.16 — 2025-12-19

- Continued development.

---

## v12.15 — 2025-12-19

- Continued development.

---

## v12.14 — 2025-12-19

- Continued development.

---

## v12.13 — 2025-12-19

- Continued development.

---

## v12.11 — 2025-12-19

- Image handling updates.

---

## v12.10 — 2025-12-19

- Continued development.

---

## v12.9 — 2025-12-19

- Continued development.

---

## v12.8.1 — 2025-12-19

- Hotfix for v12.8.

---

## v12.8 — 2025-12-19

- Continued development.

---

## v12.7 — 2025-12-19

- Update release.

---

## v12.6 — 2025-12-19

- Continued development.

---

## v12.5 — 2025-12-19

- Continued development.

---

## v12.4 — 2025-12-18

- Continued development.

---

## v12.3 — 2025-12-18

- Continued development.

---

## v12.2 — 2025-12-18

- Continued development.

---

## v12 — 2025-12-18

- Major version bump from v11.

---

## v11 — 2025-12-18

- Implemented special actions feature in character form.
- Dark theme with gold accents.
- Color scheme changed from gold to orange.

---

## v1.0 — 2025-12-18

- Initial commit. First upload of Space-Ops 3030 Tracker.

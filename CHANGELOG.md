# Space-Ops 3030 Tracker — Changelog

All notable changes to the Space-Ops 3030 Tracker are documented in this file. Newest version first.

---

## v15.0.5 — 2026-05-27

### Cross-device team sync + Maligeist equipment usable

- **Maligeist equipment is now usable.** In v15.0.1 the armory's Equipment filter began requiring a non-empty `equipmentType` to suppress the SPACE-WYRM / KIPPIN / MALIGEIST XLSX header-row leakage. Side effect: Maligeist's 10 equipment items (and 4 Kippin items) all carry empty `equipmentType` in the XLSX, so they vanished from the armory entirely. New rule: pass if **either** `equipmentType` **or** `faction` is non-empty — Maligeist/Kippin equipment now appears, while header rows (both empty) are still suppressed.
- **Teams sync across devices via Firebase.** Saved teams in the team-builder are now mirrored to `/players/<player>/teams/<id>` (the same path the legacy tracker writes to). On save / auto-save, the local team is also pushed to Firebase. On delete, the Firebase mirror is removed. iPad ↔ laptop ↔ legacy tracker now all see the same team list for a given player.
- **LoadModal dedup.** When a team exists both locally (with an `fb-` prefix from a prior load) and in Firebase, only the local entry is shown — the cloud duplicate is hidden. Stripping the prefix on save means the same team round-trips through Firebase under a single ID.
- **LoadModal: cloud teams are no longer read-only.** Removed the misleading "read-only" label. Every saved team now has a Delete button regardless of whether it originated locally or in the cloud (and Delete removes both copies).

## v15.0.4 — 2026-05-27

### Canonical Maligeist spelling restored

The canonical spelling is **Maligeist** (with an `i`). v15.0.3 incorrectly normalized in the other direction (e-spelling) based on what the data sheet looked like at the time. This release flips the alias the right way and finishes cleaning up Firebase.

- **Firebase**: patched 11 stale `Malegeist` (e-spelling) strings in `/gameData/equipment` (1 header row + 10 faction values). All other sheets (factions, models, weapons, traits) were already on `Maligeist` — confirmed via full deep-scan. Stamped `lastUpdated` so live clients refresh within 60s.
- **Code**: `FACTION_ID_ALIASES` reversed to `{ Malegeist: 'Maligeist' }`, so any team saved on a user's device under v15.0.3 silently migrates to the canonical spelling on next load.

### XLSX heads-up
The **Equipment sheet** in your master XLSX still has the e-spelling for both the section header row and the 10 faction values. Until you fix that, every fresh upload will reset Firebase back to `Malegeist` and we'll need to patch it again. Recommend a single find-and-replace `Malegeist` → `Maligeist` in the Equipment sheet.

## v15.0.3 — 2026-05-27

### Malegeist faction recovered

- **Fixed: Malegeist faction had no selectable models.** The Factions sheet on Firebase carried a stale `Maligeist` (i-spelling), while every model/weapon/equipment in that faction was tagged `Malegeist` (e-spelling). The dropdown showed `Maligeist`, the model filter looked for `Maligeist`, and matched zero records — so the faction was empty. Patched 5 stale `Maligeist` entries in Firebase `/gameData` (`factions[2]`, plus 4 XLSX header-row entries in `equipment[60]` / `models[18]` / `weapons[30]` / `traits[27]`). Stamped `lastUpdated` so live clients pick it up on the next 60s poll.
- **Code-side defense:** `normalizeFactionId` aliases `Maligeist → Malegeist` at every read boundary (`loadSavedTeams`, `loadCurrent`, `convertFbTeam`), so any team that was saved on a user's iPad while the old spelling was live auto-migrates on next load. Master alias table lives at the top of `app.jsx` so future drifts are a one-line addition.

## v15.0.2 — 2026-05-27

- Cyberdeck device now appears in **both** the Equipment and Cyberdeck armory filters (existing Cyberdeck Upgrades unaffected).
- Cache-bust query string (`?v=…`) added to `app.jsx`, `styles.css`, and `data/space-ops-data.js` so future deploys cleanly invalidate iOS Safari's aggressive cache.

## v15.0.1 — 2026-05-27

### Team-Builder bug fixes

- **Fix: adding any model added a Ranger-Captain instead.** Every XLSX-uploaded model arrived from Firebase with an empty `id` field, so `findModel('')` always resolved to the first entry in `DATA.models` (Ranger-Captain (Leader)). This also made the picker's `countOf` collapse across all models in a faction (every Kippin model showed the same `(x3)` count). `loadGameDataFromFirebase` now falls back to using `name` as `id` when the field is blank.
- **Defensive: orphan assets are dropped on team restore.** Teams previously saved with broken `modelId: ''` would otherwise crash the renderer; they are now filtered out at hydration with a `[team] dropped N orphan asset(s)` console warning. `displayName()` and `isLeader()` are also null-safe.
- **Armory now filters weapons and cybertech by faction** (equipment already did). Same rule as before: items with no `faction` are universal; items with a faction only appear in their faction's armory. Picks up the new Equipment Faction column without code changes.
- **Fix: armory rows duplicated on every tab switch.** Items sharing a name (e.g. "Grav Rounds" exists as both Operator Equipment 1r and Vehicle Equipment 2r) caused duplicate React keys, which leaked stale DOM nodes on each Equipment ↔ Ranged cycle. The fix is two-layered: (1) keys are now globally unique (kind + name + type + faction); (2) the armory also filters by **assetType**, so an Operator asset only sees Operator-tier gear and a Support asset (vehicle) only sees Vehicle-tier gear — which is the right rule anyway and naturally dedupes the visible list. Also suppresses the "SPACE-WYRM/KIPPIN/MALIGEIST" XLSX header-row leakage (those rows have no assetType).
- **Fix: equipment tab also requires a non-empty `equipmentType`** — the header-row rows used to slip through because empty equipmentType passed both `!cyber` and `!default loadout`.
- **Fix: deleting the currently-loaded team always left one behind.** The auto-save effect would re-write the in-memory team back to localStorage 500ms after deletion. `LoadModal`'s onDelete handler now also clears `team` / `current` / `screen` when the deleted id matches the loaded team.

### Team-Builder visual tweaks (per design notes)

- Armory filter labels shortened: "Ranged Weapons" → "Ranged", "Melee Weapons" → "Melee", "Cybertech" → "Cyberdeck". Layout: "FILTER" sits on its own line above the tab strip; tab strip is a flex-wrap row so the 4 tabs sit on one line where space permits and wrap otherwise.
- New `--red-on-dark: #e34a4a` token for labels on the dark armory-expand stat boxes (the existing `--red` was hard to read against `--pill-dark`).
- Softer tag typography on `.asset-detail__tag`, `.stat-row__label`, `.asset-group__tag`, `.tag`: font-weight 400 (was 700), letter-spacing 0.14em (was 0.18em / 0.12em), line-height 1.25.
- Font swap: body font is now Roboto (loaded via Google Fonts), falling back to Helvetica Neue then Arial.
- Builder columns scale to ~130% at viewports ≥1700px (4K monitors): 600/290/605 → 780/377/787. Below that breakpoint, the original page-8 grid is unchanged.

---

## v15.0 — 2026-05-20

### Major: Team-Builder pivot (now the default URL)

The project now serves two coexisting apps:

- **Root URL** (`andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/`) — a new React-based **team-builder** focused on building, viewing, and exporting teams.
- **`/tracker.html`** — the legacy v14.83 single-file tracker (admin sign-in, Firebase sessions, combat tracker, XLSX upload, PDF export) — fully intact, just at a new path.

Root `index.html` is now a small meta-refresh redirect to `/space-ops-team-builder/`. The previous root tracker was renamed (`index.html` → `tracker.html`) with no other modifications.

### New team-builder

Lives in `/space-ops-team-builder/`:

| File | Role |
|---|---|
| `index.html` | Babel-in-browser bootstrap (loads React, jsPDF, SheetJS) |
| `app.jsx` | Single React file — `AppRoot`, `App`, `Home`, `Builder`, `TeamView`, `HoverBox`, `XlsxUploadModal`, `LoginModal`, `LoadModal` |
| `styles.css` | All styles |
| `data/space-ops-data.js` | Bundled snapshot of game data (fallback if Firebase fails) |

#### Landing page
- Pixel-matched to page 1 of `WebApp_v2.pdf`: title, diagonal stripe band, player line, vertical menu.
- Stripe pattern: `repeating-linear-gradient(132deg, ...)` — 42° off vertical, 55px stripe / 28px gap horizontal, phase-aligned so white sits top-left like the mock.
- Content band left-edge x=320, right-edge x=890 — same horizontal grid as the builder, so flipping between Home and Builder leaves elements on the same column positions.

#### Builder (3-column layout)
- **Fixed column widths**: col 1 (white, 600px) + col 2 (light gray, 290px) + col 3 (mid-gray, 605px) = 1495px. No auto-resize; horizontal scroll at narrower viewports.
- Columns extend full viewport height behind a transparent topbar (no vertical bg gap on tall screens).
- No vertical dividers between columns — color shifts alone mark boundaries.
- Section dividers (Team Assets / Asset Name / Armory) aligned across all three columns to a shared horizontal baseline.
- Selected asset row bleeds full-width to col 2 boundary (red `#E44A4A`, no rounding on the trailing edge).
- Selected slot pill bleeds full-width to col 3 boundary (same treatment).
- Slot pills use `var(--radius-pill: 10px)` border-radius and `--pill-dark: #2D2D2D` bg (pixel-sampled from mock).
- Stat row centered with red caps labels.
- Slide-in animation when detail/armory columns mount.

#### Team View
- Responsive grid `repeat(auto-fill, minmax(380px, 1fr))` of asset cards.
- Each card: bucket tag (`OPERATOR LEADER / RANGER-CAPTAIN`), editable model name + rating, centered 6-stat row, Loadout, Carry Capacity.
- **Weapons always expanded** with inline Range / Attacks / Power / Damage and Traits list. Stat cells centered.
- **Equipment collapsed** by default — pill with chevron `▾`, click to expand for Passive / Action / Traits / description.
- **Dangerous trait** rendered red + bold automatically (case-insensitive `is-dangerous` class).
- Team Management container (Export to PDF, Load Team, Back to Builder) flows as the last grid item.
- Model names editable via click → input → Enter to commit. `customName` stored on the asset and auto-saved.

#### HoverBox
- Click any term (loadout item, equipped pill, weapon name in armory expand, trait in any context) → dark info card with stats + traits + actions.
- Trait names inside a HoverBox are themselves clickable, opening a trait HoverBox (recursive).
- Trait resolution handles `(x)` and trailing-number variants — `"Ammo (1)"` resolves to `"Ammo (x)"`.

### Data: live Firebase sync

- On app mount the team-builder fetches `/gameData` from Firebase (same path the legacy tracker writes to via XLSX upload) — no more reliance on the bundled snapshot.
- Field mapping: Firebase's `carryCapacity` mirrored to `totalSlots` so existing code keeps working.
- Bundled `space-ops-data.js` retained as a fallback if Firebase is unreachable.
- **Auto-refresh**: polls `/gameData/lastUpdated` every 60s + on `visibilitychange` (tab regain). If the timestamp changed (admin pushed a new XLSX), refetches `/gameData`, bumps `window.SPACE_OPS_DATA._version`, and cascades a re-render via a `dataVersion` prop on `App`. `AssetCard`'s gear `useMemo` includes the version in deps so stale lookups invalidate.
- Every team — saved locally or loaded from Firebase — recomputes stats/ratings/traits/passives from the freshest data automatically.

### Firebase team read (saved teams from legacy tracker)

- The team-builder reads saved teams from `/players/<player>/teams` (the legacy tracker's storage path) — read-only.
- FB-sourced entries appear in the Load Team modal marked `· Cloud` with a `read-only` indicator.
- Item names from FB-stored teams are deduped — items that appear in both `weapons[]` and `inventory[]` arrays (H4 Grenade, Ghost Trace, Cyberdeck, etc.) are classified to the correct kind via the current `/gameData` rather than double-added.
- Loading an FB team carries its `defaultWeapons` / `defaultInventory` so the view layer can render free items even though they don't occupy purchased slots.

### Admin

- **Admin login**: typing player name `admin` in `LoginModal` reveals a password field. Password is SHA-256-hashed in the browser (`crypto.subtle.digest`) and compared against Firebase `/admin/passwordHash` — same hash as the legacy tracker, so `enterthereach` works in both apps. State persisted to `localStorage.spaceops.isAdmin.v1`.
- **Admin XLSX upload**: when signed in as admin, an `Update Game Data (Admin)` entry appears in the home menu. Opens `XlsxUploadModal`, which parses the .xlsx via SheetJS `0.20.3` (same as legacy), maps recognized sheets (Factions / Models / Weapons / Equipment / Traits / Actions / Action Categories / Conditions) to their `/gameData/{key}` paths, PUTs each via REST, and stamps `/gameData/lastUpdated` with `{".sv":"timestamp"}`.
- After upload, immediately refetches `/gameData` so the admin sees their own changes without waiting for the 60s poll. Other clients pick up within 60s.

### Persistence & reliability

- **Session restore on remount**: `team` and `screen` (`builder` / `view`) are restored from localStorage on every App mount. Asset `instanceId`s are reassigned per session. Fixes the iPad bug where pull-to-refresh appeared to wipe custom model names.
- **Auto-save**: every team mutation (rename, slot equip, asset add/remove, faction change) is debounced 500ms then written into `spaceops.teams.v1`. No manual Save click required — the existing Save Team button stays as a "save now + toast" shortcut. Fixes the View-Team customName loss when switching teams via Load.
- **iOS overscroll suppressed**: `html, body { overscroll-behavior-y: none }` blocks iPad's pull-to-refresh and rubber-band reload.

### Export to PDF

- jsPDF (CDN-loaded `2.5.1`, same version as legacy) ported from the legacy tracker's `exportTeamToPDF`.
- Generates a US Letter portrait PDF in the `//SPACE-OPS 3030/ROSTER` style: hatch box + barcode header with PLAYER / FACTION / TEAM / RATING, 2×3 grid of model cards per page (6 models per page), MODEL / HEALTH header, 5 stat boxes (SPEED / SHOOT / FIGHT / DEFENSE / GRIT), Standard Equipment line, 4 Gear slots.
- Filename: `{Player}_{TeamName}.pdf`.

### Bug fixes during the pivot

- Custom model names lost on iPad pull-to-refresh — fixed by session restore + overscroll suppression.
- Custom names lost when switching teams via Load from View Team (which has no Save button) — fixed by auto-save.
- Weapon stat cells were left-aligned in Team View — now centered to match the model stat row.
- Admin login (`admin` / `enterthereach`) wasn't surfaced in the team-builder — now wired through the existing LoginModal.

### Known limitations

- Firebase `/gameData/*` paths accept unauthenticated writes by design (inherited from legacy rules). The admin password gate is client-side only.
- Auto-saved FB-loaded teams keep their FB id and `_source: 'firebase'` marker, so the Load Team modal shows two entries for the same team — one local (with customNames + recent timestamp), one cloud (original FB snapshot). Picking the local entry restores customNames; picking the cloud entry resets to the FB snapshot. Dedup is a future cleanup.
- A few legacy FB teams reference the model name `Ranger-Captain in Hardsuit (Leader)` which no longer exists in current `/gameData/models` (renamed to `Ranger-Sergeant in Hardsuit (Leader)`). Those models are skipped on load with a console warning.

### Commits

| Hash | Title |
|---|---|
| `40afc7d` | Add space-ops-team-builder prototype scaffolding |
| `2e31fa3` | Promote team-builder to default URL; move legacy tracker to /tracker.html |
| `a47e548` | Fetch /gameData from Firebase in team-builder |
| `491ff66` | Auto-refresh gameData on admin XLSX uploads |
| `d7d12c4` | Add admin login flow to team-builder |
| `878ec69` | Add admin XLSX upload to team-builder |
| `8af0696` | Restore team session on remount; suppress iOS pull-to-refresh |
| `3ac92d4` | Auto-save team on every change |
| `bc53e61` | Center weapon stat cells in Team View (match model stat row) |

---

## v14.83 — 2026-04-22

### Bug Fixes
- **Suppressor / Silencer now shows up when a Pulse Carbine is equipped** — items whose name ends with a parenthetical tag (e.g. "Carbine Silencer (Pulse Carbine)") were being treated strictly as model restrictions, which failed because "Pulse Carbine" is an *item*, not a model. The parenthetical is now evaluated through the same flexible check used by the `BOOLS` column — it can match a model name, a type keyword, **or an equipped item**. The Silencer now appears when the model has a Pulse Carbine in a slot and disappears when unequipped.
- **Vehicles can equip generic ranged weapons** — the symmetric rule that blocked non-vehicle-tagged gear from vehicles was too strict. Vehicles can now equip any generic weapon/gear. Vehicle-only items (tagged via `equipmentType` or `(Vehicle)`) still remain vehicle-exclusive.
- **Weapons Platforms + Drones no longer auto-pair a Ranger Pilot** — the auto-pilot logic now only fires for manned vehicles (Tanks, TRVs, bikes). Deployable assets (Platform, Drone, Turret, Emplacement, Sentry) are skipped.
- **Removing the Pilot no longer breaks the team Rating** — the old code did `team.rating -= pilot.rating`, which produced NaN when the pilot's XLSX rating is `"-"` (bundled with the vehicle). Add/remove now call `recalculateAllTeamRating()` to recompute the team total authoritatively from source data.

### Cleanup
- Removed the leftover graying-out code (CSS + render branches + tap handler fallback). Non-equippable items have been hidden rather than grayed since v14.81 — the graying path was dead weight.

---

## v14.82 — 2026-04-22

### Bug Fix
- **NaN / missing Rating on model and team cards** — existing Firebase game-data records only have the new `rating` field, while 50+ places in the code still read the legacy `.points` field. v14.80's bi-directional alias only fired on fresh XLSX uploads, so cached Firebase data rendered as `NaN / 60 Rating` and `— Rating` on every model.

### Refactor — single source of truth
- Completed the points → rating rename across the entire codebase. Every property, internal variable, function name, DOM id, and comment now uses `rating`. `points` is no longer used anywhere except for the unrelated in-game victory-points concept (`gamePoints`, `updateGamePoints`).
- Affected renames: `model.points` → `model.rating`, `currentTeam.points` → `currentTeam.rating`, `basePoints` → `baseRating`, `weaponPointsDelta` → `weaponRatingDelta`, `equipmentPointsDelta` → `equipmentRatingDelta`, `totalPoints` → `totalRating`, `teamPoints` DOM id → `teamRating`, and the helper functions `recalculateAllTeamPoints` / `recalculateModelPoints` / `updateTeamPoints`.
- Removed the v14.80 bi-directional alias shim — no longer needed.

---

## v14.81 — 2026-04-22

### Team-Building Rules Update
Implements the rules from the *Updates to Team-Building* spec:
- **60 Rating budget** — the team header now shows `X / 60 Rating`; turns red when the team goes over budget (soft warning, no hard block).
- **Leader check** — warning banner above the roster when the team has 0 or >1 Leaders (Leaders detected by `(Leader)` in the model name).
- **Carry Capacity from XLSX** — the number of gear slots on a model now follows its `TOTAL SLOTS` column (War-Dog = 2, Weapons Platform = 2, etc.) instead of a hardcoded 4.

### Equipment Quality Tiers
- **Quality badges on every equipment card** — Standard (gray), Superior (green), Rare (blue), Epic (purple) matching the spec's RPG-style color coding.
- **Team quality caps** — warning banner fires when the team exceeds **max 2 Rare** or **max 1 Epic** (soft warning, not blocked).
- **Quality filter chips** — second row in the Equipment Panel with Any Quality / Standard / Superior / Rare / Epic. Active chip takes the tier color.

### Restriction & Dependency Rules
- **BOOLS column** in the Equipment/Weapons sheets now drives dependencies. Each comma-separated entry is treated as a constraint that must be satisfied:
  - Model name (e.g. `Ranger-Captain`) → only that model can equip.
  - Type keyword (`Vehicle` / `Leader` / `Infantry`) → model-class match.
  - Item name (e.g. `Pulse Carbine`) → the model must already have that item equipped (useful for attachments like Carbine Silencer).
- **Non-equippable items are hidden**, not grayed out. When editing a model, the picker only lists items the model can actually equip (faction + vehicle class + parenthetical tag + BOOLS all considered). When no model is being edited, all faction-usable items remain visible for browsing.

### Dual Wield
- When a model has two identical melee weapons equipped, a **⚔⚔ Dual Wield** indicator appears on both the collapsed card and the expanded card's Gear section.

---

## v14.80 — 2026-04-22

### Bug Fixes
- **Rating values showing wrong / missing after XLSX re-upload** — The latest XLSX renamed the `POINTS` column to `RATING` and `EFFECTS` to `TRAITS`. The parser normalized these to `.rating`/`.traits`, but ~50 places in the code still read `.points`/`.effects`, so model and gear ratings were falling back to defaults (usually 15) and trait strings were blank. Fixed by aliasing the fields bi-directionally in the XLSX parser — a value written under `rating` is mirrored to `points` (and vice-versa), same for `traits`/`effects`. All existing read sites work again without code changes elsewhere.
- **Status-effects dropdown now reads from the `Conditions` sheet** — The dropdown was silently falling back to hardcoded defaults because it looked for `gameData.effects`, which the new XLSX doesn't populate (it has a `Conditions` sheet instead). `getAvailableEffects()` now reads `gameData.conditions` and maps the `EFFECT` column to the UI's `description` field.

---

## v14.79 — 2026-04-18

### New Feature — Equipment Picker Panel
- **Side-panel gear picker replaces slot dropdowns.** Tapping **Edit** on a team model slides the Available Models column off-screen and brings in a new Equipment Panel from the right. Your Team column slides into the vacated space so the model stays in view while you outfit it.
- **Stay in equip mode across models.** Tapping **Done** on a model card now only collapses that card — the panel stays open so you can tap Edit on the next model and keep outfitting. Only the **Done** button at the top of the Equipment Panel exits back to the Available Models view.
- **Active-slot interaction.** Slot rows are now clickable buttons (no dropdown). Tap a slot → it gets a red highlighted border. Tap an equipment card → fills that slot. A small × on a filled slot unequips it. The active slot persists after a fill, so you can keep swapping gear quickly.
- **Compact cards with tap-to-expand.** Cards show just Name + Rating by default. First tap expands to full details (stats, traits, description). Second tap equips into the active slot. Tapping another card collapses the first and expands the new one.
- **Search + category filters.** Search by name, plus chips: All / Ranged / Melee / Cyberdeck / Equipment / Vehicle. Cyberdeck items appear in both the Cyberdeck filter and the general Equipment filter.
- **Restriction rules by parenthetical naming.** Items whose name ends with `(ModelName)` restrict equipping to that model only. Examples: `Cyber-Bite (War-dog)` → only War-Dog, `Grim Leadership (Ranger-Captains)` → only Ranger-Captain. Matching is case/hyphen/plural-insensitive so minor spelling variants in the XLSX still match.
- **Vehicle / infantry separation.** Vehicle-tagged items (`equipmentType` contains "vehicle" or name ends in `(Vehicle)`) are equippable only by vehicle models. Vehicle models in turn can only equip vehicle gear.
- **Grayed-out cards for non-equippable gear.** Items the current model can't equip are dimmed but still tappable to expand, so players can read the details. A small "Not equippable by <Model Name>" note replaces the equip prompt.

### Layout / Polish
- Equipment cards stack in a single column (no multi-column fill on wide screens).
- Column header underlines extend through the grid gap so the line under **Your Team** reaches the full content width and aligns with the gray divider above.
- `scrollbar-gutter: stable` on scrollable lists keeps content from butting against the scrollbar.
- Both columns scroll independently to fill the viewport (`calc(100vh - 180px)`).
- `CHOOSE EQUIPMENT` header now matches `YOUR TEAM` typography and alignment.

### Phone support
- On screens <768px the Equipment Panel becomes a full-screen sheet so it's usable on small devices.

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

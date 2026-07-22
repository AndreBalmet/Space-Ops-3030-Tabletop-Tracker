# Space-Ops 3030 Tracker — Changelog

All notable changes to the Space-Ops 3030 Tracker are documented in this file. Newest version first.

---

## v15.3.2 — 2026-07-22

- Armory filter switches no longer flash: the row cascade is now motion-only (rows stay fully solid and ripple downward into place) — any opacity fade, even partial, read as the panel flashing bright on each switch.

## v15.3.1 — 2026-07-22

### Motion polish (pure CSS, no new dependencies)
- Shared easing tokens: `--ease-out` (fast settle) and `--ease-spring` (~5% overshoot "pop").
- **Armory popup**: springy pop-in over a fading backdrop, rows cascade in with a 22ms stagger (capped), and a real exit animation — the popup drops/fades for 180ms before unmounting (backdrop click or Done).
- **All modals** (Load, Login, Welcome, XLSX): same pop-in + backdrop fade.
- **Micro-motion**: equipped slot pills pop on equip, armory info dropdown eases open, HoverBox pops, model picker and detail column rise in, Team View cards cascade (capped at 8 steps), tutorial cards re-pop on each step, all button hovers ease.
- Respects `prefers-reduced-motion` (animations collapse to instant).

## v15.3.0 — 2026-07-22

### Builder layout: two 50/50 columns + Armory popup
- The builder is now **two equal main columns** — Team Assets (left) and the selected asset's detail (right) — instead of three fixed-width columns. Content in each column is width-capped and gravitates toward the center line; the right column shows a hint until a model is selected (and is hidden on phones when empty).
- **The Armory is now a popup** (centered modal over a dimmed backdrop) opened from "Equip from the Armory" or any loadout pill. Backdrop click or Done closes it; equipping keeps it open for multi-equip. Scales up on wide screens, full-width on phones.
- Armory item info dropdown now matches the item pill's width and connects to it seamlessly (no gap, aligned spacing).

### First-time-user tutorial (NUX)
- New guided walkthrough in the app's design language: welcome popup on first visit, then spotlight tours that fire contextually — Home menu, first time in the Builder (6 steps: name/faction, adding models, rating budget, roster, carry capacity, save/view), first time the Armory opens (3 steps), and first Team View.
- Spotlight highlights the real UI element (red outline + dimmed page) with a step card, Back/Next/Skip; "Skip Tutorial" ends everything. Progress persists in `spaceops.nux.v1`; a "Replay Tutorial" link on the Home screen resets it.

## v15.2.1 — 2026-07-22

### Data-loss bug fixes (cloud round-trip)
- **Renaming/removing a model in the master XLSX no longer permanently deletes it from saved teams.** Previously, when a team loaded from the cloud, any model whose name wasn't in the current game data was silently skipped — and since v15.0.26 auto-publishes every load, the team was then republished *without* that model, making the loss permanent. Unknown models are now carried through the cloud round-trip verbatim (`convertFbTeam` → `unknownModels` → `convertTeamToFb`) instead of dropped, so the data survives. Team View shows a note listing any unavailable models. Added a `RETIRED_MODEL_ALIASES` table so deliberate renames can be mapped old→new; anything not aliased is still preserved rather than lost, and models self-heal if their name returns to the data.
- **The same protection now covers the local paths too.** The localStorage restore on page load (and Load Team) used to *drop* assets whose model no longer resolved — which republished the pruned team and defeated the cloud-side fix for anyone who simply had the team open. `reconcileTeamAssets` now moves unresolvable assets into `unknownModels` (preserving loadout + custom name), applies the alias table to local assets, and re-adopts previously-unknown models whose names resolve again.
- **Renamed/removed weapons and equipment are preserved too.** Item names that don't resolve against current game data (or don't fit after a slot-capacity reduction) are carried per-asset (`unknownItems`) and written back to their original array on save, instead of silently vanishing — the same failure shape as the v15.0.28 Dual Wield loss. New `RETIRED_ITEM_ALIASES` table for deliberate item renames. Team View lists preserved-but-unavailable items.
- **Deleting a team while offline now sticks.** Previously the local copy was removed but the cloud tombstone write failed silently, so the cloud copy survived, reappeared on the next refetch, and other devices never purged it. Offline deletes are now queued locally (`spaceops.pendingTombs.v1`) and flushed on the next `online` event (and on login) — the tombstone is re-written with the *original* deletion timestamp so a team edited elsewhere after the delete still wins. Same offline-retry shape the save backfill already uses. The queue freezes the storage URLs at delete time (so a later account switch can't misroute the flush to the wrong path), queued-but-unflushed deletes are hidden from every cloud team fetch (no resurrection window mid-flush), and the flush completes before the backfill runs on login/reconnect.
- No data-model or API changes; the legacy tracker and pre-v15.2 devices are unaffected.

## v15.2.0 — 2026-07-08

### Teams re-keyed to account storage (Phase 2 of the accounts plan)
- **Canonical team storage moves to `/teams/<account-id>`** (tombstones to `/deletedTeams/<account-id>`) — a stable key the upcoming security rules can enforce owner-only writes against, and the prerequisite for username renames/personas later.
- **Automatic one-time migration** per account on login: if account storage is empty and the legacy `/players/<username>/teams` path has teams, teams AND tombstones are copied across (idempotent; a populated account store is never overwritten). The backfill awaits migration so it can't race it.
- **Legacy mirror**: every save/delete/tombstone by a signed-in account is mirrored to the old name-keyed path, so the legacy tracker's sessions (which read teams by player name) keep working unchanged, as do pre-v15.2 devices until they update.
- **Legacy typed-name sessions** (pre-v15.1 logins with no account) continue reading/writing only the old paths — no migration is triggered without an account login.
- Verified: Playtest3 migration (5 teams, legacy left intact), dual-location writes, delete + tombstones in both locations, re-login idempotency, legacy-session compatibility (Playtest4 by name, old path, no migration), zero console errors.

## v15.1.0 — 2026-07-08

### Real accounts: email/password login via Firebase Authentication
The type-any-name login is replaced with proper accounts (REST, no SDK — same style as the DB bridge). Passwords are handled entirely by Firebase Auth (scrypt-hashed by Google; never stored in our database or localStorage).

- **Log In** — with **username or email** + password. Usernames are unique case-insensitively; a `/usernames/<name>` registry maps each to its account so username login can resolve the email Firebase authenticates with.
- **Create Account** — username + email + password + optional news/updates **consent checkbox** (stored as `promoConsent` on the `/users/<uid>` profile). Validates username format/uniqueness/reserved names, email shape, password length (6+). A failed signup rolls back its half-created auth account so retries don't hit EMAIL_EXISTS.
- **Email verification** — confirmation link sent at signup; a "Confirm Your Email" screen gates login until verified, with a **Resend email** link (Firebase rate-limits rapid resends with a friendly message). Note: the default `@space-ops-3030.firebaseapp.com` sender lands in Gmail spam — custom-domain sender is planned.
- **Forgot Password** — accepts username or email, sends Firebase's reset link, "Check Your Email" confirmation.
- **Per-account admin flags** — accounts listed in `/admins/<uid>` get the admin tools with their own login (no shared password). Includes a catch-up check that upgrades an already-signed-in session. The legacy `admin` + shared password fallback remains until the security-rules phase retires it.
- **Sessions** — `spaceops.auth.v1` stores uid/username/email/refresh token (never the password); logout clears it along with the local team wipe. Account usernames can't be inline-renamed on Home (legacy typed-name sessions still can).
- **Infrastructure** (not in this repo): DB rules extended with `users`/`usernames`/`admins` nodes; admin accounts for Andy + Chris; shared Playtest1–4 accounts (pre-verified, no admin) that connect to their existing cloud teams by name.
- Verified end-to-end: signup validation guards, consent storage, verify gate + resend, full password-reset cycle, username/email login for all six accounts, admin recognition, playtest team loading, cross-account isolation, logout wipe, session persistence.

## v15.0.28 — 2026-07-08

### Fix: Dual Wield stripped when a team loads from the cloud
- `convertFbTeam` (cloud → local team conversion) deduped all item names — a guard against the legacy tracker storing grenades/cyberdecks in both `weapons[]` and `inventory[]`. That dedup also collapsed `['Damp Claws', 'Damp Claws']` to one, silently dropping the second weapon, its slot, and the Dual Wield buff — and the auto-save then published the mutilated copy back to the cloud.
- Latent for weeks: pre-v15.0.26 the conversion only ran on rare explicit cloud loads (local always won). Once the cloud became the source of truth, every team load went through it.
- Fix: duplicates are preserved **within** `weapons[]` (two identical weapons = Dual Wield, one slot each); `inventory[]` still dedups against everything (the legacy double-storage case the guard was for).
- Verified: planted cloud team with a 2× Damp Claws Husk → loads with both slots, Team View shows `x2` + Dual Wield trait + Attacks 2→3 in teal, and the auto-save round-trip leaves the cloud copy intact.

## v15.0.27 — 2026-07-08

### Load Team delete: confirmation popup + deletes that actually stick
- **Delete confirmation**: tapping Delete in the Load Team list now opens an in-app "Delete "<team>"? … can't be undone" box with Cancel / Delete Team. Built as an in-modal overlay (not the browser's native `confirm()`, which iOS DuckDuckGo silently suppresses — the reason delete buttons have looked dead before).
- **Row disappears immediately**: deleting now also updates the in-memory cloud list. Previously the row kept rendering from stale state until the next refetch, making the button look broken.
- **Tombstones — deletes propagate instead of resurrecting**: deleting a team writes `/players/<player>/deletedTeams/<id> = <timestamp>` before removing the team. Other devices compare the tombstone against their local copy's `savedAt`: tombstone newer → local copy purged (on load, tab refocus, and backfill); local copy edited *after* the delete → the edit wins, is re-pushed, and clears its tombstone. Without this, any device still holding a local copy would backfill the "deleted" team right back into the cloud.

## v15.0.26 — 2026-07-08

### Cloud is now the source of truth for teams
- **Every edit publishes.** The 500ms auto-save now writes to `/players/<player>/teams/<id>` as well as localStorage — no more "I edited on the PC but never hit Save Team, so the iPad never saw it". Save Team still works as an explicit save + confirmation toast.
- **Logout wipes local team data** (`spaceops.teams.v1`, `spaceops.current.v1`). The next account on the device starts clean and reads its teams from its own cloud path.
- **Backfill upsyncs offline edits**: a locally-newer copy (edited while offline) is pushed on login/reconnect, not just teams missing from the cloud entirely.
- Adopted cloud copies keep the cloud's timestamp locally and are not echoed back up, so two open devices don't ping-pong writes.

### Fix: teams leaking across accounts on shared devices
The local savedTeams list (`spaceops.teams.v1`) is device-wide, so any account signing in on a shared device saw — and worse, backfilled into their own cloud path — every team on the device.
- Teams now carry an **`owner`** field, stamped on create, save, cloud fetch, and load.
- The Load Team modal, the login/online **backfill**, and the Home "Load Team" button all filter to the signed-in player's teams. The backfill only pushes teams the current player owns.
- Migration: pre-v15.0.26 local teams (no owner) are claimed on login by the account whose cloud path already contains them; a foreign-owned open team is closed on account switch so auto-save can't re-stamp it.
- Note: cross-copies that already happened live in Firebase under the wrong account's path — delete those rows via Load Team → Delete while signed into that account.

### Fix: edits from another device never showed up (stale local shadowed cloud)
- Load Team dedup now keeps whichever copy is **newer** (local `savedAt` vs cloud `modified`) instead of always hiding the cloud entry behind the local one.
- The **currently-open team adopts a newer cloud copy** automatically (last write wins) when cloud teams refresh.
- Cloud teams **refetch on tab refocus** (`visibilitychange`) — an iPad returning from the home screen picks up PC edits without a manual reload.
- Loading a cloud team now strips its `fb-` id prefix, so auto-save updates the existing local row instead of creating a `fb-…` sibling duplicate; local deletes match by base id for the same reason.

## v15.0.25 — 2026-07-08

### Team View — gray card boxes + more breathing room
Per the owner's mock: each model in the Team View now sits in its own light gray rounded box so its stats/loadout read as one visual block.
- `.asset-card` gets `--panel-1` (#F2F2F2) background, 10px radius, 18/20px inner padding (was flat white, zero padding).
- Inner weapon boxes and equipment pills step down to `--panel-2` (#E5E5E5) inside the card so they still read against the gray.
- Grid gap 28px → 36px, and the grid top-aligns (`align-items:start`) so a short card hugs its content instead of stretching to its row's tallest card.
- Verified at desktop (3-col), iPad portrait 834px (2-col), and phone 375px (1-col) — no horizontal overflow at any width. Print/PDF styles unaffected (they already force white cards with borders).

## v15.0.24 — 2026-05-28

### Team rating cap lowered to 50
- The team-building budget cap is now **50 Rating** (was 60), applied in both the Builder summary and the Team View header (`{rating}/{cap} Rating`). Over-budget detection (`rating > cap`) follows the new cap.

## v15.0.23 — 2026-05-27

### Dual Wield x2 suffix matches the weapon name
- The `x2` suffix now matches the weapon name exactly — same font (Roboto), size (14px), weight (700), and color (`--text`), rendered lowercase — so "Vibro Blade x2" reads as one cohesive label (was a smaller, muted, `×2`).

## v15.0.22 — 2026-05-27

### Dual Wield — in-context buff presentation
Replaced the dark-gray badge (v15.0.21) with a presentation that mirrors how the rule reads, per the owner's mock:
- The dual-wielded weapon's name gets an `x2` suffix.
- **Dual Wield** is appended to the weapon's trait list (clickable → trait HoverBox).
- The weapon's **Attack stat is shown +1** (the Dual Wield modifier) when the base Attacks is numeric.
- New **`--teal` (#1499BE)** token colors **both** the Dual Wield trait and the buffed Attack value, signaling the auto-applied modifier to the player.
- Note: the +1-Attacks math is currently specific to Dual Wield (the only stat-modifying trait wired up). Other stat-modifying traits would each need their own rule.

## v15.0.21 — 2026-05-27

### Dual Wield badge (superseded by v15.0.22)
- Inline dark-gray "DUAL WIELD" pill next to the dual-wielded weapon's name. Replaced in v15.0.22 by the x2-suffix / appended-trait / buffed-stat presentation. Detection (`dualWieldedWeaponKeys`) returns the set of melee weapon names appearing 2+ times so only the relevant weapon is flagged — retained.

## v15.0.20 — 2026-05-27

### Every trait is hoverable
- The Team View Dual Wield badge opens the "Dual Wield" trait HoverBox (description pulled from `/gameData/traits`). Confirmed every trait surface is clickable for info: weapon trait lists, equipment trait lists, armory expansions, and recursive trait links inside an open HoverBox. `findTrait` normalizes parameterized names (`Ammo 1`, `AoE (x)`, `Transport (x)`) to their base trait.

## v15.0.19 — 2026-05-27

### Phone layout — fix right-side cutoff
- The desktop layout (summary `padding-left:320px`, fixed 600/290/605 columns, armory `padding-right:290px`, selected-row bleed margins) overflowed the right edge on phones. Added a `max-width:760px` layout: Home/Builder/Team View collapse to a single fluid column with even 18px gutters; builder columns stack vertically; Team View shows one card per row; selected-row / selected-pill bleed margins retuned to the gutter; long topbar breadcrumbs truncate. Verified zero horizontal overflow at 375px.

## v15.0.18 — 2026-05-27

### Reload banner on XLSX data update
- The "tap to reload" banner now also appears when an admin pushes new game data (`/gameData/lastUpdated` changes), with message "Game data was updated — tap to reload". Code-version updates still show "A new version is available". The in-place silent data refresh still runs; the banner offers a clean full reload so loaded teams re-hydrate against fresh gameData. Code prompts take priority over data prompts.

## v15.0.17 — 2026-05-27

### iPad Team View grid
- Team View shows **2 cards per row in portrait, 3 per row in landscape** on iPads (orientation media queries bounded to the 768–1366px range, covering the 12.9" Pro). Phones and desktops keep their existing layouts.

## v15.0.16 — 2026-05-27

### Dual Wield buff in Team View (initial)
- Ported the legacy tracker's dual-wield rule (two identical melee weapons → Dual Wield) into the React team-builder with a badge in Team View. (Presentation later revised in v15.0.20–.21.)

## v15.0.15 — 2026-05-27

### Custom asset names persist across devices
- Renaming an asset in Team View (`customName`) was dropped on the Firebase round-trip — `convertTeamToFb` didn't write it and `convertFbTeam` didn't read it. Now persisted on the FB model object (same `customName` field the legacy tracker uses) and restored on load. Teams saved before this revision need their names re-applied + re-saved once.

## v15.0.14 — 2026-05-27

### Auto-update banner (stale-cache self-heal)
- The app reads the `?v=` it was loaded with and periodically fetches `index.html` (cache:'no-store') to compare against the deployed version; on mismatch it shows a red "A new version is available — tap to reload" banner. Checks on mount, every 120s, and on tab refocus. Ends the "browser B is still running old cached code" class of bug — clients left open on an old build are told to reload as soon as a new one deploys.

## v15.0.13 — 2026-05-27

### XLSX upload key sanitizer
- A bad column header in the uploaded XLSX (an unnamed column SheetJS surfaces as `__EMPTY`, or a header containing `. # $ [ ] /`) used to fail the entire sheet upload with Firebase 400 "Invalid data; couldn't parse key". `mapXlsxRows` now strips Firebase-forbidden characters from generated keys and skips columns whose key would be empty (logging a `[xlsx] skipping column…` warning), so one bad header no longer kills the sheet.

## v15.0.12 — 2026-05-27

### Delete buttons work on iOS
- Replaced the native `confirm()` in Delete Team (silently suppressed by iOS DuckDuckGo, so the button looked dead) with an in-app armed two-tap: first tap → "Click again to confirm" (red), second tap within 3s deletes. Load Team's per-row Delete kept its one-tap behavior with a larger tap target.

## v15.0.11 — 2026-05-27

### Save semantics + Cloud label
- Firebase writes now happen **only on explicit Save Team** (plus login/online backfill). Auto-save still preserves the working copy in localStorage every 500ms but no longer touches Firebase. Offline saves queue and sync on the next `online` event.
- LoadModal's "Cloud" badge now reflects actual Firebase presence (a team built locally then saved up shows "Cloud", not just teams freshly loaded from FB). Removed the misleading "read-only" label; all teams have a Delete button.

## v15.0.10 — 2026-05-27

### Model-restricted gear
- Items whose name ends in `(ModelName)` (e.g. `Cyber-Bite (War-dog)`, `War-Harness (War-Dog)`) are exclusive to that model. A "specialized" model (one that has any restricted item) only sees its own restricted items in the armory, never the general pool — so War-Dog no longer sees general Operator gear. Weapon-attachment parentheticals like `(Pulse Carbine)` are unaffected.

## v15.0.9 — 2026-05-27

### Load Team sorted by latest
- The Load Team list is ordered by most-recently-modified (`savedAt`, falling back to `createdAt`), newest first, across local + cloud entries.

## v15.0.8 — 2026-05-27

### Deploy-recovery cache bump
- A no-op version bump to force a fresh GitHub Pages build after a transient Pages deploy outage (500s) left v15.0.5–.7 unpublished. No behavior change.

## v15.0.7 — 2026-05-27

### Safer backfill: push only local-only teams

The v15.0.6 backfill pushed every local team on login, which risked overwriting a newer Firebase version with a stale local snapshot (e.g. the device opened the page yesterday, saved a local copy, then the other device edited the same team today). Refined to **fetch the player's FB team list first, then push only the local teams whose IDs aren't already on Firebase**. Active edits continue to mirror via the auto-save mirror (which writes on every change with `modified = Date.now()`, so last-write-wins for ongoing collaboration). Backfill log now says `backfilled N/M local-only teams`. After a push, the in-memory `firebaseTeams` list refreshes so Load Team shows the new cloud entries without requiring a reload.

### Firebase team audit
- Confirmed: 22 players, 39 teams, 179 model-slots, no data corruption, every team has a faction.
- Note for the team: prior to v15.0.5 the team-builder never wrote to Firebase on save (the v15.0 React rewrite did not carry over the legacy tracker's FB-save). That's why no Maligeist/Kippin teams exist in Firebase yet — every existing player team is an Arc Rangers / Space-Wyrm save from the legacy tracker.

## v15.0.6 — 2026-05-27

### Login-time backfill — every team is always on Firebase

- When a player logs in (or sets their name), every team currently stored in localStorage is pushed up to `/players/<player>/teams/` so the cloud reflects every team the device has built. Idempotent (PUT semantics), so re-running on already-synced teams is a no-op. Best-effort with `[fb] backfilled N/M local teams` console log.
- Combined with the v15.0.5 auto-save mirror, this guarantees: any team that exists locally for a logged-in player is also on Firebase. No more "I saved on iPad and can't see it on laptop" — the team is in the cloud by the time the user finishes typing their name on the other device.

### TeamView clickability verified end-to-end
- Tested with a fully-loaded Ranger-Captain (4/4 equipment slots filled). Default-loadout items (Jetpack / Company Badge / Captain Stripes) open HoverBoxes with PASSIVE + TRAITS sections. Equipped slot items (Med Pack / Stim Shot / Boarding Shield / Blink Harness) expand inline with action description + traits. Both interaction modes render full content from the XLSX when the source row is filled in.

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

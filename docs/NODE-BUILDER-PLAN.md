# Space-Ops 3030 — Node-Based Visual Builder Plan

## Status: PHASES 1-5 COMPLETE — Core Builder Functional
**Last updated**: 2026-03-05
**Current step**: Firebase integration and export pipeline both working

---

## Vision

A **local HTML-based visual development environment** for Space-Ops 3030 that replaces the workflow of describing pages to Claude with a visual, interactive, node-graph-driven builder.

### How It Works
1. **Canvas View** — A pannable/zoomable canvas showing all pages/screens as movable nodes connected by UX flow arrows (mirrors the Figma UX flow graph)
2. **Node Edit Mode** — Click a node to expand it into a split-view: live preview on the left, code editor on the right
3. **Full Edit Control** — Edit HTML/CSS/JS directly in the code editor with live preview updates
4. **AI-Assisted** — Describe changes to Claude, which modifies the node's code
5. **Firebase Live Data** — The preview connects to the real Firebase database so you can test the actual UX flow
6. **Export** — When ready, compile all nodes back into a single HTML file and export to the git project

### What Each Node Represents
Each node = one **view/screen/modal** from the app. The node stores:
- The HTML fragment for that view
- The CSS scoped to that view
- The JS functions that power that view
- Metadata (name, type, connections to other nodes, canvas position)

---

## Architecture

### File Structure
```
space-ops-builder/
├── index.html              ← The builder tool (runs locally)
├── builder.css             ← Builder UI styles
├── builder.js              ← Canvas, nodes, drag, zoom/pan, connections
├── editor.js               ← Split-view code editor, live preview
├── compiler.js             ← Export: compile nodes → single HTML file
├── nodes/                  ← Individual node data files (JSON)
│   ├── landing-page.json
│   ├── app-interface.json
│   ├── join-tab.json
│   ├── sessions-tab.json
│   ├── game-tab.json
│   ├── tools-tab.json
│   ├── team-builder.json
│   ├── my-teams.json
│   ├── lore-tab.json
│   ├── quick-play-menu.json
│   ├── character-modal.json
│   ├── create-session-modal.json
│   ├── clone-session-modal.json
│   ├── transfer-modal.json
│   ├── status-effect-modal.json
│   ├── save-template-modal.json
│   ├── player-name-modal.json
│   ├── load-team-modal.json
│   ├── game-area.json
│   ├── campaign-section.json
│   ├── tutorial-overlay.json
│   ├── faction-selector.json
│   ├── team-building-interface.json
│   ├── quick-build-interface.json
│   └── quick-team-preview.json
├── mock-firebase.js        ← In-memory Firebase simulator for offline testing
├── shared-scripts.js       ← App JS extracted from v14.76 (5090 lines)
├── shared-styles.css       ← Full v14.76 CSS (1872 lines) for preview styling
├── shared-scripts-raw.js   ← Raw extraction (intermediate, used by create-shared-scripts.sh)
├── create-shared-scripts.sh← Script to regenerate shared-scripts.js from raw
├── shared/
│   ├── global-styles.css   ← Shared CSS (design tokens, resets)
│   ├── global-scripts.js   ← Shared JS (Firebase, utilities, game data)
│   └── firebase-config.js  ← Firebase configuration
└── export/                 ← Output folder for compiled HTML
    └── space-ops-3030-v15.html
```

### Node Data Format (JSON)
```json
{
  "id": "landing-page",
  "name": "Landing Page",
  "type": "page",
  "position": { "x": 100, "y": 200 },
  "connections": [
    { "to": "join-tab", "label": "Join Session" },
    { "to": "team-builder", "label": "Build Team" }
  ],
  "html": "<div id='landingPage'>...</div>",
  "css": ".landing-page { ... }",
  "js": "function selectMode(mode) { ... }",
  "metadata": {
    "description": "Entry point with logo and main menu",
    "lastEdited": "2026-03-05T10:00:00Z"
  }
}
```

### Node Types
| Type | Color | Examples |
|------|-------|---------|
| `page` | Gold (#db8f00) | Landing Page, Team Builder, My Teams, Lore |
| `tab` | Blue (#4488ff) | Join/Create, Sessions, Game, Tools |
| `modal` | Purple (#9944ff) | Character Modal, Create Session, Transfer |
| `panel` | Green (#4CAF50) | Game Area, Campaign Section, Tutorial |
| `subview` | Teal (#00bcd4) | Faction Selector, Team Building Interface |

---

## Complete Node Map (25 nodes)

### Pages (5)
| # | Node ID | Name | Connects To |
|---|---------|------|-------------|
| 1 | `landing-page` | Landing Page | join-tab, team-builder, lore-tab, quick-play-menu |
| 2 | `team-builder` | Team Builder | faction-selector, my-teams, landing-page |
| 3 | `my-teams` | My Teams | team-builder, landing-page |
| 4 | `lore-tab` | Lore | landing-page |
| 5 | `quick-play-menu` | Quick Play Menu | game-area, landing-page |

### Tabs (4)
| # | Node ID | Name | Connects To |
|---|---------|------|-------------|
| 6 | `join-tab` | Join / Create | game-tab, create-session-modal, landing-page |
| 7 | `sessions-tab` | Sessions List | game-tab, clone-session-modal |
| 8 | `game-tab` | Game | game-area, tools-tab, join-tab |
| 9 | `tools-tab` | Tools (Timer/Dice/Initiative) | game-tab |

### Modals (8)
| # | Node ID | Name | Connects To |
|---|---------|------|-------------|
| 10 | `create-session-modal` | Create Session | game-tab |
| 11 | `clone-session-modal` | Clone Session | sessions-tab |
| 12 | `character-modal` | Add/Edit Character | game-area |
| 13 | `transfer-modal` | Transfer Item | game-area |
| 14 | `status-effect-modal` | Add Status Effect | game-area |
| 15 | `save-template-modal` | Save Template | game-area |
| 16 | `player-name-modal` | Player Name Entry | landing-page |
| 17 | `load-team-modal` | Load Saved Team | game-area |

### Panels (3)
| # | Node ID | Name | Connects To |
|---|---------|------|-------------|
| 18 | `game-area` | Game Area (Teams/Characters) | character-modal, transfer-modal, status-effect-modal |
| 19 | `campaign-section` | Campaign Info | game-tab |
| 20 | `tutorial-overlay` | Tutorial System | landing-page |

### Sub-views (5)
| # | Node ID | Name | Connects To |
|---|---------|------|-------------|
| 21 | `faction-selector` | Faction Selector | team-building-interface, faction-lore |
| 22 | `faction-lore` | Faction Lore Detail | team-building-interface |
| 23 | `team-building-interface` | Team Building Interface | my-teams, quick-play-menu |
| 24 | `quick-build-interface` | Quick Build | quick-team-preview |
| 25 | `quick-team-preview` | Quick Team Preview | game-area |

---

## Firebase Configuration (for live preview)
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyAtbd-U5_-sIoPPX8iViFmi6_-DgVD16vk",
    authDomain: "space-ops-3030.firebaseapp.com",
    databaseURL: "https://space-ops-3030-default-rtdb.firebaseio.com",
    projectId: "space-ops-3030",
    storageBucket: "space-ops-3030.firebasestorage.app",
    messagingSenderId: "905112015290",
    appId: "1:905112015290:web:0d19ac4cac33de480f4d83"
};
```

---

## Implementation Phases

### Phase 1: Canvas Foundation — COMPLETE
- [x] Map all pages/screens/sections from HTML
- [x] Design architecture and node data format
- [x] Build the canvas (HTML/CSS/JS)
  - [x] Pannable, zoomable canvas with grid background
  - [x] Render all 25 nodes at initial positions
  - [x] Drag nodes to reposition (snap to 10px grid)
  - [x] Draw bezier connection lines between nodes with arrowheads
  - [x] Node type color coding (gold/blue/purple/green/teal)
  - [x] Mini-map toggle
  - [x] Auto-layout reset button
  - [x] Legend bar
- [x] Save/load node positions + code to localStorage

### Phase 2: Split-View Editor — COMPLETE
- [x] Click node → expand into split view
- [x] Left panel: live preview (iframe with srcdoc)
- [x] Right panel: code editor (HTML/CSS/JS tabs)
- [x] Live reload on Apply
- [x] Resizable split handle (drag to resize panels)
- [x] AI description input panel ("Send to Claude")
- [x] Back to Canvas navigation
- [ ] Syntax highlighting (CodeMirror or Monaco) — future enhancement

### Phase 3: Node Decomposition — COMPLETE
- [x] Extracted all 25 HTML fragments from v14.76
- [x] Landing Page: full HTML/CSS/JS with real logo and buttons
- [x] All 4 tabs: Join/Create, Sessions, Game, Tools (timer, dice, initiative)
- [x] All 8 modals: Character Editor, Create Session, Clone, Transfer, Status Effect, Save Template, Player Name, Load Team
- [x] All 3 panels: Game Area, Campaign Section, Tutorial Overlay
- [x] All 5 subviews: Faction Selector, Faction Lore, Team Building Interface, Quick Build, Quick Team Preview
- [x] Shared CSS applied to all nodes (buttons, forms, layout classes)
- [x] Quick Play Menu with starter squad cards

### Phase 4: Firebase Live Integration — COMPLETE
- [x] Firebase toggle button in top bar — 3-mode cycle: OFF (red) → MOCK (orange) → LIVE (green)
- [x] Preview iframe loads Firebase SDK when LIVE enabled
- [x] Color-coded badge in preview: orange "MOCK DATA" or green "LIVE"
- [x] Real Firebase config injected in LIVE mode (space-ops-3030 project)
- [x] **Mock Firebase mode** — `mock-firebase.js` replaces real Firebase for offline testing
  - In-memory data store with 3 test sessions, 2 players, 5 characters, combat logs, initiative, templates
  - Full API: ref(), set(), update(), remove(), once(), on(), off(), push(), child()
  - MockSnapshot: val(), exists(), forEach(), child(), numChildren()
  - Listener registry with auto-notification on data changes
- [x] **Shared app scripts** — `shared-scripts.js` extracted from v14.76 (5090 lines)
  - All app functions (joinSession, loadAllSessions, switchTab, etc.) available in previews
  - Null-guarded top-level event listeners for partial node previews
  - Works with both mock and live Firebase
- [x] Sessions List node loads and displays mock sessions with Join/Clone/Delete buttons
- [ ] Handle cross-node navigation in preview mode (future)

### Phase 5: Export Pipeline — COMPLETE
- [x] Compile all node localStorage data → single HTML file
- [x] Assemble HTML in correct DOM order (landing → appInterface → tabs → game area → standalone → modals)
- [x] Deduplicate CSS across nodes
- [x] Concatenate JS from all nodes
- [x] Include Firebase SDK, jsPDF, tab system
- [x] Download as `space-ops-3030-v15-export.html`
- [x] Also cached in localStorage for reference
- [x] Verified: 26KB, 446 lines, all sections present

### Phase 6: Polish
- [ ] Claude AI description input per node (wire up "Send to Claude")
- [ ] Undo/redo for edits
- [ ] Search across all nodes
- [ ] Syntax highlighting (Monaco editor integration)
- [ ] Node grouping/folders
- [ ] Version history per node

---

## Decision Log

| # | Date | Decision | Rationale |
|---|------|----------|-----------|
| 1 | 2026-03-05 | Hybrid visual builder: node canvas + split-view editor | Combines the flow visualization from Figma with direct code editing power |
| 2 | 2026-03-05 | JSON-per-node storage format | Each view is independently editable and version-controllable |
| 3 | 2026-03-05 | Multi-file architecture (not single HTML) | Builder tool itself benefits from clean separation; the OUTPUT is single-file HTML |
| 4 | 2026-03-05 | 25 nodes identified from v14.76 analysis | Complete coverage of all views, modals, tabs, panels, and subviews |
| 5 | 2026-03-05 | Mock Firebase for offline testing instead of real Firebase | Avoids needing Firebase auth, allows testing with controlled data, works fully offline |
| 6 | 2026-03-05 | Extract full app JS into shared-scripts.js (not just key functions) | All 5090 lines needed for complete interactivity; partial extraction would miss dependencies |
| 7 | 2026-03-05 | 3-state Firebase toggle (OFF/MOCK/LIVE) | Gives user explicit control over data source; MOCK for development, LIVE for final testing |
| 8 | 2026-03-05 | DOMContentLoaded for auto-join instead of setTimeout | Scripts in `<head>` need DOM-ready event since body elements don't exist at parse time |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-05 | Created initial plan, mapped all 25 views from v14.76, designed architecture |
| 2026-03-05 | Built canvas: pannable/zoomable with 25 draggable nodes, bezier connections, legend, minimap |
| 2026-03-05 | Built split-view editor: live preview + code editor with HTML/CSS/JS tabs + AI input |
| 2026-03-05 | Populated all 25 nodes with real HTML content extracted from v14.76 |
| 2026-03-05 | Applied shared CSS to all nodes (buttons, forms, layout, timers, dice, etc.) |
| 2026-03-05 | Builder running locally at `space-ops-builder/index.html` via http-server |
| 2026-03-05 | Added Firebase toggle (ON/OFF) — injects Firebase SDK into preview iframes |
| 2026-03-05 | Built export pipeline — compiles all 25 nodes into single HTML (26KB, 446 lines) |
| 2026-03-05 | Export includes: Firebase SDK, jsPDF, tab system, all views in correct DOM order |
| 2026-03-05 | Fixed SVG connection lines not rendering (explicit width/height/viewBox, z-index 5) |
| 2026-03-05 | Redesigned node layout: hierarchical top-down with 7 rows, clear branch separation (session left, quick-play center, team-builder right) |
| 2026-03-05 | Connection line styling: forward connections solid bright, back-connections dashed/faint — eliminates visual clutter from go-back links |
| 2026-03-05 | Connection anchors changed to bottom→top (not right→left) for top-down flow; back-connections exit top, enter bottom |
| 2026-03-05 | Eliminated duplicate loop connections: back-connections suppressed when forward connection already exists for the same node pair |
| 2026-03-05 | Fixed node overlap: spread out Row 4 (clone/tools/game/campaign) and Row 6 (5 modals) with proper gaps |
| 2026-03-05 | Removed lore nodes: `lore-tab` and `faction-lore` removed per instruction — now 23 nodes total |
| 2026-03-05 | Created `default-content.js` — extracted HTML content from v14.76 so nodes persist even when localStorage is cleared |
| 2026-03-05 | Added `extract-content.js` script to regenerate default content from HTML source |
| 2026-03-05 | Added `resetPositionsOnly()` function — resets layout without wiping node content |
| 2026-03-05 | Added `shared-styles.css` — full v14.76 CSS (1872 lines) loaded in preview iframes for proper styling |
| 2026-03-05 | Added viewport meta tag + responsive overrides (img max-width, overflow-x hidden) for mobile-like preview scaling |
| 2026-03-05 | Added `<base>` tag in preview srcdoc so relative URLs resolve correctly |
| 2026-03-05 | Override `display:none` on .tab-content, .modal, #gameArea etc so all nodes render visible in preview |
| 2026-03-05 | Created `mock-firebase.js` — in-memory Firebase Realtime Database simulator with test data (3 sessions, 2 players, 5 characters with stats/weapons/consumables, combat logs, initiative, templates) |
| 2026-03-05 | Firebase toggle upgraded from 2-state (OFF/ON) to 3-state cycle: OFF (red) → MOCK (orange) → LIVE (green) |
| 2026-03-05 | Created `shared-scripts.js` — extracted full app JS from v14.76 (5090 lines) for preview interactivity |
| 2026-03-05 | Fixed temporal dead zone: `gameDataHardcoded` declaration moved before first use |
| 2026-03-05 | Null-guarded `characterForm.addEventListener` to prevent crash in partial node previews |
| 2026-03-05 | Wrapped `window.addEventListener('load', ...)` initialization in try-catch for robustness |
| 2026-03-05 | Verified: Sessions List renders mock session data with Join/Clone/Delete buttons |
| 2026-03-05 | Verified: All nodes render correctly in MOCK mode — Landing Page, Join/Create, Game Area, Tools, Character Editor |
| 2026-03-05 | Fixed weapon field mapping: mock data `range`→`type`, `skill`→`power` to match render function expectations |
| 2026-03-05 | Fixed special actions: added `uses`/`maxUses` fields to all mock specialActions (was showing undefined/undefined) |
| 2026-03-05 | Fixed inventory: changed from comma-separated string to array of strings for proper `inventory[0]`/`inventory[1]` access |
| 2026-03-05 | Fixed auto-join: changed `setTimeout(200ms)` to `DOMContentLoaded` listener — scripts load in `<head>` before body exists |
| 2026-03-05 | Verified: Character cards render fully — weapons (Ranged/Melee | A P D), special actions (uses), inventory, status effects, notes |

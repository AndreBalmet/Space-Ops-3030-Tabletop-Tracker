# Space-Ops 3030 Tracker — Claude Project Context

## Project Overview
Space-Ops 3030 is a single-file HTML tabletop gaming tracker (~8,000+ lines) for managing teams, characters, combat sessions, and game data for a sci-fi tabletop game. The latest stable version is **v14.77**.

### Active Version Location
`/Users/andrebalmet/Documents/Triggertype/Space Ops/Tracker/index.html`
*(This is the root file served by GitHub Pages. Always edit this file for commits/pushes.)*

### Development Workflow
- **Always test locally first** at `http://localhost:8091/index.html` before pushing to main
- Start local server: `python3 -m http.server 8091` from project root
- GitHub Pages URL: `https://andrebalmet.github.io/Space-Ops-3030-Tabletop-Tracker/`
- 84+ git commits, 100+ total versions (many pre-date git repo)

### Document Maintenance Rules
When pushing changes to main, **always update these files**:
1. **CHANGELOG.md** — Add entries for all bug fixes, features, and changes under a new version heading (newest on top). Include the date.
2. **CLAUDE.md** — Update the version number, any architecture changes, known issues, and feature descriptions that changed.
3. **README.md** — If new user-facing features were added, update the feature list so it reflects the current state of the tool.

These three files must stay in sync with what's actually in `index.html`.

### Tech Stack
- Single HTML file (no framework) — all CSS, JS, and HTML inline
- Firebase Realtime Database for cloud persistence
- Google Sheets CSV integration for game data
- XLSX import for all game data (models, weapons, equipment, factions, effects, etc.)
- jsPDF for PDF export
- Pure vanilla JavaScript, CSS Grid/Flexbox

---

## Figma MCP Integration (TalkToFigma)

### What It Is
A bidirectional connection between Claude Code and Figma Desktop, allowing Claude to CREATE and MODIFY Figma designs programmatically. Used to recreate the Space-Ops 3030 HTML UI as editable Figma components.

### Architecture
```
Claude Code → TalkToFigma MCP (stdio) → WebSocket (:3055) → Figma Plugin → Figma Canvas
```

### Connection Setup (every session)
1. **Start WebSocket server** (if not already running):
   ```bash
   export PATH="$HOME/.bun/bin:$PATH"
   cd ~/Documents/cursor-talk-to-figma-mcp
   bun socket
   ```
   Leave running in background. Verify: `lsof -i :3055`

2. **Figma plugin must be open** in Figma Desktop:
   - Plugins → "Talk To Figma MCP Plugin" → Run
   - Note the **channel name** displayed (e.g., `4q7ug8y6`)

3. **Connect via MCP**: Use `join_channel` tool with the channel name from the plugin

### MCP Server Config (already configured in user settings)
```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bunx",
      "args": ["cursor-talk-to-figma-mcp@latest"]
    }
  }
}
```

### Available TalkToFigma Tools
- **Create**: `create_frame`, `create_rectangle`, `create_text`
- **Style**: `set_fill_color`, `set_stroke_color`, `set_corner_radius`
- **Layout**: `set_layout_mode`, `set_padding`, `set_item_spacing`, `set_axis_align`, `set_layout_sizing`
- **Modify**: `move_node`, `resize_node`, `clone_node`, `delete_node`
- **Text**: `set_text_content`, `set_multiple_text_contents`, `scan_text_nodes`
- **Components**: `create_component_instance`, `set_instance_overrides`
- **Read**: `get_document_info`, `get_selection`, `read_my_design`
- **Export**: `export_node_as_image`
- **Annotations**: `set_annotation`, `set_multiple_annotations`
- **Prototyping**: `create_connections`

### Also Available: Official Figma MCP (read-only)
Separate from TalkToFigma. Tools: `get_design_context`, `get_screenshot`, `get_metadata`, `get_variable_defs`, `get_code_connect_map`, `add_code_connect_map`, `create_design_system_rules`

---

## Design System — Space-Ops 3030

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| Primary Gold | `#db8f00` | Borders, accents, interactive highlights |
| Dark Green | `#9CAF88` | Secondary accent, healing, success |
| BG Black | `#000000` | Main background |
| BG Dark 1 | `#0a0a0a` | Card backgrounds |
| BG Dark 2 | `#1a1a1a` | Section backgrounds |
| BG Dark 3 | `#2a2a2a` | Elevated surfaces |
| Text White | `#ffffff` | Primary text |
| Danger Red | `#ff4444` | Damage, errors, destructive |
| Warning Orange | `#FFA500` | Warnings |
| Connected Green | `#4CAF50` | Online/connected status |
| Gold Bright | `#FFD700` | Faction highlights |

### Faction Colors
| Faction | Primary | Accent |
|---------|---------|--------|
| Arc Rangers | `#db8f00` | `#9CAF88` |
| Space-Wyrm | `#FFD700` | `#8B0000` |
| Kippin | `#10B981` | `#374151` |

### Typography
- **Font**: `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`
- **Headings**: 24px bold / 20px bold
- **Body**: 14px
- **Labels/Buttons**: 13px bold, uppercase, letter-spacing: 1px
- **Small text**: 11-12px
- **Monospace** (timer): `'Courier New'`

### Spacing
- Standard increments: 5px, 10px, 15px, 20px
- Button padding: 8px 15px (standard), 5px 10px (compact)
- Card padding: 15px
- Section gap: 15px
- Border radius: 4px (inputs), 8px (cards), 12px (modals)

### Key UI Components to Recreate
1. **Landing Page** — Logo, menu grid (6 buttons), player name input
2. **Tab Navigation** — Join/Create, Sessions, Game, Tools tabs
3. **Character/Model Cards** — Portrait, name, faction badge, stat grid (Speed/Shoot/Fight/Defense/Grit/Health), health bar, equipment slots, status effect pills, action buttons (team-only gated)
4. **Session Cards** — Title, campaign, player count, status badge
5. **Combat Tracker** — Initiative list, turn indicator, timer
6. **Dice Roller** — D4/D6/D8/D12/D20 buttons, result display
7. **Modals** — Character creation form, session creation, confirmation dialogs
8. **Buttons** — Primary (gold), Secondary (gray), Success (green), Danger (red), Warning (orange), Info (blue)
9. **Form Inputs** — Text, number, color picker, URL, select dropdowns
10. **Stat Grid** — 5-6 column equal-width grid for character stats (6 for models with Firewall)
11. **Status Effect Pills** — Effect tags with name, duration, description tooltip, auto-expire on turn advance
12. **Status Effect Dropdown** — "Add Effect..." dropdown on model cards (Overwatch, Suppressed, Stunned, etc.)
13. **Tutorial Overlay** — Spotlight with arrow pointer

### Layout Patterns
- **Grid**: `repeat(auto-fill, minmax(350px, 1fr))` for card layouts
- **Flexbox**: Headers, button rows, form layouts
- **Responsive**: Collapses at 768px breakpoint

---

## Workflow Goals
The highest-level goal is:
1. **HTML → Figma**: Recreate all UI components from the HTML app as editable Figma components
2. **Edit in Figma**: Hand-edit designs as needed
3. **Figma → HTML**: Export/read Figma designs and update the HTML app

This creates a design-to-code round-trip pipeline.

---

## Key Architecture Decisions

### Terminology
- Model/gear costs are called **"Rating"** (not "points" or "pts") everywhere in UI
- Weapon stats use full words: **Attack, Power, Damage** (not A/D/P)

### Data Pipeline
- ALL game data is driven from XLSX uploads (models, weapons, equipment, factions, effects, special actions, starter squads)
- `gameData.{sheetName}` arrays are populated from XLSX sheet names
- Adding an **EFFECTS** sheet (columns: Name, Duration, Description) populates the status effects dropdown
- Hardcoded fallbacks exist only as safety nets when XLSX data isn't loaded yet

### Team Builder → Session Flow
- Teams are built and edited in the **Team Builder**
- Teams are **instanced** when joining sessions (deep-copied)
- Edits in-session do NOT write back to saved teams
- On load, saved teams are **hydrated** from current gameData (refreshes all weapon/equipment/model data to latest XLSX values)

### Ownership Model
- Only team members can modify their own team's models (health, turns, status effects)
- Backend checks enforce ownership via `team.members` array
- Host retains admin-level access

### Vehicle/Pilot Pairing
- Adding a vehicle (e.g. Mono Tank) auto-adds a Pilot from the same faction
- Removing a vehicle auto-removes its paired Pilot

### Live Sync
- Firebase Realtime Database with `visibilitychange` and `online` event listeners
- `database.goOnline()` called when iPad/mobile tabs return from background
- Forces data refresh to keep health/status synced across devices

---

## File Locations
| Item | Path |
|------|------|
| Project root | `/Users/andrebalmet/Documents/Triggertype/Space Ops/Tracker/` |
| Latest HTML | `./index.html` (root — served by GitHub Pages) |
| TalkToFigma repo | `~/Documents/cursor-talk-to-figma-mcp/` |
| Figma docs | `./figma-integration/` |
| Logo (local) | `./Logo_Wide_wht_c6376661-fc72-45af-ae4c-9b56e7802930.png` |
| CSV data files | `./space-ops-3030-v14.76/FACTIONS.csv`, `MODELS.csv`, `WEAPONS.csv`, `SPECIAL_ACTIONS.csv`, `STARTER_SQUADS.csv` |

---

## Known Issues / In Progress

### Rating Calculation Bug (stale saved teams)
- **Status**: Investigating — debug logging added
- **Symptom**: Old saved teams show incorrect "+X from upgrades" values (e.g. +5 when only +1 equipment is equipped)
- **Root cause**: Saved team data in Firebase retains old weapon/equipment `.points` values from before XLSX updates. Hydration attempts to refresh from current gameData via `_findBaseModel()` and `_getLiveItemPts()`, but if the model name stored in Firebase doesn't exactly match current gameData names, lookup falls back to stale saved values.
- **Fix approach**: `_hydrateTeamFromGameData()` runs on every team load with fuzzy name matching. `model.basePoints` stored separately from calculated total. Still need console logs from a live reproduction to confirm the lookup is matching correctly.
- **Users should NOT need to delete and recreate old teams** — the hydration system should handle this automatically once the matching is confirmed working.

---

## Save Button UX
- Save team stays on the team builder (no navigation to confirmation screen)
- Button flashes green with "Saved!" text for 1.5s, then reverts to gold "Save Team"
- `editingTeamId` preserved so subsequent saves update the same team

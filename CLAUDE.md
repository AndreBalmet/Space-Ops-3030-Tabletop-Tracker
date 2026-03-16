# Space-Ops 3030 Tracker — Claude Project Context

## Project Overview
Space-Ops 3030 is a single-file HTML tabletop gaming tracker (~7,500 lines) for managing teams, characters, combat sessions, and game data for a sci-fi tabletop game. The latest stable version is **v14.76**.

### Active Version Location
`/Users/andrebalmet/Documents/SpaceOps_3030 Tracker/index.html`
*(This is the root file served by GitHub Pages. Always edit this file for commits/pushes.)*

### Tech Stack
- Single HTML file (no framework) — all CSS, JS, and HTML inline
- Firebase Realtime Database for cloud persistence
- Google Sheets CSV integration for game data
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
3. **Character/Model Cards** — Portrait, name, faction badge, stat grid (Speed/Shoot/Fight/Nerve/Health), health bar, equipment slots, action buttons
4. **Session Cards** — Title, campaign, player count, status badge
5. **Combat Tracker** — Initiative list, turn indicator, timer
6. **Dice Roller** — D4/D6/D8/D12/D20 buttons, result display
7. **Modals** — Character creation form, session creation, confirmation dialogs
8. **Buttons** — Primary (gold), Secondary (gray), Success (green), Danger (red), Warning (orange), Info (blue)
9. **Form Inputs** — Text, number, color picker, URL, select dropdowns
10. **Stat Grid** — 5-column equal-width grid for character stats
11. **Status Badges** — Effect indicators with duration
12. **Tutorial Overlay** — Spotlight with arrow pointer

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

## File Locations
| Item | Path |
|------|------|
| Project root | `/Users/andrebalmet/Documents/SpaceOps_3030 Tracker/` |
| Latest HTML | `./index.html` (root — served by GitHub Pages) |
| TalkToFigma repo | `~/Documents/cursor-talk-to-figma-mcp/` |
| Figma docs | `./figma-integration/` |
| Logo (local) | `./Logo_Wide_wht_c6376661-fc72-45af-ae4c-9b56e7802930.png` |
| CSV data files | `./space-ops-3030-v14.76/FACTIONS.csv`, `MODELS.csv`, `WEAPONS.csv`, `SPECIAL_ACTIONS.csv`, `STARTER_SQUADS.csv` |

# TalkToFigma MCP — Setup & Usage Guide

## Quick Start (Every Session)

### Step 1: Start the WebSocket Server
Open a terminal and run:
```bash
export PATH="$HOME/.bun/bin:$PATH"
cd ~/Documents/cursor-talk-to-figma-mcp
bun socket
```
You should see: `WebSocket server running on port 3055`
**Leave this terminal open.** The server must stay running.

### Step 2: Open the Figma Plugin
1. Open **Figma Desktop** (not browser)
2. Open your Space-Ops 3030 Figma file
3. Go to **Plugins → Talk To Figma MCP Plugin → Run**
4. The plugin will auto-connect and show a **channel name** (e.g., `4q7ug8y6`)

### Step 3: Connect to Figma
Use `join_channel` with the channel name from the plugin.

### Step 4: Start Working
Create or modify designs in Figma using MCP tools!

---

## Troubleshooting

### WebSocket server won't start (port in use)
```bash
# Check what's using port 3055
lsof -i :3055

# Kill the existing process
kill $(lsof -t -i :3055)

# Restart
cd ~/Documents/cursor-talk-to-figma-mcp && bun socket
```

### Figma plugin can't connect
- Make sure WebSocket server is running FIRST
- Check the port in the plugin matches `3055`
- Make sure you're using Figma Desktop, not browser

### MCP tools not available
- Restart your session (MCP tools load at startup)
- Verify config: `mcp list` should show `TalkToFigma`

### Connection drops mid-session
- The Figma plugin panel must stay open (don't close it)
- If it disconnects, re-run the plugin in Figma and rejoin the channel

---

## What Was Installed

| Component | Location | Purpose |
|-----------|----------|---------|
| Bun runtime | `~/.bun/bin/bun` | JavaScript runtime for the MCP server |
| TalkToFigma repo | `~/Documents/cursor-talk-to-figma-mcp/` | WebSocket server source code |
| Figma plugin | Installed via Figma Community | Runs inside Figma, bridges to WebSocket |

## Architecture Diagram
```
┌─────────────┐     stdio      ┌──────────────────┐
│ MCP Client   │◄──────────────►│ TalkToFigma MCP  │
│              │                │ Server (bunx)    │
└─────────────┘                └────────┬─────────┘
                                        │ WebSocket
                                        │ localhost:3055
                               ┌────────▼─────────┐
                               │  WebSocket Bridge │
                               │  (bun socket)     │
                               └────────┬─────────┘
                                        │ WebSocket
                                        │ channel: XXXX
                               ┌────────▼─────────┐
                               │ Figma Plugin      │
                               │ (Talk To Figma)   │
                               └────────┬─────────┘
                                        │ Plugin API
                               ┌────────▼─────────┐
                               │  Figma Canvas     │
                               │  (your designs)   │
                               └──────────────────┘
```

---

## Workflow: HTML → Figma → HTML

### Phase 1: HTML to Figma (initial recreation)
Read the HTML/CSS source → create matching Figma frames, components, and styles using TalkToFigma tools.

### Phase 2: Hand-edit in Figma
Edit designs directly in Figma — adjust layouts, colors, spacing, try new ideas.

### Phase 3: Figma to HTML (sync back)
Read Figma designs using the official Figma MCP (`get_design_context`, `get_screenshot`) → update the HTML/CSS to match.

### Phase 4: Ongoing iteration
Repeat as needed. The Figma file becomes the source of truth for design, the HTML file for functionality.

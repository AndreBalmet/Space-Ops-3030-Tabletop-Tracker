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

### Step 3: Start Claude Code
```bash
cd ~/Documents/SpaceOps_3030\ Tracker
claude
```
Claude will auto-load `CLAUDE.md` with full project context.

### Step 4: Connect Claude to Figma
Tell Claude: "Connect to Figma channel [your-channel-name]"
Claude will use `join_channel` to connect.

### Step 5: Start Working
Tell Claude what you want to create or modify in Figma!

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

### Claude doesn't have TalkToFigma tools
- Restart Claude Code session (the MCP tools load at startup)
- Verify config: `claude mcp list` should show `TalkToFigma`
- If missing, re-add: `claude mcp add TalkToFigma -s user -- bunx cursor-talk-to-figma-mcp@latest`

### Connection drops mid-session
- The Figma plugin panel must stay open (don't close it)
- If it disconnects, re-run the plugin in Figma and rejoin the channel

---

## What Was Installed

| Component | Location | Purpose |
|-----------|----------|---------|
| Bun runtime | `~/.bun/bin/bun` | JavaScript runtime for the MCP server |
| TalkToFigma repo | `~/Documents/cursor-talk-to-figma-mcp/` | WebSocket server source code |
| MCP config | `~/.claude.json` (user-level) | Tells Claude Code how to launch TalkToFigma |
| Figma plugin | Installed via Figma Community | Runs inside Figma, bridges to WebSocket |

## Architecture Diagram
```
┌─────────────┐     stdio      ┌──────────────────┐
│ Claude Code  │◄──────────────►│ TalkToFigma MCP  │
│ (this CLI)   │                │ Server (bunx)    │
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
Claude reads the HTML/CSS source → creates matching Figma frames, components, and styles using TalkToFigma tools.

### Phase 2: Hand-edit in Figma
You edit designs directly in Figma — adjust layouts, colors, spacing, try new ideas.

### Phase 3: Figma to HTML (sync back)
Claude reads Figma designs using the official Figma MCP (`get_design_context`, `get_screenshot`) → updates the HTML/CSS to match.

### Phase 4: Ongoing iteration
Repeat as needed. The Figma file becomes the source of truth for design, the HTML file for functionality.

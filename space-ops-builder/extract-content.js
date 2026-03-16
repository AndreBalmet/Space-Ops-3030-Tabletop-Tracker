#!/usr/bin/env node
/**
 * Extracts HTML sections from space-ops-3030-v14.76.html
 * and generates default-content.js for the node builder.
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'space-ops-3030-v14.76', 'space-ops-3030-v14.76.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const lines = html.split('\n');

// Extract lines between start and end (1-indexed, inclusive)
function extract(startLine, endLine) {
    return lines.slice(startLine - 1, endLine).join('\n').trim();
}

// Node sections mapped to line ranges in v14.76
const sections = {
    'landing-page':          { start: 1902, end: 1931 },
    'join-tab':              { start: 1993, end: 2003 },
    'sessions-tab':          { start: 2006, end: 2014 },
    'game-tab':              { start: 2026, end: 2051 },
    'tools-tab':             { start: 2054, end: 2100 },
    'game-area':             { start: 2103, end: 2138 },
    'transfer-modal':        { start: 2142, end: 2155 },
    'create-session-modal':  { start: 2158, end: 2178 },
    'clone-session-modal':   { start: 2181, end: 2198 },
    'status-effect-modal':   { start: 2201, end: 2221 },
    'save-template-modal':   { start: 2224, end: 2241 },
    'character-modal':       { start: 2244, end: 2361 },
    'player-name-modal':     { start: 2364, end: 2373 },
    'campaign-section':      { start: 1966, end: 1990 },
    'tutorial-overlay':      { start: 1886, end: 1898 },
    'team-builder':          { start: 7475, end: 7486 },
    'my-teams':              { start: 7489, end: 7508 },
    'load-team-modal':       { start: 7524, end: 7535 },
};

// Build content object
const content = {};
for (const [id, range] of Object.entries(sections)) {
    content[id] = extract(range.start, range.end);
}

// Nodes that don't have standalone HTML sections — provide placeholders
content['faction-selector'] = `<div style="padding: 20px;">
    <h2 style="color: #db8f00; text-align: center;">Choose Your Faction</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
        <div style="background: rgba(219,143,0,0.1); border: 2px solid #db8f00; border-radius: 10px; padding: 20px; text-align: center; cursor: pointer;">
            <h3 style="color: #db8f00;">Arc Rangers</h3>
            <p style="color: #aaa; font-size: 13px;">Elite tactical operators</p>
        </div>
        <div style="background: rgba(255,215,0,0.1); border: 2px solid #FFD700; border-radius: 10px; padding: 20px; text-align: center; cursor: pointer;">
            <h3 style="color: #FFD700;">Space-Wyrm</h3>
            <p style="color: #aaa; font-size: 13px;">Alien bio-organic warriors</p>
        </div>
        <div style="background: rgba(16,185,129,0.1); border: 2px solid #10B981; border-radius: 10px; padding: 20px; text-align: center; cursor: pointer;">
            <h3 style="color: #10B981;">Kippin</h3>
            <p style="color: #aaa; font-size: 13px;">Resourceful scavengers</p>
        </div>
    </div>
</div>`;

content['team-building-interface'] = `<div style="padding: 20px;">
    <h2 style="color: #db8f00; text-align: center;">Team Builder</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px;">
            <h3 style="color: #9CAF88;">Available Models</h3>
            <p style="color: #666; font-size: 13px;">Select faction first to see available models</p>
        </div>
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px;">
            <h3 style="color: #db8f00;">Current Roster</h3>
            <p style="color: #666; font-size: 13px;">0 / 150 pts</p>
        </div>
    </div>
</div>`;

content['quick-play-menu'] = `<div style="padding: 20px; text-align: center;">
    <h2 style="color: #db8f00;">Quick Play</h2>
    <p style="color: #aaa; margin-bottom: 20px;">Pick a starter squad and jump into a game!</p>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
        <div style="background: rgba(219,143,0,0.1); border: 1px solid #db8f00; border-radius: 10px; padding: 20px; cursor: pointer;">
            <h3 style="color: #db8f00;">Arc Rangers Starter</h3>
            <p style="color: #aaa; font-size: 13px;">150pts — balanced tactical squad</p>
            <button class="btn btn-primary" style="margin-top: 10px;">Play Now</button>
        </div>
        <div style="background: rgba(255,215,0,0.1); border: 1px solid #FFD700; border-radius: 10px; padding: 20px; cursor: pointer;">
            <h3 style="color: #FFD700;">Space-Wyrm Starter</h3>
            <p style="color: #aaa; font-size: 13px;">150pts — aggressive swarm squad</p>
            <button class="btn btn-primary" style="margin-top: 10px;">Play Now</button>
        </div>
    </div>
</div>`;

content['quick-build-interface'] = `<div style="padding: 20px; text-align: center;">
    <h2 style="color: #db8f00;">Quick Build</h2>
    <p style="color: #aaa; margin-bottom: 20px;">Auto-generate a 150pt team by faction</p>
    <div class="form-group" style="max-width: 300px; margin: 0 auto;">
        <label style="color: #9CAF88;">Select Faction:</label>
        <select style="width: 100%; padding: 10px; background: #2a2a2a; border: 1px solid #db8f00; color: white; border-radius: 5px;">
            <option>Arc Rangers</option>
            <option>Space-Wyrm</option>
            <option>Kippin</option>
        </select>
    </div>
    <button class="btn btn-primary" style="margin-top: 20px; padding: 12px 30px;">Generate Team</button>
</div>`;

content['quick-team-preview'] = `<div style="padding: 20px;">
    <h2 style="color: #db8f00; text-align: center;">Team Preview</h2>
    <p style="color: #aaa; text-align: center; margin-bottom: 20px;">Review your auto-generated team before playing</p>
    <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
        <p style="color: #666; text-align: center;">Team preview will appear here after generation</p>
    </div>
    <div style="text-align: center; display: flex; gap: 10px; justify-content: center;">
        <button class="btn btn-primary">Start Game</button>
        <button class="btn btn-warning">Re-generate</button>
        <button class="btn btn-secondary">Back</button>
    </div>
</div>`;

// Generate the JS file
let output = `// Auto-generated from space-ops-3030-v14.76.html\n`;
output += `// Run: node extract-content.js to regenerate\n`;
output += `const DEFAULT_CONTENT = {\n`;

for (const [id, html] of Object.entries(content)) {
    const escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    output += `    '${id}': \`${escaped}\`,\n\n`;
}

output += `};\n`;

const outPath = path.join(__dirname, 'default-content.js');
fs.writeFileSync(outPath, output, 'utf8');
console.log(`Written ${Object.keys(content).length} node contents to ${outPath}`);

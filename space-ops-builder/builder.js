/* ============================================
   Space-Ops 3030 Node Builder — Core Engine
   ============================================ */

// ---- Node Definitions ----
const NODE_DEFS = [
    // Pages
    { id: 'landing-page', name: 'Landing Page', type: 'page', desc: 'Entry point with logo, Join Session & Build Team buttons', connections: ['join-tab', 'team-builder', 'quick-play-menu'] },
    { id: 'team-builder', name: 'Team Builder', type: 'page', desc: 'Build custom teams: faction selection, model roster, point counter', connections: ['faction-selector', 'my-teams', 'landing-page'] },
    { id: 'my-teams', name: 'My Teams', type: 'page', desc: 'Manage saved teams library with export/import', connections: ['team-builder', 'landing-page'] },
    { id: 'quick-play-menu', name: 'Quick Play', type: 'page', desc: 'Starter squad cards for instant play', connections: ['game-area', 'landing-page'] },

    // Tabs
    { id: 'join-tab', name: 'Join / Create', type: 'tab', desc: 'Session name input, join or create new session', connections: ['game-tab', 'create-session-modal', 'landing-page'] },
    { id: 'sessions-tab', name: 'Sessions List', type: 'tab', desc: 'Browse all available sessions with join/clone/delete', connections: ['game-tab', 'clone-session-modal'] },
    { id: 'game-tab', name: 'Game', type: 'tab', desc: 'Main gameplay tab with session info and action toolbar', connections: ['game-area', 'tools-tab', 'join-tab'] },
    { id: 'tools-tab', name: 'Tools', type: 'tab', desc: 'Turn timer, dice roller, initiative tracker', connections: ['game-tab'] },

    // Modals
    { id: 'create-session-modal', name: 'Create Session', type: 'modal', desc: 'Form: session name, player name, description', connections: ['game-tab'] },
    { id: 'clone-session-modal', name: 'Clone Session', type: 'modal', desc: 'Clone session with new name, health reset', connections: ['sessions-tab'] },
    { id: 'character-modal', name: 'Character Editor', type: 'modal', desc: 'Full character form: stats, portrait, weapons, consumables, actions', connections: ['game-area'] },
    { id: 'transfer-modal', name: 'Transfer Item', type: 'modal', desc: 'Transfer weapons/consumables between characters', connections: ['game-area'] },
    { id: 'status-effect-modal', name: 'Status Effect', type: 'modal', desc: 'Add timed status effect to a character', connections: ['game-area'] },
    { id: 'save-template-modal', name: 'Save Template', type: 'modal', desc: 'Save character as reusable template', connections: ['game-area'] },
    { id: 'player-name-modal', name: 'Player Name', type: 'modal', desc: 'Enter/change player name, saved to localStorage', connections: ['landing-page'] },
    { id: 'load-team-modal', name: 'Load Team', type: 'modal', desc: 'Load saved team from Firebase library into session', connections: ['game-area'] },

    // Panels
    { id: 'game-area', name: 'Game Area', type: 'panel', desc: 'Teams container, character cards, combat log, undo panel', connections: ['character-modal', 'transfer-modal', 'status-effect-modal', 'save-template-modal', 'load-team-modal'] },
    { id: 'campaign-section', name: 'Campaign Info', type: 'panel', desc: 'Editable campaign name, description, objectives checklist', connections: ['game-tab'] },
    { id: 'tutorial-overlay', name: 'Tutorial', type: 'panel', desc: 'Spotlight overlay with step-by-step walkthrough', connections: ['landing-page'] },

    // Sub-views
    { id: 'faction-selector', name: 'Faction Selector', type: 'subview', desc: 'Grid of faction cards to pick from', connections: ['team-building-interface'] },
    { id: 'team-building-interface', name: 'Team Builder UI', type: 'subview', desc: 'Two-column: available models + current roster', connections: ['my-teams', 'quick-play-menu'] },
    { id: 'quick-build-interface', name: 'Quick Build', type: 'subview', desc: 'Auto-generate 150pt team by faction', connections: ['quick-team-preview'] },
    { id: 'quick-team-preview', name: 'Quick Preview', type: 'subview', desc: 'Preview auto-generated team before playing', connections: ['game-area'] },
];

// ---- Default Layout Positions ----
// Hierarchical top-down layout with clear branch separation:
//   Left branch: Session flow (join → sessions → game → game-area → modals)
//   Center: Quick Play flow (landing → quick-play → game-area)
//   Right branch: Team Builder flow (team-builder → factions → team-building)
const DEFAULT_POSITIONS = {
    // ─── Row 0: Landing utilities (y=80) ───
    'player-name-modal':       { x: 850,  y: 80 },
    'tutorial-overlay':        { x: 1450, y: 80 },

    // ─── Row 1: Landing Page (y=300) ───
    'landing-page':            { x: 1150, y: 300 },

    // ─── Row 2: Main branches from landing (y=580) ───
    'join-tab':                { x: 300,  y: 580 },
    'quick-play-menu':         { x: 750,  y: 580 },
    'team-builder':            { x: 1750, y: 580 },

    // ─── Row 3: Second-level children (y=860) ───
    'create-session-modal':    { x: 50,   y: 860 },
    'sessions-tab':            { x: 300,  y: 860 },
    'my-teams':                { x: 1550, y: 860 },
    'faction-selector':        { x: 1950, y: 860 },

    // ─── Row 4: Game flow + Team detail (y=1140) ───
    'clone-session-modal':     { x: 50,   y: 1140 },
    'tools-tab':               { x: 300,  y: 1140 },
    'game-tab':                { x: 550,  y: 1140 },
    'campaign-section':        { x: 800,  y: 1140 },
    'team-building-interface': { x: 1750, y: 1140 },

    // ─── Row 5: Game area + Quick paths converge (y=1430) ───
    'game-area':               { x: 650,  y: 1430 },
    'quick-team-preview':      { x: 1250, y: 1430 },
    'quick-build-interface':   { x: 1750, y: 1430 },

    // ─── Row 6: Game area modals fan out (y=1720) ───
    'character-modal':         { x: 200,  y: 1720 },
    'transfer-modal':          { x: 430,  y: 1720 },
    'load-team-modal':         { x: 660,  y: 1720 },
    'status-effect-modal':     { x: 890,  y: 1720 },
    'save-template-modal':     { x: 1120, y: 1720 },
};

// ---- State ----
let nodes = [];
let scale = 1;
let panX = 0, panY = 0;
let isPanning = false;
let panStartX = 0, panStartY = 0;
let dragNode = null;
let dragOffsetX = 0, dragOffsetY = 0;
let selectedNodeId = null;
let currentEditNode = null;
let currentEditTab = 'html';

const STORAGE_KEY = 'spaceops-builder-nodes';
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

// ---- Initialize ----
function init() {
    loadNodes();
    renderNodes();
    renderConnections();
    renderLegend();
    setupCanvasEvents();
    setupResizeHandle();
    centerOnLanding();
}

// ---- Node Data Management ----
function loadNodes() {
    // DEFAULT_CONTENT is loaded from default-content.js (extracted from v14.76)
    const defaults = (typeof DEFAULT_CONTENT !== 'undefined') ? DEFAULT_CONTENT : {};
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
        const savedData = JSON.parse(saved);
        nodes = NODE_DEFS.map(def => ({
            ...def,
            x: savedData[def.id]?.x ?? DEFAULT_POSITIONS[def.id]?.x ?? 100,
            y: savedData[def.id]?.y ?? DEFAULT_POSITIONS[def.id]?.y ?? 100,
            html: savedData[def.id]?.html || defaults[def.id] || '',
            css: savedData[def.id]?.css ?? '',
            js: savedData[def.id]?.js ?? '',
        }));
    } else {
        nodes = NODE_DEFS.map(def => ({
            ...def,
            x: DEFAULT_POSITIONS[def.id]?.x ?? 100,
            y: DEFAULT_POSITIONS[def.id]?.y ?? 100,
            html: defaults[def.id] || '',
            css: '',
            js: '',
        }));
    }
}

function saveNodes() {
    const data = {};
    nodes.forEach(n => {
        data[n.id] = { x: n.x, y: n.y, html: n.html, css: n.css, js: n.js };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setStatus('Saved');
}

function saveAllNodes() {
    saveNodes();
}

function getNode(id) {
    return nodes.find(n => n.id === id);
}

// ---- Render Nodes ----
function renderNodes() {
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';

    nodes.forEach(node => {
        const el = document.createElement('div');
        el.className = 'node';
        el.id = `node-${node.id}`;
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;

        const connCount = node.connections.length;
        const hasCode = node.html || node.css || node.js;

        el.innerHTML = `
            <div class="node-port input"></div>
            <div class="node-header">
                <div class="node-type-dot ${node.type}"></div>
                <span class="node-title">${node.name}</span>
            </div>
            <div class="node-body">
                <p class="node-desc">${node.desc}</p>
            </div>
            <div class="node-footer">
                <span class="node-connections-count">${connCount} connection${connCount !== 1 ? 's' : ''}${hasCode ? ' · has code' : ''}</span>
                <span class="node-edit-icon">✎</span>
            </div>
            <div class="node-port output"></div>
        `;

        // Drag events
        el.addEventListener('mousedown', (e) => onNodeMouseDown(e, node));
        // Double-click to edit
        el.addEventListener('dblclick', () => openNodeEditor(node.id));
        // Click to select
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            selectNode(node.id);
        });

        canvas.appendChild(el);
    });
}

// ---- Render Connections ----
function renderConnections() {
    const svg = document.getElementById('connectionsSvg');
    const w = window.innerWidth;
    const h = window.innerHeight - 48;

    // Set SVG dimensions explicitly so paths render
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    // Build SVG content
    let paths = '';

    // Arrow marker definitions
    paths += `<defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M 0 0 L 8 3 L 0 6 z" fill="#666" />
        </marker>
        <marker id="arrowhead-back" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <path d="M 0 0 L 6 2.5 L 0 5 z" fill="#333" />
        </marker>
        <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M 0 0 L 8 3 L 0 6 z" fill="#db8f00" />
        </marker>
    </defs>`;

    const nodeW = 200;
    const nodeH = 100;

    // Build a set of forward connections to detect duplicates (skip back if forward exists)
    const forwardSet = new Set();
    nodes.forEach(node => {
        node.connections.forEach(targetId => {
            const target = getNode(targetId);
            if (!target) return;
            if (target.y > node.y) {
                forwardSet.add(node.id + '→' + targetId);
            }
        });
    });

    // Separate forward and back connections — draw back connections first (behind)
    const forwardPaths = [];
    const backPaths = [];

    nodes.forEach(node => {
        node.connections.forEach(targetId => {
            const target = getNode(targetId);
            if (!target) return;

            // Determine if this is a back-connection (target is above or at same level)
            const isBack = target.y <= node.y;

            // Skip back-connection if the reverse forward connection already exists
            // (e.g., skip join-tab→landing if landing→join-tab already draws forward)
            if (isBack && forwardSet.has(targetId + '→' + node.id)) return;

            const isActive = selectedNodeId === node.id || selectedNodeId === targetId;

            let sx, sy, tx, ty, pathD;

            if (isBack) {
                // Back-connection: exit TOP of source, enter BOTTOM of target
                sx = (node.x + nodeW / 2) * scale + panX;
                sy = node.y * scale + panY;
                tx = (target.x + nodeW / 2) * scale + panX;
                ty = (target.y + nodeH) * scale + panY;
                const dy = Math.max(Math.abs(sy - ty) * 0.4, 40 * scale);
                pathD = `M ${sx} ${sy} C ${sx} ${sy - dy}, ${tx} ${ty + dy}, ${tx} ${ty}`;
            } else {
                // Forward-connection: exit BOTTOM of source, enter TOP of target
                sx = (node.x + nodeW / 2) * scale + panX;
                sy = (node.y + nodeH) * scale + panY;
                tx = (target.x + nodeW / 2) * scale + panX;
                ty = target.y * scale + panY;
                const dy = Math.max(Math.abs(ty - sy) * 0.4, 40 * scale);
                pathD = `M ${sx} ${sy} C ${sx} ${sy + dy}, ${tx} ${ty - dy}, ${tx} ${ty}`;
            }

            if (isActive) {
                forwardPaths.push(`<path class="active" d="${pathD}" marker-end="url(#arrowhead-active)" />`);
            } else if (isBack) {
                backPaths.push(`<path class="back" d="${pathD}" marker-end="url(#arrowhead-back)" />`);
            } else {
                forwardPaths.push(`<path d="${pathD}" marker-end="url(#arrowhead)" />`);
            }
        });
    });

    // Render back connections first (behind), then forward connections (on top)
    paths += backPaths.join('') + forwardPaths.join('');

    svg.innerHTML = paths;
}

// ---- Render Legend ----
function renderLegend() {
    const existing = document.getElementById('legend');
    if (existing) existing.remove();

    const legend = document.createElement('div');
    legend.id = 'legend';
    legend.innerHTML = `
        <div class="legend-item"><div class="legend-dot" style="background:var(--node-page)"></div>Page</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--node-tab)"></div>Tab</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--node-modal)"></div>Modal</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--node-panel)"></div>Panel</div>
        <div class="legend-item"><div class="legend-dot" style="background:var(--node-subview)"></div>Sub-view</div>
    `;
    document.body.appendChild(legend);
}

// ---- Canvas Events (Pan & Zoom) ----
function setupCanvasEvents() {
    const view = document.getElementById('canvasView');

    // Pan: mousedown on empty canvas
    view.addEventListener('mousedown', (e) => {
        if (e.target === view || e.target === document.getElementById('canvas')) {
            isPanning = true;
            panStartX = e.clientX - panX;
            panStartY = e.clientY - panY;
            deselectNode();
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            panX = e.clientX - panStartX;
            panY = e.clientY - panStartY;
            applyTransform();
            renderConnections();
        }

        if (dragNode) {
            const x = (e.clientX - panX) / scale - dragOffsetX;
            const y = (e.clientY - panY - 48) / scale - dragOffsetY;
            dragNode.x = Math.round(x / 10) * 10; // snap to 10px grid
            dragNode.y = Math.round(y / 10) * 10;
            const el = document.getElementById(`node-${dragNode.id}`);
            if (el) {
                el.style.left = `${dragNode.x}px`;
                el.style.top = `${dragNode.y}px`;
            }
            renderConnections();
        }
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) isPanning = false;
        if (dragNode) {
            const el = document.getElementById(`node-${dragNode.id}`);
            if (el) el.classList.remove('dragging');
            dragNode = null;
            saveNodes();
        }
    });

    // Zoom: mouse wheel
    view.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale + delta));

        // Zoom toward cursor
        const rect = view.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        panX = mx - (mx - panX) * (newScale / scale);
        panY = my - (my - panY) * (newScale / scale);

        scale = newScale;
        applyTransform();
        renderConnections();
        document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;
    }, { passive: false });

    // Deselect on canvas click
    view.addEventListener('click', (e) => {
        if (e.target === view || e.target === document.getElementById('canvas')) {
            deselectNode();
        }
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (currentEditNode) showCanvasView();
            deselectNode();
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Don't delete nodes, but could be used for other actions
        }
        // Zoom shortcuts
        if ((e.metaKey || e.ctrlKey) && e.key === '=') { e.preventDefault(); zoomIn(); }
        if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); zoomOut(); }
        if ((e.metaKey || e.ctrlKey) && e.key === '0') { e.preventDefault(); resetView(); }
    });
}

function applyTransform() {
    const canvas = document.getElementById('canvas');
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// ---- Node Interaction ----
function onNodeMouseDown(e, node) {
    e.stopPropagation();
    // Start drag
    dragNode = node;
    const el = document.getElementById(`node-${node.id}`);
    el.classList.add('dragging');

    dragOffsetX = (e.clientX - panX) / scale - node.x;
    dragOffsetY = (e.clientY - panY - 48) / scale - node.y;
}

function selectNode(id) {
    deselectNode();
    selectedNodeId = id;
    const el = document.getElementById(`node-${id}`);
    if (el) el.classList.add('selected');

    const node = getNode(id);
    if (!node) return;

    // Show info panel
    const panel = document.getElementById('nodeInfoPanel');
    panel.classList.remove('hidden');
    document.getElementById('nodeInfoName').textContent = node.name;

    const badge = document.getElementById('nodeInfoType');
    badge.textContent = node.type;
    badge.className = `node-type-badge ${node.type}`;

    document.getElementById('nodeInfoDesc').textContent = node.desc;

    const connsEl = document.getElementById('nodeInfoConnections');
    if (node.connections.length) {
        connsEl.innerHTML = node.connections.map(cid => {
            const cn = getNode(cid);
            return `<div class="conn-item"><span class="conn-arrow">→</span> ${cn ? cn.name : cid}</div>`;
        }).join('');
    } else {
        connsEl.innerHTML = '<div class="conn-item" style="opacity:0.5">No connections</div>';
    }

    renderConnections();
}

function deselectNode() {
    if (selectedNodeId) {
        const el = document.getElementById(`node-${selectedNodeId}`);
        if (el) el.classList.remove('selected');
    }
    selectedNodeId = null;
    document.getElementById('nodeInfoPanel').classList.add('hidden');
    renderConnections();
}

// ---- Zoom Controls ----
function zoomIn() {
    scale = Math.min(ZOOM_MAX, scale + ZOOM_STEP);
    applyTransform();
    renderConnections();
    document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;
}

function zoomOut() {
    scale = Math.max(ZOOM_MIN, scale - ZOOM_STEP);
    applyTransform();
    renderConnections();
    document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;
}

function resetView() {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
    renderConnections();
    document.getElementById('zoomLevel').textContent = '100%';
}

function centerOnLanding() {
    const landing = getNode('landing-page');
    if (!landing) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight - 48;
    panX = vw / 2 - landing.x * scale - 100;
    panY = vh / 2 - landing.y * scale - 50;
    applyTransform();
    renderConnections();
}

// ---- Minimap ----
function toggleMinimap() {
    document.getElementById('minimap').classList.toggle('hidden');
    updateMinimap();
}

function updateMinimap() {
    const mm = document.getElementById('minimapCanvas');
    const ctx = mm.getContext('2d');
    ctx.clearRect(0, 0, mm.width, mm.height);

    // Find bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + 200);
        maxY = Math.max(maxY, n.y + 100);
    });

    const padding = 50;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const scaleX = mm.width / rangeX;
    const scaleY = mm.height / rangeY;
    const s = Math.min(scaleX, scaleY);

    const TYPE_COLORS = { page: '#db8f00', tab: '#4488ff', modal: '#9944ff', panel: '#4CAF50', subview: '#00bcd4' };

    // Draw connections
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    nodes.forEach(node => {
        node.connections.forEach(tid => {
            const t = getNode(tid);
            if (!t) return;
            ctx.beginPath();
            ctx.moveTo((node.x + 100 - minX) * s, (node.y + 50 - minY) * s);
            ctx.lineTo((t.x + 100 - minX) * s, (t.y + 50 - minY) * s);
            ctx.stroke();
        });
    });

    // Draw nodes
    nodes.forEach(n => {
        ctx.fillStyle = TYPE_COLORS[n.type] || '#666';
        ctx.fillRect((n.x - minX) * s, (n.y - minY) * s, 200 * s, 80 * s);
    });
}

// ---- Auto Layout ----
function autoLayout() {
    // Reset to default positions (preserves html/css/js content)
    nodes.forEach(n => {
        const def = DEFAULT_POSITIONS[n.id];
        if (def) {
            n.x = def.x;
            n.y = def.y;
        }
    });
    renderNodes();
    renderConnections();
    centerOnLanding();
    saveNodes();
    setStatus('Layout reset');
}

// Reset positions only — never wipes node content
function resetPositionsOnly() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const data = JSON.parse(saved);
        // Keep content, overwrite positions
        Object.keys(data).forEach(id => {
            const def = DEFAULT_POSITIONS[id];
            if (def) {
                data[id].x = def.x;
                data[id].y = def.y;
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    loadNodes();
    renderNodes();
    renderConnections();
    centerOnLanding();
    setStatus('Positions reset (content preserved)');
}

// ---- View Switching ----
function showCanvasView() {
    document.getElementById('canvasView').style.display = '';
    document.getElementById('editView').classList.add('hidden');
    document.getElementById('btnCanvasView').classList.add('active');
    document.getElementById('btnEditView').classList.remove('active');
    const legend = document.getElementById('legend');
    if (legend) legend.style.display = '';
    currentEditNode = null;
    renderConnections();
}

function showEditView() {
    if (!selectedNodeId && !currentEditNode) {
        setStatus('Select a node first');
        return;
    }
    const nodeId = currentEditNode || selectedNodeId;
    openNodeEditor(nodeId);
}

function openNodeEditor(nodeId) {
    const node = getNode(nodeId);
    if (!node) return;

    currentEditNode = nodeId;
    document.getElementById('canvasView').style.display = 'none';
    document.getElementById('editView').classList.remove('hidden');
    document.getElementById('btnCanvasView').classList.remove('active');
    document.getElementById('btnEditView').classList.add('active');
    const legend = document.getElementById('legend');
    if (legend) legend.style.display = 'none';

    document.getElementById('editNodeName').textContent = node.name;
    currentEditTab = 'html';
    updateEditTabs();
    loadCodeForTab();
    updatePreview();
}

function switchEditTab(tab) {
    currentEditTab = tab;
    updateEditTabs();
    loadCodeForTab();
}

function updateEditTabs() {
    document.querySelectorAll('.edit-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === currentEditTab);
    });
}

function loadCodeForTab() {
    const node = getNode(currentEditNode);
    if (!node) return;
    const editor = document.getElementById('codeEditor');
    editor.value = node[currentEditTab] || `<!-- ${node.name} ${currentEditTab.toUpperCase()} -->\n`;
}

function applyChanges() {
    const node = getNode(currentEditNode);
    if (!node) return;
    node[currentEditTab] = document.getElementById('codeEditor').value;
    saveNodes();
    updatePreview();
    setStatus('Changes applied');
}

function updatePreview() {
    const node = getNode(currentEditNode);
    if (!node) return;

    const frame = document.getElementById('previewFrame');
    const firebaseScripts = getFirebaseScripts();
    let firebaseBadge = '';
    if (firebaseMode === 'mock') {
        firebaseBadge = '<div style="position:fixed;top:5px;right:5px;background:#FF9800;color:#fff;padding:2px 8px;border-radius:3px;font-size:10px;z-index:9999;font-weight:bold;">MOCK DATA</div>';
    } else if (firebaseMode === 'live') {
        firebaseBadge = '<div style="position:fixed;top:5px;right:5px;background:#4CAF50;color:#fff;padding:2px 8px;border-radius:3px;font-size:10px;z-index:9999;font-weight:bold;">LIVE</div>';
    }

    const baseUrl = window.location.href.replace(/\/[^/]*$/, '/');
    const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="${baseUrl}">
${firebaseScripts}
<link rel="stylesheet" href="shared-styles.css">
<style>
/* Light theme CSS variables */
:root {
    --accent: #E8441E;
    --accent-hover: #FF5A35;
    --accent-dark: #C03418;
    --lime: #C8E600;
    --combat-red: #7B1818;
    --combat-red-light: #A02020;
    --white: #FFFFFF;
    --off-white: #F8F7F5;
    --surface: #F0EFEC;
    --card-gray: #E8E5E0;
    --border: #D0CEC8;
    --border-light: #E5E3DE;
    --text-primary: #111111;
    --text-secondary: #555555;
    --text-muted: #888888;
    --black: #000000;
    --success: #2D8A4E;
    --danger: #CC2222;
    --warning: #D4880F;
    --font-heading: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    --font-body: Georgia, 'Times New Roman', Times, serif;
    --font-mono: 'Courier New', Courier, monospace;
    --font-display: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
/* Ensure content scales to preview panel width */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background: var(--white);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 15px;
    padding: 0;
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; height: auto; }
input, select, textarea, button { max-width: 100%; }
/* Override hidden states so node content is always visible in preview */
.tab-content, .modal, .modal-content,
#gameArea, #campaignSection, #sessionInfo, #teamBuilderTab,
#myTeamsTab, #appInterface { display: block !important; }
.modal { position: relative !important; background: transparent !important; }
.modal-content { position: relative !important; max-width: 100% !important; }
${node.css || ''}
</style>
</head>
<body>
${firebaseBadge}
${node.html || `<div style="display:flex;align-items:center;justify-content:center;height:80vh;opacity:0.3;flex-direction:column;gap:10px;">
    <div style="font-size:48px;">⬡</div>
    <div style="font-size:16px;">${node.name}</div>
    <div style="font-size:12px;color:#666;">No HTML content yet — start editing</div>
</div>`}
<script>
${node.js || ''}
</script>
</body>
</html>`;

    frame.srcdoc = html;
    frame.onload = () => {
        if (typeof onPreviewLoaded === 'function') onPreviewLoaded();
    };
}

// ---- Resize Handle (Split View) ----
function setupResizeHandle() {
    const handle = document.getElementById('resizeHandle');
    const preview = document.getElementById('previewPanel');
    const code = document.getElementById('codePanel');
    let isResizing = false;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const split = document.getElementById('editSplit');
        const rect = split.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = (x / rect.width) * 100;
        if (pct > 15 && pct < 85) {
            preview.style.flex = `0 0 ${pct}%`;
            code.style.flex = `0 0 ${100 - pct}%`;
        }
    });

    window.addEventListener('mouseup', () => {
        isResizing = false;
    });
}

// ---- AI Panel (Placeholder) ----
function sendToAI() {
    const input = document.getElementById('aiInput');
    const msg = input.value.trim();
    if (!msg) return;
    setStatus(`AI: "${msg}" — ready to process`);
    input.value = '';
}

// ---- Firebase Config ----
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtbd-U5_-sIoPPX8iViFmi6_-DgVD16vk",
    authDomain: "space-ops-3030.firebaseapp.com",
    databaseURL: "https://space-ops-3030-default-rtdb.firebaseio.com",
    projectId: "space-ops-3030",
    storageBucket: "space-ops-3030.firebasestorage.app",
    messagingSenderId: "905112015290",
    appId: "1:905112015290:web:0d19ac4cac33de480f4d83"
};

// Firebase mode: 'off' | 'mock' | 'live'
let firebaseMode = 'off';

function toggleFirebase() {
    // Cycle: off → mock → live → off
    if (firebaseMode === 'off') firebaseMode = 'mock';
    else if (firebaseMode === 'mock') firebaseMode = 'live';
    else firebaseMode = 'off';

    const btn = document.getElementById('firebaseToggle');
    if (btn) {
        btn.classList.remove('active', 'mock');
        if (firebaseMode === 'mock') {
            btn.classList.add('mock');
            btn.textContent = 'Firebase: MOCK';
        } else if (firebaseMode === 'live') {
            btn.classList.add('active');
            btn.textContent = 'Firebase: LIVE';
        } else {
            btn.textContent = 'Firebase: OFF';
        }
    }
    if (currentEditNode) updatePreview();
    const statusMessages = { off: 'Firebase disconnected', mock: 'Mock Firebase — offline test data', live: 'Firebase LIVE connected' };
    setStatus(statusMessages[firebaseMode]);
}

function getFirebaseScripts() {
    if (firebaseMode === 'off') return '';

    if (firebaseMode === 'mock') {
        // Mock mode: load mock-firebase.js (in-memory data) + shared app scripts
        return `
<script src="mock-firebase.js"><\/script>
<script src="shared-scripts.js"><\/script>`;
    }

    // Live mode: load real Firebase SDK + shared app scripts
    return `
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"><\/script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"><\/script>
<script>
    const firebaseConfig = ${JSON.stringify(FIREBASE_CONFIG)};
<\/script>
<script src="shared-scripts.js"><\/script>`;
}

// ============================================
// Export Pipeline — Compile nodes → single HTML
// ============================================

// DOM ordering: how nodes should be assembled into the final HTML
const EXPORT_ORDER = {
    // These define the structure of the output HTML
    pages: ['landing-page', 'quick-play-menu'],
    appInterface: {
        tabs: ['join-tab', 'sessions-tab', 'game-tab', 'tools-tab'],
        panels: ['campaign-section', 'game-area']
    },
    standalone: ['team-builder', 'my-teams', 'lore-tab'],
    modals: ['character-modal', 'create-session-modal', 'clone-session-modal',
             'transfer-modal', 'status-effect-modal', 'save-template-modal',
             'player-name-modal', 'load-team-modal'],
    overlays: ['tutorial-overlay'],
    // Subviews are rendered dynamically, their HTML is in JS functions
    subviews: ['faction-selector', 'faction-lore', 'team-building-interface',
               'quick-build-interface', 'quick-team-preview']
};

function exportProject() {
    setStatus('Compiling...');

    try {
        // Collect all unique CSS (deduplicate)
        const cssSet = new Set();
        const allCSS = [];
        nodes.forEach(n => {
            if (n.css && !cssSet.has(n.css)) {
                cssSet.add(n.css);
                allCSS.push(`/* ===== ${n.name} ===== */\n${n.css}`);
            }
        });

        // Collect all JS
        const allJS = [];
        nodes.forEach(n => {
            if (n.js) {
                allJS.push(`// ===== ${n.name} =====\n${n.js}`);
            }
        });

        // Build HTML body sections
        const bodyParts = [];

        // Landing page
        const landing = getNode('landing-page');
        if (landing?.html) bodyParts.push(`    <!-- Landing Page -->\n    ${landing.html}`);

        // App Interface wrapper with tabs
        bodyParts.push(`    <!-- App Interface -->\n    <div id="appInterface" style="display: none;">`);

        // Logo header
        bodyParts.push(`        <div class="logo-header" style="text-align:center;padding:15px 0;">
            <img src="https://raw.githubusercontent.com/AndreBalmet/Space-Ops-3030-Tabletop-Tracker/refs/heads/main/Logo_Wide_wht_c6376661-fc72-45af-ae4c-9b56e7802930.png" alt="Space Ops 3030" style="max-width:300px;width:80%;" />
        </div>`);

        // Session info bar
        bodyParts.push(`        <div id="sessionInfoBar" style="display: none; background: rgba(219,143,0,0.1); padding: 8px 15px; border-radius: 5px; margin-bottom: 10px; border: 1px solid #db8f00;">
            <span style="color: #9CAF88; font-size: 13px;">SESSION: </span><span id="currentSessionName" style="color: #db8f00; font-weight: 600;"></span>
            <span style="margin-left: 15px; color: #9CAF88; font-size: 13px;">PLAYER: </span><span id="sessionPlayerName" style="color: #db8f00; font-weight: 600;"></span>
        </div>`);

        // Campaign section
        const campaign = getNode('campaign-section');
        if (campaign?.html) bodyParts.push(`        <!-- Campaign -->\n        ${campaign.html}`);

        // Tab navigation
        bodyParts.push(`        <!-- Tab Navigation -->
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('join')">JOIN/CREATE</button>
            <button class="tab-btn" onclick="switchTab('sessions')">SESSIONS</button>
            <button class="tab-btn" id="gameTabBtn" style="display:none;" onclick="switchTab('game')">Game</button>
            <button class="tab-btn" id="toolsTabBtn" style="display:none;" onclick="switchTab('tools')">Tools</button>
        </div>`);

        // Tab contents
        EXPORT_ORDER.appInterface.tabs.forEach(id => {
            const node = getNode(id);
            if (node?.html) bodyParts.push(`        <!-- ${node.name} -->\n        ${node.html}`);
        });

        // Game area
        const gameArea = getNode('game-area');
        if (gameArea?.html) bodyParts.push(`        <!-- Game Area -->\n        ${gameArea.html}`);

        bodyParts.push(`    </div><!-- /appInterface -->`);

        // Standalone pages
        EXPORT_ORDER.standalone.forEach(id => {
            const node = getNode(id);
            if (node?.html) bodyParts.push(`    <!-- ${node.name} -->\n    ${node.html}`);
        });

        // Modals
        EXPORT_ORDER.modals.forEach(id => {
            const node = getNode(id);
            if (node?.html) {
                // Wrap in modal container if not already
                const html = node.html;
                const isWrapped = html.includes('class="modal"');
                if (isWrapped) {
                    bodyParts.push(`    <!-- ${node.name} Modal -->\n    ${html}`);
                } else {
                    bodyParts.push(`    <!-- ${node.name} Modal -->\n    <div id="${id}" class="modal">\n        ${html}\n    </div>`);
                }
            }
        });

        // Tutorial overlay
        const tutorial = getNode('tutorial-overlay');
        if (tutorial?.html) bodyParts.push(`    <!-- Tutorial -->\n    <div id="tutorialOverlay" style="display:none;">\n        ${tutorial.html}\n    </div>`);

        // Assemble the full HTML file
        const output = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Space-Ops 3030 Tabletop Tracker</title>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"><\/script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
    <style>
/* ===== Generated by Space-Ops 3030 Node Builder ===== */
/* ===== Exported: ${new Date().toISOString()} ===== */

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-size: 14px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #0a0a0a;
    color: #ffffff;
    min-height: 100vh;
}

/* Tab System */
.tabs { display: flex; gap: 5px; margin-bottom: 15px; flex-wrap: wrap; }
.tab-btn { background: #2a2a2a; border: 1px solid #444; color: #aaa; padding: 8px 16px; border-radius: 5px; cursor: pointer; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; transition: all 0.3s; }
.tab-btn:hover { background: #333; color: #fff; }
.tab-btn.active { background: #db8f00; color: #000; border-color: #db8f00; }
.tab-content { display: none; }
.tab-content.active { display: block; }

${allCSS.join('\n\n')}
    </style>
</head>
<body>

${bodyParts.join('\n\n')}

    <script>
// ===== Firebase Setup =====
const firebaseConfig = ${JSON.stringify(FIREBASE_CONFIG, null, 4)};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ===== Tab System =====
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) tab.classList.add('active');
    event.target.classList.add('active');
}

// ===== Node JS =====
${allJS.join('\n\n')}
    <\/script>
</body>
</html>`;

        // Download the file
        const blob = new Blob([output], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `space-ops-3030-v15-export.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Also save to localStorage for reference
        localStorage.setItem('spaceops-last-export', output);

        setStatus(`Exported! ${Math.round(output.length / 1024)}KB`);
    } catch (err) {
        setStatus(`Export error: ${err.message}`);
        console.error('Export failed:', err);
    }
}

// ---- Status ----
function setStatus(msg) {
    const el = document.getElementById('statusIndicator');
    el.textContent = msg;
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.textContent = 'Ready'; }, 3000);
}

// ---- Tab key in editor (insert spaces) ----
document.addEventListener('keydown', (e) => {
    if (e.target.id === 'codeEditor' && e.key === 'Tab') {
        e.preventDefault();
        const ta = e.target;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
    }
});

// ---- Boot ----
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', renderConnections);

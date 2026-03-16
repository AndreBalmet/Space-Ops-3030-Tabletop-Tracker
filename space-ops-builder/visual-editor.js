/* ============================================
   Visual Element Positioning Tool — Engine
   Phases 1-5: Selection, Properties, Drag, Snap, Resize
   ============================================ */

// --- State ---
let visualEditMode = false;
let elementMap = [];
let selectedElement = null;   // { domRef, tag, id, classes, rect, selector }
let selectedSelector = null;
let hoveredElement = null;
let isDragging = false;
let isResizing = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartRect = null;
let resizeHandleDir = null;
let pendingCSS = {};
let lastCSS = null;           // For undo

// Element cycling state — for clicking through stacked elements
let lastClickX = 0;
let lastClickY = 0;
let elementsAtPoint = [];     // All selectable elements at last click point
let cycleIndex = -1;

const SNAP_THRESHOLD = 5;
const IGNORED_TAGS = new Set(['HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'LINK', 'META', 'BR', 'HR', 'NOSCRIPT']);
const MIN_SIZE = 8;

// --- Init ---
function initVisualEditor() {
    const overlay = document.getElementById('visualOverlay');
    if (!overlay) return;

    overlay.addEventListener('mousedown', onOverlayMouseDown);
    overlay.addEventListener('mousemove', onOverlayMouseMove);
    overlay.addEventListener('mouseup', onOverlayMouseUp);
    overlay.addEventListener('mouseleave', onOverlayLeave);

    window.addEventListener('keydown', onVisualKeyDown);
}

// --- Toggle Visual Edit Mode ---
function toggleVisualEdit() {
    visualEditMode = !visualEditMode;
    const btn = document.getElementById('visualEditBtn');
    const overlay = document.getElementById('visualOverlay');
    const previewPanel = document.getElementById('previewPanel');
    const editSplit = document.getElementById('editSplit');
    const propPanel = document.getElementById('propertyPanel');
    const tabs = document.querySelectorAll('.edit-tab');

    if (visualEditMode) {
        btn.classList.add('active');
        overlay.classList.add('active');
        previewPanel.classList.add('visual-edit-active');
        editSplit.classList.add('visual-edit-active-split');
        propPanel.classList.add('active');
        tabs.forEach(t => t.style.opacity = '0.3');
        tabs.forEach(t => t.style.pointerEvents = 'none');
        scanElements();
        showPropEmpty();
    } else {
        btn.classList.remove('active');
        overlay.classList.remove('active');
        previewPanel.classList.remove('visual-edit-active');
        editSplit.classList.remove('visual-edit-active-split');
        propPanel.classList.remove('active');
        tabs.forEach(t => t.style.opacity = '');
        tabs.forEach(t => t.style.pointerEvents = '');
        clearSelection();
        clearHover();
        clearSnapGuides();
    }
}

// --- Scan iframe elements ---
function scanElements() {
    elementMap = [];
    const iframe = document.getElementById('previewFrame');
    if (!iframe || !iframe.contentDocument) return;
    const iframeDoc = iframe.contentDocument;
    const allElements = iframeDoc.body.querySelectorAll('*');

    allElements.forEach(el => {
        if (IGNORED_TAGS.has(el.tagName)) return;
        const rect = el.getBoundingClientRect();
        if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return;
        const cs = el.ownerDocument.defaultView.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;

        elementMap.push({
            domRef: el,
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: [...el.classList],
            rect: {
                left: rect.left, top: rect.top,
                right: rect.right, bottom: rect.bottom,
                width: rect.width, height: rect.height,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2
            }
        });
    });
}

// --- Coordinate helpers ---
function overlayToIframe(clientX, clientY) {
    const iframe = document.getElementById('previewFrame');
    const iframeRect = iframe.getBoundingClientRect();
    return {
        x: clientX - iframeRect.left,
        y: clientY - iframeRect.top
    };
}

function iframeToOverlay(iframeRect) {
    const iframe = document.getElementById('previewFrame');
    const panelRect = iframe.getBoundingClientRect();
    return {
        left: panelRect.left - panelRect.left + iframeRect.left,
        top: panelRect.top - panelRect.top + iframeRect.top,
        width: iframeRect.width,
        height: iframeRect.height
    };
}

// --- Hit test ---
function hitTest(clientX, clientY) {
    const iframe = document.getElementById('previewFrame');
    if (!iframe || !iframe.contentDocument) return null;
    const pos = overlayToIframe(clientX, clientY);
    let el = iframe.contentDocument.elementFromPoint(pos.x, pos.y);
    if (!el) return null;
    return findSelectableAncestor(el);
}

// Get ALL selectable elements at a point (from innermost to outermost)
function getAllElementsAtPoint(clientX, clientY) {
    const iframe = document.getElementById('previewFrame');
    if (!iframe || !iframe.contentDocument) return [];
    const pos = overlayToIframe(clientX, clientY);
    const iframeDoc = iframe.contentDocument;
    const iframeBody = iframeDoc.body;

    // Start from the topmost element and walk up the tree, collecting all selectable ancestors
    let el = iframeDoc.elementFromPoint(pos.x, pos.y);
    if (!el) return [];

    const results = [];
    let current = el;

    // First, collect the hit element itself if selectable
    while (current && current !== iframeBody) {
        if (isSelectable(current)) {
            results.push(current);
        }
        current = current.parentElement;
    }

    // Also check for elements whose bounding boxes contain the point but aren't ancestors
    // (siblings/cousins with overlapping areas)
    elementMap.forEach(em => {
        const r = em.rect;
        if (pos.x >= r.left && pos.x <= r.right && pos.y >= r.top && pos.y <= r.bottom) {
            if (!results.includes(em.domRef)) {
                results.push(em.domRef);
            }
        }
    });

    return results;
}

function findSelectableAncestor(el) {
    let current = el;
    const iframeBody = document.getElementById('previewFrame').contentDocument.body;
    while (current && current !== iframeBody) {
        if (isSelectable(current)) return current;
        current = current.parentElement;
    }
    return null;
}

function isSelectable(el) {
    if (!el) return false;
    if (IGNORED_TAGS.has(el.tagName)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return false;
    return true;
}

// --- Selection ---
function selectElement(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cs = el.ownerDocument.defaultView.getComputedStyle(el);
    const selector = generateSelector(el);

    selectedElement = {
        domRef: el,
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: [...el.classList],
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
                width: rect.width, height: rect.height,
                centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 },
        selector: selector,
        computedStyle: cs
    };
    selectedSelector = selector;

    drawSelectionBox(rect);
    populatePropertyPanel(el, cs, selector, rect);
}

function clearSelection() {
    selectedElement = null;
    const overlay = document.getElementById('visualOverlay');
    overlay.querySelectorAll('.ve-selection-box, .ve-resize-handle, .ve-selection-info').forEach(e => e.remove());
}

// --- Drawing: Selection Box ---
function drawSelectionBox(rect) {
    const overlay = document.getElementById('visualOverlay');
    overlay.querySelectorAll('.ve-selection-box, .ve-resize-handle, .ve-selection-info').forEach(e => e.remove());

    const box = document.createElement('div');
    box.className = 've-selection-box';
    box.id = 'veSelectionBox';
    box.style.left = rect.left + 'px';
    box.style.top = rect.top + 'px';
    box.style.width = rect.width + 'px';
    box.style.height = rect.height + 'px';
    overlay.appendChild(box);

    // Dimension label
    const info = document.createElement('div');
    info.className = 've-selection-info';
    info.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    box.appendChild(info);

    // Resize handles
    const handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    handles.forEach(dir => {
        const h = document.createElement('div');
        h.className = `ve-resize-handle ve-handle-${dir}`;
        h.dataset.dir = dir;
        box.appendChild(h);
    });
}

// --- Drawing: Hover Outline ---
function drawHoverOutline(el) {
    const overlay = document.getElementById('visualOverlay');
    let outline = overlay.querySelector('.ve-hover-outline');
    let label = overlay.querySelector('.ve-element-label');

    if (!outline) {
        outline = document.createElement('div');
        outline.className = 've-hover-outline';
        overlay.appendChild(outline);
    }
    if (!label) {
        label = document.createElement('div');
        label.className = 've-element-label';
        overlay.appendChild(label);
    }

    const rect = el.getBoundingClientRect();
    outline.style.left = rect.left + 'px';
    outline.style.top = rect.top + 'px';
    outline.style.width = rect.width + 'px';
    outline.style.height = rect.height + 'px';
    outline.style.display = 'block';

    const tag = el.tagName.toLowerCase();
    const cls = el.classList.length > 0 ? '.' + [...el.classList].slice(0, 2).join('.') : '';
    const idStr = el.id ? '#' + el.id : '';
    label.textContent = tag + idStr + cls;
    label.style.left = rect.left + 'px';
    label.style.top = rect.top + 'px';
    label.style.display = 'block';
}

function clearHover() {
    const overlay = document.getElementById('visualOverlay');
    const outline = overlay.querySelector('.ve-hover-outline');
    const label = overlay.querySelector('.ve-element-label');
    if (outline) outline.style.display = 'none';
    if (label) label.style.display = 'none';
}

// --- Mouse Handlers ---
let mouseDownTime = 0;
let mouseDownEl = null;
let dragInitiated = false;
const DRAG_DELAY = 150; // ms — hold this long before drag starts

function onOverlayMouseDown(e) {
    if (!visualEditMode) return;

    // Check if clicking a resize handle
    if (e.target.classList.contains('ve-resize-handle')) {
        e.preventDefault();
        startResize(e.target.dataset.dir, e);
        return;
    }

    mouseDownTime = Date.now();
    dragInitiated = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    // Get ALL elements at this point for cycling
    const allEls = getAllElementsAtPoint(e.clientX, e.clientY);

    if (allEls.length === 0) {
        clearSelection();
        showPropEmpty();
        elementsAtPoint = [];
        cycleIndex = -1;
        return;
    }

    // Check if clicking near the same spot as last time (within 5px)
    const sameSspot = Math.abs(e.clientX - lastClickX) < 5 && Math.abs(e.clientY - lastClickY) < 5;

    lastClickX = e.clientX;
    lastClickY = e.clientY;

    if (sameSspot && elementsAtPoint.length > 1) {
        // Cycle to next element in the stack
        cycleIndex = (cycleIndex + 1) % elementsAtPoint.length;
    } else {
        // New click location — start fresh, pick innermost (first) element
        elementsAtPoint = allEls;
        cycleIndex = 0;
    }

    const targetEl = elementsAtPoint[cycleIndex];

    // If already selected, prepare for potential drag
    if (selectedElement && selectedElement.domRef === targetEl) {
        mouseDownEl = targetEl;
        e.preventDefault();
        return;
    }

    // Select new element and prepare for potential drag
    clearSelection();
    selectElement(targetEl);
    mouseDownEl = targetEl;
    e.preventDefault();
}

function onOverlayMouseMove(e) {
    if (!visualEditMode) return;

    // Check if we should start dragging (mouse is down and moved enough)
    if (mouseDownEl && !isDragging && !isResizing) {
        const dist = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
        if (dist > 3) {
            // Start drag
            startDrag(e);
            return;
        }
    }

    if (isDragging) {
        updateDrag(e);
        return;
    }

    if (isResizing) {
        updateResize(e);
        return;
    }

    // Hover
    const el = hitTest(e.clientX, e.clientY);
    if (el && (!selectedElement || el !== selectedElement.domRef)) {
        hoveredElement = el;
        drawHoverOutline(el);
    } else {
        hoveredElement = null;
        clearHover();
    }
}

function onOverlayMouseUp(e) {
    mouseDownEl = null;

    if (isDragging) {
        commitDrag(e);
        return;
    }
    if (isResizing) {
        commitResize(e);
        return;
    }
}

function onOverlayLeave(e) {
    if (!isDragging && !isResizing) {
        clearHover();
    }
}

// --- Drag ---
function startDrag(e) {
    if (!selectedElement) return;
    isDragging = true;
    dragStartRect = { ...selectedElement.rect };

    const box = document.getElementById('veSelectionBox');
    if (box) box.classList.add('dragging');

    // Cache all element rects for snap (exclude selected)
    scanElements();

    document.body.style.cursor = 'grabbing';
}

function updateDrag(e) {
    if (!isDragging || !selectedElement) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    const proposedRect = {
        left: dragStartRect.left + dx,
        top: dragStartRect.top + dy,
        right: dragStartRect.right + dx,
        bottom: dragStartRect.bottom + dy,
        width: dragStartRect.width,
        height: dragStartRect.height,
        centerX: dragStartRect.centerX + dx,
        centerY: dragStartRect.centerY + dy
    };

    // Calculate snap
    const snap = calculateSnapGuides(proposedRect);
    renderSnapGuides(snap.guides);

    let finalLeft = proposedRect.left;
    let finalTop = proposedRect.top;
    if (snap.snappedX !== null) finalLeft = snap.snappedX;
    if (snap.snappedY !== null) finalTop = snap.snappedY;

    // Move ghost selection box
    const box = document.getElementById('veSelectionBox');
    if (box) {
        box.style.left = finalLeft + 'px';
        box.style.top = finalTop + 'px';
    }
}

function commitDrag(e) {
    if (!isDragging || !selectedElement) { isDragging = false; mouseDownEl = null; return; }
    isDragging = false;
    mouseDownEl = null;
    document.body.style.cursor = '';

    const box = document.getElementById('veSelectionBox');
    if (box) box.classList.remove('dragging');

    const finalLeft = parseFloat(box.style.left);
    const finalTop = parseFloat(box.style.top);
    const dx = finalLeft - dragStartRect.left;
    const dy = finalTop - dragStartRect.top;

    clearSnapGuides();

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return; // No movement

    // Generate CSS
    const cssRules = generateCSSForMove(selectedElement, dx, dy);
    if (Object.keys(cssRules).length === 0) return;

    writeCSSToNode(selectedElement.selector, cssRules);
}

// --- Resize ---
function startResize(dir, e) {
    if (!selectedElement) return;
    isResizing = true;
    resizeHandleDir = dir;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartRect = { ...selectedElement.rect };
    document.body.style.cursor = dir + '-resize';
}

function updateResize(e) {
    if (!isResizing || !selectedElement) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    let newLeft = dragStartRect.left;
    let newTop = dragStartRect.top;
    let newWidth = dragStartRect.width;
    let newHeight = dragStartRect.height;

    const dir = resizeHandleDir;
    if (dir.includes('e')) newWidth = Math.max(MIN_SIZE, dragStartRect.width + dx);
    if (dir.includes('w')) { newWidth = Math.max(MIN_SIZE, dragStartRect.width - dx); newLeft = dragStartRect.left + dx; }
    if (dir.includes('s')) newHeight = Math.max(MIN_SIZE, dragStartRect.height + dy);
    if (dir.includes('n')) { newHeight = Math.max(MIN_SIZE, dragStartRect.height - dy); newTop = dragStartRect.top + dy; }

    const box = document.getElementById('veSelectionBox');
    if (box) {
        box.style.left = newLeft + 'px';
        box.style.top = newTop + 'px';
        box.style.width = newWidth + 'px';
        box.style.height = newHeight + 'px';
        const info = box.querySelector('.ve-selection-info');
        if (info) info.textContent = `${Math.round(newWidth)} × ${Math.round(newHeight)}`;
    }
}

function commitResize(e) {
    if (!isResizing || !selectedElement) { isResizing = false; return; }
    isResizing = false;
    document.body.style.cursor = '';

    const box = document.getElementById('veSelectionBox');
    const newWidth = parseFloat(box.style.width);
    const newHeight = parseFloat(box.style.height);
    const dw = newWidth - dragStartRect.width;
    const dh = newHeight - dragStartRect.height;

    if (Math.abs(dw) < 1 && Math.abs(dh) < 1) return;

    const rules = {};
    if (Math.abs(dw) >= 1) rules['width'] = Math.round(newWidth) + 'px';
    if (Math.abs(dh) >= 1) rules['height'] = Math.round(newHeight) + 'px';

    writeCSSToNode(selectedElement.selector, rules);
}

// --- Snap Guides ---
function calculateSnapGuides(draggedRect) {
    const guides = [];
    let snappedX = null;
    let snappedY = null;
    let bestDxDist = SNAP_THRESHOLD + 1;
    let bestDyDist = SNAP_THRESHOLD + 1;

    const edges = {
        left: draggedRect.left,
        right: draggedRect.left + draggedRect.width,
        centerX: draggedRect.left + draggedRect.width / 2,
        top: draggedRect.top,
        bottom: draggedRect.top + draggedRect.height,
        centerY: draggedRect.top + draggedRect.height / 2
    };

    // Also add viewport center as snap target
    const iframe = document.getElementById('previewFrame');
    const iframeRect = iframe.getBoundingClientRect();
    const viewportTargets = [{
        rect: { left: 0, top: 0, right: iframeRect.width, bottom: iframeRect.height,
                width: iframeRect.width, height: iframeRect.height,
                centerX: iframeRect.width / 2, centerY: iframeRect.height / 2 }
    }];

    const allTargets = elementMap
        .filter(em => !selectedElement || em.domRef !== selectedElement.domRef)
        .concat(viewportTargets);

    for (const target of allTargets) {
        const t = target.rect;

        // Vertical snaps (X axis)
        const xPairs = [
            [edges.left, t.left], [edges.left, t.right], [edges.left, t.centerX],
            [edges.right, t.left], [edges.right, t.right], [edges.right, t.centerX],
            [edges.centerX, t.left], [edges.centerX, t.right], [edges.centerX, t.centerX]
        ];

        for (const [dragVal, targetVal] of xPairs) {
            const dist = Math.abs(dragVal - targetVal);
            if (dist < SNAP_THRESHOLD && dist < bestDxDist) {
                bestDxDist = dist;
                const offset = targetVal - dragVal;
                snappedX = draggedRect.left + offset;
                guides.push({ type: 'vertical', x: targetVal });
            }
        }

        // Horizontal snaps (Y axis)
        const yPairs = [
            [edges.top, t.top], [edges.top, t.bottom], [edges.top, t.centerY],
            [edges.bottom, t.top], [edges.bottom, t.bottom], [edges.bottom, t.centerY],
            [edges.centerY, t.top], [edges.centerY, t.bottom], [edges.centerY, t.centerY]
        ];

        for (const [dragVal, targetVal] of yPairs) {
            const dist = Math.abs(dragVal - targetVal);
            if (dist < SNAP_THRESHOLD && dist < bestDyDist) {
                bestDyDist = dist;
                const offset = targetVal - dragVal;
                snappedY = draggedRect.top + offset;
                guides.push({ type: 'horizontal', y: targetVal });
            }
        }
    }

    return { guides, snappedX, snappedY };
}

function renderSnapGuides(guides) {
    clearSnapGuides();
    const overlay = document.getElementById('visualOverlay');

    // Deduplicate
    const seen = new Set();
    guides.forEach(g => {
        const key = g.type + ':' + (g.x || g.y);
        if (seen.has(key)) return;
        seen.add(key);

        const line = document.createElement('div');
        line.className = 've-snap-guide ' + g.type;
        if (g.type === 'vertical') {
            line.style.left = g.x + 'px';
        } else {
            line.style.top = g.y + 'px';
        }
        overlay.appendChild(line);
    });
}

function clearSnapGuides() {
    const overlay = document.getElementById('visualOverlay');
    if (!overlay) return;
    overlay.querySelectorAll('.ve-snap-guide').forEach(g => g.remove());
}

// --- CSS Generation ---
function generateCSSForMove(element, dx, dy) {
    const cs = element.computedStyle;
    const parentCs = element.domRef.parentElement ?
        element.domRef.parentElement.ownerDocument.defaultView.getComputedStyle(element.domRef.parentElement) : null;
    const pos = cs.position;
    const rules = {};

    if (pos === 'absolute' || pos === 'fixed') {
        const curTop = parseFloat(cs.top) || 0;
        const curLeft = parseFloat(cs.left) || 0;
        rules['top'] = Math.round(curTop + dy) + 'px';
        rules['left'] = Math.round(curLeft + dx) + 'px';
    } else if (pos === 'relative') {
        const curTop = parseFloat(cs.top) || 0;
        const curLeft = parseFloat(cs.left) || 0;
        rules['top'] = Math.round(curTop + dy) + 'px';
        rules['left'] = Math.round(curLeft + dx) + 'px';
    } else if (parentCs && (parentCs.display.includes('flex') || parentCs.display.includes('grid'))) {
        // Flex/grid child: use margin
        const curMT = parseFloat(cs.marginTop) || 0;
        const curML = parseFloat(cs.marginLeft) || 0;
        if (Math.abs(dx) >= 1) rules['margin-left'] = Math.round(curML + dx) + 'px';
        if (Math.abs(dy) >= 1) rules['margin-top'] = Math.round(curMT + dy) + 'px';
    } else {
        // Static: convert to relative
        rules['position'] = 'relative';
        rules['top'] = Math.round(dy) + 'px';
        rules['left'] = Math.round(dx) + 'px';
    }

    return rules;
}

// --- CSS Selector ---
function generateSelector(el) {
    const iframeDoc = document.getElementById('previewFrame').contentDocument;

    // Priority 1: ID
    if (el.id) return '#' + el.id;

    // Priority 2: Unique class
    if (el.classList.length > 0) {
        const selector = '.' + [...el.classList].join('.');
        try {
            if (iframeDoc.querySelectorAll(selector).length === 1) return selector;
        } catch(e) {}
    }

    // Priority 3: Parent ID + tag.class
    if (el.classList.length > 0 && el.parentElement && el.parentElement.id) {
        return '#' + el.parentElement.id + ' ' + el.tagName.toLowerCase() + '.' + [...el.classList].join('.');
    }

    // Priority 4: nth-child path
    return buildNthChildPath(el, iframeDoc);
}

function buildNthChildPath(el, iframeDoc) {
    const parts = [];
    let current = el;
    while (current && current !== iframeDoc.body) {
        const parent = current.parentElement;
        if (!parent) break;
        if (current.id) {
            parts.unshift('#' + current.id);
            break;
        }
        const index = [...parent.children].indexOf(current) + 1;
        const tag = current.tagName.toLowerCase();
        parts.unshift(tag + ':nth-child(' + index + ')');
        current = parent;
    }
    return parts.join(' > ');
}

// --- Write CSS back to node ---
function writeCSSToNode(selector, rules) {
    // Access node via builder.js globals
    if (typeof getNode === 'undefined' || typeof currentEditNode === 'undefined') return;
    const node = getNode(currentEditNode);
    if (!node) return;

    // Save for undo
    lastCSS = node.css || '';

    // Check if selector already has a Visual Edit block — merge rules if so
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
    const regex = new RegExp('/\\* Visual Edit \\*/\\n' + escapedSelector + '\\s*\\{([^}]*)\\}', 'g');
    const match = regex.exec(node.css || '');

    if (match) {
        // Parse existing rules from the block
        const existingRules = {};
        match[1].split(';').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            const colonIdx = trimmed.indexOf(':');
            if (colonIdx === -1) return;
            const prop = trimmed.substring(0, colonIdx).trim();
            const val = trimmed.substring(colonIdx + 1).trim();
            if (prop) existingRules[prop] = val;
        });

        // Merge: new rules overwrite existing, but keep unmodified ones
        Object.assign(existingRules, rules);

        const mergedString = Object.entries(existingRules)
            .map(([prop, val]) => '    ' + prop + ': ' + val + ';')
            .join('\n');
        const mergedBlock = '/* Visual Edit */\n' + selector + ' {\n' + mergedString + '\n}';

        // Reset regex (exec advances lastIndex)
        const replaceRegex = new RegExp('/\\* Visual Edit \\*/\\n' + escapedSelector + '\\s*\\{[^}]*\\}', 'g');
        node.css = node.css.replace(replaceRegex, mergedBlock);
    } else {
        const ruleString = Object.entries(rules)
            .map(([prop, val]) => '    ' + prop + ': ' + val + ';')
            .join('\n');
        const newBlock = '/* Visual Edit */\n' + selector + ' {\n' + ruleString + '\n}';
        node.css = (node.css || '') + '\n\n' + newBlock;
    }

    if (typeof saveNodes === 'function') saveNodes();
    if (typeof updatePreview === 'function') updatePreview();
    if (typeof setStatus === 'function') setStatus('Visual edit applied');
}

// --- Delete/Hide element ---
function deleteSelectedElement() {
    if (!selectedElement) return;
    const rules = { 'display': 'none !important' };
    writeCSSToNode(selectedElement.selector, rules);
    clearSelection();
    showPropEmpty();
    if (typeof setStatus === 'function') setStatus('Element hidden (display: none)');
}

// --- Keyboard ---
function onVisualKeyDown(e) {
    if (!visualEditMode) return;

    // Tab: cycle through elements at current point
    if (e.key === 'Tab' && elementsAtPoint.length > 1) {
        e.preventDefault();
        if (e.shiftKey) {
            cycleIndex = (cycleIndex - 1 + elementsAtPoint.length) % elementsAtPoint.length;
        } else {
            cycleIndex = (cycleIndex + 1) % elementsAtPoint.length;
        }
        clearSelection();
        selectElement(elementsAtPoint[cycleIndex]);
        return;
    }

    // Delete/Backspace: hide element
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        // Don't delete if user is typing in a property panel input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        deleteSelectedElement();
        return;
    }

    if (!selectedElement) return;

    // Arrow keys: nudge
    const nudgeKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (nudgeKeys.includes(e.key)) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -amount;
        if (e.key === 'ArrowDown') dy = amount;
        if (e.key === 'ArrowLeft') dx = -amount;
        if (e.key === 'ArrowRight') dx = amount;

        const rules = generateCSSForMove(selectedElement, dx, dy);
        if (Object.keys(rules).length > 0) {
            writeCSSToNode(selectedElement.selector, rules);
        }
        showNudgeIndicator(dx, dy);
        return;
    }

    // Escape: deselect
    if (e.key === 'Escape') {
        clearSelection();
        showPropEmpty();
        return;
    }

    // Ctrl+Z: undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (lastCSS !== null) {
            const node = getNode(currentEditNode);
            if (node) {
                node.css = lastCSS;
                lastCSS = null;
                saveNodes();
                updatePreview();
                setStatus('Visual edit undone');
            }
        }
    }
}

function showNudgeIndicator(dx, dy) {
    let indicator = document.querySelector('.ve-nudge-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 've-nudge-indicator';
        document.body.appendChild(indicator);
    }
    const dir = dx !== 0 ? (dx > 0 ? '→' : '←') : (dy > 0 ? '↓' : '↑');
    const amount = Math.abs(dx || dy);
    indicator.textContent = dir + ' ' + amount + 'px';
    indicator.classList.add('visible');
    clearTimeout(indicator._hideTimer);
    indicator._hideTimer = setTimeout(() => indicator.classList.remove('visible'), 600);
}

// --- Property Panel ---
function showPropEmpty() {
    const panel = document.getElementById('propertyPanel');
    if (!panel) return;
    panel.innerHTML = `
        <div class="prop-header"><span class="prop-icon">⊞</span> Visual Editor</div>
        <div class="prop-empty">
            <div class="prop-empty-icon">◎</div>
            <div>Click any element in the preview to select it</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:8px;">
                Click same spot again to cycle through stacked elements<br>
                Tab / Shift+Tab to cycle elements · Drag to move<br>
                Arrow keys to nudge (Shift for 10px)<br>
                Delete to hide element · Esc to deselect · Cmd+Z undo
            </div>
        </div>
    `;
}

function populatePropertyPanel(el, cs, selector, rect) {
    const panel = document.getElementById('propertyPanel');
    if (!panel) return;

    const tag = el.tagName.toLowerCase();
    const pos = cs.position;
    const display = cs.display;

    // Show cycle info if multiple elements at point
    const cycleInfo = elementsAtPoint.length > 1
        ? `<div class="prop-cycle-info">${cycleIndex + 1} of ${elementsAtPoint.length} elements at point — click again or Tab to cycle</div>`
        : '';

    panel.innerHTML = `
        <div class="prop-header"><span class="prop-icon">⊞</span> Element</div>

        ${cycleInfo}

        <div class="prop-section">
            <div class="prop-section-title">Selector</div>
            <div class="prop-selector">${selector}</div>
            <div class="prop-row">
                <span class="prop-label">Tag</span>
                <span class="prop-value readonly">${tag}</span>
            </div>
        </div>

        <div class="prop-section">
            <div class="prop-section-title">Position</div>
            <div class="prop-row">
                <span class="prop-label">Position</span>
                <span class="prop-value readonly">${pos}</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">Top</span>
                <input class="prop-value" type="number" data-prop="top" value="${Math.round(parseFloat(cs.top) || 0)}" />
                <span class="prop-label" style="min-width:30px">Left</span>
                <input class="prop-value" type="number" data-prop="left" value="${Math.round(parseFloat(cs.left) || 0)}" />
            </div>
        </div>

        <div class="prop-section">
            <div class="prop-section-title">Size</div>
            <div class="prop-row">
                <span class="prop-label">Width</span>
                <input class="prop-value" type="number" data-prop="width" value="${Math.round(rect.width)}" />
                <span class="prop-label" style="min-width:30px">Height</span>
                <input class="prop-value" type="number" data-prop="height" value="${Math.round(rect.height)}" />
            </div>
        </div>

        <div class="prop-section">
            <div class="prop-section-title">Spacing</div>
            <div class="box-model">
                <span class="box-model-label margin-label">margin</span>
                <div class="box-model-margin">
                    <div><span class="box-model-value" data-prop="margin-top">${parseInt(cs.marginTop) || 0}</span></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span class="box-model-value" data-prop="margin-left">${parseInt(cs.marginLeft) || 0}</span>
                        <span class="box-model-label padding-label" style="position:static;">padding</span>
                        <span class="box-model-value" data-prop="margin-right">${parseInt(cs.marginRight) || 0}</span>
                    </div>
                    <div class="box-model-padding">
                        <div><span class="box-model-value" data-prop="padding-top">${parseInt(cs.paddingTop) || 0}</span></div>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span class="box-model-value" data-prop="padding-left">${parseInt(cs.paddingLeft) || 0}</span>
                            <div class="box-model-content">${Math.round(rect.width)} × ${Math.round(rect.height)}</div>
                            <span class="box-model-value" data-prop="padding-right">${parseInt(cs.paddingRight) || 0}</span>
                        </div>
                        <div><span class="box-model-value" data-prop="padding-bottom">${parseInt(cs.paddingBottom) || 0}</span></div>
                    </div>
                    <div><span class="box-model-value" data-prop="margin-bottom">${parseInt(cs.marginBottom) || 0}</span></div>
                </div>
            </div>
        </div>

        <div class="prop-section">
            <div class="prop-section-title">Layout</div>
            <div class="prop-row">
                <span class="prop-label">Display</span>
                <span class="prop-value readonly">${display}</span>
            </div>
            ${display.includes('flex') ? `
            <div class="prop-row">
                <span class="prop-label">Direction</span>
                <span class="prop-value readonly">${cs.flexDirection}</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">Gap</span>
                <input class="prop-value" type="number" data-prop="gap" value="${parseInt(cs.gap) || 0}" />
            </div>
            ` : ''}
        </div>

        ${hasTextContent(el) ? `
        <div class="prop-section">
            <div class="prop-section-title">Typography</div>
            <div class="prop-row">
                <span class="prop-label">Font</span>
                <select class="prop-value prop-select" data-prop="font-family">
                    <option value="'Helvetica Neue', Helvetica, Arial, sans-serif" ${cs.fontFamily.includes('Helvetica') ? 'selected' : ''}>Helvetica Neue</option>
                    <option value="Georgia, 'Times New Roman', serif" ${cs.fontFamily.includes('Georgia') ? 'selected' : ''}>Georgia</option>
                    <option value="'Courier New', monospace" ${cs.fontFamily.includes('Courier') ? 'selected' : ''}>Courier New</option>
                    <option value="Arial, sans-serif" ${cs.fontFamily.includes('Arial') && !cs.fontFamily.includes('Helvetica') ? 'selected' : ''}>Arial</option>
                    <option value="inherit">Inherit</option>
                </select>
            </div>
            <div class="prop-row">
                <span class="prop-label">Size</span>
                <input class="prop-value" type="number" data-prop="font-size" value="${parseInt(cs.fontSize) || 14}" />
                <span class="prop-unit">px</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">Weight</span>
                <select class="prop-value prop-select" data-prop="font-weight">
                    <option value="100" ${cs.fontWeight === '100' ? 'selected' : ''}>100 Thin</option>
                    <option value="300" ${cs.fontWeight === '300' ? 'selected' : ''}>300 Light</option>
                    <option value="400" ${cs.fontWeight === '400' ? 'selected' : ''}>400 Regular</option>
                    <option value="500" ${cs.fontWeight === '500' ? 'selected' : ''}>500 Medium</option>
                    <option value="600" ${cs.fontWeight === '600' ? 'selected' : ''}>600 Semi</option>
                    <option value="700" ${cs.fontWeight === '700' ? 'selected' : ''}>700 Bold</option>
                    <option value="800" ${cs.fontWeight === '800' ? 'selected' : ''}>800 Extra</option>
                    <option value="900" ${cs.fontWeight === '900' ? 'selected' : ''}>900 Black</option>
                </select>
            </div>
            <div class="prop-row">
                <span class="prop-label">Line H</span>
                <input class="prop-value" type="number" data-prop="line-height" value="${Math.round(parseFloat(cs.lineHeight)) || 0}" step="1" />
                <span class="prop-unit">px</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">Spacing</span>
                <input class="prop-value" type="number" data-prop="letter-spacing" value="${parseFloat(cs.letterSpacing) || 0}" step="0.5" />
                <span class="prop-unit">px</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">Color</span>
                <input class="prop-value prop-color" type="color" data-prop="color" value="${rgbToHex(cs.color)}" />
                <span class="prop-value readonly" style="flex:2;font-size:10px;">${cs.color}</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">Transform</span>
                <select class="prop-value prop-select" data-prop="text-transform">
                    <option value="none" ${cs.textTransform === 'none' ? 'selected' : ''}>none</option>
                    <option value="uppercase" ${cs.textTransform === 'uppercase' ? 'selected' : ''}>UPPERCASE</option>
                    <option value="lowercase" ${cs.textTransform === 'lowercase' ? 'selected' : ''}>lowercase</option>
                    <option value="capitalize" ${cs.textTransform === 'capitalize' ? 'selected' : ''}>Capitalize</option>
                </select>
            </div>
        </div>
        ` : ''}

        <div class="prop-section">
            <div class="prop-section-title">Actions</div>
            <div class="prop-actions">
                <button class="prop-action-btn danger" onclick="deleteSelectedElement()">Hide Element</button>
            </div>
        </div>

        <div class="prop-section">
            <div class="prop-section-title">Generated CSS</div>
            <div class="prop-css-preview" id="propCSSPreview">/* Select and move an element to see generated CSS */</div>
        </div>
    `;

    // Attach input listeners for editable fields (number inputs)
    panel.querySelectorAll('input.prop-value[type="number"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const prop = e.target.dataset.prop;
            const val = e.target.value;
            if (!prop || !selectedElement) return;

            const rules = {};
            if (prop === 'width' || prop === 'height') {
                rules[prop] = val + 'px';
            } else if (prop === 'top' || prop === 'left') {
                if (cs.position === 'static') rules['position'] = 'relative';
                rules[prop] = val + 'px';
            } else if (prop === 'gap') {
                rules[prop] = val + 'px';
            } else if (prop.startsWith('margin') || prop.startsWith('padding')) {
                rules[prop] = val + 'px';
            } else if (prop === 'font-size' || prop === 'line-height') {
                rules[prop] = val + 'px';
            } else if (prop === 'letter-spacing') {
                rules[prop] = val + 'px';
            }

            if (Object.keys(rules).length > 0) {
                writeCSSToNode(selectedElement.selector, rules);
            }
        });
    });

    // Attach listeners for select dropdowns
    panel.querySelectorAll('select.prop-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const prop = e.target.dataset.prop;
            const val = e.target.value;
            if (!prop || !selectedElement) return;
            const rules = {};
            rules[prop] = val;
            writeCSSToNode(selectedElement.selector, rules);
        });
    });

    // Attach listeners for color inputs
    panel.querySelectorAll('input.prop-color').forEach(input => {
        input.addEventListener('input', (e) => {
            const prop = e.target.dataset.prop;
            const val = e.target.value;
            if (!prop || !selectedElement) return;
            const rules = {};
            rules[prop] = val;
            writeCSSToNode(selectedElement.selector, rules);
        });
    });
}

// --- Typography helpers ---
function hasTextContent(el) {
    // Check if element or its immediate children have text
    const text = el.textContent || '';
    if (text.trim().length === 0) return false;
    const tag = el.tagName.toLowerCase();
    const textTags = ['span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button',
                       'label', 'li', 'td', 'th', 'div', 'section', 'footer', 'header', 'nav'];
    return textTags.includes(tag);
}

function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent') return '#000000';
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return '#000000';
    const r = parseInt(match[0]).toString(16).padStart(2, '0');
    const g = parseInt(match[1]).toString(16).padStart(2, '0');
    const b = parseInt(match[2]).toString(16).padStart(2, '0');
    return '#' + r + g + b;
}

// --- onPreviewLoaded (called from builder.js) ---
function onPreviewLoaded() {
    if (!visualEditMode) return;
    scanElements();

    if (selectedSelector) {
        const iframeDoc = document.getElementById('previewFrame').contentDocument;
        if (iframeDoc) {
            try {
                const el = iframeDoc.querySelector(selectedSelector);
                if (el) {
                    selectElement(el);
                    return;
                }
            } catch(e) {}
        }
    }
    clearSelection();
    showPropEmpty();
}

// Boot
document.addEventListener('DOMContentLoaded', initVisualEditor);

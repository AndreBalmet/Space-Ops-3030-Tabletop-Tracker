/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ============================================================
// DATA HELPERS
// ============================================================
const DATA = window.SPACE_OPS_DATA;

const num = (v) => {
  if (v === '' || v == null) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const isLeader = (m) => /\(Leader\)/i.test((m && m.name) || '');

// Strip "(Leader)" suffix for display. Null-safe so orphan assets (modelId
// that no longer resolves after a data refresh) don't crash the renderer.
const displayName = (m) => ((m && m.name) || '').replace(/\s*\(Leader\)\s*/i, '').trim();

// Look up a model by id
const findModel = (id) => DATA.models.find((m) => m.id === id || String(m.id) === String(id));

// Look up weapon by name
const findWeapon = (name) => DATA.weapons.find((w) => (w.name || '').trim() === (name || '').trim());
const findEquipment = (name) => DATA.equipment.find((e) => (e.name || '').trim() === (name || '').trim());

// Pill category from a weapon/equipment record
const pillCategory = (item) => {
  if (!item) return 'empty';
  if (item.weaponType) {
    if (/melee/i.test(item.weaponType)) return 'melee';
    return 'ranged'; // ranged + vehicle ranged
  }
  if (item.equipmentType) {
    if (/cyber/i.test(item.equipmentType)) return 'cybertech';
    return 'equipment';
  }
  return 'equipment';
};

// Parse a model's free loadout into a list of equipment items.
const parseLoadout = (m) => {
  if (!m || !m.loadout) return [];
  return String(m.loadout)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

// Compute asset's rating including equipped items.
const assetRating = (asset) => {
  const m = findModel(asset.modelId);
  if (!m) return 0;
  let r = num(m.rating);
  for (const slot of asset.slots || []) {
    if (slot && slot.kind === 'weapon') r += num(findWeapon(slot.name)?.rating);
    if (slot && slot.kind === 'equipment') r += num(findEquipment(slot.name)?.rating);
  }
  return r;
};

const teamRating = (team) =>
  (team.assets || []).reduce((sum, a) => sum + assetRating(a), 0);

// Asset bucket for grouping (Leader vs Operator vs Support)
const assetBucket = (asset) => {
  const m = findModel(asset.modelId);
  if (!m) return 'support';
  if (isLeader(m)) return 'leader';
  if (/support/i.test(m.assetType || '')) return 'support';
  return 'operator';
};

const BUCKETS = [
  { key: 'leader', label: 'Operator Leader', singular: true },
  { key: 'operator', label: 'Operator Assets', singular: false },
  { key: 'support', label: 'Support Assets', singular: false },
];

// Make an asset instance for a model
let nextInstanceId = 1;
const makeAsset = (modelId) => {
  const m = findModel(modelId);
  const slots = Array.from({ length: num(m?.totalSlots) || 0 }, () => null);
  return { instanceId: ++nextInstanceId, modelId, slots };
};

// ============================================================
// PERSISTENCE (localStorage)
// ============================================================
const SAVED_TEAMS_KEY = 'spaceops.teams.v1';
const CURRENT_TEAM_KEY = 'spaceops.current.v1';
const PLAYER_KEY = 'spaceops.player.v1';
const ADMIN_KEY = 'spaceops.isAdmin.v1';
const SCREEN_KEY = 'spaceops.screen.v1';

// Aliases for faction names that drifted from canonical spelling at some
// point. Apply at every read boundary (localStorage, FB) so a stale id on
// a player's iPad auto-migrates the next time the team loads. Mapping is
// one-way: alias -> canonical. The canonical spelling is "Maligeist" (with
// an 'i'). A short-lived v15.0.3 release flipped it to "Malegeist" before
// the canonical spelling was confirmed, so the alias migrates anything
// saved under that release back to the right name.
const FACTION_ID_ALIASES = {
  'Malegeist': 'Maligeist',
};
const normalizeFactionId = (id) => (id && FACTION_ID_ALIASES[id]) || id;
const normalizeTeamFaction = (t) => {
  if (!t || typeof t !== 'object') return t;
  const fixed = normalizeFactionId(t.factionId);
  return fixed === t.factionId ? t : { ...t, factionId: fixed };
};

const loadSavedTeams = () => {
  try {
    const arr = JSON.parse(localStorage.getItem(SAVED_TEAMS_KEY) || '[]');
    return Array.isArray(arr) ? arr.map(normalizeTeamFaction) : [];
  } catch { return []; }
};
const writeSavedTeams = (arr) => {
  localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(arr));
};
const loadCurrent = () => {
  try { return normalizeTeamFaction(JSON.parse(localStorage.getItem(CURRENT_TEAM_KEY) || 'null')); } catch { return null; }
};
const writeCurrent = (team) => {
  if (team) localStorage.setItem(CURRENT_TEAM_KEY, JSON.stringify(team));
  else localStorage.removeItem(CURRENT_TEAM_KEY);
};

// ============================================================
// PDF EXPORT — jsPDF-driven, ported from the live tracker so the output
// matches the //SPACE-OPS 3030/ROSTER sheet (US Letter portrait, 2×3 cards/pg).
// ============================================================
function exportTeamToPDF(team, player) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF library still loading — please try again in a moment.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('portrait', 'mm', 'letter');

  const pw = 215.9, ph = 279.4; // US Letter mm
  const mx = 10, my = 10;
  const cols = 2, rows = 3;
  const gap = 6;
  const cardW = (pw - mx * 2 - gap) / cols;
  const headerH = 28;
  const cardH = (ph - my - headerH - my - gap * (rows - 1)) / rows;

  const assets = team.assets || [];
  const totalPts = assets.reduce((s, a) => s + assetRating(a), 0);
  const perPage = cols * rows;
  const totalPages = Math.max(1, Math.ceil(assets.length / perPage));

  function drawHeader() {
    // Hatch box top-left
    const hatchW = 22, hatchH = 18;
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.rect(mx, my, hatchW, hatchH);
    doc.setLineWidth(0.4);
    for (let i = 0; i < hatchW + hatchH; i += 3) {
      const x1 = mx + Math.min(i, hatchW);
      const y1 = my + Math.max(0, i - hatchW);
      const x2 = mx + Math.max(0, i - hatchH);
      const y2 = my + Math.min(i, hatchH);
      doc.line(x1, y2, x2, y1);
    }
    // Barcode bars
    const bx = mx + hatchW + 4, by = my + 2;
    doc.setLineWidth(0.6);
    const barWidths = [1,2,1,3,1,2,1,1,3,1,2,1,1,2,3,1,1,2,1,3,1,2,1,1,2,1,3,1,2];
    let bPos = 0;
    barWidths.forEach((w, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(0);
        doc.rect(bx + bPos, by, w * 0.8, 10, 'F');
      }
      bPos += w * 0.8;
    });
    // Title
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0);
    doc.text('//SPACE-OPS 3030/ROSTER', bx, by + 16);
    // Player / Faction
    const infoX = pw / 2 + 5;
    doc.setLineWidth(1.5);
    doc.line(infoX - 2, my + 2, infoX - 2, my + headerH - 4);
    doc.setLineWidth(0.3);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('PLAYER:', infoX, my + 6);
    doc.text('FACTION:', infoX, my + 13);
    doc.text('TEAM:', infoX, my + 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(player || '', infoX + 20, my + 6);
    doc.text(team.factionId || '', infoX + 22, my + 13);
    doc.text(team.name || '', infoX + 14, my + 20);
    // Rating
    doc.setLineWidth(1.5);
    const ptX = pw - mx - 30;
    doc.line(ptX - 2, my + 2, ptX - 2, my + headerH - 4);
    doc.setLineWidth(0.3);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('RATING', ptX, my + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
    doc.text(String(totalPts), ptX, my + 14);
  }

  function drawCard(asset, cx, cy) {
    const m = findModel(asset.modelId);
    if (!m) return;
    const pad = 4;
    // Border
    doc.setDrawColor(0); doc.setLineWidth(0.8);
    doc.rect(cx, cy, cardW, cardH);
    // MODEL + HEALTH
    let y = cy + pad + 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0);
    doc.text('MODEL:', cx + pad, y);
    doc.setFontSize(10);
    doc.text(displayName(m), cx + pad + 18, y);
    doc.setFontSize(8);
    doc.text('HEALTH', cx + cardW - pad - 1, y, { align: 'right' });
    const hbW = 14, hbH = 7;
    doc.setLineWidth(0.3);
    doc.rect(cx + cardW - pad - hbW, y + 2, hbW, hbH);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(String(m.health || ''), cx + cardW - pad - hbW / 2, y + 7, { align: 'center' });
    y += 12;
    // Stat boxes — SPEED SHOOT FIGHT DEFENSE GRIT
    const statLabels = ['SPEED', 'SHOOT', 'FIGHT', 'DEFENSE', 'GRIT'];
    const statKeys = ['speed', 'shoot', 'fight', 'defense', 'grit'];
    const n = statLabels.length;
    const boxW = (cardW - pad * 2 - (n - 1) * 2) / n;
    const boxH = 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(0);
    for (let si = 0; si < n; si++) {
      const bx = cx + pad + si * (boxW + 2);
      doc.text(statLabels[si], bx + boxW / 2, y, { align: 'center' });
    }
    y += 3;
    for (let si = 0; si < n; si++) {
      const bx = cx + pad + si * (boxW + 2);
      doc.setFillColor(40, 40, 40);
      doc.rect(bx, y, boxW, boxH, 'F');
      const val = m[statKeys[si]];
      if (val !== undefined && val !== '') {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(String(val), bx + boxW / 2, y + boxH - 3, { align: 'center' });
      }
    }
    doc.setTextColor(0);
    y += boxH + 5;
    // STANDARD EQUIPMENT (loadout + FB default weapons)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text('STANDARD EQUIPMENT:', cx + pad, y);
    y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const std = []
      .concat(asset.defaults?.weapons || [])
      .concat(parseLoadout(m))
      .filter((v, i, a) => v && a.indexOf(v) === i)
      .join(', ');
    if (std) {
      const lines = doc.splitTextToSize(std, cardW - pad * 2);
      doc.text(lines.slice(0, 2), cx + pad, y);
      y += 4 * Math.min(lines.length, 2);
    } else {
      doc.setDrawColor(180); doc.setLineWidth(0.2);
      doc.line(cx + pad, y + 1, cx + cardW - pad, y + 1);
      y += 5;
    }
    y += 2;
    // GEAR slots — show purchased extras in a 2×2 grid (pad to 4)
    const gearItems = (asset.slots || []).filter((s) => s && s.name).map((s) => s.name);
    while (gearItems.length < 4) gearItems.push('');
    const halfW = (cardW - pad * 2 - 4) / 2;
    for (let gi = 0; gi < 4; gi++) {
      const gCol = gi % 2;
      const gRow = Math.floor(gi / 2);
      const gx = cx + pad + gCol * (halfW + 4);
      const gy = y + gRow * 12;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(0);
      doc.text('GEAR:', gx, gy);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      if (gearItems[gi]) doc.text(gearItems[gi], gx + 13, gy);
      doc.setDrawColor(180); doc.setLineWidth(0.2);
      doc.line(gx + 13, gy + 1, gx + halfW, gy + 1);
    }
  }

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    drawHeader();
    for (let ci = 0; ci < perPage; ci++) {
      const idx = page * perPage + ci;
      if (idx >= assets.length) break;
      const col = ci % cols;
      const row = Math.floor(ci / cols);
      const cx = mx + col * (cardW + gap);
      const cy = my + headerH + row * (cardH + gap);
      drawCard(assets[idx], cx, cy);
    }
  }

  const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
  const fileName = `${safe(player || 'Team')}_${safe(team.name || team.factionId || 'Roster')}.pdf`;
  doc.save(fileName);
}

// ============================================================
// FIREBASE BRIDGE (read-only — surfaces live tracker's saved teams)
// ============================================================
const FIREBASE_DB_URL = 'https://space-ops-3030-default-rtdb.firebaseio.com';

// Pull the *live* game data from Firebase /gameData (set by admins via XLSX
// upload in the legacy tracker). Mutates window.SPACE_OPS_DATA in place so the
// DATA constant captured at module load reflects fresh values without needing
// to rewrite every component reference. Falls back to the bundled static
// snapshot in space-ops-data.js if Firebase is unreachable.
async function loadGameDataFromFirebase() {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/gameData.json`);
    if (!res.ok) {
      console.warn('[gameData] firebase HTTP', res.status, '— using bundled fallback');
      return false;
    }
    const fb = await res.json();
    if (!fb || typeof fb !== 'object') return false;

    // Firebase model schema uses `carryCapacity` where the app expects
    // `totalSlots`; mirror the field so existing code keeps working.
    // Also: XLSX uploads don't include an `id` column, so every model arrives
    // with id: '' — which collapses findModel() onto the first array entry
    // (Ranger-Captain). Fall back to the unique `name` as the id when missing.
    const normalizeModel = (m) => {
      if (!m || typeof m !== 'object') return m;
      const out = { ...m };
      if (out.totalSlots == null && out.carryCapacity != null) out.totalSlots = out.carryCapacity;
      if (out.id === '' || out.id == null) out.id = out.name;
      return out;
    };

    const target = window.SPACE_OPS_DATA;
    if (Array.isArray(fb.factions))         target.factions = fb.factions;
    if (Array.isArray(fb.models))           target.models = fb.models.map(normalizeModel);
    if (Array.isArray(fb.weapons))          target.weapons = fb.weapons;
    if (Array.isArray(fb.equipment))        target.equipment = fb.equipment;
    if (Array.isArray(fb.traits))           target.traits = fb.traits;
    if (Array.isArray(fb.actions))          target.actions = fb.actions;
    if (Array.isArray(fb.actionCategories)) target.actionCategories = fb.actionCategories;
    if (Array.isArray(fb.conditions))       target.conditions = fb.conditions;
    target._version = (target._version || 0) + 1;
    target._lastUpdated = fb.lastUpdated;
    console.log('[gameData] loaded from Firebase', {
      factions: target.factions.length,
      models: target.models.length,
      weapons: target.weapons.length,
      equipment: target.equipment.length,
      traits: target.traits.length,
      lastUpdated: fb.lastUpdated,
    });
    return true;
  } catch (err) {
    console.warn('[gameData] firebase fetch failed — using bundled fallback:', err);
    return false;
  }
}

async function fetchFirebaseTeams(playerName) {
  if (!playerName) return [];
  try {
    const url = `${FIREBASE_DB_URL}/players/${encodeURIComponent(playerName)}/teams.json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data) return [];
    return Object.entries(data).map(([fbId, fbTeam]) => convertFbTeam(fbId, fbTeam));
  } catch (err) {
    console.warn('[fb] fetch failed:', err);
    return [];
  }
}

// Strip the 'fb-' prefix `convertFbTeam` adds when loading, so saving back to
// Firebase writes to the original path and doesn't create a duplicate entry.
const stripFbPrefix = (id) => (typeof id === 'string' && id.startsWith('fb-')) ? id.slice(3) : id;

// Reverse of `convertFbTeam` — pack a local team object into the legacy
// tracker's `/players/<player>/teams/<id>` shape so iPad ↔ laptop ↔ legacy
// tracker can all see the same teams. We split each asset's slots back into
// `weapons` and `inventory` by kind; `defaults.weapons` / `defaults.equipment`
// (the free loadout the model ships with) round-trip via the same field names.
function convertTeamToFb(team) {
  return {
    name: team.name || 'Untitled',
    faction: team.factionId || 'Arc Rangers',
    created: team.createdAt || Date.now(),
    modified: Date.now(),
    models: (team.assets || []).map((a) => {
      const m = findModel(a.modelId);
      const weapons = (a.slots || []).filter((s) => s && s.kind === 'weapon').map((s) => s.name);
      const inventory = (a.slots || []).filter((s) => s && s.kind === 'equipment').map((s) => s.name);
      const out = {
        name: (m && m.name) || a.modelId,
        weapons,
        inventory,
        defaultWeapons: (a.defaults && Array.isArray(a.defaults.weapons)) ? a.defaults.weapons : [],
        defaultInventory: (a.defaults && Array.isArray(a.defaults.equipment)) ? a.defaults.equipment : [],
      };
      // Persist the per-asset custom name (the rename in Team View). Uses the
      // same `customName` field the legacy tracker reads/writes, so the name
      // round-trips through Firebase and shows on every device. Omitted when
      // unset so Firebase doesn't store empty strings.
      if (a.customName) out.customName = a.customName;
      return out;
    }),
  };
}

async function saveTeamToFirebase(player, team) {
  if (!player || !team || !team.id) return false;
  const fbId = stripFbPrefix(team.id);
  const url = `${FIREBASE_DB_URL}/players/${encodeURIComponent(player)}/teams/${encodeURIComponent(fbId)}.json`;
  try {
    const res = await fetch(url, { method: 'PUT', body: JSON.stringify(convertTeamToFb(team)) });
    return res.ok;
  } catch (err) {
    console.warn('[fb] team save failed:', err);
    return false;
  }
}

async function deleteTeamFromFirebase(player, teamId) {
  if (!player || !teamId) return false;
  const fbId = stripFbPrefix(teamId);
  const url = `${FIREBASE_DB_URL}/players/${encodeURIComponent(player)}/teams/${encodeURIComponent(fbId)}.json`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('[fb] team delete failed:', err);
    return false;
  }
}

function convertFbTeam(fbId, fb) {
  const factionId = normalizeFactionId(fb.faction || 'Arc Rangers');
  const fbModels = Array.isArray(fb.models) ? fb.models : [];
  const assets = [];
  for (const fbm of fbModels) {
    if (!fbm || !fbm.name) continue;
    const def = DATA.models.find((m) => m.name === fbm.name)
      || DATA.models.find((m) => (m.name || '').toLowerCase() === (fbm.name || '').toLowerCase());
    if (!def) {
      console.warn('[fb] unknown model (skipped):', fbm.name);
      continue;
    }
    const totalSlots = num(def.totalSlots) || 0;
    const slots = Array.from({ length: totalSlots }, () => null);
    const defaultInv = Array.isArray(fbm.defaultInventory) ? fbm.defaultInventory : [];
    const defaultWep = Array.isArray(fbm.defaultWeapons) ? fbm.defaultWeapons : [];
    const defaultInvSet = new Set(defaultInv);
    const defaultWepSet = new Set(defaultWep);
    // Live tracker stores some items in BOTH weapons[] and inventory[] (e.g. grenades,
    // cyberdecks). Dedup by name, then classify each via the gameData lookup.
    const seen = new Set();
    const itemNames = [];
    const collect = (src, defaults) => {
      if (!Array.isArray(src)) return;
      for (const v of src) {
        const name = (typeof v === 'string' ? v : v?.name) || '';
        if (!name || defaults.has(name) || seen.has(name)) continue;
        seen.add(name);
        itemNames.push(name);
      }
    };
    collect(fbm.weapons, defaultWepSet);
    collect(fbm.inventory, defaultInvSet);
    let slotIdx = 0;
    for (const name of itemNames) {
      if (slotIdx >= totalSlots) break;
      const kind = findWeapon(name) ? 'weapon' : (findEquipment(name) ? 'equipment' : null);
      if (!kind) continue;
      slots[slotIdx++] = { kind, name };
    }
    assets.push({
      instanceId: ++nextInstanceId,
      modelId: def.id,
      slots,
      // Preserve free defaults so the view page can render the full model loadout.
      defaults: { weapons: defaultWep, equipment: defaultInv },
      // Restore the per-asset custom name (rename in Team View). Ignore a
      // customName that just echoes the model's own name — that's the legacy
      // tracker's default, not a real rename.
      ...(fbm.customName && fbm.customName !== def.name ? { customName: fbm.customName } : {}),
    });
  }
  return {
    id: 'fb-' + fbId,
    name: fb.name || 'Untitled',
    factionId,
    assets,
    createdAt: fb.created || Date.now(),
    savedAt: fb.modified || fb.created,
    _source: 'firebase',
  };
}

// ============================================================
// ROOT APP
// ============================================================
function App({ dataVersion }) {
  // dataVersion is unused directly but its presence as a prop causes App to
  // re-render whenever AppRoot bumps it (i.e. when admin pushes new XLSX
  // gameData). That cascade re-runs every child's render and useMemo deps.
  void dataVersion;
  // Restore screen + team from localStorage on mount so page refreshes
  // (incl. iPad pull-to-refresh) don't wipe in-progress work like
  // customNames. Falls back to 'home' if no current team is saved.
  const [screen, setScreen] = useState(() => {
    const stored = localStorage.getItem(SCREEN_KEY);
    if (stored !== 'builder' && stored !== 'view') return 'home';
    // Only honor a non-home screen if a current team is actually saved.
    return loadCurrent() ? stored : 'home';
  }); // 'home' | 'builder' | 'view'
  const [player, setPlayer] = useState(() => localStorage.getItem(PLAYER_KEY) || '');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(ADMIN_KEY) === 'true');
  const [team, setTeam] = useState(() => {
    const cur = loadCurrent();
    if (!cur || !Array.isArray(cur.assets)) return null;
    // Asset instanceIds need to be fresh per session (nextInstanceId is
    // module-scoped and resets on reload). Also drop orphan assets whose
    // modelId no longer resolves — happens to anyone whose team was saved
    // while every Firebase model had id:'' (the bug fixed in this revision),
    // since their assets all carry modelId:''.
    const hydrated = cur.assets
      .filter((a) => !!findModel(a.modelId))
      .map((a) => ({ ...a, instanceId: ++nextInstanceId }));
    const dropped = cur.assets.length - hydrated.length;
    if (dropped > 0) console.warn(`[team] dropped ${dropped} orphan asset(s) on restore`);
    return { ...cur, assets: hydrated };
  });
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // {kind:'load'} | {kind:'login'}
  const [firebaseTeams, setFirebaseTeams] = useState(null); // null = loading, [] = empty

  useEffect(() => {
    if (player) localStorage.setItem(PLAYER_KEY, player);
    else localStorage.removeItem(PLAYER_KEY);
    if (isAdmin) localStorage.setItem(ADMIN_KEY, 'true');
    else localStorage.removeItem(ADMIN_KEY);
  }, [player]);
  useEffect(() => {
    if (team) writeCurrent(team);
  }, [team]);
  useEffect(() => {
    // Auto-save: every team change is debounced 500ms and written into
    // localStorage's savedTeams list so an in-progress team survives a
    // refresh / pull-to-refresh, even without an explicit Save Team click.
    // Firebase is NOT touched here — the user has to click Save Team for
    // their work to publish to the cloud. The login/online backfill picks
    // up anything that's saved locally but missing from Firebase.
    if (!team) return;
    const handle = setTimeout(() => {
      const list = loadSavedTeams();
      const idx = list.findIndex((t) => t.id === team.id);
      const snapshot = { ...team, savedAt: Date.now() };
      if (idx >= 0) list[idx] = snapshot;
      else list.unshift(snapshot);
      writeSavedTeams(list);
    }, 500);
    return () => clearTimeout(handle);
  }, [team]);
  useEffect(() => {
    // Persist screen so refreshes return the user to where they were.
    if (screen === 'home') localStorage.removeItem(SCREEN_KEY);
    else localStorage.setItem(SCREEN_KEY, screen);
  }, [screen]);
  useEffect(() => {
    // Defensive: if team somehow becomes null while on a team-only screen,
    // fall back to home so the UI doesn't render with missing data.
    if (!team && screen !== 'home') setScreen('home');
  }, [team, screen]);
  useEffect(() => {
    if (!player) { setFirebaseTeams([]); return; }
    let cancelled = false;
    setFirebaseTeams(null);
    fetchFirebaseTeams(player).then((teams) => { if (!cancelled) setFirebaseTeams(teams); });
    return () => { cancelled = true; };
  }, [player]);
  // Backfill: push any local team that isn't yet on Firebase. Returns the
  // number pushed. Idempotent — running it repeatedly is safe. Used in two
  // places: on player login (in-effect below) and on `online` event (so a
  // team built while offline syncs as soon as connection returns).
  const runBackfill = useCallback(async () => {
    if (!player || !navigator.onLine) return 0;
    const local = loadSavedTeams();
    if (local.length === 0) return 0;
    const fbTeams = await fetchFirebaseTeams(player);
    const fbIds = new Set(fbTeams.map((t) => stripFbPrefix(t.id)));
    const toPush = local.filter((t) => !fbIds.has(stripFbPrefix(t.id)));
    if (toPush.length === 0) return 0;
    let pushed = 0;
    await Promise.all(toPush.map((t) => saveTeamToFirebase(player, t).then((ok) => { if (ok) pushed++; })));
    console.log(`[fb] backfilled ${pushed}/${toPush.length} local-only teams to /players/${player}/teams`);
    if (pushed > 0) {
      const refreshed = await fetchFirebaseTeams(player);
      setFirebaseTeams(refreshed);
    }
    return pushed;
  }, [player]);

  useEffect(() => {
    // On player login, run backfill once.
    if (!player) return;
    runBackfill().catch((err) => console.warn('[fb] backfill failed:', err));
  }, [player, runBackfill]);

  useEffect(() => {
    // On connection regained (offline → online), re-run backfill so a team
    // built/saved offline syncs up as soon as the network's back. Also
    // refreshes firebaseTeams in case other devices added new teams while
    // this one was offline.
    const onOnline = () => {
      if (player) {
        runBackfill().catch((err) => console.warn('[fb] online backfill failed:', err));
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [player, runBackfill]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  // --- Team actions ---
  const newTeam = () => {
    const t = {
      id: 'team-' + Date.now(),
      name: 'New Company',
      factionId: 'Arc Rangers',
      assets: [],
      createdAt: Date.now(),
    };
    setTeam(t);
    setScreen('builder');
  };

  const loadTeam = (saved) => {
    // Re-instance loaded assets
    setTeam({ ...saved, assets: (saved.assets || []).map((a) => ({ ...a, instanceId: ++nextInstanceId })) });
    setScreen('builder');
    setModal(null);
  };

  const saveTeam = () => {
    if (!team) return;
    const list = loadSavedTeams();
    const idx = list.findIndex((t) => t.id === team.id);
    const snapshot = { ...team, savedAt: Date.now() };
    if (idx >= 0) list[idx] = snapshot; else list.unshift(snapshot);
    writeSavedTeams(list);
    // Push to Firebase. This is the ONLY path that publishes to the cloud
    // during normal use — auto-save no longer touches FB. After a
    // successful push, refresh the in-memory firebaseTeams list so the
    // Load Team modal shows the new "Cloud" badge immediately.
    if (player && navigator.onLine) {
      saveTeamToFirebase(player, snapshot).then(async (ok) => {
        if (ok) {
          showToast('Team saved (synced to cloud)');
          const refreshed = await fetchFirebaseTeams(player);
          setFirebaseTeams(refreshed);
        } else {
          showToast('Team saved locally — cloud sync failed');
        }
      });
    } else if (player) {
      // Offline: save locally; the `online` event listener will sync this
      // (and any other unsynced teams) once the network is back.
      showToast('Team saved locally — will sync when online');
    } else {
      showToast('Team saved locally');
    }
  };

  const deleteTeamGlobal = () => {
    if (!team) return;
    // No native confirm() — iOS DuckDuckGo and some other browsers
    // silently suppress it, which is why the button looked unresponsive.
    // The button itself uses an "armed" two-tap pattern (see SummaryColumn).
    const list = loadSavedTeams().filter((t) => t.id !== team.id);
    writeSavedTeams(list);
    // Also remove from Firebase so the cloud copy doesn't reappear next load.
    if (player) deleteTeamFromFirebase(player, team.id);
    setTeam(null);
    writeCurrent(null);
    setScreen('home');
    showToast('Team deleted');
  };

  return (
    <div className="app-chrome">
      <Topbar
        crumbs={
          screen === 'home'
            ? [{ label: 'Space Ops 3030', onClick: () => setScreen('home') }, { label: 'Team Builder' }]
            : screen === 'view'
              ? [
                  { label: 'Space Ops 3030', onClick: () => setScreen('home') },
                  { label: 'Team Builder', onClick: () => setScreen('home') },
                  { label: team?.name || 'Untitled', onClick: () => setScreen('builder') },
                  { label: 'View' },
                ]
              : [
                  { label: 'Space Ops 3030', onClick: () => setScreen('home') },
                  { label: 'Team Builder', onClick: () => setScreen('home') },
                  { label: team?.name || 'Untitled' },
                ]
        }
      />

      {screen === 'home' && (
        <Home
          player={player}
          onChangePlayer={setPlayer}
          onLogin={() => setModal({ kind: 'login' })}
          onLogout={() => { setPlayer(''); setIsAdmin(false); showToast('Logged out'); }}
          onCreate={() => {
            if (!player) { setModal({ kind: 'login', next: 'create' }); return; }
            newTeam();
          }}
          onLoad={() => {
            if (!player) { setModal({ kind: 'login', next: 'load' }); return; }
            setModal({ kind: 'load' });
          }}
          hasSaved={loadSavedTeams().length > 0 || (firebaseTeams && firebaseTeams.length > 0)}
          isAdmin={isAdmin}
          onAdminUpload={() => setModal({ kind: 'xlsx' })}
        />
      )}
      {screen === 'builder' && team && (
        <Builder
          team={team}
          setTeam={setTeam}
          player={player}
          onSave={saveTeam}
          onLoadOpen={() => setModal({ kind: 'load' })}
          onDelete={deleteTeamGlobal}
          onView={() => setScreen('view')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'view' && team && (
        <TeamView
          team={team}
          player={player}
          onBack={() => setScreen('builder')}
          onLoadOpen={() => setModal({ kind: 'load' })}
          onRenameAsset={(instanceId, newName) => {
            setTeam((t) => ({
              ...t,
              assets: (t.assets || []).map((a) =>
                a.instanceId === instanceId ? { ...a, customName: newName || undefined } : a
              ),
            }));
          }}
          onExportPDF={() => {
            try {
              exportTeamToPDF(team, player);
              showToast('PDF downloaded');
            } catch (err) {
              console.error('[pdf] export failed:', err);
              showToast('PDF export failed — see console');
            }
          }}
        />
      )}

      {modal?.kind === 'load' && (
        <LoadModal
          firebaseTeams={firebaseTeams}
          onPick={loadTeam}
          onClose={() => setModal(null)}
          onDelete={(id) => {
            const list = loadSavedTeams().filter((t) => t.id !== id);
            writeSavedTeams(list);
            // Also remove from Firebase so the cloud mirror doesn't reappear
            // the next time the player loads from another device. Strip any
            // 'fb-' prefix the convertFbTeam wrapper added when listing.
            if (player) deleteTeamFromFirebase(player, id);
            // If we just deleted the currently-loaded team, clear the
            // in-memory state too — otherwise the debounced auto-save effect
            // re-writes the team back into savedTeams 500ms later. That's
            // why deleting "the last team" always seemed to leave one.
            if (team && team.id === id) {
              setTeam(null);
              writeCurrent(null);
              setScreen('home');
            }
            setModal({ kind: 'load' }); // force re-render
          }}
        />
      )}

      {modal?.kind === 'xlsx' && (
        <XlsxUploadModal
          onClose={() => setModal(null)}
          onUploaded={() => {
            // Refetch fresh game data immediately so the admin sees the
            // result of their own upload without waiting for the 60s poll.
            loadGameDataFromFirebase().then(() => showToast('Game data updated'));
          }}
        />
      )}

      {modal?.kind === 'login' && (
        <LoginModal
          onLogin={(name, admin) => {
            setPlayer(name);
            setIsAdmin(!!admin);
            const next = modal.next;
            setModal(null);
            // chain into the next action user wanted
            if (next === 'create') setTimeout(newTeam, 0);
            if (next === 'load') setTimeout(() => setModal({ kind: 'load' }), 0);
            showToast(admin ? 'Admin signed in' : 'Welcome, ' + name);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ============================================================
// TOPBAR
// ============================================================
function Topbar({ crumbs }) {
  return (
    <div className="topbar">
      <button className="topbar__menu" aria-label="Menu">
        <svg width="18" height="12" viewBox="0 0 18 12"><rect y="0" width="18" height="1.6" /><rect y="5.2" width="18" height="1.6" /><rect y="10.4" width="18" height="1.6" /></svg>
      </button>
      <div className="topbar__crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span
              className={(c.onClick ? 'crumb ' : '') + (i === 0 ? 'crumb--root' : '')}
              onClick={c.onClick}
            >{c.label}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// HOME SCREEN
// ============================================================
function Home({ player, onChangePlayer, onLogin, onLogout, onCreate, onLoad, hasSaved, isAdmin, onAdminUpload }) {
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(player);
  useEffect(() => { setDraft(player); }, [player]);

  const loggedIn = !!player;

  return (
    <div className="home">
      <div className="home__inner">
      <h1 className="home__title">SPACE-OPS 3030 Team Builder Tool</h1>
      <div className="home__stripes" />
      <p className={'home__player' + (loggedIn ? '' : ' is-empty')}>
        Player Logged In:{' '}
        {editingName ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { onChangePlayer(draft.trim() || player); setEditingName(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onChangePlayer(draft.trim() || player); setEditingName(false); }
              if (e.key === 'Escape') { setDraft(player); setEditingName(false); }
            }}
            style={{ background: 'none', border: 0, borderBottom: '1px dashed var(--red)', color: 'var(--red)', font: 'inherit', padding: '0 2px' }}
          />
        ) : (
          <span style={{ cursor: 'pointer' }} onClick={() => setEditingName(true)} title="Click to rename">
            {player}
          </span>
        )}
      </p>
      <div className="home__menu">
        <button onClick={onCreate}>Create Team</button>
        <button onClick={onLoad} disabled={!hasSaved}>Load Team</button>
        {isAdmin && (
          <button onClick={onAdminUpload}>Update Game Data (Admin)</button>
        )}
        {loggedIn
          ? <button onClick={onLogout}>Log Out</button>
          : <button onClick={onLogin}>Log In</button>
        }
      </div>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN MODAL
// ============================================================
// SHA-256 of a string as lowercase hex — matches the legacy tracker's _sha()
// so the admin/passwordHash check is interchangeable between the two apps.
async function sha256Hex(s) {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function LoginModal({ onLogin, onClose }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAdminAttempt = name.trim().toLowerCase() === 'admin';
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    font: 'inherit',
    fontSize: 16,
    border: '1px solid var(--line)',
    borderRadius: 4,
    outline: 'none',
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError('');
    if (isAdminAttempt) {
      if (!password) { setError('Admin password required'); return; }
      setSubmitting(true);
      try {
        const [hash, res] = await Promise.all([
          sha256Hex(password),
          fetch(`${FIREBASE_DB_URL}/admin/passwordHash.json`),
        ]);
        const stored = res.ok ? await res.json() : null;
        if (!stored) { setError('Admin not configured in Firebase.'); setSubmitting(false); return; }
        if (hash !== stored) { setError('Incorrect admin password.'); setSubmitting(false); setPassword(''); return; }
        onLogin(trimmed, true);
      } catch (err) {
        setError('Login failed: ' + (err?.message || err));
        setSubmitting(false);
      }
      return;
    }
    onLogin(trimmed, false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <h2>Log In</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6, marginBottom: 16 }}>
          {isAdminAttempt
            ? 'Enter the admin password to access admin tools.'
            : 'Enter a player name to continue.'}
        </p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !isAdminAttempt) submit(); }}
          placeholder="Player name"
          style={inputStyle}
        />
        {isAdminAttempt && (
          <input
            type="password"
            value={password}
            autoFocus={false}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Admin password"
            style={{ ...inputStyle, marginTop: 8 }}
          />
        )}
        {error && (
          <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8, fontWeight: 700 }}>{error}</div>
        )}
        <div className="modal__actions">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={submit}
            disabled={!name.trim() || submitting || (isAdminAttempt && !password)}
          >{submitting ? 'Checking…' : 'Log In'}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN: XLSX UPLOAD MODAL
// Ported from the legacy tracker so admins can update Firebase /gameData
// directly from the team-builder. Same SheetJS parse, same column-to-key
// camelCase rule, same per-category Firebase target paths.
// ============================================================
const XLSX_SHEET_MAP = {
  'Factions':         { key: 'factions',         nameCol: 'FACTIONS' },
  'Models':           { key: 'models',           nameCol: 'MODEL' },
  'Weapons':          { key: 'weapons',          nameCol: 'WEAPON' },
  'Equipment':        { key: 'equipment',        nameCol: 'EQUIPMENT' },
  'Traits':           { key: 'traits',           nameCol: 'TRAIT' },
  'Actions':          { key: 'actions',          nameCol: 'ACTION' },
  'Action Categories':{ key: 'actionCategories', nameCol: 'ACTION CATERGORY' },
  'Conditions':       { key: 'conditions',       nameCol: 'CONDITIONS' },
};

// Firebase REST forbids these characters in keys (any of `. # $ [ ] /`)
// and forbids empty-string keys. A single bad XLSX column header (e.g.
// an unnamed column SheetJS surfaces as `__EMPTY`, or a header containing
// a period like "weapon.type") used to nuke the whole sheet upload with a
// 400 "Invalid data; couldn't parse key" error. Sanitize each generated
// key and skip rows where the result is empty.
const FIREBASE_FORBIDDEN_KEY_CHARS = /[.#$\[\]\/]/g;
function mapXlsxRows(rows, nameCol) {
  return rows.map((r) => {
    const out = {};
    for (const k of Object.keys(r)) {
      const val = r[k];
      if (k.toUpperCase() === nameCol.toUpperCase()) {
        out.name = val;
        continue;
      }
      // Trim, lowercase, camelCase multi-word headers — matches legacy.
      let key = k.trim().toLowerCase()
        .replace(/[_\s]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/[_\s]+/g, '');
      // Strip Firebase-forbidden characters from the generated key. If the
      // header is something like '$rating' or 'cost/slot' it would still
      // produce a bad key — these are stripped silently.
      key = key.replace(FIREBASE_FORBIDDEN_KEY_CHARS, '');
      if (!key) {
        // Empty key (header was blank/whitespace or only forbidden chars).
        // Log once so the user can clean up the XLSX, but don't fail the
        // upload over it.
        console.warn('[xlsx] skipping column with unrepresentable header:', JSON.stringify(k));
        continue;
      }
      out[key] = val;
    }
    return out;
  }).filter((r) => r.name && String(r.name).trim() !== '');
}

function XlsxUploadModal({ onClose, onUploaded }) {
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (typeof window.XLSX === 'undefined') {
      setStatus('SheetJS not loaded. Check your internet connection and reload.');
      return;
    }
    setUploading(true);
    setStatus('Reading file…');
    setResults([]);
    setDone(false);
    const localResults = [];

    try {
      const buf = await file.arrayBuffer();
      const wb = window.XLSX.read(new Uint8Array(buf), { type: 'array' });

      for (const sheetName of wb.SheetNames) {
        const info = XLSX_SHEET_MAP[sheetName];
        if (!info) {
          localResults.push({ sheet: sheetName, msg: 'skipped (unknown sheet)', ok: false });
          continue;
        }
        const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        if (rows.length === 0) {
          localResults.push({ sheet: sheetName, msg: 'empty (0 rows)', ok: false });
          continue;
        }
        const mapped = mapXlsxRows(rows, info.nameCol);
        if (mapped.length === 0) {
          localResults.push({ sheet: sheetName, msg: 'no valid rows after filtering', ok: false });
          continue;
        }
        setStatus(`Uploading ${sheetName} (${mapped.length} rows)…`);
        const res = await fetch(`${FIREBASE_DB_URL}/gameData/${info.key}.json`, {
          method: 'PUT',
          body: JSON.stringify(mapped),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => '');
          localResults.push({ sheet: sheetName, msg: `upload failed (HTTP ${res.status}) ${err.slice(0, 120)}`, ok: false });
        } else {
          localResults.push({ sheet: sheetName, msg: `${mapped.length} items uploaded`, ok: true });
        }
        setResults([...localResults]);
      }

      // Stamp lastUpdated with Firebase server-side timestamp.
      setStatus('Stamping lastUpdated…');
      await fetch(`${FIREBASE_DB_URL}/gameData/lastUpdated.json`, {
        method: 'PUT',
        body: JSON.stringify({ '.sv': 'timestamp' }),
      });

      setStatus(`Done — ${localResults.filter((r) => r.ok).length} of ${localResults.length} sheets uploaded.`);
      setDone(true);
      setUploading(false);
      onUploaded && onUploaded();
    } catch (err) {
      console.error('[xlsx] upload failed:', err);
      setStatus('Error: ' + (err?.message || err));
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={uploading ? null : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h2>Update Game Data</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6, marginBottom: 16 }}>
          Upload a single <strong>.xlsx</strong> file with sheets for each category (Factions, Models, Weapons, Equipment, Traits, Actions, Action Categories, Conditions). Replaces the matching paths under Firebase <code>/gameData</code>.
        </p>
        <label style={{
          display: 'block', padding: '24px 16px', border: '2px dashed var(--red)',
          borderRadius: 6, textAlign: 'center', cursor: uploading ? 'wait' : 'pointer',
          background: 'rgba(228,74,74,0.05)', fontWeight: 700, fontSize: 13,
          letterSpacing: '0.05em', color: 'var(--red)', textTransform: 'uppercase',
        }}>
          {uploading ? 'Uploading…' : 'Click to select .xlsx file'}
          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files && e.target.files[0])}
            style={{ display: 'none' }}
          />
        </label>
        {status && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text)' }}>{status}</div>
        )}
        {results.length > 0 && (
          <ul style={{ fontSize: 12, marginTop: 8, listStyle: 'none', padding: 0, lineHeight: 1.7 }}>
            {results.map((r, i) => (
              <li key={i} style={{ color: r.ok ? '#2D8A50' : 'var(--muted)' }}>
                {r.ok ? '✓' : '–'} {r.sheet}: {r.msg}
              </li>
            ))}
          </ul>
        )}
        <div className="modal__actions">
          <button onClick={onClose} disabled={uploading}>{done ? 'Done' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BUILDER (3-column layout)
// ============================================================
function Builder({ team, setTeam, player, onSave, onLoadOpen, onDelete, onView, onBack }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [armoryOpen, setArmoryOpen] = useState(false);
  const [armoryTargetSlot, setArmoryTargetSlot] = useState(null); // {slotIdx} or null = any
  const [armoryFilter, setArmoryFilter] = useState('ranged');
  const [expandedArmoryKey, setExpandedArmoryKey] = useState(null);
  const [hoverEntry, setHoverEntry] = useState(null); // {kind, name, x, y}
  const openHover = (entry) => setHoverEntry(entry);
  const closeHover = () => setHoverEntry(null);

  const selected = useMemo(
    () => team.assets.find((a) => a.instanceId === selectedInstanceId) || null,
    [team.assets, selectedInstanceId]
  );

  // close detail/armory if asset goes away
  useEffect(() => {
    if (selectedInstanceId && !team.assets.find((a) => a.instanceId === selectedInstanceId)) {
      setSelectedInstanceId(null);
      setArmoryOpen(false);
    }
  }, [team.assets, selectedInstanceId]);

  const factionModels = useMemo(
    () => DATA.models.filter((m) => m.faction === team.factionId && m.assetType),
    [team.factionId]
  );

  const updateTeam = (mut) => setTeam((t) => ({ ...t, ...mut(t) }));

  const addModel = (modelId) => {
    setTeam((t) => ({ ...t, assets: [...t.assets, makeAsset(modelId)] }));
  };
  const removeOneModel = (modelId) => {
    setTeam((t) => {
      const i = [...t.assets].reverse().findIndex((a) => String(a.modelId) === String(modelId));
      if (i < 0) return t;
      const idx = t.assets.length - 1 - i;
      const removed = t.assets[idx];
      const next = t.assets.filter((_, k) => k !== idx);
      if (selectedInstanceId === removed.instanceId) setSelectedInstanceId(null);
      return { ...t, assets: next };
    });
  };
  const countOf = (modelId) =>
    team.assets.filter((a) => String(a.modelId) === String(modelId)).length;

  const selectAsset = (instanceId) => {
    setSelectedInstanceId(instanceId);
    setPickerOpen(false);
    setArmoryOpen(false);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = { ...selected, instanceId: ++nextInstanceId, slots: [...selected.slots] };
    setTeam((t) => ({ ...t, assets: [...t.assets, copy] }));
    setSelectedInstanceId(copy.instanceId);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setTeam((t) => ({ ...t, assets: t.assets.filter((a) => a.instanceId !== selected.instanceId) }));
    setSelectedInstanceId(null);
    setArmoryOpen(false);
  };

  const equipItem = (slotIdx, item) => {
    if (!selected) return;
    setTeam((t) => ({
      ...t,
      assets: t.assets.map((a) =>
        a.instanceId === selected.instanceId
          ? { ...a, slots: a.slots.map((s, i) => (i === slotIdx ? item : s)) }
          : a
      ),
    }));
  };

  const equipNextOpen = (item) => {
    if (!selected) return;
    const openIdx = selected.slots.findIndex((s) => !s);
    if (openIdx < 0) return false;
    equipItem(openIdx, item);
    return true;
  };

  const removeEquipNamed = (name) => {
    if (!selected) return;
    setTeam((t) => ({
      ...t,
      assets: t.assets.map((a) => {
        if (a.instanceId !== selected.instanceId) return a;
        const idx = [...a.slots].reverse().findIndex((s) => s && s.name === name);
        if (idx < 0) return a;
        const realIdx = a.slots.length - 1 - idx;
        return { ...a, slots: a.slots.map((s, i) => (i === realIdx ? null : s)) };
      }),
    }));
  };

  const openArmoryForSlot = (slotIdx) => {
    setArmoryTargetSlot({ slotIdx });
    setArmoryOpen(true);
  };

  const layoutClass = [
    'builder',
    selected ? 'has-detail' : '',
    armoryOpen ? 'has-armory' : '',
  ].filter(Boolean).join(' ');

  const rating = teamRating(team);
  const cap = 60;
  const overBudget = rating > cap;

  return (
    <div className={layoutClass}>
      {/* === Column 1: Team summary (or picker) === */}
      <div className="builder__col builder__col--summary">
        <SummaryColumn
          team={team}
          player={player}
          rating={rating}
          cap={cap}
          overBudget={overBudget}
          pickerOpen={pickerOpen}
          factionModels={factionModels}
          selectedInstanceId={selectedInstanceId}
          countOf={countOf}
          onChangeName={(name) => updateTeam(() => ({ name }))}
          onChangeFaction={(factionId) => updateTeam(() => ({ factionId, assets: [] }))}
          onTogglePicker={() => setPickerOpen((v) => !v)}
          onSelectAsset={selectAsset}
          onAddModel={addModel}
          onRemoveModel={removeOneModel}
          onSave={onSave}
          onLoad={onLoadOpen}
          onView={onView}
          onDelete={onDelete}
          onBack={onBack}
        />
      </div>

      {/* === Column 2: Asset detail === */}
      {selected && (
        <div className="builder__col builder__col--detail">
          <AssetDetail
            asset={selected}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onUnequip={(slotIdx) => equipItem(slotIdx, null)}
            onOpenArmoryForSlot={openArmoryForSlot}
            onOpenHover={openHover}
            selectedSlotIdx={armoryOpen && armoryTargetSlot ? armoryTargetSlot.slotIdx : null}
            onPillClick={(slot, slotIdx) => {
              setArmoryTargetSlot({ slotIdx });
              if (!armoryOpen) {
                // Set filter to category
                if (slot.kind === 'weapon') {
                  const w = findWeapon(slot.name);
                  if (w && /melee/i.test(w.weaponType || '')) setArmoryFilter('melee');
                  else setArmoryFilter('ranged');
                } else {
                  const e = findEquipment(slot.name);
                  if (e && /cyber/i.test(e.equipmentType || '')) setArmoryFilter('cybertech');
                  else setArmoryFilter('equipment');
                }
                setArmoryOpen(true);
              }
              setExpandedArmoryKey((slot.kind === 'weapon' ? 'w:' : 'e:') + slot.name);
            }}
          />
        </div>
      )}

      {/* === Column 3: Armory === */}
      {armoryOpen && selected && (
        <div className="builder__col builder__col--armory">
          <ArmoryPanel
            faction={team.factionId}
            filter={armoryFilter}
            onFilter={setArmoryFilter}
            asset={selected}
            onEquip={(item) => {
              const ok = equipNextOpen(item);
              if (!ok) {
                // overwrite the target slot if specified
                if (armoryTargetSlot && armoryTargetSlot.slotIdx != null) {
                  equipItem(armoryTargetSlot.slotIdx, item);
                }
              }
            }}
            onRemove={(name) => removeEquipNamed(name)}
            expandedKey={expandedArmoryKey}
            onToggleExpand={(k) => setExpandedArmoryKey((cur) => (cur === k ? null : k))}
            onClose={() => setArmoryOpen(false)}
            onOpenHover={openHover}
          />
        </div>
      )}

      <HoverBox entry={hoverEntry} onOpen={openHover} onClose={closeHover} />
    </div>
  );
}

// ============================================================
// SUMMARY COLUMN (team header + assets list / picker + management)
// ============================================================
function SummaryColumn(props) {
  const {
    team, player, rating, cap, overBudget,
    pickerOpen, factionModels, selectedInstanceId, countOf,
    onChangeName, onChangeFaction, onTogglePicker, onSelectAsset,
    onAddModel, onRemoveModel, onSave, onLoad, onView, onDelete, onBack,
  } = props;

  // "Armed" state for the Delete Team button. First tap arms the button
  // (label becomes "Click again to confirm"); a second tap within ~3s
  // actually fires onDelete. Replaces the native confirm() dialog which
  // iOS DuckDuckGo silently swallows. Auto-disarms on cancel timer or on
  // any other interaction.
  const [deleteArmed, setDeleteArmed] = useState(false);
  useEffect(() => {
    if (!deleteArmed) return;
    const t = setTimeout(() => setDeleteArmed(false), 3000);
    return () => clearTimeout(t);
  }, [deleteArmed]);
  const handleDeleteClick = () => {
    if (deleteArmed) { setDeleteArmed(false); onDelete(); }
    else { setDeleteArmed(true); }
  };

  const grouped = useMemo(() => {
    const out = { leader: [], operator: [], support: [] };
    for (const a of team.assets) out[assetBucket(a)].push(a);
    return out;
  }, [team.assets]);

  const pickerGrouped = useMemo(() => {
    const out = { leader: [], operator: [], support: [] };
    for (const m of factionModels) {
      if (isLeader(m)) out.leader.push(m);
      else if (/support/i.test(m.assetType || '')) out.support.push(m);
      else out.operator.push(m);
    }
    return out;
  }, [factionModels]);

  return (
    <div>
      <div className="tag" style={{ marginBottom: 2 }}>PLAYER: {player.toUpperCase()}</div>
      <input
        className="team-name"
        value={team.name}
        onChange={(e) => onChangeName(e.target.value)}
        spellCheck={false}
      />
      <div className="team-faction">
        <select value={team.factionId} onChange={(e) => onChangeFaction(e.target.value)}>
          {DATA.factions.filter((f) => f.name).map((f) => (
            <option key={f.id || f.name} value={f.name}>{f.name}</option>
          ))}
        </select>
      </div>
      <div className={'team-rating' + (overBudget ? ' over' : '')}>
        <strong>{rating}</strong>/{cap} Rating
      </div>

      <div className="section">
        <div className="section__head">
          <h2 className="section__title">Team Assets</h2>
          <button className="section__btn" aria-label="Add asset" onClick={onTogglePicker}>+</button>
        </div>

        {!pickerOpen && (
          <div className="assets">
            {BUCKETS.map((b) => grouped[b.key].length > 0 && (
              <div key={b.key} className="asset-group">
                <div className="asset-group__tag">{b.label}</div>
                {grouped[b.key].map((a) => {
                  const m = findModel(a.modelId);
                  const r = assetRating(a);
                  return (
                    <div
                      key={a.instanceId}
                      className={'asset-row' + (a.instanceId === selectedInstanceId ? ' is-selected' : '')}
                      onClick={() => onSelectAsset(a.instanceId)}
                    >
                      <div className="asset-row__name"><strong>{displayName(m)}</strong></div>
                      <div className="asset-row__rating">({r}r)</div>
                    </div>
                  );
                })}
              </div>
            ))}
            {team.assets.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '6px 0' }}>
                Tap <strong>+</strong> to add your first asset.
              </div>
            )}
          </div>
        )}

        {pickerOpen && (
          <div className="picker">
            {BUCKETS.map((b) => pickerGrouped[b.key].length > 0 && (
              <div key={b.key}>
                <div className="asset-group__tag" style={{ marginTop: 10 }}>
                  <span>{b.label}{b.singular ? ' · Max 1' : ''}</span>
                  <span className="right">Rating</span>
                </div>
                {pickerGrouped[b.key].map((m) => {
                  const inTeam = countOf(m.id);
                  const max = b.singular ? 1 : 99;
                  return (
                    <div className="pick-row" key={m.id}>
                      <div className="pick-row__stepper">
                        <button onClick={() => onRemoveModel(m.id)} disabled={inTeam === 0}>−</button>
                        <button onClick={() => { if (inTeam < max) onAddModel(m.id); }} disabled={inTeam >= max}>+</button>
                      </div>
                      <div className={'pick-row__name' + (inTeam > 0 ? ' is-in-team' : '')}>
                        {displayName(m)}{inTeam > 0 ? <span className="pick-row__count"> (x{inTeam})</span> : null}
                      </div>
                      <div className="pick-row__rating">{String(m.rating).padStart(2, '0')}</div>
                    </div>
                  );
                })}
              </div>
            ))}
            <button className="picker__close" onClick={onTogglePicker}>Close</button>
          </div>
        )}
      </div>

      <div className="management">
        <h3 className="management__title">Team Management</h3>
        <div className="management__list">
          <button onClick={onSave}>Save Team</button>
          <button onClick={onView}>View Team</button>
          <button onClick={onLoad}>Load Team</button>
          <button
            onClick={handleDeleteClick}
            style={deleteArmed ? { color: '#fff', background: 'var(--red)', borderRadius: 4, padding: '4px 8px', fontWeight: 700 } : undefined}
          >{deleteArmed ? 'Click again to confirm' : 'Delete Team'}</button>
          <button onClick={onBack} style={{ marginTop: 10, color: 'var(--muted)' }}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ASSET DETAIL
// ============================================================
function AssetDetail({ asset, onDuplicate, onDelete, onUnequip, onOpenArmoryForSlot, onPillClick, onOpenHover, selectedSlotIdx }) {
  const m = findModel(asset.modelId);
  if (!m) return null;
  const loadout = parseLoadout(m);
  const rating = assetRating(asset);

  const bucketLabel =
    isLeader(m) ? 'Operator Leader'
    : /support/i.test(m.assetType || '') ? 'Support Asset'
    : 'Operator Asset';

  // Resolve each loadout item to a clickable term if it matches a weapon or equipment.
  const renderLoadoutItem = (name, i) => {
    const isW = !!findWeapon(name);
    const isE = !!findEquipment(name);
    const kind = isW ? 'weapon' : (isE ? 'equipment' : null);
    if (!kind || !onOpenHover) return <span key={i}>{name}</span>;
    return (
      <span
        key={i}
        className="term-link"
        onClick={(e) => onOpenHover({ kind, name, x: e.clientX, y: e.clientY })}
      >
        {name}
      </span>
    );
  };

  return (
    <div>
      <div className="asset-detail__tag">{bucketLabel.toUpperCase()}</div>
      <h2 className="asset-detail__name">{displayName(m)} ({rating}r)</h2>

      <div className="stat-row">
        <StatCell label="Speed"   value={m.speed} />
        <StatCell label="Shoot"   value={m.shoot} />
        <StatCell label="Fight"   value={m.fight} />
        <StatCell label="Defense" value={m.defense} />
        <StatCell label="Grit"    value={m.grit} />
        <StatCell label="Health"  value={m.health} />
      </div>

      <div className="tag" style={{ color: 'var(--red)' }}>Loadout</div>
      <div className="loadout-line">
        {loadout.length === 0
          ? <span style={{ color: 'var(--muted)' }}>None</span>
          : loadout.map((name, i) => (
              <React.Fragment key={i}>
                {i > 0 && ', '}
                {renderLoadoutItem(name, i)}
              </React.Fragment>
            ))}
      </div>

      <div className="tag" style={{ color: 'var(--red)' }}>Carry Capacity</div>
      <div className="carry">
        <div className="carry__slots">
          {asset.slots.map((slot, i) => {
            const item = slot && (slot.kind === 'weapon' ? findWeapon(slot.name) : findEquipment(slot.name));
            const cat = pillCategory(item);
            const rcost = num(item?.rating);
            const selected = selectedSlotIdx === i;
            if (slot) {
              return (
                <div className="slot" key={i}>
                  <button className="slot__action" title="Remove" onClick={() => onUnequip(i)}>−</button>
                  <div
                    className={'slot__pill pill--' + cat + (selected ? ' is-selected' : '')}
                    onClick={() => onPillClick(slot, i)}
                    title="Click for details"
                  >
                    <span className="slot__pill__name">{slot.name}</span>
                    <span style={{ opacity: 0.75 }}>({rcost}r)</span>
                  </div>
                </div>
              );
            }
            return (
              <div className="slot" key={i}>
                <button className="slot__action" title="Equip" onClick={() => onOpenArmoryForSlot(i)}>+</button>
                <div
                  className={'slot__pill slot__pill--empty' + (selected ? ' is-selected' : '')}
                  onClick={() => onOpenArmoryForSlot(i)}
                >
                  Equip from the Armory
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="management">
        <h3 className="management__title">Asset Management</h3>
        <div className="management__list">
          <button onClick={onDuplicate}>Duplicate Asset</button>
          <button onClick={onDelete}>Delete Asset</button>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value }) {
  return (
    <div className="stat-row__cell">
      <div className="stat-row__label">{label}</div>
      <div className="stat-row__value">{value === '' || value == null ? '—' : value}</div>
    </div>
  );
}

// ============================================================
// ARMORY
// ============================================================
const ARMORY_TABS = [
  { key: 'ranged', label: 'Ranged' },
  { key: 'melee', label: 'Melee' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cybertech', label: 'Cyberdeck' },
];

function ArmoryPanel({ faction, filter, onFilter, asset, onEquip, onRemove, expandedKey, onToggleExpand, onClose, onOpenHover }) {
  // Build items list based on filter. Four gating rules layer here:
  //  1. Faction gate — items with no `faction` are universal; items with a
  //     faction value only appear in their faction's armory.
  //  2. Asset-type gate — Operator assets only see Operator-tier items,
  //     Support (vehicle) assets only see Support/Vehicle-tier items. This
  //     also naturally dedupes name-collisions across tiers (e.g. "Grav
  //     Rounds" exists as both Operator Equipment 1r and Vehicle Equipment
  //     2r) and suppresses XLSX header-row rows (SPACE-WYRM / KIPPIN /
  //     MALIGEIST) that have no assetType set.
  //  3. equipmentType must be non-empty for the equipment tab — otherwise
  //     the same header-row rows leak in as "universal" items.
  //  4. Model restriction gate — XLSX items whose name ends in "(ModelName)"
  //     are exclusive to that model (e.g. "Cyber-Bite (War-dog)",
  //     "War-Harness (War-Dog)"). Conversely, a "specialized" model
  //     (one that has restricted items in the data) only sees its own
  //     restricted items, never the general pool — so War-Dog doesn't see
  //     general Operator Equipment like Med Pack or Stim Shot.
  const assetModel = findModel(asset.modelId);
  const assetType = (assetModel && assetModel.assetType) || '';
  const modelName = (assetModel && assetModel.name) || '';
  const factionGate = (it) => !it.faction || it.faction === faction;
  const assetTypeGate = (it) => !assetType || it.assetType === assetType;
  // Resolve a `(ModelName)` parenthetical in an item's name to a model record
  // (case-insensitive — accommodates XLSX casing drift like '(War-dog)' vs
  // '(War-Dog)'). Returns the canonical model name or null. Parentheticals
  // that don't match a model (e.g. '(Pulse Carbine)') are not model
  // restrictions and pass through transparently.
  const parseModelRestriction = (it) => {
    const m = (it.name || '').match(/\(([^)]+)\)/);
    if (!m) return null;
    const inside = m[1].trim().toLowerCase();
    const hit = DATA.models.find((mm) => (mm.name || '').toLowerCase() === inside);
    return hit ? hit.name : null;
  };
  // Set of model names that have at least one restricted item in the data.
  // These are "specialized" models — they only see their own restricted
  // items in the armory, never the general pool. Recomputed when gameData
  // refreshes (admin XLSX upload bumps _version).
  const specializedModelNames = useMemo(() => {
    const set = new Set();
    const scan = (arr) => {
      for (const it of arr || []) {
        if (!it || typeof it !== 'object') continue;
        const r = parseModelRestriction(it);
        if (r) set.add(r);
      }
    };
    scan(DATA.weapons);
    scan(DATA.equipment);
    return set;
  }, [window.SPACE_OPS_DATA._version]);
  const modelIsSpecialized = specializedModelNames.has(modelName);
  const modelRestrictionGate = (it) => {
    const restricted = parseModelRestriction(it);
    if (restricted) return restricted === modelName;
    return !modelIsSpecialized;
  };
  const items = useMemo(() => {
    if (filter === 'ranged') {
      return DATA.weapons
        .filter((w) => /ranged/i.test(w.weaponType || ''))
        .filter(factionGate)
        .filter(assetTypeGate)
        .filter(modelRestrictionGate)
        .map((w) => ({ kind: 'weapon', record: w, name: w.name, rating: num(w.rating) }));
    }
    if (filter === 'melee') {
      return DATA.weapons
        .filter((w) => /melee/i.test(w.weaponType || ''))
        .filter(factionGate)
        .filter(assetTypeGate)
        .filter(modelRestrictionGate)
        .map((w) => ({ kind: 'weapon', record: w, name: w.name, rating: num(w.rating) }));
    }
    if (filter === 'equipment') {
      return DATA.equipment
        // Pass if either equipmentType OR faction is non-empty — this lets
        // through Maligeist/Kippin equipment that lacks equipmentType in the
        // XLSX, while still suppressing the truly-empty header-row rows
        // (SPACE-WYRM / KIPPIN / MALIGEIST) which have *both* empty.
        .filter((e) => (e.equipmentType || e.faction)
          && !/cyber/i.test(e.equipmentType || '')
          && !/default loadout/i.test(e.equipmentType || ''))
        .filter(factionGate)
        .filter(assetTypeGate)
        .filter(modelRestrictionGate)
        .map((e) => ({ kind: 'equipment', record: e, name: e.name, rating: num(e.rating) }));
    }
    if (filter === 'cybertech') {
      // Two ways to qualify for the Cyberdeck tab:
      //   1. equipmentType matches /cyber/i (the upgrades — Cryo-Cooled,
      //      Mil-Spec Hardware, etc.)
      //   2. the item name itself contains "cyberdeck" (the Cyberdeck device
      //      itself, which lives under equipmentType "Operator Equipment" so
      //      it can also appear in the Equipment tab)
      return DATA.equipment
        .filter((e) => /cyber/i.test(e.equipmentType || '') || /cyberdeck/i.test(e.name || ''))
        .filter(factionGate)
        .filter(assetTypeGate)
        .filter(modelRestrictionGate)
        .map((e) => ({ kind: 'equipment', record: e, name: e.name, rating: num(e.rating) }));
    }
    return [];
  }, [filter, faction, assetType, modelName, modelIsSpecialized]);

  const countEquipped = (name) => asset.slots.filter((s) => s && s.name === name).length;
  const openSlots = asset.slots.filter((s) => !s).length;

  return (
    <div>
      <div className="asset-detail__tag">Armory</div>
      <h2 className="armory__title">Armory</h2>

      <div className="armory__filter">
        <span className="label">Filter</span>
        <div className="armory__filter-tabs">
          {ARMORY_TABS.map((t) => (
            <button
              key={t.key}
              className={t.key === filter ? 'is-active' : ''}
              onClick={() => onFilter(t.key)}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="armory__category-tag">
        {filter === 'ranged' && 'Ranged Weapons'}
        {filter === 'melee' && 'Melee Weapons'}
        {filter === 'equipment' && 'Equipment'}
        {filter === 'cybertech' && 'Cybertech'}
      </div>

      <div className="armory__list">
        {items.map((it) => {
          // Expansion key stays simple (kind + name) so AssetDetail's pill
          // click can target an armory row by name alone. React's
          // reconciliation key needs to be globally unique — when two items
          // share a name (e.g. duplicate-name entries within the same tier
          // before the assetType gate runs), duplicate React keys leak DOM
          // nodes across tab switches and the list grows unboundedly.
          const expansionKey = (it.kind === 'weapon' ? 'w:' : 'e:') + it.name;
          const reactKey = expansionKey + '::' + (it.record.weaponType || it.record.equipmentType || '') + '::' + (it.record.faction || '');
          const equipped = countEquipped(it.name);
          const expanded = expandedKey === expansionKey;
          const cat = pillCategory(it.record);
          return (
            <React.Fragment key={reactKey}>
              <div className={'armory-row' + (expanded ? ' expanded' : '')}>
                <button className="armory-row__step" onClick={() => onRemove(it.name)} disabled={equipped === 0}>−</button>
                <button className="armory-row__step" onClick={() => onEquip({ kind: it.kind, name: it.name })} disabled={openSlots === 0}>+</button>
                <div className={'armory-row__pill pill--' + cat} onClick={() => onToggleExpand(expansionKey)}>
                  <span className="slot__pill__name">{it.name}</span>
                  <span style={{ float: 'right', opacity: 0.75 }}>
                    ({it.rating}r){equipped > 0 ? <span style={{ marginLeft: 6, color: '#ffd34a' }}>×{equipped}</span> : null}
                  </span>
                </div>
              </div>
              {expanded && (
                <ArmoryExpand item={it} onClose={() => onToggleExpand(expansionKey)} onOpenHover={onOpenHover} />
              )}
            </React.Fragment>
          );
        })}
        {items.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>
            No items in this category for {faction}.
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 0, font: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
        >Done</button>
      </div>
    </div>
  );
}

function ArmoryExpand({ item, onClose, onOpenHover }) {
  const r = item.record;
  const isWeapon = item.kind === 'weapon';
  const range = isWeapon ? r.range : r.range;
  const attacks = isWeapon ? r.attacks : r.attacks;
  const power = isWeapon ? r.power : r.power;
  const damage = isWeapon ? r.damage : r.damage;
  const traitList = splitTraits(r.traits);
  const description = (r.description || '').trim();
  const passive = (r.passiveAbility || '').trim();
  const actionName = (r.actionName || '').trim();
  const actionDesc = (r.actionDescription || '').trim();

  const hasStats = isWeapon || (range || attacks || power || damage);

  return (
    <div className="armory-expand">
      {hasStats && (
        <div className="armory-expand__stats">
          <div><span className="lbl">Range</span><span className="val">{range || '—'}</span></div>
          <div><span className="lbl">Attacks</span><span className="val">{attacks || '—'}</span></div>
          <div><span className="lbl">Power</span><span className="val">{power || '—'}</span></div>
          <div><span className="lbl">Damage</span><span className="val">{damage || '—'}</span></div>
        </div>
      )}
      {traitList.length > 0 && (
        <div className="armory-expand__traits">
          <span className="lbl">Traits</span>
          <span>
            {traitList.map((t, j) => (
              <React.Fragment key={t + ':' + j}>
                {j > 0 && ', '}
                {onOpenHover ? (
                  <span
                    className="hoverbox__trait-link"
                    onClick={(e) => onOpenHover({ kind: 'trait', name: t, x: e.clientX, y: e.clientY })}
                  >
                    {t}
                  </span>
                ) : (
                  <span>{t}</span>
                )}
              </React.Fragment>
            ))}
          </span>
        </div>
      )}
      {passive && (
        <div className="armory-expand__traits">
          <span className="lbl">Passive</span>
          <span>{passive}</span>
        </div>
      )}
      {actionName && (
        <div className="armory-expand__traits">
          <span className="lbl">{actionName}</span>
          <span>{actionDesc}</span>
        </div>
      )}
      {description && (
        <div style={{ marginTop: 6, opacity: 0.85, fontSize: 11.5 }}>{description}</div>
      )}
      <button className="armory-expand__close" onClick={onClose}>Close</button>
    </div>
  );
}

// ============================================================
// HOVER BOX — info card for items, traits, conditions
// Mock spec: page 5 of WebApp_v2.pdf
// ============================================================
const splitTraits = (s) =>
  (s || '').split(',').map((x) => x.trim()).filter(Boolean);

// Resolve a trait name like "Ammo 1" / "Ammo (1)" / "Ammo (x)" to its definition.
const findTrait = (name) => {
  if (!name) return null;
  const exact = DATA.traits.find((t) => (t.name || '').toLowerCase() === name.toLowerCase());
  if (exact) return exact;
  // Normalize: strip any "(...)" group and any trailing " N", then compare stems.
  const normalize = (s) => (s || '').toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+\d+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const stem = normalize(name);
  return DATA.traits.find((t) => normalize(t.name) === stem) || null;
};
const findCondition = (name) =>
  name ? DATA.conditions.find((c) => (c.name || '').toLowerCase() === name.toLowerCase()) : null;

function HoverBox({ entry, onClose, onOpen }) {
  if (!entry) return null;
  const { kind, name, x, y } = entry;

  // Resolve record and build sections
  let title = name;
  const sections = []; // [{ label?, content?, traits? }]
  if (kind === 'weapon' || kind === 'equipment') {
    const r = kind === 'weapon' ? findWeapon(name) : findEquipment(name);
    if (r) {
      title = r.name || name;
      if (kind === 'weapon') {
        sections.push({
          label: 'STATS',
          content: `Range ${r.range || '—'} · Atk ${r.attacks || '—'} · Pwr ${r.power || '—'} · Dmg ${r.damage || '—'}`,
        });
      }
      const passive = (r.passiveAbility || '').trim();
      if (passive) sections.push({ label: 'PASSIVE', content: passive });
      const actName = (r.actionName || '').trim();
      const actDesc = (r.actionDescription || '').trim();
      if (actName) sections.push({ label: actName.toUpperCase(), content: actDesc });
      const tlist = splitTraits(r.traits);
      if (tlist.length) sections.push({ label: 'TRAITS', traits: tlist });
      const desc = (r.description || '').trim();
      if (desc) sections.push({ content: desc, muted: true });
    }
  } else if (kind === 'trait') {
    const t = findTrait(name);
    if (t) {
      title = t.name;
      sections.push({ label: 'TRAIT', content: t.description || '—' });
    } else {
      sections.push({ content: 'No description for this trait.', muted: true });
    }
  } else if (kind === 'condition') {
    const c = findCondition(name);
    if (c) {
      title = c.name;
      if (c.effect) sections.push({ label: 'EFFECT', content: c.effect });
      if (c.duration) sections.push({ label: 'DURATION', content: c.duration });
    }
  }

  // Position the card near the click, clamped to viewport.
  const W = 300;
  const Hguess = 220;
  const margin = 16;
  const vw = (typeof window !== 'undefined') ? window.innerWidth : 1280;
  const vh = (typeof window !== 'undefined') ? window.innerHeight : 800;
  const left = Math.max(margin, Math.min(x ?? margin, vw - W - margin));
  const top = Math.max(margin, Math.min(y ?? margin, vh - Hguess - margin));

  return (
    <div className="hoverbox" style={{ left, top, position: 'fixed' }}>
      <div className="hoverbox__name">{title}</div>
      {sections.map((s, i) => (
        <div key={i}>
          {s.label && <div className="hoverbox__section">{s.label}</div>}
          {s.content && (
            <div style={{ marginTop: s.label ? 4 : 6, opacity: s.muted ? 0.85 : 1 }}>{s.content}</div>
          )}
          {s.traits && (
            <div style={{ marginTop: 4 }}>
              {s.traits.map((t, j) => (
                <React.Fragment key={t + ':' + j}>
                  {j > 0 && ', '}
                  <span
                    className="hoverbox__trait-link"
                    onClick={(e) => onOpen({ kind: 'trait', name: t, x: e.clientX, y: e.clientY })}
                  >
                    {t}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      ))}
      <button className="hoverbox__close" onClick={onClose}>Close</button>
    </div>
  );
}

// ============================================================
// TEAM VIEW — read-only roster page for play-time reference / PDF export
// ============================================================
function TeamView({ team, player, onBack, onExportPDF, onLoadOpen, onRenameAsset }) {
  const rating = teamRating(team);
  const cap = 60;
  const [hoverEntry, setHoverEntry] = useState(null);
  const openHover = (entry) => setHoverEntry(entry);
  const closeHover = () => setHoverEntry(null);

  return (
    <div className="team-view">
      <div className="team-view__inner">
        <header className="team-view__header">
          <div className="tag">PLAYER: {(player || '').toUpperCase()}</div>
          <h1 className="team-view__name">{team.name}</h1>
          <div className="team-view__faction">
            <span>{team.factionId}</span>
            <span className="team-view__faction-caret">▾</span>
          </div>
          <div className="team-view__rating"><strong>{rating}</strong>/{cap} Rating</div>
        </header>

        <div className="team-view__grid">
          {team.assets.length === 0 ? (
            <div className="team-view__empty">No assets in this team yet.</div>
          ) : (
            team.assets.map((asset) => (
              <AssetCard
                key={asset.instanceId}
                asset={asset}
                onOpenHover={openHover}
                onRename={onRenameAsset ? (newName) => onRenameAsset(asset.instanceId, newName) : null}
              />
            ))
          )}

          {/* Team Management container — sits in the same auto-fill grid so it
              flows naturally with the asset cards. */}
          <section className="team-view__management">
            <h2 className="team-view__management-title">Team Management</h2>
            <button className="team-view__management-btn" onClick={onExportPDF}>Export Team to PDF</button>
            <button className="team-view__management-btn" onClick={onLoadOpen}>Load Team</button>
            <button className="team-view__management-btn team-view__management-btn--muted" onClick={onBack}>← Back to Builder</button>
          </section>
        </div>
      </div>

      <HoverBox entry={hoverEntry} onOpen={openHover} onClose={closeHover} />
    </div>
  );
}

// Collect all gear (weapons + equipment) for an asset, merging:
//  - free defaults (from FB-loaded asset.defaults OR the model's LOADOUT field), and
//  - paid slot items.
// Deduped by item name. Each item carries a _free flag so the card can label cost.
// Per the team-building rules: an asset wielding two identical melee weapons
// gets the Dual Wield buff. Ported from the legacy tracker's
// _modelHasDualWield. Counts raw weapon instances (collectAssetGear dedupes
// for display, so we can't use its output): the free loadout (FB defaults ∪
// model loadout, deduped so a data-duplicated entry isn't a false positive)
// plus each equipped slot as its own instance. Two+ of the same melee name
// → dual wield.
function assetHasDualWield(asset) {
  const m = findModel(asset.modelId);
  const counts = {};
  const bump = (name) => {
    const w = findWeapon(name);
    if (!w || !/melee/i.test(w.weaponType || '')) return;
    const key = (name || '').toLowerCase().trim();
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  };
  const freeSeen = new Set();
  for (const name of [...(asset.defaults?.weapons || []), ...(m ? parseLoadout(m) : [])]) {
    const key = (name || '').toLowerCase().trim();
    if (!key || freeSeen.has(key)) continue;
    freeSeen.add(key);
    bump(name);
  }
  for (const slot of (asset.slots || [])) {
    if (slot && slot.kind === 'weapon') bump(slot.name);
  }
  return Object.values(counts).some((c) => c >= 2);
}

function collectAssetGear(asset) {
  const m = findModel(asset.modelId);
  const weapons = [];
  const equipment = [];
  const seen = new Set();

  const add = (name, isFree) => {
    if (!name || seen.has(name)) return;
    const wRec = findWeapon(name);
    const eRec = findEquipment(name);
    if (wRec) { weapons.push({ ...wRec, _free: isFree }); seen.add(name); }
    else if (eRec) { equipment.push({ ...eRec, _free: isFree }); seen.add(name); }
  };

  // Free defaults from FB-loaded team (defaultWeapons, defaultInventory)
  for (const name of (asset.defaults?.weapons || [])) add(name, true);
  for (const name of (asset.defaults?.equipment || [])) add(name, true);

  // Free equipment from model's LOADOUT field (XLSX)
  if (m) for (const name of parseLoadout(m)) add(name, true);

  // Paid slot items (purchased)
  for (const slot of (asset.slots || [])) {
    if (!slot) continue;
    add(slot.name, false);
  }
  return { weapons, equipment };
}

function AssetCard({ asset, onOpenHover, onRename }) {
  const m = findModel(asset.modelId);
  if (!m) return null;
  const rating = assetRating(asset);
  const bucketKey = assetBucket(asset);
  const bucketLabel = (BUCKETS.find((b) => b.key === bucketKey)?.label || 'Asset').toUpperCase();
  const baseName = displayName(m);
  const customName = asset.customName || baseName;
  const gearDeps = [asset.modelId, asset.slots?.map((s) => s?.name).join('|'), JSON.stringify(asset.defaults || null), window.SPACE_OPS_DATA?._version];
  const { weapons, equipment } = useMemo(() => collectAssetGear(asset), gearDeps);
  const dualWield = useMemo(() => assetHasDualWield(asset), gearDeps);
  const loadout = parseLoadout(m);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(customName);
  useEffect(() => { setDraft(customName); }, [customName]);

  const commitRename = () => {
    setEditing(false);
    const n = draft.trim();
    if (onRename && n && n !== customName) onRename(n);
    else if (onRename && !n) onRename('');
  };

  const renderTerm = (name, kind) => (
    <span
      className="term-link"
      onClick={(e) => onOpenHover && onOpenHover({ kind, name, x: e.clientX, y: e.clientY })}
    >{name}</span>
  );

  return (
    <article className="asset-card">
      <div className="asset-card__type">{bucketLabel} / {baseName.toUpperCase()}</div>

      <div className="asset-card__name-row">
        {editing ? (
          <input
            className="asset-card__name asset-card__name--editing"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setDraft(customName); setEditing(false); }
            }}
          />
        ) : (
          <h3
            className="asset-card__name"
            title={onRename ? 'Click to rename' : ''}
            onClick={() => onRename && setEditing(true)}
          >
            {customName} <span className="asset-card__rating">({rating}r)</span>
          </h3>
        )}
      </div>

      {dualWield && (
        <div className="asset-card__dualwield">⚔⚔ Dual Wield</div>
      )}

      <div className="stat-row">
        <StatCell label="Speed"   value={m.speed} />
        <StatCell label="Shoot"   value={m.shoot} />
        <StatCell label="Fight"   value={m.fight} />
        <StatCell label="Defense" value={m.defense} />
        <StatCell label="Grit"    value={m.grit} />
        <StatCell label="Health"  value={m.health} />
      </div>

      {loadout.length > 0 && (
        <div className="asset-card__row">
          <div className="tag">Loadout</div>
          <div className="asset-card__loadout">
            {loadout.map((name, i) => {
              const kind = findWeapon(name) ? 'weapon' : (findEquipment(name) ? 'equipment' : null);
              return (
                <React.Fragment key={i}>
                  {i > 0 && ', '}
                  {kind ? renderTerm(name, kind) : <span>{name}</span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {(weapons.length > 0 || equipment.length > 0) && (
        <div className="asset-card__row">
          <div className="tag">Carry Capacity</div>
          <div className="asset-card__slots">
            {weapons.map((w, i) => (
              <WeaponBox key={'w' + i} w={w} onOpenHover={onOpenHover} />
            ))}
            {equipment.map((e, i) => (
              <EquipmentRow key={'e' + i} e={e} onOpenHover={onOpenHover} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

const traitLinkClass = (t) =>
  'term-link' + (/^dangerous$/i.test((t || '').trim()) ? ' is-dangerous' : '');

function WeaponBox({ w, onOpenHover }) {
  const traits = splitTraits(w.traits);
  const fire = (kind, name) => (e) => onOpenHover && onOpenHover({ kind, name, x: e.clientX, y: e.clientY });
  return (
    <div className="weapon-box">
      <div className="weapon-box__head">
        <span className="term-link" onClick={fire('weapon', w.name)}>{w.name}</span>
        <span className="weapon-box__cost">({w._free ? '0r' : num(w.rating) + 'r'})</span>
      </div>
      <div className="weapon-box__stats">
        <div><div className="lbl">Range</div><div className="val">{w.range || '—'}</div></div>
        <div><div className="lbl">Attacks</div><div className="val">{w.attacks || '—'}</div></div>
        <div><div className="lbl">Power</div><div className="val">{w.power || '—'}</div></div>
        <div><div className="lbl">Damage</div><div className="val">{w.damage || '—'}</div></div>
      </div>
      {traits.length > 0 && (
        <div className="weapon-box__traits">
          <div className="lbl">Traits</div>
          <div className="weapon-box__traits-list">
            {traits.map((t, j) => (
              <React.Fragment key={t + ':' + j}>
                {j > 0 && ', '}
                <span className={traitLinkClass(t)} onClick={fire('trait', t)}>{t}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EquipmentRow({ e, onOpenHover }) {
  const [open, setOpen] = useState(false);
  const traits = splitTraits(e.traits);
  const passive = (e.passiveAbility || '').trim();
  const actionName = (e.actionName || '').trim();
  const actionDesc = (e.actionDescription || '').trim();
  const description = (e.description || '').trim();
  const hasDetail = !!(passive || actionName || description || traits.length);
  const fire = (kind, name) => (ev) => {
    ev.stopPropagation();
    onOpenHover && onOpenHover({ kind, name, x: ev.clientX, y: ev.clientY });
  };
  return (
    <div className={'equip-row' + (open ? ' is-open' : '')}>
      <div className="equip-row__head" onClick={() => hasDetail && setOpen(!open)}>
        <span className="equip-row__name">{e.name}</span>
        <span className="equip-row__cost">({e._free ? '0r' : num(e.rating) + 'r'})</span>
        {hasDetail && <span className="equip-row__chevron">{open ? '▴' : '▾'}</span>}
      </div>
      {open && (
        <div className="equip-row__body">
          {passive && (
            <div className="equip-row__line"><span className="lbl">Passive</span> {passive}</div>
          )}
          {actionName && (
            <div className="equip-row__line"><span className="lbl">{actionName}</span> {actionDesc}</div>
          )}
          {traits.length > 0 && (
            <div className="equip-row__line">
              <span className="lbl">Traits</span>{' '}
              {traits.map((t, j) => (
                <React.Fragment key={t + ':' + j}>
                  {j > 0 && ', '}
                  <span className={traitLinkClass(t)} onClick={fire('trait', t)}>{t}</span>
                </React.Fragment>
              ))}
            </div>
          )}
          {description && (
            <div className="equip-row__line equip-row__line--muted">{description}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOAD MODAL
// ============================================================
function LoadModal({ onPick, onClose, onDelete, firebaseTeams }) {
  const local = loadSavedTeams();
  const fbLoading = firebaseTeams === null;
  const fb = Array.isArray(firebaseTeams) ? firebaseTeams : [];
  // Dedup: a local team and its FB-loaded mirror share the same logical id
  // (the local copy may have an 'fb-' prefix from a previous load round-trip).
  // Hide the cloud entry whenever a local one already covers it — the local
  // copy carries the user's most recent edits.
  const localBases = new Set(local.map((t) => stripFbPrefix(t.id)));
  const fbBases = new Set(fb.map((t) => stripFbPrefix(t.id)));
  const fbDeduped = fb.filter((t) => !localBases.has(stripFbPrefix(t.id)));
  // Sort by most recently modified first. `savedAt` is set on every local
  // save and is also the value `convertFbTeam` maps from FB `modified`, so
  // it's directly comparable across both sources. Falls back to `createdAt`
  // when a team has never been saved (no `savedAt` yet).
  const list = [...local, ...fbDeduped].sort((a, b) => {
    const aTs = a.savedAt || a.createdAt || 0;
    const bTs = b.savedAt || b.createdAt || 0;
    return bTs - aTs;
  });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Load Team</h2>
        {list.length === 0 && !fbLoading ? (
          <div className="modal__empty">No saved teams yet.<br />Build one and hit Save Team.</div>
        ) : (
          <div className="modal__list">
            {list.map((t) => {
              // "Cloud" badge if the team currently exists in Firebase —
              // whether or not its local copy was loaded from there. Without
              // this, a team you built locally and synced via Save would
              // never show "Cloud" because the local copy lacks _source.
              const isFb = t._source === 'firebase' || fbBases.has(stripFbPrefix(t.id));
              return (
                <button key={t.id} onClick={() => onPick(t)}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {t.name}
                      {isFb && (
                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>· Cloud</span>
                      )}
                    </div>
                    <div className="meta">{t.factionId} · {teamRating(t)}r · {(t.assets || []).length} assets</div>
                  </div>
                  <span className="meta">{t.savedAt || t.createdAt ? new Date(t.savedAt || t.createdAt).toLocaleString() : '—'}</span>
                  <span className="del" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}>Delete</span>
                </button>
              );
            })}
            {fbLoading && (
              <div className="meta" style={{ padding: '10px 4px' }}>Loading cloud teams…</div>
            )}
          </div>
        )}
        <div className="modal__actions">
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MOUNT
// ============================================================
// AppRoot — defers App mount until /gameData is fetched from Firebase. Then
// polls /gameData/lastUpdated every 60s; if the timestamp changes (i.e. an
// admin pushed a new XLSX upload), refetches the whole gameData object and
// bumps a version counter to cascade re-renders into the React tree.
// Version string this bundle was loaded as — read from our own <script>
// tag's `?v=` query. Compared against the deployed index.html so a client
// running stale cached JS can prompt the user to reload. No constant to
// maintain — it's the same ?v= already bumped on every release.
const RUNNING_APP_VERSION = (() => {
  const s = document.querySelector('script[src*="app.jsx"]');
  const m = s && s.src.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
})();

function AppRoot() {
  const [ready, setReady] = useState(false);
  // dataVersion is incremented every time loadGameDataFromFirebase succeeds.
  // Passing it as a prop into App forces a re-render even though the App
  // component itself doesn't directly read gameData — children's useMemo deps
  // can include `window.SPACE_OPS_DATA._version` to invalidate stale caches.
  const [dataVersion, setDataVersion] = useState(0);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateReason, setUpdateReason] = useState(null); // null | 'code' | 'data'

  useEffect(() => {
    let cancelled = false;
    let lastTs = null;

    loadGameDataFromFirebase().finally(() => {
      if (!cancelled) {
        lastTs = window.SPACE_OPS_DATA?._lastUpdated || null;
        setDataVersion(window.SPACE_OPS_DATA?._version || 0);
        setReady(true);
      }
    });

    // Detect a newer deployed build. Fetches our own index.html with
    // cache:'no-store' and compares the deployed app.jsx ?v= against the
    // version this bundle is running. If they differ, surface a reload
    // banner. This is what stops the "I edited on browser A and browser B
    // still runs old code" class of bug from recurring.
    const checkVersion = async () => {
      if (!RUNNING_APP_VERSION) return;
      try {
        const html = await fetch('./index.html', { cache: 'no-store' }).then((r) => r.text());
        const m = html.match(/app\.jsx\?v=([0-9.]+)/);
        const deployed = m ? m[1] : null;
        if (deployed && deployed !== RUNNING_APP_VERSION && !cancelled) {
          console.log(`[update] running ${RUNNING_APP_VERSION}, deployed ${deployed} — prompting reload`);
          setUpdateReason('code');
          setUpdateAvailable(true);
        }
      } catch (err) { /* offline / transient — ignore */ }
    };

    // Poll for admin XLSX updates every 60s — cheap GET against
    // /gameData/lastUpdated (a single timestamp), only refetches the full
    // object when the timestamp actually changes.
    const tick = async () => {
      try {
        const res = await fetch(`${FIREBASE_DB_URL}/gameData/lastUpdated.json`);
        if (!res.ok) return;
        const ts = await res.json();
        if (!ts || ts === lastTs) return;
        const updated = await loadGameDataFromFirebase();
        if (updated && !cancelled) {
          lastTs = window.SPACE_OPS_DATA?._lastUpdated || ts;
          setDataVersion(window.SPACE_OPS_DATA?._version || 0);
          console.log('[gameData] live refresh applied (admin pushed new XLSX)');
          // Surface the same reload banner used for code updates. The data
          // already refreshed in-place above, but a full reload guarantees
          // every loaded team re-hydrates against the new gameData (stats,
          // weapons, equipment, factions) with no stale derived state.
          // A pending 'code' prompt takes priority (it needs a reload to pick
          // up new app logic); otherwise flag this as a 'data' update.
          setUpdateReason((prev) => (prev === 'code' ? 'code' : 'data'));
          setUpdateAvailable(true);
        }
      } catch (err) { /* ignore transient network errors */ }
    };
    const id = setInterval(tick, 60_000);
    checkVersion();
    const versionId = setInterval(checkVersion, 120_000);

    // Also refresh whenever the tab regains visibility — covers laptops
    // waking from sleep or users tabbing back after a long idle.
    const onVis = () => { if (document.visibilityState === 'visible') { tick(); checkVersion(); } };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(versionId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  if (!ready) {
    return (
      <div style={{
        display: 'grid', placeItems: 'center', minHeight: '100vh',
        color: 'var(--muted)', fontSize: 14, fontFamily: 'inherit'
      }}>
        Loading game data…
      </div>
    );
  }
  return (
    <>
      {updateAvailable && (
        <div
          onClick={() => window.location.reload(true)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: 'var(--red)', color: '#fff', textAlign: 'center',
            padding: '10px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {updateReason === 'data'
            ? 'Game data was updated — tap to reload'
            : 'A new version is available — tap to reload'}
        </div>
      )}
      <App dataVersion={dataVersion} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<AppRoot />);

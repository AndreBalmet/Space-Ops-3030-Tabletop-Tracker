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
// The savedTeams list is device-wide, but teams belong to the player who
// created/saved them. Filter at every surface (Load modal, backfill, hasSaved)
// so signing into a second account on a shared device doesn't expose — or,
// via backfill, cross-copy — another player's teams.
const teamsOwnedBy = (player) => loadSavedTeams().filter((t) => t.owner === player);
const writeSavedTeams = (arr) => {
  localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(arr));
};
// Insert-or-replace a snapshot in the savedTeams list, matching by *base* id
// (fb- prefix stripped) so a team loaded from the cloud updates the existing
// local row instead of creating a sibling 'fb-<id>' duplicate.
const upsertSavedTeam = (snapshot) => {
  const base = stripFbPrefix(snapshot.id);
  const list = loadSavedTeams().filter((t) => stripFbPrefix(t.id) !== base);
  list.unshift(snapshot);
  writeSavedTeams(list);
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

// --- Team storage resolution (Phase 2: uid-keyed canonical storage) ---
// Auth accounts store teams canonically under /teams/<uid> (a stable key the
// Phase 3 rules can enforce owner-only writes against) with tombstones under
// /deletedTeams/<uid>. Every write is ALSO mirrored to the legacy
// /players/<username>/teams path so the legacy tracker (sessions/combat),
// which reads teams by player name, keeps working. Legacy typed-name
// sessions (pre-v15.1 logins with no auth session) use the old paths only.
function teamStorage(player) {
  const sess = loadAuthSession();
  const legacyTeams = `${FIREBASE_DB_URL}/players/${encodeURIComponent(player)}/teams`;
  const legacyTombs = `${FIREBASE_DB_URL}/players/${encodeURIComponent(player)}/deletedTeams`;
  if (sess && sess.uid && sess.username === player) {
    return {
      isUid: true,
      teamsUrl: `${FIREBASE_DB_URL}/teams/${encodeURIComponent(sess.uid)}`,
      tombsUrl: `${FIREBASE_DB_URL}/deletedTeams/${encodeURIComponent(sess.uid)}`,
      mirrorTeamsUrl: legacyTeams,
      mirrorTombsUrl: legacyTombs,
    };
  }
  return { isUid: false, teamsUrl: legacyTeams, tombsUrl: legacyTombs, mirrorTeamsUrl: null, mirrorTombsUrl: null };
}

// One-time migration per account: if the uid-keyed location is empty and the
// legacy name-keyed location has teams, copy teams AND tombstones across.
// Idempotent — a populated canonical location is never overwritten.
async function migrateTeamsToUid(player) {
  const st = teamStorage(player);
  if (!st.isUid) return 0;
  try {
    const canonical = await fetch(`${st.teamsUrl}.json?shallow=true`).then((r) => (r.ok ? r.json() : null));
    if (canonical && Object.keys(canonical).length > 0) return 0; // already migrated
    const legacy = await fetch(`${st.mirrorTeamsUrl}.json`).then((r) => (r.ok ? r.json() : null));
    if (!legacy || Object.keys(legacy).length === 0) return 0; // nothing to migrate
    const res = await fetch(`${st.teamsUrl}.json`, { method: 'PUT', body: JSON.stringify(legacy) });
    if (!res.ok) return 0;
    // Tombstones too — otherwise a stale device's backfill could resurrect
    // teams that were deleted before the migration.
    const legacyTombs = await fetch(`${st.mirrorTombsUrl}.json`).then((r) => (r.ok ? r.json() : null));
    if (legacyTombs && Object.keys(legacyTombs).length > 0) {
      await fetch(`${st.tombsUrl}.json`, { method: 'PUT', body: JSON.stringify(legacyTombs) });
    }
    console.log(`[fb] migrated ${Object.keys(legacy).length} team(s) to account storage for ${player}`);
    return Object.keys(legacy).length;
  } catch (err) {
    console.warn('[fb] team migration failed:', err);
    return 0;
  }
}

async function fetchFirebaseTeams(playerName) {
  if (!playerName) return [];
  try {
    const res = await fetch(`${teamStorage(playerName).teamsUrl}.json`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data) return [];
    const teams = Object.entries(data).map(([fbId, fbTeam]) => ({ ...convertFbTeam(fbId, fbTeam), owner: playerName }));
    // Hide teams with a queued-but-unflushed offline delete so they can't
    // resurrect in the Load list mid-flush — unless the cloud copy was edited
    // elsewhere AFTER the delete, in which case the edit wins (same rule the
    // cloud tombstones use).
    const pending = new Map(loadPendingTombstones().filter((e) => e.player === playerName).map((e) => [e.teamId, e.ts]));
    return pending.size === 0 ? teams
      : teams.filter((t) => !((pending.get(stripFbPrefix(t.id)) || 0) > (t.savedAt || 0)));
  } catch (err) {
    console.warn('[fb] fetch failed:', err);
    return [];
  }
}

// Strip the 'fb-' prefix `convertFbTeam` adds when loading, so saving back to
// Firebase writes to the original path and doesn't create a duplicate entry.
const stripFbPrefix = (id) => (typeof id === 'string' && id.startsWith('fb-')) ? id.slice(3) : id;

// ============================================================
// FIREBASE AUTHENTICATION (REST — no SDK, same style as the DB bridge)
// Email/password accounts with email verification + password reset.
// The API key is the public client key (same one tracker.html ships) —
// it identifies the project, it is not a secret; security comes from
// Firebase Auth itself and (Phase 3) database rules.
// ============================================================
const FIREBASE_API_KEY = 'AIzaSyAtbd-U5_-sIoPPX8iViFmi6_-DgVD16vk';
const AUTH_SESSION_KEY = 'spaceops.auth.v1';

// Firebase returns terse error codes (sometimes with a " : detail" suffix) —
// map the ones players can actually hit to human sentences.
const AUTH_ERROR_MESSAGES = {
  EMAIL_EXISTS: 'An account with that email already exists. Try logging in.',
  EMAIL_NOT_FOUND: 'No account found with that email.',
  INVALID_PASSWORD: 'Incorrect password.',
  INVALID_LOGIN_CREDENTIALS: 'Incorrect email/username or password.',
  INVALID_EMAIL: 'That email address doesn’t look valid.',
  WEAK_PASSWORD: 'Password must be at least 6 characters.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts — wait a few minutes and try again.',
  USER_DISABLED: 'This account has been disabled.',
};
const authErrorMessage = (raw) => {
  const code = String(raw || '').split(':')[0].trim();
  return AUTH_ERROR_MESSAGES[code] || ('Sign-in error: ' + raw);
};

async function authRequest(endpoint, body) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || 'AUTH_ERROR');
  return data;
}
const authSignUp = (email, password) => authRequest('signUp', { email, password, returnSecureToken: true });
const authSignIn = (email, password) => authRequest('signInWithPassword', { email, password, returnSecureToken: true });
const authSendVerifyEmail = (idToken) => authRequest('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken });
const authSendPasswordReset = (email) => authRequest('sendOobCode', { requestType: 'PASSWORD_RESET', email });
const authAccountInfo = (idToken) => authRequest('lookup', { idToken }).then((d) => (d.users && d.users[0]) || null);

// --- Username registry ---
// Usernames are unique case-insensitively; the lowercase form keys
// /usernames/<key> → { uid, email } so "log in with username" can resolve
// the email Firebase Auth actually authenticates with. Profile data lives
// at /users/<uid> (username as typed, email, promo consent, createdAt).
const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/;
const usernameKey = (u) => (u || '').trim().toLowerCase();

async function fetchUsernameRecord(username) {
  const key = usernameKey(username);
  if (!key) return null;
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/usernames/${encodeURIComponent(key)}.json`);
    return res.ok ? await res.json() : null;
  } catch { return null; }
}
async function writeUsernameRecord(username, rec) {
  const res = await fetch(`${FIREBASE_DB_URL}/usernames/${encodeURIComponent(usernameKey(username))}.json`, {
    method: 'PUT', body: JSON.stringify(rec),
  });
  // Throw on rules denial etc. — a silently-missing username record breaks
  // login-by-username later, which is much harder to debug than failing here.
  if (!res.ok) throw new Error('PROFILE_WRITE_FAILED');
}
async function writeUserProfile(uid, profile) {
  const res = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(uid)}.json`, {
    method: 'PUT', body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('PROFILE_WRITE_FAILED');
}
// Roll back a half-created account (auth user exists, profile writes failed)
// so the player can retry cleanly instead of hitting EMAIL_EXISTS forever.
const authDeleteAccount = (idToken) => authRequest('delete', { idToken }).catch(() => {});
async function fetchUserProfile(uid) {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/users/${encodeURIComponent(uid)}.json`);
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

const loadAuthSession = () => {
  try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null'); } catch { return null; }
};
const writeAuthSession = (s) => {
  if (s) localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(AUTH_SESSION_KEY);
};

// Reverse of `convertFbTeam` — pack a local team object into the legacy
// tracker's `/players/<player>/teams/<id>` shape so iPad ↔ laptop ↔ legacy
// tracker can all see the same teams. We split each asset's slots back into
// `weapons` and `inventory` by kind; `defaults.weapons` / `defaults.equipment`
// (the free loadout the model ships with) round-trip via the same field names.
function assetToFbModel(a) {
  const m = findModel(a.modelId);
  // Carried items (see fbModelToAsset): items that didn't resolve against the
  // current game data go back into the array they came from, so a renamed or
  // removed weapon/equipment survives the round-trip instead of vanishing.
  const carried = (from) => (a.unknownItems || []).filter((i) => i && i.from === from).map((i) => i.name);
  const weapons = [
    ...(a.slots || []).filter((s) => s && s.kind === 'weapon').map((s) => s.name),
    ...carried('weapons'),
  ];
  const inventory = [
    ...(a.slots || []).filter((s) => s && s.kind === 'equipment').map((s) => s.name),
    ...carried('inventory'),
  ];
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
}

function convertTeamToFb(team) {
  return {
    name: team.name || 'Untitled',
    faction: team.factionId || 'Arc Rangers',
    created: team.createdAt || Date.now(),
    modified: Date.now(),
    models: [
      ...(team.assets || []).map(assetToFbModel),
      // Re-attach models that weren't in the current game data when this team
      // loaded (see convertFbTeam) -- preserved verbatim so a rename or removal
      // in the master XLSX never permanently deletes them from saved teams.
      ...((team.unknownModels || []).filter((m) => m && m.name)),
    ],
  };
}

async function saveTeamToFirebase(player, team) {
  if (!player || !team || !team.id) return false;
  const fbId = stripFbPrefix(team.id);
  const st = teamStorage(player);
  const body = JSON.stringify(convertTeamToFb(team));
  try {
    const res = await fetch(`${st.teamsUrl}/${encodeURIComponent(fbId)}.json`, { method: 'PUT', body });
    // Mirror to the legacy name-keyed path (fire-and-forget) so the legacy
    // tracker's sessions keep seeing this account's teams.
    if (res.ok && st.mirrorTeamsUrl) {
      fetch(`${st.mirrorTeamsUrl}/${encodeURIComponent(fbId)}.json`, { method: 'PUT', body }).catch(() => {});
    }
    return res.ok;
  } catch (err) {
    console.warn('[fb] team save failed:', err);
    return false;
  }
}

// --- Offline delete queue (bug #2) ---
// A team deleted while offline removed the local copy, but the cloud tombstone
// write failed silently -- so the cloud copy survived, reappeared on the next
// refetch, and other devices never purged it. Queue the tombstone locally and
// flush it on the next `online` event (the same offline-retry shape the
// backfill already uses for saves).
const PENDING_TOMBS_KEY = 'spaceops.pendingTombs.v1';
const loadPendingTombstones = () => {
  try { const a = JSON.parse(localStorage.getItem(PENDING_TOMBS_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
};
const writePendingTombstones = (arr) => {
  try { localStorage.setItem(PENDING_TOMBS_KEY, JSON.stringify(arr)); } catch { /* quota */ }
};
const queuePendingTombstone = (player, teamId, ts) => {
  if (!player || !teamId) return;
  const base = stripFbPrefix(teamId);
  // Freeze the storage URLs NOW. The flush can run after a logout/account
  // switch, when teamStorage(player) would no longer see this player's auth
  // session and would silently fall back to the legacy name path — deleting
  // the mirror but leaving the canonical /teams/<uid> copy alive to resurrect.
  const st = teamStorage(player);
  const rest = loadPendingTombstones().filter((e) => !(e.player === player && e.teamId === base));
  rest.push({
    player, teamId: base, ts: ts || Date.now(),
    urls: { tombsUrl: st.tombsUrl, teamsUrl: st.teamsUrl, mirrorTombsUrl: st.mirrorTombsUrl, mirrorTeamsUrl: st.mirrorTeamsUrl },
  });
  writePendingTombstones(rest);
};
// Retry every queued delete. Runs on login and on the `online` event. Each
// entry re-writes its tombstone with the ORIGINAL deletion timestamp (so a
// team edited elsewhere after the delete still wins) and deletes the cloud
// copy; entries that succeed drop off the queue, failures stay for next time.
async function flushPendingTombstones() {
  if (!navigator.onLine) return 0;
  const queue = loadPendingTombstones();
  if (queue.length === 0) return 0;
  const remaining = [];
  let flushed = 0;
  for (const e of queue) {
    try {
      // Prefer the URLs frozen at queue time (see queuePendingTombstone);
      // fall back to live resolution for entries queued by older builds.
      const st = e.urls || teamStorage(e.player);
      const fbId = encodeURIComponent(stripFbPrefix(e.teamId));
      const body = JSON.stringify(e.ts);
      await fetch(`${st.tombsUrl}/${fbId}.json`, { method: 'PUT', body });
      await fetch(`${st.teamsUrl}/${fbId}.json`, { method: 'DELETE' });
      if (st.mirrorTeamsUrl) {
        fetch(`${st.mirrorTombsUrl}/${fbId}.json`, { method: 'PUT', body }).catch(() => {});
        fetch(`${st.mirrorTeamsUrl}/${fbId}.json`, { method: 'DELETE' }).catch(() => {});
      }
      flushed++;
    } catch { remaining.push(e); }
  }
  writePendingTombstones(remaining);
  if (flushed > 0) console.log(`[fb] flushed ${flushed} queued offline delete(s)`);
  return flushed;
}

async function deleteTeamFromFirebase(player, teamId, ts) {
  if (!player || !teamId) return false;
  const fbId = stripFbPrefix(teamId);
  const st = teamStorage(player);
  const stamp = ts || Date.now();
  // Offline: the tombstone PUT below would throw and the cloud copy would
  // survive (bug #2). Queue the delete and flush on reconnect instead.
  if (!navigator.onLine) { queuePendingTombstone(player, fbId, stamp); return false; }
  try {
    // Tombstone FIRST, then delete. Without the tombstone, any other device
    // that still holds a local copy would "backfill" the team right back
    // into the cloud on its next login/reconnect — deletes never stuck.
    // Devices compare the tombstone timestamp against their local savedAt:
    // tombstone newer → purge local copy; local newer (team was edited after
    // the delete elsewhere) → the edit wins and the tombstone is cleared.
    const ts = JSON.stringify(stamp);
    await fetch(`${st.tombsUrl}/${encodeURIComponent(fbId)}.json`, { method: 'PUT', body: ts });
    const res = await fetch(`${st.teamsUrl}/${encodeURIComponent(fbId)}.json`, { method: 'DELETE' });
    // Keep the legacy mirror in step so the legacy tracker (and any
    // pre-v15.2 device still reading the old path) sees the delete too.
    if (st.mirrorTeamsUrl) {
      fetch(`${st.mirrorTombsUrl}/${encodeURIComponent(fbId)}.json`, { method: 'PUT', body: ts }).catch(() => {});
      fetch(`${st.mirrorTeamsUrl}/${encodeURIComponent(fbId)}.json`, { method: 'DELETE' }).catch(() => {});
    }
    if (!res.ok) queuePendingTombstone(player, fbId, stamp);
    return res.ok;
  } catch (err) {
    console.warn('[fb] team delete failed - queued for retry:', err);
    queuePendingTombstone(player, fbId, stamp);
    return false;
  }
}

// Map of tombstoned team id → deletion timestamp for a player, or {}.
async function fetchDeletedTeamIds(player) {
  if (!player) return {};
  try {
    const res = await fetch(`${teamStorage(player).tombsUrl}.json`);
    if (!res.ok) return {};
    return (await res.json()) || {};
  } catch { return {}; }
}

async function clearTombstone(player, teamId) {
  const st = teamStorage(player);
  const fbId = encodeURIComponent(stripFbPrefix(teamId));
  try {
    await fetch(`${st.tombsUrl}/${fbId}.json`, { method: 'DELETE' });
    if (st.mirrorTombsUrl) fetch(`${st.mirrorTombsUrl}/${fbId}.json`, { method: 'DELETE' }).catch(() => {});
  } catch { /* non-fatal — a stale tombstone loses to a newer savedAt anyway */ }
}

// Retired model names -> their current equivalents, so a team saved under an
// old name still resolves after a rename in the master XLSX. Add entries here
// when you rename a model. Anything matching NO alias is still preserved
// verbatim (see the unknownModels carry-through below) -- nothing is ever
// silently dropped.
const RETIRED_MODEL_ALIASES = {
  // 'Ranger-Captain in Hardsuit': 'Veteran Captain',  // example -- fill in real renames
};
const resolveModelName = (name) => {
  if (!name) return name;
  return RETIRED_MODEL_ALIASES[name] || RETIRED_MODEL_ALIASES[name.toLowerCase()] || name;
};

// Same idea for weapons/equipment: renamed items heal via this table; anything
// unmatched is carried through the round-trip (see fbModelToAsset) instead of
// dropped -- the Damp Claws / Dual Wield loss was this exact shape.
const RETIRED_ITEM_ALIASES = {
  // 'Old Item Name': 'Current Item Name',
};
const resolveItemName = (name) => {
  if (!name) return name;
  return RETIRED_ITEM_ALIASES[name] || RETIRED_ITEM_ALIASES[name.toLowerCase()] || name;
};

// Find a model def by (alias-resolved) stored name, or null.
const findModelByStoredName = (storedName) => {
  const lookupName = resolveModelName(storedName);
  return DATA.models.find((m) => m.name === lookupName)
    || DATA.models.find((m) => (m.name || '').toLowerCase() === (lookupName || '').toLowerCase())
    || null;
};

// One stored FB model record -> a builder asset, given its resolved model def.
function fbModelToAsset(fbm, def) {
  const totalSlots = num(def.totalSlots) || 0;
  const slots = Array.from({ length: totalSlots }, () => null);
  const defaultInv = Array.isArray(fbm.defaultInventory) ? fbm.defaultInventory : [];
  const defaultWep = Array.isArray(fbm.defaultWeapons) ? fbm.defaultWeapons : [];
  const defaultInvSet = new Set(defaultInv);
  const defaultWepSet = new Set(defaultWep);
  // Live tracker stores some items in BOTH weapons[] and inventory[] (e.g. grenades,
  // cyberdecks) — dedup inventory against everything. But duplicates WITHIN
  // weapons[] are meaningful: two copies of the same melee weapon = Dual
  // Wield, and each occupies its own slot. Collapsing them here is what
  // silently stripped the second weapon (and the Dual Wield buff) every
  // time a team round-tripped through the cloud.
  const seen = new Set();
  const items = [];
  const collect = (src, defaults, allowDupes, from) => {
    if (!Array.isArray(src)) return;
    for (const v of src) {
      const name = (typeof v === 'string' ? v : v?.name) || '';
      if (!name || defaults.has(name)) continue;
      if (!allowDupes && seen.has(name)) continue;
      seen.add(name);
      items.push({ name, from });
    }
  };
  collect(fbm.weapons, defaultWepSet, true, 'weapons');
  collect(fbm.inventory, defaultInvSet, false, 'inventory');
  let slotIdx = 0;
  const unknownItems = [];
  for (const it of items) {
    const name = resolveItemName(it.name);
    const kind = findWeapon(name) ? 'weapon' : (findEquipment(name) ? 'equipment' : null);
    // Unresolvable (renamed/removed in the XLSX) or out of slots (capacity
    // shrank in the data): carry the item instead of dropping it — the cloud
    // auto-republish would otherwise make the loss permanent. assetToFbModel
    // writes carried items back to their source array, so they re-resolve
    // whenever the name returns to the data or an alias is added.
    if (!kind) {
      console.warn('[fb] unknown item (preserved):', it.name);
      unknownItems.push(it);
      continue;
    }
    if (slotIdx >= totalSlots) { unknownItems.push(it); continue; }
    slots[slotIdx++] = { kind, name };
  }
  return {
    instanceId: ++nextInstanceId,
    modelId: def.id,
    slots,
    // Preserve free defaults so the view page can render the full model loadout.
    defaults: { weapons: defaultWep, equipment: defaultInv },
    // Restore the per-asset custom name (rename in Team View). Ignore a
    // customName that just echoes the model's own name — that's the legacy
    // tracker's default, not a real rename.
    ...(fbm.customName && fbm.customName !== def.name ? { customName: fbm.customName } : {}),
    ...(unknownItems.length ? { unknownItems } : {}),
  };
}

function convertFbTeam(fbId, fb) {
  const factionId = normalizeFactionId(fb.faction || 'Arc Rangers');
  const fbModels = Array.isArray(fb.models) ? fb.models : [];
  const assets = [];
  const unknownModels = [];
  for (const fbm of fbModels) {
    if (!fbm || !fbm.name) continue;
    const def = findModelByStoredName(fbm.name);
    if (!def) {
      // Not in current game data (renamed/removed in the XLSX, or a faction
      // not loaded). DON'T drop it -- since the cloud auto-republishes, that
      // would permanently delete the model from the team. Carry the raw
      // record through untouched; convertTeamToFb writes it back, and it
      // self-heals if the name returns to game data or an alias is added.
      console.warn('[fb] unknown model (preserved as unavailable):', fbm.name);
      unknownModels.push(fbm);
      continue;
    }
    assets.push(fbModelToAsset(fbm, def));
  }
  return {
    id: 'fb-' + fbId,
    name: fb.name || 'Untitled',
    factionId,
    assets,
    createdAt: fb.created || Date.now(),
    savedAt: fb.modified || fb.created,
    _source: 'firebase',
    ...(unknownModels.length ? { unknownModels } : {}),
  };
}

// The local twin of convertFbTeam's carry-through, applied wherever a team
// enters memory from localStorage (mount restore, Load Team). Assets whose
// model no longer resolves (XLSX rename/removal) move into team.unknownModels
// in FB shape — assetToFbModel republishes them, so they survive — instead of
// being silently dropped and then auto-saved away. Previously-unknown models
// whose names resolve again (data restored, or an alias added) are re-adopted
// as live assets. Also re-instances every kept asset (instanceIds are
// session-scoped).
function reconcileTeamAssets(team) {
  if (!team || !Array.isArray(team.assets)) return team;
  const assets = [];
  const unknownModels = [];
  for (const a of team.assets) {
    if (findModel(a.modelId)) { assets.push({ ...a, instanceId: ++nextInstanceId }); continue; }
    // Model ids fall back to names for XLSX data, so the alias table applies
    // to local assets too — a mapped rename heals in place.
    const aliased = resolveModelName(a.modelId);
    if (aliased !== a.modelId && findModel(aliased)) {
      assets.push({ ...a, modelId: aliased, instanceId: ++nextInstanceId });
      continue;
    }
    if (!a.modelId) continue; // pre-v15.0.1 id:'' orphan — unidentifiable, drop as before
    console.warn('[team] unavailable model (preserved):', a.modelId);
    unknownModels.push(assetToFbModel(a));
  }
  for (const fbm of team.unknownModels || []) {
    if (!fbm || !fbm.name) continue;
    const def = findModelByStoredName(fbm.name);
    if (def) {
      console.log('[team] unavailable model healed:', fbm.name);
      assets.push(fbModelToAsset(fbm, def));
    } else {
      unknownModels.push(fbm);
    }
  }
  const out = { ...team, assets };
  if (unknownModels.length) out.unknownModels = unknownModels;
  else delete out.unknownModels;
  return out;
}

// ============================================================
// NUX — first-time-user tour
// ============================================================
// Chapters fire contextually the first time each part of the app is seen:
// 'welcomed' (intro popup on Home) → 'home' (menu tour) → 'builder' (first
// time in the builder) → 'armory' (first time the armory popup opens) →
// 'view' (first Team View). Completed chapters are flagged in localStorage;
// "Skip Tutorial" flags everything. Replay via the link on the Home screen.
const NUX_KEY = 'spaceops.nux.v1';
const NUX_CHAPTERS = ['welcomed', 'home', 'builder', 'armory', 'view'];
const loadNux = () => {
  try { const o = JSON.parse(localStorage.getItem(NUX_KEY) || '{}'); return o && typeof o === 'object' ? o : {}; }
  catch { return {}; }
};
const writeNux = (o) => {
  try { localStorage.setItem(NUX_KEY, JSON.stringify(o)); } catch { /* quota */ }
};

// Spotlight tour overlay. Each step: { sel, title, body, onEnter } — `sel` is
// a [data-tour] selector to highlight (missing/null → centered card). The
// backdrop blocks interaction while the tour runs; Skip ends the whole
// tutorial (onSkip), finishing the last step completes the chapter (onDone).
function TourOverlay({ steps, onDone, onSkip }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const scrolledRef = useRef(-1);
  const step = steps[idx];

  useEffect(() => {
    if (!step) return;
    let raf = 0;
    const measure = () => {
      const el = step.sel ? document.querySelector(step.sel) : null;
      if (!el) { setRect(null); return; }
      // Bring an off-screen target into view once per step.
      if (scrolledRef.current !== idx) {
        scrolledRef.current = idx;
        const r0 = el.getBoundingClientRect();
        if (r0.top < 60 || r0.bottom > window.innerHeight - 60) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    // Layout can shift under the tour (font loads, column animations) —
    // re-measure on a slow tick so the spotlight never drifts.
    const iv = setInterval(measure, 400);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
      clearInterval(iv);
      cancelAnimationFrame(raf);
    };
  }, [idx, step && step.sel]);

  if (!step) return null;
  const last = idx === steps.length - 1;
  const next = () => {
    if (last) { onDone(); return; }
    const s = steps[idx + 1];
    if (s && s.onEnter) s.onEnter();
    setIdx(idx + 1);
  };
  const back = () => setIdx(Math.max(0, idx - 1));

  // Card sits under the target when there's room, above it otherwise,
  // clamped to the viewport. No target → centered.
  const CARD_W = 300, CARD_H = 190, GAP = 14;
  const cardStyle = rect
    ? {
        width: CARD_W,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - CARD_W - 16)),
        top: rect.top + rect.height + GAP + CARD_H < window.innerHeight
          ? rect.top + rect.height + GAP
          : Math.max(16, rect.top - GAP - CARD_H),
      }
    : { width: CARD_W + 20, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div className="tour">
      <div className={'tour__backdrop' + (rect ? '' : ' is-dim')} />
      {rect && (
        <div
          className="tour__spot"
          style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }}
        />
      )}
      <div className="tour__card" style={cardStyle}>
        <div className="tag">Tutorial — {idx + 1}/{steps.length}</div>
        <h3 className="tour__title">{step.title}</h3>
        <p className="tour__body">{step.body}</p>
        <div className="tour__actions">
          <button className="tour__skip" onClick={onSkip || onDone}>Skip Tutorial</button>
          <span className="tour__nav">
            {idx > 0 && <button onClick={back}>Back</button>}
            <button className="tour__next" onClick={next}>{last ? 'Done' : 'Next'}</button>
          </span>
        </div>
      </div>
    </div>
  );
}

// Intro popup shown on the Home screen before any chapter runs.
function WelcomeModal({ onTour, onSkip }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="tag">Welcome</div>
        <h2>Space-Ops 3030 Team Builder</h2>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: '10px 0 4px' }}>
          Build your ops team: pick a faction, add models, equip gear from the
          Armory, and stay under the rating cap. Teams save to your account and
          sync to every device.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 6px' }}>
          First time here? Take a quick tour — it walks you through each screen
          as you reach it.
        </p>
        <div className="modal__actions">
          <button onClick={onSkip}>Skip Tutorial</button>
          <button onClick={onTour} style={{ color: 'var(--red)', fontWeight: 800 }}>Take the Tour</button>
        </div>
      </div>
    </div>
  );
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
    // Re-instances assets (instanceIds are session-scoped) and preserves
    // assets whose model no longer resolves as unknownModels rather than
    // dropping them — dropping here used to permanently delete renamed
    // models via the auto-save republish, even after the cloud-side fix.
    return reconcileTeamAssets(cur);
  });
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // {kind:'load'} | {kind:'login'}
  // NUX chapter flags ({welcomed:1, home:1, ...}); missing key = not seen yet.
  const [nux, setNux] = useState(loadNux);
  const markNux = (...chapters) => {
    setNux((cur) => {
      const out = { ...cur };
      for (const c of chapters) out[c] = 1;
      writeNux(out);
      return out;
    });
  };
  const skipNux = () => markNux(...NUX_CHAPTERS);
  const replayNux = () => { setNux({}); writeNux({}); };
  const [firebaseTeams, setFirebaseTeams] = useState(null); // null = loading, [] = empty
  // Set when the open team is replaced by a fresher cloud copy, so the
  // auto-save that follows doesn't push the identical data straight back up.
  const skipCloudPushRef = useRef(false);

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
    // Auto-save: every team change is debounced and written to BOTH the
    // localStorage savedTeams list (instant, survives refresh) and the
    // player's cloud path. The cloud is the source of truth — every edit
    // publishes, not just explicit Save Team clicks. Offline pushes fail
    // silently here; the login/online backfill upsyncs anything whose local
    // copy is newer than (or missing from) the cloud.
    if (!team) return;
    const handle = setTimeout(() => {
      // A copy just adopted FROM the cloud is written locally with the
      // cloud's own timestamp and NOT pushed back up — it's byte-identical,
      // and re-stamping `modified` would make every other device see a
      // phantom "newer" copy and re-adopt in a loop (backfill included).
      const adopted = skipCloudPushRef.current;
      skipCloudPushRef.current = false;
      const snapshot = {
        ...team,
        owner: team.owner || player,
        savedAt: adopted ? (team.savedAt || Date.now()) : Date.now(),
      };
      upsertSavedTeam(snapshot);
      if (!adopted && player && navigator.onLine && snapshot.owner === player) {
        saveTeamToFirebase(player, snapshot);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [team, player]);
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
    // Upgrade an already-logged-in auth session to admin if its account is
    // flagged in /admins — covers flags granted after login (no re-login
    // needed; takes effect on next app load / player change).
    const sess = loadAuthSession();
    if (!sess || !player || isAdmin) return;
    fetch(`${FIREBASE_DB_URL}/admins/${encodeURIComponent(sess.uid)}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => { if (v === true) setIsAdmin(true); })
      .catch(() => {});
  }, [player, isAdmin]);
  useEffect(() => {
    // If the signed-in player switches to an account that doesn't own the
    // open team, close it — otherwise the auto-save would stamp the new
    // account as owner and the backfill would copy the team into their
    // cloud path. The team stays in savedTeams for its real owner.
    if (team && team.owner && player && team.owner !== player) {
      setTeam(null);
      writeCurrent(null);
      setScreen('home');
    }
  }, [player, team]);
  useEffect(() => {
    if (!player) { setFirebaseTeams([]); return; }
    let cancelled = false;
    setFirebaseTeams(null);
    // Phase 2 migration: on login, move this account's teams from the legacy
    // name-keyed path to uid-keyed storage if that hasn't happened yet.
    // Resolves before the first fetch so the list is right immediately.
    const migrated = migrateTeamsToUid(player).catch(() => 0);
    const refresh = async () => {
      await migrated;
      const [teams, dead] = await Promise.all([fetchFirebaseTeams(player), fetchDeletedTeamIds(player)]);
      if (cancelled) return;
      setFirebaseTeams(teams);
      // Propagate deletions made on other devices: purge any local copy
      // whose tombstone is newer than its last local save, and close the
      // open team if it's among them.
      const isDead = (t) => (dead[stripFbPrefix(t.id)] || 0) > (t.savedAt || 0);
      const local = loadSavedTeams();
      const keep = local.filter((t) => !isDead(t));
      if (keep.length !== local.length) {
        writeSavedTeams(keep);
        console.log(`[fb] purged ${local.length - keep.length} team(s) deleted on another device`);
      }
      setTeam((prev) => {
        if (!prev) return prev;
        // Judge the open team by its savedTeams row when one exists — the
        // in-memory copy's savedAt lags behind the auto-save's stamps.
        const row = keep.find((t) => stripFbPrefix(t.id) === stripFbPrefix(prev.id));
        if (isDead(row || prev)) { writeCurrent(null); return null; }
        return prev;
      });
    };
    refresh();
    // Refetch when the tab returns to the foreground (iPad coming back from
    // the home screen / another app) so edits published from other devices
    // show up without a manual reload.
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis); };
  }, [player]);
  useEffect(() => {
    // Cross-device sync for the OPEN team: if the cloud copy is newer than
    // our local snapshot (another device hit Save Team after we last touched
    // it here), adopt the cloud copy. Last write wins — `savedAt` maps from
    // FB `modified` so the two sides are directly comparable.
    if (!team || !Array.isArray(firebaseTeams)) return;
    const base = stripFbPrefix(team.id);
    const cloud = firebaseTeams.find((t) => stripFbPrefix(t.id) === base);
    if (!cloud) return;
    const localRow = loadSavedTeams().find((t) => stripFbPrefix(t.id) === base);
    const localTs = (localRow && localRow.savedAt) || team.savedAt || team.createdAt || 0;
    if ((cloud.savedAt || 0) > localTs) {
      console.log('[fb] cloud copy of open team is newer — adopting');
      skipCloudPushRef.current = true;
      const { _source, ...rest } = cloud;
      setTeam({
        ...rest,
        id: base,
        owner: cloud.owner || player,
        assets: (cloud.assets || []).map((a) => ({ ...a, instanceId: ++nextInstanceId })),
      });
    }
  }, [firebaseTeams]);
  // Backfill: push any local team that isn't yet on Firebase. Returns the
  // number pushed. Idempotent — running it repeatedly is safe. Used in two
  // places: on player login (in-effect below) and on `online` event (so a
  // team built while offline syncs as soon as connection returns).
  const runBackfill = useCallback(async () => {
    if (!player || !navigator.onLine) return 0;
    let local = loadSavedTeams();
    if (local.length === 0) return 0;
    // Never push into an unmigrated canonical store — a push landing before
    // the migration would make it look already-migrated and strand the
    // legacy teams. Idempotent + cheap once migration has happened.
    await migrateTeamsToUid(player).catch(() => {});
    const fbTeams = await fetchFirebaseTeams(player);
    const fbIds = new Set(fbTeams.map((t) => stripFbPrefix(t.id)));
    // Migration: local teams saved before the `owner` field existed have no
    // owner. Claim the ones that already live in THIS player's cloud account
    // (they were saved/backfilled under it pre-v15.0.26). Teams owned by —
    // or unclaimed by — other accounts are left alone.
    let claimed = 0;
    local = local.map((t) => {
      if (!t.owner && fbIds.has(stripFbPrefix(t.id))) { claimed++; return { ...t, owner: player }; }
      return t;
    });
    if (claimed > 0) {
      writeSavedTeams(local);
      console.log(`[fb] claimed ${claimed} legacy local team(s) for ${player}`);
    }
    // Tombstones: teams deleted from the cloud must not be pushed back by a
    // device that still holds a local copy. A tombstone newer than the local
    // savedAt purges the local copy; a local copy edited AFTER the deletion
    // wins instead and clears its tombstone below.
    const dead = await fetchDeletedTeamIds(player);
    const purged = local.filter((t) => (dead[stripFbPrefix(t.id)] || 0) > (t.savedAt || 0));
    if (purged.length > 0) {
      local = local.filter((t) => !purged.includes(t));
      writeSavedTeams(local);
      console.log(`[fb] backfill purged ${purged.length} team(s) deleted on another device`);
    }
    // Only push teams this player owns — pushing unowned/foreign teams is how
    // one account's teams used to leak into another's cloud path. Push a team
    // when the cloud doesn't have it yet OR the local copy is newer (edits
    // made while offline; the auto-save's cloud push failed silently then).
    const fbByBase = new Map(fbTeams.map((t) => [stripFbPrefix(t.id), t]));
    const toPush = local.filter((t) => {
      if (t.owner !== player) return false;
      const cloud = fbByBase.get(stripFbPrefix(t.id));
      return !cloud || (t.savedAt || 0) > (cloud.savedAt || 0);
    });
    // Re-pushed teams that carried a (stale) tombstone are alive again.
    toPush.forEach((t) => { if (dead[stripFbPrefix(t.id)]) clearTombstone(player, t.id); });
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
    // On player login: flush queued offline deletes BEFORE the backfill reads
    // cloud state, so the backfill never races a half-applied delete.
    if (!player) return;
    (async () => {
      await flushPendingTombstones().catch(() => {});
      await runBackfill().catch((err) => console.warn('[fb] backfill failed:', err));
    })();
  }, [player, runBackfill]);

  useEffect(() => {
    // On connection regained (offline → online), re-run backfill so a team
    // built/saved offline syncs up as soon as the network's back. Also
    // refreshes firebaseTeams in case other devices added new teams while
    // this one was offline.
    const onOnline = async () => {
      if (player) {
        // Deletes first, then backfill — same ordering as the login effect.
        await flushPendingTombstones().catch(() => {});
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
      owner: player,
    };
    setTeam(t);
    setScreen('builder');
  };

  const loadTeam = (saved) => {
    // Normalize the id (strip any 'fb-' prefix from a cloud listing) so the
    // auto-save updates the team's existing local row rather than creating a
    // sibling duplicate. Drop the _source marker — it only describes where
    // this listing came from, not the team itself. reconcileTeamAssets
    // re-instances assets and preserves/heals unavailable models.
    const { _source, ...rest } = saved;
    setTeam(reconcileTeamAssets({
      ...rest,
      id: stripFbPrefix(saved.id),
      owner: saved.owner || player,
    }));
    setScreen('builder');
    setModal(null);
  };

  const saveTeam = () => {
    if (!team) return;
    const snapshot = { ...team, owner: team.owner || player, savedAt: Date.now() };
    upsertSavedTeam(snapshot);
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
    const base = stripFbPrefix(team.id);
    const list = loadSavedTeams().filter((t) => stripFbPrefix(t.id) !== base);
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
          onLogout={() => {
            // Cloud is the source of truth — wipe all local team data on
            // logout so nothing carries over to the next account on this
            // device. Anything worth keeping is already in the cloud (the
            // auto-save publishes every edit).
            setTeam(null);
            writeCurrent(null);
            writeSavedTeams([]);
            writeAuthSession(null);
            setScreen('home');
            setPlayer('');
            setIsAdmin(false);
            showToast('Logged out');
          }}
          onCreate={() => {
            if (!player) { setModal({ kind: 'login', next: 'create' }); return; }
            newTeam();
          }}
          onLoad={() => {
            if (!player) { setModal({ kind: 'login', next: 'load' }); return; }
            setModal({ kind: 'load' });
          }}
          hasSaved={(player ? teamsOwnedBy(player) : loadSavedTeams()).length > 0 || (firebaseTeams && firebaseTeams.length > 0)}
          isAdmin={isAdmin}
          onAdminUpload={() => setModal({ kind: 'xlsx' })}
          onReplayTour={replayNux}
        />
      )}
      {/* NUX: intro popup, then the Home menu chapter. Suppressed while any
          other modal is up so the tour never fights a real dialog. */}
      {screen === 'home' && !modal && !nux.welcomed && (
        <WelcomeModal onTour={() => markNux('welcomed')} onSkip={skipNux} />
      )}
      {screen === 'home' && !modal && nux.welcomed && !nux.home && (
        <TourOverlay
          onDone={() => markNux('home')}
          onSkip={skipNux}
          steps={[
            ...(!player ? [{
              sel: '[data-tour="login"]',
              title: 'Log In',
              body: 'Create a free account so your teams save to the cloud and follow you to any device.',
            }] : []),
            {
              sel: '[data-tour="create"]',
              title: 'Create Team',
              body: 'Start a new company from scratch. You can build several and switch between them.',
            },
            {
              sel: '[data-tour="load"]',
              title: 'Load Team',
              body: 'Reopen any saved team. Teams sync automatically — edits made on one device show up on the rest.',
            },
          ]}
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
          nux={nux}
          onNuxDone={markNux}
          onNuxSkip={skipNux}
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
      {screen === 'view' && team && !nux.view && (
        <TourOverlay
          onDone={() => markNux('view')}
          onSkip={skipNux}
          steps={[{
            sel: null,
            title: 'Team View',
            body: 'Your play-time reference — one card per model with stats, weapons, and gear. Underlined terms are clickable for their full rules, click a model’s name to give it a custom one, and Export to PDF for the table.',
          }]}
        />
      )}

      {modal?.kind === 'load' && (
        <LoadModal
          firebaseTeams={firebaseTeams}
          player={player}
          onPick={loadTeam}
          onClose={() => setModal(null)}
          onDelete={(id) => {
            // Match by base id so deleting a cloud-listed team ('fb-<id>')
            // also removes its plain-id local row, and vice versa.
            const base = stripFbPrefix(id);
            const list = loadSavedTeams().filter((t) => stripFbPrefix(t.id) !== base);
            writeSavedTeams(list);
            // Drop it from the in-memory cloud list immediately — the row
            // otherwise keeps rendering from stale state until the next
            // refetch, which made the Delete button look dead.
            setFirebaseTeams((prev) => Array.isArray(prev) ? prev.filter((t) => stripFbPrefix(t.id) !== base) : prev);
            // Also remove from Firebase so the cloud mirror doesn't reappear
            // the next time the player loads from another device. Strip any
            // 'fb-' prefix the convertFbTeam wrapper added when listing.
            if (player) deleteTeamFromFirebase(player, id);
            // If we just deleted the currently-loaded team, clear the
            // in-memory state too — otherwise the debounced auto-save effect
            // re-writes the team back into savedTeams 500ms later. That's
            // why deleting "the last team" always seemed to leave one.
            if (team && stripFbPrefix(team.id) === base) {
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
        <AuthModal
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
function Home({ player, onChangePlayer, onLogin, onLogout, onCreate, onLoad, hasSaved, isAdmin, onAdminUpload, onReplayTour }) {
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(player);
  useEffect(() => { setDraft(player); }, [player]);

  const loggedIn = !!player;
  // Accounts created through Firebase Auth have a fixed username — the
  // inline rename only applies to legacy (pre-auth) name sessions, where
  // the typed name IS the identity.
  const canRename = loggedIn && !loadAuthSession();

  return (
    <div className="home">
      <div className="home__inner">
      <h1 className="home__title">SPACE-OPS 3030 Team Builder Tool</h1>
      <div className="home__stripes" />
      <p className={'home__player' + (loggedIn ? '' : ' is-empty')}>
        Player Logged In:{' '}
        {editingName && canRename ? (
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
          <span
            style={{ cursor: canRename ? 'pointer' : 'default' }}
            onClick={canRename ? () => setEditingName(true) : undefined}
            title={canRename ? 'Click to rename' : undefined}
          >
            {player}
          </span>
        )}
      </p>
      <div className="home__menu">
        <button data-tour="create" onClick={onCreate}>Create Team</button>
        <button data-tour="load" onClick={onLoad} disabled={!hasSaved}>Load Team</button>
        {isAdmin && (
          <button onClick={onAdminUpload}>Update Game Data (Admin)</button>
        )}
        {loggedIn
          ? <button onClick={onLogout}>Log Out</button>
          : <button data-tour="login" onClick={onLogin}>Log In</button>
        }
      </div>
      <button className="home__replay-tour" onClick={onReplayTour}>Replay Tutorial</button>
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

function AuthModal({ onLogin, onClose }) {
  // modes: 'login' | 'create' | 'verify' (email confirmation pending) |
  //        'forgot' | 'reset-sent'
  const [mode, setMode] = useState('login');
  const [identifier, setIdentifier] = useState(''); // login/forgot: username OR email
  const [username, setUsername] = useState('');     // create
  const [email, setEmail] = useState('');           // create
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Account awaiting email verification: { idToken, uid, email, username, refreshToken }
  const [pending, setPending] = useState(null);
  // The reserved 'admin' name keeps the legacy shared-password flow until
  // Phase 4 replaces it with per-account /admins flags.
  const isAdminAttempt = mode === 'login' && identifier.trim().toLowerCase() === 'admin';

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    font: 'inherit',
    fontSize: 16,
    border: '1px solid var(--line)',
    borderRadius: 4,
    outline: 'none',
  };
  const linkStyle = { color: 'var(--red)', cursor: 'pointer', fontWeight: 700 };
  const switchMode = (m) => { setMode(m); setError(''); setNotice(''); setPassword(''); };

  const completeLogin = async (uid, mail, uname, refreshToken) => {
    writeAuthSession({ uid, email: mail, username: uname, refreshToken, at: Date.now() });
    // Per-account admin flag (Phase 4): accounts listed in /admins get the
    // admin tools with their own login — no shared password needed.
    let admin = false;
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/admins/${encodeURIComponent(uid)}.json`);
      admin = res.ok && (await res.json()) === true;
    } catch { /* offline — admin tools just stay hidden this session */ }
    onLogin(uname, admin);
  };

  const submitLogin = async () => {
    const id = identifier.trim();
    if (!id || !password) return;
    setError(''); setBusy(true);
    try {
      if (isAdminAttempt) {
        const [hash, res] = await Promise.all([
          sha256Hex(password),
          fetch(`${FIREBASE_DB_URL}/admin/passwordHash.json`),
        ]);
        const stored = res.ok ? await res.json() : null;
        if (!stored) { setError('Admin not configured in Firebase.'); setBusy(false); return; }
        if (hash !== stored) { setError('Incorrect admin password.'); setBusy(false); setPassword(''); return; }
        onLogin('admin', true);
        return;
      }
      // Username → email lookup so players can log in with either.
      let loginEmail = id;
      if (!id.includes('@')) {
        const rec = await fetchUsernameRecord(id);
        if (!rec || !rec.email) { setError('No account found with that username.'); setBusy(false); return; }
        loginEmail = rec.email;
      }
      const data = await authSignIn(loginEmail, password);
      const [info, profile] = await Promise.all([
        authAccountInfo(data.idToken),
        fetchUserProfile(data.localId),
      ]);
      const uname = (profile && profile.username) || loginEmail.split('@')[0];
      if (!info || !info.emailVerified) {
        setPending({ idToken: data.idToken, uid: data.localId, email: loginEmail, username: uname, refreshToken: data.refreshToken });
        switchMode('verify');
        setBusy(false);
        return;
      }
      await completeLogin(data.localId, loginEmail, uname, data.refreshToken);
    } catch (err) {
      setError(authErrorMessage(err.message));
      setBusy(false);
    }
  };

  const submitCreate = async () => {
    const uname = username.trim();
    const mail = email.trim();
    setError('');
    if (!USERNAME_RE.test(uname)) { setError('Username must be 3–20 characters: letters, numbers, spaces, dashes or underscores.'); return; }
    if (usernameKey(uname) === 'admin') { setError('That username is reserved.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(mail)) { setError('Enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      const existing = await fetchUsernameRecord(uname);
      if (existing) { setError('That username is taken.'); setBusy(false); return; }
      const data = await authSignUp(mail, password);
      try {
        await Promise.all([
          writeUserProfile(data.localId, { username: uname, email: mail, promoConsent: !!consent, createdAt: Date.now() }),
          writeUsernameRecord(uname, { uid: data.localId, email: mail }),
        ]);
      } catch (profileErr) {
        // Profile writes denied (e.g. DB rules missing /users + /usernames).
        // Roll the auth account back so a retry doesn't hit EMAIL_EXISTS.
        await authDeleteAccount(data.idToken);
        setError('Account setup failed (server rules). Nothing was saved — tell the admin, then try again.');
        setBusy(false);
        return;
      }
      await authSendVerifyEmail(data.idToken);
      setPending({ idToken: data.idToken, uid: data.localId, email: mail, username: uname, refreshToken: data.refreshToken });
      switchMode('verify');
      setBusy(false);
    } catch (err) {
      setError(authErrorMessage(err.message));
      setBusy(false);
    }
  };

  const resendVerify = async () => {
    if (!pending || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await authSendVerifyEmail(pending.idToken);
      setNotice('Confirmation email re-sent to ' + pending.email + '.');
    } catch (err) {
      setError(authErrorMessage(err.message));
    }
    setBusy(false);
  };

  const checkVerified = async () => {
    if (!pending || busy) return;
    setBusy(true); setError('');
    try {
      const info = await authAccountInfo(pending.idToken);
      if (info && info.emailVerified) {
        await completeLogin(pending.uid, pending.email, pending.username, pending.refreshToken);
        return;
      }
      setError('Not verified yet — tap the link in the email, then try again.');
    } catch (err) {
      setError(authErrorMessage(err.message));
    }
    setBusy(false);
  };

  const submitForgot = async () => {
    const id = identifier.trim();
    if (!id) return;
    setError(''); setBusy(true);
    try {
      let mail = id;
      if (!id.includes('@')) {
        const rec = await fetchUsernameRecord(id);
        if (!rec || !rec.email) { setError('No account found with that username.'); setBusy(false); return; }
        mail = rec.email;
      }
      await authSendPasswordReset(mail);
      switchMode('reset-sent');
      setNotice('Password reset link sent to ' + mail + '. Set a new password, then log in with it here.');
      setBusy(false);
    } catch (err) {
      setError(authErrorMessage(err.message));
      setBusy(false);
    }
  };

  const title = mode === 'create' ? 'Create Account'
    : mode === 'verify' ? 'Confirm Your Email'
    : mode === 'forgot' ? 'Reset Password'
    : mode === 'reset-sent' ? 'Check Your Email'
    : 'Log In';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <h2>{title}</h2>

        {mode === 'login' && (
          <>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6, marginBottom: 16 }}>
              {isAdminAttempt ? 'Enter the admin password to access admin tools.' : 'Log in with your username or email.'}
            </p>
            <input
              autoFocus type="text" value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
              placeholder="Username or email"
              autoCapitalize="none" autoCorrect="off"
              style={inputStyle}
            />
            <input
              type="password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitLogin(); }}
              placeholder={isAdminAttempt ? 'Admin password' : 'Password'}
              style={{ ...inputStyle, marginTop: 8 }}
            />
            {!isAdminAttempt && (
              <div style={{ fontSize: 12, marginTop: 10, color: 'var(--muted)' }}>
                <span style={linkStyle} onClick={() => switchMode('forgot')}>Forgot password?</span>
              </div>
            )}
          </>
        )}

        {mode === 'create' && (
          <>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6, marginBottom: 16 }}>
              Pick a username, then confirm your email to start building teams.
            </p>
            <input
              autoFocus type="text" value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="Username"
              autoCapitalize="none" autoCorrect="off"
              style={inputStyle}
            />
            <input
              type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="Email"
              autoCapitalize="none" autoCorrect="off"
              style={{ ...inputStyle, marginTop: 8 }}
            />
            <input
              type="password" value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitCreate(); }}
              placeholder="Password (6+ characters)"
              style={{ ...inputStyle, marginTop: 8 }}
            />
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--muted)', marginTop: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
              <span>Send me Space-Ops 3030 news and updates by email (optional — you can unsubscribe anytime).</span>
            </label>
          </>
        )}

        {mode === 'verify' && pending && (
          <>
            <p style={{ fontSize: 13, marginTop: -6, marginBottom: 4, lineHeight: 1.5 }}>
              We sent a confirmation link to <strong>{pending.email}</strong>.
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Tap the link in that email, then come back here and continue. Check spam if it doesn't arrive.
            </p>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Didn't get it? <span style={linkStyle} onClick={resendVerify}>Resend email</span>
            </div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6, marginBottom: 16 }}>
              Enter your username or email and we'll send a password reset link.
            </p>
            <input
              autoFocus type="text" value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitForgot(); }}
              placeholder="Username or email"
              autoCapitalize="none" autoCorrect="off"
              style={inputStyle}
            />
          </>
        )}

        {mode === 'reset-sent' && (
          <p style={{ fontSize: 13, marginTop: -6, marginBottom: 8, lineHeight: 1.5 }}>{notice}</p>
        )}

        {notice && mode !== 'reset-sent' && (
          <div style={{ color: 'var(--text)', fontSize: 12, marginTop: 8, fontWeight: 700 }}>{notice}</div>
        )}
        {error && (
          <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8, fontWeight: 700 }}>{error}</div>
        )}

        <div className="modal__actions">
          <button onClick={onClose}>Cancel</button>
          {mode === 'login' && (
            <button onClick={submitLogin} disabled={busy || !identifier.trim() || !password}>
              {busy ? 'Checking…' : 'Log In'}
            </button>
          )}
          {mode === 'create' && (
            <button onClick={submitCreate} disabled={busy || !username.trim() || !email.trim() || !password}>
              {busy ? 'Creating…' : 'Create Account'}
            </button>
          )}
          {mode === 'verify' && (
            <button onClick={checkVerified} disabled={busy}>
              {busy ? 'Checking…' : "I've verified — continue"}
            </button>
          )}
          {mode === 'forgot' && (
            <button onClick={submitForgot} disabled={busy || !identifier.trim()}>
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>
          )}
          {mode === 'reset-sent' && (
            <button onClick={() => switchMode('login')}>Back to Log In</button>
          )}
        </div>

        {mode === 'login' && !isAdminAttempt && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>
            New player? <span style={linkStyle} onClick={() => switchMode('create')}>Create account</span>
          </div>
        )}
        {mode === 'create' && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, textAlign: 'right' }}>
            Have an account? <span style={linkStyle} onClick={() => switchMode('login')}>Log in</span>
          </div>
        )}
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
function Builder({ team, setTeam, player, onSave, onLoadOpen, onDelete, onView, onBack, nux, onNuxDone, onNuxSkip }) {
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

  const rating = teamRating(team);
  const cap = 50;
  const overBudget = rating > cap;

  return (
    <div className="builder">
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

      {/* === Column 2: Asset detail — always present so the two main columns
          hold a stable 50/50 split; shows a hint until an asset is selected. === */}
      <div className={'builder__col builder__col--detail' + (selected ? '' : ' is-empty')}>
        {!selected && (
          <div className="detail-empty">Select a team asset to view and equip it.</div>
        )}
        {selected && (
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
        )}
      </div>

      {/* NUX: builder walkthrough (first time here), then armory tips the
          first time the popup opens. */}
      {nux && !nux.builder && !armoryOpen && (
        <TourOverlay
          onDone={() => onNuxDone('builder')}
          onSkip={onNuxSkip}
          steps={[
            {
              sel: '[data-tour="team-name"]',
              title: 'Name & Faction',
              body: 'Type your company name, and pick a faction below it. Switching faction clears the roster, so choose first.',
            },
            {
              sel: '[data-tour="add-asset"]',
              title: 'Add Models',
              body: 'The + opens the model picker — one Leader, plus Operator and Support assets. + and − set how many of each.',
            },
            {
              sel: '[data-tour="rating"]',
              title: 'Rating Budget',
              body: 'Every model and item costs Rating. Keep the team at 50 or under — the total turns red when you’re over.',
            },
            {
              sel: '[data-tour="roster"]',
              title: 'Your Roster',
              body: 'Models group by role here. Click one to open its stats and loadout on the right.',
            },
            {
              sel: '[data-tour="carry"]',
              title: 'Carry Capacity',
              onEnter: () => { if (!selected && team.assets.length > 0) selectAsset(team.assets[0].instanceId); },
              body: 'Each model has gear slots. Click "Equip from the Armory" to open the gear list, or − to unequip.',
            },
            {
              sel: '[data-tour="team-mgmt"]',
              title: 'Save & View',
              body: 'Save Team publishes to your account in the cloud. View Team is the play-time card reference for the table.',
            },
          ]}
        />
      )}
      {nux && nux.builder && !nux.armory && armoryOpen && selected && (
        <TourOverlay
          onDone={() => onNuxDone('armory')}
          onSkip={onNuxSkip}
          steps={[
            {
              sel: '[data-tour="armory-filter"]',
              title: 'The Armory',
              body: 'Everything your faction can equip. Filter by ranged, melee, equipment, or cyberdeck.',
            },
            {
              sel: '[data-tour="armory-list"]',
              title: 'Equip Gear',
              body: '+ equips an item, − removes it. Click an item’s name to see its full stats and traits.',
            },
            {
              sel: '[data-tour="armory-done"]',
              title: 'All Set',
              body: 'Done (or clicking outside) closes the Armory. Everything you build auto-saves as you go.',
            },
          ]}
        />
      )}

      {/* === Armory popup — opens from "Equip from the Armory" / loadout pills.
          Backdrop click or Done closes it. === */}
      {armoryOpen && selected && (
        <div className="armory-modal-backdrop" onClick={() => setArmoryOpen(false)}>
          <div className="armory-modal" onClick={(e) => e.stopPropagation()}>
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
        data-tour="team-name"
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
      <div className={'team-rating' + (overBudget ? ' over' : '')} data-tour="rating">
        <strong>{rating}</strong>/{cap} Rating
      </div>

      <div className="section">
        <div className="section__head">
          <h2 className="section__title">Team Assets</h2>
          <button className="section__btn" data-tour="add-asset" aria-label="Add asset" onClick={onTogglePicker}>+</button>
        </div>

        {!pickerOpen && (
          <div className="assets" data-tour="roster">
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

      <div className="management" data-tour="team-mgmt">
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
      <div className="carry" data-tour="carry">
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

      <div className="armory__filter" data-tour="armory-filter">
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

      <div className="armory__list" data-tour="armory-list">
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
          data-tour="armory-done"
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
  const cap = 50;
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

        {team.unknownModels && team.unknownModels.length > 0 && (
          <div style={{ margin: '0 0 18px', padding: '10px 14px', border: '1px solid #8a6d1f', background: 'rgba(255,209,102,0.10)', borderRadius: 8, fontSize: 13, lineHeight: 1.5, color: '#e6d6a8' }}>
            <strong>{team.unknownModels.length} model{team.unknownModels.length > 1 ? 's' : ''} unavailable in the current game data</strong> and hidden from this roster, but preserved (not deleted): {team.unknownModels.map((m) => m.name).join(', ')}. {team.unknownModels.length > 1 ? 'They' : 'It'} will reappear if the name returns to the data or an alias is added. The rating below excludes {team.unknownModels.length > 1 ? 'them' : 'it'}.
          </div>
        )}
        {(() => {
          // Items carried through because their names don't resolve against
          // current game data (see fbModelToAsset) — preserved, not shown.
          const carried = (team.assets || []).flatMap((a) => (a.unknownItems || []).map((i) => i.name));
          return carried.length > 0 ? (
            <div style={{ margin: '0 0 18px', padding: '10px 14px', border: '1px solid #8a6d1f', background: 'rgba(255,209,102,0.10)', borderRadius: 8, fontSize: 13, lineHeight: 1.5, color: '#e6d6a8' }}>
              <strong>{carried.length} item{carried.length > 1 ? 's' : ''} unavailable in the current game data</strong> and hidden from loadouts, but preserved (not deleted): {carried.join(', ')}.
            </div>
          ) : null;
        })()}

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
// _modelHasDualWield. Returns a Set of lowercased weapon names that are
// dual-wielded (melee, appearing 2+ times) so each WeaponBox can flag its
// own name. Counts raw weapon instances (collectAssetGear dedupes for
// display, so we can't use its output): the free loadout (FB defaults ∪
// model loadout, deduped so a data-duplicated entry isn't a false positive)
// plus each equipped slot as its own instance.
function dualWieldedWeaponKeys(asset) {
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
  const keys = new Set();
  for (const [k, c] of Object.entries(counts)) if (c >= 2) keys.add(k);
  return keys;
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
  const dwKeys = useMemo(() => dualWieldedWeaponKeys(asset), gearDeps);
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
              <WeaponBox
                key={'w' + i}
                w={w}
                onOpenHover={onOpenHover}
                dualWield={dwKeys.has((w.name || '').toLowerCase().trim())}
              />
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

const isDualWieldTrait = (t) => /^dual\s*wield$/i.test((t || '').trim());

function WeaponBox({ w, onOpenHover, dualWield }) {
  const fire = (kind, name) => (e) => onOpenHover && onOpenHover({ kind, name, x: e.clientX, y: e.clientY });

  // Dual Wield (two identical melee weapons): the weapon gains the Dual Wield
  // trait and its Attack stat increases by 1. Both the trait and the buffed
  // stat render in teal to signal the auto-applied modifier.
  const baseTraits = splitTraits(w.traits);
  const traits = dualWield && !baseTraits.some(isDualWieldTrait)
    ? [...baseTraits, 'Dual Wield']
    : baseTraits;
  const attacksIsNumeric = w.attacks !== '' && w.attacks != null && Number.isFinite(num(w.attacks));
  const attacksBuffed = dualWield && attacksIsNumeric;
  const attacksDisplay = attacksBuffed ? num(w.attacks) + 1 : (w.attacks || '—');

  return (
    <div className="weapon-box">
      <div className="weapon-box__head">
        <span>
          <span className="term-link" onClick={fire('weapon', w.name)}>{w.name}</span>
          {dualWield && <span className="weapon-box__multi"> x2</span>}
        </span>
        <span className="weapon-box__cost">({w._free ? '0r' : num(w.rating) + 'r'})</span>
      </div>
      <div className="weapon-box__stats">
        <div><div className="lbl">Range</div><div className="val">{w.range || '—'}</div></div>
        <div><div className="lbl">Attacks</div><div className={'val' + (attacksBuffed ? ' val--buffed' : '')}>{attacksDisplay}</div></div>
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
                <span
                  className={traitLinkClass(t) + (isDualWieldTrait(t) ? ' is-buffed' : '')}
                  onClick={fire('trait', t)}
                >{t}</span>
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
function LoadModal({ onPick, onClose, onDelete, firebaseTeams, player }) {
  // Two-step delete: first tap arms a confirmation box (native confirm() is
  // suppressed by iOS DuckDuckGo — see deleteTeamGlobal), second confirms.
  const [confirmTarget, setConfirmTarget] = useState(null);
  // Only this player's local teams — the savedTeams list is device-wide, so
  // without the owner filter every account on a shared device would see (and
  // be able to load) everyone else's teams.
  const local = teamsOwnedBy(player);
  const fbLoading = firebaseTeams === null;
  const fb = Array.isArray(firebaseTeams) ? firebaseTeams : [];
  const fbBases = new Set(fb.map((t) => stripFbPrefix(t.id)));
  // Dedup: a local team and its FB mirror share the same base id (the local
  // copy may carry an 'fb-' prefix from a pre-v15.0.26 load round-trip).
  // Keep whichever copy is NEWER — `savedAt` is set on every local save and
  // maps from FB `modified`, so the two sides are directly comparable. The
  // old rule ("local always wins") hid edits published from other devices
  // behind this device's stale local copy.
  const ts = (t) => t.savedAt || t.createdAt || 0;
  const byBase = new Map();
  for (const t of [...local, ...fb]) {
    const base = stripFbPrefix(t.id);
    const cur = byBase.get(base);
    if (!cur || ts(t) > ts(cur)) byBase.set(base, t);
  }
  // Sort by most recently modified first.
  const list = [...byBase.values()].sort((a, b) => ts(b) - ts(a));
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
                  <span className="del" onClick={(e) => { e.stopPropagation(); setConfirmTarget(t); }}>Delete</span>
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
        {confirmTarget && (
          <div className="confirm-overlay" onClick={() => setConfirmTarget(null)}>
            <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-box__title">Delete "{confirmTarget.name}"?</div>
              <div className="confirm-box__body">
                This removes the team from your account on every device. It can't be undone.
              </div>
              <div className="confirm-box__actions">
                <button onClick={() => setConfirmTarget(null)}>Cancel</button>
                <button
                  className="confirm-box__danger"
                  onClick={() => { onDelete(confirmTarget.id); setConfirmTarget(null); }}
                >Delete Team</button>
              </div>
            </div>
          </div>
        )}
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

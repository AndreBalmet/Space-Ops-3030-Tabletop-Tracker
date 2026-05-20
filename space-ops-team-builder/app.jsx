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

const isLeader = (m) => /\(Leader\)/i.test(m.name || '');

// Strip "(Leader)" suffix for display
const displayName = (m) => (m.name || '').replace(/\s*\(Leader\)\s*/i, '').trim();

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

const loadSavedTeams = () => {
  try { return JSON.parse(localStorage.getItem(SAVED_TEAMS_KEY) || '[]'); } catch { return []; }
};
const writeSavedTeams = (arr) => {
  localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(arr));
};
const loadCurrent = () => {
  try { return JSON.parse(localStorage.getItem(CURRENT_TEAM_KEY) || 'null'); } catch { return null; }
};
const writeCurrent = (team) => {
  if (team) localStorage.setItem(CURRENT_TEAM_KEY, JSON.stringify(team));
  else localStorage.removeItem(CURRENT_TEAM_KEY);
};

// ============================================================
// ROOT APP
// ============================================================
function App() {
  const [screen, setScreen] = useState('home'); // 'home' | 'builder'
  const [player, setPlayer] = useState(() => localStorage.getItem(PLAYER_KEY) || '');
  const [team, setTeam] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // {kind:'load'} | {kind:'login'}

  useEffect(() => {
    if (player) localStorage.setItem(PLAYER_KEY, player);
    else localStorage.removeItem(PLAYER_KEY);
  }, [player]);
  useEffect(() => {
    if (team) writeCurrent(team);
  }, [team]);

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
    showToast('Team saved');
  };

  const deleteTeamGlobal = () => {
    if (!team) return;
    if (!confirm(`Delete "${team.name}"? This removes the saved copy too.`)) return;
    const list = loadSavedTeams().filter((t) => t.id !== team.id);
    writeSavedTeams(list);
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
            : [{ label: 'Space Ops 3030', onClick: () => setScreen('home') }, { label: 'Team Builder', onClick: () => setScreen('home') }, { label: team?.name || 'Untitled' }]
        }
      />

      {screen === 'home' && (
        <Home
          player={player}
          onChangePlayer={setPlayer}
          onLogin={() => setModal({ kind: 'login' })}
          onLogout={() => { setPlayer(''); showToast('Logged out'); }}
          onCreate={() => {
            if (!player) { setModal({ kind: 'login', next: 'create' }); return; }
            newTeam();
          }}
          onLoad={() => {
            if (!player) { setModal({ kind: 'login', next: 'load' }); return; }
            setModal({ kind: 'load' });
          }}
          hasSaved={loadSavedTeams().length > 0}
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
          onExport={() => showToast('PDF export — coming soon')}
          onBack={() => setScreen('home')}
        />
      )}

      {modal?.kind === 'load' && (
        <LoadModal
          onPick={loadTeam}
          onClose={() => setModal(null)}
          onDelete={(id) => {
            const list = loadSavedTeams().filter((t) => t.id !== id);
            writeSavedTeams(list);
            setModal({ kind: 'load' }); // force re-render
          }}
        />
      )}

      {modal?.kind === 'login' && (
        <LoginModal
          onLogin={(name) => {
            setPlayer(name);
            const next = modal.next;
            setModal(null);
            // chain into the next action user wanted
            if (next === 'create') setTimeout(newTeam, 0);
            if (next === 'load') setTimeout(() => setModal({ kind: 'load' }), 0);
            showToast('Welcome, ' + name);
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
function Home({ player, onChangePlayer, onLogin, onLogout, onCreate, onLoad, hasSaved }) {
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
function LoginModal({ onLogin, onClose }) {
  const [name, setName] = useState('');
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onLogin(trimmed);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <h2>Log In</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6, marginBottom: 16 }}>
          Enter a player name to continue.
        </p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Player name"
          style={{
            width: '100%',
            padding: '10px 12px',
            font: 'inherit',
            fontSize: 16,
            border: '1px solid var(--line)',
            borderRadius: 4,
            outline: 'none',
          }}
        />
        <div className="modal__actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={submit} disabled={!name.trim()}>Log In</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BUILDER (3-column layout)
// ============================================================
function Builder({ team, setTeam, player, onSave, onLoadOpen, onDelete, onExport, onBack }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);
  const [armoryOpen, setArmoryOpen] = useState(false);
  const [armoryTargetSlot, setArmoryTargetSlot] = useState(null); // {slotIdx} or null = any
  const [armoryFilter, setArmoryFilter] = useState('ranged');
  const [expandedArmoryKey, setExpandedArmoryKey] = useState(null);

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
          onExport={onExport}
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
            onPillClick={(slot, slotIdx) => {
              // open hover/detail by toggling armory expanded view with that name pre-expanded
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
          />
        </div>
      )}
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
    onAddModel, onRemoveModel, onSave, onLoad, onExport, onDelete, onBack,
  } = props;

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
          <button onClick={onExport}>Export Team to PDF</button>
          <button onClick={onLoad}>Load Team</button>
          <button onClick={onDelete}>Delete Team</button>
          <button onClick={onBack} style={{ marginTop: 10, color: 'var(--muted)' }}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ASSET DETAIL
// ============================================================
function AssetDetail({ asset, onDuplicate, onDelete, onUnequip, onOpenArmoryForSlot, onPillClick }) {
  const m = findModel(asset.modelId);
  if (!m) return null;
  const loadout = parseLoadout(m);
  const rating = assetRating(asset);

  const bucketLabel =
    isLeader(m) ? 'Operator Leader'
    : /support/i.test(m.assetType || '') ? 'Support Asset'
    : 'Operator Asset';

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
        {loadout.length === 0 ? <span style={{ color: 'var(--muted)' }}>None</span> : loadout.join(', ')}
      </div>

      <div className="tag" style={{ color: 'var(--red)' }}>Carry Capacity</div>
      <div className="carry">
        <div className="carry__slots">
          {asset.slots.map((slot, i) => {
            const item = slot && (slot.kind === 'weapon' ? findWeapon(slot.name) : findEquipment(slot.name));
            const cat = pillCategory(item);
            const rcost = num(item?.rating);
            if (slot) {
              return (
                <div className="slot" key={i}>
                  <button className="slot__action" title="Remove" onClick={() => onUnequip(i)}>−</button>
                  <div
                    className={'slot__pill pill--' + cat}
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
                <div className="slot__pill slot__pill--empty" onClick={() => onOpenArmoryForSlot(i)}>
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
  { key: 'ranged', label: 'Ranged Weapons' },
  { key: 'melee', label: 'Melee Weapons' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'cybertech', label: 'Cybertech' },
];

function ArmoryPanel({ faction, filter, onFilter, asset, onEquip, onRemove, expandedKey, onToggleExpand, onClose }) {
  // Build items list based on filter
  const items = useMemo(() => {
    if (filter === 'ranged') {
      return DATA.weapons.filter((w) => /ranged/i.test(w.weaponType || ''))
        .map((w) => ({ kind: 'weapon', record: w, name: w.name, rating: num(w.rating) }));
    }
    if (filter === 'melee') {
      return DATA.weapons.filter((w) => /melee/i.test(w.weaponType || ''))
        .map((w) => ({ kind: 'weapon', record: w, name: w.name, rating: num(w.rating) }));
    }
    if (filter === 'equipment') {
      return DATA.equipment
        .filter((e) => !/cyber/i.test(e.equipmentType || '') && !/default loadout/i.test(e.equipmentType || ''))
        .filter((e) => !e.faction || e.faction === faction)
        .map((e) => ({ kind: 'equipment', record: e, name: e.name, rating: num(e.rating) }));
    }
    if (filter === 'cybertech') {
      return DATA.equipment
        .filter((e) => /cyber/i.test(e.equipmentType || ''))
        .map((e) => ({ kind: 'equipment', record: e, name: e.name, rating: num(e.rating) }));
    }
    return [];
  }, [filter, faction]);

  const countEquipped = (name) => asset.slots.filter((s) => s && s.name === name).length;
  const openSlots = asset.slots.filter((s) => !s).length;

  return (
    <div>
      <div className="asset-detail__tag">Armory</div>
      <h2 className="armory__title">Armory</h2>

      <div className="armory__filter">
        <span className="label">Filter</span>
        {ARMORY_TABS.map((t) => (
          <button
            key={t.key}
            className={t.key === filter ? 'is-active' : ''}
            onClick={() => onFilter(t.key)}
          >{t.label}</button>
        ))}
      </div>

      <div className="armory__category-tag">
        {filter === 'ranged' && 'Ranged Weapons'}
        {filter === 'melee' && 'Melee Weapons'}
        {filter === 'equipment' && 'Equipment'}
        {filter === 'cybertech' && 'Cybertech'}
      </div>

      <div className="armory__list">
        {items.map((it) => {
          const key = (it.kind === 'weapon' ? 'w:' : 'e:') + it.name;
          const equipped = countEquipped(it.name);
          const expanded = expandedKey === key;
          const cat = pillCategory(it.record);
          return (
            <React.Fragment key={key}>
              <div className={'armory-row' + (expanded ? ' expanded' : '')}>
                <button className="armory-row__step" onClick={() => onRemove(it.name)} disabled={equipped === 0}>−</button>
                <button className="armory-row__step" onClick={() => onEquip({ kind: it.kind, name: it.name })} disabled={openSlots === 0}>+</button>
                <div className={'armory-row__pill pill--' + cat} onClick={() => onToggleExpand(key)}>
                  <span className="slot__pill__name">{it.name}</span>
                  <span style={{ float: 'right', opacity: 0.75 }}>
                    ({it.rating}r){equipped > 0 ? <span style={{ marginLeft: 6, color: '#ffd34a' }}>×{equipped}</span> : null}
                  </span>
                </div>
              </div>
              {expanded && (
                <ArmoryExpand item={it} onClose={() => onToggleExpand(key)} />
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

function ArmoryExpand({ item, onClose }) {
  const r = item.record;
  const isWeapon = item.kind === 'weapon';
  const range = isWeapon ? r.range : r.range;
  const attacks = isWeapon ? r.attacks : r.attacks;
  const power = isWeapon ? r.power : r.power;
  const damage = isWeapon ? r.damage : r.damage;
  const traits = (r.traits || '').trim();
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
      {traits && (
        <div className="armory-expand__traits">
          <span className="lbl">Traits</span>
          <span>{traits}</span>
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
// LOAD MODAL
// ============================================================
function LoadModal({ onPick, onClose, onDelete }) {
  const list = loadSavedTeams();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Load Team</h2>
        {list.length === 0 ? (
          <div className="modal__empty">No saved teams yet.<br />Build one and hit Save Team.</div>
        ) : (
          <div className="modal__list">
            {list.map((t) => (
              <button key={t.id} onClick={() => onPick(t)}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div className="meta">{t.factionId} · {teamRating(t)}r · {(t.assets || []).length} assets</div>
                </div>
                <span className="meta">{new Date(t.savedAt || t.createdAt).toLocaleString()}</span>
                <span className="del" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}>Delete</span>
              </button>
            ))}
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
ReactDOM.createRoot(document.getElementById('app')).render(<App />);

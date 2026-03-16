/**
 * Mock Firebase — In-memory Firebase Realtime Database simulator
 * Replaces the real Firebase SDK for offline testing in the node builder.
 * Supports: ref(), set(), update(), remove(), once(), on(), off(), push(), child(), val(), exists()
 */

// ─── Test Data ───
const MOCK_DATA = {
    sessions: {
        'SpaceOps_Dec18': {
            name: 'SpaceOps-Dec18',
            description: 'Friday night session — Arc Rangers vs Space-Wyrm',
            created: Date.now() - 86400000 * 3,
            archived: false,
            campaign: {
                name: 'The Siege of Outpost Kappa',
                description: 'Your squad has been deployed to defend Outpost Kappa against an incoming Space-Wyrm horde.',
                objectives: ['Defend the command center', 'Activate the distress beacon', 'Hold until reinforcements arrive']
            },
            teams: {
                'Andre': {
                    owner: 'Andre',
                    faction: 'Arc Rangers',
                    characters: {
                        'char_1': {
                            name: 'Sgt. Voss',
                            role: 'Squad Leader',
                            faction: 'Arc Rangers',
                            portrait: '',
                            speed: '6"',
                            shoot: '3+',
                            fight: '4+',
                            nerve: '3+',
                            health: 18,
                            currentHealth: 18,
                            maxHealth: 18,
                            status: 'alive',
                            color: '#db8f00',
                            weapons: [
                                { name: 'Arc Rifle', type: 'Ranged', attacks: '2', power: '3+', damage: '3' },
                                { name: 'Combat Blade', type: 'Melee', attacks: '3', power: '4+', damage: '2' }
                            ],
                            consumables: [
                                { name: 'Medkit', uses: 2, maxUses: 2, description: 'Heal 5 HP' },
                                { name: 'Frag Grenade', uses: 1, maxUses: 1, description: '3" blast, 4 damage' }
                            ],
                            specialActions: [
                                { name: 'Rally', description: 'All friendly models within 6" re-roll failed Nerve checks', uses: 1, maxUses: 1 }
                            ],
                            statusEffects: [],
                            inventory: ['Tactical Scanner', 'Comm Unit'],
                            notes: 'Squad leader — gives +1 to nearby Nerve checks'
                        },
                        'char_2': {
                            name: 'Cpl. Rhea',
                            role: 'Heavy Gunner',
                            faction: 'Arc Rangers',
                            portrait: '',
                            speed: '5"',
                            shoot: '3+',
                            fight: '5+',
                            nerve: '4+',
                            health: 15,
                            currentHealth: 15,
                            maxHealth: 20,
                            status: 'alive',
                            color: '#4488ff',
                            weapons: [
                                { name: 'Rotary Cannon', type: 'Ranged', attacks: '5', power: '4+', damage: '2' },
                                { name: 'Sidearm', type: 'Ranged', attacks: '1', power: '3+', damage: '2' }
                            ],
                            consumables: [
                                { name: 'Ammo Pack', uses: 1, maxUses: 1, description: 'Reload Rotary Cannon' }
                            ],
                            specialActions: [
                                { name: 'Suppressing Fire', description: 'Target enemy cannot move next turn', uses: 1, maxUses: 1 }
                            ],
                            statusEffects: [
                                { name: 'Wounded', duration: 2, description: '-1 to Speed' }
                            ],
                            inventory: ['Bipod', 'Extra Ammo'],
                            notes: 'Took 5 damage from Wyrm acid last turn'
                        },
                        'char_3': {
                            name: 'Pvt. Kai',
                            role: 'Scout',
                            faction: 'Arc Rangers',
                            portrait: '',
                            speed: '8"',
                            shoot: '4+',
                            fight: '3+',
                            nerve: '4+',
                            health: 12,
                            currentHealth: 12,
                            maxHealth: 12,
                            status: 'alive',
                            color: '#4CAF50',
                            weapons: [
                                { name: 'Sniper Rifle', type: 'Ranged', attacks: '1', power: '3+', damage: '5' },
                                { name: 'Combat Knife', type: 'Melee', attacks: '2', power: '3+', damage: '2' }
                            ],
                            consumables: [
                                { name: 'Smoke Grenade', uses: 2, maxUses: 2, description: 'Block LOS in 3" radius' }
                            ],
                            specialActions: [
                                { name: 'Stealth', description: 'Cannot be targeted if in cover and did not shoot', uses: 2, maxUses: 2 }
                            ],
                            statusEffects: [],
                            inventory: ['Grappling Hook', 'Night Vision'],
                            notes: 'Infiltrated behind enemy lines'
                        }
                    }
                },
                'Player_2': {
                    owner: 'Player_2',
                    faction: 'Space-Wyrm',
                    characters: {
                        'char_4': {
                            name: 'Hivequeen Xal',
                            role: 'Brood Mother',
                            faction: 'Space-Wyrm',
                            portrait: '',
                            speed: '4"',
                            shoot: '5+',
                            fight: '2+',
                            nerve: '2+',
                            health: 25,
                            currentHealth: 25,
                            maxHealth: 25,
                            status: 'alive',
                            color: '#FFD700',
                            weapons: [
                                { name: 'Acid Spit', type: 'Ranged', attacks: '3', power: '4+', damage: '3' },
                                { name: 'Razor Claws', type: 'Melee', attacks: '4', power: '2+', damage: '4' }
                            ],
                            consumables: [],
                            specialActions: [
                                { name: 'Spawn Broodling', description: 'Place a Broodling model within 3"', uses: 1, maxUses: 1 },
                                { name: 'Psychic Scream', description: 'All enemies within 8" take -1 Nerve', uses: 2, maxUses: 2 }
                            ],
                            statusEffects: [],
                            inventory: ['Chitin Armor'],
                            notes: 'Boss unit — 25 HP'
                        },
                        'char_5': {
                            name: 'Wyrm Stalker',
                            role: 'Broodling',
                            faction: 'Space-Wyrm',
                            portrait: '',
                            speed: '7"',
                            shoot: '6+',
                            fight: '3+',
                            nerve: '5+',
                            health: 8,
                            currentHealth: 8,
                            maxHealth: 8,
                            status: 'alive',
                            color: '#8B0000',
                            weapons: [
                                { name: 'Talons', type: 'Melee', attacks: '3', power: '3+', damage: '2' }
                            ],
                            consumables: [],
                            specialActions: [],
                            statusEffects: [],
                            inventory: [],
                            notes: ''
                        }
                    }
                }
            },
            combatLog: {
                'log_1': { timestamp: Date.now() - 60000, message: 'Sgt. Voss shot Wyrm Stalker with Arc Rifle — 3 damage!', type: 'attack' },
                'log_2': { timestamp: Date.now() - 45000, message: 'Hivequeen Xal used Acid Spit on Cpl. Rhea — 5 damage!', type: 'attack' },
                'log_3': { timestamp: Date.now() - 30000, message: 'Cpl. Rhea used Medkit — healed 5 HP', type: 'heal' }
            },
            initiative: {
                order: ['char_3', 'char_5', 'char_1', 'char_4', 'char_2'],
                currentTurn: 2,
                round: 1
            },
            actionHistory: {}
        },
        'TestSession_Jan5': {
            name: 'TestSession-Jan5',
            description: 'Quick solo test game',
            created: Date.now() - 86400000,
            archived: false,
            campaign: {
                name: 'Training Exercise',
                description: 'Basic training run for new recruits.',
                objectives: ['Eliminate all targets', 'No casualties']
            },
            teams: {},
            combatLog: {},
            initiative: {},
            actionHistory: {}
        },
        'OldSession_Nov': {
            name: 'OldSession-Nov',
            description: 'Archived campaign session',
            created: Date.now() - 86400000 * 30,
            archived: true,
            campaign: { name: 'Fall of Station Zeta', description: 'The final battle.', objectives: [] },
            teams: {},
            combatLog: {},
            initiative: {},
            actionHistory: {}
        }
    },
    players: {
        'Andre': {
            teams: {
                'team_alpha': {
                    name: 'Alpha Squad',
                    faction: 'Arc Rangers',
                    points: 150,
                    created: Date.now() - 86400000 * 7,
                    models: [
                        { name: 'Sgt. Voss', role: 'Squad Leader', speed: '6"', shoot: '3+', fight: '4+', nerve: '3+', health: 18, weapons: ['Arc Rifle', 'Combat Blade'] },
                        { name: 'Cpl. Rhea', role: 'Heavy Gunner', speed: '5"', shoot: '3+', fight: '5+', nerve: '4+', health: 20, weapons: ['Rotary Cannon', 'Sidearm'] },
                        { name: 'Pvt. Kai', role: 'Scout', speed: '8"', shoot: '4+', fight: '3+', nerve: '4+', health: 12, weapons: ['Sniper Rifle', 'Combat Knife'] }
                    ]
                },
                'team_bravo': {
                    name: 'Bravo Company',
                    faction: 'Arc Rangers',
                    points: 145,
                    created: Date.now() - 86400000 * 2,
                    models: [
                        { name: 'Lt. Marsh', role: 'Officer', speed: '6"', shoot: '3+', fight: '3+', nerve: '2+', health: 16, weapons: ['Plasma Pistol', 'Power Sword'] },
                        { name: 'Sapper Ren', role: 'Engineer', speed: '5"', shoot: '4+', fight: '5+', nerve: '4+', health: 14, weapons: ['Shotgun', 'Demo Charge'] }
                    ]
                }
            }
        },
        'Player_2': {
            teams: {
                'team_hive': {
                    name: 'Hive Swarm',
                    faction: 'Space-Wyrm',
                    points: 150,
                    created: Date.now() - 86400000 * 5,
                    models: [
                        { name: 'Hivequeen Xal', role: 'Brood Mother', speed: '4"', shoot: '5+', fight: '2+', nerve: '2+', health: 25, weapons: ['Acid Spit', 'Razor Claws'] },
                        { name: 'Wyrm Stalker', role: 'Broodling', speed: '7"', shoot: '6+', fight: '3+', nerve: '5+', health: 8, weapons: ['Talons'] },
                        { name: 'Wyrm Stalker β', role: 'Broodling', speed: '7"', shoot: '6+', fight: '3+', nerve: '5+', health: 8, weapons: ['Talons'] }
                    ]
                }
            }
        }
    },
    templates: {
        'tmpl_1': {
            name: 'Arc Ranger Sergeant',
            faction: 'Arc Rangers',
            role: 'Squad Leader',
            speed: '6"', shoot: '3+', fight: '4+', nerve: '3+',
            health: 18,
            weapons: [{ name: 'Arc Rifle', type: 'Ranged', attacks: '2', power: '3+', damage: '3' }],
            savedBy: 'Andre',
            savedAt: Date.now() - 86400000 * 10
        },
        'tmpl_2': {
            name: 'Space-Wyrm Broodling',
            faction: 'Space-Wyrm',
            role: 'Broodling',
            speed: '7"', shoot: '6+', fight: '3+', nerve: '5+',
            health: 8,
            weapons: [{ name: 'Talons', type: 'Melee', attacks: '3', power: '3+', damage: '2' }],
            savedBy: 'Player_2',
            savedAt: Date.now() - 86400000 * 5
        }
    }
};

// ─── Mock Firebase Implementation ───

// Deep clone helper
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Navigate to a nested path in the data store
function getAtPath(data, pathStr) {
    if (!pathStr || pathStr === '/') return data;
    const parts = pathStr.split('/').filter(Boolean);
    let current = data;
    for (const part of parts) {
        if (current === null || current === undefined) return null;
        current = current[part];
    }
    return current ?? null;
}

function setAtPath(data, pathStr, value) {
    const parts = pathStr.split('/').filter(Boolean);
    let current = data;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current) || current[parts[i]] === null) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

function removeAtPath(data, pathStr) {
    const parts = pathStr.split('/').filter(Boolean);
    let current = data;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) return;
        current = current[parts[i]];
    }
    delete current[parts[parts.length - 1]];
}

// Listener registry
const listeners = {};
let listenerIdCounter = 0;

function notifyListeners(pathStr) {
    Object.values(listeners).forEach(l => {
        if (pathStr.startsWith(l.path) || l.path.startsWith(pathStr)) {
            const val = getAtPath(MOCK_DATA, l.path);
            l.callback(new MockSnapshot(val, l.path));
        }
    });
}

// Mock Snapshot
class MockSnapshot {
    constructor(data, path) {
        this._data = data !== undefined ? data : null;
        this._path = path;
        this.key = path ? path.split('/').filter(Boolean).pop() : null;
    }
    val() { return this._data !== null ? deepClone(this._data) : null; }
    exists() { return this._data !== null && this._data !== undefined; }
    forEach(callback) {
        if (this._data && typeof this._data === 'object') {
            Object.keys(this._data).forEach(key => {
                callback(new MockSnapshot(this._data[key], this._path + '/' + key));
            });
        }
    }
    child(childPath) {
        const childData = this._data ? getAtPath(this._data, childPath) : null;
        return new MockSnapshot(childData, this._path + '/' + childPath);
    }
    numChildren() {
        return this._data && typeof this._data === 'object' ? Object.keys(this._data).length : 0;
    }
}

// Mock Reference
class MockRef {
    constructor(path) {
        this._path = path || '';
    }

    child(childPath) {
        return new MockRef(this._path + '/' + childPath);
    }

    set(value) {
        setAtPath(MOCK_DATA, this._path, deepClone(value));
        notifyListeners(this._path);
        return Promise.resolve();
    }

    update(value) {
        const current = getAtPath(MOCK_DATA, this._path) || {};
        const merged = { ...current, ...deepClone(value) };
        setAtPath(MOCK_DATA, this._path, merged);
        notifyListeners(this._path);
        return Promise.resolve();
    }

    remove() {
        removeAtPath(MOCK_DATA, this._path);
        notifyListeners(this._path);
        return Promise.resolve();
    }

    push(value) {
        const key = 'mock_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const newPath = this._path + '/' + key;
        if (value !== undefined) {
            setAtPath(MOCK_DATA, newPath, deepClone(value));
            notifyListeners(this._path);
        }
        const ref = new MockRef(newPath);
        ref.key = key;
        return value !== undefined ? Promise.resolve(ref) : ref;
    }

    once(eventType, callback) {
        const snapshot = new MockSnapshot(getAtPath(MOCK_DATA, this._path), this._path);
        if (callback) {
            callback(snapshot);
            return;
        }
        return Promise.resolve(snapshot);
    }

    on(eventType, callback) {
        const id = ++listenerIdCounter;
        listeners[id] = { path: this._path, callback, event: eventType };
        // Fire immediately with current data
        const snapshot = new MockSnapshot(getAtPath(MOCK_DATA, this._path), this._path);
        callback(snapshot);
        return callback;
    }

    off(eventType, callback) {
        Object.keys(listeners).forEach(id => {
            if (listeners[id].path === this._path && (!callback || listeners[id].callback === callback)) {
                delete listeners[id];
            }
        });
    }

    orderByChild(key) { return this; }
    limitToLast(n) { return this; }
    limitToFirst(n) { return this; }
}

// Mock Firebase global
const mockFirebase = {
    initializeApp: function() {},
    database: function() {
        return {
            ref: function(path) { return new MockRef(path || ''); }
        };
    }
};

mockFirebase.database.ServerValue = { TIMESTAMP: Date.now() };

// Expose as global
window.firebase = mockFirebase;
window.MOCK_DATA = MOCK_DATA;

console.log('[MockFirebase] Loaded with test data: 3 sessions, 2 players, 2 templates');

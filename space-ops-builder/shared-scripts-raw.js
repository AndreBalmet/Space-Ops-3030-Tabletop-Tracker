        // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyAtbd-U5_-sIoPPX8iViFmi6_-DgVD16vk",
            authDomain: "space-ops-3030.firebaseapp.com",
            databaseURL: "https://space-ops-3030-default-rtdb.firebaseio.com",
            projectId: "space-ops-3030",
            storageBucket: "space-ops-3030.firebasestorage.app",
            messagingSenderId: "905112015290",
            appId: "1:905112015290:web:0d19ac4cac33de480f4d83"
        };


        // Initialize game data (fetch from CSV or use hardcoded)
        let gameData = gameDataHardcoded; // Start with hardcoded as fallback

        // Try to fetch from Google Sheets on page load
        fetchGameData().then(fetchedData => {
            if (fetchedData) {
                gameData = fetchedData;
                console.log('✅ Using live data from Google Sheets');
            } else {
                console.log('⚠️ Using hardcoded fallback data');
            }
        });

        // Initialize Firebase
        let app, database, currentSession = null, currentPlayer = null, currentPlayerDisplay = null;
        let editingCharacter = null;
        let weaponFields = [];
        let consumableFields = [];
        let specialActionFields = [];
        let transferData = null;
        let currentView = 'compact'; // or 'tiny'
        let currentTurn = 0;
        let statusEffectTarget = null;
        let currentMode = null; // 'quickplay', 'teambuilder', 'joinsession', 'lore'

        // Game Data (Hardcoded for v12, will sync from Google Sheets in v13)

        // ============================================================
        // MASTER DATA FETCH SYSTEM
        // ============================================================
        
        // CSV URLs - You'll update these after publishing your Google Sheet
        const CSV_URLS = {
            factions: 'YOUR_FACTIONS_CSV_URL_HERE',
            models: 'YOUR_MODELS_CSV_URL_HERE', 
            weapons: 'YOUR_WEAPONS_CSV_URL_HERE',
            specialActions: 'YOUR_SPECIAL_ACTIONS_CSV_URL_HERE',
            starterSquads: 'YOUR_STARTER_SQUADS_CSV_URL_HERE'
        };

        // Parse CSV text to array of objects
        function parseCSV(csvText) {
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                data.push(obj);
            }
            
            return data;
        }

        // Fetch CSV and convert to gameData format
        async function fetchGameData() {
            console.log('🔄 Fetching game data from Google Sheets...');
            
            try {
                // Check if URLs are configured
                const configured = !CSV_URLS.factions.includes('YOUR_') && 
                                  !CSV_URLS.models.includes('YOUR_');
                
                if (!configured) {
                    console.log('⚠️ CSV URLs not configured - using hardcoded data');
                    return null;
                }

                // Fetch all CSVs in parallel
                const [factionsCSV, modelsCSV, weaponsCSV, actionsCSV, squadsCSV] = await Promise.all([
                    fetch(CSV_URLS.factions).then(r => r.text()),
                    fetch(CSV_URLS.models).then(r => r.text()),
                    fetch(CSV_URLS.weapons).then(r => r.text()),
                    fetch(CSV_URLS.specialActions).then(r => r.text()),
                    fetch(CSV_URLS.starterSquads).then(r => r.text())
                ]);

                // Parse CSVs
                const factions = parseCSV(factionsCSV).map(f => ({
                    name: f.Name,
                    loreShort: f.LoreShort,
                    loreFull: f.LoreFull,
                    primaryColor: f.PrimaryColor,
                    accentColor: f.AccentColor
                }));

                const models = parseCSV(modelsCSV).map(m => ({
                    name: m.Name,
                    faction: m.Faction,
                    type: m.Type,
                    speed: parseInt(m.Speed),
                    shoot: m.Shoot,
                    fight: m.Fight,
                    nerve: m.Nerve,
                    health: parseInt(m.Health),
                    points: parseInt(m.Points),
                    portrait: m.Portrait,
                    description: m.Description
                }));

                const weapons = parseCSV(weaponsCSV).map(w => ({
                    name: w.Name,
                    faction: w.Faction,
                    type: w.Type,
                    attacks: parseInt(w.Attacks),
                    power: parseInt(w.Power),
                    damage: parseInt(w.Damage),
                    effects: w.Effects,
                    description: w.Description
                }));

                const specialActions = parseCSV(actionsCSV).map(a => ({
                    name: a.Name,
                    faction: a.Faction,
                    description: a.Description,
                    effects: a.Effects,
                    maxUses: parseInt(a.MaxUses),
                    type: a.Type
                }));

                const starterSquads = parseCSV(squadsCSV).map(s => ({
                    name: s.Name,
                    faction: s.Faction,
                    difficulty: s.Difficulty,
                    points: parseInt(s.Points),
                    description: s.Description,
                    models: s.Models // Format: "Model Name x2, Other Model x1"
                }));

                console.log('✅ Successfully loaded game data from Google Sheets!');
                console.log(`   - ${factions.length} factions`);
                console.log(`   - ${models.length} models`);
                console.log(`   - ${weapons.length} weapons`);
                console.log(`   - ${specialActions.length} special actions`);
                console.log(`   - ${starterSquads.length} starter squads`);

                return { factions, models, weapons, specialActions, starterSquads };
                
            } catch (error) {
                console.error('❌ Failed to fetch game data:', error);
                console.log('⚠️ Falling back to hardcoded data');
                return null;
            }
        }

        // ============================================================
        // FALLBACK: HARDCODED DATA (used if CSV fetch fails)
        // ============================================================
        const gameDataHardcoded = {
            factions: [
                {
                    name: 'Arc Rangers',
                    loreShort: 'Elite operatives defending The Reach with mobility and precision',
                    loreFull: `Arc Rangers are the elite defense force of The Reach, specializing in rapid response and precision strikes. Equipped with advanced mobility gear including jet packs and grappling systems, they excel at hit-and-run tactics. Known for their strict code of honor and unwavering dedication to protecting civilian populations against the Space-Wyrm threat and other dangers lurking in the dark corners of space.`,
                    primaryColor: '#db8f00',
                    accentColor: '#9CAF88'
                },
                {
                    name: 'Space-Wyrm',
                    loreShort: 'Ancient lunar zealots serving the Sun God, powered by solar tech',
                    loreFull: `The Space-Wyrm are an ancient bipedal lizard species from beneath the Moon's surface. Zealously devoted to their Sun God Ajj (the Ajarem - people of Ajj), they view humanity as their wayward creation that must be re-subjugated. Their technology is entirely solar-powered, making them vulnerable to overheating but deadly in sustained combat. The Sun God is cruel and unforgiving, demanding total devotion. Every Space-Wyrm passes through The Garden, a genetic mutation gate that determines their role in society. Different denominations create internal conflict even as they unite against humanity. Their battle cry: "The Sun God provides!"`,
                    primaryColor: '#FFD700',
                    accentColor: '#8B0000'
                },
                {
                    name: 'Kippin',
                    loreShort: 'Genetically engineered rebels with tech expertise and fearless tactics',
                    loreFull: `The Kippin were created by the Bazzle-Johson Corporation-State as a compliant workforce - bipedal Mustelidae (otter-like) with weasel and wolverine traits. But the "Trainables" proved anything but compliant. After learning to communicate across the Reach, they declared war on their corporate masters in 2608, reducing BazzleCorp to ash. Now free, the Kippin run extensive underground networks across 90% of space colonies. They're tech-savvy engineers and bold warriors with inherently low risk-assessment - allies must remind them to wear body armor! Known for experimental "custom" weapons, Kip-Cant sign language, and being banned from ESports for being too good. They operate successful drone pilot co-ops and street samurai gangs in Neo-Osaka. Rumor speaks of The Beach - a hidden resort using a stolen Space-Wyrm lens to create a warm sea on an ice asteroid.`,
                    primaryColor: '#10B981',
                    accentColor: '#374151'
                },
                {
                    name: 'Malegeist',
                    loreShort: 'Returned colonists corrupted by parasitic infection from deep space',
                    loreFull: `The Daedelus Expedition left Earth 300 years ago on a one-way trip to establish humanity's first exoplanet colony. They returned in 3022 as something else. The Malegeist encountered a parasitic organism in deep space that grants extended life and psionic abilities - but at a terrible cost. They can only survive by processing other organics into genetic material for sustenance. Gaunt, mutated, clad in gothic hard suits, the Malegeist infiltrate every level of corporate life in the Reach. Their philosophy: "Food has no rights." They operate in semi-autonomous fleet-pods, planning with the patience of those who have extended lifespans. The rarest Malegeist become Space Liches - neither living nor dead, neither human nor organism, shrouded in mystery and terror. Survivors of Lich encounters can never be fully trusted - are they witnesses or unwitting agents?`,
                    primaryColor: '#9333EA',
                    accentColor: '#1F2937'
                },
                {
                    name: 'Grave Kings',
                    loreShort: 'Undead remnants rising from Earth\'s blasted surface',
                    loreFull: `[Lore coming soon] The Grave Kings are necromantic forces emerging from the Blasted Earth, wielding dark powers and commanding legions of the undead.`,
                    primaryColor: '#6B7280',
                    accentColor: '#111827'
                },
                {
                    name: 'Forsaken',
                    loreShort: 'Mutated survivors struggling to endure in the wasteland',
                    loreFull: `[Lore coming soon] The Forsaken are mutated humans who survived Earth's collapse, adapting to the harsh wasteland through both biology and desperate ingenuity.`,
                    primaryColor: '#DC2626',
                    accentColor: '#450A0A'
                }
            ],
            models: [
                // Arc Rangers
                { name: 'Veteran Captain', faction: 'Arc Rangers', type: 'Captain', speed: 8, shoot: '3+', fight: '4+', nerve: '3+', health: 20, points: 40, portrait: 'https://spaceops3030.com/cdn/shop/articles/AR-with-Carbines_wide.jpg', description: 'Experienced leader with tactical expertise' },
                { name: 'Arc Ranger', faction: 'Arc Rangers', type: 'Trooper', speed: 8, shoot: '4+', fight: '5+', nerve: '4+', health: 15, points: 15, portrait: 'https://spaceops3030.com/cdn/shop/articles/AR-with-Carbines_wide.jpg', description: 'Standard operative with balanced capabilities' },
                { name: 'Scout Ranger', faction: 'Arc Rangers', type: 'Specialist', speed: 10, shoot: '4+', fight: '5+', nerve: '3+', health: 12, points: 18, portrait: 'https://spaceops3030.com/cdn/shop/articles/AR-with-Carbines_wide.jpg', description: 'Fast reconnaissance specialist' },
                { name: 'Heavy Ranger', faction: 'Arc Rangers', type: 'Specialist', speed: 6, shoot: '3+', fight: '5+', nerve: '4+', health: 18, points: 22, portrait: 'https://spaceops3030.com/cdn/shop/articles/AR-with-Carbines_wide.jpg', description: 'Armored fire support unit' },
                { name: 'Tech Specialist', faction: 'Arc Rangers', type: 'Specialist', speed: 7, shoot: '4+', fight: '5+', nerve: '4+', health: 14, points: 20, portrait: 'https://spaceops3030.com/cdn/shop/articles/AR-with-Carbines_wide.jpg', description: 'Technical expert with scanner abilities' },
                { name: 'Medic Ranger', faction: 'Arc Rangers', type: 'Specialist', speed: 7, shoot: '5+', fight: '5+', nerve: '4+', health: 14, points: 16, portrait: 'https://spaceops3030.com/cdn/shop/articles/AR-with-Carbines_wide.jpg', description: 'Field medic with healing capabilities' },
                // Space-Wyrm
                { name: 'Solar Priest', faction: 'Space-Wyrm', type: 'Leader', speed: 5, shoot: '4+', fight: '3+', nerve: '2+', health: 22, points: 45, portrait: 'https://via.placeholder.com/100/FFD700/8B0000?text=Priest', description: 'High-ranking religious commander' },
                { name: 'Wyrm Zealot', faction: 'Space-Wyrm', type: 'Warrior', speed: 6, shoot: '4+', fight: '3+', nerve: '2+', health: 18, points: 20, portrait: 'https://via.placeholder.com/100/FFD700/8B0000?text=Zealot', description: 'Fanatical Sun God devotee' },
                { name: 'Wyrm Hatchling', faction: 'Space-Wyrm', type: 'Trooper', speed: 7, shoot: '5+', fight: '4+', nerve: '3+', health: 10, points: 12, portrait: 'https://via.placeholder.com/100/FFD700/8B0000?text=Hatchling', description: 'Young warrior from The Garden' },
                { name: 'Wyrm Hunter', faction: 'Space-Wyrm', type: 'Specialist', speed: 8, shoot: '3+', fight: '4+', nerve: '3+', health: 15, points: 18, portrait: 'https://via.placeholder.com/100/FFD700/8B0000?text=Hunter', description: 'Swift ambush predator' },
                { name: 'Wyrm Brute', faction: 'Space-Wyrm', type: 'Warrior', speed: 5, shoot: '5+', fight: '2+', nerve: '2+', health: 24, points: 25, portrait: 'https://via.placeholder.com/100/FFD700/8B0000?text=Brute', description: 'Heavily mutated warrior' },
                { name: 'Solar Cultist', faction: 'Space-Wyrm', type: 'Trooper', speed: 6, shoot: '4+', fight: '4+', nerve: '3+', health: 12, points: 14, portrait: 'https://via.placeholder.com/100/FFD700/8B0000?text=Cultist', description: 'Devoted follower with basic solar weapons' }
            ],
            weapons: [
                // Arc Rangers
                { name: 'Plasma Carbine', faction: 'Arc Rangers', type: 'Ranged', attacks: 2, power: 4, damage: 2, effects: 'Rapid Fire', description: 'Standard issue energy carbine' },
                { name: 'Arc Blade', faction: 'Arc Rangers', type: 'Melee', attacks: 2, power: 3, damage: 1, effects: 'Precise', description: 'Close combat energy blade' },
                { name: 'Heavy Plasma Cannon', faction: 'Arc Rangers', type: 'Ranged', attacks: 3, power: 5, damage: 3, effects: 'Unwieldy', description: 'High-powered suppression weapon' },
                { name: 'Grapple Gun', faction: 'Arc Rangers', type: 'Equipment', attacks: 0, power: 0, damage: 0, effects: 'Mobility', description: 'Vertical movement tool' },
                { name: 'Shock Baton', faction: 'Arc Rangers', type: 'Melee', attacks: 3, power: 2, damage: 1, effects: 'Stun', description: 'Non-lethal enforcement tool' },
                { name: 'Sniper Rifle', faction: 'Arc Rangers', type: 'Ranged', attacks: 1, power: 5, damage: 3, effects: 'Long Range', description: 'Precision elimination weapon' },
                { name: 'Medkit', faction: 'Arc Rangers', type: 'Equipment', attacks: 0, power: 0, damage: 0, effects: 'Healing', description: 'Field medical equipment' },
                // Space-Wyrm
                { name: 'Thermal Lance', faction: 'Space-Wyrm', type: 'Melee', attacks: 3, power: 5, damage: 3, effects: 'Overheating', description: 'Solar-powered melee weapon' },
                { name: 'Sun Cannon', faction: 'Space-Wyrm', type: 'Ranged', attacks: 2, power: 6, damage: 4, effects: 'Blast, Overheating', description: 'Devastating solar energy weapon' },
                { name: 'Claw Gauntlets', faction: 'Space-Wyrm', type: 'Melee', attacks: 4, power: 3, damage: 1, effects: 'Rending', description: 'Enhanced natural weapons' },
                { name: 'Solar Shield', faction: 'Space-Wyrm', type: 'Equipment', attacks: 0, power: 0, damage: 0, effects: 'Defense +1', description: 'Energy shield from solar cells' },
                { name: 'Fusion Rifle', faction: 'Space-Wyrm', type: 'Ranged', attacks: 2, power: 4, damage: 2, effects: 'Solar Charge', description: 'Standard solar ranged weapon' },
                { name: 'Burning Blade', faction: 'Space-Wyrm', type: 'Melee', attacks: 2, power: 4, damage: 2, effects: 'Ignite', description: 'Superheated blade weapon' },
                { name: 'Prayer Beads', faction: 'Space-Wyrm', type: 'Equipment', attacks: 0, power: 0, damage: 0, effects: 'Faith', description: 'Religious icon for morale' }
            ],
            specialActions: [
                // Arc Rangers
                { name: 'Jump Boost', faction: 'Arc Rangers', description: 'Uses jet pack to boost 6 inches. Ignores terrain.', effects: 'Dangerous terrain test required', maxUses: 1, type: 'Movement' },
                { name: 'Tactical Scanner', faction: 'Arc Rangers', description: 'Reveal enemy positions and weaknesses.', effects: 'Squad +1 to hit this turn', maxUses: 2, type: 'Support' },
                { name: 'Suppressing Fire', faction: 'Arc Rangers', description: 'Pin enemy units with sustained fire.', effects: 'Enemy -1 movement this turn', maxUses: 3, type: 'Combat' },
                { name: 'Emergency Evac', faction: 'Arc Rangers', description: 'Rapid extraction from danger zone.', effects: 'Remove from danger', maxUses: 1, type: 'Movement' },
                { name: 'Overwatch Protocol', faction: 'Arc Rangers', description: 'Enhanced defensive reaction fire.', effects: 'Free interrupt shot', maxUses: 2, type: 'Defense' },
                { name: 'Medic Stabilize', faction: 'Arc Rangers', description: 'Advanced field medicine.', effects: 'Restore D3 health to ally', maxUses: 2, type: 'Support' },
                // Space-Wyrm
                { name: 'Solar Frenzy', faction: 'Space-Wyrm', description: 'Channel Sun God wrath for extra attacks.', effects: '+2 attacks, risk Overheating', maxUses: 2, type: 'Combat' },
                { name: 'Divine Vision', faction: 'Space-Wyrm', description: 'Heat-induced prophetic guidance.', effects: 'Re-roll one failed test', maxUses: 1, type: 'Support' },
                { name: 'Hatchery Rage', faction: 'Space-Wyrm', description: 'Primal berserker fury from hatchery memories.', effects: '+3 attacks, -1 defense for 2 turns', maxUses: 1, type: 'Combat' },
                { name: 'Solar Surge', faction: 'Space-Wyrm', description: 'Overload solar cells for power boost.', effects: '+1 to all solar weapons this turn', maxUses: 2, type: 'Combat' },
                { name: 'Zealot\'s Prayer', faction: 'Space-Wyrm', description: 'Invoke Sun God protection.', effects: 'Ignore next wound on Nerve test', maxUses: 2, type: 'Defense' },
                { name: 'Thermal Vent', faction: 'Space-Wyrm', description: 'Emergency heat dissipation.', effects: 'Remove Overheating status', maxUses: 3, type: 'Support' }
            ],
            starterSquads: [
                // Arc Rangers Squads
                {
                    name: 'Arc Rangers - Quick Strike',
                    faction: 'Arc Rangers',
                    difficulty: 'easy',
                    points: 30,
                    description: 'Fast 2-model team perfect for learning the basics of mobility and shooting.',
                    models: [
                        { preset: 'Arc Ranger', count: 2 }
                    ]
                },
                {
                    name: 'Arc Rangers - Balanced Force',
                    faction: 'Arc Rangers',
                    difficulty: 'medium',
                    points: 60,
                    description: 'Well-rounded 3-model squad with a leader and support troops.',
                    models: [
                        { preset: 'Veteran Captain', count: 1 },
                        { preset: 'Arc Ranger', count: 2 }
                    ]
                },
                {
                    name: 'Arc Rangers - Full Squad',
                    faction: 'Arc Rangers',
                    difficulty: 'hard',
                    points: 100,
                    description: 'Elite 5-model tactical team with specialized roles.',
                    models: [
                        { preset: 'Veteran Captain', count: 1 },
                        { preset: 'Arc Ranger', count: 2 },
                        { preset: 'Scout Ranger', count: 1 },
                        { preset: 'Medic Ranger', count: 1 }
                    ]
                },
                // Space-Wyrm Squads
                {
                    name: 'Space-Wyrm - Raiding Party',
                    faction: 'Space-Wyrm',
                    difficulty: 'easy',
                    points: 32,
                    description: 'Aggressive 2-model melee-focused starter team.',
                    models: [
                        { preset: 'Wyrm Zealot', count: 1 },
                        { preset: 'Wyrm Hatchling', count: 1 }
                    ]
                },
                {
                    name: 'Space-Wyrm - Sun Hunters',
                    faction: 'Space-Wyrm',
                    difficulty: 'medium',
                    points: 65,
                    description: 'Zealot war band with priest leadership and devotees.',
                    models: [
                        { preset: 'Solar Priest', count: 1 },
                        { preset: 'Wyrm Zealot', count: 1 }
                    ]
                },
                {
                    name: 'Space-Wyrm - Temple Warband',
                    faction: 'Space-Wyrm',
                    difficulty: 'hard',
                    points: 105,
                    description: 'Full religious war party with mixed tactics.',
                    models: [
                        { preset: 'Solar Priest', count: 1 },
                        { preset: 'Wyrm Zealot', count: 1 },
                        { preset: 'Wyrm Brute', count: 1 },
                        { preset: 'Wyrm Hunter', count: 1 }
                    ]
                },
                // Kippin Squads (Coming in future update - placeholders for now)
                {
                    name: 'Kippin - Scout Duo',
                    faction: 'Kippin',
                    difficulty: 'easy',
                    points: 30,
                    description: 'Fast-moving infiltration team. (Full rules coming soon)',
                    models: [] // Will be populated when Kippin models are added
                },
                {
                    name: 'Kippin - Tech Raiders',
                    faction: 'Kippin',
                    difficulty: 'medium',
                    points: 60,
                    description: 'Engineering specialists with custom weapons. (Full rules coming soon)',
                    models: []
                },
                {
                    name: 'Kippin - Underground Cell',
                    faction: 'Kippin',
                    difficulty: 'hard',
                    points: 100,
                    description: 'Complete rebel squad with varied tactics. (Full rules coming soon)',
                    models: []
                }
            ]
        };

        // Tutorial System State
        let tutorialState = {
            active: false,
            currentStep: 0,
            completed: localStorage.getItem('tutorialCompleted') === 'true'
        };

        const tutorialSteps = [
            {
                title: "Welcome to Space Ops 3030!",
                text: "Let's get you ready to command your first squad! This quick tour takes just 2 minutes. Ready?",
                spotlight: null,
                arrow: null
            },
            {
                title: "Choose Quick Play",
                text: "The fastest way to start playing! Click the Quick Play button to create a game with a pre-built team.",
                spotlight: "landingPage",
                arrow: "↓",
                highlight: ".menu-button"
            }
        ];

        function showTutorial() {
            if (tutorialState.completed) {
                const restart = confirm("You've completed the tutorial before. Would you like to see it again?");
                if (!restart) return;
            }
            
            tutorialState.active = true;
            tutorialState.currentStep = 0;
            document.getElementById('tutorialOverlay').classList.add('active');
            document.getElementById('tutorialModal').style.display = 'block';
            showTutorialStep(0);
        }

        function showTutorialStep(step) {
            const stepData = tutorialSteps[step];
            if (!stepData) {
                completeTutorial();
                return;
            }

            document.getElementById('tutorialTitle').textContent = stepData.title;
            document.getElementById('tutorialText').textContent = stepData.text;
            
            // Update progress dots
            const progressHTML = tutorialSteps.map((_, i) => 
                `<div class="tutorial-progress-dot ${i === step ? 'active' : ''}"></div>`
            ).join('');
            document.getElementById('tutorialProgress').innerHTML = progressHTML;
            
            // Update next button
            const nextBtn = document.getElementById('tutorialNextBtn');
            nextBtn.textContent = step === tutorialSteps.length - 1 ? 'Finish!' : 'Next →';
        }

        function nextTutorialStep() {
            tutorialState.currentStep++;
            if (tutorialState.currentStep >= tutorialSteps.length) {
                completeTutorial();
            } else {
                showTutorialStep(tutorialState.currentStep);
            }
        }

        function skipTutorial() {
            if (confirm("Skip the tutorial? You can restart it anytime from the menu!")) {
                closeTutorial();
            }
        }

        function completeTutorial() {
            localStorage.setItem('tutorialCompleted', 'true');
            tutorialState.completed = true;
            closeTutorial();
            alert("Tutorial Complete!\n\nYou're ready to command your squad! Good luck in The Reach, Commander!");
        }

        function closeTutorial() {
            tutorialState.active = false;
            document.getElementById('tutorialOverlay').classList.remove('active');
            document.getElementById('tutorialModal').style.display = 'none';
        }

        // Starter Squad Loader
        function loadStarterSquad(squadName) {
            const squad = gameData.starterSquads.find(s => s.name === squadName);
            if (!squad) {
                alert('Starter squad not found!');
                return;
            }

            if (squad.models.length === 0) {
                alert('This faction is coming soon!\n\nKippin units are currently in development. Try Arc Rangers or Space-Wyrm squads instead!');
                return;
            }

            // Create session name
            const sessionName = `${squad.name.replace(/\s/g, '-')}-${Date.now()}`;
            const playerName = prompt("Enter your player name:", localStorage.getItem('lastPlayerName') || 'Commander');
            
            if (!playerName) return;

            // Build team from squad
            const team = [];
            squad.models.forEach(modelSpec => {
                const modelData = gameData.models.find(m => m.name === modelSpec.preset);
                if (modelData) {
                    for (let i = 0; i < modelSpec.count; i++) {
                        team.push(modelData);
                    }
                }
            });

            // Use existing Quick Build flow with the starter squad
            startQuickGameWithSquad(squad.faction, team, sessionName, playerName);
        }

        function startQuickGameWithSquad(factionName, team, sessionName, playerName) {
            const sanitizedSessionName = sanitizeSessionName(sessionName);
            const sanitizedPlayerName = playerName.replace(/[.#$[\]\s]/g, '_');
            
            currentPlayer = sanitizedPlayerName;
            currentPlayerDisplay = playerName;
            currentSession = sanitizedSessionName;
            
            const sessionRef = database.ref('sessions/' + sanitizedSessionName);
            sessionRef.once('value', (snapshot) => {
                const sessionPromise = snapshot.exists() ? 
                    Promise.resolve() : 
                    sessionRef.set({
                        name: sessionName,
                        description: `Starter Squad - ${factionName}`,
                        created: firebase.database.ServerValue.TIMESTAMP,
                        archived: false,
                        campaign: {
                            name: 'First Mission',
                            description: 'Your first deployment in The Reach!',
                            objectives: ['Survive the mission', 'Complete your objective']
                        },
                        teams: {},
                        actionHistory: {},
                        combatLog: {},
                        initiative: {}
                    });
                
                sessionPromise.then(() => {
                    document.getElementById('landingPage').style.display = 'none';
                    document.getElementById('appInterface').style.display = 'block';
                    
                    document.getElementById('currentSession').textContent = sessionName;
                    document.getElementById('currentPlayer').textContent = playerName;
                    document.getElementById('gameTabBtn').style.display = 'block';
                    document.getElementById('toolsTabBtn').style.display = 'block';
                    document.getElementById('gameArea').style.display = 'block';
                    
                    document.getElementById('sessionInfoBar').style.display = 'block';
                    document.getElementById('campaignSection').style.display = 'block';
                    
                    loadCampaignInfo();
                    loadMissionObjectives();
                    syncTimer();
                    
                    sessionRef.child('teams').on('value', (snapshot) => {
                        renderTeams(snapshot.val() || {});
                    });
                    
                    const teamId = currentPlayer.replace(/\s/g, '_');
                    const teamRef = database.ref(`sessions/${sanitizedSessionName}/teams/${teamId}`);
                    teamRef.set({
                        owner: currentPlayer,
                        faction: factionName,
                        characters: {}
                    }).then(() => {
                        team.forEach((model, index) => {
                            setTimeout(() => {
                                addQuickTeamModel(model, factionName);
                            }, index * 100);
                        });
                        
                        setTimeout(() => {
                            switchTab('game');
                            alert(`${factionName} squad loaded!\n\nYour team is ready. Check the Game tab to see your models!`);
                        }, team.length * 100 + 500);
                    });
                });
            });
        }

        // Preset Items Library (keeping for backwards compatibility)
        const presetWeapons = [
            { name: 'Plasma Pistol', type: 'Ranged', attacks: 2, power: 3, damage: 2 },
            { name: 'Bolter', type: 'Ranged', attacks: 3, power: 2, damage: 1 },
            { name: 'Heavy Bolter', type: 'Ranged', attacks: 4, power: 3, damage: 2 },
            { name: 'Chainsword', type: 'Melee', attacks: 3, power: 2, damage: 1 },
            { name: 'Power Fist', type: 'Melee', attacks: 2, power: 4, damage: 3 },
            { name: 'Krak Grenade', type: 'Ranged', attacks: 1, power: 4, damage: 3 },
            { name: 'Frag Grenade', type: 'Ranged', attacks: 3, power: 2, damage: 1 },
            { name: 'Melta Gun', type: 'Ranged', attacks: 1, power: 5, damage: 4 },
            { name: 'Lasgun', type: 'Ranged', attacks: 2, power: 1, damage: 1 },
            { name: 'Bolt Rifle', type: 'Ranged', attacks: 2, power: 2, damage: 1 },
            { name: 'Storm Bolter', type: 'Ranged', attacks: 4, power: 2, damage: 1 },
            { name: 'Combat Knife', type: 'Melee', attacks: 2, power: 1, damage: 1 },
            { name: 'Sniper Rifle', type: 'Ranged', attacks: 1, power: 3, damage: 2 },
            { name: 'Shotgun', type: 'Ranged', attacks: 2, power: 2, damage: 1 },
            { name: 'Assault Rifle', type: 'Ranged', attacks: 3, power: 2, damage: 1 }
        ];

        const presetConsumables = [
            { name: 'Medkit', effect: 'heal', amount: 5, maxUses: 2, targetType: 'self' },
            { name: 'Healing Potion', effect: 'heal', amount: 3, maxUses: 3, targetType: 'self' },
            { name: 'Emergency Stim', effect: 'heal', amount: 3, maxUses: 1, targetType: 'other' },
            { name: 'Combat Stim', effect: 'buff', amount: 2, maxUses: 1, targetType: 'self' },
            { name: 'Poison Vial', effect: 'damage', amount: 4, maxUses: 2, targetType: 'other' },
            { name: 'Field Bandage', effect: 'heal', amount: 2, maxUses: 5, targetType: 'self' },
            { name: 'Adrenaline Shot', effect: 'buff', amount: 3, maxUses: 1, targetType: 'self' },
            { name: 'Flashbang', effect: 'damage', amount: 2, maxUses: 3, targetType: 'other' },
            { name: 'Health Pack', effect: 'heal', amount: 8, maxUses: 1, targetType: 'self' },
            { name: 'Smoke Grenade', effect: 'buff', amount: 1, maxUses: 2, targetType: 'self' }
        ];

        try {
            app = firebase.initializeApp(firebaseConfig);
            database = firebase.database();
        } catch (error) {
            console.error("Firebase initialization error:", error);
            alert("Firebase initialization failed. Please check the console.");
        }

        // ========================================
        // v14.1: CSV EXPORT/IMPORT FOR TEAMS
        // ========================================

        function exportTeamsToCSV() {
            if (!currentPlayer) {
                alert('Please set player name first!');
                return;
            }
            
            database.ref(`players/${currentPlayer}/teams`).once('value', snapshot => {
                const teams = snapshot.val();
                if (!teams || Object.keys(teams).length === 0) {
                    alert('No teams to export!');
                    return;
                }
                
                // Build CSV content
                let csv = 'Team Name,Faction,Model Name,Role,Speed,Shoot,Fight,Nerve,Max HP,Current HP,Weapons,Inventory 1,Inventory 2,Portrait,Notes\n';
                
                Object.values(teams).forEach(team => {
                    team.models.forEach(model => {
                        // Handle weapons in various formats
                        let weaponsStr = '';
                        if (Array.isArray(model.weapons)) {
                            weaponsStr = model.weapons.map(w => w.name || w).join(';');
                        } else if (model.weapons && typeof model.weapons === 'object') {
                            weaponsStr = Object.values(model.weapons).map(w => w.name || w).join(';');
                        } else if (typeof model.weapons === 'string') {
                            weaponsStr = model.weapons;
                        }
                        
                        // Handle inventory - support both array and object formats
                        let inv1 = '';
                        let inv2 = '';
                        
                        if (Array.isArray(model.inventory)) {
                            inv1 = model.inventory[0] || '';
                            inv2 = model.inventory[1] || '';
                        } else if (model.inventory && typeof model.inventory === 'object') {
                            const invValues = Object.values(model.inventory);
                            inv1 = invValues[0] || '';
                            inv2 = invValues[1] || '';
                        }
                        
                        // Escape quotes in values
                        const escapeCsv = (val) => {
                            if (val === undefined || val === null) return '';
                            const str = String(val);
                            return str.includes(',') || str.includes('"') || str.includes('\n') 
                                ? `"${str.replace(/"/g, '""')}"` 
                                : str;
                        };
                        
                        csv += `${escapeCsv(team.name)},${escapeCsv(team.faction)},${escapeCsv(model.name)},${escapeCsv(model.type || model.role)},`;
                        csv += `${escapeCsv(model.speed)},${escapeCsv(model.shoot)},${escapeCsv(model.fight)},${escapeCsv(model.nerve)},`;
                        csv += `${model.health},${model.currentHealth || model.health},${escapeCsv(weaponsStr)},${escapeCsv(inv1)},${escapeCsv(inv2)},${escapeCsv(model.portrait || '')},${escapeCsv(model.notes || '')}\n`;
                    });
                });
                
                // Download CSV
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `space-ops-teams-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                alert(`✅ Exported ${Object.keys(teams).length} team(s) to CSV!\n\nFile: ${a.download}\n\nOpen in Google Sheets to edit.`);
            });
        }
        
        function importTeamsFromCSV(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            if (!currentPlayer) {
                alert('Please set player name first!');
                event.target.value = '';
                return;
            }
            
            if (!confirm('Import teams from CSV?\n\nThis will add teams from the CSV file to your existing teams.')) {
                event.target.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        alert('CSV file is empty or invalid!');
                        return;
                    }
                    
                    // Skip header line
                    const teams = {};
                    
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;
                        
                        // Parse CSV line (handle quoted fields)
                        const values = [];
                        let current = '';
                        let inQuotes = false;
                        
                        for (let j = 0; j < line.length; j++) {
                            const char = line[j];
                            
                            if (char === '"') {
                                if (inQuotes && line[j + 1] === '"') {
                                    current += '"';
                                    j++;
                                } else {
                                    inQuotes = !inQuotes;
                                }
                            } else if (char === ',' && !inQuotes) {
                                values.push(current);
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        values.push(current);
                        
                        if (values.length < 8) continue; // Need at least team through nerve
                        
                        const teamName = values[0] || 'Unnamed Team';
                        const faction = values[1] || 'Unknown';
                        const modelName = values[2] || 'Unnamed Model';
                        const role = values[3] || 'Trooper';
                        const speed = values[4] || '6';
                        const shoot = values[5] || '4+';
                        const fight = values[6] || '5+';
                        const nerve = values[7] || '4+';
                        const maxHP = parseInt(values[8]) || 15;
                        const currentHP = parseInt(values[9]) || maxHP;
                        const weaponsStr = values[10] || '';
                        const inv1 = values[11] || '';
                        const inv2 = values[12] || '';
                        const portrait = values[13] || ''; // Portrait URL
                        const notes = values[14] || values[11] || ''; // Notes column moved to 14, fallback to old format
                        
                        if (!teams[teamName]) {
                            teams[teamName] = {
                                name: teamName,
                                faction: faction,
                                models: [],
                                points: 0,
                                created: Date.now(),
                                modified: Date.now(),
                                owner: currentPlayer
                            };
                        }
                        
                        const weapons = weaponsStr ? weaponsStr.split(';').map(w => ({name: w.trim()})) : [];
                        const inventory = [inv1, inv2].filter(item => item); // Filter out empty strings
                        
                        teams[teamName].models.push({
                            name: modelName,
                            type: role,
                            role: role,
                            speed: speed,
                            shoot: shoot,
                            fight: fight,
                            nerve: nerve,
                            health: maxHP,
                            currentHealth: currentHP,
                            weapons: weapons,
                            inventory: inventory,
                            portrait: portrait, // Add portrait URL
                            notes: notes,
                            points: 15
                        });
                        
                        teams[teamName].points += 15;
                    }
                    
                    if (Object.keys(teams).length === 0) {
                        alert('No valid teams found in CSV!');
                        return;
                    }
                    
                    // Save all teams to Firebase
                    const promises = Object.entries(teams).map(([teamName, team]) => {
                        const teamId = 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        return database.ref(`players/${currentPlayer}/teams/${teamId}`).set(team);
                    });
                    
                    Promise.all(promises).then(() => {
                        alert(`✅ Imported ${Object.keys(teams).length} team(s) successfully!\n\nTotal models: ${Object.values(teams).reduce((sum, t) => sum + t.models.length, 0)}`);
                        loadPlayerTeams();
                    }).catch(error => {
                        alert('Error saving teams to Firebase: ' + error.message);
                        console.error('Firebase save error:', error);
                    });
                    
                } catch (error) {
                    alert('Error importing CSV: ' + error.message + '\n\nMake sure the CSV format matches the export format.');
                    console.error('CSV import error:', error);
                }
            };
            
            reader.readAsText(file);
            event.target.value = ''; // Reset file input
        }


        // Dice Roller
        let diceHistory = [];
        
        function rollDice(sides) {
            const result = Math.floor(Math.random() * sides) + 1;
            const timestamp = new Date().toLocaleTimeString();
            diceHistory.unshift({ sides, result, timestamp });
            if (diceHistory.length > 10) diceHistory.pop();
            
            const resultDiv = document.getElementById('diceResult');
            resultDiv.style.display = 'block';
            resultDiv.querySelector('.dice-result-value').textContent = result;
            resultDiv.querySelector('div:last-child').textContent = `D${sides} rolled at ${timestamp}`;
            
            updateDiceHistory();
            logToCombat(` Rolled D${sides}: ${result}`);
        }
        
        function updateDiceHistory() {
            const container = document.getElementById('diceHistory');
            container.innerHTML = diceHistory.map(h => 
                `<div class="dice-history-item">D${h.sides}: ${h.result} (${h.timestamp})</div>`
            ).join('');
        }

        // Initiative Tracker
        function rollInitiativeForAll() {
            if (!currentSession) return;
            
            const sessionRef = database.ref(`sessions/${currentSession}/teams`);
            sessionRef.once('value', (snapshot) => {
                const teams = snapshot.val() || {};
                const initiatives = [];
                
                Object.entries(teams).forEach(([teamId, team]) => {
                    if (team.characters) {
                        Object.entries(team.characters).forEach(([charId, char]) => {
                            if (char.status === 'alive') {
                                const roll = Math.floor(Math.random() * 20) + 1;
                                initiatives.push({
                                    teamId,
                                    charId,
                                    name: char.name,
                                    owner: team.owner,
                                    initiative: roll
                                });
                            }
                        });
                    }
                });
                
                initiatives.sort((a, b) => b.initiative - a.initiative);
                
                database.ref(`sessions/${currentSession}/initiative`).set({
                    order: initiatives,
                    currentTurn: 0
                });
                
                renderInitiative();
                logToCombat('Initiative Initiative rolled for all characters');
            });
        }
        
        function renderInitiative() {
            const initiativeRef = database.ref(`sessions/${currentSession}/initiative`);
            initiativeRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (!data || !data.order) {
                    document.getElementById('initiativeList').innerHTML = '<div style="text-align: center; color: #666;">No initiative rolled yet</div>';
                    return;
                }
                
                const container = document.getElementById('initiativeList');
                currentTurn = data.currentTurn || 0;
                
                container.innerHTML = data.order.map((char, idx) => `
                    <div class="initiative-item ${idx === currentTurn ? 'active-turn' : ''}">
                        <div class="initiative-number">${char.initiative}</div>
                        <div class="initiative-char">${char.owner} - ${char.name}</div>
                        ${idx === currentTurn ? '<span style="color: #48bb78; font-weight: 600;"> Current Turn</span>' : ''}
                    </div>
                `).join('');
            });
        }
        
        function nextTurn() {
            const initiativeRef = database.ref(`sessions/${currentSession}/initiative`);
            initiativeRef.once('value', (snapshot) => {
                const data = snapshot.val();
                if (!data || !data.order) return;
                
                const newTurn = (data.currentTurn + 1) % data.order.length;
                initiativeRef.update({ currentTurn: newTurn });
                
                // Decrease status effect durations
                decreaseStatusEffectDurations();
                
                logToCombat(` Turn passed to ${data.order[newTurn].name}`);
            });
        }
        
        function clearInitiative() {
            if (confirm('Clear initiative order?')) {
                database.ref(`sessions/${currentSession}/initiative`).remove();
                logToCombat('Initiative Initiative cleared');
            }
        }
        
        function decreaseStatusEffectDurations() {
            const sessionRef = database.ref(`sessions/${currentSession}/teams`);
            sessionRef.once('value', (snapshot) => {
                const teams = snapshot.val() || {};
                
                Object.entries(teams).forEach(([teamId, team]) => {
                    if (team.characters) {
                        Object.entries(team.characters).forEach(([charId, char]) => {
                            if (char.statusEffects && char.statusEffects.length > 0) {
                                const updated = char.statusEffects.map(effect => ({
                                    ...effect,
                                    duration: effect.duration - 1
                                })).filter(effect => effect.duration > 0);
                                
                                database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`).update({
                                    statusEffects: updated
                                });
                            }
                        });
                    }
                });
            });
        }

        // Status Effects
        function openStatusEffectModal(teamId, charId) {
            statusEffectTarget = { teamId, charId };
            document.getElementById('statusEffectModal').classList.add('active');
        }
        
        function closeStatusEffectModal() {
            document.getElementById('statusEffectModal').classList.remove('active');
            statusEffectTarget = null;
        }
        
        function confirmStatusEffect() {
            const name = document.getElementById('statusEffectName').value.trim();
            const duration = parseInt(document.getElementById('statusEffectDuration').value);
            const description = document.getElementById('statusEffectDesc').value.trim();
            
            if (!name) {
                alert('Please enter an effect name');
                return;
            }
            
            const { teamId, charId } = statusEffectTarget;
            const charRef = database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`);
            
            charRef.once('value', (snapshot) => {
                const char = snapshot.val();
                const statusEffects = char.statusEffects || [];
                statusEffects.push({ name, duration, description });
                charRef.update({ statusEffects });
                
                logToCombat(` ${char.name} gained status: ${name} (${duration} turns)`);
            });
            
            document.getElementById('statusEffectName').value = '';
            document.getElementById('statusEffectDuration').value = '3';
            document.getElementById('statusEffectDesc').value = '';
            closeStatusEffectModal();
        }
        
        function removeStatusEffect(teamId, charId, effectIndex) {
            const charRef = database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`);
            charRef.once('value', (snapshot) => {
                const char = snapshot.val();
                const statusEffects = char.statusEffects || [];
                const removed = statusEffects.splice(effectIndex, 1)[0];
                charRef.update({ statusEffects });
                
                logToCombat(` ${char.name} lost status: ${removed.name}`);
            });
        }

        // Combat Log
        function logToCombat(message) {
            if (!currentSession) return;
            
            const logRef = database.ref(`sessions/${currentSession}/combatLog`);
            logRef.push({
                message: message,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                player: currentPlayer
            });
        }
        
        function toggleCombatLog() {
            const panel = document.getElementById('combatLogPanel');
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
                loadCombatLog();
            } else {
                panel.style.display = 'none';
            }
        }
        
        function loadCombatLog() {
            const logRef = database.ref(`sessions/${currentSession}/combatLog`);
            logRef.orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
                const container = document.getElementById('combatLog');
                const logs = [];
                snapshot.forEach((child) => {
                    logs.push({ key: child.key, ...child.val() });
                });
                
                logs.reverse();
                container.innerHTML = logs.map(log => {
                    const time = new Date(log.timestamp).toLocaleTimeString();
                    return `
                        <div class="log-item">
                            <span class="log-text">${log.message}</span>
                            <span class="log-time">${time}</span>
                        </div>
                    `;
                }).join('');
                
                if (logs.length === 0) {
                    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No combat actions yet</div>';
                }
            });
        }
        
        function clearCombatLog() {
            if (confirm('Clear combat log?')) {
                database.ref(`sessions/${currentSession}/combatLog`).remove();
            }
        }

        // Export/Import
        function exportSession() {
            const sessionRef = database.ref(`sessions/${currentSession}`);
            sessionRef.once('value', (snapshot) => {
                const data = snapshot.val();
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentSession}-export.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
        
        function importSession(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const newName = prompt('Enter a name for the imported session:', data.name + '-imported');
                    if (!newName) return;
                    
                    database.ref(`sessions/${newName}`).set({
                        ...data,
                        name: newName,
                        created: firebase.database.ServerValue.TIMESTAMP
                    }).then(() => {
                        alert('Session imported successfully!');
                        loadAllSessions();
                    });
                } catch (error) {
                    alert('Failed to import session. Invalid file format.');
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        // Templates
        function openSaveTemplateModal() {
            if (!currentSession) {
                alert('Please join a session first');
                return;
            }
            
            const sessionRef = database.ref(`sessions/${currentSession}/teams`);
            sessionRef.once('value', (snapshot) => {
                const teams = snapshot.val() || {};
                const select = document.getElementById('templateCharacterSelect');
                select.innerHTML = '<option value="">Select a character...</option>';
                
                Object.entries(teams).forEach(([teamId, team]) => {
                    if (team.characters) {
                        Object.entries(team.characters).forEach(([charId, char]) => {
                            select.innerHTML += `<option value="${teamId}:${charId}">${team.owner} - ${char.name}</option>`;
                        });
                    }
                });
            });
            
            document.getElementById('saveTemplateModal').classList.add('active');
        }
        
        function closeSaveTemplateModal() {
            document.getElementById('saveTemplateModal').classList.remove('active');
        }
        
        function confirmSaveTemplate() {
            const select = document.getElementById('templateCharacterSelect');
            const templateName = document.getElementById('templateName').value.trim();
            
            if (!select.value) {
                alert('Please select a character');
                return;
            }
            
            const [teamId, charId] = select.value.split(':');
            const charRef = database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`);
            
            charRef.once('value', (snapshot) => {
                const char = snapshot.val();
                const template = {
                    ...char,
                    templateName: templateName || char.name,
                    created: firebase.database.ServerValue.TIMESTAMP,
                    creator: currentPlayer
                };
                
                database.ref('templates').push(template).then(() => {
                    alert('Template saved!');
                    closeSaveTemplateModal();
                    loadTemplates();
                });
            });
        }
        
        function loadTemplates() {
            const templatesRef = database.ref('templates');
            templatesRef.on('value', (snapshot) => {
                const templates = snapshot.val() || {};
                const container = document.getElementById('templatesList');
                
                if (Object.keys(templates).length === 0) {
                    container.innerHTML = '<div class="empty-state"><h3>No templates yet</h3><p>Save a character as a template to reuse it</p></div>';
                    return;
                }
                
                container.innerHTML = '';
                Object.entries(templates).forEach(([key, template]) => {
                    const card = document.createElement('div');
                    card.className = 'template-card';
                    card.style.position = 'relative';
                    card.innerHTML = `
                        ${template.portrait ? `
                            <div style="width: 100%; height: 150px; background-image: url('${template.portrait}'); background-size: cover; background-position: center; border-radius: 8px 8px 0 0; margin: -15px -15px 15px -15px;"></div>
                        ` : ''}
                        <button onclick="event.stopPropagation(); deleteTemplate('${key}', '${template.templateName || template.name}');" 
                                style="position: absolute; top: 10px; right: 10px; background: rgba(220, 38, 38, 0.9); color: white; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; z-index: 10;"
                                title="Delete Template">×</button>
                        <h4 style="margin-top: ${template.portrait ? '0' : '0'};">${template.templateName || template.name}</h4>
                        <div class="template-meta">
                            Role: ${template.role || 'N/A'}<br>
                            Health: ${template.maxHealth}<br>
                            ${template.speed ? `Speed: ${template.speed}<br>` : ''}
                            ${template.shoot ? `Shoot: ${template.shoot}<br>` : ''}
                            ${template.fight ? `Fight: ${template.fight}<br>` : ''}
                            By: ${template.creator}
                        </div>
                    `;
                    card.onclick = () => useTemplate(key, template);
                    container.appendChild(card);
                });
            });
        }
        
        function deleteTemplate(key, name) {
            if (confirm(`Delete template "${name}"? This cannot be undone.`)) {
                database.ref(`templates/${key}`).remove().then(() => {
                    alert('Template deleted successfully!');
                }).catch(error => {
                    alert('Error deleting template: ' + error.message);
                });
            }
        }
        
        function useTemplate(key, template) {
            if (!currentSession) {
                alert('Please join a session first');
                return;
            }
            
            if (!confirm(`Use template "${template.templateName || template.name}"?`)) return;
            
            const character = {
                ...template,
                currentHealth: template.maxHealth,
                status: 'alive',
                owner: currentPlayer,
                statusEffects: [],
                consumables: template.consumables ? template.consumables.map(c => ({ ...c, uses: c.maxUses })) : []
            };
            
            delete character.templateName;
            delete character.created;
            delete character.creator;
            
            const teamId = currentPlayer.replace(/\s/g, '_');
            const charId = 'char_' + Date.now();
            const teamRef = database.ref(`sessions/${currentSession}/teams/${teamId}`);
            
            teamRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    teamRef.child('characters/' + charId).set(character);
                } else {
                    teamRef.set({
                        owner: currentPlayer,
                        characters: {
                            [charId]: character
                        }
                    });
                }
                alert('Character created from template!');
                switchTab('game');
            });
        }

        // View Toggle
        function toggleView(view) {
            currentView = view;
            renderTeams();
        }

        // Item Transfer System
        function openTransferModal(fromTeamId, fromCharId, itemType, itemIndex, itemName) {
            transferData = { fromTeamId, fromCharId, itemType, itemIndex, itemName };
            
            document.getElementById('transferModalTitle').textContent = `Reset Transfer: ${itemName}`;
            
            const sessionRef = database.ref(`sessions/${currentSession}/teams`);
            sessionRef.once('value', (snapshot) => {
                const teams = snapshot.val() || {};
                const targetSelect = document.getElementById('transferTarget');
                targetSelect.innerHTML = '<option value="">Select character...</option>';
                
                Object.entries(teams).forEach(([teamId, team]) => {
                    if (team.characters) {
                        Object.entries(team.characters).forEach(([charId, char]) => {
                            if (char.status === 'alive' && !(teamId === fromTeamId && charId === fromCharId)) {
                                targetSelect.innerHTML += `<option value="${teamId}:${charId}">${team.owner} - ${char.name}</option>`;
                            }
                        });
                    }
                });
            });
            
            document.getElementById('transferModal').classList.add('active');
        }

        function closeTransferModal() {
            document.getElementById('transferModal').classList.remove('active');
            transferData = null;
        }

        function confirmTransfer() {
            const targetValue = document.getElementById('transferTarget').value;
            if (!targetValue) {
                alert('Please select a recipient');
                return;
            }
            
            const [toTeamId, toCharId] = targetValue.split(':');
            const { fromTeamId, fromCharId, itemType, itemIndex, itemName } = transferData;
            
            const fromCharRef = database.ref(`sessions/${currentSession}/teams/${fromTeamId}/characters/${fromCharId}`);
            const toCharRef = database.ref(`sessions/${currentSession}/teams/${toTeamId}/characters/${toCharId}`);
            
            Promise.all([
                fromCharRef.once('value'),
                toCharRef.once('value')
            ]).then(([fromSnapshot, toSnapshot]) => {
                const fromChar = fromSnapshot.val();
                const toChar = toSnapshot.val();
                
                let itemToTransfer = null;
                
                if (itemType === 'weapon') {
                    itemToTransfer = fromChar.weapons[itemIndex];
                    fromChar.weapons.splice(itemIndex, 1);
                    toChar.weapons = toChar.weapons || [];
                    toChar.weapons.push(itemToTransfer);
                } else if (itemType === 'consumable') {
                    itemToTransfer = fromChar.consumables[itemIndex];
                    fromChar.consumables.splice(itemIndex, 1);
                    toChar.consumables = toChar.consumables || [];
                    toChar.consumables.push(itemToTransfer);
                } else if (itemType === 'inventory') {
                    itemToTransfer = fromChar.inventory[itemIndex];
                    fromChar.inventory.splice(itemIndex, 1);
                    toChar.inventory = toChar.inventory || [];
                    toChar.inventory.push(itemToTransfer);
                }
                
                fromCharRef.update({ 
                    weapons: fromChar.weapons || [],
                    consumables: fromChar.consumables || [],
                    inventory: fromChar.inventory || []
                });
                toCharRef.update({ 
                    weapons: toChar.weapons || [],
                    consumables: toChar.consumables || [],
                    inventory: toChar.inventory || []
                });
                
                logAction(`${fromChar.name} transferred ${itemName} to ${toChar.name}`, {
                    type: 'itemTransfer',
                    fromTeamId, fromCharId, toTeamId, toCharId, itemType, item: itemToTransfer
                });
                
                logToCombat(`Reset ${fromChar.name} → ${toChar.name}: ${itemName}`);
                
                closeTransferModal();
            });
        }

        // Action History System
        function logAction(description, undoAction) {
            if (!currentSession) return;
            
            const actionRef = database.ref(`sessions/${currentSession}/actionHistory`);
            const newAction = {
                description: description,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                player: currentPlayer,
                undoData: undoAction
            };
            
            actionRef.push(newAction);
        }

        function toggleUndoPanel() {
            const panel = document.getElementById('undoPanel');
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
                loadActionHistory();
            } else {
                panel.style.display = 'none';
            }
        }

        function loadActionHistory() {
            const actionRef = database.ref(`sessions/${currentSession}/actionHistory`);
            actionRef.orderByChild('timestamp').limitToLast(10).once('value', (snapshot) => {
                const container = document.getElementById('actionHistory');
                container.innerHTML = '';
                
                const actions = [];
                snapshot.forEach((child) => {
                    actions.push({ key: child.key, ...child.val() });
                });
                
                actions.reverse().forEach((action) => {
                    const timestamp = new Date(action.timestamp).toLocaleTimeString();
                    const actionDiv = document.createElement('div');
                    actionDiv.className = 'action-item';
                    actionDiv.innerHTML = `
                        <span class="action-text">${action.description}</span>
                        <span class="action-time">${timestamp}</span>
                        <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="undoAction('${action.key}', ${JSON.stringify(action.undoData).replace(/"/g, '&quot;')})">Undo</button>
                    `;
                    container.appendChild(actionDiv);
                });
                
                if (actions.length === 0) {
                    container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No recent actions</div>';
                }
            });
        }

        function undoAction(actionKey, undoData) {
            if (!confirm('Undo this action?')) return;
            
            if (undoData.type === 'healthChange') {
                const charRef = database.ref(`sessions/${currentSession}/teams/${undoData.teamId}/characters/${undoData.charId}`);
                charRef.once('value', (snapshot) => {
                    const char = snapshot.val();
                    const newHealth = Math.max(0, Math.min(char.maxHealth, char.currentHealth - undoData.change));
                    charRef.update({
                        currentHealth: newHealth,
                        status: newHealth > 0 ? 'alive' : 'dead'
                    });
                });
            } else if (undoData.type === 'consumableUse') {
                const charRef = database.ref(`sessions/${currentSession}/teams/${undoData.teamId}/characters/${undoData.charId}`);
                charRef.once('value', (snapshot) => {
                    const char = snapshot.val();
                    if (char.consumables && char.consumables[undoData.consumableIndex]) {
                        const consumables = [...char.consumables];
                        consumables[undoData.consumableIndex].uses += 1;
                        charRef.update({ consumables });
                    }
                    
                    if (undoData.healthChange && undoData.targetTeamId && undoData.targetCharId) {
                        const targetRef = database.ref(`sessions/${currentSession}/teams/${undoData.targetTeamId}/characters/${undoData.targetCharId}`);
                        targetRef.once('value', (targetSnapshot) => {
                            const targetChar = targetSnapshot.val();
                            const newHealth = Math.max(0, Math.min(targetChar.maxHealth, targetChar.currentHealth - undoData.healthChange));
                            targetRef.update({
                                currentHealth: newHealth,
                                status: newHealth > 0 ? 'alive' : 'dead'
                            });
                        });
                    }
                });
            } else if (undoData.type === 'itemTransfer') {
                const fromCharRef = database.ref(`sessions/${currentSession}/teams/${undoData.fromTeamId}/characters/${undoData.fromCharId}`);
                const toCharRef = database.ref(`sessions/${currentSession}/teams/${undoData.toTeamId}/characters/${undoData.toCharId}`);
                
                Promise.all([
                    fromCharRef.once('value'),
                    toCharRef.once('value')
                ]).then(([fromSnapshot, toSnapshot]) => {
                    const fromChar = fromSnapshot.val();
                    const toChar = toSnapshot.val();
                    
                    if (undoData.itemType === 'weapon') {
                        const idx = toChar.weapons.findIndex(w => JSON.stringify(w) === JSON.stringify(undoData.item));
                        if (idx !== -1) {
                            toChar.weapons.splice(idx, 1);
                            fromChar.weapons.push(undoData.item);
                        }
                    } else if (undoData.itemType === 'consumable') {
                        const idx = toChar.consumables.findIndex(c => c.name === undoData.item.name);
                        if (idx !== -1) {
                            toChar.consumables.splice(idx, 1);
                            fromChar.consumables.push(undoData.item);
                        }
                    } else if (undoData.itemType === 'inventory') {
                        const idx = toChar.inventory.indexOf(undoData.item);
                        if (idx !== -1) {
                            toChar.inventory.splice(idx, 1);
                            fromChar.inventory.push(undoData.item);
                        }
                    }
                    
                    fromCharRef.update({ 
                        weapons: fromChar.weapons || [],
                        consumables: fromChar.consumables || [],
                        inventory: fromChar.inventory || []
                    });
                    toCharRef.update({ 
                        weapons: toChar.weapons || [],
                        consumables: toChar.consumables || [],
                        inventory: toChar.inventory || []
                    });
                });
            }
            
            database.ref(`sessions/${currentSession}/actionHistory/${actionKey}`).remove();
            loadActionHistory();
        }

        // Tab switching
        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            if (tabName === 'join') {
                document.querySelector('.tab:nth-child(1)').classList.add('active');
                document.getElementById('joinTab').classList.add('active');
            } else if (tabName === 'sessions') {
                document.querySelector('.tab:nth-child(2)').classList.add('active');
                document.getElementById('sessionsTab').classList.add('active');
                loadAllSessions();
            } else if (tabName === 'game') {
                document.querySelector('.tab:nth-child(3)').classList.add('active');
                document.getElementById('gameTab').classList.add('active');
            } else if (tabName === 'tools') {
                document.querySelector('.tab:nth-child(4)').classList.add('active');
                document.getElementById('toolsTab').classList.add('active');
                renderInitiative();
            } else if (tabName === 'templates') {
                document.querySelector('.tab:nth-child(5)').classList.add('active');
                document.getElementById('templatesTab').classList.add('active');
                loadTemplates();
            }
        }

        // Session Management
        function showCreateSessionModal() {
            document.getElementById('createSessionModal').classList.add('active');
        }

        function closeCreateSessionModal() {
            document.getElementById('createSessionModal').classList.remove('active');
        }
        
        // Sanitize session name for Firebase paths
        function sanitizeSessionName(name) {
            // Replace spaces with hyphens and remove invalid Firebase characters: . # $ [ ]
            return name
                .replace(/\s+/g, '-')           // Replace spaces with hyphens
                .replace(/[.#$\[\]]/g, '')      // Remove invalid Firebase characters
                .replace(/-+/g, '-')            // Replace multiple hyphens with single hyphen
                .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
        }

        function createSession() {
            const sessionName = document.getElementById('newSessionName').value.trim();
            const description = document.getElementById('newSessionDescription').value.trim();
            const playerName = document.getElementById('newSessionPlayerName').value.trim();

            if (!sessionName) {
                alert('Please enter a session name');
                return;
            }

            if (!playerName) {
                alert('Please enter your player name');
                return;
            }
            
            // Sanitize session name for Firebase (remove spaces and invalid characters)
            const sanitizedSessionName = sanitizeSessionName(sessionName);
            
            if (!sanitizedSessionName) {
                alert('Session name contains only invalid characters. Please use letters and numbers.');
                return;
            }

            const sessionRef = database.ref('sessions/' + sanitizedSessionName);
            sessionRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    alert('A session with this name already exists. Please choose a different name.');
                    return;
                }

                sessionRef.set({
                    name: sessionName,  // Store original name for display
                    description: description,
                    created: firebase.database.ServerValue.TIMESTAMP,
                    archived: false,
                    campaign: {
                        name: 'Campaign Name',
                        description: 'Click to add campaign description...',
                        objectives: []
                    },
                    teams: {},
                    actionHistory: {},
                    combatLog: {},
                    initiative: {}
                }).then(() => {
                    // Set values in main interface (use sanitized name for joining)
                    document.getElementById('sessionName').value = sanitizedSessionName;
                    document.getElementById('playerName').value = playerName;
                    
                    closeCreateSessionModal();
                    joinSession();
                });
            });
        }

        function joinSession() {
            const sessionName = document.getElementById('sessionName').value.trim();
            const playerName = document.getElementById('playerName').value.trim();

            if (!sessionName) {
                alert('Please enter a Session Name');
                return;
            }

            if (!playerName) {
                alert('Please enter your player name');
                return;
            }
            
            // Sanitize session name for Firebase lookup
            const sanitizedSessionName = sanitizeSessionName(sessionName);
            
            if (!sanitizedSessionName) {
                alert('Session name contains only invalid characters. Please use letters and numbers.');
                return;
            }

            const sessionRef = database.ref('sessions/' + sanitizedSessionName);
            sessionRef.once('value', (snapshot) => {
                if (!snapshot.exists()) {
                    alert('Session not found. Please create it first or check the name.');
                    return;
                }

                currentSession = sanitizedSessionName;  // Use sanitized name
                const sanitizedPlayerName = playerName.replace(/[.#$[\]\s]/g, '_');
                currentPlayer = sanitizedPlayerName;
                currentPlayerDisplay = playerName;
                
                // Save player name for next time
                localStorage.setItem('lastPlayerName', playerName);

                // Display the original session name (from database)
                const sessionData = snapshot.val();
                document.getElementById('currentSession').textContent = sessionData.name || sanitizedSessionName;
                document.getElementById('currentPlayer').textContent = playerName;
                document.getElementById('gameTabBtn').style.display = 'block';
                document.getElementById('toolsTabBtn').style.display = 'block';
                // Templates tab removed in v12.11
                // document.getElementById('templatesTabBtn').style.display = 'block';
                document.getElementById('gameArea').style.display = 'block';
                
                // Show session info bar and campaign section
                document.getElementById('sessionInfoBar').style.display = 'block';
                document.getElementById('campaignSection').style.display = 'block';
                
                // Load campaign info
                loadCampaignInfo();

                // Load mission and objectives
                loadMissionObjectives();
                
                // Sync turn timer
                syncTimer();

                switchTab('game');

                const archived = snapshot.val().archived || false;
                document.getElementById('archiveButtonText').textContent = archived ? 'Unarchive Session' : 'Archive Session';

                sessionRef.child('teams').on('value', (snapshot) => {
                    renderTeams(snapshot.val() || {});
                });
            });
        }

        async function leaveSession() {
            if (currentSession && currentPlayer) {
                // Check if player has a team in session and in library
                const sessionTeamSnapshot = await database.ref(`sessions/${currentSession}/teams/${currentPlayer.replace(/\s/g, '_')}`).once('value');
                const sessionTeam = sessionTeamSnapshot.val();
                
                if (sessionTeam && sessionTeam.characters) {
                    // Find matching team in library (by name or owner)
                    const teamsSnapshot = await database.ref(`players/${currentPlayer}/teams`).once('value');
                    const teams = teamsSnapshot.val();
                    
                    if (teams) {
                        // Find team with matching owner/name
                        const matchingTeamEntry = Object.entries(teams).find(([id, team]) => 
                            team.owner === currentPlayer && team.faction === sessionTeam.faction
                        );
                        
                        if (matchingTeamEntry) {
                            const [teamId, savedTeam] = matchingTeamEntry;
                            
                            // Ask if they want to update
                            const modelCount = Object.keys(sessionTeam.characters).length;
                            const shouldUpdate = confirm(
                                `🔄 Update Saved Team?\n\n` +
                                `Your team has changed during this session.\n\n` +
                                `Team: ${savedTeam.name}\n` +
                                `Models: ${modelCount}\n\n` +
                                `Update "${savedTeam.name}" in your team library with session changes?\n\n` +
                                `(If you click OK, your CSV exports will include these changes)`
                            );
                            
                            if (shouldUpdate) {
                                // Convert session characters to team models format
                                const characters = Object.values(sessionTeam.characters);
                                const models = characters.map(char => {
                                    // Handle weapons
                                    let weaponsArray = [];
                                    if (Array.isArray(char.weapons)) {
                                        weaponsArray = char.weapons;
                                    } else if (char.weapons && typeof char.weapons === 'object') {
                                        weaponsArray = Object.values(char.weapons);
                                    }
                                    
                                    // Handle inventory
                                    let inventoryArray = [];
                                    if (Array.isArray(char.inventory)) {
                                        inventoryArray = char.inventory;
                                    } else if (char.inventory && typeof char.inventory === 'object') {
                                        inventoryArray = Object.values(char.inventory);
                                    }
                                    
                                    return {
                                        name: char.name,
                                        type: char.role,
                                        role: char.role,
                                        speed: char.speed,
                                        shoot: char.shoot,
                                        fight: char.fight,
                                        nerve: char.nerve,
                                        health: char.maxHealth,
                                        currentHealth: char.currentHealth,
                                        weapons: weaponsArray,
                                        inventory: inventoryArray,
                                        notes: char.notes || '',
                                        points: 15
                                    };
                                });
                                
                                // Update team in library
                                const updatedTeam = {
                                    ...savedTeam,
                                    models: models,
                                    modified: Date.now(),
                                    points: models.length * 15
                                };
                                
                                await database.ref(`players/${currentPlayer}/teams/${teamId}`).set(updatedTeam);
                                console.log('✅ Team updated in library from session');
                            }
                        }
                    }
                }
                
                // Cleanup session listeners
                const sessionRef = database.ref('sessions/' + currentSession + '/teams');
                sessionRef.off();
                const campaignRef = database.ref(`sessions/${currentSession}/campaign`);
                campaignRef.off();
            }

            currentSession = null;
            currentPlayer = null;
            document.getElementById('gameTabBtn').style.display = 'none';
            document.getElementById('toolsTabBtn').style.display = 'none';
            document.getElementById('gameArea').style.display = 'none';
            document.getElementById('sessionInfoBar').style.display = 'none';
            document.getElementById('campaignSection').style.display = 'none';
            document.getElementById('sessionName').value = '';
            document.getElementById('teamsContainer').innerHTML = '';
            
            switchTab('join');
        }
        
        // Campaign Management Functions
        function loadCampaignInfo() {
            if (!currentSession) return;
            
            const campaignRef = database.ref(`sessions/${currentSession}/campaign`);
            campaignRef.on('value', (snapshot) => {
                const campaign = snapshot.val() || {
                    name: 'Campaign Name',
                    description: 'Click to add campaign description...',
                    objectives: []
                };
                
                document.getElementById('campaignNameDisplay').textContent = campaign.name || 'Campaign Name';
                document.getElementById('campaignDescDisplay').textContent = campaign.description || 'Click to add campaign description...';
                
                renderObjectives(campaign.objectives || []);
            });
        }
        
        function editCampaignName() {
            if (!currentSession) return;
            
            const current = document.getElementById('campaignNameDisplay').textContent;
            const newName = prompt('Enter campaign name:', current);
            
            if (newName && newName.trim()) {
                database.ref(`sessions/${currentSession}/campaign/name`).set(newName.trim());
            }
        }
        
        function editCampaignDescription() {
            if (!currentSession) return;
            
            const current = document.getElementById('campaignDescDisplay').textContent;
            const currentText = current === 'Click to add campaign description...' ? '' : current;
            const newDesc = prompt('Enter campaign description:', currentText);
            
            if (newDesc !== null) {
                database.ref(`sessions/${currentSession}/campaign/description`).set(newDesc.trim() || 'Click to add campaign description...');
            }
        }
        
        function addObjective() {
            if (!currentSession) return;
            
            const text = prompt('Enter new objective:');
            if (!text || !text.trim()) return;
            
            const objectivesRef = database.ref(`sessions/${currentSession}/campaign/objectives`);
            objectivesRef.once('value', (snapshot) => {
                const objectives = snapshot.val() || [];
                objectives.push({
                    text: text.trim(),
                    completed: false,
                    id: Date.now()
                });
                objectivesRef.set(objectives);
            });
        }
        
        function toggleObjective(index) {
            if (!currentSession) return;
            
            const objectiveRef = database.ref(`sessions/${currentSession}/campaign/objectives/${index}/completed`);
            objectiveRef.once('value', (snapshot) => {
                objectiveRef.set(!snapshot.val());
            });
        }
        
        function removeObjective(index) {
            if (!currentSession) return;
            if (!confirm('Remove this objective?')) return;
            
            const objectivesRef = database.ref(`sessions/${currentSession}/campaign/objectives`);
            objectivesRef.once('value', (snapshot) => {
                const objectives = snapshot.val() || [];
                objectives.splice(index, 1);
                objectivesRef.set(objectives);
            });
        }
        
        function renderObjectives(objectives) {
            const container = document.getElementById('objectivesList');
            
            if (!objectives || objectives.length === 0) {
                container.innerHTML = '<div style="color: #888; font-size: 13px; padding: 10px; text-align: center;">No objectives yet. Click "+ Add" to create one.</div>';
                return;
            }
            
            const completed = objectives.filter(o => o.completed).length;
            const total = objectives.length;
            
            container.innerHTML = `
                <div style="color: #9CAF88; font-size: 13px; margin-bottom: 10px;">Progress: ${completed}/${total} completed</div>
                ${objectives.map((obj, index) => `
                    <div style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" ${obj.completed ? 'checked' : ''} 
                               onchange="toggleObjective(${index})"
                               style="width: 18px; height: 18px; cursor: pointer;">
                        <span style="flex: 1; color: ${obj.completed ? '#888' : '#fff'}; text-decoration: ${obj.completed ? 'line-through' : 'none'}; font-size: 0.95em;">
                            ${obj.text}
                        </span>
                        <button class="btn btn-danger" style="padding: 2px 8px; font-size: 12px;" onclick="removeObjective(${index})">×</button>
                    </div>
                `).join('')}
            `;
        }
        
        let objectivesCollapsed = false;
        function toggleObjectivesCollapse() {
            objectivesCollapsed = !objectivesCollapsed;
            const list = document.getElementById('objectivesList');
            list.style.display = objectivesCollapsed ? 'none' : 'block';
        }

        function loadAllSessions() {
            const showArchived = document.getElementById('showArchived').checked;
            const sessionsRef = database.ref('sessions');
            
            sessionsRef.once('value', (snapshot) => {
                const sessions = snapshot.val() || {};
                const container = document.getElementById('sessionsList');
                container.innerHTML = '';

                const sessionsList = Object.entries(sessions)
                    .filter(([_, session]) => showArchived || !session.archived)
                    .sort((a, b) => (b[1].created || 0) - (a[1].created || 0));

                if (sessionsList.length === 0) {
                    container.innerHTML = '<div class="empty-state"><h3>No sessions found</h3><p>Create your first session to get started</p></div>';
                    return;
                }

                sessionsList.forEach(([sessionKey, session]) => {
                    const card = document.createElement('div');
                    card.className = 'session-card' + (session.archived ? ' archived' : '');
                    
                    // Use session.name for display (original with spaces), sessionKey for operations (sanitized)
                    const displayName = session.name || sessionKey;
                    const created = session.created ? new Date(session.created).toLocaleDateString() : 'Unknown';
                    const teamCount = session.teams ? Object.keys(session.teams).length : 0;
                    const charCount = session.teams ? Object.values(session.teams).reduce((sum, team) => {
                        return sum + (team.characters ? Object.keys(team.characters).length : 0);
                    }, 0) : 0;

                    card.innerHTML = `
                        <h3>${displayName} ${session.archived ? '<span class="archived-badge">ARCHIVED</span>' : ''}</h3>
                        <div class="session-meta">
                             Created: ${created}<br>
                             ${teamCount} team(s), ${charCount} character(s)<br>
                            ${session.description ? ` ${session.description}` : ''}
                        </div>
                        <div class="session-actions">
                            <button class="btn btn-primary" onclick="joinSessionByName('${sessionKey}')">Join</button>
                            <button class="btn btn-warning" onclick="cloneSessionByName('${sessionKey}')">Clone</button>
                            <button class="btn btn-danger" onclick="deleteSessionByName('${sessionKey}')">Delete</button>
                        </div>
                    `;
                    
                    container.appendChild(card);
                });
            });
        }

        function joinSessionByName(sessionName) {
            const playerName = document.getElementById('playerName').value.trim() || 'Player';
            document.getElementById('sessionName').value = sessionName;
            document.getElementById('playerName').value = playerName;
            joinSession();
        }

        function deleteSessionByName(sessionName) {
            if (confirm(`Are you sure you want to permanently delete session "${sessionName}"? This cannot be undone.`)) {
                database.ref('sessions/' + sessionName).remove().then(() => {
                    loadAllSessions();
                });
            }
        }

        function toggleArchiveSession() {
            if (!currentSession) return;

            const sessionRef = database.ref('sessions/' + currentSession);
            sessionRef.once('value', (snapshot) => {
                const session = snapshot.val();
                const newArchivedState = !session.archived;
                
                sessionRef.update({ archived: newArchivedState }).then(() => {
                    document.getElementById('archiveButtonText').textContent = newArchivedState ? 'Unarchive Session' : 'Archive Session';
                    alert(newArchivedState ? 'Session archived' : 'Session unarchived');
                });
            });
        }

        function showCloneSessionModal() {
            document.getElementById('cloneSessionModal').classList.add('active');
        }

        function closeCloneSessionModal() {
            document.getElementById('cloneSessionModal').classList.remove('active');
        }

        function cloneSession() {
            const newName = document.getElementById('cloneSessionName').value.trim();
            const description = document.getElementById('cloneSessionDescription').value.trim();

            if (!newName) {
                alert('Please enter a name for the cloned session');
                return;
            }

            const sourceRef = database.ref('sessions/' + currentSession);
            const targetRef = database.ref('sessions/' + newName);

            targetRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    alert('A session with this name already exists');
                    return;
                }

                sourceRef.once('value', (snapshot) => {
                    const sourceData = snapshot.val();
                    const clonedData = {
                        name: newName,
                        description: description,
                        created: firebase.database.ServerValue.TIMESTAMP,
                        archived: false,
                        teams: {},
                        actionHistory: {},
                        combatLog: {},
                        initiative: {}
                    };

                    if (sourceData.teams) {
                        Object.entries(sourceData.teams).forEach(([teamId, team]) => {
                            clonedData.teams[teamId] = { ...team };
                            if (team.characters) {
                                Object.entries(team.characters).forEach(([charId, char]) => {
                                    clonedData.teams[teamId].characters[charId] = {
                                        ...char,
                                        currentHealth: char.maxHealth,
                                        status: 'alive',
                                        statusEffects: [],
                                        consumables: char.consumables ? char.consumables.map(c => ({
                                            ...c,
                                            uses: c.maxUses
                                        })) : []
                                    };
                                });
                            }
                        });
                    }

                    targetRef.set(clonedData).then(() => {
                        closeCloneSessionModal();
                        alert(`Session cloned as "${newName}"`);
                        loadAllSessions();
                    });
                });
            });
        }

        function cloneSessionByName(sessionName) {
            document.getElementById('cloneSessionName').value = sessionName + '-copy';
            
            const sourceRef = database.ref('sessions/' + sessionName);
            sourceRef.once('value', (snapshot) => {
                const data = snapshot.val();
                document.getElementById('cloneSessionDescription').value = data.description || '';
                
                const originalSession = currentSession;
                currentSession = sessionName;
                
                showCloneSessionModal();
                
                const oldClone = window.cloneSession;
                window.cloneSession = function() {
                    oldClone();
                    currentSession = originalSession;
                    window.cloneSession = oldClone;
                };
            });
        }

        // Character Management
        function openAddTeamModal() {
            try {
                console.log('Opening Add Model modal...');
                
                // Ensure we're in a session
                if (!currentSession) {
                    alert('Please join a session first!');
                    return;
                }
                
                // Get user's team if it exists
                const myTeamId = currentSession ? Object.keys(sessionTeams || {}).find(id => sessionTeams[id].owner === currentPlayer) : null;
                const myTeam = myTeamId ? sessionTeams[myTeamId] : null;
                const teamFaction = myTeam ? myTeam.faction : null;
                
                // Reset modal
                editingCharacter = null;
                document.getElementById('modalTitle').textContent = 'Add Model';
                document.getElementById('characterForm').reset();
                weaponFields = [];
                consumableFields = [];
                specialActionFields = [];
                renderWeaponFields();
                renderConsumableFields();
                renderSpecialActionFields();
                addWeaponField();
                addConsumableField();
                addSpecialActionField();
                
                // Auto-select faction if team has one
                if (teamFaction) {
                    document.getElementById('presetFactionSelect').value = teamFaction;
                    updateModelPresets();
                    document.getElementById('presetModelGroup').style.display = 'block';
                } else {
                    // Reset preset selectors
                    document.getElementById('presetFactionSelect').value = '';
                    document.getElementById('presetModelGroup').style.display = 'none';
                    document.getElementById('presetModelSelect').innerHTML = '<option value="">-- Select Model --</option>';
                }
                
                // Set random color
                const randomColor = generateRandomColor();
                document.getElementById('charColor').value = randomColor;
                updateColorPreview();
                
                document.getElementById('characterModal').classList.add('active');
                console.log('Modal opened successfully!');
            } catch (error) {
                console.error('Error opening modal:', error);
                alert('Error opening modal: ' + error.message);
            }
        }
        
        function updateColorPreview() {
            const color = document.getElementById('charColor').value;
            document.getElementById('colorPreview').style.background = color;
        }

        function updateModelPresets() {
            const factionSelect = document.getElementById('presetFactionSelect');
            const modelSelect = document.getElementById('presetModelSelect');
            const modelGroup = document.getElementById('presetModelGroup');
            const selectedFaction = factionSelect.value;
            
            if (!selectedFaction) {
                modelGroup.style.display = 'none';
                return;
            }
            
            // Get models for selected faction
            const factionModels = gameData.models.filter(m => m.faction === selectedFaction);
            
            // Populate model dropdown
            modelSelect.innerHTML = '<option value="">-- Select Model --</option>' + 
                factionModels.map(model => 
                    `<option value="${model.name}">${model.name} (${model.points}pts - ${model.type})</option>`
                ).join('');
            
            modelGroup.style.display = 'block';
        }

        function fillFormFromPreset() {
            const factionName = document.getElementById('presetFactionSelect').value;
            const modelName = document.getElementById('presetModelSelect').value;
            
            if (!factionName || !modelName) return;
            
            const model = gameData.models.find(m => m.name === modelName && m.faction === factionName);
            if (!model) return;
            
            // Fill form fields with auto-generated random name based on faction
            let randomName = '';
            if (factionName === 'Arc Rangers') {
                randomName = generateArcRangerName();
            } else if (factionName === 'Space-Wyrm') {
                randomName = generateSpaceWyrmName();
            } else if (factionName === 'Kippin') {
                randomName = generateKippinName();
            } else {
                randomName = generateArcRangerName(); // Default to human-ish names
            }
            
            document.getElementById('charName').value = randomName; // Auto-generated name!
            document.getElementById('charRole').value = model.type;
            document.getElementById('charPortrait').value = model.portrait;
            document.getElementById('charSpeed').value = model.speed;
            document.getElementById('charShoot').value = model.shoot;
            document.getElementById('charFight').value = model.fight;
            document.getElementById('charNerve').value = model.nerve;
            document.getElementById('charHealth').value = model.health;
            
            // Get faction-specific weapons and add first one
            const factionWeapons = gameData.weapons.filter(w => w.faction === factionName);
            if (factionWeapons.length > 0 && weaponFields.length === 1 && !weaponFields[0].name) {
                // Replace the empty weapon field
                const weapon = factionWeapons[0];
                weaponFields[0] = {
                    name: weapon.name,
                    type: weapon.type,
                    attacks: weapon.attacks,
                    power: weapon.power,
                    damage: weapon.damage,
                    effects: weapon.effects || ''
                };
                renderWeaponFields();
            }
            
            // Auto-fill Jump Boost special action for all Arc Rangers
            if (factionName === 'Arc Rangers') {
                // Check if Jump Boost already exists
                const hasJumpBoost = specialActionFields.some(s => s.name && s.name.toLowerCase().includes('jump boost'));
                if (!hasJumpBoost) {
                    // Add Jump Boost if empty field exists
                    const emptyIndex = specialActionFields.findIndex(s => !s.name);
                    if (emptyIndex >= 0) {
                        specialActionFields[emptyIndex] = {
                            name: 'Jump Boost',
                            description: 'Uses jet pack to boost 6 inches. Ignores terrain.',
                            effects: 'Dangerous terrain test required',
                            maxUses: 1,
                            type: 'Movement'
                        };
                    } else {
                        // Add new field
                        specialActionFields.push({
                            name: 'Jump Boost',
                            description: 'Uses jet pack to boost 6 inches. Ignores terrain.',
                            effects: 'Dangerous terrain test required',
                            maxUses: 1,
                            type: 'Movement'
                        });
                    }
                    renderSpecialActionFields();
                }
            }
            
            // Scroll to top of form
            document.querySelector('.modal-content').scrollTop = 0;
        }

        function closeCharacterModal() {
            document.getElementById('characterModal').classList.remove('active');
            editingCharacter = null;
            // Don't reset editingTeamId here - it's reset in closeTeamEditing
        }

        function addWeaponField(name = '', type = 'Ranged', attacks = '', power = '', damage = '') {
            weaponFields.push({ name, type, attacks, power, damage });
            renderWeaponFields();
        }

        function removeWeaponField(index) {
            weaponFields.splice(index, 1);
            renderWeaponFields();
        }

        function renderWeaponFields() {
            const container = document.getElementById('weaponsFormList');
            container.innerHTML = weaponFields.map((weapon, index) => `
                <div class="weapon-entry">
                    <select onchange="if(this.value) { const preset = presetWeapons.find(w => w.name === this.value); Object.assign(weaponFields[${index}], preset); renderWeaponFields(); }">
                        <option value="">-- Quick Select --</option>
                        ${presetWeapons.map(w => `<option value="${w.name}">${w.name} (${w.type}, A${w.attacks} P${w.power} D${w.damage})</option>`).join('')}
                    </select>
                    <input type="text" placeholder="Weapon name" value="${weapon.name}" onchange="weaponFields[${index}].name = this.value" style="min-width: 120px;" />
                    <select onchange="weaponFields[${index}].type = this.value">
                        <option value="Melee" ${weapon.type === 'Melee' ? 'selected' : ''}>Melee</option>
                        <option value="Ranged" ${weapon.type === 'Ranged' ? 'selected' : ''}>Ranged</option>
                    </select>
                    <input type="number" placeholder="Attacks" value="${weapon.attacks}" onchange="weaponFields[${index}].attacks = this.value" style="width: 80px;" />
                    <input type="number" placeholder="Power" value="${weapon.power}" onchange="weaponFields[${index}].power = this.value" style="width: 80px;" />
                    <input type="number" placeholder="Damage" value="${weapon.damage}" onchange="weaponFields[${index}].damage = this.value" style="width: 80px;" />
                    <button type="button" class="btn btn-danger" onclick="removeWeaponField(${index})">Remove</button>
                </div>
            `).join('');
        }

        function addConsumableField(name = '', effect = 'heal', amount = '', maxUses = '', targetType = 'self') {
            consumableFields.push({ name, effect, amount, maxUses, targetType });
            renderConsumableFields();
        }

        function removeConsumableField(index) {
            consumableFields.splice(index, 1);
            renderConsumableFields();
        }

        function renderConsumableFields() {
            const container = document.getElementById('consumablesFormList');
            container.innerHTML = consumableFields.map((consumable, index) => `
                <div class="consumable-entry">
                    <select onchange="if(this.value) { const preset = presetConsumables.find(c => c.name === this.value); Object.assign(consumableFields[${index}], preset); renderConsumableFields(); }" style="min-width: 150px;">
                        <option value="">-- Quick Select --</option>
                        ${presetConsumables.map(c => {
                            const effectIcon = c.effect === 'heal' ? 'heal' : c.effect === 'damage' ? 'damage' : 'Initiative';
                            return `<option value="${c.name}">${effectIcon} ${c.name} (${c.effect} ${c.amount})</option>`;
                        }).join('')}
                    </select>
                    <input type="text" placeholder="Item name" value="${consumable.name}" onchange="consumableFields[${index}].name = this.value" style="min-width: 120px;" />
                    <select onchange="consumableFields[${index}].effect = this.value">
                        <option value="heal" ${consumable.effect === 'heal' ? 'selected' : ''}>Heal</option>
                        <option value="buff" ${consumable.effect === 'buff' ? 'selected' : ''}>Buff</option>
                        <option value="damage" ${consumable.effect === 'damage' ? 'selected' : ''}>Damage</option>
                    </select>
                    <input type="number" placeholder="Amount" value="${consumable.amount}" onchange="consumableFields[${index}].amount = this.value" style="width: 80px;" />
                    <input type="number" placeholder="Uses" value="${consumable.maxUses}" onchange="consumableFields[${index}].maxUses = this.value" style="width: 70px;" />
                    <select onchange="consumableFields[${index}].targetType = this.value">
                        <option value="self" ${consumable.targetType === 'self' ? 'selected' : ''}>Self</option>
                        <option value="other" ${consumable.targetType === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                    <button type="button" class="btn btn-danger" onclick="removeConsumableField(${index})">Remove</button>
                </div>
            `).join('');
        }

        // Special Action Field Management
        function addSpecialActionField(name = '', description = '', effects = '', maxUses = 1) {
            specialActionFields.push({ name, description, effects, maxUses, uses: maxUses });
            renderSpecialActionFields();
        }

        function removeSpecialActionField(index) {
            specialActionFields.splice(index, 1);
            renderSpecialActionFields();
        }

        function renderSpecialActionFields() {
            const container = document.getElementById('specialActionsFormList');
            if (!container) return; // In case the element doesn't exist yet
            
            // Get faction-specific special actions
            let availableActions = [];
            if (currentSession && currentPlayer) {
                const teamRef = database.ref(`sessions/${currentSession}/teams/${currentPlayer.replace(/\s/g, '_')}`);
                teamRef.once('value', (snapshot) => {
                    const team = snapshot.val();
                    if (team && team.faction) {
                        availableActions = gameData.specialActions.filter(a => a.faction === team.faction);
                    }
                });
            }
            
            const presetDropdown = availableActions.length > 0 ? `
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(219, 143, 0, 0.1); border-radius: 5px;">
                    <label style="color: #db8f00; margin-bottom: 5px; display: block;">Add Preset Action:</label>
                    <select id="presetActionSelect" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid #db8f00; color: white; border-radius: 5px;">
                        <option value="">-- Select Preset --</option>
                        ${availableActions.map(action => `
                            <option value="${action.name}">${action.name} (${action.maxUses} uses)</option>
                        `).join('')}
                    </select>
                    <button type="button" class="btn btn-success" onclick="addPresetSpecialAction()" style="margin-top: 10px; width: 100%;">Add Selected Preset</button>
                </div>
            ` : '';
            
            container.innerHTML = presetDropdown + specialActionFields.map((action, index) => `
                <div class="consumable-entry" style="flex-wrap: wrap;">
                    <input type="text" placeholder="Action name" value="${action.name}" onchange="specialActionFields[${index}].name = this.value" style="min-width: 150px;" />
                    <input type="text" placeholder="Description" value="${action.description}" onchange="specialActionFields[${index}].description = this.value" style="min-width: 200px; flex: 1;" />
                    <input type="text" placeholder="Effects (e.g., Dangerous)" value="${action.effects}" onchange="specialActionFields[${index}].effects = this.value" style="min-width: 120px;" />
                    <input type="number" placeholder="Max Uses" value="${action.maxUses}" onchange="specialActionFields[${index}].maxUses = this.value; specialActionFields[${index}].uses = this.value;" style="width: 80px;" min="1" />
                    <button type="button" class="btn btn-danger" onclick="removeSpecialActionField(${index})">Remove</button>
                </div>
            `).join('');
        }
        
        function addPresetSpecialAction() {
            const select = document.getElementById('presetActionSelect');
            const actionName = select.value;
            if (!actionName) {
                alert('Please select a preset action');
                return;
            }
            
            const preset = gameData.specialActions.find(a => a.name === actionName);
            if (preset) {
                addSpecialActionField(preset.name, preset.description, preset.effects, preset.maxUses);
                select.value = ''; // Reset dropdown
            }
        }

        function openEditModal(teamId, charId, character) {
            editingCharacter = { teamId, charId };
            document.getElementById('modalTitle').textContent = 'Edit Character';
            
            // If character not provided, fetch it
            if (!character) {
                database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`).once('value', (snapshot) => {
                    const char = snapshot.val();
                    if (char) {
                        populateEditForm(char);
                    }
                });
            } else {
                populateEditForm(character);
            }
            
            document.getElementById('characterModal').classList.add('active');
        }
        
        function populateEditForm(character) {
            document.getElementById('charName').value = character.name || '';
            document.getElementById('charRole').value = character.role || '';
            document.getElementById('charPortrait').value = character.portrait || '';
            document.getElementById('charSpeed').value = character.speed || '';
            document.getElementById('charShoot').value = character.shoot || '';
            document.getElementById('charFight').value = character.fight || '';
            document.getElementById('charNerve').value = character.nerve || '';
            document.getElementById('charHealth').value = character.maxHealth || 15;
            document.getElementById('charColor').value = character.color || generateRandomColor();
            updateColorPreview();
            document.getElementById('charInventory').value = character.inventory ? character.inventory.join(', ') : '';
            document.getElementById('charNotes').value = character.notes || '';

            weaponFields = character.weapons ? character.weapons.map(w => ({...w})) : [];
            renderWeaponFields();
            if (weaponFields.length === 0) addWeaponField();

            consumableFields = character.consumables ? character.consumables.map(c => ({
                name: c.name,
                effect: c.effect,
                amount: c.amount,
                maxUses: c.maxUses,
                targetType: c.targetType
            })) : [];
            renderConsumableFields();
            if (consumableFields.length === 0) addConsumableField();
            
            // Load special actions if they exist
            specialActionFields = character.specialActions ? character.specialActions.map(a => ({...a})) : [];
            renderSpecialActionFields();
            if (specialActionFields.length === 0) addSpecialActionField();
        }

        document.getElementById('characterForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Check if we're editing a team (not a session)
            if (editingTeamId) {
                // Team library editing mode
                const model = {
                    name: document.getElementById('charName').value.trim(),
                    role: document.getElementById('charRole').value.trim(),
                    type: document.getElementById('charRole').value.trim(),
                    speed: document.getElementById('charSpeed').value.trim(),
                    shoot: document.getElementById('charShoot').value.trim(),
                    fight: document.getElementById('charFight').value.trim(),
                    nerve: document.getElementById('charNerve').value.trim(),
                    health: parseInt(document.getElementById('charHealth').value),
                    currentHealth: parseInt(document.getElementById('charHealth').value),
                    weapons: weaponFields.filter(w => w.name && w.attacks && w.power && w.damage),
                    inventory: document.getElementById('charInventory').value.split(',').map(i => i.trim()).filter(i => i),
                    notes: document.getElementById('charNotes').value.trim(),
                    points: 15
                };
                
                database.ref(`players/${currentPlayer}/teams/${editingTeamId}`).once('value', snapshot => {
                    const team = snapshot.val();
                    if (team) {
                        if (editingCharacter && editingCharacter.modelIndex !== undefined) {
                            // Editing existing model
                            team.models[editingCharacter.modelIndex] = model;
                        } else {
                            // Adding new model
                            team.models.push(model);
                        }
                        team.points = team.models.length * 15;
                        team.modified = Date.now();
                        
                        database.ref(`players/${currentPlayer}/teams/${editingTeamId}`).set(team).then(() => {
                            closeCharacterModal();
                            displayTeamEditing(editingTeamId, team);
                        });
                    }
                });
                
                return; // Exit early - team editing complete
            }
            
            // Session editing mode continues below
            const character = {
                name: document.getElementById('charName').value.trim(),
                role: document.getElementById('charRole').value.trim(),
                portrait: document.getElementById('charPortrait').value.trim(),
                speed: document.getElementById('charSpeed').value.trim(),
                shoot: document.getElementById('charShoot').value.trim(),
                fight: document.getElementById('charFight').value.trim(),
                nerve: document.getElementById('charNerve').value.trim(),
                maxHealth: parseInt(document.getElementById('charHealth').value),
                currentHealth: parseInt(document.getElementById('charHealth').value),
                color: document.getElementById('charColor').value,
                portraitColor: document.getElementById('charColor').value, // Use same color for portrait background
                weapons: weaponFields.filter(w => w.name && w.attacks && w.power && w.damage),
                consumables: consumableFields.filter(c => c.name && c.amount && c.maxUses).map(c => ({
                    name: c.name,
                    effect: c.effect,
                    amount: parseInt(c.amount),
                    maxUses: parseInt(c.maxUses),
                    uses: parseInt(c.maxUses),
                    targetType: c.targetType
                })),
                inventory: document.getElementById('charInventory').value.split(',').map(i => i.trim()).filter(i => i),
                notes: document.getElementById('charNotes').value.trim(),
                status: 'alive',
                statusEffects: [],
                turnTaken: false,
                specialActions: specialActionFields.filter(a => a.name).map(a => ({
                    name: a.name,
                    description: a.description || '',
                    effects: a.effects || '',
                    maxUses: parseInt(a.maxUses) || 1,
                    uses: parseInt(a.maxUses) || 1
                })),
                owner: currentPlayer
            };
            
            // Auto-add Jump Boost for Arc Rangers if not already present
            const checkTeamRef = database.ref(`sessions/${currentSession}/teams/${currentPlayer.replace(/\s/g, '_')}`);
            checkTeamRef.once('value', (teamSnapshot) => {
                const team = teamSnapshot.val();
                if (team && team.faction === 'Arc Rangers') {
                    const hasJumpBoost = character.specialActions.some(a => a.name === 'Jump Boost');
                    if (!hasJumpBoost) {
                        character.specialActions.unshift({
                            name: 'Jump Boost',
                            description: 'Uses jet pack to boost 6 inches. Ignores terrain.',
                            effects: 'Dangerous terrain test required',
                            maxUses: 1,
                            uses: 1
                        });
                    }
                }
                
                // Now save the character
                if (editingCharacter) {
                const charRef = database.ref(`sessions/${currentSession}/teams/${editingCharacter.teamId}/characters/${editingCharacter.charId}`);
                charRef.once('value', (snapshot) => {
                    const existing = snapshot.val();
                    character.currentHealth = existing.currentHealth;
                    character.status = existing.status;
                    character.statusEffects = existing.statusEffects || [];
                    if (existing.consumables && character.consumables) {
                        character.consumables = character.consumables.map((newCons, idx) => {
                            const existingCons = existing.consumables.find(ec => ec.name === newCons.name);
                            if (existingCons) {
                                return { ...newCons, uses: existingCons.uses };
                            }
                            return newCons;
                        });
                    }
                    charRef.update(character);
                });
            } else {
                const teamId = currentPlayer.replace(/\s/g, '_');
                const charId = 'char_' + Date.now();
                const teamRef = database.ref(`sessions/${currentSession}/teams/${teamId}`);
                
                teamRef.once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        teamRef.child('characters/' + charId).set(character);
                    } else {
                        // Creating new team - get faction from modal
                        const selectedFaction = document.getElementById('presetFactionSelect').value;
                        
                        if (!selectedFaction) {
                            alert('Please select a faction first!\n\nChoose a faction from the dropdown in the Add Model form.');
                            return;
                        }
                        
                        teamRef.set({
                            owner: currentPlayer,
                            faction: selectedFaction,
                            characters: {
                                [charId]: character
                            }
                        });
                    }
                });
            }
            
            closeCharacterModal();
            }); // End teamSnapshot callback
        });

        function updateHealth(teamId, charId, change) {
            const charRef = database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`);
            charRef.once('value', (snapshot) => {
                const char = snapshot.val();
                const newHealth = Math.max(0, Math.min(char.maxHealth, char.currentHealth + change));
                charRef.update({ 
                    currentHealth: newHealth,
                    status: newHealth > 0 ? 'alive' : 'dead'
                });
                
                // Add flash animation
                const cardElement = document.getElementById(`model-card-${teamId}-${charId}`);
                if (cardElement) {
                    const flashClass = change < 0 ? 'damage-flash' : 'heal-flash';
                    cardElement.classList.add(flashClass);
                    setTimeout(() => {
                        cardElement.classList.remove(flashClass);
                    }, 2000);
                }
                
                const action = change > 0 ? 'healed' : 'damaged';
                logAction(`${char.name} ${action} for ${Math.abs(change)} HP`, {
                    type: 'healthChange',
                    teamId: teamId,
                    charId: charId,
                    change: change
                });
                
                logToCombat(`${change > 0 ? 'heal' : ''} ${char.name} ${action} ${Math.abs(change)} HP (${newHealth}/${char.maxHealth})`);
            });
        }

        function useConsumable(teamId, charId, consumableIndex, targetTeamId = null, targetCharId = null) {
            const charRef = database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`);
            charRef.once('value', (snapshot) => {
                const char = snapshot.val();
                const consumable = char.consumables[consumableIndex];
                
                if (consumable.uses <= 0) {
                    alert('No uses remaining!');
                    return;
                }
                
                let actualTargetTeamId = targetTeamId || teamId;
                let actualTargetCharId = targetCharId || charId;
                
                if (consumable.targetType === 'other' && !targetTeamId) {
                    alert('Please select a target');
                    return;
                }
                
                const targetRef = database.ref(`sessions/${currentSession}/teams/${actualTargetTeamId}/characters/${actualTargetCharId}`);
                targetRef.once('value', (targetSnapshot) => {
                    const targetChar = targetSnapshot.val();
                    let healthChange = 0;
                    
                    if (consumable.effect === 'heal') {
                        healthChange = consumable.amount;
                    } else if (consumable.effect === 'damage') {
                        healthChange = -consumable.amount;
                    }
                    
                    const newHealth = Math.max(0, Math.min(targetChar.maxHealth, targetChar.currentHealth + healthChange));
                    targetRef.update({
                        currentHealth: newHealth,
                        status: newHealth > 0 ? 'alive' : 'dead'
                    });
                    
                    const updatedConsumables = [...char.consumables];
                    updatedConsumables[consumableIndex].uses -= 1;
                    charRef.update({ consumables: updatedConsumables });
                    
                    const effectDesc = consumable.effect === 'heal' ? 'healed' : 'damaged';
                    logAction(`${char.name} used ${consumable.name} and ${effectDesc} ${targetChar.name} for ${Math.abs(healthChange)} HP`, {
                        type: 'consumableUse',
                        teamId: teamId,
                        charId: charId,
                        consumableIndex: consumableIndex,
                        targetTeamId: actualTargetTeamId,
                        targetCharId: actualTargetCharId,
                        healthChange: healthChange
                    });
                    
                    logToCombat(` ${char.name} used ${consumable.name} on ${targetChar.name} (${effectDesc} ${Math.abs(healthChange)} HP)`);
                });
            });
        }

        function attackCharacter(attackerTeamId, attackerCharId) {
            const targetSelect = document.getElementById(`target-${attackerTeamId}-${attackerCharId}`);
            const damageInput = document.getElementById(`damage-${attackerTeamId}-${attackerCharId}`);
            
            const targetValue = targetSelect.value;
            const damage = parseInt(damageInput.value) || 0;

            if (!targetValue || damage <= 0) {
                alert('Please select a target and enter damage amount');
                return;
            }

            const [targetTeamId, targetCharId] = targetValue.split(':');
            
            const attackerRef = database.ref(`sessions/${currentSession}/teams/${attackerTeamId}/characters/${attackerCharId}`);
            const targetRef = database.ref(`sessions/${currentSession}/teams/${targetTeamId}/characters/${targetCharId}`);
            
            Promise.all([
                attackerRef.once('value'),
                targetRef.once('value')
            ]).then(([attackerSnapshot, targetSnapshot]) => {
                const attacker = attackerSnapshot.val();
                const target = targetSnapshot.val();
                
                updateHealth(targetTeamId, targetCharId, -damage);
                
                logAction(`${attacker.name} attacked ${target.name} for ${damage} damage`, {
                    type: 'healthChange',
                    teamId: targetTeamId,
                    charId: targetCharId,
                    change: -damage
                });
                
                logToCombat(`Attack ${attacker.name} → ${target.name}: ${damage} damage`);
            });
            
            targetSelect.value = '';
            damageInput.value = '';
        }

        function toggleTurnStatus(teamId, charId) {
            const charRef = database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`);
            charRef.once('value', (snapshot) => {
                const char = snapshot.val();
                charRef.update({ turnTaken: !char.turnTaken });
                logToCombat(`${char.name} ${!char.turnTaken ? 'took their turn' : 'turn reset'}`);
            });
        }

        function resetTeamTurns(teamId) {
            const teamRef = database.ref(`sessions/${currentSession}/teams/${teamId}/characters`);
            teamRef.once('value', (snapshot) => {
                const characters = snapshot.val() || {};
                Object.keys(characters).forEach(charId => {
                    teamRef.child(charId).update({ turnTaken: false });
                });
                logToCombat(`Reset All turns reset for team`);
            });
        }

        function editPortrait(teamId, charId) {
            const charRef = database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`);
            charRef.once('value', (snapshot) => {
                const char = snapshot.val();
                const newUrl = prompt('Enter new portrait URL:', char.portrait || '');
                if (newUrl !== null) {
                    charRef.update({ portrait: newUrl });
                }
            });
        }

        function toggleStatus(teamId, charId) {
            const charRef = database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`);
            charRef.once('value', (snapshot) => {
                const char = snapshot.val();
                const newStatus = char.status === 'alive' ? 'dead' : 'alive';
                charRef.update({ status: newStatus });
                
                logToCombat(`${newStatus === 'dead' ? '' : 'heal'} ${char.name} is now ${newStatus}`);
            });
        }

        function deleteCharacter(teamId, charId) {
            if (confirm('Are you sure you want to delete this character?')) {
                database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`).remove();
            }
        }

        function deleteTeam(teamId) {
            if (confirm('Are you sure you want to delete this entire team?')) {
                database.ref(`sessions/${currentSession}/teams/${teamId}`).remove();
            }
        }

        function toggleCharacterExpand(teamId, charId) {
            const detailsEl = document.getElementById(`details-${teamId}-${charId}`);
            const toggleEl = document.getElementById(`toggle-${teamId}-${charId}`);
            
            if (detailsEl.classList.contains('hidden')) {
                detailsEl.classList.remove('hidden');
                toggleEl.textContent = ' Show Less';
            } else {
                detailsEl.classList.add('hidden');
                toggleEl.textContent = ' Show More';
            }
        }
        
        // Session teams cache for faction checking
        let sessionTeams = {};
        
        // Set faction for current player's team
        function setMyTeamFaction(factionName) {
            if (!currentSession || !currentPlayer) {
                alert('Please join a session first!');
                return;
            }
            
            if (!factionName) return;
            
            // Check if player already has a team
            const teamId = Object.keys(sessionTeams).find(id => sessionTeams[id].owner === currentPlayer);
            
            if (teamId) {
                // Update existing team's faction
                database.ref(`sessions/${currentSession}/teams/${teamId}/faction`).set(factionName);
            } else {
                // Create new team with this faction
                const newTeamId = 'team_' + Date.now();
                database.ref(`sessions/${currentSession}/teams/${newTeamId}`).set({
                    owner: currentPlayer,
                    faction: factionName,
                    characters: {}
                });
            }
            
            // Give feedback
            const faction = gameData.factions.find(f => f.name === factionName);
            if (faction) {
                alert(`Faction set to ${factionName}! Now you can add models from this faction.`);
            }
        }

        function renderTeams(teams) {
            // Cache teams for faction checking
            sessionTeams = teams;
            
            const container = document.getElementById('teamsContainer');
            const summaryContainer = document.getElementById('teamsSummary');
            const summaryContent = document.getElementById('teamsSummaryContent');
            
            if (!teams || Object.keys(teams).length === 0) {
                container.innerHTML = '<div class="empty-state"><h3>No teams yet</h3><p>Click "Add Model" to create your first character</p></div>';
                summaryContainer.style.display = 'none';
                return;
            }
            
            // Show and render team summary
            summaryContainer.style.display = 'block';
            summaryContent.innerHTML = Object.entries(teams).map(([teamId, team]) => {
                const characters = team.characters ? Object.values(team.characters).filter(c => c.status === 'alive') : [];
                const healthStats = {
                    healthy: 0,  // >70%
                    damaged: 0,  // 40-70%
                    critical: 0, // 10-40%
                    dead: 0      // 0-10% or dead
                };
                
                characters.forEach(char => {
                    const healthPercent = (char.currentHealth / char.maxHealth) * 100;
                    if (healthPercent > 70) healthStats.healthy++;
                    else if (healthPercent > 40) healthStats.damaged++;
                    else if (healthPercent > 10) healthStats.critical++;
                    else healthStats.dead++;
                });
                
                const totalModels = characters.length;
                
                return `
                    <div style="background: rgba(0, 0, 0, 0.3); padding: 6px 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid ${team.faction ? (gameData.factions.find(f => f.name === team.faction)?.primaryColor || '#db8f00') : '#db8f00'};">
                        <div>
                            <div style="font-weight: 600; color: white; font-size: 0.95em;">${team.owner}'s Team</div>
                            <div style="color: #9CAF88; font-size: 12px;">${team.faction || 'Choose Faction'} • ${totalModels} model${totalModels !== 1 ? 's' : ''}</div>
                        </div>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            ${Array(healthStats.healthy).fill('<span style="color: #4CAF50; font-size: 13px;">●</span>').join('')}
                            ${Array(healthStats.damaged).fill('<span style="color: #FFA500; font-size: 13px;">●</span>').join('')}
                            ${Array(healthStats.critical).fill('<span style="color: #F44336; font-size: 13px;">●</span>').join('')}
                            ${Array(healthStats.dead).fill('<span style="color: #666; font-size: 13px;">●</span>').join('')}
                            ${totalModels === 0 ? '<span style="color: #666; font-size: 12px;">No models</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('');

            const allCharacters = [];
            Object.entries(teams).forEach(([teamId, team]) => {
                if (team.characters) {
                    Object.entries(team.characters).forEach(([charId, char]) => {
                        if (char.status === 'alive') {
                            allCharacters.push({
                                teamId,
                                charId,
                                name: char.name,
                                owner: team.owner
                            });
                        }
                    });
                }
            });

            container.innerHTML = '';
            
            // Add view toggle buttons at top (once)
            const controlsDiv = document.createElement('div');
            controlsDiv.style.cssText = 'background: rgba(219, 143, 0, 0.1); padding: 10px; border-radius: 8px; margin-bottom: 15px; display: flex; gap: 10px; align-items: center; justify-content: space-between; border: 1px solid #db8f00; flex-wrap: wrap;';
            controlsDiv.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="color: #db8f00; font-weight: 600; margin-right: 10px;">View Mode:</span>
                    <button class="btn ${currentView === 'compact' ? 'btn-primary' : 'btn-secondary'}" onclick="currentView='compact'; renderTeams(${JSON.stringify(teams).replace(/"/g, '&quot;')})">Compact</button>
                    <button class="btn ${currentView === 'tiny' ? 'btn-primary' : 'btn-secondary'}" onclick="currentView='tiny'; renderTeams(${JSON.stringify(teams).replace(/"/g, '&quot;')})">Tiny</button>
                </div>
            `;
            container.appendChild(controlsDiv);
            
            // Add "My Team" section at top
            const myTeamSection = document.createElement('div');
            myTeamSection.style.cssText = 'background: rgba(156, 175, 136, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #9CAF88;';
            const playerName = currentPlayer || localStorage.getItem('lastPlayerName') || 'Your';
            const myTeamId = Object.keys(teams).find(id => teams[id].owner === currentPlayer);
            const myTeam = myTeamId ? teams[myTeamId] : null;
            
            myTeamSection.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                    <div style="flex: 1; min-width: 200px;">
                        <h3 style="color: #9CAF88; margin: 0 0 8px 0;">My Team</h3>
                        ${myTeam ? `
                            <div style="color: #ccc; font-size: 0.95em;">
                                ${myTeam.faction || 'No Faction'} • ${myTeam.characters ? Object.keys(myTeam.characters).length : 0} models
                            </div>
                        ` : `
                            <div style="color: #888; font-size: 13px; margin-bottom: 8px;">No team loaded - Choose faction to start</div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <label style="color: #9CAF88; font-size: 13px;">Faction:</label>
                                <select id="myTeamFactionSelect" onchange="setMyTeamFaction(this.value)" style="padding: 6px 10px; background: rgba(0,0,0,0.5); border: 1px solid #9CAF88; color: white; border-radius: 5px; font-size: 13px;">
                                    <option value="">-- Choose Faction --</option>
                                    ${gameData.factions.map(f => `<option value="${f.name}">${f.name}</option>`).join('')}
                                </select>
                            </div>
                        `}
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-success" onclick="openAddTeamModal()" style="font-size: 13px; padding: 10px 15px;">+ Add Model</button>
                        <button class="btn btn-primary" onclick="showLoadTeamModal()" style="font-size: 13px; padding: 10px 15px;">Load Saved Team</button>
                        <button class="btn btn-secondary" onclick="returnToLanding(); showTeamBuilder();" style="font-size: 13px; padding: 10px 15px;">Build New Team</button>
                    </div>
                </div>
            `;
            container.appendChild(myTeamSection);

            // Sort teams: current player's team first, then others
            const sortedTeams = Object.entries(teams).sort(([idA, teamA], [idB, teamB]) => {
                if (teamA.owner === currentPlayer) return -1;
                if (teamB.owner === currentPlayer) return 1;
                return 0;
            });

            sortedTeams.forEach(([teamId, team]) => {
                const teamDiv = document.createElement('div');
                teamDiv.className = 'team';

                let teamHTML = `
                    <div class="team-header">
                        <div>
                            <h2>${team.owner}'s Team</h2>
                            ${team.faction ? `<div style="color: #9CAF88; font-size: 13px; margin-top: 5px;">Faction: ${team.faction}</div>` : ''}
                        </div>
                        <div class="team-controls">
                            <button class="btn btn-warning" onclick="resetTeamTurns('${teamId}')">Reset All Turns</button>
                            ${team.owner === currentPlayer ? `
                                <button class="btn btn-success" onclick="openAddTeamModal()">+ Add Model</button>
                                <button class="btn btn-danger" onclick="deleteTeam('${teamId}')">Delete Team</button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="characters-grid ${currentView === 'tiny' ? 'tiny' : currentView === 'compact' ? 'compact' : ''}">
                `;

                if (team.characters) {
                    Object.entries(team.characters).forEach(([charId, char]) => {
                        const healthPercent = (char.currentHealth / char.maxHealth) * 100;
                        const healthColor = healthPercent > 50 ? '#48bb78' : healthPercent > 25 ? '#f6ad55' : '#f56565';

                        const targetOptions = allCharacters
                            .filter(target => !(target.teamId === teamId && target.charId === charId))
                            .map(target => `<option value="${target.teamId}:${target.charId}">${target.owner} - ${target.name}</option>`)
                            .join('');

// ULTRA-COMPACT VIEW
if (currentView === 'tiny') {
    teamHTML += `
        <div class="model-card tiny ${char.status === 'dead' ? 'dead' : ''}" id="model-card-${teamId}-${charId}">
            ${char.portrait ? `
                <img src="${char.portrait}" 
                     alt="${char.name}" 
                     class="model-portrait-new"
                     style="border: 3px solid ${char.color || '#db8f00'};"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="model-portrait-new" style="display: none; background: ${char.portraitColor || char.color || '#db8f00'}; border: 3px solid ${char.color || '#db8f00'}; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; color: white;">${char.name[0]}</div>
            ` : `
                <div class="model-portrait-new" style="background: ${char.portraitColor || char.color || '#db8f00'}; border: 3px solid ${char.color || '#db8f00'}; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; color: white;">${char.name[0]}</div>
            `}
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 3px 0; gap: 3px;">
                <span class="status-indicator status-${char.status}" style="font-size: 0.6em; padding: 2px 4px; flex: 1; text-align: center;">${char.status}</span>
                <button class="btn ${char.turnTaken ? 'btn-secondary' : 'btn-primary'}" style="padding: 2px 6px; font-size: 0.6em; flex: 1;" onclick="toggleTurnStatus('${teamId}', '${charId}')">
                    ${char.turnTaken ? 'Done' : 'Ready'}
                </button>
            </div>
            <div class="model-name-new" title="${char.name}">${char.name}</div>
            <div class="ultra-hp">${char.currentHealth}/${char.maxHealth}</div>
        </div>
    `;
} else {
// NORMAL/COMPACT VIEW
teamHTML += `
    <div class="model-card ${char.status === 'dead' ? 'dead' : ''} ${currentView === 'compact' ? 'compact' : ''}" id="model-card-${teamId}-${charId}">
        
        <!-- Status and Ready/Done at Top -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 10px;">
            <span class="status-indicator status-${char.status}" style="flex: 0 0 auto;">${char.status}</span>
            <button class="btn ${char.turnTaken ? 'btn-secondary' : 'btn-primary'}" style="flex: 0 0 auto; padding: 4px 12px; font-size: 12px;" onclick="toggleTurnStatus('${teamId}', '${charId}')">
                ${char.turnTaken ? 'Done' : 'Ready'}
            </button>
        </div>
        
        <!-- SECTION 1: Header - Portrait, Name, Stats, Effects -->
        <div class="model-section-1">
            <div class="model-header-top">
                ${char.portrait ? `
                    <img src="${char.portrait}" 
                         alt="${char.name}" 
                         class="model-portrait-new"
                         style="border: 4px solid ${char.color || '#db8f00'};"
                         onclick="editPortrait('${teamId}', '${charId}')"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                         title="Click to change portrait">
                    <div class="model-portrait-new" style="display: none; background: ${char.portraitColor || char.color || '#db8f00'}; border: 4px solid ${char.color || '#db8f00'}; align-items: center; justify-content: center; font-size: 48px; font-weight: 600; color: white; cursor: pointer;" onclick="editPortrait('${teamId}', '${charId}')" title="Click to change portrait">${char.name[0]}</div>
                ` : `
                    <div class="model-portrait-new" style="background: ${char.portraitColor || char.color || '#db8f00'}; border: 4px solid ${char.color || '#db8f00'}; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 600; color: white; cursor: pointer;" onclick="editPortrait('${teamId}', '${charId}')" title="Click to change color">${char.name[0]}</div>
                `}
                <div class="model-header-info">
                    <div class="model-name-row">
                        <h3 class="model-name-new">${char.name}</h3>
                    </div>
                    <div class="model-role">${char.role || 'Operative'}</div>
                    
                    <!-- Health Controls -->
                    <div style="display: flex; align-items: center; gap: 5px; margin-top: 8px;">
                        <button class="health-btn btn-danger" style="width: 30px; height: 30px; font-size: 14px;" onclick="updateHealth('${teamId}', '${charId}', -1)">-</button>
                        <div style="flex: 1; text-align: center; font-weight: 600; color: ${healthColor}; font-size: 13px;">
                            ${char.currentHealth}/${char.maxHealth} HP
                        </div>
                        <button class="health-btn btn-success" style="width: 30px; height: 30px; font-size: 14px;" onclick="updateHealth('${teamId}', '${charId}', 1)">+</button>
                    </div>
                </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="model-stats-grid">
                ${char.speed ? `
                    <div class="model-stat-box">
                        <div class="model-stat-label">Speed</div>
                        <div class="model-stat-value">${char.speed}</div>
                    </div>
                ` : ''}
                ${char.shoot ? `
                    <div class="model-stat-box">
                        <div class="model-stat-label">Shoot</div>
                        <div class="model-stat-value">${char.shoot}</div>
                    </div>
                ` : ''}
                ${char.fight ? `
                    <div class="model-stat-box">
                        <div class="model-stat-label">Fight</div>
                        <div class="model-stat-value">${char.fight}</div>
                    </div>
                ` : ''}
                ${char.nerve ? `
                    <div class="model-stat-box">
                        <div class="model-stat-label">Nerve</div>
                        <div class="model-stat-value">${char.nerve}</div>
                    </div>
                ` : ''}
                <div class="model-stat-box">
                    <div class="model-stat-label">Health</div>
                    <div class="model-stat-value">${char.maxHealth}</div>
                </div>
            </div>
            
            <!-- Effects Field -->
            <div class="model-effects-field">
                <div class="model-effects-label">Effects:</div>
                <div class="model-effects-text">
                    ${char.statusEffects && char.statusEffects.length > 0 ? 
                        char.statusEffects.map(e => `${e.name} (${e.duration})`).join(', ') : 
                        'none'}
                </div>
            </div>
        </div>
        
        <!-- SECTION 2: Special Actions -->
        <div class="model-section-2">
            <div class="section-title">Special Actions</div>
            ${char.specialActions && char.specialActions.length > 0 ? char.specialActions.map((action, idx) => `
                <div class="special-action-item">
                    <div class="special-action-header">
                        <span class="special-action-name">${action.name}</span>
                        <span class="special-action-uses">${action.uses}/${action.maxUses} uses</span>
                    </div>
                    <div class="special-action-desc">${action.description}</div>
                    ${action.effects ? `<div class="special-action-effects">Effects: ${action.effects}</div>` : ''}
                </div>
            `).join('') : '<div style="color: #666; text-align: center; padding: 10px;">No special actions</div>'}
        </div>
        
        <!-- SECTION 3: Equipment -->
        <div class="model-section-3">
            <div class="section-title">Equipment</div>
            <div class="equipment-grid">
                <!-- Weapon Slot 1 -->
                <div class="equipment-slot ${!char.weapons || !char.weapons[0] ? 'empty' : ''}">
                    <div class="equipment-label">Weapon 1</div>
                    ${char.weapons && char.weapons[0] ? `
                        <div class="equipment-name">${char.weapons[0].name}</div>
                        <div class="equipment-stats">${char.weapons[0].type} | A${char.weapons[0].attacks} P${char.weapons[0].power} D${char.weapons[0].damage}</div>
                        ${char.weapons[0].effects ? `<div class="equipment-effects">${char.weapons[0].effects}</div>` : ''}
                    ` : '<div style="color: #666;">Empty</div>'}
                </div>
                
                <!-- Weapon Slot 2 -->
                <div class="equipment-slot ${!char.weapons || !char.weapons[1] ? 'empty' : ''}">
                    <div class="equipment-label">Weapon 2</div>
                    ${char.weapons && char.weapons[1] ? `
                        <div class="equipment-name">${char.weapons[1].name}</div>
                        <div class="equipment-stats">${char.weapons[1].type} | A${char.weapons[1].attacks} P${char.weapons[1].power} D${char.weapons[1].damage}</div>
                        ${char.weapons[1].effects ? `<div class="equipment-effects">${char.weapons[1].effects}</div>` : ''}
                    ` : '<div style="color: #666;">Empty</div>'}
                </div>
                
                <!-- Inventory Slot 1 -->
                <div class="equipment-slot ${!char.inventory || !char.inventory[0] ? 'empty' : ''}">
                    <div class="equipment-label">Inventory 1</div>
                    ${char.inventory && char.inventory[0] ? `
                        <div class="equipment-name">${char.inventory[0]}</div>
                    ` : '<div style="color: #666;">Empty</div>'}
                </div>
                
                <!-- Inventory Slot 2 -->
                <div class="equipment-slot ${!char.inventory || !char.inventory[1] ? 'empty' : ''}">
                    <div class="equipment-label">Inventory 2</div>
                    ${char.inventory && char.inventory[1] ? `
                        <div class="equipment-name">${char.inventory[1]}</div>
                    ` : '<div style="color: #666;">Empty</div>'}
                </div>
            </div>
            
            <!-- Notes Display -->
            ${char.notes ? `
                <div style="margin-top: 15px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 5px; border-left: 3px solid #9CAF88;">
                    <div style="color: #9CAF88; font-weight: 600; margin-bottom: 5px;">Notes:</div>
                    <div style="color: #ccc; font-size: 13px; white-space: pre-wrap;">${char.notes}</div>
                </div>
            ` : ''}
            
            ${team.owner === currentPlayer && currentView !== 'tiny' ? `
                <div style="margin-top: 15px; display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="btn btn-secondary" style="flex: 1; min-width: 120px; padding: 8px; font-size: 12px;" onclick="openEditModal('${teamId}', '${charId}')">Edit</button>
                    <button class="btn btn-danger" style="flex: 1; min-width: 120px; padding: 8px; font-size: 12px;" onclick="deleteCharacter('${teamId}', '${charId}')">Delete</button>
                </div>
            ` : ''}
        </div>
    </div>
`;
} // End tiny else

                    });
                }

                teamHTML += '</div></div>';
                teamDiv.innerHTML = teamHTML;
                container.appendChild(teamDiv);
            });
        }

        function useConsumableOnTarget(teamId, charId, consumableIndex) {
            const targetSelect = document.getElementById(`consumable-target-${teamId}-${charId}-${consumableIndex}`);
            const targetValue = targetSelect.value;
            
            if (!targetValue) {
                alert('Please select a target');
                return;
            }
            
            const [targetTeamId, targetCharId] = targetValue.split(':');
            useConsumable(teamId, charId, consumableIndex, targetTeamId, targetCharId);
        }

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        });

        // Load templates on page load
        loadTemplates();

        // ==================== TURN TIMER FUNCTIONS ====================
        let timerInterval = null;
        let timerSecondsLeft = 0;

        function startTimer() {
            const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
            const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
            
            if (!currentSession) return;
            
            const totalSeconds = (minutes * 60) + seconds;
            if (totalSeconds <= 0) {
                alert('Please enter a valid time');
                return;
            }
            
            database.ref(`sessions/${currentSession}/timer`).set({
                running: true,
                secondsLeft: totalSeconds,
                totalSeconds: totalSeconds,
                startedAt: firebase.database.ServerValue.TIMESTAMP
            });
        }

        function pauseTimer() {
            if (!currentSession) return;
            database.ref(`sessions/${currentSession}/timer/running`).set(false);
        }

        function resetTimer() {
            if (!currentSession) return;
            const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
            const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
            const totalSeconds = (minutes * 60) + seconds;
            
            database.ref(`sessions/${currentSession}/timer`).set({
                running: false,
                secondsLeft: totalSeconds,
                totalSeconds: totalSeconds,
                startedAt: null
            });
        }

        function updateTimerDisplay(secondsLeft) {
            const minutes = Math.floor(secondsLeft / 60);
            const seconds = secondsLeft % 60;
            const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            const displayElement = document.getElementById('timerDisplay');
            displayElement.textContent = display;
            
            // Add warning class if under 30 seconds
            if (secondsLeft <= 30 && secondsLeft > 0) {
                displayElement.classList.add('warning');
            } else {
                displayElement.classList.remove('warning');
            }
            
            // Play sound at 0 (optional - currently disabled)
            if (secondsLeft === 0) {
                document.getElementById('timerStatus').textContent = 'Time Up Time\'s Up!';
            }
        }

        function syncTimer() {
            if (!currentSession) return;
            
            database.ref(`sessions/${currentSession}/timer`).on('value', (snapshot) => {
                const timer = snapshot.val();
                if (!timer) {
                    updateTimerDisplay(0);
                    document.getElementById('timerStatus').textContent = 'Ready';
                    return;
                }
                
                if (timer.running) {
                    document.getElementById('timerStatus').textContent = '⏱ Running...';
                    
                    // Calculate actual seconds left based on server timestamp
                    if (timerInterval) clearInterval(timerInterval);
                    
                    timerInterval = setInterval(() => {
                        database.ref(`sessions/${currentSession}/timer`).once('value', (snap) => {
                            const t = snap.val();
                            if (!t || !t.running) {
                                clearInterval(timerInterval);
                                return;
                            }
                            
                            let secondsLeft = t.secondsLeft - 1;
                            if (secondsLeft < 0) secondsLeft = 0;
                            
                            updateTimerDisplay(secondsLeft);
                            
                            if (secondsLeft === 0) {
                                clearInterval(timerInterval);
                                database.ref(`sessions/${currentSession}/timer/running`).set(false);
                            } else {
                                database.ref(`sessions/${currentSession}/timer/secondsLeft`).set(secondsLeft);
                            }
                        });
                    }, 1000);
                } else {
                    if (timerInterval) clearInterval(timerInterval);
                    updateTimerDisplay(timer.secondsLeft || 0);
                    document.getElementById('timerStatus').textContent = timer.secondsLeft === 0 ? 'Time Up Time\'s Up!' : 'Pause Paused';
                }
            });
        }

        // ==================== MISSION/OBJECTIVES FUNCTIONS ====================
        function editMissionName() {
            if (!currentSession) return;
            
            database.ref(`sessions/${currentSession}/missionName`).once('value', (snapshot) => {
                const currentName = snapshot.val() || '';
                const newName = prompt('Enter mission name:', currentName);
                if (newName !== null) {
                    database.ref(`sessions/${currentSession}/missionName`).set(newName);
                }
            });
        }

        function toggleObjectives() {
            const container = document.getElementById('objectivesContainer');
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }

        function loadMissionObjectives() {
            // Deprecated - now using campaign system instead
            return;
        }
        
        // ==================== RANDOM NAME GENERATORS ====================
        
        function generateRandomName() {
            // Get current faction from the modal - try multiple sources
            let faction = '';
            
            // Check preset faction selector first (used in Add Model)
            const presetFactionSelect = document.getElementById('presetFactionSelect');
            if (presetFactionSelect && presetFactionSelect.value) {
                faction = presetFactionSelect.value;
            }
            
            // Fallback to Arc Rangers if no faction found
            if (!faction) {
                faction = 'Arc Rangers';
            }
            
            let name = '';
            
            if (faction === 'Arc Rangers') {
                name = generateArcRangerName();
            } else if (faction === 'Space-Wyrm') {
                name = generateSpaceWyrmName();
            } else if (faction === 'Kippin') {
                name = generateKippinName();
            } else {
                // Default to human-ish name
                name = generateArcRangerName();
            }
            
            document.getElementById('charName').value = name;
        }
        
        function generateArcRangerName() {
            const firstNames = [
                // Serious names
                'Marcus', 'Elena', 'Viktor', 'Aria', 'Cole', 'Maya', 'Drake', 'Nova',
                'Ryder', 'Zara', 'Atlas', 'Luna', 'Rex', 'Stella', 'Kane', 'Iris',
                'Jax', 'Skye', 'Phoenix', 'Ember', 'Steel', 'Dawn', 'Blaze', 'Aurora',
                // Funny/quirky names
                'Beef', 'Tank', 'Noodle', 'Beans', 'Chunk', 'Pickle', 'Toast', 'Waffle',
                'Biscuit', 'Muffin', 'Tater', 'Spud', 'Cheese', 'Bacon', 'Crumb', 'Donut',
                'Nugget', 'Popcorn', 'Pretzel', 'Beefy', 'Chip', 'Nacho', 'Taco', 'Burrito',
                'Fig', 'Plum', 'Peach', 'Mango', 'Kiwi', 'Pepper'
            ];
            
            const lastNames = [
                // Serious surnames
                'Steele', 'Cross', 'Hunter', 'Storm', 'Wolf', 'Knight', 'Black', 'Stone',
                'Frost', 'Hawk', 'Raven', 'Blade', 'Shield', 'Striker', 'Valor', 'Justice',
                'Thunder', 'Forge', 'Ash', 'Flint', 'Drake', 'Phoenix', 'Viper', 'Saber',
                // Funny surnames
                'McChunky', 'O\'Beef', 'Thunderpants', 'Boomstick', 'Crankshaft', 'Nutmeg',
                'Wobblesworth', 'Fizzlebang', 'Snickerdoodle', 'Crankypants', 'Bumblebottom',
                'Jiggly', 'Wiggleworth', 'Chonk', 'Fluffernutter', 'Turtleton', 'Beefcake'
            ];
            
            const first = firstNames[Math.floor(Math.random() * firstNames.length)];
            const last = lastNames[Math.floor(Math.random() * lastNames.length)];
            
            return `${first} ${last}`;
        }
        
        function generateSpaceWyrmName() {
            const prefixes = [
                'Razor', 'Fang', 'Venom', 'Scale', 'Claw', 'Spike', 'Tail', 'Tooth',
                'Slither', 'Coil', 'Rattle', 'Snap', 'Bite', 'Strike', 'Hiss', 'Spine',
                'Shard', 'Gore', 'Rend', 'Tear', 'Slash', 'Crest', 'Horn', 'Talon',
                'Scorch', 'Acid', 'Toxin', 'Bone', 'Blood', 'Shadow'
            ];
            
            const middles = [
                'scale', 'fang', 'claw', 'tail', 'tooth', 'spine', 'hide', 'tongue',
                'nail', 'eye', 'scar', 'mark', 'shard', 'spike', 'plate', 'jaw',
                'maw', 'gore', 'rend', 'bane', 'rage', 'wrath', 'fury', 'dread',
                'doom', 'void', 'wyrm', 'drake', 'serpent', 'viper'
            ];
            
            const suffixes = [
                'render', 'ripper', 'slayer', 'hunter', 'stalker', 'seeker', 'breaker',
                'crusher', 'bringer', 'walker', 'runner', 'crawler', 'creeper', 'lurker',
                'shadow', 'terror', 'scourge', 'plague', 'death', 'doom', 'rage', 'fury',
                'hiss', 'snarl', 'growl', 'roar', 'screech', 'shriek'
            ];
            
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const middle = middles[Math.floor(Math.random() * middles.length)];
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            
            // Sometimes use 2-part names, sometimes 3-part
            if (Math.random() > 0.5) {
                return `${prefix}${middle}`;
            } else {
                return `${prefix}${middle}-${suffix}`;
            }
        }
        
        function generateKippinName() {
            // Kippin names - small, cute, energetic vibes
            const firstNames = [
                'Pip', 'Fizz', 'Zip', 'Spark', 'Dash', 'Hop', 'Skip', 'Jump',
                'Twitch', 'Bounce', 'Spring', 'Flip', 'Spin', 'Whirl', 'Zoom', 'Flash',
                'Blink', 'Chirp', 'Beep', 'Click', 'Tick', 'Tock', 'Zing', 'Zap'
            ];
            
            const lastNames = [
                'Quickfoot', 'Swiftpaw', 'Brightear', 'Keeneye', 'Sharpwit', 'Fastclaw',
                'Littlefoot', 'Springtail', 'Quickwhisk', 'Brightfur', 'Softnose', 'Tinywhisk',
                'Jumpstart', 'Speedster', 'Quickdraw', 'Flashstep', 'Lightfoot', 'Swiftrun'
            ];
            
            const first = firstNames[Math.floor(Math.random() * firstNames.length)];
            const last = lastNames[Math.floor(Math.random() * lastNames.length)];
            
            return `${first} ${last}`;
        }

        // ==================== V12 NEW FUNCTIONS ====================

        // Mode Selection from Landing Page
        function selectMode(mode) {
            currentMode = mode;
            document.getElementById('landingPage').style.display = 'none';
            
            if (mode === 'quickplay') {
                // Show Quick Play menu
                showQuickPlayMenu();
            } else if (mode === 'joinsession') {
                // Show join session interface
                document.getElementById('appInterface').style.display = 'block';
                // Update player name display
                const playerName = localStorage.getItem('spaceOpsPlayerName');
                const sessionNameEl = document.getElementById('sessionPlayerName');
                if (sessionNameEl && playerName) {
                    sessionNameEl.textContent = playerName;
                }
                switchTab('join');
            } else if (mode === 'teambuilder') {
                // Show team builder
                showTeamBuilder();
            } else if (mode === 'lore') {
                // Show lore
                showLore();
            }
        }

        // Quick Play Menu
        function showQuickPlayMenu() {
            document.getElementById('teamBuilderTab').style.display = 'none';
            document.getElementById('myTeamsTab').style.display = 'none';
            document.getElementById('loreTab').style.display = 'none';
            document.getElementById('appInterface').style.display = 'none';
            
            // Create Quick Play menu wrapper
            const quickPlayWrapper = document.createElement('div');
            quickPlayWrapper.id = 'quickPlayMenu';
            
            // Create Quick Play menu content
            const quickPlayMenu = document.createElement('div');
            quickPlayMenu.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: calc(100vh - 100px); padding: 20px; position: relative; z-index: 1;';
            
            quickPlayWrapper.innerHTML = `
                <div class="logo-header">
                    <img src="https://raw.githubusercontent.com/AndreBalmet/Space-Ops-3030-Tabletop-Tracker/refs/heads/main/Logo_Wide_wht_c6376661-fc72-45af-ae4c-9b56e7802930.png" 
                         alt="Space Ops 3030" />
                </div>
            `;
            
            quickPlayMenu.innerHTML = `
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 40px;">
                    <button onclick="returnToLanding()" class="btn btn-secondary">← Back to Menu</button>
                    <button onclick="selectMode('teambuilder')" class="btn btn-secondary">Build Custom Team →</button>
                </div>
                
                <h2 style="color: #db8f00; text-align: center; margin-bottom: 20px; font-size: 13px;">Quick Play - Choose Your Squad</h2>
                <p style="color: #ccc; text-align: center; max-width: 600px; margin: 0 auto 40px;">Pick a pre-built starter squad and jump right into the action! Perfect for new players or quick games.</p>
                
                <div class="starter-squad-grid" style="max-width: 900px; width: 100%;">
                    ${gameData.starterSquads.filter(squad => squad.models.length > 0).map(squad => `
                        <div class="starter-squad-card" onclick="loadStarterSquad('${squad.name}')">
                            <h3>${squad.name}</h3>
                            <p style="color: #888; font-size: 13px; margin: 10px 0;">${squad.points} points • ${squad.models.reduce((sum, m) => sum + m.count, 0)} models</p>
                            <p style="color: #aaa; font-size: 0.95em; line-height: 1.5;">${squad.description}</p>
                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(219, 143, 0, 0.3);">
                                ${squad.models.map(m => `<div style="color: #9CAF88; font-size: 12px;">• ${m.count}x ${m.preset}</div>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

            `;
            
            quickPlayWrapper.appendChild(quickPlayMenu);
            document.body.appendChild(quickPlayWrapper);
        }

        // Show Create Session
        function showCreateSession() {
            removeQuickPlayMenu();
            document.getElementById('appInterface').style.display = 'block';
            switchTab('join');
        }

        // Show Join Session
        function showJoinSession() {
            removeQuickPlayMenu();
            document.getElementById('appInterface').style.display = 'block';
            switchTab('join');
        }

        // Show Quick Build
        function showQuickBuild() {
            removeQuickPlayMenu();
            showQuickBuildInterface();
        }

        function removeQuickPlayMenu() {
            const menu = document.getElementById('quickPlayMenu');
            if (menu) menu.remove();
        }

        // Quick Build Interface
        function showQuickBuildInterface() {
            document.getElementById('teamBuilderTab').style.display = 'block';
            document.getElementById('myTeamsTab').style.display = 'none';
            document.getElementById('loreTab').style.display = 'none';
            
            const content = document.getElementById('teamBuilderContent');
            content.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <button onclick="showQuickPlayMenu()" class="btn btn-secondary">← Back to Quick Play</button>
                </div>
                
                <h2 style="color: #db8f00; text-align: center; margin-bottom: 20px;">Initiative Quick Build - Auto-Generate Team</h2>
                <p style="text-align: center; color: #aaa; margin-bottom: 40px;">Choose a faction and we'll build a balanced 150-point team for you!</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; max-width: 1000px; margin: 0 auto;">
                    ${gameData.factions.filter(f => f.name === 'Arc Rangers' || f.name === 'Space-Wyrm').map(faction => `
                        <div class="faction-card" style="background: rgba(${hexToRgb(faction.primaryColor)}, 0.1); border: 2px solid ${faction.primaryColor}; border-radius: 10px; padding: 30px; cursor: pointer; transition: all 0.3s; text-align: center;" 
                             onclick="generateQuickTeam('${faction.name}')"
                             onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 30px rgba(${hexToRgb(faction.primaryColor)}, 0.3)';"
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                            <h3 style="color: ${faction.primaryColor}; margin-bottom: 15px; font-size: 13px;">${faction.name}</h3>
                            <p style="color: #ccc; margin-bottom: 20px; font-size: 13px;">${faction.loreShort}</p>
                            <button class="btn btn-primary" style="width: 100%; padding: 15px;">Generate Team</button>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Generate Quick Team
        function generateQuickTeam(factionName) {
            const faction = gameData.factions.find(f => f.name === factionName);
            const factionModels = gameData.models.filter(m => m.faction === factionName);
            
            // Auto-generate a balanced team
            let autoTeam = [];
            let totalPoints = 0;
            const targetPoints = 150;
            
            // Add one leader/captain
            const leader = factionModels.find(m => m.type === 'Captain' || m.type === 'Leader');
            if (leader) {
                autoTeam.push({...leader, id: Date.now() + Math.random(), currentHealth: leader.health, status: 'alive', weapons: [], specialActions: [], inventory: []});
                totalPoints += leader.points;
            }
            
            // Add specialists and troopers to reach ~150pts
            const specialists = factionModels.filter(m => m.type === 'Specialist');
            const troopers = factionModels.filter(m => m.type === 'Trooper' || m.type === 'Warrior');
            
            // Add 2 specialists
            for (let i = 0; i < 2 && specialists.length > 0; i++) {
                const spec = specialists[i % specialists.length];
                if (totalPoints + spec.points <= targetPoints) {
                    autoTeam.push({...spec, id: Date.now() + Math.random() + i, currentHealth: spec.health, status: 'alive', weapons: [], specialActions: [], inventory: []});
                    totalPoints += spec.points;
                }
            }
            
            // Fill rest with troopers
            let trooperIndex = 0;
            while (totalPoints < targetPoints - 20 && troopers.length > 0) {
                const trooper = troopers[trooperIndex % troopers.length];
                if (totalPoints + trooper.points <= targetPoints) {
                    autoTeam.push({...trooper, id: Date.now() + Math.random() + trooperIndex, currentHealth: trooper.health, status: 'alive', weapons: [], specialActions: [], inventory: []});
                    totalPoints += trooper.points;
                    trooperIndex++;
                } else {
                    break;
                }
            }
            
            // Show preview
            showQuickTeamPreview(factionName, autoTeam, totalPoints);
        }

        function showQuickTeamPreview(factionName, team, points) {
            const faction = gameData.factions.find(f => f.name === factionName);
            const content = document.getElementById('teamBuilderContent');
            
            content.innerHTML = `
                <div style="max-width: 800px; margin: 0 auto;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <button onclick="showQuickBuildInterface()" class="btn btn-secondary">← Choose Different Faction</button>
                    </div>
                    
                    <h2 style="color: ${faction.primaryColor}; text-align: center; margin-bottom: 10px;">Your ${factionName} Team</h2>
                    <div style="text-align: center; color: #9CAF88; font-size: 13px; margin-bottom: 30px;">
                        <strong>${points} Points</strong> • ${team.length} Models
                    </div>
                    
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; border: 1px solid ${faction.primaryColor}; margin-bottom: 30px;">
                        <h3 style="color: #db8f00; margin-bottom: 15px;">Team Roster:</h3>
                        ${team.map(model => `
                            <div style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="color: ${faction.primaryColor};">${model.name}</strong>
                                    <span style="color: #888; margin-left: 10px; font-size: 13px;">${model.type}</span>
                                </div>
                                <span style="color: #9CAF88;">${model.points} pts</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="background: rgba(219, 143, 0, 0.1); padding: 20px; border-radius: 10px; border: 1px solid #db8f00; margin-bottom: 30px;">
                        <h3 style="color: #db8f00; margin-bottom: 10px;">Ready to Play?</h3>
                        <p style="color: #ccc;">Enter a session name and your player name to start playing!</p>
                        <div style="margin-top: 15px; display: grid; gap: 10px;">
                            <input type="text" id="quickSessionName" placeholder="Session Name (e.g., QuickGame-${factionName})" 
                                   style="width: 100%; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid #db8f00; color: white; border-radius: 5px;">
                            <input type="text" id="quickPlayerName" placeholder="Your Player Name" 
                                   style="width: 100%; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid #db8f00; color: white; border-radius: 5px;">
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <button onclick="startQuickGame('${factionName}', ${JSON.stringify(team).replace(/"/g, '&quot;')})" class="btn btn-primary" style="padding: 20px 60px; font-size: 13px;"> Start Playing!</button>
                    </div>
                </div>
            `;
        }

        function startQuickGame(factionName, team) {
            const sessionName = document.getElementById('quickSessionName').value.trim();
            const playerName = document.getElementById('quickPlayerName').value.trim();
            
            if (!sessionName) {
                alert('Please enter a session name!');
                return;
            }
            if (!playerName) {
                alert('Please enter your player name!');
                return;
            }
            
            // Sanitize session name for Firebase
            const sanitizedSessionName = sanitizeSessionName(sessionName);
            
            if (!sanitizedSessionName) {
                alert('Session name contains only invalid characters. Please use letters and numbers.');
                return;
            }
            
            // Store for later use
            const sanitizedPlayerName = playerName.replace(/[.#$[\]\s]/g, '_');
            currentPlayer = sanitizedPlayerName;
            currentPlayerDisplay = playerName;
            currentSession = sanitizedSessionName;  // Use sanitized name
            
            // Create session first
            const sessionRef = database.ref('sessions/' + sanitizedSessionName);
            sessionRef.once('value', (snapshot) => {
                const sessionPromise = snapshot.exists() ? 
                    Promise.resolve() : 
                    sessionRef.set({
                        name: sessionName,  // Store original name for display
                        description: `Quick Build - ${factionName}`,
                        created: firebase.database.ServerValue.TIMESTAMP,
                        archived: false,
                        campaign: {
                            name: 'Campaign Name',
                            description: 'Click to add campaign description...',
                            objectives: []
                        },
                        teams: {},
                        actionHistory: {},
                        combatLog: {},
                        initiative: {}
                    });
                
                sessionPromise.then(() => {
                    // Hide team builder
                    document.getElementById('teamBuilderTab').style.display = 'none';
                    
                    // Show app interface
                    document.getElementById('appInterface').style.display = 'block';
                    
                    // Set values in interface (display original name)
                    document.getElementById('currentSession').textContent = sessionName;
                    document.getElementById('currentPlayer').textContent = playerName;
                    document.getElementById('gameTabBtn').style.display = 'block';
                    document.getElementById('toolsTabBtn').style.display = 'block';
                    document.getElementById('gameArea').style.display = 'block';
                    
                    // Show session info bar and campaign section
                    document.getElementById('sessionInfoBar').style.display = 'block';
                    document.getElementById('campaignSection').style.display = 'block';
                    
                    // Load campaign info and objectives
                    loadCampaignInfo();
                    loadMissionObjectives();
                    syncTimer();
                    
                    // Set up teams listener
                    sessionRef.child('teams').on('value', (snapshot) => {
                        renderTeams(snapshot.val() || {});
                    });
                    
                    // Create team with faction
                    const teamId = currentPlayer.replace(/\s/g, '_');
                    const teamRef = database.ref(`sessions/${sanitizedSessionName}/teams/${teamId}`);
                    teamRef.set({
                        owner: currentPlayer,
                        faction: factionName,
                        characters: {}
                    }).then(() => {
                        // Add characters
                        team.forEach((model, index) => {
                            setTimeout(() => {
                                addQuickTeamModel(model, factionName);
                            }, index * 100); // Stagger to avoid conflicts
                        });
                        
                        // Switch to game tab
                        setTimeout(() => {
                            switchTab('game');
                        }, team.length * 100 + 500);
                    });
                });
            });
        }

        function addQuickTeamModel(modelData, factionName) {
            if (!currentSession || !currentPlayer) return;
            
            const teamId = currentPlayer.replace(/\s/g, '_');
            const charId = 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            database.ref(`sessions/${currentSession}/teams/${teamId}/characters/${charId}`).set({
                name: modelData.name,
                role: modelData.type,
                maxHealth: modelData.health,
                currentHealth: modelData.health,
                speed: modelData.speed,
                shoot: modelData.shoot,
                fight: modelData.fight,
                nerve: modelData.nerve,
                portrait: modelData.portrait,
                status: 'alive',
                turnTaken: false,
                weapons: [],
                consumables: [],
                specialActions: [],
                owner: currentPlayer
            });
        }

        // Return to Landing Page
        function returnToLanding() {
            document.getElementById('landingPage').style.display = 'flex';
            document.getElementById('appInterface').style.display = 'none';
            document.getElementById('teamBuilderTab').style.display = 'none';
            document.getElementById('myTeamsTab').style.display = 'none';
            document.getElementById('loreTab').style.display = 'none';
            removeQuickPlayMenu();
            currentMode = null;
            
            // Hide tabs
            document.getElementById('gameTabBtn').style.display = 'none';
            document.getElementById('toolsTabBtn').style.display = 'none';
            // Templates tab removed in v12.11
            // document.getElementById('templatesTabBtn').style.display = 'none';
        }
        
        // Random Color Generator
        function generateRandomColor() {
            const colors = [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
                '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
                '#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7',
                '#C7CEEA', '#FFB347', '#77DD77', '#AEC6CF', '#CFCFC4'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        // Team Builder Functions
        function showTeamBuilder() {
            document.getElementById('teamBuilderTab').style.display = 'block';
            document.getElementById('myTeamsTab').style.display = 'none';
            document.getElementById('loreTab').style.display = 'none';
            
            // Show faction selection
            showFactionSelector();
        }

        function showFactionSelector() {
            const content = document.getElementById('teamBuilderContent');
            content.innerHTML = `
                <h3 style="color: #db8f00; text-align: center; margin-bottom: 30px;">Choose Your Faction</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; max-width: 1200px; margin: 0 auto;">
                    ${gameData.factions.map(faction => `
                        <div class="faction-card" style="background: rgba(${hexToRgb(faction.primaryColor)}, 0.1); border: 2px solid ${faction.primaryColor}; border-radius: 10px; padding: 20px; cursor: pointer; transition: all 0.3s;" 
                             onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 30px rgba(${hexToRgb(faction.primaryColor)}, 0.3)';"
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                            <h3 style="color: ${faction.primaryColor}; text-align: center; margin-bottom: 15px;">${faction.name}</h3>
                            <p style="color: #ccc; text-align: center; margin-bottom: 20px; font-size: 13px;">${faction.loreShort}</p>
                            <div style="display: flex; gap: 10px; justify-content: center;">
                                <button onclick="selectFaction('${faction.name}')" class="btn btn-primary">Select</button>
                                <button onclick="showFactionLore('${faction.name}')" class="btn btn-secondary">Lore</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 149, 0';
        }

        function showFactionLore(factionName) {
            const faction = gameData.factions.find(f => f.name === factionName);
            if (!faction) return;
            
            const content = document.getElementById('teamBuilderContent');
            content.innerHTML = `
                <div style="max-width: 800px; margin: 0 auto;">
                    <button onclick="showFactionSelector()" class="btn btn-secondary" style="margin-bottom: 20px;">← Back to Factions</button>
                    <h2 style="color: ${faction.primaryColor}; text-align: center; margin-bottom: 20px;">${faction.name}</h2>
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 10px; border: 1px solid ${faction.primaryColor};">
                        <p style="color: #ccc; line-height: 1.8; white-space: pre-wrap;">${faction.loreFull}</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <button onclick="selectFaction('${faction.name}')" class="btn btn-primary" style="padding: 15px 40px; font-size: 13px;">Build ${faction.name} Team</button>
                    </div>
                </div>
            `;
        }

        let currentTeam = {
            name: '',
            faction: '',
            models: [],
            points: 0
        };

        function selectFaction(factionName) {
            currentTeam.faction = factionName;
            currentTeam.models = [];
            currentTeam.points = 0;
            showTeamBuildingInterface();
        }

        function showTeamBuildingInterface() {
            const faction = gameData.factions.find(f => f.name === currentTeam.faction);
            const factionModels = gameData.models.filter(m => m.faction === currentTeam.faction);
            
            const content = document.getElementById('teamBuilderContent');
            content.innerHTML = `
                <div style="max-width: 1400px; margin: 0 auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <button onclick="showFactionSelector()" class="btn btn-secondary">← Change Faction</button>
                        <h2 style="color: ${faction.primaryColor};">Building ${currentTeam.faction} Team</h2>
                        <button onclick="saveCurrentTeam()" class="btn btn-primary"> Save Team</button>
                    </div>
                    
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <label style="color: #db8f00; font-weight: 600;">Team Name:</label>
                        <input type="text" id="teamNameInput" placeholder="e.g., Alpha Squad" value="${currentTeam.name}" 
                               onchange="currentTeam.name = this.value"
                               style="width: 100%; padding: 10px; margin-top: 5px; background: rgba(0,0,0,0.5); border: 1px solid #db8f00; color: white; border-radius: 5px;">
                        <div style="margin-top: 10px; color: #9CAF88; font-size: 13px;">
                            <strong>Total Points:</strong> <span id="teamPoints">${currentTeam.points}</span>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <!-- Model Presets -->
                        <div>
                            <h3 style="color: #db8f00; margin-bottom: 15px;">Available Models</h3>
                            <div style="display: grid; gap: 10px; max-height: 600px; overflow-y: auto;">
                                ${factionModels.map(model => `
                                    <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border: 1px solid ${faction.primaryColor};">
                                        <div style="display: flex; justify-content: space-between; align-items: start;">
                                            <div>
                                                <strong style="color: ${faction.primaryColor};">${model.name}</strong>
                                                <span style="color: #9CAF88; margin-left: 10px;">${model.points} pts</span>
                                                <div style="color: #888; font-size: 12px; margin-top: 5px;">
                                                    ${model.type} | Spd:${model.speed} | Sht:${model.shoot} | Fgt:${model.fight} | Nrv:${model.nerve} | HP:${model.health}
                                                </div>
                                                <div style="color: #666; font-size: 12px; margin-top: 5px;">${model.description}</div>
                                            </div>
                                            <button onclick="addPresetModelToTeam('${model.name}')" class="btn btn-success" style="padding: 8px 15px;">+</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Current Team -->
                        <div>
                            <h3 style="color: #db8f00; margin-bottom: 15px;">Your Team (<span id="teamModelCount">${currentTeam.models.length}</span> models)</h3>
                            <div id="currentTeamRoster" style="display: grid; gap: 10px; max-height: 600px; overflow-y: auto;">
                                ${currentTeam.models.length === 0 ? '<div style="color: #666; text-align: center; padding: 40px;">No models yet. Add models from the left!</div>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            renderCurrentTeam();
        }

        function addPresetModelToTeam(modelName) {
            const modelData = gameData.models.find(m => m.name === modelName);
            if (!modelData) return;
            
            // Create model instance
            const modelInstance = {
                ...modelData,
                id: Date.now() + Math.random(),
                currentHealth: modelData.health,
                status: 'alive',
                weapons: [],
                specialActions: [],
                inventory: []
            };
            
            currentTeam.models.push(modelInstance);
            currentTeam.points += modelData.points;
            
            renderCurrentTeam();
            updateTeamPoints();
        }

        function removeModelFromTeam(modelId) {
            const index = currentTeam.models.findIndex(m => m.id === modelId);
            if (index === -1) return;
            
            const model = currentTeam.models[index];
            currentTeam.points -= model.points;
            currentTeam.models.splice(index, 1);
            
            renderCurrentTeam();
            updateTeamPoints();
        }

        function renderCurrentTeam() {
            const container = document.getElementById('currentTeamRoster');
            if (!container) return;
            
            const faction = gameData.factions.find(f => f.name === currentTeam.faction);
            
            if (currentTeam.models.length === 0) {
                container.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">No models yet. Add models from the left!</div>';
                return;
            }
            
            container.innerHTML = currentTeam.models.map(model => `
                <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; border: 1px solid ${faction.primaryColor};">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <strong style="color: ${faction.primaryColor};">${model.name}</strong>
                            <span style="color: #9CAF88; margin-left: 10px;">${model.points} pts</span>
                            <div style="color: #888; font-size: 12px; margin-top: 5px;">
                                ${model.type} | HP: ${model.health}
                            </div>
                        </div>
                        <button onclick="removeModelFromTeam(${model.id})" class="btn btn-danger" style="padding: 5px 10px;">Remove</button>
                    </div>
                </div>
            `).join('');
            
            document.getElementById('teamModelCount').textContent = currentTeam.models.length;
        }

        function updateTeamPoints() {
            document.getElementById('teamPoints').textContent = currentTeam.points;
        }

        function saveCurrentTeam() {
            if (!currentPlayer) {
                // Need to get player name first
                const playerNamePrompt = prompt('Please enter your player name to save this team:');
                if (!playerNamePrompt || !playerNamePrompt.trim()) {
                    alert('Player name required to save team!');
                    return;
                }
                currentPlayer = playerNamePrompt.trim();
                localStorage.setItem('lastPlayerName', currentPlayer);
            }
            
            if (!currentTeam.name) {
                alert('Please enter a team name!');
                document.getElementById('teamNameInput').focus();
                return;
            }
            
            if (currentTeam.models.length === 0) {
                alert('Please add at least one model to your team!');
                return;
            }
            
            const teamId = 'team_' + Date.now();
            const teamData = {
                ...currentTeam,
                created: Date.now(),
                modified: Date.now(),
                owner: currentPlayer
            };
            
            // Save to Firebase
            database.ref(`players/${currentPlayer}/teams/${teamId}`).set(teamData).then(() => {
                console.log('✅ Team saved to Firebase');
                showTeamSavedDialog(teamData.name);
            }).catch(error => {
                alert('Error saving team: ' + error.message);
            });
        }

        function showTeamSavedDialog(teamName) {
            const faction = gameData.factions.find(f => f.name === currentTeam.faction);
            const content = document.getElementById('teamBuilderContent');
            
            content.innerHTML = `
                <div style="max-width: 600px; margin: 60px auto; text-align: center;">
                    <div style="font-size: 13px; margin-bottom: 20px;">✅</div>
                    <h2 style="color: ${faction.primaryColor}; margin-bottom: 20px;">Team Saved Successfully!</h2>
                    <div style="background: rgba(${hexToRgb(faction.primaryColor)}, 0.1); padding: 30px; border-radius: 10px; border: 2px solid ${faction.primaryColor}; margin-bottom: 30px;">
                        <h3 style="color: ${faction.primaryColor}; margin-bottom: 10px;">"${teamName}"</h3>
                        <div style="color: #9CAF88; font-size: 13px;">
                            ${currentTeam.faction} • ${currentTeam.points} pts • ${currentTeam.models.length} models
                        </div>
                        <div style="color: #9CAF88; margin-top: 10px;">💾 Saved to Firebase</div>
                    </div>
                    
                    <h3 style="color: #db8f00; margin-bottom: 20px;">What would you like to do next?</h3>
                    
                    <div style="display: grid; gap: 15px; margin-top: 30px;">
                        <button onclick="prepareToJoinWithTeam('${teamName}')" class="btn btn-primary" style="padding: 20px; font-size: 13px;">
                             Join a Session with This Team
                        </button>
                        
                        <button onclick="showMyTeams()" class="btn btn-secondary" style="padding: 15px;">
                             View My Saved Teams
                        </button>
                        
                        <button onclick="showTeamBuilder()" class="btn btn-secondary" style="padding: 15px;">
                            Build Another Team
                        </button>
                        
                        <button onclick="returnToLanding()" class="btn btn-secondary" style="padding: 15px;">
                             Back to Main Menu
                        </button>
                    </div>
                </div>
            `;
        }

        function prepareToJoinWithTeam(teamName) {
            // Show join session interface
            document.getElementById('teamBuilderTab').style.display = 'none';
            document.getElementById('appInterface').style.display = 'block';
            
            // Pre-fill player name
            if (currentPlayer) {
                document.getElementById('playerName').value = currentPlayer;
            }
            
            // Switch to join tab
            switchTab('join');
            
            // Show helpful message
            const joinTab = document.getElementById('joinTab');
            const existingHint = joinTab.querySelector('.team-ready-hint');
            if (!existingHint) {
                const hint = document.createElement('div');
                hint.className = 'team-ready-hint';
                hint.style.cssText = 'background: rgba(76, 175, 80, 0.1); padding: 20px; border-radius: 10px; border: 1px solid #4CAF50; margin-bottom: 20px; text-align: center;';
                hint.innerHTML = `
                    <h3 style="color: #4CAF50; margin-bottom: 10px;"> Team "${teamName}" Ready!</h3>
                    <p style="color: #ccc;">Enter a session name below to create or join a game with your team.</p>
                `;
                joinTab.querySelector('.session-controls').insertBefore(hint, joinTab.querySelector('.session-controls').firstChild);
            }
        }

        // My Teams Functions
        function showMyTeams() {
            document.getElementById('teamBuilderTab').style.display = 'none';
            document.getElementById('myTeamsTab').style.display = 'block';
            document.getElementById('loreTab').style.display = 'none';
            
            // Update player display
            const playerName = localStorage.getItem('spaceOpsPlayerName') || localStorage.getItem('lastPlayerName');
            const displayEl = document.getElementById('currentPlayerDisplay');
            if (displayEl && playerName) {
                displayEl.textContent = playerName;
            }
            
            // Try to get player name from current session or localStorage
            if (!currentPlayer) {
                const savedPlayerName = localStorage.getItem('lastPlayerName');
                if (savedPlayerName) {
                    // Sanitize player name for Firebase
                    const sanitizedName = savedPlayerName.replace(/[.#$[\]\s]/g, '_');
                    currentPlayer = sanitizedName;
                    currentPlayerDisplay = savedPlayerName;
                } else {
                    // Hide player info header
                    document.getElementById('currentPlayerInfo').style.display = 'none';
                    
                    document.getElementById('myTeamsContent').innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <p style="color: #aaa; margin-bottom: 20px;">Enter your player name to view your teams:</p>
                            <input type="text" id="tempPlayerName" placeholder="Your player name" style="padding: 10px; width: 300px; margin-bottom: 15px; background: rgba(0,0,0,0.5); border: 1px solid #db8f00; color: white; border-radius: 5px;">
                            <br>
                            <button onclick="setPlayerNameFromTemp()" class="btn btn-primary">Load My Teams</button>
                            <button onclick="returnToLanding()" class="btn btn-secondary" style="margin-left: 10px;">← Back to Menu</button>
                        </div>
                    `;
                    return;
                }
            }
            
            // Show player info header
            document.getElementById('currentPlayerInfo').style.display = 'block';
            document.getElementById('currentPlayerDisplay').textContent = currentPlayerDisplay || currentPlayer;
            
            loadPlayerTeams();
        }
        
        function setPlayerNameFromTemp() {
            const name = document.getElementById('tempPlayerName').value.trim();
            if (!name) {
                alert('Please enter your player name');
                return;
            }
            
            // Sanitize player name for Firebase (remove spaces and special chars)
            const sanitizedName = name.replace(/[.#$[\]\s]/g, '_');
            
            currentPlayer = sanitizedName;
            currentPlayerDisplay = name; // Keep original for display
            localStorage.setItem('lastPlayerName', name);
            showMyTeams();
        }
        
        function changePlayer() {
            if (confirm('Switch to a different player? This will clear your current login.')) {
                // Clear current player
                currentPlayer = null;
                currentPlayerDisplay = null;
                localStorage.removeItem('lastPlayerName');
                
                // Refresh My Teams view
                showMyTeams();
            }
        }

        function loadPlayerTeams() {
            database.ref(`players/${currentPlayer}/teams`).once('value', snapshot => {
                const teams = snapshot.val() || {};
                displayTeamLibrary(teams);
            });
        }

        function displayTeamLibrary(teams) {
            const content = document.getElementById('myTeamsContent');
            const teamsList = Object.entries(teams);
            
            content.innerHTML = `
                <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
                    <div style="text-align: center; margin-bottom: 30px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; align-items: stretch;">
                        <button onclick="returnToLanding()" class="btn btn-secondary" style="height: 50px; display: flex; align-items: center; justify-content: center;">← Back to Menu</button>
                        <button onclick="showTeamBuilder()" class="btn btn-primary" style="height: 50px; display: flex; align-items: center; justify-content: center;">Build New Team</button>
                        <button onclick="exportTeamsToCSV()" class="btn btn-success" style="height: 50px; display: flex; align-items: center; justify-content: center;">📥 Export to CSV</button>
                        <button onclick="document.getElementById('importCSV').click()" class="btn btn-secondary" style="height: 50px; display: flex; align-items: center; justify-content: center;">📤 Import from CSV</button>
                        <input type="file" id="importCSV" accept=".csv" style="display: none;" onchange="importTeamsFromCSV(event)">
                    </div>
                    
                    ${teamsList.length === 0 ? `
                        <div style="text-align: center; padding: 60px; color: #666;">
                            <h3>No teams yet!</h3>
                            <p>Click "Build New Team" to create your first squad.</p>
                            <p style="margin-top: 20px; color: #9CAF88;">Or click "Import from CSV" to load teams from a file.</p>
                        </div>
                    ` : `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding: 0 20px;">
                            ${teamsList.map(([teamId, team]) => {
                                const faction = gameData.factions.find(f => f.name === team.faction);
                                return `
                                    <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 10px; border: 2px solid ${faction ? faction.primaryColor : '#db8f00'};">
                                        <h3 style="color: ${faction ? faction.primaryColor : '#db8f00'}; margin-bottom: 10px;">${team.name}</h3>
                                        <div style="color: #9CAF88; margin-bottom: 15px;">
                                            <div>${team.faction}</div>
                                            <div>${team.points} points • ${team.models.length} models</div>
                                        </div>
                                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                            <button onclick="editTeamInline('${teamId}')" class="btn btn-secondary" style="flex: 1; min-width: 70px;">Edit</button>
                                            <button onclick="exportTeamToPDF('${teamId}')" class="btn btn-primary" style="flex: 1; min-width: 70px;">PDF</button>
                                            <button onclick="deleteTeamConfirm('${teamId}', '${team.name}')" class="btn btn-danger" style="flex: 1; min-width: 70px;">Delete</button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                    
                    <!-- Team Editing Area -->
                    <div id="teamEditingArea" style="display: none; margin-top: 40px; padding: 30px; background: rgba(219, 143, 0, 0.1); border-radius: 10px; border: 2px solid #db8f00;">
                        <!-- Team models will be displayed here -->
                    </div>
                </div>
            `;
        }

        let editingTeamId = null;

        function editTeamInline(teamId) {
            editingTeamId = teamId;
            database.ref(`players/${currentPlayer}/teams/${teamId}`).once('value', snapshot => {
                const team = snapshot.val();
                if (team) {
                    displayTeamEditing(teamId, team);
                }
            });
        }

        function displayTeamEditing(teamId, team) {
            const editArea = document.getElementById('teamEditingArea');
            const faction = gameData.factions.find(f => f.name === team.faction);
            
            editArea.style.display = 'block';
            editArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            editArea.innerHTML = `
                <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="color: ${faction ? faction.primaryColor : '#db8f00'}; margin: 0;">Editing: ${team.name}</h2>
                        <p style="color: #9CAF88; margin: 5px 0 0 0;">${team.faction} • ${team.models.length} models</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary team-add-model-btn" data-team-id="${teamId}">Add Model</button>
                        <button class="btn btn-secondary team-done-btn">Done</button>
                    </div>
                </div>
                
                <div id="teamModelsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px; margin-top: 20px;">
                    ${team.models.map((model, index) => renderTeamModel(teamId, index, model, faction)).join('')}
                </div>
            `;
        }

        function renderTeamModel(teamId, modelIndex, model, faction) {
            const healthColor = model.currentHealth <= model.health * 0.25 ? '#f44336' : 
                               model.currentHealth <= model.health * 0.5 ? '#FFC107' : '#4CAF50';
            
            return `
                <div class="model-card" style="border: 2px solid ${faction ? faction.primaryColor : '#db8f00'};">
                    
                    <!-- SECTION 1: Header - Portrait, Name, Stats -->
                    <div class="model-section-1">
                        <div class="model-header-top">
                            <div class="model-portrait-new" style="background: ${model.color || faction?.primaryColor || '#db8f00'}; border: 4px solid ${model.color || faction?.primaryColor || '#db8f00'}; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 600; color: white;">${model.name[0]}</div>
                            <div class="model-header-info">
                                <div class="model-name-row">
                                    <h3 class="model-name-new">${model.name}</h3>
                                </div>
                                <div class="model-role">${model.role || model.type || 'Operative'}</div>
                                
                                <!-- Health Display (no controls in team editing) -->
                                <div style="text-align: center; font-weight: 600; color: ${healthColor}; font-size: 13px; margin-top: 8px;">
                                    ${model.currentHealth || model.health}/${model.health} HP
                                </div>
                            </div>
                        </div>
                        
                        <!-- Stats Grid -->
                        <div class="model-stats-grid">
                            ${model.speed ? `
                                <div class="model-stat-box">
                                    <div class="model-stat-label">Speed</div>
                                    <div class="model-stat-value">${model.speed}</div>
                                </div>
                            ` : ''}
                            ${model.shoot ? `
                                <div class="model-stat-box">
                                    <div class="model-stat-label">Shoot</div>
                                    <div class="model-stat-value">${model.shoot}</div>
                                </div>
                            ` : ''}
                            ${model.fight ? `
                                <div class="model-stat-box">
                                    <div class="model-stat-label">Fight</div>
                                    <div class="model-stat-value">${model.fight}</div>
                                </div>
                            ` : ''}
                            ${model.nerve ? `
                                <div class="model-stat-box">
                                    <div class="model-stat-label">Nerve</div>
                                    <div class="model-stat-value">${model.nerve}</div>
                                </div>
                            ` : ''}
                            <div class="model-stat-box">
                                <div class="model-stat-label">Health</div>
                                <div class="model-stat-value">${model.health}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- SECTION 2: Equipment -->
                    <div class="model-section-3">
                        <div class="section-title">Equipment</div>
                        <div class="equipment-grid">
                            <!-- Weapon Slot 1 -->
                            <div class="equipment-slot ${!model.weapons || !model.weapons[0] ? 'empty' : ''}">
                                <div class="equipment-label">Weapon 1</div>
                                ${model.weapons && model.weapons[0] ? `
                                    <div class="equipment-name">${model.weapons[0].name || model.weapons[0]}</div>
                                    ${model.weapons[0].type ? `<div class="equipment-stats">${model.weapons[0].type} | A${model.weapons[0].attacks} P${model.weapons[0].power} D${model.weapons[0].damage}</div>` : ''}
                                ` : '<div style="color: #666;">Empty</div>'}
                            </div>
                            
                            <!-- Weapon Slot 2 -->
                            <div class="equipment-slot ${!model.weapons || !model.weapons[1] ? 'empty' : ''}">
                                <div class="equipment-label">Weapon 2</div>
                                ${model.weapons && model.weapons[1] ? `
                                    <div class="equipment-name">${model.weapons[1].name || model.weapons[1]}</div>
                                    ${model.weapons[1].type ? `<div class="equipment-stats">${model.weapons[1].type} | A${model.weapons[1].attacks} P${model.weapons[1].power} D${model.weapons[1].damage}</div>` : ''}
                                ` : '<div style="color: #666;">Empty</div>'}
                            </div>
                            
                            <!-- Inventory Slot 1 -->
                            <div class="equipment-slot ${!model.inventory || !model.inventory[0] ? 'empty' : ''}">
                                <div class="equipment-label">Inventory 1</div>
                                ${model.inventory && model.inventory[0] ? `
                                    <div class="equipment-name">${model.inventory[0]}</div>
                                ` : '<div style="color: #666;">Empty</div>'}
                            </div>
                            
                            <!-- Inventory Slot 2 -->
                            <div class="equipment-slot ${!model.inventory || !model.inventory[1] ? 'empty' : ''}">
                                <div class="equipment-label">Inventory 2</div>
                                ${model.inventory && model.inventory[1] ? `
                                    <div class="equipment-name">${model.inventory[1]}</div>
                                ` : '<div style="color: #666;">Empty</div>'}
                            </div>
                        </div>
                        
                        <!-- Notes Display -->
                        ${model.notes ? `
                            <div style="margin-top: 15px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 5px; border-left: 3px solid #9CAF88;">
                                <div style="color: #9CAF88; font-weight: 600; margin-bottom: 5px;">Notes:</div>
                                <div style="color: #ccc; white-space: pre-wrap;">${model.notes}</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Edit/Delete Buttons -->
                    <div class="model-actions" style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn btn-secondary model-edit-btn" style="flex: 1; min-width: 120px; padding: 8px; font-size: 12px;" data-team-id="${teamId}" data-model-index="${modelIndex}">Edit</button>
                        <button class="btn btn-danger model-delete-btn" style="flex: 1; min-width: 120px; padding: 8px; font-size: 12px;" data-team-id="${teamId}" data-model-index="${modelIndex}" data-model-name="${model.name}">Delete</button>
                    </div>
                </div>
            `;
        }

        function addModelToTeam(teamId) {
        try {
            // HACK: Show appInterface invisibly so modal works
            const appInterface = document.getElementById('appInterface');
            if (appInterface && appInterface.style.display === 'none') {
                appInterface.style.display = 'block';
                appInterface.style.position = 'absolute';
                appInterface.style.left = '-99999px';
            }
        } catch(e) { console.error('appInterface hack failed:', e); }

            try {
                console.log('addModelToTeam starting, teamId:', teamId);
                editingTeamId = teamId;
                editingCharacter = null; // Clear editing state
                
                console.log('Setting modal title...');
                document.getElementById('modalTitle').textContent = 'Add Model to Team';
                
                console.log('Clearing form fields...');
                // Clear form - check if elements exist first
                const elements = {
                    charName: document.getElementById('charName'),
                    charRole: document.getElementById('charRole'),
                    charPortrait: document.getElementById('charPortrait'),
                    charSpeed: document.getElementById('charSpeed'),
                    charShoot: document.getElementById('charShoot'),
                    charFight: document.getElementById('charFight'),
                    charNerve: document.getElementById('charNerve'),
                    charHealth: document.getElementById('charHealth'),
                    charColor: document.getElementById('charColor'),
                    charInventory: document.getElementById('charInventory'),
                    charNotes: document.getElementById('charNotes')
                };
                
                console.log('Form elements check:');
                for (const [name, el] of Object.entries(elements)) {
                    console.log(`  ${name}: ${el ? 'EXISTS' : 'MISSING!'}`);
                }
                
                if (elements.charName) elements.charName.value = '';
                if (elements.charRole) elements.charRole.value = '';
                if (elements.charPortrait) elements.charPortrait.value = '';
                if (window.updatePortraitPreview) {
                    window.updatePortraitPreview(''); // Clear preview
                }
                if (elements.charSpeed) elements.charSpeed.value = '6';
                if (elements.charShoot) elements.charShoot.value = '4+';
                if (elements.charFight) elements.charFight.value = '5+';
                if (elements.charNerve) elements.charNerve.value = '4+';
                if (elements.charHealth) elements.charHealth.value = '15';
                if (elements.charColor) elements.charColor.value = generateRandomColor();
                updateColorPreview();
                if (elements.charInventory) elements.charInventory.value = '';
                if (elements.charNotes) elements.charNotes.value = '';
                
                console.log('Resetting weapon/consumable/action fields...');
                weaponFields = [];
                renderWeaponFields();
                addWeaponField();
                
                consumableFields = [];
                renderConsumableFields();
                addConsumableField();
                
                specialActionFields = [];
                renderSpecialActionFields();
                addSpecialActionField();
                
                console.log('Opening modal...');
                const modal = document.getElementById('characterModal');
                if (modal) {
                    modal.classList.add('active');
                    
                    // Debug: log modal's actual computed styles
                    setTimeout(() => {
                        const styles = window.getComputedStyle(modal);
                        const rect = modal.getBoundingClientRect();
                        console.log('Modal computed display:', styles.display);
                        console.log('Modal computed z-index:', styles.zIndex);
                        console.log('Modal computed position:', styles.position);
                        console.log('Modal computed opacity:', styles.opacity);
                        console.log('Modal computed visibility:', styles.visibility);
                        console.log('Modal dimensions:', rect.width, 'x', rect.height);
                        console.log('Modal position:', rect.top, rect.left);
                        console.log('Modal has active class:', modal.classList.contains('active'));
                        
                        // NEW: Check modal-content element specifically
                        const modalContent = modal.querySelector('.modal-content');
                        if (modalContent) {
                            const contentStyles = window.getComputedStyle(modalContent);
                            const contentRect = modalContent.getBoundingClientRect();
                            console.log('--- MODAL-CONTENT DEBUG ---');
                            console.log('modal-content display:', contentStyles.display);
                            console.log('modal-content width:', contentStyles.width);
                            console.log('modal-content min-width:', contentStyles.minWidth);
                            console.log('modal-content height:', contentStyles.height);
                            console.log('modal-content min-height:', contentStyles.minHeight);
                            console.log('modal-content dimensions:', contentRect.width, 'x', contentRect.height);
                            console.log('modal-content background:', contentStyles.background);
                            console.log('modal-content children count:', modalContent.children.length);
                        } else {
                            console.error('modal-content element NOT FOUND!');
                        }
                        
                        // Check if modal is actually in viewport
                        const isInViewport = (
                            rect.top >= 0 &&
                            rect.left >= 0 &&
                            rect.bottom <= window.innerHeight &&
                            rect.right <= window.innerWidth
                        );
                        console.log('Modal in viewport:', isInViewport);
                        
                        // Force scroll to modal if needed
                        if (!isInViewport) {
                            console.warn('Modal is off-screen! Scrolling...');
                            modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                    
                    console.log('Modal opened successfully!');
                } else {
                    console.error('Modal element not found!');
                }
            } catch (error) {
                console.error('Error in addModelToTeam:', error);
                alert('Error opening Add Model dialog: ' + error.message);
            }
        }
        
        // Make functions globally accessible
        window.addModelToTeam = addModelToTeam;

        function editTeamModel(teamId, modelIndex) {
        try {
            // HACK: Show appInterface invisibly so modal works
            const appInterface = document.getElementById('appInterface');
            if (appInterface && appInterface.style.display === 'none') {
                appInterface.style.display = 'block';
                appInterface.style.position = 'absolute';
                appInterface.style.left = '-99999px';
            }
        } catch(e) { console.error('appInterface hack failed:', e); }

            database.ref(`players/${currentPlayer}/teams/${teamId}`).once('value', snapshot => {
                const team = snapshot.val();
                if (team && team.models[modelIndex]) {
                    editingTeamId = teamId;
                    editingCharacter = { teamId, modelIndex }; // Store model index instead of charId
                    
                    const model = team.models[modelIndex];
                    document.getElementById('modalTitle').textContent = 'Edit Model';
                    
                    // Populate form with model data
                    document.getElementById('charName').value = model.name || '';
                    document.getElementById('charRole').value = model.role || model.type || '';
                    document.getElementById('charPortrait').value = model.portrait || '';
                    if (window.updatePortraitPreview) {
                        window.updatePortraitPreview(model.portrait || ''); // Show preview
                    }
                    document.getElementById('charSpeed').value = model.speed || '';
                    document.getElementById('charShoot').value = model.shoot || '';
                    document.getElementById('charFight').value = model.fight || '';
                    document.getElementById('charNerve').value = model.nerve || '';
                    document.getElementById('charHealth').value = model.health || 15;
                    document.getElementById('charColor').value = model.color || generateRandomColor();
                    updateColorPreview();
                    document.getElementById('charInventory').value = Array.isArray(model.inventory) ? model.inventory.join(', ') : '';
                    document.getElementById('charNotes').value = model.notes || '';
                    
                    weaponFields = Array.isArray(model.weapons) ? model.weapons.map(w => ({...w})) : [];
                    renderWeaponFields();
                    if (weaponFields.length === 0) addWeaponField();
                    
                    consumableFields = [];
                    renderConsumableFields();
                    addConsumableField();
                    
                    specialActionFields = [];
                    renderSpecialActionFields();
                    addSpecialActionField();
                    
                    document.getElementById('characterModal').classList.add('active');
                }
            });
        }
        
        window.editTeamModel = editTeamModel;

        function deleteTeamModel(teamId, modelIndex, modelName) {
            if (confirm(`Delete ${modelName} from team?`)) {
                database.ref(`players/${currentPlayer}/teams/${teamId}`).once('value', snapshot => {
                    const team = snapshot.val();
                    if (team) {
                        team.models.splice(modelIndex, 1);
                        team.points = team.models.length * 15;
                        team.modified = Date.now();
                        
                        database.ref(`players/${currentPlayer}/teams/${teamId}`).set(team).then(() => {
                            displayTeamEditing(teamId, team);
                        });
                    }
                });
            }
        }
        
        window.deleteTeamModel = deleteTeamModel;

        function closeTeamEditing() {
            editingTeamId = null;
            document.getElementById('teamEditingArea').style.display = 'none';
            loadPlayerTeams();
        }
        
        window.closeTeamEditing = closeTeamEditing;

        function deleteTeamConfirm(teamId, teamName) {
            if (confirm(`Are you sure you want to delete "${teamName}"?`)) {
                database.ref(`players/${currentPlayer}/teams/${teamId}`).remove().then(() => {
                    alert('Team deleted successfully!');
                    loadPlayerTeams();
                });
            }
        }

        // Load Team into Session Functions
        function showLoadTeamModal() {
            if (!currentSession) {
                alert('Please join a session first!');
                return;
            }
            
            // Try to get player name from current session or localStorage
            let playerName = currentPlayer || localStorage.getItem('lastPlayerName');
            if (!playerName) {
                alert('Player name not set!');
                return;
            }
            
            // Load player's teams
            database.ref(`players/${playerName}/teams`).once('value', snapshot => {
                const teams = snapshot.val();
                const teamsList = document.getElementById('loadTeamList');
                
                if (!teams || Object.keys(teams).length === 0) {
                    teamsList.innerHTML = `<div style="text-align: center; color: #888; padding: 40px;">
                        <p>No saved teams found for player "${playerName}".</p>
                        <p style="margin-top: 10px;">Build a team first in the Team Builder!</p>
                    </div>`;
                } else {
                    teamsList.innerHTML = Object.entries(teams).map(([teamId, team]) => {
                        const faction = gameData.factions.find(f => f.name === team.faction);
                        const factionColor = faction ? faction.primaryColor : '#db8f00';
                        return `
                            <div onclick="loadTeamIntoSession('${teamId}')" style="background: rgba(${hexToRgb(factionColor)}, 0.1); padding: 20px; border-radius: 10px; border: 2px solid ${factionColor}; cursor: pointer; transition: all 0.3s;"
                                 onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 5px 15px rgba(${hexToRgb(factionColor)}, 0.3)';"
                                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                <h3 style="color: ${factionColor}; margin-bottom: 10px;">${team.name}</h3>
                                <div style="color: #9CAF88;">
                                    <div><strong>${team.faction || 'No Faction'}</strong></div>
                                    <div>${team.points} points • ${team.models.length} models</div>
                                </div>
                                <div style="color: #ccc; font-size: 13px; margin-top: 10px;">
                                    ${team.models.map(m => m.name).join(', ')}
                                </div>
                            </div>
                        `;
                    }).join('');
                }
                
                document.getElementById('loadTeamModal').classList.add('active');
            });
        }

        function closeLoadTeamModal() {
            document.getElementById('loadTeamModal').classList.remove('active');
        }

        function loadTeamIntoSession(teamId) {
            database.ref(`players/${currentPlayer}/teams/${teamId}`).once('value', snapshot => {
                const team = snapshot.val();
                if (!team) {
                    alert('Team not found!');
                    return;
                }
                
                if (!confirm(`Load "${team.name}" into session? This will replace your current characters.`)) {
                    return;
                }
                
                const teamSessionId = currentPlayer.replace(/\s/g, '_');
                const teamRef = database.ref(`sessions/${currentSession}/teams/${teamSessionId}`);
                
                // Clear existing characters first
                teamRef.child('characters').remove().then(() => {
                    // Set team with faction
                    teamRef.update({
                        owner: currentPlayer,
                        faction: team.faction
                    }).then(() => {
                        // Add each model
                        team.models.forEach((model, index) => {
                            setTimeout(() => {
                                const charId = 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                                teamRef.child(`characters/${charId}`).set({
                                    name: model.name,
                                    role: model.role || model.type || 'Warrior',
                                    maxHealth: model.health || 15,
                                    currentHealth: model.health || 15,
                                    speed: model.speed || '6"',
                                    shoot: model.shoot || '4+',
                                    fight: model.fight || '4+',
                                    nerve: model.nerve || '4+',
                                    portrait: model.portrait || '',
                                    status: 'alive',
                                    turnTaken: false,
                                    weapons: model.weapons || [],
                                    consumables: model.consumables || [],
                                    specialActions: model.specialActions || [],
                                    inventory: model.inventory || [],
                                    notes: model.notes || '',
                                    owner: currentPlayer
                                });
                            }, index * 100);
                        });
                        
                        closeLoadTeamModal();
                        alert(`Team "${team.name}" loaded successfully!`);
                    });
                });
            });
        }

        // Lore Functions
        function showLore() {
            document.getElementById('teamBuilderTab').style.display = 'none';
            document.getElementById('myTeamsTab').style.display = 'none';
            document.getElementById('loreTab').style.display = 'block';
            
            displayLoreContent();
        }

        function displayLoreContent() {
            const content = document.getElementById('loreContent');
            content.innerHTML = `
                <div style="max-width: 900px; margin: 0 auto;">

                    
                    <div style="margin-bottom: 40px; padding: 30px; background: rgba(219, 143, 0, 0.1); border-radius: 10px; border: 1px solid #db8f00;">
                        <h2 style="color: #db8f00; text-align: center; margin-bottom: 20px;">Welcome to The Reach</h2>
                        <p style="color: #ccc; line-height: 1.8;">
                            In the year 3030, humanity has spread across The Reach - a vast network of space colonies orbiting Earth. 
                            But The Reach is beset by threats from all sides: ancient enemies awakened, genetic rebellions, 
                            parasitic infections from deep space, and the horrors of Earth's blasted surface rising up.
                        </p>
                    </div>
                    
                    <h3 style="color: #db8f00; margin-top: 40px; margin-bottom: 20px; text-align: center;">Factions of The Reach</h3>
                    
                    ${gameData.factions.map(faction => `
                        <div style="margin-bottom: 30px; padding: 25px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; border: 1px solid ${faction.primaryColor};">
                            <h3 style="color: ${faction.primaryColor}; margin-bottom: 15px;">${faction.name}</h3>
                            <p style="color: #aaa; font-style: italic; margin-bottom: 15px;">${faction.loreShort}</p>
                            
                            ${faction.name === 'Arc Rangers' ? `
                                <div style="text-align: center; margin: 20px 0;">
                                    <img src="https://raw.githubusercontent.com/AndreBalmet/Space-Ops-3030-Tabletop-Tracker/refs/heads/main/AR-with-Carbines_wide.jpg" 
                                         alt="Arc Rangers" 
                                         style="max-width: 600px; width: 70%; border-radius: 8px; border: 2px solid ${faction.primaryColor}; box-shadow: 0 4px 20px rgba(156, 175, 136, 0.3);" />
                                </div>
                            ` : ''}
                            
                            <p style="color: #ccc; line-height: 1.8; white-space: pre-wrap;">${faction.loreFull}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Player Name Management
        let pendingMode = null;
        
        window.checkPlayerName = function() {
            const playerName = localStorage.getItem('spaceOpsPlayerName');
            if (playerName) {
                const display = document.getElementById('currentPlayerDisplay');
                const container = document.getElementById('playerNameDisplay');
                if (display && container) {
                    display.textContent = playerName;
                    container.style.display = 'block';
                }
                // Also update session page display if it exists
                const sessionDisplay = document.getElementById('sessionPlayerName');
                if (sessionDisplay) {
                    sessionDisplay.textContent = playerName;
                }
            }
        }
        
        window.requirePlayerName = function(mode) {
            const playerName = localStorage.getItem('spaceOpsPlayerName');
            if (!playerName) {
                // Use browser's built-in prompt for now
                const name = prompt('Enter your player name:');
                if (name && name.trim()) {
                    localStorage.setItem('spaceOpsPlayerName', name.trim());
                    localStorage.setItem('lastPlayerName', name.trim());
                    // Update all displays
                    const displays = document.querySelectorAll('#currentPlayerDisplay, #sessionPlayerName');
                    displays.forEach(el => {
                        if (el) el.textContent = name.trim();
                    });
                    selectMode(mode);
                } else {
                    alert('Player name is required');
                }
            } else {
                selectMode(mode);
            }
        }
        
        window.savePlayerName = function() {
            const playerName = document.getElementById('playerNameInput').value.trim();
            if (!playerName) {
                alert('Please enter a player name');
                return;
            }
            
            localStorage.setItem('spaceOpsPlayerName', playerName);
            localStorage.setItem('lastPlayerName', playerName); // Keep for session compatibility
            
            const display = document.getElementById('currentPlayerDisplay');
            const container = document.getElementById('playerNameDisplay');
            if (display && container) {
                display.textContent = playerName;
                container.style.display = 'block';
            }
            
            document.getElementById('playerNameModal').classList.remove('active');
            
            if (pendingMode) {
                selectMode(pendingMode);
                pendingMode = null;
            }
        }
        
        window.changePlayerName = function() {
            const currentName = localStorage.getItem('spaceOpsPlayerName') || '';
            document.getElementById('playerNameInput').value = currentName;
            document.getElementById('playerNameModal').classList.add('active');
            document.getElementById('playerNameInput').focus();
            document.getElementById('playerNameInput').select();
        }
        
        // PDF Export Function
        async function exportTeamToPDF(teamId) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Fetch team from Firebase
            const snapshot = await database.ref(`players/${currentPlayer}/teams/${teamId}`).once('value');
            const team = snapshot.val();
            
            if (!team) {
                alert('Team not found');
                return;
            }
            
            // PDF settings
            const pageWidth = 216; // mm (8.5 inches)
            const pageHeight = 279; // mm (11 inches)
            const margin = 10;
            const cardWidth = (pageWidth - margin * 4) / 3; // 3 cards per row
            const cardHeight = (pageHeight - margin * 3) / 2; // 2 rows per page
            
            let currentX = margin;
            let currentY = margin;
            let cardCount = 0;
            
            team.models.forEach((model, index) => {
                // New page after 6 cards
                if (cardCount > 0 && cardCount % 6 === 0) {
                    doc.addPage();
                    currentX = margin;
                    currentY = margin;
                }
                
                // Move to next row after 3 cards
                if (cardCount > 0 && cardCount % 3 === 0) {
                    currentX = margin;
                    currentY += cardHeight + margin;
                }
                
                // Draw card border (gray)
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.5);
                doc.rect(currentX, currentY, cardWidth, cardHeight);
                
                // Portrait box in top left corner
                const portraitSize = 15; // mm
                doc.setDrawColor(100, 100, 100);
                doc.setLineWidth(0.3);
                doc.rect(currentX + 5, currentY + 5, portraitSize, portraitSize);
                
                let yPos = currentY + 5;
                
                // Model name (next to portrait)
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0, 0, 0); // Black only
                doc.text(model.name, currentX + portraitSize + 8, yPos + 5);
                
                // Role (under name)
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(80, 80, 80); // Dark gray
                doc.text(model.role || 'Trooper', currentX + portraitSize + 8, yPos + 10);
                
                yPos = currentY + portraitSize + 10;
                
                // Max HP
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.text(`Max HP: ${model.health}  Current: ___`, currentX + 5, yPos);
                yPos += 6;
                
                // Stats header
                doc.setFontSize(7);
                doc.setTextColor(80, 80, 80);
                doc.text('SPEED  SHOOT  FIGHT  NERVE  HEALTH', currentX + 5, yPos);
                yPos += 4;
                
                // Stats values
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                const stats = `  ${model.speed}"    ${model.shoot}+     ${model.fight}+     ${model.nerve}+     ${model.health}`;
                doc.text(stats, currentX + 5, yPos);
                yPos += 7;
                
                // Status Effects
                doc.setFontSize(7);
                doc.text('Status Effects: ________________', currentX + 5, yPos);
                yPos += 5;
                
                // Special Actions
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('SPECIAL ACTIONS', currentX + 5, yPos);
                yPos += 4;
                
                doc.setFont(undefined, 'normal');
                doc.setFontSize(7);
                if (model.specialActions && model.specialActions.length > 0) {
                    model.specialActions.forEach(action => {
                        const text = doc.splitTextToSize(action, cardWidth - 10);
                        doc.text(text, currentX + 5, yPos);
                        yPos += 3.5 * text.length;
                    });
                } else {
                    doc.text('No special actions', currentX + 5, yPos);
                    yPos += 3.5;
                }
                yPos += 2;
                
                // Equipment
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.text('EQUIPMENT', currentX + 5, yPos);
                yPos += 4;
                
                doc.setFont(undefined, 'normal');
                doc.setFontSize(7);
                
                // Only show non-empty equipment with underlines for empty
                ['weapon1', 'weapon2', 'inventory1', 'inventory2'].forEach((slot, i) => {
                    const item = model[slot];
                    const label = i < 2 ? `Weapon ${i+1}` : `Inventory ${i-1}`;
                    
                    if (item && item !== 'Empty') {
                        doc.text(`${label}: ${item}`, currentX + 5, yPos);
                    } else {
                        doc.text(`${label}: _______________`, currentX + 5, yPos);
                    }
                    yPos += 3.5;
                });
                
                yPos += 2;
                
                // Notes section with 4 lines
                doc.setFontSize(8);
                doc.setFont(undefined, 'bold');
                doc.text('NOTES:', currentX + 5, yPos);
                yPos += 4;
                
                doc.setFont(undefined, 'normal');
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.2);
                for (let i = 0; i < 4; i++) {
                    doc.line(currentX + 5, yPos, currentX + cardWidth - 5, yPos);
                    yPos += 4;
                }
                
                // Move to next card position
                currentX += cardWidth + margin;
                cardCount++;
            });
            
            // Save PDF
            const fileName = `${team.owner}_${team.faction}_Team.pdf`;
            doc.save(fileName);
            
            console.log(`Exported ${team.models.length} models to PDF`);
        }

        // Initialize on page load
        window.addEventListener('load', function() {
            checkPlayerName();
            // Load saved player name
            const savedPlayerName = localStorage.getItem('lastPlayerName');
            if (savedPlayerName) {
                document.getElementById('playerName').value = savedPlayerName;
            }
            
            // Set up event delegation for My Teams editing buttons
            document.addEventListener('click', function(e) {
                // Add Model button
                if (e.target.classList.contains('team-add-model-btn')) {
                    const teamId = e.target.dataset.teamId;
                    console.log('Add Model clicked for team:', teamId);
                    addModelToTeam(teamId);
                }
                
                // Edit Model button
                if (e.target.classList.contains('model-edit-btn')) {
                    const teamId = e.target.dataset.teamId;
                    const modelIndex = parseInt(e.target.dataset.modelIndex);
                    console.log('Edit Model clicked:', teamId, modelIndex);
                    editTeamModel(teamId, modelIndex);
                }
                
                // Delete Model button
                if (e.target.classList.contains('model-delete-btn')) {
                    const teamId = e.target.dataset.teamId;
                    const modelIndex = parseInt(e.target.dataset.modelIndex);
                    const modelName = e.target.dataset.modelName;
                    console.log('Delete Model clicked:', teamId, modelIndex, modelName);
                    deleteTeamModel(teamId, modelIndex, modelName);
                }
                
                // Done button
                if (e.target.classList.contains('team-done-btn')) {
                    console.log('Done clicked');
                    closeTeamEditing();
                }
            });
            
            // Portrait drag-and-drop functionality
            const dropZone = document.getElementById('portraitDropZone');
            const portraitInput = document.getElementById('charPortrait');
            const portraitPreview = document.getElementById('portraitPreview');
            
            if (dropZone && portraitInput && portraitPreview) {
                // Prevent default drag behaviors on the drop zone
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    dropZone.addEventListener(eventName, (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }, false);
                });
                
                // Highlight drop zone when item is dragged over
                ['dragenter', 'dragover'].forEach(eventName => {
                    dropZone.addEventListener(eventName, () => {
                        dropZone.style.background = 'rgba(219, 143, 0, 0.3)';
                        dropZone.style.borderColor = '#FFD700';
                    }, false);
                });
                
                ['dragleave', 'drop'].forEach(eventName => {
                    dropZone.addEventListener(eventName, () => {
                        dropZone.style.background = 'rgba(219, 143, 0, 0.1)';
                        dropZone.style.borderColor = '#db8f00';
                    }, false);
                });
                
                // Handle dropped image
                dropZone.addEventListener('drop', (e) => {
                    const data = e.dataTransfer;
                    
                    // Try to get image URL from drag data
                    let imageUrl = '';
                    
                    // Method 1: Get from text/html (images dragged from webpages)
                    if (data.types.includes('text/html')) {
                        const html = data.getData('text/html');
                        const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
                        if (imgMatch) {
                            imageUrl = imgMatch[1];
                        }
                    }
                    
                    // Method 2: Get from text/uri-list (direct image URLs)
                    if (!imageUrl && data.types.includes('text/uri-list')) {
                        imageUrl = data.getData('text/uri-list').split('\n')[0];
                    }
                    
                    // Method 3: Get from text/plain (fallback)
                    if (!imageUrl && data.types.includes('text/plain')) {
                        const text = data.getData('text/plain');
                        if (text.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) || text.startsWith('http')) {
                            imageUrl = text;
                        }
                    }
                    
                    if (imageUrl) {
                        portraitInput.value = imageUrl;
                        updatePortraitPreview(imageUrl);
                        console.log('Image dropped:', imageUrl);
                    } else {
                        alert('Could not extract image URL. Try dragging the image directly or pasting the URL.');
                    }
                }, false);
                
                // Update preview when URL is typed/pasted
                portraitInput.addEventListener('input', () => {
                    updatePortraitPreview(portraitInput.value);
                });
                
                // Function to update portrait preview
                window.updatePortraitPreview = function(url) {
                    if (url && url.trim()) {
                        portraitPreview.style.backgroundImage = `url('${url}')`;
                        portraitPreview.style.display = 'block';
                    } else {
                        portraitPreview.style.display = 'none';
                    }
                };
            }
        });

// Auto-generated from space-ops-3030-v14.76.html
// Run: node extract-content.js to regenerate
const DEFAULT_CONTENT = {
    'landing-page': `<div class="landing-page" id="landingPage">
        <div class="landing-stripe-tl"></div>
        <div class="landing-stripe-bl"></div>
        <div class="landing-corner-line"></div>
        <div class="landing-corner-block"></div>

        <div class="landing-content">
            <img src="SpaceOps3030.png" alt="Space Ops 3030" class="landing-logo" />

            <div class="landing-menu">
                <button class="menu-button" onclick="requirePlayerName('login')">
                    Login
                </button>
                <button class="menu-button" onclick="requirePlayerName('joinsession')">
                    Join Session
                </button>
                <button class="menu-button" onclick="requirePlayerName('teambuilder')">
                    Build Team
                </button>
            </div>

            <div id="playerNameDisplay" class="landing-player-bar" style="display: none;">
                <span style="color: var(--text-muted); font-family: var(--font-heading); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Player: </span>
                <span id="currentPlayerDisplay" style="color: var(--black); font-family: var(--font-heading); font-size: 14px; font-weight: 700;"></span>
                <button onclick="changePlayerName()" class="btn btn-secondary" style="margin-left: auto; padding: 6px 12px;">Change</button>
            </div>
        </div>

        <div class="landing-footer">
            <span>&copy; 2026 Triggertype LLC. All rights reserved.</span>
        </div>
    </div>`,

    'join-tab': `<div id="joinTab" class="tab-content active">
            <div style="text-align: center; margin-bottom: 20px;">
                <button onclick="returnToLanding()" class="btn btn-secondary" style="margin-top: 30px;">← Back to Menu</button>
            </div>
            <div class="session-controls">
                <input type="text" id="sessionName" placeholder="Session Name (e.g., SpaceOps-Dec18)" />
                <input type="text" id="playerName" placeholder="Your Player Name" />
                <button class="btn btn-primary" onclick="joinSession()">Join Session</button>
                <button class="btn btn-secondary" onclick="showCreateSessionModal()">Create New Session</button>
            </div>
        </div>`,

    'sessions-tab': `<div id="sessionsTab" class="tab-content">
            <div class="filter-controls">
                <label>
                    <input type="checkbox" id="showArchived" onchange="loadAllSessions()">
                    Show Archived Sessions
                </label>
            </div>
            <div id="sessionsList" class="sessions-list"></div>
        </div>`,

    'game-tab': `<div id="gameTab" class="tab-content">
            <div id="sessionInfo" class="session-info" style="display: none;">
                <div>
                    <strong>Session:</strong> <span id="currentSession-old"></span> | 
                    <strong>PLAYER:</strong> <span id="currentPlayer-old"></span>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="btn btn-success" onclick="showLoadTeamModal()">Load Saved Team</button>
                    <button class="btn btn-info" onclick="toggleUndoPanel()">History</button>
                    <button class="btn btn-info" onclick="toggleCombatLog()">Combat Log</button>
                    <button class="btn btn-secondary" onclick="exportSession()">Export</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">Import</button>
                    <input type="file" id="importFile" accept=".json" style="display: none;" onchange="importSession(event)">
                    <button class="btn btn-secondary" onclick="leaveSession()">Leave</button>
                </div>
            </div>
            <div id="undoPanel" class="undo-section" style="display: none;">
                <h4 style="color: #4299e1; margin-bottom: 10px;">⏮ Recent Actions (Undo)</h4>
                <div id="actionHistory" class="action-history"></div>
            </div>
            <div id="combatLogPanel" class="combat-log-section" style="display: none;">
                <h4 style="color: #4299e1; margin-bottom: 10px;"> Combat Log</h4>
                <button class="btn btn-secondary" style="margin-bottom: 10px;" onclick="clearCombatLog()">Clear Log</button>
                <div id="combatLog" class="combat-log"></div>
            </div>
        </div>`,

    'tools-tab': `<div id="toolsTab" class="tab-content">
            <!-- Turn Timer -->
            <div class="timer-container">
                <h3 style="color: #db8f00; margin-bottom: 10px; text-align: center;">⏱ Turn Timer</h3>
                <div class="timer-display" id="timerDisplay">00:00</div>
                <div class="timer-controls">
                    <input type="number" id="timerMinutes" class="timer-input" placeholder="Min" min="0" max="99" value="3">
                    <input type="number" id="timerSeconds" class="timer-input" placeholder="Sec" min="0" max="59" value="0">
                    <button class="btn btn-success" onclick="startTimer()"> Start</button>
                    <button class="btn btn-warning" onclick="pauseTimer()">Pause Pause</button>
                    <button class="btn btn-danger" onclick="resetTimer()">Reset Reset</button>
                </div>
                <div style="text-align: center; margin-top: 10px; color: #9CAF88; font-size: 13px;" id="timerStatus">Ready</div>
            </div>

            <!-- Dice Roller -->
            <div class="dice-roller">
                <h3 style="color: #9f7aea; margin-bottom: 10px;"> Dice Roller</h3>
                <div class="dice-controls">
                    <button class="dice-btn" onclick="rollDice(4)">D4</button>
                    <button class="dice-btn" onclick="rollDice(6)">D6</button>
                    <button class="dice-btn" onclick="rollDice(8)">D8</button>
                    <button class="dice-btn" onclick="rollDice(10)">D10</button>
                    <button class="dice-btn" onclick="rollDice(12)">D12</button>
                    <button class="dice-btn" onclick="rollDice(20)">D20</button>
                    <button class="dice-btn" onclick="rollDice(100)">D100</button>
                    <input type="number" id="customDice" placeholder="Custom" style="width: 80px; padding: 10px; background: #1a1a2e; color: #e0e0e0; border: 1px solid #444; border-radius: 5px;">
                    <button class="dice-btn" onclick="rollDice(parseInt(document.getElementById('customDice').value) || 6)">Roll Custom</button>
                </div>
                <div id="diceResult" class="dice-result" style="display: none;">
                    <div class="dice-result-value"></div>
                    <div style="color: #a0a0a0; margin-top: 5px; font-size: 13px;"></div>
                </div>
                <div id="diceHistory" class="dice-history"></div>
            </div>

            <!-- Initiative Tracker -->
            <div class="initiative-tracker">
                <h3 style="color: #ed8936; margin-bottom: 10px;">Initiative Initiative Tracker</h3>
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button class="btn btn-success" onclick="rollInitiativeForAll()"> Roll Initiative for All</button>
                    <button class="btn btn-warning" onclick="nextTurn()"> Next Turn</button>
                    <button class="btn btn-secondary" onclick="clearInitiative()">Clear</button>
                </div>
                <div id="initiativeList" class="initiative-list"></div>
            </div>
        </div>`,

    'game-area': `<div id="gameArea" style="display: none;">
        <!-- Quick Actions Toolbar -->
        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-success" onclick="showLoadTeamModal()">Load Saved Team</button>
                <button class="btn btn-info" onclick="toggleUndoPanel()">History</button>
                <button class="btn btn-info" onclick="toggleCombatLog()">Combat Log</button>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="exportSession()">Export</button>
                <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">Import</button>
                <input type="file" id="importFile" accept=".json" style="display: none;" onchange="importSession(event)">
                <button class="btn btn-warning" onclick="showCloneSessionModal()">Clone Session</button>
                <button class="btn btn-secondary" onclick="toggleArchiveSession()"><span id="archiveButtonText">Archive Session</span></button>
                <button class="btn btn-danger" onclick="leaveSession()">Leave Session</button>
            </div>
        </div>
        
        <div id="undoPanel" class="undo-section" style="display: none;">
            <h4 style="color: #4299e1; margin-bottom: 10px;">⏮ Recent Actions (Undo)</h4>
            <div id="actionHistory" class="action-history"></div>
        </div>
        <div id="combatLogPanel" class="combat-log-section" style="display: none;">
            <h4 style="color: #4299e1; margin-bottom: 10px;"> Combat Log</h4>
            <button class="btn btn-secondary" style="margin-bottom: 10px;" onclick="clearCombatLog()">Clear Log</button>
            <div id="combatLog" class="combat-log"></div>
        </div>

        <!-- Team Summary Section -->
        <div id="teamsSummary" style="background: rgba(219, 143, 0, 0.1); padding: 8px 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #db8f00; display: none;">
            <h3 style="color: #db8f00; margin: 0 0 8px 0; font-size: 13px;">Session Overview</h3>
            <div id="teamsSummaryContent" style="display: grid; gap: 6px;"></div>
        </div>
        
        <div id="teamsContainer" class="teams-container"></div>
    </div>`,

    'transfer-modal': `<div id="transferModal" class="modal transfer-modal">
        <div class="modal-content">
            <h2 id="transferModalTitle">Reset Transfer Item</h2>
            <p style="color: #a0a0a0; margin-bottom: 20px;">Select a character to transfer this item to:</p>
            <div class="form-group">
                <label>Recipient:</label>
                <select id="transferTarget"></select>
            </div>
            <div class="form-actions">
                <button class="btn btn-purple" onclick="confirmTransfer()">Transfer</button>
                <button class="btn btn-secondary" onclick="closeTransferModal()">Cancel</button>
            </div>
        </div>
    </div>`,

    'create-session-modal': `<div id="createSessionModal" class="modal">
        <div class="modal-content">
            <h2>Create New Session</h2>
            <div class="form-group">
                <label>Session Name*</label>
                <input type="text" id="newSessionName" placeholder="e.g., SpaceOps-Dec18" />
            </div>
            <div class="form-group">
                <label>Your Player Name*</label>
                <input type="text" id="newSessionPlayerName" placeholder="Your name" />
            </div>
            <div class="form-group">
                <label>Description (optional)</label>
                <textarea id="newSessionDescription" placeholder="Brief description of this session..."></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-primary" onclick="createSession()">Create & Join</button>
                <button type="button" class="btn btn-secondary" onclick="closeCreateSessionModal()">Cancel</button>
            </div>
        </div>
    </div>`,

    'clone-session-modal': `<div id="cloneSessionModal" class="modal">
        <div class="modal-content">
            <h2>Clone Session</h2>
            <p style="margin-bottom: 20px; color: #a0a0a0;">Create a new session with all characters from the current session. All health will be reset to maximum.</p>
            <div class="form-group">
                <label>New Session Name*</label>
                <input type="text" id="cloneSessionName" placeholder="e.g., SpaceOps-Dec25" />
            </div>
            <div class="form-group">
                <label>Description (optional)</label>
                <textarea id="cloneSessionDescription" placeholder="Brief description..."></textarea>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="cloneSession()">Clone Session</button>
                <button class="btn btn-secondary" onclick="closeCloneSessionModal()">Cancel</button>
            </div>
        </div>
    </div>`,

    'status-effect-modal': `<div id="statusEffectModal" class="modal">
        <div class="modal-content">
            <h2>Add Status Effect</h2>
            <div class="form-group">
                <label>Effect Name*</label>
                <input type="text" id="statusEffectName" placeholder="e.g., Poisoned, Stunned, Buffed" />
            </div>
            <div class="form-group">
                <label>Duration (turns)</label>
                <input type="number" id="statusEffectDuration" min="1" value="3" />
            </div>
            <div class="form-group">
                <label>Description (optional)</label>
                <input type="text" id="statusEffectDesc" placeholder="e.g., -2 HP per turn" />
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="confirmStatusEffect()">Add Effect</button>
                <button class="btn btn-secondary" onclick="closeStatusEffectModal()">Cancel</button>
            </div>
        </div>
    </div>`,

    'save-template-modal': `<div id="saveTemplateModal" class="modal">
        <div class="modal-content">
            <h2>Save Character as Template</h2>
            <p style="color: #a0a0a0; margin-bottom: 20px;">Select a character to save as a reusable template:</p>
            <div class="form-group">
                <label>Select Character:</label>
                <select id="templateCharacterSelect"></select>
            </div>
            <div class="form-group">
                <label>Template Name (optional):</label>
                <input type="text" id="templateName" placeholder="Leave blank to use character name" />
            </div>
            <div class="form-actions">
                <button class="btn btn-success" onclick="confirmSaveTemplate()">Save Template</button>
                <button class="btn btn-secondary" onclick="closeSaveTemplateModal()">Cancel</button>
            </div>
        </div>
    </div>`,

    'character-modal': `<div id="characterModal" class="modal">
        <div class="modal-content">
            <h2 id="modalTitle">Add Model</h2>
            <form id="characterForm">
                <!-- Preset Selection Section -->
                <div id="presetSelectionSection" style="background: rgba(219, 143, 0, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #db8f00;">
                    <h3 style="color: #db8f00; margin-top: 0;">Quick Add from Preset</h3>
                    
                    <div class="form-group">
                        <label>Step 1: Choose Faction*</label>
                        <select id="presetFactionSelect" onchange="updateModelPresets()" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid #db8f00; color: white; border-radius: 5px;">
                            <option value="">-- Select Faction --</option>
                            <option value="Arc Rangers">Arc Rangers</option>
                            <option value="Space-Wyrm">Space-Wyrm</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="presetModelGroup" style="display: none;">
                        <label>Step 2: Choose Model Type*</label>
                        <select id="presetModelSelect" onchange="fillFormFromPreset()" style="width: 100%; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid #db8f00; color: white; border-radius: 5px;">
                            <option value="">-- Select Model --</option>
                        </select>
                    </div>
                    
                    <p style="color: #9CAF88; font-size: 13px; margin: 10px 0 0 0;">Or scroll down to create a custom model</p>
                </div>
                
                <h3 style="color: #db8f00; margin: 20px 0 10px 0;">Model Details</h3>
                <div class="form-group">
                    <label>Character Name*</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="charName" required style="flex: 1;" />
                        <button type="button" class="btn btn-secondary" onclick="generateRandomName()" style="padding: 8px 12px; white-space: nowrap;">🎲 Random</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Role/Class</label>
                    <input type="text" id="charRole" placeholder="e.g., Space Marine Captain" />
                </div>
                <div class="form-group">
                    <label>Portrait Image</label>
                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <div style="flex: 1;">
                            <input type="url" id="charPortrait" placeholder="Paste URL or drag image here..." style="margin-bottom: 5px;" />
                            <div id="portraitDropZone" style="border: 2px dashed #db8f00; border-radius: 5px; padding: 20px; text-align: center; background: rgba(219, 143, 0, 0.1); cursor: pointer; min-height: 80px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: #9CAF88; font-size: 13px;">🖼️ Drag image from web browser here<br>or paste URL above</span>
                            </div>
                        </div>
                        <div id="portraitPreview" style="width: 100px; height: 100px; border: 2px solid #db8f00; border-radius: 5px; background: rgba(0,0,0,0.3); display: none; background-size: cover; background-position: center;"></div>
                    </div>
                </div>
                
                <h3 style="color: #ff6b35; margin: 20px 0 10px 0;">Stats</h3>
                <div class="form-group">
                    <label>Speed</label>
                    <input type="text" id="charSpeed" placeholder="e.g., 6&quot;" />
                </div>
                <div class="form-group">
                    <label>Shoot</label>
                    <input type="text" id="charShoot" placeholder="e.g., 4+" />
                </div>
                <div class="form-group">
                    <label>Fight</label>
                    <input type="text" id="charFight" placeholder="e.g., 3+" />
                </div>
                <div class="form-group">
                    <label>Nerve</label>
                    <input type="text" id="charNerve" placeholder="e.g., 4+" />
                </div>
                <div class="form-group">
                    <label>Health*</label>
                    <input type="number" id="charHealth" required min="1" value="15" />
                </div>
                
                <div class="form-group">
                    <label>Model Color</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="color" id="charColor" value="#FF6B6B" onchange="updateColorPreview()" style="width: 60px; height: 40px; border: none; border-radius: 5px; cursor: pointer;" />
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('charColor').value = generateRandomColor(); updateColorPreview();" style="padding: 8px 15px;">Random Color</button>
                        <div id="colorPreview" style="width: 40px; height: 40px; border-radius: 50%; background: #FF6B6B; border: 2px solid #fff;"></div>
                    </div>
                </div>

                <h3 style="color: #ff6b35; margin: 20px 0 10px 0;">Weapons</h3>
                <div class="weapons-form-section">
                    <div id="weaponsFormList"></div>
                    <button type="button" class="btn btn-success" onclick="addWeaponField()">+ Add Weapon</button>
                </div>

                <h3 style="color: #48bb78; margin: 20px 0 10px 0;">Consumable Items</h3>
                <div class="consumables-form-section">
                    <div id="consumablesFormList"></div>
                    <button type="button" class="btn btn-success" onclick="addConsumableField()">+ Add Consumable</button>
                </div>

                <h3 style="color: #db8f00; margin: 20px 0 10px 0;">Special Actions</h3>
                <div class="consumables-form-section">
                    <div id="specialActionsFormList"></div>
                    <button type="button" class="btn btn-success" onclick="addSpecialActionField()">+ Add Special Action</button>
                </div>

                <div class="form-group">
                    <label>Inventory (comma-separated)</label>
                    <textarea id="charInventory" placeholder="Medkit, Ammo, Tools"></textarea>
                </div>

                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="charNotes" placeholder="Special abilities, conditions, reminders..."></textarea>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Save Character</button>
                    <button type="button" class="btn btn-secondary" onclick="closeCharacterModal()">Cancel</button>
                </div>
            </form>
        </div>
    </div>`,

    'player-name-modal': `<div id="playerNameModal" class="modal">
        <div class="modal-content">
            <h2>Enter Your Player Name</h2>
            <p style="color: #aaa; margin-bottom: 20px;">Your player name is required to join sessions and build teams.</p>
            <input type="text" id="playerNameInput" placeholder="Enter your name" style="width: 100%; padding: 12px; font-size: 13px; margin-bottom: 20px; background: #2a2a2a; border: 2px solid #db8f00; color: white; border-radius: 5px;" />
            <div class="form-actions">
                <button class="btn btn-primary" onclick="savePlayerName()">Save</button>
            </div>
        </div>
    </div>`,

    'campaign-section': `<div id="campaignSection" style="background: rgba(156, 175, 136, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #9CAF88; display: none;">
            <!-- Campaign Name -->
            <div style="margin-bottom: 12px; position: relative;">
                <h2 id="campaignNameDisplay" style="color: #9CAF88; margin: 0; cursor: pointer; text-align: center;" onclick="editCampaignName()" title="Click to edit">Campaign Name</h2>
                <button class="btn btn-secondary" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); padding: 4px 10px; font-size: 12px;" onclick="editCampaignName()">Edit</button>
            </div>
            
            <!-- Campaign Description -->
            <div style="margin-bottom: 12px; position: relative;">
                <p id="campaignDescDisplay" style="color: #ccc; margin: 0; cursor: pointer; font-size: 0.95em; line-height: 1.4; text-align: center; padding: 0 60px;" onclick="editCampaignDescription()" title="Click to edit">Click to add campaign description...</p>
                <button class="btn btn-secondary" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); padding: 4px 10px; font-size: 12px;" onclick="editCampaignDescription()">Edit</button>
            </div>
            
            <!-- Objectives Section -->
            <div id="objectivesSection">
                <div style="position: relative; margin-bottom: 8px;">
                    <h3 style="color: #9CAF88; margin: 0; font-size: 13px; text-align: center;">Objectives</h3>
                    <div style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); display: flex; gap: 5px;">
                        <button class="btn btn-success" style="padding: 4px 10px; font-size: 12px;" onclick="addObjective()">+ Add</button>
                        <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="toggleObjectivesCollapse()">Toggle</button>
                    </div>
                </div>
                <div id="objectivesList" style="margin-top: 8px;"></div>
            </div>
        </div>`,

    'tutorial-overlay': `<div class="tutorial-overlay" id="tutorialOverlay"></div>
    <div class="tutorial-spotlight" id="tutorialSpotlight"></div>
    <div class="tutorial-arrow" id="tutorialArrow"></div>
    <div class="tutorial-modal" id="tutorialModal" style="display: none;">
        <h2 id="tutorialTitle">Welcome!</h2>
        <p id="tutorialText">Let's get you started with Space Ops 3030!</p>
        <div class="tutorial-progress" id="tutorialProgress"></div>
        <div class="tutorial-buttons">
            <button class="btn btn-secondary" onclick="skipTutorial()">Skip Tutorial</button>
            <button class="btn btn-primary" onclick="nextTutorialStep()" id="tutorialNextBtn">Next →</button>
        </div>
    </div>
    <div class="help-tooltip" id="helpTooltip"></div>`,

    'team-builder': `<div id="teamBuilderTab" class="tab-content" style="display: none;">
        <div class="logo-header">
            <img src="https://raw.githubusercontent.com/AndreBalmet/Space-Ops-3030-Tabletop-Tracker/refs/heads/main/Logo_Wide_wht_c6376661-fc72-45af-ae4c-9b56e7802930.png" 
                 alt="Space Ops 3030" />
        </div>
        <div style="display: flex; gap: 15px; justify-content: center; margin: 20px 0;">
            
            <button onclick="showMyTeams()" class="btn btn-secondary">My Teams</button>
        </div>
        <h2 style="color: #db8f00; text-align: center; margin: 20px 0;">Team Builder</h2>
        <div id="teamBuilderContent"></div>
    </div>`,

    'my-teams': `<div id="myTeamsTab" class="tab-content" style="display: none;">
        <div class="logo-header">
            <img src="https://raw.githubusercontent.com/AndreBalmet/Space-Ops-3030-Tabletop-Tracker/refs/heads/main/Logo_Wide_wht_c6376661-fc72-45af-ae4c-9b56e7802930.png" 
                 alt="Space Ops 3030" />
        </div>
        <h2 style="color: #db8f00; text-align: center; margin: 30px 0 20px 0;">My Teams</h2>
        
        <!-- Current Player Info -->
        <div id="currentPlayerInfo" style="background: rgba(219, 143, 0, 0.1); padding: 12px 20px; border-radius: 8px; margin: 0 auto 20px auto; max-width: 600px; border: 1px solid #db8f00; display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="color: #9CAF88; font-size: 13px;">CURRENT PLAYER:</span>
                    <strong id="currentPlayerDisplay" style="color: #db8f00; margin-left: 8px; font-size: 13px;"></strong>
                </div>
                <button onclick="changePlayer()" class="btn btn-secondary" style="padding: 6px 15px; font-size: 13px;">Change Player</button>
            </div>
        </div>
        
        <div id="myTeamsContent"></div>
    </div>`,

    'load-team-modal': `<div id="loadTeamModal" class="modal">
        <div class="modal-content">
            <h2>Load Saved Team into Session</h2>
            <p style="color: #aaa; margin-bottom: 20px;">Select a team to load into the current session. This will replace your current characters.</p>
            <div id="loadTeamList" style="display: grid; gap: 15px; max-height: 400px; overflow-y: auto;">
                <!-- Teams will be loaded here -->
            </div>
            <div class="form-actions" style="margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeLoadTeamModal()">Cancel</button>
            </div>
        </div>
    </div>`,

    'faction-selector': `<div style="padding: 20px;">
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
</div>`,

    'team-building-interface': `<div style="padding: 20px;">
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
</div>`,

    'quick-play-menu': `<div style="padding: 20px; text-align: center;">
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
</div>`,

    'quick-build-interface': `<div style="padding: 20px; text-align: center;">
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
</div>`,

    'quick-team-preview': `<div style="padding: 20px;">
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
</div>`,

};

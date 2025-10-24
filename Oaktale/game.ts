import { Character, CharacterClass, Enemy, GameLocation, Skill, Item, Equipment, EquipmentSlot, ItemRarity, Blueprint, SkillTome } from './types';
import * as dom from './dom';
import * as ui from './ui';
import { soundManager, SOUNDS } from './sound';
import { CHARACTER_CLASSES, CHARACTER_PORTRAITS, CLASS_SKILLS, TOWN_NAME_PREFIXES, TOWN_NAME_SUFFIXES, ITEMS, ENEMIES, LOCATIONS, RARITY_DATA, BLUEPRINTS, UNIVERSAL_SKILLS } from './data';
import { openSettingsModal, openShopModal } from './ui';

// --- GAME STATE ---
interface GameState {
    characters: Character[];
    selectedCharacter: Character | null;
    currentLocation: GameLocation;
    currentTownName: string;
    inCombat: boolean;
    currentEnemy: Enemy | null;
    playerTurn: boolean;
    log: string[];
    isGameOver: boolean;
    currentArtisanBlueprints: Blueprint[];
}

export let gameState: GameState = {
    characters: [],
    selectedCharacter: null,
    currentLocation: 'main-menu',
    currentTownName: 'Oakhaven',
    inCombat: false,
    currentEnemy: null,
    playerTurn: true,
    log: [],
    isGameOver: false,
    currentArtisanBlueprints: [],
};


// --- GAME LOGIC ---
let currentShopInventory: { item: Item | Equipment, cost: number }[] = [];

// --- HELPER FUNCTIONS ---
function generateTownName(): string {
    const prefix = TOWN_NAME_PREFIXES[Math.floor(Math.random() * TOWN_NAME_PREFIXES.length)];
    const suffix = TOWN_NAME_SUFFIXES[Math.floor(Math.random() * TOWN_NAME_SUFFIXES.length)];
    return prefix + suffix;
}

function getSkillData(skillId: string): Skill | undefined {
    const universalSkill = UNIVERSAL_SKILLS.find(s => s.id === skillId);
    if (universalSkill) return universalSkill;

    if (gameState.selectedCharacter) {
        const classSkill = CLASS_SKILLS[gameState.selectedCharacter.name].find(s => s.id === skillId);
        if (classSkill) return classSkill;
    }
    return undefined;
}

function calculateXpToNextLevel(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

function updateCharacterStats(character: Character) {
    let hpBonus = 0;
    let atkBonus = 0;
    Object.values(character.equipment).forEach(item => {
        if (item) {
            hpBonus += item.hpBonus || 0;
            atkBonus += item.atkBonus || 0;
        }
    });
    character.maxHp = character.baseHp + hpBonus;
    character.atk = character.baseAtk + atkBonus;
    if (character.hp > character.maxHp) {
        character.hp = character.maxHp;
    }
}

export function calculateDamage(attacker: Character | Enemy, target: Character | Enemy, baseDamage: number, armorPierce = 0): number {
    let finalDamage = baseDamage;
    const attackUp = attacker.buffs.find(b => b.id === 'attack_up');
    if (attackUp) finalDamage *= (1 + attackUp.value!);
    const attackDown = attacker.buffs.find(b => b.id === 'attack_down');
    if (attackDown) finalDamage *= (1 - attackDown.value!);
    const vulnerable = target.buffs.find(b => b.id === 'vulnerable');
    if (vulnerable) finalDamage *= 1.5;
    const defenseUp = target.buffs.find(b => b.id === 'defense_up');
    if (defenseUp) finalDamage *= (1 - (defenseUp.value! * (1 - armorPierce)));
    const damageReduction = target.buffs.find(b => b.id === 'damage_reduction');
    if (damageReduction) finalDamage *= (1 - damageReduction.value!);
    const identifiedWeakness = target.buffs.find(b => b.id === 'identified_weakness');
    if (identifiedWeakness) finalDamage *= (1 + identifiedWeakness.value!);

    const blind = attacker.buffs.find(b => b.id === 'blind');
    if (blind && Math.random() < blind.value!) {
        return 0; // Miss
    }

    return Math.max(1, Math.round(finalDamage));
}

export function applyDamage(target: Character | Enemy, damage: number): { damageDealt: number; log: string } {
    if (target.buffs.some(b => b.id === 'invulnerable')) {
        return { damageDealt: 0, log: `${target.name} is immune to damage!` };
    }
    
    const isPlayer = 'xp' in target; // Check if target is Character
    const focused = isPlayer ? (target as Character).buffs.find(b => b.id === 'focused_assault') : undefined;

    const evasion = target.buffs.find(b => b.id === 'evasion');
    if (evasion && !focused && Math.random() < evasion.value!) {
        return { damageDealt: 0, log: `${target.name} dodged the attack!` };
    }
    let damageDealt = damage;
    let logMessage = '';
    if (target.shield > 0) {
        const damageToShield = Math.min(target.shield, damageDealt);
        target.shield -= damageToShield;
        damageDealt -= damageToShield;
        logMessage += ` The shield absorbs ${damageToShield} damage.`;
    }

    const hpBefore = target.hp;
    target.hp -= damageDealt;
    
    // Second Wind Passive Check
    if (isPlayer) {
        const player = target as Character;
        if (!player.secondWindUsedThisCombat && player.skills.includes('second_wind') && hpBefore / player.maxHp >= 0.5 && player.hp / player.maxHp < 0.5) {
            player.secondWindUsedThisCombat = true;
            const healAmount = Math.floor(player.maxHp * 0.15);
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            addLogMessage(`Second Wind activates, healing you for ${healAmount} HP!`);
            ui.showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
        }
    }

    if (target.hp < 0) target.hp = 0;
    soundManager.play(SOUNDS.DAMAGE);
    return { damageDealt, log: logMessage };
}

function addLogMessage(message: string) {
    gameState.log.unshift(message);
    if (gameState.log.length > 20) {
        gameState.log.pop();
    }
    if (dom.actionLog) ui.renderActionLog();
}

function saveGame() {
    localStorage.setItem('rpgGameState', JSON.stringify(gameState));
}

function loadGame(): boolean {
    const savedState = localStorage.getItem('rpgGameState');
    if (savedState) {
        try {
            const loadedState = JSON.parse(savedState);
             // Add new properties to the loaded state if they don't exist
            gameState = {
                ...{ currentArtisanBlueprints: [], secondWindUsedThisCombat: false, extraTurn: false }, // Defaults for new properties
                ...loadedState,
            };
            return true;
        } catch (e) {
            console.error("Failed to parse saved game state:", e);
            localStorage.removeItem('rpgGameState');
            return false;
        }
    }
    return false;
}

function newGame() {
    gameState = {
        characters: [], selectedCharacter: null, currentLocation: 'main-menu', currentTownName: 'Oakhaven',
        inCombat: false, currentEnemy: null, playerTurn: true, log: [], isGameOver: false, currentArtisanBlueprints: [],
    };
    (Object.keys(CHARACTER_CLASSES) as CharacterClass[]).forEach(className => {
        createCharacter(className);
    });
    dom.mainMenu.classList.add('hidden');
    dom.characterSelectionScreen.classList.remove('hidden');

    let selectedName: CharacterClass | null = null;
    ui.renderCharacterSelection(gameState.characters, (name) => {
        selectedName = name;
        dom.startGameBtn.disabled = false;
        soundManager.play(SOUNDS.CLICK);
    });
    
    dom.startGameBtn.onclick = () => {
        if (selectedName) {
            soundManager.play(SOUNDS.SELECT);
            const character = gameState.characters.find(c => c.name === selectedName);
            if (character) {
                gameState.selectedCharacter = character;
                changeLocation('crossroads');
                addLogMessage(`Your journey as a ${character.name} begins. You find yourself at a crossroads.`);
                dom.characterSelectionScreen.classList.add('hidden');
                dom.gameContainer.classList.remove('hidden');
                ui.renderAll(handlers);
                saveGame();
            }
        }
    };
}

function createCharacter(className: CharacterClass) {
    const classData = CHARACTER_CLASSES[className];
    const level = 1;
    const xpToNextLevel = calculateXpToNextLevel(level);
    const character: Character = {
        ...classData, portrait: CHARACTER_PORTRAITS[className], level: level, xp: 0,
        xpToNextLevel: xpToNextLevel, hp: classData.baseHp, maxHp: classData.baseHp, atk: classData.baseAtk,
        skills: CLASS_SKILLS[className].filter(s => s.levelRequired === 1).map(s => s.id),
        skillPoints: 0, inventory: { healthPotion: 3 }, equipment: { Weapon: null, Armor: null, Accessory: null },
        gold: 10, buffs: [], shield: 0, secondWindUsedThisCombat: false, extraTurn: false
    };
    gameState.characters.push(character);
}

function changeLocation(location: GameLocation) {
    const player = gameState.selectedCharacter!;
    const destination = LOCATIONS[location];

    if (player.level < destination.levelRequirement) {
        addLogMessage(`You are not strong enough to enter ${destination.name}. (Requires Level ${destination.levelRequirement})`);
        return;
    }

    if (location === 'town') {
        gameState.currentTownName = generateTownName();
        generateArtisanInventory();
    }
    gameState.currentLocation = location;
    const locationDisplayName = location === 'town' ? gameState.currentTownName : destination.name;
    addLogMessage(`You have arrived at ${locationDisplayName}.`);
    ui.renderAll(handlers);
    saveGame();
}

function handleLocationAction(actionId: string) {
    soundManager.play(SOUNDS.CLICK);
    const player = gameState.selectedCharacter!;
    if (actionId.startsWith('go-')) {
        changeLocation(actionId.substring(3) as GameLocation);
        return;
    }
    switch(actionId) {
        case 'explore': explore(); break;
        case 'rest':
            if (player.gold >= 5) {
                player.gold -= 5;
                player.hp = player.maxHp;
                addLogMessage(`You rest at the inn. Your health is fully restored.`);
                soundManager.play(SOUNDS.HEAL);
                ui.renderAll(handlers);
                saveGame();
            } else {
                addLogMessage('You don\'t have enough gold to rest.');
            }
            break;
        case 'shop': handleOpenShop(); break;
        case 'artisan': ui.openArtisanModal(handleCraftItem); break;
    }
}

function explore() {
    const location = LOCATIONS[gameState.currentLocation];
    if (!location.encounters) {
        addLogMessage("You find nothing of interest.");
        return;
    }
    const random = Math.random();
    let cumulativeChance = 0;
    const encountered = location.encounters.find(enc => {
        cumulativeChance += enc.chance;
        return random <= cumulativeChance;
    });
    if (encountered) {
        startCombat(encountered.enemyId);
    } else {
        addLogMessage("You explore the area but find nothing.");
        ui.renderAll(handlers);
    }
}

function startCombat(enemyId: string) {
    const enemyData = ENEMIES[enemyId];
    if (!enemyData) return;
    gameState.inCombat = true;
    gameState.playerTurn = true;
    gameState.currentEnemy = { ...enemyData, hp: enemyData.maxHp, buffs: [], shield: 0 };
    const player = gameState.selectedCharacter!;
    player.buffs = [];
    player.shield = 0;
    player.secondWindUsedThisCombat = false;
    player.extraTurn = false;
    addLogMessage(`A wild ${enemyData.name} appears!`);
    soundManager.play(SOUNDS.SELECT);
    dom.characterPanel.classList.add('disabled');
    dom.inventoryDisplay.classList.add('hidden');
    ui.renderAll(handlers);
}

export function endCombat(win: boolean, message?: string) {
    const player = gameState.selectedCharacter!;
    const enemy = gameState.currentEnemy!;
    if (win) {
        soundManager.play(SOUNDS.WIN);
        addLogMessage(message || `You have defeated the ${enemy.name}!`);
        player.gold += enemy.drops.gold;
        addLogMessage(`You found ${enemy.drops.gold} gold.`);
        enemy.drops.items.forEach(drop => {
            if (Math.random() < drop.chance) {
                player.inventory[drop.itemId] = (player.inventory[drop.itemId] || 0) + 1;
                addLogMessage(`The enemy dropped a ${ITEMS[drop.itemId].name}!`);
            }
        });
        gainXP(enemy.xpValue);
    } else {
        if (!message) { // Don't play lose sound if they just fled
            soundManager.play(SOUNDS.LOSE);
            addLogMessage(`You have been defeated by the ${enemy.name}...`);
            player.hp = 1;
            changeLocation('town');
        } else {
            addLogMessage(message);
        }
    }
    gameState.inCombat = false;
    gameState.currentEnemy = null;
    dom.characterPanel.classList.remove('disabled');
    ui.renderAll(handlers);
    saveGame();
}

export function processTurn(actionLog: string) {
    addLogMessage(actionLog);
    const player = gameState.selectedCharacter!;

    // Adrenaline Rush Check
    if (player.extraTurn) {
        player.extraTurn = false;
        applyBuffs(player);
        ui.renderAll(handlers);
        if (checkCombatEnd()) return;
        // Player gets another turn, so we don't switch
        return;
    }

    if (checkCombatEnd()) return;
    gameState.playerTurn = !gameState.playerTurn;
    if (!gameState.playerTurn) {
        setTimeout(enemyTurn, 1000);
    } else {
        applyBuffs(gameState.selectedCharacter!);
        ui.renderAll(handlers);
        if (checkCombatEnd()) return;
        if(gameState.selectedCharacter?.buffs.find(b => b.id === 'stun')) {
            addLogMessage("You are stunned and cannot act!");
            setTimeout(() => processTurn('Your turn is skipped.'), 500);
        }
    }
}

function playerAttack() {
    if (!gameState.playerTurn) return;
    dom.combatControlsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
    soundManager.play(SOUNDS.ATTACK);
    ui.triggerAnimation('player-combatant-card', 'animate-attack');
    const player = gameState.selectedCharacter!;
    const enemy = gameState.currentEnemy!;
    const damage = applyDamage(enemy, calculateDamage(player, enemy, player.atk));

    const echoBuff = player.buffs.find(b => b.id === 'echo_strike');
    if (echoBuff) {
        player.buffs = player.buffs.filter(b => b.id !== 'echo_strike');
    }

    setTimeout(() => {
        ui.triggerAnimation('enemy-combatant-card', 'animate-hit');
        ui.showDamagePopup('enemy-combatant-card', damage.damageDealt > 0 ? `${damage.damageDealt}` : 'MISS', damage.damageDealt > 0 ? 'damage' : 'miss');
        
        if (echoBuff) {
            const echoDamage = applyDamage(enemy, calculateDamage(player, enemy, Math.floor(player.atk * 0.5)));
             setTimeout(() => {
                ui.showDamagePopup('enemy-combatant-card', echoDamage.damageDealt > 0 ? `${echoDamage.damageDealt}` : 'MISS', 'damage');
                processTurn(`${player.name} attacks! ${damage.log} It deals ${damage.damageDealt} damage, then echoes for ${echoDamage.damageDealt} more.`);
            }, 300);
        } else {
            processTurn(`${player.name} attacks! ${damage.log} It deals ${damage.damageDealt} damage.`);
        }
    }, 300);
}

function playerUseSkill(skill: Skill) {
    if (!gameState.playerTurn) return;
    // Don't disable buttons for passive skills
    if (skill.id === 'second_wind') {
        addLogMessage("Second Wind is a passive skill and triggers automatically.");
        return;
    }
    // Prevent using once-per-combat skills multiple times
    if ((skill.id === 'adrenaline_rush' || skill.id === 'rejuvenating_draught') && gameState.selectedCharacter?.buffs.some(b => b.name === 'Rushed' || b.name === 'Draught Used')) {
        addLogMessage(`You can only use ${skill.name} once per battle.`);
        return;
    }
    
    dom.combatControlsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
    soundManager.play(SOUNDS.SELECT);
    const player = gameState.selectedCharacter!;
    const enemy = gameState.currentEnemy!;
    const log = skill.action(player, enemy);
    
    // Flee doesn't follow normal turn processing
    if (skill.id === 'flee' && log.includes("successfully escaped")) {
        return;
    }
    
    processTurn(log);
}

function openCombatItemModal() {
    const player = gameState.selectedCharacter!;
    const consumables = Object.keys(player.inventory).filter(id => ITEMS[id].type === 'Consumable' && player.inventory[id] > 0);
    if (consumables.length === 0) {
        addLogMessage("You have no consumable items to use.");
        return;
    }
    dom.combatItemModal.classList.remove('hidden');
    const list = dom.getElement('combat-items-list');
    list.innerHTML = consumables.map(id => `
        <div class="combat-item-option" data-item-id="${id}">
            <h4>${ITEMS[id].name} (x${player.inventory[id]})</h4>
            <p>${ITEMS[id].description}</p>
        </div>
    `).join('');
    list.querySelectorAll('.combat-item-option').forEach(el => {
        el.addEventListener('click', () => {
            const itemId = (el as HTMLElement).dataset.itemId!;
            playerUseItem(itemId);
            dom.combatItemModal.classList.add('hidden');
        });
    });
    dom.getElement('close-combat-item-btn').onclick = () => dom.combatItemModal.classList.add('hidden');
}

function playerUseItem(itemId: string) {
    if (!gameState.playerTurn) return;
    dom.combatControlsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
    const player = gameState.selectedCharacter!;
    player.inventory[itemId]--;
    let logMsg = `You use a ${ITEMS[itemId].name}.`;
    switch(itemId) {
        case 'healthPotion':
            const healAmount = 50;
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            ui.triggerAnimation('player-combatant-card', 'animate-heal');
            ui.showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            logMsg += ` You restore ${healAmount} HP.`;
            break;
        case 'strengthPotion':
            player.buffs.push({ id: 'attack_up', name: 'Strengthened', duration: 3, value: 0.3 });
            logMsg += ` Your attack is increased.`;
            break;
    }
    processTurn(logMsg);
}

function enemyTurn() {
    applyBuffs(gameState.currentEnemy!);
    ui.renderAll(handlers);
    if (checkCombatEnd()) return;
    const enemy = gameState.currentEnemy!;
    const player = gameState.selectedCharacter!;
    if (enemy.buffs.find(b => b.id === 'stun')) {
        processTurn(`${enemy.name} is stunned and cannot act.`);
        return;
    }

    const enemyAction = () => {
        soundManager.play(SOUNDS.ATTACK);
        ui.triggerAnimation('enemy-combatant-card', 'animate-attack');
        const damage = applyDamage(player, calculateDamage(enemy, player, enemy.atk));
        setTimeout(() => {
            ui.triggerAnimation('player-combatant-card', 'animate-hit');
            ui.showDamagePopup('player-combatant-card', damage.damageDealt > 0 ? `${damage.damageDealt}` : 'MISS', damage.damageDealt > 0 ? 'damage' : 'miss');
            
            const retaliation = player.buffs.find(b => b.id === 'retaliation');
            if (retaliation && damage.damageDealt > 0) {
                 setTimeout(() => {
                    const counterDamage = applyDamage(enemy, calculateDamage(player, enemy, Math.floor(player.atk * retaliation.value!)));
                    ui.triggerAnimation('player-combatant-card', 'animate-attack');
                    ui.triggerAnimation('enemy-combatant-card', 'animate-hit');
                    ui.showDamagePopup('enemy-combatant-card', `${counterDamage.damageDealt}`, 'damage');
                    addLogMessage(`${player.name} retaliates for ${counterDamage.damageDealt} damage!`);
                 }, 400);
            }

            processTurn(`${enemy.name} attacks! ${damage.log} It deals ${damage.damageDealt} damage.`);
        }, 300);
    }
    
    if (enemy.skill && enemy.hp / enemy.maxHp < 0.5 && Math.random() < 0.5) {
        const log = enemy.skill.action(enemy, player);
        processTurn(log);
    } else {
        enemyAction();
    }
}

function applyBuffs(target: Character | Enemy) {
    let turnLog = '';
    target.buffs = target.buffs.filter(buff => {
        if (['bleed', 'poison', 'burn'].includes(buff.id)) {
            const dotDamage = buff.value || 0;
            target.hp = Math.max(0, target.hp - dotDamage);
            turnLog += `${target.name} takes ${dotDamage} ${buff.name} damage. `;
            ui.showDamagePopup(target === gameState.selectedCharacter ? 'player-combatant-card' : 'enemy-combatant-card', `${dotDamage}`, 'damage');
        }
        if (buff.id === 'health_regen') {
            const healAmount = buff.value || 0;
            target.hp = Math.min(target.maxHp, target.hp + healAmount);
            turnLog += `${target.name} recovers ${healAmount} HP from ${buff.name}. `;
            ui.showDamagePopup(target === gameState.selectedCharacter ? 'player-combatant-card' : 'enemy-combatant-card', `+${healAmount}`, 'heal');
        }
        buff.duration--;
        return buff.duration > 0;
    });
    if (turnLog) addLogMessage(turnLog.trim());
}

function checkCombatEnd(): boolean {
    if (gameState.selectedCharacter!.hp <= 0) {
        endCombat(false);
        return true;
    }
    if (gameState.currentEnemy!.hp <= 0) {
        endCombat(true);
        return true;
    }
    return false;
}

function gainXP(amount: number) {
    const player = gameState.selectedCharacter!;
    player.xp += amount;
    addLogMessage(`You gain ${amount} XP.`);
    while (player.xp >= player.xpToNextLevel) {
        player.xp -= player.xpToNextLevel;
        levelUp();
    }
}

function levelUp() {
    const player = gameState.selectedCharacter!;
    player.level++;
    player.skillPoints++;
    player.xpToNextLevel = calculateXpToNextLevel(player.level);
    player.baseHp += Math.round(CHARACTER_CLASSES[player.name].baseHp * 0.1);
    player.baseAtk += Math.round(CHARACTER_CLASSES[player.name].baseAtk * 0.1);
    updateCharacterStats(player);
    player.hp = player.maxHp;
    soundManager.play(SOUNDS.LEVEL_UP);
    addLogMessage(`${player.name} has reached Level ${player.level}!`);
    openLevelUpModal();
}

function openLevelUpModal() {
    const player = gameState.selectedCharacter!;
    const availableSkills = CLASS_SKILLS[player.name].filter(s => !player.skills.includes(s.id) && s.levelRequired <= player.level);
    if (availableSkills.length === 0 || player.skillPoints === 0) {
        addLogMessage("No new skills available at this level.");
        return;
    }
    dom.levelUpModal.classList.remove('hidden');
    const skillSelection = dom.getElement('skill-selection');
    skillSelection.innerHTML = availableSkills.map(skill => `
        <div class="skill-option" data-skill-id="${skill.id}">
            <h4>${skill.name}</h4>
            <p>${skill.description}</p>
        </div>
    `).join('');
    let selectedSkillId: string | null = null;
    skillSelection.querySelectorAll('.skill-option').forEach(el => {
        el.addEventListener('click', () => {
            skillSelection.querySelectorAll('.skill-option').forEach(opt => opt.classList.remove('selected'));
            el.classList.add('selected');
            selectedSkillId = (el as HTMLElement).dataset.skillId!;
        });
    });
    dom.getElement('confirm-skill-btn').onclick = () => {
        if (selectedSkillId) {
            player.skills.push(selectedSkillId);
            player.skillPoints--;
            dom.levelUpModal.classList.add('hidden');
            const learnedSkill = CLASS_SKILLS[player.name].find(s => s.id === selectedSkillId);
            addLogMessage(`You learned ${learnedSkill?.name || selectedSkillId}!`);
            ui.renderAll(handlers);
            saveGame();
        }
    };
}

function generateShopInventory() {
    currentShopInventory = [];
    if (!gameState.selectedCharacter) return;
    const playerLevel = gameState.selectedCharacter.level;
    const numItems = Math.min(6, 4 + Math.floor(playerLevel / 5));
    const itemPool = Object.values(ITEMS).filter(item => item.type !== 'Material' && item.type !== 'SkillTome' && item.rarity !== 'Legendary');
    const rarityPools = {
        Common: itemPool.filter(i => i.rarity === 'Common'),
        Uncommon: itemPool.filter(i => i.rarity === 'Uncommon'),
        Rare: itemPool.filter(i => i.rarity === 'Rare'),
        Epic: itemPool.filter(i => i.rarity === 'Epic'),
    };
    const itemsForSale: (Item | Equipment)[] = [];
    const addedItemIds = new Set<string>();
    for (let i = 0; i < numItems; i++) {
        const rand = Math.random();
        let chosenRarity: ItemRarity | null = null;
        const epicChance = playerLevel >= 10 ? 0.05 : 0;
        const rareChance = playerLevel >= 5 ? 0.15 : 0;
        const uncommonChance = 0.40;
        if (rand < epicChance && rarityPools.Epic.length > 0) chosenRarity = 'Epic';
        else if (rand < epicChance + rareChance && rarityPools.Rare.length > 0) chosenRarity = 'Rare';
        else if (rand < epicChance + rareChance + uncommonChance && rarityPools.Uncommon.length > 0) chosenRarity = 'Uncommon';
        else chosenRarity = 'Common';
        const pool = rarityPools[chosenRarity];
        if (pool.length === 0) {
            if (i > 0) i--;
            continue;
        }
        const item = pool[Math.floor(Math.random() * pool.length)];
        if (item && !addedItemIds.has(item.id)) {
            itemsForSale.push(item);
            addedItemIds.add(item.id);
        } else if (i > 0) {
             i--;
        }
    }
    currentShopInventory = itemsForSale.map(item => {
        const cost = Math.floor(item.baseCost * (1 + (Math.random() * 0.2 - 0.1)));
        return { item, cost };
    }).sort((a,b) => a.cost - b.cost);
}

function handleBuyItem(itemId: string, cost: number) {
    const player = gameState.selectedCharacter!;
    if (player.gold >= cost) {
        player.gold -= cost;
        player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
        addLogMessage(`You purchased ${ITEMS[itemId].name}.`);
        ui.renderAll(handlers); // Re-render main UI for gold
        saveGame();
        // Re-open shop modal to refresh its state
        openShopModal(currentShopInventory, handleBuyItem, handleSellItem);
    } else {
        addLogMessage('Not enough gold.');
    }
}

function handleSellItem(itemId: string) {
    const player = gameState.selectedCharacter!;
    const item = ITEMS[itemId];
    if (!item || (player.inventory[itemId] || 0) < 1) return;

    const sellPrice = Math.max(1, Math.floor(item.baseCost * 0.3));
    player.gold += sellPrice;
    player.inventory[itemId]--;

    addLogMessage(`You sold ${item.name} for ${sellPrice} gold.`);
    ui.renderAll(handlers); // Re-render main UI for gold and inventory summary
    saveGame();
}

function handleOpenShop() {
    generateShopInventory();
    openShopModal(currentShopInventory, handleBuyItem, handleSellItem);
}

function generateArtisanInventory() {
    gameState.currentArtisanBlueprints = [];
    const shuffled = [...BLUEPRINTS].sort(() => 0.5 - Math.random());
    gameState.currentArtisanBlueprints = shuffled.slice(0, 3);
}

function handleCraftItem(blueprintId: string) {
    const player = gameState.selectedCharacter!;
    const blueprint = BLUEPRINTS.find(bp => bp.id === blueprintId);
    if (!blueprint) return;

    // Check requirements
    if (player.gold < blueprint.requirements.gold) {
        addLogMessage("You don't have enough gold.");
        return;
    }
    for (const itemId in blueprint.requirements.materials) {
        const requiredCount = blueprint.requirements.materials[itemId];
        const haveCount = player.inventory[itemId] || 0;
        if (haveCount < requiredCount) {
            addLogMessage(`You don't have enough ${ITEMS[itemId].name}.`);
            return;
        }
    }

    // All requirements met, proceed with crafting
    player.gold -= blueprint.requirements.gold;
    for (const itemId in blueprint.requirements.materials) {
        player.inventory[itemId] -= blueprint.requirements.materials[itemId];
    }

    const resultItem = ITEMS[blueprint.resultItemId];
    player.inventory[resultItem.id] = (player.inventory[resultItem.id] || 0) + 1;
    addLogMessage(`You successfully crafted ${resultItem.name}!`);
    soundManager.play(SOUNDS.LEVEL_UP);
    saveGame();
}

function useItemFromInventory(itemId: string) {
    const player = gameState.selectedCharacter!;
    const item = ITEMS[itemId];
    if (!item || player.inventory[itemId] < 1) return;

    let itemUsed = false;

    if (item.type === 'SkillTome') {
        const tome = item as SkillTome;
        if (player.skills.includes(tome.skillId)) {
            addLogMessage(`You already know the skill: ${getSkillData(tome.skillId)?.name}.`);
            return;
        }
        player.skills.push(tome.skillId);
        player.inventory[itemId]--;
        addLogMessage(`You study the tome and learn a new skill: ${getSkillData(tome.skillId)?.name}!`);
        soundManager.play(SOUNDS.LEVEL_UP);
        itemUsed = true;
    } else if (item.id === 'healthPotion') {
        if (player.hp >= player.maxHp) {
             addLogMessage("Your health is already full.");
             return;
        }
        const healAmount = 50;
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        player.inventory[itemId]--;
        addLogMessage(`You drink the potion and restore ${healAmount} HP.`);
        soundManager.play(SOUNDS.HEAL);
        itemUsed = true;
    }
    
    if (itemUsed) {
        ui.renderInventoryList((id) => ui.renderItemDetails(id, equipItem, useItemFromInventory));
        ui.renderItemDetails(itemId, equipItem, useItemFromInventory);
        if (player.inventory[itemId] === 0) {
            dom.getElement('item-details-pane').classList.add('hidden');
        }
        ui.renderCharacterPanel(openInventoryModal, handlers.openSettingsModal);
        saveGame();
    }
}


function openInventoryModal() {
    if (gameState.inCombat) return;
    soundManager.play(SOUNDS.CLICK);
    dom.inventoryModal.classList.remove('hidden');
    dom.getElement('item-details-pane').classList.add('hidden');
    dom.getElement('close-inventory-btn').onclick = () => dom.inventoryModal.classList.add('hidden');
    ui.renderInventoryList((itemId) => ui.renderItemDetails(itemId, equipItem, useItemFromInventory));
    ui.renderEquippedItems(unequipItem);
}

function equipItem(itemId: string) {
    const player = gameState.selectedCharacter!;
    const itemToEquip = ITEMS[itemId] as Equipment;
    if (itemToEquip.type !== 'Equipment' || player.inventory[itemId] < 1) return;
    soundManager.play(SOUNDS.SELECT);
    const slot = itemToEquip.slot;
    const currentlyEquipped = player.equipment[slot];
    if (currentlyEquipped) {
        player.inventory[currentlyEquipped.id] = (player.inventory[currentlyEquipped.id] || 0) + 1;
    }
    player.inventory[itemId]--;
    player.equipment[slot] = itemToEquip;
    addLogMessage(`You equipped ${itemToEquip.name}.`);
    updateCharacterStats(player);
    ui.renderItemDetails(itemId, equipItem, useItemFromInventory);
    if (player.inventory[itemId] === 0) {
        dom.getElement('item-details-pane').classList.add('hidden');
    }
    ui.renderInventoryList((id) => ui.renderItemDetails(id, equipItem, useItemFromInventory));
    ui.renderEquippedItems(unequipItem);
    ui.renderCharacterPanel(openInventoryModal, handlers.openSettingsModal);
    saveGame();
}

function unequipItem(slot: EquipmentSlot) {
    const player = gameState.selectedCharacter!;
    const itemToUnequip = player.equipment[slot];
    if (!itemToUnequip) return;
    soundManager.play(SOUNDS.CLICK);
    player.equipment[slot] = null;
    player.inventory[itemToUnequip.id] = (player.inventory[itemToUnequip.id] || 0) + 1;
    addLogMessage(`You unequipped ${itemToUnequip.name}.`);
    updateCharacterStats(player);
    dom.getElement('item-details-pane').classList.add('hidden');
    ui.renderInventoryList((id) => ui.renderItemDetails(id, equipItem, useItemFromInventory));
    ui.renderEquippedItems(unequipItem);
    ui.renderCharacterPanel(openInventoryModal, handlers.openSettingsModal);
    saveGame();
}

function showInfoModal(title: string, text: string) {
    dom.getElement('info-modal-title').textContent = title;
    dom.getElement('info-modal-text').textContent = text;
    dom.infoModal.classList.remove('hidden');
    dom.getElement('info-modal-close-btn').onclick = () => {
        dom.infoModal.classList.add('hidden');
    };
}

function handleSaveGame() {
    saveGame();
    soundManager.play(SOUNDS.SELECT);
    showInfoModal('Game Saved', 'Your progress has been successfully saved.');
}

function handleQuitGame() {
    const confirmText = dom.getElement('confirm-modal-text');
    confirmText.textContent = "Are you sure you want to quit? Your unsaved progress will be lost.";
    dom.confirmModal.classList.remove('hidden');
    dom.getElement('confirm-yes-btn').onclick = () => {
        dom.confirmModal.classList.add('hidden');
        dom.settingsModal.classList.add('hidden');
        dom.gameContainer.classList.add('hidden');
        dom.mainMenu.classList.remove('hidden');
        if (localStorage.getItem('rpgGameState')) {
            dom.continueBtn.classList.remove('hidden');
        }
    };
    dom.getElement('confirm-no-btn').onclick = () => {
        dom.confirmModal.classList.add('hidden');
    };
}

export function clearLog() {
    gameState.log = ['Log cleared.'];
    if (dom.actionLog) ui.renderActionLog();
}

const handlers = {
    handleLocationAction, playerAttack, playerUseSkill, openCombatItemModal,
    openInventoryModal, handleSaveGame, handleQuitGame,
    openSettingsModal: () => openSettingsModal(clearLog, handleSaveGame, handleQuitGame)
};

export function initializeGame() {
    // Prevent copy/paste and context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('copy', (e) => e.preventDefault());
    window.addEventListener('cut', (e) => e.preventDefault());
    window.addEventListener('paste', (e) => e.preventDefault());

    const hasSave = !!localStorage.getItem('rpgGameState');

    if (hasSave) {
        dom.continueBtn.classList.remove('hidden');
    } else {
        dom.continueBtn.classList.add('hidden');
    }

    dom.continueBtn.onclick = () => {
        if (loadGame()) {
            soundManager.play(SOUNDS.SELECT);
            dom.mainMenu.classList.add('hidden');
            dom.gameContainer.classList.remove('hidden');
            
            if (gameState.selectedCharacter) {
                updateCharacterStats(gameState.selectedCharacter);
                if(gameState.selectedCharacter.hp > gameState.selectedCharacter.maxHp) {
                    gameState.selectedCharacter.hp = gameState.selectedCharacter.maxHp;
                }
            } else {
                // Handle corrupted save where character is null
                localStorage.removeItem('rpgGameState');
                location.reload(); // Easiest way to reset the UI state
                return;
            }
            
            addLogMessage("Welcome back to your journey!");
            ui.renderAll(handlers);
        }
    };

    dom.newGameBtn.onclick = () => {
        soundManager.play(SOUNDS.CLICK);
        if (hasSave) {
            const confirmText = dom.getElement('confirm-modal-text');
            confirmText.textContent = "Are you sure you want to start a new game? Your previous progress will be lost.";
            dom.confirmModal.classList.remove('hidden');
            
            dom.getElement('confirm-yes-btn').onclick = () => {
                dom.confirmModal.classList.add('hidden');
                localStorage.removeItem('rpgGameState');
                newGame();
            };
            
            dom.getElement('confirm-no-btn').onclick = () => {
                dom.confirmModal.classList.add('hidden');
            };
        } else {
            newGame();
        }
    };
}
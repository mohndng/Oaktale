



import { Character, CharacterClass, Enemy, GameLocation, Skill, Item, Equipment, EquipmentSlot, Blueprint, SkillTome, Quest, GameState, QuestObjective, EnemyRank, Buff, ItemRarity, Pet, PetEgg } from './types';
import * as dom from './dom';
import * as ui from './ui';
import { soundManager, SOUNDS, musicManager } from './sound';
import { CLASS_DATA, TOWN_NAME_PREFIXES, TOWN_NAME_SUFFIXES, ITEMS, ENEMIES, LOCATIONS, BLUEPRINTS, UNIVERSAL_SKILLS, NPC_NAMES, NPC_DIALOGUE_PREFIXES, QUEST_TEMPLATES, RARITY_DATA, PET_DATA } from './data';
import { GoogleGenAI } from "@google/genai";

// --- STORYLINE ---
const STORYLINE = [
    "In an age of myth, the Great Oak stood as the heart of the world, its roots intertwined with the very essence of life.",
    "From its boughs, Oaktale was born—a realm of peace and prosperity, shielded by the Oak's benevolent magic.",
    "But a shadow fell. A creeping blight, born of forgotten malice, began to poison the land, starting with the Great Oak itself.",
    "Its leaves withered, its magic failed, and the creatures of the realm twisted into corrupted monsters.",
    "Oaktale, once vibrant, now teeters on the brink of eternal twilight.",
    "A hero is needed. One who will venture into the corrupted heartwood and cleanse the blight at its source.",
    "To revive the Great Oak... and restore Oaktale to its former glory."
];


// --- GAME STATE ---
let gameState: GameState = {
    characters: [],
    selectedCharacter: null,
    currentLocation: 'main-menu',
    currentTownName: 'Oakhaven',
    inCombat: false,
    isExploring: false,
    currentEnemy: null,
    playerTurn: true,
    log: [],
    isGameOver: false,
    currentArtisanBlueprints: [],
    currentQuestGiver: null,
};

let currentShopInventory: { item: Item | Equipment, cost: number }[] = [];


// --- HELPER FUNCTIONS ---
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatLogMessage(message: string): string {
    let formattedMessage = ` ${message} `; // Add padding for word boundary checks

    // Dynamic replacements (most specific)
    const allItems = Object.values(ITEMS);
    allItems.forEach(item => {
        const itemRegex = new RegExp(`\\b(${escapeRegExp(item.name)})\\b`, 'g');
        if (formattedMessage.match(itemRegex)) {
            const rarityColor = RARITY_DATA[item.rarity].color;
            formattedMessage = formattedMessage.replace(itemRegex, `<span class="log-item" style="color: ${rarityColor};">$1</span>`);
        }
    });

    const allSkills: Skill[] = [...UNIVERSAL_SKILLS];
    Object.values(CLASS_DATA).forEach(c => allSkills.push(...c.skills));
    allSkills.forEach(skill => {
        const skillRegex = new RegExp(`\\b(${escapeRegExp(skill.name)})\\b`, 'g');
         if (formattedMessage.match(skillRegex)) {
            formattedMessage = formattedMessage.replace(skillRegex, `<span class="log-skill">$1</span>`);
        }
    });

    // Static keyword replacements (less specific)
    const keywordReplacements = [
        { regex: / (deals|takes|absorbs|suffering|suffers|for) (\d+) (damage)/gi, replacement: ` $1 <span class="log-damage">$2</span> $3` },
        { regex: / (restores?|heals?|recovers?|healing for|siphons)( for)? (\d+) HP/gi, replacement: ` $1$2 <span class="log-heal">$3 HP</span>` },
        { regex: / (\d+) (gold)/gi, replacement: ` <span class="log-gold">$1</span> $2` },
        { regex: / (\d+) (XP)/gi, replacement: ` <span class="log-xp">$1</span> $2` },
        { regex: / (Level \d+!)/gi, replacement: ` <span class="log-levelup">$1</span>` },
        { regex: / (Quest (?:Accepted|Complete|Turned In|Complete:))/gi, replacement: ` <span class="log-quest">$1</span>` },
    ];

    keywordReplacements.forEach(({ regex, replacement }) => {
        formattedMessage = formattedMessage.replace(regex, replacement);
    });

    return formattedMessage.trim(); // Remove padding
}

export function addLogMessage(message: string) {
    const formattedMessage = formatLogMessage(message);
    gameState.log.unshift(formattedMessage);
    if (gameState.log.length > 50) {
        gameState.log.pop();
    }
    if (dom.actionLog) ui.renderActionLog(gameState.log);
}


function generateTownName(): string {
    const prefix = TOWN_NAME_PREFIXES[Math.floor(Math.random() * TOWN_NAME_PREFIXES.length)];
    const suffix = TOWN_NAME_SUFFIXES[Math.floor(Math.random() * TOWN_NAME_SUFFIXES.length)];
    return prefix + suffix;
}

function getSkillData(skillId: string, characterClass?: CharacterClass): Skill | undefined {
    const universalSkill = UNIVERSAL_SKILLS.find(s => s.id === skillId);
    if (universalSkill) return universalSkill;
    const charClass = characterClass || gameState.selectedCharacter?.name;
    if (charClass) {
        const classSkill = CLASS_DATA[charClass].skills.find(s => s.id === skillId);
        if (classSkill) return classSkill;
    }
    return undefined;
}

function calculateXpToNextLevel(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

function calculatePetXpToNextLevel(level: number): number {
    return Math.floor(150 * Math.pow(1.4, level - 1));
}

function updateCharacterStats(character: Character) {
    let hpBonus = 0;
    let atkBonus = 0;
    let mpBonus = 0;
    Object.values(character.equipment).forEach(item => {
        if (item) {
            hpBonus += item.hpBonus || 0;
            atkBonus += item.atkBonus || 0;
            mpBonus += item.mpBonus || 0;
        }
    });

    let maxHp = character.baseHp;
    if (character.passiveSkill.name === 'Stalwart') {
        maxHp = Math.floor(maxHp * 1.2);
    }
    character.maxHp = maxHp + hpBonus;

    let baseAtk = character.baseAtk;
    if (character.passiveSkill.name === 'Arcane Intellect') {
        baseAtk = Math.floor(baseAtk * 1.15);
    }
    character.atk = baseAtk + atkBonus;

    if (character.resourceType === 'Mana') {
        character.maxMp = (character.baseMp || 0) + mpBonus;
        if (character.mp === undefined) {
            character.mp = character.maxMp;
        } else {
            character.mp = Math.min(character.mp, character.maxMp);
        }
    }

    if (character.hp > character.maxHp) {
        character.hp = character.maxHp;
    }
}

export function calculateDamage(attacker: Character | Enemy | Pet, target: Character | Enemy, baseDamage: number, armorPierce = 0): number {
    let finalDamage = baseDamage;
    
    // Attacker buffs
    if ('buffs' in attacker) {
        const attackUp = attacker.buffs.find(b => b.id === 'attack_up');
        if (attackUp) finalDamage *= (1 + attackUp.value!);
        const attackDown = attacker.buffs.find(b => b.id === 'attack_down');
        if (attackDown) finalDamage *= (1 - attackDown.value!);
    }


    // Target debuffs/buffs
    const vulnerable = target.buffs.find(b => b.id === 'vulnerable');
    if (vulnerable) finalDamage *= 1.5;
    const defenseUp = target.buffs.find(b => b.id === 'defense_up');
    if (defenseUp) finalDamage *= (1 - (defenseUp.value! * (1 - armorPierce)));
    const damageReduction = target.buffs.find(b => b.id === 'damage_reduction');
    if (damageReduction) finalDamage *= (1 - damageReduction.value!);
    
    // Hunter passive
    if ('passiveSkill' in attacker && attacker.passiveSkill.name === 'Beast Slayer' && 'type' in target && target.type === 'Beast') {
        finalDamage *= 1.25;
    }

    // Accuracy checks for characters and enemies
    if ('buffs' in attacker) {
        const blind = attacker.buffs.find(b => b.id === 'blind');
        const focused = attacker.buffs.find(b => b.id === 'focused_assault');
        if (blind && !focused && Math.random() < blind.value!) {
            return 0; // Miss
        }
    }


    return Math.max(1, Math.round(finalDamage));
}

export function applyDamage(target: Character | Enemy, damage: number): { damageDealt: number; log: string } {
    if (target.buffs.some(b => b.id === 'invulnerable')) {
        return { damageDealt: 0, log: `${target.name} is immune to damage!` };
    }
    
    const isPlayer = 'xp' in target;
    const evasionBuff = target.buffs.find(b => b.id === 'evasion');
    let dodgeChance = evasionBuff ? evasionBuff.value! : 0;

    if (isPlayer) {
        const player = target as Character;
        if (player.passiveSkill.name === 'Sixth Sense') dodgeChance += 0.15;
        if (player.passiveSkill.name === 'Flowing Strikes') dodgeChance += 0.10;
    }
    
    if (dodgeChance > 0 && Math.random() < dodgeChance) {
        if (isPlayer && (target as Character).passiveSkill.name === 'Flowing Strikes') {
            (target as Character).buffs.push({ id: 'attack_up', name: 'Riposte', duration: 2, value: 0.5 });
            addLogMessage('Flowing Strikes prepares a Riposte!');
        }
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
    if(damageDealt > 0) soundManager.play(SOUNDS.DAMAGE);
    return { damageDealt, log: logMessage };
}

export function dealPlayerDamage(player: Character, enemy: Enemy, multiplier: number, armorPierce = 0): { totalDamage: number; log: string } {
    if (player.passiveSkill.name === 'Lingering Harmonics') {
        player.attackCountThisCombat = (player.attackCountThisCombat || 0) + 1;
    }

    const baseDamage = player.atk * multiplier;
    const damageResult = applyDamage(enemy, calculateDamage(player, enemy, baseDamage, armorPierce));
    const totalDamage = damageResult.damageDealt;
    
    let passiveLog = '';

    if (totalDamage > 0) {
        const lifestealSources = [
            { condition: player.passiveSkill.name === 'Devour', amount: totalDamage * 0.05, name: 'Devour' },
            { condition: player.buffs.some(b => b.name === 'Lichborne'), amount: totalDamage, name: 'Lichborne' },
            { condition: player.buffs.some(b => b.name === 'Crusader'), amount: totalDamage * 0.20, name: 'Holy Crusade' },
            { condition: player.buffs.some(b => b.name === 'Vendetta'), amount: totalDamage * 0.10, name: 'Vendetta' },
        ];
        lifestealSources.forEach(source => {
            if(source.condition) {
                const healAmount = Math.floor(source.amount);
                player.hp = Math.min(player.maxHp, player.hp + healAmount);
                passiveLog += ` ${source.name} heals you for ${healAmount} HP.`;
                ui.showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            }
        });
        if (player.passiveSkill.name === 'Holy Zeal' && enemy.type === 'Undead') {
            const healAmount = Math.floor(player.maxHp * 0.05);
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            passiveLog += ` Holy Zeal heals you for ${healAmount} HP.`;
            ui.showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
        }
    }

    if (player.passiveSkill.name === 'Enfeeble' && Math.random() < 0.5) {
        const existingWeaken = enemy.buffs.find(b => b.name === 'Weakened');
        if (!existingWeaken) {
            enemy.buffs.push({ id: 'attack_down', name: 'Weakened', duration: 2, value: 0.25 });
            passiveLog += ` Your attack enfeebles the enemy.`;
        }
    }

    if (player.passiveSkill.name === 'Lingering Harmonics' && player.attackCountThisCombat % 3 === 0) {
        const echoDamage = Math.floor(player.atk * 0.5);
        const echoResult = applyDamage(enemy, calculateDamage(player, enemy, echoDamage, 0));
        passiveLog += ` Lingering Harmonics resonates for an extra ${echoResult.damageDealt} damage.`;
        ui.showDamagePopup('enemy-combatant-card', `${echoResult.damageDealt}`, 'damage');
    }

    return { totalDamage, log: damageResult.log + passiveLog };
}

function saveGame() {
    localStorage.setItem('oaktaleGameState', JSON.stringify(gameState));
}

function loadGame(): boolean {
    const savedState = localStorage.getItem('oaktaleGameState');
    if (savedState) {
        try {
            const loadedState = JSON.parse(savedState);
            gameState = {
                ...gameState,
                ...loadedState,
            };
            return true;
        } catch (e) {
            console.error("Failed to parse saved game state:", e);
            localStorage.removeItem('oaktaleGameState');
            return false;
        }
    }
    return false;
}

function createCharacter(className: CharacterClass) {
    const classData = CLASS_DATA[className];
    const level = 1;
    const xpToNextLevel = calculateXpToNextLevel(level);
    
    let resourceType: 'Mana' | 'Energy' | 'Health';
    switch (className) {
        case 'Mage':
        case 'Necromancer':
        case 'Paladin':
        case 'Druid':
        case 'Bard':
        case 'Cartomancer':
        case 'Echoist':
            resourceType = 'Mana';
            break;
        case 'Symbiote':
            resourceType = 'Health';
            break;

        default: // Warrior, Assassin, Hunter, Monk
            resourceType = 'Energy';
            break;
    }

    const character: Character = {
        name: className,
        portrait: classData.portrait,
        level,
        xp: 0,
        xpToNextLevel,
        baseHp: classData.baseHp,
        baseAtk: classData.baseAtk,
        baseMp: classData.baseMp,
        hp: classData.baseHp,
        maxHp: classData.baseHp,
        atk: classData.baseAtk,
        resourceType,
        skills: classData.skills.filter(s => s.levelRequired === 1).map(s => s.id),
        inventory: { healthPotion: 3 },
        equipment: { Weapon: null, Armor: null, Accessory: null },
        gold: 10,
        buffs: [],
        shield: 0,
        secondWindUsedThisCombat: false,
        extraTurn: false,
        activeQuests: [],
        stats: { totalKills: 0, goblinKills: 0, undeadKills: 0, orcKills: 0, beastKills: 0, constructKills: 0, aberrationKills: 0, bossKills: 0 },
        passiveSkill: classData.passiveSkill,
        attackCountThisCombat: 0,
        hasNewSkill: false,
    };

    updateCharacterStats(character);
    character.hp = character.maxHp;
    
    if (character.resourceType === 'Mana' && character.maxMp) {
        character.mp = character.maxMp;
    }

    gameState.characters.push(character);
}

function newGame() {
    gameState = {
        characters: [], selectedCharacter: null, currentLocation: 'main-menu', currentTownName: 'Oakhaven',
        inCombat: false, isExploring: false, currentEnemy: null, playerTurn: true, log: [], isGameOver: false, currentArtisanBlueprints: [], currentQuestGiver: null,
    };
    (Object.keys(CLASS_DATA) as CharacterClass[]).forEach(className => createCharacter(className));
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
            gameState.selectedCharacter = gameState.characters.find(c => c.name === selectedName)!;
            changeLocation('crossroads');
            addLogMessage(`Your journey as a ${gameState.selectedCharacter.name} begins. You find yourself at a crossroads.`);
            dom.characterSelectionScreen.classList.add('hidden');
            dom.gameContainer.classList.remove('hidden');
            ui.renderAll(gameState, handlers);
            saveGame();
        }
    };
}

function changeLocation(location: GameLocation) {
    const player = gameState.selectedCharacter!;
    const destination = LOCATIONS[location];

    if (!destination) {
        console.error(`Invalid location: ${location}`);
        return;
    }

    if (player.level < destination.levelRequirement) {
        addLogMessage(`You are not strong enough to enter ${destination.name}. (Requires Level ${destination.levelRequirement})`);
        return;
    }

    if (location === 'town') {
        gameState.currentTownName = generateTownName();
        generateArtisanInventory();
        gameState.currentQuestGiver = null;
    }
    gameState.currentLocation = location;
    const locationDisplayName = location === 'town' ? gameState.currentTownName : destination.name;
    addLogMessage(`You have arrived at ${locationDisplayName}.`);
    ui.renderAll(gameState, handlers);
    saveGame();
}

function explore() {
    gameState.isExploring = true;
    ui.renderAll(gameState, handlers);

    setTimeout(() => {
        gameState.isExploring = false;
        const location = LOCATIONS[gameState.currentLocation];
        
        if (!location) {
            addLogMessage("You find nothing of interest.");
            ui.renderAll(gameState, handlers);
            return;
        }

        if (location.bosses) {
            for (const boss of location.bosses) {
                if (Math.random() < boss.chance) {
                    startCombat(boss.enemyId, false);
                    return;
                }
            }
        }

        if (!location.events) {
            addLogMessage("You find nothing of interest.");
            ui.renderAll(gameState, handlers);
            return;
        }

        const random = Math.random();
        let cumulativeChance = 0;
        const event = location.events.find(e => {
            cumulativeChance += e.chance;
            return random <= cumulativeChance;
        });

        if (event) {
            switch (event.type) {
                case 'combat':
                    if (event.enemyId) startCombat(event.enemyId, event.ambush);
                    break;
                case 'find_gold':
                    const gold = event.goldAmount || 0;
                    gameState.selectedCharacter!.gold += gold;
                    addLogMessage(event.message || `You found ${gold} gold!`);
                    break;
                case 'find_item':
                    const item = ITEMS[event.itemId!];
                    if (item) {
                        const quantity = event.quantity || 1;
                        gameState.selectedCharacter!.inventory[item.id] = (gameState.selectedCharacter!.inventory[item.id] || 0) + quantity;
                        addLogMessage(event.message || `You found ${quantity > 1 ? quantity + ' ' : ''}${item.name}!`);
                    }
                    break;
                case 'treasure':
                    if(event.message) addLogMessage(event.message);
                    const treasureGold = event.goldAmount || 0;
                    let treasureMessage = `You get ${treasureGold} gold`;
                    gameState.selectedCharacter!.gold += treasureGold;
                    if (event.items && event.items.length > 0) {
                        treasureMessage += ' and ';
                        const itemMessages: string[] = [];
                        event.items.forEach(itemDrop => {
                            const foundItem = ITEMS[itemDrop.itemId];
                            if (foundItem) {
                                gameState.selectedCharacter!.inventory[foundItem.id] = (gameState.selectedCharacter!.inventory[foundItem.id] || 0) + itemDrop.quantity;
                                itemMessages.push(`${itemDrop.quantity > 1 ? itemDrop.quantity + ' ' : ''}${foundItem.name}`);
                            }
                        });
                        treasureMessage += itemMessages.join(', ') + '!';
                    } else {
                        treasureMessage += '!';
                    }
                    addLogMessage(treasureMessage);
                    soundManager.play(SOUNDS.LEVEL_UP);
                    break;
                case 'npc':
                    if (event.message) addLogMessage(event.message);
                    if (event.itemId) {
                        const npcItem = ITEMS[event.itemId];
                        const quantity = event.quantity || 1;
                        if (npcItem) {
                            gameState.selectedCharacter!.inventory[npcItem.id] = (gameState.selectedCharacter!.inventory[npcItem.id] || 0) + quantity;
                        }
                    }
                    if (event.buff) {
                        gameState.selectedCharacter!.buffs.push(event.buff);
                        addLogMessage(`You feel ${event.buff.name}!`);
                    }
                    break;
                case 'discovery':
                    if (event.message) addLogMessage(event.message);
                    if (event.xpAmount) {
                        gainXP(event.xpAmount);
                    }
                    break;
                case 'nothing':
                    addLogMessage("You explore the area but find nothing.");
                    break;
            }
        } else {
            addLogMessage("You explore the area but find nothing.");
        }
        ui.renderAll(gameState, handlers);
        saveGame();
    }, 1500);
}


function startCombat(enemyId: string, isAmbush: boolean = false) {
    const enemyData = { ...ENEMIES[enemyId] };
    if (!enemyData || !enemyData.rank) return;

    let rank: EnemyRank = enemyData.rank;
    const rand = Math.random();
    if (rank === 'Normal') {
        if (rand < 0.01) rank = 'Epic';
        else if (rand < 0.03) rank = 'Elite';
        else if (rand < 0.10) rank = 'Rare';
    }

    const rankMultipliers = { Normal: 1, Rare: 1.2, Elite: 1.5, Epic: 2, Legend: 3, Mysterious: 3 };
    const multiplier = rankMultipliers[rank];
    
    musicManager.adjustVolumeForCombat(true);
    gameState.inCombat = true;
    gameState.playerTurn = !isAmbush;
    const enemy: Enemy = { 
        ...enemyData, 
        id: enemyId, 
        maxHp: Math.floor(enemyData.maxHp * multiplier),
        hp: Math.floor(enemyData.maxHp * multiplier),
        atk: Math.floor(enemyData.atk * multiplier),
        xpValue: Math.floor(enemyData.xpValue * multiplier),
        drops: {
            gold: Math.floor(enemyData.drops.gold * multiplier),
            items: enemyData.drops.items,
        },
        rank, 
        buffs: [], 
        shield: 0 
    };
    gameState.currentEnemy = enemy;

    const player = gameState.selectedCharacter!;
    player.buffs = player.buffs.filter(b => b.duration > 90); // Keep long-term buffs
    player.shield = 0;
    player.secondWindUsedThisCombat = false;
    player.extraTurn = false;
    player.attackCountThisCombat = 0;

    if (player.passiveSkill.name === 'Deck of Fate') {
        const fateCards = [
            { id: 'fate_strength', name: 'The Strength', value: 0.3, buff: 'attack_up' },
            { id: 'fate_fortitude', name: 'The Fortitude', value: 0.3, buff: 'defense_up' },
            { id: 'fate_celerity', name: 'The Celerity', value: 0.3, buff: 'evasion' },
            { id: 'fate_renewal', name: 'The Renewal', value: Math.floor(player.maxHp * 0.05), buff: 'health_regen' }
        ] as const;
        const card = fateCards[Math.floor(Math.random() * fateCards.length)];
        const newBuff: Buff = { id: card.id, name: card.name, duration: 3, value: card.value };
        player.buffs.push(newBuff);
        addLogMessage(`Deck of Fate reveals ${card.name}!`);
    }

    addLogMessage(`${isAmbush ? 'You are ambushed by a' : 'A wild'} ${enemy.rank !== 'Normal' ? enemy.rank + ' ' : ''}${enemy.name} appears!`);
    soundManager.play(SOUNDS.SELECT);
    dom.characterPanel.classList.add('disabled');
    dom.inventoryDisplay.classList.add('hidden');
    ui.renderAll(gameState, handlers);

    if (isAmbush) {
        setTimeout(enemyTurn, 1000);
    }
}

export function endCombat(win: boolean, message?: string) {
    musicManager.adjustVolumeForCombat(false);
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
        
        updateQuestProgress(enemy);
        gainXP(enemy.xpValue);

    } else {
        if (!message) { // Player was defeated
            soundManager.play(SOUNDS.LOSE);
            addLogMessage(`You have been defeated by the ${enemy.name}...`);
            
            const goldPenalty = Math.floor(player.gold * 0.10);
            player.gold -= goldPenalty;
            if (player.gold < 0) player.gold = 0;

            showInfoModal(
                "Defeated...",
                `You collapse from your wounds. A passing stranger finds you and carries you to the nearest town to recover. You lost ${goldPenalty} gold in the commotion.`,
                () => {
                    player.hp = 1; // Revive with 1 HP
                    gameState.inCombat = false;
                    gameState.currentEnemy = null;
                    dom.characterPanel.classList.remove('disabled');
                    changeLocation('town'); 
                }
            );
            return; // Stop further execution until modal is closed.
        } else { // Player fled
            addLogMessage(message);
        }
    }
    gameState.inCombat = false;
    gameState.currentEnemy = null;
    dom.characterPanel.classList.remove('disabled');
    ui.renderAll(gameState, handlers);
    if (win) saveGame();
}

function petTurn() {
    const player = gameState.selectedCharacter!;
    const pet = player.pet;
    const enemy = gameState.currentEnemy;

    if (!pet || !enemy || enemy.hp <= 0) {
        gameState.playerTurn = false;
        setTimeout(enemyTurn, 1000);
        return;
    }
    
    ui.triggerAnimation('pet-combatant-card', 'animate-attack');

    setTimeout(() => {
        let actionLog: string;
        if (Math.random() < pet.skill.chance) {
            actionLog = pet.skill.action(pet, player, enemy);
        } else {
            const damage = applyDamage(enemy, calculateDamage(pet, enemy, pet.atk));
            ui.showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            actionLog = `${pet.name} attacks, dealing ${damage.damageDealt} damage.`;
        }
        
        addLogMessage(actionLog);
        ui.triggerAnimation('enemy-combatant-card', 'animate-hit');

        if (pet.skill.id === 'wisp_echo' && actionLog.includes('resonates')) {
             setTimeout(() => {
                if (enemy.hp > 0) {
                    const echoDamage = applyDamage(enemy, calculateDamage(pet, enemy, pet.atk * 0.75));
                    ui.showDamagePopup('enemy-combatant-card', `${echoDamage.damageDealt}`, 'damage');
                    addLogMessage(`${pet.name}'s attack echoes for another ${echoDamage.damageDealt} damage.`);
                    if (checkCombatEnd()) return;
                    ui.renderAll(gameState, handlers);
                }
            }, 500);
        }
        
        if (checkCombatEnd()) return;

        gameState.playerTurn = false;
        setTimeout(enemyTurn, 1000);
    }, 400); 
}


export function processTurn(actionLog: string) {
    addLogMessage(actionLog);
    const player = gameState.selectedCharacter!;

    if (checkCombatEnd()) return;

    if (player.extraTurn) {
        player.extraTurn = false;
        applyBuffs(player, 'start');
        ui.renderAll(gameState, handlers);
        if (checkCombatEnd()) return;
        return;
    }

    if (player.pet) {
        setTimeout(petTurn, 500);
    } else {
        gameState.playerTurn = false;
        setTimeout(enemyTurn, 1000);
    }
}


function playerAttack() {
    if (!gameState.playerTurn) return;
    dom.combatControlsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
    soundManager.play(SOUNDS.ATTACK);
    ui.triggerAnimation('player-combatant-card', 'animate-attack');
    const player = gameState.selectedCharacter!;
    const enemy = gameState.currentEnemy!;
    const { totalDamage, log } = dealPlayerDamage(player, enemy, 1.0);
    
    setTimeout(() => {
        ui.triggerAnimation('enemy-combatant-card', 'animate-hit');
        ui.showDamagePopup('enemy-combatant-card', totalDamage > 0 ? `${totalDamage}` : 'MISS', totalDamage > 0 ? 'damage' : 'miss');
        processTurn(`${player.name} attacks! ${log} It deals ${totalDamage} damage.`);
    }, 300);
}

function playerUseSkill(skill: Skill) {
    if (!gameState.playerTurn) return;
    const player = gameState.selectedCharacter!;
    
    if (skill.id === 'flee') {
        const actionResult = skill.action(player, gameState.currentEnemy!);
        if (actionResult === "FLEE_ATTEMPT") {
            if (Math.random() < 0.75) {
                endCombat(false, 'You successfully escaped.');
            } else {
                processTurn('You failed to escape!');
            }
            return;
        }
    }

    if (skill.id.includes('second_wind')) {
        addLogMessage("Second Wind is a passive skill.");
        return;
    }
    if ((skill.id.includes('adrenaline') || skill.id.includes('meditate') || skill.id.includes('draught') || skill.id.includes('first_aid') || skill.id.includes('last_stand')) && gameState.selectedCharacter?.buffs.some(b => b.name.includes('Used'))) {
        addLogMessage(`You can only use ${skill.name} once per battle.`);
        return;
    }
     if (skill.id.includes('deja_vu') && gameState.selectedCharacter?.buffs.some(b => b.name.includes('Deja Vu Used'))) {
        addLogMessage(`You can only use Deja Vu once per battle.`);
        return;
    }

    if (skill.mpCost && player.mp !== undefined && player.mp < skill.mpCost) {
        addLogMessage("You don't have enough mana!");
        return;
    }
    
    dom.combatControlsContainer.querySelectorAll('button').forEach(b => b.disabled = true);
    soundManager.play(SOUNDS.SELECT);
    
    if (skill.mpCost && player.mp !== undefined) {
        player.mp -= skill.mpCost;
    }

    const enemy = gameState.currentEnemy!;
    const log = skill.action(player, enemy);
     if (player.passiveSkill.name === 'Improvisation' && Math.random() < 0.5) {
        const buffs = [{id: 'attack_up', name: 'Inspired', value: 0.2}, {id: 'defense_up', name: 'Resonant', value: 0.2}, {id: 'evasion', name: 'Swift', value: 0.2}];
        const randomBuff = buffs[Math.floor(Math.random() * buffs.length)];
        player.buffs.push({ ...randomBuff, duration: 2 } as Buff);
        addLogMessage(`Improvisation grants you a temporary buff!`);
    }
    
    processTurn(log);
}

function enemyTurn() {
    applyBuffs(gameState.currentEnemy!, 'start');
    ui.renderAll(gameState, handlers);
    if (checkCombatEnd()) return;

    const enemy = gameState.currentEnemy!;
    const player = gameState.selectedCharacter!;
    
    if (enemy.buffs.find(b => b.id === 'stun')) {
        gameState.playerTurn = true;
        addLogMessage(`${enemy.name} is stunned and cannot act.`);
        ui.renderAll(gameState, handlers);
        return;
    }

    const enemyAction = () => {
        if (enemy.skill && Math.random() < 0.33) {
            addLogMessage(enemy.skill.action(enemy, player));
        } else {
            ui.triggerAnimation('enemy-combatant-card', 'animate-attack');
            const damage = applyDamage(player, calculateDamage(enemy, player, enemy.atk));
            setTimeout(() => {
                ui.triggerAnimation('player-combatant-card', 'animate-hit');
                ui.showDamagePopup('player-combatant-card', damage.damageDealt > 0 ? `${damage.damageDealt}` : 'MISS', damage.damageDealt > 0 ? 'damage' : 'miss');
                addLogMessage(`${enemy.name} attacks! ${damage.log} It deals ${damage.damageDealt} damage.`);
                const retaliation = player.buffs.find(b => b.id === 'retaliation');
                if (retaliation && damage.damageDealt > 0) {
                     setTimeout(() => {
                        const counterDamage = dealPlayerDamage(player, enemy, retaliation.value!);
                        ui.triggerAnimation('player-combatant-card', 'animate-attack');
                        ui.triggerAnimation('enemy-combatant-card', 'animate-hit');
                        ui.showDamagePopup('enemy-combatant-card', `${counterDamage.totalDamage}`, 'damage');
                        addLogMessage(`${player.name} retaliates for ${counterDamage.totalDamage} damage!`);
                     }, 400);
                }
            }, 300);
        }
    }
    enemyAction();

    setTimeout(() => {
        if (checkCombatEnd()) return;
        gameState.playerTurn = true;
        applyBuffs(player, 'start');
        ui.renderAll(gameState, handlers);
    }, 1000);
}

function applyBuffs(target: Character | Enemy, phase: 'start' | 'end') {
    let turnLog = '';
    target.buffs = target.buffs.filter(buff => {
        if (phase === 'start') {
            if (['bleed', 'poison', 'burn', 'symbiotic_surge'].includes(buff.id)) {
                const dotDamage = buff.value || 0;
                applyDamage(target, dotDamage);
                turnLog += `${target.name} takes ${dotDamage} ${buff.name} damage. `;
                ui.showDamagePopup(target === gameState.selectedCharacter ? 'player-combatant-card' : 'enemy-combatant-card', `${dotDamage}`, 'damage');
            }
            if (['health_regen', 'parasitic_drain'].includes(buff.id)) {
                const healAmount = buff.value || 0;
                target.hp = Math.min(target.maxHp, target.hp + healAmount);
                turnLog += `${target.name} recovers ${healAmount} HP from ${buff.name}. `;
                ui.showDamagePopup(target === gameState.selectedCharacter ? 'player-combatant-card' : 'enemy-combatant-card', `+${healAmount}`, 'heal');
            }
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

function gainPetXP(amount: number) {
    const player = gameState.selectedCharacter!;
    if (!player.pet) return;

    const pet = player.pet;
    pet.xp += amount;
    addLogMessage(`${pet.name} gains ${amount} XP.`);

    while (pet.xp >= pet.xpToNextLevel) {
        pet.xp -= pet.xpToNextLevel;
        pet.level++;
        pet.xpToNextLevel = calculatePetXpToNextLevel(pet.level);
        pet.baseAtk += 2;
        pet.atk = pet.baseAtk;
        addLogMessage(`${pet.name} has reached Level ${pet.level}!`);
        soundManager.play(SOUNDS.LEVEL_UP);
    }
}


function gainXP(amount: number) {
    const player = gameState.selectedCharacter!;
    player.xp += amount;
    addLogMessage(`You gain ${amount} XP.`);

    if (player.pet) {
        gainPetXP(Math.floor(amount / 2));
    }
    
    while (player.xp >= player.xpToNextLevel) {
        player.xp -= player.xpToNextLevel;
        levelUp();
    }
}

function levelUp() {
    const player = gameState.selectedCharacter!;
    player.level++;
    player.xpToNextLevel = calculateXpToNextLevel(player.level);
    player.baseHp += Math.round(CLASS_DATA[player.name].baseHp * 0.1);
    player.baseAtk += Math.round(CLASS_DATA[player.name].baseAtk * 0.1);
    if (player.baseMp) {
        player.baseMp += Math.round((CLASS_DATA[player.name].baseMp || 0) * 0.1);
    }
    updateCharacterStats(player);
    player.hp = player.maxHp;
    if (player.mp !== undefined && player.maxMp !== undefined) {
        player.mp = player.maxMp;
    }
    soundManager.play(SOUNDS.LEVEL_UP);
    addLogMessage(`${player.name} has reached Level ${player.level}!`);

    // Automatically learn new skills
    const classSkills = CLASS_DATA[player.name].skills;
    const universalSkills = UNIVERSAL_SKILLS;

    const allLearnableSkills = [...classSkills, ...universalSkills];

    const newSkills = allLearnableSkills.filter(
        skill => skill.levelRequired === player.level && !player.skills.includes(skill.id)
    );

    if (newSkills.length > 0) {
        newSkills.forEach(skill => {
            player.skills.push(skill.id);
            addLogMessage(`You have learned a new skill: ${skill.name}!`);
        });
        player.hasNewSkill = true;
        soundManager.play(SOUNDS.WIN);
    }

    ui.renderAll(gameState, handlers);
    saveGame();
}


function updateQuestProgress(enemy: Enemy) {
    const player = gameState.selectedCharacter!;
    player.stats.totalKills++;
    if (enemy.type === 'Goblin') player.stats.goblinKills++;
    if (enemy.type === 'Orc') player.stats.orcKills++;
    if (enemy.type === 'Undead') player.stats.undeadKills++;
    if (enemy.type === 'Beast') player.stats.beastKills++;
    if (enemy.type === 'Construct') player.stats.constructKills++;
    if (enemy.type === 'Aberration') player.stats.aberrationKills++;
    if (enemy.rank === 'Epic' || enemy.rank === 'Legend') player.stats.bossKills++;

    player.activeQuests.forEach(quest => {
        if (quest.isComplete) return;

        quest.objectives.forEach(obj => {
            if (obj.type === 'kill') {
                const targetMatch = obj.targetId ? enemy.id === obj.targetId : enemy.name.includes(obj.targetName);
                const rankMatch = obj.rank ? enemy.rank === obj.rank : true;
                if (targetMatch && rankMatch) {
                    obj.current = Math.min(obj.required, obj.current + 1);
                }
            }
        });

        const allObjectivesComplete = quest.objectives.every(o => o.current >= o.required);
        if (allObjectivesComplete) {
            quest.isComplete = true;
            addLogMessage(`Quest Complete: ${quest.title}! Return to a villager to claim your reward.`);
        }
    });
}
function talkToVillager() {
    const player = gameState.selectedCharacter!;
    const completedQuest = player.activeQuests.find(q => q.isComplete);

    if (completedQuest) {
        gameState.currentQuestGiver = {
            name: NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)],
            dialogue: "You've done it! The town is safer because of you. Please, take this for your troubles.",
            quest: null
        };
    } else {
        const potentialQuests = QUEST_TEMPLATES.filter(qTemplate => 
            !player.activeQuests.some(activeQ => activeQ.title === qTemplate.title)
        );
        let newQuest: Quest | null = null;
        if (potentialQuests.length > 0 && Math.random() < 0.5) { // 50% chance to offer a quest
            const questTemplate = potentialQuests[Math.floor(Math.random() * potentialQuests.length)];
            newQuest = {
                ...questTemplate,
                id: `quest_${Date.now()}`,
                isComplete: false,
                objectives: questTemplate.objectives.map(o => ({ ...o, current: 0 }))
            };
        }

        gameState.currentQuestGiver = {
            name: NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)],
            dialogue: newQuest ? "Brave hero, we have a task for you..." : NPC_DIALOGUE_PREFIXES[Math.floor(Math.random() * NPC_DIALOGUE_PREFIXES.length)],
            quest: newQuest
        };
    }
    
    ui.openQuestGiverModal(player, gameState.currentQuestGiver, acceptQuest, turnInQuest);
}
function acceptQuest(questId: string) {
    if (gameState.currentQuestGiver?.quest?.id === questId) {
        const player = gameState.selectedCharacter!;
        player.activeQuests.push(gameState.currentQuestGiver.quest);
        addLogMessage(`Quest Accepted: ${gameState.currentQuestGiver.quest.title}`);
        dom.questGiverModal.classList.add('hidden');
        ui.renderAll(gameState, handlers);
        saveGame();
    }
}
function turnInQuest(questId: string) {
    const player = gameState.selectedCharacter!;
    const questIndex = player.activeQuests.findIndex(q => q.id === questId && q.isComplete);
    if (questIndex > -1) {
        const quest = player.activeQuests[questIndex];
        
        // Grant rewards
        gainXP(quest.rewards.xp);
        player.gold += quest.rewards.gold;
        addLogMessage(`Quest Reward: ${quest.rewards.gold} Gold.`);
        if (quest.rewards.items) {
            quest.rewards.items.forEach(itemReward => {
                player.inventory[itemReward.itemId] = (player.inventory[itemReward.itemId] || 0) + itemReward.quantity;
                addLogMessage(`Quest Reward: ${ITEMS[itemReward.itemId].name} x${itemReward.quantity}.`);
            });
        }
        
        // Remove quest
        player.activeQuests.splice(questIndex, 1);
        
        addLogMessage(`Quest Turned In: ${quest.title}`);
        dom.questGiverModal.classList.add('hidden');
        ui.renderAll(gameState, handlers);
        saveGame();
    }
}

function showConfirmModal(text: string, onYes: () => void, onNo?: () => void) {
    const confirmText = dom.getElement('confirm-modal-text');
    confirmText.textContent = text;
    dom.confirmModal.classList.remove('hidden');
    dom.getElement('confirm-yes-btn').onclick = () => {
        dom.confirmModal.classList.add('hidden');
        onYes();
    };
    dom.getElement('confirm-no-btn').onclick = () => {
        dom.confirmModal.classList.add('hidden');
        if (onNo) onNo();
    };
}

function handleLocationAction(actionId: string) {
    soundManager.play(SOUNDS.CLICK);
    const player = gameState.selectedCharacter!;

    const performAction = () => {
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
                    ui.renderAll(gameState, handlers);
                    saveGame();
                } else {
                    addLogMessage('You don\'t have enough gold to rest.');
                }
                break;
            case 'shop': handleOpenShop(); break;
            case 'artisan': handleOpenArtisan(); break;
            case 'talk-villager': talkToVillager(); break;
        }
    };

    const dangerousLocationIds = (Object.keys(LOCATIONS) as GameLocation[]).filter(locId => {
        const locationData = LOCATIONS[locId];
        return locationData && (locationData.events || locationData.bosses);
    }).map(locId => `go-${locId}`);

    const dangerousActions = ['explore', ...dangerousLocationIds];

    if (player.hp === 1 && dangerousActions.includes(actionId)) {
        showConfirmModal(
            "You are gravely injured with only 1 HP. It's extremely dangerous to venture out. Are you sure you wish to proceed?",
            performAction,
            () => { addLogMessage("You decide it's better to recover first."); }
        );
    } else {
        performAction();
    }
}

function openInventoryModal() {
    if (gameState.inCombat) return;
    const player = gameState.selectedCharacter!;
    
    if (player.hasNewSkill) {
        player.hasNewSkill = false;
        ui.renderCharacterPanel(player, openInventoryModal, openSettingsModal, openQuestLogModal);
        saveGame();
    }

    soundManager.play(SOUNDS.CLICK);
    dom.inventoryModal.classList.remove('hidden');
    dom.getElement('item-details-pane').classList.add('hidden');
    dom.getElement('close-inventory-btn').onclick = () => dom.inventoryModal.classList.add('hidden');
    ui.renderInventoryList(player, (itemId) => ui.renderItemDetails(player, itemId, equipItem, useItemFromInventory));
    ui.renderEquippedItems(player, unequipItem);
}

function handleSaveGame() {
    saveGame();
    soundManager.play(SOUNDS.SELECT);
    showInfoModal('Game Saved', 'Your progress has been successfully saved.');
}

function handleQuitGame() {
    showConfirmModal(
        "Are you sure you want to quit? Unsaved progress may be lost.",
        () => {
            dom.settingsModal.classList.add('hidden');
            location.reload();
        }
    );
}
function handleImportGame() {
    dom.importFileInput.click();
    dom.importFileInput.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const savedState = e.target?.result as string;
                    // Support both raw JSON and base64 encoded
                    let loadedState;
                    try {
                        loadedState = JSON.parse(savedState);
                    } catch (jsonError) {
                        loadedState = JSON.parse(atob(savedState));
                    }

                    gameState = {
                        ...gameState,
                        ...loadedState,
                    };
                    dom.settingsModal.classList.add('hidden');
                    showInfoModal('Game Imported', 'Game state loaded successfully.', () => {
                         ui.renderAll(gameState, handlers);
                    });
                } catch (err) {
                    showInfoModal('Import Failed', 'The save file is invalid or corrupted.');
                }
            };
            reader.readAsText(file);
        }
    };
}

function handleExportGame() {
    const dataStr = btoa(JSON.stringify(gameState));
    const exportFileDefaultName = `oaktale_save_${Date.now()}.oak`;

    const blob = new Blob([dataStr], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
}

function openQuestLogModal() {
    if (gameState.selectedCharacter) {
        ui.openQuestLogModal(gameState.selectedCharacter);
    }
}
function openSettingsModal() {
    ui.openSettingsModal(clearLog, handleSaveGame, handleQuitGame, handleImportGame, handleExportGame);
}

function openCombatItemModal() {
    const player = gameState.selectedCharacter!;
    const consumables = Object.keys(player.inventory).filter(id => ITEMS[id]?.type === 'Consumable' && player.inventory[id] > 0);
    if (consumables.length === 0) {
        addLogMessage("You have no items to use.");
        return;
    }
    ui.openCombatItemModal(player, playerUseItem);
}

function generateArtisanInventory() {
    gameState.currentArtisanBlueprints = [...BLUEPRINTS].sort(() => 0.5 - Math.random()).slice(0, 3);
}

function clearLog() {
    gameState.log = ['Log cleared.'];
    if (dom.actionLog) ui.renderActionLog(gameState.log);
}

function showInfoModal(title: string, text: string, onClose?: () => void) {
    dom.getElement('info-modal-title').textContent = title;
    dom.getElement('info-modal-text').textContent = text;
    dom.infoModal.classList.remove('hidden');
    dom.getElement('info-modal-close-btn').onclick = () => {
        dom.infoModal.classList.add('hidden');
        if (onClose) {
            onClose();
        }
    };
}

function equipItem(itemId: string) {
    const player = gameState.selectedCharacter!;
    const itemToEquip = ITEMS[itemId] as Equipment;
    if (itemToEquip.type !== 'Equipment' || player.inventory[itemId] < 1) return;
    
    if (itemToEquip.allowedClasses && !itemToEquip.allowedClasses.includes(player.name)) {
        addLogMessage(`You cannot equip this. It is for: ${itemToEquip.allowedClasses.join(', ')}.`);
        return;
    }

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
    
    // Refresh UI
    ui.renderItemDetails(player, itemId, equipItem, useItemFromInventory);
    if (player.inventory[itemId] === 0) {
        dom.getElement('item-details-pane').classList.add('hidden');
    }
    ui.renderInventoryList(player, (id) => ui.renderItemDetails(player, id, equipItem, useItemFromInventory));
    ui.renderEquippedItems(player, unequipItem);
    ui.renderCharacterPanel(player, openInventoryModal, openSettingsModal, openQuestLogModal);
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
    
    // Refresh UI
    dom.getElement('item-details-pane').classList.add('hidden');
    ui.renderInventoryList(player, (id) => ui.renderItemDetails(player, id, equipItem, useItemFromInventory));
    ui.renderEquippedItems(player, unequipItem);
    ui.renderCharacterPanel(player, openInventoryModal, openSettingsModal, openQuestLogModal);
    saveGame();
}

function useItemFromInventory(itemId: string) {
    const player = gameState.selectedCharacter!;
    const item = ITEMS[itemId];
    if (!item || player.inventory[itemId] < 1) return;

    let itemUsed = false;

    if (item.type === 'SkillTome') {
        const skillTome = item as SkillTome;
        if (player.skills.includes(skillTome.skillId)) {
            addLogMessage(`You already know the ${getSkillData(skillTome.skillId)?.name} skill.`);
            return;
        }
        player.skills.push(skillTome.skillId);
        addLogMessage(`You read the tome and learn ${getSkillData(skillTome.skillId)?.name}!`);
        itemUsed = true;
    } else if (item.type === 'PetEgg') {
        if (player.pet) {
            addLogMessage("You already have a loyal companion by your side. You can only manage one pet for now.");
            return;
        }

        const egg = item as PetEgg;
        const rand = Math.random();
        let chosenRarity: ItemRarity = 'Common';

        if (rand < 0.03 && egg.hatchablePets.Epic?.length) chosenRarity = 'Epic';
        else if (rand < 0.15 && egg.hatchablePets.Rare?.length) chosenRarity = 'Rare';
        else if (rand < 0.40 && egg.hatchablePets.Uncommon?.length) chosenRarity = 'Uncommon';
        
        let petPool = egg.hatchablePets[chosenRarity];
        if (!petPool || petPool.length === 0) {
            const rarities: ItemRarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
            for (const rarity of rarities) {
                const pool = egg.hatchablePets[rarity];
                if (pool && pool.length > 0) {
                    petPool = pool;
                    chosenRarity = rarity; // Update chosen rarity if we had to fall back
                    break;
                }
            }
        }
        if (!petPool) {
            addLogMessage("The egg feels inert and doesn't hatch.");
            return;
        }
        const petId = petPool[Math.floor(Math.random() * petPool.length)];
        const petData = PET_DATA[petId];
        
        if (petData) {
            player.pet = {
                ...petData,
                rarity: chosenRarity, // Assign the actual hatched rarity
                level: 1,
                xp: 0,
                xpToNextLevel: calculatePetXpToNextLevel(1),
                atk: petData.baseAtk,
            };
            itemUsed = true;
            addLogMessage(`The egg hatches into a ${chosenRarity} ${petData.name}! It joins you as a companion.`);
            soundManager.play(SOUNDS.LEVEL_UP);
        } else {
            addLogMessage("The egg shivers and does nothing.");
        }
    }

    if (itemUsed) {
        player.inventory[itemId]--;
        if (player.inventory[itemId] === 0) {
            dom.getElement('item-details-pane').classList.add('hidden');
        }
        ui.renderInventoryList(player, (id) => ui.renderItemDetails(player, id, equipItem, useItemFromInventory));
        ui.renderCharacterPanel(player, openInventoryModal, openSettingsModal, openQuestLogModal);
        saveGame();
    } else {
        addLogMessage("You can't use that right now.");
    }
}

function playerUseItem(itemId: string) {
    const player = gameState.selectedCharacter!;
    const item = ITEMS[itemId];
    if (!item || player.inventory[itemId] < 1) return;
    if (item.type !== 'Consumable') return;

    player.inventory[itemId]--;

    let log = `${player.name} uses ${item.name}.`;
    let itemUsed = false;
    
    switch (item.id) {
        case 'healthPotion':
            const healAmount = 50;
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            log += ` It restores ${healAmount} HP.`;
            ui.showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            itemUsed = true;
            break;
        case 'manaPotion':
            if (player.mp !== undefined && player.maxMp !== undefined) {
                const manaAmount = 30;
                player.mp = Math.min(player.maxMp, player.mp + manaAmount);
                log += ` It restores ${manaAmount} MP.`;
                itemUsed = true;
            } else {
                log += ` But it has no effect!`;
            }
            break;
        case 'strengthPotion':
            player.buffs.push({ id: 'attack_up', name: 'Strengthened', duration: 3, value: 0.3 });
            log += ` Their attack is increased.`;
            itemUsed = true;
            break;
    }

    if (itemUsed) {
        processTurn(log);
    } else {
        player.inventory[itemId]++;
        addLogMessage("This item can't be used in combat.");
        dom.combatControlsContainer.querySelectorAll('button').forEach(b => (b as HTMLButtonElement).disabled = false);
    }
}

function handleOpenShop() {
    currentShopInventory = [];
    const availableItems = Object.values(ITEMS).filter(i => i.type === 'Consumable' || i.type === 'Equipment');
    for (let i = 0; i < 5; i++) {
        const item = availableItems[Math.floor(Math.random() * availableItems.length)];
        const cost = Math.floor(item.baseCost * RARITY_DATA[item.rarity].multiplier * (0.8 + Math.random() * 0.4)); 
        if (!currentShopInventory.some(si => si.item.id === item.id)) {
            currentShopInventory.push({ item, cost });
        }
    }
    ui.openShopModal(gameState.selectedCharacter!, currentShopInventory, buyItem, sellItem);
}

function buyItem(itemId: string, cost: number) {
    const player = gameState.selectedCharacter!;
    if (player.gold >= cost) {
        player.gold -= cost;
        player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
        addLogMessage(`You bought ${ITEMS[itemId].name}.`);
        soundManager.play(SOUNDS.CLICK);
        ui.openShopModal(player, currentShopInventory, buyItem, sellItem);
        ui.renderAll(gameState, handlers);
    }
}

function sellItem(itemId: string) {
    const player = gameState.selectedCharacter!;
    if (player.inventory[itemId] > 0) {
        const item = ITEMS[itemId];
        const sellPrice = Math.max(1, Math.floor(item.baseCost * 0.3));
        player.inventory[itemId]--;
        player.gold += sellPrice;
        addLogMessage(`You sold ${item.name} for ${sellPrice} gold.`);
        soundManager.play(SOUNDS.CLICK);
        ui.openShopModal(player, currentShopInventory, buyItem, sellItem);
        ui.renderAll(gameState, handlers);
    }
}

function handleOpenArtisan() {
    ui.openArtisanModal(gameState.selectedCharacter!, gameState.currentArtisanBlueprints, craftItem);
}

function craftItem(blueprintId: string) {
    const player = gameState.selectedCharacter!;
    const blueprint = gameState.currentArtisanBlueprints.find(b => b.id === blueprintId);
    if (!blueprint) return;

    if (player.gold < blueprint.requirements.gold) {
        addLogMessage("Not enough gold.");
        return;
    }
    const hasMaterials = Object.entries(blueprint.requirements.materials).every(([matId, reqCount]) => {
        return (player.inventory[matId] || 0) >= reqCount;
    });
    if (!hasMaterials) {
        addLogMessage("You don't have the required materials.");
        return;
    }

    player.gold -= blueprint.requirements.gold;
    Object.entries(blueprint.requirements.materials).forEach(([matId, reqCount]) => {
        player.inventory[matId] -= reqCount;
    });

    player.inventory[blueprint.resultItemId] = (player.inventory[blueprint.resultItemId] || 0) + 1;
    
    addLogMessage(`You crafted ${ITEMS[blueprint.resultItemId].name}!`);
    soundManager.play(SOUNDS.LEVEL_UP);

    ui.openArtisanModal(player, gameState.currentArtisanBlueprints, craftItem);
    ui.renderAll(gameState, handlers);
}

const handlers = {
    openInventoryModal,
    openSettingsModal,
    openQuestLogModal,
    playerAttack,
    playerUseSkill,
    openCombatItemModal,
    handleLocationAction,
};

// --- INITIALIZATION ---
export function initializeGame() {
    const startGameLogic = () => {
        if (loadGame() && gameState.selectedCharacter) {
            dom.newGameBtn.classList.remove('hidden');
            dom.continueBtn.classList.remove('hidden');
            dom.continueBtn.onclick = () => {
                soundManager.play(SOUNDS.SELECT);
                dom.mainMenu.classList.add('hidden');
                dom.gameContainer.classList.remove('hidden');
                addLogMessage("Welcome back! Your adventure continues.");
                ui.renderAll(gameState, handlers);
            };
            dom.newGameBtn.onclick = () => {
                 showConfirmModal("Are you sure you want to start a new game? Your previous save will be overwritten.", newGame);
            };
        } else {
            dom.newGameBtn.classList.remove('hidden');
            dom.newGameBtn.textContent = 'New Game';
            dom.continueBtn.classList.add('hidden');
            dom.newGameBtn.onclick = newGame;
        }

        let storyIndex = 0;
        let storyTimeoutId: ReturnType<typeof setTimeout>;

        const endIntroSequence = () => {
            clearTimeout(storyTimeoutId);
            dom.introStoryline.style.opacity = '0';
            dom.mainMenu.classList.remove('hidden');
            dom.mainMenu.classList.add('fade-in-container');
            setTimeout(() => dom.introStoryline.classList.add('hidden'), 1500);
        };

        const showNextStoryLine = () => {
            if (storyIndex >= STORYLINE.length) {
                endIntroSequence();
                return;
            }

            dom.storyText.textContent = STORYLINE[storyIndex];
            dom.storyText.className = 'fade-in';
            storyIndex++;

            storyTimeoutId = setTimeout(() => {
                dom.storyText.className = 'fade-out';
                storyTimeoutId = setTimeout(showNextStoryLine, 1500); // Wait for fade-out
            }, 3000); // Display for 3s
        };

        const skipIntro = () => {
            endIntroSequence();
        };
        dom.skipIntroBtn.onclick = skipIntro;

        if (!localStorage.getItem('oaktaleGameState')) {
            // Preloading screen is already visible, this will be hidden by preloadAssets
            // The intro will be made visible by preloadAssets
            dom.skipIntroBtn.classList.remove('hidden');
            showNextStoryLine();
        } else {
            dom.introStoryline.classList.add('hidden');
            dom.mainMenu.classList.remove('hidden');
        }
    };

    // Start preloading, and once it's done, start the game logic.
    ui.preloadAssets(startGameLogic);
}

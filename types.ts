import { SOUNDS } from './sound';

export type CharacterClass = 'Warrior' | 'Assassin' | 'Mage' | 'Hunter' | 'Paladin' | 'Necromancer' | 'Druid' | 'Monk' | 'Bard' | 'Cartomancer' | 'Echoist' | 'Symbiote';
export type GameLocation = 'main-menu' | 'crossroads' | 'town' | 'woods' | 'cave' | 'ruins' | 'clockworkMenagerie' | 'dreamersLabyrinth' | 'saltFlats' | 'vaultOfFrozenMoments' | 'mycelialNetwork' | 'aetheriumDocks' | 'gardenOfReciprocalHunger' | 'sunkenCityOfTwoTides' | 'architectsFolly';
export type EnemyRank = 'Normal' | 'Rare' | 'Elite' | 'Epic' | 'Legend' | 'Mysterious';
export type EnemyType = 'Goblin' | 'Orc' | 'Undead' | 'Beast' | 'Construct' | 'Aberration';
export type ItemType = 'Consumable' | 'Equipment' | 'Material' | 'SkillTome' | 'PetEgg' | 'QuestItem';
export type EquipmentSlot = 'Weapon' | 'Armor' | 'Accessory';
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type ExplorationEventType = 'combat' | 'find_item' | 'find_gold' | 'nothing' | 'treasure' | 'npc' | 'discovery';

export interface ExplorationEvent {
    type: ExplorationEventType;
    chance: number;
    enemyId?: string;
    ambush?: boolean;
    itemId?: string;
    quantity?: number;
    goldAmount?: number;
    items?: { itemId: string; quantity: number }[];
    message?: string;
    xpAmount?: number;
    buff?: Buff;
}

export interface GameState {
    gameData: {
        classData: { [key in CharacterClass]?: any };
        items: { [id: string]: Item };
        enemies: { [id: string]: Enemy };
    };
    characters: Character[];
    selectedCharacter: Character | null;
    currentLocation: GameLocation;
    currentTownName: string;
    inCombat: boolean;
    isExploring: boolean;
    currentEnemy: Enemy | null;
    playerTurn: boolean;
    log: string[];
    isGameOver: boolean;
    currentArtisanBlueprints: Blueprint[];
    currentQuestGiver: { name: string; dialogue: string; quest: Quest | null } | null;
}

export interface PassiveSkill {
    name: string;
    description: string;
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    levelRequired: number;
    mpCost?: number;
    energyCost?: number;
    action: (player: Character, enemy: Enemy) => string;
}

export interface Item {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    rarity: ItemRarity;
    baseCost: number;
    imageUrl?: string;
}

export interface PetEgg extends Item {
    type: 'PetEgg';
    hatchablePets: {
        [key in ItemRarity]?: string[]; // Rarity -> array of pet IDs
    };
}

export interface Equipment extends Item {
    type: 'Equipment';
    slot: EquipmentSlot;
    atkBonus?: number;
    hpBonus?: number;
    mpBonus?: number;
    allowedClasses?: CharacterClass[];
    passive?: { name: string; description: string; };
}

export interface SkillTome extends Item {
    type: 'SkillTome';
    skillId: string;
}

export interface Blueprint {
    id: string;
    name: string;
    description: string;
    resultItemId: string; // ID of an item in the ITEMS table
    requirements: {
        materials: { [itemId: string]: number };
        gold: number;
    };
}

export interface QuestObjective {
    type: 'kill';
    targetId?: string; // enemyId
    targetName: string;
    required: number;
    current: number;
    rank?: EnemyRank;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    objectives: QuestObjective[];
    rewards: {
        xp: number;
        gold: number;
        items?: { itemId: string; quantity: number }[];
    };
    isComplete: boolean;
}

export interface CharacterStats {
    totalKills: number;
    goblinKills: number;
    undeadKills: number;
    orcKills: number;
    beastKills: number;
    constructKills: number;
    aberrationKills: number;
    bossKills: number;
}

export type TitleRequirement = 
    | { type: 'level'; value: number }
    | { type: 'stat'; stat: keyof CharacterStats; value: number };

export interface Title {
    id: string;
    name: string;
    description: string;
    borderColor: string;
    priority: number; // Higher is better
    requirements: TitleRequirement[];
}

export interface Pet {
    name: string;
    portrait: string;
    rarity: ItemRarity;
    level: number;
    xp: number;
    xpToNextLevel: number;
    baseAtk: number;
    atk: number;
    skill: {
        id: string;
        name: string;
        chance: number; // e.g., 0.3 for 30%
        action: (pet: Pet, owner: Character, enemy: Enemy) => string;
    };
}

export interface Character {
    name: CharacterClass;
    portrait: string;
    imageUrl?: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    baseHp: number;
    baseAtk: number;
    hp: number;
    maxHp: number;
    atk: number;
    baseMp?: number;
    mp?: number;
    maxMp?: number;
    energy?: number;
    maxEnergy?: number;
    resourceType: 'Mana' | 'Energy' | 'Health';
    skills: string[];
    inventory: { [itemId: string]: number };
    equipment: {
        Weapon: Equipment | null;
        Armor: Equipment | null;
        Accessory: Equipment | null;
    };
    gold: number;
    buffs: Buff[];
    shield: number;
    secondWindUsedThisCombat: boolean;
    extraTurn: boolean;
    activeQuests: Quest[];
    stats: CharacterStats;
    passiveSkill: PassiveSkill;
    attackCountThisCombat: number;
    hasNewSkill?: boolean;
    pet?: Pet;
}

export interface Buff {
    id: 'attack_up' | 'defense_up' | 'stun' | 'bleed' | 'poison' | 'burn' | 'vulnerable' | 'attack_down' | 'damage_reduction' | 'evasion' | 'invulnerable' | 'shield' | 'meditated' | 'retaliation' | 'blind' | 'focused_assault' | 'echo_strike' | 'identified_weakness' | 'health_regen' | 'mana_regen' | 'fate_strength' | 'fate_fortitude' | 'fate_celerity' | 'fate_renewal' | 'parasitic_drain' | 'symbiotic_surge' | 'deja_vu_buff' | 'deja_vu_used' | 'last_stand_buff' | 'last_stand_used';
    name: string;
    duration: number;
    value?: number; // For DoT damage, shield amount, etc.
}

export interface Enemy {
    id: string;
    name: string;
    portrait: string;
    imageUrl?: string;
    type: EnemyType;
    rank: EnemyRank;
    level: number;
    hp: number;
    maxHp: number;
    atk: number;
    skill?: {
        name: string;
        action: (enemy: Enemy, player: Character) => string;
    };
    xpValue: number;
    drops: {
        gold: number;
        items: { itemId: string; chance: number }[];
    };
    buffs: Buff[];
    shield: number;
}

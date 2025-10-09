export type CharacterClass = 'Warrior' | 'Assassin' | 'Mage' | 'Hunter' | 'Paladin' | 'Necromancer' | 'Druid' | 'Monk' | 'Bard';
export type GameLocation = 'main-menu' | 'crossroads' | 'town' | 'woods' | 'cave' | 'ruins' | 'clockworkMenagerie' | 'dreamersLabyrinth' | 'saltFlats';
export type EnemyRank = 'Normal' | 'Rare' | 'Elite' | 'Epic' | 'Legend' | 'Mysterious';
export type EnemyType = 'Goblin' | 'Orc' | 'Undead' | 'Beast' | 'Construct' | 'Aberration';
export type ItemType = 'Consumable' | 'Equipment' | 'Material' | 'SkillTome';
export type EquipmentSlot = 'Weapon' | 'Armor' | 'Accessory';
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface Skill {
    id: string;
    name: string;
    description: string;
    levelRequired: number;
    action: (player: Character, enemy: Enemy) => string;
}

export interface Item {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    rarity: ItemRarity;
    baseCost: number;
}

export interface Equipment extends Item {
    type: 'Equipment';
    slot: EquipmentSlot;
    atkBonus?: number;
    hpBonus?: number;
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


export interface Character {
    name: CharacterClass;
    portrait: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    baseHp: number;
    baseAtk: number;
    hp: number;
    maxHp: number;
    atk: number;
    skills: string[];
    skillPoints: number;
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
}

export interface Buff {
    id: 'attack_up' | 'defense_up' | 'stun' | 'bleed' | 'poison' | 'burn' | 'vulnerable' | 'attack_down' | 'damage_reduction' | 'evasion' | 'invulnerable' | 'shield' | 'meditated' | 'retaliation' | 'blind' | 'focused_assault' | 'echo_strike' | 'identified_weakness' | 'health_regen';
    name: string;
    duration: number;
    value?: number; // For DoT damage, shield amount, etc.
}

export interface Enemy {
    name: string;
    portrait: string;
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
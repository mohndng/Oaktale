


// FIX: Imported the 'Buff' type from './types' to resolve a type error.
import { Character, CharacterClass, Skill, Title, PassiveSkill, Item, Equipment, SkillTome, ItemRarity, Enemy, EnemyType, EnemyRank, Blueprint, Quest, QuestObjective, ExplorationEvent, GameLocation, Pet, PetEgg, Buff } from './types';
import { applyDamage, calculateDamage, dealPlayerDamage } from './game';
import * as ui from './ui';
import { soundManager } from './sound';
import { SOUNDS } from './sound';

export const TOWN_NAME_PREFIXES = ['Oak', 'Stone', 'River', 'Shadow', 'Iron', 'Silver', 'Dragon', 'Whisper'];
export const TOWN_NAME_SUFFIXES = ['haven', 'watch', 'bend', 'creek', 'fall', 'crest', 'wood', 'dale'];

export const RARITY_DATA: { [key in ItemRarity]: { color: string; multiplier: number } } = {
    Common: { color: '#cbd5e1', multiplier: 1 },
    Uncommon: { color: '#4ade80', multiplier: 1.5 },
    Rare: { color: '#60a5fa', multiplier: 2.2 },
    Epic: { color: '#c084fc', multiplier: 3.5 },
    Legendary: { color: '#fb923c', multiplier: 5.0 },
};

export const PET_DATA: { [id: string]: Omit<Pet, 'level' | 'xp' | 'xpToNextLevel' | 'atk'> } = {
    armoredWarhound: {
        name: 'Armored Warhound',
        rarity: 'Uncommon',
        portrait: `<svg viewBox="0 0 100 100"><path d="M50 30 C 40 20, 20 40, 30 60 L 50 80 L 70 60 C 80 40, 60 20, 50 30 Z" fill="#A9A9A9"/><path d="M40 50 H 60 M 45 60 V 70 M 55 60 V 70" stroke="#696969" stroke-width="4"/><circle cx="45" cy="45" r="3" fill="black"/><circle cx="55" cy="45" r="3" fill="black"/></svg>`,
        baseAtk: 6,
        skill: {
            id: 'hound_guard', name: 'Guard', chance: 0.3,
            action: (pet, owner, enemy) => {
                const shield = Math.floor(owner.maxHp * 0.1);
                owner.shield += shield;
                ui.triggerAnimation('player-combatant-card', 'animate-shield');
                soundManager.play(SOUNDS.SHIELD);
                return `${pet.name} stands guard, granting its master a ${shield} point shield.`;
            }
        }
    },
    shadowPanther: {
        name: 'Shadow Panther',
        rarity: 'Rare',
        portrait: `<svg viewBox="0 0 100 100"><path d="M20 70 C 30 50, 70 50, 80 70 Q 50 60, 20 70" fill="#2F4F4F"/><path d="M40 60 Q 50 50, 60 60" stroke="#9370DB" stroke-width="3" fill="none"/><circle cx="40" cy="55" r="4" fill="#9370DB"/><circle cx="60" cy="55" r="4" fill="#9370DB"/></svg>`,
        baseAtk: 8,
        skill: {
            id: 'panther_pounce', name: 'Pounce', chance: 0.4,
            action: (pet, owner, enemy) => {
                const damage = applyDamage(enemy, calculateDamage(pet, enemy, pet.atk * 1.5));
                ui.showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
                return `${pet.name} pounces from the shadows, dealing ${damage.damageDealt} damage.`;
            }
        }
    },
    arcaneFamiliar: {
        name: 'Arcane Familiar',
        rarity: 'Uncommon',
        portrait: `<svg viewBox="0 0 100 100"><path d="M50 20 C 30 40, 30 70, 50 80 C 70 70, 70 40, 50 20" fill="#60a5fa" opacity="0.7"/><circle cx="50" cy="50" r="5" fill="white"/></svg>`,
        baseAtk: 4,
        skill: {
            id: 'familiar_bolt', name: 'Arcane Bolt', chance: 0.5,
            action: (pet, owner, enemy) => {
                const damage = applyDamage(enemy, calculateDamage(pet, enemy, pet.atk * 2.0));
                 ui.showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
                if (owner.mp !== undefined && owner.maxMp !== undefined) {
                    const mana_regen = Math.floor(owner.maxMp * 0.05);
                    owner.mp = Math.min(owner.maxMp, owner.mp + mana_regen);
                    return `${pet.name} fires a bolt for ${damage.damageDealt} damage, restoring ${mana_regen} mana to its master.`;
                }
                return `${pet.name} fires a bolt for ${damage.damageDealt} damage.`;
            }
        }
    },
    wolfCompanion: {
        name: 'Wolf Companion',
        rarity: 'Common',
        portrait: `<svg viewBox="0 0 100 100"><path d="M50 20 L70 40 L60 60 L50 50 L40 60 L30 40 Z M50 50 L50 80 M40 75 L60 75" stroke="#ccc" stroke-width="4" fill="none"/><path d="M45 35 Q50 30 55 35" stroke="#ccc" stroke-width="3" fill="none"/></svg>`,
        baseAtk: 5,
        skill: {
            id: 'wolf_rend', name: 'Rend', chance: 0.3,
            action: (pet, owner, enemy) => {
                const damage = applyDamage(enemy, calculateDamage(pet, enemy, pet.atk * 1.2));
                enemy.buffs.push({ id: 'bleed', name: 'Bleeding', duration: 2, value: Math.floor(pet.atk * 0.5) });
                ui.showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
                return `${pet.name} uses Rend, dealing ${damage.damageDealt} damage and causing the enemy to bleed.`;
            }
        }
    },
    griffonHatchling: {
        name: 'Griffon Hatchling',
        rarity: 'Rare',
        portrait: `<svg viewBox="0 0 100 100"><path d="M30 70 Q 50 50 70 70 C 60 80, 40 80, 30 70" fill="#DAA520"/><path d="M40 40 L 60 40 L 50 20 Z" fill="#F0E68C"/><circle cx="45" cy="45" r="3" fill="black"/><circle cx="55" cy="45" r="3" fill="black"/></svg>`,
        baseAtk: 7,
        skill: {
            id: 'griffon_swoop', name: 'Swoop', chance: 0.35,
            action: (pet, owner, enemy) => {
                const damage = applyDamage(enemy, calculateDamage(pet, enemy, pet.atk * 1.3));
                if (owner.buffs.find(b => b.id === 'evasion')) {
                    owner.buffs.find(b => b.id === 'evasion')!.duration += 1;
                } else {
                    owner.buffs.push({ id: 'evasion', name: 'Evasive Maneuver', duration: 2, value: 0.15 });
                }
                ui.showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
                return `${pet.name} swoops down, dealing ${damage.damageDealt} damage and granting its master evasion.`;
            }
        }
    },
    spiritWisp: {
        name: 'Spirit Wisp',
        rarity: 'Epic',
        portrait: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="rgba(173, 216, 230, 0.7)"><animate attributeName="r" values="20;25;20" dur="3s" repeatCount="indefinite"/></circle><circle cx="50" cy="50" r="10" fill="white"/></svg>`,
        baseAtk: 10,
        skill: {
            id: 'wisp_echo', name: 'Echoing Blast', chance: 0.5,
            action: (pet, owner, enemy) => {
                const damage = applyDamage(enemy, calculateDamage(pet, enemy, pet.atk * 1.5));
                ui.showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
                return `${pet.name} resonates with arcane energy, dealing ${damage.damageDealt} damage.`;
            }
        }
    },
};

export const ITEMS: { [id: string]: Item } = {
    // Consumables
    healthPotion: { id: 'healthPotion', name: 'Health Potion', description: 'Restores 50 HP.', type: 'Consumable', rarity: 'Common', baseCost: 20 },
    manaPotion: { id: 'manaPotion', name: 'Mana Potion', description: 'Restores 30 MP.', type: 'Consumable', rarity: 'Common', baseCost: 25 },
    strengthPotion: { id: 'strengthPotion', name: 'Strength Potion', description: 'Increases ATK by 30% for 3 turns.', type: 'Consumable', rarity: 'Uncommon', baseCost: 50 },
    // Materials
    wolfPelt: { id: 'wolfPelt', name: 'Wolf Pelt', description: 'A common pelt from a forest wolf.', type: 'Material', rarity: 'Common', baseCost: 5 },
    batWing: { id: 'batWing', name: 'Bat Wing', description: 'A leathery wing from a cave bat.', type: 'Material', rarity: 'Common', baseCost: 5 },
    spiderSilk: { id: 'spiderSilk', name: 'Spider Silk', description: 'Strong and sticky silk.', type: 'Material', rarity: 'Common', baseCost: 8 },
    ancientCoin: { id: 'ancientCoin', name: 'Ancient Coin', description: 'A worn coin from a forgotten era.', type: 'Material', rarity: 'Uncommon', baseCost: 15 },
    ectoplasm: { id: 'ectoplasm', name: 'Ectoplasm', description: 'A viscous remnant of a spirit.', type: 'Material', rarity: 'Uncommon', baseCost: 20 },
    // --- NEW MATERIALS ---
    ironOre: { id: 'ironOre', name: 'Iron Ore', description: 'A chunk of raw iron.', type: 'Material', rarity: 'Common', baseCost: 10 },
    hardenedLeather: { id: 'hardenedLeather', name: 'Hardened Leather', description: 'Leather treated to be as tough as wood.', type: 'Material', rarity: 'Uncommon', baseCost: 25 },
    arcaneCrystal: { id: 'arcaneCrystal', name: 'Arcane Crystal', description: 'A crystal humming with magical energy.', type: 'Material', rarity: 'Rare', baseCost: 75 },
    shadowSilk: { id: 'shadowSilk', name: 'Shadow Silk', description: 'Silk from a phase spider, cool to the touch.', type: 'Material', rarity: 'Rare', baseCost: 60 },
    orcTusk: { id: 'orcTusk', name: 'Orc Tusk', description: 'A large, sharp tusk from an orc.', type: 'Material', rarity: 'Uncommon', baseCost: 20 },
    goblinEar: { id: 'goblinEar', name: 'Goblin Ear', description: 'A gruesome but common proof of a kill.', type: 'Material', rarity: 'Common', baseCost: 3 },
    corruptedEssence: { id: 'corruptedEssence', name: 'Corrupted Essence', description: 'The malevolent energy of a blighted creature.', type: 'Material', rarity: 'Rare', baseCost: 100 },
    glimmeringDust: { id: 'glimmeringDust', name: 'Glimmering Dust', description: 'Dust that shines with faint, magical light.', type: 'Material', rarity: 'Uncommon', baseCost: 30 },
    obsidianShard: { id: 'obsidianShard', name: 'Obsidian Shard', description: 'A razor-sharp piece of volcanic glass.', type: 'Material', rarity: 'Rare', baseCost: 50 },
    frozenTear: { id: 'frozenTear', name: 'Frozen Tear', description: 'A gem that is perpetually cold.', type: 'Material', rarity: 'Epic', baseCost: 200 },
    clockworkCog: { id: 'clockworkCog', name: 'Clockwork Cog', description: 'A complex gear from a mechanical creature.', type: 'Material', rarity: 'Uncommon', baseCost: 40 },
    dreamweaveShard: { id: 'dreamweaveShard', name: 'Dreamweave Shard', description: 'A fragment of a solid dream.', type: 'Material', rarity: 'Epic', baseCost: 250 },

    // Skill Tomes
    tomeOfPowerStrike: { id: 'tomeOfPowerStrike', name: 'Tome: Power Strike', description: 'Teaches the Power Strike skill.', type: 'SkillTome', skillId: 'power_strike', rarity: 'Uncommon', baseCost: 200 } as SkillTome,
    // --- NEW SKILL TOMES ---
    tomeOfBleedingStrike: { id: 'tomeOfBleedingStrike', name: 'Tome: Bleeding Strike', description: 'Teaches the Bleeding Strike skill.', type: 'SkillTome', skillId: 'bleeding_strike', rarity: 'Uncommon', baseCost: 250 } as SkillTome,
    tomeOfFirstAid: { id: 'tomeOfFirstAid', name: 'Tome: First Aid', description: 'Teaches the First Aid skill.', type: 'SkillTome', skillId: 'first_aid', rarity: 'Common', baseCost: 150 } as SkillTome,
    tomeOfExecute: { id: 'tomeOfExecute', name: 'Tome: Execute', description: 'Teaches the Execute skill.', type: 'SkillTome', skillId: 'execute', rarity: 'Rare', baseCost: 500 } as SkillTome,
    tomeOfShieldWall: { id: 'tomeOfShieldWall', name: 'Tome: Shield Wall', description: 'Teaches the Shield Wall skill.', type: 'SkillTome', skillId: 'shield_wall', rarity: 'Rare', baseCost: 400 } as SkillTome,
    tomeOfSunder: { id: 'tomeOfSunder', name: 'Tome: Sunder', description: 'Teaches the Sunder skill.', type: 'SkillTome', skillId: 'sunder', rarity: 'Uncommon', baseCost: 300 } as SkillTome,
    tomeOfPurify: { id: 'tomeOfPurify', name: 'Tome: Purify', description: 'Teaches the Purify skill.', type: 'SkillTome', skillId: 'purify', rarity: 'Rare', baseCost: 350 } as SkillTome,
    tomeOfFocus: { id: 'tomeOfFocus', name: 'Tome: Focus', description: 'Teaches the Focus skill.', type: 'SkillTome', skillId: 'focus', rarity: 'Uncommon', baseCost: 200 } as SkillTome,
    tomeOfRetaliate: { id: 'tomeOfRetaliate', name: 'Tome: Retaliate', description: 'Teaches the Retaliate skill.', type: 'SkillTome', skillId: 'retaliate', rarity: 'Rare', baseCost: 600 } as SkillTome,
    tomeOfGamble: { id: 'tomeOfGamble', name: 'Tome: Gamble', description: 'Teaches the Gamble skill.', type: 'SkillTome', skillId: 'gamble', rarity: 'Epic', baseCost: 1000 } as SkillTome,
    tomeOfLastStand: { id: 'tomeOfLastStand', name: 'Tome: Last Stand', description: 'Teaches the Last Stand skill.', type: 'SkillTome', skillId: 'last_stand', rarity: 'Epic', baseCost: 1200 } as SkillTome,

    // Pet Eggs
    commonEgg: { 
        id: 'commonEgg', 
        name: 'Mysterious Egg', 
        description: 'A strange, smooth egg. It might hatch into a companion.', 
        type: 'PetEgg',
        rarity: 'Rare', 
        baseCost: 300,
        hatchablePets: {
            Common: ['wolfCompanion'],
            Uncommon: ['armoredWarhound', 'arcaneFamiliar'],
            Rare: ['shadowPanther', 'griffonHatchling'],
            Epic: ['spiritWisp']
        }
    } as PetEgg,
    // Equipment - Weapons
    rustySword: { id: 'rustySword', name: 'Rusty Sword', description: 'A simple, worn-out sword.', type: 'Equipment', slot: 'Weapon', atkBonus: 2, rarity: 'Common', baseCost: 15 } as Equipment,
    ironMace: { id: 'ironMace', name: 'Iron Mace', description: 'A sturdy iron mace.', type: 'Equipment', slot: 'Weapon', atkBonus: 5, rarity: 'Uncommon', baseCost: 50 } as Equipment,
    enchantedStaff: { id: 'enchantedStaff', name: 'Enchanted Staff', description: 'A staff humming with magical energy.', type: 'Equipment', slot: 'Weapon', atkBonus: 4, mpBonus: 20, rarity: 'Rare', baseCost: 150, allowedClasses: ['Mage', 'Necromancer', 'Druid', 'Bard', 'Cartomancer', 'Echoist'] } as Equipment,

    // --- NEW WEAPONS (50) ---
    // Generic
    trainingSword: { id: 'trainingSword', name: 'Training Sword', description: 'A blunted sword for practice.', type: 'Equipment', slot: 'Weapon', atkBonus: 1, rarity: 'Common', baseCost: 10 } as Equipment,
    steelLongsword: { id: 'steelLongsword', name: 'Steel Longsword', description: 'A reliable and sharp longsword.', type: 'Equipment', slot: 'Weapon', atkBonus: 8, rarity: 'Uncommon', baseCost: 120 } as Equipment,
    obsidianDagger: { id: 'obsidianDagger', name: 'Obsidian Dagger', description: 'A wickedly sharp volcanic glass dagger.', type: 'Equipment', slot: 'Weapon', atkBonus: 7, rarity: 'Uncommon', baseCost: 110, passive: { name: 'Jagged', description: 'Attacks have a chance to cause bleeding.' } } as Equipment,
    // Warrior
    warriorsGreataxe: { id: 'warriorsGreataxe', name: 'Warrior\'s Greataxe', description: 'A heavy axe that can cleave through armor.', type: 'Equipment', slot: 'Weapon', atkBonus: 12, hpBonus: 10, rarity: 'Rare', baseCost: 250, allowedClasses: ['Warrior'] } as Equipment,
    bladeOfTheStalwart: { id: 'bladeOfTheStalwart', name: 'Blade of the Stalwart', description: 'A sword that reinforces the wielder\'s vitality.', type: 'Equipment', slot: 'Weapon', atkBonus: 20, hpBonus: 50, rarity: 'Epic', baseCost: 1500, allowedClasses: ['Warrior'] } as Equipment,
    worldCleaver: { id: 'worldCleaver', name: 'World Cleaver', description: 'An axe of legendary might, said to have shaped mountains.', type: 'Equipment', slot: 'Weapon', atkBonus: 40, rarity: 'Legendary', baseCost: 8000, allowedClasses: ['Warrior'], passive: { name: 'Sunder', description: 'Attacks lower enemy defense.' } } as Equipment,
    // Mage
    archmagesStaff: { id: 'archmagesStaff', name: 'Archmage\'s Staff', description: 'A staff brimming with raw arcane power.', type: 'Equipment', slot: 'Weapon', atkBonus: 15, mpBonus: 50, rarity: 'Rare', baseCost: 300, allowedClasses: ['Mage'] } as Equipment,
    scepterOfFlame: { id: 'scepterOfFlame', name: 'Scepter of Flame', description: 'A wand that enhances fire magic.', type: 'Equipment', slot: 'Weapon', atkBonus: 25, rarity: 'Epic', baseCost: 1800, allowedClasses: ['Mage'], passive: { name: 'Incinerate', description: 'Fireball applies a stronger, longer-lasting burn.' } } as Equipment,
    staffOfCosmicUnderstanding: { id: 'staffOfCosmicUnderstanding', name: 'Staff of Cosmic Understanding', description: 'Glimpse into the workings of the universe.', type: 'Equipment', slot: 'Weapon', atkBonus: 45, mpBonus: 100, rarity: 'Legendary', baseCost: 9000, allowedClasses: ['Mage'] } as Equipment,
    // Assassin
    twinbladesOfShadow: { id: 'twinbladesOfShadow', name: 'Twinblades of Shadow', description: 'Daggers that strike with blinding speed.', type: 'Equipment', slot: 'Weapon', atkBonus: 11, rarity: 'Rare', baseCost: 280, allowedClasses: ['Assassin'] } as Equipment,
    theKingslayer: { id: 'theKingslayer', name: 'The Kingslayer', description: 'A dagger coated in a legendary poison.', type: 'Equipment', slot: 'Weapon', atkBonus: 22, rarity: 'Epic', baseCost: 1700, allowedClasses: ['Assassin'], passive: { name: 'Lethal Venom', description: 'Viper\'s Strike poison deals significantly more damage.' } } as Equipment,
    miseryAndDespair: { id: 'miseryAndDespair', name: 'Misery and Despair', description: 'A pair of daggers that feast on the target\'s suffering.', type: 'Equipment', slot: 'Weapon', atkBonus: 38, rarity: 'Legendary', baseCost: 8500, allowedClasses: ['Assassin'], passive: { name: 'Suffering', description: 'Deals bonus damage for each debuff on the target.' } } as Equipment,
    // Hunter
    huntersLongbow: { id: 'huntersLongbow', name: 'Hunter\'s Longbow', description: 'A sturdy longbow for felling beasts.', type: 'Equipment', slot: 'Weapon', atkBonus: 10, rarity: 'Rare', baseCost: 220, allowedClasses: ['Hunter'] } as Equipment,
    eagleEyeCrossbow: { id: 'eagleEyeCrossbow', name: 'Eagle Eye Crossbow', description: 'Never misses its mark.', type: 'Equipment', slot: 'Weapon', atkBonus: 21, rarity: 'Epic', baseCost: 1600, allowedClasses: ['Hunter'], passive: { name: 'True Shot', description: 'Precise Shot has a higher chance to critically hit.' } } as Equipment,
    windforce: { id: 'windforce', name: 'Windforce', description: 'A legendary bow that fires arrows faster than the eye can see.', type: 'Equipment', slot: 'Weapon', atkBonus: 36, rarity: 'Legendary', baseCost: 8200, allowedClasses: ['Hunter'], passive: { name: 'Knockback', description: 'Attacks have a chance to stun.' } } as Equipment,
    // Paladin
    hammerOfJustice: { id: 'hammerOfJustice', name: 'Hammer of Justice', description: 'A blessed warhammer that shines with holy light.', type: 'Equipment', slot: 'Weapon', atkBonus: 10, hpBonus: 20, rarity: 'Rare', baseCost: 260, allowedClasses: ['Paladin'] } as Equipment,
    greatswordOfValor: { id: 'greatswordOfValor', name: 'Greatsword of Valor', description: 'A blade that inspires courage in allies.', type: 'Equipment', slot: 'Weapon', atkBonus: 19, mpBonus: 20, rarity: 'Epic', baseCost: 1550, allowedClasses: ['Paladin'] } as Equipment,
    lightbringer: { id: 'lightbringer', name: 'Lightbringer', description: 'A legendary sword that burns undead to ash.', type: 'Equipment', slot: 'Weapon', atkBonus: 35, rarity: 'Legendary', baseCost: 8800, allowedClasses: ['Paladin'], passive: { name: 'Purging Flame', description: 'Attacks against Undead have a chance to instantly kill them.' } } as Equipment,
    // Necromancer
    ritualScythe: { id: 'ritualScythe', name: 'Ritual Scythe', description: 'A scythe used in dark rituals, still stained.', type: 'Equipment', slot: 'Weapon', atkBonus: 9, mpBonus: 30, rarity: 'Rare', baseCost: 270, allowedClasses: ['Necromancer'] } as Equipment,
    staffOfBinding: { id: 'staffOfBinding', name: 'Staff of Binding', description: 'A staff that enhances life-draining magic.', type: 'Equipment', slot: 'Weapon', atkBonus: 18, rarity: 'Epic', baseCost: 1650, allowedClasses: ['Necromancer'], passive: { name: 'Greater Drain', description: 'Life Drain heals for more.' } } as Equipment,
    soulreaper: { id: 'soulreaper', name: 'Soulreaper', description: 'A scythe that tears the very soul from its victims.', type: 'Equipment', slot: 'Weapon', atkBonus: 34, mpBonus: 50, rarity: 'Legendary', baseCost: 8600, allowedClasses: ['Necromancer'] } as Equipment,
    // Druid
    gnarledBranch: { id: 'gnarledBranch', name: 'Gnarled Branch', description: 'A staff imbued with the power of the wild.', type: 'Equipment', slot: 'Weapon', atkBonus: 9, hpBonus: 15, rarity: 'Rare', baseCost: 240, allowedClasses: ['Druid'] } as Equipment,
    clawsOfUrsoc: { id: 'clawsOfUrsoc', name: 'Claws of Ursoc', description: 'Fist weapons that mimic the claws of a great bear.', type: 'Equipment', slot: 'Weapon', atkBonus: 20, rarity: 'Epic', baseCost: 1600, allowedClasses: ['Druid'], passive: { name: 'Maul+', description: 'Maul deals more damage and its bleed is stronger.' } } as Equipment,
    scytheOfElune: { id: 'scytheOfElune', name: 'Scythe of Elune', description: 'A legendary staff connected to the moon and the pack.', type: 'Equipment', slot: 'Weapon', atkBonus: 33, mpBonus: 40, rarity: 'Legendary', baseCost: 8400, allowedClasses: ['Druid'] } as Equipment,
    // Monk
    ironFists: { id: 'ironFists', name: 'Iron Fists', description: 'Weighted gauntlets for powerful punches.', type: 'Equipment', slot: 'Weapon', atkBonus: 11, rarity: 'Rare', baseCost: 230, allowedClasses: ['Monk'] } as Equipment,
    staffOfFlowingWater: { id: 'staffOfFlowingWater', name: 'Staff of Flowing Water', description: 'A staff that moves with incredible grace.', type: 'Equipment', slot: 'Weapon', atkBonus: 21, rarity: 'Epic', baseCost: 1500, allowedClasses: ['Monk'], passive: { name: 'Dodge+', description: 'Increases dodge chance.' } } as Equipment,
    fistsOfLegend: { id: 'fistsOfLegend', name: 'Fists of Legend', description: 'Fist wraps worn by a legendary martial artist.', type: 'Equipment', slot: 'Weapon', atkBonus: 37, rarity: 'Legendary', baseCost: 8300, allowedClasses: ['Monk'], passive: { name: 'Combo', description: 'Flurry of Blows has a chance to strike a third time.' } } as Equipment,
    // Bard
    minstrelsLute: { id: 'minstrelsLute', name: 'Minstrel\'s Lute', description: 'A finely crafted lute, perfect for inspiring tales.', type: 'Equipment', slot: 'Weapon', atkBonus: 8, mpBonus: 25, rarity: 'Rare', baseCost: 210, allowedClasses: ['Bard'] } as Equipment,
    rapierOfDissonance: { id: 'rapierOfDissonance', name: 'Rapier of Dissonance', description: 'A blade that hums with confusing melodies.', type: 'Equipment', slot: 'Weapon', atkBonus: 18, rarity: 'Epic', baseCost: 1450, allowedClasses: ['Bard'], passive: { name: 'Discord', description: 'Dissonant Melody is more likely to apply both debuffs.' } } as Equipment,
    lyreOfCreation: { id: 'lyreOfCreation', name: 'Lyre of Creation', description: 'A legendary instrument said to have played the world into existence.', type: 'Equipment', slot: 'Weapon', atkBonus: 32, mpBonus: 60, rarity: 'Legendary', baseCost: 8100, allowedClasses: ['Bard'] } as Equipment,
    // Cartomancer
    deckOfWhispers: { id: 'deckOfWhispers', name: 'Deck of Whispers', description: 'Cards that seem to speak of future possibilities.', type: 'Equipment', slot: 'Weapon', atkBonus: 10, mpBonus: 20, rarity: 'Rare', baseCost: 250, allowedClasses: ['Cartomancer'] } as Equipment,
    fiveOfSwords: { id: 'fiveOfSwords', name: 'Five of Swords', description: 'A deck that favors conflict and victory.', type: 'Equipment', slot: 'Weapon', atkBonus: 20, rarity: 'Epic', baseCost: 1550, allowedClasses: ['Cartomancer'], passive: { name: 'Higher Stakes', description: 'Wild Card has a higher chance to crit, but also to backfire.' } } as Equipment,
    theWorldTree: { id: 'theWorldTree', name: 'The World Tree', description: 'A legendary deck bound with a splinter of the Great Oak.', type: 'Equipment', slot: 'Weapon', atkBonus: 34, mpBonus: 55, rarity: 'Legendary', baseCost: 8700, allowedClasses: ['Cartomancer'] } as Equipment,
    // Echoist
    temporalEdge: { id: 'temporalEdge', name: 'Temporal Edge', description: 'A blade that seems to exist a second in the past and future.', type: 'Equipment', slot: 'Weapon', atkBonus: 11, rarity: 'Rare', baseCost: 260, allowedClasses: ['Echoist'] } as Equipment,
    bladeOfDejaVu: { id: 'bladeOfDejaVu', name: 'Blade of Deja Vu', description: 'A sword that empowers temporal magic.', type: 'Equipment', slot: 'Weapon', atkBonus: 22, rarity: 'Epic', baseCost: 1650, allowedClasses: ['Echoist'], passive: { name: 'Resonance', description: 'Lingering Harmonics deals more damage.' } } as Equipment,
    infinityBlade: { id: 'infinityBlade', name: 'Infinity Blade', description: 'A blade unstuck from time, striking all moments at once.', type: 'Equipment', slot: 'Weapon', atkBonus: 38, mpBonus: 40, rarity: 'Legendary', baseCost: 8900, allowedClasses: ['Echoist'] } as Equipment,
    // Symbiote
    livingClaws: { id: 'livingClaws', name: 'Living Claws', description: 'The symbiote extends into sharp, chitinous claws.', type: 'Equipment', slot: 'Weapon', atkBonus: 10, hpBonus: 20, rarity: 'Rare', baseCost: 250, allowedClasses: ['Symbiote'] } as Equipment,
    whipOfFlesh: { id: 'whipOfFlesh', name: 'Whip of Flesh', description: 'A tendril that drains life more effectively.', type: 'Equipment', slot: 'Weapon', atkBonus: 19, rarity: 'Epic', baseCost: 1600, allowedClasses: ['Symbiote'], passive: { name: 'Hunger', description: 'Parasitic Drain deals more damage.' } } as Equipment,
    apexPredatorsMaw: { id: 'apexPredatorsMaw', name: 'Apex Predator\'s Maw', description: 'The symbiote itself becomes the ultimate weapon.', type: 'Equipment', slot: 'Weapon', atkBonus: 35, hpBonus: 100, rarity: 'Legendary', baseCost: 8500, allowedClasses: ['Symbiote'] } as Equipment,
    // Extra Weapons for Variety
    spikedClub: { id: 'spikedClub', name: 'Spiked Club', description: 'A heavy club with iron spikes.', type: 'Equipment', slot: 'Weapon', atkBonus: 6, rarity: 'Uncommon', baseCost: 70 } as Equipment,
    shortbow: { id: 'shortbow', name: 'Shortbow', description: 'A simple bow for quick shots.', type: 'Equipment', slot: 'Weapon', atkBonus: 4, rarity: 'Common', baseCost: 40, allowedClasses: ['Hunter', 'Assassin', 'Bard'] } as Equipment,
    crystalWand: { id: 'crystalWand', name: 'Crystal Wand', description: 'A wand with a small arcane crystal.', type: 'Equipment', slot: 'Weapon', atkBonus: 3, mpBonus: 15, rarity: 'Uncommon', baseCost: 80, allowedClasses: ['Mage', 'Necromancer'] } as Equipment,
    battleaxe: { id: 'battleaxe', name: 'Battleaxe', description: 'A standard one-handed axe.', type: 'Equipment', slot: 'Weapon', atkBonus: 7, rarity: 'Uncommon', baseCost: 90, allowedClasses: ['Warrior', 'Paladin'] } as Equipment,
    elvenRapier: { id: 'elvenRapier', name: 'Elven Rapier', description: 'A light and swift blade.', type: 'Equipment', slot: 'Weapon', atkBonus: 13, rarity: 'Rare', baseCost: 320, allowedClasses: ['Assassin', 'Bard', 'Echoist'] } as Equipment,
    quarterstaff: { id: 'quarterstaff', name: 'Quarterstaff', description: 'A simple but effective staff.', type: 'Equipment', slot: 'Weapon', atkBonus: 3, rarity: 'Common', baseCost: 20 } as Equipment,
    glaive: { id: 'glaive', name: 'Glaive', description: 'A polearm with a single-edged blade.', type: 'Equipment', slot: 'Weapon', atkBonus: 9, rarity: 'Uncommon', baseCost: 150, allowedClasses: ['Warrior', 'Paladin', 'Druid'] } as Equipment,
    boneClub: { id: 'boneClub', name: 'Bone Club', description: 'A heavy femur from some large beast.', type: 'Equipment', slot: 'Weapon', atkBonus: 4, rarity: 'Common', baseCost: 35 } as Equipment,
    masterworkDagger: { id: 'masterworkDagger', name: 'Masterwork Dagger', description: 'A perfectly balanced dagger.', type: 'Equipment', slot: 'Weapon', atkBonus: 10, rarity: 'Rare', baseCost: 200, allowedClasses: ['Assassin', 'Hunter', 'Bard'] } as Equipment,
    heavyCrossbow: { id: 'heavyCrossbow', name: 'Heavy Crossbow', description: 'A slow but powerful crossbow.', type: 'Equipment', slot: 'Weapon', atkBonus: 14, rarity: 'Rare', baseCost: 280, allowedClasses: ['Hunter', 'Warrior'] } as Equipment,
    lichsPhylactery: { id: 'lichsPhylactery', name: 'Lich\'s Phylactery', description: 'An orb that holds a fragment of a lich\'s soul.', type: 'Equipment', slot: 'Weapon', atkBonus: 12, mpBonus: 40, rarity: 'Rare', baseCost: 450, allowedClasses: ['Necromancer'] } as Equipment,

    // Equipment - Armor
    leatherTunic: { id: 'leatherTunic', name: 'Leather Tunic', description: 'Basic leather armor.', type: 'Equipment', slot: 'Armor', hpBonus: 10, rarity: 'Common', baseCost: 20 } as Equipment,
    ironCuirass: { id: 'ironCuirass', name: 'Iron Cuirass', description: 'A protective iron breastplate.', type: 'Equipment', slot: 'Armor', hpBonus: 25, rarity: 'Uncommon', baseCost: 60 } as Equipment,
    // --- NEW ARMOR (20) ---
    paddedArmor: { id: 'paddedArmor', name: 'Padded Armor', description: 'Thick cloth armor, better than nothing.', type: 'Equipment', slot: 'Armor', hpBonus: 5, rarity: 'Common', baseCost: 10 } as Equipment,
    studdedLeather: { id: 'studdedLeather', name: 'Studded Leather', description: 'Leather armor reinforced with metal studs.', type: 'Equipment', slot: 'Armor', hpBonus: 18, rarity: 'Uncommon', baseCost: 45 } as Equipment,
    chainmailHauberk: { id: 'chainmailHauberk', name: 'Chainmail Hauberk', description: 'A shirt of interlocking metal rings.', type: 'Equipment', slot: 'Armor', hpBonus: 35, rarity: 'Uncommon', baseCost: 100 } as Equipment,
    magesRobes: { id: 'magesRobes', name: 'Mage\'s Robes', description: 'Robes woven with mana-focusing threads.', type: 'Equipment', slot: 'Armor', hpBonus: 15, mpBonus: 20, rarity: 'Uncommon', baseCost: 90, allowedClasses: ['Mage', 'Necromancer', 'Bard', 'Cartomancer'] } as Equipment,
    shadowweaveTunic: { id: 'shadowweaveTunic', name: 'Shadowweave Tunic', description: 'Armor that blends into the darkness.', type: 'Equipment', slot: 'Armor', hpBonus: 30, rarity: 'Rare', baseCost: 200, allowedClasses: ['Assassin'], passive: { name: 'Elusive', description: 'Slightly increases dodge chance.' } } as Equipment,
    steelPlateArmor: { id: 'steelPlateArmor', name: 'Steel Plate Armor', description: 'Full plate armor offering excellent protection.', type: 'Equipment', slot: 'Armor', hpBonus: 60, rarity: 'Rare', baseCost: 250, allowedClasses: ['Warrior', 'Paladin'] } as Equipment,
    druidsVestments: { id: 'druidsVestments', name: 'Druid\'s Vestments', description: 'Armor made of enchanted wood and leaves.', type: 'Equipment', slot: 'Armor', hpBonus: 40, mpBonus: 15, rarity: 'Rare', baseCost: 220, allowedClasses: ['Druid'] } as Equipment,
    monksGi: { id: 'monksGi', name: 'Monk\'s Gi', description: 'A lightweight gi that allows for maximum mobility.', type: 'Equipment', slot: 'Armor', hpBonus: 35, rarity: 'Rare', baseCost: 180, allowedClasses: ['Monk'] } as Equipment,
    armorOfThorns: { id: 'armorOfThorns', name: 'Armor of Thorns', description: 'Armor covered in sharp barbs.', type: 'Equipment', slot: 'Armor', hpBonus: 80, rarity: 'Epic', baseCost: 1200, passive: { name: 'Thorns', description: 'Reflects a small amount of damage back to melee attackers.' } } as Equipment,
    archonsRobes: { id: 'archonsRobes', name: 'Archon\'s Robes', description: 'Robes that absorb hostile magic.', type: 'Equipment', slot: 'Armor', hpBonus: 50, mpBonus: 70, rarity: 'Epic', baseCost: 1500, allowedClasses: ['Mage', 'Necromancer'], passive: { name: 'Spellshield', description: 'Chance to halve incoming spell damage.' } } as Equipment,
    crusadersPlate: { id: 'crusadersPlate', name: 'Crusader\'s Plate', description: 'Holy armor that heals the wearer.', type: 'Equipment', slot: 'Armor', hpBonus: 100, rarity: 'Epic', baseCost: 1600, allowedClasses: ['Paladin'], passive: { name: 'Holy Light', description: 'Slowly regenerates HP in combat.' } } as Equipment,
    celestialRaiment: { id: 'celestialRaiment', name: 'Celestial Raiment', description: 'Armor woven from starlight itself.', type: 'Equipment', slot: 'Armor', hpBonus: 150, mpBonus: 50, rarity: 'Legendary', baseCost: 7000, passive: { name: 'Cosmic Barrier', description: 'At the start of combat, gain a large shield.' } } as Equipment,
    hellforgedPlatemail: { id: 'hellforgedPlatemail', name: 'Hellforged Platemail', description: 'Armor quenched in demonic ichor.', type: 'Equipment', slot: 'Armor', hpBonus: 200, rarity: 'Legendary', baseCost: 7500, allowedClasses: ['Warrior'], passive: { name: 'Immolation', description: 'Burns nearby enemies in combat.' } } as Equipment,
    voidwalkerWraps: { id: 'voidwalkerWraps', name: 'Voidwalker Wraps', description: 'Wraps that phase in and out of reality.', type: 'Equipment', slot: 'Armor', hpBonus: 120, rarity: 'Legendary', baseCost: 6800, allowedClasses: ['Assassin'], passive: { name: 'Phase Shift', description: 'Greatly increases dodge chance.' } } as Equipment,
    dragonscaleMail: { id: 'dragonscaleMail', name: 'Dragonscale Mail', description: 'Armor made from the scales of a mighty dragon.', type: 'Equipment', slot: 'Armor', hpBonus: 90, rarity: 'Epic', baseCost: 2000 } as Equipment,
    huntersGuile: { id: 'huntersGuile', name: 'Hunter\'s Guile', description: 'Armor that makes the wearer almost invisible when still.', type: 'Equipment', slot: 'Armor', hpBonus: 45, rarity: 'Rare', baseCost: 240, allowedClasses: ['Hunter'] } as Equipment,
    bardsTunic: { id: 'bardsTunic', name: 'Bard\'s Tunic', description: 'A flashy tunic that somehow offers protection.', type: 'Equipment', slot: 'Armor', hpBonus: 30, mpBonus: 20, rarity: 'Rare', baseCost: 190, allowedClasses: ['Bard'] } as Equipment,
    symbioteCarapace: { id: 'symbioteCarapace', name: 'Symbiote Carapace', description: 'The symbiote hardens into a protective shell.', type: 'Equipment', slot: 'Armor', hpBonus: 70, rarity: 'Rare', baseCost: 300, allowedClasses: ['Symbiote'] } as Equipment,
    temporalWeaveRobes: { id: 'temporalWeaveRobes', name: 'Temporal Weave Robes', description: 'Robes that slightly rewind minor injuries.', type: 'Equipment', slot: 'Armor', hpBonus: 40, mpBonus: 30, rarity: 'Rare', baseCost: 280, allowedClasses: ['Echoist', 'Cartomancer'] } as Equipment,

    // Equipment - Accessories
    ringOfVitality: { id: 'ringOfVitality', name: 'Ring of Vitality', description: 'A simple ring that slightly boosts health.', type: 'Equipment', slot: 'Accessory', hpBonus: 15, rarity: 'Uncommon', baseCost: 75 } as Equipment,
    // --- NEW ACCESSORIES (50) ---
    // Common
    luckyCharm: { id: 'luckyCharm', name: 'Lucky Charm', description: 'A small trinket that brings good fortune.', type: 'Equipment', slot: 'Accessory', rarity: 'Common', baseCost: 20, passive: { name: 'Good Fortune', description: 'Slightly increases gold found.' } } as Equipment,
    simplePendant: { id: 'simplePendant', name: 'Simple Pendant', description: 'A plain stone on a leather cord.', type: 'Equipment', slot: 'Accessory', hpBonus: 5, rarity: 'Common', baseCost: 15 } as Equipment,
    ironRing: { id: 'ironRing', name: 'Iron Ring', description: 'A heavy iron ring.', type: 'Equipment', slot: 'Accessory', atkBonus: 1, rarity: 'Common', baseCost: 25 } as Equipment,
    leatherBracers: { id: 'leatherBracers', name: 'Leather Bracers', description: 'Basic protection for the wrists.', type: 'Equipment', slot: 'Accessory', hpBonus: 8, rarity: 'Common', baseCost: 20 } as Equipment,
    whittledTotem: { id: 'whittledTotem', name: 'Whittled Totem', description: 'A small animal totem.', type: 'Equipment', slot: 'Accessory', rarity: 'Common', baseCost: 10 } as Equipment,
    // Uncommon
    ringOfPower: { id: 'ringOfPower', name: 'Ring of Power', description: 'Increases physical prowess.', type: 'Equipment', slot: 'Accessory', atkBonus: 3, rarity: 'Uncommon', baseCost: 100 } as Equipment,
    amuletOfWisdom: { id: 'amuletOfWisdom', name: 'Amulet of Wisdom', description: 'Enhances magical reserves.', type: 'Equipment', slot: 'Accessory', mpBonus: 20, rarity: 'Uncommon', baseCost: 100 } as Equipment,
    adventurersCape: { id: 'adventurersCape', name: 'Adventurer\'s Cape', description: 'A sturdy cape for a long journey.', type: 'Equipment', slot: 'Accessory', hpBonus: 20, rarity: 'Uncommon', baseCost: 90 } as Equipment,
    scavengersGloves: { id: 'scavengersGloves', name: 'Scavenger\'s Gloves', description: 'You seem to find more items with these.', type: 'Equipment', slot: 'Accessory', rarity: 'Uncommon', baseCost: 150, passive: { name: 'Scavenge', description: 'Increases chance to find items.' } } as Equipment,
    medallionOfCourage: { id: 'medallionOfCourage', name: 'Medallion of Courage', description: 'Bolsters your resolve.', type: 'Equipment', slot: 'Accessory', hpBonus: 10, atkBonus: 2, rarity: 'Uncommon', baseCost: 120 } as Equipment,
    serpentsEyeRing: { id: 'serpentsEyeRing', name: 'Serpent\'s Eye Ring', description: 'A ring that enhances poisons.', type: 'Equipment', slot: 'Accessory', rarity: 'Uncommon', baseCost: 180, allowedClasses: ['Assassin'], passive: { name: 'Venomous', description: 'Poisons deal more damage.' } } as Equipment,
    tomeOfKnowledge: { id: 'tomeOfKnowledge', name: 'Tome of Knowledge', description: 'A book strapped to your belt.', type: 'Equipment', slot: 'Accessory', rarity: 'Uncommon', baseCost: 200, passive: { name: 'Scholar', description: 'Gain 10% more XP.' } } as Equipment,
    wolfpeltCloak: { id: 'wolfpeltCloak', name: 'Wolfpelt Cloak', description: 'A warm cloak made from wolf pelts.', type: 'Equipment', slot: 'Accessory', hpBonus: 15, rarity: 'Uncommon', baseCost: 80 } as Equipment,
    healingCharm: { id: 'healingCharm', name: 'Healing Charm', description: 'A charm that slowly mends wounds.', type: 'Equipment', slot: 'Accessory', rarity: 'Uncommon', baseCost: 250, passive: { name: 'Regeneration', description: 'Slowly regenerates HP in combat.' } } as Equipment,
    bloodstonePendant: { id: 'bloodstonePendant', name: 'Bloodstone Pendant', description: 'A dark red stone that pulses faintly.', type: 'Equipment', slot: 'Accessory', hpBonus: 30, rarity: 'Uncommon', baseCost: 150 } as Equipment,
    // Rare
    ringOfProtection: { id: 'ringOfProtection', name: 'Ring of Protection', description: 'A ring that creates a weak defensive field.', type: 'Equipment', slot: 'Accessory', rarity: 'Rare', baseCost: 300, passive: { name: 'Aegis', description: 'Reduces all incoming damage by 5%.' } } as Equipment,
    amuletOfTheSun: { id: 'amuletOfTheSun', name: 'Amulet of the Sun', description: 'A holy symbol that is anathema to undead.', type: 'Equipment', slot: 'Accessory', rarity: 'Rare', baseCost: 400, allowedClasses: ['Paladin'], passive: { name: 'Sunlight', description: 'Deal bonus damage to Undead.' } } as Equipment,
    bootsOfSpeed: { id: 'bootsOfSpeed', name: 'Boots of Speed', description: 'These boots make you feel incredibly light.', type: 'Equipment', slot: 'Accessory', rarity: 'Rare', baseCost: 350, passive: { name: 'Haste', description: 'Increases dodge chance.' } } as Equipment,
    manaStone: { id: 'manaStone', name: 'Mana Stone', description: 'A stone that slowly replenishes mana.', type: 'Equipment', slot: 'Accessory', rarity: 'Rare', baseCost: 450, passive: { name: 'Mana Font', description: 'Slowly regenerates MP in combat.' } } as Equipment,
    bracersOfMight: { id: 'bracersOfMight', name: 'Bracers of Might', description: 'Bracers that greatly increase strength.', type: 'Equipment', slot: 'Accessory', atkBonus: 8, rarity: 'Rare', baseCost: 320 } as Equipment,
    cloakOfShadows: { id: 'cloakOfShadows', name: 'Cloak of Shadows', description: 'A cloak woven from pure darkness.', type: 'Equipment', slot: 'Accessory', hpBonus: 40, rarity: 'Rare', baseCost: 300, allowedClasses: ['Assassin', 'Necromancer'] } as Equipment,
    gauntletOfOgrePower: { id: 'gauntletOfOgrePower', name: 'Gauntlet of Ogre Power', description: 'A single, massive gauntlet.', type: 'Equipment', slot: 'Accessory', atkBonus: 10, rarity: 'Rare', baseCost: 400, allowedClasses: ['Warrior'] } as Equipment,
    heartOfOakhaven: { id: 'heartOfOakhaven', name: 'Heart of Oakhaven', description: 'A wooden charm carved from a branch of a healthy tree.', type: 'Equipment', slot: 'Accessory', hpBonus: 50, rarity: 'Rare', baseCost: 350 } as Equipment,
    ringOfTheMarksman: { id: 'ringOfTheMarksman', name: 'Ring of the Marksman', description: 'Enhances ranged attacks.', type: 'Equipment', slot: 'Accessory', atkBonus: 7, rarity: 'Rare', baseCost: 330, allowedClasses: ['Hunter'] } as Equipment,
    symbolOfFaith: { id: 'symbolOfFaith', name: 'Symbol of Faith', description: 'A holy symbol that empowers healing.', type: 'Equipment', slot: 'Accessory', mpBonus: 25, rarity: 'Rare', baseCost: 310, allowedClasses: ['Paladin'], passive: { name: 'Improved Healing', description: 'Healing skills are more effective.' } } as Equipment,
    // Epic
    amuletOfKings: { id: 'amuletOfKings', name: 'Amulet of Kings', description: 'An amulet worn by a long-dead king.', type: 'Equipment', slot: 'Accessory', hpBonus: 80, atkBonus: 5, rarity: 'Epic', baseCost: 1800 } as Equipment,
    ringOfArcanePower: { id: 'ringOfArcanePower', name: 'Ring of Arcane Power', description: 'Massively boosts magical damage.', type: 'Equipment', slot: 'Accessory', atkBonus: 15, mpBonus: 30, rarity: 'Epic', baseCost: 2000, allowedClasses: ['Mage'] } as Equipment,
    berserkersCharm: { id: 'berserkersCharm', name: 'Berserker\'s Charm', description: 'A totem that grants rage as you are injured.', type: 'Equipment', slot: 'Accessory', rarity: 'Epic', baseCost: 1500, passive: { name: 'Rage', description: 'Gain ATK as your HP gets lower.' } } as Equipment,
    soulGem: { id: 'soulGem', name: 'Soul Gem', description: 'A gem that seems to hold a screaming spirit.', type: 'Equipment', slot: 'Accessory', atkBonus: 10, mpBonus: 40, rarity: 'Epic', baseCost: 1700, allowedClasses: ['Necromancer'] } as Equipment,
    shiftingSands: { id: 'shiftingSands', name: 'Shifting Sands', description: 'An hourglass filled with temporal dust.', type: 'Equipment', slot: 'Accessory', rarity: 'Epic', baseCost: 1900, allowedClasses: ['Echoist'], passive: { name: 'Time Warp', description: 'Buffs and debuffs you apply last 1 turn longer.' } } as Equipment,
    theJokersCard: { id: 'theJokersCard', name: 'The Joker\'s Card', description: 'A wild card you keep up your sleeve.', type: 'Equipment', slot: 'Accessory', rarity: 'Epic', baseCost: 1600, allowedClasses: ['Cartomancer'], passive: { name: 'Chaos', description: 'All skills have a chance to have a random, unexpected effect.' } } as Equipment,
    titansBelt: { id: 'titansBelt', name: 'Titan\'s Belt', description: 'A belt that grants the wearer immense fortitude.', type: 'Equipment', slot: 'Accessory', hpBonus: 120, rarity: 'Epic', baseCost: 1500 } as Equipment,
    vampiricFangs: { id: 'vampiricFangs', name: 'Vampiric Fangs', description: 'Enchanted fangs that drain life.', type: 'Equipment', slot: 'Accessory', rarity: 'Epic', baseCost: 2200, passive: { name: 'Lifesteal', description: 'Attacks heal you for a portion of damage dealt.' } } as Equipment,
    phoenixDown: { id: 'phoenixDown', name: 'Phoenix Down', description: 'A feather from a Phoenix.', type: 'Equipment', slot: 'Accessory', rarity: 'Epic', baseCost: 3000, passive: { name: 'Rebirth', description: 'Once per combat, survive a fatal blow with 1 HP.' } } as Equipment,
    thornedGrips: { id: 'thornedGrips', name: 'Thorned Grips', description: 'Gauntlets covered in living thorns.', type: 'Equipment', slot: 'Accessory', atkBonus: 8, rarity: 'Epic', baseCost: 1300, allowedClasses: ['Druid', 'Symbiote'] } as Equipment,
    ringOfPrecision: { id: 'ringOfPrecision', name: 'Ring of Precision', description: 'A ring that guides your strikes to enemy weaknesses.', type: 'Equipment', slot: 'Accessory', rarity: 'Epic', baseCost: 1400, passive: { name: 'Crit Chance', description: 'Increases critical strike chance.' } } as Equipment,
    harmoniousChime: { id: 'harmoniousChime', name: 'Harmonious Chime', description: 'A small chime that improves your songs.', type: 'Equipment', slot: 'Accessory', mpBonus: 50, rarity: 'Epic', baseCost: 1300, allowedClasses: ['Bard'] } as Equipment,
    spidersilkBoots: { id: 'spidersilkBoots', name: 'Spidersilk Boots', description: 'Boots that let you move with uncanny silence and speed.', type: 'Equipment', slot: 'Accessory', rarity: 'Epic', baseCost: 1200, passive: { name: 'Fleet Footed', description: 'Higher chance to flee from combat.' } } as Equipment,
    monasticBeads: { id: 'monasticBeads', name: 'Monastic Beads', description: 'Prayer beads that help focus the mind.', type: 'Equipment', slot: 'Accessory', hpBonus: 50, atkBonus: 5, rarity: 'Epic', baseCost: 1400, allowedClasses: ['Monk'] } as Equipment,
    // Legendary
    eyeOfTheStorm: { id: 'eyeOfTheStorm', name: 'Eye of the Storm', description: 'A gem that holds the fury of a hurricane.', type: 'Equipment', slot: 'Accessory', rarity: 'Legendary', baseCost: 10000, passive: { name: 'Chain Lightning', description: 'Attacks have a chance to strike a second target.' } } as Equipment,
    shardOfAnvil: { id: 'shardOfAnvil', name: 'Shard of Anvil', description: 'A piece of the anvil used to forge the world.', type: 'Equipment', slot: 'Accessory', hpBonus: 200, atkBonus: 10, rarity: 'Legendary', baseCost: 12000 } as Equipment,
    crownOfCommand: { id: 'crownOfCommand', name: 'Crown of Command', description: 'A crown that makes allies fight harder and enemies cower.', type: 'Equipment', slot: 'Accessory', rarity: 'Legendary', baseCost: 15000, passive: { name: 'Leadership', description: 'Pets and summons are stronger.' } } as Equipment,
    heartOfTheMountain: { id: 'heartOfTheMountain', name: 'Heart of the Mountain', description: 'A legendary jewel that grants unparalleled resilience.', type: 'Equipment', slot: 'Accessory', hpBonus: 300, rarity: 'Legendary', baseCost: 11000, passive: { name: 'Unbreakable', description: 'You cannot be critically hit.' } } as Equipment,
    bookOfThoth: { id: 'bookOfThoth', name: 'Book of Thoth', description: 'A tome containing all the knowledge of the arcane.', type: 'Equipment', slot: 'Accessory', atkBonus: 20, mpBonus: 100, rarity: 'Legendary', baseCost: 13000, allowedClasses: ['Mage'], passive: { name: 'Tome', description: 'Reduces mana costs of all spells.' } } as Equipment,
    assassinsCowl: { id: 'assassinsCowl', name: 'Assassin\'s Cowl', description: 'The hood of a legendary assassin.', type: 'Equipment', slot: 'Accessory', atkBonus: 25, rarity: 'Legendary', baseCost: 9500, allowedClasses: ['Assassin'], passive: { name: 'Execute', description: 'Attacks against low-health targets deal massive bonus damage.' } } as Equipment,
    ringOfOmnipotence: { id: 'ringOfOmnipotence', name: 'Ring of Omnipotence', description: 'A plain gold ring that holds immense power.', type: 'Equipment', slot: 'Accessory', hpBonus: 100, mpBonus: 50, atkBonus: 15, rarity: 'Legendary', baseCost: 20000 } as Equipment,
    aegisOfImmunity: { id: 'aegisOfImmunity', name: 'Aegis of Immunity', description: 'A shield emblem that makes you immune to status effects.', type: 'Equipment', slot: 'Accessory', hpBonus: 150, rarity: 'Legendary', baseCost: 10000, passive: { name: 'Immunity', description: 'You are immune to all debuffs (bleed, poison, stun, etc).' } } as Equipment,
    talonOfMagria: { id: 'talonOfMagria', name: 'Talon of Magria', description: 'The talon of a divine beast.', type: 'Equipment', slot: 'Accessory', atkBonus: 22, rarity: 'Legendary', baseCost: 9200, allowedClasses: ['Hunter'], passive: { name: 'Multi-Shot', description: 'Your attacks have a chance to hit an additional time.' } } as Equipment,
    liandrysTorment: { id: 'liandrysTorment', name: 'Liandry\'s Torment', description: 'A mask that causes your enemies to burn in agony.', type: 'Equipment', slot: 'Accessory', atkBonus: 18, mpBonus: 40, rarity: 'Legendary', baseCost: 9800, allowedClasses: ['Mage', 'Necromancer'], passive: { name: 'Torment', description: 'Your damage-over-time effects deal bonus damage based on the target\'s max HP.' } } as Equipment,
    theGreatOakHeart: { id: 'theGreatOakHeart', name: 'The Great Oak Heart', description: 'A still-living piece of the Great Oak from before its corruption.', type: 'Equipment', slot: 'Accessory', hpBonus: 250, rarity: 'Legendary', baseCost: 14000, passive: { name: 'Oak\'s Blessing', description: 'Greatly enhances HP regeneration.' } } as Equipment,
};

export const UNIVERSAL_SKILLS: Skill[] = [
    {
        id: 'power_strike',
        name: 'Power Strike',
        description: 'A powerful attack dealing 150% weapon damage.',
        levelRequired: 3,
        mpCost: 5,
        action: (player, enemy) => {
            ui.triggerAnimation('player-combatant-card', 'animate-attack');
            const { totalDamage, log } = dealPlayerDamage(player, enemy, 1.5);
            setTimeout(() => {
                ui.triggerAnimation('enemy-combatant-card', 'animate-hit');
                ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
            }, 300);
            return `${player.name} uses Power Strike! ${log} It deals ${totalDamage} damage.`;
        }
    },
    {
        id: 'flee',
        name: 'Flee',
        description: 'Attempt to escape from combat.',
        levelRequired: 1,
        action: (player, enemy) => {
            if (enemy.rank === 'Epic' || enemy.rank === 'Legend' || enemy.rank === 'Mysterious') {
                return "You cannot flee from such a powerful foe!";
            }
            return "FLEE_ATTEMPT";
        }
    },
    // --- NEW UNIVERSAL SKILLS ---
    {
        id: 'bleeding_strike', name: 'Bleeding Strike', description: 'A precise strike that causes the enemy to bleed for 3 turns.', levelRequired: 2, mpCost: 4,
        action: (player, enemy) => {
            const { totalDamage, log } = dealPlayerDamage(player, enemy, 0.9);
            const bleedDamage = Math.floor(player.atk * 0.2);
            enemy.buffs.push({ id: 'bleed', name: 'Bleeding', duration: 4, value: bleedDamage });
            ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
            return `${player.name} uses Bleeding Strike, dealing ${totalDamage} damage and causing the enemy to bleed.`;
        }
    },
    {
        id: 'first_aid', name: 'First Aid', description: 'Heal for 20% of your max HP. Usable once per combat.', levelRequired: 2, mpCost: 8,
        action: (player, enemy) => {
            if (player.buffs.some(b => b.name === 'First Aid Used')) return 'You have already used First Aid this combat.';
            const healAmount = Math.floor(player.maxHp * 0.20);
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            player.buffs.push({ id: 'meditated', name: 'First Aid Used', duration: 99 });
            ui.showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            return `${player.name} uses First Aid, restoring ${healAmount} HP.`;
        }
    },
    {
        id: 'execute', name: 'Execute', description: 'Deals massive (300%) damage to enemies below 30% HP.', levelRequired: 8, mpCost: 15,
        action: (player, enemy) => {
            const multiplier = (enemy.hp / enemy.maxHp) < 0.3 ? 3.0 : 1.0;
            const actionText = multiplier > 1.0 ? 'executes' : 'strikes at';
            const { totalDamage, log } = dealPlayerDamage(player, enemy, multiplier);
            ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
            return `${player.name} ${actionText} the enemy, dealing ${totalDamage} damage!`;
        }
    },
    {
        id: 'shield_wall', name: 'Shield Wall', description: 'Greatly increases your defense (75%) for 2 turns.', levelRequired: 6, mpCost: 10,
        action: (player, enemy) => {
            player.buffs.push({ id: 'defense_up', name: 'Shield Wall', duration: 3, value: 0.75 });
            return `${player.name} raises a defensive wall, bolstering their defenses.`;
        }
    },
    {
        id: 'sunder', name: 'Sunder', description: 'A powerful blow that reduces the enemy\'s attack by 30% for 3 turns.', levelRequired: 4, mpCost: 7,
        action: (player, enemy) => {
            const { totalDamage, log } = dealPlayerDamage(player, enemy, 0.8);
            enemy.buffs.push({ id: 'attack_down', name: 'Sundered', duration: 4, value: 0.3 });
            ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
            return `${player.name} sunders the enemy's resolve, dealing ${totalDamage} damage and weakening their attack.`;
        }
    },
    {
        id: 'purify', name: 'Purify', description: 'Removes one negative effect (debuff) from yourself.', levelRequired: 5, mpCost: 12,
        action: (player, enemy) => {
            const debuffs: Buff['id'][] = ['attack_down', 'vulnerable', 'bleed', 'poison', 'burn', 'stun', 'blind'];
            const debuffIndex = player.buffs.findIndex(b => debuffs.includes(b.id));
            if (debuffIndex > -1) {
                const removedBuff = player.buffs[debuffIndex];
                player.buffs.splice(debuffIndex, 1);
                return `${player.name} uses Purify, removing ${removedBuff.name}.`;
            }
            return `${player.name} uses Purify, but there is nothing to remove.`;
        }
    },
    {
        id: 'focus', name: 'Focus', description: 'Focus your energy, increasing your ATK by 50% for your next attack or skill.', levelRequired: 3, mpCost: 5,
        action: (player, enemy) => {
            player.buffs.push({ id: 'attack_up', name: 'Focused', duration: 2, value: 0.5 });
            return `${player.name} focuses their energy for a powerful strike.`;
        }
    },
    {
        id: 'retaliate', name: 'Retaliate', description: 'For 1 turn, counter-attack for 75% damage when hit by a melee attack.', levelRequired: 7, mpCost: 15,
        action: (player, enemy) => {
            player.buffs.push({ id: 'retaliation', name: 'Retaliating', duration: 2, value: 0.75 });
            return `${player.name} takes up a retaliatory stance.`;
        }
    },
    {
        id: 'gamble', name: 'Gamble', description: 'Unleash a chaotic attack. 50% chance to deal 250% damage, 50% chance to deal 25% damage.', levelRequired: 8, mpCost: 10,
        action: (player, enemy) => {
            const multiplier = Math.random() < 0.5 ? 2.5 : 0.25;
            const { totalDamage, log } = dealPlayerDamage(player, enemy, multiplier);
            ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
            return `${player.name} gambles on a wild attack, dealing ${totalDamage} damage!`;
        }
    },
    {
        id: 'last_stand', name: 'Last Stand', description: 'Once per combat, if below 25% HP, increase ATK by 100% for 2 turns.', levelRequired: 10, mpCost: 20,
        action: (player, enemy) => {
            if (player.buffs.some(b => b.id === 'last_stand_used')) return 'You have already made your last stand this combat.';
            if ((player.hp / player.maxHp) > 0.25) return 'You are not injured enough to make a last stand.';
            player.buffs.push({ id: 'attack_up', name: 'Last Stand', duration: 3, value: 1.0 });
            player.buffs.push({ id: 'last_stand_used', name: 'Last Stand Used', duration: 99 });
            return `${player.name} makes a last stand, their power surging!`;
        }
    },
];

const EXPLORATION_EVENTS: { [key in GameLocation]?: ExplorationEvent[] } = {
    woods: [
        { type: 'combat', chance: 0.55, enemyId: 'wolf', ambush: false },
        { type: 'combat', chance: 0.15, enemyId: 'goblinScout', ambush: true },
        { type: 'find_gold', chance: 0.1, goldAmount: 10, message: "You find a small, forgotten pouch of coins." },
        { type: 'find_item', chance: 0.08, itemId: 'wolfPelt', quantity: 1 },
        { type: 'find_item', chance: 0.05, itemId: 'healthPotion', quantity: 1 },
        { type: 'treasure', chance: 0.02, message: "You stumble upon a hidden stash beneath a gnarled root!", goldAmount: 25, items: [{ itemId: 'healthPotion', quantity: 1 }] },
        { type: 'discovery', chance: 0.02, message: "You find a strange marking on a tree, learning something new about tracking.", xpAmount: 15 },
        { type: 'nothing', chance: 0.03 }
    ],
    cave: [
        { type: 'combat', chance: 0.50, enemyId: 'giantBat', ambush: false },
        { type: 'combat', chance: 0.20, enemyId: 'giantSpider', ambush: true },
        { type: 'find_gold', chance: 0.1, goldAmount: 15, message: "You spot a glint in the dark - a few coins dropped by a previous adventurer." },
        { type: 'find_item', chance: 0.05, itemId: 'batWing', quantity: 1 },
        { type: 'find_item', chance: 0.05, itemId: 'spiderSilk', quantity: 1 },
        { type: 'treasure', chance: 0.03, message: "A skeleton clutches a locked chest. You pry it open!", goldAmount: 40, items: [{ itemId: 'manaPotion', quantity: 1 }] },
        { type: 'discovery', chance: 0.02, message: "You decipher some strange runes on the cave wall.", xpAmount: 25 },
        { type: 'nothing', chance: 0.05 }
    ],
    ruins: [
        { type: 'combat', chance: 0.45, enemyId: 'skeleton', ambush: false },
        { type: 'combat', chance: 0.25, enemyId: 'ghost', ambush: true },
        { type: 'find_item', chance: 0.1, itemId: 'ancientCoin', quantity: 1, message: "An ancient coin lies half-buried in the dust." },
        { type: 'find_item', chance: 0.07, itemId: 'ectoplasm', quantity: 1 },
        { type: 'treasure', chance: 0.05, message: "You find an ornate, surprisingly well-preserved chest!", goldAmount: 60, items: [{ itemId: 'strengthPotion', quantity: 1 }] },
        { type: 'npc', chance: 0.03, message: "A friendly spirit appears, bestowing a blessing upon you for disturbing its rest respectfully.", buff: { id: 'health_regen', name: 'Spirit\'s Blessing', duration: 99, value: 3 } },
        { type: 'discovery', chance: 0.02, message: "You translate a passage on an old tablet, gaining insight into the past.", xpAmount: 40 },
        { type: 'nothing', chance: 0.03 }
    ]
};

export const LOCATIONS: { [key in GameLocation]: { name: string; description: string; actions: { id: string; name: string }[]; levelRequirement: number; events?: ExplorationEvent[]; bosses?: { enemyId: string; chance: number }[] } } = {
    'main-menu': { name: 'Main Menu', description: '', actions: [], levelRequirement: 1 },
    crossroads: {
        name: 'The Crossroads',
        description: 'A weathered signpost points in multiple directions. The nearby town of Oakhaven offers respite, while ominous paths lead into the wilderness.',
        actions: [
            { id: 'go-town', name: 'Go to Town' },
            { id: 'go-woods', name: 'Enter the Whispering Woods' },
            { id: 'go-cave', name: 'Explore the Shadowed Cavern' },
            { id: 'go-ruins', name: 'Investigate the Forgotten Ruins' },
        ],
        levelRequirement: 1
    },
    town: {
        name: 'Oakhaven',
        description: 'A small, bustling town that serves as a sanctuary for adventurers. The air is thick with the smell of woodsmoke and commerce.',
        actions: [
            { id: 'shop', name: 'Visit Shop' },
            { id: 'artisan', name: 'Visit Artisan' },
            { id: 'talk-villager', name: 'Talk to a Villager' },
            { id: 'rest', name: 'Rest at the Inn (5G)' },
            { id: 'go-crossroads', name: 'Leave Town' }
        ],
        levelRequirement: 1
    },
    woods: {
        name: 'Whispering Woods',
        description: 'A dense forest where the trees seem to whisper secrets. Goblins and wild beasts lurk in the shadows.',
        actions: [{ id: 'explore', name: 'Explore the Woods' }, { id: 'go-crossroads', name: 'Return to Crossroads' }],
        levelRequirement: 1,
        events: EXPLORATION_EVENTS.woods,
        bosses: [{ enemyId: 'goblinShaman', chance: 0.05 }]
    },
    cave: {
        name: 'Shadowed Cavern',
        description: 'A dark and damp cave system. The air is cold, and strange noises echo from the depths.',
        actions: [{ id: 'explore', name: 'Explore the Cavern' }, { id: 'go-crossroads', name: 'Return to Crossroads' }],
        levelRequirement: 3,
        events: EXPLORATION_EVENTS.cave,
        bosses: [{ enemyId: 'orcBrute', chance: 0.05 }]
    },
    ruins: {
        name: 'Forgotten Ruins',
        description: 'The crumbling remains of an ancient city. The restless dead are said to guard its secrets.',
        actions: [{ id: 'explore', name: 'Explore the Ruins' }, { id: 'go-crossroads', name: 'Return to Crossroads' }],
        levelRequirement: 5,
        events: EXPLORATION_EVENTS.ruins,
        bosses: [{ enemyId: 'lichApprentice', chance: 0.05 }]
    },
    // Future content placeholders
    clockworkMenagerie: { name: 'Clockwork Menagerie', description: 'A bizarre collection of malfunctioning magical constructs.', actions: [], levelRequirement: 10 },
    dreamersLabyrinth: { name: 'Dreamer\'s Labyrinth', description: 'A shifting maze that preys on the minds of those who enter.', actions: [], levelRequirement: 12 },
    saltFlats: { name: 'The Salt Flats', description: 'A barren wasteland of crystallized mana, inhabited by elementals.', actions: [], levelRequirement: 15 },
    vaultOfFrozenMoments: { name: 'Vault of Frozen Moments', description: 'A temporal prison where moments and creatures are frozen in time.', actions: [], levelRequirement: 18 },
    mycelialNetwork: { name: 'The Mycelial Network', description: 'A vast, underground fungal forest that connects the roots of the world.', actions: [], levelRequirement: 20 },
    aetheriumDocks: { name: 'The Aetherium Docks', description: 'Floating docks where ships sail the arcane energies between realms.', actions: [], levelRequirement: 22 },
    gardenOfReciprocalHunger: { name: 'Garden of Reciprocal Hunger', description: 'A beautiful but deadly garden of sentient, carnivorous plants.', actions: [], levelRequirement: 25 },
    sunkenCityOfTwoTides: { name: 'Sunken City of Two Tides', description: 'A city trapped between the material and astral planes, revealed only at high tide.', actions: [], levelRequirement: 28 },
    architectsFolly: { name: 'The Architect\'s Folly', description: 'The chaotic, unfinished magnum opus of a mad god.', actions: [], levelRequirement: 30 },
};

export const ENEMIES: { [id: string]: Enemy } = {
    // Woods
    wolf: { id: 'wolf', name: 'Wolf', portrait: `<img src="https://ik.imagekit.io/montorneado/wolf_3_Vl-n3Qn_.png?updatedAt=1720612140411" alt="Wolf">`, type: 'Beast', rank: 'Normal', level: 1, hp: 20, maxHp: 20, atk: 5, xpValue: 10, drops: { gold: 5, items: [{ itemId: 'wolfPelt', chance: 0.3 }] }, buffs: [], shield: 0 },
    goblinScout: { id: 'goblinScout', name: 'Goblin Scout', portrait: `<img src="https://ik.imagekit.io/montorneado/goblin_2_yVw1dG56d.png?updatedAt=1720612140156" alt="Goblin Scout">`, type: 'Goblin', rank: 'Normal', level: 2, hp: 25, maxHp: 25, atk: 6, xpValue: 15, drops: { gold: 8, items: [{ itemId: 'healthPotion', chance: 0.1 }, {itemId: 'goblinEar', chance: 0.5}] }, buffs: [], shield: 0 },
    goblinShaman: { id: 'goblinShaman', name: 'Goblin Shaman', portrait: `<img src="https://ik.imagekit.io/montorneado/goblin_shaman_3_4V16W2P-q.png?updatedAt=1720612140149" alt="Goblin Shaman">`, type: 'Goblin', rank: 'Epic', level: 4, hp: 70, maxHp: 70, atk: 8, skill: { name: 'Heal', action: (e, p) => { e.hp = Math.min(e.maxHp, e.hp + 15); return `${e.name} chants and heals for 15 HP!`; } }, xpValue: 50, drops: { gold: 30, items: [{ itemId: 'enchantedStaff', chance: 0.1 }, {itemId: 'glimmeringDust', chance: 0.3}] }, buffs: [], shield: 0 },
    // Cave
    giantBat: { id: 'giantBat', name: 'Giant Bat', portrait: `<img src="https://ik.imagekit.io/montorneado/bat_1_0_S3qg9iB.png?updatedAt=1720612139470" alt="Giant Bat">`, type: 'Beast', rank: 'Normal', level: 3, hp: 35, maxHp: 35, atk: 8, xpValue: 20, drops: { gold: 10, items: [{ itemId: 'batWing', chance: 0.3 }] }, buffs: [], shield: 0 },
    giantSpider: { id: 'giantSpider', name: 'Giant Spider', portrait: `<img src="https://ik.imagekit.io/montorneado/spider_3_8B1A_n7bZ.png?updatedAt=1720612140328" alt="Giant Spider">`, type: 'Beast', rank: 'Normal', level: 4, hp: 40, maxHp: 40, atk: 10, skill: { name: 'Poison Bite', action: (e, p) => { p.buffs.push({ id: 'poison', name: 'Poisoned', duration: 3, value: 3 }); return `${e.name} sinks its fangs in, poisoning you!`; } }, xpValue: 25, drops: { gold: 12, items: [{ itemId: 'spiderSilk', chance: 0.25 }] }, buffs: [], shield: 0 },
    orcBrute: { id: 'orcBrute', name: 'Orc Brute', portrait: `<img src="https://ik.imagekit.io/montorneado/orc_brute_2_lR5_jGqgT.png?updatedAt=1720612140268" alt="Orc Brute">`, type: 'Orc', rank: 'Epic', level: 6, hp: 120, maxHp: 120, atk: 15, skill: { name: 'Smash', action: (e, p) => { const damage = applyDamage(p, calculateDamage(e, p, e.atk * 1.5)); return `${e.name} uses Smash, dealing ${damage.damageDealt} damage!`; } }, xpValue: 80, drops: { gold: 50, items: [{ itemId: 'ironMace', chance: 0.15 }, {itemId: 'orcTusk', chance: 0.4}] }, buffs: [], shield: 0 },
    // Ruins
    skeleton: { id: 'skeleton', name: 'Skeleton', portrait: `<img src="https://ik.imagekit.io/montorneado/skeleton_2_7eN_dG_c1.png?updatedAt=1720612140222" alt="Skeleton">`, type: 'Undead', rank: 'Normal', level: 5, hp: 50, maxHp: 50, atk: 12, xpValue: 30, drops: { gold: 15, items: [{ itemId: 'ancientCoin', chance: 0.2 }] }, buffs: [], shield: 0 },
    ghost: { id: 'ghost', name: 'Ghost', portrait: `<img src="https://ik.imagekit.io/montorneado/ghost_1_D9q_xM5yJ.png?updatedAt=1720612140134" alt="Ghost">`, type: 'Undead', rank: 'Normal', level: 6, hp: 45, maxHp: 45, atk: 14, skill: { name: 'Horrify', action: (e, p) => { p.buffs.push({ id: 'attack_down', name: 'Horrified', duration: 2, value: 0.25 }); return `${e.name}'s horrifying visage weakens your resolve!`; } }, xpValue: 35, drops: { gold: 18, items: [{ itemId: 'ectoplasm', chance: 0.25 }] }, buffs: [], shield: 0 },
    lichApprentice: { id: 'lichApprentice', name: 'Lich Apprentice', portrait: `<img src="https://ik.imagekit.io/montorneado/lich_1_hWlT-Gqq4.png?updatedAt=1720612140217" alt="Lich Apprentice">`, type: 'Undead', rank: 'Epic', level: 8, hp: 150, maxHp: 150, atk: 20, skill: { name: 'Summon Skeleton', action: (e, p) => { return `${e.name} chants an dark incantation, but it fails... for now.`; } }, xpValue: 120, drops: { gold: 100, items: [{ itemId: 'tomeOfPowerStrike', chance: 0.1 }, {itemId: 'corruptedEssence', chance: 0.2}] }, buffs: [], shield: 0 },
};

export const BLUEPRINTS: Blueprint[] = [
    {
        id: 'bp_ironMace', name: 'Blueprint: Iron Mace', description: 'Craft a sturdy Iron Mace.',
        resultItemId: 'ironMace',
        requirements: { materials: { ancientCoin: 3, ironOre: 5 }, gold: 20 }
    },
    {
        id: 'bp_ironCuirass', name: 'Blueprint: Iron Cuirass', description: 'Craft a protective Iron Cuirass.',
        resultItemId: 'ironCuirass',
        requirements: { materials: { wolfPelt: 5, ironOre: 2 }, gold: 30 }
    },
     {
        id: 'bp_ringOfVitality', name: 'Blueprint: Ring of Vitality', description: 'Craft a simple ring that boosts health.',
        resultItemId: 'ringOfVitality',
        requirements: { materials: { ancientCoin: 5, ectoplasm: 1 }, gold: 50 }
    }
];

export const NPC_NAMES = ['Elara', 'Boric', 'Lenora', 'Gideon', 'Silas'];
export const NPC_DIALOGUE_PREFIXES = [
    "The woods grow darker each day...",
    "Be careful out there, traveler.",
    "I heard strange noises coming from the old ruins.",
    "If you're heading to the caves, watch out for spiders."
];

export const QUEST_TEMPLATES: Quest[] = [
    {
        id: 'q_goblinMenace', title: 'Goblin Menace', description: 'Goblins have been raiding the trade routes. Thin their numbers.',
        objectives: [{ type: 'kill', targetName: 'Goblin', required: 5, current: 0 }],
        rewards: { xp: 100, gold: 50, items: [{ itemId: 'healthPotion', quantity: 2 }] },
        isComplete: false
    },
    {
        id: 'q_skeletalRemains', title: 'Skeletal Remains', description: 'The old ruins are crawling with animated skeletons. Put them to rest.',
        objectives: [{ type: 'kill', targetName: 'Skeleton', required: 3, current: 0 }],
        rewards: { xp: 150, gold: 75, items: [{ itemId: 'ancientCoin', quantity: 2 }] },
        isComplete: false
    }
];

export const TITLES: Title[] = [
    { id: 'adventurer', name: 'Adventurer', description: 'A fledgling hero.', borderColor: '#a8a29e', priority: 0, requirements: [] },
    { id: 'novice', name: 'Novice', description: 'Has reached level 5.', borderColor: '#d1d5db', priority: 1, requirements: [{ type: 'level', value: 5 }] },
    { id: 'veteran', name: 'Veteran', description: 'Has reached level 10.', borderColor: '#9ca3af', priority: 2, requirements: [{ type: 'level', value: 10 }] },
    { id: 'goblinSlayer', name: 'Goblin Slayer', description: 'Has slain 10 goblins.', borderColor: '#4ade80', priority: 3, requirements: [{ type: 'stat', stat: 'goblinKills', value: 10 }] },
    { id: 'exorcist', name: 'Exorcist', description: 'Has slain 10 undead.', borderColor: '#eab308', priority: 3, requirements: [{ type: 'stat', stat: 'undeadKills', value: 10 }] },
    { id: 'beastmaster', name: 'Beastmaster', description: 'Has slain 10 beasts.', borderColor: '#f97316', priority: 3, requirements: [{ type: 'stat', stat: 'beastKills', value: 10 }] },
    { id: 'giantSlayer', name: 'Giant Slayer', description: 'Has slain a boss.', borderColor: '#ef4444', priority: 4, requirements: [{ type: 'stat', stat: 'bossKills', value: 1 }] },
];

export const CLASS_DATA: { [key in CharacterClass]: {
    description: string;
    portrait: string;
    baseHp: number;
    baseAtk: number;
    baseMp?: number;
    skills: Skill[];
    passiveSkill: PassiveSkill;
} } = {
    // TIER 1 CLASSES
    Warrior: {
        description: "A stalwart defender, clad in heavy armor and wielding mighty weapons.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/warrior_1_uO5_Vf-gM.png?updatedAt=1720612140417" alt="Warrior">',
        baseHp: 100,
        baseAtk: 10,
        passiveSkill: {
            name: 'Stalwart',
            description: 'Increases base HP by 20%.'
        },
        skills: [
            {
                id: 'shield_bash', name: 'Shield Bash', description: 'Deals 80% damage and has a 50% chance to stun the enemy for 1 turn.', levelRequired: 1,
                action: (player, enemy) => {
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, 0.8);
                    let stunLog = '';
                    if (Math.random() < 0.5) {
                        enemy.buffs.push({ id: 'stun', name: 'Stunned', duration: 2 }); // Duration 2 because it ticks down once immediately
                        stunLog = ' The enemy is stunned!';
                        soundManager.play(SOUNDS.STUN);
                    }
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} uses Shield Bash! ${log} It deals ${totalDamage} damage.${stunLog}`;
                }
            },
            {
                id: 'second_wind', name: 'Second Wind', description: 'Passive: When your HP drops below 50% for the first time in combat, instantly heal for 15% of your max HP.', levelRequired: 5,
                action: () => ''
            }
        ]
    },
    Mage: {
        description: "A master of the arcane arts, able to unleash devastating elemental spells.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/mage_1_d-qE2f5j3.png?updatedAt=1720612140232" alt="Mage">',
        baseHp: 70,
        baseAtk: 8,
        baseMp: 50,
        passiveSkill: {
            name: 'Arcane Intellect',
            description: 'Increases base ATK (spell power) by 15%.'
        },
        skills: [
            {
                id: 'fireball', name: 'Fireball', description: 'Deals 120% damage and applies a burn for 2 turns.', levelRequired: 1, mpCost: 10,
                action: (player, enemy) => {
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, 1.2);
                    const burnDamage = Math.floor(player.atk * 0.2);
                    enemy.buffs.push({ id: 'burn', name: 'Burning', duration: 3, value: burnDamage });
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} casts Fireball! ${log} It deals ${totalDamage} damage and leaves the enemy burning.`;
                }
            },
            {
                id: 'arcane_shield', name: 'Arcane Shield', description: 'Creates a shield that absorbs 30% of your max HP in damage.', levelRequired: 5, mpCost: 15,
                action: (player, enemy) => {
                    const shieldAmount = Math.floor(player.maxHp * 0.30);
                    player.shield += shieldAmount;
                    ui.triggerAnimation('player-combatant-card', 'animate-shield');
                    soundManager.play(SOUNDS.SHIELD);
                    return `${player.name} creates an Arcane Shield, absorbing ${shieldAmount} damage.`;
                }
            }
        ]
    },
    Assassin: {
        description: "A deadly rogue who strikes from the shadows, exploiting enemy weaknesses.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/assassin_3_J7hjdG5k2.png?updatedAt=1720612139417" alt="Assassin">',
        baseHp: 80,
        baseAtk: 12,
        passiveSkill: {
            name: 'Sixth Sense',
            description: 'Passively grants a 15% chance to dodge incoming attacks.'
        },
        skills: [
            {
                id: 'vipers_strike', name: "Viper's Strike", description: 'Deals 70% damage and applies a potent poison for 3 turns.', levelRequired: 1,
                action: (player, enemy) => {
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, 0.7);
                    const poisonDamage = Math.floor(player.atk * 0.3);
                    enemy.buffs.push({ id: 'poison', name: 'Poisoned', duration: 4, value: poisonDamage });
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} uses Viper's Strike! ${log} It deals ${totalDamage} damage and poisons the enemy.`;
                }
            },
            {
                id: 'expose_weakness', name: 'Expose Weakness', description: 'Applies Vulnerable to the enemy, causing them to take 50% more damage for 2 turns.', levelRequired: 5,
                action: (player, enemy) => {
                    enemy.buffs.push({ id: 'vulnerable', name: 'Vulnerable', duration: 3 });
                    return `${player.name} exposes a weakness in the enemy's defense!`;
                }
            }
        ]
    },
    Hunter: {
        description: "A master of the wild, accompanied by a loyal beast companion and skilled with a bow.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/hunter_1_W4r_eGcgN.png?updatedAt=1720612140130" alt="Hunter">',
        baseHp: 85,
        baseAtk: 11,
        passiveSkill: {
            name: 'Beast Slayer',
            description: 'Deals 25% extra damage to enemies of the Beast type.'
        },
        skills: [
            {
                id: 'precise_shot', name: 'Precise Shot', description: 'A carefully aimed shot that deals 130% damage, ignoring 25% of enemy defense.', levelRequired: 1,
                action: (player, enemy) => {
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, 1.3, 0.25);
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} fires a Precise Shot! ${log} It deals ${totalDamage} damage.`;
                }
            },
            {
                id: 'summon_companion', name: 'Summon Wolf', description: 'Summons a Wolf companion to fight by your side. (Not yet implemented)', levelRequired: 5,
                action: (player, enemy) => {
                    return `${player.name} calls for a companion, but none answer... yet.`;
                }
            }
        ]
    },
    // TIER 2 CLASSES
    Paladin: {
        description: "A holy warrior who blends martial prowess with divine magic to protect and heal.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/paladin_1_tVdFqG5k1.png?updatedAt=1720612140226" alt="Paladin">',
        baseHp: 110,
        baseAtk: 9,
        baseMp: 30,
        passiveSkill: {
            name: 'Holy Zeal',
            description: 'Heal for 5% of max HP when attacking Undead enemies.'
        },
        skills: [
            {
                id: 'smite', name: 'Smite', description: 'Deals 110% damage. Deals double damage to Undead enemies.', levelRequired: 1, mpCost: 8,
                action: (player, enemy) => {
                    const multiplier = enemy.type === 'Undead' ? 2.2 : 1.1;
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, multiplier);
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} smites the enemy! ${log} It deals ${totalDamage} damage.`;
                }
            },
            {
                id: 'lay_on_hands', name: 'Lay on Hands', description: 'A powerful heal that restores 35% of your max HP.', levelRequired: 5, mpCost: 15,
                action: (player, enemy) => {
                    const healAmount = Math.floor(player.maxHp * 0.35);
                    player.hp = Math.min(player.maxHp, player.hp + healAmount);
                    ui.showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
                    soundManager.play(SOUNDS.HEAL);
                    return `${player.name} uses Lay on Hands, restoring ${healAmount} HP.`;
                }
            }
        ]
    },
    Necromancer: {
        description: "A wielder of dark magic who commands the dead and siphons life from their foes.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/necromancer_3_85yPdGq51.png?updatedAt=1720612140224" alt="Necromancer">',
        baseHp: 75,
        baseAtk: 9,
        baseMp: 45,
        passiveSkill: {
            name: 'Enfeeble',
            description: 'Your attacks have a 50% chance to Weaken the enemy, reducing their attack by 25% for 2 turns.'
        },
        skills: [
            {
                id: 'life_drain', name: 'Life Drain', description: 'Deals 80% damage and heals you for 50% of the damage dealt.', levelRequired: 1, mpCost: 10,
                action: (player, enemy) => {
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, 0.8);
                    const healAmount = Math.floor(totalDamage * 0.5);
                    player.hp = Math.min(player.maxHp, player.hp + healAmount);
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    ui.showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
                    return `${player.name} uses Life Drain, dealing ${totalDamage} damage and healing for ${healAmount} HP.`;
                }
            },
            {
                id: 'raise_dead', name: 'Raise Dead', description: 'Summons a Skeleton warrior to fight for you. (Not yet implemented)', levelRequired: 5, mpCost: 20,
                action: (player, enemy) => {
                    return `${player.name} attempts to raise the dead, but the ground remains still.`;
                }
            }
        ]
    },
    Druid: {
        description: "A guardian of nature, able to shapeshift and call upon the wild's fury.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/druid_1_c84G9f5ke.png?updatedAt=1720612140131" alt="Druid">',
        baseHp: 90,
        baseAtk: 10,
        baseMp: 35,
        passiveSkill: {
            name: 'Natural Vigor',
            description: 'Regenerates 3% of max HP at the start of your turn in combat.'
        },
        skills: [
            {
                id: 'maul', name: 'Maul', description: 'Deals 100% damage and causes the enemy to bleed for 2 turns.', levelRequired: 1, mpCost: 7,
                action: (player, enemy) => {
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, 1.0);
                    const bleedDamage = Math.floor(player.atk * 0.25);
                    enemy.buffs.push({ id: 'bleed', name: 'Bleeding', duration: 3, value: bleedDamage });
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} mauls the enemy, dealing ${totalDamage} damage and causing them to bleed.`;
                }
            },
            {
                id: 'barkskin', name: 'Barkskin', description: 'Increases your defense by 40% for 3 turns.', levelRequired: 5, mpCost: 12,
                action: (player, enemy) => {
                    player.buffs.push({ id: 'defense_up', name: 'Barkskin', duration: 4, value: 0.4 });
                    return `${player.name}'s skin hardens like ironwood, increasing their defense.`;
                }
            }
        ]
    },
    Monk: {
        description: "A disciplined warrior who uses their body as a weapon, channeling inner energy for swift strikes.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/monk_1_oDd45G9i7.png?updatedAt=1720612140161" alt="Monk">',
        baseHp: 85,
        baseAtk: 11,
        passiveSkill: {
            name: 'Flowing Strikes',
            description: 'Gain 10% dodge. Dodging an attack grants Riposte (50% increased ATK for 1 turn).'
        },
        skills: [
            {
                id: 'flurry_of_blows', name: 'Flurry of Blows', description: 'Unleashes two quick strikes, each dealing 60% damage.', levelRequired: 1,
                action: (player, enemy) => {
                    const { totalDamage: damage1, log: log1 } = dealPlayerDamage(player, enemy, 0.6);
                    const { totalDamage: damage2, log: log2 } = dealPlayerDamage(player, enemy, 0.6);
                    ui.showDamagePopup('enemy-combatant-card', `${damage1}`, 'damage');
                    setTimeout(() => ui.showDamagePopup('enemy-combatant-card', `${damage2}`, 'damage'), 200);
                    return `${player.name} unleashes a Flurry of Blows, dealing ${damage1} and ${damage2} damage.`;
                }
            },
            {
                id: 'meditate', name: 'Meditate', description: 'Once per combat, clear all debuffs and gain 25% Evasion for 2 turns.', levelRequired: 5,
                action: (player, enemy) => {
                    player.buffs = player.buffs.filter(b => !['attack_down', 'vulnerable', 'bleed', 'poison', 'burn'].includes(b.id));
                    player.buffs.push({ id: 'evasion', name: 'Heightened Senses', duration: 3, value: 0.25 });
                    player.buffs.push({ id: 'meditated', name: 'Meditated Used', duration: 99 });
                    return `${player.name} meditates, clearing their mind and anticipating the enemy's moves.`;
                }
            }
        ]
    },
    // TIER 3 CLASSES
    Bard: {
        description: "A charismatic performer whose music can inspire allies and demoralize foes.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/bard_1_7F315M9s3.png?updatedAt=1720612139459" alt="Bard">',
        baseHp: 80,
        baseAtk: 9,
        baseMp: 40,
        passiveSkill: {
            name: 'Improvisation',
            description: 'Using a skill has a 50% chance to grant a random short-term buff (ATK Up, DEF Up, or Evasion).'
        },
        skills: [
            {
                id: 'dissonant_melody', name: 'Dissonant Melody', description: 'Deals 80% damage and has a 50% chance to apply either Vulnerable or Attack Down for 2 turns.', levelRequired: 1, mpCost: 9,
                action: (player, enemy) => {
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, 0.8);
                    let debuffLog = '';
                    if (Math.random() < 0.5) {
                        enemy.buffs.push({ id: 'vulnerable', name: 'Vulnerable', duration: 3 });
                        debuffLog = ' The enemy is left vulnerable!';
                    } else {
                        enemy.buffs.push({ id: 'attack_down', name: 'Demoralized', duration: 3, value: 0.25 });
                        debuffLog = ' The enemy is demoralized!';
                    }
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} plays a Dissonant Melody, dealing ${totalDamage} damage.${debuffLog}`;
                }
            },
            {
                id: 'song_of_celerity', name: 'Song of Celerity', description: 'Grants you an extra turn immediately. Can only be used once per combat.', levelRequired: 5, mpCost: 20,
                action: (player, enemy) => {
                    player.extraTurn = true;
                    return `${player.name} plays a Song of Celerity, quickening their actions!`;
                }
            }
        ]
    },
    Cartomancer: {
        description: "A diviner who draws power from a mystical deck of cards, embracing fate's chaotic whims.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/cartomancer_1_m5f-9f9y1.png?updatedAt=1720612140082" alt="Cartomancer">',
        baseHp: 75,
        baseAtk: 10,
        baseMp: 45,
        passiveSkill: {
            name: 'Deck of Fate',
            description: 'At the start of combat, draw a random Fate card that grants a buff for 3 turns.'
        },
        skills: [
            {
                id: 'wild_card', name: 'Wild Card', description: 'Deals 100% damage. 25% chance to deal double damage. 10% chance to backfire, dealing 25% damage to yourself.', levelRequired: 1, mpCost: 10,
                action: (player, enemy) => {
                    const rand = Math.random();
                    if (rand < 0.10) {
                        const selfDamage = applyDamage(player, Math.floor(player.atk * 0.25));
                        return `${player.name} throws a Wild Card, but it backfires, dealing ${selfDamage.damageDealt} damage to themself!`;
                    }
                    const multiplier = rand < 0.35 ? 2.0 : 1.0;
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, multiplier);
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} throws a Wild Card! ${log} It deals ${totalDamage} damage.`;
                }
            },
            {
                id: 'stack_the_deck', name: 'Stack the Deck', description: 'The next Wild Card is guaranteed to be a critical hit.', levelRequired: 5, mpCost: 15,
                action: (player, enemy) => {
                    return `${player.name} stacks the deck, ensuring a favorable outcome.`;
                }
            }
        ]
    },
    Echoist: {
        description: "A temporal warrior who manipulates echoes of their own actions to strike multiple times.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/echoist_1_bN2GqM5kh.png?updatedAt=1720612140139" alt="Echoist">',
        baseHp: 80,
        baseAtk: 11,
        baseMp: 35,
        passiveSkill: {
            name: 'Lingering Harmonics',
            description: 'Every 3rd attack or skill resonates, dealing an additional 50% damage strike.'
        },
        skills: [
            {
                id: 'echo_strike', name: 'Echo Strike', description: 'Deals 90% damage. Buffs your next attack to also deal 30% bonus damage.', levelRequired: 1, mpCost: 8,
                action: (player, enemy) => {
                    player.attackCountThisCombat = (player.attackCountThisCombat || 0) + 1;
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, 0.9);
                    player.buffs.push({ id: 'echo_strike', name: 'Echoing', duration: 2, value: 0.3 });
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} uses Echo Strike, dealing ${totalDamage} damage and creating a temporal echo.`;
                }
            },
            {
                id: 'deja_vu', name: 'Deja Vu', description: 'Once per combat, repeat your last used skill (excluding Deja Vu).', levelRequired: 5, mpCost: 25,
                action: (player, enemy) => {
                    player.buffs.push({ id: 'deja_vu_used', name: 'Deja Vu Used', duration: 99 });
                    return `${player.name} rewinds time...`;
                }
            }
        ]
    },
    Symbiote: {
        description: "A being fused with a living, parasitic entity, using their own life force to fuel powerful, regenerative attacks.",
        portrait: '<img src="https://ik.imagekit.io/montorneado/symbiote_1_jR5g5f57k.png?updatedAt=1720612140228" alt="Symbiote">',
        baseHp: 95,
        baseAtk: 10,
        passiveSkill: {
            name: 'Devour',
            description: 'All damage dealt heals you for 5% of the damage dealt.'
        },
        skills: [
            {
                id: 'parasitic_drain', name: 'Parasitic Drain', description: 'Costs 10% of max HP. Deals 150% damage and applies a buff that regenerates 5% max HP for 2 turns.', levelRequired: 1,
                action: (player, enemy) => {
                    const hpCost = Math.floor(player.maxHp * 0.10);
                    player.hp -= hpCost;
                    const { totalDamage, log } = dealPlayerDamage(player, enemy, 1.5);
                    const regenAmount = Math.floor(player.maxHp * 0.05);
                    player.buffs.push({ id: 'parasitic_drain', name: 'Parasitic Regeneration', duration: 3, value: regenAmount });
                    ui.showDamagePopup('enemy-combatant-card', `${totalDamage}`, 'damage');
                    return `${player.name} pays ${hpCost} HP to use Parasitic Drain, dealing ${totalDamage} damage and triggering regeneration.`;
                }
            },
            {
                id: 'symbiotic_surge', name: 'Symbiotic Surge', description: 'Costs 15% of max HP. Increases ATK by 50% for 3 turns, but you take 5% max HP as damage each turn.', levelRequired: 5,
                action: (player, enemy) => {
                    const hpCost = Math.floor(player.maxHp * 0.15);
                    player.hp -= hpCost;
                    player.buffs.push({ id: 'attack_up', name: 'Symbiotic Surge', duration: 4, value: 0.5 });
                    player.buffs.push({ id: 'symbiotic_surge', name: 'Symbiotic Backlash', duration: 4, value: Math.floor(player.maxHp * 0.05) });
                    return `${player.name} pays ${hpCost} HP to trigger a Symbiotic Surge, massively boosting their power.`;
                }
            }
        ]
    },
};
import { CharacterClass, Character, Skill, Item, Equipment, ItemRarity, EnemyType, Enemy, GameLocation, EnemyRank, Blueprint, SkillTome } from './types';
import { applyDamage, calculateDamage, endCombat, processTurn } from './game';
import { triggerAnimation, showDamagePopup } from './ui';
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

export const CHARACTER_CLASSES: { [key in CharacterClass]: Omit<Character, 'level' | 'xp' | 'xpToNextLevel' | 'hp' | 'maxHp' | 'atk' | 'skills' | 'skillPoints' | 'inventory' | 'gold' | 'buffs'| 'shield' | 'equipment' | 'secondWindUsedThisCombat' | 'extraTurn'> } = {
    Warrior: { name: 'Warrior', portrait: '', baseHp: 120, baseAtk: 15 },
    Assassin: { name: 'Assassin', portrait: '', baseHp: 90, baseAtk: 20 },
    Mage: { name: 'Mage', portrait: '', baseHp: 80, baseAtk: 22 },
    Hunter: { name: 'Hunter', portrait: '', baseHp: 100, baseAtk: 18 },
    Paladin: { name: 'Paladin', portrait: '', baseHp: 150, baseAtk: 12 },
    Necromancer: { name: 'Necromancer', portrait: '', baseHp: 95, baseAtk: 19 },
    Druid: { name: 'Druid', portrait: '', baseHp: 105, baseAtk: 17 },
    Monk: { name: 'Monk', portrait: '', baseHp: 95, baseAtk: 19 },
    Bard: { name: 'Bard', portrait: '', baseHp: 85, baseAtk: 20 },
};

export const CHARACTER_PORTRAITS: { [key in CharacterClass]: string } = {
    Warrior: `<svg viewBox="0 0 100 100"><path d="M50,90 L50,20 M40,30 L60,30 M45,20 L55,20 M40,10 L60,10" stroke="#C0C0C0" stroke-width="5" fill="none"/><path d="M40,90 L60,90" stroke="#8B4513" stroke-width="8" fill="none"/></svg>`,
    Assassin: `<svg viewBox="0 0 100 100"><path d="M50 10 L80 90 L20 90 Z" fill="#708090" /><path d="M50 10 L50 90" fill="none" stroke="#F5F5F5" stroke-width="3" /></svg>`,
    Mage: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="#8A2BE2" stroke-width="5"/><path d="M50 30 Q 70 50 50 70 Q 30 50 50 30" fill="#BA55D3" /></svg>`,
    Hunter: `<svg viewBox="0 0 100 100"><path d="M10 50 L90 50 M50 10 L50 90" fill="none" stroke="#228B22" stroke-width="5"/><path d="M90 50 L70 40 M90 50 L70 60" fill="none" stroke="#228B22" stroke-width="5"/></svg>`,
    Paladin: `<svg viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" fill="#FFD700" /><rect x="40" y="10" width="20" height="80" fill="#F0E68C"/><rect x="10" y="40" width="80" height="20" fill="#F0E68C"/></svg>`,
    Necromancer: `<svg viewBox="0 0 100 100"><path d="M20 80 C 40 20, 60 20, 80 80" fill="none" stroke="#4B0082" stroke-width="5"/><circle cx="50" cy="40" r="10" fill="#9932CC"/></svg>`,
    Druid: `<svg viewBox="0 0 100 100"><path d="M50 20 C 70 30, 70 70, 50 80 S 30 30, 50 20 M50 20 V 10 M40 15 H 60" stroke="#654321" stroke-width="5" fill="none" /><path d="M40 70 C 45 60, 55 60, 60 70" stroke="#228B22" stroke-width="4" fill="none" /></svg>`,
    Monk: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" stroke="#4682B4" stroke-width="5" fill="none" /><path d="M50,15 A 35 35 0 0 1 50 85" fill="#F5F5F5" /><path d="M50,15 A 35 35 0 0 0 50 85" fill="#2F4F4F" /><circle cx="50" cy="32.5" r="7" fill="#2F4F4F"/><circle cx="50" cy="67.5" r="7" fill="#F5F5F5"/></svg>`,
    Bard: `<svg viewBox="0 0 100 100"><path d="M60 20 C 80 40, 80 80, 60 90 L 40 80 C 20 70, 20 40, 40 20 Z" fill="#DEB887" /><circle cx="50" cy="55" r="15" fill="#8B4513" /><line x1="50" y1="20" x2="50" y2="80" stroke="#000" stroke-width="2" /></svg>`,
};

export const CLASS_SKILLS: { [key in CharacterClass]: Skill[] } = {
    Warrior: [
        { id: 'shield_bash', name: 'Shield Bash', description: 'Deal 80% damage and stun the enemy for 1 turn.', levelRequired: 1, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.8)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'stun', name: 'Stunned', duration: 1 });
            soundManager.play(SOUNDS.STUN);
            return `${p.name} uses Shield Bash! ${damage.log} It deals ${damage.damageDealt} damage and stuns ${e.name}.`;
        }},
        { id: 'battle_cry', name: 'Battle Cry', description: 'Boost your own defense for 3 turns.', levelRequired: 3, action: (p, e) => {
            p.buffs.push({ id: 'defense_up', name: 'Fortified', duration: 3, value: 0.3 });
            return `${p.name} lets out a Battle Cry, increasing their defense.`;
        }},
        { id: 'cleave', name: 'Cleave', description: 'A wide swing that deals 120% damage to the enemy.', levelRequired: 5, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.2)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} uses Cleave! ${damage.log} It deals a sweeping ${damage.damageDealt} damage.`;
        }},
        { id: 'endure', name: 'Endure', description: 'Greatly reduces incoming damage for 2 turns.', levelRequired: 8, action: (p, e) => {
            p.buffs.push({ id: 'damage_reduction', name: 'Enduring', duration: 2, value: 0.5 });
            return `${p.name} braces for impact, enduring the next attacks.`;
        }},
        { id: 'rage_strike', name: 'Rage Strike', description: 'A vicious strike dealing 150% damage and causing the enemy to bleed.', levelRequired: 12, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.5)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'bleed', name: 'Bleeding', duration: 3, value: Math.floor(p.atk * 0.2) });
            return `${p.name} uses Rage Strike! ${damage.log} It deals ${damage.damageDealt} damage and leaves the enemy bleeding.`;
        }},
        { id: 'fortify', name: 'Fortify', description: 'Massively boosts defense for 3 turns.', levelRequired: 15, action: (p, e) => {
            p.buffs.push({ id: 'defense_up', name: 'Fortified', duration: 3, value: 0.6 });
            return `${p.name} fortifies their position, becoming a bastion of defense.`;
        }},
        { id: 'warrior_overpower', name: 'Overpower', description: 'Deals 180% damage and ignores 25% of enemy defense.', levelRequired: 20, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.8), 0.25));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} Overpowers the enemy, dealing ${damage.damageDealt} damage.`;
        }},
        { id: 'warrior_last_stand', name: 'Last Stand', description: 'When below 30% HP, gain a shield equal to 50% of your max HP. (1/combat)', levelRequired: 30, action: (p, e) => {
            if (p.hp / p.maxHp > 0.3) return `${p.name} is not wounded enough to use Last Stand.`;
            const shieldAmount = Math.floor(p.maxHp * 0.5);
            p.shield += shieldAmount;
            triggerAnimation('player-combatant-card', 'animate-shield');
            soundManager.play(SOUNDS.SHIELD);
            return `${p.name} makes a Last Stand, gaining a ${shieldAmount} point shield.`;
        }},
        { id: 'warrior_whirlwind', name: 'Whirlwind', description: 'A brutal spinning attack that deals 100% damage and applies a deep bleed.', levelRequired: 40, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, p.atk));
            e.buffs.push({ id: 'bleed', name: 'Deep Bleed', duration: 3, value: Math.floor(p.atk * 0.4) });
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} unleashes a Whirlwind, dealing ${damage.damageDealt} damage and causing a deep wound.`;
        }},
        { id: 'warrior_challenging_shout', name: 'Challenging Shout', description: 'Taunts the enemy and grants you 50% damage reduction for 2 turns.', levelRequired: 50, action: (p, e) => {
            p.buffs.push({ id: 'damage_reduction', name: 'Challenged', duration: 2, value: 0.5 });
            return `${p.name} lets out a Challenging Shout, forcing the enemy's attention.`;
        }},
        { id: 'warrior_shockwave', name: 'Shockwave', description: 'Slams the ground, dealing 120% damage and stunning the enemy for 2 turns.', levelRequired: 60, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.2)));
            e.buffs.push({ id: 'stun', name: 'Stunned', duration: 2 });
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            soundManager.play(SOUNDS.STUN);
            return `${p.name} sends a Shockwave, dealing ${damage.damageDealt} damage and stunning the foe.`;
        }},
        { id: 'warrior_avatar', name: 'Avatar', description: 'Transform, increasing ATK by 30% and Max HP by 30% for 5 turns.', levelRequired: 75, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Avatar', duration: 5, value: 0.3 });
            p.maxHp = Math.floor(p.maxHp * 1.3);
            p.hp = Math.floor(p.hp * 1.3);
            return `${p.name} becomes an Avatar of war, growing in power.`;
        }},
        { id: 'warrior_ragnarok', name: 'Ragnarok', description: 'Deals 500% damage, but you take 25% of your max HP in recoil damage.', levelRequired: 100, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 5.0)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            const recoil = Math.floor(p.maxHp * 0.25);
            applyDamage(p, recoil);
            showDamagePopup('player-combatant-card', `${recoil}`, 'damage');
            return `${p.name} unleashes Ragnarok, a world-ending blow for ${damage.damageDealt} damage, suffering ${recoil} in recoil.`;
        }},
    ],
    Assassin: [
        { id: 'backstab', name: 'Backstab', description: 'A quick strike that deals 180% damage.', levelRequired: 1, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.8)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} uses Backstab! ${damage.log} It deals a critical ${damage.damageDealt} damage.`;
        }},
        { id: 'shadow_step', name: 'Shadow Step', description: 'Greatly increases evasion for 1 turn.', levelRequired: 3, action: (p, e) => {
            p.buffs.push({ id: 'evasion', name: 'Evasive', duration: 1, value: 0.75 });
            return `${p.name} steps into the shadows, becoming harder to hit.`;
        }},
        { id: 'poison_dagger', name: 'Poison Dagger', description: 'Deals 70% damage and poisons the enemy for 3 turns.', levelRequired: 5, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.7)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'poison', name: 'Poisoned', duration: 3, value: Math.floor(p.atk * 0.3) });
            return `${p.name} strikes with a Poison Dagger! ${damage.log} It deals ${damage.damageDealt} damage and applies a potent poison.`;
        }},
        { id: 'eviscerate', name: 'Eviscerate', description: 'Deals massive damage to targets below 40% health.', levelRequired: 8, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const multiplier = e.hp / e.maxHp < 0.4 ? 3.0 : 1.0;
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * multiplier)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} uses Eviscerate! ${damage.log} ${multiplier > 1 ? "The enemy's low health makes the blow devastating, dealing" : 'It deals'} ${damage.damageDealt} damage.`;
        }},
        { id: 'vanish', name: 'Vanish', description: 'Become invisible, healing for a small amount and gaining high evasion for 2 turns.', levelRequired: 12, action: (p, e) => {
            const healAmount = Math.floor(p.maxHp * 0.15);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            p.buffs.push({ id: 'evasion', name: 'Vanished', duration: 2, value: 0.6 });
            triggerAnimation('player-combatant-card', 'animate-heal');
            showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            return `${p.name} vanishes, healing for ${healAmount} and becoming elusive.`;
        }},
        { id: 'assassins_mark', name: 'Assassin\'s Mark', description: 'Marks an enemy, causing them to take 50% more damage for 3 turns.', levelRequired: 15, action: (p, e) => {
            e.buffs.push({ id: 'vulnerable', name: 'Marked', duration: 3 });
            return `${p.name} marks ${e.name}, making them vulnerable to attack.`;
        }},
        { id: 'assassin_garrote', name: 'Garrote', description: 'Deals 50% damage and applies a grievous bleed for 3 turns.', levelRequired: 20, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.5)));
            e.buffs.push({ id: 'bleed', name: 'Grievous Bleed', duration: 3, value: Math.floor(p.atk * 0.5) });
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} garrotes the enemy, dealing ${damage.damageDealt} damage and causing a grievous wound.`;
        }},
        { id: 'assassin_cloak_of_shadows', name: 'Cloak of Shadows', description: 'Remove all harmful debuffs and become highly evasive for 2 turns.', levelRequired: 30, action: (p, e) => {
            p.buffs = p.buffs.filter(b => b.id === 'attack_up' || b.id === 'defense_up' || b.id === 'damage_reduction' || b.id === 'evasion' || b.id === 'invulnerable' || b.id === 'retaliation');
            p.buffs.push({ id: 'evasion', name: 'Shadowy', duration: 2, value: 0.7 });
            return `${p.name} uses Cloak of Shadows, cleansing debuffs and becoming a blur.`;
        }},
        { id: 'assassin_expose_armor', name: 'Expose Armor', description: 'A swift strike that permanently reduces enemy defense.', levelRequired: 50, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            applyDamage(e, 1);
            e.buffs.push({ id: 'vulnerable', name: 'Exposed', duration: 99 });
            return `${p.name} exposes a weakness in the enemy's armor.`;
        }},
        { id: 'assassin_vendetta', name: 'Vendetta', description: 'For 5 turns, your attacks deal 30% more damage and heal you for 10% of damage dealt.', levelRequired: 75, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Vendetta', duration: 5, value: 0.3 });
            return `${p.name} marks the enemy with a Vendetta, empowering their strikes.`;
        }},
        { id: 'assassin_shadow_execution', name: 'Shadow Execution', description: 'Deals 200% damage, plus 50% more for each debuff on the target.', levelRequired: 100, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const debuffCount = e.buffs.filter(b => b.id === 'stun' || b.id === 'bleed' || b.id === 'poison' || b.id === 'burn' || b.id === 'vulnerable' || b.id === 'attack_down' || b.id === 'blind').length;
            const multiplier = 2.0 + (debuffCount * 0.5);
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * multiplier)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} executes a shadow strike, dealing a massive ${damage.damageDealt} damage.`;
        }},
    ],
    Hunter: [
        { id: 'aimed_shot', name: 'Aimed Shot', description: 'A careful shot that deals 160% damage.', levelRequired: 1, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.6)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} takes an Aimed Shot! ${damage.log} It hits for ${damage.damageDealt} damage.`;
        }},
        { id: 'trap_setup', name: 'Trap Setup', description: 'Sets a trap that deals 50% damage and stuns the enemy.', levelRequired: 3, action: (p, e) => {
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.5)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'stun', name: 'Trapped', duration: 1 });
            soundManager.play(SOUNDS.STUN);
            return `${p.name} sets a trap! ${damage.log} It deals ${damage.damageDealt} damage and stuns the enemy.`;
        }},
        { id: 'call_companion', name: 'Call Companion', description: 'Your animal companion attacks twice for 70% damage each.', levelRequired: 5, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const dmg1 = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.7)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${dmg1.damageDealt}`, 'damage');
            const dmg2 = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.7)));
            showDamagePopup('enemy-combatant-card', `${dmg2.damageDealt}`, 'damage');
            const totalDmg = dmg1.damageDealt + dmg2.damageDealt;
            return `${p.name} calls their companion! ${dmg1.log} ${dmg2.log} It attacks twice for a total of ${totalDmg} damage.`;
        }},
        { id: 'volley', name: 'Volley', description: 'Fires a volley of arrows, dealing 100% damage and lowering enemy attack for 2 turns.', levelRequired: 8, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, p.atk));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'attack_down', name: 'Slowed', duration: 2, value: 0.3 });
            return `${p.name} fires a Volley! ${damage.log} It deals ${damage.damageDealt} damage and slows the enemy.`;
        }},
        { id: 'survival_instinct', name: 'Survival Instinct', description: 'Heal for 25% of max HP and gain evasion for 2 turns.', levelRequired: 12, action: (p, e) => {
            const healAmount = Math.floor(p.maxHp * 0.25);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            p.buffs.push({ id: 'evasion', name: 'Evasive', duration: 2, value: 0.4 });
            triggerAnimation('player-combatant-card', 'animate-heal');
            showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            return `${p.name} uses Survival Instinct, healing for ${healAmount} and becoming evasive.`;
        }},
        { id: 'hunters_mark', name: 'Hunter\'s Mark', description: 'Marks an enemy, causing them to take 50% more damage for 3 turns.', levelRequired: 15, action: (p, e) => {
            e.buffs.push({ id: 'vulnerable', name: 'Marked', duration: 3 });
            return `${p.name} marks ${e.name} as prey, making them vulnerable.`;
        }},
        { id: 'hunter_serpent_sting', name: 'Serpent Sting', description: 'A venomous shot that deals 60% damage and applies a deadly poison.', levelRequired: 20, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.6)));
            e.buffs.push({ id: 'poison', name: 'Serpent Venom', duration: 3, value: Math.floor(p.atk * 0.6) });
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} fires a Serpent Sting, dealing ${damage.damageDealt} and injecting a deadly venom.`;
        }},
        { id: 'hunter_bestial_wrath', name: 'Bestial Wrath', description: 'Your companion goes into a rage, attacking 4 times for 80% damage each.', levelRequired: 50, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            let totalDmg = 0;
            for (let i = 0; i < 4; i++) {
                const dmg = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.8)));
                totalDmg += dmg.damageDealt;
                showDamagePopup('enemy-combatant-card', `${dmg.damageDealt}`, 'damage');
            }
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            return `${p.name}'s companion enters a Bestial Wrath, tearing into the enemy for ${totalDmg} total damage.`;
        }},
        { id: 'hunter_stampede', name: 'Stampede', description: 'Summon a stampede of beasts, dealing 300% damage and stunning the target.', levelRequired: 100, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 3.0)));
            e.buffs.push({ id: 'stun', name: 'Trampled', duration: 1 });
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            soundManager.play(SOUNDS.STUN);
            return `${p.name} summons a Stampede, dealing ${damage.damageDealt} damage and trampling the enemy.`;
        }},
    ],
    Mage: [
        { id: 'fireball', name: 'Fireball', description: 'Hurls a ball of fire, dealing 130% damage and burning the enemy.', levelRequired: 1, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.3)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'burn', name: 'Burning', duration: 3, value: Math.floor(p.atk * 0.25) });
            return `${p.name} casts Fireball! ${damage.log} It explodes for ${damage.damageDealt} damage and leaves the enemy burning.`;
        }},
        { id: 'frost_nova', name: 'Frost Nova', description: 'An explosion of ice that deals 40% damage and stuns the enemy.', levelRequired: 3, action: (p, e) => {
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.4)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'stun', name: 'Frozen', duration: 1 });
            soundManager.play(SOUNDS.STUN);
            return `${p.name} casts Frost Nova! ${damage.log} It deals ${damage.damageDealt} damage and freezes the enemy solid.`;
        }},
        { id: 'arcane_bolt', name: 'Arcane Bolt', description: 'A quick bolt of magic that deals 110% damage.', levelRequired: 5, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.1)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} fires an Arcane Bolt! ${damage.log} It strikes for ${damage.damageDealt} damage.`;
        }},
        { id: 'mana_shield', name: 'Mana Shield', description: 'Creates a magical shield that absorbs damage.', levelRequired: 8, action: (p, e) => {
            const shieldAmount = Math.floor(p.maxHp * 0.5);
            p.shield += shieldAmount;
            triggerAnimation('player-combatant-card', 'animate-shield');
            soundManager.play(SOUNDS.SHIELD);
            return `${p.name} creates a Mana Shield, absorbing the next ${shieldAmount} damage.`;
        }},
        { id: 'teleport', name: 'Teleport', description: 'Instantly move, gaining high evasion for 1 turn.', levelRequired: 12, action: (p, e) => {
            p.buffs.push({ id: 'evasion', name: 'Teleporting', duration: 1, value: 0.9 });
            return `${p.name} teleports, becoming nearly impossible to hit for a moment.`;
        }},
        { id: 'elemental_storm', name: 'Elemental Storm', description: 'A massive storm that deals 250% damage.', levelRequired: 15, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 2.5)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} unleashes an Elemental Storm! ${damage.log} It ravages the enemy for ${damage.damageDealt} damage.`;
        }},
        { id: 'mage_polymorph', name: 'Polymorph', description: 'Transforms the enemy into a harmless sheep for 2 turns, stunning them.', levelRequired: 30, action: (p, e) => {
            e.buffs.push({ id: 'stun', name: 'Polymorphed', duration: 2 });
            soundManager.play(SOUNDS.STUN);
            return `${p.name} polymorphs the enemy into a sheep!`;
        }},
        { id: 'mage_arcane_power', name: 'Arcane Power', description: 'Increases your ATK by 50% for 3 turns.', levelRequired: 50, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Arcane Power', duration: 3, value: 0.5 });
            return `${p.name} surges with Arcane Power.`;
        }},
        { id: 'mage_meteor', name: 'Meteor', description: 'Calls down a meteor, dealing 400% damage and stunning the target.', levelRequired: 100, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 4.0)));
            e.buffs.push({ id: 'stun', name: 'Impacted', duration: 1 });
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            soundManager.play(SOUNDS.STUN);
            return `${p.name} calls down a Meteor! It crashes for ${damage.damageDealt} damage.`;
        }},
    ],
    Paladin: [
        { id: 'holy_strike', name: 'Holy Strike', description: 'A holy strike dealing 110% damage, doubled against Undead.', levelRequired: 1, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const multiplier = e.type === 'Undead' ? 2.2 : 1.1;
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * multiplier)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} uses Holy Strike! ${damage.log} ${e.type === 'Undead' ? 'The holy power sears the undead, dealing' : 'It deals'} ${damage.damageDealt} damage.`;
        }},
        { id: 'divine_shield', name: 'Divine Shield', description: 'Become immune to all damage for 1 turn.', levelRequired: 3, action: (p, e) => {
            p.buffs.push({ id: 'invulnerable', name: 'Divine Shield', duration: 1 });
            triggerAnimation('player-combatant-card', 'animate-shield');
            soundManager.play(SOUNDS.SHIELD);
            return `${p.name} is protected by a Divine Shield, becoming immune to damage.`;
        }},
        { id: 'lay_on_hands', name: 'Lay on Hands', description: 'A powerful heal that restores 50% of your max HP.', levelRequired: 5, action: (p, e) => {
            const healAmount = Math.floor(p.maxHp * 0.5);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            triggerAnimation('player-combatant-card', 'animate-heal');
            showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            return `${p.name} uses Lay on Hands, healing for a massive ${healAmount} HP.`;
        }},
        { id: 'aura_of_protection', name: 'Aura of Protection', description: 'Reduces all incoming damage by 30% for 3 turns.', levelRequired: 8, action: (p, e) => {
            p.buffs.push({ id: 'damage_reduction', name: 'Protection Aura', duration: 3, value: 0.3 });
            return `${p.name} activates Aura of Protection, shielding them from harm.`;
        }},
        { id: 'judgment', name: 'Judgment', description: 'Condemn an enemy, reducing their attack and making them vulnerable for 2 turns.', levelRequired: 12, action: (p, e) => {
            e.buffs.push({ id: 'attack_down', name: 'Judged', duration: 2, value: 0.3 });
            e.buffs.push({ id: 'vulnerable', name: 'Vulnerable', duration: 2 });
            return `${p.name} passes Judgment on ${e.name}, weakening them.`;
        }},
        { id: 'consecration', name: 'Consecration', description: 'Sanctifies the ground, dealing holy damage to the enemy for 3 turns.', levelRequired: 15, action: (p, e) => {
            e.buffs.push({ id: 'burn', name: 'Consecrated', duration: 3, value: Math.floor(p.atk * 0.5) });
            return `${p.name} uses Consecration, and holy fire burns ${e.name}.`;
        }},
        { id: 'paladin_divine_storm', name: 'Divine Storm', description: 'An explosion of holy energy heals you for 20% max HP and deals 150% damage.', levelRequired: 40, action: (p, e) => {
            const healAmount = Math.floor(p.maxHp * 0.2);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            triggerAnimation('player-combatant-card', 'animate-heal');
            showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.5)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} unleashes a Divine Storm, healing for ${healAmount} and smiting for ${damage.damageDealt} damage.`;
        }},
        { id: 'paladin_guardian_angel', name: 'Guardian Angel', description: 'If you would die in the next 3 turns, instead heal to 50% HP. (1/combat)', levelRequired: 75, action: (p, e) => {
             return `${p.name} calls upon a Guardian Angel to watch over them.`; // Logic handled in `applyDamage`
        }},
        { id: 'paladin_holy_crusade', name: 'Holy Crusade', description: 'For 5 turns, your attacks deal extra holy damage and heal you for 20% of damage dealt.', levelRequired: 100, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Crusader', duration: 5, value: 0.4 });
            return `${p.name} begins a Holy Crusade, empowering their every strike with righteous fury.`;
        }},
    ],
    Necromancer: [
        { id: 'raise_undead', name: 'Raise Undead', description: 'Deal 80% damage and summon a skeletal shield that absorbs damage.', levelRequired: 1, action: (p, e) => {
            const shieldAmount = Math.floor(p.maxHp * 0.2);
            p.shield += shieldAmount;
            triggerAnimation('player-combatant-card', 'animate-shield');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.8)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            soundManager.play(SOUNDS.SHIELD);
            return `${p.name} raises an undead minion! It shields them for ${shieldAmount} and attacks for ${damage.damageDealt} damage.`;
        }},
        { id: 'life_drain', name: 'Life Drain', description: 'Deals 90% damage and heals you for 50% of the damage dealt.', levelRequired: 3, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.9)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            const healAmount = Math.floor(damage.damageDealt * 0.5);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            return `${p.name} uses Life Drain. ${damage.log} They deal ${damage.damageDealt} damage and siphon ${healAmount} HP.`;
        }},
        { id: 'curse_of_weakness', name: 'Curse of Weakness', description: 'Reduces enemy attack power by 40% for 3 turns.', levelRequired: 5, action: (p, e) => {
            e.buffs.push({ id: 'attack_down', name: 'Weakened', duration: 3, value: 0.4 });
            return `${p.name} places a Curse of Weakness on the enemy.`;
        }},
        { id: 'bone_shield', name: 'Bone Shield', description: 'Create a shield of bone that absorbs a large amount of damage.', levelRequired: 8, action: (p, e) => {
            const shieldAmount = Math.floor(p.maxHp * 0.6);
            p.shield += shieldAmount;
            triggerAnimation('player-combatant-card', 'animate-shield');
            soundManager.play(SOUNDS.SHIELD);
            return `${p.name} forms a Bone Shield, absorbing the next ${shieldAmount} damage.`;
        }},
        { id: 'plague_swarm', name: 'Plague Swarm', description: 'Inflicts a plague that deals damage over time.', levelRequired: 12, action: (p, e) => {
            e.buffs.push({ id: 'poison', name: 'Plagued', duration: 3, value: Math.floor(p.atk * 0.6) });
            return `${p.name} unleashes a Plague Swarm on the enemy.`;
        }},
        { id: 'soul_harvest', name: 'Soul Harvest', description: 'A powerful strike that boosts your attack power for 3 turns.', levelRequired: 15, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.2)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            p.buffs.push({ id: 'attack_up', name: 'Soul Harvest', duration: 3, value: 0.5 });
            return `${p.name} harvests the enemy's essence, dealing ${damage.damageDealt} damage and increasing their own power.`;
        }},
        { id: 'necro_death_coil', name: 'Death Coil', description: 'Hurls a bolt of necrotic energy, dealing 150% damage or healing an Undead ally.', levelRequired: 25, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.5)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} casts Death Coil, inflicting ${damage.damageDealt} shadow damage.`;
        }},
        { id: 'necro_army_of_the_dead', name: 'Army of the Dead', description: 'Summon ghouls to attack 5 times for 70% damage each.', levelRequired: 75, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            let totalDmg = 0;
            for (let i = 0; i < 5; i++) {
                const dmg = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.7)));
                totalDmg += dmg.damageDealt;
                showDamagePopup('enemy-combatant-card', `${dmg.damageDealt}`, 'damage');
            }
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            return `${p.name} raises an Army of the Dead, swarming the enemy for ${totalDmg} total damage.`;
        }},
        { id: 'necro_lichborne', name: 'Lichborne', description: 'Become Undead for 5 turns, becoming immune to stuns and gaining 100% lifesteal.', levelRequired: 100, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Lichborne', duration: 5, value: 0.0 }); // Placeholder buff for lifesteal logic
            return `${p.name} embraces the power of the Lich, becoming a fearsome Undead lord.`;
        }},
    ],
    Druid: [
        { id: 'druid_wrath', name: 'Wrath', description: 'Hurl solar energy at the enemy, dealing 120% damage.', levelRequired: 1, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.2)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} casts Wrath, dealing ${damage.damageDealt} damage.`;
        }},
        { id: 'druid_rejuvenation', name: 'Rejuvenation', description: 'Heals you for 30% of your max HP over 3 turns.', levelRequired: 3, action: (p, e) => {
            const healPerTurn = Math.floor((p.maxHp * 0.3) / 3);
            p.buffs.push({ id: 'health_regen', name: 'Rejuvenation', duration: 3, value: healPerTurn });
            soundManager.play(SOUNDS.HEAL);
            return `${p.name} is surrounded by a Rejuvenating mist.`;
        }},
        { id: 'druid_bear_form', name: 'Bear Form', description: 'Take the form of a bear, gaining a large shield and increased defense for 3 turns.', levelRequired: 5, action: (p, e) => {
            const shieldAmount = Math.floor(p.maxHp * 0.4);
            p.shield += shieldAmount;
            p.buffs.push({ id: 'defense_up', name: 'Bear Form', duration: 3, value: 0.5 });
            triggerAnimation('player-combatant-card', 'animate-shield');
            soundManager.play(SOUNDS.SHIELD);
            return `${p.name} shifts into Bear Form, gaining a ${shieldAmount} shield and bolstering their defense.`;
        }},
        { id: 'druid_cat_form', name: 'Cat Form', description: 'Take the form of a cat, gaining increased attack and evasion for 3 turns.', levelRequired: 8, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Cat Form', duration: 3, value: 0.3 });
            p.buffs.push({ id: 'evasion', name: 'Catlike Reflexes', duration: 3, value: 0.3 });
            return `${p.name} shifts into Cat Form, becoming a swift and deadly predator.`;
        }},
        { id: 'druid_entangling_roots', name: 'Entangling Roots', description: 'Roots the enemy, dealing 30% damage and stunning them for 1 turn.', levelRequired: 12, action: (p, e) => {
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.3)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'stun', name: 'Rooted', duration: 1 });
            soundManager.play(SOUNDS.STUN);
            return `${p.name} calls upon Entangling Roots, dealing ${damage.damageDealt} damage and stopping the enemy in their tracks.`;
        }},
        { id: 'druid_moonfire', name: 'Moonfire', description: 'A beam of lunar light burns the enemy for 80% damage and applies a damage over time effect.', levelRequired: 15, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.8)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'burn', name: 'Moonfire', duration: 3, value: Math.floor(p.atk * 0.3) });
            return `${p.name} calls down a Moonfire, dealing ${damage.damageDealt} and leaving a burn.`;
        }},
        { id: 'druid_tranquility', name: 'Tranquility', description: 'A massive heal that restores 60% of your max HP.', levelRequired: 60, action: (p, e) => {
            const healAmount = Math.floor(p.maxHp * 0.6);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            triggerAnimation('player-combatant-card', 'animate-heal');
            showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            return `${p.name} enters a state of Tranquility, healing for a massive ${healAmount} HP.`;
        }},
        { id: 'druid_celestial_alignment', name: 'Celestial Alignment', description: 'For 5 turns, your ATK and Max HP are increased by 50%.', levelRequired: 100, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Celestial', duration: 5, value: 0.5 });
            p.maxHp = Math.floor(p.maxHp * 1.5);
            p.hp = Math.floor(p.hp * 1.5);
            return `${p.name} aligns with the celestial bodies, gaining immense power.`;
        }},
    ],
    Monk: [
        { id: 'monk_tiger_palm', name: 'Tiger Palm', description: 'A swift palm strike that deals 130% damage.', levelRequired: 1, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.3)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} strikes with the force of a tiger, dealing ${damage.damageDealt} damage.`;
        }},
        { id: 'monk_blackout_kick', name: 'Blackout Kick', description: 'A powerful kick dealing 160% damage.', levelRequired: 3, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.6)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} lands a Blackout Kick for ${damage.damageDealt} damage.`;
        }},
        { id: 'monk_fists_of_fury', name: 'Fists of Fury', description: 'Unleash a flurry of 4 strikes for 50% damage each, with the final blow stunning the target.', levelRequired: 8, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            let totalDmg = 0;
            for (let i = 0; i < 4; i++) {
                const dmg = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.5)));
                totalDmg += dmg.damageDealt;
                showDamagePopup('enemy-combatant-card', `${dmg.damageDealt}`, 'damage');
            }
            e.buffs.push({ id: 'stun', name: 'Dazed', duration: 1 });
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            soundManager.play(SOUNDS.STUN);
            return `${p.name} unleashes Fists of Fury, dealing ${totalDmg} total damage and stunning the enemy.`;
        }},
        { id: 'monk_expel_harm', name: 'Expel Harm', description: 'Deals 100% damage and heals you for 40% of the damage dealt.', levelRequired: 12, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, p.atk));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            const healAmount = Math.floor(damage.damageDealt * 0.4);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            return `${p.name} expels harm, dealing ${damage.damageDealt} damage and healing for ${healAmount}.`;
        }},
        { id: 'monk_touch_of_death', name: 'Touch of Death', description: 'Instantly kills an enemy below 20% health. Deals 150% damage otherwise.', levelRequired: 15, action: (p, e) => {
            if (e.hp / e.maxHp < 0.2) {
                applyDamage(e, e.maxHp * 2); // Overkill
                triggerAnimation('enemy-combatant-card', 'animate-hit');
                showDamagePopup('enemy-combatant-card', 'INSTA-KILL', 'damage');
                return `${p.name} uses Touch of Death, and the enemy collapses.`;
            } else {
                triggerAnimation('player-combatant-card', 'animate-attack');
                const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.5)));
                triggerAnimation('enemy-combatant-card', 'animate-hit');
                showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
                return `${p.name}'s Touch of Death is not lethal, but still deals ${damage.damageDealt} damage.`;
            }
        }},
        { id: 'monk_fortifying_brew', name: 'Fortifying Brew', description: 'A special brew that grants 40% damage reduction for 3 turns.', levelRequired: 30, action: (p, e) => {
            p.buffs.push({ id: 'damage_reduction', name: 'Fortified', duration: 3, value: 0.4 });
            return `${p.name} drinks a Fortifying Brew, steeling themselves for battle.`;
        }},
        { id: 'monk_rising_sun_kick', name: 'Rising Sun Kick', description: 'A powerful kick that deals 180% damage and makes the target vulnerable for 2 turns.', levelRequired: 40, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.8)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'vulnerable', name: 'Vulnerable', duration: 2 });
            return `${p.name} strikes with a Rising Sun Kick for ${damage.damageDealt}, leaving the enemy exposed.`;
        }},
        { id: 'monk_serenity', name: 'Serenity', description: 'Enter a state of absolute focus, increasing your ATK by 60% for 3 turns.', levelRequired: 75, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Serenity', duration: 3, value: 0.6 });
            return `${p.name} achieves Serenity, their movements becoming calm and deadly.`;
        }},
        { id: 'monk_storm_earth_fire', name: 'Storm, Earth, and Fire', description: 'Unleash elemental fury, striking 8 times for 60% damage each.', levelRequired: 100, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            let totalDmg = 0;
            for (let i = 0; i < 8; i++) {
                const dmg = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.6)));
                totalDmg += dmg.damageDealt;
                showDamagePopup('enemy-combatant-card', `${dmg.damageDealt}`, 'damage');
            }
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            return `${p.name} becomes one with Storm, Earth, and Fire, dealing a massive ${totalDmg} total damage.`;
        }},
    ],
    Bard: [
        { id: 'bard_dissonant_whispers', name: 'Dissonant Whispers', description: 'Deals 100% damage and weakens the enemy\'s attack by 20% for 2 turns.', levelRequired: 1, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, p.atk));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'attack_down', name: 'Whispers', duration: 2, value: 0.2 });
            return `${p.name} whispers a dissonant melody, dealing ${damage.damageDealt} and weakening the foe.`;
        }},
        { id: 'bard_song_of_rest', name: 'Song of Rest', description: 'A soothing tune that heals for 15% of your max HP.', levelRequired: 3, action: (p, e) => {
            const healAmount = Math.floor(p.maxHp * 0.15);
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            triggerAnimation('player-combatant-card', 'animate-heal');
            showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
            return `${p.name} plays a Song of Rest, healing for ${healAmount} HP.`;
        }},
        { id: 'bard_vicious_mockery', name: 'Vicious Mockery', description: 'Deals 30% damage and reduces enemy attack by 30% for 3 turns.', levelRequired: 5, action: (p, e) => {
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 0.3)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'attack_down', name: 'Mocked', duration: 3, value: 0.3 });
            return `${p.name} unleashes a Vicious Mockery. The insult deals ${damage.damageDealt} and wounds the enemy's pride.`;
        }},
        { id: 'bard_inspiring_ballad', name: 'Inspiring Ballad', description: 'Boosts your own attack by 30% for 3 turns.', levelRequired: 8, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Inspired', duration: 3, value: 0.3 });
            return `${p.name} plays an Inspiring Ballad, increasing their own power.`;
        }},
        { id: 'bard_shattering_note', name: 'Shattering Note', description: 'A high-frequency note that deals 180% damage.', levelRequired: 12, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.8)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            return `${p.name} lets out a Shattering Note for ${damage.damageDealt} sonic damage.`;
        }},
        { id: 'bard_song_of_celerity', name: 'Song of Celerity', description: 'Grants you high evasion for 2 turns.', levelRequired: 40, action: (p, e) => {
            p.buffs.push({ id: 'evasion', name: 'Swift', duration: 2, value: 0.6 });
            return `${p.name} plays a Song of Celerity, their movements becoming a blur.`;
        }},
        { id: 'bard_enthralling_performance', name: 'Enthralling Performance', description: 'Stuns the enemy for 2 turns as they watch in awe.', levelRequired: 60, action: (p, e) => {
            e.buffs.push({ id: 'stun', name: 'Enthralled', duration: 2 });
            soundManager.play(SOUNDS.STUN);
            return `${p.name}'s performance is so captivating it leaves the enemy stunned.`;
        }},
        { id: 'bard_magnum_opus', name: 'Magnum Opus', description: 'Your masterpiece. For 5 turns, ATK is increased by 40% and you gain 30% damage reduction.', levelRequired: 75, action: (p, e) => {
            p.buffs.push({ id: 'attack_up', name: 'Masterpiece', duration: 5, value: 0.4 });
            p.buffs.push({ id: 'damage_reduction', name: 'Masterpiece', duration: 5, value: 0.3 });
            return `${p.name} performs their Magnum Opus, a legendary composition of power.`;
        }},
        { id: 'bard_power_word_finale', name: 'Power Word: Finale', description: 'Deals 300% damage and applies Vulnerable and Attack Down to the enemy.', levelRequired: 100, action: (p, e) => {
            triggerAnimation('player-combatant-card', 'animate-attack');
            const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 3.0)));
            triggerAnimation('enemy-combatant-card', 'animate-hit');
            showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
            e.buffs.push({ id: 'vulnerable', name: 'Finale', duration: 3 });
            e.buffs.push({ id: 'attack_down', name: 'Finale', duration: 3, value: 0.5 });
            return `${p.name} ends their performance with a Power Word: Finale, dealing ${damage.damageDealt} and shattering the enemy's will.`;
        }},
    ]
};

export const UNIVERSAL_SKILLS: Skill[] = [
    { id: 'vampiric_strike', name: 'Vampiric Strike', description: 'Deal 100% damage and heal for 30% of the damage dealt.', levelRequired: 1, action: (p, e) => {
        triggerAnimation('player-combatant-card', 'animate-attack');
        const damage = applyDamage(e, calculateDamage(p, e, p.atk));
        triggerAnimation('enemy-combatant-card', 'animate-hit');
        showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
        const healAmount = Math.floor(damage.damageDealt * 0.3);
        if (healAmount > 0) {
            p.hp = Math.min(p.maxHp, p.hp + healAmount);
            showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
            soundManager.play(SOUNDS.HEAL);
        }
        return `${p.name} uses Vampiric Strike. ${damage.log} They deal ${damage.damageDealt} damage and siphon ${healAmount} HP.`;
    }},
    { id: 'meditate', name: 'Meditate', description: 'Heal for 20% of your max HP. Can only be used once per combat.', levelRequired: 1, action: (p, e) => {
        if (p.buffs.some(b => b.id === 'meditated')) {
            return `${p.name} tries to Meditate, but has already found their center in this battle.`;
        }
        const healAmount = Math.floor(p.maxHp * 0.2);
        p.hp = Math.min(p.maxHp, p.hp + healAmount);
        p.buffs.push({ id: 'meditated', name: 'Meditated', duration: 99 });
        triggerAnimation('player-combatant-card', 'animate-heal');
        showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
        soundManager.play(SOUNDS.HEAL);
        return `${p.name} meditates, restoring ${healAmount} HP.`;
    }},
    // New Universal Skills
    { id: 'second_wind', name: 'Second Wind', description: 'Passive: When your HP drops below 50%, instantly heal for 15% of your max HP. (1/combat)', levelRequired: 1, action: (p, e) => `This skill is passive and triggers automatically.` },
    { id: 'power_attack', name: 'Power Attack', description: 'A heavy swing that deals 130% damage but lowers your defense by 20% for 1 turn.', levelRequired: 1, action: (p, e) => {
        triggerAnimation('player-combatant-card', 'animate-attack');
        const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * 1.3)));
        p.buffs.push({ id: 'defense_up', name: 'Vulnerable', duration: 1, value: -0.2 });
        triggerAnimation('enemy-combatant-card', 'animate-hit');
        showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
        return `${p.name} uses Power Attack, dealing ${damage.damageDealt} damage but leaving them vulnerable.`;
    }},
    { id: 'taunt', name: 'Taunt', description: 'Force an enemy to target you, and increase your defense by 30% for 2 turns.', levelRequired: 1, action: (p, e) => {
        p.buffs.push({ id: 'defense_up', name: 'Taunting', duration: 2, value: 0.3 });
        return `${p.name} taunts the enemy, bolstering their own defense.`;
    }},
    { id: 'first_aid', name: 'First Aid', description: 'Heal yourself for 25% of your max HP over 2 turns.', levelRequired: 1, action: (p, e) => {
        const healPerTurn = Math.floor((p.maxHp * 0.25) / 2);
        p.buffs.push({ id: 'health_regen', name: 'First Aid', duration: 2, value: healPerTurn });
        soundManager.play(SOUNDS.HEAL);
        return `${p.name} applies First Aid and will recover health over time.`;
    }},
    { id: 'retaliation', name: 'Retaliation', description: 'For 2 turns, you counterattack all melee attacks for 60% damage.', levelRequired: 1, action: (p, e) => {
        p.buffs.push({ id: 'retaliation', name: 'Retaliating', duration: 2, value: 0.6 });
        return `${p.name} prepares to retaliate against any attack.`;
    }},
    { id: 'adrenaline_rush', name: 'Adrenaline Rush', description: 'Immediately gain an extra action this turn. (1/combat)', levelRequired: 1, action: (p, e) => {
        p.extraTurn = true;
        p.buffs.push({ id: 'meditated', name: 'Rushed', duration: 99}); // Reuse meditated buff to limit use
        return `${p.name} feels an Adrenaline Rush and can act again!`;
    }},
    { id: 'execute', name: 'Execute', description: 'Deals 200% damage to targets below 30% health, but only 50% damage to targets above.', levelRequired: 1, action: (p, e) => {
        triggerAnimation('player-combatant-card', 'animate-attack');
        const multiplier = e.hp / e.maxHp < 0.3 ? 2.0 : 0.5;
        const damage = applyDamage(e, calculateDamage(p, e, Math.floor(p.atk * multiplier)));
        triggerAnimation('enemy-combatant-card', 'animate-hit');
        showDamagePopup('enemy-combatant-card', `${damage.damageDealt}`, 'damage');
        return `${p.name} attempts to Execute! It deals ${damage.damageDealt} damage.`;
    }},
    { id: 'blind', name: 'Blind', description: 'Greatly reducing the enemy\'s accuracy for 2 turns.', levelRequired: 1, action: (p, e) => {
        e.buffs.push({ id: 'blind', name: 'Blinded', duration: 2, value: 0.5 }); // 50% miss chance
        return `${p.name} throws dust, blinding the enemy.`;
    }},
    { id: 'smoke_bomb', name: 'Smoke Bomb', description: 'Creates smoke, granting you high evasion for 1 turn.', levelRequired: 1, action: (p, e) => {
        p.buffs.push({ id: 'evasion', name: 'Smoked', duration: 1, value: 0.8 });
        return `${p.name} drops a Smoke Bomb, becoming hard to see.`;
    }},
    { id: 'disarm', name: 'Disarm', description: 'Disables the enemy\'s weapon, reducing their damage by 40% for 2 turns.', levelRequired: 1, action: (p, e) => {
        e.buffs.push({ id: 'attack_down', name: 'Disarmed', duration: 2, value: 0.4 });
        return `${p.name} disarms the enemy, reducing their attack power.`;
    }},
    { id: 'battle_meditation', name: 'Battle Meditation', description: 'Reduce damage taken by 50% for 1 turn and heal for 10% of max HP.', levelRequired: 1, action: (p, e) => {
        const healAmount = Math.floor(p.maxHp * 0.1);
        p.hp = Math.min(p.maxHp, p.hp + healAmount);
        p.buffs.push({ id: 'damage_reduction', name: 'Meditating', duration: 1, value: 0.5 });
        triggerAnimation('player-combatant-card', 'animate-heal');
        showDamagePopup('player-combatant-card', `+${healAmount}`, 'heal');
        soundManager.play(SOUNDS.HEAL);
        return `${p.name} enters a Battle Meditation, healing for ${healAmount} and reducing incoming damage.`;
    }},
    { id: 'focused_assault', name: 'Focused Assault', description: 'Your next attack is guaranteed to hit.', levelRequired: 1, action: (p, e) => {
        p.buffs.push({ id: 'focused_assault', name: 'Focused', duration: 1 });
        return `${p.name} focuses their assault, ensuring the next attack will hit.`;
    }},
    { id: 'blood_rage', name: 'Blood Rage', description: 'Sacrifice 10% of your current HP to increase your attack by 40% for 3 turns.', levelRequired: 1, action: (p, e) => {
        const hpCost = Math.floor(p.hp * 0.1);
        applyDamage(p, hpCost);
        showDamagePopup('player-combatant-card', `${hpCost}`, 'damage');
        p.buffs.push({ id: 'attack_up', name: 'Blood Rage', duration: 3, value: 0.4 });
        return `${p.name} enters a Blood Rage, sacrificing ${hpCost} HP for more power.`;
    }},
    { id: 'stone_skin', name: 'Stone Skin', description: 'Grants a shield that absorbs damage equal to 30% of your max HP.', levelRequired: 1, action: (p, e) => {
        const shieldAmount = Math.floor(p.maxHp * 0.3);
        p.shield += shieldAmount;
        triggerAnimation('player-combatant-card', 'animate-shield');
        soundManager.play(SOUNDS.SHIELD);
        return `${p.name} hardens their skin, gaining a ${shieldAmount} point shield.`;
    }},
    { id: 'flee', name: 'Flee', description: 'Attempt to escape from combat.', levelRequired: 1, action: (p, e) => {
        const successChance = 0.7;
        if (Math.random() < successChance) {
            setTimeout(() => endCombat(false, "You successfully escaped!"), 100);
            return "You successfully escaped!";
        } else {
            return "You failed to escape!";
        }
    }},
    { id: 'identify_weakness', name: 'Identify Weakness', description: 'Your next 3 attacks ignore 25% of the enemy\'s defense.', levelRequired: 1, action: (p, e) => {
        e.buffs.push({ id: 'identified_weakness', name: 'Weakness Found', duration: 3, value: 0.25 });
        return `${p.name} identifies a weakness in the enemy's defenses.`;
    }},
    { id: 'rejuvenating_draught', name: 'Rejuvenating Draught', description: 'Heal for 40% of max HP over 3 turns. (1/combat)', levelRequired: 1, action: (p, e) => {
        const healPerTurn = Math.floor((p.maxHp * 0.4) / 3);
        p.buffs.push({ id: 'health_regen', name: 'Rejuvenating', duration: 3, value: healPerTurn });
        p.buffs.push({ id: 'meditated', name: 'Draught Used', duration: 99}); // Reuse meditated buff to limit use
        soundManager.play(SOUNDS.HEAL);
        return `${p.name} drinks a Rejuvenating Draught.`;
    }},
    { id: 'echo_strike', name: 'Echo Strike', description: 'Your next attack triggers twice, with the second strike dealing 50% damage.', levelRequired: 1, action: (p, e) => {
        p.buffs.push({ id: 'echo_strike', name: 'Echoing', duration: 1 });
        return `${p.name}'s weapon glows with echoing energy.`;
    }},
];

export const ITEMS: { [itemId: string]: Item | Equipment | SkillTome } = {
    // Consumables
    healthPotion: { id: 'healthPotion', name: 'Health Potion', description: 'Restores 50 HP.', type: 'Consumable', rarity: 'Common', baseCost: 20 },
    strengthPotion: { id: 'strengthPotion', name: 'Potion of Strength', description: 'Increases ATK by 30% for 3 turns.', type: 'Consumable', rarity: 'Uncommon', baseCost: 35 },
    
    // Materials
    goblinEar: { id: 'goblinEar', name: 'Goblin Ear', description: 'Proof of a slain goblin.', type: 'Material', rarity: 'Common', baseCost: 2 },
    orcTusk: { id: 'orcTusk', name: 'Orc Tusk', description: 'A large, sharp tusk.', type: 'Material', rarity: 'Common', baseCost: 5 },
    ectoplasm: { id: 'ectoplasm', name: 'Ectoplasm', description: 'A remnant of an undead spirit.', type: 'Material', rarity: 'Common', baseCost: 4 },
    beastPelt: { id: 'beastPelt', name: 'Beast Pelt', description: 'A thick and durable pelt.', type: 'Material', rarity: 'Common', baseCost: 4 },
    ancientShard: { id: 'ancientShard', name: 'Ancient Shard', description: 'A fragment of a forgotten relic.', type: 'Material', rarity: 'Rare', baseCost: 50 },
    clockworkCog: { id: 'clockworkCog', name: 'Clockwork Cog', description: 'A gear from a fallen automaton.', type: 'Material', rarity: 'Uncommon', baseCost: 15 },
    dreamEssence: { id: 'dreamEssence', name: 'Dream Essence', description: 'A shimmering, intangible substance.', type: 'Material', rarity: 'Rare', baseCost: 40 },
    hardenedSalt: { id: 'hardenedSalt', name: 'Hardened Salt Crystal', description: 'A crystal formed under immense pressure.', type: 'Material', rarity: 'Epic', baseCost: 120 },
    ancientCoin: { id: 'ancientCoin', name: 'Ancient Coin', description: 'A strange, ancient coin. Highly valued by certain artisans.', type: 'Material', rarity: 'Rare', baseCost: 100 },

    // Skill Tomes
    tomeOfVampirism: { id: 'tomeOfVampirism', name: 'Tome of Vampirism', description: 'Teaches "Vampiric Strike".', type: 'SkillTome', skillId: 'vampiric_strike', rarity: 'Epic', baseCost: 1000 },
    tomeOfFocus: { id: 'tomeOfFocus', name: 'Tome of Focus', description: 'Teaches "Meditate".', type: 'SkillTome', skillId: 'meditate', rarity: 'Rare', baseCost: 500 },
    tomeOfPower: { id: 'tomeOfPower', name: 'Tome of Power', description: 'Teaches "Power Attack".', type: 'SkillTome', skillId: 'power_attack', rarity: 'Uncommon', baseCost: 400 },
    tomeOfExecution: { id: 'tomeOfExecution', name: 'Tome of Execution', description: 'Teaches "Execute".', type: 'SkillTome', skillId: 'execute', rarity: 'Rare', baseCost: 750 },
    tomeOfStone: { id: 'tomeOfStone', name: 'Tome of Stone', description: 'Teaches "Stone Skin".', type: 'SkillTome', skillId: 'stone_skin', rarity: 'Rare', baseCost: 600 },
    tomeOfRetaliation: { id: 'tomeOfRetaliation', name: 'Tome of Retaliation', description: 'Teaches "Retaliation".', type: 'SkillTome', skillId: 'retaliation', rarity: 'Epic', baseCost: 1200 },
    tomeOfAdrenaline: { id: 'tomeOfAdrenaline', name: 'Tome of Adrenaline', description: 'Teaches "Adrenaline Rush".', type: 'SkillTome', skillId: 'adrenaline_rush', rarity: 'Epic', baseCost: 2000 },

    // --- Equipment ---
    // Common
    rustySword: { id: 'rustySword', name: 'Rusty Sword', description: 'Better than nothing. +5 ATK.', type: 'Equipment', slot: 'Weapon', atkBonus: 5, rarity: 'Common', baseCost: 25 },
    leatherArmor: { id: 'leatherArmor', name: 'Leather Armor', description: 'Basic protection. +15 HP.', type: 'Equipment', slot: 'Armor', hpBonus: 15, rarity: 'Common', baseCost: 30 },
    luckyCharm: { id: 'luckyCharm', name: 'Lucky Charm', description: 'A small, worn charm. +5 HP, +2 ATK.', type: 'Equipment', slot: 'Accessory', hpBonus: 5, atkBonus: 2, rarity: 'Common', baseCost: 40 },
    
    // Uncommon
    ironSword: { id: 'ironSword', name: 'Iron Sword', description: 'A sturdy sword. +10 ATK.', type: 'Equipment', slot: 'Weapon', atkBonus: 10, rarity: 'Uncommon', baseCost: 100 },
    chainmail: { id: 'chainmail', name: 'Chainmail', description: 'Decent protection. +30 HP.', type: 'Equipment', slot: 'Armor', hpBonus: 30, rarity: 'Uncommon', baseCost: 120 },
    silverRing: { id: 'silverRing', name: 'Silver Ring', description: 'A simple but effective ring. +10 HP, +5 ATK.', type: 'Equipment', slot: 'Accessory', hpBonus: 10, atkBonus: 5, rarity: 'Uncommon', baseCost: 150 },

    // Rare
    steelSword: { id: 'steelSword', name: 'Steel Sword', description: 'A well-crafted steel sword. +18 ATK.', type: 'Equipment', slot: 'Weapon', atkBonus: 18, rarity: 'Rare', baseCost: 250 },
    studdedLeather: { id: 'studdedLeather', name: 'Studded Leather', description: 'Reinforced leather armor. +55 HP.', type: 'Equipment', slot: 'Armor', hpBonus: 55, rarity: 'Rare', baseCost: 280 },
    amuletOfPower: { id: 'amuletOfPower', name: 'Amulet of Power', description: 'Feels warm to the touch. +20 HP, +8 ATK.', type: 'Equipment', slot: 'Accessory', hpBonus: 20, atkBonus: 8, rarity: 'Rare', baseCost: 350 },

    // Epic
    elvenBlade: { id: 'elvenBlade', name: 'Elven Blade', description: 'Light, sharp, and deadly. +30 ATK.', type: 'Equipment', slot: 'Weapon', atkBonus: 30, rarity: 'Epic', baseCost: 700 },
    dwarvenMail: { id: 'dwarvenMail', name: 'Dwarven Mail', description: 'Masterfully forged chainmail. +90 HP.', type: 'Equipment', slot: 'Armor', hpBonus: 90, rarity: 'Epic', baseCost: 750 },
    sorcerersStone: { id: 'sorcerersStone', name: 'Sorcerer\'s Stone', description: 'Pulsates with arcane energy. +40 HP, +15 ATK.', type: 'Equipment', slot: 'Accessory', hpBonus: 40, atkBonus: 15, rarity: 'Epic', baseCost: 900 },
    
    // Legendary
    dragonfang: { id: 'dragonfang', name: 'Dragonfang', description: 'Forged from a dragon\'s tooth. +50 ATK.', type: 'Equipment', slot: 'Weapon', atkBonus: 50, rarity: 'Legendary', baseCost: 2000 },
    plateOfTheTitan: { id: 'plateOfTheTitan', name: 'Plate of the Titan', description: 'Feels impossibly sturdy. +150 HP.', type: 'Equipment', slot: 'Armor', hpBonus: 150, rarity: 'Legendary', baseCost: 2200 },
    ringOfDestiny: { id: 'ringOfDestiny', name: 'Ring of Destiny', description: 'Shines with an otherworldly light. +75 HP, +25 ATK.', type: 'Equipment', slot: 'Accessory', hpBonus: 75, atkBonus: 25, rarity: 'Legendary', baseCost: 3000 },
};

export const ENEMY_PORTRAITS: { [key in EnemyType]: string } = {
    Goblin: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#6B8E23"/><circle cx="40" cy="40" r="5" fill="#000"/><circle cx="60" cy="40" r="5" fill="#000"/><path d="M40 65 Q 50 75 60 65" fill="none" stroke="#000" stroke-width="3"/></svg>`,
    Orc: `<svg viewBox="0 0 100 100"><rect x="25" y="25" width="50" height="50" fill="#556B2F"/><path d="M35 75 L40 65 M65 75 L60 65" stroke="#FFF" stroke-width="4"/></svg>`,
    Undead: `<svg viewBox="0 0 100 100"><path d="M30 70 Q 50 90 70 70 V 30 H 30 Z" fill="#E6E6FA"/><circle cx="40" cy="45" r="6" fill="#000"/><circle cx="60" cy="45" r="6" fill="#000"/></svg>`,
    Beast: `<svg viewBox="0 0 100 100"><path d="M20 50 C 20 20, 80 20, 80 50 C 80 80, 20 80, 20 50" fill="#D2691E"/><path d="M30 40 L40 30 M70 40 L60 30" stroke="#000" stroke-width="4"/></svg>`,
    Construct: `<svg viewBox="0 0 100 100"><path d="M50 20 A 30 30 0 1 1 50 80 A 30 30 0 1 1 50 20 M50 30 L50 70 M30 50 L70 50" stroke="#CD7F32" stroke-width="6" fill="none" /><circle cx="50" cy="50" r="10" fill="#A9A9A9" /></svg>`,
    Aberration: `<svg viewBox="0 0 100 100"><path d="M20 50 C 40 20, 60 80, 80 50 S 60 20, 40 80" fill="none" stroke="#9370DB" stroke-width="5" opacity="0.8" /></svg>`,
};

export const ENEMIES: { [key: string]: Omit<Enemy, 'hp' | 'buffs' | 'shield'> } = {
    goblinScout: {
        name: 'Goblin Scout', portrait: ENEMY_PORTRAITS.Goblin, type: 'Goblin', rank: 'Normal', level: 1, maxHp: 40, atk: 10, xpValue: 15,
        drops: { gold: 5, items: [{ itemId: 'goblinEar', chance: 0.5 }, { itemId: 'healthPotion', chance: 0.1 }] }
    },
    orcGrunt: {
        name: 'Orc Grunt', portrait: ENEMY_PORTRAITS.Orc, type: 'Orc', rank: 'Normal', level: 3, maxHp: 80, atk: 18, xpValue: 30,
        drops: { gold: 12, items: [{ itemId: 'orcTusk', chance: 0.4 }, { itemId: 'rustySword', chance: 0.05 }] }
    },
    skeletonWarrior: {
        name: 'Skeleton Warrior', portrait: ENEMY_PORTRAITS.Undead, type: 'Undead', rank: 'Normal', level: 2, maxHp: 55, atk: 14, xpValue: 20,
        drops: { gold: 8, items: [{ itemId: 'ectoplasm', chance: 0.3 }, { itemId: 'leatherArmor', chance: 0.05 }] }
    },
    direWolf: {
        name: 'Dire Wolf', portrait: ENEMY_PORTRAITS.Beast, type: 'Beast', rank: 'Normal', level: 2, maxHp: 60, atk: 16, xpValue: 25,
        drops: { gold: 10, items: [{ itemId: 'beastPelt', chance: 0.4 }] }
    },
     goblinShaman: {
        name: 'Goblin Shaman', portrait: ENEMY_PORTRAITS.Goblin, type: 'Goblin', rank: 'Elite', level: 5, maxHp: 100, atk: 20,
        skill: {
            name: 'Heal',
            action: (e, p) => {
                const healAmount = Math.floor(e.maxHp * 0.2);
                e.hp = Math.min(e.maxHp, e.hp + healAmount);
                showDamagePopup('enemy-combatant-card', `+${healAmount}`, 'heal');
                soundManager.play(SOUNDS.HEAL);
                return `${e.name} chants and heals for ${healAmount} HP!`;
            }
        },
        xpValue: 75,
        drops: { gold: 30, items: [{ itemId: 'goblinEar', chance: 0.8 }, { itemId: 'luckyCharm', chance: 0.1 }, { itemId: 'ancientCoin', chance: 0.1 }] }
    },
    // Clockwork Menagerie
    clockworkWolf: {
        name: 'Clockwork Wolf', portrait: ENEMY_PORTRAITS.Construct, type: 'Construct', rank: 'Normal', level: 7, maxHp: 120, atk: 28, xpValue: 90,
        drops: { gold: 25, items: [{ itemId: 'clockworkCog', chance: 0.6 }, { itemId: 'ironSword', chance: 0.08 }] }
    },
    ironcladBear: {
        name: 'Ironclad Bear', portrait: ENEMY_PORTRAITS.Construct, type: 'Construct', rank: 'Elite', level: 9, maxHp: 250, atk: 35,
        skill: { name: 'Overdrive', action: (e, p) => { e.buffs.push({ id: 'attack_up', name: 'Overdrive', duration: 3, value: 0.3 }); return `${e.name} whirs loudly, going into overdrive!`; } },
        xpValue: 200,
        drops: { gold: 80, items: [{ itemId: 'clockworkCog', chance: 0.9 }, { itemId: 'steelSword', chance: 0.12 }, { itemId: 'ancientCoin', chance: 0.2 }] }
    },
    // Dreamer's Labyrinth
    lingeringDoubt: {
        name: 'Lingering Doubt', portrait: ENEMY_PORTRAITS.Aberration, type: 'Aberration', rank: 'Normal', level: 11, maxHp: 150, atk: 38, xpValue: 150,
        drops: { gold: 40, items: [{ itemId: 'dreamEssence', chance: 0.5 }, { itemId: 'studdedLeather', chance: 0.1 }] }
    },
    manifestedFear: {
        name: 'Manifested Fear', portrait: ENEMY_PORTRAITS.Aberration, type: 'Aberration', rank: 'Elite', level: 13, maxHp: 300, atk: 45,
        skill: { name: 'Mind Rend', action: (e, p) => { p.buffs.push({ id: 'attack_down', name: 'Terrified', duration: 2, value: 0.4 }); return `${e.name} shows you a terrifying vision, weakening your resolve!`; } },
        xpValue: 350,
        drops: { gold: 120, items: [{ itemId: 'dreamEssence', chance: 0.8 }, { itemId: 'amuletOfPower', chance: 0.15 }, { itemId: 'ancientCoin', chance: 0.3 }] }
    },
    // Salt Flats
    saltCrustedBehemoth: {
        name: 'Salt-Crusted Behemoth', portrait: ENEMY_PORTRAITS.Beast, type: 'Beast', rank: 'Legend', level: 16, maxHp: 800, atk: 60,
        skill: { name: 'Ground Slam', action: (e, p) => {
            triggerAnimation('enemy-combatant-card', 'animate-attack');
            const damage = applyDamage(p, calculateDamage(e, p, Math.floor(e.atk * 1.5)));
            triggerAnimation('player-combatant-card', 'animate-hit');
            showDamagePopup('player-combatant-card', `${damage.damageDealt}`, 'damage');
            p.buffs.push({ id: 'stun', name: 'Stunned', duration: 1 });
            soundManager.play(SOUNDS.STUN);
            return `${e.name} slams the ground! ${damage.log} It deals ${damage.damageDealt} damage and stuns you!`;
        }},
        xpValue: 1000,
        drops: { gold: 500, items: [{ itemId: 'hardenedSalt', chance: 1.0 }, { itemId: 'elvenBlade', chance: 0.25 }, { itemId: 'ancientCoin', chance: 1.0 }] }
    },
};

export const BLUEPRINTS: Blueprint[] = [
    { id: 'bp_tome_focus', name: 'Tome of Focus', description: 'Craft a tome that teaches the "Meditate" skill.', resultItemId: 'tomeOfFocus',
      requirements: { materials: { dreamEssence: 5, ectoplasm: 10 }, gold: 500 } },
    { id: 'bp_tome_vamp', name: 'Tome of Vampirism', description: 'Craft a tome that teaches the "Vampiric Strike" skill.', resultItemId: 'tomeOfVampirism',
      requirements: { materials: { ancientShard: 3, ancientCoin: 5 }, gold: 1500 } },
    { id: 'bp_tome_power', name: 'Tome of Power', description: 'Craft a tome that teaches "Power Attack".', resultItemId: 'tomeOfPower',
      requirements: { materials: { orcTusk: 10, goblinEar: 20 }, gold: 400 } },
    { id: 'bp_tome_retaliation', name: 'Tome of Retaliation', description: 'Craft a tome that teaches "Retaliation".', resultItemId: 'tomeOfRetaliation',
      requirements: { materials: { hardenedSalt: 1, ancientCoin: 3 }, gold: 1200 } },
    { id: 'bp_elven_blade', name: 'Elven Blade', description: 'Craft a light, sharp, and deadly blade.', resultItemId: 'elvenBlade',
      requirements: { materials: { ancientShard: 2, beastPelt: 15 }, gold: 800 } },
    { id: 'bp_dwarven_mail', name: 'Dwarven Mail', description: 'Craft masterfully forged chainmail.', resultItemId: 'dwarvenMail',
      requirements: { materials: { orcTusk: 20, clockworkCog: 10 }, gold: 900 } },
    { id: 'bp_sorcerers_stone', name: 'Sorcerer\'s Stone', description: 'Craft a stone that pulsates with arcane energy.', resultItemId: 'sorcerersStone',
      requirements: { materials: { dreamEssence: 10, ancientCoin: 3 }, gold: 1200 } }
];

export const LOCATIONS: { [key in GameLocation]: {
    name: string;
    description: string;
    actions: { name: string, id: string }[];
    encounters?: { enemyId: string; chance: number }[];
    levelRequirement: number;
}} = {
    'main-menu': { name: 'Main Menu', description: '', actions: [], levelRequirement: 0 },
    'crossroads': {
        name: 'The Crossroads',
        description: 'A dusty crossroads under a gray sky. Paths lead in all directions, some far more dangerous than others.',
        actions: [
            { name: 'Go to Town', id: 'go-town' },
            { name: 'Explore Woods', id: 'go-woods' },
            { name: 'Investigate Cave', id: 'go-cave' },
            { name: 'Search Ruins', id: 'go-ruins' },
            { name: 'Enter Clockwork Menagerie', id: 'go-clockworkMenagerie' },
            { name: 'Venture into Dreamer\'s Labyrinth', id: 'go-dreamersLabyrinth' },
            { name: 'Cross the Salt Flats', id: 'go-saltFlats' }
        ],
        levelRequirement: 1,
    },
    'town': {
        name: 'Town', // Name will be dynamically generated
        description: 'A small, bustling settlement. You can rest at the inn or visit the local shop.',
        actions: [
            { name: 'Visit Shop', id: 'shop' },
            { name: 'Visit Artisan', id: 'artisan' },
            { name: 'Rest at Inn (5 Gold)', id: 'rest' },
            { name: 'Leave Town', id: 'go-crossroads' }
        ],
        levelRequirement: 1,
    },
    'woods': {
        name: 'Whispering Woods',
        description: 'A dense forest where the trees seem to whisper secrets. Goblins and beasts are common here.',
        actions: [{ name: 'Explore', id: 'explore' }, { name: 'Return to Crossroads', id: 'go-crossroads' }],
        encounters: [
            { enemyId: 'goblinScout', chance: 0.6 },
            { enemyId: 'direWolf', chance: 0.4 }
        ],
        levelRequirement: 1,
    },
    'cave': {
        name: 'Dark Cave',
        description: 'A damp, dark cave. You hear the clattering of bones and the grunts of something larger.',
        actions: [{ name: 'Explore', id: 'explore' }, { name: 'Return to Crossroads', id: 'go-crossroads' }],
        encounters: [
            { enemyId: 'skeletonWarrior', chance: 0.5 },
            { enemyId: 'orcGrunt', chance: 0.5 }
        ],
        levelRequirement: 2,
    },
    'ruins': {
        name: 'Ancient Ruins',
        description: 'The crumbling remains of a forgotten structure. Powerful foes may lurk here.',
        actions: [{ name: 'Explore', id: 'explore' }, { name: 'Return to Crossroads', id: 'go-crossroads' }],
        encounters: [
            { enemyId: 'orcGrunt', chance: 0.4 },
            { enemyId: 'goblinShaman', chance: 0.6 }
        ],
        levelRequirement: 4,
    },
    'clockworkMenagerie': {
        name: 'Clockwork Menagerie',
        description: 'The overgrown estate of an eccentric noble. The air hums with the sound of whirring gears and ticking clocks.',
        actions: [{ name: 'Explore', id: 'explore' }, { name: 'Return to Crossroads', id: 'go-crossroads' }],
        encounters: [
            { enemyId: 'clockworkWolf', chance: 0.7 },
            { enemyId: 'ironcladBear', chance: 0.3 },
        ],
        levelRequirement: 7,
    },
    'dreamersLabyrinth': {
        name: 'The Dreamer\'s Labyrinth',
        description: 'A shifting, surreal landscape of impossible geometry and whispered memories. The path forward is never the same twice.',
        actions: [{ name: 'Explore', id: 'explore' }, { name: 'Return to Crossroads', id: 'go-crossroads' }],
        encounters: [
            { enemyId: 'lingeringDoubt', chance: 0.6 },
            { enemyId: 'manifestedFear', chance: 0.4 },
        ],
        levelRequirement: 11,
    },
    'saltFlats': {
        name: 'The Salt Flats',
        description: 'A vast, blindingly white expanse of cracked salt under a merciless sun. A colossal shape shimmers in the heat haze.',
        actions: [{ name: 'Explore', id: 'explore' }, { name: 'Return to Crossroads', id: 'go-crossroads' }],
        encounters: [
            { enemyId: 'saltCrustedBehemoth', chance: 1.0 }
        ],
        levelRequirement: 15,
    }
};
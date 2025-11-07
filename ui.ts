import { Character, CharacterClass, Enemy, Buff, Item, Equipment, EquipmentSlot, ItemType, Skill, Blueprint, SkillTome, GameState, Quest, Title, ItemRarity, Pet } from './types';
import * as dom from './dom';
import { CLASS_DATA, ITEMS, LOCATIONS, RARITY_DATA, UNIVERSAL_SKILLS, TITLES } from './data';
import { GameLocation } from './types';
import { soundManager } from './sound';


// --- UI HELPERS ---

let longPressTimer: number;
const LONG_PRESS_DURATION = 500; // ms

function getSkillData(skillId: string, characterClass?: CharacterClass): Skill | undefined {
    const universalSkill = UNIVERSAL_SKILLS.find(s => s.id === skillId);
    if (universalSkill) return universalSkill;

    if (characterClass) {
        const classSkill = CLASS_DATA[characterClass].skills.find(s => s.id === skillId);
        if (classSkill) return classSkill;
    }
    return undefined;
}

function getLocationIcon(locationId: GameLocation): string {
    const icons: { [key: string]: string } = {
        crossroads: `<i class="fa-solid fa-signs-post"></i>`,
        town: `<i class="fa-solid fa-house-chimney"></i>`,
        woods: `<i class="fa-solid fa-tree"></i>`,
        cave: `<i class="fa-solid fa-dungeon"></i>`,
        ruins: `<i class="fa-solid fa-gopuram"></i>`,
        clockworkMenagerie: `<i class="fa-solid fa-gears"></i>`,
        dreamersLabyrinth: `<i class="fa-solid fa-circle-nodes"></i>`,
        saltFlats: `<i class="fa-solid fa-gem"></i>`,
        vaultOfFrozenMoments: `<i class="fa-solid fa-snowflake"></i>`,
        mycelialNetwork: `<i class="fa-solid fa-bacterium"></i>`,
        aetheriumDocks: `<i class="fa-solid fa-anchor"></i>`,
        gardenOfReciprocalHunger: `<i class="fa-solid fa-plant-wilt"></i>`,
        sunkenCityOfTwoTides: `<i class="fa-solid fa-water"></i>`,
        architectsFolly: `<i class="fa-solid fa-drafting-compass"></i>`,
        generic: `<i class="fa-solid fa-location-dot"></i>`,
    };
    const key = Object.keys(icons).find(k => locationId.toLowerCase().includes(k)) || 'generic';
    return icons[key];
}


function showSkillTooltip(skill: Skill, buttonElement: HTMLElement) {
    let description = skill.description;
    if (skill.mpCost && skill.mpCost > 0) {
        description += ` (Cost: ${skill.mpCost} MP)`;
    }
    dom.skillTooltipName.textContent = skill.name;
    dom.skillTooltipDescription.textContent = description;
    
    dom.skillTooltip.classList.remove('hidden'); // Make visible to measure
    const rect = buttonElement.getBoundingClientRect();
    const tooltipHeight = dom.skillTooltip.offsetHeight;
    const tooltipWidth = dom.skillTooltip.offsetWidth;

    let top = rect.top - tooltipHeight - 10;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Boundary checks
    if (top < 10) { top = rect.bottom + 10; }
    if (left < 10) { left = 10; }
    if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
    }

    dom.skillTooltip.style.top = `${top}px`;
    dom.skillTooltip.style.left = `${left}px`;
}

function hideSkillTooltip() {
    dom.skillTooltip.classList.add('hidden');
}

function manageLongPress(button: HTMLButtonElement, skill: Skill, skillCallback: (skill: Skill) => void) {
    let wasLongPress = false;
    
    const pressStart = (e: Event) => {
        if (e instanceof MouseEvent && e.button !== 0) return;
        
        wasLongPress = false;
        longPressTimer = window.setTimeout(() => {
            wasLongPress = true;
            showSkillTooltip(skill, button);
        }, LONG_PRESS_DURATION);
    };

    const pressEnd = (e: Event) => {
        clearTimeout(longPressTimer);
        if (wasLongPress) {
            e.preventDefault();
            hideSkillTooltip();
        } else {
            hideSkillTooltip();
            skillCallback(skill);
        }
    };

    const pressCancel = () => {
        clearTimeout(longPressTimer);
        hideSkillTooltip();
    };

    button.addEventListener('mousedown', pressStart);
    button.addEventListener('touchstart', pressStart, { passive: true });

    button.addEventListener('mouseup', pressEnd);
    button.addEventListener('touchend', pressEnd);

    button.addEventListener('mouseleave', pressCancel);
    button.addEventListener('touchmove', pressCancel);

    button.addEventListener('contextmenu', e => e.preventDefault());
}

export function triggerAnimation(elementId: string, animationClass: string) {
    const element = dom.getElement(elementId);
    element.classList.remove(animationClass);
    // Use requestAnimationFrame to ensure the class removal is processed before adding it again
    requestAnimationFrame(() => {
        element.classList.add(animationClass);
        element.addEventListener('animationend', () => {
            element.classList.remove(animationClass);
        }, { once: true });
    });
}

export function showDamagePopup(targetElementId: string, text: string, type: 'damage' | 'heal' | 'shield' | 'miss') {
    const container = dom.getElement(targetElementId).querySelector('.damage-popup-container') || document.createElement('div');
    if (!container.classList.contains('damage-popup-container')) {
        container.className = 'damage-popup-container';
        dom.getElement(targetElementId).appendChild(container);
    }
    
    const popup = document.createElement('div');
    popup.className = `damage-popup ${type}`;
    popup.textContent = text;
    container.appendChild(popup);

    popup.addEventListener('animationend', () => {
        popup.remove();
    });
}


// --- RENDERING ---

export function renderCharacterSelection(characters: Character[], onSelect: (name: CharacterClass) => void) {
    dom.characterSelectionCards.innerHTML = characters.map(char => {
        const classData = CLASS_DATA[char.name];
        return `
        <div class="selection-card" data-char-name="${char.name}">
            <div class="character-portrait" data-portrait-container="true"><img src="${char.imageUrl}" alt="${char.name}"></div>
            <h3>${char.name}</h3>
            <p class="character-description">${classData.description}</p>
            <div class="passive-skill">
                <h4>Passive: ${char.passiveSkill.name}</h4>
                <p>${char.passiveSkill.description}</p>
            </div>
        </div>
    `}).join('');
    
    dom.characterSelectionCards.querySelectorAll('.selection-card').forEach(cardEl => {
        const card = cardEl as HTMLElement;
        card.addEventListener('click', () => {
            dom.characterSelectionCards.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const selectedName = card.dataset.charName as CharacterClass;
            onSelect(selectedName);
        });
    });
}


export function renderActionLog(log: string[]) {
    dom.actionLog.innerHTML = log.map(msg => `<p>${msg}</p>`).join('');
}

function renderHealthBar(container: HTMLElement, currentHp: number, maxHp: number, shield: number) {
    const healthPercentage = (currentHp / maxHp) * 100;
    const shieldTotal = currentHp + shield;
    const shieldPercentage = (shieldTotal / maxHp) * 100;
    
    container.innerHTML = `
        <div class="shield-bar" style="width: ${shieldPercentage}%;"></div>
        <div class="health-bar" style="width: ${healthPercentage}%;"></div>
        <span class="bar-text">${currentHp} / ${maxHp} ${shield > 0 ? `<span style="color: #93c5fd;">(+${shield})</span>` : ''}</span>
    `;
}

function renderMpBar(container: HTMLElement, currentMp: number, maxMp: number) {
    const percentage = (currentMp / maxMp) * 100;
    container.innerHTML = `
        <div class="mp-bar" style="width: ${percentage}%;"></div>
        <span class="bar-text">${currentMp} / ${maxMp}</span>
    `;
}

function renderXpBar(container: HTMLElement, currentXp: number, xpToNext: number) {
    const percentage = (currentXp / xpToNext) * 100;
    container.innerHTML = `
        <div class="xp-bar" style="width: ${percentage}%;"></div>
        <span class="bar-text">${currentXp} / ${xpToNext} XP</span>
    `;
}

function renderBuffs(container: HTMLElement, buffs: Buff[]) {
    container.innerHTML = buffs.map(buff => `<div class="buff-icon" data-buff-id="${buff.id}" title="${buff.name} (${buff.duration} turns left)">${buff.id.substring(0,2).toUpperCase()}</div>`).join('');
}

function renderPlayerCombatant(player: Character) {
    const mpBarHtml = player.resourceType === 'Mana' ? `<div class="mp-bar-container"></div>` : '';
    dom.playerCombatantCard.innerHTML = `
        <div class="damage-popup-container"></div>
        <div class="combatant-hud-content">
            <div class="combatant-portrait-wrapper">
                <img src="${player.imageUrl}" alt="${player.name}" class="combatant-portrait-img">
            </div>
            <div class="combatant-info">
                <h3>${player.name}</h3>
                <p>Level ${player.level}</p>
                <div class="health-bar-container"></div>
                ${mpBarHtml}
                <div class="xp-bar-container"></div>
                <div class="buff-container"></div>
            </div>
        </div>
    `;
    renderHealthBar(dom.playerCombatantCard.querySelector('.health-bar-container')!, player.hp, player.maxHp, player.shield);
    if (player.resourceType === 'Mana') {
        renderMpBar(dom.playerCombatantCard.querySelector('.mp-bar-container')!, player.mp!, player.maxMp!);
    }
    renderXpBar(dom.playerCombatantCard.querySelector('.xp-bar-container')!, player.xp, player.xpToNextLevel);
    renderBuffs(dom.playerCombatantCard.querySelector('.buff-container')!, player.buffs);
}

function renderPetCombatant(pet: Pet) {
    const rarityColor = RARITY_DATA[pet.rarity].color;
    dom.petCombatantCard.innerHTML = `
       <div class="damage-popup-container"></div>
        <div class="combatant-hud-content">
             <div class="combatant-portrait-wrapper" style="width: 60px; height: 60px;">
                ${pet.portrait.includes('<svg') ? pet.portrait : `<img src="${pet.portrait}" class="combatant-portrait-img">`}
            </div>
            <div class="combatant-info">
                <h3 style="color: ${rarityColor}; font-size: 1.2rem;">${pet.name}</h3>
                <p>${pet.rarity} | Lvl ${pet.level}</p>
                <div class="xp-bar-container"></div>
            </div>
        </div>
    `;
    renderXpBar(dom.petCombatantCard.querySelector('.xp-bar-container')!, pet.xp, pet.xpToNextLevel);
}

function renderEnemyCombatant(enemy: Enemy) {
    const rankColor = `var(--rank-${enemy.rank.toLowerCase()})`;
    dom.enemyCombatantCard.innerHTML = `
        <div class="damage-popup-container"></div>
        <div class="combatant-hud-content">
            <div class="combatant-info">
                <h3>${enemy.name}</h3>
                <p style="color: ${rankColor};">${enemy.rank} Lvl ${enemy.level} ${enemy.type}</p>
                <div class="health-bar-container"></div>
                <div class="buff-container"></div>
            </div>
            <div class="combatant-portrait-wrapper" style="--rank-color: ${rankColor};">
                 <img src="${enemy.imageUrl}" alt="${enemy.name}" class="combatant-portrait-img">
            </div>
        </div>
    `;
    // Style the border dynamically
    const portraitWrapper = dom.enemyCombatantCard.querySelector('.combatant-portrait-wrapper') as HTMLElement;
    if(portraitWrapper) {
       (portraitWrapper.firstElementChild as HTMLElement).style.background = rankColor;
    }

    renderHealthBar(dom.enemyCombatantCard.querySelector('.health-bar-container')!, enemy.hp, enemy.maxHp, enemy.shield);
    renderBuffs(dom.enemyCombatantCard.querySelector('.buff-container')!, enemy.buffs);
}

function renderCombatControls(player: Character, onAttack: () => void, onSkill: (skill: Skill) => void, onItem: () => void) {
    const availableSkills = player.skills
        .map(id => getSkillData(id, player.name))
        .filter(Boolean) as Skill[];
    
    dom.combatControlsContainer.innerHTML = `
        <button id="attack-btn">Attack</button>
        ${availableSkills.map(skill => {
            const hasEnoughResource = player.resourceType === 'Mana'
                ? !skill.mpCost || (player.mp! >= skill.mpCost)
                : true; // Assuming non-mana skills are always usable if player can act
            const buttonText = skill.mpCost ? `${skill.name} (${skill.mpCost})` : skill.name;
            return `<button class="skill-btn" data-skill-id="${skill.id}" ${hasEnoughResource ? '' : 'disabled'}>${buttonText}</button>`;
        }).join('')}
        <button id="item-btn">Item</button>
    `;

    dom.getElement('attack-btn').onclick = onAttack;
    document.querySelectorAll('.skill-btn').forEach(btn => {
        const button = btn as HTMLButtonElement;
        const skillId = button.dataset.skillId!;
        const skill = getSkillData(skillId, player.name)!;
        manageLongPress(button, skill, onSkill);
    });
    dom.getElement('item-btn').onclick = onItem;
}

function getCharacterTitle(player: Character): Title {
    const earnedTitles = TITLES.filter(title => {
        return title.requirements.every(req => {
            if (req.type === 'level') {
                return player.level >= req.value;
            }
            if (req.type === 'stat') {
                return player.stats[req.stat] >= req.value;
            }
            return false;
        });
    });

    if (earnedTitles.length === 0) {
        return TITLES.find(t => t.id === 'adventurer')!; // Should always exist
    }

    return earnedTitles.sort((a, b) => b.priority - a.priority)[0];
}

export function renderCharacterPanel(player: Character, onOpenInventory: () => void, onOpenSettings: () => void, onOpenQuestLog: () => void) {
    const char = player;
    const weaponName = char.equipment.Weapon?.name || 'Nothing';
    const armorName = char.equipment.Armor?.name || 'Nothing';
    const accessoryName = char.equipment.Accessory?.name || 'Nothing';
    const title = getCharacterTitle(player);
    const newSkillClass = char.hasNewSkill ? 'new-skill-glow' : '';

    let statsLine = `Lvl ${char.level} | HP: ${char.hp}/${char.maxHp} | ATK: ${char.atk}`;
    if (char.resourceType === 'Mana' && char.mp !== undefined && char.maxMp !== undefined) {
        statsLine = `Lvl ${char.level} | HP: ${char.hp}/${char.maxHp} | MP: ${char.mp}/${char.maxMp} | ATK: ${char.atk}`;
    }

    const petInfo = char.pet 
        ? `<p class="character-pet-info" style="color:${RARITY_DATA[char.pet.rarity].color}; font-weight: 600;">${char.pet.name} (Lvl ${char.pet.level})</p>` 
        : `<p class="character-pet-info" style="color:var(--secondary-text);">No active pet</p>`;

    dom.characterPanel.innerHTML = `
        <div class="character-card selected ${newSkillClass}" id="player-character-card" data-char-name="${char.name}">
            <button class="character-card-quest-btn" id="quest-log-btn" title="Quest Log">
                <i class="fa-solid fa-book-journal-whills"></i>
            </button>
            <button class="character-card-settings-btn" id="settings-btn" title="Settings">
                <i class="fa-solid fa-gear"></i>
            </button>
            <div class="character-portrait" style="border-color: ${title.borderColor};" title="Open Inventory">${char.portrait}</div>
            <div class="character-card-info" title="Open Inventory">
                <h3 class="character-role-title" style="color: ${title.borderColor};">${title.name}</h3>
                <h3>${char.name}</h3>
                <p>${statsLine}</p>
                ${petInfo}
                <div class="character-equipped">
                    <span>W: ${weaponName}</span>
                    <span>A: ${armorName}</span>
                    <span>Acc: ${accessoryName}</span>
                </div>
            </div>
        </div>
    `;

    dom.getElement('player-character-card').onclick = onOpenInventory;
    dom.getElement('settings-btn').onclick = (e) => { e.stopPropagation(); onOpenSettings(); };
    dom.getElement('quest-log-btn').onclick = (e) => { e.stopPropagation(); onOpenQuestLog(); };
}

function renderGameBoard(player: Character, townName: string, onAction: (id: string) => void, currentLocation: GameLocation) {
    const location = LOCATIONS[currentLocation];
    const locationNameText = currentLocation === 'town' ? townName : location.name;
    dom.locationName.textContent = locationNameText;
    dom.locationDescription.textContent = location.description;

    let html = '';

    if (currentLocation === 'crossroads') {
        const locationActions = location.actions.filter(a => a.id.startsWith('go-'));
        html += `<div class="location-strip-container">`;
        html += locationActions.map(action => {
            const destinationId = action.id.substring(3) as GameLocation;
            const destination = LOCATIONS[destinationId];
            if (!destination) return '';
            
            const requiredLevel = destination.levelRequirement;
            const isDisabled = player.level < requiredLevel;
            const icon = getLocationIcon(destinationId);
            const disabledClass = isDisabled ? 'disabled' : '';
            const lockIcon = isDisabled ? `<div class="location-card-lock-icon"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"></path></svg></div>` : '';

            return `
            <div class="location-card ${disabledClass}" data-action-id="${action.id}" ${isDisabled ? `title="Requires Level ${requiredLevel}"` : `title="${destination.name}"`}>
                ${lockIcon}
                <div class="location-card-content">
                    <div class="location-card-icon">${icon}</div>
                    <div>
                        <h4 class="location-card-name">${destination.name}</h4>
                        <p class="location-card-level">Lvl ${requiredLevel}</p>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        html += `</div>`;
    } else {
        html += location.actions.map(action => `<button id="${action.id}-btn" data-action-id="${action.id}">${action.name}</button>`).join('');
    }

    dom.actionButtons.innerHTML = html;

    // Attach event listeners to all clickable elements
    dom.actionButtons.querySelectorAll('button, .location-card:not(.disabled)').forEach(el => {
        const element = el as HTMLElement;
        const actionId = element.dataset.actionId!;
        element.addEventListener('click', () => onAction(actionId));
    });

    renderInventorySummary(player);
}


function renderInventorySummary(player: Character) {
    dom.goldAmount.textContent = String(player.gold);
    
    const itemCounts: { [name: string]: { count: number, rarity: ItemRarity } } = {};
    for (const itemId in player.inventory) {
        const count = player.inventory[itemId];
        if (count > 0) {
            const item = ITEMS[itemId];
            itemCounts[item.name] = { count: (itemCounts[item.name]?.count || 0) + count, rarity: item.rarity };
        }
    }
    
    dom.itemsList.innerHTML = Object.entries(itemCounts)
        .map(([name, data]) => `<span style="color: ${RARITY_DATA[data.rarity].color};">${name} x${data.count}</span>`)
        .join('');
}

export function renderAll(gameState: GameState, handlers: any) {
    if (!gameState.selectedCharacter) return;
    renderCharacterPanel(gameState.selectedCharacter, handlers.openInventoryModal, handlers.openSettingsModal, handlers.openQuestLogModal);
    
    if (gameState.inCombat) {
        dom.preCombatDisplay.classList.add('hidden');
        dom.combatDisplay.classList.remove('hidden');
        dom.combatControlsContainer.classList.remove('hidden');
        dom.inventoryDisplay.classList.add('hidden');
        dom.townBackground.classList.add('hidden');
        dom.crossroadsBackground.classList.add('hidden');
        
        if (gameState.selectedCharacter.pet) {
            dom.petCombatantCard.classList.remove('hidden');
            renderPetCombatant(gameState.selectedCharacter.pet);
        } else {
            dom.petCombatantCard.classList.add('hidden');
        }

        renderPlayerCombatant(gameState.selectedCharacter);
        renderEnemyCombatant(gameState.currentEnemy!);
        renderCombatControls(gameState.selectedCharacter, handlers.playerAttack, handlers.playerUseSkill, handlers.openCombatItemModal);
        
        // Disable controls if not player's turn
        const controls = dom.combatControlsContainer.querySelectorAll('button');
        controls.forEach(c => (c as HTMLButtonElement).disabled = !gameState.playerTurn);

        // Set active/inactive states
        dom.playerCombatantCard.classList.toggle('active', gameState.playerTurn);
        dom.playerCombatantCard.classList.toggle('inactive', !gameState.playerTurn);
        dom.petCombatantCard.classList.toggle('active', gameState.playerTurn);
        dom.petCombatantCard.classList.toggle('inactive', !gameState.playerTurn);
        dom.enemyCombatantCard.classList.toggle('active', !gameState.playerTurn);
        dom.enemyCombatantCard.classList.toggle('inactive', gameState.playerTurn);


    } else {
        dom.preCombatDisplay.classList.remove('hidden');
        dom.combatDisplay.classList.add('hidden');
        dom.petCombatantCard.classList.add('hidden');
        dom.combatControlsContainer.classList.add('hidden');
        dom.inventoryDisplay.classList.remove('hidden');

        dom.townBackground.classList.toggle('hidden', gameState.currentLocation !== 'town');
        dom.crossroadsBackground.classList.toggle('hidden', gameState.currentLocation !== 'crossroads');

        dom.preCombatDisplay.classList.toggle('in-town', gameState.currentLocation === 'town');
        dom.preCombatDisplay.classList.toggle('at-crossroads', gameState.currentLocation === 'crossroads');


        if (gameState.isExploring) {
            dom.explorationOverlay.classList.remove('hidden');
            dom.locationInfo.classList.add('hidden');
            dom.actionButtons.classList.add('hidden');
        } else {
            dom.explorationOverlay.classList.add('hidden');
            dom.locationInfo.classList.remove('hidden');
            dom.actionButtons.classList.remove('hidden');
            renderGameBoard(gameState.selectedCharacter, gameState.currentTownName, handlers.handleLocationAction, gameState.currentLocation);
        }
    }
    renderActionLog(gameState.log);
}

export function renderInventoryList(player: Character, onSelect: (id: string) => void) {
    const listEl = dom.getElement('inventory-item-list');
    
    const categorized: { [key in ItemType]: Item[] } = {
        'Equipment': [], 'Consumable': [], 'Material': [], 'SkillTome': [], 'PetEgg': [], 'QuestItem': []
    };

    for (const itemId in player.inventory) {
        if (player.inventory[itemId] > 0) {
            const item = ITEMS[itemId];
            if (item) categorized[item.type].push(item);
        }
    }
    
    let html = '';
    (['Equipment', 'SkillTome', 'PetEgg', 'Consumable', 'QuestItem', 'Material'] as ItemType[]).forEach(category => {
        if (categorized[category] && categorized[category].length > 0) {
            html += `<h4 class="category-title">${category}</h4>`;
            html += categorized[category].sort((a,b) => a.name.localeCompare(b.name)).map(item => {
                const itemClass = `item-name-${item.type.replace(/\s/g, '')}`;
                return `
                <div class="inventory-item" data-item-id="${item.id}">
                    <img src="${item.imageUrl}" alt="${item.name}" class="item-icon">
                    <span class="${itemClass}">${item.name}</span>
                    <span> (x${player.inventory[item.id]})</span>
                </div>
            `}).join('');
        }
    });

    listEl.innerHTML = html || '<p>Your inventory is empty.</p>';
    listEl.querySelectorAll('.inventory-item').forEach(el => {
        el.addEventListener('click', e => {
            listEl.querySelectorAll('.inventory-item').forEach(i => i.classList.remove('selected'));
            el.classList.add('selected');
            const itemId = (e.currentTarget as HTMLElement).dataset.itemId!;
            onSelect(itemId);
        });
    });
}

export function renderItemDetails(player: Character, itemId: string, onEquip: (id: string) => void, onUse: (id: string) => void) {
    const detailsPane = dom.getElement('item-details-pane');
    const item = ITEMS[itemId];
    if (!item) {
        detailsPane.classList.add('hidden');
        return;
    }
    detailsPane.classList.remove('hidden');
    
    const nameEl = dom.getElement('item-details-name');
    const descEl = dom.getElement('item-details-description');
    const statsEl = dom.getElement('item-details-stats');
    const actionsEl = dom.getElement('item-details-actions');
    const iconEl = dom.getElement('item-details-icon');
    
    iconEl.innerHTML = `<img src="${item.imageUrl}" alt="${item.name}">`;
    nameEl.textContent = item.name;
    nameEl.style.color = RARITY_DATA[item.rarity].color;
    descEl.textContent = item.description;
    
    let statsHtml = '';
    if (item.type === 'Equipment') {
        const equip = item as Equipment;
        const currentItem = player.equipment[equip.slot];
        
        if (equip.atkBonus) {
            const diff = equip.atkBonus - (currentItem?.atkBonus || 0);
            statsHtml += `<p>ATK: +${equip.atkBonus} ${diff !== 0 ? `<span class="${diff > 0 ? 'stat-increase' : 'stat-decrease'}">(${diff > 0 ? '+' : ''}${diff})</span>` : ''}</p>`;
        }
        if (equip.hpBonus) {
            const diff = equip.hpBonus - (currentItem?.hpBonus || 0);
            statsHtml += `<p>HP: +${equip.hpBonus} ${diff !== 0 ? `<span class="${diff > 0 ? 'stat-increase' : 'stat-decrease'}">(${diff > 0 ? '+' : ''}${diff})</span>` : ''}</p>`;
        }
        if (equip.mpBonus) {
            const diff = equip.mpBonus - (currentItem?.mpBonus || 0);
            statsHtml += `<p>MP: +${equip.mpBonus} ${diff !== 0 ? `<span class="${diff > 0 ? 'stat-increase' : 'stat-decrease'}">(${diff > 0 ? '+' : ''}${diff})</span>` : ''}</p>`;
        }
        if (equip.passive) {
            statsHtml += `<p>Passive: ${equip.passive.name} - ${equip.passive.description}</p>`;
        }
    } else if (item.type === 'SkillTome') {
        const skill = getSkillData((item as SkillTome).skillId);
        if (skill) statsHtml += `<p>Teaches Skill: ${skill.name}</p>`;
    }

    statsEl.innerHTML = statsHtml;
    
    let actionsHtml = '';
    if (item.type === 'Equipment') {
        actionsHtml = `<button id="equip-item-btn">Equip</button>`;
    } else if (item.type === 'Consumable' || item.type === 'SkillTome' || item.type === 'PetEgg') {
        actionsHtml = `<button id="use-item-btn">Use</button>`;
    }
    actionsEl.innerHTML = actionsHtml;

    const equipBtn = actionsEl.querySelector('#equip-item-btn');
    if (equipBtn) equipBtn.addEventListener('click', () => onEquip(itemId));
    
    const useBtn = actionsEl.querySelector('#use-item-btn');
    if (useBtn) useBtn.addEventListener('click', () => onUse(itemId));
}

export function renderEquippedItems(player: Character, onSelect: (slot: EquipmentSlot) => void) {
    (['Weapon', 'Armor', 'Accessory'] as EquipmentSlot[]).forEach(slot => {
        const item = player.equipment[slot];
        const slotId = `equip-slot-${slot.toLowerCase()}`;
        const slotEl = dom.getElement(slotId);
        const span = slotEl.querySelector('span')!;
        
        span.textContent = item ? item.name : 'None';
        span.style.color = item ? RARITY_DATA[item.rarity].color : 'var(--secondary-text)';
        
        slotEl.onclick = null; // Clear old listener
        if (item) {
            slotEl.style.cursor = 'pointer';
            slotEl.title = `Click to unequip ${item.name}`;
            slotEl.onclick = () => onSelect(slot);
        } else {
            slotEl.style.cursor = 'default';
            slotEl.title = '';
        }
    });
}

export function openShopModal(player: Character, shopInventory: { item: Item | Equipment, cost: number }[], onBuy: (id: string, cost: number) => void, onSell: (id: string) => void) {
    const modal = dom.shopModal;
    const itemsContainer = dom.getElement('shop-items');
    const toggleButtonsContainer = dom.getElement('shop-toggle-buttons');

    let currentView = 'buy'; // 'buy' or 'sell'

    const render = () => {
        // Render toggle buttons
        toggleButtonsContainer.innerHTML = `
            <button id="shop-buy-tab" class="${currentView === 'buy' ? 'active' : ''}">Buy</button>
            <button id="shop-sell-tab" class="${currentView === 'sell' ? 'active' : ''}">Sell</button>
        `;

        if (currentView === 'buy') {
            itemsContainer.innerHTML = shopInventory.map(({ item, cost }) => {
                const canAfford = player.gold >= cost;
                return `
                    <div class="shop-item">
                        <div class="shop-item-info">
                            <h4 style="color: ${RARITY_DATA[item.rarity].color}">${item.name}</h4>
                            <p>${item.description}</p>
                        </div>
                        <button class="buy-btn" data-item-id="${item.id}" data-cost="${cost}" ${canAfford ? '' : 'disabled'}>
                            Buy (${cost} G)
                        </button>
                    </div>
                `;
            }).join('') || '<p>The shopkeeper has nothing for sale.</p>';

            itemsContainer.querySelectorAll('.buy-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.currentTarget as HTMLElement;
                    onBuy(target.dataset.itemId!, parseInt(target.dataset.cost!));
                });
            });
        } else { // sell view
            const sellableItems = Object.entries(player.inventory)
                .filter(([id, count]) => count > 0 && ITEMS[id] && ITEMS[id].type !== 'QuestItem')
                .map(([id, count]) => ({ item: ITEMS[id], count }));

            if (sellableItems.length === 0) {
                itemsContainer.innerHTML = `<p>You have nothing to sell.</p>`;
                return;
            }

            itemsContainer.innerHTML = sellableItems.map(({ item, count }) => {
                const sellPrice = Math.max(1, Math.floor(item.baseCost * 0.3));
                return `
                    <div class="sell-item">
                         <div class="sell-item-info">
                            <h4 style="color: ${RARITY_DATA[item.rarity].color}">${item.name} (x${count})</h4>
                            <p>${item.description}</p>
                        </div>
                        <button class="sell-btn" data-item-id="${item.id}">
                            Sell (${sellPrice} G)
                        </button>
                    </div>
                `;
            }).join('');

            itemsContainer.querySelectorAll('.sell-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    onSell((e.currentTarget as HTMLElement).dataset.itemId!);
                });
            });
        }

        // Attach listeners to toggle buttons
        dom.getElement('shop-buy-tab').onclick = () => {
            if (currentView !== 'buy') {
                currentView = 'buy';
                render();
            }
        };
        dom.getElement('shop-sell-tab').onclick = () => {
            if (currentView !== 'sell') {
                currentView = 'sell';
                render();
            }
        };
    };
    
    render();

    dom.getElement('close-shop-btn').onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
}

export function openArtisanModal(player: Character, blueprints: Blueprint[], onCraft: (id: string) => void) {
    const modal = dom.artisanModal;
    const listEl = modal.querySelector('#artisan-blueprints')!;

    listEl.innerHTML = blueprints.map(bp => {
        const resultItem = ITEMS[bp.resultItemId];
        const rarityColor = RARITY_DATA[resultItem.rarity].color;

        let canCraft = player.gold >= bp.requirements.gold;
        const materialsMet = Object.entries(bp.requirements.materials).every(([matId, reqCount]) => {
            return (player.inventory[matId] || 0) >= reqCount;
        });
        if (!materialsMet) canCraft = false;

        return `
            <div class="blueprint-item">
                <div class="blueprint-header">
                    <h4 style="color:${rarityColor}">${resultItem.name}</h4>
                    <button class="craft-btn" data-bp-id="${bp.id}" ${canCraft ? '' : 'disabled'}>Craft</button>
                </div>
                <p>${bp.description}</p>
                <div class="blueprint-requirements">
                    <ul>
                        <li class="${player.gold >= bp.requirements.gold ? 'req-met' : 'req-not-met'}">Gold: ${player.gold}/${bp.requirements.gold}</li>
                        ${Object.entries(bp.requirements.materials).map(([matId, reqCount]) => {
                            const matItem = ITEMS[matId];
                            const haveCount = player.inventory[matId] || 0;
                            return `<li class="${haveCount >= reqCount ? 'req-met' : 'req-not-met'}">${matItem.name}: ${haveCount}/${reqCount}</li>`;
                        }).join('')}
                    </ul>
                </div>
            </div>
        `;
    }).join('') || '<p>"I have no blueprints for you right now."</p>';

    listEl.querySelectorAll('.craft-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            onCraft((e.currentTarget as HTMLElement).dataset.bpId!);
        });
    });

    dom.getElement('close-artisan-btn').onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
}

export function openCombatItemModal(player: Character, onUse: (itemId: string) => void) {
    const modal = dom.combatItemModal;
    const listEl = modal.querySelector('#combat-items-list')!;

    const consumables = Object.keys(player.inventory)
        .filter(id => ITEMS[id]?.type === 'Consumable' && player.inventory[id] > 0)
        .map(id => ITEMS[id]);
        
    if (consumables.length === 0) {
        listEl.innerHTML = `<p>No usable items.</p>`;
    } else {
        listEl.innerHTML = consumables.map(item => `
            <div class="combat-item-option" data-item-id="${item.id}">
                <h4>${item.name} (x${player.inventory[item.id]})</h4>
                <p>${item.description}</p>
            </div>
        `).join('');
    }

    listEl.querySelectorAll('.combat-item-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const itemId = (e.currentTarget as HTMLElement).dataset.itemId!;
            modal.classList.add('hidden');
            onUse(itemId);
        });
    });

    dom.getElement('close-combat-item-btn').onclick = () => {
        modal.classList.add('hidden');
        dom.combatControlsContainer.querySelectorAll('button').forEach(b => (b as HTMLButtonElement).disabled = false);
    };
    modal.classList.remove('hidden');
}

export function openQuestGiverModal(player: Character, questGiver: { name: string, dialogue: string, quest: Quest | null } | null, onAccept: (id: string) => void, onTurnIn: (id: string) => void) {
    if (!questGiver) return;

    const modal = dom.questGiverModal;
    const nameEl = dom.getElement('quest-giver-name');
    const dialogueEl = dom.getElement('quest-giver-dialogue');
    const questDetailsEl = dom.getElement('quest-offer-details');
    const buttonsEl = dom.getElement('quest-modal-buttons');

    nameEl.textContent = questGiver.name;
    dialogueEl.textContent = questGiver.dialogue;
    
    buttonsEl.innerHTML = ''; // Clear previous buttons

    const completedQuest = player.activeQuests.find(q => q.isComplete);

    if (completedQuest) {
        questDetailsEl.classList.remove('hidden');
        dom.getElement('quest-offer-title').textContent = `${completedQuest.title} (Complete)`;
        dom.getElement('quest-offer-description').textContent = completedQuest.description;
        dom.getElement('quest-offer-objectives').innerHTML = completedQuest.objectives.map(o => `<li>${o.targetName}: ${o.current}/${o.required}</li>`).join('');
        dom.getElement('quest-offer-rewards').textContent = `${completedQuest.rewards.xp} XP, ${completedQuest.rewards.gold} Gold`;
        
        buttonsEl.innerHTML = `
            <button id="turn-in-quest-btn">Complete Quest</button>
            <button id="close-quest-giver-btn">Goodbye</button>
        `;
        buttonsEl.querySelector('#turn-in-quest-btn')!.addEventListener('click', () => onTurnIn(completedQuest.id));

    } else if (questGiver.quest) {
        const quest = questGiver.quest;
        questDetailsEl.classList.remove('hidden');
        dom.getElement('quest-offer-title').textContent = quest.title;
        dom.getElement('quest-offer-description').textContent = quest.description;
        dom.getElement('quest-offer-objectives').innerHTML = quest.objectives.map(o => `<li>${o.targetName}: 0/${o.required}</li>`).join('');
        
        let rewardsText = `${quest.rewards.xp} XP, ${quest.rewards.gold} Gold`;
        if (quest.rewards.items) {
            rewardsText += ', ' + quest.rewards.items.map(i => `${ITEMS[i.itemId].name} x${i.quantity}`).join(', ');
        }
        dom.getElement('quest-offer-rewards').textContent = rewardsText;

        buttonsEl.innerHTML = `
            <button id="accept-quest-btn">Accept</button>
            <button id="decline-quest-btn">Decline</button>
        `;
        buttonsEl.querySelector('#accept-quest-btn')!.addEventListener('click', () => onAccept(quest.id));
        buttonsEl.querySelector('#decline-quest-btn')!.addEventListener('click', () => modal.classList.add('hidden'));

    } else {
        questDetailsEl.classList.add('hidden');
        buttonsEl.innerHTML = `<button id="close-quest-giver-btn">Goodbye</button>`;
    }
    
    const closeBtn = buttonsEl.querySelector<HTMLButtonElement>('#close-quest-giver-btn');
    if(closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    modal.classList.remove('hidden');
}

export function openQuestLogModal(player: Character) {
    const modal = dom.questLogModal;
    const listEl = dom.getElement('quest-log-list');
    
    if (player.activeQuests.length === 0) {
        listEl.innerHTML = '<p>You have no active quests.</p>';
    } else {
        listEl.innerHTML = player.activeQuests.map(quest => {
            const isComplete = quest.isComplete;
            return `
                <div class="quest-log-item">
                    <h4>${quest.title} <span style="color: ${isComplete ? 'var(--req-met)' : 'var(--secondary-text)'};">(${isComplete ? 'Ready to Turn In' : 'In Progress'})</span></h4>
                    <p>${quest.description}</p>
                    <ul>
                        ${quest.objectives.map(o => {
                            const isObjectiveComplete = o.current >= o.required;
                            return `<li style="color: ${isObjectiveComplete ? 'var(--req-met)' : 'inherit'};">${o.targetName}: ${o.current}/${o.required}</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        }).join('');
    }

    dom.getElement('close-quest-log-btn').onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
}

export function openSettingsModal(onClearLog: () => void, onSave: () => void, onQuit: () => void, onImport: () => void, onExport: () => void) {
    dom.soundToggleBtn.textContent = `Sound: ${soundManager.isSoundEnabled() ? 'On' : 'Off'}`;
    dom.soundToggleBtn.onclick = () => {
        soundManager.setSoundEnabled(!soundManager.isSoundEnabled());
        dom.soundToggleBtn.textContent = `Sound: ${soundManager.isSoundEnabled() ? 'On' : 'Off'}`;
    };

    dom.clearLogBtn.onclick = onClearLog;
    dom.modalSaveGameBtn.onclick = onSave;
    dom.modalQuitGameBtn.onclick = onQuit;
    dom.modalImportGameBtn.onclick = onImport;
    dom.modalExportGameBtn.onclick = onExport;
    dom.closeSettingsBtn.onclick = () => dom.settingsModal.classList.add('hidden');
    
    dom.settingsModal.classList.remove('hidden');
}

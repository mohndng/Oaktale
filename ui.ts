import { Character, CharacterClass, Enemy, Buff, Item, Equipment, EquipmentSlot, ItemType, Skill, Blueprint, SkillTome } from './types';
import * as dom from './dom';
import { gameState } from './game';
import { CLASS_SKILLS, ITEMS, LOCATIONS, RARITY_DATA, UNIVERSAL_SKILLS } from './data';
import { GameLocation } from './types';
import { soundManager } from './sound';

// --- UI HELPERS ---

let longPressTimer: number;
const LONG_PRESS_DURATION = 500; // ms

function getSkillData(skillId: string): Skill | undefined {
    const universalSkill = UNIVERSAL_SKILLS.find(s => s.id === skillId);
    if (universalSkill) return universalSkill;

    if (gameState.selectedCharacter) {
        const classSkill = CLASS_SKILLS[gameState.selectedCharacter.name].find(s => s.id === skillId);
        if (classSkill) return classSkill;
    }
    return undefined;
}

function showSkillTooltip(skill: Skill, buttonElement: HTMLElement) {
    dom.skillTooltipName.textContent = skill.name;
    dom.skillTooltipDescription.textContent = skill.description;
    
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
    setTimeout(() => {
        element.classList.add(animationClass);
        element.addEventListener('animationend', () => {
            element.classList.remove(animationClass);
        }, { once: true });
    }, 10);
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
    dom.characterSelectionCards.innerHTML = characters.map(char => `
        <div class="selection-card" data-char-name="${char.name}">
            <div class="character-portrait">${char.portrait}</div>
            <h3>${char.name}</h3>
            <p>HP: ${char.baseHp} | ATK: ${char.baseAtk}</p>
            <p>${CLASS_SKILLS[char.name][0].name}</p>
        </div>
    `).join('');
    
    dom.characterSelectionCards.querySelectorAll('.selection-card').forEach(card => {
        card.addEventListener('click', () => {
            dom.characterSelectionCards.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const selectedName = (card as HTMLElement).dataset.charName as CharacterClass;
            onSelect(selectedName);
        });
    });
}

export function renderActionLog() {
    dom.actionLog.innerHTML = gameState.log.map(msg => `<p>${msg}</p>`).join('');
}

function renderHealthBar(container: HTMLElement, currentHp: number, maxHp: number, shield: number) {
    const healthPercentage = (currentHp / maxHp) * 100;
    const shieldPercentage = Math.min(100, (shield / maxHp) * 100 + healthPercentage);
    
    container.innerHTML = `
        <div class="health-bar" style="width: ${healthPercentage}%;"></div>
        <div class="shield-bar" style="width: ${shieldPercentage}%;"></div>
        <span class="bar-text">${currentHp} / ${maxHp} ${shield > 0 ? `(+${shield})` : ''}</span>
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
    container.innerHTML = buffs.map(buff => `<div class="buff-icon" title="${buff.name} (${buff.duration} turns left)">${buff.id.substring(0,2).toUpperCase()}</div>`).join('');
}

function renderPlayerCombatant(player: Character) {
    dom.playerCombatantCard.innerHTML = `
        <div class="damage-popup-container"></div>
        <div class="buff-container"></div>
        <div class="character-portrait">${player.portrait}</div>
        <h3>${player.name}</h3>
        <p class="player-level">Level ${player.level}</p>
        <div class="health-bar-container"></div>
        <div class="xp-bar-container"></div>
    `;
    renderHealthBar(dom.playerCombatantCard.querySelector('.health-bar-container')!, player.hp, player.maxHp, player.shield);
    renderXpBar(dom.playerCombatantCard.querySelector('.xp-bar-container')!, player.xp, player.xpToNextLevel);
    renderBuffs(dom.playerCombatantCard.querySelector('.buff-container')!, player.buffs);
}

function renderEnemyCombatant(enemy: Enemy) {
    const rankColor = `var(--rank-${enemy.rank.toLowerCase()})`;
    dom.enemyCombatantCard.innerHTML = `
        <div class="damage-popup-container"></div>
        <div class="buff-container"></div>
        <div class="enemy-portrait" style="border-color: ${rankColor};">
            ${enemy.portrait}
        </div>
        <h3>${enemy.name}</h3>
        <p style="color: ${rankColor};">${enemy.rank} Lvl ${enemy.level} ${enemy.type}</p>
        <div class="health-bar-container"></div>
    `;
    renderHealthBar(dom.enemyCombatantCard.querySelector('.health-bar-container')!, enemy.hp, enemy.maxHp, enemy.shield);
    renderBuffs(dom.enemyCombatantCard.querySelector('.buff-container')!, enemy.buffs);
}

export function renderCombatControls(player: Character, onAttack: () => void, onSkill: (skill: Skill) => void, onItem: () => void) {
    const availableSkills = player.skills.map(id => getSkillData(id)).filter(Boolean) as Skill[];
    
    dom.combatControlsContainer.innerHTML = `
        <button id="attack-btn">Attack</button>
        ${availableSkills.map(skill => `<button class="skill-btn" data-skill-id="${skill.id}">${skill.name}</button>`).join('')}
        <button id="item-btn">Item</button>
    `;

    dom.getElement('attack-btn').onclick = onAttack;
    document.querySelectorAll('.skill-btn').forEach(btn => {
        const button = btn as HTMLButtonElement;
        const skillId = button.dataset.skillId!;
        const skill = getSkillData(skillId)!;
        manageLongPress(button, skill, onSkill);
    });
    dom.getElement('item-btn').onclick = onItem;
}

export function openSettingsModal(onClearLog: () => void, onSave: () => void, onQuit: () => void) {
    dom.settingsModal.classList.remove('hidden');

    function updateSoundButtonText() {
        dom.soundToggleBtn.textContent = soundManager.isSoundEnabled() ? 'Sound: ON' : 'Sound: OFF';
    }

    updateSoundButtonText();

    dom.soundToggleBtn.onclick = () => {
        soundManager.setSoundEnabled(!soundManager.isSoundEnabled());
        updateSoundButtonText();
    };

    dom.clearLogBtn.onclick = () => {
        onClearLog();
        dom.settingsModal.classList.add('hidden');
    };
    
    dom.modalSaveGameBtn.onclick = () => {
        onSave();
        dom.settingsModal.classList.add('hidden');
    };

    dom.modalQuitGameBtn.onclick = () => {
        onQuit();
        // Quit handler has its own confirmation, no need to close this modal
    };

    dom.closeSettingsBtn.onclick = () => {
        dom.settingsModal.classList.add('hidden');
    };
}

export function openArtisanModal(onCraft: (blueprintId: string) => void) {
    dom.artisanModal.classList.remove('hidden');
    const blueprintsContainer = dom.getElement('artisan-blueprints');
    const player = gameState.selectedCharacter!;

    const renderBlueprints = () => {
        if (gameState.currentArtisanBlueprints.length === 0) {
            blueprintsContainer.innerHTML = `<p>"I seem to be out of blueprints for now. Check back later!"</p>`;
            return;
        }

        blueprintsContainer.innerHTML = gameState.currentArtisanBlueprints.map(bp => {
            let canCraft = player.gold >= bp.requirements.gold;
            const requirementsHtml = Object.entries(bp.requirements.materials).map(([itemId, requiredCount]) => {
                const item = ITEMS[itemId];
                const haveCount = player.inventory[itemId] || 0;
                const hasEnough = haveCount >= requiredCount;
                if (!hasEnough) canCraft = false;
                return `<li class="${hasEnough ? 'req-met' : 'req-not-met'}">${item.name}: ${haveCount}/${requiredCount}</li>`;
            }).join('');

            const hasGold = player.gold >= bp.requirements.gold;
            const goldReqHtml = `<li class="${hasGold ? 'req-met' : 'req-not-met'}">Gold: ${player.gold}/${bp.requirements.gold}</li>`;

            const resultItem = ITEMS[bp.resultItemId];
            const rarityColor = RARITY_DATA[resultItem.rarity].color;

            return `
                <div class="blueprint-item">
                    <div class="blueprint-header">
                        <h4><span style="color:${rarityColor}">${bp.name}</span></h4>
                        <button class="craft-btn" data-blueprint-id="${bp.id}" ${canCraft ? '' : 'disabled'}>Craft</button>
                    </div>
                    <p>${bp.description}</p>
                    <div class="blueprint-requirements">
                        <ul>
                            ${requirementsHtml}
                            ${goldReqHtml}
                        </ul>
                    </div>
                </div>
            `;
        }).join('');

        blueprintsContainer.querySelectorAll('.craft-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const blueprintId = (e.target as HTMLElement).dataset.blueprintId!;
                onCraft(blueprintId);
                // Re-render after crafting to update button states and material counts
                renderBlueprints();
            });
        });
    };
    
    renderBlueprints();
    dom.getElement('close-artisan-btn').onclick = () => dom.artisanModal.classList.add('hidden');
}

export function openShopModal(
    shopInventory: { item: Item | Equipment, cost: number }[],
    onBuy: (itemId: string, cost: number) => void,
    onSell: (itemId: string) => void
) {
    dom.shopModal.classList.remove('hidden');
    let currentView: 'buy' | 'sell' = 'buy';

    const render = () => {
        // Render Toggles
        dom.shopToggleButtons.innerHTML = `
            <button id="buy-toggle" class="${currentView === 'buy' ? 'active' : ''}">Buy</button>
            <button id="sell-toggle" class="${currentView === 'sell' ? 'active' : ''}">Sell</button>
        `;
        dom.getElement('buy-toggle').onclick = () => { currentView = 'buy'; render(); };
        dom.getElement('sell-toggle').onclick = () => { currentView = 'sell'; render(); };

        const shopItemsEl = dom.getElement('shop-items');
        if (currentView === 'buy') {
            renderBuyView(shopItemsEl, shopInventory, onBuy);
        } else {
            renderSellView(shopItemsEl, onSell);
        }
    };

    render();
    dom.getElement('close-shop-btn').onclick = () => dom.shopModal.classList.add('hidden');
}

function renderBuyView(
    container: HTMLElement,
    shopInventory: { item: Item | Equipment, cost: number }[],
    onBuy: (itemId: string, cost: number) => void
) {
    if (shopInventory.length === 0) {
        container.innerHTML = `<p>The shopkeeper seems to be out of stock for now. Come back later!</p>`;
        return;
    }

    container.innerHTML = shopInventory.map(({ item, cost }) => {
        const rarityColor = RARITY_DATA[item.rarity].color;
        const canAfford = gameState.selectedCharacter!.gold >= cost;
        return `<div class="shop-item" ${canAfford ? '' : 'style="cursor:not-allowed; opacity:0.6;"'} data-item-id="${item.id}" data-cost="${cost}">
            <div class="shop-item-info">
                <h4><span style="color: ${rarityColor};">${item.name}</span></h4>
                <p>${item.description}</p>
            </div>
            <span>${cost} Gold</span>
        </div>`;
    }).join('');

    container.querySelectorAll('.shop-item').forEach(el => {
        el.addEventListener('click', e => {
            const target = e.currentTarget as HTMLElement;
            const itemId = target.dataset.itemId!;
            const cost = parseInt(target.dataset.cost!, 10);
            onBuy(itemId, cost);
        });
    });
}

function renderSellView(container: HTMLElement, onSell: (itemId: string) => void) {
    const player = gameState.selectedCharacter!;
    const sellableItems = Object.entries(player.inventory)
        .map(([id, count]) => ({ item: ITEMS[id], count }))
        .filter(({ item, count }) => count > 0 && (item.type === 'Material' || item.type === 'Consumable'));

    if (sellableItems.length === 0) {
        container.innerHTML = `<p>You have nothing to sell.</p>`;
        return;
    }

    container.innerHTML = sellableItems.map(({ item, count }) => {
        const sellPrice = Math.max(1, Math.floor(item.baseCost * 0.3));
        const rarityColor = RARITY_DATA[item.rarity].color;
        return `<div class="sell-item" data-item-id="${item.id}">
            <div class="sell-item-info">
                <h4><span style="color: ${rarityColor};">${item.name} (x${count})</span></h4>
                <p>Sell for ${sellPrice} Gold</p>
            </div>
            <button class="sell-btn" data-item-id="${item.id}">Sell 1</button>
        </div>`;
    }).join('');

    container.querySelectorAll('.sell-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation(); // Prevent the parent div's click event
            const itemId = (e.currentTarget as HTMLElement).dataset.itemId!;
            onSell(itemId);
            // After selling, re-render the sell view to update counts
            renderSellView(container, onSell);
        });
    });
}


export function renderCharacterPanel(onOpenInventory: () => void, onOpenSettings: () => void) {
    if (!gameState.selectedCharacter) {
        dom.characterPanel.innerHTML = '';
        return;
    }
    
    const char = gameState.selectedCharacter;
    const weaponName = char.equipment.Weapon?.name || 'Nothing';
    const armorName = char.equipment.Armor?.name || 'Nothing';
    const accessoryName = char.equipment.Accessory?.name || 'Nothing';

    dom.characterPanel.innerHTML = `
        <div class="character-card selected" id="player-character-card" data-char-name="${char.name}" title="Open Inventory">
            <div class="character-portrait">${char.portrait}</div>
            <div class="character-card-info">
                <h3>${char.name}</h3>
                <p>Lvl ${char.level} | HP: ${char.hp}/${char.maxHp} | ATK: ${char.atk}</p>
                <div class="character-equipped">
                    <span>W: ${weaponName}</span>
                    <span>A: ${armorName}</span>
                    <span>Acc: ${accessoryName}</span>
                </div>
            </div>
            <button class="character-card-settings-btn" title="Settings">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none;">
                    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.44,0.17-0.48,0.41L9.22,5.72C8.63,5.96,8.1,6.29,7.6,6.67L5.21,5.71C4.99,5.62,4.74,5.69,4.62,5.92L2.7,9.24 c-0.11,0.2-0.06,0.47,0.12,0.61L4.85,11c-0.05,0.3-0.07,0.62-0.07,0.94c0,0.33,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39,0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.38,2.91 c0.04,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.48,0.41l0.38-2.91c0.59-0.24,1.12-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0.01,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"></path>
                </svg>
            </button>
        </div>
    `;

    dom.getElement('player-character-card').onclick = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest('.character-card-settings-btn')) {
            onOpenSettings();
        } else {
            onOpenInventory();
        }
    };
}

export function renderGameBoard(onAction: (id: string) => void) {
    if (gameState.inCombat || !gameState.selectedCharacter) {
        dom.preCombatDisplay.classList.add('hidden');
        if(!gameState.inCombat) dom.combatDisplay.classList.add('hidden');
        dom.inventoryDisplay.classList.add('hidden');
        return;
    };
    
    dom.preCombatDisplay.classList.remove('hidden');
    dom.combatDisplay.classList.add('hidden');
    dom.combatControlsContainer.classList.add('hidden');
    dom.inventoryDisplay.classList.remove('hidden');
    
    const player = gameState.selectedCharacter!;
    const location = LOCATIONS[gameState.currentLocation];
    const locationNameText = gameState.currentLocation === 'town' ? gameState.currentTownName : location.name;
    dom.locationName.textContent = locationNameText;
    dom.locationDescription.textContent = location.description;

    dom.actionButtons.innerHTML = location.actions.map(action => {
        let isDisabled = false;
        let buttonText = action.name;
        let titleText = '';

        if (action.id.startsWith('go-')) {
            const destinationId = action.id.substring(3) as GameLocation;
            const destination = LOCATIONS[destinationId];
            if (destination) {
                const requiredLevel = destination.levelRequirement;
                if (player.level < requiredLevel) {
                    isDisabled = true;
                    buttonText = `${action.name} (Lvl ${requiredLevel})`;
                    titleText = `Requires Level ${requiredLevel}`;
                }
            }
        }
        
        return `<button id="${action.id}-btn" data-action-id="${action.id}" ${isDisabled ? 'disabled' : ''} title="${titleText}">${buttonText}</button>`;
    }).join('');

    location.actions.forEach(action => {
        const button = dom.getElement<HTMLButtonElement>(`${action.id}-btn`);
        if (!button.disabled) {
            button.addEventListener('click', () => onAction(action.id));
        }
    });

    renderInventorySummary();
}

function renderInventorySummary() {
    if (!gameState.selectedCharacter) return;
    dom.goldAmount.textContent = String(gameState.selectedCharacter.gold);
    
    const itemCounts: { [name: string]: number } = {};
    for (const itemId in gameState.selectedCharacter.inventory) {
        const count = gameState.selectedCharacter.inventory[itemId];
        if (count > 0) {
            const itemName = ITEMS[itemId].name;
            itemCounts[itemName] = (itemCounts[itemName] || 0) + count;
        }
    }
    
    dom.itemsList.innerHTML = Object.entries(itemCounts)
        .map(([name, count]) => `<span>${name} x${count}</span>`)
        .join('');
}

export function renderCombatDisplay() {
    if (!gameState.inCombat || !gameState.selectedCharacter || !gameState.currentEnemy) return;

    dom.preCombatDisplay.classList.add('hidden');
    dom.combatDisplay.classList.remove('hidden');
    dom.combatControlsContainer.classList.remove('hidden');

    renderPlayerCombatant(gameState.selectedCharacter);
    renderEnemyCombatant(gameState.currentEnemy);
}

export function renderInventoryList(onSelect: (id: string) => void) {
    const player = gameState.selectedCharacter!;
    const listEl = dom.getElement('inventory-item-list');
    
    const categorized: { [key in ItemType]: (Item | Equipment)[] } = {
        'Equipment': [], 'Consumable': [], 'Material': [], 'SkillTome': []
    };

    for (const itemId in player.inventory) {
        if (player.inventory[itemId] > 0) {
            const item = ITEMS[itemId];
            if (item) categorized[item.type].push(item);
        }
    }
    
    let html = '';
    (['Equipment', 'SkillTome', 'Consumable', 'Material'] as ItemType[]).forEach(category => {
        if (categorized[category].length > 0) {
            html += `<h4 class="category-title">${category}</h4>`;
            html += categorized[category].map(item => `
                <div class="inventory-item" data-item-id="${item.id}">
                    <span class="item-name-${item.type}">${item.name}</span>
                    <span> (x${player.inventory[item.id]})</span>
                </div>
            `).join('');
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

export function renderEquippedItems(onUnequip: (slot: EquipmentSlot) => void) {
    const player = gameState.selectedCharacter!;
    (['Weapon', 'Armor', 'Accessory'] as EquipmentSlot[]).forEach(slot => {
        const slotEl = dom.getElement(`equip-slot-${slot.toLowerCase()}`);
        const equippedItem = player.equipment[slot];
        if (equippedItem) {
            slotEl.innerHTML = `${slot}: <span style="color: ${RARITY_DATA[equippedItem.rarity].color};">${equippedItem.name}</span> <button data-slot="${slot}">Unequip</button>`;
            slotEl.querySelector('button')?.addEventListener('click', () => onUnequip(slot));
        } else {
            slotEl.innerHTML = `${slot}: <span>None</span>`;
        }
    });
}

export function renderItemDetails(itemId: string, onEquip: (id: string) => void, onUse: (id: string) => void) {
    const item = ITEMS[itemId];
    if (!item) {
        dom.getElement('item-details-pane').classList.add('hidden');
        return;
    }
    
    dom.getElement('item-details-pane').classList.remove('hidden');
    dom.getElement('item-details-name').textContent = item.name;
    dom.getElement('item-details-description').textContent = item.description;

    let statsHtml = '';
    if (item.type === 'Equipment') {
        const equip = item as Equipment;
        if (equip.hpBonus) statsHtml += `<p>HP: +${equip.hpBonus}</p>`;
        if (equip.atkBonus) statsHtml += `<p>ATK: +${equip.atkBonus}</p>`;
    }
    dom.getElement('item-details-stats').innerHTML = statsHtml;

    const actionsEl = dom.getElement('item-details-actions');
    let actionsHtml = '';
    if (item.type === 'Equipment') {
        actionsHtml += `<button id="equip-item-btn">Equip</button>`;
    }
    if (item.type === 'SkillTome' || item.type === 'Consumable') {
        actionsHtml += `<button id="use-item-btn">Use</button>`;
    }
    actionsEl.innerHTML = actionsHtml;

    if (item.type === 'Equipment') {
        dom.getElement('equip-item-btn').onclick = () => onEquip(itemId);
    }
    if (item.type === 'SkillTome' || item.type === 'Consumable') {
        dom.getElement('use-item-btn').onclick = () => onUse(itemId);
    }
}


export function renderAll(handlers: any) {
    if (!gameState.selectedCharacter) return;
    renderCharacterPanel(handlers.openInventoryModal, handlers.openSettingsModal);
    renderGameBoard(handlers.handleLocationAction);
    if(gameState.inCombat) {
        renderCombatDisplay();
        renderCombatControls(gameState.selectedCharacter, handlers.playerAttack, handlers.playerUseSkill, handlers.openCombatItemModal);
    }
    renderActionLog();
}
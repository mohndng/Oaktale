export function getElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element with id '${id}' not found.`);
    return el as T;
}

export const mainMenu = getElement('main-menu');
export const characterSelectionScreen = getElement('character-selection-screen');
export const characterSelectionCards = getElement('character-selection-cards');
export const startGameBtn = getElement<HTMLButtonElement>('start-game-btn');
export const gameContainer = getElement('game-container');
export const characterPanel = getElement('character-panel');
export const gameBoard = getElement('game-board');
export const preCombatDisplay = getElement('pre-combat-display');
export const locationName = getElement('location-name');
export const locationDescription = getElement('location-description');
export const actionButtons = getElement('action-buttons');
export const combatDisplay = getElement('combat-display');
export const combatControlsContainer = getElement('combat-controls-container');
export const playerCombatantCard = getElement('player-combatant-card');
export const enemyCombatantCard = getElement('enemy-combatant-card');
export const inventoryDisplay = getElement('inventory-display');
export const goldAmount = getElement('gold-amount');
export const itemsList = getElement('items-list');
export const actionLog = getElement('action-log');
export const levelUpModal = getElement('level-up-modal');
export const shopModal = getElement('shop-modal');
export const artisanModal = getElement('artisan-modal');
export const combatItemModal = getElement('combat-item-modal');
export const inventoryModal = getElement('inventory-modal');
export const confirmModal = getElement('confirm-modal');
export const infoModal = getElement('info-modal');
export const newGameBtn = getElement<HTMLButtonElement>('new-game-btn');
export const continueBtn = getElement<HTMLButtonElement>('continue-btn');
export const skillTooltip = getElement('skill-tooltip');
export const skillTooltipName = getElement('skill-tooltip-name');
export const skillTooltipDescription = getElement('skill-tooltip-description');
export const shopToggleButtons = getElement('shop-toggle-buttons');

export const settingsModal = getElement('settings-modal');
export const soundToggleBtn = getElement<HTMLButtonElement>('sound-toggle-btn');
export const clearLogBtn = getElement<HTMLButtonElement>('clear-log-btn');
export const closeSettingsBtn = getElement<HTMLButtonElement>('close-settings-btn');
export const modalSaveGameBtn = getElement<HTMLButtonElement>('modal-save-game-btn');
export const modalQuitGameBtn = getElement<HTMLButtonElement>('modal-quit-game-btn');
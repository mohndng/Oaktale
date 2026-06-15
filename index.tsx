import { initializeGame } from './game';
import { createIcons, icons } from 'lucide';

// Initialize Lucide icons in the DOM
createIcons({ icons });

// Start the game
initializeGame();
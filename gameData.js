// gameData.js
// Модуль для работы с данными игр в Supabase (Legacy - рефакторирован в src/)

// Импорт новых модулей
const { updateGameState, getPreviousGameState, compareGameStates } = require('./src/game/gameStateManager');
const { generateMoveReport, analyzePieceMovement } = require('./src/game/moveAnalyzer');
const { calculateGamePathDistance, calculateDistance, calculateManhattanDistance } = require('./src/validation/distanceCalculator');
const { getZoneType, getTriggerCell, getSourceTriggerCell, isPieceCaptured } = require('./src/validation/zoneDetector');
const { validateMove: validateMovement } = require('./src/validation/moveValidator');

// Экспорт функций для обратной совместимости
module.exports = {
    updateGameState,
    getPreviousGameState,
    compareGameStates,
    generateMoveReport,
    getZoneType,
    analyzePieceMovement,
    calculateDistance,
    calculateGamePathDistance,
    calculateManhattanDistance,
    getTriggerCell,
    getSourceTriggerCell,
    validateMovement,
    isPieceCaptured
};
// distanceCalculator.js
// Модуль для расчета расстояний по игровому полю

const gameZones = require('../../gameZones.json');
const { getZoneType, getTriggerCell, getSourceTriggerCell } = require('./zoneDetector');

/**
 * Вычисляет расстояние между двумя позициями по игровому пути
 * @param {string} from - Начальная позиция
 * @param {string} to - Конечная позиция
 * @param {number} player - Номер игрока (1-4) для определения пути
 * @returns {number} Расстояние в ходах по игровому маршруту
 */
function calculateGamePathDistance(from, to, player) {
    const playerKey = `player${player}`;
    const playerPath = gameZones.playerPaths && gameZones.playerPaths[playerKey] && gameZones.playerPaths[playerKey].path;

    if (!playerPath) {
        // Fallback к манхэттенскому расстоянию если путь не найден
        return calculateManhattanDistance(from, to);
    }

    // Проверяем специальные зоны для начальной позиции
    let fromIndex = playerPath.indexOf(from);
    let toIndex = playerPath.indexOf(to);

    // Обработка перехода из зоны ожидания или стартовой зоны
    if (fromIndex === -1) {
        const fromZone = getZoneType(from, player);
        const toZone = getZoneType(to, player);

        if (fromZone.type === 'waiting') {
            // Перемещение из зоны ожидания в стартовую зону - всегда 1 ход
            if (toZone.type === 'starting') {
                return 1;
            }
            // Из зоны ожидания через стартовую зону к началу игрового пути
            // 1 ход: зона ожидания → стартовая позиция
            // 1 ход: стартовая позиция → начало движения (I1)
            // Итого: fromIndex = -2 (чтобы добавить 2 хода к расчету)
            fromIndex = -2;
        } else if (fromZone.type === 'starting') {
            // Перемещение внутри стартовой зоны - 0 ходов
            if (toZone.type === 'starting') {
                return 0;
            }
            // Из стартовой зоны на игровое поле требуется 1 ход
            fromIndex = -1;
        } else if (fromZone.type === 'prison' || fromZone.type === 'temple') {
            // Для тюрьмы/храма ищем соответствующую триггерную клетку
            const sourceTrigger = getSourceTriggerCell(from);
            if (sourceTrigger) {
                fromIndex = playerPath.indexOf(sourceTrigger.trigger);
            }
        }
    }

    // Обработка перехода в специальные зоны для конечной позиции
    if (toIndex === -1) {
        const toZone = getZoneType(to, player);

        if (toZone.type === 'prison' || toZone.type === 'temple') {
            // Для тюрьмы/храма ищем соответствующую триггерную клетку
            const triggerData = getTriggerCell(to);
            if (triggerData) {
                toIndex = playerPath.indexOf(triggerData.trigger);
            }
        } else if (toZone.type === 'home') {
            // Для дома ищем позицию в игровом пути
            toIndex = playerPath.indexOf(to);
        }
    }

    // Если все еще не найдены позиции, используем манхэттенское расстояние
    if ((fromIndex < -2 || (fromIndex === -1 && getZoneType(from, player).type === 'field')) || toIndex === -1) {
        return calculateManhattanDistance(from, to);
    }

    // Специальная обработка для зон ожидания и стартовых зон
    if (fromIndex === -2) {
        // fromIndex = -2 означает переход из зоны ожидания (1 единица + 1 ход + путь до toIndex)
        return 2 + toIndex;
    } else if (fromIndex === -1) {
        // fromIndex = -1 означает переход из стартовой зоны (1 ход + путь до toIndex)
        return 1 + toIndex;
    }

    return Math.abs(toIndex - fromIndex);
}

/**
 * Вычисляет манхэттенское расстояние между двумя позициями (резервная функция)
 * @param {string} from - Начальная позиция
 * @param {string} to - Конечная позиция
 * @returns {number} Манхэттенское расстояние в ходах
 */
function calculateManhattanDistance(from, to) {
    const fromCol = from.charAt(0).charCodeAt(0);
    const fromRow = parseInt(from.slice(1));
    const toCol = to.charAt(0).charCodeAt(0);
    const toRow = parseInt(to.slice(1));

    return Math.abs(fromCol - toCol) + Math.abs(fromRow - toRow);
}

/**
 * Вычисляет расстояние между двумя позициями (совместимость с существующим кодом)
 * @param {string} from - Начальная позиция
 * @param {string} to - Конечная позиция
 * @returns {number} Расстояние в ходах
 */
function calculateDistance(from, to) {
    return calculateManhattanDistance(from, to);
}

/**
 * Проверяет соответствие расстояния значениям кубиков
 * @param {number} actualSteps - Фактическое количество ходов
 * @param {number} dice1 - Значение первого кубика
 * @param {number} dice2 - Значение второго кубика
 * @returns {boolean} true если расстояние соответствует кубикам
 */
function validateDistanceWithDice(actualSteps, dice1, dice2) {
    const diceSum = dice1 + dice2;
    const validSteps = [dice1, dice2, diceSum];

    return validSteps.includes(actualSteps);
}

module.exports = {
    calculateGamePathDistance,
    calculateManhattanDistance,
    calculateDistance,
    validateDistanceWithDice
};
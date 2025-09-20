// zoneDetector.js
// Модуль для определения типов зон и специальных перемещений

const gameZones = require('../../gameZones.json');

/**
 * Определяет к какой зоне принадлежит позиция
 * @param {string} position - Позиция на доске (например, "K1")
 * @param {number} player - Номер игрока (1-4)
 * @returns {Object} Объект с типом зоны и дополнительной информацией
 */
function getZoneType(position, player) {
    const playerKey = `player${player}`;

    // Проверка зоны ожидания
    const waitingZone = gameZones.waitingZones[playerKey];
    if (waitingZone && waitingZone.coordinates && waitingZone.coordinates.includes(position)) {
        return { type: 'waiting', zone: 'waitingZone' };
    }

    // Проверка стартовых позиций
    const startingPos = gameZones.startingPositions[playerKey];
    if (startingPos && startingPos.coordinates && startingPos.coordinates.includes(position)) {
        return { type: 'starting', zone: 'startingPosition' };
    }

    // Проверка домашней зоны
    const homeZone = gameZones.homeZones[playerKey];
    if (homeZone && homeZone.coordinates && homeZone.coordinates.includes(position)) {
        return { type: 'home', zone: 'homeZone' };
    }

    // Проверка тюрьмы
    const prisonCells = Object.values(gameZones.specialZones.prison).map(p => p.teleportTo);
    if (prisonCells.includes(position)) {
        return { type: 'prison', zone: 'prison' };
    }

    // Проверка храма
    const templeCells = Object.values(gameZones.specialZones.temple).map(t => t.teleportTo);
    if (templeCells.includes(position)) {
        return { type: 'temple', zone: 'temple' };
    }

    // Позиция начала движения
    const movementStart = gameZones.movementStart[playerKey];
    if (movementStart && position === movementStart.position) {
        return { type: 'movementStart', zone: 'movementStart' };
    }

    // Проверка телепорта
    const teleportZone = gameZones.teleportZones[playerKey];
    if (teleportZone && position === teleportZone.position) {
        return { type: 'teleport', zone: 'teleport' };
    }

    return { type: 'field', zone: 'gameField' };
}

/**
 * Определяет выход из зоны ожидания
 * @param {string} from - Начальная позиция
 * @param {string} to - Конечная позиция
 * @param {number} player - Номер игрока
 * @returns {boolean} true если это выход из зоны ожидания
 */
function isWaitingZoneExit(from, to, player) {
    const fromZone = getZoneType(from, player);
    const toZone = getZoneType(to, player);

    return fromZone.type === 'waiting' && toZone.type !== 'waiting';
}

/**
 * Определяет выход из тюрьмы
 * @param {string} from - Начальная позиция
 * @param {string} to - Конечная позиция
 * @param {number} player - Номер игрока
 * @returns {boolean} true если это выход из тюрьмы
 */
function isPrisonExit(from, to, player) {
    const fromZone = getZoneType(from, player);
    return fromZone.type === 'prison';
}

/**
 * Определяет использование телепорта
 * @param {string} from - Начальная позиция
 * @param {string} to - Конечная позиция
 * @param {number} player - Номер игрока
 * @returns {boolean} true если это использование телепорта
 */
function isTeleportMove(from, to, player) {
    const fromZone = getZoneType(from, player);
    return fromZone.type === 'teleport';
}

/**
 * Получает телепорт игрока
 * @param {number} player - Номер игрока
 * @returns {string|null} Позиция телепорта или null
 */
function getPlayerTeleport(player) {
    const playerKey = `player${player}`;
    const teleportZone = gameZones.teleportZones[playerKey];
    return teleportZone ? teleportZone.position : null;
}

/**
 * Получает триггерную клетку для тюрьмы или храма
 * @param {string} targetPosition - Конечная позиция (тюрьма/храм)
 * @returns {Object|null} Объект с типом и триггерной позицией или null
 */
function getTriggerCell(targetPosition) {
    // Поиск в тюрьмах
    for (const [triggerCell, data] of Object.entries(gameZones.specialZones.prison)) {
        if (data.teleportTo === targetPosition) {
            return { type: 'prison', trigger: triggerCell, target: targetPosition };
        }
    }

    // Поиск в храмах
    for (const [triggerCell, data] of Object.entries(gameZones.specialZones.temple)) {
        if (data.teleportTo === targetPosition) {
            return { type: 'temple', trigger: triggerCell, target: targetPosition };
        }
    }

    return null;
}

/**
 * Получает исходную триггерную клетку для выхода из тюрьмы или храма
 * @param {string} currentPosition - Текущая позиция (тюрьма/храм)
 * @returns {Object|null} Объект с типом и триггерной позицией или null
 */
function getSourceTriggerCell(currentPosition) {
    // Поиск в тюрьмах
    for (const [triggerCell, data] of Object.entries(gameZones.specialZones.prison)) {
        if (data.teleportTo === currentPosition) {
            return { type: 'prison', trigger: triggerCell, source: currentPosition };
        }
    }

    // Поиск в храмах
    for (const [triggerCell, data] of Object.entries(gameZones.specialZones.temple)) {
        if (data.teleportTo === currentPosition) {
            return { type: 'temple', trigger: triggerCell, source: currentPosition };
        }
    }

    return null;
}

/**
 * Проверяет, была ли фишка съедена (возврат с поля в зону ожидания)
 * @param {Object} movement - Объект с информацией о перемещении
 * @returns {boolean} true, если фишка была съедена
 */
function isPieceCaptured(movement) {
    const { player, from, to } = movement;
    const fromZone = getZoneType(from, player);
    const toZone = getZoneType(to, player);

    // Фишка съедена, если она перемещается с любого места (кроме зоны ожидания) в зону ожидания
    return toZone.type === 'waiting' && fromZone.type !== 'waiting';
}

module.exports = {
    getZoneType,
    isWaitingZoneExit,
    isPrisonExit,
    isTeleportMove,
    getPlayerTeleport,
    getTriggerCell,
    getSourceTriggerCell,
    isPieceCaptured
};
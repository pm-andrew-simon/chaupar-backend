// moveValidator.js
// Модуль для валидации ходов в игре Чаупар

const { calculateGamePathDistance, validateDistanceWithDice } = require('./distanceCalculator');
const {
    isWaitingZoneExit,
    isPrisonExit,
    isTeleportMove,
    getPlayerTeleport,
    isPieceCaptured
} = require('./zoneDetector');

/**
 * Валидирует длину хода относительно значений кубиков
 * @param {Object} movement - Объект с информацией о перемещении
 * @param {Array} diceRolls - Массив бросков кубиков
 * @returns {Object} Объект с результатом валидации
 */
function validateMoveDistance(movement, diceRolls) {
    const { player, piece, pieceId, from, to } = movement;

    if (diceRolls.length === 0) {
        return { isValid: true, errorMessage: null };
    }

    const dice1 = diceRolls[0].dice1;
    const dice2 = diceRolls[0].dice2;
    const diceValues = `${dice1}+${dice2}=${dice1 + dice2}`;

    // Вычисляем фактическое расстояние хода
    const actualSteps = calculateGamePathDistance(from, to, player);

    // Проверяем соответствие
    const isValid = validateDistanceWithDice(actualSteps, dice1, dice2);

    if (!isValid) {
        return {
            isValid: false,
            errorMessage: `Некорректный ход фишки ${pieceId || (piece + 1)}. Выпало: ${diceValues}, перемещено: ${actualSteps}`
        };
    }

    return {
        isValid: true,
        errorMessage: null
    };
}

/**
 * Валидирует выход из зоны ожидания (требуется единица на кубике)
 * @param {Object} movement - Объект с информацией о перемещении
 * @param {Array} diceRolls - Массив бросков кубиков
 * @returns {Object} Объект с результатом валидации
 */
function validateWaitingZoneExit(movement, diceRolls) {
    const { player, piece, pieceId, from, to } = movement;

    // Проверяем, является ли это выходом из зоны ожидания
    if (!isWaitingZoneExit(from, to, player)) {
        return { isValid: true, errorMessage: null };
    }

    if (diceRolls.length === 0) {
        return {
            isValid: false,
            errorMessage: `Выход из зоны ожидания фишки ${pieceId || (piece + 1)} без информации о кубиках`
        };
    }

    const dice1 = diceRolls[0].dice1;
    const dice2 = diceRolls[0].dice2;
    const diceValues = `${dice1}+${dice2}`;

    // Для выхода из зоны ожидания требуется хотя бы одна единица
    const hasOne = dice1 === 1 || dice2 === 1;

    if (!hasOne) {
        return {
            isValid: false,
            errorMessage: `Выход из зоны ожидания фишки ${pieceId || (piece + 1)} без единицы на кубиках. Выпало: ${diceValues}`
        };
    }

    return {
        isValid: true,
        errorMessage: null
    };
}

/**
 * Валидирует выход из тюрьмы (требуется шестерка на кубике)
 * @param {Object} movement - Объект с информацией о перемещении
 * @param {Array} diceRolls - Массив бросков кубиков
 * @returns {Object} Объект с результатом валидации
 */
function validatePrisonExit(movement, diceRolls) {
    const { player, piece, pieceId, from, to } = movement;

    // Проверяем, является ли это выходом из тюрьмы
    if (!isPrisonExit(from, to, player)) {
        return { isValid: true, errorMessage: null };
    }

    if (diceRolls.length === 0) {
        return {
            isValid: false,
            errorMessage: `Выход из тюрьмы фишки ${pieceId || (piece + 1)} без информации о кубиках`
        };
    }

    const dice1 = diceRolls[0].dice1;
    const dice2 = diceRolls[0].dice2;
    const diceValues = `${dice1}+${dice2}`;

    // Для выхода из тюрьмы требуется хотя бы одна шестерка
    const hasSix = dice1 === 6 || dice2 === 6;

    if (!hasSix) {
        return {
            isValid: false,
            errorMessage: `Выход из тюрьмы фишки ${pieceId || (piece + 1)} без шестерки на кубиках. Выпало: ${diceValues}`
        };
    }

    return {
        isValid: true,
        errorMessage: null
    };
}

/**
 * Валидирует использование телепорта (телепорт должен принадлежать игроку)
 * @param {Object} movement - Объект с информацией о перемещении
 * @param {Array} diceRolls - Массив бросков кубиков
 * @returns {Object} Объект с результатом валидации
 */
function validateTeleportUsage(movement, diceRolls) {
    const { player, piece, pieceId, from, to } = movement;

    // Проверяем, является ли это использованием телепорта
    if (!isTeleportMove(from, to, player)) {
        return { isValid: true, errorMessage: null };
    }

    // Получаем телепорт игрока
    const playerTeleport = getPlayerTeleport(player);

    if (!playerTeleport || from !== playerTeleport) {
        return {
            isValid: false,
            errorMessage: `Фишка ${pieceId || (piece + 1)} игрока ${player} использует чужой телепорт. Позиция: ${from}, ожидается: ${playerTeleport}`
        };
    }

    return {
        isValid: true,
        errorMessage: null
    };
}

/**
 * Комплексная валидация хода
 * @param {Object} movement - Объект с информацией о перемещении
 * @param {Array} diceRolls - Массив бросков кубиков
 * @returns {Object} Объект с результатом валидации {isValid, errorMessages}
 */
function validateMove(movement, diceRolls) {
    // Пропускаем валидацию для съеденных фишек
    if (isPieceCaptured(movement)) {
        return {
            isValid: true,
            errorMessages: []
        };
    }

    const validations = [
        validateMoveDistance(movement, diceRolls),
        validateWaitingZoneExit(movement, diceRolls),
        validatePrisonExit(movement, diceRolls),
        validateTeleportUsage(movement, diceRolls)
    ];

    const errors = validations
        .filter(result => !result.isValid)
        .map(result => result.errorMessage);

    return {
        isValid: errors.length === 0,
        errorMessages: errors
    };
}

/**
 * Валидирует все ходы в списке перемещений
 * @param {Array} movements - Массив объектов с информацией о перемещениях
 * @param {Array} diceRolls - Массив бросков кубиков
 * @returns {Object} Объект с результатом валидации {isValid, errorMessages}
 */
function validateAllMoves(movements, diceRolls) {
    const allErrors = [];

    for (const movement of movements) {
        const result = validateMove(movement, diceRolls);
        if (!result.isValid) {
            allErrors.push(...result.errorMessages);
        }
    }

    return {
        isValid: allErrors.length === 0,
        errorMessages: allErrors
    };
}

module.exports = {
    validateMoveDistance,
    validateWaitingZoneExit,
    validatePrisonExit,
    validateTeleportUsage,
    validateMove,
    validateAllMoves
};
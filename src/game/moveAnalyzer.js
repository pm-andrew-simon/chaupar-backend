// moveAnalyzer.js
// Модуль для анализа и генерации отчетов о ходах

const { calculateGamePathDistance } = require('../validation/distanceCalculator');
const {
    getZoneType,
    getTriggerCell,
    getSourceTriggerCell,
    isPieceCaptured
} = require('../validation/zoneDetector');

const gameZones = require('../../gameZones.json');

/**
 * Проверяет занятость последующих клеток в доме
 * @param {Object} gameState - Текущее состояние игры
 * @param {number} player - Номер игрока
 * @param {string} currentPosition - Текущая позиция фишки в доме
 * @returns {boolean} true если все последующие клетки заняты
 */
function areSubsequentHomeCellsOccupied(gameState, player, currentPosition) {
    if (!gameState.piecesData) return false;

    const homeZone = gameZones.homeZones[`player${player}`];
    if (!homeZone || !homeZone.coordinates) return false;

    // Получаем все позиции всех игроков
    const allPositions = [];
    for (const pKey in gameState.piecesData) {
        if (gameState.piecesData[pKey] && Array.isArray(gameState.piecesData[pKey])) {
            gameState.piecesData[pKey].forEach(piece => {
                if (piece.position) {
                    allPositions.push(piece.position);
                }
            });
        }
    }

    // Находим индекс текущей позиции в домашней зоне
    const currentIndex = homeZone.coordinates.indexOf(currentPosition);
    if (currentIndex === -1) return false;

    // Получаем все последующие клетки от текущей позиции до конца домашней зоны
    const subsequentCells = homeZone.coordinates.slice(currentIndex + 1);

    // Проверяем, заняты ли все последующие клетки
    return subsequentCells.length > 0 && subsequentCells.every(cell => allPositions.includes(cell));
}

/**
 * Анализирует конкретное перемещение фишки и генерирует детальное сообщение
 * @param {Object} movement - Объект с информацией о перемещении
 * @param {Object} gameState - Текущее состояние игры
 * @param {Array} diceRolls - Массив бросков кубиков
 * @returns {string} Детальное сообщение о перемещении
 */
function analyzePieceMovement(movement, gameState, diceRolls) {
    const { player, piece, pieceId, from, to } = movement;
    const fromZone = getZoneType(from, player);
    const toZone = getZoneType(to, player);

    let message = `Фишка ${pieceId || (piece + 1)}`;

    // Анализируем различные типы перемещений
    if (fromZone.type === 'waiting' && toZone.type === 'starting') {
        return `${message} вышла из зоны ожидания`;
    }

    if (fromZone.type === 'starting' && toZone.type !== 'starting') {
        const distance = calculateGamePathDistance(from, to, player);
        return `${message} вышла со стартовой позиции на поле на ${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'}`;
    }

    // Обработка выхода из тюрьмы с особой механикой
    if (fromZone.type === 'prison') {
        const diceSum = diceRolls.length > 0 ? (diceRolls[0].dice1 + diceRolls[0].dice2) : 0;
        const sourceTrigger = getSourceTriggerCell(from);

        if (sourceTrigger && diceSum >= 6) {
            const remainingMoves = diceSum - 6;
            if (remainingMoves > 0) {
                // Вычисляем расстояние от триггерной клетки до конечной позиции
                const distance = calculateGamePathDistance(sourceTrigger.trigger, to, player);
                return `${message} вышла из тюрьмы на 6 и переместилась с ${sourceTrigger.trigger} на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
            } else {
                return `${message} вышла из тюрьмы на 6`;
            }
        } else {
            return `${message} вышла из тюрьмы`;
        }
    }

    // Обработка выхода из храма
    if (fromZone.type === 'temple') {
        const sourceTrigger = getSourceTriggerCell(from);
        if (sourceTrigger) {
            const distance = calculateGamePathDistance(sourceTrigger.trigger, to, player);
            return `${message} вышла из храма и переместилась с ${sourceTrigger.trigger} на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        } else {
            const distance = calculateGamePathDistance(from, to, player);
            return `${message} вышла из храма на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        }
    }

    // Обработка входа в тюрьму через триггерную клетку
    if (toZone.type === 'prison') {
        const triggerData = getTriggerCell(to);
        if (triggerData) {
            const distance = calculateGamePathDistance(from, triggerData.trigger, player);
            return `${message} переместилась с ${from} в тюрьму ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        } else {
            // Резервный вариант если триггер не найден
            const distance = calculateGamePathDistance(from, to, player);
            return `${message} попала в тюрьму на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        }
    }

    // Обработка входа в храм через триггерную клетку
    if (toZone.type === 'temple') {
        const triggerData = getTriggerCell(to);
        if (triggerData) {
            const distance = calculateGamePathDistance(from, triggerData.trigger, player);
            return `${message} переместилась с ${from} в храм ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        } else {
            // Резервный вариант если триггер не найден
            const distance = calculateGamePathDistance(from, to, player);
            return `${message} попала в храм на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        }
    }

    if (toZone.type === 'home') {
        const allSubsequentOccupied = areSubsequentHomeCellsOccupied(gameState, player, to);
        if (allSubsequentOccupied) {
            return `${message} зашла в дом`;
        } else {
            return `${message} спряталась в доме`;
        }
    }

    // Проверяем, является ли начальная позиция зоной ожидания
    if (fromZone.type === 'waiting') {
        const distance = calculateGamePathDistance(from, to, player);
        return `${message} переместилась из зоны ожидания с ${from} на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
    }

    // Проверяем, является ли начальная позиция стартовой позицией
    if (fromZone.type === 'starting') {
        const distance = calculateGamePathDistance(from, to, player);
        return `${message} переместилась со стартовой позиции с ${from} на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
    }

    // Обычное перемещение по полю
    const distance = calculateGamePathDistance(from, to, player);
    return `${message} переместилась с ${from} на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
}

/**
 * Генерирует детальный отчет о ходе игрока
 * @param {Object} differences - Объект с различиями между состояниями
 * @param {Object} gameState - Текущее состояние игры для получения информации об игроках
 * @param {Array} validationErrors - Массив ошибок валидации
 * @returns {string} Детальное сообщение о ходе
 */
function generateMoveReport(differences, gameState = null, validationErrors = []) {
    if (!differences.hasChanges) {
        return 'Изменений в игровом состоянии не обнаружено';
    }

    let report = '';
    let playerColor = '';

    // Определяем игрока, который сделал ход
    let activePlayer = differences.previousPlayer !== null ? differences.previousPlayer : differences.currentPlayer;

    // Если у нас есть информация о цвете из броска кубиков
    if (differences.diceRolls.length > 0 && differences.diceRolls[0].color) {
        playerColor = differences.diceRolls[0].color;
        activePlayer = differences.diceRolls[0].player;
    }
    // Иначе пытаемся получить цвет из playersOrder
    else if (gameState && gameState.playersOrder && Array.isArray(gameState.playersOrder)) {
        const playerInfo = gameState.playersOrder.find(p => p.player === activePlayer);
        playerColor = playerInfo ? playerInfo.color : `Игрок ${activePlayer}`;
    }
    // Резервный вариант со стандартными цветами
    else {
        const playerColors = ['', 'Красный', 'Желтый', 'Зеленый', 'Фиолетовый']; // Индексы 1-4
        playerColor = playerColors[activePlayer] || `Игрок ${activePlayer}`;
    }

    // Добавляем информацию о бросках кубиков
    if (differences.diceRolls.length > 0) {
        const diceDetails = differences.diceRolls.map(roll => {
            if (typeof roll === 'object' && roll.dice1 !== undefined && roll.dice2 !== undefined) {
                return `${roll.dice1}+${roll.dice2}=${roll.dice1 + roll.dice2}`;
            } else if (Array.isArray(roll) && roll.length === 2) {
                return `${roll[0]}+${roll[1]}=${roll[0] + roll[1]}`;
            } else {
                return roll.toString();
            }
        }).join(', ');

        report += `${playerColor} выбросил на кубиках значения: ${diceDetails}`;
    } else {
        report += `${playerColor} сделал ход`;
    }

    // Добавляем информацию о перемещениях фишек с детальным анализом
    if (differences.pieceMovements.length > 0) {
        const detailedMovements = [];

        differences.pieceMovements.forEach(movement => {
            // Проверяем, была ли фишка съедена
            if (isPieceCaptured(movement)) {
                // Для съеденных фишек только добавляем сообщение
                const { pieceId, piece } = movement;
                detailedMovements.push(`Фишка ${pieceId || (piece + 1)} была съедена`);
            } else {
                // Добавляем описание хода
                const movementDescription = analyzePieceMovement(movement, gameState, differences.diceRolls);
                detailedMovements.push(movementDescription);
            }
        });

        // Если есть ошибки валидации, показываем их
        if (validationErrors.length > 0) {
            report += `. ОШИБКА ВАЛИДАЦИИ: ${validationErrors.join('; ')}`;
        } else {
            // Если валидация прошла успешно, показываем детали ходов
            if (detailedMovements.length === 1) {
                report += `. ${detailedMovements[0]}`;
            } else {
                report += `. Выполнены следующие ходы: ${detailedMovements.join('; ')}`;
            }
        }
    }

    return report;
}

module.exports = {
    analyzePieceMovement,
    generateMoveReport,
    areSubsequentHomeCellsOccupied
};
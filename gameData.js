// gameData.js
// Модуль для работы с данными игр в Supabase

const { supabase } = require('./supabase');
const gameZones = require('./gameZones.json');

/**
 * Получает предыдущее игровое состояние из базы данных
 * @param {string} chprId - Уникальный идентификатор CHPR_id для поиска записи
 * @returns {Promise<Object|null>} Предыдущее состояние игры или null если не найдено
 */
async function getPreviousGameState(chprId) {
    try {
        if (!supabase) {
            throw new Error('Supabase не настроен');
        }

        const { data, error } = await supabase
            .from('saved_games')
            .select('new_game_state')
            .eq('CHPR_id', chprId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Запись не найдена
            }
            throw error;
        }

        return data ? data.new_game_state : null;
    } catch (error) {
        console.error('Ошибка при получении предыдущего состояния игры:', error);
        return null;
    }
}

/**
 * Сравнивает два игровых состояния и находит различия
 * @param {Object|null} previousState - Предыдущее состояние игры
 * @param {Object} newState - Новое состояние игры
 * @returns {Object} Объект с информацией о различиях
 */
function compareGameStates(previousState, newState) {
    const differences = {
        hasChanges: false,
        playerChanged: false,
        previousPlayer: null,
        currentPlayer: null,
        pieceMovements: [],
        diceRolls: [],
        statusChanged: false
    };

    // Если предыдущего состояния нет, это первый ход
    if (!previousState) {
        differences.hasChanges = true;
        differences.currentPlayer = newState.currentPlayer || 1;
        
        // Извлекаем последние броски кубиков
        if (newState.lastDiceRoll && Array.isArray(newState.lastDiceRoll)) {
            differences.diceRolls = [{
                dice1: newState.lastDiceRoll[0],
                dice2: newState.lastDiceRoll[1]
            }];
        }
        
        return differences;
    }

    // Проверяем смену игрока
    if (previousState.currentPlayer !== newState.currentPlayer) {
        differences.playerChanged = true;
        differences.previousPlayer = previousState.currentPlayer;
        differences.currentPlayer = newState.currentPlayer;
        differences.hasChanges = true;
    }

    // Проверяем изменения позиций фишек в piecesData
    if (previousState.piecesData && newState.piecesData) {
        for (const playerKey in newState.piecesData) {
            const prevPlayerPieces = previousState.piecesData[playerKey] || [];
            const newPlayerPieces = newState.piecesData[playerKey] || [];
            
            // Сравниваем каждую фишку игрока
            for (let pieceIndex = 0; pieceIndex < Math.max(prevPlayerPieces.length, newPlayerPieces.length); pieceIndex++) {
                const prevPiece = prevPlayerPieces[pieceIndex];
                const newPiece = newPlayerPieces[pieceIndex];
                
                if (prevPiece && newPiece && prevPiece.position !== newPiece.position) {
                    differences.pieceMovements.push({
                        player: parseInt(playerKey),
                        piece: pieceIndex,
                        pieceId: newPiece.id,
                        from: prevPiece.position,
                        to: newPiece.position
                    });
                    differences.hasChanges = true;
                }
            }
        }
    }

    // Извлекаем информацию о последних бросках кубиков
    if (newState.lastDiceRoll && Array.isArray(newState.lastDiceRoll)) {
        differences.diceRolls = [{
            dice1: newState.lastDiceRoll[0],
            dice2: newState.lastDiceRoll[1]
        }];
    }

    // Дополнительно проверяем изменения в diceLog для более точного определения хода
    if (newState.diceLog && newState.diceLog.length > 0) {
        // Берем первую запись из diceLog как актуальную (она содержит последний ход)
        const latestEntry = newState.diceLog[0];
        if (latestEntry) {
            differences.diceRolls = [{
                dice1: latestEntry.dice1,
                dice2: latestEntry.dice2,
                sum: latestEntry.sum,
                player: latestEntry.player,
                color: latestEntry.color
            }];
            differences.hasChanges = true;
        }
    }

    // Проверяем изменение фазы игры
    if (previousState.gamePhase !== newState.gamePhase) {
        differences.statusChanged = true;
        differences.hasChanges = true;
    }

    return differences;
}

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
    
    return { type: 'field', zone: 'gameField' };
}

/**
 * Проверяет, находится ли позиция в диапазоне
 * @param {string} position - Позиция для проверки
 * @param {string} from - Начальная позиция диапазона
 * @param {string} to - Конечная позиция диапазона
 * @returns {boolean} true если позиция в диапазоне
 */
function isPositionInRange(position, from, to) {
    const posCol = position.charAt(0);
    const posRow = parseInt(position.slice(1));
    const fromCol = from.charAt(0);
    const fromRow = parseInt(from.slice(1));
    const toCol = to.charAt(0);
    const toRow = parseInt(to.slice(1));
    
    return posCol >= fromCol && posCol <= toCol && posRow >= fromRow && posRow <= toRow;
}

/**
 * Проверяет занятость последующих клеток в доме
 * @param {Object} gameState - Текущее состояние игры
 * @param {number} player - Номер игрока
 * @param {string} currentPosition - Текущая позиция фишки в доме
 * @returns {boolean} true если все последующие клетки заняты
 */
function areSubsequentHomeCellsOccupied(gameState, player, currentPosition) {
    if (!gameState.piecesData) return false;
    
    const playerKey = player.toString();
    const homeZone = gameZones.homeZones[`player${player}`];
    if (!homeZone) return false;
    
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
    
    // Генерируем последовательность клеток дома от текущей позиции до конца
    const subsequentCells = getSubsequentHomeCells(currentPosition, homeZone);
    
    // Проверяем, заняты ли все последующие клетки
    return subsequentCells.every(cell => allPositions.includes(cell));
}

/**
 * Получает последующие клетки в доме от текущей позиции
 * @param {string} currentPosition - Текущая позиция
 * @param {Object} homeZone - Объект домашней зоны с from и to
 * @returns {Array} Массив последующих позиций
 */
function getSubsequentHomeCells(currentPosition, homeZone) {
    const cells = [];
    const currentCol = currentPosition.charAt(0);
    const currentRow = parseInt(currentPosition.slice(1));
    const fromCol = homeZone.from.charAt(0);
    const fromRow = parseInt(homeZone.from.slice(1));
    const toCol = homeZone.to.charAt(0);
    const toRow = parseInt(homeZone.to.slice(1));
    
    // Определяем направление движения в доме
    if (fromCol === toCol) {
        // Вертикальное движение
        const step = fromRow < toRow ? 1 : -1;
        const targetRow = fromRow < toRow ? toRow : fromRow;
        
        for (let row = currentRow + step; row !== targetRow + step; row += step) {
            if ((step > 0 && row <= toRow) || (step < 0 && row >= toRow)) {
                cells.push(`${currentCol}${row}`);
            }
        }
    } else if (fromRow === toRow) {
        // Горизонтальное движение
        const step = fromCol < toCol ? 1 : -1;
        const targetCol = fromCol < toCol ? toCol : fromCol;
        
        for (let colCode = currentCol.charCodeAt(0) + step; 
             (step > 0 && colCode <= targetCol.charCodeAt(0)) || 
             (step < 0 && colCode >= targetCol.charCodeAt(0)); 
             colCode += step) {
            cells.push(`${String.fromCharCode(colCode)}${currentRow}`);
        }
    }
    
    return cells;
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
        const diceSum = diceRolls.length > 0 ? (diceRolls[0].dice1 + diceRolls[0].dice2) : 0;
        return `${message} вышла со стартовой позиции на поле на ${diceSum} ходов`;
    }
    
    // Обработка выхода из тюрьмы с особой механикой
    if (fromZone.type === 'prison') {
        const diceSum = diceRolls.length > 0 ? (diceRolls[0].dice1 + diceRolls[0].dice2) : 0;
        const sourceTrigger = getSourceTriggerCell(from);
        
        if (sourceTrigger && diceSum >= 6) {
            const remainingMoves = diceSum - 6;
            if (remainingMoves > 0) {
                // Вычисляем расстояние от триггерной клетки до конечной позиции
                const distance = calculateDistance(sourceTrigger.trigger, to);
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
            const distance = calculateDistance(sourceTrigger.trigger, to);
            return `${message} вышла из храма и переместилась с ${sourceTrigger.trigger} на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        } else {
            const distance = calculateDistance(from, to);
            return `${message} вышла из храма на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        }
    }
    
    // Обработка входа в тюрьму через триггерную клетку
    if (toZone.type === 'prison') {
        const triggerData = getTriggerCell(to);
        if (triggerData) {
            const distance = calculateDistance(from, triggerData.trigger);
            return `${message} переместилась с ${from} в тюрьму ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        } else {
            // Резервный вариант если триггер не найден
            const distance = calculateDistance(from, to);
            return `${message} попала в тюрьму на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        }
    }
    
    // Обработка входа в храм через триггерную клетку
    if (toZone.type === 'temple') {
        const triggerData = getTriggerCell(to);
        if (triggerData) {
            const distance = calculateDistance(from, triggerData.trigger);
            return `${message} переместилась с ${from} в храм ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
        } else {
            // Резервный вариант если триггер не найден
            const distance = calculateDistance(from, to);
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
    
    // Обычное перемещение по полю
    const distance = calculateDistance(from, to);
    return `${message} переместилась с ${from} на ${to} (${distance} ${distance === 1 ? 'ход' : distance < 5 ? 'хода' : 'ходов'})`;
}

/**
 * Вычисляет расстояние между двумя позициями
 * @param {string} from - Начальная позиция
 * @param {string} to - Конечная позиция
 * @returns {number} Расстояние в ходах
 */
function calculateDistance(from, to) {
    const fromCol = from.charAt(0).charCodeAt(0);
    const fromRow = parseInt(from.slice(1));
    const toCol = to.charAt(0).charCodeAt(0);
    const toRow = parseInt(to.slice(1));
    
    return Math.abs(fromCol - toCol) + Math.abs(fromRow - toRow);
}

/**
 * Генерирует детальный отчет о ходе игрока
 * @param {Object} differences - Объект с различиями между состояниями
 * @param {Object} gameState - Текущее состояние игры для получения информации об игроках
 * @returns {string} Детальное сообщение о ходе
 */
function generateMoveReport(differences, gameState = null) {
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
        const detailedMovements = differences.pieceMovements.map(movement => {
            return analyzePieceMovement(movement, gameState, differences.diceRolls);
        });
        
        if (detailedMovements.length === 1) {
            report += `. ${detailedMovements[0]}`;
        } else {
            report += `. Выполнены следующие ходы: ${detailedMovements.join('; ')}`;
        }
    }

    return report;
}

/**
 * Обновляет игровое состояние в таблице saved_games
 * @param {string} chprId - Уникальный идентификатор CHPR_id для поиска записи
 * @param {Object} gameState - JSON объект с состоянием игры
 * @returns {Promise<Object>} Объект с результатом: {success, message, updatedId} где updatedId - это CHPR_id игры
 * @description Обновляет поля new_game_state и updated_at в таблице saved_games
 */
async function updateGameState(chprId, gameState) {
    try {
        // Проверяем, что Supabase настроен
        if (!supabase) {
            return {
                success: false,
                message: 'Supabase не настроен. Проверьте переменные окружения.',
                error: 'SUPABASE_NOT_CONFIGURED'
            };
        }

        // Валидация входных параметров
        if (!chprId || typeof chprId !== 'string') {
            return {
                success: false,
                message: 'Некорректный параметр chprId. Ожидается непустая строка.',
                error: 'INVALID_CHPR_ID'
            };
        }

        if (!gameState || typeof gameState !== 'object') {
            return {
                success: false,
                message: 'Некорректный параметр gameState. Ожидается объект JSON.',
                error: 'INVALID_GAME_STATE'
            };
        }

        // Проверяем, что gameState можно сериализовать в JSON
        try {
            JSON.stringify(gameState);
        } catch (jsonError) {
            return {
                success: false,
                message: 'Переданный gameState не может быть преобразован в JSON.',
                error: 'INVALID_JSON'
            };
        }

        // Получаем предыдущее состояние игры для сравнения
        const previousState = await getPreviousGameState(chprId);

        // Сначала проверяем, существует ли запись с таким CHPR_id
        const { data: existingData, error: findError } = await supabase
            .from('saved_games')
            .select('id')
            .eq('CHPR_id', chprId)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return {
                    success: false,
                    message: `Запись с CHPR_id "${chprId}" не найдена.`,
                    error: 'RECORD_NOT_FOUND'
                };
            } else {
                return {
                    success: false,
                    message: 'Ошибка при поиске записи в базе данных.',
                    error: findError.message
                };
            }
        }

        if (!existingData) {
            return {
                success: false,
                message: `Запись с CHPR_id "${chprId}" не найдена.`,
                error: 'RECORD_NOT_FOUND'
            };
        }

        // Сравниваем состояния и генерируем отчет о ходе
        const differences = compareGameStates(previousState, gameState);
        const moveReport = generateMoveReport(differences, gameState);

        // Обновляем поле new_game_state и updated_at
        const { data: updatedData, error: updateError } = await supabase
            .from('saved_games')
            .update({ 
                new_game_state: gameState,
                updated_at: new Date().toISOString()
            })
            .eq('CHPR_id', chprId)
            .select('CHPR_id')
            .single();

        if (updateError) {
            return {
                success: false,
                message: 'Ошибка при обновлении записи в базе данных.',
                error: updateError.message
            };
        }

        return {
            success: true,
            message: 'Игровое состояние успешно обновлено.',
            updatedId: updatedData.CHPR_id,
            moveReport: moveReport
        };

    } catch (error) {
        console.error('Неожиданная ошибка при обновлении игрового состояния:', error);
        return {
            success: false,
            message: 'Произошла неожиданная ошибка при обновлении игрового состояния.',
            error: error.message
        };
    }
}

// Экспорт функций
module.exports = {
    updateGameState,
    getPreviousGameState,
    compareGameStates,
    generateMoveReport,
    getZoneType,
    analyzePieceMovement,
    calculateDistance,
    getTriggerCell,
    getSourceTriggerCell
};
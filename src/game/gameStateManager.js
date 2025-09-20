// gameStateManager.js
// Модуль для управления состоянием игры и работы с базой данных

const { supabase } = require('../../supabase');
const { generateMoveReport } = require('./moveAnalyzer');
const { validateAllMoves } = require('../validation/moveValidator');

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

        // Выполняем валидацию ходов
        const validationResult = validateAllMoves(differences.pieceMovements, differences.diceRolls);

        // Генерируем отчет с учетом ошибок валидации
        const moveReport = generateMoveReport(differences, gameState, validationResult.errorMessages);

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
            message: 'Игра обновлена!',
            updatedId: updatedData.CHPR_id,
            moveReport: moveReport,
            validationResult: validationResult
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

module.exports = {
    updateGameState,
    getPreviousGameState,
    compareGameStates
};
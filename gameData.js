// gameData.js
// Модуль для работы с данными игр в Supabase

const { supabase } = require('./supabase');

/**
 * Обновляет игровое состояние в таблице saved_games
 * @param {string} chprId - Уникальный идентификатор CHPR_ID для поиска записи
 * @param {Object} gameState - JSON объект с состоянием игры
 * @returns {Promise<Object>} Объект с результатом выполнения операции
 */
async function updateGameState(chprId, gameState) {
    try {
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

        // Сначала проверяем, существует ли запись с таким chpr_id
        const { data: existingData, error: findError } = await supabase
            .from('saved_games')
            .select('id')
            .eq('chpr_id', chprId)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return {
                    success: false,
                    message: `Запись с chpr_id "${chprId}" не найдена.`,
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
                message: `Запись с chpr_id "${chprId}" не найдена.`,
                error: 'RECORD_NOT_FOUND'
            };
        }

        // Обновляем поле new_game_state
        const { data: updatedData, error: updateError } = await supabase
            .from('saved_games')
            .update({ new_game_state: gameState })
            .eq('chpr_id', chprId)
            .select('id')
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
            updatedId: updatedData.id
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
    updateGameState
};
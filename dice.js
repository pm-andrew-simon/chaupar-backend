// dice.js
// Серверная функция генерации значений кубиков для игры Чаупар

/**
 * Функция генерации случайных значений кубиков
 * Возвращает объект с двумя значениями от 1 до 6
 * @returns {Object} Объект с полями dice1, dice2, sum
 */
function generateDiceValues() {
    // Генерируем два случайных значения от 1 до 6
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const sum = dice1 + dice2;
    
    return {
        dice1: dice1,
        dice2: dice2,
        sum: sum
    };
}

// Экспорт функции для использования в других файлах
module.exports = {
    generateDiceValues
};
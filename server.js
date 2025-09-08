// server.js
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

/**
 * Проверка на специальные дубли (1-1 или 6-6)
 * @param {number} dice1 - Значение первого кубика
 * @param {number} dice2 - Значение второго кубика
 * @returns {boolean} true если выпал специальный дубль
 */
function isSpecialDouble(dice1, dice2) {
    return (dice1 === 1 && dice2 === 1) || (dice1 === 6 && dice2 === 6);
}

/**
 * Симуляция анимации броска с промежуточными значениями
 * @returns {Promise<Object>} Promise с финальными значениями кубиков
 */
function rollDiceWithAnimation() {
    return new Promise((resolve) => {
        // Симуляция анимации (1.5-2 секунды)
        const animationDuration = 1500 + Math.random() * 500;
        
        // Промежуточные случайные значения во время анимации
        const animationSteps = 10;
        const stepDuration = animationDuration / animationSteps;
        let currentStep = 0;
        
        const animationInterval = setInterval(() => {
            // Промежуточные значения (не используются в финальном результате)
            const tempValues = generateDiceValues();
            console.log(`Анимация шаг ${currentStep + 1}: ${tempValues.dice1}, ${tempValues.dice2}`);
            
            currentStep++;
            
            if (currentStep >= animationSteps) {
                clearInterval(animationInterval);
                // Финальные значения
                const finalValues = generateDiceValues();
                console.log(`Финальный результат: ${finalValues.dice1} + ${finalValues.dice2} = ${finalValues.sum}`);
                resolve(finalValues);
            }
        }, stepDuration);
    });
}

// Экспорт функций для использования в Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateDiceValues,
        isSpecialDouble,
        rollDiceWithAnimation
    };
}

// Пример использования:
if (require.main === module) {
    console.log('=== Тест генерации кубиков ===');
    
    // Простая генерация
    console.log('Простой бросок:', generateDiceValues());
    
    // Тест на специальные дубли
    console.log('1-1 специальный дубль:', isSpecialDouble(1, 1));
    console.log('6-6 специальный дубль:', isSpecialDouble(6, 6));
    console.log('3-4 обычный бросок:', isSpecialDouble(3, 4));
    
    // Тест анимированного броска
    console.log('\n=== Анимированный бросок ===');
    rollDiceWithAnimation().then(result => {
        console.log('Результат анимированного броска:', result);
        if (isSpecialDouble(result.dice1, result.dice2)) {
            console.log('🎉 Выпал специальный дубль!');
        }
    });
}
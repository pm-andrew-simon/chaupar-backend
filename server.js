// server.js
// Главный файл сервера для игры Чаупар

// 1. Подключаем библиотеку для создания сервера
const express = require('express');
// 2. Подключаем наши функции работы с кубиками
const { generateDiceValues, isSpecialDouble, rollDiceWithAnimation } = require('./dice');

// 3. Создаем Express-приложение (наш сервер)
const app = express();
// 4. Разрешаем обработку JSON данных в запросах
app.use(express.json());

// 5. Настраиваем CORS - разрешаем запросы с других доменов (с вашего фронтенда)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Разрешаем всем (*) или укажите конкретный URL фронтенда
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 6. Создаем маршруты (роуты) API

// Простой тестовый маршрут - проверка что сервер работает
app.get('/', (req, res) => {
    res.json({ 
        message: '🎯 Сервер игры Чаупар запущен и работает!',
        endpoints: {
            simpleRoll: '/api/roll/simple - Простой бросок кубиков',
            animatedRoll: '/api/roll/animated - Бросок с анимацией',
            checkDouble: '/api/check-double?dice1=X&dice2=Y - Проверка специального дубля'
        }
    });
});

// Маршрут для простого броска кубиков
app.get('/api/roll/simple', (req, res) => {
    try {
        const result = generateDiceValues();
        res.json({
            success: true,
            ...result,
            isSpecialDouble: isSpecialDouble(result.dice1, result.dice2)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Маршрут для анимированного броска
app.get('/api/roll/animated', async (req, res) => {
    try {
        const result = await rollDiceWithAnimation();
        res.json({
            success: true,
            ...result,
            isSpecialDouble: isSpecialDouble(result.dice1, result.dice2)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Маршрут для проверки специального дубля
app.get('/api/check-double', (req, res) => {
    try {
        const dice1 = parseInt(req.query.dice1);
        const dice2 = parseInt(req.query.dice2);
        
        if (isNaN(dice1) || isNaN(dice2) || dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6) {
            return res.status(400).json({ 
                success: false, 
                error: 'Некорректные значения кубиков. Используйте числа от 1 до 6.' 
            });
        }
        
        res.json({
            success: true,
            dice1,
            dice2,
            isSpecialDouble: isSpecialDouble(dice1, dice2)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 7. Настраиваем порт (Render сам дает порт через переменную окружения)
const PORT = process.env.PORT || 3000;

// 8. Запускаем сервер
app.listen(PORT, () => {
    console.log(`✅ Сервер Чаупар запущен на порту ${PORT}`);
    console.log(`📡 Доступно по адресу: http://localhost:${PORT}`);
    console.log('🎲 Готов принимать запросы на броски кубиков!');
});
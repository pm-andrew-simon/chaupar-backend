// server.js
// Главный файл сервера для игры Чаупар

// 1. Подключаем библиотеку для создания сервера
const express = require('express');
// 2. Подключаем наши функции работы с кубиками
const { generateDiceValues } = require('./dice');
// 3. Подключаем Supabase
const { supabase, testConnection } = require('./supabase');
// 4. Подключаем функции работы с данными игр
const { updateGameState } = require('./gameData');

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
            updateGameState: 'PUT /api/game/state - Обновление состояния игры'
        }
    });
});

// Маршрут для простого броска кубиков
app.get('/api/roll/simple', (req, res) => {
    try {
        const result = generateDiceValues();
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Маршрут для обновления состояния игры
app.put('/api/game/state', async (req, res) => {
    try {
        const { chprId, gameState } = req.body;
        
        // Валидация наличия обязательных параметров
        if (!chprId) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствует обязательный параметр chprId'
            });
        }
        
        if (!gameState) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствует обязательный параметр gameState'
            });
        }
        
        // Вызываем функцию обновления игрового состояния
        const result = await updateGameState(chprId, gameState);
        
        // Определяем HTTP статус на основе результата
        const statusCode = result.success ? 200 : 400;
        
        res.status(statusCode).json(result);
        
    } catch (error) {
        console.error('Ошибка в обработчике PUT /api/game/state:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера при обновлении игрового состояния',
            error: error.message
        });
    }
});

// 7. Настраиваем порт (Render сам дает порт через переменную окружения)
const PORT = process.env.PORT || 3000;

// 8. Запускаем сервер
app.listen(PORT, async () => {
    console.log(`✅ Сервер Чаупар запущен на порту ${PORT}`);
    console.log(`📡 Доступно по адресу: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
    console.log('🎲 Готов принимать запросы на броски кубиков!');
    
    // Проверяем подключение к Supabase
    await testConnection();
});
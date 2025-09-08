// server.js
// Главный файл сервера для игры Чаупар

// 1. Подключаем библиотеку для создания сервера
const express = require('express');
// 2. Подключаем наши функции работы с кубиками
const { generateDiceValues } = require('./dice');

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
            simpleRoll: '/api/roll/simple - Простой бросок кубиков'
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


// 7. Настраиваем порт (Render сам дает порт через переменную окружения)
const PORT = process.env.PORT || 3000;

// 8. Запускаем сервер
app.listen(PORT, () => {
    console.log(`✅ Сервер Чаупар запущен на порту ${PORT}`);
    console.log(`📡 Доступно по адресу: http://localhost:${PORT}`);
    console.log('🎲 Готов принимать запросы на броски кубиков!');
});
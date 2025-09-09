// supabase.js
// Подключение к базе данных Supabase для игры Чаупар

// Подключаем dotenv для работы с переменными окружения
require('dotenv').config();

// Подключаем клиент Supabase
const { createClient } = require('@supabase/supabase-js');

// Получаем данные подключения из переменных окружения
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Проверяем, что все необходимые переменные окружения заданы
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Ошибка: Не заданы переменные окружения VITE_SUPABASE_URL или VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

// Создаем клиента Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Функция для проверки подключения к базе данных
async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('test')
            .select('*')
            .limit(1);
        
        if (error && error.code !== 'PGRST116') { // PGRST116 - таблица не найдена, это нормально
            throw error;
        }
        
        console.log('✅ Подключение к Supabase успешно установлено');
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к Supabase:', error.message);
        return false;
    }
}

// Экспорт клиента Supabase и функций
module.exports = {
    supabase,
    testConnection
};
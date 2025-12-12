// js/config.js
// === SUPABASE CONFIG ===
const SUPABASE_URL = 'https://lonhhlcqjlcxnvyhkxgp.supabase.co';
// В реальном проекте ключ лучше не хранить в коде, но для текущей задачи оставляем как есть
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbmhobGNxamxjeG52eWhreGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjEwNTMsImV4cCI6MjA4MDgzNzA1M30.0mrmsU4V3gvtTRCjjlwiwlwyrbxCuiskKkdzzC3ijcI';

// Инициализация Supabase глобально через window
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальная переменная для хранения ID компании текущего пользователя
window.CURRENT_COMPANY_ID = null;

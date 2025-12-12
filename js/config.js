// js/config.js
// === SUPABASE CONFIG ===
const SUPABASE_URL = 'https://lonhhlcqjlcxnvyhkxgp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbmhobGNxamxjeG52eWhreGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjEwNTMsImV4cCI6MjA4MDgzNzA1M30.0mrmsU4V3gvtTRCjjlwiwlwyrbxCuiskKkdzzC3ijcI'; // (Оставьте свой текущий)

// Инициализация Supabase глобально через window
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальные переменные сессии
window.CURRENT_COMPANY_ID = null;
window.CURRENT_COMPANY_NAME = null;
window.CURRENT_USER_ROLE = null; // 'owner', 'admin', 'employee'

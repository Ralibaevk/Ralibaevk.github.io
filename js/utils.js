// js/utils.js
const utils = {
  // Формат денег (10 000 ₸)
  formatCurrency(value) {
    return (parseFloat(value) || 0).toLocaleString('ru-RU') + ' ₸';
  },

  // Формат даты (12.12.2025)
  formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  },

  // Генерация UUID (для временных ID на клиенте)
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// === СЛОВАРЬ РОЛЕЙ ===
window.ROLE_NAMES = {
  'owner': 'Руководитель',
  'manager': 'Менеджер',
  'technologist': 'Технолог',
  'designer': 'Дизайнер',
  'measurer': 'Замерщик',
  'assembler': 'Сборщик',
  'installer': 'Монтажник',
  'buyer': 'Снабженец',
  'operator': 'Оператор станка',
  'customer': 'Заказчик',
  'employee': 'Сотрудник' // (резерв)
};

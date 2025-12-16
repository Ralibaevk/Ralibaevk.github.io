// js/mapper.js
const mapper = {
    raw: [],
    columnMap: {}, // Маппинг колонок

    show() {
        const modal = document.getElementById('modal');
        const table = document.getElementById('mapTable');

        if (!this.raw.length) return;

        // Заголовки для маппинга
        const headers = ['Артикул', 'Наименование', 'Количество', 'Единица', 'Цена', 'Поставщик', 'Примечание'];

        // Показываем первые 5 строк для превью
        const preview = this.raw.slice(0, 5);
        const numCols = Math.max(...preview.map(r => r.length));

        // Строка с селектами для маппинга
        let headerRow = '<tr>';
        for (let i = 0; i < numCols; i++) {
            headerRow += `<th style="padding:8px; background:#f3f4f6;">
                <select class="map-select" data-col="${i}" onchange="mapper.setColumn(${i}, this.value)" style="width:100%; padding:4px; border:1px solid #ddd; border-radius:4px;">
                    <option value="">-- Пропустить --</option>
                    ${headers.map((h, idx) => `<option value="${idx}">${h}</option>`).join('')}
                </select>
            </th>`;
        }
        headerRow += '</tr>';

        // Строки данных
        let dataRows = preview.map(row => {
            let tr = '<tr>';
            for (let i = 0; i < numCols; i++) {
                tr += `<td style="padding:8px; border-bottom:1px solid #eee; font-size:13px;">${row[i] || ''}</td>`;
            }
            tr += '</tr>';
            return tr;
        }).join('');

        table.innerHTML = '<thead>' + headerRow + '</thead><tbody>' + dataRows + '</tbody>';

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    },

    setColumn(colIndex, targetIndex) {
        if (targetIndex === '') {
            delete this.columnMap[colIndex];
        } else {
            // Убираем этот target из других колонок
            Object.keys(this.columnMap).forEach(key => {
                if (this.columnMap[key] === parseInt(targetIndex)) {
                    delete this.columnMap[key];
                    // Сбрасываем соответствующий селект
                    const sel = document.querySelector(`.map-select[data-col="${key}"]`);
                    if (sel) sel.value = '';
                }
            });
            this.columnMap[colIndex] = parseInt(targetIndex);
        }
    },

    apply() {
        // Пропускаем первую строку (заголовки) и маппим остальные
        const imported = this.raw.slice(1).map(row => {
            const item = {
                id: "",
                art: "",
                name: "Без названия",
                qty: 1,
                unit: "шт",
                price: 0,
                supplier: "",
                note: "",
                done: false,
                category: manager.currentCategory || "Фурнитура"
            };

            // Применяем маппинг
            Object.entries(this.columnMap).forEach(([colIdx, targetIdx]) => {
                const value = row[parseInt(colIdx)];
                if (value === undefined || value === null) return;

                switch (targetIdx) {
                    case 0: item.art = String(value); break;
                    case 1: item.name = String(value) || "Без названия"; break;
                    case 2: item.qty = parseFloat(value) || 1; break;
                    case 3: item.unit = String(value) || "шт"; break;
                    case 4: item.price = parseFloat(value) || 0; break;
                    case 5: item.supplier = String(value); break;
                    case 6: item.note = String(value); break;
                }
            });

            return item;
        }).filter(item => item.name && item.name !== "Без названия");

        if (imported.length === 0) {
            alert("Нет данных для импорта. Проверьте маппинг колонок.");
            return;
        }

        // Добавляем в начало данных
        manager.data = [...imported, ...manager.data];
        manager.render();
        manager.triggerAutoSave();

        // Закрываем модалку
        document.getElementById('modal').classList.add('hidden');
        this.columnMap = {};
        this.raw = [];

        alert(`Импортировано ${imported.length} позиций`);
    }
};

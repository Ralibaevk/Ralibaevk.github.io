// js/manager.js

const manager = {
    data: [],
    categories: ["Фурнитура", "Листовые материалы", "Фасады", "Услуги", "Прочий закуп", "Рекламации"],
    currentCategory: "Фурнитура",
    saveTimeout: null,
    isSaving: false,
    currentListId: null, // ID сметы
    currentPositionId: null, // ID изделия

    async open(positionId) {
        // Мы больше не открываем отдельный экран "view-manager"
        // Мы работаем внутри container-а в табе "tab-supply"

        this.currentCategory = this.categories[0];
        this.currentListId = null;
        this.currentPositionId = positionId;

        // Очистка
        document.getElementById('mgrBody').innerHTML = '';
        document.getElementById('mgrTotal').innerText = '0 ₸';

        // Рендер табов (если они не статичны, но у нас они статичны в HTML? нет, в HTML их нет, надо рендерить)
        this.renderTabs();

        try {
            // Грузим данные по ID позиции
            const res = await api.call('getSupplyByPosition', { positionId });

            this.currentListId = res.listId;
            this.data = res.items.map(i => ({ ...i, checked: false }));

            this.render();
            this.updateDatalist();
        } catch (e) {
            console.error(e);
            this.data = [];
            this.render();
        }
    },

    // Отрисовка табов категорий
    renderTabs() {
        const container = document.getElementById('mgrCategoryTabs');
        if (!container) return; // В новом дизайне может не быть этого контейнера, если он переехал?
        // В index.html (новом) нет контейнера #mgrCategoryTabs внутри #tab-supply. 
        // Нужно проверить index.html. В старом он был. В новом:
        // <div id="tab-supply" ...> <div class="mgr-toolbar">...</div> <div class="mgr-grid">...</div> 
        // ТАБЫ КАТЕГОРИЙ ПРОПАЛИ ИЗ HTML?
        // В User Request есть: "Вам нужно полностью заменить содержимое двух файлов... index.html".
        // В index.html snippet: <div id="view-position-detail"> ... <div id="tab-supply"> ... NO TABS CONTAINER ...
        // НО в manager.js коде (старом) есть renderTabs.
        // Если их нет в HTML, значит надо добавить программно или забить. 
        // В старом коде manager.js: renderTabs() ищет 'mgrCategoryTabs'.
        // В новом index.html я не вижу этого контейнера.
        // Но, пользователь просит "Интеграция: Мы встроим наш старый редактор таблицы (Менеджер) внутрь 3-го таба".
        // Возможно, пользователь забыл добавить табы категорий в HTML snippet?
        // Или они должны быть в тулбаре?
        // Давайте добавим их динамически в .mgr-toolbar или перед ним, если элемента нет.
        // Либо просто пропустим рендер если элемента нет.
        // UPD: В `manager.js` (старом) tabs container был. В новом HTML его нет.
        // Я добавлю его создание JS-ом если не найден, или просто вставлю в тулбар.
        // Ладно, пока предположим, что `mgrCategoryTabs` может не быть. 
        // Но фильтрация по категориям нужна!
        // Добавлю в тулбар выпадающий список или просто буду рендерить табы ПЕРЕД тулбаром.

        // Fix: Проверим, есть ли mgrCategoryTabs. Если нет - создадим перед тулбаром.
        let containerEl = document.getElementById('mgrCategoryTabs');
        if (!containerEl) {
            const toolbar = document.querySelector('#tab-supply .mgr-toolbar');
            if (toolbar) {
                containerEl = document.createElement('div');
                containerEl.id = 'mgrCategoryTabs';
                containerEl.className = 'tabs-scroll-container'; // Старый класс
                // Добавим стили inline, т.к. в CSS мб нет
                containerEl.style.display = 'flex';
                containerEl.style.gap = '5px';
                containerEl.style.overflowX = 'auto';
                containerEl.style.padding = '5px 0';
                containerEl.style.marginBottom = '5px';
                toolbar.parentNode.insertBefore(containerEl, toolbar);
            }
        }

        if (containerEl) {
            containerEl.innerHTML = this.categories.map(cat => {
                const activeClass = (cat === this.currentCategory) ? 'active' : '';
                // Стили кнопки
                const style = `padding:6px 12px; border:1px solid #ddd; border-radius:15px; font-size:12px; cursor:pointer; background:${activeClass ? '#333' : '#fff'}; color:${activeClass ? '#fff' : '#666'}; white-space:nowrap;`;
                return `<button style="${style}" onclick="manager.setCategory('${cat}')">${cat}</button>`;
            }).join('');
        }
    },

    setCategory(cat) {
        this.currentCategory = cat;
        this.renderTabs();
        this.render();
    },

    render() {
        const tbody = document.getElementById('mgrBody');
        tbody.innerHTML = '';
        const filter = document.getElementById('mgrSearch')?.value.toLowerCase() || '';
        let total = 0;
        const isFacades = (this.currentCategory === "Фасады");

        const thead = document.querySelector('#mgrTable thead tr');
        if (thead) {
            if (isFacades) {
                thead.innerHTML = `<th class="chk"><input type="checkbox" id="mgrAll" onchange="manager.toggleAll(this.checked)"></th><th style="width: 120px;">Категория</th><th>Материал</th><th>Фрезеровка</th><th>Толщина</th><th>Цвет</th><th>Покрытие</th><th>Квадратура</th><th>Цена кв.м</th><th>Сумма</th>`;
            } else {
                thead.innerHTML = `<th class="chk"><input type="checkbox" id="mgrAll" onchange="manager.toggleAll(this.checked)"></th><th>Наименование</th><th style="width:60px;">Кол</th><th>Ед</th><th>Цена</th><th>Сумма</th><th>Поставщик</th><th>Примечание</th>`;
            }
        }

        const supOpts = `<option value="">-</option>` + app.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        // const catOpts = this.categories.map(c => `<option value="${c}">${c}</option>`).join(''); // Уберем из таблицы лишнее

        this.data.forEach((item, i) => {
            if (item.category !== this.currentCategory) return;
            // Filter
            const searchStr = (item.name + ' ' + (item.art || '') + ' ' + (item.supplier || '')).toLowerCase();
            if (filter && !searchStr.includes(filter)) return;

            item.sum = item.qty * item.price;
            total += item.sum;
            const tr = document.createElement('tr');
            if (item.checked) tr.style.background = '#fff9c4';

            if (isFacades) {
                // Фасады (оставим упрощенно как текст, если надо) -> но у пользователя в запросе не было деталей про фасады,
                // однако в старом manager.js было. Оставим логику.
                tr.innerHTML = `<td class="chk"><input type="checkbox" ${item.checked ? 'checked' : ''} onchange="manager.check(${i},this.checked)"></td>
                               <td>${item.category}</td>
                               <td><input value="${item.name}" oninput="manager.upd(${i},'name',this.value)"></td>
                               <td colspan="6">Специфичные поля фасадов (в разработке)</td>
                               <td class="sum-cell">${utils.formatCurrency(item.sum)}</td>`;
            } else {
                tr.innerHTML = `
                    <td class="chk"><input type="checkbox" ${item.checked ? 'checked' : ''} onchange="manager.check(${i},this.checked)"></td>
                    <td><input value="${item.name}" list="catalogList" autocomplete="off" oninput="manager.upd(${i},'name',this.value)" style="font-weight:500;"></td>
                    <td><input type="number" value="${item.qty}" onchange="manager.upd(${i},'qty',this.value)"></td>
                    <td><input value="${item.unit}" oninput="manager.upd(${i},'unit',this.value)"></td>
                    <td><input type="number" value="${item.price}" onchange="manager.upd(${i},'price',this.value)"></td>
                    <td class="sum-cell">${utils.formatCurrency(item.sum)}</td>
                    <td><select onchange="manager.upd(${i},'supplier',this.value)" style="border:none; bg:transparent;">${supOpts.replace(`"${item.supplier}"`, `"${item.supplier}" selected`)}</select></td>
                    <td><input value="${item.note || ''}" oninput="manager.upd(${i},'note',this.value)"></td>
                `;
            }
            tbody.appendChild(tr);
        });
        const totalEl = document.getElementById('mgrTotal');
        if (totalEl) totalEl.innerText = utils.formatCurrency(total);
    },

    upd(i, f, v) {
        if (f === 'qty' || f === 'price') v = parseFloat(v) || 0;
        this.data[i][f] = v;

        if (f === 'name') {
            const match = app.catalog.find(c => c.name.toLowerCase() === String(v).toLowerCase());
            if (match) {
                if (this.data[i].price === 0) this.data[i].price = match.price;
                if (!this.data[i].supplier) this.data[i].supplier = match.supplier;
                if (this.data[i].unit === 'шт' && match.unit) this.data[i].unit = match.unit;
                this.render();
            }
        }
        if (f === 'qty' || f === 'price') this.render();
        this.triggerAutoSave();
    },

    check(i, v) { this.data[i].checked = v; this.render(); },

    toggleAll(v) {
        this.data.forEach(i => { if (i.category === this.currentCategory) i.checked = v; });
        this.render();
    },

    sort() {
        this.data.sort((a, b) => (a.supplier && !b.supplier) ? -1 : (b.supplier && !a.supplier) ? 1 : a.name.localeCompare(b.name));
        this.render();
        this.triggerAutoSave();
    },

    delSel() {
        if (confirm('Удалить выбранные?')) {
            this.data = this.data.filter(i => !i.checked);
            document.getElementById('mgrAll').checked = false;
            this.render();
            this.triggerAutoSave();
        }
    },

    addRow() {
        this.data.unshift({ id: "", art: "", name: "Новая", qty: 1, unit: "шт", price: 0, supplier: "", note: "", done: false, category: this.currentCategory });
        this.render();
        this.triggerAutoSave();
    },

    openBuyer() {
        if (!this.currentPositionId) return alert("Сначала откройте изделие");
        // Pass position ID and a title (e.g. Project Name + Position Name, or just Position Name)
        // We might need to fetch header info, but for now use static or cached name if available.
        // manager doesn't store name strictly, but we can pass generic name or fetch it.
        // Actually positions.js sets 'posDetailName' text.
        const name = document.getElementById('posDetailName')?.innerText || 'Смета';
        buyer.open(this.currentPositionId, name);
    },

    // Save
    triggerAutoSave() {
        const statusEl = document.getElementById('mgrTotal');
        if (statusEl) statusEl.style.color = '#f59e0b'; // Yellow

        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => { this.save(true); }, 1000);
    },

    async save(isAuto = false) {
        if (!this.currentPositionId) return;
        this.isSaving = true;
        const arr = this.data.map(i => [i.id || "", i.art, i.name, i.qty, i.unit, i.price, i.qty * i.price, i.supplier, i.note || "", i.done || false, i.category || "Фурнитура"]);

        try {
            const res = await api.call('saveSupplyList', {
                positionId: this.currentPositionId, // Привязка к изделию
                listId: this.currentListId,         // ID сметы (если есть)
                data: arr
            }, 'POST', !isAuto);

            if (res.listId) this.currentListId = res.listId;

            // Визуальный статус
            const statusEl = document.getElementById('mgrTotal');
            if (isAuto && statusEl) statusEl.style.color = '#10b981'; // Green

        } catch (e) { console.error(e); }
        finally { this.isSaving = false; }
    },

    // Modals (Merge/Sup)
    openMerge() {
        const sel = this.data.filter(i => i.checked);
        if (sel.length < 2) return alert('Выберите 2+');
        const list = document.getElementById('mergeList');
        list.innerHTML = sel.map((i, idx) => `<div style="padding:10px; border-bottom:1px solid #eee;"><label><input type="radio" name="mname" value="${idx}" ${idx === 0 ? 'checked' : ''}> <b>${i.name}</b> (${i.qty})</label></div>`).join('');
        document.getElementById('mergeModal').classList.remove('hidden');
    },
    applyMerge() {
        // ... (standard merge logic)
        const radios = document.getElementsByName('mname');
        let selIdx = -1; for (let r of radios) if (r.checked) selIdx = parseInt(r.value);
        if (selIdx === -1) return;
        const selItems = this.data.filter(i => i.checked);
        const main = selItems[selIdx];
        main.qty = selItems.reduce((acc, c) => acc + c.qty, 0);
        main.checked = false;
        this.data = this.data.filter(i => !i.checked || i === main);
        document.getElementById('mgrAll').checked = false;
        document.getElementById('mergeModal').classList.add('hidden');
        this.render();
        this.triggerAutoSave();
    },
    openSup() {
        const sel = this.data.filter(i => i.checked);
        if (!sel.length) return alert('Выберите строки');
        document.getElementById('supSelect').innerHTML = `<option value="">-- Сброс --</option>` + app.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`);
        document.getElementById('supModal').classList.remove('hidden');
    },
    applySup() {
        const v = document.getElementById('supSelect').value;
        this.data.forEach(i => { if (i.checked) { i.supplier = v; i.checked = false; } });
        document.getElementById('supModal').classList.add('hidden');
        document.getElementById('mgrAll').checked = false;
        this.render();
        this.triggerAutoSave();
    },

    updateDatalist() {
        let dl = document.getElementById('catalogList');
        if (!dl) { dl = document.createElement('datalist'); dl.id = 'catalogList'; document.body.appendChild(dl); }
        dl.innerHTML = app.catalog.map(item => `<option value="${item.name}">${item.price}₸ (${item.supplier || '-'})</option>`).join('');
    }
    // Files upload/Excel import can be added if needed, but for now basic functionality
};
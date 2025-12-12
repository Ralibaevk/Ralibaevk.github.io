// js/manager.js

const manager = {
    data: [],
    categories: ["Фурнитура", "Листовые материалы", "Фасады", "Услуги", "Прочий закуп", "Рекламации"],
    currentCategory: "Фурнитура",
    saveTimeout: null,
    isSaving: false,

    async open(name) {
        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-manager').classList.remove('hidden');
        document.getElementById('mgrName').value = '';
        this.currentCategory = this.categories[0];
        this.renderTabs();

        if (name) {
            document.getElementById('mgrName').value = name;
            try {
                const sData = await api.call('getProjectData', { sheetName: name });
                this.data = sData.map(i => ({ ...i, checked: false, note: i.note || "", category: i.category || this.categories[0] }));
            } catch (e) { this.data = []; }
        } else {
            document.getElementById('mgrName').value = `Заказ ${new Date().toLocaleDateString()}`;
            this.data = [];
        }
        this.render();
        this.updateDatalist();
    },

    renderTabs() {
        const container = document.getElementById('mgrCategoryTabs');
        container.innerHTML = this.categories.map(cat => {
            const activeClass = (cat === this.currentCategory) ? 'active' : '';
            return `<button class="cat-tab-btn ${activeClass}" onclick="manager.setCategory('${cat}')">${cat}</button>`;
        }).join('');
    },

    setCategory(cat) {
        this.currentCategory = cat;
        this.renderTabs();
        this.render();
    },

    render() {
        const tbody = document.getElementById('mgrBody');
        tbody.innerHTML = '';
        const filter = document.getElementById('mgrSearch').value.toLowerCase();
        let total = 0;
        const isFacades = (this.currentCategory === "Фасады");

        const thead = document.querySelector('#mgrTable thead tr');
        if (isFacades) {
            thead.innerHTML = `<th class="chk"><input type="checkbox" id="mgrAll" onchange="manager.toggleAll(this.checked)"></th><th style="width: 120px;">Категория</th><th>Материал</th><th>Фрезеровка</th><th>Толщина</th><th>Цвет</th><th>Покрытие</th><th>Квадратура</th><th>Цена кв.м</th><th>Сумма</th>`;
        } else {
            thead.innerHTML = `<th class="chk"><input type="checkbox" id="mgrAll" onchange="manager.toggleAll(this.checked)"></th><th style="width: 120px;">Категория</th><th>Артикул</th><th>Наименование</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th><th>Поставщик</th><th>Примечание</th>`;
        }

        const supOpts = `<option value="">-</option>` + app.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        const catOpts = this.categories.map(c => `<option value="${c}">${c}</option>`).join('');

        this.data.forEach((item, i) => {
            if (item.category !== this.currentCategory) return;
            const searchStr = (item.name + ' ' + item.art + ' ' + item.supplier).toLowerCase();
            if (filter && !searchStr.includes(filter)) return;

            item.sum = item.qty * item.price;
            total += item.sum;
            const tr = document.createElement('tr');
            if (item.supplier && !isFacades) tr.classList.add('has-supplier');
            if (item.checked) tr.style.background = '#fff9c4';

            if (isFacades) {
                tr.innerHTML = `<td class="chk"><input type="checkbox" ${item.checked ? 'checked' : ''} onchange="manager.check(${i},this.checked)"></td><td><select class="cat-select-table" onchange="manager.changeCategory(${i}, this.value)">${catOpts.replace(`"${item.category}"`, `"${item.category}" selected`)}</select></td><td><input value="${item.name}" list="catalogList" autocomplete="off" oninput="manager.upd(${i},'name',this.value)"></td><td><input value="${item.art || ''}" oninput="manager.upd(${i},'art',this.value)"></td><td><input value="${item.unit}" oninput="manager.upd(${i},'unit',this.value)"></td><td><input value="${item.supplier || ''}" oninput="manager.upd(${i},'supplier',this.value)"></td><td><input value="${item.note || ''}" oninput="manager.upd(${i},'note',this.value)"></td><td><input type="number" value="${item.qty}" onchange="manager.upd(${i},'qty',this.value)"></td><td><input type="number" value="${item.price}" onchange="manager.upd(${i},'price',this.value)"></td><td class="sum-cell">${utils.formatCurrency(item.sum)}</td>`;
            } else {
                tr.innerHTML = `<td class="chk"><input type="checkbox" ${item.checked ? 'checked' : ''} onchange="manager.check(${i},this.checked)"></td><td><select class="cat-select-table" onchange="manager.changeCategory(${i}, this.value)">${catOpts.replace(`"${item.category}"`, `"${item.category}" selected`)}</select></td><td><input value="${item.art || ''}" oninput="manager.upd(${i},'art',this.value)"></td><td><input value="${item.name}" list="catalogList" autocomplete="off" oninput="manager.upd(${i},'name',this.value)"></td><td><input type="number" value="${item.qty}" onchange="manager.upd(${i},'qty',this.value)"></td><td><input value="${item.unit}" oninput="manager.upd(${i},'unit',this.value)"></td><td><input type="number" value="${item.price}" onchange="manager.upd(${i},'price',this.value)"></td><td class="sum-cell">${utils.formatCurrency(item.sum)}</td><td><select onchange="manager.upd(${i},'supplier',this.value)">${supOpts.replace(`"${item.supplier}"`, `"${item.supplier}" selected`)}</select></td><td><input value="${item.note || ''}" oninput="manager.upd(${i},'note',this.value)"></td>`;
            }
            tbody.appendChild(tr);
        });
        document.getElementById('mgrTotal').innerText = utils.formatCurrency(total);
    },

    changeCategory(index, newCat) {
        this.data[index].category = newCat;
        this.render();
        this.triggerAutoSave();
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
        const f = document.getElementById('mgrSearch').value.toLowerCase();
        this.data.forEach(i => {
            if (i.category === this.currentCategory && (!f || i.name.toLowerCase().includes(f))) i.checked = v;
        });
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

    // Modals logic (Merge, Sup)
    openMerge() {
        const sel = this.data.filter(i => i.checked);
        if (sel.length < 2) return alert('Выберите 2+');
        const list = document.getElementById('mergeList');
        list.innerHTML = sel.map((i, idx) => `<div style="padding:10px; border-bottom:1px solid #eee;"><label><input type="radio" name="mname" value="${idx}" ${idx === 0 ? 'checked' : ''}> <b>${i.name}</b> (${i.qty})</label></div>`).join('');
        document.getElementById('mergeModal').classList.remove('hidden'); document.getElementById('mergeModal').style.display = 'flex';
    },
    applyMerge() {
        const radios = document.getElementsByName('mname');
        let selIdx = -1; for (let r of radios) if (r.checked) selIdx = parseInt(r.value);
        if (selIdx === -1) return;
        const selItems = this.data.filter(i => i.checked);
        const main = selItems[selIdx];
        main.qty = selItems.reduce((acc, c) => acc + c.qty, 0);
        main.checked = false;
        this.data = this.data.filter(i => !i.checked || i === main);
        document.getElementById('mgrAll').checked = false;
        document.getElementById('mergeModal').style.display = 'none';
        this.render();
        this.triggerAutoSave();
    },
    openSup() {
        const sel = this.data.filter(i => i.checked);
        if (!sel.length) return alert('Выберите строки');
        document.getElementById('supSelect').innerHTML = `<option value="">-- Сброс --</option>` + app.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`);
        document.getElementById('supModal').classList.remove('hidden'); document.getElementById('supModal').style.display = 'flex';
    },
    applySup() {
        const v = document.getElementById('supSelect').value;
        this.data.forEach(i => { if (i.checked) { i.supplier = v; i.checked = false; } });
        document.getElementById('supModal').style.display = 'none';
        document.getElementById('mgrAll').checked = false;
        this.render();
        this.triggerAutoSave();
    },

    triggerAutoSave() {
        const statusEl = document.getElementById('saveStatus');
        if (statusEl) { statusEl.innerHTML = '<i class="fas fa-sync fa-spin"></i> Сохранение...'; statusEl.style.color = '#f59e0b'; }
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => { this.save(true); }, 1000);
    },

    async save(isAuto = false) {
        const name = document.getElementById('mgrName').value;
        if (!name) return;
        this.isSaving = true;
        const arr = this.data.map(i => [i.id || "", i.art, i.name, i.qty, i.unit, i.price, i.qty * i.price, i.supplier, i.note || "", i.done || false, i.category || "Фурнитура"]);
        try {
            if (!app.user || !app.user.id) throw new Error("Нет авторизации");
            await api.call('saveProject', { sheetName: name, data: arr, status: 'active', userId: app.user.id }, 'POST', !isAuto);
            const statusEl = document.getElementById('saveStatus');
            if (statusEl) { statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Сохранено'; statusEl.style.color = '#10b981'; }
            if (!isAuto) { alert('Сохранено!'); app.goHome(); }
        } catch (e) {
            console.error(e);
            const statusEl = document.getElementById('saveStatus');
            if (statusEl) { statusEl.innerHTML = 'Ошибка'; statusEl.style.color = '#ef4444'; }
        } finally { this.isSaving = false; }
    },

    updateDatalist() {
        let dl = document.getElementById('catalogList');
        if (!dl) { dl = document.createElement('datalist'); dl.id = 'catalogList'; document.body.appendChild(dl); }
        dl.innerHTML = app.catalog.map(item => `<option value="${item.name}">${item.price}₸ (${item.supplier || '-'})</option>`).join('');
    },

    handleFile(e) {
        const f = e.target.files[0];
        if (!f) return;
        if (typeof XLSX === 'undefined') return alert("Библиотека Excel не готова");
        const reader = new FileReader();
        reader.onload = function (ev) {
            try {
                const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                // Сохраняем "сырые" данные в mapper
                mapper.raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
                if (mapper.raw.length) mapper.show(); else alert("Файл пустой");
            } catch (err) { alert(err); } finally { e.target.value = ''; }
        };
        reader.readAsArrayBuffer(f);
    },

    async uploadFile(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return alert("Файл > 5 МБ");
        document.getElementById('loader').classList.remove('hidden');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const base64 = reader.result.split(',')[1];
                const res = await api.call('uploadFile', { data: base64, name: file.name, mime: file.type }, 'POST', false);
                if (res.url) {
                    this.data.unshift({ id: "", art: "", name: "📎 Файл: " + file.name, qty: 1, unit: "шт", price: 0, supplier: "", note: res.url, done: false, category: this.currentCategory });
                    this.render();
                    this.triggerAutoSave();
                    alert("Файл добавлен!");
                }
            } catch (e) { alert("Ошибка загрузки: " + e.message); }
            finally { document.getElementById('loader').classList.add('hidden'); input.value = ''; }
        };
    }
};

const mapper = {
    raw: [],
    show() {
        const tbl = document.getElementById('mapTable');
        tbl.innerHTML = '';
        if (!this.raw || !this.raw.length) return;
        const maxCols = this.raw.reduce((a, b) => Math.max(a, b.length), 0);
        let html = '<tr>';
        for (let i = 0; i < maxCols; i++) html += `<th><select class="map-sel" data-col="${i}"><option value="">Пропуск</option><option value="art">Артикул</option><option value="name">Название</option><option value="qty">Кол-во</option><option value="unit">Ед.</option><option value="price">Цена</option><option value="supplier">Поставщик</option><option value="note">Примечание</option></select></th>`;
        html += '</tr>';
        this.raw.slice(0, 20).forEach(r => { html += '<tr>' + Array.from({ length: maxCols }).map((_, i) => `<td style="padding:5px; border:1px solid #eee;">${r[i] || ""}</td>`).join('') + '</tr>'; });
        tbl.innerHTML = html;
        document.getElementById('modal').classList.remove('hidden'); document.getElementById('modal').style.display = 'flex';
    },
    apply() {
        const m = {};
        document.querySelectorAll('.map-sel').forEach(s => { if (s.value) m[s.value] = parseInt(s.dataset.col); });
        if (m.name === undefined) return alert('Ошибка: Вы не выбрали колонку "Название"!');
        let addedCount = 0;
        let hasChanges = false;
        this.raw.forEach(r => {
            const rawName = String(r[m.name]);
            if (!rawName || rawName.trim() === "") return;
            let price = m.price !== undefined ? (parseFloat(String(r[m.price]).replace(',', '.')) || 0) : 0;
            let supplier = m.supplier !== undefined ? String(r[m.supplier]) : "";
            let unit = m.unit !== undefined ? String(r[m.unit]) : "шт";
            if (price === 0 || supplier === "") {
                const match = app.catalog.find(c => c.name.toLowerCase() === rawName.toLowerCase());
                if (match) {
                    if (price === 0) price = match.price;
                    if (supplier === "") supplier = match.supplier;
                    if (unit === "шт" && match.unit) unit = match.unit;
                }
            }
            manager.data.push({ id: "", art: m.art !== undefined ? String(r[m.art]) : "", name: rawName, qty: m.qty !== undefined ? (parseFloat(String(r[m.qty]).replace(',', '.')) || 1) : 1, unit: unit, price: price, supplier: supplier, note: m.note !== undefined ? String(r[m.note]) : "", done: false, category: manager.currentCategory });
            addedCount++;
            hasChanges = true;
        });
        document.getElementById('modal').style.display = 'none';
        if (hasChanges) { manager.render(); manager.triggerAutoSave(); alert(`Импорт: ${addedCount}`); } else { alert("Пусто"); }
    }
};

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
        this.currentCategory = this.categories[0];
        this.currentListId = null;
        this.currentPositionId = positionId;

        // Очистка
        const tbody = document.getElementById('mgrBody');
        if (tbody) tbody.innerHTML = '';
        const totalEl = document.getElementById('mgrTotal');
        if (totalEl) totalEl.innerText = '0 ₸';

        // Рендер табов
        this.renderTabs();
        // Отрисовка аватарок
        this.renderTeamAvatars();

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

    // Отрисовка аватарок в тулбаре
    async renderTeamAvatars() {
        const container = document.getElementById('mgrTeamAvatars');
        // Если контейнера нет в HTML (например, в новом дизайне), просто выходим
        if (!container) return;

        // Берем ID проекта из глобального объекта positions, если он доступен
        const projId = (typeof positions !== 'undefined') ? positions.currentProjectId : null;

        if (!projId) {
            container.innerHTML = '';
            return;
        }

        const team = await api.call('getProjectTeam', { projectId: projId });
        const visible = team.slice(0, 3);
        const hiddenCount = team.length - 3;

        let html = visible.map(u => `
            <div class="user-avatar" title="${u.first_name}" style="border-color:#fff;">
                ${(u.first_name || 'U')[0]}
            </div>
        `).join('');

        if (hiddenCount > 0) {
            html += `<div class="user-avatar more" style="border-color:#fff;">+${hiddenCount}</div>`;
        }
        container.innerHTML = html;
    },

    // Отрисовка табов категорий
    renderTabs() {
        // Ищем контейнер. Если нет - создаем динамически перед тулбаром
        let containerEl = document.getElementById('mgrCategoryTabs');
        if (!containerEl) {
            const toolbar = document.querySelector('#tab-supply .mgr-toolbar');
            if (toolbar) {
                containerEl = document.createElement('div');
                containerEl.id = 'mgrCategoryTabs';
                containerEl.className = 'tabs-scroll-container';
                // Inline стили на случай отсутствия CSS
                containerEl.style.display = 'flex';
                containerEl.style.gap = '10px';
                containerEl.style.overflowX = 'auto';
                containerEl.style.padding = '10px 0';
                containerEl.style.borderBottom = '1px solid #eee';
                toolbar.parentNode.insertBefore(containerEl, toolbar);
            }
        }

        if (containerEl) {
            containerEl.innerHTML = this.categories.map(cat => {
                const isActive = (cat === this.currentCategory);
                // Используем класс cat-tab-btn из style.css
                return `<button class="cat-tab-btn ${isActive ? 'active' : ''}" onclick="manager.setCategory('${cat}')">${cat}</button>`;
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
        if (!tbody) return;

        tbody.innerHTML = '';
        const filter = document.getElementById('mgrSearch')?.value.toLowerCase() || '';
        let total = 0;
        const isFacades = (this.currentCategory === "Фасады");

        // Обновляем шапку таблицы
        const thead = document.querySelector('#mgrTable thead tr');
        if (thead) {
            if (isFacades) {
                thead.innerHTML = `<th class="chk"><input type="checkbox" id="mgrAll" onchange="manager.toggleAll(this.checked)"></th><th style="width: 120px;">Категория</th><th>Материал</th><th>Фрезеровка</th><th>Толщина</th><th>Цвет</th><th>Покрытие</th><th>Квадратура</th><th>Цена кв.м</th><th>Сумма</th>`;
            } else {
                thead.innerHTML = `<th class="chk"><input type="checkbox" id="mgrAll" onchange="manager.toggleAll(this.checked)"></th><th>Наименование</th><th style="width:60px;">Кол</th><th>Ед</th><th>Цена</th><th>Сумма</th><th>Поставщик</th><th>Примечание</th>`;
            }
        }

        const supOpts = `<option value="">-</option>` + app.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

        this.data.forEach((item, i) => {
            if (item.category !== this.currentCategory) return;

            const searchStr = (item.name + ' ' + (item.art || '') + ' ' + (item.supplier || '')).toLowerCase();
            if (filter && !searchStr.includes(filter)) return;

            item.sum = item.qty * item.price;
            total += item.sum;

            const tr = document.createElement('tr');
            if (item.checked) tr.style.background = '#fff9c4';

            if (isFacades) {
                tr.innerHTML = `<td class="chk"><input type="checkbox" ${item.checked ? 'checked' : ''} onchange="manager.check(${i},this.checked)"></td>
                               <td><select class="cat-select-table" onchange="manager.changeCategory(${i}, this.value)" style="border:none;">${this.categories.map(c => `<option ${c === item.category ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
                               <td><input value="${item.name}" oninput="manager.upd(${i},'name',this.value)"></td>
                               <td><input value="${item.art || ''}" oninput="manager.upd(${i},'art',this.value)"></td>
                               <td><input value="${item.unit}" oninput="manager.upd(${i},'unit',this.value)"></td>
                               <td><input value="${item.supplier || ''}" oninput="manager.upd(${i},'supplier',this.value)"></td>
                               <td><input value="${item.note || ''}" oninput="manager.upd(${i},'note',this.value)"></td>
                               <td><input type="number" value="${item.qty}" onchange="manager.upd(${i},'qty',this.value)"></td>
                               <td><input type="number" value="${item.price}" onchange="manager.upd(${i},'price',this.value)"></td>
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

    // Переход в режим закупа (Buyer)
    openBuyer() {
        if (!this.currentPositionId) return alert("Сначала откройте изделие");
        const name = document.getElementById('posDetailName')?.innerText || 'Смета';
        buyer.open(this.currentPositionId, name);
    },

    // Вспомогательное: для смены категории прямо в таблице
    changeCategory(index, newCat) {
        this.data[index].category = newCat;
        this.render();
        this.triggerAutoSave();
    },

    // Сохранение
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
                listId: this.currentListId,         // ID сметы
                data: arr
            }, 'POST', !isAuto);

            if (res.listId) this.currentListId = res.listId;

            // Визуальный статус
            const statusEl = document.getElementById('mgrTotal');
            if (isAuto && statusEl) statusEl.style.color = '#10b981'; // Green

        } catch (e) { console.error(e); }
        finally { this.isSaving = false; }
    },

    // === FILES & IMPORT ===
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
    },

    // === TEAM MANAGEMENT ===
    async openTeam() {
        const projId = (typeof positions !== 'undefined') ? positions.currentProjectId : null;

        if (!projId) {
            alert("Ошибка: Проект не определен (ID не найден)");
            return;
        }

        const modal = document.getElementById('teamModal');
        const listDiv = document.getElementById('teamList');
        const select = document.getElementById('teamSelect');

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        listDiv.innerHTML = '<div style="padding:10px; color:#999;">Загрузка...</div>';

        try {
            const allMembers = await api.call('getCompanyMembers');
            const projectTeam = await api.call('getProjectTeam', { projectId: projId });

            listDiv.innerHTML = projectTeam.length ? '' : '<div style="padding:10px; color:#999; font-size:13px;">В этом проекте пока только вы</div>';

            projectTeam.forEach(u => {
                const row = document.createElement('div');
                row.className = 'sup-row';
                row.innerHTML = `
                   <div style="flex:1; font-size:14px; font-weight:500;">
                      ${u.first_name || ''} ${u.last_name || ''}
                      <div style="font-size:11px; color:#999;">@${u.username || 'user'}</div>
                   </div>
                   <button class="btn-icon-del" onclick="manager.removeFromTeam('${u.id}')" title="Убрать"><i class="fas fa-times"></i></button>
                `;
                listDiv.appendChild(row);
            });

            const assignedIds = projectTeam.map(u => String(u.id));
            if (app.user) assignedIds.push(String(app.user.id));

            const available = allMembers.filter(m => !assignedIds.includes(String(m.id)));

            if (available.length === 0) {
                select.innerHTML = '<option value="">Все сотрудники уже добавлены</option>';
                select.disabled = true;
            } else {
                select.disabled = false;
                select.innerHTML = '<option value="">Выберите сотрудника...</option>' +
                    available.map(m => {
                        const roleName = (window.ROLE_NAMES && window.ROLE_NAMES[m.role]) ? window.ROLE_NAMES[m.role] : m.role;
                        return `<option value="${m.id}">${m.first_name} ${m.last_name || ''} (${roleName})</option>`;
                    }).join('');
            }

            // Удаляем старые слушатели (клонируем узел)
            const newSelect = select.cloneNode(true);
            select.parentNode.replaceChild(newSelect, select);

            newSelect.onchange = async () => {
                if (!newSelect.value) return;
                const userId = newSelect.value;
                newSelect.value = "";
                await api.call('assignUserToProject', { projectId: projId, userId: userId }, 'POST');
                this.renderTeamAvatars();
                this.openTeam();
            };

        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    },

    async removeFromTeam(userId) {
        if (!confirm("Убрать сотрудника из доступа к проекту?")) return;
        const projId = (typeof positions !== 'undefined') ? positions.currentProjectId : null;
        if (projId) {
            await api.call('removeUserFromProject', { projectId: projId, userId: userId }, 'POST');
        }
        this.renderTeamAvatars();
        this.openTeam();
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
    }
};
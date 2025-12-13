// js/app.js

const app = {
    suppliers: [],
    catalog: [],
    projectsData: [],
    currentDashTab: 'new',
    user: null,

    async init() {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            document.documentElement.style.setProperty('--tg-safe-area-inset-top', (window.Telegram.WebApp.contentSafeAreaInset?.top || 20) + 'px');
            this.user = window.Telegram.WebApp.initDataUnsafe?.user;
        }

        try {
            document.getElementById('loader').classList.remove('hidden');
            // 1. Инициализация сессии (Проверяем компании НОВЫМ МЕТОДОМ)
            let userId = this.user ? String(this.user.id) : null;

            if (userId) {
                // Сохраняем данные юзера (на всякий случай)
                await api.call('saveTelegramUser', { user: this.user }, 'POST', false);

                // Инициализируем сессию (находим компанию юзера)
                await api._initSession(userId);
            }

            // 2. Если компания определилась - грузим дашборд и справочники
            if (window.CURRENT_COMPANY_ID) {
                await this.refreshDashboard(false);
                const [suppliersData, catalogData] = await Promise.all([
                    api.call('getSuppliers', {}, 'GET', false),
                    api.call('getCatalog', {}, 'GET', false)
                ]);
                this.suppliers = suppliersData;
                this.catalog = catalogData || [];
            } else {
                // Если компании нет - отправляем в профиль или показываем пустой экран
                console.log("Пользователь без компании");
                if (window.profile) profile.open();
            }

            if (window.manager) manager.updateDatalist();

            const input = document.getElementById('xlsInput');
            if (input) {
                // Reset file input
                const newInput = input.cloneNode(true);
                input.parentNode.replaceChild(newInput, input);
                newInput.addEventListener('change', (e) => manager.handleFile(e));
            }
        } catch (e) { console.error(e); }
        finally { document.getElementById('loader').classList.add('hidden'); }
    },

    async refreshDashboard(useLoader = true) {
        try {
            let userId = '';
            if (this.user && this.user.id) userId = String(this.user.id);
            const data = await api.call('getProjectsSummary', { userId: userId }, 'GET', useLoader);
            this.projectsData = data;
            this.updateBadges();
            this.renderProjectsGrid();
        } catch (e) { console.error(e); }
    },

    renderProjectsGrid() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const filterText = (document.getElementById('dashSearch')?.value || '').toLowerCase();
        const targetStatus = this.currentDashTab;
        const filtered = this.projectsData.filter(p => {
            const pStatus = p.status || 'new';
            return (pStatus === targetStatus) && p.name.toLowerCase().includes(filterText);
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#999;"><i class="fas fa-folder-open" style="font-size:40px; margin-bottom:10px;"></i><br>В этой категории пусто</div>`;
            return;
        }

        filtered.forEach(p => {
            const total = p.total || 0;
            const done = p.done || 0;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            let tagText = 'Новый';
            if (percent === 100) tagText = 'Завершен';
            else if (percent > 0) tagText = `Прогресс ${percent}%`;

            const card = document.createElement('div');
            card.className = 'p-card';
            card.innerHTML = `
            <div class="card-header">
                <span class="card-tag">${tagText}</span>
                <button class="btn-trash" onclick="event.stopPropagation(); app.deleteProject('${p.name}')" title="Удалить"><i class="fas fa-trash"></i></button>
            </div>
            <div class="card-body" onclick="manager.open('${p.name}')">
                <h3 class="card-title">${p.name}</h3>
                <div class="card-desc">
                   <div class="desc-row"><i class="fas fa-coins" style="color:#cbd5e1; font-size:12px;"></i> <b>${utils.formatCurrency(p.sum)}</b></div>
                   <div class="desc-row"><i class="fas fa-list-ul" style="color:#cbd5e1; font-size:12px;"></i> <span>Позиций: ${total} (Куплено: ${done})</span></div>
                </div>
            </div>
            <div class="card-footer">
               <select onclick="event.stopPropagation()" onchange="app.moveProject('${p.name}', this.value)" class="status-select">
                   <option value="new" ${p.status == 'new' ? 'selected' : ''}>В работе</option>
                   <option value="active" ${p.status == 'active' ? 'selected' : ''}>Закуп</option>
                   <option value="done" ${p.status == 'done' ? 'selected' : ''}>Готово</option>
               </select>
               <div class="card-actions">
                  <button class="btn-action btn-edit" onclick="event.stopPropagation(); manager.open('${p.name}')" title="Редактировать"><i class="fas fa-pencil-alt"></i></button>
                  <button class="btn-action btn-buy" onclick="event.stopPropagation(); buyer.open('${p.name}')" title="Закуп"><i class="fas fa-shopping-cart"></i></button>
               </div>
            </div>
        `;
            grid.appendChild(card);
        });
    },

    switchTab(tabName) {
        this.currentDashTab = tabName;
        const tabs = document.querySelectorAll('.tab-btn'); // FIXED: Was .status-tab in user snippet but HTML uses .tab-btn
        tabs.forEach(t => t.classList.remove('active'));
        // Map tabName to ID - based on index.html: tab-btn-new, tab-btn-active, tab-btn-done
        if (tabName === 'new') document.getElementById('tab-btn-new')?.classList.add('active');
        if (tabName === 'active') document.getElementById('tab-btn-active')?.classList.add('active');
        if (tabName === 'done') document.getElementById('tab-btn-done')?.classList.add('active');
        this.renderProjectsGrid();
    },

    updateBadges() {
        const counts = { new: 0, active: 0, done: 0 };
        this.projectsData.forEach(p => {
            const s = p.status || 'new';
            if (counts[s] !== undefined) counts[s]++; else counts['new']++;
        });
        // IDs based on index.html: count-new, count-active, count-done. User snippet had badge-new
        if (document.getElementById('count-new')) document.getElementById('count-new').innerText = counts.new;
        if (document.getElementById('count-active')) document.getElementById('count-active').innerText = counts.active;
        if (document.getElementById('count-done')) document.getElementById('count-done').innerText = counts.done;
    },

    filterDashboard() { this.renderProjectsGrid(); },

    async moveProject(name, status) {
        await api.call('updateStatus', { sheetName: name, status: status }, 'POST');
        const proj = this.projectsData.find(p => p.name === name);
        if (proj) proj.status = status;
        this.updateBadges();
        this.renderProjectsGrid();
    },

    async deleteProject(name) {
        if (confirm(`Удалить "${name}"?`)) { await api.call('deleteProject', { sheetName: name }, 'POST'); this.refreshDashboard(); }
    },

    async archiveProject(name) {
        if (!confirm(`В архив "${name}"?`)) return;
        await api.call('archiveProject', { sheetName: name }, 'POST');
        this.refreshDashboard();
    },

    async openArchive() {
        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-archive').classList.remove('hidden');
        const list = await api.call('getArchivedList');
        const grid = document.getElementById('archiveList');
        grid.innerHTML = list.length ? '' : '<div style="text-align:center; color:#999;">Архив пуст</div>';
        list.forEach(item => {
            const card = document.createElement('div');
            card.className = 'p-card';
            card.style.borderLeftColor = '#607d8b';
            card.innerHTML = `<div class="pc-top"><span class="pc-name">${item.name}</span><span style="font-size:12px; color:#888;">${item.date}</span></div><button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="app.unarchiveProject('${item.id}')">♻️ Восстановить</button>`;
            grid.appendChild(card);
        });
    },

    async unarchiveProject(id) {
        if (!confirm("Восстановить?")) return;
        await api.call('unarchiveProject', { sheetName: id }, 'POST'); // Adjusted logic for name
        this.goHome();
    },

    // Suppliers logic kept in app for modal but data load in api
    openSuppliersEdit() {
        const listContainer = document.getElementById('supListContainer');
        listContainer.innerHTML = '';
        this.suppliers.forEach((s) => app.addSupplierRow(s.id, s.name, s.phone));
        document.getElementById('supEditModal').classList.remove('hidden'); document.getElementById('supEditModal').style.display = 'flex';
    },
    addSupplierRow(id = '', name = '', phone = '') {
        const listContainer = document.getElementById('supListContainer');
        const div = document.createElement('div');
        div.className = 'sup-row';
        if (id) div.dataset.id = id;
        div.innerHTML = `<input class="sup-input name" value="${name}" placeholder="Имя / Название"><input class="sup-input phone" value="${phone}" placeholder="Телефон"><button onclick="this.closest('.sup-row').remove()" class="btn-icon-del"><i class="fas fa-trash"></i></button>`;
        listContainer.appendChild(div);
    },
    async saveSuppliers() {
        const rows = document.querySelectorAll('.sup-row');
        const newList = [];
        rows.forEach(div => {
            const id = div.dataset.id || null;
            const name = div.querySelector('.name').value.trim();
            const phone = div.querySelector('.phone').value.trim();
            if (name) newList.push({ id, name, phone });
        });
        await api.call('saveSuppliers', { list: newList }, 'POST');
        this.suppliers = await api.call('getSuppliers');
        document.getElementById('supEditModal').style.display = 'none';
        alert('Поставщики сохранены');
    },

    newProject() { manager.open(''); },
    goHome() {
        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-dashboard').classList.remove('hidden');
        this.refreshDashboard();
    }
};

window.onload = () => app.init();

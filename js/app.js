// js/app.js
const app = {
    user: null,
    suppliers: [],
    catalog: [],

    async init() {
        // 1. Telegram Init
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            document.documentElement.style.setProperty('--tg-safe-area-inset-top', (window.Telegram.WebApp.contentSafeAreaInset?.top || 20) + 'px');
            this.user = window.Telegram.WebApp.initDataUnsafe?.user;
        }

        // 2. Auth & Session
        try {
            let userId = this.user ? String(this.user.id) : null;
            if (userId) {
                await api.call('initSession', { userId: userId });
            }

            // 3. Load Data
            if (window.CURRENT_COMPANY_ID) {
                // Load Dictionaries
                const [suppliersData, catalogData] = await Promise.all([
                    api.call('getSuppliers', {}, 'GET', false),
                    api.call('getCatalog', {}, 'GET', false)
                ]);
                this.suppliers = suppliersData;
                this.catalog = catalogData || [];

                // Start App
                projects.init();
            } else {
                // No Company
                if (window.profile) profile.open();
            }

            if (window.manager) manager.updateDatalist();

            // 4. Восстанавливаем состояние Сайдбара (Добавить в конец init)
            const sidebarState = localStorage.getItem('logiqa_sidebar_state');
            if (sidebarState === 'closed') {
                this.toggleSidebar(false); // false = не менять, просто применить
            }

        } catch (e) { console.error(e); }
    },

    // Новый метод
    toggleSidebar(save = true) {
        const sidebar = document.getElementById('sidebar');
        const icon = document.getElementById('sidebarIcon');

        if (!sidebar) return;

        // Переключаем класс
        sidebar.classList.toggle('collapsed');

        const isClosed = sidebar.classList.contains('collapsed');

        // Меняем иконку
        if (icon) {
            icon.className = isClosed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        }

        // Сохраняем в память (если это клик пользователя)
        if (save) {
            localStorage.setItem('logiqa_sidebar_state', isClosed ? 'closed' : 'open');
        }
    },

    // Навигация
    goHome() {
        this.showScreen('view-projects-list');
        projects.render();
    },

    openProject(id) {
        this.showScreen('view-project-detail');
        positions.openProject(id);
    },

    openPosition(id, name) {
        this.showScreen('view-position-detail');
        positions.openPosition(id, name);
    },

    goToProject() {
        this.showScreen('view-project-detail');
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    // Табы внутри позиции
    switchPosTab(tabId) {
        document.querySelectorAll('.tab-chip').forEach(c => c.classList.remove('active'));
        // Найдем кнопку по onclick и добавим класс (если передаем event, но тут его нет в аргументах)
        // Сделаем хак через поиск по тексту или атрибуту, или просто забьем на кнопку (визуально не поменяется)
        // Или лучше: переберем все .tab-chip и если onclick содержит tabId - актив.
        document.querySelectorAll('.container .tab-chip').forEach(c => {
            if (c.getAttribute('onclick').includes(tabId)) c.classList.add('active');
        });
        // В index.html onclick="app.switchPosTab('info')" -> так что event.target проще
        if (typeof event !== 'undefined' && event.target) {
            event.target.classList.add('active');
        }

        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('tab-' + tabId).classList.add('active');

        // Если открыли Смету - грузим данные
        if (tabId === 'supply') {
            manager.open(positions.currentPositionId);
        }
    },

    // -- Suppliers Modal Logic for Global --
    openSuppliersEdit() {
        const div = document.getElementById('supEditModal');
        if (div) {
            div.classList.remove('hidden');
            document.getElementById('supListContainer').innerHTML = ''; // Clear
            this.suppliers.forEach(s => this.addSupplierRow(s.id, s.name, s.phone));
        }
    },
    addSupplierRow(id = '', name = '', phone = '') {
        const list = document.getElementById('supListContainer');
        const d = document.createElement('div');
        d.className = 'sup-row';
        d.dataset.id = id;
        d.innerHTML = `<input class="sup-input name" value="${name}" placeholder="Имя"><input class="sup-input phone" value="${phone || ''}" placeholder="Тел"><button onclick="this.parentElement.remove()" class="btn-icon-del"><i class="fas fa-times"></i></button>`;
        list.appendChild(d);
    },
    async saveSuppliers() {
        const rows = document.querySelectorAll('#supListContainer .sup-row');
        const list = Array.from(rows).map(r => ({
            id: r.dataset.id || null,
            name: r.querySelector('.name').value,
            phone: r.querySelector('.phone').value
        })).filter(i => i.name);
        await api.call('saveSuppliers', { list });
        this.suppliers = await api.call('getSuppliers');
        document.getElementById('supEditModal').classList.add('hidden');
        alert('Сохранено');
    }
};

window.onload = () => app.init();

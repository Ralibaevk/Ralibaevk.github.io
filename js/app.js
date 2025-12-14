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
            try {
                // Безопасное получение отступов
                const topInset = window.Telegram.WebApp.contentSafeAreaInset?.top || 20;
                document.documentElement.style.setProperty('--tg-safe-area-inset-top', topInset + 'px');
            } catch (e) { console.warn('TG Safe Area Error', e); }

            this.user = window.Telegram.WebApp.initDataUnsafe?.user;
        }

        // Если открыто в браузере для тестов (без TG), создаем фейк юзера
        // Раскомментируйте для тестов в браузере:
        // if (!this.user) this.user = { id: 12345, first_name: "Test", last_name: "User", username: "test" };

        // 2. Auth & Session
        try {
            let userId = this.user ? String(this.user.id) : null;

            if (userId) {
                // ВАЖНО: Сначала сохраняем/обновляем юзера в БД, чтобы работали Foreign Keys
                await api.call('saveTelegramUser', { user: this.user }, 'POST', false);

                // Инициализируем сессию (ищем компанию)
                await api.call('initSession', { userId: userId });
            }

            // 3. Load Data & Routing
            if (window.CURRENT_COMPANY_ID) {
                // Загружаем справочники параллельно
                try {
                    const [suppliersData, catalogData] = await Promise.all([
                        api.call('getSuppliers', {}, 'GET', false),
                        api.call('getCatalog', {}, 'GET', false)
                    ]);
                    this.suppliers = suppliersData || [];
                    this.catalog = catalogData || [];
                } catch (err) {
                    console.error("Ошибка загрузки справочников:", err);
                }

                // Запускаем экран проектов
                this.navTo('projects');
            } else {
                // Если компании нет -> в Профиль
                this.navTo('profile');
            }

            if (window.manager && typeof manager.updateDatalist === 'function') {
                manager.updateDatalist();
            }

            // 4. Восстанавливаем состояние Сайдбара
            const sidebarState = localStorage.getItem('logiqa_sidebar_state');
            if (sidebarState === 'closed') {
                this.toggleSidebar(false);
            }

        } catch (e) {
            console.error("Critical Init Error:", e);
            alert("Ошибка запуска: " + (e.message || e));
            // В случае критической ошибки пробуем показать профиль
            this.navTo('profile');
        }
    },

    // Сайдбар
    toggleSidebar(save = true) {
        const sidebar = document.getElementById('sidebar');
        const icon = document.getElementById('sidebarIcon');

        if (!sidebar) return;

        sidebar.classList.toggle('collapsed');
        const isClosed = sidebar.classList.contains('collapsed');

        if (icon) {
            icon.className = isClosed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        }

        if (save) {
            localStorage.setItem('logiqa_sidebar_state', isClosed ? 'closed' : 'open');
        }
    },

    // Навигация
    navTo(sectionId) {
        // 1. Sidebar Active State
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.getElementById('nav-' + sectionId);
        if (navItem) navItem.classList.add('active');

        // 2. Routing
        if (sectionId === 'projects') {
            this.showScreen('view-projects-list');
            // Вызываем рендер проектов только если перешли на этот экран
            if (window.projects) projects.render();
        } else if (sectionId === 'profile') {
            this.showScreen('view-profile');
            if (window.profile) profile.render();
        } else if (['design', 'measure', 'detail', 'supply', 'production', 'install', 'handover'].includes(sectionId)) {
            this.showScreen('view-stub');
        } else {
            console.warn('Unknown section:', sectionId);
        }
    },

    goHome() {
        this.navTo('projects');
    },

    openProject(id) {
        this.showScreen('view-project-detail');
        if (window.positions) positions.openProject(id);
    },

    openPosition(id, name) {
        this.showScreen('view-position-detail');
        if (window.positions) positions.openPosition(id, name);
    },

    goToProject() {
        this.showScreen('view-project-detail');
    },

    showScreen(id) {
        const target = document.getElementById(id);
        if (!target) {
            console.error(`Screen not found: ${id}`);
            return;
        }
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        target.classList.add('active');
    },

    // Табы внутри позиции
    switchPosTab(tabId) {
        document.querySelectorAll('.tab-chip').forEach(c => c.classList.remove('active'));
        if (typeof event !== 'undefined' && event.target && event.target.classList.contains('tab-chip')) {
            event.target.classList.add('active');
        } else {
            const btn = Array.from(document.querySelectorAll('.tab-chip')).find(el => el.getAttribute('onclick')?.includes(tabId));
            if (btn) btn.classList.add('active');
        }

        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const content = document.getElementById('tab-' + tabId);
        if (content) content.classList.add('active');

        if (tabId === 'supply' && window.manager && positions.currentPositionId) {
            manager.open(positions.currentPositionId);
        }
    },

    // -- Suppliers Modal Logic for Global --
    openSuppliersEdit() {
        const div = document.getElementById('supEditModal');
        if (div) {
            div.classList.remove('hidden');
            const listContainer = document.getElementById('supListContainer');
            if (listContainer) {
                listContainer.innerHTML = '';
                this.suppliers.forEach(s => this.addSupplierRow(s.id, s.name, s.phone));
            }
        }
    },
    addSupplierRow(id = '', name = '', phone = '') {
        const list = document.getElementById('supListContainer');
        if (!list) return;
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

        try {
            await api.call('saveSuppliers', { list });
            this.suppliers = await api.call('getSuppliers');
            document.getElementById('supEditModal').classList.add('hidden');
        } catch (e) {
            console.error(e);
        }
    }
};

window.onload = () => app.init();

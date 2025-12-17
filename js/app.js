// js/app.js
window.app = {
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
            // Получаем start_param (инвайт-код)
            this.startParam = window.Telegram.WebApp.initDataUnsafe?.start_param || null;
            console.log('📩 Start param (invite code):', this.startParam);
        }

        // 2. Auth & Session
        try {
            let userId = this.user ? String(this.user.id) : null;
            if (userId) {
                // Сначала сохраняем пользователя в БД
                await api.call('saveTelegramUser', { user: this.user }, 'POST', false);

                // Пробуем инициализировать сессию
                await api.call('initSession', { userId: userId });

                // Если есть код приглашения и нет компании - присоединяемся
                if (this.startParam && !window.CURRENT_COMPANY_ID) {
                    console.log('🔗 Processing invite code:', this.startParam);
                    try {
                        await api.call('joinCompany', { code: this.startParam, userId: userId }, 'POST');
                        // Повторно инициализируем сессию
                        await api.call('initSession', { userId: userId });
                        alert('Вы успешно присоединились к компании!');
                    } catch (inviteError) {
                        console.error('Invite error:', inviteError);
                        // Не показываем alert если ошибка "уже в компании"
                        if (!inviteError.message.includes('уже')) {
                            alert('Ошибка присоединения: ' + inviteError.message);
                        }
                    }
                }
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
                if (window.profile) this.navTo('profile');
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
    navTo(sectionId) {
        // 1. Sidebar Active State
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navItem = document.getElementById('nav-' + sectionId);
        if (navItem) navItem.classList.add('active');

        // 2. Routing
        if (sectionId === 'projects') {
            this.showScreen('view-projects-list');
            projects.render();
        } else if (sectionId === 'profile') {
            this.showScreen('view-profile');
            profile.render();
        } else if (['design', 'measure', 'detail', 'supply', 'production', 'install', 'handover'].includes(sectionId)) {
            // Заглушки
            this.showScreen('view-stub');
        } else {
            console.warn('Unknown section:', sectionId);
        }
    },

    goHome() {
        this.navTo('projects');
    },

    openProject(id) {
        console.log('🚀 app.openProject called with id:', id);

        if (!id) {
            console.error('❌ app.openProject: ID is empty!');
            alert('Ошибка: ID проекта не передан');
            return;
        }

        this.showScreen('view-project-detail');

        if (window.positions) {
            try {
                positions.openProject(id);
            } catch (e) {
                console.error('❌ Error in positions.openProject:', e);
            }
        } else {
            console.error('❌ positions object not found!');
        }
    },

    openPosition(id, name) {
        console.log('🚀 app.openPosition called:', id, name);
        this.showScreen('view-position-detail');
        if (window.positions) positions.openPosition(id, name);
    },

    goToProject() {
        // Возврат к детальному экрану проекта
        this.showScreen('view-project-detail');
        // Перерендерим позиции если ID сохранён
        if (window.positions && positions.currentProjectId) {
            positions.renderList();
        }
    },

    showScreen(id) {
        const target = document.getElementById(id);
        if (!target) {
            console.error(`Screen not found: ${id}`);
            return; // Не скрываем текущий экран, если новый не найден
        }

        // Скрываем все
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        // Показываем целевой
        target.classList.add('active');
    },

    // Табы внутри позиции
    switchPosTab(tabId) {
        document.querySelectorAll('.tab-chip').forEach(c => c.classList.remove('active'));

        // New efficient way: click event is handled in HTML, but we might want to highlight programmatically
        if (typeof event !== 'undefined' && event.target && event.target.classList.contains('tab-chip')) {
            event.target.classList.add('active');
        } else {
            // Fallback: find by onclick attr
            const btn = Array.from(document.querySelectorAll('.tab-chip')).find(el => el.getAttribute('onclick')?.includes(tabId));
            if (btn) btn.classList.add('active');
        }

        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const content = document.getElementById('tab-' + tabId);
        if (content) content.classList.add('active');

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

console.log("✅ app.js file loaded");
console.log("📦 Checking global objects:");
console.log("  - window.positions:", typeof window.positions !== 'undefined' ? "✅ exists" : "❌ NOT FOUND");
console.log("  - window.projects:", typeof window.projects !== 'undefined' ? "✅ exists" : "❌ NOT FOUND");
console.log("  - window.api:", typeof window.api !== 'undefined' ? "✅ exists" : "❌ NOT FOUND");
console.log("  - window.manager:", typeof window.manager !== 'undefined' ? "✅ exists" : "❌ NOT FOUND");

window.onload = () => {
    console.log("🚀 window.onload triggered, starting app.init()...");
    app.init();
};

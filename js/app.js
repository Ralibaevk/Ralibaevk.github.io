// js/app.js
window.app = {
    user: null,
    suppliers: [],
    catalog: [],

    async init() {
        // 1. Telegram Init
        const isTelegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            document.documentElement.style.setProperty('--tg-safe-area-inset-top', (window.Telegram.WebApp.contentSafeAreaInset?.top || 20) + 'px');
            this.user = window.Telegram.WebApp.initDataUnsafe?.user;
            // Получаем start_param (инвайт-код)
            this.startParam = window.Telegram.WebApp.initDataUnsafe?.start_param || null;
            console.log('📩 Start param (invite code):', this.startParam);
        }

        // 2. Проверка: если НЕ из Telegram — показываем экран входа
        if (!isTelegramUser) {
            console.log('🌐 Browser mode detected - showing login screen');
            this.showLoginScreen();
            return; // Прекращаем инициализацию до входа через Telegram
        }

        console.log('📱 Telegram mode detected - proceeding with app');
        this.hideLoginScreen();

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

                // 🔥 5. Обработка deeplink для возврата на нужную страницу
                if (this.startParam && this.startParam.startsWith('p') && this.startParam.includes('_pos')) {
                    console.log('📍 Processing deeplink:', this.startParam);
                    const match = this.startParam.match(/p([\w-]+)_pos([\w-]+)_(\w+)/);
                    if (match) {
                        const [, projectId, positionId, tab] = match;
                        console.log('📍 Deeplink parsed:', { projectId, positionId, tab });
                        // Увеличенная задержка для загрузки данных
                        setTimeout(() => {
                            console.log('📍 Opening position:', positionId);
                            this.openPosition(positionId, '');
                            // Переключаем вкладку после открытия позиции
                            setTimeout(() => {
                                console.log('📍 Switching to tab:', tab);
                                this.switchPipelineTab(tab);
                            }, 500);
                        }, 1000);
                    }
                }
            } else {
                // No Company
                if (window.profile) this.navTo('profile');
            }

            if (window.manager) manager.updateDatalist();

            // 4. Восстанавливаем состояние Сайдбара
            const sidebarState = localStorage.getItem('logiqa_sidebar_state');
            if (sidebarState === 'closed') {
                this.toggleSidebar(false);
            }

        } catch (e) { console.error(e); }
    },

    // Показать экран входа (для браузерных пользователей)
    showLoginScreen() {
        const loginScreen = document.getElementById('view-login');
        const mainLayout = document.querySelector('.main-layout');
        const bottomNav = document.querySelector('.bottom-nav');
        const fab = document.querySelector('.fab');

        if (loginScreen) loginScreen.classList.remove('hidden');
        if (mainLayout) mainLayout.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        if (fab) fab.style.display = 'none';
    },

    // Скрыть экран входа
    hideLoginScreen() {
        const loginScreen = document.getElementById('view-login');
        const mainLayout = document.querySelector('.main-layout');
        const bottomNav = document.querySelector('.bottom-nav');

        if (loginScreen) loginScreen.classList.add('hidden');
        if (mainLayout) mainLayout.style.display = '';
        if (bottomNav) bottomNav.style.display = '';
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
            // 🔥 Канбан-доски для этапов pipeline
            this.showScreen('view-kanban');
            if (window.kanban) kanban.init(sectionId);
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

    // Табы внутри позиции (LEGACY - сохранено для обратной совместимости)
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

        if (tabId === 'supply') {
            manager.open(positions.currentPositionId);
        }
    },

    // НОВЫЕ Pipeline Табы
    switchPipelineTab(tabId) {
        // Переключаем активный таб
        document.querySelectorAll('.pipeline-tab').forEach(t => t.classList.remove('active'));
        const tab = document.querySelector(`.pipeline-tab[data-tab="${tabId}"]`);
        if (tab) tab.classList.add('active');

        // Переключаем контент
        document.querySelectorAll('.pipeline-content').forEach(c => c.classList.remove('active'));
        const content = document.getElementById('pipeline-' + tabId);
        if (content) content.classList.add('active');

        // Инициализация вкладок
        const posId = positions.currentPositionId;

        if (tabId === 'design' && window.design) {
            design.init(posId);
        } else if (tabId === 'measure' && window.measure) {
            measure.init(posId);
        } else if (tabId === 'supply' && window.manager) {
            manager.open(posId);
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

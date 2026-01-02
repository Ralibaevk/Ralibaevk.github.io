// js/router.js — Роутинг по ролям пользователя
console.log("✅ router.js file is loading...");

window.router = {
    // Маппинг ролей на страницы
    ROLE_PAGES: {
        owner: 'pages/manager.html',      // owner = полный доступ как manager
        manager: 'pages/manager.html',
        designer: 'pages/designer.html',
        measurer: 'pages/measurer.html',
        technologist: 'pages/technologist.html',
        supplier: 'pages/supplier.html',
        production: 'pages/production.html',
        installation: 'pages/installer.html'
    },

    // Приоритет ролей (какую страницу открыть при нескольких ролях)
    ROLE_PRIORITY: ['owner', 'manager', 'designer', 'measurer', 'technologist',
        'supplier', 'production', 'installation', 'member'],

    // Определить главную страницу по ролям пользователя
    getPageByRoles(userRoles) {
        if (!userRoles || userRoles.length === 0) {
            return 'pages/profile.html';
        }

        // Ищем первую подходящую роль по приоритету
        for (const role of this.ROLE_PRIORITY) {
            if (userRoles.includes(role) && this.ROLE_PAGES[role]) {
                return this.ROLE_PAGES[role];
            }
        }

        return 'pages/profile.html';
    },

    // Получить все доступные страницы для мульти-ролевого пользователя
    getAllowedPages(userRoles) {
        const pages = [];
        for (const role of userRoles) {
            if (this.ROLE_PAGES[role]) {
                pages.push({
                    role: role,
                    page: this.ROLE_PAGES[role],
                    name: this.getRoleName(role)
                });
            }
        }
        return pages;
    },

    // Название роли на русском
    getRoleName(role) {
        const names = {
            manager: 'Менеджер',
            designer: 'Дизайнер',
            measurer: 'Замерщик',
            technologist: 'Технолог',
            supplier: 'Снабженец',
            production: 'Производство',
            installation: 'Монтаж'
        };
        return names[role] || role;
    },

    // Редирект после авторизации
    redirect(userRoles) {
        const page = this.getPageByRoles(userRoles);
        console.log('🔀 Redirecting to:', page);
        window.location.href = page;
    },

    // Проверка доступа к текущей странице
    checkAccess(allowedRoles, userRoles) {
        // '*' = доступ для всех
        if (allowedRoles.includes('*')) return true;
        // manager имеет доступ ко всему
        if (userRoles.includes('manager')) return true;
        // Проверяем пересечение ролей
        return allowedRoles.some(role => userRoles.includes(role));
    },

    // Получить текущую страницу
    getCurrentPage() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }
};

console.log("✅ router.js loaded");

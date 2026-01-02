// js/auth.js — Клиентская проверка прав доступа
console.log("✅ auth.js file is loading...");

window.auth = {
    userRoles: [],
    isInitialized: false,

    // Инициализация при загрузке страницы
    async init() {
        console.log('🔐 Auth init started...');

        try {
            // Получаем роли из сессии Supabase
            if (window.CURRENT_USER_ROLES) {
                this.userRoles = window.CURRENT_USER_ROLES;
            } else {
                // Попробуем получить из localStorage как fallback
                const cached = localStorage.getItem('logiqa_user_roles');
                if (cached) {
                    this.userRoles = JSON.parse(cached);
                }
            }

            console.log('🔐 User roles:', this.userRoles);

            // Проверяем доступ к текущей странице
            const allowedRoles = this.getPageAllowedRoles();
            if (!router.checkAccess(allowedRoles, this.userRoles)) {
                console.warn('⛔ Access denied, redirecting...');
                alert('Доступ к этой странице запрещён для вашей роли');
                router.redirect(this.userRoles);
                return false;
            }

            this.isInitialized = true;
            console.log('✅ Auth init completed');
            return true;

        } catch (error) {
            console.error('❌ Auth init error:', error);
            return false;
        }
    },

    // Получить разрешённые роли для текущей страницы
    getPageAllowedRoles() {
        const bodyRoles = document.body.dataset.allowedRoles;
        if (bodyRoles) {
            return bodyRoles.split(',').map(r => r.trim());
        }
        return ['*']; // По умолчанию доступ для всех
    },

    // Сохранить роли в localStorage для кеширования
    cacheRoles(roles) {
        this.userRoles = roles;
        localStorage.setItem('logiqa_user_roles', JSON.stringify(roles));
    },

    // Очистить кеш ролей (при выходе)
    clearCache() {
        this.userRoles = [];
        localStorage.removeItem('logiqa_user_roles');
    },

    // Проверка роли перед действием
    can(requiredRole) {
        // manager имеет все права
        if (this.userRoles.includes('manager')) return true;
        return this.userRoles.includes(requiredRole);
    },

    // Проверка нескольких ролей (OR)
    canAny(roles) {
        if (this.userRoles.includes('manager')) return true;
        return roles.some(role => this.userRoles.includes(role));
    },

    // Проверка всех ролей (AND)
    canAll(roles) {
        if (this.userRoles.includes('manager')) return true;
        return roles.every(role => this.userRoles.includes(role));
    },

    // Показать/скрыть элементы по ролям
    applyVisibility() {
        document.querySelectorAll('[data-require-role]').forEach(el => {
            const required = el.dataset.requireRole.split(',').map(r => r.trim());
            if (!this.canAny(required)) {
                el.style.display = 'none';
            }
        });
    }
};

console.log("✅ auth.js loaded");

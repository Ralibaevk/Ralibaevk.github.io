// js/sidebar.js — Динамическая генерация сайдбара по ролям
console.log("✅ sidebar.js file is loading...");

window.sidebar = {
    // Иконки для ролей
    ROLE_ICONS: {
        owner: 'fas fa-crown',
        manager: 'fas fa-folder',
        designer: 'fas fa-pencil-ruler',
        measurer: 'fas fa-ruler-combined',
        technologist: 'fas fa-cubes',
        supplier: 'fas fa-shopping-cart',
        production: 'fas fa-industry',
        installation: 'fas fa-hammer'
    },

    // Получить иконку роли
    getIcon(role) {
        return this.ROLE_ICONS[role] || 'fas fa-folder';
    },

    // Определить текущую страницу для подсветки активного пункта
    getCurrentPageRole() {
        const path = window.location.pathname;
        if (path.includes('designer')) return 'designer';
        if (path.includes('measurer')) return 'measurer';
        if (path.includes('technologist')) return 'technologist';
        if (path.includes('supplier')) return 'supplier';
        if (path.includes('production')) return 'production';
        if (path.includes('installer')) return 'installation';
        if (path.includes('manager')) return 'manager';
        if (path.includes('profile')) return 'profile';
        return null;
    },

    // Рендер динамических ссылок в сайдбаре
    renderRoleLinks() {
        const container = document.getElementById('roleLinks');
        const mobileNav = document.querySelector('.bottom-nav');

        if (!container || !window.router) return;

        const roles = window.CURRENT_USER_ROLES || [];
        const currentRole = this.getCurrentPageRole();
        const pages = router.getAllowedPages(roles);

        // Определяем, в папке pages мы или нет
        const inPagesFolder = window.location.pathname.includes('/pages/');

        let html = '';
        pages.forEach(p => {
            const isActive = p.role === currentRole ||
                (currentRole === 'manager' && p.role === 'owner');
            const activeClass = isActive ? ' active' : '';

            // Корректируем путь
            const href = inPagesFolder ? p.page.replace('pages/', '') : p.page;

            html += `<div class="nav-item${activeClass}" onclick="location.href='${href}'" title="${p.name}">
                <i class="${this.getIcon(p.role)}"></i> <span class="nav-text">${p.name}</span>
            </div>`;
        });

        container.innerHTML = html;

        // Обновляем мобильную навигацию
        if (mobileNav && pages.length > 0) {
            this.renderMobileNav(pages, currentRole, inPagesFolder);
        }
    },

    // Рендер мобильной навигации (максимум 4 пункта)
    renderMobileNav(pages, currentRole, inPagesFolder) {
        const mobileNav = document.querySelector('.bottom-nav');
        if (!mobileNav) return;

        // Берём до 3 ролей + профиль
        const items = pages.slice(0, 3);

        let html = '';
        items.forEach(p => {
            const isActive = p.role === currentRole;
            const activeClass = isActive ? ' active' : '';
            const href = inPagesFolder ? p.page.replace('pages/', '') : p.page;

            html += `<div class="b-item${activeClass}" onclick="location.href='${href}'">
                <i class="${this.getIcon(p.role)}"></i>
                <span>${p.name}</span>
            </div>`;
        });

        // Добавляем профиль
        const profileHref = inPagesFolder ? 'profile.html' : 'pages/profile.html';
        const profileActive = currentRole === 'profile' ? ' active' : '';
        html += `<div class="b-item${profileActive}" onclick="location.href='${profileHref}'">
            <i class="fas fa-user"></i>
            <span>Профиль</span>
        </div>`;

        mobileNav.innerHTML = html;
    },

    // Инициализация (вызывать после initSession)
    init() {
        console.log('📱 Sidebar init...');
        this.renderRoleLinks();
    }
};

console.log("✅ sidebar.js loaded");

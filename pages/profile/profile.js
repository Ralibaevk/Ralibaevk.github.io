/**
 * Profile Page - User Personal Dashboard
 * Combines profile, portfolio, orders, finances, companies management
 */

import { getCurrentUser, getCurrentRole, switchRole, getAvailableRoles, ROLES } from '../../api/auth-service.js';
import { router } from '../../router/router.js';
import { renderOrdersSection, bindOrdersEvents } from './orders/orders.js';
import { renderPortfolioSection, bindPortfolioEvents } from './portfolio/portfolio.js';
import { renderCompaniesSection, bindCompaniesEvents, getInvitations } from './companies/companies.js';

let container = null;
let activeSection = 'home'; // home, orders, portfolio, companies, finances, settings

// Role accent colors matching the design spec
const ROLE_COLORS = {
    designer: '#AF52DE',
    technologist: '#007AFF',
    assembler: '#32ADE6',
    production: '#34C759',
    supply: '#FF9500',
    executive: '#8E8E93'
};

// Mock user data
const USER_DATA = {
    name: 'Ратмир Абдуллин',
    username: '@ratmir',
    avatar: 'РА',
    rating: 4.8,
    reviewsCount: 24,
    level: 'Senior специалист',
    city: 'Астана, Казахстан',
    activeProjects: 5,
    monthlyEarnings: 850000,
    earningsChange: 12,
    completedProjects: 127
};

// Mock projects
const MOCK_PROJECTS = [
    { id: 'p1', title: 'Кухня для квартиры в ЖК "Астана"', company: 'Mebel Studio', role: 'Технолог', progress: 65, deadline: '2026-01-28', payment: 120000, status: 'active' },
    { id: 'p2', title: 'Гардеробная система "Модерн"', company: 'KitchenPro', role: 'Технолог', progress: 40, deadline: '2026-02-05', payment: 85000, status: 'active' },
    { id: 'p3', title: 'Офисная мебель ТехноПарк', company: 'Design Masters', role: 'Консультант', progress: 90, deadline: '2026-01-20', payment: 200000, status: 'active' },
    { id: 'p4', title: 'Спальня "Скандинавия"', company: 'Mebel Studio', role: 'Технолог', progress: 100, deadline: '2026-01-10', payment: 95000, status: 'completed' },
    { id: 'p5', title: 'Детская комната', company: 'KitchenPro', role: 'Технолог', progress: 100, deadline: '2026-01-05', payment: 70000, status: 'completed' }
];

// Mock notifications
const MOCK_NOTIFICATIONS = [
    { id: 'n1', type: 'order', title: 'Новый заказ: Деталировка кухни', time: '5 мин', read: false },
    { id: 'n2', type: 'invite', title: 'Компания MebelPro пригласила вас', time: '1 час', read: false },
    { id: 'n3', type: 'deadline', title: 'Дедлайн через 2 дня: Проект #445', time: '3 часа', read: false },
    { id: 'n4', type: 'comment', title: 'Новый комментарий к проекту', time: '5 часов', read: true },
    { id: 'n5', type: 'payment', title: 'Оплата получена: 85 000 ₸', time: '1 день', read: true }
];

// Mock tasks
const MOCK_TASKS = [
    { id: 't1', title: 'Завершить деталировку кухни #445', deadline: '17:00', company: 'Mebel Studio', done: false },
    { id: 't2', title: 'Замер в ЖК "Астана"', deadline: '18:00', company: 'KitchenPro', done: false },
    { id: 't3', title: 'Отправить карту раскроя', deadline: null, company: null, done: true }
];

// Mock news
const MOCK_NEWS = [
    { id: 'news1', title: 'Обновление: новый модуль для дизайнеров', date: '12 января 2026', image: null },
    { id: 'news2', title: 'Вебинар: Оптимизация раскроя ЛДСП', date: '15 января 2026', image: null }
];

/**
 * Mount the profile page
 */
export async function mount(parentContainer) {
    container = parentContainer;
    render();
    bindEvents();
}

/**
 * Unmount the page
 */
export function unmount() {
    container = null;
}

/**
 * Render the profile page
 */
function render() {
    const user = getCurrentUser();
    const role = getCurrentRole();
    const roleColor = ROLE_COLORS[role] || ROLE_COLORS.executive;

    container.innerHTML = `
        <div class="profile-page">
            <!-- Left Sidebar -->
            <aside class="profile-sidebar">
                <div class="sidebar-user-card">
                    <div class="user-avatar-large" style="background: ${roleColor}">${USER_DATA.avatar}</div>
                    <div class="user-info">
                        <div class="user-name">${USER_DATA.name}</div>
                        <div class="user-meta">${USER_DATA.username} • ${getRoleLabel(role)}</div>
                        <div class="user-rating">
                            <span class="rating-star">⭐</span>
                            <span class="rating-value">${USER_DATA.rating}</span>
                            <span class="rating-count">(${USER_DATA.reviewsCount} отзывов)</span>
                        </div>
                    </div>
                </div>

                <nav class="sidebar-nav">
                    <button class="nav-item ${activeSection === 'home' ? 'active' : ''}" data-section="home">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <polyline points="9,22 9,12 15,12 15,22"/>
                        </svg>
                        <span>Главная</span>
                    </button>
                    <button class="nav-item ${activeSection === 'orders' ? 'active' : ''}" data-section="orders">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        <span>Заказы</span>
                        <span class="nav-badge">3</span>
                    </button>
                    <button class="nav-item ${activeSection === 'portfolio' ? 'active' : ''}" data-section="portfolio">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                        </svg>
                        <span>Портфолио</span>
                    </button>
                    <button class="nav-item ${activeSection === 'companies' ? 'active' : ''}" data-section="companies">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <rect x="9" y="14" width="6" height="8"/>
                        </svg>
                        <span>Компании</span>
                        <span class="nav-badge">2</span>
                    </button>
                    <button class="nav-item ${activeSection === 'finances' ? 'active' : ''}" data-section="finances">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                            <line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                        <span>Финансы</span>
                    </button>
                    <button class="nav-item ${activeSection === 'calendar' ? 'active' : ''}" data-section="calendar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>Календарь</span>
                    </button>
                </nav>

                <div class="sidebar-nav-bottom">
                    <button class="nav-item ${activeSection === 'settings' ? 'active' : ''}" data-section="settings">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                        </svg>
                        <span>Настройки</span>
                    </button>
                    <button class="nav-item" data-action="help">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span>Помощь</span>
                    </button>
                </div>
            </aside>

            <!-- Main Content Area -->
            <main class="profile-main">
                ${renderMainContent()}
            </main>

            <!-- Right Panel -->
            <aside class="profile-right-panel">
                ${renderRightPanel()}
            </aside>
        </div>
    `;
}

/**
 * Render main content based on active section
 */
function renderMainContent() {
    switch (activeSection) {
        case 'home':
            return renderHomeSection();
        case 'orders':
            return renderOrdersSectionContent();
        case 'portfolio':
            return renderPortfolioSectionContent();
        case 'companies':
            return renderCompaniesSectionContent();
        case 'finances':
            return renderFinancesSection();
        case 'settings':
            return renderSettingsSection();
        default:
            return renderHomeSection();
    }
}

/**
 * Render Home section
 */
function renderHomeSection() {
    const activeProjects = MOCK_PROJECTS.filter(p => p.status === 'active');

    return `
        <!-- Welcome Block -->
        <div class="welcome-block">
            <h1 class="welcome-title">Добрый день, ${USER_DATA.name.split(' ')[0]}! 👋</h1>
            <p class="welcome-subtitle">У вас ${activeProjects.length} активных проектов и 2 приглашения в команды</p>
        </div>

        <!-- Metrics Row -->
        <div class="metrics-row">
            <div class="metric-card">
                <div class="metric-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                    </svg>
                </div>
                <div class="metric-content">
                    <div class="metric-value">${USER_DATA.activeProjects} шт.</div>
                    <div class="metric-label">Активные проекты</div>
                </div>
                <div class="metric-mini-list">
                    ${activeProjects.slice(0, 2).map(p => `<div class="mini-project">${p.title.slice(0, 25)}...</div>`).join('')}
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                </div>
                <div class="metric-content">
                    <div class="metric-value">${formatCurrency(USER_DATA.monthlyEarnings)}</div>
                    <div class="metric-label">Доход январь 2026</div>
                </div>
                <div class="metric-change positive">+${USER_DATA.earningsChange}%</div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                    </svg>
                </div>
                <div class="metric-content">
                    <div class="metric-value">${USER_DATA.rating} ⭐</div>
                    <div class="metric-label">На основе ${USER_DATA.reviewsCount} отзывов</div>
                </div>
                <div class="metric-progress">
                    <div class="progress-bar"><div class="progress-fill" style="width: ${(USER_DATA.rating / 5) * 100}%"></div></div>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22,4 12,14.01 9,11.01"/>
                    </svg>
                </div>
                <div class="metric-content">
                    <div class="metric-value">${USER_DATA.completedProjects}</div>
                    <div class="metric-label">Завершено проектов</div>
                </div>
                <div class="metric-badge">${USER_DATA.level}</div>
            </div>
        </div>

        <!-- Projects Section -->
        <div class="projects-section">
            <div class="section-header">
                <h2 class="section-title">Мои проекты</h2>
                <div class="section-actions">
                    <select class="filter-select">
                        <option value="all">Все</option>
                        <option value="active" selected>Активные</option>
                        <option value="completed">Завершенные</option>
                    </select>
                    <button class="btn-primary" id="btn-open-kanban">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        Открыть доску
                    </button>
                </div>
            </div>

            <div class="project-tabs">
                <button class="project-tab active" data-filter="all">Все (${MOCK_PROJECTS.length})</button>
                <button class="project-tab" data-filter="active">Активные (${activeProjects.length})</button>
                <button class="project-tab" data-filter="waiting">Ожидают старта (0)</button>
                <button class="project-tab" data-filter="completed">Завершенные (${MOCK_PROJECTS.filter(p => p.status === 'completed').length})</button>
            </div>

            <div class="profile-projects-grid">
                ${activeProjects.map(project => renderProjectCard(project)).join('')}
            </div>
        </div>
    `;
}

/**
 * Render project card
 */
function renderProjectCard(project) {
    const statusLabels = {
        active: 'В работе',
        completed: 'Завершён',
        waiting: 'Ожидает'
    };

    const statusColors = {
        active: '#007AFF',
        completed: '#34C759',
        waiting: '#FF9500'
    };

    const icons = {
        'Технолог': '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>',
        'Консультант': '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
        'Дизайнер': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'
    };

    return `
        <div class="project-card" data-project-id="${project.id}" data-status="${project.status}">
            <div class="card-status status-${project.status}" style="background: ${statusColors[project.status]}15; color: ${statusColors[project.status]}">${statusLabels[project.status]}</div>
            <div class="card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    ${icons[project.role] || icons['Технолог']}
                </svg>
            </div>
            <div class="card-id">ID: ${project.id.toUpperCase()}</div>
            <h4 class="card-title">${project.title}</h4>
            <p class="card-description">${project.company} • ${project.role}</p>
            <div class="card-progress">
                <span class="progress-label">Прогресс</span>
                <span class="progress-value">${project.progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${project.progress}%"></div>
            </div>
            <div class="card-footer">
                <span class="card-deadline">${formatDate(project.deadline)}</span>
                <span class="card-payment">${formatCurrency(project.payment)}</span>
            </div>
        </div>
    `;
}


/**
 * Render Orders section - uses orders module
 */
function renderOrdersSectionContent() {
    return renderOrdersSection();
}

/**
 * Render Portfolio section - uses portfolio module
 */
function renderPortfolioSectionContent() {
    return renderPortfolioSection();
}

/**
 * Render Companies section - uses companies module
 */
function renderCompaniesSectionContent() {
    return renderCompaniesSection();
}

/**
 * Render Finances section (placeholder)
 */
function renderFinancesSection() {
    return `
        <div class="section-placeholder">
            <h2>Финансы</h2>
            <p>Раздел находится в разработке</p>
        </div>
    `;
}

/**
 * Render Settings section (placeholder)
 */
function renderSettingsSection() {
    return `
        <div class="section-placeholder">
            <h2>Настройки</h2>
            <p>Раздел находится в разработке</p>
        </div>
    `;
}

/**
 * Render Right Panel
 */
function renderRightPanel() {
    return `
        <!-- Notifications -->
        <div class="right-panel-block">
            <div class="block-header">
                <h3>Уведомления (${MOCK_NOTIFICATIONS.filter(n => !n.read).length})</h3>
                <button class="link-btn">Все прочитано</button>
            </div>
            <div class="notifications-list">
                ${MOCK_NOTIFICATIONS.slice(0, 4).map(notification => renderNotification(notification)).join('')}
            </div>
        </div>

        <!-- News -->
        <div class="right-panel-block">
            <div class="block-header">
                <h3>📰 Новости Logiqa</h3>
            </div>
            <div class="news-list">
                ${MOCK_NEWS.map(news => `
                    <div class="news-item">
                        <div class="news-title">${news.title}</div>
                        <div class="news-date">${news.date}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Tasks -->
        <div class="right-panel-block">
            <div class="block-header">
                <h3>📋 Задачи на сегодня (${MOCK_TASKS.filter(t => !t.done).length})</h3>
                <button class="link-btn">+ Добавить</button>
            </div>
            <div class="tasks-list">
                ${MOCK_TASKS.map(task => `
                    <div class="task-item ${task.done ? 'done' : ''}">
                        <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''} data-task-id="${task.id}">
                        <div class="task-content">
                            <div class="task-title">${task.title}</div>
                            ${task.deadline ? `<div class="task-meta">До ${task.deadline} • ${task.company}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Mini Calendar -->
        <div class="right-panel-block">
            <div class="block-header">
                <h3>📅 Январь 2026</h3>
            </div>
            <div class="mini-calendar">
                <div class="calendar-events">
                    <div class="event-item">
                        <span class="event-time">14:00</span>
                        <span class="event-title">Созвон с заказчиком</span>
                    </div>
                    <div class="event-item">
                        <span class="event-time">18:00</span>
                        <span class="event-title">Замер в ЖК "Астана"</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render notification item
 */
function renderNotification(notification) {
    const typeColors = {
        order: '#34C759',
        invite: '#007AFF',
        deadline: '#FFCC00',
        comment: '#FF9500',
        payment: '#AF52DE',
        alert: '#FF3B30'
    };

    return `
        <div class="notification-item ${notification.read ? 'read' : ''}">
            <div class="notification-dot" style="background: ${typeColors[notification.type] || '#8E8E93'}"></div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-time">${notification.time} назад</div>
            </div>
        </div>
    `;
}

/**
 * Bind event handlers
 */
function bindEvents() {
    // Navigation items
    container.querySelectorAll('.nav-item[data-section]').forEach(btn => {
        btn.addEventListener('click', () => {
            activeSection = btn.dataset.section;
            render();
            bindEvents();
        });
    });

    // Open Board button - navigate to executive dashboard
    const kanbanBtn = container.querySelector('#btn-open-kanban');
    if (kanbanBtn) {
        kanbanBtn.addEventListener('click', () => {
            router.navigate('/executive');
        });
    }

    // Project cards
    container.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', () => {
            // Navigate to project or show modal
            console.log('Project clicked:', card.dataset.projectId);
        });
    });

    // Task checkboxes
    container.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const taskId = e.target.dataset.taskId;
            const task = MOCK_TASKS.find(t => t.id === taskId);
            if (task) {
                task.done = e.target.checked;
                e.target.closest('.task-item').classList.toggle('done', task.done);
            }
        });
    });

    // Orders section events
    if (activeSection === 'orders') {
        bindOrdersEvents(container);
    }

    // Portfolio section events
    if (activeSection === 'portfolio') {
        bindPortfolioEvents(container);
    }

    // Companies section events
    if (activeSection === 'companies') {
        bindCompaniesEvents(container);
    }
}

/**
 * Helper: Get role label
 */
function getRoleLabel(role) {
    const labels = {
        executive: 'Руководитель',
        designer: 'Дизайнер',
        technologist: 'Технолог',
        supply: 'Снабжение',
        production: 'Производство',
        assembler: 'Сборщик'
    };
    return labels[role] || role;
}

/**
 * Helper: Format currency
 */
function formatCurrency(value) {
    return value.toLocaleString('ru-RU') + ' ₸';
}

/**
 * Helper: Format date
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

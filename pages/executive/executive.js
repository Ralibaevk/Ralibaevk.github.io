/**
 * Executive Dashboard - Панель управления руководителя
 * Визуализация всех проектов, KPI метрик и активности
 */

import { getCurrentUser, getCurrentRole, switchRole, getAvailableRoles, ROLES } from '../../api/auth-service.js';
import { router } from '../../router/router.js';
import { showProjectModal } from '../../components/project-modal.js';

let container = null;

// Executive Kanban columns (7 stages)
const EXECUTIVE_COLUMNS = [
    { id: 'design', title: 'Дизайн', color: '#AF52DE', icon: 'palette' },
    { id: 'measurement', title: 'Замер', color: '#FF9500', icon: 'ruler' },
    { id: 'detailing', title: 'Деталировка', color: '#007AFF', icon: 'grid' },
    { id: 'procurement', title: 'Закуп', color: '#5856D6', icon: 'package' },
    { id: 'production', title: 'Производство', color: '#34C759', icon: 'factory' },
    { id: 'assembly', title: 'Монтаж', color: '#32ADE6', icon: 'tool' },
    { id: 'handover', title: 'Сдача', color: '#28A745', icon: 'check' }
];

// Mock KPI data
const KPI_DATA = {
    totalSum: { value: '12 450 000 ₸', change: '+15%', trend: 'positive', label: 'Общая сумма проектов' },
    inProgress: { value: '8 шт.', change: 'из 12 активных', trend: 'neutral', label: 'В работе' },
    costs: { value: '3 200 000 ₸', change: '64% бюджета', trend: 'neutral', label: 'Затраты за месяц' },
    cash: { value: '5 800 000 ₸', change: '+8%', trend: 'positive', label: 'Доступные средства' }
};

// Mock projects for executive view
const MOCK_PROJECTS = [
    { id: 'p1', number: '#501', title: 'Кухня "Модерн"', description: 'Угловая кухня с островом, фасады МДФ эмаль', columnId: 'design', progress: 15, sum: '1 850 000 ₸', assignees: ['СМ'], deadline: '2026-02-15' },
    { id: 'p2', number: '#498', title: 'Гардеробная', description: 'Встроенная система хранения 12м²', columnId: 'measurement', progress: 25, sum: '680 000 ₸', assignees: ['ИП'], deadline: '2026-02-01' },
    { id: 'p3', number: '#495', title: 'Офис "ТехноПарк"', description: 'Рабочие места 24 шт., ресепшн', columnId: 'detailing', progress: 45, sum: '4 200 000 ₸', assignees: ['АВ', 'СМ'], deadline: '2026-01-28' },
    { id: 'p4', number: '#492', title: 'Спальня "Скандинавия"', description: 'Кровать, шкаф, комод, тумбы', columnId: 'procurement', progress: 60, sum: '920 000 ₸', assignees: ['МК'], deadline: '2026-01-25' },
    { id: 'p5', number: '#488', title: 'Детская комната', description: 'Двухъярусная кровать, стол, шкаф', columnId: 'production', progress: 75, sum: '450 000 ₸', assignees: ['ДЛ'], deadline: '2026-01-22' },
    { id: 'p6', number: '#485', title: 'Прихожая', description: 'Шкаф-купе с зеркалом, банкетка', columnId: 'assembly', progress: 90, sum: '320 000 ₸', assignees: ['ИП'], deadline: '2026-01-20' },
    { id: 'p7', number: '#480', title: 'Кабинет руководителя', description: 'Стол, шкафы, кресла', columnId: 'handover', progress: 98, sum: '1 100 000 ₸', assignees: ['РА'], deadline: '2026-01-18' },
    { id: 'p8', number: '#503', title: 'Гостиная "Лофт"', description: 'ТВ-зона, стеллажи, журнальный стол', columnId: 'design', progress: 10, sum: '780 000 ₸', assignees: ['СМ'], deadline: '2026-02-20' },
    { id: 'p9', number: '#490', title: 'Ванная комната', description: 'Тумба под раковину, пенал', columnId: 'production', progress: 80, sum: '280 000 ₸', assignees: ['ДЛ'], deadline: '2026-01-21' }
];

// Mock activity feed
const MOCK_ACTIVITY = [
    { type: 'comment', title: 'Комментарий к #495', time: '5 мин', author: 'Сергей М.', detail: '«Уточните размеры ниши под технику»' },
    { type: 'status', title: 'Статус изменён #488', time: '15 мин', author: 'Система', detail: 'Производство → Сборка' },
    { type: 'alert', title: 'Дефицит материала', time: '1 час', author: 'Склад', detail: 'ЛДСП Дуб Галифакс - осталось 2 листа' },
    { type: 'file', title: 'Новый чертёж #492', time: '2 часа', author: 'Алексей В.', detail: null },
    { type: 'complete', title: 'Проект #480 завершён', time: '3 часа', author: 'Иван П.', detail: 'Готов к сдаче клиенту' },
    { type: 'payment', title: 'Оплата получена #485', time: '4 часа', author: 'Бухгалтерия', detail: '160 000 ₸ (50%)' }
];

/**
 * Mount the executive dashboard
 */
export async function mount(parentContainer) {
    container = parentContainer;
    const user = getCurrentUser() || { name: 'Гость', initials: 'Г' };

    container.innerHTML = `
        <div class="executive-page">
            <!-- Header -->
            <header class="executive-header">
                <div class="logo">
                    <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v12M6 12h12"/>
                    </svg>
                    <span class="logo-text">LOGIQA МЕБЕЛЬНЫЕ ТЕХНОЛОГИИ</span>
                </div>
                <div class="header-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input type="text" placeholder="Поиск проектов..." id="search-input">
                </div>
                <div class="header-actions">
                    <div class="role-switcher">
                        <span class="role-label">Роль:</span>
                        <select id="role-select" class="role-select">
                            ${getAvailableRoles().map(r => `
                                <option value="${r.id}" ${r.id === 'executive' ? 'selected' : ''}>${r.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <button class="icon-btn" title="Уведомления">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 01-3.46 0"/>
                        </svg>
                        <span class="notification-badge">3</span>
                    </button>
                    <div class="user-profile" id="user-profile-link" style="cursor: pointer;" title="Личный кабинет">
                        <span class="user-name">${user.name}</span>
                        <div class="user-avatar">${user.initials}</div>
                    </div>
                </div>
            </header>

            <div class="executive-layout">
                <!-- Main Content -->
                <main class="executive-main">
                    <!-- Page Title -->
                    <div class="page-title-row">
                        <h1 class="page-title">Панель руководителя</h1>
                        <div class="title-actions">
                            <button class="btn-secondary" id="btn-export">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                    <polyline points="7,10 12,15 17,10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                Экспорт
                            </button>
                            <button class="btn-primary" id="btn-new-project">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 5v14M5 12h14"/>
                                </svg>
                                Новый проект
                            </button>
                        </div>
                    </div>

                    <!-- KPI Cards -->
                    <div class="kpi-row">
                        ${renderKpiCard('totalSum', 'document')}
                        ${renderKpiCard('inProgress', 'activity')}
                        ${renderKpiCard('costs', 'trending-down')}
                        ${renderKpiCard('cash', 'wallet')}
                    </div>

                    <!-- Kanban Board -->
                    <div class="kanban-section">
                        <div class="kanban-header-row">
                            <h2 class="section-title">Проекты по этапам</h2>
                            <select class="sort-select" id="sort-select">
                                <option value="deadline">По дедлайну</option>
                                <option value="sum">По сумме</option>
                                <option value="progress">По прогрессу</option>
                            </select>
                        </div>
                        <div class="kanban-board-wrapper">
                            <div class="kanban-board">
                                ${EXECUTIVE_COLUMNS.map(col => renderColumn(col)).join('')}
                            </div>
                        </div>
                    </div>
                </main>

                <!-- Activity Sidebar -->
                <aside class="activity-sidebar">
                    <div class="activity-header">
                        <h3>ЛЕНТА СОБЫТИЙ</h3>
                        <a href="#" class="view-all">Все</a>
                    </div>
                    <div class="activity-filters">
                        <button class="activity-filter active" data-filter="all">Все</button>
                        <button class="activity-filter" data-filter="comment">Комментарии</button>
                        <button class="activity-filter" data-filter="status">Статусы</button>
                        <button class="activity-filter" data-filter="alert">Важное</button>
                    </div>
                    <div class="activity-list">
                        ${MOCK_ACTIVITY.map(item => renderActivityItem(item)).join('')}
                    </div>
                </aside>
            </div>
        </div>
    `;

    bindEvents();
}

/**
 * Unmount the page
 */
export function unmount() {
    container = null;
}

/**
 * Render KPI card
 */
function renderKpiCard(key, iconType) {
    const kpi = KPI_DATA[key];
    const icons = {
        document: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>',
        activity: '<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>',
        'trending-down': '<polyline points="23,18 13.5,8.5 8.5,13.5 1,6"/><polyline points="17,18 23,18 23,12"/>',
        wallet: '<path d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2z"/><path d="M16 12a2 2 0 100 .01"/>'
    };

    return `
        <div class="kpi-card">
            <div class="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    ${icons[iconType] || ''}
                </svg>
            </div>
            <div class="kpi-content">
                <div class="kpi-label">${kpi.label}</div>
                <div class="kpi-value">${kpi.value}</div>
            </div>
            <div class="kpi-change ${kpi.trend}">${kpi.change}</div>
        </div>
    `;
}

/**
 * Render Kanban column
 */
function renderColumn(column) {
    const projects = MOCK_PROJECTS.filter(p => p.columnId === column.id);
    const totalSum = projects.reduce((sum, p) => sum + parseInt(p.sum.replace(/\D/g, '')), 0);

    return `
        <div class="exec-kanban-column" data-column-id="${column.id}">
            <div class="column-header">
                <div class="column-color" style="background: ${column.color}"></div>
                <span class="column-title">${column.title}</span>
                <span class="column-count">${projects.length}</span>
            </div>
            <div class="column-sum">${formatCurrency(totalSum)}</div>
            <div class="column-cards">
                ${projects.map(p => renderProjectCard(p, column.color)).join('')}
                ${projects.length === 0 ? '<div class="empty-column">Нет проектов</div>' : ''}
            </div>
        </div>
    `;
}

/**
 * Render project card
 */
function renderProjectCard(project, columnColor) {
    return `
        <div class="exec-project-card" data-project-id="${project.id}">
            <div class="card-header">
                <span class="card-number">${project.number}</span>
                <span class="card-sum">${project.sum}</span>
            </div>
            <h4 class="card-title">${project.title}</h4>
            <p class="card-description">${project.description}</p>
            <div class="card-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.progress}%; background: ${columnColor}"></div>
                </div>
                <span class="progress-value">${project.progress}%</span>
            </div>
            <div class="card-footer">
                <div class="card-assignees">
                    ${project.assignees.map(a => `<div class="card-avatar">${a}</div>`).join('')}
                </div>
                <span class="card-deadline">${formatDate(project.deadline)}</span>
            </div>
        </div>
    `;
}

/**
 * Render activity item
 */
function renderActivityItem(item) {
    const typeColors = {
        comment: '#34C759',
        status: '#FFCC00',
        alert: '#FF3B30',
        file: '#007AFF',
        complete: '#34C759',
        payment: '#5856D6'
    };

    return `
        <div class="activity-item" data-type="${item.type}">
            <div class="activity-indicator" style="background: ${typeColors[item.type] || '#8E8E93'}"></div>
            <div class="activity-content">
                <div class="activity-title">${item.title}</div>
                <div class="activity-meta">${item.time} назад • ${item.author}</div>
                ${item.detail ? `<div class="activity-detail">${item.detail}</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Format currency
 */
function formatCurrency(value) {
    if (value === 0) return '0 ₸';
    return value.toLocaleString('ru-RU') + ' ₸';
}

/**
 * Format date
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

/**
 * Bind event handlers
 */
function bindEvents() {
    // Role switcher
    const roleSelect = document.getElementById('role-select');
    if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
            switchRole(e.target.value);
            if (e.target.value === 'executive') {
                mount(container);
            } else {
                router.navigate('/projects');
            }
        });
    }

    // User profile link - navigate to personal dashboard
    const userProfileLink = document.getElementById('user-profile-link');
    if (userProfileLink) {
        userProfileLink.addEventListener('click', () => {
            router.navigate('/profile');
        });
    }

    // Project cards
    document.querySelectorAll('.exec-project-card').forEach(card => {
        card.addEventListener('click', () => {
            const projectId = card.dataset.projectId;
            const project = MOCK_PROJECTS.find(p => p.id === projectId);
            if (project) {
                showProjectModal({
                    id: project.id,
                    number: project.number,
                    name: project.title,
                    description: project.description,
                    status: 'in_progress',
                    progress: project.progress,
                    deadline: project.deadline,
                    assignees: project.assignees,
                    icon: 'table'
                });
            }
        });
    });

    // Activity filters
    document.querySelectorAll('.activity-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.activity-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            filterActivity(filter);
        });
    });
}

/**
 * Filter activity items
 */
function filterActivity(filter) {
    document.querySelectorAll('.activity-item').forEach(item => {
        if (filter === 'all' || item.dataset.type === filter) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

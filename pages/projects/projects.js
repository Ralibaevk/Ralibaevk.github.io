/**
 * Projects Page - Универсальная панель управления
 * Адаптируется под роль пользователя (Дизайнер, Технолог, Снабжение, Сборка)
 */

import { getProjects, generateShareLink } from '../../api/api-client.js';
import { router } from '../../router/router.js';
import { showProjectModal } from '../../components/project-modal.js';
import { getCurrentUser, getCurrentRole, switchRole, getAvailableRoles, ROLES, getKanbanColumnsForRole } from '../../api/auth-service.js';

// Store projects for use in card click handler
let projectsData = [];

let container = null;

/**
 * Mount the projects page
 * @param {HTMLElement} parentContainer - Container to mount into
 */
export async function mount(parentContainer) {
    container = parentContainer;

    // Load projects data
    const projects = await getProjects();
    projectsData = projects;

    // Get current user and role
    const user = getCurrentUser();
    const role = getCurrentRole();
    const filterTabs = getFilterTabsForRole(role);
    const roleTitle = getRoleTitleLabel(role);

    // Render page
    container.innerHTML = `
        <div class="projects-page">
            <!-- Header -->
            <header class="projects-header">
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
                    <input type="text" placeholder="Поиск проектов, ID или клиентов..." id="search-input">
                </div>
                <div class="header-actions">
                    <!-- Role Switcher -->
                    <div class="role-switcher">
                        <span class="role-label">Роль:</span>
                        <select id="role-select" class="role-select">
                            ${getAvailableRoles().map(r => `
                                <option value="${r.id}" ${r.id === role ? 'selected' : ''}>${r.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <button class="icon-btn" title="Уведомления">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 01-3.46 0"/>
                        </svg>
                    </button>
                    <button class="icon-btn" title="Настройки">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                        </svg>
                    </button>
                    <div class="user-profile" id="user-profile-link" style="cursor: pointer;" title="Личный кабинет">
                        <span class="user-name">${user.name}</span>
                        <div class="user-avatar">${user.initials}</div>
                    </div>
                </div>
            </header>

            <div class="projects-layout">
                <!-- Main Content -->
                <main class="projects-main">
                    <!-- Page Title -->
                    <div class="page-title-row">
                        <h1 class="page-title">${roleTitle}</h1>
                    </div>

                    <!-- Stats Row -->
                    <div class="stats-row">
                        ${renderStatsForRole(role)}
                    </div>

                    <!-- Filters -->
                    <div class="projects-filters">
                        <div class="filter-tabs" id="filter-tabs">
                            ${filterTabs.map((tab, idx) => `
                                <button class="filter-tab ${idx === 0 ? 'active' : ''}" data-filter="${tab.id}">${tab.title}</button>
                            `).join('')}
                        </div>
                        <div class="filter-actions">
                            <select class="sort-select" id="sort-select">
                                <option value="deadline">По дедлайну</option>
                                <option value="progress">По прогрессу</option>
                                <option value="name">По названию</option>
                            </select>
                            <button class="btn-primary" id="btn-new-project">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 5v14M5 12h14"/>
                                </svg>
                                Новый
                            </button>
                        </div>
                    </div>

                    <!-- Project Cards Grid -->
                    <div class="projects-grid" id="projects-grid">
                        ${projects.map(p => renderProjectCard(p)).join('')}
                    </div>

                    <!-- Pagination -->
                    <div class="pagination">
                        <span class="pagination-info">Показано 1-${projects.length} из ${projects.length} проектов</span>
                        <div class="pagination-controls">
                            <button class="pagination-btn" disabled>‹ Назад</button>
                            <button class="pagination-btn">Вперёд ›</button>
                        </div>
                    </div>
                </main>

                <!-- Activity Sidebar -->
                <aside class="activity-sidebar">
                    <div class="activity-header">
                        <h3>ЛЕНТА СОБЫТИЙ</h3>
                        <a href="#" class="view-all">Все</a>
                    </div>
                    <div class="activity-list">
                        ${renderActivityItem('comment', 'Новый комментарий к чертежу #402', '2 мин', 'Сергей М.', '«Проверьте размеры соединений на подлокотнике.»')}
                        ${renderActivityItem('approved', 'Прототип дивана утверждён', '1 час', 'Система', null)}
                        ${renderActivityItem('alert', 'Дефицит материала', '3 часа', 'Склад', 'Тик - Сорт А')}
                        ${renderActivityItem('complete', 'CAD экспорт #405 готов', '5 часов', 'Авто-задача', null)}
                    </div>
                </aside>
            </div>
        </div>
    `;

    // Bind events
    bindEvents(projects);
}

/**
 * Unmount the page
 */
export function unmount() {
    container = null;
}

/**
 * Get filter tabs based on role
 */
function getFilterTabsForRole(role) {
    switch (role) {
        case ROLES.DESIGNER:
            return [
                { id: 'all', title: 'Все' },
                { id: 'drafting', title: 'Черновик' },
                { id: 'review', title: 'Согласование' },
                { id: 'sent', title: 'Передано' }
            ];
        case ROLES.TECHNOLOGIST:
            return [
                { id: 'all', title: 'Все' },
                { id: 'inbox', title: 'Входящие' },
                { id: 'in_progress', title: 'В работе' },
                { id: 'ready', title: 'Готово' }
            ];
        case ROLES.SUPPLY:
            return [
                { id: 'all', title: 'Все' },
                { id: 'to_order', title: 'К заказу' },
                { id: 'ordered', title: 'Заказано' },
                { id: 'received', title: 'Получено' }
            ];
        case ROLES.PRODUCTION:
            return [
                { id: 'all', title: 'Все' },
                { id: 'queue', title: 'В очереди' },
                { id: 'cutting', title: 'Раскрой' },
                { id: 'ready', title: 'На сборку' }
            ];
        case ROLES.ASSEMBLER:
            return [
                { id: 'all', title: 'Все' },
                { id: 'ready', title: 'К сборке' },
                { id: 'in_progress', title: 'В работе' },
                { id: 'done', title: 'Готово' }
            ];
        default:
            return [
                { id: 'all', title: 'Все проекты' },
                { id: 'in_progress', title: 'В работе' },
                { id: 'review', title: 'На проверке' },
                { id: 'completed', title: 'Завершённые' }
            ];
    }
}

/**
 * Get page title for role
 */
function getRoleTitleLabel(role) {
    const labels = {
        designer: 'Дизайн-проекты',
        technologist: 'Технологический контроль',
        supply: 'Закупки и снабжение',
        production: 'Производство',
        assembler: 'Сборка и монтаж'
    };
    return labels[role] || 'Проекты';
}

/**
 * Render stats cards for role
 */
function renderStatsForRole(role) {
    switch (role) {
        case ROLES.DESIGNER:
            return `
                ${renderStatCard('Новых проектов', '5 шт.', '+2', 'positive', 'output')}
                ${renderStatCard('На согласовании', '3 шт.', '0%', 'neutral', 'qc')}
                ${renderStatCard('Передано в цех', '8 шт.', '+15%', 'positive', 'efficiency')}
            `;
        case ROLES.TECHNOLOGIST:
            return `
                ${renderStatCard('Входящие', '4 шт.', '+1', 'neutral', 'output')}
                ${renderStatCard('В проверке', '2 шт.', '0%', 'neutral', 'qc')}
                ${renderStatCard('Готово к произв.', '6 шт.', '+25%', 'positive', 'efficiency')}
            `;
        case ROLES.SUPPLY:
            return `
                ${renderStatCard('К заказу', '12 поз.', '+3', 'neutral', 'output')}
                ${renderStatCard('Заказано', '8 поз.', '0%', 'neutral', 'qc')}
                ${renderStatCard('Получено', '45 поз.', '+20%', 'positive', 'efficiency')}
            `;
        case ROLES.PRODUCTION:
            return `
                ${renderStatCard('В очереди', '3 изд.', '0', 'neutral', 'output')}
                ${renderStatCard('На раскрое', '2 изд.', '0%', 'neutral', 'qc')}
                ${renderStatCard('Завершено', '18 изд.', '+12%', 'positive', 'efficiency')}
            `;
        case ROLES.ASSEMBLER:
            return `
                ${renderStatCard('К сборке', '2 изд.', '+1', 'neutral', 'output')}
                ${renderStatCard('В работе', '1 изд.', '0%', 'neutral', 'qc')}
                ${renderStatCard('Собрано', '14 изд.', '+8%', 'positive', 'efficiency')}
            `;
        default:
            return `
                ${renderStatCard('Выпуск за неделю', '12 шт.', '+12%', 'positive', 'output')}
                ${renderStatCard('На проверке', '4 шт.', '0%', 'neutral', 'qc')}
                ${renderStatCard('Эффективность', '94%', '+2%', 'positive', 'efficiency')}
            `;
    }
}

/**
 * Render stat card HTML
 */
function renderStatCard(title, value, change, trend, icon) {
    const icons = {
        output: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>',
        qc: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/>',
        efficiency: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'
    };

    return `
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    ${icons[icon] || ''}
                </svg>
            </div>
            <div class="stat-change ${trend}">${change}</div>
            <div class="stat-label">${title}</div>
            <div class="stat-value">${value}</div>
        </div>
    `;
}

/**
 * Render project card HTML
 */
function renderProjectCard(project) {
    const statusLabels = {
        in_progress: 'В работе',
        review: 'Проверка',
        drafting: 'Черновик',
        production: 'Производство',
        completed: 'Завершён'
    };

    const icons = {
        chair: '<path d="M5 11V6a1 1 0 011-1h12a1 1 0 011 1v5M5 11h14M5 11v8M19 11v8M8 19h8"/>',
        sofa: '<rect x="2" y="8" width="20" height="8" rx="2"/><path d="M4 8V6a2 2 0 012-2h12a2 2 0 012 2v2M6 16v3M18 16v3"/>',
        table: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12M19 8v12M8 16h8"/>',
        lamp: '<path d="M9 18h6M10 22h4M12 2l4 8H8l4-8z"/>',
        bookcase: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 9h16M4 15h16M9 9v6"/>'
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    };

    return `
        <div class="project-card" data-id="${project.id}" data-status="${project.status}">
            <div class="card-status status-${project.status}">${statusLabels[project.status]}</div>
            <div class="card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    ${icons[project.icon] || icons.table}
                </svg>
            </div>
            <button class="card-menu-btn" title="Ещё">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="6" r="1.5"/>
                    <circle cx="12" cy="12" r="1.5"/>
                    <circle cx="12" cy="18" r="1.5"/>
                </svg>
            </button>
            <div class="card-id">ID: ${project.number}</div>
            <h4 class="card-title">${project.name}</h4>
            <p class="card-description">${project.description}</p>
            <div class="card-progress">
                <span class="progress-label">Прогресс</span>
                <span class="progress-value">${project.progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${project.progress}%"></div>
            </div>
            <div class="card-footer">
                <div class="card-assignees">
                    ${project.assignees.map(a => `<div class="assignee-avatar">${a}</div>`).join('')}
                </div>
                <div class="card-deadline">${formatDate(project.deadline)}</div>
            </div>
        </div>
    `;
}

/**
 * Render activity item HTML
 */
function renderActivityItem(type, title, time, author, detail) {
    const icons = {
        comment: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8M8 8h8M8 16h4"/>',
        approved: '<circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>',
        alert: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
        complete: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
    };

    return `
        <div class="activity-item">
            <div class="activity-icon ${type}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${icons[type]}
                </svg>
            </div>
            <div class="activity-content">
                <div class="activity-title">${title}</div>
                <div class="activity-meta">${time} назад • ${author}</div>
                ${detail ? `<div class="activity-detail">${detail}</div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Bind event handlers
 */
function bindEvents(projects) {
    // Role switcher
    const roleSelect = document.getElementById('role-select');
    if (roleSelect) {
        roleSelect.addEventListener('change', async (e) => {
            switchRole(e.target.value);
            // Navigate to executive page or re-mount for other roles
            if (e.target.value === 'executive') {
                router.navigate('/executive');
            } else {
                await mount(container);
            }
        });
    }

    // Project card clicks - show modal
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-menu-btn')) return;
            const projectId = card.dataset.id;
            const project = projectsData.find(p => p.id === projectId);
            if (project) {
                showProjectModal(project);
            }
        });
    });

    // Card menu (share links)
    document.querySelectorAll('.card-menu-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = btn.closest('.project-card');
            const projectId = card.dataset.id;

            // Show context menu
            showCardMenu(btn, projectId);
        });
    });

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.filter;
            filterProjects(filter);
        });
    });

    // Search
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        searchProjects(query);
    });

    // User profile link - navigate to personal cabinet
    const userProfileLink = document.getElementById('user-profile-link');
    if (userProfileLink) {
        userProfileLink.addEventListener('click', () => {
            router.navigate('/profile');
        });
    }
}

/**
 * Filter projects by status
 */
function filterProjects(status) {
    document.querySelectorAll('.project-card').forEach(card => {
        if (status === 'all' || card.dataset.status === status) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Search projects
 */
function searchProjects(query) {
    document.querySelectorAll('.project-card').forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const desc = card.querySelector('.card-description').textContent.toLowerCase();
        const id = card.querySelector('.card-id').textContent.toLowerCase();

        if (title.includes(query) || desc.includes(query) || id.includes(query)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Show card context menu
 */
function showCardMenu(button, projectId) {
    // Remove existing menu
    document.querySelector('.card-context-menu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'card-context-menu';
    menu.innerHTML = `
        <button class="menu-item" data-action="open">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Открыть проект
        </button>
        <button class="menu-item" data-action="viewer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            3D просмотр
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item" data-action="supply-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Ссылка для снабженца
        </button>
        <button class="menu-item" data-action="assembly-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Ссылка для сборщика
        </button>
    `;

    // Position menu
    const rect = button.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left - 140}px`;

    document.body.appendChild(menu);

    // Handle menu actions
    menu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', async () => {
            const action = item.dataset.action;

            switch (action) {
                case 'open':
                    router.navigate(`/project/${projectId}`);
                    break;
                case 'viewer':
                    router.navigate(`/project/${projectId}/viewer`);
                    break;
                case 'supply-link':
                    const supplyLink = await generateShareLink(projectId, 'supply');
                    await navigator.clipboard.writeText(supplyLink);
                    showToast('Ссылка скопирована');
                    break;
                case 'assembly-link':
                    const assemblyLink = await generateShareLink(projectId, 'assembly');
                    await navigator.clipboard.writeText(assemblyLink);
                    showToast('Ссылка скопирована');
                    break;
            }

            menu.remove();
        });
    });

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function handler(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', handler);
            }
        });
    }, 0);
}

/**
 * Show toast notification
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

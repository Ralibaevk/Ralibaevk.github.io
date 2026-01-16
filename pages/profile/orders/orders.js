/**
 * Orders Section Module
 * Implements 5 tabs: Order Feed, My Applications, Saved, My Orders, Specialists
 */

import {
    getOrdersFeed,
    getRecommendedOrders,
    getOrderById,
    getMyApplications,
    getApplicationsStats,
    getSavedOrders,
    toggleSaveOrder,
    getMyOrders,
    getSpecialists,
    applyToOrder,
    createOrder,
    getOrderTypes,
    getBudgetRanges,
    getDeadlineOptions,
    getSpecialistRoles,
    formatTimeAgo,
    formatCurrency,
    formatBudgetRange,
    getWorkFormatLabel,
    getOrderTypeLabel
} from '../../../api/orders-service.js';

// State
let activeTab = 'feed';
let quickFilter = 'all'; // 'all', 'urgent', 'highBudget', 'myCity', 'verified', 'newLast24h'
let dropdownFilters = {
    orderType: 'all',
    budgetRange: 'all',
    deadline: 'all',
    workFormat: 'all'
};
let sortBy = 'date_desc';
let applicationStatusFilter = 'all';
let myOrdersStatusFilter = 'all';
let specialistsFilters = {
    role: 'all',
    city: 'all',
    minRating: null
};

const USER_CITY = 'Астана'; // Mock current user city

/**
 * Render the Orders section
 */
export function renderOrdersSection() {
    return `
        <div class="orders-section">
            ${renderTabsHeader()}
            <div class="orders-content">
                ${renderTabContent()}
            </div>
        </div>
    `;
}

/**
 * Render tabs header
 */
function renderTabsHeader() {
    const stats = getApplicationsStats();
    const savedCount = getSavedOrders().length;
    const myOrdersCount = getMyOrders().length;

    return `
        <div class="orders-tabs-header">
            <div class="orders-tabs-list">
                <button class="orders-tab ${activeTab === 'feed' ? 'active' : ''}" data-tab="feed">
                    Лента заказов
                </button>
                <button class="orders-tab ${activeTab === 'myOrders' ? 'active' : ''}" data-tab="myOrders">
                    Мои заказы
                    <span class="orders-tab-badge">${myOrdersCount}</span>
                </button>
                <button class="orders-tab ${activeTab === 'specialists' ? 'active' : ''}" data-tab="specialists">
                    Специалисты
                </button>
            </div>
            <button class="orders-create-btn" id="btn-create-order">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                </svg>
                Создать заказ
            </button>
        </div>
    `;
}

/**
 * Render tab content based on active tab
 */
function renderTabContent() {
    switch (activeTab) {
        case 'feed':
            return renderOrderFeedTab();
        case 'myOrders':
            return renderMyOrdersTab();
        case 'specialists':
            return renderSpecialistsTab();
        default:
            return renderOrderFeedTab();
    }
}

function renderOrderFeedTab() {
    const stats = getApplicationsStats();
    const savedOrders = getSavedOrders();
    const applications = getMyApplications(applicationStatusFilter);

    // Handle special filters for applications and saved
    if (quickFilter === 'myApplications') {
        return `
            ${renderDropdownFilters()}
            <div class="orders-all-section">
                <div class="orders-section-header">
                    <h3>
                        <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Мои отклики <span class="section-count">(${stats.total})</span>
                    </h3>
                </div>
                ${applications.length > 0 ? `
                    <div class="orders-cards-grid">
                        ${applications.map(app => renderApplicationCard(app)).join('')}
                    </div>
                ` : renderEmptyState('applications', 'Нет откликов', 'Откликайтесь на заказы, чтобы получать приглашения')}
            </div>
        `;
    }

    if (quickFilter === 'saved') {
        return `
            ${renderDropdownFilters()}
            <div class="orders-all-section">
                <div class="orders-section-header">
                    <h3>
                        <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                        Сохраненные <span class="section-count">(${savedOrders.length})</span>
                    </h3>
                </div>
                ${savedOrders.length > 0 ? `
                    <div class="orders-cards-grid">
                        ${savedOrders.map(order => renderOrderCard(order)).join('')}
                    </div>
                ` : renderEmptyState('saved', 'Нет сохраненных заказов', 'Сохраняйте интересные заказы, чтобы вернуться к ним позже')}
            </div>
        `;
    }

    // Regular order feed filters
    const filters = {
        urgent: quickFilter === 'urgent',
        highBudget: quickFilter === 'highBudget',
        myCity: quickFilter === 'myCity',
        verified: quickFilter === 'verified',
        newLast24h: quickFilter === 'newLast24h',
        userCity: USER_CITY,
        orderType: dropdownFilters.orderType,
        budgetRange: getBudgetRangeFromValue(dropdownFilters.budgetRange),
        deadline: getDeadlineDaysFromValue(dropdownFilters.deadline),
        workFormat: dropdownFilters.workFormat,
        sortBy: sortBy
    };

    const orders = getOrdersFeed(filters);

    return `
        ${renderDropdownFilters()}
        
        <div class="orders-all-section">
            <div class="orders-section-header">
                <h3>
                    <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    Все заказы <span class="section-count">(${orders.length})</span>
                </h3>
            </div>
            ${orders.length > 0 ? `
                <div class="orders-cards-grid">
                    ${orders.slice(0, 10).map(order => renderOrderCard(order)).join('')}
                </div>
                ${orders.length > 10 ? `
                    <div class="orders-load-more">
                        <button class="orders-load-more-btn" id="btn-load-more">Показать еще</button>
                    </div>
                ` : ''}
            ` : renderEmptyState('orders', 'Заказов не найдено', 'Попробуйте изменить параметры фильтров')}
        </div>
    `;
}



/**
 * Render dropdown filters
 */
function renderDropdownFilters() {
    const orderTypes = getOrderTypes();
    const budgetRanges = getBudgetRanges();
    const deadlineOptions = getDeadlineOptions();

    return `
        <div class="orders-filters-bar">
            <div class="orders-filters-group">
                <span class="orders-filters-label">Фильтры:</span>
                <select class="orders-select" id="filter-quick">
                    <option value="all" ${quickFilter === 'all' ? 'selected' : ''}>Все заказы</option>
                    <option value="myApplications" ${quickFilter === 'myApplications' ? 'selected' : ''}>📨 Мои отклики</option>
                    <option value="saved" ${quickFilter === 'saved' ? 'selected' : ''}>💾 Сохраненные</option>
                    <option value="urgent" ${quickFilter === 'urgent' ? 'selected' : ''}>⚡ Срочные</option>
                    <option value="highBudget" ${quickFilter === 'highBudget' ? 'selected' : ''}>💰 Высокий бюджет</option>
                    <option value="myCity" ${quickFilter === 'myCity' ? 'selected' : ''}>📍 Мой город</option>
                    <option value="verified" ${quickFilter === 'verified' ? 'selected' : ''}>⭐ Проверенные</option>
                    <option value="newLast24h" ${quickFilter === 'newLast24h' ? 'selected' : ''}>🕐 Новые за 24 часа</option>
                </select>
                <select class="orders-select" id="filter-order-type">
                    ${orderTypes.map(t => `<option value="${t.value}" ${dropdownFilters.orderType === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
                </select>
                <select class="orders-select" id="filter-budget">
                    ${budgetRanges.map(b => `<option value="${b.value}" ${dropdownFilters.budgetRange === b.value ? 'selected' : ''}>${b.label}</option>`).join('')}
                </select>
                <select class="orders-select" id="filter-deadline">
                    ${deadlineOptions.map(d => `<option value="${d.value}" ${dropdownFilters.deadline === d.value ? 'selected' : ''}>${d.label}</option>`).join('')}
                </select>
                <select class="orders-select" id="filter-work-format">
                    <option value="all" ${dropdownFilters.workFormat === 'all' ? 'selected' : ''}>Вся география</option>
                    <option value="remote" ${dropdownFilters.workFormat === 'remote' ? 'selected' : ''}>Удаленно</option>
                    <option value="onsite" ${dropdownFilters.workFormat === 'onsite' ? 'selected' : ''}>С выездом</option>
                    <option value="hybrid" ${dropdownFilters.workFormat === 'hybrid' ? 'selected' : ''}>Гибрид</option>
                </select>
            </div>
            <div class="orders-sort-group">
                <span class="orders-filters-label">Сортировка:</span>
                <select class="orders-select" id="filter-sort">
                    <option value="date_desc" ${sortBy === 'date_desc' ? 'selected' : ''}>По дате (новые)</option>
                    <option value="date_asc" ${sortBy === 'date_asc' ? 'selected' : ''}>По дате (старые)</option>
                    <option value="budget_desc" ${sortBy === 'budget_desc' ? 'selected' : ''}>По бюджету (убыв.)</option>
                    <option value="budget_asc" ${sortBy === 'budget_asc' ? 'selected' : ''}>По бюджету (возр.)</option>
                    <option value="deadline_urgent" ${sortBy === 'deadline_urgent' ? 'selected' : ''}>Срочные сначала</option>
                </select>
                <button class="orders-refresh-btn" id="btn-refresh" title="Обновить">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M23 4v6h-6M1 20v-6h6"/>
                        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

/**
 * Render order card
 */
function renderOrderCard(order) {
    const badges = [];
    if (order.isNew) badges.push('<span class="order-badge new">NEW</span>');
    if (order.isUrgent) badges.push('<span class="order-badge urgent">СРОЧНО</span>');
    if (order.isHighPay) badges.push('<span class="order-badge high-pay">ВЫСОКАЯ ОПЛАТА</span>');

    return `
        <div class="order-card" data-order-id="${order.id}">
            <div class="order-card-header">
                <div class="order-badges">
                    ${badges.join('')}
                </div>
                <span class="order-work-format">${getWorkFormatLabel(order.workFormat)}</span>
            </div>
            
            <h3 class="order-title">${order.title}</h3>
            
            <div class="order-customer">
                <div class="order-customer-avatar" style="background: ${getAvatarColor(order.customer.name)}">${order.customer.avatar}</div>
                <span class="order-customer-name">${order.customer.name}</span>
                <span class="order-customer-rating">
                    <svg class="rating-star" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    ${order.customer.rating}
                </span>
                <span class="order-customer-time">${formatTimeAgo(order.createdAt)}</span>
            </div>
            
            <p class="order-description">${order.description}</p>
            
            <div class="order-params">
                <span class="order-param">
                    <svg class="param-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M16 10H9.5a2.5 2.5 0 000 5H12"/></svg>
                    ${formatBudgetRange(order.budgetMin, order.budgetMax, order.isNegotiable)}
                </span>
                <span class="order-param">
                    <svg class="param-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${order.deadlineDays} ${getDaysWord(order.deadlineDays)}
                </span>
                ${order.city ? `
                    <span class="order-param">
                        <svg class="param-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${order.city}
                    </span>
                ` : ''}
            </div>
            
            <div class="order-actions">
                <button class="order-btn order-btn-save ${order.isSaved ? 'saved' : ''}" data-order-id="${order.id}">
                    <span class="heart-icon">${order.isSaved ? '♥' : '♡'}</span>
                    ${order.isSaved ? 'Сохранено' : 'Сохранить'}
                </button>
                <button class="order-btn order-btn-apply" data-order-id="${order.id}">
                    Откликнуться
                </button>
                <button class="order-btn order-btn-details" data-order-id="${order.id}">
                    Подробнее →
                </button>
            </div>
        </div>
    `;
}

/**
 * Tab 2: My Applications
 */
function renderMyApplicationsTab() {
    const stats = getApplicationsStats();
    const applications = getMyApplications(applicationStatusFilter);

    return `
        <div class="orders-stats-row">
            <div class="orders-stat-card">
                <div class="orders-stat-value">${stats.total}</div>
                <div class="orders-stat-label">Всего откликов</div>
            </div>
            <div class="orders-stat-card">
                <div class="orders-stat-value">${stats.viewed}</div>
                <div class="orders-stat-label">Просмотрено</div>
            </div>
            <div class="orders-stat-card">
                <div class="orders-stat-value">${stats.invited}</div>
                <div class="orders-stat-label">Приглашение</div>
            </div>
            <div class="orders-stat-card">
                <div class="orders-stat-value">${stats.conversionRate}%</div>
                <div class="orders-stat-label">Конверсия</div>
            </div>
        </div>
        
        <div class="orders-status-filters">
            <button class="orders-status-chip all ${applicationStatusFilter === 'all' ? 'active' : ''}" data-status="all">
                Все (${stats.total})
            </button>
            <button class="orders-status-chip pending ${applicationStatusFilter === 'pending' ? 'active' : ''}" data-status="pending">
                Ожидают (${stats.pending})
            </button>
            <button class="orders-status-chip viewed ${applicationStatusFilter === 'viewed' ? 'active' : ''}" data-status="viewed">
                Просмотрены (${stats.viewed})
            </button>
            <button class="orders-status-chip invited ${applicationStatusFilter === 'invited' ? 'active' : ''}" data-status="invited">
                Приглашения (${stats.invited})
            </button>
            <button class="orders-status-chip rejected ${applicationStatusFilter === 'rejected' ? 'active' : ''}" data-status="rejected">
                Отклонены (${stats.rejected})
            </button>
            <button class="orders-status-chip draft ${applicationStatusFilter === 'draft' ? 'active' : ''}" data-status="draft">
                Черновики (${stats.drafts})
            </button>
        </div>
        
        ${applications.length > 0 ? `
            <div class="orders-cards-grid">
                ${applications.map(app => renderApplicationCard(app)).join('')}
            </div>
        ` : renderEmptyState('applications', 'Нет откликов', 'Откликайтесь на заказы, чтобы получать приглашения')}
    `;
}

/**
 * Render application card
 */
function renderApplicationCard(app) {
    const statusLabels = {
        pending: 'Ожидает',
        viewed: 'Просмотрено',
        invited: 'Приглашение',
        rejected: 'Отклонено',
        draft: 'Черновик'
    };

    return `
        <div class="application-card" data-app-id="${app.id}">
            <div class="application-header">
                <span class="application-status ${app.status}">${statusLabels[app.status]}</span>
                <span class="application-time">${formatTimeAgo(app.createdAt)}</span>
            </div>
            
            <h3 class="application-order-title">${app.order.title}</h3>
            
            <div class="application-order-info">
                <span>${app.order.customer.name}</span>
                <span>•</span>
                <span>ID: #${app.orderId.split('_')[1]}</span>
            </div>
            
            ${app.status === 'invited' ? `
                <div class="invitation-block">
                    <div class="invitation-title">
                        <svg class="invitation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Заказчик пригласил вас на проект!
                    </div>
                    <div class="invitation-actions">
                        <button class="invitation-btn-accept" data-app-id="${app.id}">Принять приглашение</button>
                        <button class="invitation-btn-decline" data-app-id="${app.id}">Отклонить</button>
                    </div>
                </div>
            ` : ''}
            
            <div class="application-proposal">
                <div class="application-proposal-title">Ваше предложение:</div>
                <div class="application-proposal-items">
                    <div class="application-proposal-item">• Цена: ${formatCurrency(app.proposedPrice)}</div>
                    <div class="application-proposal-item">• Срок: ${app.proposedDeadline} ${getDaysWord(app.proposedDeadline)}</div>
                </div>
            </div>
            
            ${app.coverLetter ? `
                <p class="application-cover-letter">"${app.coverLetter}"</p>
            ` : ''}
            
            ${app.portfolioProjects.length > 0 ? `
                <div class="application-portfolio">
                    ${app.portfolioProjects.map(p => `<span class="application-portfolio-item">${p}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="application-footer">
                ${app.status === 'draft' ? `Сохранено: ${formatTimeAgo(app.createdAt)}` : `Отправлено: ${formatTimeAgo(app.createdAt)}`}
            </div>
            
            <div class="application-actions">
                <button class="orders-btn orders-btn-secondary" data-order-id="${app.orderId}">Просмотреть заказ</button>
                ${app.status === 'draft' ? `
                    <button class="orders-btn orders-btn-primary" data-app-id="${app.id}">Продолжить</button>
                    <button class="orders-btn orders-btn-danger" data-app-id="${app.id}">Удалить</button>
                ` : `
                    <button class="orders-btn orders-btn-secondary" data-app-id="${app.id}">Редактировать</button>
                `}
            </div>
        </div>
    `;
}

/**
 * Tab 3: Saved Orders
 */
function renderSavedTab() {
    const savedOrders = getSavedOrders();

    return `
        <div class="orders-section-header">
            <h3>Сохраненные заказы <span class="section-count">(${savedOrders.length})</span></h3>
        </div>
        
        ${savedOrders.length > 0 ? `
            <div class="orders-cards-grid">
                ${savedOrders.map(order => renderOrderCard(order)).join('')}
            </div>
        ` : renderEmptyState('saved', 'Нет сохраненных заказов', 'Сохраняйте интересные заказы, чтобы вернуться к ним позже')}
    `;
}

/**
 * Tab 4: My Orders
 */
function renderMyOrdersTab() {
    const orders = getMyOrders(myOrdersStatusFilter);

    return `
        <div class="orders-status-filters">
            <button class="orders-status-chip ${myOrdersStatusFilter === 'all' ? 'active' : ''}" data-my-status="all">
                Все
            </button>
            <button class="orders-status-chip ${myOrdersStatusFilter === 'active' ? 'active' : ''}" data-my-status="active">
                Активные
            </button>
            <button class="orders-status-chip ${myOrdersStatusFilter === 'completed' ? 'active' : ''}" data-my-status="completed">
                Завершенные
            </button>
            <button class="orders-status-chip ${myOrdersStatusFilter === 'draft' ? 'active' : ''}" data-my-status="draft">
                Черновики
            </button>
        </div>
        
        ${orders.length > 0 ? `
            <div class="orders-cards-grid">
                ${orders.map(order => renderMyOrderCard(order)).join('')}
            </div>
        ` : renderEmptyState('myOrders', 'У вас пока нет заказов', 'Создайте заказ, чтобы найти исполнителя')}
    `;
}

/**
 * Render my order card
 */
function renderMyOrderCard(order) {
    const statusLabels = {
        active: 'Активный',
        completed: 'Завершен',
        draft: 'Черновик',
        closed: 'Закрыт'
    };

    const statusColors = {
        active: '#34C759',
        completed: '#8E8E93',
        draft: '#FF9500',
        closed: '#FF3B30'
    };

    return `
        <div class="order-card" data-order-id="${order.id}">
            <div class="order-card-header">
                <span class="order-badge" style="background: ${statusColors[order.status]}; color: white;">
                    ${statusLabels[order.status]}
                </span>
                <span class="order-work-format">${formatTimeAgo(order.createdAt)}</span>
            </div>
            
            <h3 class="order-title">${order.title}</h3>
            <p class="application-order-info">ID: #${order.id.split('_')[1]}</p>
            
            <div class="order-params">
                <span class="order-param">
                    <svg class="param-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M16 10H9.5a2.5 2.5 0 000 5H12"/></svg>
                    ${formatBudgetRange(order.budgetMin, order.budgetMax, false)}
                </span>
                <span class="order-param">
                    <svg class="param-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${order.deadlineDays} ${getDaysWord(order.deadlineDays)}
                </span>
                ${order.city ? `
                    <span class="order-param">
                        <svg class="param-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${order.city}
                    </span>
                ` : ''}
            </div>
            
            <div class="application-proposal">
                <div class="application-proposal-title">Статистика:</div>
                <div class="application-proposal-items">
                    <div class="application-proposal-item">• Откликов: ${order.applicationsCount} специалистов</div>
                    <div class="application-proposal-item">• Просмотров: ${order.viewsCount}</div>
                    <div class="application-proposal-item">• Средняя цена: ${formatCurrency(order.avgProposedPrice)}</div>
                </div>
            </div>
            
            <div class="application-actions">
                <button class="orders-btn orders-btn-primary" data-order-id="${order.id}">
                    Просмотреть отклики (${order.applicationsCount})
                </button>
                <button class="orders-btn orders-btn-secondary" data-order-id="${order.id}">Редактировать</button>
                ${order.status === 'active' ? `
                    <button class="orders-btn orders-btn-danger" data-order-id="${order.id}">Закрыть</button>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Tab 5: Specialists
 */
function renderSpecialistsTab() {
    const specialists = getSpecialists(specialistsFilters);
    const roles = getSpecialistRoles();

    return `
        <div class="orders-filters-bar">
            <div class="orders-filters-group">
                <span class="orders-filters-label">Фильтры:</span>
                <select class="orders-select" id="filter-spec-role">
                    ${roles.map(r => `<option value="${r.value}" ${specialistsFilters.role === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
                </select>
                <select class="orders-select" id="filter-spec-city">
                    <option value="all">Все города</option>
                    <option value="Астана" ${specialistsFilters.city === 'Астана' ? 'selected' : ''}>Астана</option>
                    <option value="Алматы" ${specialistsFilters.city === 'Алматы' ? 'selected' : ''}>Алматы</option>
                    <option value="Караганда" ${specialistsFilters.city === 'Караганда' ? 'selected' : ''}>Караганда</option>
                </select>
                <select class="orders-select" id="filter-spec-rating">
                    <option value="">Любой рейтинг</option>
                    <option value="4.5" ${specialistsFilters.minRating === 4.5 ? 'selected' : ''}>4.5+</option>
                    <option value="4.7" ${specialistsFilters.minRating === 4.7 ? 'selected' : ''}>4.7+</option>
                    <option value="4.9" ${specialistsFilters.minRating === 4.9 ? 'selected' : ''}>4.9+</option>
                </select>
            </div>
            <div class="orders-sort-group">
                <span class="orders-filters-label">Сортировка:</span>
                <select class="orders-select" id="filter-spec-sort">
                    <option value="rating">По рейтингу</option>
                    <option value="experience">По опыту</option>
                    <option value="price_asc">По цене</option>
                </select>
            </div>
        </div>
        
        ${specialists.length > 0 ? `
            <div class="specialists-grid">
                ${specialists.map(spec => renderSpecialistCard(spec)).join('')}
            </div>
        ` : renderEmptyState('specialists', 'Специалисты не найдены', 'Попробуйте изменить параметры фильтров')}
    `;
}

/**
 * Render specialist card
 */
function renderSpecialistCard(spec) {
    return `
        <div class="specialist-card" data-spec-id="${spec.id}">
            <div class="specialist-avatar" style="background: ${getAvatarColor(spec.name)}">${spec.avatar}</div>
            <div class="specialist-info">
                <div class="specialist-name">${spec.name}</div>
                <div class="specialist-meta">${spec.username} • ${spec.roleLabel}</div>
                <div class="specialist-rating">
                    <svg class="rating-star" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    ${spec.rating}
                    <span class="specialist-rating-count">(${spec.reviewsCount} отзывов)</span>
                </div>
                <div class="specialist-location">
                    <svg class="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${spec.city}, ${spec.country}
                </div>
                <div class="specialist-experience">Опыт: ${spec.projectsCount} проектов • На платформе с ${spec.memberSince}</div>
                
                <div class="specialist-tags">
                    ${spec.specializations.map(s => `<span class="specialist-tag">${s}</span>`).join('')}
                </div>
                
                <div class="specialist-price">Базовая ставка: от ${formatCurrency(spec.basePrice)} за проект</div>
                
                ${spec.recentWorks.length > 0 ? `
                    <div class="specialist-works">
                        ${spec.recentWorks.slice(0, 3).map(() => `
                            <div class="specialist-work-preview">
                                <svg class="work-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="specialist-actions">
                    <button class="orders-btn orders-btn-secondary" data-spec-id="${spec.id}">Просмотреть профиль</button>
                    <button class="orders-btn orders-btn-secondary" data-spec-id="${spec.id}">Пригласить на проект</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render empty state
 */
function renderEmptyState(type, title, text) {
    const icons = {
        orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
        applications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        saved: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>',
        myOrders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        specialists: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'
    };

    return `
        <div class="orders-empty-state">
            <div class="orders-empty-icon">${icons[type] || icons.orders}</div>
            <h3 class="orders-empty-title">${title}</h3>
            <p class="orders-empty-text">${text}</p>
            ${type === 'orders' ? `
                <button class="orders-btn orders-btn-secondary" id="btn-reset-filters">Сбросить фильтры</button>
            ` : ''}
            ${type === 'saved' ? `
                <button class="orders-btn orders-btn-secondary" id="btn-go-to-feed">Перейти к ленте заказов</button>
            ` : ''}
        </div>
    `;
}

/**
 * Bind events for Orders section
 */
export function bindOrdersEvents(container) {
    // Tab switching
    container.querySelectorAll('.orders-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            activeTab = tab.dataset.tab;
            refreshOrdersSection(container);
        });
    });

    // Dropdown filters (including quick filter)
    bindFilterChange(container, 'filter-quick', (val) => { quickFilter = val; });
    bindFilterChange(container, 'filter-order-type', (val) => { dropdownFilters.orderType = val; });
    bindFilterChange(container, 'filter-budget', (val) => { dropdownFilters.budgetRange = val; });
    bindFilterChange(container, 'filter-deadline', (val) => { dropdownFilters.deadline = val; });
    bindFilterChange(container, 'filter-work-format', (val) => { dropdownFilters.workFormat = val; });
    bindFilterChange(container, 'filter-sort', (val) => { sortBy = val; });

    // Specialist filters
    bindFilterChange(container, 'filter-spec-role', (val) => { specialistsFilters.role = val; });
    bindFilterChange(container, 'filter-spec-city', (val) => { specialistsFilters.city = val; });
    bindFilterChange(container, 'filter-spec-rating', (val) => { specialistsFilters.minRating = val ? parseFloat(val) : null; });

    // Application status filters
    container.querySelectorAll('.orders-status-chip[data-status]').forEach(chip => {
        chip.addEventListener('click', () => {
            applicationStatusFilter = chip.dataset.status;
            refreshOrdersSection(container);
        });
    });

    // My orders status filters
    container.querySelectorAll('.orders-status-chip[data-my-status]').forEach(chip => {
        chip.addEventListener('click', () => {
            myOrdersStatusFilter = chip.dataset.myStatus;
            refreshOrdersSection(container);
        });
    });

    // Refresh button
    const refreshBtn = container.querySelector('#btn-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('rotating');
            setTimeout(() => {
                refreshBtn.classList.remove('rotating');
                refreshOrdersSection(container);
            }, 500);
        });
    }

    // Save order buttons
    container.querySelectorAll('.order-btn-save').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderId = btn.dataset.orderId;
            const isSaved = toggleSaveOrder(orderId);
            btn.classList.toggle('saved', isSaved);
            btn.querySelector('.heart-icon').textContent = isSaved ? '♥' : '♡';
            btn.childNodes[2].textContent = isSaved ? ' Сохранено' : ' Сохранить';
            showToast(isSaved ? 'Заказ сохранен' : 'Заказ удален из сохраненных', 'success');
        });
    });

    // Apply to order buttons
    container.querySelectorAll('.order-btn-apply').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderId = btn.dataset.orderId;
            showApplyModal(orderId, container);
        });
    });

    // Order details buttons
    container.querySelectorAll('.order-btn-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const orderId = btn.dataset.orderId;
            showOrderDetailModal(orderId, container);
        });
    });

    // Create order button
    const createOrderBtn = container.querySelector('#btn-create-order');
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', () => {
            showCreateOrderModal(container);
        });
    }

    // Reset filters button
    const resetFiltersBtn = container.querySelector('#btn-reset-filters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            quickFilters = { urgent: false, highBudget: false, myCity: false, verified: false, newLast24h: false };
            dropdownFilters = { orderType: 'all', budgetRange: 'all', deadline: 'all', workFormat: 'all' };
            sortBy = 'date_desc';
            refreshOrdersSection(container);
        });
    }

    // Go to feed button
    const goToFeedBtn = container.querySelector('#btn-go-to-feed');
    if (goToFeedBtn) {
        goToFeedBtn.addEventListener('click', () => {
            activeTab = 'feed';
            refreshOrdersSection(container);
        });
    }
}

/**
 * Bind filter change event
 */
function bindFilterChange(container, id, callback) {
    const el = container.querySelector(`#${id}`);
    if (el) {
        el.addEventListener('change', (e) => {
            callback(e.target.value);
            refreshOrdersSection(container);
        });
    }
}

/**
 * Refresh orders section
 */
function refreshOrdersSection(container) {
    const mainContent = container.querySelector('.profile-main');
    if (mainContent) {
        mainContent.innerHTML = renderOrdersSection();
        bindOrdersEvents(container);
    }
}

/**
 * Show order detail modal
 */
function showOrderDetailModal(orderId, container) {
    const order = getOrderById(orderId);
    if (!order) return;

    const overlay = document.createElement('div');
    overlay.className = 'orders-modal-overlay';
    overlay.innerHTML = `
        <div class="orders-modal">
            <div class="orders-modal-header">
                <h2 class="orders-modal-title">${order.title}</h2>
                <button class="orders-modal-close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="orders-modal-content">
                <div class="modal-section">
                    <p style="color: var(--text-muted); margin-bottom: var(--space-3);">ID: #${order.id.split('_')[1]}</p>
                    <div class="order-badges" style="margin-bottom: var(--space-4);">
                        ${order.isNew ? '<span class="order-badge new">NEW</span>' : ''}
                        ${order.isUrgent ? '<span class="order-badge urgent">СРОЧНО</span>' : ''}
                        ${order.isHighPay ? '<span class="order-badge high-pay">ВЫСОКАЯ ОПЛАТА</span>' : ''}
                    </div>
                </div>
                
                <div class="modal-section">
                    <div class="modal-section-title">О заказчике</div>
                    <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2);">
                        <div class="order-customer-avatar" style="width: 48px; height: 48px; font-size: 16px; background: ${getAvatarColor(order.customer.name)}">${order.customer.avatar}</div>
                        <div>
                            <div style="font-weight: 600; font-size: 16px;">${order.customer.name}</div>
                            <div style="color: var(--text-muted);">⭐ ${order.customer.rating} (${order.customer.reviewsCount} отзывов) • ${order.customer.projectsCount} проектов</div>
                            <div style="color: var(--text-muted);">📍 ${order.customer.city}</div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-section">
                    <div class="modal-section-title">Описание заказа</div>
                    <p style="line-height: 1.6; color: var(--text-secondary);">${order.description}</p>
                </div>
                
                <div class="modal-section">
                    <div class="modal-section-title">Параметры</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
                        <div><strong>Тип работы:</strong> ${getOrderTypeLabel(order.orderType)}</div>
                        <div><strong>Бюджет:</strong> ${formatBudgetRange(order.budgetMin, order.budgetMax, order.isNegotiable)}</div>
                        <div><strong>Срок выполнения:</strong> ${order.deadlineDays} ${getDaysWord(order.deadlineDays)}</div>
                        <div><strong>Формат работы:</strong> ${getWorkFormatLabel(order.workFormat)}</div>
                        <div><strong>Город:</strong> ${order.city || 'Не указан'}</div>
                        <div><strong>Опубликовано:</strong> ${formatTimeAgo(order.createdAt)}</div>
                    </div>
                </div>
                
                ${order.requirements.length > 0 ? `
                    <div class="modal-section">
                        <div class="modal-section-title">Требования</div>
                        <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary);">
                            ${order.requirements.map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${order.files.length > 0 ? `
                    <div class="modal-section">
                        <div class="modal-section-title">Прикрепленные файлы</div>
                        <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                            ${order.files.map(f => `
                                <div style="padding: 8px 12px; background: var(--color-sand-100); border-radius: 8px; font-size: 12px;">
                                    📄 ${f.name} (${f.size})
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="modal-section">
                    <div class="modal-section-title">Статистика заказа</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-3);">
                        <div>• Просмотров: ${order.viewsCount}</div>
                        <div>• Откликов: ${order.applicationsCount} специалистов</div>
                        <div>• Средняя цена: ${formatCurrency(order.avgProposedPrice)}</div>
                    </div>
                </div>
            </div>
            <div class="orders-modal-footer">
                <button class="orders-btn orders-btn-secondary order-btn-save ${order.isSaved ? 'saved' : ''}" data-order-id="${order.id}">
                    <span class="heart-icon">${order.isSaved ? '♥' : '♡'}</span>
                    ${order.isSaved ? 'Сохранено' : 'Сохранить'}
                </button>
                <button class="orders-btn orders-btn-primary" id="modal-apply-btn" data-order-id="${order.id}">
                    Откликнуться
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    bindModalEvents(overlay, container);
}

/**
 * Show apply modal
 */
function showApplyModal(orderId, container) {
    const order = getOrderById(orderId);
    if (!order) return;

    const overlay = document.createElement('div');
    overlay.className = 'orders-modal-overlay';
    overlay.innerHTML = `
        <div class="orders-modal">
            <div class="orders-modal-header">
                <h2 class="orders-modal-title">Откликнуться на заказ</h2>
                <button class="orders-modal-close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="orders-modal-content">
                <p style="color: var(--text-muted); margin-bottom: var(--space-5);">${order.title}</p>
                
                <div class="orders-form-group">
                    <label class="orders-form-label">Сопроводительное письмо <span class="required">*</span></label>
                    <textarea class="orders-form-textarea" id="apply-cover-letter" placeholder="Расскажите о своем опыте и почему вы подходите..." maxlength="500"></textarea>
                    <div class="orders-char-counter"><span id="char-count">0</span>/500 символов</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                    <div class="orders-form-group">
                        <label class="orders-form-label">Цена работы <span class="required">*</span></label>
                        <div style="display: flex; align-items: center; gap: var(--space-2);">
                            <input type="number" class="orders-form-input" id="apply-price" placeholder="85000" style="flex: 1;">
                            <span style="color: var(--text-muted);">₸</span>
                        </div>
                        <div class="orders-form-hint highlight">💡 Рекомендуемый диапазон: ${formatBudgetRange(order.budgetMin, order.budgetMax, order.isNegotiable)}</div>
                    </div>
                    
                    <div class="orders-form-group">
                        <label class="orders-form-label">Срок выполнения <span class="required">*</span></label>
                        <div style="display: flex; align-items: center; gap: var(--space-2);">
                            <input type="number" class="orders-form-input" id="apply-deadline" placeholder="3" style="flex: 1;">
                            <span style="color: var(--text-muted);">дней</span>
                        </div>
                    </div>
                </div>
                
                <div class="orders-form-group" style="margin-top: var(--space-4);">
                    <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                        <input type="checkbox" id="apply-draft">
                        <span>Сохранить как черновик</span>
                    </label>
                </div>
            </div>
            <div class="orders-modal-footer">
                <button class="orders-btn orders-btn-secondary modal-cancel-btn">Отмена</button>
                <button class="orders-btn orders-btn-primary" id="apply-submit-btn" data-order-id="${order.id}">
                    Отправить отклик
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Character counter
    const textarea = overlay.querySelector('#apply-cover-letter');
    const charCount = overlay.querySelector('#char-count');
    textarea.addEventListener('input', () => {
        charCount.textContent = textarea.value.length;
    });

    // Submit handler
    const submitBtn = overlay.querySelector('#apply-submit-btn');
    submitBtn.addEventListener('click', () => {
        const coverLetter = textarea.value.trim();
        const price = parseFloat(overlay.querySelector('#apply-price').value);
        const deadline = parseInt(overlay.querySelector('#apply-deadline').value);

        if (!coverLetter || coverLetter.length < 50) {
            showToast('Сопроводительное письмо должно содержать минимум 50 символов', 'error');
            return;
        }
        if (!price || price <= 0) {
            showToast('Укажите цену', 'error');
            return;
        }
        if (!deadline || deadline <= 0) {
            showToast('Укажите срок выполнения', 'error');
            return;
        }

        const result = applyToOrder(orderId, { coverLetter, price, deadline });
        if (result.success) {
            overlay.remove();
            showToast('Отклик успешно отправлен ✓', 'success');
            refreshOrdersSection(container);
        }
    });

    bindModalEvents(overlay, container);
}

/**
 * Show create order modal
 */
function showCreateOrderModal(container) {
    const orderTypes = getOrderTypes().filter(t => t.value !== 'all');

    const overlay = document.createElement('div');
    overlay.className = 'orders-modal-overlay';
    overlay.innerHTML = `
        <div class="orders-modal" style="max-width: 800px;">
            <div class="orders-modal-header">
                <h2 class="orders-modal-title">Создать новый заказ</h2>
                <button class="orders-modal-close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="orders-modal-content">
                <div class="orders-form-group">
                    <label class="orders-form-label">Тип работы <span class="required">*</span></label>
                    <select class="orders-form-input" id="create-order-type" style="height: 44px;">
                        <option value="">Выберите тип работы</option>
                        ${orderTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                    </select>
                </div>
                
                <div class="orders-form-group">
                    <label class="orders-form-label">Заголовок заказа <span class="required">*</span></label>
                    <input type="text" class="orders-form-input" id="create-order-title" placeholder="Деталировка кухонного гарнитура" maxlength="100">
                </div>
                
                <div class="orders-form-group">
                    <label class="orders-form-label">Описание <span class="required">*</span></label>
                    <textarea class="orders-form-textarea" id="create-order-description" style="min-height: 150px;" placeholder="Подробно опишите задачу, требования..." maxlength="2000"></textarea>
                    <div class="orders-char-counter"><span id="desc-char-count">0</span>/2000 символов</div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-4);">
                    <div class="orders-form-group">
                        <label class="orders-form-label">Бюджет от</label>
                        <div style="display: flex; align-items: center; gap: var(--space-2);">
                            <input type="number" class="orders-form-input" id="create-order-budget-min" placeholder="80000">
                            <span style="color: var(--text-muted);">₸</span>
                        </div>
                    </div>
                    <div class="orders-form-group">
                        <label class="orders-form-label">Бюджет до</label>
                        <div style="display: flex; align-items: center; gap: var(--space-2);">
                            <input type="number" class="orders-form-input" id="create-order-budget-max" placeholder="100000">
                            <span style="color: var(--text-muted);">₸</span>
                        </div>
                    </div>
                    <div class="orders-form-group">
                        <label class="orders-form-label">Срок (дней)</label>
                        <input type="number" class="orders-form-input" id="create-order-deadline" placeholder="5">
                    </div>
                </div>
                
                <div class="orders-form-group">
                    <label class="orders-form-label">Формат работы <span class="required">*</span></label>
                    <div style="display: flex; gap: var(--space-4);">
                        <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                            <input type="radio" name="work-format" value="remote" checked> Удаленно
                        </label>
                        <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                            <input type="radio" name="work-format" value="onsite"> С выездом
                        </label>
                        <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                            <input type="radio" name="work-format" value="hybrid"> Гибрид
                        </label>
                    </div>
                </div>
                
                <div class="orders-form-group">
                    <label class="orders-form-label">Город</label>
                    <input type="text" class="orders-form-input" id="create-order-city" placeholder="Астана">
                </div>
                
                <div class="orders-form-group" style="margin-top: var(--space-4);">
                    <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                        <input type="checkbox" id="create-order-draft">
                        <span>Сохранить как черновик</span>
                    </label>
                </div>
            </div>
            <div class="orders-modal-footer">
                <button class="orders-btn orders-btn-secondary modal-cancel-btn">Отмена</button>
                <button class="orders-btn orders-btn-primary" id="create-order-submit">
                    Опубликовать заказ
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Character counter
    const textarea = overlay.querySelector('#create-order-description');
    const charCount = overlay.querySelector('#desc-char-count');
    textarea.addEventListener('input', () => {
        charCount.textContent = textarea.value.length;
    });

    // Submit handler
    const submitBtn = overlay.querySelector('#create-order-submit');
    submitBtn.addEventListener('click', () => {
        const orderType = overlay.querySelector('#create-order-type').value;
        const title = overlay.querySelector('#create-order-title').value.trim();
        const description = textarea.value.trim();
        const workFormat = overlay.querySelector('input[name="work-format"]:checked').value;

        if (!orderType) {
            showToast('Выберите тип работы', 'error');
            return;
        }
        if (!title || title.length < 10) {
            showToast('Заголовок должен содержать минимум 10 символов', 'error');
            return;
        }
        if (!description || description.length < 50) {
            showToast('Описание должно содержать минимум 50 символов', 'error');
            return;
        }

        const result = createOrder({ orderType, title, description, workFormat });
        if (result.success) {
            overlay.remove();
            showToast('Заказ успешно создан ✓', 'success');
            activeTab = 'myOrders';
            refreshOrdersSection(container);
        }
    });

    bindModalEvents(overlay, container);
}

/**
 * Bind modal events
 */
function bindModalEvents(overlay, container) {
    // Close button
    overlay.querySelector('.orders-modal-close').addEventListener('click', () => {
        overlay.remove();
    });

    // Cancel button
    const cancelBtn = overlay.querySelector('.modal-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });
    }

    // Click outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    // Escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Apply button in detail modal
    const applyBtn = overlay.querySelector('#modal-apply-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            overlay.remove();
            showApplyModal(applyBtn.dataset.orderId, container);
        });
    }

    // Save button in detail modal
    const saveBtn = overlay.querySelector('.order-btn-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const orderId = saveBtn.dataset.orderId;
            const isSaved = toggleSaveOrder(orderId);
            saveBtn.classList.toggle('saved', isSaved);
            saveBtn.querySelector('.heart-icon').textContent = isSaved ? '♥' : '♡';
            showToast(isSaved ? 'Заказ сохранен' : 'Заказ удален из сохраненных', 'success');
        });
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const existing = document.querySelector('.orders-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `orders-toast ${type}`;
    toast.innerHTML = `
        <span class="orders-toast-icon">${type === 'success' ? '✓' : '✕'}</span>
        <span class="orders-toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Helper functions
function getBudgetRangeFromValue(value) {
    const ranges = getBudgetRanges();
    const found = ranges.find(r => r.value === value);
    return found ? found.range : null;
}

function getDeadlineDaysFromValue(value) {
    const options = getDeadlineOptions();
    const found = options.find(o => o.value === value);
    return found ? found.days : null;
}

function getDaysWord(days) {
    if (days === 1) return 'день';
    if (days >= 2 && days <= 4) return 'дня';
    return 'дней';
}

function getAvatarColor(name) {
    const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#5856D6', '#FF3B30'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
}

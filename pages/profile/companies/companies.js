/**
 * Companies Section Module
 * Implements company management: My Company, Partners, Employers
 */

// State
let activeTab = 'my-company'; // my-company, partners, employers
let activeSubTab = 'overview'; // overview, team, portfolio, settings
let hasOwnCompany = true; // Toggle for demo

// Mock data - My Company
const MY_COMPANY = {
    id: 'comp1',
    name: 'Mebel Studio',
    logo: 'MS',
    description: 'Производство корпусной мебели на заказ. Работаем с премиальными материалами ЛДСП Egger, фурнитурой Blum. Полный цикл от дизайна до монтажа.',
    city: 'Астана, Казахстан',
    specializations: ['Кухни', 'Гардеробные', 'Офисная мебель'],
    phone: '+7 (777) 123-45-67',
    email: 'info@mebelstudio.kz',
    website: 'mebelstudio.kz',
    instagram: '@mebelstudio',
    foundedYear: 2015,
    stats: {
        projectsCompleted: 42,
        teamSize: 8,
        rating: 4.9,
        reviewsCount: 24,
        yearlyRevenue: 3200000,
        activeProjects: 18,
        onTimePercent: 95
    }
};

// Mock team members
const TEAM_MEMBERS = [
    { id: 'm1', name: 'Ратмир А.', username: '@ratmir', avatar: 'РА', role: 'owner', specialization: 'Технолог', rating: 4.8, projects: 127, joinedYear: 2015 },
    { id: 'm2', name: 'Сергей И.', username: '@sergei', avatar: 'СИ', role: 'admin', specialization: 'Дизайнер', rating: 4.9, projects: 85, joinedYear: 2024 },
    { id: 'm3', name: 'Анна П.', username: '@anna', avatar: 'АП', role: 'member', specialization: 'Технолог', rating: 4.7, projects: 42, joinedYear: 2024 },
    { id: 'm4', name: 'Дмитрий К.', username: '@dmitry', avatar: 'ДК', role: 'member', specialization: 'Сборщик', rating: 4.6, projects: 38, joinedYear: 2025 },
    { id: 'm5', name: 'Елена В.', username: '@elena', avatar: 'ЕВ', role: 'member', specialization: 'Менеджер', rating: 4.8, projects: 56, joinedYear: 2023 },
    { id: 'm6', name: 'Максим Т.', username: '@maxim', avatar: 'МТ', role: 'member', specialization: 'Замерщик', rating: 4.5, projects: 28, joinedYear: 2024 },
    { id: 'm7', name: 'Ольга С.', username: '@olga', avatar: 'ОС', role: 'admin', specialization: 'Дизайнер', rating: 4.7, projects: 63, joinedYear: 2022 },
    { id: 'm8', name: 'Артём Н.', username: '@artem', avatar: 'АН', role: 'member', specialization: 'Сборщик', rating: 4.4, projects: 21, joinedYear: 2025 }
];

// Mock partners
const PARTNERS = [
    {
        id: 'p1',
        name: 'KitchenPro',
        logo: 'KP',
        description: 'Производство премиальных кухонь',
        city: 'Алматы',
        rating: 4.9,
        teamSize: 15,
        yourRole: 'Внешний специалист (Технолог)',
        partnerSince: 'Март 2024',
        projectsCompleted: 12,
        avgPayment: 95000,
        lastProject: { title: 'Кухня "Лофт в ЖК Байтерек"', daysAgo: 5 }
    },
    {
        id: 'p2',
        name: 'Design Masters',
        logo: 'DM',
        description: 'Дизайн-студия премиум-класса',
        city: 'Астана',
        rating: 4.8,
        teamSize: 12,
        yourRole: 'Консультант',
        partnerSince: 'Июнь 2023',
        projectsCompleted: 8,
        avgPayment: 120000,
        lastProject: { title: 'Офисная мебель ТехноПарк', daysAgo: 14 }
    },
    {
        id: 'p3',
        name: 'Мебель Люкс',
        logo: 'МЛ',
        description: 'Элитная мебель на заказ',
        city: 'Караганда',
        rating: 4.7,
        teamSize: 8,
        yourRole: 'Технолог',
        partnerSince: 'Январь 2024',
        projectsCompleted: 5,
        avgPayment: 85000,
        lastProject: { title: 'Гардеробная "Классика"', daysAgo: 21 }
    },
    {
        id: 'p4',
        name: 'Home Design',
        logo: 'HD',
        description: 'Комплексный дизайн интерьеров',
        city: 'Шымкент',
        rating: 4.6,
        teamSize: 6,
        yourRole: 'Деталировщик',
        partnerSince: 'Сентябрь 2024',
        projectsCompleted: 3,
        avgPayment: 70000,
        lastProject: { title: 'Спальня "Модерн"', daysAgo: 30 }
    },
    {
        id: 'p5',
        name: 'FurniCraft',
        logo: 'FC',
        description: 'Производство мебели',
        city: 'Актобе',
        rating: 4.5,
        teamSize: 10,
        yourRole: 'Технолог',
        partnerSince: 'Ноябрь 2024',
        projectsCompleted: 2,
        avgPayment: 65000,
        lastProject: { title: 'Кухня "Минимализм"', daysAgo: 45 }
    }
];

// Mock employers
const EMPLOYERS = [
    {
        id: 'e1',
        name: 'Design Masters',
        logo: 'DM',
        description: 'Дизайн-студия премиум-класса',
        city: 'Астана',
        rating: 4.8,
        teamSize: 12,
        yourRole: 'Администратор',
        yourSpecialization: 'Дизайнер',
        joinedDate: 'Январь 2023',
        projectsCompleted: 48,
        yourRating: 4.9,
        currentProjects: [
            { title: 'Кухня "Модерн в ЖК Expo"', status: 'В работе', progress: 70 },
            { title: 'Гардеробная "Классика"', status: 'На замере', progress: 10 }
        ]
    },
    {
        id: 'e2',
        name: 'Мебель Казахстан',
        logo: 'МК',
        description: 'Крупнейший производитель мебели',
        city: 'Астана',
        rating: 4.6,
        teamSize: 45,
        yourRole: 'Сотрудник',
        yourSpecialization: 'Технолог',
        joinedDate: 'Март 2024',
        projectsCompleted: 23,
        yourRating: 4.7,
        currentProjects: [
            { title: 'Офисный комплекс "Байтерек"', status: 'В работе', progress: 45 }
        ]
    },
    {
        id: 'e3',
        name: 'Интерьер Плюс',
        logo: 'ИП',
        description: 'Студия дизайна интерьеров',
        city: 'Алматы',
        rating: 4.7,
        teamSize: 9,
        yourRole: 'Сотрудник',
        yourSpecialization: 'Консультант',
        joinedDate: 'Август 2024',
        projectsCompleted: 11,
        yourRating: 4.8,
        currentProjects: []
    }
];

// Mock invitations
const INVITATIONS = [
    { id: 'inv1', company: { name: 'KitchenPro', logo: 'KP' }, role: 'Технолог', date: '2 дня назад' },
    { id: 'inv2', company: { name: 'Design Lab', logo: 'DL' }, role: 'Дизайнер', date: '5 дней назад' }
];

// Mock recent activity
const RECENT_ACTIVITY = [
    { id: 'a1', text: 'Сергей И. завершил проект "Кухня для ЖК Астана"', time: '2 часа назад' },
    { id: 'a2', text: 'Анна П. добавила новый проект в портфолио', time: '5 часов назад' },
    { id: 'a3', text: 'Компания получила отзыв ⭐⭐⭐⭐⭐ от KitchenPro', time: '1 день назад' },
    { id: 'a4', text: 'Дмитрий К. присоединился к команде', time: '2 дня назад' },
    { id: 'a5', text: 'Завершён проект "Гардеробная Модерн"', time: '3 дня назад' }
];

/**
 * Render the Companies section
 */
export function renderCompaniesSection() {
    return `
        <div class="companies-section">
            ${renderTabsHeader()}
            ${renderTabContent()}
        </div>
    `;
}

/**
 * Render main tabs header
 */
function renderTabsHeader() {
    return `
        <div class="companies-tabs-header">
            <div class="companies-tabs">
                <button class="company-tab ${activeTab === 'my-company' ? 'active' : ''}" data-tab="my-company">
                    Моя компания
                </button>
                <button class="company-tab ${activeTab === 'partners' ? 'active' : ''}" data-tab="partners">
                    Партнеры (${PARTNERS.length})
                </button>
                <button class="company-tab ${activeTab === 'employers' ? 'active' : ''}" data-tab="employers">
                    Работодатели (${EMPLOYERS.length})
                </button>
            </div>
            ${!hasOwnCompany ? `
                <button class="btn-create-company" id="btn-create-company">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Создать компанию
                </button>
            ` : ''}
        </div>
    `;
}

/**
 * Render tab content based on active tab
 */
function renderTabContent() {
    switch (activeTab) {
        case 'my-company':
            return renderMyCompanyTab();
        case 'partners':
            return renderPartnersTab();
        case 'employers':
            return renderEmployersTab();
        default:
            return renderMyCompanyTab();
    }
}

/**
 * Render My Company tab
 */
function renderMyCompanyTab() {
    if (!hasOwnCompany) {
        return renderEmptyState(
            'company',
            'У вас пока нет своей компании',
            'Создайте компанию, чтобы управлять командой и проектами',
            'Создать компанию'
        );
    }

    return `
        <div class="my-company-content">
            ${renderCompanyHeader()}
            ${renderCompanySubTabs()}
            ${renderSubTabContent()}
        </div>
    `;
}

/**
 * Render company header
 */
function renderCompanyHeader() {
    return `
        <div class="company-header">
            <div class="company-logo">${MY_COMPANY.logo}</div>
            <div class="company-info">
                <h2 class="company-name">${MY_COMPANY.name}</h2>
                <p class="company-description">${MY_COMPANY.description.substring(0, 60)}...</p>
                <div class="company-meta">
                    <span class="company-location">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${MY_COMPANY.city}
                    </span>
                    <span class="company-stat">👥 ${MY_COMPANY.stats.teamSize} участников</span>
                    <span class="company-stat">📊 ${MY_COMPANY.stats.projectsCompleted} проектов</span>
                    <span class="company-stat">⭐ ${MY_COMPANY.stats.rating} рейтинг</span>
                </div>
            </div>
            <button class="btn-edit-company" id="btn-edit-company">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Редактировать
            </button>
        </div>
    `;
}

/**
 * Render company sub-tabs
 */
function renderCompanySubTabs() {
    return `
        <div class="company-sub-tabs">
            <button class="sub-tab ${activeSubTab === 'overview' ? 'active' : ''}" data-subtab="overview">Обзор</button>
            <button class="sub-tab ${activeSubTab === 'team' ? 'active' : ''}" data-subtab="team">Команда (${TEAM_MEMBERS.length})</button>
            <button class="sub-tab ${activeSubTab === 'portfolio' ? 'active' : ''}" data-subtab="portfolio">Портфолио (${MY_COMPANY.stats.projectsCompleted})</button>
            <button class="sub-tab ${activeSubTab === 'settings' ? 'active' : ''}" data-subtab="settings">Настройки</button>
        </div>
    `;
}

/**
 * Render sub-tab content
 */
function renderSubTabContent() {
    switch (activeSubTab) {
        case 'overview':
            return renderOverviewSection();
        case 'team':
            return renderTeamSection();
        case 'portfolio':
            return renderPortfolioSection();
        case 'settings':
            return renderSettingsSection();
        default:
            return renderOverviewSection();
    }
}

/**
 * Render Overview section
 */
function renderOverviewSection() {
    return `
        <div class="overview-section">
            <!-- Statistics -->
            <div class="section-block">
                <h3 class="block-title">📊 Статистика компании</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${MY_COMPANY.stats.projectsCompleted}</div>
                        <div class="stat-label">Проектов выполнено</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${MY_COMPANY.stats.teamSize}</div>
                        <div class="stat-label">Команда</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${MY_COMPANY.stats.rating}</div>
                        <div class="stat-label">Рейтинг ⭐</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(MY_COMPANY.stats.yearlyRevenue)}</div>
                        <div class="stat-label">Оборот за год</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${MY_COMPANY.stats.activeProjects}</div>
                        <div class="stat-label">Активных проектов</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${MY_COMPANY.stats.onTimePercent}%</div>
                        <div class="stat-label">В срок</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${MY_COMPANY.foundedYear}</div>
                        <div class="stat-label">Год основания</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${MY_COMPANY.stats.reviewsCount}</div>
                        <div class="stat-label">Отзывов</div>
                    </div>
                </div>
            </div>

            <!-- About -->
            <div class="section-block">
                <h3 class="block-title">ℹ️ О компании</h3>
                <div class="about-content">
                    <div class="about-row">
                        <span class="about-label">Специализация:</span>
                        <div class="tags-list">
                            ${MY_COMPANY.specializations.map(s => `<span class="tag">${s}</span>`).join('')}
                        </div>
                    </div>
                    <div class="about-row">
                        <span class="about-label">Описание:</span>
                        <p class="about-text">${MY_COMPANY.description}</p>
                    </div>
                    <div class="about-row">
                        <span class="about-label">Контакты:</span>
                        <div class="contacts-list">
                            <div class="contact-item">📞 ${MY_COMPANY.phone}</div>
                            <div class="contact-item">✉️ ${MY_COMPANY.email}</div>
                            <div class="contact-item">🌐 ${MY_COMPANY.website}</div>
                            <div class="contact-item">📷 ${MY_COMPANY.instagram}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="section-block">
                <h3 class="block-title">📋 Последняя активность</h3>
                <div class="activity-list">
                    ${RECENT_ACTIVITY.map(activity => `
                        <div class="activity-item">
                            <div class="activity-text">${activity.text}</div>
                            <div class="activity-time">${activity.time}</div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-link">Показать все →</button>
            </div>
        </div>
    `;
}

/**
 * Render Team section
 */
function renderTeamSection() {
    const owners = TEAM_MEMBERS.filter(m => m.role === 'owner');
    const admins = TEAM_MEMBERS.filter(m => m.role === 'admin');
    const members = TEAM_MEMBERS.filter(m => m.role === 'member');

    return `
        <div class="team-section">
            <div class="team-header">
                <h3 class="block-title">👥 Команда (${TEAM_MEMBERS.length} участников)</h3>
                <button class="btn-primary" id="btn-invite-member">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Пригласить
                </button>
            </div>

            <div class="team-filters">
                <button class="filter-btn active" data-filter="all">Все (${TEAM_MEMBERS.length})</button>
                <button class="filter-btn" data-filter="admin">Администраторы (${owners.length + admins.length})</button>
                <button class="filter-btn" data-filter="member">Сотрудники (${members.length})</button>
            </div>

            <div class="team-table">
                <div class="table-header">
                    <div class="col-member">Участник</div>
                    <div class="col-role">Роль в команде</div>
                    <div class="col-rating">Рейтинг</div>
                    <div class="col-projects">Проектов</div>
                    <div class="col-date">Дата</div>
                    <div class="col-actions">Действия</div>
                </div>
                <div class="table-body">
                    ${TEAM_MEMBERS.map(member => renderTeamMemberRow(member)).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render team member row
 */
function renderTeamMemberRow(member) {
    const roleLabels = { owner: 'Владелец', admin: 'Администратор', member: 'Сотрудник' };
    const roleColors = { owner: '#AF52DE', admin: '#007AFF', member: '#34C759' };

    return `
        <div class="table-row" data-member-id="${member.id}">
            <div class="col-member">
                <div class="member-avatar" style="background: ${roleColors[member.role]}">${member.avatar}</div>
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-username">${member.username}</div>
                </div>
            </div>
            <div class="col-role">
                <span class="role-badge role-${member.role}">${roleLabels[member.role]}</span>
                <span class="member-spec">${member.specialization}</span>
            </div>
            <div class="col-rating">⭐ ${member.rating}</div>
            <div class="col-projects">${member.projects}</div>
            <div class="col-date">${member.joinedYear}</div>
            <div class="col-actions">
                <button class="btn-icon btn-member-menu" data-member-id="${member.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

/**
 * Render Portfolio section (placeholder)
 */
function renderPortfolioSection() {
    return `
        <div class="portfolio-section">
            <div class="section-block">
                <h3 class="block-title">📊 Статистика портфолио</h3>
                <div class="stats-grid stats-grid-4">
                    <div class="stat-card">
                        <div class="stat-value">${MY_COMPANY.stats.projectsCompleted}</div>
                        <div class="stat-label">Проектов</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${MY_COMPANY.stats.rating}</div>
                        <div class="stat-label">Рейтинг</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">2,847</div>
                        <div class="stat-label">Просмотров</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(MY_COMPANY.stats.yearlyRevenue)}</div>
                        <div class="stat-label">Оборот</div>
                    </div>
                </div>
            </div>
            
            <div class="section-block">
                <h3 class="block-title">🛠 Специализация и технологии</h3>
                <div class="tags-list">
                    <span class="tag">Basis Мебельщик</span>
                    <span class="tag">PRO100</span>
                    <span class="tag">ЛДСП Egger</span>
                    <span class="tag">Blum</span>
                    <span class="tag">Форматно-раскроечный станок</span>
                    <span class="tag">Кромкооблицовка</span>
                </div>
            </div>

            <div class="section-block">
                <h3 class="block-title">💼 Выполненные проекты</h3>
                <p class="placeholder-text">Проекты будут отображаться здесь...</p>
            </div>
        </div>
    `;
}

/**
 * Render Settings section
 */
function renderSettingsSection() {
    return `
        <div class="settings-section">
            <!-- General Info -->
            <div class="section-block">
                <h3 class="block-title">ℹ️ Общая информация</h3>
                <div class="settings-form">
                    <div class="form-row">
                        <label>Логотип:</label>
                        <div class="logo-upload">
                            <div class="logo-preview">${MY_COMPANY.logo}</div>
                            <button class="btn-secondary">Загрузить новый</button>
                        </div>
                    </div>
                    <div class="form-row">
                        <label>Название компании:</label>
                        <input type="text" value="${MY_COMPANY.name}" class="form-input">
                    </div>
                    <div class="form-row">
                        <label>Описание:</label>
                        <textarea class="form-textarea">${MY_COMPANY.description}</textarea>
                        <span class="char-count">${MY_COMPANY.description.length}/500 символов</span>
                    </div>
                    <div class="form-row">
                        <label>Город:</label>
                        <input type="text" value="${MY_COMPANY.city}" class="form-input">
                    </div>
                    <div class="form-row">
                        <label>Специализация (до 5):</label>
                        <div class="checkbox-group">
                            <label class="checkbox-item"><input type="checkbox" checked> Кухни</label>
                            <label class="checkbox-item"><input type="checkbox" checked> Гардеробные</label>
                            <label class="checkbox-item"><input type="checkbox"> Спальни</label>
                            <label class="checkbox-item"><input type="checkbox"> Детские</label>
                            <label class="checkbox-item"><input type="checkbox" checked> Офисная мебель</label>
                            <label class="checkbox-item"><input type="checkbox"> Встроенная мебель</label>
                        </div>
                    </div>
                    <button class="btn-primary">Сохранить изменения</button>
                </div>
            </div>

            <!-- Contacts -->
            <div class="section-block">
                <h3 class="block-title">📞 Контактная информация</h3>
                <div class="settings-form">
                    <div class="form-row">
                        <label>Телефон:</label>
                        <input type="text" value="${MY_COMPANY.phone}" class="form-input">
                    </div>
                    <div class="form-row">
                        <label>Email:</label>
                        <input type="email" value="${MY_COMPANY.email}" class="form-input">
                    </div>
                    <div class="form-row">
                        <label>Сайт:</label>
                        <input type="text" value="${MY_COMPANY.website}" class="form-input">
                    </div>
                    <div class="form-row">
                        <label>Instagram:</label>
                        <input type="text" value="${MY_COMPANY.instagram}" class="form-input">
                    </div>
                    <button class="btn-primary">Сохранить</button>
                </div>
            </div>

            <!-- Danger Zone -->
            <div class="section-block danger-zone">
                <h3 class="block-title">⚠️ Опасная зона</h3>
                <div class="danger-item">
                    <div class="danger-info">
                        <strong>Передать права владельца</strong>
                        <p>Вы можете передать права владельца другому администратору компании.</p>
                    </div>
                    <button class="btn-danger-outline">Передать права</button>
                </div>
                <div class="danger-item">
                    <div class="danger-info">
                        <strong>Удалить компанию</strong>
                        <p>Удаление компании необратимо. Все данные будут потеряны.</p>
                    </div>
                    <button class="btn-danger">Удалить компанию</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render Partners tab
 */
function renderPartnersTab() {
    if (PARTNERS.length === 0) {
        return renderEmptyState(
            'partners',
            'У вас пока нет партнеров',
            'После выполнения заказов от компаний они появятся в этом списке',
            'Найти заказы'
        );
    }

    return `
        <div class="partners-section">
            <div class="section-intro">
                <h3>Партнеры (${PARTNERS.length} компаний)</h3>
                <p>Компании, с которыми вы работаете как внешний специалист</p>
            </div>
            <div class="partners-list">
                ${PARTNERS.map(partner => renderPartnerCard(partner)).join('')}
            </div>
        </div>
    `;
}

/**
 * Render partner card
 */
function renderPartnerCard(partner) {
    return `
        <div class="partner-card" data-partner-id="${partner.id}">
            <div class="partner-header">
                <div class="partner-logo">${partner.logo}</div>
                <div class="partner-info">
                    <h4 class="partner-name">${partner.name}</h4>
                    <p class="partner-description">${partner.description}</p>
                    <div class="partner-meta">
                        <span>📍 ${partner.city}</span>
                        <span>⭐ ${partner.rating}</span>
                        <span>👥 ${partner.teamSize} участников</span>
                    </div>
                </div>
            </div>
            <div class="partner-details">
                <div class="detail-row">
                    <span class="detail-label">Ваша роль:</span>
                    <span class="detail-value">${partner.yourRole}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Сотрудничество с:</span>
                    <span class="detail-value">${partner.partnerSince}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Выполнено проектов:</span>
                    <span class="detail-value">${partner.projectsCompleted}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Средний чек:</span>
                    <span class="detail-value">${formatCurrency(partner.avgPayment)}</span>
                </div>
            </div>
            <div class="partner-last-project">
                <span class="last-project-label">Последний проект:</span>
                <span class="last-project-title">${partner.lastProject.title}</span>
                <span class="last-project-time">${partner.lastProject.daysAgo} дней назад</span>
            </div>
            <div class="partner-actions">
                <button class="btn-secondary btn-view-partner" data-partner-id="${partner.id}">Открыть компанию</button>
                <button class="btn-outline">Портфолио (${partner.projectsCompleted})</button>
            </div>
        </div>
    `;
}

/**
 * Render Employers tab
 */
function renderEmployersTab() {
    if (EMPLOYERS.length === 0) {
        return renderEmptyState(
            'employers',
            'Вы не состоите в компаниях',
            'Создайте свою компанию или примите приглашение от других компаний',
            'Создать компанию'
        );
    }

    return `
        <div class="employers-section">
            <div class="section-intro">
                <h3>Работодатели (${EMPLOYERS.length} компаний)</h3>
                <p>Компании, в которых вы состоите в команде</p>
            </div>
            <div class="employers-list">
                ${EMPLOYERS.map(employer => renderEmployerCard(employer)).join('')}
            </div>
        </div>
    `;
}

/**
 * Render employer card
 */
function renderEmployerCard(employer) {
    return `
        <div class="employer-card" data-employer-id="${employer.id}">
            <div class="employer-header">
                <div class="employer-logo">${employer.logo}</div>
                <div class="employer-info">
                    <h4 class="employer-name">${employer.name}</h4>
                    <p class="employer-description">${employer.description}</p>
                    <div class="employer-meta">
                        <span>📍 ${employer.city}</span>
                        <span>⭐ ${employer.rating}</span>
                        <span>👥 ${employer.teamSize} участников</span>
                    </div>
                </div>
            </div>
            <div class="employer-details">
                <div class="detail-row">
                    <span class="detail-label">Ваша роль:</span>
                    <span class="detail-value role-badge">${employer.yourRole} (${employer.yourSpecialization})</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">В компании с:</span>
                    <span class="detail-value">${employer.joinedDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Выполнено проектов:</span>
                    <span class="detail-value">${employer.projectsCompleted}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ваш рейтинг:</span>
                    <span class="detail-value">⭐ ${employer.yourRating}</span>
                </div>
            </div>
            ${employer.currentProjects.length > 0 ? `
                <div class="employer-current-projects">
                    <span class="projects-label">Текущие проекты:</span>
                    ${employer.currentProjects.map(p => `
                        <div class="current-project-item">
                            <span class="project-title">${p.title}</span>
                            <span class="project-status">${p.status}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div class="employer-actions">
                <button class="btn-secondary btn-view-employer" data-employer-id="${employer.id}">Открыть компанию</button>
                <button class="btn-outline">Мои проекты (${employer.projectsCompleted})</button>
            </div>
        </div>
    `;
}

/**
 * Render empty state
 */
function renderEmptyState(type, title, text, buttonText) {
    return `
        <div class="empty-state">
            <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                    <rect x="9" y="14" width="6" height="8"></rect>
                </svg>
            </div>
            <h3 class="empty-title">${title}</h3>
            <p class="empty-text">${text}</p>
            <button class="btn-primary empty-action" data-action="${type}">
                ${buttonText}
            </button>
        </div>
    `;
}

/**
 * Show Create Company modal
 */
function showCreateCompanyModal(container) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal modal-create-company">
            <button class="modal-close" id="modal-close">×</button>
            <h2 class="modal-title">Создать компанию</h2>
            <div class="modal-divider"></div>
            
            <div class="modal-form">
                <div class="form-row">
                    <label>Логотип:</label>
                    <div class="logo-upload">
                        <div class="logo-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                        </div>
                        <button class="btn-secondary">Загрузить изображение</button>
                        <span class="form-hint">Рекомендуемый размер: 400x400px</span>
                    </div>
                </div>

                <div class="form-row">
                    <label>Название компании *</label>
                    <input type="text" class="form-input" id="company-name" placeholder="Mebel Studio">
                </div>

                <div class="form-row">
                    <label>Описание</label>
                    <textarea class="form-textarea" id="company-description" placeholder="Производство корпусной мебели на заказ..."></textarea>
                    <span class="char-count">0/500 символов</span>
                </div>

                <div class="form-row">
                    <label>Город *</label>
                    <input type="text" class="form-input" id="company-city" placeholder="Астана">
                </div>

                <div class="form-row">
                    <label>Специализация * (выберите до 5)</label>
                    <div class="checkbox-group">
                        <label class="checkbox-item"><input type="checkbox" name="spec" value="kitchens"> Кухни</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec" value="wardrobes"> Гардеробные</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec" value="bedrooms"> Спальни</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec" value="kids"> Детские</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec" value="office"> Офисная мебель</label>
                        <label class="checkbox-item"><input type="checkbox" name="spec" value="builtin"> Встроенная мебель</label>
                    </div>
                </div>

                <div class="modal-divider"></div>
                <h3 class="modal-subtitle">Контактная информация</h3>

                <div class="form-row">
                    <label>Телефон</label>
                    <input type="tel" class="form-input" id="company-phone" placeholder="+7 (777) 123-45-67">
                </div>

                <div class="form-row">
                    <label>Email</label>
                    <input type="email" class="form-input" id="company-email" placeholder="info@company.kz">
                </div>

                <div class="form-row">
                    <label>Сайт (опционально)</label>
                    <input type="text" class="form-input" id="company-website" placeholder="company.kz">
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn-secondary" id="btn-cancel">Отмена</button>
                <button class="btn-primary" id="btn-submit-company">Создать компанию</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    bindCreateCompanyModalEvents(overlay, container);
}

/**
 * Show Invite Team Member modal
 */
function showInviteTeamModal(container) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal modal-invite">
            <button class="modal-close" id="modal-close">×</button>
            <h2 class="modal-title">Пригласить участника в команду</h2>
            <div class="modal-divider"></div>
            
            <div class="modal-form">
                <div class="form-row">
                    <label>Поиск пользователя:</label>
                    <input type="text" class="form-input" id="search-user" placeholder="🔍 Введите имя или @username">
                </div>

                <div class="search-results" id="search-results">
                    <!-- Results will appear here -->
                </div>

                <div class="modal-divider"></div>
                <p class="form-alt-label">Или отправить приглашение по email:</p>

                <div class="form-row">
                    <input type="email" class="form-input" id="invite-email" placeholder="user@example.com">
                </div>

                <div class="form-row">
                    <label>Роль в команде:</label>
                    <div class="radio-group">
                        <label class="radio-item"><input type="radio" name="role" value="admin"> Администратор</label>
                        <label class="radio-item"><input type="radio" name="role" value="member" checked> Сотрудник</label>
                    </div>
                </div>

                <div class="form-row">
                    <label>Специализация в компании:</label>
                    <select class="form-select" id="invite-spec">
                        <option value="technologist">Технолог</option>
                        <option value="designer">Дизайнер</option>
                        <option value="assembler">Сборщик</option>
                        <option value="manager">Менеджер</option>
                        <option value="measurer">Замерщик</option>
                    </select>
                </div>

                <div class="form-row">
                    <label>Сообщение (опционально):</label>
                    <textarea class="form-textarea" id="invite-message" placeholder="Приглашаем вас присоединиться к нашей команде..."></textarea>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn-secondary" id="btn-cancel">Отмена</button>
                <button class="btn-primary" id="btn-send-invite">Отправить приглашение</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    bindInviteModalEvents(overlay, container);
}

/**
 * Show Member Detail modal
 */
function showMemberDetailModal(memberId, container) {
    const member = TEAM_MEMBERS.find(m => m.id === memberId);
    if (!member) return;

    const roleLabels = { owner: 'Владелец', admin: 'Администратор', member: 'Сотрудник' };
    const roleColors = { owner: '#AF52DE', admin: '#007AFF', member: '#34C759' };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal modal-member-detail">
            <button class="modal-close" id="modal-close">×</button>
            
            <div class="member-detail-header">
                <div class="member-avatar-large" style="background: ${roleColors[member.role]}">${member.avatar}</div>
                <div class="member-main-info">
                    <h2 class="member-name">${member.name}</h2>
                    <div class="member-username">${member.username} • ${member.specialization}</div>
                    <div class="member-rating">⭐ ${member.rating} (18 отзывов)</div>
                </div>
            </div>

            <div class="modal-divider"></div>

            <div class="member-detail-content">
                <h4>В компании:</h4>
                <div class="detail-list">
                    <div class="detail-item">
                        <span class="label">Роль:</span>
                        <span class="value role-badge role-${member.role}">${roleLabels[member.role]}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Специализация:</span>
                        <span class="value">${member.specialization}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Присоединился:</span>
                        <span class="value">${member.joinedYear}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Проектов выполнено:</span>
                        <span class="value">${member.projects}</span>
                    </div>
                </div>

                <h4>Навыки:</h4>
                <div class="tags-list">
                    <span class="tag">PRO100</span>
                    <span class="tag">3D Max</span>
                    <span class="tag">AutoCAD</span>
                    <span class="tag">Минимализм</span>
                </div>

                <h4>Последние проекты в компании:</h4>
                <div class="projects-mini-list">
                    <div class="project-mini-item">
                        <span class="project-title">Кухня "Лофт в ЖК Байтерек"</span>
                        <span class="project-rating">⭐ 5.0</span>
                    </div>
                    <div class="project-mini-item">
                        <span class="project-title">Гардеробная "Классика"</span>
                        <span class="project-rating">⭐ 4.9</span>
                    </div>
                    <div class="project-mini-item">
                        <span class="project-title">Спальня "Скандинавия"</span>
                        <span class="project-rating">⭐ 4.8</span>
                    </div>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn-secondary">Открыть профиль</button>
                <button class="btn-secondary">Посмотреть проекты</button>
            </div>
            
            ${member.role !== 'owner' ? `
                <div class="modal-divider"></div>
                <div class="modal-actions-danger">
                    <button class="btn-outline">Изменить роль</button>
                    <button class="btn-danger-outline">Удалить из команды</button>
                </div>
            ` : ''}
        </div>
    `;

    document.body.appendChild(overlay);
    bindMemberModalEvents(overlay, container);
}

/**
 * Bind events for create company modal
 */
function bindCreateCompanyModalEvents(overlay, container) {
    const closeModal = () => {
        overlay.remove();
    };

    overlay.querySelector('#modal-close').addEventListener('click', closeModal);
    overlay.querySelector('#btn-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    overlay.querySelector('#btn-submit-company').addEventListener('click', () => {
        // Validate and create company
        const name = overlay.querySelector('#company-name').value.trim();
        const city = overlay.querySelector('#company-city').value.trim();

        if (!name || !city) {
            showToast('Заполните обязательные поля', 'error');
            return;
        }

        hasOwnCompany = true;
        closeModal();
        showToast('Компания успешно создана ✓', 'success');
        refreshCompaniesSection(container);
    });

    // Character counter for description
    const textarea = overlay.querySelector('#company-description');
    const charCount = overlay.querySelector('.char-count');
    textarea.addEventListener('input', () => {
        charCount.textContent = `${textarea.value.length}/500 символов`;
    });
}

/**
 * Bind events for invite modal
 */
function bindInviteModalEvents(overlay, container) {
    const closeModal = () => {
        overlay.remove();
    };

    overlay.querySelector('#modal-close').addEventListener('click', closeModal);
    overlay.querySelector('#btn-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    overlay.querySelector('#btn-send-invite').addEventListener('click', () => {
        closeModal();
        showToast('Приглашение отправлено ✓', 'success');
    });
}

/**
 * Bind events for member modal
 */
function bindMemberModalEvents(overlay, container) {
    const closeModal = () => {
        overlay.remove();
    };

    overlay.querySelector('#modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

/**
 * Bind events for Companies section
 */
export function bindCompaniesEvents(container) {
    // Main tab switching
    container.querySelectorAll('.company-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            activeTab = tab.dataset.tab;
            refreshCompaniesSection(container);
        });
    });

    // Sub-tab switching
    container.querySelectorAll('.sub-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            activeSubTab = tab.dataset.subtab;
            refreshCompaniesSection(container);
        });
    });

    // Create company button
    const createBtn = container.querySelector('#btn-create-company');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            showCreateCompanyModal(container);
        });
    }

    // Empty state action
    container.querySelectorAll('.empty-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'company' || action === 'employers') {
                showCreateCompanyModal(container);
            }
        });
    });

    // Invite member button
    const inviteBtn = container.querySelector('#btn-invite-member');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', () => {
            showInviteTeamModal(container);
        });
    }

    // Team member rows
    container.querySelectorAll('.table-row[data-member-id]').forEach(row => {
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-icon')) {
                showMemberDetailModal(row.dataset.memberId, container);
            }
        });
    });

    // Team filter buttons
    container.querySelectorAll('.team-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.team-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Filter logic would go here
        });
    });

    // Partner cards
    container.querySelectorAll('.partner-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                // Could open partner detail modal
            }
        });
    });

    // Employer cards
    container.querySelectorAll('.employer-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                // Could open employer detail modal
            }
        });
    });
}

/**
 * Refresh companies section
 */
function refreshCompaniesSection(container) {
    const mainContent = container.querySelector('.profile-main');
    if (mainContent) {
        mainContent.innerHTML = renderCompaniesSection();
        bindCompaniesEvents(container);
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Format currency
 */
function formatCurrency(value) {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + ' млн₸';
    }
    return value.toLocaleString('ru-RU') + ' ₸';
}

/**
 * Get invitations for right panel
 */
export function getInvitations() {
    return INVITATIONS;
}

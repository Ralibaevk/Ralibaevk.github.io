/**
 * Portfolio Section Module
 * Implements statistics, skills, reviews, and completed projects
 */

// Mock data
const PORTFOLIO_STATS = {
    projectsCompleted: 127,
    companies: 42,
    rating: 4.8,
    experience: 8,
    reviewsCount: 24,
    onTimePercent: 100,
    avgCheck: 85000,
    repeatClients: 92
};

const USER_SKILLS = {
    description: 'Специализируюсь на проектировании и деталировке корпусной мебели. Более 8 лет опыта работы с кухнями, гардеробными и офисной мебелью. Владею современными CAD-программами, знаю особенности работы с различными материалами и фурнитурой. Гарантирую точность расчетов и оптимизацию раскроя.',
    tags: ['Корпусная мебель', 'Деталировка', 'Раскрой', 'Basis Mebelschik', 'PRO100', 'AutoCAD', 'ЛДСП', 'МДФ', 'Blum', 'Hettich']
};

const PORTFOLIO_REVIEWS = [
    {
        id: 'r1',
        company: { name: 'Mebel Studio', logo: 'MS', verified: true },
        projectId: 'proj1',
        projectTitle: 'Кухня "Минимализм в ЖК Астана"',
        author: { name: 'Сергей Иванов', position: 'Директор' },
        date: '2026-01-12',
        rating: 5.0,
        text: 'Отличная работа! Деталировка выполнена точно в срок, все размеры сошлись идеально. Карта раскроя составлена оптимально. Будем обращаться снова.',
        ratings: { quality: 5.0, deadline: 5.0, communication: 5.0, professionalism: 5.0 }
    },
    {
        id: 'r2',
        company: { name: 'KitchenPro', logo: 'KP', verified: true },
        projectId: 'proj2',
        projectTitle: 'Гардеробная система "Модерн"',
        author: { name: 'Анна Петрова', position: 'Менеджер проектов' },
        date: '2025-12-20',
        rating: 4.8,
        text: 'Профессиональный подход к работе. Быстро разобрался в задаче и предложил оптимальные решения.',
        ratings: { quality: 5.0, deadline: 4.5, communication: 5.0, professionalism: 4.7 }
    },
    {
        id: 'r3',
        company: { name: 'Design Masters', logo: 'DM', verified: false },
        projectId: 'proj3',
        projectTitle: 'Офисная мебель ТехноПарк',
        author: { name: 'Михаил Козлов', position: 'Владелец' },
        date: '2025-11-15',
        rating: 4.5,
        text: 'Хорошая работа, но были небольшие задержки по срокам. В целом результатом довольны.',
        ratings: { quality: 4.5, deadline: 4.0, communication: 4.5, professionalism: 5.0 }
    }
];

const PORTFOLIO_PROJECTS = [
    {
        id: 'proj1',
        title: 'Кухня "Минимализм в ЖК Астана"',
        category: 'kitchen',
        type: 'detailing',
        style: 'minimalism',
        company: { name: 'Mebel Studio', logo: 'MS' },
        workType: 'freelance',
        period: { start: '2025-01', end: '2025-02' },
        role: 'Технолог',
        budget: 450000,
        myFee: 85000,
        rating: 5.0,
        reviewsCount: 1,
        viewsCount: 127,
        isPublic: true,
        images: [],
        description: {
            task: 'Требовалась деталировка кухонного гарнитура площадью 12 м². Проект был разработан в Basis Мебельщик.',
            solution: 'Выполнена полная деталировка с оптимизацией раскроя. Использованы современные системы фурнитуры.',
            result: 'Проект реализован в срок. Все размеры сошлись идеально. Заказчик доволен результатом.'
        },
        materials: ['ЛДСП Egger', 'Blum', 'Скрытые петли', 'Push-to-open'],
        parameters: { objectType: 'Жилое помещение', area: 12, duration: 14, plannedDuration: 14 }
    },
    {
        id: 'proj2',
        title: 'Гардеробная система "Модерн"',
        category: 'wardrobe',
        type: 'detailing',
        style: 'modern',
        company: { name: 'KitchenPro', logo: 'KP' },
        workType: 'freelance',
        period: { start: '2024-11', end: '2024-12' },
        role: 'Технолог',
        budget: 280000,
        myFee: 55000,
        rating: 4.8,
        reviewsCount: 1,
        viewsCount: 89,
        isPublic: true,
        images: [],
        description: {
            task: 'Проектирование и деталировка гардеробной системы для частного дома.',
            solution: 'Разработана эргономичная система хранения с учетом всех пожеланий заказчика.',
            result: 'Проект успешно реализован. Клиент остался доволен функциональностью.'
        },
        materials: ['ЛДСП Kronospan', 'Hettich', 'LED подсветка'],
        parameters: { objectType: 'Жилое помещение', area: 8, duration: 21, plannedDuration: 20 }
    },
    {
        id: 'proj3',
        title: 'Офисная мебель ТехноПарк',
        category: 'office',
        type: 'complex',
        style: 'modern',
        company: { name: 'Design Masters', logo: 'DM' },
        workType: 'company',
        period: { start: '2024-09', end: '2024-11' },
        role: 'Консультант',
        budget: 1200000,
        myFee: 200000,
        rating: 4.5,
        reviewsCount: 1,
        viewsCount: 156,
        isPublic: true,
        images: [],
        description: {
            task: 'Комплексное оснащение офиса площадью 200 м² корпусной мебелью.',
            solution: 'Разработаны рабочие станции, шкафы для документов, зоны отдыха.',
            result: 'Офис полностью укомплектован. Проект завершен с небольшим отставанием от графика.'
        },
        materials: ['ЛДСП Egger', 'МДФ', 'Boyard'],
        parameters: { objectType: 'Офис', area: 200, duration: 45, plannedDuration: 40 }
    },
    {
        id: 'proj4',
        title: 'Спальня "Скандинавия"',
        category: 'bedroom',
        type: 'design',
        style: 'scandinavian',
        company: { name: 'Mebel Studio', logo: 'MS' },
        workType: 'freelance',
        period: { start: '2024-08', end: '2024-08' },
        role: 'Технолог',
        budget: 320000,
        myFee: 65000,
        rating: 5.0,
        reviewsCount: 0,
        viewsCount: 45,
        isPublic: false,
        images: [],
        description: {
            task: 'Деталировка спальной мебели в скандинавском стиле.',
            solution: 'Применены натуральные материалы и минималистичный дизайн.',
            result: 'Проект выполнен качественно и в срок.'
        },
        materials: ['Массив', 'МДФ', 'GTV'],
        parameters: { objectType: 'Жилое помещение', area: 18, duration: 10, plannedDuration: 10 }
    }
];

// State
let reviewFilter = 'all';
let reviewSort = 'date_desc';
let projectFilter = { category: 'all', type: 'all', year: 'all', visibility: 'all' };
let projectSort = 'date_desc';
let activeModal = null;

/**
 * Render the Portfolio section
 */
export function renderPortfolioSection() {
    return `
        <div class="portfolio-section">
            ${renderStatsBlock()}
            <div class="portfolio-skills-rating-row">
                ${renderSkillsBlock()}
                ${renderRatingSummaryBlock()}
            </div>
            ${renderProjectsBlock()}
        </div>
        <div id="portfolio-modal-container"></div>
    `;
}

/**
 * Statistics Block
 */
function renderStatsBlock() {
    const stats = PORTFOLIO_STATS;
    return `
        <div class="portfolio-block">
            <div class="portfolio-block-header">
                <h3 class="portfolio-block-title">
                    <svg class="block-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 20V10M12 20V4M6 20v-6"/>
                    </svg>
                    Моя статистика
                </h3>
            </div>
            <div class="portfolio-stats-grid">
                <div class="portfolio-stat-card">
                    <div class="stat-value">${stats.projectsCompleted}</div>
                    <div class="stat-label">Проектов выполнено</div>
                </div>
                <div class="portfolio-stat-card">
                    <div class="stat-value">${stats.companies}</div>
                    <div class="stat-label">Компаний</div>
                </div>
                <div class="portfolio-stat-card">
                    <div class="stat-value">${stats.rating}</div>
                    <div class="stat-label">Рейтинг</div>
                    <div class="stat-stars">${renderStars(stats.rating)}</div>
                </div>
                <div class="portfolio-stat-card">
                    <div class="stat-value">${stats.experience} лет</div>
                    <div class="stat-label">Опыт</div>
                </div>
                <div class="portfolio-stat-card">
                    <div class="stat-value">${stats.reviewsCount}</div>
                    <div class="stat-label">Отзывов</div>
                </div>
                <div class="portfolio-stat-card">
                    <div class="stat-value">${stats.onTimePercent}%</div>
                    <div class="stat-label">В срок</div>
                </div>
                <div class="portfolio-stat-card">
                    <div class="stat-value">${formatCurrency(stats.avgCheck)}</div>
                    <div class="stat-label">Средний чек</div>
                </div>
                <div class="portfolio-stat-card">
                    <div class="stat-value">${stats.repeatClients}%</div>
                    <div class="stat-label">Повторные клиенты</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Skills Block - simplified with description
 */
function renderSkillsBlock() {
    return `
        <div class="portfolio-block portfolio-skills-block">
            <button class="portfolio-edit-icon" id="btn-edit-skills" title="Редактировать">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <div class="portfolio-block-header">
                <h3 class="portfolio-block-title">
                    <svg class="block-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                    </svg>
                    Навыки
                </h3>
            </div>
            <div class="skills-description">
                <p>${USER_SKILLS.description}</p>
            </div>
            <div class="skills-tags-row">
                ${USER_SKILLS.tags.map(tag => `<span class="skill-tag">${tag}</span>`).join('')}
            </div>
        </div>
    `;
}

/**
 * Rating Summary Block - compact version next to skills
 */
function renderRatingSummaryBlock() {
    const avgRatings = calculateAverageRatings();

    return `
        <div class="portfolio-block portfolio-rating-block">
            <div class="portfolio-block-header">
                <h3 class="portfolio-block-title">
                    <svg class="block-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Рейтинг
                </h3>
            </div>
            <div class="rating-summary-content">
                <div class="rating-big">
                    <span class="rating-big-value">${PORTFOLIO_STATS.rating}</span>
                    <div class="rating-big-stars">${renderStars(PORTFOLIO_STATS.rating)}</div>
                    <span class="rating-big-count">${PORTFOLIO_STATS.reviewsCount} отзывов</span>
                </div>
                <div class="rating-details-compact">
                    <div class="rating-detail-row">
                        <span>Качество</span>
                        <span>${avgRatings.quality.toFixed(1)}</span>
                    </div>
                    <div class="rating-detail-row">
                        <span>Сроки</span>
                        <span>${avgRatings.deadline.toFixed(1)}</span>
                    </div>
                    <div class="rating-detail-row">
                        <span>Коммуникация</span>
                        <span>${avgRatings.communication.toFixed(1)}</span>
                    </div>
                    <div class="rating-detail-row">
                        <span>Профессионализм</span>
                        <span>${avgRatings.professionalism.toFixed(1)}</span>
                    </div>
                </div>
                <button class="reviews-modal-btn" id="btn-open-reviews">Отзывы (${PORTFOLIO_REVIEWS.length})</button>
            </div>
        </div>
    `;
}

/**
 * Reviews Modal - full reviews list
 */
function renderReviewsModal() {
    const reviews = getFilteredReviews();
    const distribution = calculateRatingDistribution();
    const avgRatings = calculateAverageRatings();

    return `
        <div class="portfolio-modal-overlay" id="reviews-modal">
            <div class="portfolio-modal">
                <div class="modal-header">
                    <h2 class="modal-title">Отзывы (${PORTFOLIO_REVIEWS.length})</h2>
                    <button class="modal-close-btn" id="close-reviews-modal">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="reviews-summary">
                        <div class="reviews-avg">
                            <div class="reviews-avg-value">${PORTFOLIO_STATS.rating}</div>
                            <div class="reviews-avg-label">из 5.0</div>
                        </div>
                        <div class="reviews-distribution">
                            ${[5, 4, 3, 2, 1].map(star => {
        const count = distribution[star] || 0;
        const percent = PORTFOLIO_REVIEWS.length > 0 ? Math.round((count / PORTFOLIO_REVIEWS.length) * 100) : 0;
        return `
                                <div class="distribution-row">
                                    <span class="distribution-star">${star}</span>
                                    <svg class="distribution-star-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                    <div class="distribution-bar">
                                        <div class="distribution-fill" style="width: ${percent}%"></div>
                                    </div>
                                    <span class="distribution-count">${count} (${percent}%)</span>
                                </div>
                            `;
    }).join('')}
                        </div>
                    </div>
                    
                    <div class="reviews-details">
                        <div class="reviews-detail-item">
                            <span class="detail-label">Качество работы:</span>
                            <span class="detail-stars">${renderStars(avgRatings.quality)}</span>
                            <span class="detail-value">${avgRatings.quality.toFixed(1)}</span>
                        </div>
                        <div class="reviews-detail-item">
                            <span class="detail-label">Соблюдение сроков:</span>
                            <span class="detail-stars">${renderStars(avgRatings.deadline)}</span>
                            <span class="detail-value">${avgRatings.deadline.toFixed(1)}</span>
                        </div>
                        <div class="reviews-detail-item">
                            <span class="detail-label">Коммуникация:</span>
                            <span class="detail-stars">${renderStars(avgRatings.communication)}</span>
                            <span class="detail-value">${avgRatings.communication.toFixed(1)}</span>
                        </div>
                        <div class="reviews-detail-item">
                            <span class="detail-label">Профессионализм:</span>
                            <span class="detail-stars">${renderStars(avgRatings.professionalism)}</span>
                            <span class="detail-value">${avgRatings.professionalism.toFixed(1)}</span>
                        </div>
                    </div>
                    
                    <div class="reviews-filters">
                        <select class="portfolio-select" id="review-filter-modal">
                            <option value="all" ${reviewFilter === 'all' ? 'selected' : ''}>Все отзывы</option>
                            <option value="5" ${reviewFilter === '5' ? 'selected' : ''}>5 звезд</option>
                            <option value="4" ${reviewFilter === '4' ? 'selected' : ''}>4 звезды</option>
                            <option value="3" ${reviewFilter === '3' ? 'selected' : ''}>3 звезды и ниже</option>
                        </select>
                        <select class="portfolio-select" id="review-sort-modal">
                            <option value="date_desc" ${reviewSort === 'date_desc' ? 'selected' : ''}>Новые сначала</option>
                            <option value="date_asc" ${reviewSort === 'date_asc' ? 'selected' : ''}>Старые сначала</option>
                            <option value="rating_desc" ${reviewSort === 'rating_desc' ? 'selected' : ''}>Высокий рейтинг</option>
                            <option value="rating_asc" ${reviewSort === 'rating_asc' ? 'selected' : ''}>Низкий рейтинг</option>
                        </select>
                    </div>
                    
                    <div class="reviews-list">
                        ${reviews.length > 0 ? reviews.map(r => renderReviewCard(r)).join('') : `
                            <div class="portfolio-empty">
                                <p>Пока нет отзывов</p>
                            </div>
                        `}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="modal-btn primary" id="close-reviews-modal-btn">Закрыть</button>
                </div>
            </div>
        </div>
    `;
}

function renderReviewCard(review) {
    return `
        <div class="review-card" data-review-id="${review.id}">
            <div class="review-header">
                <div class="review-company">
                    <div class="review-company-logo">${review.company.logo}</div>
                    <span class="review-company-name">${review.company.name}</span>
                </div>
                <div class="review-rating">
                    ${renderStars(review.rating)}
                    <span class="review-rating-value">${review.rating.toFixed(1)}</span>
                </div>
            </div>
            <div class="review-project">Проект: ${review.projectTitle}</div>
            <div class="review-author">${review.author.name}, ${review.author.position} • ${formatDate(review.date)}</div>
            <p class="review-text">"${review.text}"</p>
            <div class="review-ratings-detail">
                <span>Качество: ${renderStars(review.ratings.quality, true)}</span>
                <span>Сроки: ${renderStars(review.ratings.deadline, true)}</span>
                <span>Коммуникация: ${renderStars(review.ratings.communication, true)}</span>
                <span>Профессионализм: ${renderStars(review.ratings.professionalism, true)}</span>
            </div>
            <button class="review-project-link" data-project-id="${review.projectId}">Перейти к проекту</button>
        </div>
    `;
}

/**
 * Projects Block
 */
function renderProjectsBlock() {
    const projects = PORTFOLIO_PROJECTS;

    return `
        <div class="portfolio-block">
            <div class="portfolio-block-header">
                <h3 class="portfolio-block-title">
                    <svg class="block-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                    </svg>
                    Выполненные проекты (${PORTFOLIO_PROJECTS.length})
                </h3>
            </div>
            
            <div class="projects-grid">
                ${projects.length > 0 ? projects.map(p => renderProjectCard(p)).join('') : `
                    <div class="portfolio-empty">
                        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                        </svg>
                        <h4>Портфолио пока пусто</h4>
                        <p>Ваши выполненные заказы будут автоматически добавляться сюда</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

function renderProjectCard(project) {
    const typeLabels = { design: 'Дизайн', detailing: 'Деталировка', production: 'Производство', complex: 'Комплексный' };
    const categoryLabels = { kitchen: 'Кухня', wardrobe: 'Гардеробная', bedroom: 'Спальня', office: 'Офис' };

    return `
        <div class="project-card" data-project-id="${project.id}">
            ${!project.isPublic ? '<div class="project-visibility-badge">Скрыто</div>' : ''}
            <div class="project-cover">
                <svg class="project-cover-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
            </div>
            <div class="project-content">
                <h4 class="project-title">${project.title}</h4>
                <div class="project-tags">
                    <span class="project-tag">${typeLabels[project.type] || project.type}</span>
                    <span class="project-tag">${categoryLabels[project.category] || project.category}</span>
                </div>
                <div class="project-info-row">
                    <span class="project-company-logo">${project.company.logo}</span>
                    <span class="project-company-name">${project.company.name}</span>
                    <span class="project-work-type">${project.workType === 'freelance' ? 'Фриланс' : 'В штате'}</span>
                </div>
                <div class="project-info-row">
                    <span>${formatPeriod(project.period)}</span>
                </div>
                <div class="project-info-row">
                    <span>Роль: ${project.role}</span>
                    <span>Бюджет: ${formatCurrency(project.budget)}</span>
                </div>
                <div class="project-footer">
                    ${project.reviewsCount > 0 ? `
                        <span class="project-rating">${renderStars(project.rating, true)} ${project.rating.toFixed(1)}</span>
                    ` : '<span class="project-no-reviews">Нет отзывов</span>'}
                    <span class="project-views">${project.viewsCount} просм.</span>
                </div>
                <button class="project-details-btn" data-project-id="${project.id}">Подробнее</button>
            </div>
        </div>
    `;
}

/**
 * Project Detail Modal
 */
function renderProjectDetailModal(projectId) {
    const project = PORTFOLIO_PROJECTS.find(p => p.id === projectId);
    if (!project) return '';

    const review = PORTFOLIO_REVIEWS.find(r => r.projectId === projectId);
    const typeLabels = { design: 'Дизайн', detailing: 'Деталировка', production: 'Производство', complex: 'Комплексный' };

    return `
        <div class="portfolio-modal-overlay" id="project-detail-modal">
            <div class="portfolio-modal">
                <div class="modal-header">
                    <h2 class="modal-title">${project.title}</h2>
                    <div class="modal-actions">
                        <button class="modal-menu-btn" id="project-menu-btn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                            </svg>
                        </button>
                        <button class="modal-close-btn" id="close-project-modal">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="modal-body">
                    <div class="modal-gallery">
                        <div class="gallery-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <span>Нет изображений</span>
                        </div>
                    </div>
                    
                    <div class="modal-tags">
                        <span class="visibility-tag ${project.isPublic ? 'public' : 'hidden'}" data-project-id="${project.id}">
                            ${project.isPublic ? 'Публичный' : 'Скрытый'}
                        </span>
                        <span class="modal-tag">${typeLabels[project.type]}</span>
                    </div>
                    
                    <div class="modal-section">
                        <h4>О проекте</h4>
                        <div class="modal-project-info">
                            <span class="project-company-logo">${project.company.logo}</span>
                            <div>
                                <div>${project.company.name}</div>
                                <div class="modal-info-meta">Тип: ${project.workType === 'freelance' ? 'Фриланс' : 'В штате'} • Период: ${formatPeriod(project.period)}</div>
                                <div class="modal-info-meta">Моя роль: ${project.role}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-section">
                        <h4>Описание</h4>
                        <div class="modal-description">
                            <p><strong>Задача:</strong> ${project.description.task}</p>
                            <p><strong>Решение:</strong> ${project.description.solution}</p>
                            <p><strong>Результат:</strong> ${project.description.result}</p>
                        </div>
                    </div>
                    
                    <div class="modal-section">
                        <h4>Параметры проекта</h4>
                        <ul class="modal-params">
                            <li>Тип объекта: ${project.parameters.objectType}</li>
                            <li>Площадь: ${project.parameters.area} м²</li>
                            <li>Бюджет проекта: ${formatCurrency(project.budget)}</li>
                            <li>Мой гонорар: ${formatCurrency(project.myFee)}</li>
                            <li>Срок выполнения: ${project.parameters.duration} дней (план: ${project.parameters.plannedDuration} дней)</li>
                        </ul>
                    </div>
                    
                    <div class="modal-section">
                        <h4>Материалы и технологии</h4>
                        <div class="modal-materials">
                            ${project.materials.map(m => `<span class="material-tag">${m}</span>`).join('')}
                        </div>
                    </div>
                    
                    ${review ? `
                        <div class="modal-section">
                            <h4>Отзыв заказчика</h4>
                            <div class="modal-review">
                                <div class="modal-review-header">
                                    ${renderStars(review.rating)} ${review.rating.toFixed(1)}
                                </div>
                                <div class="modal-review-author">${review.author.name}, ${review.author.position} • ${formatDate(review.date)}</div>
                                <p class="modal-review-text">"${review.text}"</p>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="modal-section">
                        <h4>Статистика</h4>
                        <ul class="modal-params">
                            <li>Просмотров: ${project.viewsCount}</li>
                        </ul>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="modal-btn secondary" id="btn-share-project">Поделиться</button>
                    <button class="modal-btn secondary" id="btn-edit-project" data-project-id="${project.id}">Редактировать</button>
                    <button class="modal-btn primary" id="close-project-modal-btn">Закрыть</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Skills Edit Modal
 */
function renderSkillsEditModal() {
    const categoryLabels = {
        software: 'Программы',
        materials: 'Материалы',
        hardware: 'Фурнитура',
        technologies: 'Технологии',
        equipment: 'Оборудование'
    };

    return `
        <div class="portfolio-modal-overlay" id="skills-edit-modal">
            <div class="portfolio-modal modal-medium">
                <div class="modal-header">
                    <h2 class="modal-title">Редактировать навыки</h2>
                    <button class="modal-close-btn" id="close-skills-modal">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    ${Object.entries(USER_SKILLS).map(([cat, skills]) => `
                        <div class="modal-section">
                            <h4>${categoryLabels[cat]}</h4>
                            <div class="skills-edit-tags" data-category="${cat}">
                                ${skills.map(s => `
                                    <span class="skill-tag editable">
                                        ${s}
                                        <button class="skill-remove-btn" data-skill="${s}" data-category="${cat}">x</button>
                                    </span>
                                `).join('')}
                                <button class="skill-add-btn" data-category="${cat}">+ Добавить</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="modal-footer">
                    <button class="modal-btn secondary" id="cancel-skills-edit">Отмена</button>
                    <button class="modal-btn primary" id="save-skills">Сохранить</button>
                </div>
            </div>
        </div>
    `;
}

// Helper functions
function renderStars(rating, small = false) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    const size = small ? 'small' : '';

    let html = '';
    for (let i = 0; i < fullStars; i++) {
        html += `<svg class="star-icon filled ${size}" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    if (hasHalf) {
        html += `<svg class="star-icon half ${size}" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    for (let i = 0; i < emptyStars; i++) {
        html += `<svg class="star-icon empty ${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    return html;
}

function formatCurrency(value) {
    return value.toLocaleString('ru-RU') + ' T';
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatPeriod(period) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const [startYear, startMonth] = period.start.split('-');
    const [endYear, endMonth] = period.end.split('-');

    if (startYear === endYear && startMonth === endMonth) {
        return `${months[parseInt(startMonth) - 1]} ${startYear}`;
    }
    return `${months[parseInt(startMonth) - 1]}-${months[parseInt(endMonth) - 1]} ${endYear}`;
}

function getFilteredReviews() {
    let reviews = [...PORTFOLIO_REVIEWS];

    if (reviewFilter !== 'all') {
        const minRating = parseInt(reviewFilter);
        if (minRating === 3) {
            reviews = reviews.filter(r => r.rating <= 3);
        } else {
            reviews = reviews.filter(r => Math.floor(r.rating) === minRating);
        }
    }

    reviews.sort((a, b) => {
        switch (reviewSort) {
            case 'date_asc': return new Date(a.date) - new Date(b.date);
            case 'rating_desc': return b.rating - a.rating;
            case 'rating_asc': return a.rating - b.rating;
            default: return new Date(b.date) - new Date(a.date);
        }
    });

    return reviews;
}

function getFilteredProjects() {
    let projects = [...PORTFOLIO_PROJECTS];

    if (projectFilter.category !== 'all') {
        projects = projects.filter(p => p.category === projectFilter.category);
    }
    if (projectFilter.type !== 'all') {
        projects = projects.filter(p => p.type === projectFilter.type);
    }
    if (projectFilter.year !== 'all') {
        projects = projects.filter(p => p.period.end.startsWith(projectFilter.year));
    }
    if (projectFilter.visibility !== 'all') {
        projects = projects.filter(p => projectFilter.visibility === 'public' ? p.isPublic : !p.isPublic);
    }

    projects.sort((a, b) => {
        switch (projectSort) {
            case 'date_asc': return a.period.end.localeCompare(b.period.end);
            case 'rating_desc': return b.rating - a.rating;
            case 'budget_desc': return b.budget - a.budget;
            default: return b.period.end.localeCompare(a.period.end);
        }
    });

    return projects;
}

function getProjectCategories() {
    const counts = {};
    PORTFOLIO_PROJECTS.forEach(p => {
        counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const labels = { kitchen: 'Кухни', wardrobe: 'Гардеробные', bedroom: 'Спальни', office: 'Офис' };
    return Object.entries(counts).map(([value, count]) => ({ value, label: labels[value] || value, count }));
}

function calculateRatingDistribution() {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    PORTFOLIO_REVIEWS.forEach(r => {
        dist[Math.floor(r.rating)]++;
    });
    return dist;
}

function calculateAverageRatings() {
    if (PORTFOLIO_REVIEWS.length === 0) return { quality: 0, deadline: 0, communication: 0, professionalism: 0 };

    const sum = { quality: 0, deadline: 0, communication: 0, professionalism: 0 };
    PORTFOLIO_REVIEWS.forEach(r => {
        sum.quality += r.ratings.quality;
        sum.deadline += r.ratings.deadline;
        sum.communication += r.ratings.communication;
        sum.professionalism += r.ratings.professionalism;
    });

    const count = PORTFOLIO_REVIEWS.length;
    return {
        quality: sum.quality / count,
        deadline: sum.deadline / count,
        communication: sum.communication / count,
        professionalism: sum.professionalism / count
    };
}

/**
 * Bind events for Portfolio section
 */
export function bindPortfolioEvents(container) {
    // Edit skills button
    const editSkillsBtn = container.querySelector('#btn-edit-skills');
    if (editSkillsBtn) {
        editSkillsBtn.addEventListener('click', () => {
            showModal(container, renderSkillsEditModal());
            bindSkillsModalEvents(container);
        });
    }

    // Open reviews modal button
    const openReviewsBtn = container.querySelector('#btn-open-reviews');
    if (openReviewsBtn) {
        openReviewsBtn.addEventListener('click', () => {
            showModal(container, renderReviewsModal());
            bindReviewsModalEvents(container);
        });
    }

    // Project category chips
    container.querySelectorAll('.projects-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            projectFilter.category = chip.dataset.category;
            refreshPortfolio(container);
        });
    });

    // Project filters
    bindSelectChange(container, 'project-type-filter', (val) => { projectFilter.type = val; refreshPortfolio(container); });
    bindSelectChange(container, 'project-year-filter', (val) => { projectFilter.year = val; refreshPortfolio(container); });
    bindSelectChange(container, 'project-visibility-filter', (val) => { projectFilter.visibility = val; refreshPortfolio(container); });
    bindSelectChange(container, 'project-sort', (val) => { projectSort = val; refreshPortfolio(container); });

    // Project cards - open detail modal
    container.querySelectorAll('.project-card, .project-details-btn').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const projectId = el.dataset.projectId || el.closest('.project-card')?.dataset.projectId;
            if (projectId) {
                showModal(container, renderProjectDetailModal(projectId));
                bindProjectModalEvents(container);
            }
        });
    });

    // Review project links
    container.querySelectorAll('.review-project-link').forEach(btn => {
        btn.addEventListener('click', () => {
            const projectId = btn.dataset.projectId;
            if (projectId) {
                showModal(container, renderProjectDetailModal(projectId));
                bindProjectModalEvents(container);
            }
        });
    });
}

function bindSelectChange(container, id, callback) {
    const select = container.querySelector(`#${id}`);
    if (select) {
        select.addEventListener('change', () => callback(select.value));
    }
}

function showModal(container, html) {
    const modalContainer = container.querySelector('#portfolio-modal-container') || document.body;
    modalContainer.innerHTML = html;
}

function closeModal(container) {
    const modalContainer = container.querySelector('#portfolio-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
}

function refreshPortfolio(container) {
    const portfolioSection = container.querySelector('.portfolio-section');
    if (portfolioSection) {
        const parent = portfolioSection.parentElement;
        parent.innerHTML = renderPortfolioSection();
        bindPortfolioEvents(container);
    }
}

function bindProjectModalEvents(container) {
    const closeBtn = container.querySelector('#close-project-modal');
    const closeBtnFooter = container.querySelector('#close-project-modal-btn');
    const editBtn = container.querySelector('#btn-edit-project');
    const visibilityTag = container.querySelector('.visibility-tag');

    [closeBtn, closeBtnFooter].forEach(btn => {
        if (btn) btn.addEventListener('click', () => closeModal(container));
    });

    if (visibilityTag) {
        visibilityTag.addEventListener('click', () => {
            const projectId = visibilityTag.dataset.projectId;
            const project = PORTFOLIO_PROJECTS.find(p => p.id === projectId);
            if (project) {
                project.isPublic = !project.isPublic;
                visibilityTag.textContent = project.isPublic ? 'Публичный' : 'Скрытый';
                visibilityTag.classList.toggle('public', project.isPublic);
                visibilityTag.classList.toggle('hidden', !project.isPublic);
            }
        });
    }

    // Close on overlay click
    const overlay = container.querySelector('.portfolio-modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(container);
        });
    }
}

function bindSkillsModalEvents(container) {
    const closeBtn = container.querySelector('#close-skills-modal');
    const cancelBtn = container.querySelector('#cancel-skills-edit');
    const saveBtn = container.querySelector('#save-skills');

    [closeBtn, cancelBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => closeModal(container));
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            // In real app, save to API
            closeModal(container);
            refreshPortfolio(container);
        });
    }

    // Close on overlay click
    const overlay = container.querySelector('.portfolio-modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(container);
        });
    }
}

function bindReviewsModalEvents(container) {
    const closeBtn = container.querySelector('#close-reviews-modal');
    const closeBtnFooter = container.querySelector('#close-reviews-modal-btn');

    [closeBtn, closeBtnFooter].forEach(btn => {
        if (btn) btn.addEventListener('click', () => closeModal(container));
    });

    // Review filters in modal
    bindSelectChange(container, 'review-filter-modal', (val) => {
        reviewFilter = val;
        // Re-render the modal content
        showModal(container, renderReviewsModal());
        bindReviewsModalEvents(container);
    });
    bindSelectChange(container, 'review-sort-modal', (val) => {
        reviewSort = val;
        showModal(container, renderReviewsModal());
        bindReviewsModalEvents(container);
    });

    // Review project links in modal
    container.querySelectorAll('.review-project-link').forEach(btn => {
        btn.addEventListener('click', () => {
            const projectId = btn.dataset.projectId;
            if (projectId) {
                showModal(container, renderProjectDetailModal(projectId));
                bindProjectModalEvents(container);
            }
        });
    });

    // Close on overlay click
    const overlay = container.querySelector('.portfolio-modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(container);
        });
    }
}

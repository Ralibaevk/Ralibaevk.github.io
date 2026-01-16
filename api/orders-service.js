/**
 * Orders Service - Mock API for Orders functionality
 * Provides orders, applications, saved orders, and specialists data
 */

// === MOCK DATA ===

const MOCK_ORDERS = [
    {
        id: 'order_1',
        title: 'Деталировка кухонного гарнитура',
        description: 'Требуется деталировка кухни 12 м². Проект готов в Basis Мебельщик. Нужна карта раскроя ЛДСП Egger W1000 и кромки. Фасады — МДФ с фрезеровкой.',
        orderType: 'detailing',
        workFormat: 'remote',
        budgetMin: 80000,
        budgetMax: 100000,
        isNegotiable: false,
        deadlineDays: 3,
        city: 'Астана',
        requirements: ['Опыт работы в Basis Мебельщик', 'Знание материалов ЛДСП Egger', 'Портфолио с примерами работ'],
        files: [{ name: 'Проект_кухня.bm', size: '2.4 MB' }, { name: 'Планировка.pdf', size: '450 KB' }],
        visibility: 'public',
        status: 'active',
        createdAt: '2026-01-15T12:30:00',
        viewsCount: 127,
        applicationsCount: 8,
        avgProposedPrice: 85000,
        isNew: true,
        isUrgent: true,
        isHighPay: false,
        customer: {
            id: 'company_1',
            name: 'KitchenPro',
            avatar: 'KP',
            rating: 4.9,
            reviewsCount: 24,
            projectsCount: 127,
            city: 'Астана'
        }
    },
    {
        id: 'order_2',
        title: 'Дизайн-проект гардеробной комнаты',
        description: 'Нужен полный дизайн-проект гардеробной 8 м². Включая визуализацию, чертежи, спецификацию материалов. Стиль — современный минимализм.',
        orderType: 'design',
        workFormat: 'remote',
        budgetMin: 150000,
        budgetMax: 200000,
        isNegotiable: false,
        deadlineDays: 14,
        city: 'Алматы',
        requirements: ['Опыт дизайна гардеробных', '3D визуализация', 'Знание систем хранения'],
        files: [{ name: 'Замеры.pdf', size: '320 KB' }],
        visibility: 'public',
        status: 'active',
        createdAt: '2026-01-15T10:00:00',
        viewsCount: 89,
        applicationsCount: 12,
        avgProposedPrice: 175000,
        isNew: true,
        isUrgent: false,
        isHighPay: true,
        customer: {
            id: 'company_2',
            name: 'Mebel Studio',
            avatar: 'MS',
            rating: 4.7,
            reviewsCount: 18,
            projectsCount: 85,
            city: 'Алматы'
        }
    },
    {
        id: 'order_3',
        title: 'Замер помещения под кухню',
        description: 'Требуется профессиональный замер помещения под кухню. ЖК "Астана Тауэрс", 15 этаж. Предоставить подробный чертеж с коммуникациями.',
        orderType: 'measurement',
        workFormat: 'onsite',
        budgetMin: 15000,
        budgetMax: 25000,
        isNegotiable: true,
        deadlineDays: 2,
        city: 'Астана',
        requirements: ['Лазерный дальномер', 'Опыт замеров', 'Выезд в день обращения'],
        files: [],
        visibility: 'public',
        status: 'active',
        createdAt: '2026-01-14T16:45:00',
        viewsCount: 45,
        applicationsCount: 5,
        avgProposedPrice: 20000,
        isNew: false,
        isUrgent: true,
        isHighPay: false,
        customer: {
            id: 'user_10',
            name: 'Айгуль К.',
            avatar: 'АК',
            rating: 4.5,
            reviewsCount: 3,
            projectsCount: 5,
            city: 'Астана'
        }
    },
    {
        id: 'order_4',
        title: 'Производство корпусной мебели для офиса',
        description: 'Изготовление 15 рабочих столов, 10 тумб, 5 шкафов. Материал — ЛДСП Kronospan. Сроки — 3 недели. Доставка и монтаж включены.',
        orderType: 'production',
        workFormat: 'hybrid',
        budgetMin: 800000,
        budgetMax: 1200000,
        isNegotiable: false,
        deadlineDays: 21,
        city: 'Караганда',
        requirements: ['Собственное производство', 'Опыт офисной мебели', 'Доставка и монтаж'],
        files: [{ name: 'Спецификация.xlsx', size: '156 KB' }, { name: 'Чертежи.zip', size: '8.2 MB' }],
        visibility: 'public',
        status: 'active',
        createdAt: '2026-01-13T09:00:00',
        viewsCount: 234,
        applicationsCount: 18,
        avgProposedPrice: 950000,
        isNew: false,
        isUrgent: false,
        isHighPay: true,
        customer: {
            id: 'company_3',
            name: 'ТехноПарк',
            avatar: 'ТП',
            rating: 4.8,
            reviewsCount: 42,
            projectsCount: 156,
            city: 'Караганда'
        }
    },
    {
        id: 'order_5',
        title: 'Сборка и монтаж кухни',
        description: 'Сборка готовой кухни. Фасады МДФ, корпус ЛДСП, встраиваемая техника (духовка, варочная, посудомойка). Подключение к коммуникациям.',
        orderType: 'assembly',
        workFormat: 'onsite',
        budgetMin: 45000,
        budgetMax: 60000,
        isNegotiable: true,
        deadlineDays: 2,
        city: 'Астана',
        requirements: ['Опыт сборки кухонь', 'Свой инструмент', 'Подключение техники'],
        files: [{ name: 'Сборочный_чертеж.pdf', size: '1.8 MB' }],
        visibility: 'public',
        status: 'active',
        createdAt: '2026-01-15T08:15:00',
        viewsCount: 67,
        applicationsCount: 9,
        avgProposedPrice: 52000,
        isNew: true,
        isUrgent: true,
        isHighPay: false,
        customer: {
            id: 'company_1',
            name: 'KitchenPro',
            avatar: 'KP',
            rating: 4.9,
            reviewsCount: 24,
            projectsCount: 127,
            city: 'Астана'
        }
    },
    {
        id: 'order_6',
        title: 'Консультация по раскрою ЛДСП',
        description: 'Нужна консультация по оптимизации раскроя для партии из 50 изделий. Программа Cutting 3. Минимизация отходов.',
        orderType: 'consultation',
        workFormat: 'remote',
        budgetMin: 10000,
        budgetMax: 15000,
        isNegotiable: true,
        deadlineDays: 1,
        city: null,
        requirements: ['Знание Cutting 3', 'Опыт оптимизации раскроя'],
        files: [],
        visibility: 'public',
        status: 'active',
        createdAt: '2026-01-15T14:00:00',
        viewsCount: 23,
        applicationsCount: 3,
        avgProposedPrice: 12000,
        isNew: true,
        isUrgent: false,
        isHighPay: false,
        customer: {
            id: 'user_11',
            name: 'Мебельная мастерская "Уют"',
            avatar: 'МУ',
            rating: 4.6,
            reviewsCount: 8,
            projectsCount: 22,
            city: 'Шымкент'
        }
    },
    {
        id: 'order_7',
        title: 'Закуп материалов для производства',
        description: 'Нужен закуп ЛДСП Egger 25 листов, кромка ПВХ 500 м.п., фурнитура Blum. Доставка на производство в Астане.',
        orderType: 'supply',
        workFormat: 'hybrid',
        budgetMin: 300000,
        budgetMax: 400000,
        isNegotiable: false,
        deadlineDays: 5,
        city: 'Астана',
        requirements: ['Работа с поставщиками', 'Логистика', 'Документооборот'],
        files: [{ name: 'Спецификация_материалов.xlsx', size: '89 KB' }],
        visibility: 'public',
        status: 'active',
        createdAt: '2026-01-14T11:30:00',
        viewsCount: 56,
        applicationsCount: 4,
        avgProposedPrice: 350000,
        isNew: false,
        isUrgent: false,
        isHighPay: true,
        customer: {
            id: 'company_4',
            name: 'МебельКрафт',
            avatar: 'МК',
            rating: 4.4,
            reviewsCount: 12,
            projectsCount: 45,
            city: 'Астана'
        }
    },
    {
        id: 'order_8',
        title: 'Комплексный проект: кухня + гостиная',
        description: 'Полный цикл: дизайн, деталировка, производство, монтаж. Кухня-гостиная 35 м². Стиль лофт. Бюджет включает материалы.',
        orderType: 'complex',
        workFormat: 'hybrid',
        budgetMin: 2500000,
        budgetMax: 3500000,
        isNegotiable: false,
        deadlineDays: 45,
        city: 'Алматы',
        requirements: ['Полный цикл производства', 'Дизайн-проект', 'Монтаж под ключ'],
        files: [{ name: 'ТЗ_проект.pdf', size: '2.1 MB' }, { name: 'Планировка.dwg', size: '1.4 MB' }],
        visibility: 'public',
        status: 'active',
        createdAt: '2026-01-12T15:00:00',
        viewsCount: 312,
        applicationsCount: 22,
        avgProposedPrice: 2900000,
        isNew: false,
        isUrgent: false,
        isHighPay: true,
        customer: {
            id: 'company_5',
            name: 'Premium Interiors',
            avatar: 'PI',
            rating: 5.0,
            reviewsCount: 56,
            projectsCount: 203,
            city: 'Алматы'
        }
    }
];

const MOCK_APPLICATIONS = [
    {
        id: 'app_1',
        orderId: 'order_1',
        order: MOCK_ORDERS[0],
        coverLetter: 'Здравствуйте! Готов выполнить деталировку кухни в сжатые сроки. Имею большой опыт работы с Basis Мебельщик и материалами Egger. В портфолио — более 50 проектов кухонь.',
        proposedPrice: 85000,
        proposedDeadline: 3,
        portfolioProjects: ['Кухня "Модерн"', 'Кухня для ЖК Астана'],
        status: 'viewed',
        createdAt: '2026-01-15T13:00:00',
        viewedAt: '2026-01-15T14:30:00'
    },
    {
        id: 'app_2',
        orderId: 'order_2',
        order: MOCK_ORDERS[1],
        coverLetter: 'Добрый день! Специализируюсь на дизайне систем хранения. Могу предложить несколько концепций на выбор с 3D визуализацией.',
        proposedPrice: 170000,
        proposedDeadline: 12,
        portfolioProjects: ['Гардеробная "Лофт"'],
        status: 'pending',
        createdAt: '2026-01-15T11:00:00',
        viewedAt: null
    },
    {
        id: 'app_3',
        orderId: 'order_5',
        order: MOCK_ORDERS[4],
        coverLetter: 'Профессиональная сборка кухонь — мой основной профиль. Работаю со всеми видами фурнитуры, подключаю технику.',
        proposedPrice: 50000,
        proposedDeadline: 2,
        portfolioProjects: [],
        status: 'invited',
        createdAt: '2026-01-15T09:00:00',
        viewedAt: '2026-01-15T10:00:00',
        invitedAt: '2026-01-15T12:00:00'
    },
    {
        id: 'app_4',
        orderId: 'order_3',
        order: MOCK_ORDERS[2],
        coverLetter: 'Выполню замер в удобное для вас время. Есть лазерный дальномер, опыт 5 лет.',
        proposedPrice: 18000,
        proposedDeadline: 1,
        portfolioProjects: [],
        status: 'rejected',
        createdAt: '2026-01-14T17:00:00',
        viewedAt: '2026-01-14T18:00:00',
        rejectedAt: '2026-01-14T19:00:00'
    },
    {
        id: 'app_5',
        orderId: 'order_6',
        order: MOCK_ORDERS[5],
        coverLetter: '',
        proposedPrice: 12000,
        proposedDeadline: 1,
        portfolioProjects: [],
        status: 'draft',
        createdAt: '2026-01-15T14:30:00',
        viewedAt: null
    }
];

const MOCK_MY_ORDERS = [
    {
        id: 'my_order_1',
        title: 'Деталировка шкафа-купе',
        description: 'Нужна деталировка шкафа-купе 3 метра. Проект в Basis.',
        orderType: 'detailing',
        workFormat: 'remote',
        budgetMin: 30000,
        budgetMax: 50000,
        deadlineDays: 5,
        city: 'Астана',
        status: 'active',
        createdAt: '2026-01-14T10:00:00',
        viewsCount: 45,
        applicationsCount: 6,
        avgProposedPrice: 38000
    },
    {
        id: 'my_order_2',
        title: 'Сборка офисной мебели',
        description: 'Сборка 10 рабочих столов и 5 тумб.',
        orderType: 'assembly',
        workFormat: 'onsite',
        budgetMin: 25000,
        budgetMax: 35000,
        deadlineDays: 3,
        city: 'Астана',
        status: 'active',
        createdAt: '2026-01-13T14:00:00',
        viewsCount: 78,
        applicationsCount: 12,
        avgProposedPrice: 30000
    }
];

const MOCK_SPECIALISTS = [
    {
        id: 'spec_1',
        name: 'Ратмир Абдуллин',
        username: '@ratmir',
        avatar: 'РА',
        role: 'technologist',
        roleLabel: 'Технолог',
        rating: 4.8,
        reviewsCount: 24,
        projectsCount: 127,
        city: 'Астана',
        country: 'Казахстан',
        memberSince: '2023',
        specializations: ['Basis Мебельщик', 'ЛДСП', 'Blum', 'Деталировка'],
        basePrice: 60000,
        recentWorks: ['work_1.jpg', 'work_2.jpg', 'work_3.jpg']
    },
    {
        id: 'spec_2',
        name: 'Алия Сергеева',
        username: '@aliya_design',
        avatar: 'АС',
        role: 'designer',
        roleLabel: 'Дизайнер',
        rating: 4.9,
        reviewsCount: 45,
        projectsCount: 89,
        city: 'Алматы',
        country: 'Казахстан',
        memberSince: '2022',
        specializations: ['3D визуализация', 'Кухни', 'Гардеробные', 'AutoCAD'],
        basePrice: 80000,
        recentWorks: ['work_4.jpg', 'work_5.jpg', 'work_6.jpg']
    },
    {
        id: 'spec_3',
        name: 'Максим Петров',
        username: '@max_assembler',
        avatar: 'МП',
        role: 'assembler',
        roleLabel: 'Сборщик',
        rating: 4.7,
        reviewsCount: 67,
        projectsCount: 234,
        city: 'Астана',
        country: 'Казахстан',
        memberSince: '2021',
        specializations: ['Сборка кухонь', 'Blum', 'Hettich', 'Встраиваемая техника'],
        basePrice: 40000,
        recentWorks: ['work_7.jpg', 'work_8.jpg']
    },
    {
        id: 'spec_4',
        name: 'Дмитрий Козлов',
        username: '@dm_production',
        avatar: 'ДК',
        role: 'production',
        roleLabel: 'Производство',
        rating: 4.6,
        reviewsCount: 32,
        projectsCount: 156,
        city: 'Караганда',
        country: 'Казахстан',
        memberSince: '2020',
        specializations: ['ЧПУ обработка', 'ЛДСП', 'МДФ', 'Кромкооблицовка'],
        basePrice: 100000,
        recentWorks: ['work_9.jpg', 'work_10.jpg', 'work_11.jpg']
    },
    {
        id: 'spec_5',
        name: 'Елена Николаева',
        username: '@elena_measure',
        avatar: 'ЕН',
        role: 'measurer',
        roleLabel: 'Замерщик',
        rating: 4.9,
        reviewsCount: 89,
        projectsCount: 312,
        city: 'Астана',
        country: 'Казахстан',
        memberSince: '2019',
        specializations: ['Лазерный замер', 'Чертежи', 'Консультации'],
        basePrice: 15000,
        recentWorks: []
    }
];

// Saved orders (IDs)
let savedOrderIds = new Set(['order_2', 'order_4', 'order_8']);

// === API FUNCTIONS ===

/**
 * Get orders feed with optional filters
 */
export function getOrdersFeed(filters = {}) {
    let orders = [...MOCK_ORDERS];

    // Apply quick filters
    if (filters.urgent) {
        orders = orders.filter(o => o.isUrgent);
    }
    if (filters.highBudget) {
        orders = orders.filter(o => o.budgetMax >= 300000);
    }
    if (filters.myCity && filters.userCity) {
        orders = orders.filter(o => o.city === filters.userCity);
    }
    if (filters.verified) {
        orders = orders.filter(o => o.customer.rating >= 4.5);
    }
    if (filters.newLast24h) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        orders = orders.filter(o => new Date(o.createdAt) > yesterday);
    }

    // Apply dropdown filters
    if (filters.orderType && filters.orderType !== 'all') {
        orders = orders.filter(o => o.orderType === filters.orderType);
    }
    if (filters.budgetRange) {
        const [min, max] = filters.budgetRange;
        orders = orders.filter(o => o.budgetMax >= min && o.budgetMin <= max);
    }
    if (filters.deadline) {
        orders = orders.filter(o => o.deadlineDays <= filters.deadline);
    }
    if (filters.workFormat && filters.workFormat !== 'all') {
        orders = orders.filter(o => o.workFormat === filters.workFormat);
    }

    // Apply sorting
    switch (filters.sortBy) {
        case 'date_asc':
            orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'budget_desc':
            orders.sort((a, b) => b.budgetMax - a.budgetMax);
            break;
        case 'budget_asc':
            orders.sort((a, b) => a.budgetMax - b.budgetMax);
            break;
        case 'deadline_urgent':
            orders.sort((a, b) => a.deadlineDays - b.deadlineDays);
            break;
        case 'date_desc':
        default:
            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Add saved status
    orders = orders.map(o => ({
        ...o,
        isSaved: savedOrderIds.has(o.id)
    }));

    return orders;
}

/**
 * Get recommended orders for user
 */
export function getRecommendedOrders(userCity = 'Астана') {
    return MOCK_ORDERS
        .filter(o => o.city === userCity && o.customer.rating >= 4.5)
        .slice(0, 3)
        .map(o => ({ ...o, isSaved: savedOrderIds.has(o.id) }));
}

/**
 * Get order by ID
 */
export function getOrderById(orderId) {
    const order = MOCK_ORDERS.find(o => o.id === orderId);
    if (order) {
        return { ...order, isSaved: savedOrderIds.has(order.id) };
    }
    return null;
}

/**
 * Get user's applications
 */
export function getMyApplications(statusFilter = 'all') {
    let apps = [...MOCK_APPLICATIONS];

    if (statusFilter !== 'all') {
        apps = apps.filter(a => a.status === statusFilter);
    }

    return apps;
}

/**
 * Get application statistics
 */
export function getApplicationsStats() {
    const apps = MOCK_APPLICATIONS;
    const total = apps.length;
    const viewed = apps.filter(a => a.status === 'viewed').length;
    const invited = apps.filter(a => a.status === 'invited').length;
    const pending = apps.filter(a => a.status === 'pending').length;
    const rejected = apps.filter(a => a.status === 'rejected').length;
    const drafts = apps.filter(a => a.status === 'draft').length;

    return {
        total,
        viewed,
        invited,
        pending,
        rejected,
        drafts,
        conversionRate: total > 0 ? Math.round((invited / total) * 100) : 0
    };
}

/**
 * Get saved orders
 */
export function getSavedOrders() {
    return MOCK_ORDERS
        .filter(o => savedOrderIds.has(o.id))
        .map(o => ({ ...o, isSaved: true }));
}

/**
 * Toggle order saved status
 */
export function toggleSaveOrder(orderId) {
    if (savedOrderIds.has(orderId)) {
        savedOrderIds.delete(orderId);
        return false;
    } else {
        savedOrderIds.add(orderId);
        return true;
    }
}

/**
 * Get user's own orders
 */
export function getMyOrders(statusFilter = 'all') {
    let orders = [...MOCK_MY_ORDERS];

    if (statusFilter !== 'all') {
        orders = orders.filter(o => o.status === statusFilter);
    }

    return orders;
}

/**
 * Get specialists with filters
 */
export function getSpecialists(filters = {}) {
    let specialists = [...MOCK_SPECIALISTS];

    if (filters.role && filters.role !== 'all') {
        specialists = specialists.filter(s => s.role === filters.role);
    }
    if (filters.city && filters.city !== 'all') {
        specialists = specialists.filter(s => s.city === filters.city);
    }
    if (filters.minRating) {
        specialists = specialists.filter(s => s.rating >= filters.minRating);
    }
    if (filters.minProjects) {
        specialists = specialists.filter(s => s.projectsCount >= filters.minProjects);
    }

    // Apply sorting
    switch (filters.sortBy) {
        case 'experience':
            specialists.sort((a, b) => b.projectsCount - a.projectsCount);
            break;
        case 'price_asc':
            specialists.sort((a, b) => a.basePrice - b.basePrice);
            break;
        case 'rating':
        default:
            specialists.sort((a, b) => b.rating - a.rating);
    }

    return specialists;
}

/**
 * Apply to an order
 */
export function applyToOrder(orderId, applicationData) {
    console.log('[OrdersService] Applying to order:', orderId, applicationData);
    // In real app, this would POST to server
    return {
        success: true,
        applicationId: 'app_' + Date.now(),
        message: 'Отклик успешно отправлен'
    };
}

/**
 * Create a new order
 */
export function createOrder(orderData) {
    console.log('[OrdersService] Creating order:', orderData);
    // In real app, this would POST to server
    return {
        success: true,
        orderId: 'order_' + Date.now(),
        message: 'Заказ успешно создан'
    };
}

/**
 * Get order type options
 */
export function getOrderTypes() {
    return [
        { value: 'all', label: 'Все типы' },
        { value: 'design', label: 'Дизайн' },
        { value: 'measurement', label: 'Замер' },
        { value: 'detailing', label: 'Деталировка' },
        { value: 'supply', label: 'Закуп материалов' },
        { value: 'production', label: 'Производство' },
        { value: 'assembly', label: 'Монтаж' },
        { value: 'consultation', label: 'Консультация' },
        { value: 'complex', label: 'Комплексный проект' }
    ];
}

/**
 * Get budget range options
 */
export function getBudgetRanges() {
    return [
        { value: 'all', label: 'Любой', range: null },
        { value: 'to_50k', label: 'До 50 000 ₸', range: [0, 50000] },
        { value: '50k_150k', label: '50 000 - 150 000 ₸', range: [50000, 150000] },
        { value: '150k_300k', label: '150 000 - 300 000 ₸', range: [150000, 300000] },
        { value: '300k_500k', label: '300 000 - 500 000 ₸', range: [300000, 500000] },
        { value: 'over_500k', label: 'Более 500 000 ₸', range: [500000, Infinity] }
    ];
}

/**
 * Get deadline options
 */
export function getDeadlineOptions() {
    return [
        { value: 'all', label: 'Любые', days: null },
        { value: 'urgent', label: 'Срочно (1-3 дня)', days: 3 },
        { value: 'week', label: 'Неделя', days: 7 },
        { value: '2weeks', label: '2 недели', days: 14 },
        { value: 'month', label: 'Месяц', days: 30 },
        { value: 'long', label: 'Долгосрочный', days: Infinity }
    ];
}

/**
 * Get specialist role options
 */
export function getSpecialistRoles() {
    return [
        { value: 'all', label: 'Все специалисты' },
        { value: 'designer', label: 'Дизайнеры' },
        { value: 'technologist', label: 'Технологи' },
        { value: 'measurer', label: 'Замерщики' },
        { value: 'assembler', label: 'Сборщики / Монтажники' },
        { value: 'production', label: 'Производственники' }
    ];
}

/**
 * Format time ago
 */
export function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
        return `${diffMins} мин назад`;
    } else if (diffHours < 24) {
        return `${diffHours} ч назад`;
    } else if (diffDays === 1) {
        return 'вчера';
    } else {
        return `${diffDays} дн назад`;
    }
}

/**
 * Format currency
 */
export function formatCurrency(value) {
    return value.toLocaleString('ru-RU') + ' ₸';
}

/**
 * Format budget range
 */
export function formatBudgetRange(min, max, isNegotiable) {
    if (isNegotiable) {
        return 'Договорная';
    }
    if (min === max) {
        return formatCurrency(min);
    }
    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

/**
 * Get work format label
 */
export function getWorkFormatLabel(format) {
    const labels = {
        remote: '<svg class="work-format-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> Удаленно',
        onsite: '<svg class="work-format-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> С выездом',
        hybrid: '<svg class="work-format-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> Гибрид'
    };
    return labels[format] || format;
}

/**
 * Get order type label
 */
export function getOrderTypeLabel(type) {
    const types = getOrderTypes();
    const found = types.find(t => t.value === type);
    return found ? found.label : type;
}

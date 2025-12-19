// js/kanban.js
console.log("✅ kanban.js file is loading...");

window.kanban = {
    currentStage: null,
    positions: [],

    // Названия этапов
    STAGE_NAMES: {
        design: { name: 'Дизайн', icon: 'fa-pencil-ruler' },
        measure: { name: 'Замер', icon: 'fa-ruler-combined' },
        detail: { name: 'Деталировка', icon: 'fa-cubes' },
        supply: { name: 'Закуп', icon: 'fa-shopping-cart' },
        production: { name: 'Производство', icon: 'fa-industry' },
        install: { name: 'Монтаж', icon: 'fa-hammer' },
        handover: { name: 'Сдача', icon: 'fa-flag-checkered' }
    },

    // Названия статусов
    STATUS_NAMES: {
        inbox: 'Входящие',
        active: 'В работе',
        done: 'Выполнено',
        waiting: 'Ожидание'
    },

    async init(stage) {
        this.currentStage = stage;
        await this.loadPositions();
        this.render();
    },

    async loadPositions() {
        try {
            // Получаем все позиции компании на этом этапе
            this.positions = await api.call('getPositionsByStage', {
                stage: this.currentStage
            });
            console.log(`📋 Загружено позиций для ${this.currentStage}:`, this.positions.length);
        } catch (e) {
            console.error('Ошибка загрузки канбан:', e);
            this.positions = [];
        }
    },

    render() {
        const container = document.getElementById('kanban-content');
        if (!container) return;

        const stageInfo = this.STAGE_NAMES[this.currentStage] || { name: this.currentStage, icon: 'fa-tasks' };

        // Группируем позиции по статусу
        const grouped = {
            inbox: this.positions.filter(p => !p.kanban_status || p.kanban_status === 'inbox'),
            active: this.positions.filter(p => p.kanban_status === 'active'),
            done: this.positions.filter(p => p.kanban_status === 'done'),
            waiting: this.positions.filter(p => p.kanban_status === 'waiting')
        };

        container.innerHTML = `
            <div class="kanban-header">
                <h1><i class="fas ${stageInfo.icon}"></i> ${stageInfo.name}</h1>
                <button class="btn btn-def" onclick="kanban.refresh()">
                    <i class="fas fa-sync-alt"></i> Обновить
                </button>
            </div>
            
            <div class="kanban-board">
                ${this.renderColumn('inbox', grouped.inbox)}
                ${this.renderColumn('active', grouped.active)}
                ${this.renderColumn('done', grouped.done)}
                ${this.renderColumn('waiting', grouped.waiting)}
            </div>
        `;
    },

    renderColumn(status, items) {
        const statusName = this.STATUS_NAMES[status];
        const isEmpty = items.length === 0;

        return `
            <div class="kanban-column" data-status="${status}">
                <div class="kanban-column-header">
                    <span class="kanban-column-title">${statusName}</span>
                    <span class="kanban-column-count">${items.length}</span>
                </div>
                <div class="kanban-cards">
                    ${isEmpty
                ? `<div class="kanban-empty"><i class="fas fa-inbox"></i>Нет задач</div>`
                : items.map(p => this.renderCard(p)).join('')
            }
                </div>
            </div>
        `;
    },

    renderCard(position) {
        const projectName = position.projects?.name || 'Проект';
        const clientName = position.projects?.client_name || '—';
        const deadline = position.projects?.deadline
            ? new Date(position.projects.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
            : '—';

        return `
            <div class="kanban-card" onclick="kanban.openPosition('${position.id}')">
                <div class="kanban-card-project">${projectName}</div>
                <div class="kanban-card-title">${position.name || 'Без названия'}</div>
                <div class="kanban-card-meta">
                    <span class="kanban-card-client">
                        <i class="fas fa-user"></i> ${clientName}
                    </span>
                    <span class="kanban-card-date">
                        <i class="fas fa-calendar"></i> ${deadline}
                    </span>
                </div>
                <div class="kanban-card-actions">
                    <select class="status-mini-select" onchange="kanban.changeStatus('${position.id}', this.value); event.stopPropagation();">
                        <option value="inbox" ${position.kanban_status === 'inbox' || !position.kanban_status ? 'selected' : ''}>📥 Входящие</option>
                        <option value="active" ${position.kanban_status === 'active' ? 'selected' : ''}>🔵 В работе</option>
                        <option value="done" ${position.kanban_status === 'done' ? 'selected' : ''}>✅ Выполнено</option>
                        <option value="waiting" ${position.kanban_status === 'waiting' ? 'selected' : ''}>⏳ Ожидание</option>
                    </select>
                </div>
            </div>
        `;
    },

    async changeStatus(positionId, newStatus) {
        try {
            await api.call('updatePositionStatus', {
                positionId: positionId,
                status: newStatus,
                stage: this.currentStage
            });
            console.log(`✅ Статус изменён: ${positionId} → ${newStatus}`);
            // Перезагружаем данные
            await this.loadPositions();
            this.render();
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

    openPosition(positionId) {
        // Открываем карточку позиции
        app.openPosition(positionId, '');
    },

    async refresh() {
        await this.loadPositions();
        this.render();
    }
};

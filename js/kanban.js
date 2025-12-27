// js/kanban.js
console.log("✅ kanban.js file is loading...");

// 🔥 URL нашего file-proxy сервера (HTTPS!)
const KANBAN_FILE_PROXY_URL = 'https://files.logiqa.kz';

window.kanban = {
    currentStage: null,
    positions: [],
    projects: [],
    selectedProjectId: null,
    currentPosition: null, // Текущая открытая позиция

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
        // Загружаем проекты для фильтра (если ещё не загружены)
        if (this.projects.length === 0) {
            try {
                this.projects = await api.call('getGlobalProjects');
            } catch (e) {
                console.error('Ошибка загрузки проектов:', e);
                this.projects = [];
            }
        }
        await this.loadPositions();
        this.render();
    },

    async loadPositions() {
        try {
            // Используем новый API с поддержкой processing stage
            this.positions = await api.call('getPositionsForBoard', {
                board: this.currentStage
            });
            console.log(`📋 Загружено позиций для ${this.currentStage}:`, this.positions.length);
        } catch (e) {
            console.error('Ошибка загрузки канбан:', e);
            this.positions = [];
        }
    },

    // Хелпер: получить статус для текущей доски (поддержка JSON)
    getStatusForBoard(position) {
        const board = this.currentStage;
        const raw = position.kanban_status;

        // Попробуем распарсить как JSON (для processing stage)
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                // Для design доски: если stage=processing, показываем как done
                if (board === 'design' && position.stage === 'processing') {
                    return 'done';
                }
                return parsed[board] || 'inbox';
            }
        } catch {
            // Не JSON — используем как есть
        }

        return raw || 'inbox';
    },

    render() {
        const container = document.getElementById('kanban-content');
        if (!container) return;

        const stageInfo = this.STAGE_NAMES[this.currentStage] || { name: this.currentStage, icon: 'fa-tasks' };

        // Фильтруем позиции по выбранному проекту
        let filteredPositions = this.positions;
        if (this.selectedProjectId) {
            filteredPositions = this.positions.filter(p => p.projects?.id === this.selectedProjectId);
        }

        // Группируем позиции по статусу (с учётом JSON для processing)
        const grouped = {
            inbox: filteredPositions.filter(p => this.getStatusForBoard(p) === 'inbox'),
            active: filteredPositions.filter(p => this.getStatusForBoard(p) === 'active'),
            done: filteredPositions.filter(p => this.getStatusForBoard(p) === 'done'),
            waiting: filteredPositions.filter(p => this.getStatusForBoard(p) === 'waiting')
        };

        // Генерируем опции для dropdown
        const projectOptions = this.projects.map(p =>
            `<option value="${p.id}" ${this.selectedProjectId === p.id ? 'selected' : ''}>${p.name}</option>`
        ).join('');

        container.innerHTML = `
            <div class="kanban-header">
                <h1><i class="fas ${stageInfo.icon}"></i> ${stageInfo.name}</h1>
                <div style="display:flex; gap:12px; align-items:center;">
                    <select id="kanbanProjectFilter" onchange="kanban.filterByProject(this.value)" 
                            style="padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-card); min-width:180px; font-size:14px;">
                        <option value="">📂 Все проекты</option>
                        ${projectOptions}
                    </select>
                    <button class="btn btn-def" onclick="kanban.refresh()">
                        <i class="fas fa-sync-alt"></i> Обновить
                    </button>
                </div>
            </div>
            
            <div class="kanban-board">
                ${this.renderColumn('inbox', grouped.inbox)}
                ${this.renderColumn('active', grouped.active)}
                ${this.renderColumn('done', grouped.done)}
                ${this.renderColumn('waiting', grouped.waiting)}
            </div>
        `;
    },

    filterByProject(projectId) {
        this.selectedProjectId = projectId || null;
        this.render();
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

        const currentStatus = this.getStatusForBoard(position);
        const isProcessing = position.stage === 'processing';
        const board = this.currentStage;

        // Индикатор "X из Y" для досок Замер/Деталировка
        let positionIndicator = '';
        if ((board === 'measure' || board === 'detail') && isProcessing) {
            const idx = position._positionIndex || 1;
            const total = position._totalPositions || 1;
            const allReady = position._allInProcessing;
            const indicatorColor = allReady ? '#10b981' : '#ef4444';  // green or red
            positionIndicator = `
                <span class="position-indicator" style="
                    display:inline-flex; align-items:center; gap:4px;
                    font-size:11px; font-weight:600; padding:2px 8px;
                    background:${indicatorColor}20; color:${indicatorColor};
                    border-radius:10px; border:1px solid ${indicatorColor}40;
                ">
                    <span style="width:6px; height:6px; background:${indicatorColor}; border-radius:50%;"></span>
                    ${idx} из ${total}
                </span>`;
        }

        // Метка "На согласовании" для доски Дизайн (с индикатором возврата)
        let approvalTag = '';
        if (board === 'design' && isProcessing) {
            // Парсим статус для проверки возврата/принятия
            let status = {};
            try {
                status = JSON.parse(position.kanban_status);
            } catch {
                status = {};
            }

            const measureAccepted = status.measure_accepted;
            const detailAccepted = status.detail_accepted;
            const measureRevision = status.measure_revision;
            const detailRevision = status.detail_revision;

            // Если оба приняты — не показываем карточку (возвращаем пустую строку)
            if (measureAccepted && detailAccepted) {
                return ''; // Карточка скрывается
            }

            // Формируем метки
            let measureTag = '';
            let detailTag = '';

            if (measureRevision) {
                measureTag = `<span style="font-size:10px; padding:2px 6px; background:#ef444420; color:#ef4444; border-radius:4px;">⚠️ Замер: доработка</span>`;
            } else if (measureAccepted) {
                measureTag = `<span style="font-size:10px; padding:2px 6px; background:#10b98120; color:#10b981; border-radius:4px;">✅ Замер</span>`;
            } else {
                measureTag = `<span style="font-size:10px; padding:2px 6px; background:#3b82f620; color:#3b82f6; border-radius:4px;">🔄 Замер</span>`;
            }

            if (detailRevision) {
                detailTag = `<span style="font-size:10px; padding:2px 6px; background:#ef444420; color:#ef4444; border-radius:4px;">⚠️ Деталировка: доработка</span>`;
            } else if (detailAccepted) {
                detailTag = `<span style="font-size:10px; padding:2px 6px; background:#10b98120; color:#10b981; border-radius:4px;">✅ Деталировка</span>`;
            } else {
                detailTag = `<span style="font-size:10px; padding:2px 6px; background:#8b5cf620; color:#8b5cf6; border-radius:4px;">🔄 Деталировка</span>`;
            }

            approvalTag = `
                <div class="approval-tags" style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
                    ${measureTag}
                    ${detailTag}
                </div>`;
        }

        // 🔥 Индикатор для доски Деталировка — показываем готовность Замера
        if (board === 'detail' && isProcessing) {
            let status = {};
            try {
                status = JSON.parse(position.kanban_status);
            } catch {
                status = {};
            }

            const measureStatus = status.measure || 'inbox';
            const measureDone = measureStatus === 'done';

            if (measureDone) {
                approvalTag = `
                    <div class="approval-tags" style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
                        <span style="font-size:10px; padding:2px 6px; background:#10b98120; color:#10b981; border-radius:4px;">✅ Замер готов</span>
                    </div>`;
            } else {
                approvalTag = `
                    <div class="approval-tags" style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
                        <span style="font-size:10px; padding:2px 6px; background:#f59e0b20; color:#f59e0b; border-radius:4px;">⏳ Ожидание замера</span>
                    </div>`;
            }
        }

        // Для processing на Design показываем disabled select
        const selectDisabled = (board === 'design' && isProcessing) ? 'disabled style="opacity:0.5;"' : '';

        return `
            <div class="kanban-card" onclick="kanban.openProjectCard('${position.id}')">
                <div class="kanban-card-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div class="kanban-card-project">${projectName}</div>
                    ${positionIndicator}
                </div>
                <div class="kanban-card-title">${position.name || 'Без названия'}</div>
                <div class="kanban-card-meta">
                    <span class="kanban-card-client">
                        <i class="fas fa-user"></i> ${clientName}
                    </span>
                    <span class="kanban-card-date">
                        <i class="fas fa-calendar"></i> ${deadline}
                    </span>
                </div>
                ${approvalTag}
                <div class="kanban-card-actions">
                    <select class="status-mini-select" ${selectDisabled} data-position-id="${position.id}" onclick="event.stopPropagation();" onchange="kanban.changeStatus('${position.id}', this.value); event.stopPropagation();">
                        <option value="inbox" ${currentStatus === 'inbox' ? 'selected' : ''}>📥 Входящие</option>
                        <option value="active" ${currentStatus === 'active' ? 'selected' : ''}>🔵 В работе</option>
                        <option value="done" ${currentStatus === 'done' ? 'selected' : ''}>✅ Выполнено</option>
                        <option value="waiting" ${currentStatus === 'waiting' ? 'selected' : ''}>⏳ Ожидание</option>
                    </select>
                </div>
            </div>
        `;
    },

    async changeStatus(positionId, newStatus, currentKanbanStatus = '') {
        try {
            const board = this.currentStage;
            const position = this.positions.find(p => p.id === positionId);

            // 🔥 КЛЮЧЕВАЯ ЛОГИКА: Design + Done = переход в processing
            if (board === 'design' && newStatus === 'done' && position?.stage !== 'processing') {
                console.log('🚀 Переход в processing (Замер + Деталировка):', positionId);
                await api.call('transitionToProcessing', { positionId });
            } else if (position?.stage === 'processing') {
                // Для processing stage — обновляем только статус текущей доски
                await api.call('updateBoardStatus', {
                    positionId,
                    board,
                    status: newStatus,
                    currentKanbanStatus: currentKanbanStatus || position.kanban_status
                });
            } else {
                // Обычное обновление статуса
                await api.call('updatePositionStatus', {
                    positionId,
                    status: newStatus
                });
            }

            console.log(`✅ Статус изменён: ${positionId} → ${newStatus}`);
            await this.loadPositions();
            this.render();
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

    // 🔥 НОВЫЙ МЕТОД: Открытие карточки проекта
    async openProjectCard(positionId) {
        // Находим позицию в загруженных данных
        this.currentPosition = this.positions.find(p => p.id === positionId);
        if (!this.currentPosition) {
            console.error('Позиция не найдена:', positionId);
            return;
        }

        const project = this.currentPosition.projects || {};
        const board = this.currentStage;
        const isProcessing = this.currentPosition.stage === 'processing';

        // Заполняем модальное окно
        document.getElementById('pcmProjectName').textContent = project.name || 'Проект';
        document.getElementById('pcmPositionName').textContent = this.currentPosition.name || 'Изделие';
        document.getElementById('pcmClient').textContent = project.client_name || '—';

        // 🔥 Телефон (кликабельный для звонка с мобилки)
        const phoneEl = document.getElementById('pcmPhone');
        const phone = project.client_phone || '';
        if (phone) {
            phoneEl.href = `tel:${phone.replace(/\s/g, '')}`;
            phoneEl.querySelector('span').textContent = phone;
            phoneEl.style.display = 'flex';
        } else {
            phoneEl.querySelector('span').textContent = '—';
            phoneEl.href = '#';
            phoneEl.style.pointerEvents = 'none';
        }

        document.getElementById('pcmDeadline').textContent = project.deadline
            ? new Date(project.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
            : '—';
        document.getElementById('pcmAddress').textContent = project.address || '—';

        // 🔥 Устанавливаем текущий статус в селекторе
        const currentStatus = this.getStatusForBoard(this.currentPosition);
        const statusSelect = document.getElementById('pcmStatusSelect');
        statusSelect.value = currentStatus;

        // Для processing на Design доске - disable select
        if (board === 'design' && isProcessing) {
            statusSelect.disabled = true;
            statusSelect.style.opacity = '0.5';
        } else {
            statusSelect.disabled = false;
            statusSelect.style.opacity = '1';
        }

        // 🔥 Рендерим кнопки в зависимости от доски
        this.renderModalActions(board, isProcessing);

        // Показываем модал
        document.getElementById('projectCardModal').classList.remove('hidden');

        // Загружаем файлы и комментарии
        await this.loadFiles();
        await this.loadComments();
    },

    // 🔥 Изменение статуса из модалки
    async changeStatusFromModal(newStatus) {
        if (!this.currentPosition) return;

        const positionId = this.currentPosition.id;

        try {
            await this.changeStatus(positionId, newStatus);

            // Обновляем данные текущей позиции
            this.currentPosition = this.positions.find(p => p.id === positionId);

            console.log(`✅ Статус изменён через модалку: ${positionId} → ${newStatus}`);
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

    // Рендер кнопок действий в модалке
    renderModalActions(board, isProcessing) {
        const footerEl = document.querySelector('#projectCardModal .modal-box > div:last-child');
        if (!footerEl) return;

        // Парсим текущий статус
        let status = {};
        try {
            status = JSON.parse(this.currentPosition.kanban_status);
        } catch {
            status = {};
        }

        const isAccepted = status[board + '_accepted'];
        const hasRevision = status[board + '_revision'];

        // Для досок Замер/Деталировка показываем специальные кнопки
        if ((board === 'measure' || board === 'detail') && isProcessing) {
            const boardName = board === 'measure' ? 'Замер' : 'Деталировка';

            if (isAccepted) {
                // Уже принято — показываем кнопку "Вернуть на доработку"
                footerEl.innerHTML = `
                    <button class="btn btn-def" style="flex:1;" onclick="kanban.openFullPosition()">
                        <i class="fas fa-expand"></i> Открыть
                    </button>
                    <button class="btn btn-warning" style="flex:1; background:#f59e0b; color:white;" onclick="kanban.returnForRevision()">
                        <i class="fas fa-undo"></i> На доработку
                    </button>
                `;
            } else {
                // Ещё не принято — показываем обе кнопки
                footerEl.innerHTML = `
                    <button class="btn btn-warning" style="flex:1; background:#f59e0b; color:white;" onclick="kanban.returnForRevision()">
                        <i class="fas fa-undo"></i> На доработку
                    </button>
                    <button class="btn btn-success" style="flex:1; background:#10b981; color:white;" onclick="kanban.acceptWork()">
                        <i class="fas fa-check"></i> Принять в работу
                    </button>
                `;
            }
        } else if (board === 'design' && isProcessing) {
            // 🔥 Для доски Дизайн с processing — проверяем есть ли запросы на доработку
            const measureRevision = status.measure_revision;
            const detailRevision = status.detail_revision;

            if (measureRevision || detailRevision) {
                // Есть запросы на доработку — показываем кнопки отправки исправлений
                let buttons = `<button class="btn btn-def" style="flex:1;" onclick="kanban.openFullPosition()">
                    <i class="fas fa-expand"></i> Открыть
                </button>`;

                if (measureRevision) {
                    buttons += `<button class="btn btn-success" style="flex:1; background:#10b981; color:white;" onclick="kanban.resubmitRevision('measure')">
                        <i class="fas fa-paper-plane"></i> Исправл. → Замер
                    </button>`;
                }
                if (detailRevision) {
                    buttons += `<button class="btn btn-success" style="flex:1; background:#8b5cf6; color:white;" onclick="kanban.resubmitRevision('detail')">
                        <i class="fas fa-paper-plane"></i> Исправл. → Детал.
                    </button>`;
                }

                footerEl.innerHTML = buttons;
            } else {
                // Нет запросов — стандартные кнопки
                footerEl.innerHTML = `
                    <button class="btn btn-def" style="flex:1;" onclick="kanban.openFullPosition()">
                        <i class="fas fa-expand"></i> Открыть полностью
                    </button>
                    <button class="btn btn-primary" style="flex:1;" onclick="kanban.closeProjectCard()">
                        <i class="fas fa-check"></i> Готово
                    </button>
                `;
            }
        } else {
            // Стандартные кнопки для других досок
            footerEl.innerHTML = `
                <button class="btn btn-def" style="flex:1;" onclick="kanban.openFullPosition()">
                    <i class="fas fa-expand"></i> Открыть полностью
                </button>
                <button class="btn btn-primary" style="flex:1;" onclick="kanban.closeProjectCard()">
                    <i class="fas fa-check"></i> Готово
                </button>
            `;
        }
    },

    // 🔥 Принять в работу
    async acceptWork() {
        if (!this.currentPosition) return;

        const board = this.currentStage;

        try {
            const result = await api.call('acceptWork', {
                positionId: this.currentPosition.id,
                board: board,
                currentKanbanStatus: this.currentPosition.kanban_status
            });

            console.log(`✅ Принято в работу (${board}):`, this.currentPosition.id);

            if (result.bothAccepted) {
                alert('🎉 Позиция принята в работу на Замере И Деталировке!');
            } else {
                const boardName = board === 'measure' ? 'Замер' : 'Деталировка';
                alert(`✅ Принято в работу: ${boardName}`);
            }

            this.closeProjectCard();
            await this.loadPositions();
            this.render();
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

    // 🔥 Вернуть на доработку
    async returnForRevision() {
        if (!this.currentPosition) return;

        const board = this.currentStage;
        const boardName = board === 'measure' ? 'Замер' : 'Деталировка';

        const comment = prompt(`Причина возврата (${boardName}):`);
        if (comment === null) return; // Отмена

        try {
            await api.call('returnForRevision', {
                positionId: this.currentPosition.id,
                board: board,
                currentKanbanStatus: this.currentPosition.kanban_status,
                comment: comment || 'Требуется доработка'
            });

            console.log(`⚠️ Возвращено на доработку (${board}):`, this.currentPosition.id);
            alert(`⚠️ Отправлено дизайнеру на доработку`);

            this.closeProjectCard();
            await this.loadPositions();
            this.render();
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

    // 🔥 Отправить исправления (для дизайнера)
    async resubmitRevision(board) {
        if (!this.currentPosition) return;

        const boardName = board === 'measure' ? 'Замер' : 'Деталировка';

        const comment = prompt(`Комментарий к исправлениям (${boardName}):`);
        if (comment === null) return; // Отмена

        try {
            await api.call('resubmitRevision', {
                positionId: this.currentPosition.id,
                board: board,
                currentKanbanStatus: this.currentPosition.kanban_status,
                comment: comment || 'Исправлено'
            });

            console.log(`✅ Исправления отправлены (${board}):`, this.currentPosition.id);
            alert(`✅ Исправления отправлены: ${boardName}`);

            this.closeProjectCard();
            await this.loadPositions();
            this.render();
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

    // Закрыть модальное окно
    closeProjectCard() {
        document.getElementById('projectCardModal').classList.add('hidden');
        this.currentPosition = null;
    },

    // Открыть полную карточку позиции
    openFullPosition() {
        if (this.currentPosition) {
            const positionId = this.currentPosition.id; // Сохраняем id до закрытия
            const positionName = this.currentPosition.name || '';
            const projectId = this.currentPosition.project_id || this.currentPosition.projects?.id;
            this.closeProjectCard();
            app.openPosition(positionId, positionName, projectId);
        }
    },

    // === РАБОТА С ФАЙЛАМИ ===

    async loadFiles() {
        const list = document.getElementById('pcmFilesList');
        if (!this.currentPosition) return;

        try {
            const board = this.currentStage;
            const isProcessing = this.currentPosition.stage === 'processing';

            // 🔥 Загружаем файлы из нескольких этапов для processing
            let allFiles = [];
            const stages = [];

            if (isProcessing || board === 'design') {
                // Всегда загружаем файлы дизайна
                const designFiles = await api.call('getFiles', {
                    parentId: this.currentPosition.id,
                    stage: 'design'
                });
                if (designFiles?.length > 0) {
                    stages.push({ name: 'Дизайн', icon: 'fa-pencil-ruler', color: '#6366f1', files: designFiles });
                }
            }

            // Загружаем файлы замера для всех досок в processing (чтобы все видели)
            if (isProcessing) {
                const measureFiles = await api.call('getFiles', {
                    parentId: this.currentPosition.id,
                    stage: 'measure'
                });
                if (measureFiles?.length > 0) {
                    stages.push({ name: 'Замер', icon: 'fa-ruler-combined', color: '#10b981', files: measureFiles });
                }
            }

            // Если это не processing, загружаем файлы текущего этапа
            if (!isProcessing && board !== 'design') {
                const currentFiles = await api.call('getFiles', {
                    parentId: this.currentPosition.id,
                    stage: board
                });
                const stageInfo = this.STAGE_NAMES[board] || { name: board, icon: 'fa-folder' };
                if (currentFiles?.length > 0) {
                    stages.push({ name: stageInfo.name, icon: stageInfo.icon, color: '#3b82f6', files: currentFiles });
                }
            }

            console.log('📂 Загружено секций:', stages.length);

            if (stages.length === 0) {
                list.innerHTML = `<div style="text-align:center; padding:30px; color:#ccc;">Нет загруженных файлов</div>`;
                return;
            }

            // Рендерим секции - строим HTML отдельно чтобы избежать проблем с вложенностью
            let html = '';
            for (const section of stages) {
                const filesHtml = section.files.map(f => this.renderFileItem(f)).join('');
                html += `
                    <div class="file-section" style="margin-bottom:15px;">
                        <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:${section.color}10; border-radius:8px; margin-bottom:8px;">
                            <i class="fas ${section.icon}" style="color:${section.color};"></i>
                            <span style="font-weight:600; font-size:13px; color:${section.color};">${section.name}</span>
                            <span style="font-size:11px; color:#999; margin-left:auto;">${section.files.length} файл(ов)</span>
                        </div>
                        ${filesHtml}
                    </div>
                `;
            }
            list.innerHTML = html;

        } catch (e) {
            console.error(e);
            list.innerHTML = `<div style="color:red; padding:20px;">Ошибка загрузки</div>`;
        }
    },

    // Рендер одного файла
    renderFileItem(f) {
        let icon = 'fa-file';
        const isImage = f.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        if (f.file_name.endsWith('.pdf')) icon = 'fa-file-pdf';
        if (isImage) icon = 'fa-file-image';
        if (f.file_name.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';
        if (f.file_name.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
        if (f.file_name.match(/\.(zip|rar|7z)$/i)) icon = 'fa-file-archive';

        const isPDF = f.file_name.match(/\.pdf$/i);
        const isExcel = f.file_name.match(/\.(xls|xlsx)$/i);
        const isWord = f.file_name.match(/\.(doc|docx)$/i);
        const canPreview = isImage || isPDF || isExcel || isWord;

        const previewBtn = f.tg_file_id && canPreview
            ? `<button onclick="kanban.viewFile('${f.tg_file_id}', '${f.file_name.replace(/'/g, "\\'")}'); event.stopPropagation();" class="btn btn-def" style="padding:6px 12px; font-size:12px;">
                 <i class="fas fa-eye"></i>
               </button>`
            : '';

        const downloadUrl = f.tg_file_id
            ? `${KANBAN_FILE_PROXY_URL}/download/${f.tg_file_id}?name=${encodeURIComponent(f.file_name)}`
            : null;
        const downloadBtn = downloadUrl
            ? `<button onclick="kanban.openDownload('${downloadUrl}'); event.stopPropagation();" class="btn btn-def" style="padding:6px 12px; font-size:12px;">
                 <i class="fas fa-download"></i>
               </button>`
            : '';

        return `
        <div class="file-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #f3f4f6;">
            <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
                <div style="width:36px; height:36px; background:#f3f4f6; border-radius:6px; display:flex; align-items:center; justify-content:center; color:#666;">
                    <i class="fas ${icon}"></i>
                </div>
                <div style="min-width:0;">
                    <div style="font-weight:500; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.file_name}</div>
                    <div style="font-size:10px; color:#999;">${utils.formatDate(f.created_at)}</div>
                </div>
            </div>
            <div style="display:flex; gap:4px;">
                ${previewBtn}
                ${downloadBtn}
                <button class="btn-icon-del" onclick="kanban.deleteFile('${f.id}'); event.stopPropagation();"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    },

    // 🔥 Загрузка файла через прокси
    async uploadFile(file) {
        if (!file || !this.currentPosition) return;

        const progress = document.getElementById('pcmUploadProgress');
        const bar = document.getElementById('pcmUploadBar');

        try {
            progress.style.display = 'block';
            bar.style.width = '30%';

            // Создаём FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('caption', `📎 ${this.currentPosition.name || 'Файл'} | ${file.name}`);

            bar.style.width = '60%';

            // Отправляем на наш сервер
            const response = await fetch(`${KANBAN_FILE_PROXY_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!result.success) throw new Error(result.error);

            bar.style.width = '90%';

            // Сохраняем запись в Supabase
            await api.call('saveFileRecord', {
                parentId: this.currentPosition.id,
                stage: this.currentStage,
                fileName: result.file_name,
                fileUrl: `tg://${result.file_id}`,
                tgFileId: result.file_id
            });

            bar.style.width = '100%';

            // Перезагружаем список
            await this.loadFiles();

            // Скрываем прогресс
            setTimeout(() => {
                progress.style.display = 'none';
                bar.style.width = '0%';
            }, 500);

        } catch (e) {
            console.error('Upload error:', e);
            alert('Ошибка загрузки: ' + e.message);
            progress.style.display = 'none';
            bar.style.width = '0%';
        }

        // Сбрасываем input
        document.getElementById('pcmFileInput').value = '';
    },

    // 🔥 ПРОСМОТР файла
    viewFile(fileId, fileName) {
        const url = `${KANBAN_FILE_PROXY_URL}/file/${fileId}`;

        // Для изображений — показываем в модальном окне
        if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            this.showImageModal(url, fileName);
        }
        // Для документов — используем iframe
        else if (fileName.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) {
            this.showDocumentModal(url, fileName, fileId);
        }
        else {
            window.open(url, '_blank');
        }
    },

    // Модальное окно для документов с использованием PDF.js, SheetJS, Mammoth
    showDocumentModal(url, fileName, fileId) {
        const modal = document.createElement('div');
        modal.id = 'docModal';
        modal.style.cssText = `
            position:fixed; top:0; left:0; right:0; bottom:0; 
            background:rgba(0,0,0,0.9); z-index:10000; 
            display:flex; flex-direction:column; padding:10px;
        `;

        // Определяем тип файла
        const isPDF = fileName.match(/\.pdf$/i);
        const isExcel = fileName.match(/\.(xls|xlsx)$/i);
        const isWord = fileName.match(/\.(doc|docx)$/i);

        // Базовая шапка модалки
        const headerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; color:white;">
                <span style="font-size:14px;">${fileName}</span>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span id="docPageInfo" style="font-size:12px; color:#888;"></span>
                    <a href="${KANBAN_FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" target="_blank" style="color:white; font-size:18px;">
                        <i class="fas fa-download"></i>
                    </a>
                    <button onclick="this.closest('#docModal').remove()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        if (isPDF && window.pdfjsLib) {
            // PDF: Используем PDF.js для рендеринга
            this.pdfZoom = 1;
            modal.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; color:white;">
                    <span style="font-size:14px;">${fileName}</span>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button id="pdfPrevPage" style="background:#333; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">&lt;</button>
                            <span id="pdfPageInfo" style="font-size:12px;">Загрузка...</span>
                            <button id="pdfNextPage" style="background:#333; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">&gt;</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; background:#333; padding:4px 8px; border-radius:4px;">
                            <button id="pdfZoomOut" style="background:none; border:none; color:white; font-size:14px; cursor:pointer; padding:2px 6px;">−</button>
                            <span id="pdfZoomInfo" style="font-size:12px; min-width:40px; text-align:center;">100%</span>
                            <button id="pdfZoomIn" style="background:none; border:none; color:white; font-size:14px; cursor:pointer; padding:2px 6px;">+</button>
                        </div>
                        <a href="${KANBAN_FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" target="_blank" style="color:white; font-size:18px;">
                            <i class="fas fa-download"></i>
                        </a>
                        <button onclick="this.closest('#docModal').remove()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div id="kbPdfContainer" style="flex:1; overflow:auto; background:#525659; border-radius:8px; padding:20px;">
                    <canvas id="pdfCanvas"></canvas>
                </div>
            `;
            document.body.appendChild(modal);

            // Зум колёсиком
            document.getElementById('kbPdfContainer').addEventListener('wheel', (e) => {
                e.preventDefault();
                this.pdfChangeZoom(e.deltaY < 0 ? 0.1 : -0.1);
            }, { passive: false });

            this.renderPDF(url);

        } else if (isExcel && window.XLSX) {
            // Excel: Используем SheetJS
            modal.innerHTML = headerHTML + `
                <div id="excelContent" style="flex:1; overflow:auto; background:white; border-radius:8px; padding:10px;">
                    <div style="text-align:center; padding:40px; color:#666;">
                        <i class="fas fa-spinner fa-spin" style="font-size:32px;"></i>
                        <p style="margin-top:15px;">Загрузка Excel файла...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.renderExcel(url, fileId, fileName);

        } else if (isWord && window.mammoth) {
            // Word: Используем Mammoth.js
            modal.innerHTML = headerHTML + `
                <div id="wordContent" style="flex:1; overflow:auto; background:white; border-radius:8px; padding:20px;">
                    <div style="text-align:center; padding:40px; color:#666;">
                        <i class="fas fa-spinner fa-spin" style="font-size:32px;"></i>
                        <p style="margin-top:15px;">Загрузка Word документа...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.renderWord(url, fileId, fileName);

        } else {
            // Для других документов — fallback на iframe
            modal.innerHTML = headerHTML + `
                <iframe src="${url}" style="flex:1; border:none; border-radius:8px; background:white;"></iframe>
            `;
            document.body.appendChild(modal);
        }
    },

    // Рендер Excel с помощью SheetJS
    async renderExcel(url, fileId, fileName) {
        const container = document.getElementById('excelContent');
        try {
            // Загружаем файл как ArrayBuffer
            const response = await fetch(url);
            if (!response.ok) throw new Error('Не удалось загрузить файл');

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            // Получаем первый лист
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Конвертируем в HTML таблицу
            const html = XLSX.utils.sheet_to_html(sheet, { id: 'excelTable' });

            // Показываем вкладки если много листов
            let tabsHTML = '';
            if (workbook.SheetNames.length > 1) {
                tabsHTML = `
                    <div style="display:flex; gap:5px; margin-bottom:10px; flex-wrap:wrap;">
                        ${workbook.SheetNames.map((name, i) => `
                            <button class="excel-tab ${i === 0 ? 'active' : ''}" 
                                    onclick="kanban.switchExcelSheet(${i})"
                                    style="padding:5px 12px; border:1px solid #ddd; border-radius:4px; 
                                           background:${i === 0 ? '#3b82f6' : '#f3f4f6'}; 
                                           color:${i === 0 ? 'white' : '#333'}; cursor:pointer; font-size:12px;">
                                ${name}
                            </button>
                        `).join('')}
                    </div>
                `;
            }

            // Сохраняем workbook для переключения листов
            this.currentWorkbook = workbook;

            container.innerHTML = tabsHTML + `
                <div id="excelTableContainer" style="overflow:auto;">
                    ${html}
                </div>
            `;

            // Добавляем стили для таблицы
            const table = container.querySelector('table');
            if (table) {
                table.style.cssText = 'border-collapse:collapse; width:100%; font-size:13px;';
                table.querySelectorAll('td, th').forEach(cell => {
                    cell.style.cssText = 'border:1px solid #e5e7eb; padding:6px 10px; text-align:left;';
                });
                table.querySelectorAll('th').forEach(cell => {
                    cell.style.background = '#f8fafc';
                    cell.style.fontWeight = '600';
                });
            }

            // Обновляем информацию
            document.getElementById('docPageInfo').textContent = `${workbook.SheetNames.length} лист(ов)`;

        } catch (error) {
            console.error('Ошибка загрузки Excel:', error);
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#666;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#f59e0b; margin-bottom:15px;"></i>
                    <p style="margin-bottom:15px;">Не удалось открыть Excel файл</p>
                    <a href="${KANBAN_FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" 
                       target="_blank" class="btn btn-primary" style="display:inline-block; padding:10px 20px; background:#3b82f6; color:white; border-radius:8px; text-decoration:none;">
                        <i class="fas fa-download"></i> Скачать файл
                    </a>
                </div>
            `;
        }
    },

    // Переключение листов Excel
    switchExcelSheet(index) {
        if (!this.currentWorkbook) return;

        const sheetName = this.currentWorkbook.SheetNames[index];
        const sheet = this.currentWorkbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(sheet, { id: 'excelTable' });

        const tableContainer = document.getElementById('excelTableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = html;

            // Стили
            const table = tableContainer.querySelector('table');
            if (table) {
                table.style.cssText = 'border-collapse:collapse; width:100%; font-size:13px;';
                table.querySelectorAll('td, th').forEach(cell => {
                    cell.style.cssText = 'border:1px solid #e5e7eb; padding:6px 10px; text-align:left;';
                });
                table.querySelectorAll('th').forEach(cell => {
                    cell.style.background = '#f8fafc';
                    cell.style.fontWeight = '600';
                });
            }
        }

        // Обновляем активную вкладку
        document.querySelectorAll('.excel-tab').forEach((btn, i) => {
            btn.style.background = i === index ? '#3b82f6' : '#f3f4f6';
            btn.style.color = i === index ? 'white' : '#333';
        });
    },

    // Рендер Word с помощью Mammoth.js
    async renderWord(url, fileId, fileName) {
        const container = document.getElementById('wordContent');
        try {
            // Загружаем файл как ArrayBuffer
            const response = await fetch(url);
            if (!response.ok) throw new Error('Не удалось загрузить файл');

            const arrayBuffer = await response.arrayBuffer();

            // Конвертируем в HTML с помощью Mammoth
            const result = await mammoth.convertToHtml({ arrayBuffer });

            container.innerHTML = `
                <div style="max-width:800px; margin:0 auto; line-height:1.6; font-family: 'Segoe UI', Arial, sans-serif;">
                    ${result.value}
                </div>
            `;

            // Стилизуем элементы
            container.querySelectorAll('table').forEach(table => {
                table.style.cssText = 'border-collapse:collapse; width:100%; margin:15px 0;';
                table.querySelectorAll('td, th').forEach(cell => {
                    cell.style.cssText = 'border:1px solid #e5e7eb; padding:8px;';
                });
            });

            container.querySelectorAll('img').forEach(img => {
                img.style.cssText = 'max-width:100%; height:auto; margin:10px 0;';
            });

            // Сообщения о потерянных элементах
            if (result.messages.length > 0) {
                console.warn('Mammoth warnings:', result.messages);
            }

        } catch (error) {
            console.error('Ошибка загрузки Word:', error);
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#666;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#f59e0b; margin-bottom:15px;"></i>
                    <p style="margin-bottom:15px;">Не удалось открыть Word документ</p>
                    <p style="font-size:12px; color:#999; margin-bottom:15px;">Формат .doc не поддерживается, только .docx</p>
                    <a href="${KANBAN_FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" 
                       target="_blank" class="btn btn-primary" style="display:inline-block; padding:10px 20px; background:#3b82f6; color:white; border-radius:8px; text-decoration:none;">
                        <i class="fas fa-download"></i> Скачать файл
                    </a>
                </div>
            `;
        }
    },

    // Рендер PDF с помощью PDF.js
    async renderPDF(url) {
        try {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;

            this.pdfDoc = pdf;
            this.pdfCurrentPage = 1;
            this.pdfTotalPages = pdf.numPages;
            this.pdfZoom = this.pdfZoom || 1;

            // Обновляем информацию о страницах и зуме
            document.getElementById('pdfPageInfo').textContent = `${this.pdfCurrentPage} / ${this.pdfTotalPages}`;
            document.getElementById('pdfZoomInfo').textContent = `${Math.round(this.pdfZoom * 100)}%`;

            // Настраиваем кнопки навигации
            document.getElementById('pdfPrevPage').onclick = () => this.pdfChangePage(-1);
            document.getElementById('pdfNextPage').onclick = () => this.pdfChangePage(1);
            document.getElementById('pdfZoomIn').onclick = () => this.pdfChangeZoom(0.25);
            document.getElementById('pdfZoomOut').onclick = () => this.pdfChangeZoom(-0.25);

            // Рендерим первую страницу
            await this.renderPDFPage(1);
        } catch (error) {
            console.error('Ошибка загрузки PDF:', error);
            document.getElementById('pdfPageInfo').textContent = 'Ошибка загрузки';

            // Показываем сообщение об ошибке с кнопкой скачивания
            const canvas = document.getElementById('pdfCanvas');
            if (canvas) {
                canvas.style.display = 'none';
                canvas.parentElement.innerHTML = `
                    <div style="text-align:center; color:white; padding:40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size:48px; margin-bottom:20px; color:#f59e0b;"></i>
                        <p style="margin-bottom:20px;">Не удалось загрузить PDF для предпросмотра</p>
                        <a href="${url.replace('/file/', '/download/')}?name=document.pdf" target="_blank" class="btn btn-primary">
                            <i class="fas fa-download"></i> Скачать файл
                        </a>
                    </div>
                `;
            }
        }
    },

    // Рендер конкретной страницы PDF
    async renderPDFPage(pageNum) {
        if (!this.pdfDoc) return;

        // Отменяем предыдущий рендер если есть
        if (this.pdfRenderTask) {
            this.pdfRenderTask.cancel();
            this.pdfRenderTask = null;
        }

        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const canvas = document.getElementById('pdfCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            // Подбираем масштаб под размер контейнера
            const container = canvas.parentElement;
            const containerWidth = container.clientWidth - 40;
            const containerHeight = container.clientHeight - 40;

            const viewport = page.getViewport({ scale: 1 });
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            const baseScale = Math.min(scaleX, scaleY, 2);

            // Применяем пользовательский зум
            const finalScale = baseScale * (this.pdfZoom || 1);

            const scaledViewport = page.getViewport({ scale: finalScale });

            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            this.pdfRenderTask = page.render({
                canvasContext: ctx,
                viewport: scaledViewport
            });

            await this.pdfRenderTask.promise;
            this.pdfRenderTask = null;
        } catch (error) {
            if (error.name !== 'RenderingCancelledException') {
                console.error('Ошибка рендера PDF:', error);
            }
        }
    },

    // Переключение страниц PDF
    pdfChangePage(delta) {
        const newPage = this.pdfCurrentPage + delta;
        if (newPage >= 1 && newPage <= this.pdfTotalPages) {
            this.pdfCurrentPage = newPage;
            document.getElementById('pdfPageInfo').textContent = `${this.pdfCurrentPage} / ${this.pdfTotalPages}`;
            this.renderPDFPage(newPage);
        }
    },

    // Изменение зума PDF
    pdfChangeZoom(delta) {
        const newZoom = (this.pdfZoom || 1) + delta;
        if (newZoom >= 0.5 && newZoom <= 4) {
            this.pdfZoom = newZoom;
            const zoomInfo = document.getElementById('pdfZoomInfo');
            if (zoomInfo) zoomInfo.textContent = `${Math.round(this.pdfZoom * 100)}%`;
            this.renderPDFPage(this.pdfCurrentPage);
        }
    },

    // Модальное окно для изображений с зумом
    showImageModal(url, fileName) {
        let currentZoom = 1;
        const minZoom = 0.5;
        const maxZoom = 5;
        const zoomStep = 0.15;

        const modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.style.cssText = `
            position:fixed; top:0; left:0; right:0; bottom:0; 
            background:rgba(0,0,0,0.9); z-index:10000; 
            display:flex; align-items:center; justify-content:center;
            padding:20px; overflow:hidden;
        `;
        modal.innerHTML = `
            <div id="kbImageContainer" style="position:relative; display:flex; flex-direction:column; align-items:center;">
                <img id="kbZoomableImage" src="${url}" style="max-width:90vw; max-height:85vh; border-radius:8px; transition:transform 0.1s; cursor:zoom-in;" onclick="event.stopPropagation();">
                <div style="text-align:center; color:white; margin-top:10px; font-size:14px;">${fileName}</div>
                <div id="kbZoomIndicator" style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:white; padding:8px 16px; border-radius:20px; font-size:14px;">100%</div>
            </div>
            <button onclick="this.parentElement.remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; color:white; font-size:32px; cursor:pointer;">
                <i class="fas fa-times"></i>
            </button>
            <div style="position:absolute; bottom:20px; right:20px; display:flex; gap:10px;">
                <button id="kbZoomOutBtn" style="width:40px; height:40px; border-radius:50%; border:none; background:rgba(255,255,255,0.2); color:white; font-size:18px; cursor:pointer;">−</button>
                <button id="kbZoomInBtn" style="width:40px; height:40px; border-radius:50%; border:none; background:rgba(255,255,255,0.2); color:white; font-size:18px; cursor:pointer;">+</button>
            </div>
        `;

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);

        const img = document.getElementById('kbZoomableImage');
        const indicator = document.getElementById('kbZoomIndicator');

        const updateZoom = () => {
            img.style.transform = `scale(${currentZoom})`;
            indicator.textContent = `${Math.round(currentZoom * 100)}%`;
            img.style.cursor = currentZoom > 1 ? 'zoom-out' : 'zoom-in';
        };

        modal.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            } else {
                currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            }
            updateZoom();
        }, { passive: false });

        document.getElementById('kbZoomInBtn').onclick = (e) => {
            e.stopPropagation();
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateZoom();
        };
        document.getElementById('kbZoomOutBtn').onclick = (e) => {
            e.stopPropagation();
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateZoom();
        };

        img.onclick = (e) => {
            e.stopPropagation();
            currentZoom = currentZoom > 1 ? 1 : 2;
            updateZoom();
        };
    },

    // 🔥 СКАЧИВАНИЕ файла
    openDownload(url) {
        if (window.Telegram?.WebApp?.openLink) {
            Telegram.WebApp.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    },

    // Удаление файла
    async deleteFile(id) {
        if (!confirm("Удалить запись о файле?")) return;
        await api.call('deleteFile', { fileId: id });
        this.loadFiles();
    },

    async refresh() {
        await this.loadPositions();
        this.render();
    },

    // === РАБОТА С КОММЕНТАРИЯМИ ===

    async loadComments() {
        const list = document.getElementById('pcmCommentsList');
        const countEl = document.getElementById('pcmCommentsCount');
        if (!this.currentPosition) return;

        try {
            const board = this.currentStage;
            const isProcessing = this.currentPosition.stage === 'processing';

            // 🔥 Для Замера/Деталировки загружаем комментарии дизайнера (stage='design')
            // чтобы видеть причины возврата и обсуждение
            const commentStage = (board === 'measure' || board === 'detail') && isProcessing
                ? 'design'
                : board;

            const comments = await api.call('getComments', {
                parentId: this.currentPosition.id,
                stage: commentStage
            });

            console.log('💬 Загружено комментариев:', comments?.length || 0, 'stage:', commentStage);

            if (!comments || comments.length === 0) {
                list.innerHTML = `<div style="text-align:center; padding:15px; color:#ccc; font-size:13px;">Нет комментариев</div>`;
                countEl.textContent = '0';
                return;
            }

            countEl.textContent = comments.length;
            list.innerHTML = comments.map(c => this.renderComment(c)).join('');

            // Прокручиваем вниз к последнему комментарию
            list.scrollTop = list.scrollHeight;

        } catch (e) {
            console.error('Ошибка загрузки комментариев:', e);
            list.innerHTML = `<div style="color:#ef4444; padding:10px; font-size:13px;">Ошибка загрузки</div>`;
        }
    },

    renderComment(comment) {
        const authorName = comment.users?.name || comment.users?.username || 'Пользователь';
        const date = utils.formatDate(comment.created_at);

        return `
            <div style="padding:10px 12px; border-bottom:1px solid #f3f4f6; display:flex; gap:10px;">
                <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, #6366f1, #8b5cf6); color:white; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; flex-shrink:0;">
                    ${authorName.charAt(0).toUpperCase()}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-weight:600; font-size:13px; color:#1f2937;">${authorName}</span>
                        <span style="font-size:11px; color:#9ca3af;">${date}</span>
                    </div>
                    <div style="font-size:13px; color:#4b5563; word-wrap:break-word;">${comment.text}</div>
                </div>
            </div>
        `;
    },

    async addComment() {
        const input = document.getElementById('pcmCommentInput');
        const text = input.value.trim();

        if (!text || !this.currentPosition) return;

        try {
            await api.call('addComment', {
                parentId: this.currentPosition.id,
                stage: this.currentStage,
                text: text
            });

            input.value = '';
            console.log('✅ Комментарий добавлен');

            // Перезагружаем список комментариев
            await this.loadComments();

        } catch (e) {
            console.error('Ошибка добавления комментария:', e);
            alert('Ошибка: ' + e.message);
        }
    }
};

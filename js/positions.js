// js/positions.js
console.log("✅ positions.js file is loading...");

window.positions = {
    currentProjectId: null,
    currentPositionId: null,
    currentTaskType: 'internal',

    // === УРОВЕНЬ 1: СПИСОК ИЗДЕЛИЙ В ПРОЕКТЕ ===
    async openProject(projectId) {
        console.log("📂 positions.openProject() STARTED with ID:", projectId);
        console.log("📂 Type of projectId:", typeof projectId);

        // 1. СРАЗУ ЗАПОМИНАЕМ ID (До любых запросов)
        if (projectId) {
            this.currentProjectId = projectId;
            console.log("✅ currentProjectId saved:", this.currentProjectId);
        } else {
            console.error("❌ Ошибка: openProject вызван без ID!");
            document.getElementById('pDetailName').innerText = "Ошибка: нет ID";
            return;
        }

        // 2. UI: Показываем лоадеры
        const nameEl = document.getElementById('pDetailName');
        const clientEl = document.getElementById('pDetailClient');
        const positionsEl = document.getElementById('pDetailPositions');

        if (nameEl) nameEl.innerText = "Загрузка...";
        if (clientEl) clientEl.innerText = "";
        if (positionsEl) positionsEl.innerHTML = '<div class="spinner"></div>';

        console.log("📂 UI updated to loading state");

        try {
            // 3. Грузим инфо о проекте
            console.log("📂 Calling API: getProjectById...");
            const proj = await api.call('getProjectById', { id: projectId });
            console.log("📂 API response:", proj);

            // Сохраняем данные проекта для использования в других функциях
            this.currentProject = proj;

            if (proj) {
                if (nameEl) nameEl.innerText = proj.name;
                if (clientEl) clientEl.innerText = proj.client_name || 'Клиент не указан';

                // Заполняем дополнительные поля
                this.fillProjectDetails(proj);

                console.log("✅ Project info loaded:", proj.name);
            } else {
                console.warn("⚠️ Project not found or null response");
                if (nameEl) nameEl.innerText = "Проект не найден";
            }

            // 4. Грузим компактную команду проекта
            await this.renderTeamCompact(projectId);

            // 5. Грузим список изделий
            console.log("📂 Calling renderList...");
            const positionsList = await this.renderList();
            console.log("✅ renderList completed");

            // 6. Рендер KPI карточек
            this.renderKPI(proj, positionsList);

            // 7. Рендер ленты этапов
            this.renderStagesPipeline(positionsList);

            // 8. Инициализация inline-редактирования
            this.initEditing();

        } catch (e) {
            console.error("❌ Ошибка загрузки данных проекта:", e);
            if (nameEl) nameEl.innerText = "Ошибка загрузки";
            if (positionsEl) {
                positionsEl.innerHTML =
                    `<div style="color:red; text-align:center; padding:20px;">
                        Не удалось загрузить: ${e.message}<br>
                        <button class="btn btn-text" onclick="positions.renderList()">Попробовать снова</button>
                    </div>`;
            }
        }
    },

    // Заполнение полей карточки проекта
    fillProjectDetails(proj) {
        // Информация о заказе
        const phoneEl = document.getElementById('pDetailPhone');
        const addressEl = document.getElementById('pDetailAddress');

        if (phoneEl) phoneEl.innerText = proj.client_phone || '—';
        if (addressEl) addressEl.innerText = proj.address || '—';

        // Финансы
        const contractEl = document.getElementById('pDetailContract');
        const prepayEl = document.getElementById('pDetailPrepay');
        const balanceEl = document.getElementById('pDetailBalance');

        const contractAmount = parseFloat(proj.contract_amount) || 0;
        const prepayAmount = parseFloat(proj.prepayment_amount) || 0;
        const balance = contractAmount - prepayAmount;

        if (contractEl) contractEl.innerText = utils.formatCurrency(contractAmount);
        if (prepayEl) prepayEl.innerText = utils.formatCurrency(prepayAmount);
        if (balanceEl) balanceEl.innerText = utils.formatCurrency(balance);

        // Ссылка на чат
        const chatBtn = document.getElementById('pDetailChatBtn');
        if (chatBtn && proj.chat_link) {
            chatBtn.onclick = () => window.open(proj.chat_link, '_blank');
        }
    },

    // Рендер команды проекта
    async renderTeam(projectId) {
        const container = document.getElementById('pDetailTeam');
        if (!container) return;

        const roleNames = {
            'designer': 'Дизайнер',
            'measurer': 'Замерщик',
            'technologist': 'Технолог',
            'supplier': 'Снабженец',
            'production': 'Производство',
            'installation': 'Монтаж',
            'manager': 'Менеджер',
            'member': 'Участник'
        };

        try {
            const team = await api.call('getProjectTeam', { projectId });

            if (!team || team.length === 0) {
                container.innerHTML = '<div class="team-empty">Участники не назначены</div>';
                return;
            }

            container.innerHTML = team.map(member => {
                const name = member.users?.name || 'Без имени';
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const role = roleNames[member.role] || member.role || 'Участник';

                return `
                <div class="team-member">
                    <div class="team-avatar">${initials}</div>
                    <div class="team-info">
                        <div class="team-role">${role}</div>
                        <div class="team-name">${name}</div>
                    </div>
                </div>`;
            }).join('');

        } catch (e) {
            console.error("Ошибка загрузки команды:", e);
            container.innerHTML = '<div class="team-empty">Ошибка загрузки</div>';
        }
    },

    // Открытие чата
    openChat() {
        if (this.currentProject?.chat_link) {
            window.open(this.currentProject.chat_link, '_blank');
        } else {
            const link = prompt('Введите ссылку на чат (Telegram):');
            if (link) {
                this.saveField('chat_link', link);
            }
        }
    },

    // Открытие модалки команды
    openTeamModal() {
        if (window.manager?.openTeam) {
            manager.openTeam();
        } else {
            document.getElementById('teamModal').classList.remove('hidden');
            document.getElementById('teamModal').style.display = 'flex';
        }
    },

    // === INLINE EDITING ===

    // Инициализация редактирования
    initEditing() {
        document.querySelectorAll('.editable-field').forEach(el => {
            el.addEventListener('click', (e) => {
                if (el.classList.contains('editing')) return;
                this.startEdit(el);
            });
        });
    },

    // Начало редактирования поля
    startEdit(el) {
        const field = el.dataset.field;
        const type = el.dataset.type || 'text';

        // Получаем текущее значение
        let currentValue = '';
        if (type === 'number') {
            currentValue = parseFloat(el.innerText.replace(/[^\d.-]/g, '')) || 0;
        } else if (type === 'date') {
            // Конвертируем дату обратно в формат input
            currentValue = this.currentProject?.[field] || '';
        } else {
            currentValue = this.currentProject?.[field] || el.innerText;
            if (currentValue === '—') currentValue = '';
        }

        el.classList.add('editing');

        // Создаём input
        const input = document.createElement('input');
        input.type = type === 'date' ? 'date' : (type === 'number' ? 'number' : 'text');
        input.className = 'edit-input';
        input.value = currentValue;

        // Сохраняем оригинальный контент
        const originalContent = el.innerHTML;
        el.innerHTML = '';
        el.appendChild(input);
        input.focus();
        input.select();

        // Обработчики событий
        const save = () => {
            let value = input.value;
            el.classList.remove('editing');

            if (type === 'number') {
                value = parseFloat(value) || 0;
                el.innerText = utils.formatCurrency(value);
            } else if (type === 'date') {
                el.innerText = value ? utils.formatDate(value) : '—';
            } else {
                el.innerText = value || '—';
            }

            this.saveField(field, type === 'number' ? value : (value || null));

            // Пересчёт остатка если меняли финансы
            if (field === 'contract_amount' || field === 'prepayment_amount') {
                this.updateBalance();
            }
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
            if (e.key === 'Escape') {
                el.classList.remove('editing');
                el.innerHTML = originalContent;
            }
        });
    },

    // Сохранение поля в БД
    async saveField(field, value) {
        if (!this.currentProjectId) return;

        try {
            await api.call('updateProject', {
                id: this.currentProjectId,
                data: { [field]: value }
            }, 'POST', false);

            // Обновляем локальные данные
            if (this.currentProject) {
                this.currentProject[field] = value;
            }

            // Показываем индикатор сохранения
            this.showSaveIndicator();
        } catch (e) {
            console.error('Ошибка сохранения:', e);
            alert('Не удалось сохранить: ' + e.message);
        }
    },

    // Пересчёт остатка
    updateBalance() {
        const contract = parseFloat(this.currentProject?.contract_amount) || 0;
        const prepay = parseFloat(this.currentProject?.prepayment_amount) || 0;
        const balance = contract - prepay;

        const balanceEl = document.getElementById('pDetailBalance');
        if (balanceEl) {
            balanceEl.innerText = utils.formatCurrency(balance);
        }
    },

    // Индикатор сохранения
    showSaveIndicator() {
        let indicator = document.querySelector('.save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'save-indicator';
            indicator.innerHTML = '<i class="fas fa-check"></i> Сохранено';
            document.body.appendChild(indicator);
        }
        indicator.classList.add('show');
        setTimeout(() => indicator.classList.remove('show'), 1500);
    },

    // Рендер компактной команды
    async renderTeamCompact(projectId) {
        const container = document.getElementById('pDetailTeamCompact');
        if (!container) return;

        const roleNames = {
            'designer': 'Дизайнер',
            'measurer': 'Замерщик',
            'technologist': 'Технолог',
            'supplier': 'Снабженец',
            'production': 'Производство',
            'installation': 'Монтаж',
            'manager': 'Менеджер',
            'member': 'Участник'
        };

        try {
            const team = await api.call('getProjectTeam', { projectId });

            if (!team || team.length === 0) {
                container.innerHTML = '<span style="font-size:12px; color:#999;">Нет участников</span>';
                return;
            }

            // Показываем участников с ролями
            container.innerHTML = team.map(member => {
                const name = member.users?.name || 'Без имени';
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const role = roleNames[member.role] || member.role || 'Участник';

                return `
                <div class="team-member-compact" onclick="positions.openTeamModal()" title="${role}: ${name}">
                    <div class="team-avatar-sm">${initials}</div>
                    <div class="team-member-info">
                        <div class="team-member-role">${role}</div>
                        <div class="team-member-name">${name}</div>
                    </div>
                </div>`;
            }).join('');

        } catch (e) {
            console.error('Ошибка загрузки команды:', e);
        }
    },

    async renderList() {
        console.log("📋 renderList() called, currentProjectId:", this.currentProjectId);

        const container = document.getElementById('pDetailPositions');
        if (!container) {
            console.error("❌ Container #pDetailPositions not found!");
            return;
        }

        if (!this.currentProjectId) {
            console.error("❌ renderList: currentProjectId is null!");
            container.innerHTML = '<div style="color:red; text-align:center;">Ошибка: ID проекта не найден</div>';
            return;
        }

        try {
            console.log("📋 Calling API: getPositions for project:", this.currentProjectId);
            const list = await api.call('getPositions', { projectId: this.currentProjectId });
            console.log("📋 Positions received:", list);

            if (!list || list.length === 0) {
                container.innerHTML = '<div style="text-align:center; color:#999; padding:20px; font-size:13px;">Нет позиций</div>';
                return [];
            }

            // Рендер позиций как карточки
            container.innerHTML = list.map(pos => {
                const safeName = encodeURIComponent(pos.name || 'Без названия');
                return `
                <div class="position-card" data-pos-id="${pos.id}" data-pos-name="${safeName}">
                    <i class="fas fa-cube"></i>
                    <span>${pos.name || 'Без названия'}</span>
                </div>
            `}).join('');

            // Обработчики кликов
            container.querySelectorAll('.position-card').forEach(card => {
                card.onclick = () => {
                    const id = card.dataset.posId;
                    const name = decodeURIComponent(card.dataset.posName);
                    app.openPosition(id, name);
                };
            });

            console.log("✅ Positions rendered:", list.length, "items");
            return list;
        } catch (e) {
            console.error("❌ Error in renderList:", e);
            container.innerHTML = `<div style="color:red; text-align:center;">Ошибка: ${e.message}</div>`;
            return [];
        }
    },

    async createPrompt() {
        // Проверка на потерю ID
        if (!this.currentProjectId) {
            console.error("Current Project ID is null!");
            return alert("Ошибка: ID проекта не найден. Попробуйте обновить страницу и открыть проект заново.");
        }

        const name = prompt("Название изделия (например: Кухня):");
        if (!name) return;

        try {
            await api.call('createPosition', { projectId: this.currentProjectId, name }, 'POST');
            this.renderList();
        } catch (e) {
            alert("Не удалось создать изделие: " + e.message);
        }
    },

    // === УРОВЕНЬ 2: ВНУТРИ ИЗДЕЛИЯ (ТАБЫ) ===
    async openPosition(posId, name, projectId = null) {
        console.log('📄 positions.openPosition called:', { posId, name, projectId });

        this.currentPositionId = posId;

        // Если передан projectId (из канбана), нужно загрузить данные проекта
        if (projectId && projectId !== this.currentProjectId) {
            console.log('📂 Loading project data for position...');
            try {
                const proj = await api.call('getProjectById', { id: projectId });
                this.currentProjectId = projectId;
                this.currentProject = proj;
                this.currentProjectName = proj?.name || 'Проект';
            } catch (e) {
                console.error('Ошибка загрузки проекта:', e);
            }
        }

        // Обновляем breadcrumb
        const nameEl = document.getElementById('posDetailName');
        const projectEl = document.getElementById('posDetailProject');
        const titleEl = document.getElementById('designTitle');

        if (nameEl) nameEl.innerText = name || 'Изделие';
        if (projectEl) projectEl.innerText = this.currentProjectName || 'Проект';
        if (titleEl) titleEl.innerText = `Дизайн проект — ${name || 'Изделие'}`;

        // Сброс на первую вкладку (Дизайн)
        app.switchPipelineTab('design');
    },

    // === ПРОИЗВОДСТВО (Logic) ===
    async renderProduction() {
        if (!this.currentPositionId) return;
        const container = document.getElementById('prodList');
        if (!container) return;
        container.innerHTML = '<div class="spinner"></div>';

        try {
            const tasks = await api.call('getProductionTasks', { positionId: this.currentPositionId });

            if (tasks.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">Добавьте этапы работ</div>`;
                return;
            }

            container.innerHTML = tasks.map(t => {
                if (t.type === 'internal') {
                    const isDone = t.status === 'done';
                    return `
                    <div class="prod-task-internal">
                        <div class="prod-check ${isDone ? 'done' : ''}" onclick="positions.toggleInternal('${t.id}', ${!isDone})">
                            <i class="fas fa-check"></i>
                        </div>
                        <div class="prod-title ${isDone ? 'done' : ''}">${t.title}</div>
                        <button class="btn-icon-del" onclick="positions.deleteTask('${t.id}')"><i class="fas fa-times"></i></button>
                    </div>`;
                } else {
                    return `
                    <div class="prod-task-external">
                        <div class="ext-header">
                            <span>${t.title}</span>
                            <span>${utils.formatCurrency(t.cost)}</span>
                        </div>
                        <div class="ext-status-row">
                            <div class="ext-step ${t.status === 'pending' ? 'active' : ''}" onclick="positions.setStatus('${t.id}', 'pending')">Ожидание</div>
                            <div class="ext-step ${t.status === 'work' ? 'active' : ''}" onclick="positions.setStatus('${t.id}', 'work')">В работе</div>
                            <div class="ext-step ${t.status === 'done' ? 'done-green' : ''}" onclick="positions.setStatus('${t.id}', 'done')">Готово</div>
                        </div>
                        <div style="text-align:right; margin-top:5px;">
                           <button class="btn-text" style="font-size:11px; color:#ef4444;" onclick="positions.deleteTask('${t.id}')">Удалить</button>
                        </div>
                    </div>`;
                }
            }).join('');
        } catch (e) {
            container.innerHTML = `<div style="color:red; text-align:center;">Ошибка: ${e.message}</div>`;
        }
    },

    async toggleInternal(id, newState) {
        await api.call('updateTaskStatus', { taskId: id, status: newState ? 'done' : 'pending' });
        this.renderProduction();
    },

    async setStatus(id, status) {
        await api.call('updateTaskStatus', { taskId: id, status: status });
        this.renderProduction();
    },

    async deleteTask(id) {
        if (!confirm("Удалить этап?")) return;
        await api.call('deleteTask', { taskId: id });
        this.renderProduction();
    },

    openProdModal() {
        this.currentTaskType = 'internal';
        this.updateModalUI();
        const t = document.getElementById('prodTitle'); if (t) t.value = '';
        const c = document.getElementById('prodCost'); if (c) c.value = '';
        document.getElementById('prodModal').classList.remove('hidden');
        document.getElementById('prodModal').style.display = 'flex';
    },

    setTaskType(type) {
        this.currentTaskType = type;
        this.updateModalUI();
    },

    updateModalUI() {
        const btnInt = document.getElementById('type-internal');
        const btnExt = document.getElementById('type-external');
        const costBlock = document.getElementById('prodCostBlock');

        if (this.currentTaskType === 'internal') {
            btnInt.classList.add('active'); btnExt.classList.remove('active');
            costBlock.classList.add('hidden');
        } else {
            btnExt.classList.add('active'); btnInt.classList.remove('active');
            costBlock.classList.remove('hidden');
        }
    },

    async createTask() {
        const title = document.getElementById('prodTitle').value;
        const cost = document.getElementById('prodCost').value;
        if (!title) return alert("Введите название");

        await api.call('createProductionTask', {
            positionId: this.currentPositionId,
            title: title,
            type: this.currentTaskType,
            cost: cost
        }, 'POST');

        document.getElementById('prodModal').classList.add('hidden');
        this.renderProduction();
    },

    // === NEW: KPI CARDS ===
    renderKPI(project, positions) {
        const progressEl = document.getElementById('kpiProgress');
        const deadlineEl = document.getElementById('kpiDeadline');

        // Прогресс: % позиций на последних этапах (production, install, handover)
        if (positions && positions.length > 0) {
            const doneStages = ['production', 'install', 'handover'];
            const doneCount = positions.filter(p => doneStages.includes(p.status)).length;
            const progress = Math.round((doneCount / positions.length) * 100);
            if (progressEl) progressEl.innerText = progress + '%';
        } else {
            if (progressEl) progressEl.innerText = '0%';
        }

        // Дедлайн
        if (deadlineEl) {
            deadlineEl.innerText = project?.deadline
                ? utils.formatDate(project.deadline)
                : '—';
        }
    },

    // === NEW: STAGES PIPELINE ===
    renderStagesPipeline(positions) {
        const container = document.getElementById('stagesRibbon');
        if (!container) return;

        // 7 этапов
        const stages = [
            { id: 'design', name: '1. Дизайн' },
            { id: 'measure', name: '2. Замер' },
            { id: 'detail', name: '3. Деталировка' },
            { id: 'supply', name: '4. Закуп' },
            { id: 'production', name: '5. Изготовление' },
            { id: 'install', name: '6. Монтаж' },
            { id: 'handover', name: '7. Сдача' }
        ];

        // Подсчёт позиций по этапам
        const positionsList = positions || [];
        const statusCounts = {};
        positionsList.forEach(p => {
            const st = p.status || 'design';
            statusCounts[st] = (statusCounts[st] || 0) + 1;
        });

        container.innerHTML = stages.map(stage => {
            const count = statusCounts[stage.id] || 0;
            const total = positionsList.length;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

            // Определяем статус этапа
            let statusClass = 'pending';
            let statusLabel = 'Ожидание';

            if (count > 0 && count === total) {
                statusClass = 'done';
                statusLabel = 'Готово';
            } else if (count > 0) {
                statusClass = 'in-progress';
                statusLabel = 'В работе';
            }

            return `
                <div class="stage-card ${statusClass}" onclick="positions.openStageDetails('${stage.id}')">
                    <div class="stage-name">${stage.name}</div>
                    <div class="stage-status">${statusLabel}, ${percent}%</div>
                </div>
            `;
        }).join('');
    },

    // Клик по этапу — заглушка
    openStageDetails(stageId) {
        const stageNames = {
            'design': 'Дизайн',
            'measure': 'Замер',
            'detail': 'Деталировка',
            'supply': 'Закуп',
            'production': 'Изготовление',
            'install': 'Монтаж',
            'handover': 'Сдача'
        };
        alert(`Этап: ${stageNames[stageId] || stageId}\n\nСводка по этапу будет доступна в следующем обновлении.`);
    },
};

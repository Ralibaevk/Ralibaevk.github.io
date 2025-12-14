// js/positions.js
const positions = {
    currentProjectId: null,
    currentPositionId: null,
    currentTaskType: 'internal',

    // === УРОВЕНЬ 1: СПИСОК ИЗДЕЛИЙ В ПРОЕКТЕ ===
    async openProject(projectId) {
        console.log("📂 Открываем проект ID:", projectId);
        this.currentProjectId = projectId;

        // Очищаем старые данные перед загрузкой
        document.getElementById('pDetailName').innerText = "Загрузка...";
        document.getElementById('pDetailClient').innerText = "";
        document.getElementById('pDetailPositions').innerHTML = '<div class="spinner"></div>';

        try {
            // 1. Грузим инфо о проекте
            const proj = await api.call('getProjectById', { id: projectId });

            if (!proj) throw new Error("Проект не найден");

            document.getElementById('pDetailName').innerText = proj.name;
            document.getElementById('pDetailClient').innerText = proj.client_name || 'Клиент не указан';

            // 2. Грузим список изделий
            await this.renderList();
        } catch (e) {
            console.error("Ошибка открытия проекта:", e);
            document.getElementById('pDetailName').innerText = "Ошибка";
            document.getElementById('pDetailPositions').innerHTML = `<div style="color:red; text-align:center;">Не удалось загрузить: ${e.message}</div>`;
        }
    },

    async renderList() {
        const container = document.getElementById('pDetailPositions');

        try {
            const list = await api.call('getPositions', { projectId: this.currentProjectId });

            if (list.length === 0) {
                container.innerHTML = '<div style="text-align:center; color:#ccc; padding:20px;">Добавьте изделия (Кухня, Шкаф...)</div>';
                return;
            }

            container.innerHTML = list.map(pos => `
                <div class="card" onclick="app.openPosition('${pos.id}', '${pos.name}')" style="display:flex; gap:15px; align-items:center;">
                    <div style="width:50px; height:50px; background:#f3f4f6; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-cube" style="color:#cbd5e1;"></i>
                    </div>
                    <div>
                        <h3 style="margin:0; font-size:16px;">${pos.name}</h3>
                        <div style="font-size:12px; color:#6b7280; margin-top:2px;">Статус: ${pos.status || 'design'}</div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            container.innerHTML = 'Ошибка списка изделий';
        }
    },

    async createPrompt() {
        const name = prompt("Название изделия (например: Кухня):");
        if (!name) return;
        await api.call('createPosition', { projectId: this.currentProjectId, name }, 'POST');
        this.renderList();
    },

    // === УРОВЕНЬ 2: ВНУТРИ ИЗДЕЛИЯ (ТАБЫ) ===
    openPosition(posId, name) {
        this.currentPositionId = posId;
        document.getElementById('posDetailName').innerText = name;

        // Сброс статуса в шапке
        document.getElementById('posDetailStatus').innerText = "Загрузка...";

        // По умолчанию открываем Инфо
        app.switchPosTab('info');

        // Подгружаем актуальный статус
        // (Можно добавить отдельный API запрос, если нужно, но пока оставим так)
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
};

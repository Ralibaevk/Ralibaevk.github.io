// js/projects.js
const projects = {
    data: [],

    async init() {
        await this.render();
    },

    async render() {
        const container = document.getElementById('projectsList');
        container.innerHTML = '<div class="spinner"></div>';

        try {
            this.data = await api.call('getGlobalProjects');

            if (this.data.length === 0) {
                container.innerHTML = `<div style="text-align:center; color:#999; padding:40px;">Нет активных заказов</div>`;
                return;
            }

            container.innerHTML = this.data.map(p => {
                // Статус переводим
                const statusMap = { 'new': 'Новый', 'work': 'В работе', 'done': 'Сдан' };
                const badgeClass = p.status === 'new' ? 'blue' : (p.status === 'done' ? 'green' : 'orange');

                return `
                <div class="card" onclick="app.openProject('${p.id}')">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span class="badge ${badgeClass}">${statusMap[p.status] || p.status}</span>
                        <span style="font-size:12px; color:#9ca3af;">${utils.formatDate(p.created_at)}</span>
                    </div>
                    <h3 style="margin:0 0 5px 0; font-size:16px;">${p.name}</h3>
                    <div style="font-size:13px; color:#6b7280;">Клиент: ${p.client_name || 'Не указан'}</div>
                    
                    <!-- Прогресс бар (фейковый пока) -->
                    <div class="progress-wrap"><div class="progress-fill" style="width: 10%;"></div></div>
                </div>
                `;
            }).join('');

        } catch (e) {
            container.innerHTML = 'Ошибка загрузки';
        }
    },

    async createPrompt() {
        const name = prompt("Название заказа (например: ЖК Абая):");
        if (!name) return;
        const client = prompt("Имя клиента:");

        await api.call('createGlobalProject', { name, client }, 'POST');
        this.render();
    }
};

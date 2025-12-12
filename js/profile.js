// js/profile.js

const profile = {
    async init() {
        this.render();
    },

    open() {
        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
        document.getElementById('view-profile').classList.remove('hidden');
        this.init();
    },

    async render() {
        const container = document.getElementById('profileContent');
        const user = app.user || { first_name: 'Гость', id: '0' };

        // 1. Личная карточка
        const userHtml = `
            <div class="p-card" style="margin-bottom:20px;">
                <div style="display:flex; align-items:center; gap:16px;">
                    <div style="width:64px; height:64px; background:#f3f4f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700; color:var(--text-sec);">
                        ${(user.first_name || 'U')[0]}
                    </div>
                    <div>
                        <h2 style="margin:0; font-size:20px; font-weight:700;">${user.first_name} ${user.last_name || ''}</h2>
                        <div style="color:var(--text-sec); font-size:14px; margin-top:4px;">ID: ${user.id}</div>
                    </div>
                </div>
                <!-- Статистика (Заглушка) -->
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; margin-top:20px; padding-top:20px; border-top:1px solid var(--border);">
                    <div style="text-align:center;">
                        <div style="font-weight:800; font-size:18px;">0</div>
                        <div style="font-size:12px; color:var(--text-sec);">Проектов</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; font-size:18px;">0</div>
                        <div style="font-size:12px; color:var(--text-sec);">Лет стажа</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; font-size:18px; color:#f59e0b;">5.0</div>
                        <div style="font-size:12px; color:var(--text-sec);">Рейтинг</div>
                    </div>
                </div>
            </div>
        `;

        // 2. Блок Компании
        let companyHtml = '';

        if (!window.CURRENT_COMPANY_ID) {
            // == НЕТ КОМПАНИИ ==
            companyHtml = `
                <div class="p-card" style="text-align:center; padding:40px 20px;">
                    <div style="width:60px; height:60px; background:#eff6ff; border-radius:16px; margin:0 auto 16px; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-building" style="font-size:30px; color:var(--primary);"></i>
                    </div>
                    <h3 style="margin:0 0 8px 0; font-size:18px;">Нет компании</h3>
                    <p style="color:var(--text-sec); font-size:14px; margin-bottom:24px; line-height:1.5;">
                        Создайте свою команду или присоединитесь к существующей, чтобы работать над проектами вместе.
                    </p>
                    
                    <button class="btn btn-primary" style="width:100%; margin-bottom:12px; justify-content:center; height:44px;" onclick="profile.createCompanyPrompt()">
                        Создать компанию
                    </button>
                    <button class="btn btn-def" style="width:100%; justify-content:center; height:44px;" onclick="profile.joinCompanyPrompt()">
                        Ввести код приглашения
                    </button>
                </div>
            `;
        } else {
            // == ЕСТЬ КОМПАНИЯ ==
            const members = await api.call('getCompanyMembers');
            // Проверка прав: Владелец или Админ может менять роли
            const canManage = window.CURRENT_USER_ROLE === 'owner' || window.CURRENT_USER_ROLE === 'admin';

            const membersList = members.map(m => {
                const isMe = String(m.id) === String(user.id);

                // Селект ролей (только если есть права и это не мы сами)
                let roleEl = '';
                if (canManage && !isMe) {
                    roleEl = `
                        <select class="status-select" onchange="profile.changeRole('${m.id}', this.value)" style="padding:4px 8px; font-size:11px;">
                            <option value="employee" ${m.role === 'employee' ? 'selected' : ''}>Сотрудник</option>
                            <option value="buyer" ${m.role === 'buyer' ? 'selected' : ''}>Снабженец</option>
                            <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Админ</option>
                        </select>
                    `;
                } else {
                    roleEl = `<span class="card-tag" style="font-size:10px; background:#f3f4f6; color:#555;">${this.translateRole(m.role)}</span>`;
                }

                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #f3f4f6;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:36px; height:36px; background:var(--primary); color:white; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700;">
                                ${(m.first_name || 'U')[0]}
                            </div>
                            <div>
                                <div style="font-size:14px; font-weight:600;">
                                    ${m.first_name} ${isMe ? '<span style="color:#aaa;">(Вы)</span>' : ''}
                                </div>
                                <div style="font-size:11px; color:var(--text-sec);">@${m.username || '...'}</div>
                            </div>
                        </div>
                        <div>${roleEl}</div>
                    </div>
                `;
            }).join('');

            companyHtml = `
                <div class="p-card">
                    <div class="card-header" style="border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:0;">
                        <div>
                            <div style="font-size:11px; color:var(--text-sec); font-weight:700; text-transform:uppercase;">Компания</div>
                            <h3 class="card-title" style="margin-top:4px;">${window.CURRENT_COMPANY_NAME}</h3>
                        </div>
                        ${canManage ? `<button class="btn btn-text" onclick="profile.invite()" style="color:var(--primary); background:#eff6ff;"><i class="fas fa-plus"></i> Инвайт</button>` : ''}
                    </div>
                    
                    <div style="margin-top:10px;">
                        ${membersList}
                    </div>

                    <div style="margin-top:24px; text-align:center;">
                        <button class="btn btn-text" style="color:#ef4444;" onclick="profile.leave()">
                            <i class="fas fa-sign-out-alt"></i> Выйти из компании
                        </button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = userHtml + companyHtml;
    },

    // --- ACTIONS ---

    async createCompanyPrompt() {
        const name = prompt("Название вашей компании:");
        if (!name) return;

        try {
            document.getElementById('loader').classList.remove('hidden');
            await api.call('createCompany', { name, userId: app.user.id }, 'POST', false);
            await this.render(); // Перерисовка
            alert("Компания создана!");
        } catch (e) {
            alert("Ошибка: " + e.message);
        } finally {
            document.getElementById('loader').classList.add('hidden');
        }
    },

    async joinCompanyPrompt() {
        const code = prompt("Введите код приглашения (6 символов):");
        if (!code) return;

        try {
            document.getElementById('loader').classList.remove('hidden');
            await api.call('joinCompany', { code, userId: app.user.id }, 'POST', false);

            // После входа нужно полностью перезагрузить состояние (получить ID и роль)
            // Самый простой способ - перезагрузка страницы
            alert("Успешно! Перезагрузка...");
            location.reload();
        } catch (e) {
            alert("Ошибка: " + e.message);
            document.getElementById('loader').classList.add('hidden');
        }
    },

    async invite() {
        const res = await api.call('createInvite', { userId: app.user.id }, 'POST');
        prompt("Скопируйте код и отправьте сотруднику:", res.code);
    },

    async changeRole(targetId, newRole) {
        await api.call('updateMemberRole', { targetId, newRole }, 'POST');
        // Не перерисовываем, селект уже изменился
    },

    async leave() {
        if (!confirm("Вы уверены, что хотите выйти? Вы потеряете доступ к проектам.")) return;
        await api.call('leaveCompany', { userId: app.user.id }, 'POST');
        location.reload();
    },

    translateRole(role) {
        const roles = { 'owner': 'Владелец', 'admin': 'Админ', 'buyer': 'Снабженец', 'employee': 'Сотрудник' };
        return roles[role] || role;
    }
};

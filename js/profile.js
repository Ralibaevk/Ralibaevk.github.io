// js/profile.js
console.log("✅ profile.js file is loading...");

window.profile = {
    async init() {
        // Всегда рендерим, даже если юзера нет (будет Гость)
        this.render();
    },

    open() {
        app.showScreen('view-profile');
        this.init();
    },

    async render() {
        const container = document.getElementById('profileContent');
        if (!container) return;

        try {
            const user = app.user || { first_name: 'Гость', id: '0' };

            // --- 1. ЛИЧНАЯ КАРТОЧКА ---
            const userHtml = `
                <div class="p-card" style="margin-bottom:20px;">
                    <div style="display:flex; align-items:center; gap:16px;">
                        <div style="width:64px; height:64px; background:#f3f4f6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700; color:var(--text-sec);">
                            ${(user.first_name || 'U')[0]}
                        </div>
                        <div>
                            <h2 style="margin:0; font-size:20px; font-weight:700;">${user.first_name} ${user.last_name || ''}</h2>
                            <div style="color:var(--text-sec); font-size:14px; margin-top:4px;">@${user.username || 'user'}</div>
                        </div>
                    </div>
                </div>
            `;

            let companyHtml = '';

            // --- 2. БЛОК КОМПАНИИ ---
            if (!window.CURRENT_COMPANY_ID) {
                // Если компании нет (код тот же)
                companyHtml = `
                    <div class="p-card" style="text-align:center; padding:40px 20px;">
                        <div style="width:60px; height:60px; background:#eff6ff; border-radius:16px; margin:0 auto 16px; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-building" style="font-size:30px; color:var(--primary);"></i>
                        </div>
                        <h3 style="margin:0 0 8px 0; font-size:18px;">Нет компании</h3>
                        <p style="color:var(--text-sec); font-size:14px; margin-bottom:24px;">Создайте команду или присоединитесь.</p>
                        <button class="btn btn-primary" style="width:100%; margin-bottom:12px; height:44px;" onclick="profile.createCompanyPrompt()">Создать компанию</button>
                        <button class="btn btn-def" style="width:100%; height:44px;" onclick="profile.joinCompanyPrompt()">Ввести код</button>
                    </div>
                `;
            } else {
                // Если компания есть
                // Проверка на ошибку API
                let members = [];
                let myCompanies = [];
                try {
                    members = await api.call('getCompanyMembers');
                    myCompanies = await api.call('getUserCompanies', { userId: user.id });
                } catch (apiErr) {
                    console.error("API Error in Profile:", apiErr);
                    members = [];
                    myCompanies = [];
                }

                // Моя текущая роль
                const myRole = window.CURRENT_USER_ROLE;

                // Рендер списка сотрудников с МНОЖЕСТВЕННЫМИ РОЛЯМИ
                const membersList = members.map(m => {
                    const isMe = String(m.id) === String(user.id);
                    const roles = m.roles || [];

                    let canEdit = (myRole === 'owner' && !isMe);

                    // Бейджики ролей
                    const roleColors = {
                        'owner': { bg: '#fef3c7', text: '#d97706' },
                        'manager': { bg: '#e0e7ff', text: '#4f46e5' },
                        'designer': { bg: '#dbeafe', text: '#2563eb' },
                        'measurer': { bg: '#fce7f3', text: '#db2777' },
                        'technologist': { bg: '#e0e7ff', text: '#4f46e5' },
                        'supplier': { bg: '#dcfce7', text: '#166534' },
                        'production': { bg: '#fef9c3', text: '#ca8a04' },
                        'installation': { bg: '#ffedd5', text: '#ea580c' },
                        'member': { bg: '#f3f4f6', text: '#4b5563' }
                    };

                    const roleBadges = roles.length > 0
                        ? roles.map(r => {
                            const color = roleColors[r] || roleColors.member;
                            const name = (window.ROLE_NAMES && window.ROLE_NAMES[r]) || r;
                            return `<span class="role-badge" style="background:${color.bg}; color:${color.text};">${name}</span>`;
                        }).join(' ')
                        : '<span class="role-badge" style="background:#f3f4f6; color:#999;">Нет ролей</span>';

                    // Кнопка редактирования
                    const editBtn = canEdit
                        ? `<button class="btn-icon-sm" onclick="profile.openRolesEditor('${m.id}', '${m.first_name}')" title="Редактировать роли">
                             <i class="fas fa-edit"></i>
                           </button>
                           <button class="btn-icon-sm btn-danger" onclick="profile.removeMember('${m.id}')" title="Удалить">
                             <i class="fas fa-trash"></i>
                           </button>`
                        : '';

                    return `
                        <div class="member-row">
                            <div class="member-info">
                                <div class="member-avatar">${(m.first_name || 'U')[0]}</div>
                                <div>
                                    <div class="member-name">
                                        ${m.first_name} ${isMe ? '<span style="color:#aaa;">(Вы)</span>' : ''}
                                    </div>
                                    <div class="member-roles">${roleBadges}</div>
                                </div>
                            </div>
                            <div class="member-actions">${editBtn}</div>
                        </div>
                    `;
                }).join('');

                // Список для переключения компаний
                const switchList = myCompanies.map(c => {
                    const isActive = c.id === window.CURRENT_COMPANY_ID;
                    const cRole = window.ROLE_NAMES ? (window.ROLE_NAMES[c.role] || c.role) : c.role;
                    return `
                        <div onclick="${isActive ? '' : `profile.switchCompany('${c.id}')`}" 
                             style="padding: 12px; border:1px solid ${isActive ? 'var(--primary)' : '#e5e7eb'}; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; background:${isActive ? '#eff6ff' : 'white'}; transition:0.2s;">
                            <div>
                                <div style="font-weight:600; font-size:14px; color:${isActive ? 'var(--primary)' : 'var(--text-main)'}">${c.name}</div>
                                <div style="font-size:11px; color:${isActive ? 'var(--primary)' : 'var(--text-sec)'}; opacity:0.8;">${cRole}</div>
                            </div>
                            ${isActive ? '<i class="fas fa-check-circle" style="color:var(--primary)"></i>' : '<i class="fas fa-chevron-right" style="color:#ccc; font-size:12px;"></i>'}
                        </div>
                    `;
                }).join('');

                const canInvite = myRole === 'owner' || myRole === 'admin';
                const curCompanyName = window.CURRENT_COMPANY_NAME || 'Компания';

                companyHtml = `
                    <!-- Карточка переключения -->
                    <div class="p-card" style="margin-bottom: 20px;">
                        <div class="card-header" style="margin-bottom:10px;">
                            <h3 class="card-title">Мои компании</h3>
                            <button class="btn btn-text" onclick="profile.joinCompanyPrompt()" style="font-size:12px; color:var(--primary);">+ Код</button>
                        </div>
                        <div>${switchList}</div>
                        <button class="btn btn-def" style="width:100%; margin-top:10px; font-size:13px;" onclick="profile.createCompanyPrompt()">Создать новую компанию</button>
                    </div>

                    <!-- Карточка сотрудников -->
                    <div class="p-card">
                        <div class="card-header" style="border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:0;">
                            <div>
                                <div style="font-size:11px; color:var(--text-sec); font-weight:700; text-transform:uppercase;">Команда</div>
                                <h3 class="card-title" style="margin-top:4px;">${curCompanyName}</h3>
                            </div>
                            ${canInvite ? `<button class="btn btn-primary" onclick="profile.invite()" style="padding:6px 12px; font-size:12px;"><i class="fas fa-user-plus"></i> Инвайт</button>` : ''}
                        </div>
                        
                        <div style="margin-top:10px;">
                            ${membersList}
                        </div>

                        <div style="margin-top:24px; text-align:center;">
                            <button class="btn btn-text" style="color:#ef4444; font-size:13px;" onclick="profile.leave()">
                                <i class="fas fa-sign-out-alt"></i> Выйти из этой компании
                            </button>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = userHtml + companyHtml;

        } catch (e) {
            console.error("Profile Render Error:", e);
            container.innerHTML = `
                <div class="p-card" style="text-align:center; padding:30px; border:1px solid red;">
                    <i class="fas fa-exclamation-circle" style="font-size:32px; color:red; margin-bottom:12px;"></i>
                    <h3 style="color:red; margin:0;">Ошибка отображения профиля</h3>
                    <p style="color:#666; font-size:13px; margin-top:5px;">${e.message}</p>
                    <button class="btn btn-def" onclick="location.reload()" style="margin-top:10px;">Обновить страницу</button>
                </div>
            `;
        }
    },

    // --- ACTIONS ---

    async changeRole(targetId, newRole) {
        if (newRole === 'delete') {
            if (confirm("Удалить сотрудника из компании?")) {
                await api.call('leaveCompany', { userId: targetId }, 'POST'); // Используем логику "покинуть" но с ID другого юзера
                this.render();
            } else {
                this.render(); // Сброс селекта
            }
            return;
        }

        await api.call('updateMemberRole', { targetId, newRole }, 'POST');
        alert("Права обновлены");
        // Можно не перерисовывать, если хотим оставить фокус, но лучше обновить для надежности
    },

    async switchCompany(companyId) {
        localStorage.setItem('preferred_company_id', companyId);
        location.reload();
    },

    // Обертки для API (те же что и раньше)
    async createCompanyPrompt() {
        const name = prompt("Название компании:");
        if (!name) return;
        try {
            document.getElementById('loader').classList.remove('hidden');
            await api.call('createCompany', { name, userId: app.user.id }, 'POST', false);
            location.reload();
        } catch (e) { alert(e.message); document.getElementById('loader').classList.add('hidden'); }
    },

    async joinCompanyPrompt() {
        const code = prompt("Введите код приглашения:");
        if (!code) return;
        try {
            document.getElementById('loader').classList.remove('hidden');
            await api.call('joinCompany', { code, userId: app.user.id }, 'POST', false);
            location.reload();
        } catch (e) { alert(e.message); document.getElementById('loader').classList.add('hidden'); }
    },

    async invite() {
        try {
            const res = await api.call('createInvite', { userId: app.user.id }, 'POST');

            // 👇 ОБНОВЛЕННЫЕ ДАННЫЕ ИЗ ВАШЕГО СКРИНШОТА
            const botUsername = "logiqa_work_bot";
            const appName = "directlink";

            // Ссылка будет вида: https://t.me/logiqa_work_bot/directlink?startapp=КОД
            const inviteLink = `https://t.me/${botUsername}/${appName}?startapp=${res.code}`;

            // Копируем в буфер (для мобилок)
            navigator.clipboard.writeText(inviteLink).then(() => {
                alert("Ссылка скопирована! Отправьте её сотруднику.");
            }).catch(() => {
                // Если буфер недоступен, показываем промпт
                prompt("Скопируйте ссылку:", inviteLink);
            });

        } catch (e) {
            alert(e.message);
        }
    },

    async leave() {
        if (!confirm("Вы уверены? Вы потеряете доступ к проектам.")) return;
        await api.call('leaveCompany', { userId: app.user.id }, 'POST');
        localStorage.removeItem('preferred_company_id');
        location.reload();
    },

    // === РЕДАКТОР РОЛЕЙ ===

    membersCache: [], // Кеш сотрудников для редактора

    async openRolesEditor(userId, name) {
        // Находим сотрудника в кеше или загружаем заново
        let members = await api.call('getCompanyMembers');
        this.membersCache = members;
        const member = members.find(m => String(m.id) === String(userId));
        if (!member) return alert('Сотрудник не найден');

        const currentRoles = member.roles || [];

        // Генерируем чекбоксы
        const roleOptions = Object.entries(window.ROLE_NAMES || {})
            .filter(([key]) => key !== 'owner') // Owner нельзя назначить
            .map(([key, label]) => {
                const checked = currentRoles.includes(key) ? 'checked' : '';
                return `
                    <label class="role-checkbox">
                        <input type="checkbox" value="${key}" ${checked}>
                        <span>${label}</span>
                    </label>
                `;
            }).join('');

        // Создаём модальное окно
        let modal = document.getElementById('rolesEditorModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'rolesEditorModal';
            modal.className = 'modal-overlay hidden';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-box" style="width:350px;">
                <h3>Роли: ${name}</h3>
                <div id="rolesCheckboxes" style="margin:20px 0;">
                    ${roleOptions}
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-def" style="flex:1;" onclick="document.getElementById('rolesEditorModal').classList.add('hidden')">Отмена</button>
                    <button class="btn btn-primary" style="flex:1;" onclick="profile.saveRoles('${userId}')">Сохранить</button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    },

    async saveRoles(userId) {
        const checkboxes = document.querySelectorAll('#rolesCheckboxes input[type="checkbox"]');
        const selectedRoles = [];
        checkboxes.forEach(cb => {
            if (cb.checked) selectedRoles.push(cb.value);
        });

        try {
            await api.call('updateMemberRoles', { targetId: userId, roles: selectedRoles }, 'POST');
            document.getElementById('rolesEditorModal').classList.add('hidden');
            this.render();
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

    async removeMember(userId) {
        if (!confirm("Удалить сотрудника из компании?")) return;
        try {
            await api.call('leaveCompany', { userId: userId }, 'POST');
            this.render();
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

};

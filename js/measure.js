// js/measure.js
console.log("✅ measure.js file is loading...");

window.measure = {
    currentPositionId: null,

    async init(positionId) {
        this.currentPositionId = positionId;
        this.render();
        await this.loadFiles();
    },

    render() {
        const container = document.getElementById('pipeline-measure');
        if (!container) return;

        // Определяем имя изделия для заголовка
        const itemName = document.getElementById('posDetailName')?.innerText || 'Изделие';

        container.innerHTML = `
            <div class="design-title-row">
                <h2>Замеры и Файлы</h2>
                <button class="btn btn-primary" onclick="measure.uploadPrompt('${itemName}')">
                    <i class="fas fa-plus"></i> Добавить файл
                </button>
            </div>

            <div class="p-card" style="margin-bottom:20px;">
                <div style="font-size:13px; color:#666; margin-bottom:15px;">
                    <i class="fas fa-info-circle"></i> Файлы хранятся в чате с ботом.
                </div>
                <div id="measureFilesList" class="file-list-grid">
                    <div style="text-align:center; padding:20px; color:#999;">Загрузка списка...</div>
                </div>
            </div>
        `;
    },

    async loadFiles() {
        const list = document.getElementById('measureFilesList');
        try {
            // 🔥 Исправлено: передаём stage = 'measure'
            const files = await api.call('getFiles', {
                parentId: this.currentPositionId,
                stage: 'measure'  // ✅ Правильный параметр!
            });

            console.log('📂 Загружено файлов:', files.length, files);

            if (!files || files.length === 0) {
                list.innerHTML = `<div style="text-align:center; padding:30px; color:#ccc;">Нет загруженных файлов</div>`;
                return;
            }

            list.innerHTML = files.map(f => {
                // Иконка
                let icon = 'fa-file';
                if (f.file_name.endsWith('.pdf')) icon = 'fa-file-pdf';
                if (f.file_name.match(/\.(jpg|jpeg|png)$/i)) icon = 'fa-file-image';
                if (f.file_name.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';

                return `
                <div class="file-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #eee;">
                    <div style="display:flex; align-items:center; gap:12px; overflow:hidden;">
                        <div style="width:40px; height:40px; background:#f3f4f6; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#666;">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div style="min-width:0;">
                            <div style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.file_name}</div>
                            <div style="font-size:11px; color:#999;">${utils.formatDate(f.created_at)}</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="measure.requestFile('${f.file_url}', '${f.file_name.replace(/'/g, "\\'")}', '${f.id}')" class="btn btn-def" style="padding:6px 12px; font-size:12px;">
                             <i class="fab fa-telegram-plane"></i> В чат
                        </button>
                        <button class="btn-icon-del" onclick="measure.deleteFile('${f.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');

        } catch (e) {
            console.error(e);
            list.innerHTML = `<div style="color:red; padding:20px;">Ошибка загрузки</div>`;
        }
    },

    // 1. ЗАГРУЗКА: Говорим боту, что сейчас пришлем файл
    async uploadPrompt(itemName) {
        try {
            // 🔥 Формируем состояние для возврата
            const returnState = `p${positions.currentProjectId}_pos${this.currentPositionId}_measure`;

            await api.call('setUploadMode', {
                positionId: this.currentPositionId,
                projectId: positions.currentProjectId || null,
                stage: 'measure',
                itemName: itemName,
                companyName: window.CURRENT_COMPANY_NAME || 'Компания',
                projectName: positions.currentProject?.name || 'Проект',
                returnState: returnState  // 🔥 Для deeplink возврата
            });

            // Закрываем приложение, чтобы пользователь попал в чат
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.close();
            } else {
                alert("Это работает только внутри Telegram! (Бот сейчас ждет ваш файл)");
            }
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    },

    // 2. СКАЧИВАНИЕ: Просим бота прислать файл обратно в чат
    async requestFile(tgFileUrl, fileName, fileDbId) {
        try {
            // 🔥 Формируем состояние для возврата
            const returnState = `p${positions.currentProjectId}_pos${this.currentPositionId}_measure`;

            await api.call('requestFileInChat', {
                fileUrl: tgFileUrl,
                fileName: fileName,
                fileDbId: fileDbId,
                returnState: returnState  // 🔥 Для deeplink возврата
            });
            // Закрываем чтобы пользователь увидел файл в чате
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.close();
            }
        } catch (e) {
            alert("Ошибка: " + e.message);
        }
    },

    async deleteFile(id) {
        if (!confirm("Удалить запись о файле?")) return;
        await api.call('deleteFile', { fileId: id });
        this.loadFiles();
    }
};
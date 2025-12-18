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

        container.innerHTML = `
            <div class="design-title-row">
                <h2>Замеры и Файлы</h2>
                <button class="btn btn-primary" onclick="measure.uploadPrompt()">
                    <i class="fas fa-upload"></i> Добавить файл
                </button>
            </div>

            <div class="p-card" style="margin-bottom:20px;">
                <div style="font-size:13px; color:#666; margin-bottom:15px;">
                    <i class="fas fa-info-circle"></i> Файлы сохраняются в закрытом Telegram-канале.
                </div>
                <div id="measureFilesList" class="file-list-grid">
                    <div style="text-align:center; padding:20px; color:#999;">Загрузка списка...</div>
                </div>
            </div>
            
            <input type="file" id="measureFileInput" style="display:none" onchange="measure.handleFileSelect(this)">
        `;
    },

    async loadFiles() {
        const list = document.getElementById('measureFilesList');
        try {
            // Запрашиваем файлы с этапа 'measure'
            const files = await api.call('getFiles', {
                parentId: this.currentPositionId,
                stage: 'measure'
            });

            if (files.length === 0) {
                list.innerHTML = `<div style="text-align:center; padding:30px; color:#ccc;">Нет загруженных файлов</div>`;
                return;
            }

            list.innerHTML = files.map(f => {
                // Иконка в зависимости от типа (простая логика)
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
                        <a href="${f.file_url}" target="_blank" class="btn btn-def" style="padding:6px 12px; font-size:12px;">
                            <i class="fas fa-external-link-alt"></i> Открыть
                        </a>
                        <button class="btn-icon-del" onclick="measure.deleteFile('${f.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');

        } catch (e) {
            console.error(e);
            list.innerHTML = `<div style="color:red; padding:20px;">Ошибка загрузки</div>`;
        }
    },

    uploadPrompt() {
        document.getElementById('measureFileInput').click();
    },

    async handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        // Ограничение по размеру (Телеграм принимает до 50МБ ботом легко, но лучше не жестить)
        if (file.size > 20 * 1024 * 1024) return alert("Файл слишком большой (макс 20МБ)");

        try {
            // 1. Грузим в Телеграм
            const res = await api.call('uploadFile', { file: file, name: file.name }, 'POST');

            // 2. Сохраняем ссылку в Supabase
            await api.call('saveFileRecord', {
                positionId: this.currentPositionId,
                name: file.name,
                url: res.url,
                type: 'file',
                stage: 'measure' // <--- Метка этапа
            }, 'POST', false);

            alert("Файл загружен!");
            this.loadFiles(); // Обновляем список

        } catch (e) {
            alert("Ошибка: " + e.message);
        } finally {
            input.value = '';
        }
    },

    async deleteFile(id) {
        if (!confirm("Удалить запись о файле?")) return;
        await api.call('deleteFile', { fileId: id });
        this.loadFiles();
    }
};

// js/measure.js
console.log("✅ measure.js file is loading...");

// 🔥 URL нашего file-proxy сервера (HTTPS!)
const FILE_PROXY_URL = 'https://files.logiqa.kz';

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

        const itemName = document.getElementById('posDetailName')?.innerText || 'Изделие';

        container.innerHTML = `
            <div class="design-title-row">
                <h2>Замеры и Файлы</h2>
                <label class="btn btn-primary" style="cursor:pointer;">
                    <i class="fas fa-plus"></i> Добавить файл
                    <input type="file" id="fileUploadInput" style="display:none;" onchange="measure.uploadFile(this.files[0], '${itemName}')">
                </label>
            </div>

            <div class="p-card" style="margin-bottom:20px;">
                <div id="uploadProgress" style="display:none; margin-bottom:15px;">
                    <div style="background:#e5e7eb; border-radius:8px; overflow:hidden;">
                        <div id="uploadBar" style="height:6px; background:var(--primary); width:0%; transition:width 0.3s;"></div>
                    </div>
                    <div style="font-size:12px; color:#666; margin-top:5px;">Загрузка...</div>
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
            const files = await api.call('getFiles', {
                parentId: this.currentPositionId,
                stage: 'measure'
            });

            console.log('📂 Загружено файлов:', files.length);

            if (!files || files.length === 0) {
                list.innerHTML = `<div style="text-align:center; padding:30px; color:#ccc;">Нет загруженных файлов</div>`;
                return;
            }

            list.innerHTML = files.map(f => {
                let icon = 'fa-file';
                const isImage = f.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                if (f.file_name.endsWith('.pdf')) icon = 'fa-file-pdf';
                if (isImage) icon = 'fa-file-image';
                if (f.file_name.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';
                if (f.file_name.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';
                if (f.file_name.match(/\.(zip|rar|7z)$/i)) icon = 'fa-file-archive';

                // Определяем можно ли просмотреть файл (только изображения и PDF!)
                const isPDF = f.file_name.match(/\.pdf$/i);
                const canPreview = isImage || isPDF;

                // Кнопка просмотра (только для изображений и PDF)
                const previewBtn = f.tg_file_id && canPreview
                    ? `<button onclick="measure.viewFile('${f.tg_file_id}', '${f.file_name.replace(/'/g, "\\'")}')" class="btn btn-def" style="padding:6px 12px; font-size:12px;">
                         <i class="fas fa-eye"></i>
                       </button>`
                    : '';
                // Кнопка скачивания для всех файлов (используем Telegram.WebApp.openLink для web-версии)
                const downloadUrl = f.tg_file_id
                    ? `${FILE_PROXY_URL}/download/${f.tg_file_id}?name=${encodeURIComponent(f.file_name)}`
                    : null;
                const downloadBtn = downloadUrl
                    ? `<button onclick="measure.openDownload('${downloadUrl}')" class="btn btn-def" style="padding:6px 12px; font-size:12px;">
                         <i class="fas fa-download"></i>
                       </button>`
                    : '';

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
                    <div style="display:flex; gap:6px;">
                        ${previewBtn}
                        ${downloadBtn}
                        <button class="btn-icon-del" onclick="measure.deleteFile('${f.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');

        } catch (e) {
            console.error(e);
            list.innerHTML = `<div style="color:red; padding:20px;">Ошибка загрузки</div>`;
        }
    },

    // 🔥 НОВАЯ ЗАГРУЗКА через сервер (без закрытия Mini App!)
    async uploadFile(file, itemName) {
        if (!file) return;

        const progress = document.getElementById('uploadProgress');
        const bar = document.getElementById('uploadBar');

        try {
            progress.style.display = 'block';
            bar.style.width = '30%';

            // Создаём FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('caption', `📎 ${itemName} | ${file.name}`);

            bar.style.width = '60%';

            // Отправляем на наш сервер
            const response = await fetch(`${FILE_PROXY_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!result.success) throw new Error(result.error);

            bar.style.width = '90%';

            // Сохраняем запись в Supabase
            await api.call('saveFileRecord', {
                parentId: this.currentPositionId,
                stage: 'measure',
                fileName: result.file_name,
                fileUrl: `tg://${result.file_id}`,  // Сохраняем file_id
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
        document.getElementById('fileUploadInput').value = '';
    },

    // 🔥 ПРОСМОТР файла прямо в приложении
    async viewFile(fileId, fileName) {
        // Открываем файл через наш proxy
        const url = `${FILE_PROXY_URL}/file/${fileId}`;

        // Для изображений — показываем в модальном окне
        if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            this.showImageModal(url, fileName);
        }
        // Для документов — используем Google Docs Viewer
        else if (fileName.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) {
            this.showDocumentModal(url, fileName);
        }
        else {
            // Для других файлов — открываем в новой вкладке
            window.open(url, '_blank');
        }
    },

    // Модальное окно для просмотра PDF
    showDocumentModal(url, fileName) {
        // Извлекаем fileId из URL
        const fileId = url.split('/file/')[1];

        const modal = document.createElement('div');
        modal.id = 'docModal';
        modal.style.cssText = `
            position:fixed; top:0; left:0; right:0; bottom:0; 
            background:rgba(0,0,0,0.9); z-index:9999; 
            display:flex; flex-direction:column; padding:10px;
        `;
        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; color:white;">
                <span style="font-size:14px;">${fileName}</span>
                <div>
                    <a href="${FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" target="_blank" style="color:white; font-size:18px; margin-right:15px;">
                        <i class="fas fa-download"></i>
                    </a>
                    <button onclick="this.closest('#docModal').remove()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <iframe src="${url}" style="flex:1; border:none; border-radius:8px; background:white;"></iframe>
        `;
        document.body.appendChild(modal);
    },

    // Модальное окно для просмотра изображений
    showImageModal(url, fileName) {
        const modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.style.cssText = `
            position:fixed; top:0; left:0; right:0; bottom:0; 
            background:rgba(0,0,0,0.9); z-index:9999; 
            display:flex; align-items:center; justify-content:center;
            padding:20px;
        `;
        modal.innerHTML = `
            <div style="position:relative; max-width:100%; max-height:100%;">
                <img src="${url}" style="max-width:100%; max-height:90vh; border-radius:8px;" onclick="event.stopPropagation();">
                <div style="text-align:center; color:white; margin-top:10px; font-size:14px;">${fileName}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; color:white; font-size:32px; cursor:pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
    },

    // 🔥 СКАЧИВАНИЕ файла (через Telegram.WebApp.openLink для совместимости с web-версией)
    openDownload(url) {
        // Telegram.WebApp.openLink работает в web.telegram.org, обходя блокировку popup
        if (window.Telegram?.WebApp?.openLink) {
            Telegram.WebApp.openLink(url);
        } else {
            // Фолбек для десктопа или если WebApp API недоступен
            window.open(url, '_blank');
        }
    },

    downloadFile(fileId, fileName) {
        const url = `${FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}`;
        this.openDownload(url);
    },

    async deleteFile(id) {
        if (!confirm("Удалить запись о файле?")) return;
        await api.call('deleteFile', { fileId: id });
        this.loadFiles();
    }
};

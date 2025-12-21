// js/design.js
console.log("✅ design.js file is loading...");

// 🔥 URL нашего file-proxy сервера
const DESIGN_FILE_PROXY_URL = 'https://files.logiqa.kz';

window.design = {
    currentPositionId: null,
    files: [],

    // Инициализация вкладки Дизайн
    async init(positionId) {
        console.log('📐 design.init:', positionId);
        this.currentPositionId = positionId;
        await this.loadFiles();
        await this.loadComments();
    },

    // === ЗАГРУЗКА ФАЙЛОВ (из project_files со stage='design') ===
    async loadFiles() {
        const filesList = document.getElementById('designFilesList');
        const filesCount = document.getElementById('designFilesCount');

        if (!this.currentPositionId) {
            if (filesList) filesList.innerHTML = '<div class="files-empty"><i class="fas fa-folder-open"></i> Файлы не загружены</div>';
            if (filesCount) filesCount.textContent = '0';
            return;
        }

        try {
            // Используем тот же API, что и канбан
            const files = await api.call('getFiles', {
                parentId: this.currentPositionId,
                stage: 'design'
            });

            console.log('📂 Design files loaded:', files?.length || 0);

            this.files = files || [];

            // Обновляем счётчик
            if (filesCount) filesCount.textContent = this.files.length;

            // Рендерим список ВСЕХ файлов
            this.renderFilesList();

        } catch (e) {
            console.error('Ошибка загрузки файлов дизайна:', e);
            if (filesList) filesList.innerHTML = '<div class="files-empty" style="color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</div>';
        }
    },

    // === СПИСОК ВСЕХ ФАЙЛОВ с кнопкой предпросмотра ===
    renderFilesList() {
        const filesList = document.getElementById('designFilesList');
        if (!filesList) return;

        if (!this.files || this.files.length === 0) {
            filesList.innerHTML = `
                <div class="files-empty">
                    <i class="fas fa-folder-open"></i> 
                    Файлы не загружены<br>
                    <small>Загрузите через канбан-доску "Дизайн"</small>
                </div>`;
            return;
        }

        filesList.innerHTML = this.files.map((f, index) => {
            // Определяем иконку по типу файла
            let icon = 'fa-file';
            let iconColor = '#6b7280';

            if (f.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                icon = 'fa-file-image';
                iconColor = '#3b82f6';
            } else if (f.file_name?.endsWith('.pdf')) {
                icon = 'fa-file-pdf';
                iconColor = '#ef4444';
            } else if (f.file_name?.match(/\.(xls|xlsx)$/i)) {
                icon = 'fa-file-excel';
                iconColor = '#10b981';
            } else if (f.file_name?.match(/\.(doc|docx)$/i)) {
                icon = 'fa-file-word';
                iconColor = '#3b82f6';
            } else if (f.file_name?.match(/\.(zip|rar|7z)$/i)) {
                icon = 'fa-file-archive';
                iconColor = '#f59e0b';
            }

            // Проверяем можно ли предпросматривать файл (явное преобразование в boolean)
            const canPreview = !!(f.file_name?.match(/\.(jpg|jpeg|png|gif|webp|pdf|xls|xlsx|doc|docx)$/i));

            // URL для просмотра файла
            const viewUrl = f.tg_file_id
                ? `${DESIGN_FILE_PROXY_URL}/file/${f.tg_file_id}`
                : (f.file_url || '');

            // URL для скачивания файла
            const downloadUrl = f.tg_file_id
                ? `${DESIGN_FILE_PROXY_URL}/download/${f.tg_file_id}?name=${encodeURIComponent(f.file_name || 'file')}`
                : (f.file_url || '#');

            // Можно ли просмотреть файл (нужен tg_file_id или file_url)
            const hasSource = !!(f.tg_file_id || f.file_url);

            // Показывать кнопку предпросмотра?
            const showPreviewBtn = canPreview && hasSource;

            console.log(`📄 File: ${f.file_name}, canPreview: ${canPreview}, hasSource: ${hasSource}, showBtn: ${showPreviewBtn}`);

            // Безопасное имя файла для onclick
            const safeFileName = (f.file_name || 'file').replace(/'/g, "\\'").replace(/"/g, '\\"');
            const safeFileId = f.tg_file_id || '';

            return `
                <div class="design-file-item">
                    <div class="design-file-icon" style="color:${iconColor};">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="design-file-info">
                        <div class="design-file-name">${f.file_name || 'Без имени'}</div>
                        <div class="design-file-date">${utils.formatDate(f.created_at)}</div>
                    </div>
                    <div class="design-file-actions">
                        ${showPreviewBtn ? `
                            <button class="btn-icon" onclick="design.viewFileByUrl('${viewUrl}', '${safeFileName}', '${safeFileId}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        ` : ''}
                        <a href="${downloadUrl}" target="_blank" class="btn-icon">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    },

    // === ПРЕДПРОСМОТР ФАЙЛА (по URL) ===
    viewFileByUrl(url, fileName, fileId) {
        // Для изображений — показываем в модальном окне
        if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            this.showImageModal(url, fileName);
        }
        // Для документов — используем showDocumentModal
        else if (fileName.match(/\.(pdf|doc|docx|xls|xlsx)$/i)) {
            this.showDocumentModal(url, fileName, fileId);
        }
        else {
            window.open(url, '_blank');
        }
    },

    // === ПРЕДПРОСМОТР ФАЙЛА (старый метод для совместимости) ===
    viewFile(fileId, fileName) {
        const url = `${DESIGN_FILE_PROXY_URL}/file/${fileId}`;
        this.viewFileByUrl(url, fileName, fileId);
    },

    // Модальное окно для изображений с зумом по колёсику
    showImageModal(url, fileName) {
        let currentZoom = 1;
        const minZoom = 0.5;
        const maxZoom = 5;
        const zoomStep = 0.15;

        const modal = document.createElement('div');
        modal.id = 'designImageModal';
        modal.style.cssText = `
            position:fixed; top:0; left:0; right:0; bottom:0; 
            background:rgba(0,0,0,0.9); z-index:10000; 
            display:flex; align-items:center; justify-content:center;
            padding:20px; overflow:hidden;
        `;
        modal.innerHTML = `
            <div id="imageContainer" style="position:relative; display:flex; flex-direction:column; align-items:center;">
                <img id="zoomableImage" src="${url}" style="max-width:90vw; max-height:85vh; border-radius:8px; transition:transform 0.1s; cursor:zoom-in;" onclick="event.stopPropagation();">
                <div style="text-align:center; color:white; margin-top:10px; font-size:14px;">${fileName}</div>
                <div id="zoomIndicator" style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:white; padding:8px 16px; border-radius:20px; font-size:14px;">100%</div>
            </div>
            <button onclick="this.parentElement.remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; color:white; font-size:32px; cursor:pointer;">
                <i class="fas fa-times"></i>
            </button>
            <div style="position:absolute; bottom:20px; right:20px; display:flex; gap:10px;">
                <button id="zoomOutBtn" style="width:40px; height:40px; border-radius:50%; border:none; background:rgba(255,255,255,0.2); color:white; font-size:18px; cursor:pointer;">−</button>
                <button id="zoomInBtn" style="width:40px; height:40px; border-radius:50%; border:none; background:rgba(255,255,255,0.2); color:white; font-size:18px; cursor:pointer;">+</button>
            </div>
        `;

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);

        const img = document.getElementById('zoomableImage');
        const indicator = document.getElementById('zoomIndicator');

        const updateZoom = () => {
            img.style.transform = `scale(${currentZoom})`;
            indicator.textContent = `${Math.round(currentZoom * 100)}%`;
            img.style.cursor = currentZoom > 1 ? 'zoom-out' : 'zoom-in';
        };

        // Зум колёсиком мыши
        modal.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            } else {
                currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            }
            updateZoom();
        }, { passive: false });

        // Кнопки зума
        document.getElementById('zoomInBtn').onclick = (e) => {
            e.stopPropagation();
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateZoom();
        };
        document.getElementById('zoomOutBtn').onclick = (e) => {
            e.stopPropagation();
            currentZoom = Math.max(minZoom, currentZoom - zoomStep);
            updateZoom();
        };

        // Клик на изображение для переключения зума
        img.onclick = (e) => {
            e.stopPropagation();
            currentZoom = currentZoom > 1 ? 1 : 2;
            updateZoom();
        };
    },

    // Модальное окно для документов (PDF, Excel, Word)
    showDocumentModal(url, fileName, fileId) {
        const modal = document.createElement('div');
        modal.id = 'docModal';
        modal.style.cssText = `
            position:fixed; top:0; left:0; right:0; bottom:0; 
            background:rgba(0,0,0,0.9); z-index:10000; 
            display:flex; flex-direction:column; padding:10px;
        `;

        const isPDF = fileName.match(/\.pdf$/i);
        const isExcel = fileName.match(/\.(xls|xlsx)$/i);
        const isWord = fileName.match(/\.(doc|docx)$/i);

        const headerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; color:white;">
                <span style="font-size:14px;">${fileName}</span>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span id="designDocInfo" style="font-size:12px; color:#888;"></span>
                    <a href="${DESIGN_FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" target="_blank" style="color:white; font-size:18px;">
                        <i class="fas fa-download"></i>
                    </a>
                    <button onclick="this.closest('#docModal').remove()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        if (isPDF && window.pdfjsLib) {
            this.pdfZoom = 1;
            modal.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; color:white;">
                    <span style="font-size:14px;">${fileName}</span>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button id="designPdfPrevPage" style="background:#333; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">&lt;</button>
                            <span id="designPdfPageInfo" style="font-size:12px;">Загрузка...</span>
                            <button id="designPdfNextPage" style="background:#333; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">&gt;</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; background:#333; padding:4px 8px; border-radius:4px;">
                            <button id="designPdfZoomOut" style="background:none; border:none; color:white; font-size:14px; cursor:pointer; padding:2px 6px;">−</button>
                            <span id="designPdfZoomInfo" style="font-size:12px; min-width:40px; text-align:center;">100%</span>
                            <button id="designPdfZoomIn" style="background:none; border:none; color:white; font-size:14px; cursor:pointer; padding:2px 6px;">+</button>
                        </div>
                        <a href="${DESIGN_FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" target="_blank" style="color:white; font-size:18px;">
                            <i class="fas fa-download"></i>
                        </a>
                        <button onclick="this.closest('#docModal').remove()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div id="pdfContainer" style="flex:1; display:flex; justify-content:center; align-items:center; overflow:auto; background:#525659; border-radius:8px;">
                    <canvas id="designPdfCanvas" style="max-width:100%; max-height:100%;"></canvas>
                </div>
            `;
            document.body.appendChild(modal);

            // Обработчик зума колёсиком
            const pdfContainer = document.getElementById('pdfContainer');
            pdfContainer.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY < 0) {
                    this.pdfChangeZoom(0.1);
                } else {
                    this.pdfChangeZoom(-0.1);
                }
            }, { passive: false });

            this.renderPDF(url);

        } else if (isExcel && window.XLSX) {
            modal.innerHTML = headerHTML + `
                <div id="designExcelContent" style="flex:1; overflow:auto; background:white; border-radius:8px; padding:10px;">
                    <div style="text-align:center; padding:40px; color:#666;">
                        <i class="fas fa-spinner fa-spin" style="font-size:32px;"></i>
                        <p style="margin-top:15px;">Загрузка Excel файла...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.renderExcel(url, fileId, fileName);

        } else if (isWord && window.mammoth) {
            modal.innerHTML = headerHTML + `
                <div id="designWordContent" style="flex:1; overflow:auto; background:white; border-radius:8px; padding:20px;">
                    <div style="text-align:center; padding:40px; color:#666;">
                        <i class="fas fa-spinner fa-spin" style="font-size:32px;"></i>
                        <p style="margin-top:15px;">Загрузка Word документа...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.renderWord(url, fileId, fileName);

        } else {
            modal.innerHTML = headerHTML + `
                <iframe src="${url}" style="flex:1; border:none; border-radius:8px; background:white;"></iframe>
            `;
            document.body.appendChild(modal);
        }
    },

    // Рендер PDF
    async renderPDF(url) {
        try {
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;

            this.pdfDoc = pdf;
            this.pdfCurrentPage = 1;
            this.pdfTotalPages = pdf.numPages;
            this.pdfZoom = 1;

            document.getElementById('designPdfPageInfo').textContent = `${this.pdfCurrentPage} / ${this.pdfTotalPages}`;
            document.getElementById('designPdfZoomInfo').textContent = '100%';

            document.getElementById('designPdfPrevPage').onclick = () => this.pdfChangePage(-1);
            document.getElementById('designPdfNextPage').onclick = () => this.pdfChangePage(1);
            document.getElementById('designPdfZoomIn').onclick = () => this.pdfChangeZoom(0.25);
            document.getElementById('designPdfZoomOut').onclick = () => this.pdfChangeZoom(-0.25);

            await this.renderPDFPage(1);
        } catch (error) {
            console.error('Ошибка загрузки PDF:', error);
            document.getElementById('designPdfPageInfo').textContent = 'Ошибка загрузки';
        }
    },

    async renderPDFPage(pageNum) {
        if (!this.pdfDoc) return;

        const page = await this.pdfDoc.getPage(pageNum);
        const canvas = document.getElementById('designPdfCanvas');
        const ctx = canvas.getContext('2d');

        const container = canvas.parentElement;
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;

        const viewport = page.getViewport({ scale: 1 });
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const baseScale = Math.min(scaleX, scaleY, 2);

        // Применяем пользовательский зум
        const finalScale = baseScale * this.pdfZoom;

        const scaledViewport = page.getViewport({ scale: finalScale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
            canvasContext: ctx,
            viewport: scaledViewport
        }).promise;
    },

    pdfChangePage(delta) {
        const newPage = this.pdfCurrentPage + delta;
        if (newPage >= 1 && newPage <= this.pdfTotalPages) {
            this.pdfCurrentPage = newPage;
            document.getElementById('designPdfPageInfo').textContent = `${this.pdfCurrentPage} / ${this.pdfTotalPages}`;
            this.renderPDFPage(newPage);
        }
    },

    pdfChangeZoom(delta) {
        const newZoom = this.pdfZoom + delta;
        if (newZoom >= 0.5 && newZoom <= 4) {
            this.pdfZoom = newZoom;
            document.getElementById('designPdfZoomInfo').textContent = `${Math.round(this.pdfZoom * 100)}%`;
            this.renderPDFPage(this.pdfCurrentPage);
        }
    },

    // Рендер Excel
    async renderExcel(url, fileId, fileName) {
        const container = document.getElementById('designExcelContent');
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Не удалось загрузить файл');

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const html = XLSX.utils.sheet_to_html(sheet, { id: 'designExcelTable' });

            this.currentWorkbook = workbook;

            let tabsHTML = '';
            if (workbook.SheetNames.length > 1) {
                tabsHTML = `
                    <div style="display:flex; gap:5px; margin-bottom:10px; flex-wrap:wrap;">
                        ${workbook.SheetNames.map((name, i) => `
                            <button class="design-excel-tab ${i === 0 ? 'active' : ''}" 
                                    onclick="design.switchExcelSheet(${i})"
                                    style="padding:5px 12px; border:1px solid #ddd; border-radius:4px; 
                                           background:${i === 0 ? '#3b82f6' : '#f3f4f6'}; 
                                           color:${i === 0 ? 'white' : '#333'}; cursor:pointer; font-size:12px;">
                                ${name}
                            </button>
                        `).join('')}
                    </div>
                `;
            }

            container.innerHTML = tabsHTML + `<div id="designExcelTableContainer" style="overflow:auto;">${html}</div>`;

            const table = container.querySelector('table');
            if (table) {
                table.style.cssText = 'border-collapse:collapse; width:100%; font-size:13px;';
                table.querySelectorAll('td, th').forEach(cell => {
                    cell.style.cssText = 'border:1px solid #e5e7eb; padding:6px 10px; text-align:left;';
                });
            }

            document.getElementById('designDocInfo').textContent = `${workbook.SheetNames.length} лист(ов)`;

        } catch (error) {
            console.error('Ошибка загрузки Excel:', error);
            container.innerHTML = `<div style="text-align:center; padding:40px; color:#666;">Ошибка загрузки файла</div>`;
        }
    },

    switchExcelSheet(index) {
        if (!this.currentWorkbook) return;

        const sheetName = this.currentWorkbook.SheetNames[index];
        const sheet = this.currentWorkbook.Sheets[sheetName];
        const html = XLSX.utils.sheet_to_html(sheet, { id: 'designExcelTable' });

        const tableContainer = document.getElementById('designExcelTableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = html;
            const table = tableContainer.querySelector('table');
            if (table) {
                table.style.cssText = 'border-collapse:collapse; width:100%; font-size:13px;';
                table.querySelectorAll('td, th').forEach(cell => {
                    cell.style.cssText = 'border:1px solid #e5e7eb; padding:6px 10px; text-align:left;';
                });
            }
        }

        document.querySelectorAll('.design-excel-tab').forEach((btn, i) => {
            btn.style.background = i === index ? '#3b82f6' : '#f3f4f6';
            btn.style.color = i === index ? 'white' : '#333';
        });
    },

    // Рендер Word
    async renderWord(url, fileId, fileName) {
        const container = document.getElementById('designWordContent');
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Не удалось загрузить файл');

            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });

            container.innerHTML = `<div style="max-width:800px; margin:0 auto; line-height:1.6;">${result.value}</div>`;

        } catch (error) {
            console.error('Ошибка загрузки Word:', error);
            container.innerHTML = `<div style="text-align:center; padding:40px; color:#666;">Ошибка загрузки. Формат .doc не поддерживается, только .docx</div>`;
        }
    },

    // === КОММЕНТАРИИ ===
    async loadComments() {
        const list = document.getElementById('designCommentsList');
        const countEl = document.getElementById('designCommentsCount');
        if (!this.currentPositionId || !list) return;

        try {
            const comments = await api.call('getComments', {
                parentId: this.currentPositionId,
                stage: 'design'
            });

            console.log('💬 Design comments loaded:', comments?.length || 0);

            if (!comments || comments.length === 0) {
                list.innerHTML = '<div class="comments-empty">Нет комментариев</div>';
                if (countEl) countEl.textContent = '0';
                return;
            }

            if (countEl) countEl.textContent = comments.length;
            list.innerHTML = comments.map(c => this.renderComment(c)).join('');
            list.scrollTop = list.scrollHeight;

        } catch (e) {
            console.error('Ошибка загрузки комментариев:', e);
            list.innerHTML = '<div class="comments-empty" style="color:#ef4444;">Ошибка загрузки</div>';
        }
    },

    renderComment(comment) {
        const authorName = comment.users?.name || comment.author_name || 'Пользователь';
        const date = utils.formatDate(comment.created_at);

        return `
            <div class="design-comment-item">
                <div class="design-comment-avatar">
                    ${authorName.charAt(0).toUpperCase()}
                </div>
                <div class="design-comment-content">
                    <div class="design-comment-header">
                        <span class="design-comment-author">${authorName}</span>
                        <span class="design-comment-date">${date}</span>
                    </div>
                    <div class="design-comment-text">${comment.text}</div>
                </div>
            </div>
        `;
    },

    async addComment() {
        const input = document.getElementById('designCommentInput');
        const text = input?.value.trim();

        if (!text || !this.currentPositionId) return;

        try {
            await api.call('addComment', {
                parentId: this.currentPositionId,
                stage: 'design',
                text: text
            });

            input.value = '';
            console.log('✅ Design comment added');
            await this.loadComments();

        } catch (e) {
            console.error('Ошибка добавления комментария:', e);
            alert('Ошибка: ' + e.message);
        }
    },

    // === ДЕЙСТВИЯ ===
    async approve() {
        if (!this.currentPositionId) return;

        try {
            await supabase.from('positions')
                .update({ design_approved: true })
                .eq('id', this.currentPositionId);

            alert('Дизайн согласован!');
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

    async toWork() {
        if (!this.currentPositionId) return;

        try {
            // Переводим на следующий этап
            await supabase.from('positions')
                .update({ stage: 'measure', kanban_status: 'inbox' })
                .eq('id', this.currentPositionId);

            alert('Отправлено на замер!');
            // Переключаемся на следующий таб
            app.switchPipelineTab('measure');
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    }
};

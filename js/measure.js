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

                // Определяем можно ли просмотреть файл
                const isPDF = f.file_name.match(/\.pdf$/i);
                const isExcel = f.file_name.match(/\.(xls|xlsx)$/i);
                const isWord = f.file_name.match(/\.(doc|docx)$/i);
                const canPreview = isImage || isPDF || isExcel || isWord;

                // Кнопка просмотра
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

    // Модальное окно для документов с использованием PDF.js, SheetJS, Mammoth
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

        // Определяем тип файла
        const isPDF = fileName.match(/\.pdf$/i);
        const isExcel = fileName.match(/\.(xls|xlsx)$/i);
        const isWord = fileName.match(/\.(doc|docx)$/i);

        // Базовая шапка модалки
        const headerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; color:white;">
                <span style="font-size:14px;">${fileName}</span>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span id="measureDocPageInfo" style="font-size:12px; color:#888;"></span>
                    <a href="${FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" target="_blank" style="color:white; font-size:18px;">
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
                            <button id="measurePdfPrevPage" style="background:#333; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">&lt;</button>
                            <span id="measurePdfPageInfo" style="font-size:12px;">Загрузка...</span>
                            <button id="measurePdfNextPage" style="background:#333; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">&gt;</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; background:#333; padding:4px 8px; border-radius:4px;">
                            <button id="measurePdfZoomOut" style="background:none; border:none; color:white; font-size:14px; cursor:pointer; padding:2px 6px;">−</button>
                            <span id="measurePdfZoomInfo" style="font-size:12px; min-width:40px; text-align:center;">100%</span>
                            <button id="measurePdfZoomIn" style="background:none; border:none; color:white; font-size:14px; cursor:pointer; padding:2px 6px;">+</button>
                        </div>
                        <a href="${FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" target="_blank" style="color:white; font-size:18px;">
                            <i class="fas fa-download"></i>
                        </a>
                        <button onclick="this.closest('#docModal').remove()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div id="measurePdfContainer" style="flex:1; display:flex; justify-content:center; align-items:center; overflow:auto; background:#525659; border-radius:8px;">
                    <canvas id="measurePdfCanvas" style="max-width:100%; max-height:100%;"></canvas>
                </div>
            `;
            document.body.appendChild(modal);

            // Зум колёсиком
            document.getElementById('measurePdfContainer').addEventListener('wheel', (e) => {
                e.preventDefault();
                this.pdfChangeZoom(e.deltaY < 0 ? 0.1 : -0.1);
            }, { passive: false });

            this.renderPDF(url);

        } else if (isExcel && window.XLSX) {
            // Excel: Используем SheetJS
            modal.innerHTML = headerHTML + `
                <div id="measureExcelContent" style="flex:1; overflow:auto; background:white; border-radius:8px; padding:10px;">
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
                <div id="measureWordContent" style="flex:1; overflow:auto; background:white; border-radius:8px; padding:20px;">
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
        const container = document.getElementById('measureExcelContent');
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Не удалось загрузить файл');

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const html = XLSX.utils.sheet_to_html(sheet, { id: 'measureExcelTable' });

            let tabsHTML = '';
            if (workbook.SheetNames.length > 1) {
                tabsHTML = `
                    <div style="display:flex; gap:5px; margin-bottom:10px; flex-wrap:wrap;">
                        ${workbook.SheetNames.map((name, i) => `
                            <button class="measure-excel-tab ${i === 0 ? 'active' : ''}" 
                                    onclick="measure.switchExcelSheet(${i})"
                                    style="padding:5px 12px; border:1px solid #ddd; border-radius:4px; 
                                           background:${i === 0 ? '#3b82f6' : '#f3f4f6'}; 
                                           color:${i === 0 ? 'white' : '#333'}; cursor:pointer; font-size:12px;">
                                ${name}
                            </button>
                        `).join('')}
                    </div>
                `;
            }

            this.currentWorkbook = workbook;

            container.innerHTML = tabsHTML + `
                <div id="measureExcelTableContainer" style="overflow:auto;">
                    ${html}
                </div>
            `;

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

            document.getElementById('measureDocPageInfo').textContent = `${workbook.SheetNames.length} лист(ов)`;

        } catch (error) {
            console.error('Ошибка загрузки Excel:', error);
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:#666;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#f59e0b; margin-bottom:15px;"></i>
                    <p style="margin-bottom:15px;">Не удалось открыть Excel файл</p>
                    <a href="${FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" 
                       target="_blank" style="display:inline-block; padding:10px 20px; background:#3b82f6; color:white; border-radius:8px; text-decoration:none;">
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
        const html = XLSX.utils.sheet_to_html(sheet, { id: 'measureExcelTable' });

        const tableContainer = document.getElementById('measureExcelTableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = html;

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

        document.querySelectorAll('.measure-excel-tab').forEach((btn, i) => {
            btn.style.background = i === index ? '#3b82f6' : '#f3f4f6';
            btn.style.color = i === index ? 'white' : '#333';
        });
    },

    // Рендер Word с помощью Mammoth.js
    async renderWord(url, fileId, fileName) {
        const container = document.getElementById('measureWordContent');
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Не удалось загрузить файл');

            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });

            container.innerHTML = `
                <div style="max-width:800px; margin:0 auto; line-height:1.6; font-family: 'Segoe UI', Arial, sans-serif;">
                    ${result.value}
                </div>
            `;

            container.querySelectorAll('table').forEach(table => {
                table.style.cssText = 'border-collapse:collapse; width:100%; margin:15px 0;';
                table.querySelectorAll('td, th').forEach(cell => {
                    cell.style.cssText = 'border:1px solid #e5e7eb; padding:8px;';
                });
            });

            container.querySelectorAll('img').forEach(img => {
                img.style.cssText = 'max-width:100%; height:auto; margin:10px 0;';
            });

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
                    <a href="${FILE_PROXY_URL}/download/${fileId}?name=${encodeURIComponent(fileName)}" 
                       target="_blank" style="display:inline-block; padding:10px 20px; background:#3b82f6; color:white; border-radius:8px; text-decoration:none;">
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
            document.getElementById('measurePdfPageInfo').textContent = `${this.pdfCurrentPage} / ${this.pdfTotalPages}`;
            document.getElementById('measurePdfZoomInfo').textContent = `${Math.round(this.pdfZoom * 100)}%`;

            // Настраиваем кнопки навигации и зума
            document.getElementById('measurePdfPrevPage').onclick = () => this.pdfChangePage(-1);
            document.getElementById('measurePdfNextPage').onclick = () => this.pdfChangePage(1);
            document.getElementById('measurePdfZoomIn').onclick = () => this.pdfChangeZoom(0.25);
            document.getElementById('measurePdfZoomOut').onclick = () => this.pdfChangeZoom(-0.25);

            // Рендерим первую страницу
            await this.renderPDFPage(1);
        } catch (error) {
            console.error('Ошибка загрузки PDF:', error);
            document.getElementById('measurePdfPageInfo').textContent = 'Ошибка загрузки';

            // Показываем сообщение об ошибке с кнопкой скачивания
            const canvas = document.getElementById('measurePdfCanvas');
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

        const page = await this.pdfDoc.getPage(pageNum);
        const canvas = document.getElementById('measurePdfCanvas');
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

        await page.render({
            canvasContext: ctx,
            viewport: scaledViewport
        }).promise;
    },

    // Переключение страниц PDF
    pdfChangePage(delta) {
        const newPage = this.pdfCurrentPage + delta;
        if (newPage >= 1 && newPage <= this.pdfTotalPages) {
            this.pdfCurrentPage = newPage;
            document.getElementById('measurePdfPageInfo').textContent = `${this.pdfCurrentPage} / ${this.pdfTotalPages}`;
            this.renderPDFPage(newPage);
        }
    },

    // Изменение зума PDF
    pdfChangeZoom(delta) {
        const newZoom = (this.pdfZoom || 1) + delta;
        if (newZoom >= 0.5 && newZoom <= 4) {
            this.pdfZoom = newZoom;
            const zoomInfo = document.getElementById('measurePdfZoomInfo');
            if (zoomInfo) zoomInfo.textContent = `${Math.round(this.pdfZoom * 100)}%`;
            this.renderPDFPage(this.pdfCurrentPage);
        }
    },

    // Модальное окно для просмотра изображений с зумом
    showImageModal(url, fileName) {
        let currentZoom = 1;
        const minZoom = 0.5;
        const maxZoom = 5;
        const zoomStep = 0.15;

        const modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.style.cssText = `
            position:fixed; top:0; left:0; right:0; bottom:0; 
            background:rgba(0,0,0,0.9); z-index:9999; 
            display:flex; align-items:center; justify-content:center;
            padding:20px; overflow:hidden;
        `;
        modal.innerHTML = `
            <div id="msImageContainer" style="position:relative; display:flex; flex-direction:column; align-items:center;">
                <img id="msZoomableImage" src="${url}" style="max-width:90vw; max-height:85vh; border-radius:8px; transition:transform 0.1s; cursor:zoom-in;" onclick="event.stopPropagation();">
                <div style="text-align:center; color:white; margin-top:10px; font-size:14px;">${fileName}</div>
                <div id="msZoomIndicator" style="position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:white; padding:8px 16px; border-radius:20px; font-size:14px;">100%</div>
            </div>
            <button onclick="this.parentElement.remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; color:white; font-size:32px; cursor:pointer;">
                <i class="fas fa-times"></i>
            </button>
            <div style="position:absolute; bottom:20px; right:20px; display:flex; gap:10px;">
                <button id="msZoomOutBtn" style="width:40px; height:40px; border-radius:50%; border:none; background:rgba(255,255,255,0.2); color:white; font-size:18px; cursor:pointer;">−</button>
                <button id="msZoomInBtn" style="width:40px; height:40px; border-radius:50%; border:none; background:rgba(255,255,255,0.2); color:white; font-size:18px; cursor:pointer;">+</button>
            </div>
        `;

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);

        const img = document.getElementById('msZoomableImage');
        const indicator = document.getElementById('msZoomIndicator');

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

        document.getElementById('msZoomInBtn').onclick = (e) => {
            e.stopPropagation();
            currentZoom = Math.min(maxZoom, currentZoom + zoomStep);
            updateZoom();
        };
        document.getElementById('msZoomOutBtn').onclick = (e) => {
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

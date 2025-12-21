// js/design.js
console.log("✅ design.js file is loading...");

// 🔥 URL нашего file-proxy сервера
const DESIGN_FILE_PROXY_URL = 'https://files.logiqa.kz';

window.design = {
    currentPositionId: null,
    files: [],
    images: [],

    // Инициализация вкладки Дизайн
    async init(positionId) {
        console.log('📐 design.init:', positionId);
        this.currentPositionId = positionId;
        await this.loadFiles();
        await this.loadComments();
    },

    // === ЗАГРУЗКА ФАЙЛОВ (из project_files со stage='design') ===
    async loadFiles() {
        const galleryMain = document.getElementById('galleryMain');
        const galleryThumbs = document.getElementById('galleryThumbs');
        const specContent = document.getElementById('specContent');

        if (!this.currentPositionId) {
            if (galleryMain) galleryMain.innerHTML = '<div class="gallery-placeholder"><i class="fas fa-image"></i><span>Нет изображений</span></div>';
            if (specContent) specContent.innerHTML = '<div class="files-empty">Файлы не загружены</div>';
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

            // Разделяем на изображения и прочие файлы
            this.images = this.files.filter(f =>
                f.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            );
            const otherFiles = this.files.filter(f =>
                !f.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            );

            // Рендерим галерею изображений
            this.renderGallery();

            // Рендерим список файлов (PDF, документы и т.д.)
            this.renderFilesList(otherFiles);

        } catch (e) {
            console.error('Ошибка загрузки файлов дизайна:', e);
            if (galleryMain) galleryMain.innerHTML = '<div class="gallery-placeholder"><i class="fas fa-exclamation-triangle"></i><span>Ошибка загрузки</span></div>';
        }
    },

    // === ГАЛЕРЕЯ ИЗОБРАЖЕНИЙ ===
    renderGallery() {
        const mainEl = document.getElementById('galleryMain');
        const thumbsEl = document.getElementById('galleryThumbs');

        if (!mainEl) return;

        if (this.images.length === 0) {
            mainEl.innerHTML = '<div class="gallery-placeholder"><i class="fas fa-image"></i><span>Нет изображений</span></div>';
            if (thumbsEl) thumbsEl.innerHTML = '';
            return;
        }

        // Показываем первое изображение как главное
        const mainImg = this.images[0];
        const mainUrl = mainImg.tg_file_id
            ? `${DESIGN_FILE_PROXY_URL}/file/${mainImg.tg_file_id}`
            : mainImg.file_url;

        mainEl.innerHTML = `<img src="${mainUrl}" alt="${mainImg.file_name}" onclick="design.openLightbox(0)">`;

        // Миниатюры
        if (thumbsEl && this.images.length > 1) {
            thumbsEl.innerHTML = this.images.map((img, idx) => {
                const url = img.tg_file_id
                    ? `${DESIGN_FILE_PROXY_URL}/file/${img.tg_file_id}`
                    : img.file_url;
                return `<img src="${url}" class="gallery-thumb ${idx === 0 ? 'active' : ''}" 
                              onclick="design.selectImage(${idx})">`;
            }).join('');
        } else if (thumbsEl) {
            thumbsEl.innerHTML = '';
        }
    },

    selectImage(index) {
        if (index < 0 || index >= this.images.length) return;

        const img = this.images[index];
        const mainEl = document.getElementById('galleryMain');
        const url = img.tg_file_id
            ? `${DESIGN_FILE_PROXY_URL}/file/${img.tg_file_id}`
            : img.file_url;

        mainEl.innerHTML = `<img src="${url}" alt="${img.file_name}" onclick="design.openLightbox(${index})">`;

        // Обновляем активную миниатюру
        document.querySelectorAll('.gallery-thumb').forEach((el, i) => {
            el.classList.toggle('active', i === index);
        });
    },

    // Лайтбокс для просмотра изображения
    openLightbox(index) {
        const img = this.images[index];
        if (!img) return;

        const url = img.tg_file_id
            ? `${DESIGN_FILE_PROXY_URL}/file/${img.tg_file_id}`
            : img.file_url;

        const modal = document.createElement('div');
        modal.id = 'designLightbox';
        modal.style.cssText = `
            position:fixed; top:0; left:0; right:0; bottom:0; 
            background:rgba(0,0,0,0.9); z-index:10000; 
            display:flex; align-items:center; justify-content:center;
            padding:20px;
        `;
        modal.innerHTML = `
            <div style="position:relative; max-width:100%; max-height:100%;">
                <img src="${url}" style="max-width:100%; max-height:90vh; border-radius:8px;" onclick="event.stopPropagation();">
                <div style="text-align:center; color:white; margin-top:10px; font-size:14px;">${img.file_name}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; color:white; font-size:32px; cursor:pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
    },

    // === СПИСОК ФАЙЛОВ (не изображения) ===
    renderFilesList(files) {
        const specContent = document.getElementById('specContent');
        if (!specContent) return;

        if (!files || files.length === 0) {
            // Показываем информацию о количестве изображений
            if (this.images.length > 0) {
                specContent.innerHTML = `<div class="files-info">
                    <i class="fas fa-images"></i> ${this.images.length} изображений загружено
                </div>`;
            } else {
                specContent.innerHTML = '<div class="files-empty"><i class="fas fa-folder-open"></i> Файлы не загружены<br><small>Загрузите через канбан-доску "Дизайн"</small></div>';
            }
            return;
        }

        specContent.innerHTML = files.map(f => {
            let icon = 'fa-file';
            if (f.file_name?.endsWith('.pdf')) icon = 'fa-file-pdf';
            if (f.file_name?.match(/\.(xls|xlsx)$/i)) icon = 'fa-file-excel';
            if (f.file_name?.match(/\.(doc|docx)$/i)) icon = 'fa-file-word';

            const downloadUrl = f.tg_file_id
                ? `${DESIGN_FILE_PROXY_URL}/download/${f.tg_file_id}?name=${encodeURIComponent(f.file_name)}`
                : f.file_url;

            return `
                <div class="spec-file-item">
                    <i class="fas ${icon}"></i>
                    <span class="spec-file-name">${f.file_name}</span>
                    <a href="${downloadUrl}" target="_blank" class="spec-file-download">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
            `;
        }).join('');
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

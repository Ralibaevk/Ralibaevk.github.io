// js/design.js
console.log("✅ design.js file is loading...");

window.design = {
    currentPositionId: null,
    images: [],
    specification: [],

    // Инициализация вкладки Дизайн
    async init(positionId) {
        this.currentPositionId = positionId;
        await this.loadImages();
        await this.loadSpecification();
    },

    // === ГАЛЕРЕЯ ИЗОБРАЖЕНИЙ ===
    async loadImages() {
        const mainEl = document.getElementById('galleryMain');
        const thumbsEl = document.getElementById('galleryThumbs');

        if (!this.currentPositionId) {
            if (mainEl) mainEl.innerHTML = '<div class="gallery-placeholder"><i class="fas fa-image"></i><span>Нет изображений</span></div>';
            return;
        }

        try {
            const { data, error } = await supabase
                .from('design_images')
                .select('*')
                .eq('position_id', this.currentPositionId)
                .order('created_at');

            if (error) throw error;
            this.images = data || [];
            this.renderGallery();
        } catch (e) {
            console.error('Ошибка загрузки изображений:', e);
        }
    },

    renderGallery() {
        const mainEl = document.getElementById('galleryMain');
        const thumbsEl = document.getElementById('galleryThumbs');

        if (this.images.length === 0) {
            mainEl.innerHTML = '<div class="gallery-placeholder"><i class="fas fa-image"></i><span>Нет изображений</span></div>';
            thumbsEl.innerHTML = '';
            return;
        }

        // Показываем главное изображение (первое с is_main или просто первое)
        const mainImg = this.images.find(i => i.is_main) || this.images[0];
        mainEl.innerHTML = `<img src="${mainImg.url}" alt="Эскиз">`;

        // Миниатюры
        thumbsEl.innerHTML = this.images.map((img, idx) =>
            `<img src="${img.url}" class="gallery-thumb ${img.id === mainImg.id ? 'active' : ''}" 
                  onclick="design.selectImage('${img.id}')">`
        ).join('');
    },

    selectImage(imageId) {
        const img = this.images.find(i => i.id === imageId);
        if (!img) return;

        const mainEl = document.getElementById('galleryMain');
        mainEl.innerHTML = `<img src="${img.url}" alt="Эскиз">`;

        // Обновляем активную миниатюру
        document.querySelectorAll('.gallery-thumb').forEach(el => el.classList.remove('active'));
        event.target.classList.add('active');
    },

    async uploadImages() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = async (e) => {
            const files = e.target.files;
            if (!files.length) return;

            try {
                for (const file of files) {
                    // Загружаем в Storage
                    const fileName = `design/${this.currentPositionId}/${Date.now()}_${file.name}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('uploads')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    // Получаем публичный URL
                    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(fileName);

                    // Сохраняем в БД
                    await supabase.from('design_images').insert({
                        position_id: this.currentPositionId,
                        url: urlData.publicUrl,
                        is_main: this.images.length === 0
                    });
                }

                await this.loadImages();
                alert('Изображения загружены!');
            } catch (e) {
                alert('Ошибка загрузки: ' + e.message);
            }
        };
        input.click();
    },

    // === СПЕЦИФИКАЦИЯ ===
    async loadSpecification() {
        const contentEl = document.getElementById('specContent');

        if (!this.currentPositionId) {
            if (contentEl) contentEl.innerHTML = '<span class="spec-empty">Спецификация пуста</span>';
            return;
        }

        try {
            const { data, error } = await supabase
                .from('specifications')
                .select('*')
                .eq('position_id', this.currentPositionId)
                .order('row_num');

            if (error) throw error;
            this.specification = data || [];
            this.renderSpecification();
        } catch (e) {
            console.error('Ошибка загрузки спецификации:', e);
        }
    },

    renderSpecification() {
        const contentEl = document.getElementById('specContent');

        if (this.specification.length === 0) {
            contentEl.innerHTML = '<span class="spec-empty">Спецификация пуста</span>';
            return;
        }

        // Группируем по секциям (можно по material)
        let html = '';
        this.specification.forEach(item => {
            html += `<div class="spec-line">
                <strong>${item.name}</strong>
                ${item.material ? ` — ${item.material}` : ''}
                ${item.color ? ` (${item.color})` : ''}
                ${item.note1 ? `<br><small>${item.note1}</small>` : ''}
            </div>`;
        });

        contentEl.innerHTML = html;
    },

    openSpecModal() {
        // TODO: Модалка создания/редактирования спецификации
        alert('Модалка спецификации — в разработке');
    },

    // === ПРАВКИ ИЗ ЧАТА ===
    openEditsModal() {
        // TODO: Парсинг Telegram — болванка
        alert('Правки из чата — в разработке (парсинг Telegram)');
    },

    // === ДЕЙСТВИЯ ===
    async approve() {
        if (!this.currentPositionId) return;

        try {
            await supabase.from('positions')
                .update({ status: 'approved' })
                .eq('id', this.currentPositionId);

            alert('Дизайн согласован!');
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    },

    async toWork() {
        if (!this.currentPositionId) return;

        try {
            await supabase.from('positions')
                .update({ status: 'in_production' })
                .eq('id', this.currentPositionId);

            alert('Отправлено в работу!');
            // Переключаемся на следующий таб
            app.switchPipelineTab('measure');
        } catch (e) {
            alert('Ошибка: ' + e.message);
        }
    }
};

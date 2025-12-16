// js/buyer.js
console.log("✅ buyer.js file is loading...");

window.buyer = {
    data: [],
    localData: [],
    currentTab: 'todo',
    currentCategory: 'ALL',
    currentSupplier: 'ALL',
    currentSheet: '',
    saveTimeout: null,

    async open(positionId, titleName) {
        this.currentPositionId = positionId;
        this.currentSheet = titleName || 'Смета'; // Используем как заголовок

        // Используем единый метод навигации
        app.showScreen('view-buyer');
        document.getElementById('buyTitle').innerText = this.currentSheet;

        const statusEl = document.getElementById('buySaveStatus');
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Загружено';

        document.getElementById('buyList').innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Загрузка...</div>';

        this.currentCategory = 'ALL';
        this.currentSupplier = 'ALL';
        this.setTab('todo');

        try {
            // NEW API CALL
            const response = await api.call('getSupplyByPosition', { positionId: positionId });
            this.currentListId = response.listId; // Store list ID for saving

            const items = response.items || [];
            this.data = JSON.parse(JSON.stringify(items));
            this.localData = JSON.parse(JSON.stringify(items));

            // Add rowIndex for internal logic if not present
            this.localData.forEach((item, index) => item.rowIndex = index);

            this.renderCategories();
            this.renderSuppliers();
            this.render();
        } catch (e) {
            alert("Ошибка загрузки: " + e.message);
            // Go back to position, not home
            app.openPosition(this.currentPositionId, this.currentSheet);
        }
    },

    setTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.buy-tab').forEach(el => el.classList.remove('active'));
        const btn = document.getElementById(`tab-${tab}`);
        if (btn) btn.classList.add('active');
        this.render();
    },

    renderCategories() {
        const container = document.getElementById('buyCategoryFilters');
        const uniqueCats = [...new Set(this.localData.map(i => i.category || 'Без категории'))].sort();
        let html = `<div class="cat-chip ${this.currentCategory === 'ALL' ? 'active' : ''}" onclick="buyer.setCategory('ALL')">Все категории</div>`;
        uniqueCats.forEach(cat => {
            const active = this.currentCategory === cat ? 'active' : '';
            html += `<div class="cat-chip ${active}" onclick="buyer.setCategory('${cat}')">${cat}</div>`;
        });
        container.innerHTML = html;
    },

    setCategory(cat) {
        this.currentCategory = cat;
        this.currentSupplier = 'ALL';
        this.renderCategories();
        this.renderSuppliers();
        this.render();
    },

    renderSuppliers() {
        const container = document.getElementById('buyFilters');
        const relevantItems = this.currentCategory === 'ALL' ? this.localData : this.localData.filter(i => (i.category || 'Без категории') === this.currentCategory);
        const uniqueSuppliers = [...new Set(relevantItems.map(i => i.supplier).filter(s => s && s.trim() !== ""))].sort();
        let html = `<div class="filter-chip ${this.currentSupplier === 'ALL' ? 'active' : ''}" onclick="buyer.setSupplier('ALL')">Все</div>`;
        if (relevantItems.some(i => !i.supplier)) {
            html += `<div class="filter-chip ${this.currentSupplier === 'NONE' ? 'active' : ''}" onclick="buyer.setSupplier('NONE')">Не назначено</div>`;
        }
        uniqueSuppliers.forEach(sup => {
            const active = this.currentSupplier === sup ? 'active' : '';
            html += `<div class="filter-chip ${active}" onclick="buyer.setSupplier('${sup}')">${sup}</div>`;
        });
        container.innerHTML = html;
    },

    setSupplier(sup) {
        this.currentSupplier = sup;
        this.renderSuppliers();
        this.render();
    },

    render() {
        const container = document.getElementById('buyList');
        container.innerHTML = '';
        let visibleCount = 0;

        this.localData.forEach(item => {
            if (this.currentTab === 'todo' && item.done) return;
            if (this.currentTab === 'done' && !item.done) return;
            const itemCat = item.category || 'Без категории';
            if (this.currentCategory !== 'ALL' && itemCat !== this.currentCategory) return;
            if (this.currentSupplier === 'NONE') { if (item.supplier) return; }
            else if (this.currentSupplier !== 'ALL') { if (item.supplier !== this.currentSupplier) return; }

            visibleCount++;
            const div = document.createElement('div');
            div.className = `b-card ${item.done ? 'done' : ''}`;
            div.innerHTML = `
        <div class="b-top">
          <div class="b-name">${item.name}</div>
          <button class="b-check-btn ${item.done ? 'active' : ''}" onclick="buyer.toggle(${item.rowIndex})">
             <i class="fas fa-${item.done ? 'check' : 'circle'}" style="${!item.done ? 'color:#eee;' : ''}"></i>
          </button>
        </div>
        <div class="b-mid">
          <span class="b-badge">${item.qty} ${item.unit}</span>
          ${item.supplier ? `<span class="b-sup-tag"><i class="fas fa-truck"></i> ${item.supplier}</span>` : ''}
          ${this.currentCategory === 'ALL' ? `<span style="font-size:10px; color:#aaa; border:1px solid #eee; padding:2px 6px; border-radius:4px;">${itemCat}</span>` : ''}
        </div>
        ${item.note ? `<div style="font-size:12px; color:#888; margin-top:5px;">${item.note}</div>` : ''}
        <div class="b-bot">
          <input type="number" class="b-price-input" value="${item.price > 0 ? item.price : ''}" placeholder="Цена" onchange="buyer.updatePrice(${item.rowIndex}, this.value)">
          <span style="font-weight:bold; color:#555;">₸</span>
        </div>
      `;
            container.appendChild(div);
        });

        if (visibleCount === 0) container.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">Ничего не найдено</div>`;
    },

    toggle(rowIndex) {
        const item = this.localData.find(i => i.rowIndex === rowIndex);
        if (item) {
            item.done = !item.done;
            this.render();
            this.triggerAutoSave();
        }
    },

    updatePrice(rowIndex, value) {
        const item = this.localData.find(i => i.rowIndex === rowIndex);
        if (item) {
            item.price = parseFloat(value) || 0;
            this.triggerAutoSave();
        }
    },

    triggerAutoSave() {
        const statusEl = document.getElementById('buySaveStatus');
        if (statusEl) { statusEl.innerHTML = '<i class="fas fa-sync fa-spin"></i> Сохранение...'; statusEl.style.color = '#f59e0b'; }
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => { this.saveBatch(); }, 1000);
    },

    async saveBatch() {
        try {
            // Map localData back to array format expected by saveSupplyList
            // [id, art, name, qty, unit, price, sum, supplier, note, done, category]
            // Note: rowIndex is internal, don't save it

            const arrayData = this.localData.map(i => [
                i.id || "",
                i.art || "",
                i.name,
                i.qty,
                i.unit,
                i.price,
                (i.qty * i.price),
                i.supplier || "",
                i.note || "",
                i.done,
                i.category || "Фурнитура"
            ]);

            if (!this.currentPositionId) return;

            await api.call('saveSupplyList', {
                positionId: this.currentPositionId,
                listId: this.currentListId,
                data: arrayData
            }, 'POST', false);

            const statusEl = document.getElementById('buySaveStatus');
            if (statusEl) { statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Сохранено'; statusEl.style.color = '#10b981'; }

            // Sync main data
            this.data = JSON.parse(JSON.stringify(this.localData));
        } catch (e) { console.error(e); }
    },

    checkClose() {
        // Return to Position Detail
        app.openPosition(this.currentPositionId, this.currentSheet);
    }
};

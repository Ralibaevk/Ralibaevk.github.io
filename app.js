// === ВСТАВЬТЕ ССЫЛКУ ИЗ CODE.GS (ВАЖНО!) ===
const API_URL = "https://script.google.com/macros/s/AKfycbxsI8q7uTPqlCUy9BkjGzWL81DcntZdNVv8-FIzfZWLH0SFTtw0e51gwmiH6wEt9n9g/exec";
// === API ===
const api = {
  // Добавили аргумент useLoader = true
  async call(action, params = {}, method = 'GET', useLoader = true) {
    // Показываем лоадер только если useLoader === true
    if (useLoader) document.getElementById('loader').classList.remove('hidden');

    let url = `${API_URL}?action=${action}`;
    let opts = { method };

    if (method === 'POST') {
      opts.body = JSON.stringify(params);
      opts.headers = { "Content-Type": "text/plain;charset=utf-8" };
    } else {
      for (let k in params) url += `&${k}=${encodeURIComponent(params[k])}`;
    }

    try {
      const res = await fetch(url, opts);
      const json = await res.json();

      // Скрываем лоадер только если мы его показывали
      if (useLoader) document.getElementById('loader').classList.add('hidden');

      if (json.error) throw new Error(json.error);
      return json;
    } catch (e) {
      if (useLoader) document.getElementById('loader').classList.add('hidden');
      if (!e.message.includes("storage")) alert("Ошибка связи: " + e.message);
      console.error(e);
      throw e;
    }
  }
};

// === ГЛАВНОЕ ПРИЛОЖЕНИЕ ===
const app = {
  suppliers: [],
  user: null,

  async init() {
    // 1. ТЕЛЕГРАМ (ОТПРАВЛЯЕМ ТИХО, БЕЗ ЛОАДЕРА)
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      document.documentElement.style.setProperty(
        '--tg-safe-area-inset-top',
        (window.Telegram.WebApp.contentSafeAreaInset?.top || 20) + 'px'
      );

      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user) {
        this.user = user;
        // Четвертый параметр 'false' означает "НЕ ПОКАЗЫВАТЬ ЛОАДЕР"
        api.call('saveTelegramUser', { user: user }, 'POST', false).catch(console.error);
      }
    }

    // 2. ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА ДАННЫХ (УСКОРЕНИЕ)
    // Запускаем оба запроса одновременно
    try {
      // Показываем лоадер один раз вручную перед началом
      document.getElementById('loader').classList.remove('hidden');

      const [suppliersData, _] = await Promise.all([
        // Запрос поставщиков (тихий, так как лоадер уже горит)
        api.call('getSuppliers', {}, 'GET', false),
        // Запрос проектов (внутри refreshDashboard тоже надо будет поправить, см. ниже, 
        // но пока оставим как есть, просто вызовем refreshDashboard)
        this.refreshDashboard(false) // Передаем false (см. Шаг 3)
      ]);

      this.suppliers = suppliersData;

    } catch (e) {
      console.error(e);
    } finally {
      // Скрываем лоадер, когда ВСЁ загрузилось
      document.getElementById('loader').classList.add('hidden');
    }

    // ПРИВЯЗКА ЗАГРУЗКИ ФАЙЛА
    const input = document.getElementById('xlsInput');
    if (input) {
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
      newInput.addEventListener('change', (e) => manager.handleFile(e));
    }
  },

  async refreshDashboard(useLoader = true) {
    try {
      // ИСПРАВЛЕНИЕ: Получаем userId безопасно
      let userId = '';

      if (this.user && this.user.id) {
        userId = String(this.user.id); // Приводим к строке
        console.log('🔍 Загружаем проекты для пользователя:', userId);
      } else {
        console.warn('⚠️ Пользователь не авторизован в Telegram');
        // Можно показать сообщение пользователю
        const el = document.getElementById('list-new');
        if (el) {
          el.innerHTML = '<div style="color:#999; text-align:center; padding:20px;">Откройте приложение через Telegram для просмотра проектов</div>';
        }
        return; // Выходим, не загружаем проекты
      }

      // Передаем userId в API
      const data = await api.call('getProjectsSummary', { userId: userId }, 'GET', useLoader);

      console.log('📦 Получено проектов:', data.length);

      // Очищаем все колонки
      ['new', 'active', 'done'].forEach(id => {
        const el = document.getElementById('list-' + id);
        if (el) el.innerHTML = '';
      });

      // Если проектов нет
      if (data.length === 0) {
        const el = document.getElementById('list-new');
        if (el) el.innerHTML = '<div style="color:#999; text-align:center;">Нет проектов</div>';
        return;
      }

      // Рендерим проекты
      data.forEach(p => {
        const status = p.status || 'new';
        const container = document.getElementById(`list-${status}`);
        if (!container) return;

        const notBought = p.total - p.done;
        let badgeHtml = notBought > 0 ? `<span class="ind-bad"><i class="fas fa-circle"></i> ${notBought}</span>` :
          (p.total > 0 ? `<span class="ind-good"><i class="fas fa-check-circle"></i> Готово</span>` : `<span style="color:#999;">Пусто</span>`);

        let archiveBtn = status === 'done' ? `<button class="p-btn p-btn-arc" onclick="app.archiveProject('${p.name}')" style="background:#607d8b; color:white; margin-top:5px; width:100%;">📦 В Архив</button>` : '';

        const card = document.createElement('div');
        card.className = 'p-card';
        card.draggable = true;
        card.ondragstart = (e) => app.drag(e, p.name);

        const sumFormatted = (p.sum || 0).toLocaleString() + ' ₸';

        card.innerHTML = `
        <div class="pc-top">
          <span class="pc-name">${p.name}</span>
          <div class="pc-right-col">
             <span class="pc-sum">${sumFormatted}</span>
             <button onclick="app.deleteProject('${p.name}')" class="btn-del-mini">×</button>
          </div>
        </div>
        <div class="pc-ind">${badgeHtml}</div>
        
        <div class="pc-actions">
          <button class="btn btn-def" onclick="manager.open('${p.name}')">✏️</button>
          <button class="btn btn-def" onclick="buyer.open('${p.name}')">🛒</button>
        </div>
        ${archiveBtn}

        <select class="mob-status-btn" onchange="app.moveProject('${p.name}', this.value)">
          <option value="new" ${status == 'new' ? 'selected' : ''}>Формируется</option>
          <option value="active" ${status == 'active' ? 'selected' : ''}>В закуп</option>
          <option value="done" ${status == 'done' ? 'selected' : ''}>Завершен</option>
        </select>
      `;
        container.appendChild(card);
      });
    } catch (e) {
      console.error('❌ Ошибка загрузки проектов:', e);
      alert('Ошибка загрузки проектов: ' + e.message);
    }
  },

  async archiveProject(name) {
    if (!confirm(`В архив "${name}"?`)) return;
    await api.call('archiveProject', { sheetName: name }, 'POST');
    this.refreshDashboard();
  },
  async openArchive() {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-archive').classList.remove('hidden');
    const list = await api.call('getArchivedList');
    const grid = document.getElementById('archiveList');
    grid.innerHTML = list.length ? '' : '<div style="text-align:center; color:#999;">Архив пуст</div>';
    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'p-card';
      card.style.borderLeftColor = '#607d8b';
      card.innerHTML = `
        <div class="pc-top"><span class="pc-name">${item.name}</span><span style="font-size:12px; color:#888;">${item.date}</span></div>
        <button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="app.unarchiveProject('${item.id}')">♻️ Восстановить</button>
      `;
      grid.appendChild(card);
    });
  },
  async unarchiveProject(id) {
    if (!confirm("Восстановить?")) return;
    await api.call('unarchiveProject', { id: id }, 'POST');
    this.goHome();
  },

  drag(ev, name) { ev.dataTransfer.setData("text", name); },
  allowDrop(ev) { ev.preventDefault(); },
  async drop(ev, newStatus) {
    ev.preventDefault();
    const name = ev.dataTransfer.getData("text");
    await this.moveProject(name, newStatus);
  },
  async moveProject(name, status) {
    await api.call('updateStatus', { sheetName: name, status: status }, 'POST');
    this.refreshDashboard();
  },

  openSuppliersEdit() {
    const tbody = document.getElementById('supEditBody');
    tbody.innerHTML = '';
    this.suppliers.forEach((s) => app.addSupplierRow(s.name, s.phone));
    const m = document.getElementById('supEditModal');
    m.classList.remove('hidden'); m.style.display = 'flex';
  },
  addSupplierRow(name = '', phone = '') {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="sup-name-inp" value="${name}" placeholder="Имя" style="width:100%; padding:5px;"></td>
      <td><input class="sup-phone-inp" value="${phone}" placeholder="Тел" style="width:100%; padding:5px;"></td>
      <td><button onclick="this.closest('tr').remove()" style="color:red; border:none; background:none;">×</button></td>
    `;
    document.getElementById('supEditBody').appendChild(tr);
  },
  async saveSuppliers() {
    const rows = document.querySelectorAll('#supEditBody tr');
    const newList = [];
    rows.forEach(tr => {
      const name = tr.querySelector('.sup-name-inp').value.trim();
      const phone = tr.querySelector('.sup-phone-inp').value.trim();
      if (name) newList.push({ name, phone });
    });
    await api.call('saveSuppliers', { list: newList }, 'POST');
    this.suppliers = newList;
    document.getElementById('supEditModal').style.display = 'none';
    alert('Сохранено');
  },

  newProject() { manager.open(''); },
  async deleteProject(name) {
    if (confirm(`Удалить "${name}"?`)) { await api.call('deleteProject', { sheetName: name }, 'POST'); this.refreshDashboard(); }
  },
  goHome() {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-dashboard').classList.remove('hidden');
    this.refreshDashboard();
  }
};

// === MANAGER LOGIC ===
const manager = {
  data: [],
  // 1. СПИСОК КАТЕГОРИЙ
  categories: [
    "Фурнитура",
    "Листовые материалы",
    "Фасады",
    "Услуги",
    "Прочий закуп",
    "Рекламации"
  ],
  // 2. ТЕКУЩАЯ КАТЕГОРИЯ
  currentCategory: "Фурнитура",

  async open(name) {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-manager').classList.remove('hidden');
    document.getElementById('mgrName').value = '';

    // Сброс на первую категорию при открытии
    this.currentCategory = this.categories[0];
    this.renderTabs(); // Рисуем кнопки табов

    if (name) {
      document.getElementById('mgrName').value = name;
      try {
        const sData = await api.call('getProjectData', { sheetName: name });
        this.data = sData.map(i => ({
          ...i,
          checked: false,
          note: i.note || "",
          // Если категории нет (старый проект), ставим первую
          category: i.category || this.categories[0]
        }));
      } catch (e) { this.data = []; }
    } else {
      document.getElementById('mgrName').value = `Заказ ${new Date().toLocaleDateString()}`;
      this.data = [];
    }
    this.render();
  },

  // 3. РЕНДЕРИНГ ТАБОВ
  renderTabs() {
    const container = document.getElementById('mgrCategoryTabs');
    container.innerHTML = this.categories.map(cat => {
      const activeClass = (cat === this.currentCategory) ? 'active' : '';
      // Используем onclick="manager.setCategory(...)"
      return `<button class="cat-tab-btn ${activeClass}" onclick="manager.setCategory('${cat}')">${cat}</button>`;
    }).join('');
  },

  setCategory(cat) {
    this.currentCategory = cat;
    this.renderTabs(); // Обновляем активную кнопку
    this.render();     // Перерисовываем таблицу
  },

  render() {
    const tbody = document.getElementById('mgrBody');
    tbody.innerHTML = '';
    const filter = document.getElementById('mgrSearch').value.toLowerCase();
    let total = 0;

    // Опции для выпадающего списка поставщиков
    const supOpts = `<option value="">-</option>` + app.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    // Опции для выпадающего списка категорий (для переноса)
    const catOpts = this.categories.map(c => `<option value="${c}">${c}</option>`).join('');

    this.data.forEach((item, i) => {
      // 4. ФИЛЬТР: Показываем только если категория совпадает с текущим табом
      if (item.category !== this.currentCategory) return;

      const searchStr = (item.name + ' ' + item.art + ' ' + item.supplier).toLowerCase();
      if (filter && !searchStr.includes(filter)) return;

      item.sum = item.qty * item.price;
      total += item.sum;

      const tr = document.createElement('tr');
      if (item.supplier) tr.classList.add('has-supplier');
      if (item.checked) tr.style.background = '#fff9c4';

      tr.innerHTML = `
        <td class="chk"><input type="checkbox" ${item.checked ? 'checked' : ''} onchange="manager.check(${i},this.checked)"></td>
        
        <!-- ДРОПДАУН КАТЕГОРИИ (ПРИ СМЕНЕ ТОВАР УЛЕТИТ В ДРУГОЙ ТАБ) -->
        <td>
           <select class="cat-select-table" onchange="manager.changeCategory(${i}, this.value)">
             ${catOpts.replace(`"${item.category}"`, `"${item.category}" selected`)}
           </select>
        </td>

        <td><input value="${item.art || ''}" onchange="manager.upd(${i},'art',this.value)"></td>
        <td><input value="${item.name}" onchange="manager.upd(${i},'name',this.value)"></td>
        <td><input type="number" value="${item.qty}" onchange="manager.upd(${i},'qty',this.value)"></td>
        <td><input value="${item.unit}" onchange="manager.upd(${i},'unit',this.value)"></td>
        <td><input type="number" value="${item.price}" onchange="manager.upd(${i},'price',this.value)"></td>
        <td>${item.sum.toLocaleString()}</td>
        <td><select onchange="manager.upd(${i},'supplier',this.value)">${supOpts.replace(`"${item.supplier}"`, `"${item.supplier}" selected`)}</select></td>
        <td><input value="${item.note || ''}" placeholder="..." onchange="manager.upd(${i},'note',this.value)"></td>
      `;
      tbody.appendChild(tr);
    });

    // Показываем итог только по текущей категории или общий? 
    // Обычно удобнее видеть итог страницы.
    document.getElementById('mgrTotal').innerText = total.toLocaleString() + ' ₸';
  },

  // Смена категории через дропдаун
  changeCategory(index, newCat) {
    this.data[index].category = newCat;
    // Товар должен исчезнуть из текущего списка
    this.render();
  },

  upd(i, f, v) { if (f === 'qty' || f === 'price') v = parseFloat(v) || 0; this.data[i][f] = v; if (f === 'qty' || f === 'price') this.render(); },
  check(i, v) { this.data[i].checked = v; this.render(); },
  toggleAll(v) {
    // Чекбокс "Все" теперь выделяет только видимые в текущей категории
    const f = document.getElementById('mgrSearch').value.toLowerCase();
    this.data.forEach(i => {
      if (i.category === this.currentCategory && (!f || i.name.toLowerCase().includes(f))) {
        i.checked = v;
      }
    });
    this.render();
  },

  sort() { this.data.sort((a, b) => (a.supplier && !b.supplier) ? -1 : (b.supplier && !a.supplier) ? 1 : a.name.localeCompare(b.name)); this.render(); },

  delSel() {
    if (confirm('Удалить выбранные?')) {
      this.data = this.data.filter(i => !i.checked);
      document.getElementById('mgrAll').checked = false;
      this.render();
    }
  },

  addRow() {
    // Новая строка создается СРАЗУ в текущей категории
    this.data.unshift({
      id: "",
      art: "",
      name: "Новая",
      qty: 1,
      unit: "шт",
      price: 0,
      supplier: "",
      note: "",
      done: false,
      category: this.currentCategory
    });
    this.render();
  },

  // ... (методы openMerge, applyMerge, openSup, applySup - остаются без изменений, 
  // но они будут работать с this.data, где уже есть поле category, так что все ок)
  openMerge() {
    const sel = this.data.filter(i => i.checked);
    if (sel.length < 2) return alert('Выберите 2+');
    const list = document.getElementById('mergeList');
    list.innerHTML = sel.map((i, idx) => `<div style="padding:10px; border-bottom:1px solid #eee;"><label><input type="radio" name="mname" value="${idx}" ${idx === 0 ? 'checked' : ''}> <b>${i.name}</b> (${i.qty})</label></div>`).join('');
    const m = document.getElementById('mergeModal'); m.classList.remove('hidden'); m.style.display = 'flex';
  },
  applyMerge() {
    const radios = document.getElementsByName('mname');
    let selIdx = -1; for (let r of radios) if (r.checked) selIdx = parseInt(r.value);
    if (selIdx === -1) return;
    const selItems = this.data.filter(i => i.checked);
    const main = selItems[selIdx];
    main.qty = selItems.reduce((acc, c) => acc + c.qty, 0);
    main.checked = false;
    this.data = this.data.filter(i => !i.checked || i === main);
    document.getElementById('mgrAll').checked = false;
    document.getElementById('mergeModal').style.display = 'none';
    this.render();
  },
  openSup() {
    const sel = this.data.filter(i => i.checked);
    if (!sel.length) return alert('Выберите строки');
    document.getElementById('supSelect').innerHTML = `<option value="">-- Сброс --</option>` + app.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`);
    const m = document.getElementById('supModal'); m.classList.remove('hidden'); m.style.display = 'flex';
  },
  applySup() {
    const v = document.getElementById('supSelect').value;
    this.data.forEach(i => { if (i.checked) { i.supplier = v; i.checked = false; } });
    document.getElementById('supModal').style.display = 'none';
    document.getElementById('mgrAll').checked = false;
    this.render();
  },

  async save() {
    const name = document.getElementById('mgrName').value;
    if (!name) return alert('Введите имя!');

    // ВАЖНО: При сохранении передаем 11 элементов массива (добавили i.category)
    const arr = this.data.map(i => [
      i.id || "",
      i.art,
      i.name,
      i.qty,
      i.unit,
      i.price,
      i.qty * i.price,
      i.supplier,
      i.note || "",
      i.done || false,
      i.category || "Фурнитура" // 11-й элемент
    ]);

    if (!app.user || !app.user.id) {
      return alert("Ошибка: Не удалось определить пользователя Telegram.");
    }

    await api.call('saveProject', {
      sheetName: name,
      data: arr,
      status: 'active',
      userId: app.user.id
    }, 'POST');

    alert('Сохранено!');
    app.goHome();
  },

  handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (typeof XLSX === 'undefined') return alert("Библиотека Excel не готова");
    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        mapper.raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        if (mapper.raw.length) mapper.show(); else alert("Файл пустой");
      } catch (err) { alert(err); } finally { e.target.value = ''; }
    };
    reader.readAsArrayBuffer(f);
  }
};

const mapper = {
  raw: [],

  show() {
    const tbl = document.getElementById('mapTable');
    tbl.innerHTML = '';

    // Если файл пустой или с ошибкой
    if (!this.raw || !this.raw.length) return;

    const maxCols = this.raw.reduce((a, b) => Math.max(a, b.length), 0);
    let html = '<tr>';
    for (let i = 0; i < maxCols; i++) {
      html += `<th><select class="map-sel" data-col="${i}">
        <option value="">Пропуск</option><option value="art">Артикул</option><option value="name">Название</option>
        <option value="qty">Кол-во</option><option value="unit">Ед.</option><option value="price">Цена</option>
        <option value="supplier">Поставщик</option><option value="note">Примечание</option>
      </select></th>`;
    }
    html += '</tr>';

    // Показываем первые 20 строк для предпросмотра
    this.raw.slice(0, 20).forEach(r => {
      html += '<tr>' + Array.from({ length: maxCols }).map((_, i) => `<td style="padding:5px; border:1px solid #eee;">${r[i] || ""}</td>`).join('') + '</tr>';
    });
    tbl.innerHTML = html;

    const m = document.getElementById('modal');
    m.classList.remove('hidden');
    m.style.display = 'flex';
  },

  apply() {
    const m = {};
    document.querySelectorAll('.map-sel').forEach(s => { if (s.value) m[s.value] = parseInt(s.dataset.col); });

    if (m.name === undefined) return alert('Ошибка: Вы не выбрали колонку "Название"!');

    // ВАЖНО: Мы не очищаем manager.data полностью, если хотим добавить к существующим.
    // Но по логике приложения сейчас (manager.open), мы работаем с полным списком.
    // Если нужно заменить список:
    manager.data = [];

    this.raw.forEach(r => {
      if (!r[m.name]) return; // Пропускаем пустые названия

      manager.data.push({
        id: "",
        art: m.art !== undefined ? String(r[m.art]) : "",
        name: String(r[m.name]),
        qty: m.qty !== undefined ? (parseFloat(String(r[m.qty]).replace(',', '.')) || 1) : 1,
        unit: m.unit !== undefined ? String(r[m.unit]) : "шт",
        price: m.price !== undefined ? (parseFloat(String(r[m.price]).replace(',', '.')) || 0) : 0,
        supplier: m.supplier !== undefined ? String(r[m.supplier]) : "",
        note: m.note !== undefined ? String(r[m.note]) : "",
        done: false,
        // САМОЕ ГЛАВНОЕ: Импортируемые товары попадают в ТЕКУЩУЮ открытую вкладку категории
        category: manager.currentCategory
      });
    });

    document.getElementById('modal').style.display = 'none';
    manager.render();
  }
};

// === BUYER LOGIC (С ТАБАМИ И ФИЛЬТРАМИ) ===
const buyer = {
  data: [],
  localData: [],
  hasChanges: false,
  currentFilter: 'ALL',
  currentTab: 'todo', // 'todo' или 'done'
  currentSheet: '',

  async open(name) {
    if (this.hasChanges && !confirm("Сбросить изменения?")) return;
    this.currentSheet = name;
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-buyer').classList.remove('hidden');
    document.getElementById('buyTitle').innerText = name;

    this.hasChanges = false;
    this.toggleSaveBar(false);
    document.getElementById('buyList').innerHTML = '<div style="text-align:center; padding:40px; color:#999;">Загрузка...</div>';
    this.setTab('todo');

    try {
      const serverData = await api.call('getProjectData', { sheetName: name });
      this.data = JSON.parse(JSON.stringify(serverData));
      this.localData = JSON.parse(JSON.stringify(serverData));
      this.renderFilters();
      this.render();
    } catch (e) {
      alert("Ошибка загрузки: " + e.message);
      app.goHome();
    }
  },

  setTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.buy-tab').forEach(el => el.classList.remove('active'));
    const btn = document.getElementById(`tab-${tab}`);
    if (btn) btn.classList.add('active');
    this.render();
  },

  renderFilters() {
    const container = document.getElementById('buyFilters');
    const uniqueSuppliers = [...new Set(this.localData.map(i => i.supplier).filter(s => s && s.trim() !== ""))].sort();

    let html = `<div class="filter-chip ${this.currentFilter === 'ALL' ? 'active' : ''}" onclick="buyer.setFilter('ALL')">Все</div>`;
    if (this.localData.some(i => !i.supplier)) {
      html += `<div class="filter-chip ${this.currentFilter === 'NONE' ? 'active' : ''}" onclick="buyer.setFilter('NONE')">Не назначено</div>`;
    }
    uniqueSuppliers.forEach(sup => {
      const active = this.currentFilter === sup ? 'active' : '';
      html += `<div class="filter-chip ${active}" onclick="buyer.setFilter('${sup}')">${sup}</div>`;
    });
    container.innerHTML = html;
  },

  setFilter(filter) {
    this.currentFilter = filter;
    this.renderFilters();
    this.render();
  },

  render() {
    const container = document.getElementById('buyList');
    container.innerHTML = '';
    let totalSum = 0, totalCount = 0, doneCount = 0, visibleCount = 0;

    this.localData.forEach(item => {
      totalCount++;
      if (item.done) doneCount++;
      totalSum += (item.qty * item.price);

      // 1. Фильтр по ВКЛАДКЕ
      if (this.currentTab === 'todo' && item.done) return;
      if (this.currentTab === 'done' && !item.done) return;

      // 2. Фильтр по ПОСТАВЩИКУ
      if (this.currentFilter === 'NONE') { if (item.supplier) return; }
      else if (this.currentFilter !== 'ALL') { if (item.supplier !== this.currentFilter) return; }

      visibleCount++;

      const div = document.createElement('div');
      div.className = `b-card ${item.done ? 'done' : ''}`;

      div.innerHTML = `
        <div class="b-row-top">
          <div class="b-name">${item.name}</div>
          <div class="b-check-btn" onclick="buyer.toggle(${item.rowIndex})">
            ${item.done ? '<i class="fas fa-check"></i>' : ''}
          </div>
        </div>
        <div class="b-row-mid">
          <span class="b-badge">${item.qty} ${item.unit}</span>
          ${item.supplier ? `<span class="b-supplier"><i class="fas fa-truck"></i> ${item.supplier}</span>` : ''}
        </div>
        ${item.note ? `<div style="font-size:12px; color:#888; margin-top:5px;">${item.note}</div>` : ''}
        <div class="b-row-bot">
          <input type="number" class="b-price-inp" 
            value="${item.price > 0 ? item.price : ''}" 
            placeholder="Цена" 
            onchange="buyer.updatePrice(${item.rowIndex}, this.value)">
          <div style="font-weight:bold; font-size:14px; color:#555;">₸</div>
        </div>
      `;
      container.appendChild(div);
    });

    if (visibleCount === 0) {
      const msg = this.currentTab === 'todo' ? 'Всё куплено! 🎉' : 'Пока ничего не куплено';
      container.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">${msg}</div>`;
    }

    document.getElementById('buyProgressText').innerText = `${doneCount} / ${totalCount}`;
    document.getElementById('buyTotalSum').innerText = totalSum.toLocaleString() + ' ₸';
  },

  toggle(rowIndex) {
    const item = this.localData.find(i => i.rowIndex === rowIndex);
    if (item) {
      item.done = !item.done;
      this.markAsChanged();
      this.render();
    }
  },

  updatePrice(rowIndex, value) {
    const item = this.localData.find(i => i.rowIndex === rowIndex);
    if (item) {
      item.price = parseFloat(value) || 0;
      this.markAsChanged();
      this.recalcTotal();
    }
  },

  recalcTotal() {
    let sum = this.localData.reduce((acc, i) => acc + (i.qty * i.price), 0);
    document.getElementById('buyTotalSum').innerText = sum.toLocaleString() + ' ₸';
  },

  markAsChanged() {
    this.hasChanges = true;
    this.toggleSaveBar(true);
  },

  toggleSaveBar(show) {
    const bar = document.getElementById('unsavedBar');
    if (show) bar.classList.add('visible');
    else bar.classList.remove('visible');
  },

  async saveBatch() {
    const btn = document.querySelector('#unsavedBar .save-btn');
    const oldText = btn.innerText;
    btn.innerText = "⏳...";
    btn.disabled = true;

    try {
      const arrayData = this.localData.map(i => [
        i.id, i.art, i.name, i.qty, i.unit, i.price,
        (i.qty * i.price), i.supplier, i.note, i.done,
        i.category || "Фурнитура" // <--- ОБЯЗАТЕЛЬНО ДОБАВИТЬ ЭТУ СТРОКУ (11-я колонка)
      ]);

      // ИСПРАВЛЕНИЕ: ID или ваш запасной
      if (!app.user || !app.user.id) {
        document.querySelector('#unsavedBar .save-btn').disabled = false;
        return alert("Ошибка: Вы не авторизованы в Telegram.");
      }
      const userId = app.user.id;

      await api.call('saveProject', {
        sheetName: this.currentSheet,
        data: arrayData,
        status: 'active',
        userId: userId
      }, 'POST');

      this.hasChanges = false;
      this.toggleSaveBar(false);
      btn.innerText = "✅";
      this.data = JSON.parse(JSON.stringify(this.localData));

      setTimeout(() => {
        btn.innerText = oldText;
        btn.disabled = false;
      }, 1000);

    } catch (e) {
      alert("Ошибка: " + e.message);
      btn.innerText = oldText;
      btn.disabled = false;
    }
  },

  checkClose() {
    if (this.hasChanges) {
      if (confirm("Есть несохраненные изменения. Выйти?")) app.goHome();
    } else {
      app.goHome();
    }
  }

}; // <--- ВАЖНО: ЭТА СКОБКА ЗАКРЫВАЕТ ОБЪЕКТ buyer

// === ЗАПУСК (СТРОГО ПОСЛЕ ЗАКРЫВАЮЩЕЙ СКОБКИ) ===
window.onload = () => app.init();
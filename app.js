// === SUPABASE CONFIG ===
const SUPABASE_URL = 'https://lonhhlcqjlcxnvyhkxgp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbmhobGNxamxjeG52eWhreGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjEwNTMsImV4cCI6MjA4MDgzNzA1M30.0mrmsU4V3gvtTRCjjlwiwlwyrbxCuiskKkdzzC3ijcI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Глобальная переменная для хранения ID компании текущего пользователя
let CURRENT_COMPANY_ID = null;

// === API ЗАМЕНА ===
const api = {
  // Универсальный метод-диспетчер, чтобы не ломать старый код
  async call(action, params = {}, method = 'GET', useLoader = true) {
    if (useLoader) document.getElementById('loader').classList.remove('hidden');

    try {
      let result = null;

      switch (action) {
        case 'saveTelegramUser':
          result = await this._saveUser(params.user);
          break;
        case 'saveSuppliers':
          result = await this._saveSuppliers(params.list);
          break;
        case 'getSuppliers':
          result = await this._getSuppliers();
          break;
        case 'getProjectsSummary':
          result = await this._getProjectsSummary(params.userId);
          break;
        case 'getProjectData':
          result = await this._getProjectData(params.sheetName);
          break;
        case 'saveProject':
          result = await this._saveProject(params);
          break;
        case 'updateStatus':
          result = await this._updateStatus(params.sheetName, params.status);
          break;
        case 'deleteProject':
          result = await this._deleteProject(params.sheetName);
          break;
        case 'archiveProject':
        case 'unarchiveProject':
          // Реализуем через смену статуса
          const newStatus = action === 'archiveProject' ? 'archived' : 'new';
          const name = action === 'archiveProject' ? params.sheetName : null;
          // Для unarchive ID передается сложнее в старой логике, упростим пока до смены статуса
          if (name) result = await this._updateStatus(name, newStatus);
          break;
        default:
          console.warn(`Action ${action} not implemented in Supabase migration yet.`);
          result = {};
      }

      return result;
    } catch (e) {
      console.error("Supabase Error:", e);
      if (!e.message.includes("The user aborted a request")) {
        alert("Ошибка базы данных: " + e.message);
      }
      throw e;
    } finally {
      if (useLoader) document.getElementById('loader').classList.add('hidden');
    }
  },

  // --- ВНУТРЕННИЕ МЕТОДЫ ---

  async _saveUser(user) {
    if (!user) return;
    // Проверяем, есть ли пользователь, чтобы получить company_id
    let { data: existingUser } = await supabase.from('users').select('*').eq('id', user.id).single();

    // Если пользователя нет, создаем (company_id будет null, пока админ не назначит)
    if (!existingUser) {
      const { error } = await supabase.from('users').insert([{
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        language: user.language_code,
        last_login: new Date()
      }]);
      if (error) throw error;
    } else {
      // Обновляем last_login
      await supabase.from('users').update({ last_login: new Date() }).eq('id', user.id);
      CURRENT_COMPANY_ID = existingUser.company_id;
    }
    return { success: true };
  },

  async _getSuppliers() {
    if (!CURRENT_COMPANY_ID) return [];

    // Фильтруем ТОЛЬКО по текущей компании
    const { data, error } = await supabase
      .from('suppliers')
      .select('*') // Берем все поля, включая ID
      .eq('company_id', CURRENT_COMPANY_ID)
      .order('name');

    if (error) throw error;
    return data;
  },

  async _saveSuppliers(list) {
    if (!CURRENT_COMPANY_ID) throw new Error("Нет доступа к компании");

    // 1. Подготавливаем данные для Upsert (Вставка/Обновление)
    const upsertData = list.map(item => ({
      id: item.id || undefined, // Если нет ID, Supabase создаст новый UUID
      name: item.name,
      phone: item.phone,
      company_id: CURRENT_COMPANY_ID // ПРИВЯЗКА К КОМПАНИИ
    }));

    if (upsertData.length > 0) {
      const { error } = await supabase.from('suppliers').upsert(upsertData);
      if (error) throw error;
    }

    // ПРИМЕЧАНИЕ: 
    // Сейчас мы только добавляем/обновляем. Удаление мы пока не реализовали на сервере 
    // (чтобы случайно не удалить историю). 
    // Кнопка "Удалить" в модалке просто не сохранит поставщика в следующий раз, 
    // но в базе он останется "висеть". Для MVP это безопаснее.

    return { success: true };
  },

  async _getProjectsSummary(userId) {
    // 1. Убеждаемся, что знаем company_id
    if (!CURRENT_COMPANY_ID && userId) {
      const { data } = await supabase.from('users').select('company_id').eq('id', userId).single();
      if (data) CURRENT_COMPANY_ID = data.company_id;
    }

    if (!CURRENT_COMPANY_ID) {
      console.warn("Пользователь не привязан к компании.");
      return [];
    }

    // 2. Получаем проекты и их позиции одним запросом
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
            id, name, status,
            project_items ( id, price, qty, done )
        `)
      .eq('company_id', CURRENT_COMPANY_ID)
      .neq('status', 'archived'); // Скрываем архивные из дашборда

    if (error) throw error;

    // 3. Форматируем под старый формат App.js
    return projects.map(p => {
      const items = p.project_items || [];
      const total = items.length;
      const done = items.filter(i => i.done).length;
      const sum = items.reduce((acc, i) => acc + (i.qty * i.price), 0);
      return {
        name: p.name, // Старый код использует имя как ID
        status: p.status || 'new',
        total: total,
        done: done,
        sum: sum
      };
    });
  },

  async _getProjectData(projectName) {
    // Ищем проект по имени и компании
    if (!CURRENT_COMPANY_ID) throw new Error("Нет доступа к компании");

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('name', projectName)
      .eq('company_id', CURRENT_COMPANY_ID)
      .maybeSingle();

    if (!project) return []; // Новый проект

    // Получаем позиции
    const { data: items, error } = await supabase
      .from('project_items')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Маппинг данных Supabase -> App.js
    return items.map(item => ({
      id: item.id,
      art: item.art || "",
      name: item.name,
      qty: item.qty || 0,
      unit: item.unit || "шт",
      price: item.price || 0,
      sum: (item.qty || 0) * (item.price || 0),
      supplier: item.supplier || "",
      note: item.note || "",
      done: item.done || false,
      category: item.category || "Фурнитура"
    }));
  },

  async _saveProject(params) {
    // params: { sheetName, data (Array of Arrays), status, userId }
    if (!CURRENT_COMPANY_ID) throw new Error("Ошибка: Не определена компания пользователя");

    const projectName = params.sheetName;

    // 1. Создаем или обновляем проект (Header)
    // Сначала ищем ID проекта
    let { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('name', projectName)
      .eq('company_id', CURRENT_COMPANY_ID)
      .maybeSingle();

    let projectId;

    if (project) {
      projectId = project.id;
      // Обновляем статус если передан
      if (params.status) {
        await supabase.from('projects').update({ status: params.status }).eq('id', projectId);
      }
    } else {
      // Создаем новый
      const { data: newProj, error } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          company_id: CURRENT_COMPANY_ID,
          status: params.status || 'active'
        })
        .select()
        .single();
      if (error) throw error;
      projectId = newProj.id;
    }

    // 2. Подготовка items (строк)
    // manager.data приходит как массив массивов: 
    // [id(0), art(1), name(2), qty(3), unit(4), price(5), sum(6), supplier(7), note(8), done(9), category(10)]
    const upsertData = params.data.map(row => {
      const itemObj = {
        project_id: projectId,
        art: row[1],
        name: row[2],
        qty: parseFloat(row[3]) || 0,
        unit: row[4],
        price: parseFloat(row[5]) || 0,
        // sum считается в БД, но можно и передать если колонка не generated
        supplier: row[7],
        note: row[8],
        done: row[9] === true || row[9] === 'true',
        category: row[10] || 'Фурнитура'
      };
      // Если есть ID (row[0]), добавляем его для обновления, иначе создастся новый UUID
      if (row[0] && row[0].length > 5) {
        itemObj.id = row[0];
      }
      return itemObj;
    });

    // 3. Сохранение строк
    const { error: itemsError } = await supabase
      .from('project_items')
      .upsert(upsertData);

    if (itemsError) throw itemsError;

    // 4. (Опционально) Удаление удаленных строк
    // Сложно реализовать без списка ID, пока оставим только upsert
    // В идеале: передавать список ID для удаления отдельно

    return { success: true };
  },

  async _updateStatus(name, status) {
    if (!CURRENT_COMPANY_ID) return;
    await supabase
      .from('projects')
      .update({ status: status })
      .eq('name', name)
      .eq('company_id', CURRENT_COMPANY_ID);
    return { success: true };
  },

  async _deleteProject(name) {
    if (!CURRENT_COMPANY_ID) return;
    // Каскадное удаление items настроено в БД, удаляем только проект
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('name', name)
      .eq('company_id', CURRENT_COMPANY_ID);

    if (error) throw error;
    return { success: true };
  }
};

// === ГЛАВНОЕ ПРИЛОЖЕНИЕ ===
const app = {
  suppliers: [],
  user: null,
  projectsData: [],
  currentDashTab: 'new',

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
      let userId = '';
      if (this.user && this.user.id) userId = String(this.user.id);

      // 1. Получаем данные
      const data = await api.call('getProjectsSummary', { userId: userId }, 'GET', useLoader);
      console.log('📦 Получено проектов:', data.length);

      // 2. Сохраняем в память
      this.projectsData = data;

      // 3. Обновляем цифры на табах
      this.updateBadges();

      // 4. Рисуем сетку
      this.renderProjectsGrid();

    } catch (e) {
      console.error(e);
      alert('Ошибка: ' + e.message);
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

  renderProjectsGrid() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return console.warn('Элемент #projectsGrid не найден в HTML');

    grid.innerHTML = '';

    const filterText = (document.getElementById('dashSearch')?.value || '').toLowerCase();
    const targetStatus = this.currentDashTab;

    // Фильтруем: Статус == Текущий Таб И Имя содержит Поиск
    const filtered = this.projectsData.filter(p => {
      const pStatus = p.status || 'new';
      const matchesTab = (pStatus === targetStatus);
      const matchesSearch = p.name.toLowerCase().includes(filterText);
      return matchesTab && matchesSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align:center; padding:40px; color:#999;">
             <i class="fas fa-folder-open" style="font-size:40px; margin-bottom:10px;"></i><br>
             В этой категории пусто
          </div>`;
      return;
    }

    filtered.forEach(p => {
      // ... (код подсчета процентов и sumFormatted оставляем как был) ...
      const total = p.total || 0;
      const done = p.done || 0;
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      const sumFormatted = (p.sum || 0).toLocaleString() + ' ₸';

      // Определяем тег
      let tagText = 'Новый';
      if (percent === 100) tagText = 'Завершен';
      else if (percent > 0) tagText = `Прогресс ${percent}%`;

      const card = document.createElement('div');
      card.className = 'p-card';
      // Клик по телу карточки открывает менеджер (для удобства)

      card.innerHTML = `
            <div class="card-header">
                <span class="card-tag">${tagText}</span>
                <button class="btn-trash" onclick="event.stopPropagation(); app.deleteProject('${p.name}')" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="card-body" onclick="manager.open('${p.name}')">
                <h3 class="card-title">${p.name}</h3>
                <div class="card-desc">
                   <div class="desc-row">
                      <i class="fas fa-coins" style="color:#cbd5e1; font-size:12px;"></i> 
                      <b>${sumFormatted}</b>
                   </div>
                   <div class="desc-row">
                      <i class="fas fa-list-ul" style="color:#cbd5e1; font-size:12px;"></i> 
                      <span>Позиций: ${total} (Куплено: ${done})</span>
                   </div>
                </div>
            </div>

            <div class="card-footer">
               <!-- Слева: Селект статуса -->
               <select onclick="event.stopPropagation()" onchange="app.moveProject('${p.name}', this.value)" class="status-select">
                   <option value="new" ${p.status == 'new' ? 'selected' : ''}>В работе</option>
                   <option value="active" ${p.status == 'active' ? 'selected' : ''}>Закуп</option>
                   <option value="done" ${p.status == 'done' ? 'selected' : ''}>Готово</option>
               </select>
               
               <!-- Справа: Кнопки действий -->
               <div class="card-actions">
                  <button class="btn-action btn-edit" onclick="event.stopPropagation(); manager.open('${p.name}')" title="Редактировать">
                    <i class="fas fa-pencil-alt"></i>
                  </button>
                  <button class="btn-action btn-buy" onclick="event.stopPropagation(); buyer.open('${p.name}')" title="Закуп">
                    <i class="fas fa-shopping-cart"></i>
                  </button>
               </div>
            </div>
        `;
      grid.appendChild(card);
    });
  },

  switchTab(tabName) {
    this.currentDashTab = tabName;

    // Обновляем UI кнопок
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));

    if (tabName === 'new') document.getElementById('tab-btn-new')?.classList.add('active');
    if (tabName === 'active') document.getElementById('tab-btn-active')?.classList.add('active');
    if (tabName === 'done') document.getElementById('tab-btn-done')?.classList.add('active');

    this.renderProjectsGrid();
  },

  updateBadges() {
    const counts = { new: 0, active: 0, done: 0 };
    this.projectsData.forEach(p => {
      const s = p.status || 'new';
      if (counts[s] !== undefined) counts[s]++;
      else counts['new']++;
    });

    if (document.getElementById('count-new')) document.getElementById('count-new').innerText = counts.new;
    if (document.getElementById('count-active')) document.getElementById('count-active').innerText = counts.active;
    if (document.getElementById('count-done')) document.getElementById('count-done').innerText = counts.done;
  },

  filterDashboard() {
    this.renderProjectsGrid();
  },

  async moveProject(name, status) {
    await api.call('updateStatus', { sheetName: name, status: status }, 'POST');
    // Обновляем локально без перезагрузки
    const proj = this.projectsData.find(p => p.name === name);
    if (proj) proj.status = status;
    this.updateBadges();
    this.renderProjectsGrid();
  },

  openSuppliersEdit() {
    // Очищаем контейнер
    const listContainer = document.getElementById('supListContainer');
    listContainer.innerHTML = '';

    // Рисуем строки
    // (Передаем ID, Имя, Телефон)
    this.suppliers.forEach((s) => app.addSupplierRow(s.id, s.name, s.phone));

    const m = document.getElementById('supEditModal');
    m.classList.remove('hidden');
    m.style.display = 'flex';
  },

  addSupplierRow(id = '', name = '', phone = '') {
    const listContainer = document.getElementById('supListContainer');

    const div = document.createElement('div');
    div.className = 'sup-row';
    // Сохраняем ID в data-атрибут, если он есть
    if (id) div.dataset.id = id;

    div.innerHTML = `
      <input class="sup-input name" value="${name}" placeholder="Имя / Название">
      <input class="sup-input phone" value="${phone}" placeholder="Телефон">
      <button onclick="this.closest('.sup-row').remove()" class="btn-icon-del">
        <i class="fas fa-trash"></i>
      </button>
    `;
    listContainer.appendChild(div);
  },

  async saveSuppliers() {
    const rows = document.querySelectorAll('.sup-row');
    const newList = [];

    rows.forEach(div => {
      const id = div.dataset.id || null; // Если был ID, берем его
      const name = div.querySelector('.name').value.trim();
      const phone = div.querySelector('.phone').value.trim();

      if (name) {
        newList.push({ id, name, phone });
      }
    });

    await api.call('saveSuppliers', { list: newList }, 'POST');

    // Обновляем локальный список
    this.suppliers = await api.call('getSuppliers'); // Перезапрашиваем чистые данные
    document.getElementById('supEditModal').style.display = 'none';
    alert('Поставщики сохранены');
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

    // 1. Проверяем, открыта ли вкладка "Фасады"
    const isFacades = (this.currentCategory === "Фасады");

    // 2. Меняем ЗАГОЛОВКИ таблицы в зависимости от вкладки
    const thead = document.querySelector('#mgrTable thead tr');
    if (isFacades) {
      // Заголовки для ФАСАДОВ
      thead.innerHTML = `
            <th class="chk"><input type="checkbox" id="mgrAll" onchange="manager.toggleAll(this.checked)"></th>
            <th style="width: 120px;">Категория</th>
            <th>Материал</th>    <!-- name -->
            <th>Фрезеровка</th>  <!-- art -->
            <th>Толщина</th>     <!-- unit -->
            <th>Цвет</th>        <!-- supplier -->
            <th>Покрытие</th>    <!-- note -->
            <th>Квадратура</th>  <!-- qty -->
            <th>Цена кв.м</th>   <!-- price -->
            <th>Сумма</th>
        `;
    } else {
      // СТАНДАРТНЫЕ заголовки
      thead.innerHTML = `
            <th class="chk"><input type="checkbox" id="mgrAll" onchange="manager.toggleAll(this.checked)"></th>
            <th style="width: 120px;">Категория</th>
            <th>Артикул</th>
            <th>Наименование</th>
            <th>Кол-во</th>
            <th>Ед.</th>
            <th>Цена</th>
            <th>Сумма</th>
            <th>Поставщик</th>
            <th>Примечание</th>
        `;
    }

    // Опции для выпадающих списков
    const supOpts = `<option value="">-</option>` + app.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    const catOpts = this.categories.map(c => `<option value="${c}">${c}</option>`).join('');

    this.data.forEach((item, i) => {
      // Фильтр по категории
      if (item.category !== this.currentCategory) return;

      // Фильтр поиска
      const searchStr = (item.name + ' ' + item.art + ' ' + item.supplier).toLowerCase();
      if (filter && !searchStr.includes(filter)) return;

      item.sum = item.qty * item.price;
      total += item.sum;

      const tr = document.createElement('tr');
      // Подсветка наличия поставщика (только для обычных вкладок, т.к. в фасадах это Цвет)
      if (item.supplier && !isFacades) tr.classList.add('has-supplier');
      if (item.checked) tr.style.background = '#fff9c4';

      if (isFacades) {
        // === Рендеринг строки для ФАСАДОВ ===
        tr.innerHTML = `
            <td class="chk"><input type="checkbox" ${item.checked ? 'checked' : ''} onchange="manager.check(${i},this.checked)"></td>
            <td>
               <select class="cat-select-table" onchange="manager.changeCategory(${i}, this.value)">
                 ${catOpts.replace(`"${item.category}"`, `"${item.category}" selected`)}
               </select>
            </td>

            <!-- Материал (храним в name) -->
            <td><input value="${item.name}" placeholder="МДФ..." oninput="manager.upd(${i},'name',this.value)"></td>
            
            <!-- Фрезеровка (храним в art) -->
            <td><input value="${item.art || ''}" placeholder="Мыло..." oninput="manager.upd(${i},'art',this.value)"></td>
            
            <!-- Толщина (храним в unit) -->
            <td><input value="${item.unit}" placeholder="16мм" oninput="manager.upd(${i},'unit',this.value)"></td>
            
            <!-- Цвет (храним в supplier, делаем обычным инпутом) -->
            <td><input value="${item.supplier || ''}" placeholder="Белый" oninput="manager.upd(${i},'supplier',this.value)"></td>
            
            <!-- Покрытие (храним в note) -->
            <td><input value="${item.note || ''}" placeholder="Лак/Мат" oninput="manager.upd(${i},'note',this.value)"></td>
            
            <!-- Квадратура (храним в qty) -->
            <td><input type="number" value="${item.qty}" onchange="manager.upd(${i},'qty',this.value)"></td>
            
            <!-- Цена кв.м (храним в price) -->
            <td><input type="number" value="${item.price}" onchange="manager.upd(${i},'price',this.value)"></td>
            
            <td>${item.sum.toLocaleString()}</td>
          `;
      } else {
        // === СТАНДАРТНЫЙ Рендеринг ===
        tr.innerHTML = `
            <td class="chk"><input type="checkbox" ${item.checked ? 'checked' : ''} onchange="manager.check(${i},this.checked)"></td>
            <td>
               <select class="cat-select-table" onchange="manager.changeCategory(${i}, this.value)">
                 ${catOpts.replace(`"${item.category}"`, `"${item.category}" selected`)}
               </select>
            </td>
            <td><input value="${item.art || ''}" oninput="manager.upd(${i},'art',this.value)"></td>
            <td><input value="${item.name}" oninput="manager.upd(${i},'name',this.value)"></td>
            <td><input type="number" value="${item.qty}" onchange="manager.upd(${i},'qty',this.value)"></td>
            <td><input value="${item.unit}" oninput="manager.upd(${i},'unit',this.value)"></td>
            <td><input type="number" value="${item.price}" onchange="manager.upd(${i},'price',this.value)"></td>
            <td>${item.sum.toLocaleString()}</td>
            <td><select onchange="manager.upd(${i},'supplier',this.value)">${supOpts.replace(`"${item.supplier}"`, `"${item.supplier}" selected`)}</select></td>
            <td><input value="${item.note || ''}" placeholder="..." oninput="manager.upd(${i},'note',this.value)"></td>
          `;
      }
      tbody.appendChild(tr);
    });

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
  },

  async uploadFile(input) {
    const file = input.files[0];
    if (!file) return;

    // Лимит 5 МБ
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой (макс 5 МБ)");
      input.value = '';
      return;
    }

    // Визуальная индикация (меняем текст кнопки временно, если хотите, или просто лоадер)
    document.getElementById('loader').classList.remove('hidden');

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];

        const res = await api.call('uploadFile', {
          data: base64,
          name: file.name,
          mime: file.type
        }, 'POST', false); // false - чтобы не дублировать лоадер, мы его уже включили или он не нужен

        if (res.url) {
          // ДОБАВЛЯЕМ НОВУЮ СТРОКУ С ФАЙЛОМ
          this.data.unshift({
            id: "",
            art: "",
            name: "📎 Файл: " + file.name, // Имя файла в название
            qty: 1,
            unit: "шт",
            price: 0,
            supplier: "",
            note: res.url, // Ссылка в примечание
            done: false,
            category: this.currentCategory // ВАЖНО: Добавляем в ТЕКУЩУЮ категорию
          });

          this.render(); // Обновляем таблицу
          alert("Файл добавлен!");
        }
      } catch (e) {
        alert("Ошибка загрузки: " + e.message);
      } finally {
        document.getElementById('loader').classList.add('hidden');
        input.value = ''; // Сброс инпута
      }
    };

    reader.onerror = () => {
      document.getElementById('loader').classList.add('hidden');
      alert("Ошибка чтения файла");
    };
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
    // Собираем выбранные колонки
    document.querySelectorAll('.map-sel').forEach(s => {
      if (s.value) m[s.value] = parseInt(s.dataset.col);
    });

    if (m.name === undefined) return alert('Ошибка: Вы не выбрали колонку "Название"!');

    // ❌ УДАЛЕНА СТРОКА: manager.data = []; 
    // Теперь новые данные будут добавляться в конец существующего списка

    let addedCount = 0;

    this.raw.forEach(r => {
      if (!r[m.name]) return; // Пропускаем строки без названия

      manager.data.push({
        id: "", // Генерируется базой при сохранении
        art: m.art !== undefined ? String(r[m.art]) : "",
        name: String(r[m.name]),
        qty: m.qty !== undefined ? (parseFloat(String(r[m.qty]).replace(',', '.')) || 1) : 1,
        unit: m.unit !== undefined ? String(r[m.unit]) : "шт",
        price: m.price !== undefined ? (parseFloat(String(r[m.price]).replace(',', '.')) || 0) : 0,
        supplier: m.supplier !== undefined ? String(r[m.supplier]) : "",
        note: m.note !== undefined ? String(r[m.note]) : "",
        done: false,
        // Импортируем в ТЕКУЩУЮ открытую категорию
        category: manager.currentCategory
      });
      addedCount++;
    });

    document.getElementById('modal').style.display = 'none';
    manager.render();

    // Небольшое уведомление для удобства
    alert(`Добавлено строк: ${addedCount}`);
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

      // Фильтры
      if (this.currentTab === 'todo' && item.done) return;
      if (this.currentTab === 'done' && !item.done) return;
      if (this.currentFilter === 'NONE') { if (item.supplier) return; }
      else if (this.currentFilter !== 'ALL') { if (item.supplier !== this.currentFilter) return; }

      visibleCount++;

      const div = document.createElement('div');
      // Добавляем класс done, если куплено
      div.className = `b-card ${item.done ? 'done' : ''}`;

      // Рендерим карточку С КНОПКОЙ
      div.innerHTML = `
        <div class="b-top">
          <div class="b-name">${item.name}</div>
          
          <!-- ВОТ ОНА, КНОПКА КУПИТЬ 👇 -->
          <button class="b-check-btn ${item.done ? 'active' : ''}" onclick="buyer.toggle(${item.rowIndex})">
             <i class="fas fa-${item.done ? 'check' : 'circle'}" style="${!item.done ? 'color:#eee;' : ''}"></i>
          </button>
        </div>

        <div class="b-mid">
          <span class="b-badge">${item.qty} ${item.unit}</span>
          ${item.supplier ? `<span class="b-sup-tag"><i class="fas fa-truck"></i> ${item.supplier}</span>` : ''}
        </div>
        
        ${item.note ? `<div style="font-size:12px; color:#888; margin-top:5px;">${item.note}</div>` : ''}

        <div class="b-bot">
          <input type="number" class="b-price-input" 
            value="${item.price > 0 ? item.price : ''}" 
            placeholder="Цена" 
            onchange="buyer.updatePrice(${item.rowIndex}, this.value)">
          <span style="font-weight:bold; color:#555;">₸</span>
        </div>
      `;
      container.appendChild(div);
    });

    if (visibleCount === 0) {
      const msg = this.currentTab === 'todo' ? 'Всё куплено! 🎉' : 'Здесь пока пусто';
      container.innerHTML = `<div style="text-align:center; padding:40px; color:#999;">${msg}</div>`;
    }

    // Обновляем статистику (если нужно, можно вывести в шапку, но пока просто считаем)
    // console.log(`Прогресс: ${doneCount}/${totalCount}, Сумма: ${totalSum}`);
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
// js/api.js

const api = {
  async call(action, params = {}, method = 'GET', useLoader = true) {
    if (useLoader) document.getElementById('loader').classList.remove('hidden');

    try {
      let result = null;

      switch (action) {
        case 'saveTelegramUser': result = await this._saveUser(params.user); break;
        case 'getSuppliers': result = await this._getSuppliers(); break;
        case 'saveSuppliers': result = await this._saveSuppliers(params.list); break;
        case 'getProjectsSummary': result = await this._getProjectsSummary(params.userId); break;
        case 'getProjectData': result = await this._getProjectData(params.sheetName); break;
        case 'saveProject': result = await this._saveProject(params); break;
        case 'updateStatus': result = await this._updateStatus(params.sheetName, params.status); break;
        case 'deleteProject': result = await this._deleteProject(params.sheetName); break;
        case 'archiveProject': result = await this._updateStatus(params.sheetName, 'archived'); break;
        case 'unarchiveProject': result = await this._updateStatus(params.sheetName, 'new'); break;
        case 'getArchivedList': result = await this._getArchivedList(); break;
        case 'uploadFile': result = await this._uploadFile(params.data, params.name, params.mime); break;
        case 'getCatalog': result = await this._getCatalog(); break;
        case 'initSession': result = await this._initSession(params.userId); break;
        case 'createCompany': result = await this._createCompany(params.name, params.userId); break;
        case 'joinCompany': result = await this._joinCompany(params.code, params.userId); break;
        case 'getCompanyMembers': result = await this._getCompanyMembers(); break;
        case 'getUserCompanies': result = await this._getUserCompanies(params.userId); break;
        case 'createInvite': result = await this._createInvite(params.userId); break;
        case 'updateMemberRole': result = await this._updateMemberRole(params.targetId, params.newRole); break;
        case 'leaveCompany': result = await this._leaveCompany(params.userId); break;
        case 'getProjectTeam': result = await this._getProjectTeam(params.projectId); break;
        case 'assignUserToProject': result = await this._assignUserToProject(params.projectId, params.userId); break;
        case 'removeUserFromProject': result = await this._removeUserFromProject(params.projectId, params.userId); break;
        case 'getProjectTeam': result = await this._getProjectTeam(params.projectId); break;
        case 'assignUserToProject': result = await this._assignUserToProject(params.projectId, params.userId); break;
        case 'removeUserFromProject': result = await this._removeUserFromProject(params.projectId, params.userId); break;
        default: console.warn(`Action ${action} not implemented.`); result = {};
      }
      return result;
    } catch (e) {
      console.error("Supabase Error:", e);
      if (!e.message.includes("The user aborted a request")) alert("Ошибка: " + e.message);
      throw e;
    } finally {
      if (useLoader) document.getElementById('loader').classList.add('hidden');
    }
  },

  // --- INTERNAL METHODS ---

  // 1. Сохранение юзера (Больше не ищем тут компанию)
  async _saveUser(user) {
    if (!user) return;

    // Просто обновляем данные пользователя
    const { error } = await supabase.from('users').upsert({
      id: String(user.id),
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      language: user.language_code,
      last_login: new Date()
    });

    if (error) console.error("Ошибка обновления юзера:", error);
    return { success: true };
  },

  // 2. Получение поставщиков (Убрали старую проверку)
  async _getSuppliers() {
    // Если сессия не инициализирована (нет компании), просто возвращаем пустоту
    if (!window.CURRENT_COMPANY_ID) return [];

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('company_id', window.CURRENT_COMPANY_ID)
      .order('name');

    if (error) throw error;
    return data;
  },

  async _saveSuppliers(list) {
    if (!window.CURRENT_COMPANY_ID) throw new Error("Нет доступа к компании");
    const upsertData = list.map(item => {
      let currentId = item.id;
      if (!currentId || currentId.length < 5) currentId = utils.generateUUID();
      return { id: currentId, name: item.name, phone: item.phone, company_id: window.CURRENT_COMPANY_ID };
    });
    if (upsertData.length > 0) {
      const { error } = await supabase.from('suppliers').upsert(upsertData);
      if (error) throw error;
    }
    return { success: true };
  },

  // 3. Сводка проектов (Убрали старую проверку)
  async _getProjectsSummary(userId) {
    // Если компании нет - проектов нет
    if (!window.CURRENT_COMPANY_ID) return [];

    // Убрали total_sum из запроса, как договаривались ранее
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`id, name, status, project_items ( id, price, qty, done )`)
      .eq('company_id', window.CURRENT_COMPANY_ID)
      .neq('status', 'archived');

    if (error) throw error;

    return projects.map(p => {
      const items = p.project_items || [];
      const total = items.length;
      const done = items.filter(i => i.done).length;
      const sum = items.reduce((acc, i) => acc + (i.qty * i.price), 0);
      return { name: p.name, status: p.status || 'new', total: total, done: done, sum: sum };
    });
  },

  async _getProjectData(projectName) {
    if (!window.CURRENT_COMPANY_ID) throw new Error("Нет доступа");

    // Ищем проект
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('name', projectName)
      .eq('company_id', window.CURRENT_COMPANY_ID)
      .maybeSingle();

    if (!project) return { items: [], projectId: null }; // <--- Возвращаем объект

    // Загружаем позиции
    const { data: items, error } = await supabase
      .from('project_items')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const mappedItems = items.map(item => ({
      id: item.id, art: item.art || "", name: item.name, qty: item.qty || 0, unit: item.unit || "шт",
      price: item.price || 0, sum: (item.qty || 0) * (item.price || 0), supplier: item.supplier || "",
      note: item.note || "", done: item.done || false, category: item.category || "Фурнитура"
    }));

    return { items: mappedItems, projectId: project.id }; // <--- Возвращаем ID проекта
  },

  async _saveProject(params) {
    if (!window.CURRENT_COMPANY_ID) throw new Error("Ошибка: Не определена компания");

    const projectName = params.sheetName;
    let projectId = params.projectId; // <--- Получаем ID из параметров

    // 1. Создание или Обновление Проекта (Заголовка)
    if (projectId) {
      // Если ID есть - обновляем имя и статус у существующего
      const updatePayload = { name: projectName };
      if (params.status) updatePayload.status = params.status;

      await supabase.from('projects')
        .update(updatePayload)
        .eq('id', projectId)
        .eq('company_id', window.CURRENT_COMPANY_ID);
    } else {
      // Если ID нет - создаем новый
      // Проверка на дубликат имени при создании нового
      let { data: existing } = await supabase.from('projects').select('id').eq('name', projectName).eq('company_id', window.CURRENT_COMPANY_ID).maybeSingle();

      if (existing) {
        projectId = existing.id; // Если имя занято, используем этот проект
      } else {
        const { data: newProj, error } = await supabase
          .from('projects')
          .insert({
            name: projectName,
            company_id: window.CURRENT_COMPANY_ID,
            status: params.status || 'new'
          })
          .select()
          .single();
        if (error) throw error;
        projectId = newProj.id;
      }
    }

    // 2. Обновление каталога цен (без изменений)
    const catalogUpdates = params.data.map(row => ({ name: row[2], unit: row[4], price: row[5], supplier: row[7] }));
    this._updateCatalog(catalogUpdates).catch(console.error);

    // 3. Сохранение позиций
    const upsertData = params.data.map(row => {
      const itemObj = {
        project_id: projectId, // Привязываем к ID
        art: row[1], name: row[2], qty: parseFloat(row[3]) || 0, unit: row[4],
        price: parseFloat(row[5]) || 0, supplier: row[7], note: row[8], done: row[9] === true || row[9] === 'true',
        category: row[10] || 'Фурнитура'
      };
      if (row[0] && row[0].length > 5) itemObj.id = row[0];
      return itemObj;
    });

    const { error: itemsError } = await supabase.from('project_items').upsert(upsertData);
    if (itemsError) throw itemsError;

    // Возвращаем ID проекта, чтобы менеджер его запомнил
    return { success: true, projectId: projectId };
  },

  async _updateStatus(name, status) {
    if (!window.CURRENT_COMPANY_ID) return;
    await supabase.from('projects').update({ status: status }).eq('name', name).eq('company_id', window.CURRENT_COMPANY_ID);
    return { success: true };
  },

  async _deleteProject(name) {
    if (!window.CURRENT_COMPANY_ID) return;
    const { error } = await supabase.from('projects').delete().eq('name', name).eq('company_id', window.CURRENT_COMPANY_ID);
    if (error) throw error;
    return { success: true };
  },

  async _uploadFile(base64Data, fileName, mimeType) {
    if (!window.CURRENT_COMPANY_ID) throw new Error("Нет доступа");
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const filePath = `${window.CURRENT_COMPANY_ID}/${Date.now()}_${fileName}`;
    const { error } = await supabase.storage.from('project-files').upload(filePath, blob, { contentType: mimeType, upsert: false });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
    return { url: publicUrlData.publicUrl };
  },

  async _getCatalog() {
    if (!window.CURRENT_COMPANY_ID) return [];
    const { data } = await supabase.from('catalog_items').select('name, price, supplier, unit').eq('company_id', window.CURRENT_COMPANY_ID);
    return data;
  },

  async _updateCatalog(items) {
    if (!window.CURRENT_COMPANY_ID || !items.length) return;
    const catalogItems = items
      .filter(i => i.name && i.name.trim().length > 0)
      .map(i => ({ company_id: window.CURRENT_COMPANY_ID, name: i.name.trim(), price: parseFloat(i.price) || 0, supplier: i.supplier, unit: i.unit }));
    if (catalogItems.length > 0) await supabase.from('catalog_items').upsert(catalogItems, { onConflict: 'company_id, name' });
  },

  async _getArchivedList() {
    if (!window.CURRENT_COMPANY_ID) return [];
    const { data } = await supabase.from('projects').select('id, name, created_at').eq('company_id', window.CURRENT_COMPANY_ID).eq('status', 'archived').order('created_at', { ascending: false });
    // Map to old format
    return data.map(p => ({ id: p.name, name: p.name, date: utils.formatDate(p.created_at) }));
  },

  // 1. Инициализация сессии (вызывается при старте)
  async _initSession(userId) {
    // Ищем компании, где состоит юзер
    const { data: memberships } = await supabase
      .from('company_members')
      .select('company_id, role, companies(name)')
      .eq('user_id', userId);

    if (memberships && memberships.length > 0) {
      // 1. Проверяем, есть ли сохраненный выбор
      const savedId = localStorage.getItem('preferred_company_id');

      // 2. Пытаемся найти сохраненную компанию в списке доступных
      let active = memberships.find(m => m.company_id === savedId);

      // 3. Если не нашли (или нет сохранения) - берем первую попавшуюся
      if (!active) active = memberships[0];

      window.CURRENT_COMPANY_ID = active.company_id;
      window.CURRENT_COMPANY_NAME = active.companies?.name || "Моя компания";
      window.CURRENT_USER_ROLE = active.role;

      return true;
    }

    return false; // Юзер безработный
  },

  // 2. Создать компанию
  async _createCompany(name, userId) {
    // Создаем саму компанию
    const { data: company, error } = await supabase
      .from('companies')
      .insert({ name: name, owner_id: userId })
      .select()
      .single();

    if (error) throw error;

    // Создаем связь "Владелец"
    await supabase.from('company_members').insert({
      user_id: userId,
      company_id: company.id,
      role: 'owner'
    });

    // Обновляем сессию сразу
    window.CURRENT_COMPANY_ID = company.id;
    window.CURRENT_COMPANY_NAME = company.name;
    window.CURRENT_USER_ROLE = 'owner';

    return { success: true };
  },

  // 3. Создать инвайт-код
  async _createInvite(userId) {
    if (!window.CURRENT_COMPANY_ID) throw new Error("Нет компании");

    // 1. Сначала ищем существующий код для этой компании
    const { data: existing } = await supabase
      .from('invitations')
      .select('code')
      .eq('company_id', window.CURRENT_COMPANY_ID)
      .maybeSingle();

    if (existing) {
      return { code: existing.code }; // Возвращаем старый (ссылка не меняется)
    }

    // 2. Если нет - создаем новый
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase.from('invitations').insert({
      company_id: window.CURRENT_COMPANY_ID,
      code: code,
      created_by: userId
    });

    if (error) throw error;
    return { code };
  },

  // 4. Вступить по коду
  async _joinCompany(code, userId) {
    const { data: invite } = await supabase.from('invitations').select('*').eq('code', code).maybeSingle();
    if (!invite) throw new Error("Неверный код");

    // Проверка на дубликат
    const { error } = await supabase.from('company_members').insert({
      user_id: userId,
      company_id: invite.company_id,
      role: 'employee'
    });

    if (error) {
      if (error.code === '23505') throw new Error("Вы уже в этой компании");
      throw error;
    }

    // После входа нужно перезагрузить страницу или обновить сессию
    return { success: true };
  },

  // 5. Получить список сотрудников
  async _getCompanyMembers() {
    if (!window.CURRENT_COMPANY_ID) return [];

    const { data } = await supabase
      .from('company_members')
      .select('role, user_id, users(first_name, last_name, username)')
      .eq('company_id', window.CURRENT_COMPANY_ID);

    return data.map(m => ({
      id: m.user_id, // ID юзера
      role: m.role,
      first_name: m.users?.first_name || 'Без имени',
      last_name: m.users?.last_name || '',
      username: m.users?.username
    }));
  },

  // 6. Изменить роль сотрудника
  async _updateMemberRole(targetUserId, newRole) {
    if (!window.CURRENT_COMPANY_ID) return;
    await supabase.from('company_members')
      .update({ role: newRole })
      .eq('user_id', targetUserId)
      .eq('company_id', window.CURRENT_COMPANY_ID);
    return { success: true };
  },

  // 7. Покинуть компанию
  async _leaveCompany(userId) {
    if (!window.CURRENT_COMPANY_ID) return;
    await supabase.from('company_members')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', window.CURRENT_COMPANY_ID);

    return { success: true };
  },

  // Получить список всех компаний пользователя для переключения
  async _getUserCompanies(userId) {
    const { data } = await supabase
      .from('company_members')
      .select('company_id, role, companies(name)')
      .eq('user_id', userId);

    return data.map(item => ({
      id: item.company_id,
      name: item.companies?.name,
      role: item.role
    }));
  }
};

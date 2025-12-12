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

  async _saveUser(user) {
    if (!user) return;
    let { data: existingUser } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (!existingUser) {
      await supabase.from('users').insert([{
        id: user.id, username: user.username, first_name: user.first_name,
        last_name: user.last_name, language: user.language_code, last_login: new Date()
      }]);
    } else {
      await supabase.from('users').update({ last_login: new Date() }).eq('id', user.id);
      window.CURRENT_COMPANY_ID = existingUser.company_id;
    }
    return { success: true };
  },

  async _getSuppliers() {
    // Safety check: try to fetch company ID if missing
    if (!window.CURRENT_COMPANY_ID && app.user && app.user.id) {
      const { data } = await supabase.from('users').select('company_id').eq('id', app.user.id).single();
      if (data) window.CURRENT_COMPANY_ID = data.company_id;
    }
    if (!window.CURRENT_COMPANY_ID) return [];

    const { data, error } = await supabase.from('suppliers').select('*').eq('company_id', window.CURRENT_COMPANY_ID).order('name');
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

  async _getProjectsSummary(userId) {
    if (!window.CURRENT_COMPANY_ID && userId) {
      const { data } = await supabase.from('users').select('company_id').eq('id', userId).single();
      if (data) window.CURRENT_COMPANY_ID = data.company_id;
    }
    if (!window.CURRENT_COMPANY_ID) return [];

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
  }
};

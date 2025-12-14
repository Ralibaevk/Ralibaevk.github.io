// js/api.js

const api = {
  async call(action, params = {}, method = 'GET', useLoader = true) {
    if (useLoader && document.getElementById('loader')) document.getElementById('loader').classList.remove('hidden');

    try {
      let result = null;
      switch (action) {
        // --- AUTH & SYSTEM ---
        case 'saveTelegramUser': result = await this._saveUser(params.user); break;
        case 'initSession': result = await this._initSession(params.userId); break;
        case 'uploadFile': result = await this._uploadFile(params.data, params.name, params.mime); break;

        // --- DICTIONARIES ---
        case 'getSuppliers': result = await this._getSuppliers(); break;
        case 'saveSuppliers': result = await this._saveSuppliers(params.list); break;
        case 'getCatalog': result = await this._getCatalog(); break;

        // --- NEW ERP STRUCTURE ---
        case 'getGlobalProjects': result = await this._getGlobalProjects(); break;
        case 'createGlobalProject': result = await this._createGlobalProject(params); break;
        case 'getProjectById': result = await this._getProjectById(params.id); break;

        case 'getPositions': result = await this._getPositions(params.projectId); break;
        case 'createPosition': result = await this._createPosition(params); break;

        // --- SUPPLY LISTS (Manager) ---
        case 'getSupplyByPosition': result = await this._getSupplyByPosition(params.positionId); break;
        case 'saveSupplyList': result = await this._saveSupplyList(params); break;

        // --- COMPANY ---
        case 'getCompanyMembers': result = await this._getCompanyMembers(); break;
        case 'createCompany': result = await this._createCompany(params.name, params.userId); break;
        case 'joinCompany': result = await this._joinCompany(params.code, params.userId); break;
        case 'createInvite': result = await this._createInvite(params.userId); break;
        case 'getUserCompanies': result = await this._getUserCompanies(params.userId); break;
        case 'updateMemberRole': result = await this._updateMemberRole(params.targetId, params.newRole); break;
        case 'leaveCompany': result = await this._leaveCompany(params.userId); break;

        // --- TEAM --- 
        case 'getProjectTeam': result = await this._getProjectTeam(params.projectId); break;
        case 'assignUserToProject': result = await this._assignUserToProject(params.projectId, params.userId); break;
        case 'removeUserFromProject': result = await this._removeUserFromProject(params.projectId, params.userId); break;

        // --- PRODUCTION TASKS ---
        case 'getProductionTasks': result = await this._getProductionTasks(params.positionId); break;
        case 'createProductionTask': result = await this._createProductionTask(params); break;
        case 'updateTaskStatus': result = await this._updateTaskStatus(params.taskId, params.status); break;
        case 'deleteTask': result = await this._deleteTask(params.taskId); break;

        // --- FILES & STATUSES ---
        case 'getFiles': result = await this._getFiles(params.parentId, params.level); break;
        case 'attachFile': result = await this._attachFile(params); break;
        case 'deleteFile': result = await this._deleteFile(params.fileId); break;
        case 'updatePositionStatus': result = await this._updatePositionStatus(params.id, params.status); break;

        default: console.warn(`Action ${action} not implemented.`); result = {};
      }
      return result;
    } catch (e) {
      console.error("API Error:", e);
      if (!e.message.includes("The user aborted a request")) alert("Ошибка: " + e.message);
      throw e;
    } finally {
      if (useLoader && document.getElementById('loader')) document.getElementById('loader').classList.add('hidden');
    }
  },

  // --- INTERNAL METHODS ---

  async _saveUser(user) {
    if (!user) return;
    const { error } = await supabase.from('users').upsert({
      id: String(user.id),
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      language: user.language_code,
      last_login: new Date()
    });
    if (error) console.error("Error updating user:", error);
    return { success: true };
  },

  async _initSession(userId) {
    const { data: memberships } = await supabase.from('company_members').select('company_id, role, companies(name)').eq('user_id', userId);
    if (memberships && memberships.length > 0) {
      const savedId = localStorage.getItem('preferred_company_id');
      let active = memberships.find(m => m.company_id === savedId);
      if (!active) active = memberships[0];
      window.CURRENT_COMPANY_ID = active.company_id;
      window.CURRENT_COMPANY_NAME = active.companies?.name || "Моя компания";
      window.CURRENT_USER_ROLE = active.role;
      return true;
    }
    return false;
  },

  async _getGlobalProjects() {
    if (!window.CURRENT_COMPANY_ID) return [];
    const { data, error } = await supabase.from('projects').select('*').eq('company_id', window.CURRENT_COMPANY_ID).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async _createGlobalProject(params) {
    const { data, error } = await supabase.from('projects').insert({
      company_id: window.CURRENT_COMPANY_ID,
      name: params.name,
      client_name: params.client,
      status: 'new',
      created_by: app.user?.id
    }).select().single();
    if (error) throw error;
    return data;
  },

  async _getProjectById(id) {
    if (!id) throw new Error("ID проекта не передан");
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async _getPositions(projectId) {
    const { data, error } = await supabase.from('positions').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async _createPosition(params) {
    const { data, error } = await supabase.from('positions').insert({ project_id: params.projectId, name: params.name, status: 'design' }).select().single();
    if (error) throw error;
    return data;
  },

  async _getSupplyByPosition(positionId) {
    const { data: list } = await supabase.from('supply_lists').select('id').eq('position_id', positionId).maybeSingle();
    if (!list) return { items: [], listId: null };
    const { data: items } = await supabase.from('project_items').select('*').eq('project_id', list.id).order('created_at', { ascending: true });
    const mapped = items.map(item => ({
      id: item.id, art: item.art, name: item.name, qty: item.qty, unit: item.unit,
      price: item.price, sum: (item.qty * item.price), supplier: item.supplier,
      note: item.note, done: item.done, category: item.category || "Фурнитура"
    }));
    return { items: mapped, listId: list.id };
  },

  async _saveSupplyList(params) {
    let listId = params.listId;
    const positionId = params.positionId;
    if (!listId) {
      const { data: newList, error } = await supabase.from('supply_lists').insert({
        company_id: window.CURRENT_COMPANY_ID, position_id: positionId, name: 'Смета', status: 'active'
      }).select().single();
      if (error) throw error;
      listId = newList.id;
    }
    const catalogUpdates = params.data.map(row => ({ name: row[2], unit: row[4], price: row[5], supplier: row[7] }));
    this._updateCatalog(catalogUpdates).catch(console.error);
    const upsertData = params.data.map(row => {
      const itemObj = {
        project_id: listId, art: row[1], name: row[2], qty: parseFloat(row[3]) || 0, unit: row[4],
        price: parseFloat(row[5]) || 0, supplier: row[7], note: row[8], done: row[9] === true, category: row[10] || 'Фурнитура'
      };
      if (row[0] && row[0].length > 5) itemObj.id = row[0];
      return itemObj;
    });
    const { error: itemsError } = await supabase.from('project_items').upsert(upsertData);
    if (itemsError) throw itemsError;
    return { success: true, listId: listId };
  },

  async _getSuppliers() {
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
    if (upsertData.length > 0) { const { error } = await supabase.from('suppliers').upsert(upsertData); if (error) throw error; }
    return { success: true };
  },

  async _getCatalog() {
    if (!window.CURRENT_COMPANY_ID) return [];
    const { data } = await supabase.from('catalog_items').select('name, price, supplier, unit').eq('company_id', window.CURRENT_COMPANY_ID);
    return data;
  },

  async _updateCatalog(items) {
    if (!window.CURRENT_COMPANY_ID || !items.length) return;
    const catalogItems = items.filter(i => i.name && i.name.trim().length > 0).map(i => ({ company_id: window.CURRENT_COMPANY_ID, name: i.name.trim(), price: parseFloat(i.price) || 0, supplier: i.supplier, unit: i.unit }));
    if (catalogItems.length > 0) await supabase.from('catalog_items').upsert(catalogItems, { onConflict: 'company_id, name' });
  },

  async _createCompany(name, userId) {
    const { data: company, error } = await supabase.from('companies').insert({ name: name, owner_id: userId }).select().single();
    if (error) throw error;
    await supabase.from('company_members').insert({ user_id: userId, company_id: company.id, role: 'owner' });
    window.CURRENT_COMPANY_ID = company.id;
    window.CURRENT_COMPANY_NAME = company.name;
    window.CURRENT_USER_ROLE = 'owner';
    return { success: true };
  },

  async _createInvite(userId) {
    if (!window.CURRENT_COMPANY_ID) throw new Error("Нет компании");
    const { data: existing } = await supabase.from('invitations').select('code').eq('company_id', window.CURRENT_COMPANY_ID).maybeSingle();
    if (existing) return { code: existing.code };
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('invitations').insert({ company_id: window.CURRENT_COMPANY_ID, code: code, created_by: userId });
    if (error) throw error;
    return { code };
  },

  async _joinCompany(code, userId) {
    const { data: invite } = await supabase.from('invitations').select('*').eq('code', code).maybeSingle();
    if (!invite) throw new Error("Неверный код");
    const { error } = await supabase.from('company_members').insert({ user_id: userId, company_id: invite.company_id, role: 'employee' });
    if (error) { if (error.code === '23505') throw new Error("Вы уже в этой компании"); throw error; }
    return { success: true };
  },

  async _getCompanyMembers() {
    if (!window.CURRENT_COMPANY_ID) return [];
    const { data } = await supabase.from('company_members').select('role, user_id, users(first_name, last_name, username)').eq('company_id', window.CURRENT_COMPANY_ID);
    return data.map(m => ({ id: m.user_id, role: m.role, first_name: m.users?.first_name || 'Без имени', last_name: m.users?.last_name || '', username: m.users?.username }));
  },

  async _updateMemberRole(targetUserId, newRole) {
    if (!window.CURRENT_COMPANY_ID) return;
    await supabase.from('company_members').update({ role: newRole }).eq('user_id', targetUserId).eq('company_id', window.CURRENT_COMPANY_ID);
    return { success: true };
  },

  async _leaveCompany(userId) {
    if (!window.CURRENT_COMPANY_ID) return;
    await supabase.from('company_members').delete().eq('user_id', userId).eq('company_id', window.CURRENT_COMPANY_ID);
    return { success: true };
  },

  async _getUserCompanies(userId) {
    const { data } = await supabase.from('company_members').select('company_id, role, companies(name)').eq('user_id', userId);
    return data.map(item => ({ id: item.company_id, name: item.companies?.name, role: item.role }));
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

  async _getProjectTeam(projectId) {
    if (!window.CURRENT_COMPANY_ID) return [];
    const { data, error } = await supabase.from('project_assignments').select('user_id, users(first_name, last_name, username, id)').eq('project_id', projectId);
    if (error) { console.error(error); return []; }
    return data.map(i => i.users);
  },

  async _assignUserToProject(projectId, userId) {
    const { error } = await supabase.from('project_assignments').insert({ project_id: projectId, user_id: userId });
    if (error && error.code !== '23505') throw error;
    return { success: true };
  },

  async _removeUserFromProject(projectId, userId) {
    const { error } = await supabase.from('project_assignments').delete().eq('project_id', projectId).eq('user_id', userId);
    if (error) throw error;
    return { success: true };
  },

  async _getProductionTasks(positionId) {
    const { data, error } = await supabase.from('production_tasks').select('*').eq('position_id', positionId).order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async _createProductionTask(params) {
    const { error } = await supabase.from('production_tasks').insert({
      position_id: params.positionId, title: params.title, type: params.type, cost: params.cost || 0, status: 'pending'
    });
    if (error) throw error;
    return { success: true };
  },

  async _updateTaskStatus(taskId, status) {
    const { error } = await supabase.from('production_tasks').update({ status: status }).eq('id', taskId);
    if (error) throw error;
    return { success: true };
  },

  async _deleteTask(taskId) {
    const { error } = await supabase.from('production_tasks').delete().eq('id', taskId);
    if (error) throw error;
    return { success: true };
  },

  async _getFiles(parentId, level) {
    const { data } = await supabase.from('project_files').select('*').eq(level === 'project' ? 'project_id' : 'position_id', parentId).order('created_at', { ascending: false });
    return data || [];
  },

  async _attachFile(params) {
    const uploadRes = await this._uploadFile(params.base64, params.name, params.mime);
    const payload = { file_name: params.name, file_url: uploadRes.url, file_type: params.type, uploaded_by: app.user?.id };
    if (params.level === 'project') payload.project_id = params.parentId; else payload.position_id = params.parentId;
    const { error } = await supabase.from('project_files').insert(payload);
    if (error) throw error;
    return { success: true };
  },

  async _deleteFile(fileId) {
    await supabase.from('project_files').delete().eq('id', fileId);
    return { success: true };
  },

  async _updatePositionStatus(id, status) {
    await supabase.from('positions').update({ status: status }).eq('id', id);
    return { success: true };
  }
};
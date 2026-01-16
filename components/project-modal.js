/**
 * Project Modal Component
 * Модальное окно проекта с позициями и загрузкой файлов
 */

import { router } from '../router/router.js';

// Хранилище загруженных файлов (в реальном приложении это будет на сервере)
const projectFiles = new Map();

/**
 * Показать модальное окно проекта
 * @param {Object} project - Данные проекта
 */
export function showProjectModal(project) {
    // Удаляем существующее модальное окно
    document.querySelector('.project-modal-overlay')?.remove();

    // Позиции проекта (mock data - в реальном приложении будет с сервера)
    const positions = getProjectPositions(project.id);

    const overlay = document.createElement('div');
    overlay.className = 'project-modal-overlay';
    overlay.innerHTML = `
        <div class="project-modal">
            <button class="modal-close" title="Закрыть">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>

            <div class="modal-header">
                <div class="project-meta">
                    <span class="project-id-badge">ID ПРОЕКТА: ${project.number}</span>
                    <span class="project-status-badge status-${project.status}">${getStatusLabel(project.status)}</span>
                </div>
                <h2 class="project-title">${project.name}</h2>
                <div class="project-info-row">
                    <div class="info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <div>
                            <span class="info-label">Адрес</span>
                            <span class="info-value">${project.address || 'Не указан'}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                        <div>
                            <span class="info-label">Дедлайн</span>
                            <span class="info-value">${formatDate(project.deadline)}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <div>
                            <span class="info-label">Контакт клиента</span>
                            <span class="info-value">${project.client || 'Не указан'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-tabs">
                <button class="modal-tab active" data-tab="info">Информация о проекте</button>
                <button class="modal-tab" data-tab="supply">Снабжение</button>
                <button class="modal-tab" data-tab="assembly">Сборка</button>
                <div class="tab-actions">
                    <button class="btn-add-position" id="btn-add-position">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Добавить позицию
                    </button>
                </div>
            </div>

            <div class="modal-content">
                <div class="tab-panel active" data-panel="info">
                    <div class="positions-header">
                        <h3>Позиции <span class="positions-count">${positions.length}</span></h3>
                        <div class="positions-search">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                            </svg>
                            <input type="text" placeholder="Поиск позиций..." id="positions-search">
                        </div>
                    </div>
                    
                    <div class="positions-list" id="positions-list">
                        ${positions.map(pos => renderPositionItem(pos, project.id)).join('')}
                    </div>
                </div>

                <div class="tab-panel" data-panel="supply">
                    <div class="supply-loading" id="supply-content">
                        <div class="loading-spinner"></div>
                        <p>Загрузка данных модели...</p>
                    </div>
                </div>

                <div class="tab-panel" data-panel="assembly">
                    <p class="tab-placeholder">Раздел сборки — инструкции и модели</p>
                </div>
            </div>

            <div class="modal-footer">
                <div class="footer-stats">
                    <span class="stat-item drafting">${countByStatus(positions, 'drafting')} Черновик</span>
                    <span class="stat-item review">${countByStatus(positions, 'review')} Проверка</span>
                    <span class="stat-item production">${countByStatus(positions, 'production')} Производство</span>
                </div>
                <div class="footer-actions">
                    <button class="btn-cancel" id="btn-modal-cancel">Отмена</button>
                    <button class="btn-primary" id="btn-modal-save">Сохранить изменения</button>
                </div>
            </div>

            <!-- Hidden file input for uploads -->
            <input type="file" id="modal-file-input" accept=".json,.dwg,.dxf,.pdf" style="display: none;">
        </div>
    `;

    document.body.appendChild(overlay);

    // Bind events
    bindModalEvents(overlay, project);

    // Load supply data asynchronously
    loadSupplyData(project.id);
}

/**
 * Get project positions (mock data)
 */
function getProjectPositions(projectId) {
    // В реальном приложении это будет загружаться с сервера
    return [
        {
            id: 'pos_1',
            name: 'Lounge Chair 01',
            subtitle: 'Herman Miller Style',
            units: 12,
            material: 'Дерево: Орех',
            fabric: 'Ткань: Серая шерсть',
            icon: 'chair',
            status: 'drafting',
            cadFile: null
        },
        {
            id: 'pos_2',
            name: 'Modular Sofa B',
            subtitle: 'Main Lobby',
            units: 4,
            material: 'Тип: 3-местный',
            fabric: 'Ткань: Изумрудный велюр',
            icon: 'sofa',
            status: 'review',
            cadFile: 'sofa_v3_revised.dwg'
        },
        {
            id: 'pos_3',
            name: 'Teak Side Table',
            subtitle: 'Suite 204',
            units: 20,
            material: 'Дерево: Тик устойчивый',
            fabric: 'Покрытие: Матовое',
            icon: 'table',
            status: 'drafting',
            cadFile: null
        },
        {
            id: 'pos_4',
            name: 'Conference Table X2',
            subtitle: 'Boardroom',
            units: 2,
            material: 'Материал: Дуб',
            fabric: 'Встроенное питание',
            icon: 'table',
            status: 'production',
            cadFile: 'conf_tab_final.pdf'
        }
    ];
}

/**
 * Render position item
 */
function renderPositionItem(position, projectId) {
    const icons = {
        chair: '<path d="M5 11V6a1 1 0 011-1h12a1 1 0 011 1v5M5 11h14M5 11v8M19 11v8M8 19h8"/>',
        sofa: '<rect x="2" y="8" width="20" height="8" rx="2"/><path d="M4 8V6a2 2 0 012-2h12a2 2 0 012 2v2M6 16v3M18 16v3"/>',
        table: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12M19 8v12M8 16h8"/>'
    };

    const fileKey = `${projectId}_${position.id}`;
    const uploadedFile = projectFiles.get(fileKey);
    const displayFile = uploadedFile || position.cadFile;

    return `
        <div class="position-item" data-id="${position.id}" data-project="${projectId}">
            <div class="position-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    ${icons[position.icon] || icons.table}
                </svg>
            </div>
            <div class="position-info">
                <div class="position-name">${position.name} - ${position.subtitle}</div>
                <div class="position-details">
                    Кол-во: ${position.units} • ${position.material} • ${position.fabric}
                </div>
            </div>
            <div class="position-file">
                <span class="file-label">CAD чертёж</span>
                ${displayFile
            ? `<span class="file-name has-file">${displayFile}</span>`
            : `<span class="file-name no-file">Не загружен</span>`}
            </div>
            <div class="position-actions">
                ${displayFile ? `
                    <button class="btn-view-file" data-position="${position.id}" title="Просмотр">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Просмотр
                    </button>
                ` : `
                    <button class="btn-upload-file" data-position="${position.id}" title="Загрузить файл">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="17,8 12,3 7,8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Загрузить
                    </button>
                `}
            </div>
        </div>
    `;
}

/**
 * Bind modal events
 */
function bindModalEvents(overlay, project) {
    // Close button
    overlay.querySelector('.modal-close').addEventListener('click', () => {
        overlay.remove();
    });

    // Cancel button
    overlay.querySelector('#btn-modal-cancel').addEventListener('click', () => {
        overlay.remove();
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    // Escape key to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Tab switching
    const addPositionBtn = overlay.querySelector('#btn-add-position');
    overlay.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            overlay.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            overlay.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const panelId = tab.dataset.tab;
            overlay.querySelector(`[data-panel="${panelId}"]`).classList.add('active');

            // Показывать кнопку "Добавить позицию" только на вкладке "Информация о проекте"
            if (addPositionBtn) {
                addPositionBtn.style.display = panelId === 'info' ? '' : 'none';
            }
        });
    });

    // File input handler
    const fileInput = overlay.querySelector('#modal-file-input');
    let currentPositionId = null;

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && currentPositionId) {
            const fileKey = `${project.id}_${currentPositionId}`;
            projectFiles.set(fileKey, file.name);

            // Refresh positions list
            refreshPositionsList(overlay, project);

            // Reset input
            fileInput.value = '';
            currentPositionId = null;
        }
    });

    // Bind position actions
    bindPositionEvents(overlay, project, fileInput, (id) => { currentPositionId = id; });

    // Search positions
    overlay.querySelector('#positions-search')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        overlay.querySelectorAll('.position-item').forEach(item => {
            const name = item.querySelector('.position-name').textContent.toLowerCase();
            item.style.display = name.includes(query) ? '' : 'none';
        });
    });
}

/**
 * Refresh positions list
 */
function refreshPositionsList(overlay, project) {
    const positions = getProjectPositions(project.id);
    const listEl = overlay.querySelector('#positions-list');
    const fileInput = overlay.querySelector('#modal-file-input');

    if (listEl) {
        listEl.innerHTML = positions.map(pos => renderPositionItem(pos, project.id)).join('');
        // Re-bind events
        let currentPositionId = null;
        bindPositionEvents(overlay, project, fileInput, (id) => { currentPositionId = id; });
    }
}

/**
 * Bind position-specific events
 */
function bindPositionEvents(overlay, project, fileInput, setCurrentPosition) {
    overlay.querySelectorAll('.btn-upload-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setCurrentPosition(btn.dataset.position);
            fileInput.click();
        });
    });

    overlay.querySelectorAll('.btn-view-file').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const positionId = btn.dataset.position;
            overlay.remove();
            router.navigate(`/project/${project.id}/viewer?position=${positionId}`);
        });
    });
}

/**
 * Helpers
 */
function getStatusLabel(status) {
    const labels = {
        in_progress: 'Активный',
        review: 'На проверке',
        drafting: 'Черновик',
        production: 'Производство',
        completed: 'Завершён'
    };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Не указан';
    const date = new Date(dateStr);
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function countByStatus(positions, status) {
    return positions.filter(p => p.status === status).length;
}

/**
 * Load project model data from JSON file
 * @param {string} projectId - Project ID 
 * @returns {Promise<Object>} Model data with panels and furniture
 */
async function loadProjectModelData(projectId) {
    try {
        const response = await fetch(`/data/projects/${projectId}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load model: ${response.status}`);
        }

        // Read as ArrayBuffer to handle encoding properly
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Try UTF-8 first
        let text = new TextDecoder('utf-8').decode(bytes);

        // Check if text looks corrupted (common patterns for broken Cyrillic)
        const hasEncodingIssues =
            text.includes('\ufffd') ||
            text.includes('Ð') ||
            (/[^\x00-\x7F]{2,}/.test(text) && !/[а-яА-ЯёЁ]/.test(text));

        if (hasEncodingIssues) {
            // Try Windows-1251 encoding
            text = new TextDecoder('windows-1251').decode(bytes);
        }

        return JSON.parse(text);
    } catch (error) {
        console.error('Error loading project model:', error);
        return null;
    }
}

/**
 * Extract supply data from model data
 * @param {Object} modelData - Raw model data
 * @returns {Object} Extracted materials and furniture
 */
function extractSupplyData(modelData) {
    if (!modelData) {
        return { materials: [], furniture: [] };
    }

    const materialsMap = new Map();
    const furnitureMap = new Map();

    // Extract materials from panels
    if (modelData.panels && Array.isArray(modelData.panels)) {
        modelData.panels.forEach(panel => {
            const rawName = panel.material?.name || panel.materialName || 'Без материала';
            // Normalize material name (remove \r and article codes)
            const matName = rawName.split('\r')[0].trim();

            if (!materialsMap.has(matName)) {
                materialsMap.set(matName, {
                    name: matName,
                    count: 0,
                    area: 0,
                    edgeLength: 0
                });
            }

            const matInfo = materialsMap.get(matName);
            matInfo.count++;
            matInfo.area += calculatePanelArea(panel);
            matInfo.edgeLength += calculateEdgeLength(panel);
        });
    }

    // Extract furniture
    const furnitureArray = modelData.furniture || modelData.Furniture || [];
    if (Array.isArray(furnitureArray)) {
        furnitureArray.forEach(furn => {
            const furnName = furn.name || 'Без названия';

            if (!furnitureMap.has(furnName)) {
                furnitureMap.set(furnName, {
                    name: furnName,
                    count: 0
                });
            }

            furnitureMap.get(furnName).count++;
        });
    }

    return {
        materials: Array.from(materialsMap.values()),
        furniture: Array.from(furnitureMap.values())
    };
}

/**
 * Calculate panel area in square meters
 * @param {Object} panel - Panel data
 * @returns {number} Area in m²
 */
function calculatePanelArea(panel) {
    if (!panel.size) return 0;
    const dims = [panel.size.x || 0, panel.size.y || 0, panel.size.z || 0].sort((a, b) => b - a);
    // Area = length × width (two largest dimensions)
    return (dims[0] * dims[1]) / 1000000; // Convert mm² to m²
}

/**
 * Calculate total edge banding length for a panel
 * @param {Object} panel - Panel data
 * @returns {number} Total edge length in mm
 */
function calculateEdgeLength(panel) {
    if (!panel.edges || !Array.isArray(panel.edges)) return 0;
    return panel.edges.reduce((total, edge) => {
        if (edge.start && edge.end) {
            const dx = edge.end.x - edge.start.x;
            const dy = edge.end.y - edge.start.y;
            return total + Math.sqrt(dx * dx + dy * dy);
        }
        return total;
    }, 0);
}

/**
 * Load and display supply data
 * @param {string} projectId - Project ID
 */
async function loadSupplyData(projectId) {
    const container = document.getElementById('supply-content');
    if (!container) return;

    try {
        const modelData = await loadProjectModelData(projectId);
        const supplyData = extractSupplyData(modelData);

        container.innerHTML = renderSupplyTables(supplyData);
    } catch (error) {
        container.innerHTML = `
            <div class="supply-error">
                <p>Ошибка загрузки данных: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Render supply tables HTML
 * @param {Object} supplyData - Materials and furniture data
 * @returns {string} HTML content
 */
function renderSupplyTables(supplyData) {
    const materials = supplyData.materials || [];
    const furniture = supplyData.furniture || [];

    // Calculate totals
    const totalArea = materials.reduce((sum, m) => sum + (m.area || 0), 0);
    const totalEdge = materials.reduce((sum, m) => sum + (m.edgeLength || 0), 0);
    const totalPanels = materials.reduce((sum, m) => sum + m.count, 0);
    const totalFurniture = furniture.reduce((sum, f) => sum + f.count, 0);

    if (materials.length === 0 && furniture.length === 0) {
        return '<p class="tab-placeholder">Нет данных о материалах и фурнитуре</p>';
    }

    return `
        <div class="supply-content">
            <div class="supply-section">
                <div class="supply-section-header">
                    <h3>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="M3 9h18M9 21V9"/>
                        </svg>
                        Материалы панелей
                    </h3>
                    <span class="supply-badge">${totalPanels} шт</span>
                </div>
                <table class="supply-table">
                    <thead>
                        <tr>
                            <th class="col-name">Материал</th>
                            <th class="col-count">Кол-во</th>
                            <th class="col-area">Площадь</th>
                            <th class="col-edge">Кромка</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materials.map(m => `
                            <tr>
                                <td class="col-name">${m.name}</td>
                                <td class="col-count">${m.count} шт</td>
                                <td class="col-area">${m.area.toFixed(2)} м²</td>
                                <td class="col-edge">${m.edgeLength > 0 ? (m.edgeLength / 1000).toFixed(1) + ' м.п.' : '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td class="col-name"><strong>Итого</strong></td>
                            <td class="col-count"><strong>${totalPanels} шт</strong></td>
                            <td class="col-area"><strong>${totalArea.toFixed(2)} м²</strong></td>
                            <td class="col-edge"><strong>${(totalEdge / 1000).toFixed(1)} м.п.</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="supply-section">
                <div class="supply-section-header">
                    <h3>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                        </svg>
                        Фурнитура
                    </h3>
                    <span class="supply-badge">${totalFurniture} шт</span>
                </div>
                <table class="supply-table supply-table-furniture">
                    <thead>
                        <tr>
                            <th class="col-name">Наименование</th>
                            <th class="col-count">Количество</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${furniture.map(f => `
                            <tr>
                                <td class="col-name">${f.name}</td>
                                <td class="col-count">${f.count} шт</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="totals-row">
                            <td class="col-name"><strong>Итого позиций: ${furniture.length}</strong></td>
                            <td class="col-count"><strong>${totalFurniture} шт</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
}

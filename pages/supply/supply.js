/**
 * Supply Page - Procurement Checklist
 * Read-only access for procurement team via shared link
 */

import { getProject, getProjectMaterials, validateToken } from '../../api/api-client.js';
import { router } from '../../router/router.js';

let container = null;

/**
 * Mount the supply page
 * @param {HTMLElement} parentContainer - Container to mount into
 * @param {Object} params - Route parameters (projectId, token)
 */
export async function mount(parentContainer, params) {
    container = parentContainer;

    const { projectId, token } = router.params;

    // Validate token
    const isValid = await validateToken(projectId, token, 'supply');
    if (!isValid) {
        container.innerHTML = renderAccessDenied();
        return;
    }

    // Load data
    const project = await getProject(projectId);
    const materials = await getProjectMaterials(projectId);

    // Render page
    container.innerHTML = `
        <div class="supply-page">
            <header class="supply-header">
                <div class="supply-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v12M6 12h12"/>
                    </svg>
                    <span>LOGIQA</span>
                </div>
                <div class="supply-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                    Список закупок
                </div>
            </header>
            
            <main class="supply-main">
                <div class="supply-project-info">
                    <h1>${project?.name || 'Project'}</h1>
                    <p class="project-id">${project?.number || projectId}</p>
                    <p class="project-desc">${project?.description || ''}</p>
                </div>
                
                <div class="materials-card">
                    <div class="materials-header">
                        <h2>Необходимые материалы</h2>
                        <div class="materials-progress">
                            <span class="progress-text">${materials.filter(m => m.purchased).length}/${materials.length} поз.</span>
                            <div class="progress-bar-sm">
                                <div class="progress-fill-sm" style="width: ${(materials.filter(m => m.purchased).length / materials.length) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="materials-list">
                        ${materials.map(m => renderMaterialItem(m)).join('')}
                    </div>
                </div>
                
                <div class="supply-footer">
                    <p>Режим просмотра. Для внесения изменений свяжитесь с руководителем проекта.</p>
                    <p class="generated-at">Создано: ${new Date().toLocaleString('ru-RU')}</p>
                </div>
            </main>
        </div>
    `;

    // Bind checkbox events (visual only in read-only mode)
    bindEvents();
}

/**
 * Render material item
 */
function renderMaterialItem(material) {
    return `
        <div class="material-row ${material.purchased ? 'purchased' : ''}" data-id="${material.id}">
            <div class="material-checkbox">
                <input type="checkbox" ${material.purchased ? 'checked' : ''} disabled>
            </div>
            <div class="material-info">
                <span class="material-name">${material.name}</span>
            </div>
            <div class="material-qty">
                <span class="qty-value">${material.quantity}</span>
                <span class="qty-unit">${material.unit}</span>
            </div>
            <div class="material-status">
                ${material.purchased
            ? '<span class="status-done">✓ Закуплено</span>'
            : '<span class="status-pending">Ожидает</span>'}
            </div>
        </div>
    `;
}

/**
 * Render access denied message
 */
function renderAccessDenied() {
    return `
        <div class="access-denied">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            <h2>Доступ запрещён</h2>
            <p>Ссылка недействительна или устарела.</p>
        </div>
    `;
}

/**
 * Bind event handlers
 */
function bindEvents() {
    // Checkboxes are disabled in read-only mode
    // But we could add print functionality etc.
}

/**
 * Unmount the page
 */
export function unmount() {
    container = null;
}

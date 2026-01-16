/**
 * Assembly Page - Assembler's Model List
 * Read-only access for assembly team via shared link
 */

import { getProject, getProjectModels, validateToken } from '../../api/api-client.js';
import { router } from '../../router/router.js';

let container = null;

/**
 * Mount the assembly page
 * @param {HTMLElement} parentContainer - Container to mount into
 * @param {Object} params - Route parameters (projectId, token)
 */
export async function mount(parentContainer, params) {
    container = parentContainer;

    const { projectId, token } = router.params;

    // Validate token
    const isValid = await validateToken(projectId, token, 'assembly');
    if (!isValid) {
        container.innerHTML = renderAccessDenied();
        return;
    }

    // Load data
    const project = await getProject(projectId);
    const models = await getProjectModels(projectId);

    // Render page
    container.innerHTML = `
        <div class="assembly-page">
            <header class="assembly-header">
                <div class="assembly-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v12M6 12h12"/>
                    </svg>
                    <span>LOGIQA</span>
                </div>
                <div class="assembly-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                    </svg>
                    Сборка
                </div>
            </header>
            
            <main class="assembly-main">
                <div class="assembly-project-info">
                    <h1>${project?.name || 'Project'}</h1>
                    <p class="project-id">${project?.number || projectId}</p>
                    <p class="project-desc">${project?.description || ''}</p>
                </div>
                
                <div class="models-section">
                    <h2>3D Модели</h2>
                    <p class="section-desc">Нажмите на модель для просмотра в 3D</p>
                    
                    <div class="models-grid">
                        ${models.map(m => renderModelCard(m, projectId, token)).join('')}
                    </div>
                </div>
                
                <div class="assembly-footer">
                    <p>Режим просмотра. Для внесения изменений свяжитесь с руководителем проекта.</p>
                </div>
            </main>
        </div>
    `;

    // Bind events
    bindEvents(projectId, token);
}

/**
 * Render model card
 */
function renderModelCard(model, projectId, token) {
    const icons = {
        cabinet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M12 9v12"/>',
        countertop: '<rect x="2" y="8" width="20" height="4" rx="1"/><path d="M4 12v6M20 12v6"/>',
        default: '<rect x="3" y="3" width="18" height="18" rx="2"/>'
    };

    return `
        <div class="model-card ${model.hasJson ? '' : 'disabled'}" 
             data-id="${model.id}" 
             data-project="${projectId}" 
             data-token="${token}">
            <div class="model-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    ${icons[model.type] || icons.default}
                </svg>
            </div>
            <div class="model-info">
                <h3>${model.name}</h3>
                <span class="model-type">${model.type}</span>
            </div>
            <div class="model-action">
                ${model.hasJson
            ? '<span class="view-3d">Смотреть 3D →</span>'
            : '<span class="no-model">Нет 3D данных</span>'}
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
function bindEvents(projectId, token) {
    document.querySelectorAll('.model-card:not(.disabled)').forEach(card => {
        card.addEventListener('click', () => {
            const modelId = card.dataset.id;
            router.navigate(`/assembly/${projectId}/${token}/${modelId}`);
        });
    });
}

/**
 * Unmount the page
 */
export function unmount() {
    container = null;
}

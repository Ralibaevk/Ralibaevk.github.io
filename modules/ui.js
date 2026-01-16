/**
 * UI Module
 * Handles UI updates and button event binding
 */

import state from './state.js';
import { toggleCameraMode, setView } from './camera.js';
import { toggleWireframe, toggleExplode, resetViewState } from './view-controls.js';
import { showOnlySelected, hideSelected, showAll } from './visibility.js';
import { showBlockLabels, showPanelLabels, hideLabels } from './labels.js';
import { clearSelection, highlightMesh, updateSelectionInfo } from './selection.js';

/**
 * Update UI with model information
 */
export function updateUI() {
    if (!state.modelData) return;

    const data = state.modelData;

    // Update model info (without furniture count)
    const modelInfo = document.getElementById('model-info');
    if (modelInfo) {
        const panelCount = data.panels ? data.panels.length : 0;
        const blockCount = data.blocks ? data.blocks.length : 0;
        const extrusionCount = data.extrusions ? data.extrusions.length : 0;

        modelInfo.innerHTML = `
            <p><strong>Модель:</strong> ${data.model?.name || 'Без названия'}</p>
            <p><strong>Блоков:</strong> ${blockCount}</p>
            <p><strong>Панелей:</strong> ${panelCount}</p>
            ${extrusionCount > 0 ? `<p><strong>Профилей:</strong> ${extrusionCount}</p>` : ''}
        `;
    }

    // Update materials list with enhanced info
    updateMaterialsList();
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
 * Normalize material name by removing carriage returns and taking first part
 * @param {string} name - Raw material name
 * @returns {string} - Normalized name
 */
function normalizeMaterialName(name) {
    if (!name) return 'Без материала';
    // Material names may contain \r separating name from article code
    // Take only the first part (the actual name)
    return name.split('\r')[0].trim();
}

/**
 * Update materials list with enhanced information
 */
function updateMaterialsList() {
    const materialsList = document.getElementById('materials-list');
    if (!materialsList || !state.modelData) return;

    const data = state.modelData;
    const materials = new Map();

    if (data.panels) {
        data.panels.forEach(panel => {
            const rawName = panel.material?.name || panel.materialName || 'Без материала';
            const matName = normalizeMaterialName(rawName);
            if (!materials.has(matName)) {
                materials.set(matName, {
                    count: 0,
                    area: 0,
                    edgeLength: 0,
                    color: state.materialColorMap[matName]
                });
            }
            const matInfo = materials.get(matName);
            matInfo.count++;
            matInfo.area += calculatePanelArea(panel);
            matInfo.edgeLength += calculateEdgeLength(panel);
        });
    }

    let html = '';
    materials.forEach((info, name) => {
        const colorHex = info.color ? `#${info.color.toString(16).padStart(6, '0')}` : '#888888';
        const areaFormatted = info.area.toFixed(2);
        const edgeFormatted = (info.edgeLength / 1000).toFixed(1); // Convert to meters
        // Escape quotes for HTML attribute
        const nameAttr = name.replace(/"/g, '&quot;');

        html += `
            <div class="material-item" data-material-name="${nameAttr}">
                <div class="material-main" title="Кликните для выделения всех панелей">
                    <span class="material-color" style="background-color: ${colorHex}"></span>
                    <div class="material-info">
                        <span class="material-name">${name}</span>
                        <span class="material-stats">${info.count} шт · ${areaFormatted} м² · ${edgeFormatted} м.п.</span>
                    </div>
                </div>
                <button class="material-delete-btn" title="Скрыть материал">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `;
    });

    materialsList.innerHTML = html;

    // Bind click events for material selection
    materialsList.querySelectorAll('.material-main').forEach(el => {
        el.addEventListener('click', () => {
            const materialName = el.closest('.material-item').dataset.materialName;
            selectPanelsByMaterial(materialName);
        });
    });

    // Bind delete button events
    materialsList.querySelectorAll('.material-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const materialName = btn.closest('.material-item').dataset.materialName;
            if (confirm(`Скрыть все панели из материала "${materialName}"?`)) {
                hidePanelsByMaterial(materialName);
                btn.closest('.material-item').classList.add('hidden');
            }
        });
    });
}

/**
 * Select all panels by material name
 * @param {string} materialName - Material name
 */
function selectPanelsByMaterial(materialName) {
    // Clear current selection using proper function
    clearSelection();

    // Find and select panels with matching material
    state.meshes.forEach((mesh) => {
        if (mesh.userData.type === 'panel' && mesh.userData.data) {
            const rawMaterial = mesh.userData.data.material?.name || mesh.userData.data.materialName || 'Без материала';
            const panelMaterial = normalizeMaterialName(rawMaterial);
            if (panelMaterial === materialName) {
                state.selectedMeshes.add(mesh);
                highlightMesh(mesh, true);
            }
        }
    });

    // Update selection info
    updateSelectionInfo();

    // КРИТИЧЕСКИ ВАЖНО: Принудительный рендер
    requestAnimationFrame(() => {
        if (state.renderer && state.scene && state.camera) {
            state.renderer.render(state.scene, state.camera);
        }
    });
}

/**
 * Hide all panels by material name
 * @param {string} materialName - Material name
 */
function hidePanelsByMaterial(materialName) {
    state.meshes.forEach(mesh => {
        if (mesh.userData.type === 'panel' && mesh.userData.data) {
            const rawMaterial = mesh.userData.data.material?.name || mesh.userData.data.materialName || 'Без материала';
            const panelMaterial = normalizeMaterialName(rawMaterial);
            if (panelMaterial === materialName) {
                mesh.visible = false;
            }
        }
    });
}

/**
 * Bind event listeners to UI buttons
 */
export function bindUIEvents() {
    // Camera mode toggle
    const btnCamMode = document.getElementById('btn-cam-mode');
    if (btnCamMode) {
        btnCamMode.addEventListener('click', toggleCameraMode);
    }

    // Wireframe toggle
    const btnWireframe = document.getElementById('btn-wireframe');
    if (btnWireframe) {
        btnWireframe.addEventListener('click', toggleWireframe);
    }

    // Explode toggle
    const btnExplode = document.getElementById('btn-explode');
    if (btnExplode) {
        btnExplode.addEventListener('click', toggleExplode);
    }

    // Reset view
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', resetViewState);
    }

    // View direction buttons
    const viewButtons = {
        'btn-view-front': 'front',
        'btn-view-back': 'back',
        'btn-view-left': 'left',
        'btn-view-right': 'right',
        'btn-view-top': 'top',
        'btn-view-bottom': 'bottom'
    };

    Object.entries(viewButtons).forEach(([btnId, direction]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => setView(direction));
        }
    });

    // Visibility controls
    const btnShowOnly = document.getElementById('btn-show-only');
    if (btnShowOnly) {
        btnShowOnly.addEventListener('click', showOnlySelected);
    }

    const btnHide = document.getElementById('btn-hide');
    if (btnHide) {
        btnHide.addEventListener('click', hideSelected);
    }

    const btnShowAll = document.getElementById('btn-show-all');
    if (btnShowAll) {
        btnShowAll.addEventListener('click', showAll);
    }

    // Label controls
    const btnBlockLabels = document.getElementById('btn-block-labels');
    if (btnBlockLabels) {
        btnBlockLabels.addEventListener('click', showBlockLabels);
    }

    const btnPanelLabels = document.getElementById('btn-panel-labels');
    if (btnPanelLabels) {
        btnPanelLabels.addEventListener('click', showPanelLabels);
    }

    const btnHideLabels = document.getElementById('btn-hide-labels');
    if (btnHideLabels) {
        btnHideLabels.addEventListener('click', hideLabels);
    }

    // Edge banding visibility toggle
    const btnToggleEdges = document.getElementById('btn-toggle-edges');
    if (btnToggleEdges) {
        btnToggleEdges.addEventListener('click', () => {
            import('./visibility.js').then(module => {
                const isActive = btnToggleEdges.classList.toggle('active');
                module.toggleEdgeBandingVisibility(isActive);
            });
        });
    }

    // Furniture visibility toggle
    const btnToggleFurniture = document.getElementById('btn-toggle-furniture');
    if (btnToggleFurniture) {
        btnToggleFurniture.addEventListener('click', () => {
            import('./visibility.js').then(module => {
                const isActive = btnToggleFurniture.classList.toggle('active');
                module.toggleFurnitureVisibility(isActive);
            });
        });
    }
}

/**
 * Show/hide UI panels
 * @param {boolean} show - Show or hide
 */
export function toggleUIPanels(show) {
    const panels = ['info-panel', 'structure-panel'];

    panels.forEach(id => {
        const panel = document.getElementById(id);
        if (panel) {
            panel.style.display = show ? 'block' : 'none';
        }
    });

    // Top toolbar needs flex display
    const topToolbar = document.getElementById('top-toolbar');
    if (topToolbar) {
        topToolbar.style.display = show ? 'flex' : 'none';
    }

    // Panel toggle buttons
    const toggleBtns = ['btn-toggle-left-panel', 'btn-toggle-right-panel'];
    toggleBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.style.display = show ? 'flex' : 'none';
            if (show) btn.classList.add('active');
        }
    });

    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        dropZone.style.display = show ? 'none' : 'flex';
    }
}

export default {
    updateUI,
    bindUIEvents,
    toggleUIPanels
};

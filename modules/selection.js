/**
 * Selection Module
 * Handles object selection via mouse click and tree
 */

import state from './state.js';
import CONFIG from './config.js';
import { updateLabels } from './labels.js';

/**
 * Initialize raycaster and mouse event listeners
 */
export function initSelection() {
    state.raycaster = new THREE.Raycaster();
    state.mouse = new THREE.Vector2();

    document.addEventListener('click', onMouseClick);
}

/**
 * Handle mouse click for selection
 * @param {MouseEvent} event
 */
function onMouseClick(event) {
    // Ignore clicks on UI elements
    if (event.target.closest('#info-panel') ||
        event.target.closest('#structure-panel') ||
        event.target.closest('#materials-panel') ||
        event.target.closest('.tree-node') ||
        event.target.tagName === 'BUTTON' ||
        event.target.tagName === 'INPUT') {
        return;
    }

    // Calculate mouse position in normalized device coordinates
    state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray
    state.raycaster.setFromCamera(state.mouse, state.activeCamera);

    // Find intersected objects
    const intersects = state.raycaster.intersectObjects(state.meshes, true);

    if (intersects.length > 0) {
        // Find the actual mesh (could be edge banding child)
        let selectedObject = intersects[0].object;
        while (selectedObject.parent && !state.meshes.includes(selectedObject)) {
            selectedObject = selectedObject.parent;
        }

        if (state.meshes.includes(selectedObject)) {
            // Ctrl+click for multi-select
            if (event.ctrlKey || event.metaKey) {
                toggleSelection(selectedObject);
            } else {
                selectSingle(selectedObject);
            }
        }
    } else {
        // Click on empty space clears selection
        if (!event.ctrlKey && !event.metaKey) {
            clearSelection();
        }
    }

    updateSelectionInfo();
}

/**
 * Select a single mesh (clear previous selection)
 * @param {THREE.Mesh} mesh
 */
function selectSingle(mesh) {
    clearSelection();
    addToSelection(mesh);

    // Sync with tree
    syncTreeHighlight(mesh);
}

/**
 * Toggle mesh selection state
 * @param {THREE.Mesh} mesh
 */
function toggleSelection(mesh) {
    if (state.selectedMeshes.has(mesh)) {
        removeFromSelection(mesh);
    } else {
        addToSelection(mesh);
    }
}

/**
 * Add mesh to selection
 * @param {THREE.Mesh} mesh
 */
function addToSelection(mesh) {
    state.selectedMeshes.add(mesh);
    highlightMesh(mesh, true);
}

/**
 * Remove mesh from selection
 * @param {THREE.Mesh} mesh
 */
function removeFromSelection(mesh) {
    state.selectedMeshes.delete(mesh);
    highlightMesh(mesh, false);
}

/**
 * Clear all selections
 */
export function clearSelection() {
    state.selectedMeshes.forEach(mesh => {
        highlightMesh(mesh, false);
    });
    state.selectedMeshes.clear();

    // Clear tree highlights
    document.querySelectorAll('.tree-node, .tree-panel, .tree-furniture').forEach(el => {
        el.classList.remove('selected');
    });

    updateSelectionInfo();
}

/**
 * Highlight or unhighlight a mesh
 * @param {THREE.Mesh} mesh
 * @param {boolean} highlight
 */
export function highlightMesh(mesh, highlight) {
    if (!mesh || !mesh.material) {
        console.warn('highlightMesh: invalid mesh', mesh);
        return;
    }

    if (highlight) {
        // Сохраняем оригинальный материал ПЕРЕД изменением (не клонируем!)
        if (!mesh.userData.originalMaterial) {
            if (Array.isArray(mesh.material)) {
                mesh.userData.originalMaterial = mesh.material.slice(); // Копируем массив ссылок
            } else {
                mesh.userData.originalMaterial = mesh.material;
            }
        }

        // Создаём НОВЫЙ яркий материал для подсветки
        const highlightMaterial = new THREE.MeshStandardMaterial({
            color: CONFIG.selectionEmissive,
            transparent: true,
            opacity: 0.85,
            metalness: 0.0,
            roughness: 0.2,
            emissive: CONFIG.selectionEmissive,
            emissiveIntensity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: true // Теперь пишем в depth buffer для видимости
        });

        // Применяем материал
        if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map(() => highlightMaterial.clone());
        } else {
            mesh.material = highlightMaterial;
        }

        console.log('Highlighted mesh:', mesh.uuid, 'material id:', mesh.material.id);

    } else {
        // Восстанавливаем оригинальный материал
        if (mesh.userData.originalMaterial) {
            mesh.material = mesh.userData.originalMaterial;
            delete mesh.userData.originalMaterial;
            console.log('Restored mesh:', mesh.uuid);
        }
    }

    // Подсвечиваем дочерние элементы (edge banding, etc.)
    mesh.traverse(child => {
        if (child !== mesh && child.isMesh && child.material) {
            applyChildHighlight(child, highlight);
        }
    });
}

/**
 * Apply highlight effect to child meshes (edge banding, etc.)
 * @param {THREE.Mesh} mesh
 * @param {boolean} highlight
 */
function applyChildHighlight(mesh, highlight) {
    if (!mesh.material) return;

    if (highlight) {
        // Сохраняем оригинальный материал
        if (!mesh.userData.originalMaterial) {
            mesh.userData.originalMaterial = mesh.material;
        }

        // Применяем emissive к дочернему материалу
        const childHighlight = mesh.material.clone();
        childHighlight.emissive = new THREE.Color(CONFIG.selectionEmissive);
        childHighlight.emissiveIntensity = 0.3;
        mesh.material = childHighlight;
    } else {
        // Восстанавливаем оригинальный материал
        if (mesh.userData.originalMaterial) {
            mesh.material = mesh.userData.originalMaterial;
            delete mesh.userData.originalMaterial;
        }
    }
}

/**
 * Select block by ID (from tree)
 * @param {string} blockId
 */
export function selectBlock(blockId) {
    clearSelection();

    const meshes = state.meshByBlockId[blockId] || [];
    meshes.forEach(mesh => {
        addToSelection(mesh);
    });

    const furniture = state.furnitureByBlockId[blockId] || [];
    furniture.forEach(mesh => {
        addToSelection(mesh);
    });

    // Highlight in tree
    highlightInTree('block', blockId);

    updateSelectionInfo();
    updateLabels();
}

/**
 * Select panel by ID (from tree)
 * @param {string} panelId
 */
export function selectPanel(panelId) {
    clearSelection();

    const mesh = state.meshByPanelId[panelId];
    if (mesh) {
        addToSelection(mesh);
    }

    // Highlight in tree
    highlightInTree('panel', panelId);

    updateSelectionInfo();
}

/**
 * Select furniture by ID (from tree)
 * @param {string} furnitureId
 */
export function selectFurniture(furnitureId) {
    clearSelection();

    const mesh = state.meshByFurnitureId[furnitureId];
    if (mesh) {
        addToSelection(mesh);
    }

    // Highlight in tree
    highlightInTree('furniture', furnitureId);

    updateSelectionInfo();
}

/**
 * Select extrusion profile by ID (from tree)
 * @param {string} extrusionId
 */
export function selectExtrusion(extrusionId) {
    clearSelection();

    const mesh = state.meshByExtrusionId[extrusionId];
    if (mesh) {
        addToSelection(mesh);
    }

    // Highlight in tree
    highlightInTree('extrusion', extrusionId);

    updateSelectionInfo();
}

/**
 * Sync tree highlighting based on selected mesh
 * @param {THREE.Mesh} mesh
 */
function syncTreeHighlight(mesh) {
    if (!mesh || !mesh.userData) return;

    const userData = mesh.userData;

    // Find the ID based on mesh type
    if (userData.type === 'panel' && userData.data) {
        highlightInTree('panel', userData.data.id);
    } else if (userData.type === 'furniture' && userData.data) {
        highlightInTree('furniture', userData.data.id);
    } else if (userData.type === 'extrusionProfile' && userData.data) {
        highlightInTree('extrusion', userData.data.id);
    } else if (userData.blockId) {
        highlightInTree('block', userData.blockId);
    }
}

/**
 * Highlight element in tree by type and ID
 * @param {string} type - 'block', 'panel', or 'furniture'
 * @param {string} id - Element ID
 */
function highlightInTree(type, id) {
    // Clear all selections in tree
    document.querySelectorAll('.tree-node, .tree-panel, .tree-furniture').forEach(el => {
        el.classList.remove('selected');
    });

    // Add selection to matching element
    const selector = `[data-${type}-id="${id}"]`;
    const element = document.querySelector(selector);
    if (element) {
        element.classList.add('selected');
    }
}

/**
 * Update selection info panel with detailed information
 */
export function updateSelectionInfo() {
    const infoContent = document.getElementById('selection-info');
    if (!infoContent) return;

    if (state.selectedMeshes.size === 0) {
        infoContent.innerHTML = '<p class="selection-empty">Ничего не выбрано</p>';
        return;
    }

    if (state.selectedMeshes.size === 1) {
        const mesh = Array.from(state.selectedMeshes)[0];
        renderSingleSelection(infoContent, mesh);
    } else {
        renderMultiSelection(infoContent);
    }
}

/**
 * Render single selection info
 * @param {HTMLElement} container - Container element
 * @param {THREE.Mesh} mesh - Selected mesh
 */
function renderSingleSelection(container, mesh) {
    const data = mesh.userData.data;
    const type = mesh.userData.type;

    if (type === 'panel' && data) {
        // Sort dimensions: length > width > thickness
        const dims = [data.size?.x || 0, data.size?.y || 0, data.size?.z || 0].sort((a, b) => b - a);
        const length = dims[0].toFixed(0);
        const width = dims[1].toFixed(0);

        // Calculate CORRECT thickness from material.thickness or geometry bounds
        // This fixes Bazis export bug where size.z may contain incorrect values
        let thickness;
        if (data.highZ !== undefined && data.lowZ !== undefined) {
            // Preferred: use actual geometry bounds
            thickness = Math.round(data.highZ - data.lowZ);
        } else if (data.material?.thickness) {
            // Use material thickness property
            thickness = Math.round(data.material.thickness);
        } else {
            // Last resort: use smallest dimension (legacy behavior)
            thickness = dims[2].toFixed(0);
        }

        // Normalize material name (remove \r and article code)
        const rawMaterialName = data.material?.name || 'Не указан';
        const materialName = rawMaterialName.split('\r')[0].trim();

        // Calculate area
        const area = ((dims[0] * dims[1]) / 1000000).toFixed(3);

        // Calculate edge length
        let edgeLength = 0;
        let edgeCount = 0;
        if (data.edges && Array.isArray(data.edges)) {
            edgeCount = data.edges.length;
            data.edges.forEach(edge => {
                if (edge.start && edge.end) {
                    const dx = edge.end.x - edge.start.x;
                    const dy = edge.end.y - edge.start.y;
                    edgeLength += Math.sqrt(dx * dx + dy * dy);
                }
            });
        }
        const edgeLengthM = (edgeLength / 1000).toFixed(2);

        // Check for grooves
        const hasGrooves = data.contourTopology?.innerContours?.length > 0 ||
            data.grooves?.length > 0 ||
            data.notches?.length > 0;

        // Find parent block
        let blockInfo = '';
        if (mesh.userData.blockId && state.modelData?.blocks) {
            const block = state.modelData.blocks.find(b => b.id === mesh.userData.blockId);
            if (block) {
                blockInfo = `<div class="info-row"><span class="info-label">Блок:</span><span class="info-value">${block.name || block.positionNumber || block.id}</span></div>`;
            }
        }

        container.innerHTML = `
            <div class="selection-panel-info">
                <div class="selection-title">${data.name || data.positionNumber || 'Панель'}</div>
                <div class="info-row"><span class="info-label">Размеры:</span><span class="info-value">${length} × ${width} × ${thickness} мм</span></div>
                <div class="info-row"><span class="info-label">Материал:</span><span class="info-value">${materialName}</span></div>
                <div class="info-row"><span class="info-label">Площадь:</span><span class="info-value">${area} м²</span></div>
                <div class="info-row"><span class="info-label">Кромка:</span><span class="info-value">${edgeCount > 0 ? `${edgeCount} шт (${edgeLengthM} м.п.)` : 'Нет'}</span></div>
                <div class="info-row"><span class="info-label">Пазы:</span><span class="info-value">${hasGrooves ? 'Есть' : 'Нет'}</span></div>
                ${blockInfo}
            </div>
        `;
    } else if (type === 'block' && data) {
        // Calculate block bounds
        const blockMeshes = state.meshByBlockId[data.id] || [];
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        blockMeshes.forEach(m => {
            const box = new THREE.Box3().setFromObject(m);
            minX = Math.min(minX, box.min.x);
            minY = Math.min(minY, box.min.y);
            minZ = Math.min(minZ, box.min.z);
            maxX = Math.max(maxX, box.max.x);
            maxY = Math.max(maxY, box.max.y);
            maxZ = Math.max(maxZ, box.max.z);
        });

        const sizeX = (maxX - minX).toFixed(0);
        const sizeY = (maxY - minY).toFixed(0);
        const sizeZ = (maxZ - minZ).toFixed(0);

        container.innerHTML = `
            <div class="selection-block-info">
                <div class="selection-title">Блок ${data.name || data.positionNumber || data.id}</div>
                <div class="info-row"><span class="info-label">Габариты:</span><span class="info-value">${sizeX} × ${sizeY} × ${sizeZ} мм</span></div>
                <div class="info-row"><span class="info-label">Панелей:</span><span class="info-value">${blockMeshes.length}</span></div>
            </div>
        `;
    } else if (type === 'furniture' && data) {
        container.innerHTML = `
            <div class="selection-furniture-info">
                <div class="selection-title">${data.name || 'Фурнитура'}</div>
                <div class="info-row"><span class="info-label">Тип:</span><span class="info-value">${data.type || 'Не указан'}</span></div>
            </div>
        `;
    } else if (type === 'extrusionProfile' && data) {
        // Extrusion profile info
        const lengthMm = data.thickness || 0;
        const lengthM = (lengthMm / 1000).toFixed(2);
        const contourElements = data.contour?.length || 0;

        container.innerHTML = `
            <div class="selection-extrusion-info">
                <div class="selection-title">${data.name || 'Профиль'}</div>
                <div class="info-row"><span class="info-label">Длина:</span><span class="info-value">${lengthM} м</span></div>
                <div class="info-row"><span class="info-label">Элементов контура:</span><span class="info-value">${contourElements}</span></div>
            </div>
        `;
    } else {
        container.innerHTML = '<p>Выбран объект</p>';
    }
}

/**
 * Render multi-selection info grouped by material
 * @param {HTMLElement} container - Container element
 */
function renderMultiSelection(container) {
    const materials = new Map();
    let totalArea = 0;
    let totalEdge = 0;

    state.selectedMeshes.forEach(mesh => {
        if (mesh.userData.type === 'panel' && mesh.userData.data) {
            const data = mesh.userData.data;
            const rawMatName = data.material?.name || 'Без материала';
            const matName = rawMatName.split('\r')[0].trim() || 'Без материала';

            if (!materials.has(matName)) {
                materials.set(matName, { count: 0, area: 0, edgeLength: 0 });
            }

            const matInfo = materials.get(matName);
            matInfo.count++;

            // Calculate area
            if (data.size) {
                const dims = [data.size.x || 0, data.size.y || 0, data.size.z || 0].sort((a, b) => b - a);
                const area = (dims[0] * dims[1]) / 1000000;
                matInfo.area += area;
                totalArea += area;
            }

            // Calculate edge length
            if (data.edges && Array.isArray(data.edges)) {
                data.edges.forEach(edge => {
                    if (edge.start && edge.end) {
                        const dx = edge.end.x - edge.start.x;
                        const dy = edge.end.y - edge.start.y;
                        const len = Math.sqrt(dx * dx + dy * dy);
                        matInfo.edgeLength += len;
                        totalEdge += len;
                    }
                });
            }
        }
    });

    let html = `<div class="selection-title">Выбрано: ${state.selectedMeshes.size} объектов</div>`;

    if (materials.size > 0) {
        html += '<div class="selection-materials">';
        materials.forEach((info, name) => {
            html += `
                <div class="selection-material-item">
                    <span class="material-name">${name}</span>
                    <span class="material-details">${info.count} шт · ${info.area.toFixed(2)} м² · ${(info.edgeLength / 1000).toFixed(1)} м.п.</span>
                </div>
            `;
        });
        html += '</div>';

        html += `
            <div class="selection-totals">
                <div class="info-row"><span class="info-label">Всего площадь:</span><span class="info-value">${totalArea.toFixed(2)} м²</span></div>
                <div class="info-row"><span class="info-label">Всего кромка:</span><span class="info-value">${(totalEdge / 1000).toFixed(1)} м.п.</span></div>
            </div>
        `;
    }

    container.innerHTML = html;
}

export default {
    initSelection,
    clearSelection,
    selectBlock,
    selectPanel,
    selectFurniture,
    selectExtrusion,
    updateSelectionInfo,
    highlightMesh
};

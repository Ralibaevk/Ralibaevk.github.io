/**
 * Tree Module
 * Builds and manages the structure tree UI
 */

import state from './state.js';
import { selectBlock, selectPanel, selectFurniture, selectExtrusion, clearSelection } from './selection.js';

/**
 * Build the structure tree in the UI
 */
export function buildStructureTree() {
    const treeContainer = document.getElementById('structure-tree');
    if (!treeContainer) return;

    treeContainer.innerHTML = '';

    if (!state.modelData) return;

    const data = state.modelData;

    // Create tree structure
    if (data.blocks && data.blocks.length > 0) {
        data.blocks.forEach((block, blockIndex) => {
            const blockNode = createBlockNode(block, blockIndex);
            treeContainer.appendChild(blockNode);
        });
    }

    // Add orphan panels (not in any block)
    const orphanPanels = getOrphanPanels(data);
    if (orphanPanels.length > 0) {
        const orphanNode = createOrphanPanelsNode(orphanPanels);
        treeContainer.appendChild(orphanNode);
    }

    // Add furniture section
    if (data.furniture && data.furniture.length > 0) {
        const furnitureNode = createFurnitureSection(data.furniture);
        treeContainer.appendChild(furnitureNode);
    }

    // Add extrusions (profiles) section
    if (data.extrusions && data.extrusions.length > 0) {
        const extrusionsNode = createExtrusionsSection(data.extrusions);
        treeContainer.appendChild(extrusionsNode);
    }
}

/**
 * Create block node element
 * @param {Object} block - Block data
 * @param {number} index - Block index
 * @returns {HTMLElement}
 */
function createBlockNode(block, index) {
    const node = document.createElement('div');
    node.className = 'tree-node';
    node.dataset.blockId = block.id;

    const header = document.createElement('div');
    header.className = 'tree-node-header';

    // Expand/collapse toggle
    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    toggle.onclick = (e) => {
        e.stopPropagation();
        toggleNode(node);
    };

    // Visibility checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.className = 'tree-checkbox';
    checkbox.onclick = (e) => {
        e.stopPropagation();
        toggleBlockVisibility(block.id, checkbox.checked);
    };

    // Block name
    const name = document.createElement('span');
    name.className = 'tree-node-name';
    name.textContent = block.name || `Блок ${index + 1}`;
    name.onclick = () => selectBlock(block.id);

    header.appendChild(toggle);
    header.appendChild(checkbox);
    header.appendChild(name);
    node.appendChild(header);

    // Children container
    const children = document.createElement('div');
    children.className = 'tree-children';
    children.style.display = 'none';

    // Add panels from childPanelIds
    if (block.childPanelIds && block.childPanelIds.length > 0 && state.modelData.panels) {
        block.childPanelIds.forEach(panelId => {
            const panel = state.modelData.panels.find(p => p.id === panelId);
            if (panel) {
                const panelNode = createPanelNode(panel);
                children.appendChild(panelNode);
            }
        });
    }

    // Add furniture from childFurnitureIds - GROUPED BY NAME
    if (block.childFurnitureIds && block.childFurnitureIds.length > 0 && state.modelData.furniture) {
        // Group furniture by name
        const furnitureGroups = new Map();
        block.childFurnitureIds.forEach(furnId => {
            const item = state.modelData.furniture.find(f => f.id === furnId);
            if (item) {
                const groupName = item.name || 'Фурнитура';
                if (!furnitureGroups.has(groupName)) {
                    furnitureGroups.set(groupName, { items: [], ids: [] });
                }
                furnitureGroups.get(groupName).items.push(item);
                furnitureGroups.get(groupName).ids.push(item.id);
            }
        });

        // Create grouped furniture nodes
        furnitureGroups.forEach((group, groupName) => {
            const furnitureNode = createGroupedFurnitureNode(groupName, group.items, group.ids);
            children.appendChild(furnitureNode);
        });
    }

    node.appendChild(children);

    return node;
}

function createPanelNode(panel) {
    const node = document.createElement('div');
    node.className = 'tree-node tree-panel';
    node.dataset.panelId = panel.id;

    // Visibility checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.className = 'tree-checkbox';
    checkbox.onclick = (e) => {
        e.stopPropagation();
        togglePanelVisibility(panel.id, checkbox.checked);
    };

    // Panel content wrapper
    const content = document.createElement('div');
    content.className = 'tree-panel-content';
    content.onclick = () => selectPanel(panel.id);

    // Panel name with position number
    const name = document.createElement('span');
    name.className = 'tree-panel-name';
    const posNum = panel.positionNumber ? ` [${panel.positionNumber}]` : '';
    name.textContent = (panel.name || 'Панель') + posNum;

    // Panel details (dimensions, thickness, material)
    const details = document.createElement('div');
    details.className = 'tree-panel-details';

    // Calculate dimensions
    const dims = [panel.size?.x || 0, panel.size?.y || 0, panel.size?.z || 0].sort((a, b) => b - a);
    const length = Math.round(dims[0]);
    const width = Math.round(dims[1]);

    // Calculate thickness (prefer material.thickness)
    let thickness;
    if (panel.highZ !== undefined && panel.lowZ !== undefined) {
        thickness = Math.round(panel.highZ - panel.lowZ);
    } else if (panel.material?.thickness) {
        thickness = Math.round(panel.material.thickness);
    } else {
        thickness = Math.round(dims[2]);
    }

    // Get material name (normalized)
    const rawMaterial = panel.material?.name || panel.materialName || '';
    const materialName = rawMaterial.split('\r')[0].trim();

    details.innerHTML = `<span>${length} × ${width} мм</span><span>Толщина: ${thickness} мм</span>`;
    if (materialName) {
        details.innerHTML += `<span class="tree-panel-material">${materialName}</span>`;
    }

    content.appendChild(name);
    content.appendChild(details);

    node.appendChild(checkbox);
    node.appendChild(content);

    return node;
}

/**
 * Create grouped furniture node element (shows name and count)
 * @param {string} groupName - Group name
 * @param {Array} items - Furniture items in this group
 * @param {Array} ids - IDs of furniture items
 * @returns {HTMLElement}
 */
function createGroupedFurnitureNode(groupName, items, ids) {
    const node = document.createElement('div');
    node.className = 'tree-node tree-furniture-group';
    // Store all IDs for visibility toggle
    node.dataset.furnitureIds = ids.join(',');

    // Visibility checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.className = 'tree-checkbox';
    checkbox.onclick = (e) => {
        e.stopPropagation();
        // Toggle visibility for all items in group
        ids.forEach(id => toggleFurnitureVisibility(id, checkbox.checked));
    };

    // Furniture content wrapper
    const content = document.createElement('div');
    content.className = 'tree-furniture-content';
    content.onclick = () => {
        // Select first item from group
        if (ids.length > 0) {
            selectFurniture(ids[0]);
        }
    };

    // Furniture name
    const name = document.createElement('span');
    name.className = 'tree-furniture-name';
    name.textContent = groupName;

    // Furniture count
    const count = document.createElement('span');
    count.className = 'tree-furniture-count';
    count.textContent = items.length > 1 ? `×${items.length}` : '';

    content.appendChild(name);
    content.appendChild(count);

    node.appendChild(checkbox);
    node.appendChild(content);

    return node;
}

/**
 * Create furniture node element
 * @param {Object} item - Furniture data
 * @returns {HTMLElement}
 */
function createFurnitureNode(item) {
    const node = document.createElement('div');
    node.className = 'tree-node tree-furniture';
    node.dataset.furnitureId = item.id;

    // Visibility checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.className = 'tree-checkbox';
    checkbox.onclick = (e) => {
        e.stopPropagation();
        toggleFurnitureVisibility(item.id, checkbox.checked);
    };

    // Furniture name
    const name = document.createElement('span');
    name.className = 'tree-node-name';
    name.textContent = item.name || `Фурнитура ${item.id}`;
    name.onclick = () => selectFurniture(item.id);

    node.appendChild(checkbox);
    node.appendChild(name);

    return node;
}

/**
 * Get panels not assigned to any block
 * @param {Object} data - Model data
 * @returns {Array}
 */
function getOrphanPanels(data) {
    if (!data.panels) return [];

    const assignedPanels = new Set();
    if (data.blocks) {
        data.blocks.forEach(block => {
            if (block.childPanelIds) {
                block.childPanelIds.forEach(pid => assignedPanels.add(pid));
            }
        });
    }

    return data.panels.filter(p => !assignedPanels.has(p.id));
}

/**
 * Create orphan panels section
 * @param {Array} panels - Orphan panels
 * @returns {HTMLElement}
 */
function createOrphanPanelsNode(panels) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const header = document.createElement('div');
    header.className = 'tree-node-header';

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    toggle.onclick = (e) => {
        e.stopPropagation();
        toggleNode(node);
    };

    const name = document.createElement('span');
    name.className = 'tree-node-name';
    name.textContent = 'Прочие панели';

    header.appendChild(toggle);
    header.appendChild(name);
    node.appendChild(header);

    const children = document.createElement('div');
    children.className = 'tree-children';
    children.style.display = 'none';

    panels.forEach(panel => {
        const panelNode = createPanelNode(panel);
        children.appendChild(panelNode);
    });

    node.appendChild(children);

    return node;
}

/**
 * Create furniture section
 * @param {Array} furniture - Furniture items
 * @returns {HTMLElement}
 */
function createFurnitureSection(furniture) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const header = document.createElement('div');
    header.className = 'tree-node-header';

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    toggle.onclick = (e) => {
        e.stopPropagation();
        toggleNode(node);
    };

    const name = document.createElement('span');
    name.className = 'tree-node-name';
    name.textContent = 'Фурнитура';

    header.appendChild(toggle);
    header.appendChild(name);
    node.appendChild(header);

    const children = document.createElement('div');
    children.className = 'tree-children';
    children.style.display = 'none';

    // Only show furniture not assigned to blocks
    furniture.forEach(item => {
        if (!item.parentBlockId) {
            const furnitureNode = createFurnitureNode(item);
            children.appendChild(furnitureNode);
        }
    });

    node.appendChild(children);

    return node;
}

/**
 * Toggle node expand/collapse
 * @param {HTMLElement} node - Tree node
 */
function toggleNode(node) {
    const children = node.querySelector('.tree-children');
    const toggle = node.querySelector('.tree-toggle');

    if (children) {
        const isHidden = children.style.display === 'none';
        children.style.display = isHidden ? 'block' : 'none';
        if (toggle) {
            // Rotate SVG icon instead of changing text
            toggle.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
        }
    }
}

/**
 * Toggle block visibility
 * @param {string} blockId - Block ID
 * @param {boolean} visible - Visibility state
 */
function toggleBlockVisibility(blockId, visible) {
    const meshes = state.meshByBlockId[blockId] || [];
    meshes.forEach(mesh => {
        mesh.visible = visible;
    });

    const furniture = state.furnitureByBlockId[blockId] || [];
    furniture.forEach(mesh => {
        mesh.visible = visible;
    });
}

/**
 * Toggle panel visibility
 * @param {string} panelId - Panel ID
 * @param {boolean} visible - Visibility state
 */
function togglePanelVisibility(panelId, visible) {
    const mesh = state.meshByPanelId[panelId];
    if (mesh) {
        mesh.visible = visible;
    }
}

/**
 * Toggle furniture visibility
 * @param {string} furnitureId - Furniture ID
 * @param {boolean} visible - Visibility state
 */
function toggleFurnitureVisibility(furnitureId, visible) {
    const mesh = state.meshByFurnitureId[furnitureId];
    if (mesh) {
        mesh.visible = visible;
    }
}

/**
 * Toggle extrusion visibility
 * @param {string} extrusionId - Extrusion ID
 * @param {boolean} visible - Visibility state
 */
function toggleExtrusionVisibility(extrusionId, visible) {
    const mesh = state.meshByExtrusionId[extrusionId];
    if (mesh) {
        mesh.visible = visible;
    }
}

/**
 * Create extrusions (profiles) section
 * @param {Array} extrusions - Extrusion items
 * @returns {HTMLElement}
 */
function createExtrusionsSection(extrusions) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const header = document.createElement('div');
    header.className = 'tree-node-header';

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    toggle.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    toggle.onclick = (e) => {
        e.stopPropagation();
        toggleNode(node);
    };

    const name = document.createElement('span');
    name.className = 'tree-node-name';
    name.textContent = 'Профили';

    header.appendChild(toggle);
    header.appendChild(name);
    node.appendChild(header);

    const children = document.createElement('div');
    children.className = 'tree-children';
    children.style.display = 'none';

    // Group extrusions by name
    const extrusionGroups = new Map();
    extrusions.forEach(item => {
        const groupName = item.name || 'Профиль';
        if (!extrusionGroups.has(groupName)) {
            extrusionGroups.set(groupName, { items: [], ids: [], totalLength: 0 });
        }
        extrusionGroups.get(groupName).items.push(item);
        extrusionGroups.get(groupName).ids.push(item.id);
        extrusionGroups.get(groupName).totalLength += item.thickness || 0;
    });

    // Create grouped extrusion nodes
    extrusionGroups.forEach((group, groupName) => {
        const extrusionNode = createGroupedExtrusionNode(groupName, group);
        children.appendChild(extrusionNode);
    });

    node.appendChild(children);

    return node;
}

/**
 * Create grouped extrusion node element
 * @param {string} groupName - Group name
 * @param {Object} group - Group data with items, ids, totalLength
 * @returns {HTMLElement}
 */
function createGroupedExtrusionNode(groupName, group) {
    const node = document.createElement('div');
    node.className = 'tree-node tree-extrusion-group';
    node.dataset.extrusionIds = group.ids.join(',');

    // Visibility checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.className = 'tree-checkbox';
    checkbox.onclick = (e) => {
        e.stopPropagation();
        group.ids.forEach(id => toggleExtrusionVisibility(id, checkbox.checked));
    };

    // Extrusion content wrapper
    const content = document.createElement('div');
    content.className = 'tree-extrusion-content';
    content.onclick = () => {
        if (group.ids.length > 0) {
            selectExtrusion(group.ids[0]);
        }
    };

    // Extrusion name
    const name = document.createElement('span');
    name.className = 'tree-extrusion-name';
    name.textContent = groupName;

    // Extrusion info
    const details = document.createElement('span');
    details.className = 'tree-extrusion-details';
    const totalLengthM = (group.totalLength / 1000).toFixed(2);
    details.textContent = group.items.length > 1
        ? `×${group.items.length} (Σ${totalLengthM} м)`
        : `${totalLengthM} м`;

    content.appendChild(name);
    content.appendChild(details);

    node.appendChild(checkbox);
    node.appendChild(content);

    return node;
}

/**
 * Update tree to reflect current visibility state
 */
export function updateTreeVisibility() {
    // Update panel checkboxes
    Object.keys(state.meshByPanelId).forEach(panelId => {
        const mesh = state.meshByPanelId[panelId];
        const node = document.querySelector(`[data-panel-id="${panelId}"]`);
        if (node) {
            const checkbox = node.querySelector('.tree-checkbox');
            if (checkbox) {
                checkbox.checked = mesh.visible;
            }
        }
    });

    // Update block checkboxes
    Object.keys(state.meshByBlockId).forEach(blockId => {
        const meshes = state.meshByBlockId[blockId];
        const anyVisible = meshes.some(m => m.visible);
        const node = document.querySelector(`[data-block-id="${blockId}"]`);
        if (node) {
            const checkbox = node.querySelector('.tree-checkbox');
            if (checkbox) {
                checkbox.checked = anyVisible;
            }
        }
    });
}

export default {
    buildStructureTree,
    updateTreeVisibility
};

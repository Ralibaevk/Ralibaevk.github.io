/**
 * Visibility Module
 * Controls object visibility (show/hide selected, show all)
 */

import state from './state.js';
import { updateLabels } from './labels.js';
import { updateTreeVisibility } from './tree.js';
import { showDimensions } from './dimensions.js';

/**
 * Show only selected objects, hide others
 */
export function showOnlySelected() {
    if (state.selectedMeshes.size === 0) return;

    state.meshes.forEach(mesh => {
        mesh.visible = state.selectedMeshes.has(mesh);
    });

    updateTreeVisibility();
    updateLabels();

    if (state.isOrtho) {
        showDimensions();
    }
}

/**
 * Hide selected objects
 */
export function hideSelected() {
    state.selectedMeshes.forEach(mesh => {
        mesh.visible = false;
    });

    updateTreeVisibility();
    updateLabels();

    if (state.isOrtho) {
        showDimensions();
    }
}

/**
 * Show all objects
 */
export function showAll() {
    state.meshes.forEach(mesh => {
        mesh.visible = true;
    });

    updateTreeVisibility();
    updateLabels();

    if (state.isOrtho) {
        showDimensions();
    }
}

/**
 * Toggle visibility of specific block
 * @param {string} blockId - Block ID
 * @param {boolean} visible - Visibility state
 */
export function setBlockVisibility(blockId, visible) {
    const meshes = state.meshByBlockId[blockId] || [];
    meshes.forEach(mesh => {
        mesh.visible = visible;
    });

    const furniture = state.furnitureByBlockId[blockId] || [];
    furniture.forEach(mesh => {
        mesh.visible = visible;
    });

    updateTreeVisibility();
    updateLabels();
}

/**
 * Toggle visibility of specific panel
 * @param {string} panelId - Panel ID
 * @param {boolean} visible - Visibility state
 */
export function setPanelVisibility(panelId, visible) {
    const mesh = state.meshByPanelId[panelId];
    if (mesh) {
        mesh.visible = visible;
    }

    updateTreeVisibility();
    updateLabels();
}

/**
 * Toggle edge banding visibility on all panels
 * @param {boolean} visible - Visibility state
 */
export function toggleEdgeBandingVisibility(visible) {
    state.meshes.forEach(mesh => {
        if (mesh.userData.type === 'panel') {
            // Find child edge banding meshes
            mesh.traverse(child => {
                if (child.userData && child.userData.type === 'edgeBanding') {
                    child.visible = visible;
                }
            });
        }
    });

    // Store state for future reference
    state.edgeBandingVisible = visible;
}

/**
 * Toggle furniture visibility
 * @param {boolean} visible - Visibility state
 */
export function toggleFurnitureVisibility(visible) {
    state.meshes.forEach(mesh => {
        if (mesh.userData.type === 'furniture') {
            mesh.visible = visible;
        }
    });

    // Also hide furniture in block furniture maps
    Object.values(state.furnitureByBlockId).forEach(furnitureArray => {
        furnitureArray.forEach(mesh => {
            mesh.visible = visible;
        });
    });

    updateTreeVisibility();

    // Store state for future reference
    state.furnitureVisible = visible;
}

export default {
    showOnlySelected,
    hideSelected,
    showAll,
    setBlockVisibility,
    setPanelVisibility,
    toggleEdgeBandingVisibility,
    toggleFurnitureVisibility
};

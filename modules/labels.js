/**
 * Labels Module
 * Handles 3D sprite labels for blocks and panels
 */

import state from './state.js';
import CONFIG from './config.js';

/**
 * Create a text sprite with circular background
 * @param {string} text - Text to display
 * @param {Object} options - Styling options
 * @returns {THREE.Sprite}
 */
export function createTextSprite(text, options = {}) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const size = 128;
    canvas.width = size;
    canvas.height = size;

    const fontSize = options.fontSize || 48;
    const bgColor = options.bgColor || '#ffffff';
    const borderColor = options.borderColor || '#333333';
    const textColor = options.textColor || '#333333';

    ctx.clearRect(0, 0, size, size);

    // Draw circle background with SOLID fill
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // Draw circle border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw text
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;  // Proper color rendering
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,  // Needed for circle edges, but background is solid
        depthTest: false
    });
    const sprite = new THREE.Sprite(material);

    const scale = options.scale || 100;
    sprite.scale.set(scale, scale, 1);
    sprite.renderOrder = 2000;

    // Disable raycast so labels don't block click selection
    sprite.raycast = () => { };

    return sprite;
}

/**
 * Hide all labels
 */
export function hideLabels() {
    if (state.labelsGroup) {
        state.scene.remove(state.labelsGroup);
        state.labelsGroup = null;
    }
}

/**
 * Show block number labels
 */
export function showBlockLabels() {
    hideLabels();
    if (!state.modelData || !state.modelData.blocks) return;

    state.labelsGroup = new THREE.Group();

    state.modelData.blocks.forEach((block, i) => {
        const panelMeshes = state.meshByBlockId[block.id] || [];
        if (panelMeshes.length === 0) return;

        const box = new THREE.Box3();
        panelMeshes.forEach(mesh => {
            if (mesh.visible) box.expandByObject(mesh);
        });

        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());

        const labelText = String(i + 1);
        const label = createTextSprite(labelText, { scale: 80 });
        label.position.copy(center);
        state.labelsGroup.add(label);
    });

    state.scene.add(state.labelsGroup);
}

/**
 * Show panel position labels
 */
export function showPanelLabels() {
    hideLabels();
    if (!state.modelData || !state.modelData.panels) return;

    state.labelsGroup = new THREE.Group();

    state.modelData.panels.forEach(panel => {
        const mesh = state.meshByPanelId[panel.id];
        if (!mesh || !mesh.visible) return;

        const pos = panel.positionNumber;
        if (!pos) return;

        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());

        const label = createTextSprite(pos, { scale: 60 });
        label.position.copy(center);
        state.labelsGroup.add(label);
    });

    state.scene.add(state.labelsGroup);
}

/**
 * Update labels based on visibility state
 * Shows panel labels when only one block is visible, otherwise block labels
 */
export function updateLabels() {
    // Check if labels are disabled in config
    if (typeof CONFIG !== 'undefined' && CONFIG.showLabels === false) {
        hideLabels();
        return;
    }

    // In 2D mode, hide labels (only show dimensions)
    if (state.isOrtho) {
        hideLabels();
        return;
    }

    // Determine what to show based on visibility state
    const visibleBlocks = new Set();
    let totalVisible = 0;

    state.meshes.forEach(mesh => {
        if (mesh.visible && mesh.userData.data) {
            totalVisible++;
            const blockId = mesh.userData.data.parentBlockId;
            if (blockId) visibleBlocks.add(blockId);
        }
    });

    // If only one block is visible, show panel labels
    // Otherwise show block labels
    if (visibleBlocks.size === 1 && totalVisible > 0) {
        showPanelLabels();
    } else if (totalVisible > 0) {
        showBlockLabels();
    } else {
        hideLabels();
    }
}

export default {
    createTextSprite,
    hideLabels,
    showBlockLabels,
    showPanelLabels,
    updateLabels
};

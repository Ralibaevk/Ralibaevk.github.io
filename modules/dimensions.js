/**
 * Dimensions Module
 * Handles dimension annotations and measurement lines
 */

import state from './state.js';

/**
 * Create plain text sprite for dimension labels (no circle background)
 * @param {string} text - Dimension text
 * @returns {THREE.Sprite}
 */
export function createDimensionText(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 256;
    canvas.height = 64;

    const fontSize = 36;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Plain text with outline for visibility
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // White outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);

    // Dark text
    ctx.fillStyle = '#333333';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(150, 40, 1);
    sprite.renderOrder = 2000;
    sprite.raycast = () => { };

    return sprite;
}

/**
 * Get bounding box of visible meshes
 * @returns {THREE.Box3|null}
 */
export function getVisibleBounds() {
    const box = new THREE.Box3();
    let hasVisible = false;

    state.meshes.forEach(mesh => {
        if (mesh.visible) {
            box.expandByObject(mesh);
            hasVisible = true;
        }
    });

    return hasVisible ? box : state.modelBounds;
}

/**
 * Create a dimension line with end caps and label
 * @param {THREE.Vector3} start - Start point
 * @param {THREE.Vector3} end - End point
 * @param {string} labelText - Dimension label
 * @returns {THREE.Group}
 */
export function createDimensionLine(start, end, labelText) {
    const group = new THREE.Group();

    // Main line
    const lineMat = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);

    // End caps
    const capLength = 20;
    const dir = new THREE.Vector3().subVectors(end, start).normalize();
    const perpY = new THREE.Vector3(0, 1, 0);
    const perpZ = new THREE.Vector3(0, 0, 1);
    let perp = dir.dot(perpY) < 0.9 ? perpY : perpZ;
    perp = new THREE.Vector3().crossVectors(dir, perp).normalize().multiplyScalar(capLength);

    const cap1Geo = new THREE.BufferGeometry().setFromPoints([
        start.clone().add(perp), start.clone().sub(perp)
    ]);
    const cap2Geo = new THREE.BufferGeometry().setFromPoints([
        end.clone().add(perp), end.clone().sub(perp)
    ]);
    group.add(new THREE.Line(cap1Geo, lineMat));
    group.add(new THREE.Line(cap2Geo, lineMat));

    // Label
    const label = createDimensionText(labelText);
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    label.position.copy(midpoint);
    group.add(label);

    return group;
}

/**
 * Show dimension annotations based on current view
 */
export function showDimensions() {
    const bounds = getVisibleBounds();
    if (!bounds) return;
    hideDimensions();

    state.dimensionGroup = new THREE.Group();
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const offset = 100;

    const view = state.currentViewDirection || 'front';

    if (view === 'front' || view === 'back') {
        // Show Width (X) and Height (Y)
        const widthStart = new THREE.Vector3(bounds.min.x, bounds.min.y - offset, center.z);
        const widthEnd = new THREE.Vector3(bounds.max.x, bounds.min.y - offset, center.z);
        state.dimensionGroup.add(createDimensionLine(widthStart, widthEnd, `${Math.round(size.x)} мм`));

        const heightStart = new THREE.Vector3(bounds.min.x - offset, bounds.min.y, center.z);
        const heightEnd = new THREE.Vector3(bounds.min.x - offset, bounds.max.y, center.z);
        state.dimensionGroup.add(createDimensionLine(heightStart, heightEnd, `${Math.round(size.y)} мм`));

    } else if (view === 'top' || view === 'bottom') {
        // Show Width (X) and Depth (Z)
        const widthStart = new THREE.Vector3(bounds.min.x, center.y, bounds.max.z + offset);
        const widthEnd = new THREE.Vector3(bounds.max.x, center.y, bounds.max.z + offset);
        state.dimensionGroup.add(createDimensionLine(widthStart, widthEnd, `${Math.round(size.x)} мм`));

        const depthStart = new THREE.Vector3(bounds.min.x - offset, center.y, bounds.min.z);
        const depthEnd = new THREE.Vector3(bounds.min.x - offset, center.y, bounds.max.z);
        state.dimensionGroup.add(createDimensionLine(depthStart, depthEnd, `${Math.round(size.z)} мм`));

    } else if (view === 'left' || view === 'right') {
        // Show Depth (Z) and Height (Y)
        const depthStart = new THREE.Vector3(center.x, bounds.min.y - offset, bounds.min.z);
        const depthEnd = new THREE.Vector3(center.x, bounds.min.y - offset, bounds.max.z);
        state.dimensionGroup.add(createDimensionLine(depthStart, depthEnd, `${Math.round(size.z)} мм`));

        const heightStart = new THREE.Vector3(center.x, bounds.min.y, bounds.min.z - offset);
        const heightEnd = new THREE.Vector3(center.x, bounds.max.y, bounds.min.z - offset);
        state.dimensionGroup.add(createDimensionLine(heightStart, heightEnd, `${Math.round(size.y)} мм`));
    }

    state.scene.add(state.dimensionGroup);
}

/**
 * Hide dimension annotations
 */
export function hideDimensions() {
    if (state.dimensionGroup) {
        state.scene.remove(state.dimensionGroup);
        state.dimensionGroup = null;
    }
}

export default {
    createDimensionText,
    getVisibleBounds,
    createDimensionLine,
    showDimensions,
    hideDimensions
};

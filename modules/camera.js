/**
 * Camera Module
 * Handles perspective and orthographic cameras, OrbitControls, and view switching
 */

import state from './state.js';
import CONFIG from './config.js';
import { showDimensions, hideDimensions, getVisibleBounds } from './dimensions.js';
import { updateLabels } from './labels.js';

/**
 * Initialize both perspective and orthographic cameras
 */
export function initCameras() {
    // Perspective camera
    state.camera = new THREE.PerspectiveCamera(
        CONFIG.defaultFov,
        window.innerWidth / window.innerHeight,
        1,
        100000
    );
    state.camera.position.set(1000, 1000, 1500);

    // Orthographic camera
    const aspect = window.innerWidth / window.innerHeight;
    state.orthoCamera = new THREE.OrthographicCamera(
        CONFIG.frustumSize * aspect / -2,
        CONFIG.frustumSize * aspect / 2,
        CONFIG.frustumSize / 2,
        CONFIG.frustumSize / -2,
        1,
        100000
    );
    state.orthoCamera.position.copy(state.camera.position);

    // Start with perspective camera
    state.activeCamera = state.camera;

    // Initialize OrbitControls
    initControls();
}

/**
 * Initialize OrbitControls
 */
function initControls() {
    state.controls = new THREE.OrbitControls(state.activeCamera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    state.controls.minDistance = CONFIG.minDistance;
    state.controls.maxDistance = CONFIG.maxDistance;
}

/**
 * Toggle between perspective and orthographic camera modes
 */
export function toggleCameraMode() {
    state.isOrtho = !state.isOrtho;

    if (state.isOrtho) {
        // Switch to orthographic
        state.orthoCamera.position.copy(state.camera.position);
        state.orthoCamera.quaternion.copy(state.camera.quaternion);

        // Adjust frustum based on model bounds
        if (state.modelBounds) {
            const size = state.modelBounds.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const aspect = window.innerWidth / window.innerHeight;
            state.orthoCamera.left = -maxDim * aspect / 2;
            state.orthoCamera.right = maxDim * aspect / 2;
            state.orthoCamera.top = maxDim / 2;
            state.orthoCamera.bottom = -maxDim / 2;
            state.orthoCamera.updateProjectionMatrix();
        }

        state.activeCamera = state.orthoCamera;
        showDimensions();
    } else {
        // Switch to perspective
        state.camera.position.copy(state.orthoCamera.position);
        state.camera.quaternion.copy(state.orthoCamera.quaternion);
        state.activeCamera = state.camera;
        hideDimensions();
    }

    // Reinitialize controls with new camera
    state.controls.object = state.activeCamera;
    state.controls.update();

    // Update labels (hide in 2D, show in 3D)
    updateLabels();
}

/**
 * Set camera to a specific view direction
 * @param {string} direction - 'top', 'bottom', 'front', 'back', 'left', 'right'
 */
export function setView(direction) {
    const bounds = getVisibleBounds();
    if (!bounds || bounds.isEmpty()) return;

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    // Calculate view dimensions based on direction
    let viewWidth, viewHeight;
    switch (direction) {
        case 'top':
        case 'bottom':
            viewWidth = size.x;
            viewHeight = size.z;
            break;
        case 'front':
        case 'back':
            viewWidth = size.x;
            viewHeight = size.y;
            break;
        case 'left':
        case 'right':
            viewWidth = size.z;
            viewHeight = size.y;
            break;
        default:
            viewWidth = Math.max(size.x, size.z);
            viewHeight = size.y;
    }

    const maxDim = Math.max(viewWidth, viewHeight, 100);
    const dist = maxDim * 2;

    let pos = new THREE.Vector3();

    switch (direction) {
        case 'top': pos.set(center.x, center.y + dist, center.z); break;
        case 'bottom': pos.set(center.x, center.y - dist, center.z); break;
        case 'front': pos.set(center.x, center.y, center.z + dist); break;
        case 'back': pos.set(center.x, center.y, center.z - dist); break;
        case 'left': pos.set(center.x - dist, center.y, center.z); break;
        case 'right': pos.set(center.x + dist, center.y, center.z); break;
    }

    state.currentViewDirection = direction;

    // Move camera
    state.activeCamera.position.copy(pos);
    state.activeCamera.lookAt(center);
    state.controls.target.copy(center);

    // Fit orthographic camera to visible bounds
    if (state.isOrtho) {
        const aspect = window.innerWidth / window.innerHeight;
        const padding = 1.2;

        let frustumHeight, frustumWidth;

        if (viewWidth / aspect > viewHeight) {
            frustumWidth = viewWidth * padding;
            frustumHeight = frustumWidth / aspect;
        } else {
            frustumHeight = viewHeight * padding;
            frustumWidth = frustumHeight * aspect;
        }

        state.orthoCamera.left = -frustumWidth / 2;
        state.orthoCamera.right = frustumWidth / 2;
        state.orthoCamera.top = frustumHeight / 2;
        state.orthoCamera.bottom = -frustumHeight / 2;
        state.orthoCamera.updateProjectionMatrix();

        showDimensions();
    } else {
        // For perspective camera, adjust position to fit
        const fov = state.camera.fov * (Math.PI / 180);
        const fitDist = Math.max(viewWidth, viewHeight) / (2 * Math.tan(fov / 2)) * 1.2;

        switch (direction) {
            case 'top': pos.set(center.x, center.y + fitDist, center.z); break;
            case 'bottom': pos.set(center.x, center.y - fitDist, center.z); break;
            case 'front': pos.set(center.x, center.y, center.z + fitDist); break;
            case 'back': pos.set(center.x, center.y, center.z - fitDist); break;
            case 'left': pos.set(center.x - fitDist, center.y, center.z); break;
            case 'right': pos.set(center.x + fitDist, center.y, center.z); break;
        }
        state.activeCamera.position.copy(pos);
    }

    state.controls.update();
}

/**
 * Reset camera to default view
 */
export function resetView() {
    if (state.modelData && state.modelData.model && state.modelData.model.boundingBox) {
        const bb = state.modelData.model.boundingBox;
        const size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
        state.camera.position.set(size, size * 0.8, size * 1.2);
        state.controls.target.set(0, (bb.max.y - bb.min.y) / 2, 0);
        state.controls.update();
    }
}

/**
 * Fit camera to model after loading
 */
export function fitCameraToModel() {
    if (state.modelData && state.modelData.model && state.modelData.model.boundingBox) {
        const bb = state.modelData.model.boundingBox;
        const size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z);
        state.camera.position.set(size, size * 0.8, size * 1.2);
        state.controls.target.set(0, (bb.max.y - bb.min.y) / 2, 0);
        state.controls.update();
    }
}

export default {
    initCameras,
    toggleCameraMode,
    setView,
    resetView,
    fitCameraToModel
};

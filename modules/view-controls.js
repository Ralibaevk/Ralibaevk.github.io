/**
 * View Controls Module
 * Handles view manipulation (wireframe, explode, reset)
 */

import state from './state.js';
import CONFIG from './config.js';
import { resetView } from './camera.js';
import { updateLabels } from './labels.js';

/**
 * Toggle transparent mode
 * Makes model semi-transparent while keeping original colors
 */
export function toggleWireframe() {
    state.isWireframe = !state.isWireframe;

    state.meshes.forEach(mesh => {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => {
                if (state.isWireframe) {
                    // Save original opacity if not saved
                    if (mat._originalOpacity === undefined) {
                        mat._originalOpacity = mat.opacity;
                        mat._originalTransparent = mat.transparent;
                    }
                    mat.transparent = true;
                    mat.opacity = 0.4;
                    mat.needsUpdate = true;
                } else {
                    // Restore original opacity
                    if (mat._originalOpacity !== undefined) {
                        mat.opacity = mat._originalOpacity;
                        mat.transparent = mat._originalTransparent;
                        mat.needsUpdate = true;
                    }
                }
            });
        } else if (mesh.material) {
            const mat = mesh.material;
            if (state.isWireframe) {
                // Save original opacity if not saved
                if (mat._originalOpacity === undefined) {
                    mat._originalOpacity = mat.opacity;
                    mat._originalTransparent = mat.transparent;
                }
                mat.transparent = true;
                mat.opacity = 0.4;
                mat.needsUpdate = true;
            } else {
                // Restore original opacity
                if (mat._originalOpacity !== undefined) {
                    mat.opacity = mat._originalOpacity;
                    mat.transparent = mat._originalTransparent;
                    mat.needsUpdate = true;
                }
            }
        }
    });

    // Keep button as icon-only (no text update)
}

/**
 * Toggle exploded view
 */
export function toggleExplode() {
    state.isExploded = !state.isExploded;

    if (!state.modelBounds) return;

    const center = state.modelBounds.getCenter(new THREE.Vector3());

    state.meshes.forEach(mesh => {
        const originalPos = state.originalPositions.get(mesh);
        if (!originalPos) return;

        if (state.isExploded) {
            // Calculate direction from center
            const direction = new THREE.Vector3()
                .subVectors(originalPos, center)
                .normalize();

            // Offset by explode factor
            const offset = direction.multiplyScalar(
                originalPos.distanceTo(center) * (CONFIG.explodeFactor - 1)
            );

            mesh.position.copy(originalPos).add(offset);
        } else {
            // Return to original position
            mesh.position.copy(originalPos);
        }
    });

    // Keep button as icon-only (no text update)

    updateLabels();
}

/**
 * Reset view to initial state
 */
export function resetViewState() {
    // Reset camera
    resetView();

    // Reset wireframe
    if (state.isWireframe) {
        toggleWireframe();
    }

    // Reset explode
    if (state.isExploded) {
        toggleExplode();
    }

    updateLabels();
}

export default {
    toggleWireframe,
    toggleExplode,
    resetViewState
};

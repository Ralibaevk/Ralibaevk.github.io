/**
 * File Loader Module
 * Handles file loading via drag & drop and file input
 */

import state from './state.js';
import { initScene, animate, updateShadowFloor } from './scene.js';
import { initCameras, fitCameraToModel } from './camera.js';
import { buildModel } from './model-builder.js';
import { buildStructureTree } from './tree.js';
import { initSelection } from './selection.js';
import { updateUI, toggleUIPanels, bindUIEvents } from './ui.js';
import { updateLabels } from './labels.js';

/**
 * Initialize file loading handlers
 */
export function initFileLoader() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (dropZone) {
        // Drag over
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        // Drag leave
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        // Drop
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) loadFile(file);
        });

        // Click to open file dialog
        dropZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) loadFile(file);
        });
    }
}

/**
 * Load a JSON file
 * @param {File} file - File to load
 */
export function loadFile(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        let text = e.target.result;

        // Check if there are encoding issues (common pattern for broken Cyrillic)
        // These patterns appear when Windows-1251 text is read as UTF-8
        if (text.includes('\ufffd') || text.includes('Ð') || /[^\x00-\x7F]{2,}/.test(text) && !/[а-яА-ЯёЁ]/.test(text)) {
            // Text looks corrupted - try reading as Windows-1251
            const reader1251 = new FileReader();
            reader1251.onload = (e2) => {
                processJSON(e2.target.result);
            };
            reader1251.onerror = () => {
                // Fallback to the original text
                processJSON(text);
            };
            reader1251.readAsText(file, 'windows-1251');
        } else {
            processJSON(text);
        }
    };

    reader.onerror = () => {
        alert('Ошибка чтения файла');
    };

    reader.readAsText(file, 'utf-8');
}

/**
 * Process loaded JSON text
 * @param {string} text - JSON string
 */
export async function processJSON(text) {
    try {
        state.modelData = JSON.parse(text);

        // Initialize scene if first load
        if (!state.scene) {
            initScene();
            initCameras();
            initSelection();
            bindUIEvents();
            animate();
        }

        // Check if server-side processing is enabled
        const USE_SERVER_PROCESSING = false; // Disabled - using local processing

        if (USE_SERVER_PROCESSING && state.modelData.panels) {
            // Use server-side processing for IP protection
            await buildModelFromServer();
        } else {
            // Use local processing (legacy mode)
            buildModel();
        }

        // Update shadow floor to match model size
        updateShadowFloor();

        // Fit camera to model
        fitCameraToModel();

        // Update UI
        updateUI();
        buildStructureTree();
        toggleUIPanels(true);
        updateLabels();

    } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Ошибка чтения файла: ' + error.message);
    }
}

/**
 * Build model using server-side processing
 * Sends JSON to Edge Function and renders returned geometry
 */
async function buildModelFromServer() {
    try {
        console.log('[buildModelFromServer] Sending model to server...');

        // Dynamically import api-client
        const { parseModelData, createMeshesFromProcessedData } = await import('../api/api-client.js');

        // Send to server for processing
        const processedModel = await parseModelData(state.modelData);

        // Clear previous model
        state.meshes.forEach(mesh => {
            state.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        state.meshes = [];

        // Create Three.js meshes from server response
        const meshes = createMeshesFromProcessedData(processedModel);

        // Add meshes to scene
        meshes.forEach(mesh => {
            state.scene.add(mesh);
            state.meshes.push(mesh);
            state.originalPositions.set(mesh, mesh.position.clone());
        });

        // Store BOM data for supply page
        state.bomData = processedModel.bom;

        // Calculate bounds
        if (processedModel.bounds) {
            state.modelBounds = new THREE.Box3();
            state.modelBounds.min.set(
                processedModel.bounds.min.x,
                processedModel.bounds.min.y,
                processedModel.bounds.min.z
            );
            state.modelBounds.max.set(
                processedModel.bounds.max.x,
                processedModel.bounds.max.y,
                processedModel.bounds.max.z
            );
        }

        console.log(`[buildModelFromServer] Loaded ${meshes.length} meshes, ${processedModel.bom.length} BOM items`);

    } catch (error) {
        console.error('[buildModelFromServer] Error:', error);
        // Fallback to local processing
        console.warn('[buildModelFromServer] Falling back to local processing...');
        buildModel();
    }
}

/**
 * Load a new file (for loading additional models)
 * @param {File} file - File to load
 */
export function loadNewFile(file) {
    // Reset state before loading new file
    state.resetState();
    loadFile(file);
}

export default {
    initFileLoader,
    loadFile,
    processJSON,
    loadNewFile
};

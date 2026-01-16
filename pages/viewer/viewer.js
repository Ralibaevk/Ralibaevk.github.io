/**
 * Viewer Page - 3D Model Viewer
 * Wraps existing modules for SPA integration
 */

import { initScene } from '../../modules/scene.js';
import { initCameras, fitCameraToModel } from '../../modules/camera.js';
import { initSelection } from '../../modules/selection.js';
import treeModule from '../../modules/tree.js';
import uiModule from '../../modules/ui.js';
import state from '../../modules/state.js';
import { router } from '../../router/router.js';

let container = null;
let animationId = null;
let isInitialized = false;

// Server-side processing flag - temporarily disabled while fixing Edge Function bugs
const USE_SERVER_PROCESSING = false;

/**
 * Build model using server-side processing (for IP protection)
 * Falls back to local processing on error
 */
async function buildModelWithServerProcessing() {
    if (!USE_SERVER_PROCESSING || !state.modelData.panels) {
        // Use local processing
        const modelBuilder = await import('../../modules/model-builder.js');
        const buildFn = modelBuilder.buildModel || modelBuilder.default?.buildModel;
        if (buildFn) buildFn();
        return;
    }

    try {
        console.log('[buildModelWithServerProcessing] Sending model to server...');

        // Import API client functions
        const apiClient = await import('../../api/api-client.js');
        console.log('[buildModelWithServerProcessing] Available exports:', Object.keys(apiClient));

        const parseModelData = apiClient.parseModelData;
        const createMeshesFromProcessedData = apiClient.createMeshesFromProcessedData;

        if (!parseModelData) {
            throw new Error('parseModelData not exported from api-client.js');
        }

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

        // Store BOM data
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

        console.log(`[buildModelWithServerProcessing] Loaded ${meshes.length} meshes, ${processedModel.bom.length} BOM items`);

    } catch (error) {
        console.error('[buildModelWithServerProcessing] Error:', error);
        console.warn('[buildModelWithServerProcessing] Falling back to local processing...');

        // Fallback to local processing
        const modelBuilder = await import('../../modules/model-builder.js');
        const buildFn = modelBuilder.buildModel || modelBuilder.default?.buildModel;
        if (buildFn) buildFn();
    }
}

/**
 * Mount the viewer page
 * @param {HTMLElement} parentContainer - Container to mount into
 * @param {Object} params - Route parameters
 */
export async function mount(parentContainer, params) {
    container = parentContainer;

    // Determine mode based on route
    const isAssemblyMode = window.location.hash.includes('/assembly/');
    const isLiteMode = isAssemblyMode;

    // Render viewer layout
    container.innerHTML = `
        <!-- Main 3D Canvas Container -->
        <div id="canvas-container"></div>

        <!-- Header Bar -->
        <header id="viewer-header">
            <!-- Left Section: Navigation -->
            <div class="header-left">
                <button id="btn-back-projects" class="header-btn" title="К проектам">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    <span>Проекты</span>
                </button>
                <button id="btn-assembly-guide" class="header-btn header-btn-primary" title="Схема сборки" style="display: none;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    <span>Схема сборки</span>
                </button>
            </div>

            <!-- Center Section: Toolbar -->
            <div id="top-toolbar" style="display: none;">
                <button id="btn-cam-mode" title="Переключить режим камеры">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4" />
                    </svg>
                </button>
                <button id="btn-wireframe" title="Каркасный режим">
                    <svg class="icon" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                    </svg>
                </button>
                <button id="btn-explode" title="Разнести/собрать модель">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z" />
                    </svg>
                </button>
                <button id="btn-reset" title="Сбросить вид">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>
                <div class="toolbar-separator"></div>
                <button id="btn-view-front" title="Вид спереди">
                    <svg class="icon" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                </button>
                <button id="btn-view-back" title="Вид сзади">
                    <svg class="icon" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                </button>
                <button id="btn-view-left" title="Вид слева">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M21 3H3v18h18V3z" />
                        <path d="M3 12h18" />
                    </svg>
                </button>
                <button id="btn-view-right" title="Вид справа">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M21 3H3v18h18V3z" />
                        <path d="M12 3v18" />
                    </svg>
                </button>
                <button id="btn-view-top" title="Вид сверху">
                    <svg class="icon" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 3v18" />
                    </svg>
                </button>
                <button id="btn-view-bottom" title="Вид снизу">
                    <svg class="icon" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18" />
                    </svg>
                </button>
                <div class="toolbar-separator"></div>
                <button id="btn-show-only" title="Показать только выбранное">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
                <button id="btn-hide" title="Скрыть выбранное">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                </button>
                <button id="btn-show-all" title="Показать всё">
                    <svg class="icon" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </button>
                <div class="toolbar-separator"></div>
                <button id="btn-block-labels" title="Показать номера блоков">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                </button>
                <button id="btn-panel-labels" title="Показать номера панелей">
                    <svg class="icon" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                    </svg>
                </button>
                <button id="btn-hide-labels" title="Скрыть метки">
                    <svg class="icon" viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
                <div class="toolbar-separator"></div>
                <button id="btn-toggle-edges" class="active" title="Показать/скрыть кромку">
                    <svg class="icon" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke-width="3"/>
                    </svg>
                </button>
                <button id="btn-toggle-furniture" class="active" title="Показать/скрыть фурнитуру">
                    <svg class="icon" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                    </svg>
                </button>
            </div>
        </header>

        <!-- Left Panel Toggle Button (below header, left side) -->
        <button id="btn-toggle-left-panel" class="panel-toggle-btn panel-toggle-left" title="Информация о модели" style="display: none;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
            </svg>
        </button>

        <!-- Right Panel Toggle Button (below header, right side) -->
        <button id="btn-toggle-right-panel" class="panel-toggle-btn panel-toggle-right" title="Структура модели" style="display: none;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
            </svg>
        </button>

        <!-- Drop Zone for File Loading -->
        <div id="drop-zone">
            <div class="drop-zone-content">
                <div class="drop-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                </div>
                <p>Перетащите JSON файл сюда<br>или нажмите для выбора</p>
            </div>
            <input type="file" id="file-input" accept=".json" style="display: none;">
        </div>

        <!-- Info Panel (Left, Collapsible) -->
        <div id="info-panel" class="panel side-panel left-panel" style="display: none;">
            <h3>Информация о модели</h3>
            <div id="model-info"></div>

            <h4>Выбранный объект</h4>
            <div id="selection-info">
                <p>Ничего не выбрано</p>
            </div>

            <h4>Материалы</h4>
            <div id="materials-list"></div>
        </div>

        <!-- Structure Tree Panel (Right, Collapsible) -->
        <div id="structure-panel" class="panel side-panel right-panel" style="display: none;">
            <h3>Структура модели</h3>
            <div id="structure-tree"></div>
        </div>
    `;

    // Initialize viewer components
    initViewerComponents();

    // Bind back button
    document.getElementById('btn-back-projects').addEventListener('click', () => {
        router.navigate('/projects');
    });

    // Bind assembly guide button
    document.getElementById('btn-assembly-guide')?.addEventListener('click', () => {
        const projectId = router.params?.projectId || router.params?.id;
        if (projectId) {
            router.navigate(`/project/${projectId}/assembly-guide`);
        } else {
            router.navigate('/assembly-guide');
        }
    });

    // Bind panel toggle buttons
    document.getElementById('btn-toggle-left-panel')?.addEventListener('click', () => {
        const panel = document.getElementById('info-panel');
        const btn = document.getElementById('btn-toggle-left-panel');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            panel.classList.toggle('collapsed', isVisible);
            btn?.classList.toggle('active', !isVisible);
        }
    });

    document.getElementById('btn-toggle-right-panel')?.addEventListener('click', () => {
        const panel = document.getElementById('structure-panel');
        const btn = document.getElementById('btn-toggle-right-panel');
        if (panel) {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            panel.classList.toggle('collapsed', isVisible);
            btn?.classList.toggle('active', !isVisible);
        }
    });

    // Hide edit buttons in lite mode
    if (isLiteMode) {
        // Hide editing controls if needed
    }

    // Auto-load project model if we have a projectId in the URL
    const projectId = router.params?.projectId || router.params?.id;
    if (projectId) {
        autoLoadProjectModel(projectId);
    }
}

/**
 * Auto-load project model from data folder
 * @param {string} projectId - Project ID (e.g., 'proj_402')
 */
async function autoLoadProjectModel(projectId) {
    const modelPath = `../../data/projects/${projectId}.json`;

    try {
        const response = await fetch(modelPath);
        if (!response.ok) {
            console.log(`Model file not found: ${modelPath}. Use drop zone to load manually.`);
            return;
        }

        // Read as ArrayBuffer to handle encoding properly
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Try UTF-8 first
        let text = new TextDecoder('utf-8').decode(bytes);

        // Check if text looks corrupted (common patterns for broken Cyrillic)
        const hasEncodingIssues =
            text.includes('\ufffd') ||
            text.includes('Ð') ||
            (/[^\x00-\x7F]{2,}/.test(text) && !/[а-яА-ЯёЁ]/.test(text));

        if (hasEncodingIssues) {
            // Try Windows-1251 encoding
            text = new TextDecoder('windows-1251').decode(bytes);
        }

        const json = JSON.parse(text);

        // Set model data in state
        state.modelData = json;

        // Build model using server or local processing
        await buildModelWithServerProcessing();

        // Update shadow floor
        const sceneModule = await import('../../modules/scene.js');
        if (sceneModule.updateShadowFloor) {
            sceneModule.updateShadowFloor();
        } else if (sceneModule.default?.updateShadowFloor) {
            sceneModule.default.updateShadowFloor();
        }

        // Update UI
        uiModule.toggleUIPanels(true);
        uiModule.updateUI();
        treeModule.buildStructureTree();
        fitCameraToModel();

        // Hide drop zone
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            dropZone.style.display = 'none';
        }

        // Show assembly guide button
        const assemblyBtn = document.getElementById('btn-assembly-guide');
        if (assemblyBtn) {
            assemblyBtn.style.display = 'flex';
        }

        console.log(`Model loaded: ${projectId}`);

    } catch (error) {
        console.log(`Could not load model for project ${projectId}:`, error.message);
        // Keep drop zone visible for manual loading
    }
}

/**
 * Initialize viewer components
 */
function initViewerComponents() {
    if (isInitialized) return;

    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) return;

    // Initialize Three.js scene
    initScene();
    initCameras();
    initSelection();

    // Bind UI events
    uiModule.bindUIEvents();

    // Setup file drop zone
    setupDropZone();

    // Start render loop
    animate();

    // Handle resize
    window.addEventListener('resize', handleResize);

    isInitialized = true;
}

/**
 * Setup file drop zone handlers
 */
function setupDropZone() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            loadFile(file);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            loadFile(file);
        }
    });
}

/**
 * Load JSON file
 */
async function loadFile(file) {
    try {
        // Read as ArrayBuffer to handle encoding properly
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        // Try UTF-8 first
        let text = new TextDecoder('utf-8').decode(bytes);

        // Check if text looks corrupted (common patterns for broken Cyrillic)
        const hasEncodingIssues =
            text.includes('\ufffd') ||
            text.includes('Ð') ||
            (/[^\x00-\x7F]{2,}/.test(text) && !/[а-яА-ЯёЁ]/.test(text));

        if (hasEncodingIssues) {
            // Try Windows-1251 encoding
            text = new TextDecoder('windows-1251').decode(bytes);
        }

        const json = JSON.parse(text);

        // Set model data in state BEFORE building (buildModel reads from state.modelData)
        state.modelData = json;

        // Build model using server or local processing
        await buildModelWithServerProcessing();

        // Update shadow floor
        const sceneModule = await import('../../modules/scene.js');
        if (sceneModule.updateShadowFloor) {
            sceneModule.updateShadowFloor();
        } else if (sceneModule.default?.updateShadowFloor) {
            sceneModule.default.updateShadowFloor();
        }

        // Update UI
        uiModule.toggleUIPanels(true);
        uiModule.updateUI();
        treeModule.buildStructureTree();
        fitCameraToModel();

        // Hide drop zone
        document.getElementById('drop-zone').style.display = 'none';

        // Show assembly guide button
        const assemblyBtn = document.getElementById('btn-assembly-guide');
        if (assemblyBtn) {
            assemblyBtn.style.display = 'flex';
        }

    } catch (error) {
        console.error('Error loading file:', error);
        alert('Ошибка загрузки файла: ' + error.message);
    }
}

/**
 * Animation loop
 */
function animate() {
    animationId = requestAnimationFrame(animate);

    if (state.renderer && state.scene && state.activeCamera) {
        if (state.controls) {
            state.controls.update();
        }
        state.renderer.render(state.scene, state.activeCamera);
    }
}

/**
 * Handle window resize
 */
function handleResize() {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) return;

    if (state.camera) {
        state.camera.aspect = window.innerWidth / window.innerHeight;
        state.camera.updateProjectionMatrix();
    }
    if (state.renderer) {
        state.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

/**
 * Unmount the viewer page
 */
export function unmount() {
    // Stop animation
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Remove resize listener
    window.removeEventListener('resize', handleResize);

    container = null;
    isInitialized = false;
}

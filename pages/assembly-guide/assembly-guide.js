/**
 * Assembly Guide Page - Interactive Step-by-Step Assembly Instructions
 * Each block/box is displayed separately with its panels and hardware specification
 */

import { router } from '../../router/router.js';
import state from '../../modules/state.js';
import { initScene } from '../../modules/scene.js';
import { initCameras } from '../../modules/camera.js';

let container = null;
let animationId = null;
let currentStep = 0;
let blocks = [];
let isInitialized = false;
let resizeObserver = null;

/**
 * Mount the assembly guide page
 */
export async function mount(parentContainer, params) {
    container = parentContainer;
    currentStep = 0;

    // Load CSS and wait for it to apply
    await loadStyles();

    // Render initial loading state
    container.innerHTML = renderLoading();

    // Check if we have model data
    if (!state.modelData) {
        // Try to load from project ID
        const projectId = router.params?.projectId || router.params?.id;
        if (projectId) {
            await loadProjectModel(projectId);
        }
    }

    if (!state.modelData) {
        container.innerHTML = renderNoData();
        return;
    }

    // Extract blocks from model data
    blocks = extractBlocks(state.modelData);

    if (blocks.length === 0) {
        container.innerHTML = renderNoBlocks();
        return;
    }

    // Render page
    container.innerHTML = renderPage();

    // Wait for DOM layout to be calculated before initializing 3D viewer
    // This is crucial for first-load when container dimensions need CSS to be applied
    await new Promise(resolve => requestAnimationFrame(() => {
        requestAnimationFrame(resolve);  // Double RAF for full layout pass
    }));

    // Initialize 3D viewer for current block
    initBlockViewer();

    // Setup ResizeObserver for container resize handling
    setupResizeObserver();

    // Bind events
    bindEvents();

    // Render first block
    renderCurrentBlock();

    // Initialize model overview mini-preview (delayed to ensure DOM is ready)
    setTimeout(() => initModelOverview(), 100);

    // Trigger initial resize to ensure proper sizing
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

/**
 * Load page styles
 * @returns {Promise} Resolves when CSS is loaded
 */
function loadStyles() {
    return new Promise((resolve) => {
        const existingLink = document.getElementById('assembly-guide-styles');
        if (existingLink) {
            // CSS already loaded
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.id = 'assembly-guide-styles';
        link.rel = 'stylesheet';
        link.href = './pages/assembly-guide/assembly-guide.css';

        link.onload = () => resolve();
        link.onerror = () => resolve(); // Continue even if CSS fails

        document.head.appendChild(link);
    });
}

/**
 * Setup ResizeObserver for canvas container
 * This ensures proper resize handling for split-layout pages
 */
function setupResizeObserver() {
    const canvasContainer = document.getElementById('assembly-canvas-container');
    if (!canvasContainer) return;

    // Cleanup existing observer
    if (resizeObserver) {
        resizeObserver.disconnect();
    }

    // Create new observer
    resizeObserver = new ResizeObserver((entries) => {
        // Debounce resize events
        clearTimeout(resizeObserver._debounceTimer);
        resizeObserver._debounceTimer = setTimeout(() => {
            if (state.renderer && state.camera) {
                const { width, height } = entries[0].contentRect;
                if (width > 0 && height > 0) {
                    state.camera.aspect = width / height;
                    state.camera.updateProjectionMatrix();
                    state.renderer.setSize(width, height);
                }
            }
        }, 50);
    });

    resizeObserver.observe(canvasContainer);
}

/**
 * Load project model
 */
async function loadProjectModel(projectId) {
    try {
        const response = await fetch(`../../data/projects/${projectId}.json`);
        if (response.ok) {
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

            state.modelData = JSON.parse(text);
        }
    } catch (e) {
        console.error('Failed to load model:', e);
    }
}

/**
 * Extract blocks from model data
 */
function extractBlocks(modelData) {
    // Support both 'blocks' (correct) and 'Blocks' (legacy) naming
    const blocksArray = modelData?.blocks || modelData?.Blocks;
    if (!blocksArray || blocksArray.length === 0) return [];

    // Get panels and furniture arrays for lookup
    const allPanels = modelData?.panels || modelData?.Panels || [];
    const allFurniture = modelData?.furniture || modelData?.Furniture || [];

    return blocksArray.map((block, index) => {
        // Get panels for this block via childPanelIds
        const panels = [];
        if (block.childPanelIds && Array.isArray(block.childPanelIds)) {
            block.childPanelIds.forEach(panelId => {
                const panel = allPanels.find(p => p.id === panelId);
                if (panel) panels.push(panel);
            });
        }

        // Get furniture for this block via childFurnitureIds
        const furniture = [];
        if (block.childFurnitureIds && Array.isArray(block.childFurnitureIds)) {
            block.childFurnitureIds.forEach(furnId => {
                const item = allFurniture.find(f => f.id === furnId);
                if (item) furniture.push(item);
            });
        }

        // Calculate block dimensions from panels
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        panels.forEach(panel => {
            // Support both lowercase and uppercase property names
            const pos = panel.position || panel.Position || { x: 0, y: 0, z: 0 };
            const size = panel.size || panel.Size || { x: 100, y: 100, z: 18 };

            const posX = pos.x ?? pos.X ?? 0;
            const posY = pos.y ?? pos.Y ?? 0;
            const posZ = pos.z ?? pos.Z ?? 0;
            const sizeX = size.x ?? size.X ?? 100;
            const sizeY = size.y ?? size.Y ?? 100;
            const sizeZ = size.z ?? size.Z ?? 18;

            minX = Math.min(minX, posX);
            minY = Math.min(minY, posY);
            minZ = Math.min(minZ, posZ);
            maxX = Math.max(maxX, posX + sizeX);
            maxY = Math.max(maxY, posY + sizeY);
            maxZ = Math.max(maxZ, posZ + sizeZ);
        });

        // Handle case when no panels found
        if (!isFinite(minX)) {
            minX = minY = minZ = 0;
            maxX = maxY = maxZ = 0;
        }

        return {
            id: block.id || block.Id || index,
            name: block.name || block.Name || `Короб ${index + 1}`,
            index: index,
            panels: panels,
            furniture: furniture,
            childPanelIds: block.childPanelIds || [],
            childFurnitureIds: block.childFurnitureIds || [],
            dimensions: {
                width: Math.round(maxX - minX),
                height: Math.round(maxY - minY),
                depth: Math.round(maxZ - minZ)
            }
        };
    });
}

/**
 * Render loading state
 */
function renderLoading() {
    return `
        <div class="assembly-guide">
            <div class="assembly-loading">
                <div class="loading-spinner"></div>
                <p>Загрузка схемы сборки...</p>
            </div>
        </div>
    `;
}

/**
 * Render no data state
 */
function renderNoData() {
    return `
        <div class="assembly-guide">
            <div class="assembly-guide-header">
                <div class="header-left">
                    <button class="btn-back" id="btn-back">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Назад
                    </button>
                </div>
            </div>
            <div class="assembly-loading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:64px;height:64px;opacity:0.3">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                </svg>
                <p>Модель не загружена. Вернитесь к просмотру и загрузите модель.</p>
            </div>
        </div>
    `;
}

/**
 * Render no blocks state
 */
function renderNoBlocks() {
    return `
        <div class="assembly-guide">
            <div class="assembly-guide-header">
                <div class="header-left">
                    <button class="btn-back" id="btn-back">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Назад
                    </button>
                </div>
            </div>
            <div class="assembly-loading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:64px;height:64px;opacity:0.3">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
                <p>В модели нет блоков для отображения.</p>
            </div>
        </div>
    `;
}

/**
 * Render main page
 */
function renderPage() {
    const block = blocks[currentStep];

    return `
        <div class="assembly-guide">
            <!-- Header -->
            <header class="assembly-guide-header">
                <div class="header-left">
                    <button class="btn-back" id="btn-back">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        К модели
                    </button>
                    <div class="header-title">
                        <h1>Схема сборки</h1>
                        <span>${state.modelData?.Name || 'Изделие'}</span>
                    </div>
                </div>
                
                <div class="header-center">
                    <div class="preview-controls">
                        <div class="controls-group">
                            <button class="btn-preview-control" id="btn-rotate" title="Сбросить вид">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12a9 9 0 11-9-9c2.52 0 4.85.83 6.72 2.24"/>
                                    <path d="M21 3v6h-6"/>
                                </svg>
                            </button>
                            <button class="btn-preview-control" id="btn-view-front" title="Вид спереди">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                </svg>
                            </button>
                            <button class="btn-preview-control" id="btn-view-top" title="Вид сверху">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="9"/>
                                </svg>
                            </button>
                        </div>
                        <div class="controls-divider"></div>
                        <div class="controls-group">
                            <button class="btn-preview-control" id="btn-explode" title="Разнести">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z"/>
                                </svg>
                            </button>
                            <button class="btn-preview-control" id="btn-positions" title="Позиции">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <text x="12" y="16" text-anchor="middle" font-size="12" fill="currentColor">1</text>
                                </svg>
                            </button>
                            <button class="btn-preview-control" id="btn-dimensions" title="Размеры">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 6H3M21 12H3M21 18H3"/>
                                    <path d="M18 3v3M6 3v3M18 15v6M6 15v6"/>
                                </svg>
                            </button>
                        </div>
                        <div class="controls-divider"></div>
                        <div class="controls-group">
                            <button class="btn-preview-control" id="btn-hide-selected" title="Скрыть выделенное">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                    <path d="M1 1l22 22"/>
                                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                </svg>
                            </button>
                            <button class="btn-preview-control" id="btn-hide-unselected" title="Скрыть остальные">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                            </button>
                            <button class="btn-preview-control" id="btn-show-all" title="Показать все">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="7" height="7"/>
                                    <rect x="14" y="3" width="7" height="7"/>
                                    <rect x="14" y="14" width="7" height="7"/>
                                    <rect x="3" y="14" width="7" height="7"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="header-right">
                    <div class="step-indicator">
                        <span>Шаг ${currentStep + 1}</span>
                    </div>
                    <div class="block-dimensions">${block.dimensions.width} × ${block.dimensions.height} × ${block.dimensions.depth} мм</div>
                    <div class="block-badge">
                        <span class="block-number-badge">${currentStep + 1}</span>
                    </div>
                    <div class="block-counter">Короб ${currentStep + 1} / ${blocks.length}</div>
                </div>
            </header>
            
            <!-- Main Content -->
            <main class="assembly-guide-content">
                <!-- 3D Preview -->
                <section class="preview-section">
                    <div class="preview-container">
                        <div id="assembly-canvas-container"></div>
                        
                        <!-- Model Overview Preview - LEFT -->
                        <div class="model-overview-container" id="model-overview-container">
                            <div class="model-overview-header">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="7" height="7"/>
                                    <rect x="14" y="3" width="7" height="7"/>
                                    <rect x="14" y="14" width="7" height="7"/>
                                    <rect x="3" y="14" width="7" height="7"/>
                                </svg>
                                <span>Обзор модели</span>
                            </div>
                            <div class="model-overview-canvas" id="model-overview-canvas"></div>
                            <div class="model-overview-legend">
                                <span class="legend-current">● ТЕКУЩИЙ КОРОБ</span>
                            </div>
                        </div>
                        
                    </div>
                </section>
                
                <!-- Specification Panel -->
                <aside class="spec-section">
                    <div class="spec-header">
                        <h2>Спецификация короба</h2>
                        <p>Панели и фурнитура для сборки</p>
                    </div>
                    
                    <div class="spec-content">
                        <div class="spec-tabs">
                            <button class="spec-tab active" data-tab="panels">
                                Панели (${block.panels.length})
                            </button>
                            <button class="spec-tab" data-tab="furniture">
                                Фурнитура (${block.furniture.length})
                            </button>
                        </div>
                        
                        <div id="spec-panels" class="spec-list">
                            ${renderPanelsList(block.panels)}
                        </div>
                        
                        <div id="spec-furniture" class="spec-list" style="display:none">
                            ${renderFurnitureList(block.furniture)}
                        </div>
                    </div>
                </aside>
            </main>
            
            <!-- Step Navigation with arrows -->
            <footer class="step-nav-bar">
                <button class="btn-nav" id="btn-prev" ${currentStep === 0 ? 'disabled' : ''} title="Предыдущий короб">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6"/>
                    </svg>
                </button>
                <div class="step-dots">
                    ${blocks.map((b, i) => `
                        <div class="step-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}" 
                             data-step="${i}" title="${b.name}"></div>
                    `).join('')}
                </div>
                <button class="btn-nav" id="btn-next" ${currentStep === blocks.length - 1 ? 'disabled' : ''} title="Следующий короб">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </button>
            </footer>
        </div>
    `;
}

/**
 * Render panels list - show each panel individually with original name
 */
function renderPanelsList(panels) {
    if (!panels || panels.length === 0) {
        return `
            <div class="spec-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
                <p>Нет панелей</p>
            </div>
        `;
    }

    // Show each panel individually
    return panels.map((panel, index) => {
        const size = panel.size || panel.Size || { x: 0, y: 0, z: 18 };
        let sizeX = size.x ?? size.X ?? 0;
        let sizeY = size.y ?? size.Y ?? 0;
        let sizeZ = size.z ?? size.Z ?? 18;
        const materialData = panel.material || panel.Material;
        const materialName = typeof materialData === 'string' ? materialData : (materialData?.name || panel.materialName || 'ДСП');

        // Calculate CORRECT thickness from geometry (highZ - lowZ) or material.thickness
        // This fixes Bazis export bug where size.z may contain incorrect values
        let thickness;
        if (panel.highZ !== undefined && panel.lowZ !== undefined) {
            // Preferred: use actual geometry bounds
            thickness = Math.round(panel.highZ - panel.lowZ);
        } else if (typeof materialData === 'object' && materialData?.thickness) {
            // Fallback: use material thickness property
            thickness = Math.round(materialData.thickness);
        } else {
            // Last resort: use smallest dimension (legacy behavior)
            let dims = [Math.round(sizeX), Math.round(sizeY), Math.round(sizeZ)].sort((a, b) => a - b);
            thickness = dims[0];
        }

        // Get panel length and width (two largest dimensions)
        let dims = [Math.round(sizeX), Math.round(sizeY), Math.round(sizeZ)].sort((a, b) => a - b);
        const width = dims[1];      // Medium = width
        const length = dims[2];     // Largest = length

        // Get panel properties
        const posNumber = panel.positionNumber || panel.PositionNumber || '';
        const panelName = panel.name || panel.Name || '';
        const panelId = panel.id || panel.Id || (index + 1);

        // Build display name: Position + Name
        let displayName = '';
        let positionInfo = '';

        // Clean panel name from encoding issues
        let cleanName = panelName;
        if (panelName && /[\uFFFD]|рў|Р|п»ї|�/.test(panelName)) {
            cleanName = ''; // Name is corrupted
        }

        // Position number (e.g. "13-4")
        if (posNumber) {
            positionInfo = posNumber;
        }

        // Build final display name
        if (cleanName && posNumber) {
            displayName = `${cleanName} [${posNumber}]`;
        } else if (cleanName) {
            displayName = cleanName;
        } else if (posNumber) {
            displayName = `Панель ${posNumber}`;
        } else {
            displayName = `Панель ${panelId}`;
        }

        return `
            <div class="spec-item" data-panel-id="${panelId}">
                <div class="spec-item-icon panel-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
                </div>
                <div class="spec-item-content">
                    <span class="spec-item-name">${displayName}</span>
                    <div class="spec-item-details">
                        <span class="spec-detail"><strong>${length} × ${width}</strong> мм</span>
                        <span class="spec-detail">Толщина: ${thickness} мм</span>
                        <span class="spec-detail">${materialName}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render furniture list
 */
function renderFurnitureList(furniture) {
    if (!furniture || furniture.length === 0) {
        return `
            <div class="spec-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                </svg>
                <p>Нет фурнитуры</p>
            </div>
        `;
    }

    // Group furniture by name
    const grouped = {};
    furniture.forEach(item => {
        const name = item.name || item.Name || item.article || item.Article || 'Фурнитура';
        if (!grouped[name]) {
            grouped[name] = {
                name: name,
                article: item.article || item.Article || '',
                items: []
            };
        }
        grouped[name].items.push(item);
    });

    return Object.values(grouped).map(group => `
        <div class="spec-item">
            <div class="spec-item-icon furniture-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                </svg>
            </div>
            <div class="spec-item-content">
                <span class="spec-item-name">${group.name}</span>
                ${group.article ? `<div class="spec-item-details"><span class="spec-detail">Артикул: ${group.article}</span></div>` : ''}
            </div>
            <div class="spec-item-quantity">${group.items.length}</div>
        </div>
    `).join('');
}

/**
 * Get display name for panel
 */
function getPanelDisplayName(panel) {
    const name = panel.name || panel.Name || '';

    // Try to derive name from panel type
    if (name.includes('Дно') || name.toLowerCase().includes('bottom')) return 'Дно';
    if (name.includes('Столешница') || name.toLowerCase().includes('top')) return 'Столешница';
    if (name.includes('Стойка') || name.toLowerCase().includes('side')) return 'Стойка';
    if (name.includes('Полка') || name.toLowerCase().includes('shelf')) return 'Полка';
    if (name.includes('Задняя') || name.toLowerCase().includes('back')) return 'Задняя стенка';
    if (name.includes('Царга') || name.toLowerCase().includes('rail')) return 'Царга';
    if (name.includes('Фасад') || name.toLowerCase().includes('door')) return 'Фасад';

    // Check orientation for default naming
    const orientation = panel.orientation || panel.Orientation || panel.planeType || panel.PlaneType || '';
    if (orientation === 'XZ' || orientation === 'H') return 'Горизонтальная панель';
    if (orientation === 'YZ' || orientation === 'V') return 'Вертикальная панель';

    // Use positionNumber if available
    if (panel.positionNumber) return `Панель ${panel.positionNumber}`;

    return name || 'Панель';
}

/**
 * Initialize 3D viewer for block preview
 */
function initBlockViewer() {
    const canvasContainer = document.getElementById('assembly-canvas-container');
    if (!canvasContainer || isInitialized) return;

    // We'll use a simplified approach - reuse scene module
    try {
        initScene('assembly-canvas-container');
        initCameras();

        // Initialize raycaster for 3D selection
        initRaycasterSelection(canvasContainer);

        // Build the first block
        buildBlockMesh(blocks[currentStep]);

        // Hide shadow floor in assembly guide
        hideShadowFloor();

        animate();
        isInitialized = true;
    } catch (e) {
        console.error('Failed to init viewer:', e);
        // Show fallback static view
        canvasContainer.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;">
                <p>3D предпросмотр недоступен</p>
            </div>
        `;
    }
}

/**
 * Initialize raycaster for 3D click selection
 */
function initRaycasterSelection(canvasContainer) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    canvasContainer.addEventListener('click', (event) => {
        // Get canvas bounds
        const canvas = state.renderer?.domElement;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // Calculate normalized device coordinates
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update raycaster
        raycaster.setFromCamera(mouse, state.activeCamera);

        // First check if clicking on a position label (only if labels are visible)
        if (positionLabelsGroup && positionLabelsGroup.visible && positionsVisible) {
            const labelIntersects = raycaster.intersectObjects(positionLabelsGroup.children, false);
            if (labelIntersects.length > 0) {
                const label = labelIntersects[0].object;
                if (label.visible && label.userData.isPositionLabel && label.userData.mesh) {
                    // Ctrl+click on label adds to selection
                    if (event.ctrlKey || event.metaKey) {
                        toggleMeshSelection(label.userData.mesh);
                    } else {
                        focusCameraOnMesh(label.userData.mesh);
                        select3DMesh(label.userData.mesh);
                    }
                    return;
                }
            }
        }

        // Filter to only visible meshes for raycasting
        const visibleMeshes = state.meshes.filter(m => m.visible);
        if (visibleMeshes.length === 0) {
            // No visible meshes - clear selection on click
            if (!event.ctrlKey && !event.metaKey) {
                clearAllSelection();
            }
            return;
        }

        // Find intersections with visible meshes only
        const intersects = raycaster.intersectObjects(visibleMeshes, true);

        if (intersects.length > 0) {
            // Find the actual parent mesh that's in our meshes array
            let selectedMesh = intersects[0].object;

            // Walk up the parent chain to find the mesh in state.meshes
            let found = false;
            while (selectedMesh) {
                if (state.meshes.includes(selectedMesh) && selectedMesh.visible) {
                    found = true;
                    break;
                }
                selectedMesh = selectedMesh.parent;
            }

            if (found && selectedMesh) {
                // Ctrl+click for multi-select
                if (event.ctrlKey || event.metaKey) {
                    toggleMeshSelection(selectedMesh);
                } else {
                    select3DMesh(selectedMesh);
                }
            } else {
                // Hit something but couldn't find valid mesh - treat as empty space
                if (!event.ctrlKey && !event.metaKey) {
                    clearAllSelection();
                }
            }
        } else {
            // Click on empty space - clear selection (unless Ctrl held)
            if (!event.ctrlKey && !event.metaKey) {
                clearAllSelection();
            }
        }
    });
}

/**
 * Focus camera on a specific mesh with smooth animation
 */
function focusCameraOnMesh(mesh) {
    if (!state.activeCamera || !state.controls) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Calculate camera distance to fit mesh nicely
    const distance = maxDim * 3;

    // Position camera in front of mesh (at max z, looking at center)
    // This ensures we see the front face of the panel unoccluded
    const newPos = new THREE.Vector3(
        center.x,
        center.y + distance * 0.2,  // Slight elevation
        box.max.z + distance        // In front of panel
    );

    // Move camera to show panel front
    state.activeCamera.position.copy(newPos);
    state.controls.target.copy(center);
    state.controls.update();
}

/**
 * Select a 3D mesh and sync with panel list
 */
function select3DMesh(mesh) {
    // Clear previous selection
    clearAllSelection();

    // Mark as selected
    mesh.userData.isSelected = true;

    // Apply highlight material
    if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
    }

    mesh.material = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.8,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.3
    });

    // Sync with panel list UI
    const panelId = mesh.userData.data?.id;
    if (panelId) {
        document.querySelectorAll('.spec-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.panelId === panelId) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    // Sync with overview
    syncOverviewWithMainView();
}

/**
 * Toggle mesh selection (for Ctrl+click multi-select)
 */
function toggleMeshSelection(mesh) {
    if (mesh.userData.isSelected) {
        // Deselect
        mesh.userData.isSelected = false;
        if (mesh.userData.originalMaterial) {
            mesh.material = mesh.userData.originalMaterial;
        }

        // Update UI
        const panelId = mesh.userData.data?.id;
        if (panelId) {
            document.querySelectorAll(`.spec-item[data-panel-id="${panelId}"]`).forEach(item => {
                item.classList.remove('selected');
            });
        }
    } else {
        // Add to selection
        mesh.userData.isSelected = true;

        // Store original material if not stored
        if (!mesh.userData.originalMaterial) {
            mesh.userData.originalMaterial = mesh.material;
        }

        // Apply highlight
        mesh.material = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.8,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.3
        });

        // Update UI
        const panelId = mesh.userData.data?.id;
        if (panelId) {
            document.querySelectorAll(`.spec-item[data-panel-id="${panelId}"]`).forEach(item => {
                item.classList.add('selected');
            });
        }
    }

    // Sync with overview
    syncOverviewWithMainView();
}

/**
 * Clear all selection (3D and UI)
 */
function clearAllSelection() {
    // Clear 3D selection
    state.meshes.forEach(mesh => {
        mesh.userData.isSelected = false;
        if (mesh.userData.originalMaterial) {
            mesh.material = mesh.userData.originalMaterial;
        }
    });

    // Clear UI selection
    document.querySelectorAll('.spec-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Sync with overview
    syncOverviewWithMainView();
}

/**
 * Build mesh for a single block
 */
function buildBlockMesh(block) {
    // This would need the model-builder logic adapted for single block
    // For MVP, we'll dynamically import and use the existing builder
    import('../../modules/model-builder.js').then(async (modelBuilder) => {
        // Clear existing
        if (state.scene) {
            state.meshes.forEach(mesh => state.scene.remove(mesh));
            state.meshes = [];
        }

        // Get the original data
        const originalBlocks = state.modelData.blocks || state.modelData.Blocks || [];
        const originalPanels = state.modelData.panels || state.modelData.Panels || [];
        const originalFurniture = state.modelData.furniture || state.modelData.Furniture || [];

        // Get the specific block
        const targetBlock = originalBlocks[block.index];
        if (!targetBlock) {
            console.error('Block not found at index:', block.index);
            return;
        }

        // Filter panels and furniture to only those in this block
        const blockPanelIds = new Set(targetBlock.childPanelIds || []);
        const blockFurnitureIds = new Set(targetBlock.childFurnitureIds || []);

        const filteredPanels = originalPanels.filter(p => blockPanelIds.has(p.id));
        const filteredFurniture = originalFurniture.filter(f => blockFurnitureIds.has(f.id));

        // Temporarily replace data with filtered version
        state.modelData.blocks = [targetBlock];
        state.modelData.panels = filteredPanels;
        state.modelData.furniture = filteredFurniture;

        // Build
        const buildFn = modelBuilder.buildModel || modelBuilder.default?.buildModel;
        if (buildFn) {
            buildFn();
        }

        // Restore original data
        state.modelData.blocks = originalBlocks;
        state.modelData.panels = originalPanels;
        state.modelData.furniture = originalFurniture;

        // Hide shadow floor in assembly guide
        hideShadowFloor();

        // Fit camera to model (full screen)
        fitCameraToBlock();
    }).catch(e => {
        console.error('Failed to build block mesh:', e);
    });
}

/**
 * Hide shadow floor mesh
 */
function hideShadowFloor() {
    if (state.scene) {
        const shadowFloor = state.scene.getObjectByName('shadowFloor');
        if (shadowFloor) {
            shadowFloor.visible = false;
        }
    }
}

/**
 * Fit camera to show block at full screen scale
 */
function fitCameraToBlock() {
    if (!state.activeCamera || !state.controls) return;

    // Calculate bounds of visible meshes
    const box = new THREE.Box3();
    state.meshes.forEach(mesh => {
        if (mesh.visible) {
            box.expandByObject(mesh);
        }
    });

    if (box.isEmpty()) return;

    state.modelBounds = box;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Position camera at isometric view
    const distance = maxDim * 1.2;
    state.activeCamera.position.set(
        center.x + distance * 0.7,
        center.y + distance * 0.5,
        center.z + distance * 0.7
    );
    state.activeCamera.lookAt(center);
    state.controls.target.copy(center);
    state.controls.update();

    // Update camera near/far
    state.activeCamera.near = maxDim * 0.01;
    state.activeCamera.far = maxDim * 10;
    state.activeCamera.updateProjectionMatrix();
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

        // Update label scales based on camera distance
        updateLabelScales();

        state.renderer.render(state.scene, state.activeCamera);
    }
}

/**
 * Update label scales based on camera distance for readability
 */
function updateLabelScales() {
    if (!state.activeCamera) return;

    const cameraPos = state.activeCamera.position;
    const target = state.controls?.target || new THREE.Vector3();
    const distance = cameraPos.distanceTo(target);

    // Base scale factor - adjust based on camera distance
    // When camera is far (large distance), scale up labels
    // When camera is close (small distance), scale down labels
    const baseScale = distance * 0.08;
    const minScale = 30;
    const maxScale = 150;
    const scale = Math.max(minScale, Math.min(maxScale, baseScale));

    // Update position labels (circular - keep 1:1 ratio)
    if (positionLabelsGroup) {
        positionLabelsGroup.children.forEach(sprite => {
            if (sprite.isSprite) {
                // Keep circle proportions
                sprite.scale.set(scale, scale, 1);
            }
        });
    }

    // Update dimension labels (rectangular - keep aspect ratio)
    if (dimensionsGroup) {
        dimensionsGroup.children.forEach(group => {
            group.children.forEach(child => {
                if (child.isSprite) {
                    // Preserve original aspect ratio
                    const aspect = child.userData.originalAspect || 3;
                    child.scale.set(scale * aspect, scale, 1);
                }
            });
        });
    }
}

/**
 * Render current block (update UI)
 */
function renderCurrentBlock() {
    const block = blocks[currentStep];

    // Update block info in header-right
    const stepIndicator = document.querySelector('.step-indicator span');
    const blockDimensions = document.querySelector('.block-dimensions');
    const blockNumberBadge = document.querySelector('.block-number-badge');
    const blockCounter = document.querySelector('.block-counter');

    if (stepIndicator) stepIndicator.textContent = `Шаг ${currentStep + 1}`;
    if (blockDimensions) blockDimensions.textContent = `${block.dimensions.width} × ${block.dimensions.height} × ${block.dimensions.depth} мм`;
    if (blockNumberBadge) blockNumberBadge.textContent = currentStep + 1;
    if (blockCounter) blockCounter.textContent = `Короб ${currentStep + 1} / ${blocks.length}`;

    // Update nav buttons
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    if (btnPrev) btnPrev.disabled = currentStep === 0;
    if (btnNext) btnNext.disabled = currentStep === blocks.length - 1;

    // Update step dots
    document.querySelectorAll('.step-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentStep);
        dot.classList.toggle('completed', i < currentStep);
    });

    // Update specification tabs and lists
    const panelsTab = document.querySelector('[data-tab="panels"]');
    const furnitureTab = document.querySelector('[data-tab="furniture"]');
    if (panelsTab) panelsTab.innerHTML = `Панели (${block.panels.length})`;
    if (furnitureTab) furnitureTab.innerHTML = `Фурнитура (${block.furniture.length})`;

    const panelsList = document.getElementById('spec-panels');
    const furnitureList = document.getElementById('spec-furniture');
    if (panelsList) panelsList.innerHTML = renderPanelsList(block.panels);
    if (furnitureList) furnitureList.innerHTML = renderFurnitureList(block.furniture);

    // Rebind panel selection handlers after updating list
    bindPanelSelection();

    // Clear existing overlays before rebuilding
    hidePositionLabels();
    hideDimensionsGroup();

    // Rebuild 3D model for new block
    if (isInitialized) {
        buildBlockMesh(block);

        // Update model overview to highlight current block
        updateModelOverview();

        // Restore overlays if they were visible
        setTimeout(() => {
            if (positionsVisible) {
                showPositionLabels();
            }
            if (dimensionsVisible) {
                updateDimensions();
            }
        }, 100);  // Wait for meshes to be built
    }
}

/**
 * Navigate to step
 */
function goToStep(step) {
    if (step < 0 || step >= blocks.length) return;
    currentStep = step;
    renderCurrentBlock();
}

/**
 * Bind event handlers
 */
function bindEvents() {
    // Back button
    document.getElementById('btn-back')?.addEventListener('click', () => {
        const projectId = router.params?.projectId || router.params?.id;
        if (projectId) {
            router.navigate(`/project/${projectId}/viewer`);
        } else {
            router.navigate('/viewer');
        }
    });

    // Navigation
    document.getElementById('btn-prev')?.addEventListener('click', () => {
        goToStep(currentStep - 1);
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
        goToStep(currentStep + 1);
    });

    // Step dots
    document.querySelectorAll('.step-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const step = parseInt(dot.dataset.step);
            goToStep(step);
        });
    });

    // Spec tabs
    document.querySelectorAll('.spec-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            document.querySelectorAll('.spec-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.getElementById('spec-panels').style.display = tabName === 'panels' ? 'flex' : 'none';
            document.getElementById('spec-furniture').style.display = tabName === 'furniture' ? 'flex' : 'none';
        });
    });

    // Panel selection in specification list
    bindPanelSelection();

    // Preview control buttons
    bindPreviewControls();

    // Keyboard navigation
    document.addEventListener('keydown', handleKeydown);
}

/**
 * Bind panel selection click handlers
 */
function bindPanelSelection() {
    document.querySelectorAll('.spec-item[data-panel-id]').forEach(item => {
        item.addEventListener('click', (event) => {
            const panelId = item.dataset.panelId;
            const mesh = state.meshByPanelId?.[panelId];

            if (event.ctrlKey || event.metaKey) {
                // Ctrl+click: toggle this item's selection
                item.classList.toggle('selected');
                if (mesh) {
                    toggleMeshSelection(mesh);
                }
            } else {
                // Normal click: select only this item
                document.querySelectorAll('.spec-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');

                // Highlight corresponding mesh in 3D
                highlightPanel(panelId);
            }
        });
    });
}

/**
 * Highlight panel mesh in 3D viewer
 */
function highlightPanel(panelId) {
    // Find the mesh by panel ID
    const mesh = state.meshByPanelId?.[panelId];

    if (mesh) {
        // Clear previous selection using unified function
        clearAllSelection();

        // Mark as selected
        mesh.userData.isSelected = true;

        // Store original material and apply highlight
        if (!mesh.userData.originalMaterial) {
            mesh.userData.originalMaterial = mesh.material;
        }

        // Create highlight material
        mesh.material = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.8,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.3
        });

        // Re-add selected class to UI item
        document.querySelectorAll('.spec-item').forEach(item => {
            if (item.dataset.panelId === panelId) {
                item.classList.add('selected');
            }
        });

        // Center camera on selected panel
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        if (state.controls) {
            state.controls.target.copy(center);
            state.controls.update();
        }
    }
}

/**
 * Bind preview control buttons (view angles, explode, etc.)
 */
function bindPreviewControls() {
    // Reset/rotate view
    document.getElementById('btn-rotate')?.addEventListener('click', () => {
        // Reset to isometric view
        if (state.activeCamera && state.controls) {
            const bounds = state.modelBounds;
            if (bounds && !bounds.isEmpty()) {
                const center = bounds.getCenter(new THREE.Vector3());
                const size = bounds.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                state.activeCamera.position.set(
                    center.x + maxDim * 0.8,
                    center.y + maxDim * 0.6,
                    center.z + maxDim * 0.8
                );
                state.activeCamera.lookAt(center);
                state.controls.target.copy(center);
                state.controls.update();
            }
        }
    });

    // Front view
    document.getElementById('btn-view-front')?.addEventListener('click', () => {
        setView('front');
    });

    // Top view
    document.getElementById('btn-view-top')?.addEventListener('click', () => {
        setView('top');
    });

    // Explode toggle
    document.getElementById('btn-explode')?.addEventListener('click', () => {
        toggleExplode();
    });

    // Positions toggle
    document.getElementById('btn-positions')?.addEventListener('click', () => {
        togglePositions();
    });

    // Dimensions toggle
    document.getElementById('btn-dimensions')?.addEventListener('click', () => {
        toggleDimensions();
    });

    // Hide selected panels
    document.getElementById('btn-hide-selected')?.addEventListener('click', () => {
        hideSelectedPanels();
    });

    // Hide unselected panels
    document.getElementById('btn-hide-unselected')?.addEventListener('click', () => {
        hideUnselectedPanels();
    });

    // Show all panels
    document.getElementById('btn-show-all')?.addEventListener('click', () => {
        showAllPanels();
    });
}

/**
 * Set camera view to specific direction
 */
function setView(direction) {
    if (!state.activeCamera || !state.controls || !state.modelBounds) return;

    const bounds = state.modelBounds;
    if (bounds.isEmpty()) return;

    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.5;

    let pos = new THREE.Vector3();

    switch (direction) {
        case 'front':
            pos.set(center.x, center.y, center.z + dist);
            break;
        case 'back':
            pos.set(center.x, center.y, center.z - dist);
            break;
        case 'top':
            pos.set(center.x, center.y + dist, center.z);
            break;
        case 'left':
            pos.set(center.x - dist, center.y, center.z);
            break;
        case 'right':
            pos.set(center.x + dist, center.y, center.z);
            break;
    }

    state.activeCamera.position.copy(pos);
    state.activeCamera.lookAt(center);
    state.controls.target.copy(center);
    state.controls.update();
}

/**
 * Toggle explode/assemble view
 */
function toggleExplode() {
    state.isExploded = !state.isExploded;

    state.meshes.forEach(mesh => {
        if (!mesh.userData.originalPosition) {
            mesh.userData.originalPosition = mesh.position.clone();
        }

        if (state.isExploded) {
            // Get direction from center
            const center = state.modelBounds ? state.modelBounds.getCenter(new THREE.Vector3()) : new THREE.Vector3();
            const direction = mesh.userData.originalPosition.clone().sub(center).normalize();
            const dist = 100; // Increased explode distance
            mesh.position.copy(mesh.userData.originalPosition.clone().add(direction.multiplyScalar(dist)));
        } else {
            mesh.position.copy(mesh.userData.originalPosition);
        }
    });

    // Toggle button active state
    const btn = document.getElementById('btn-explode');
    if (btn) {
        btn.classList.toggle('active', state.isExploded);
    }
}

// Track visibility states
let dimensionsVisible = false;
let positionsVisible = false;
let positionLabelsGroup = null;
let dimensionsGroup = null;

/**
 * Create circular label for panel position
 * Pattern from labels.js - createTextSprite
 */
function createPositionLabel(text, panelId) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Fixed size canvas (like labels.js)
    const size = 128;
    canvas.width = size;
    canvas.height = size;

    // Style settings
    const fontSize = 48;
    const bgColor = '#ffffff';
    const borderColor = '#333333';
    const textColor = '#333333';

    ctx.clearRect(0, 0, size, size);

    // Draw circle background
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
        depthTest: false  // Always show above geometry
    });
    const sprite = new THREE.Sprite(material);

    // Fixed scale (like labels.js uses 60)
    const scale = 60;
    sprite.scale.set(scale, scale, 1);
    sprite.renderOrder = 2000;

    // Store panel reference for click handling (unlike labels.js, we need clicks)
    sprite.userData.panelId = panelId;
    sprite.userData.isPositionLabel = true;

    return sprite;
}

/**
 * Show position labels on all visible panels (NOT furniture)
 * Pattern from labels.js - use center position, no offset
 */
function showPositionLabels() {
    hidePositionLabels();

    if (!state.scene) return;

    positionLabelsGroup = new THREE.Group();

    state.meshes.forEach(mesh => {
        if (!mesh.visible) return;

        // Skip furniture - only show positions on panels
        if (mesh.userData.type === 'furniture') return;

        const data = mesh.userData.data;
        if (!data) return;

        const posNumber = data.positionNumber || data.PositionNumber;
        if (!posNumber) return;

        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());

        // Create label and position at center (like labels.js)
        const label = createPositionLabel(posNumber, data.id);
        label.position.copy(center);
        label.userData.mesh = mesh;  // Store reference for click handling
        positionLabelsGroup.add(label);
    });

    state.scene.add(positionLabelsGroup);

    // Start occlusion checking loop
    startOcclusionLoop();
}

// Occlusion loop reference
let occlusionLoopId = null;
const occlusionRaycaster = new THREE.Raycaster();

/**
 * Start loop to check label occlusion
 */
function startOcclusionLoop() {
    stopOcclusionLoop();

    function checkOcclusion() {
        if (!positionLabelsGroup || !state.activeCamera) {
            stopOcclusionLoop();
            return;
        }

        updateLabelOcclusion();
        occlusionLoopId = requestAnimationFrame(checkOcclusion);
    }

    checkOcclusion();
}

/**
 * Stop occlusion loop
 */
function stopOcclusionLoop() {
    if (occlusionLoopId) {
        cancelAnimationFrame(occlusionLoopId);
        occlusionLoopId = null;
    }
}

/**
 * Check each label's visibility using raycasting
 */
function updateLabelOcclusion() {
    if (!positionLabelsGroup || !state.activeCamera) return;

    const camera = state.activeCamera;

    positionLabelsGroup.children.forEach(label => {
        if (!label.isSprite) return;

        const labelPos = label.position.clone();
        const cameraPos = camera.position.clone();

        // Direction from camera to label
        const direction = labelPos.clone().sub(cameraPos).normalize();

        // Set raycaster from camera towards label
        occlusionRaycaster.set(cameraPos, direction);

        // Distance from camera to label
        const labelDistance = cameraPos.distanceTo(labelPos);

        // Check intersections with meshes (excluding the label's own mesh)
        const intersects = occlusionRaycaster.intersectObjects(state.meshes, true);

        // Check if any object is between camera and label
        let isOccluded = false;
        for (const hit of intersects) {
            // Find root mesh
            let hitMesh = hit.object;
            while (hitMesh.parent && !state.meshes.includes(hitMesh)) {
                hitMesh = hitMesh.parent;
            }

            // If hit is closer than label and not the label's own mesh
            if (hit.distance < labelDistance - 5 && hitMesh !== label.userData.mesh) {
                isOccluded = true;
                break;
            }
        }

        // Set label visibility
        label.visible = !isOccluded;
    });
}

/**
 * Hide position labels
 */
function hidePositionLabels() {
    stopOcclusionLoop();
    if (positionLabelsGroup && state.scene) {
        state.scene.remove(positionLabelsGroup);
        positionLabelsGroup = null;
    }
}

/**
 * Toggle position labels visibility
 */
function togglePositions() {
    positionsVisible = !positionsVisible;

    const btn = document.getElementById('btn-positions');
    if (btn) {
        btn.classList.toggle('active', positionsVisible);
    }

    if (positionsVisible) {
        showPositionLabels();
    } else {
        hidePositionLabels();
    }
}

/**
 * Create dimension line with end caps and label
 */
function createDimensionLine(start, end, labelText) {
    const group = new THREE.Group();

    // Main line
    const lineMat = new THREE.LineBasicMaterial({ color: 0x374151, linewidth: 2 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);

    // End caps (perpendicular lines)
    const capLength = 15;
    const dir = new THREE.Vector3().subVectors(end, start).normalize();
    const perpY = new THREE.Vector3(0, 1, 0);
    const perpZ = new THREE.Vector3(0, 0, 1);
    let perp = Math.abs(dir.dot(perpY)) < 0.9 ? perpY : perpZ;
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
    const label = createDimensionLabel(labelText);
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    label.position.copy(midpoint);
    group.add(label);

    return group;
}

/**
 * Create dimension text label (clear text with white background)
 */
function createDimensionLabel(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set initial canvas size for measurement
    canvas.width = 300;
    canvas.height = 100;

    const fontSize = 22;
    ctx.font = `bold ${fontSize}px Arial`;
    const textMetrics = ctx.measureText(text);
    const textWidth = Math.max(textMetrics.width, 50);

    const paddingX = 16;
    const paddingY = 10;
    const width = Math.ceil(textWidth + paddingX * 2);
    const height = Math.ceil(fontSize + paddingY * 2);

    // Reset canvas to actual size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // White background (simple rect for compatibility)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Draw text (must set font again after canvas resize!)
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f2937';
    ctx.fillText(text, width / 2, height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(width, height, 1);
    sprite.renderOrder = 2001;
    sprite.raycast = () => { };

    return sprite;
}

/**
 * Update dimensions based on visible meshes
 */
function updateDimensions() {
    hideDimensionsGroup();

    if (!dimensionsVisible || !state.scene) return;

    // Calculate bounds of visible meshes only
    const box = new THREE.Box3();
    let visibleCount = 0;

    state.meshes.forEach(mesh => {
        if (mesh.visible) {
            box.expandByObject(mesh);
            visibleCount++;
        }
    });

    if (box.isEmpty() || visibleCount === 0) return;

    dimensionsGroup = new THREE.Group();

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const offset = 80;

    // Width dimension (X axis) - bottom front edge
    const widthStart = new THREE.Vector3(box.min.x, box.min.y - offset, box.max.z);
    const widthEnd = new THREE.Vector3(box.max.x, box.min.y - offset, box.max.z);
    dimensionsGroup.add(createDimensionLine(widthStart, widthEnd, `${Math.round(size.x)} мм`));

    // Height dimension (Y axis) - left front edge
    const heightStart = new THREE.Vector3(box.min.x - offset, box.min.y, box.max.z);
    const heightEnd = new THREE.Vector3(box.min.x - offset, box.max.y, box.max.z);
    dimensionsGroup.add(createDimensionLine(heightStart, heightEnd, `${Math.round(size.y)} мм`));

    // Depth dimension (Z axis) - only show if more than 1 panel visible
    if (visibleCount > 1) {
        const depthStart = new THREE.Vector3(box.max.x + offset, box.min.y - offset, box.min.z);
        const depthEnd = new THREE.Vector3(box.max.x + offset, box.min.y - offset, box.max.z);
        dimensionsGroup.add(createDimensionLine(depthStart, depthEnd, `${Math.round(size.z)} мм`));
    }

    state.scene.add(dimensionsGroup);
}

/**
 * Hide dimensions group
 */
function hideDimensionsGroup() {
    if (dimensionsGroup && state.scene) {
        state.scene.remove(dimensionsGroup);
        dimensionsGroup = null;
    }
}

/**
 * Toggle dimensions display
 */
function toggleDimensions() {
    dimensionsVisible = !dimensionsVisible;

    const btn = document.getElementById('btn-dimensions');
    if (btn) {
        btn.classList.toggle('active', dimensionsVisible);
    }

    updateDimensions();
}

/**
 * Update all overlays (positions and dimensions)
 */
function updateOverlays() {
    if (positionsVisible) {
        showPositionLabels();
    }
    if (dimensionsVisible) {
        updateDimensions();
    }
}

/**
 * Hide selected panels
 */
function hideSelectedPanels() {
    state.meshes.forEach(mesh => {
        if (mesh.userData.isSelected) {
            mesh.visible = false;
        }
    });
    updateOverlays();
    syncOverviewWithMainView();
}

/**
 * Hide unselected panels
 */
function hideUnselectedPanels() {
    state.meshes.forEach(mesh => {
        if (!mesh.userData.isSelected) {
            mesh.visible = false;
        }
    });
    updateOverlays();
    syncOverviewWithMainView();
}

/**
 * Show all panels
 */
function showAllPanels() {
    state.meshes.forEach(mesh => {
        mesh.visible = true;
    });
    updateOverlays();
    syncOverviewWithMainView();
}

/**
 * Handle keyboard navigation
 */
function handleKeydown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goToStep(currentStep - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goToStep(currentStep + 1);
    } else if (e.key === 'Escape') {
        const projectId = router.params?.projectId || router.params?.id;
        if (projectId) {
            router.navigate(`/project/${projectId}/viewer`);
        } else {
            router.navigate('/viewer');
        }
    }
}

/**
 * Model Overview Mini-Preview
 * Shows the entire model with the current block highlighted in green
 */
let overviewRenderer = null;
let overviewScene = null;
let overviewCamera = null;
let overviewMeshes = [];
let overviewAnimationId = null;

/**
 * Initialize the model overview mini-preview
 */
function initModelOverview() {
    const container = document.getElementById('model-overview-canvas');
    if (!container || !state.modelData) return;

    // Create separate renderer for overview
    overviewRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    overviewRenderer.setSize(container.clientWidth, container.clientHeight);
    overviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    overviewRenderer.setClearColor(0x000000, 0);
    container.appendChild(overviewRenderer.domElement);

    // Create scene
    overviewScene = new THREE.Scene();

    // Create camera
    overviewCamera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        10000
    );

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    overviewScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 1);
    overviewScene.add(directionalLight);

    // Build overview meshes for all blocks
    buildOverviewMeshes();

    // Start animation
    animateOverview();

    // Add click handler to navigate to blocks
    container.addEventListener('click', handleOverviewClick);
}

/**
 * Build actual panel meshes for all blocks in overview
 */
function buildOverviewMeshes() {
    if (!overviewScene || !state.modelData) return;

    // Clear existing
    overviewMeshes.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
        overviewScene.remove(mesh);
    });
    overviewMeshes = [];

    const blocksArray = state.modelData?.blocks || state.modelData?.Blocks || [];
    const allPanels = state.modelData?.panels || state.modelData?.Panels || [];

    blocksArray.forEach((block, blockIndex) => {
        // Get panels for this block
        const blockPanelIds = new Set(block.childPanelIds || []);
        const blockPanels = allPanels.filter(p => blockPanelIds.has(p.id));

        if (blockPanels.length === 0) return;

        const isCurrent = blockIndex === currentStep;

        // Create a group for this block's panels
        const blockGroup = new THREE.Group();
        blockGroup.userData.blockIndex = blockIndex;

        blockPanels.forEach(panel => {
            const pos = panel.position || panel.Position || { x: 0, y: 0, z: 0 };
            const size = panel.size || panel.Size || { x: 100, y: 100, z: 18 };

            const posX = pos.x ?? pos.X ?? 0;
            const posY = pos.y ?? pos.Y ?? 0;
            const posZ = pos.z ?? pos.Z ?? 0;
            const sizeX = size.x ?? size.X ?? 100;
            const sizeY = size.y ?? size.Y ?? 100;
            const sizeZ = size.z ?? size.Z ?? 18;

            // Create panel geometry with actual dimensions
            const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);

            const material = new THREE.MeshStandardMaterial({
                color: isCurrent ? 0x10b981 : 0xadb5bd,  // Green for current, gray for others
                transparent: true,
                opacity: isCurrent ? 0.95 : 0.6,
                emissive: isCurrent ? 0x059669 : 0x000000,
                emissiveIntensity: isCurrent ? 0.2 : 0
            });

            const mesh = new THREE.Mesh(geometry, material);
            // Position at center of panel
            mesh.position.set(
                posX + sizeX / 2,
                posY + sizeY / 2,
                posZ + sizeZ / 2
            );
            mesh.userData.blockIndex = blockIndex;

            blockGroup.add(mesh);
        });

        overviewScene.add(blockGroup);
        overviewMeshes.push(blockGroup);
    });

    // Fit camera to show all blocks
    fitOverviewCamera();
}

/**
 * Fit overview camera to show all blocks
 */
function fitOverviewCamera() {
    if (!overviewCamera || overviewMeshes.length === 0) return;

    const box = new THREE.Box3();
    overviewMeshes.forEach(mesh => box.expandByObject(mesh));

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Position camera at isometric angle
    const distance = maxDim * 1.5;
    overviewCamera.position.set(
        center.x + distance * 0.7,
        center.y + distance * 0.5,
        center.z + distance * 0.7
    );
    overviewCamera.lookAt(center);
    overviewCamera.updateProjectionMatrix();
}

/**
 * Update overview to highlight current block
 */
function updateModelOverview() {
    overviewMeshes.forEach((group, index) => {
        const isCurrent = index === currentStep;

        // Each overviewMesh is now a Group containing panel meshes
        group.children.forEach(mesh => {
            if (mesh.material) {
                mesh.material.color.setHex(isCurrent ? 0x10b981 : 0xadb5bd);
                mesh.material.opacity = isCurrent ? 0.95 : 0.6;
                mesh.material.emissive.setHex(isCurrent ? 0x059669 : 0x000000);
                mesh.material.emissiveIntensity = isCurrent ? 0.2 : 0;
                mesh.material.needsUpdate = true;
            }
        });
    });
}

/**
 * Sync overview with main view visibility and selection state
 * When panels are selected/hidden in main view, reflect the same in overview
 */
function syncOverviewWithMainView() {
    if (!overviewMeshes || overviewMeshes.length === 0) return;

    // Get current block's group in overview
    const currentGroup = overviewMeshes[currentStep];
    if (!currentGroup) return;

    // Get visibility and selection state from main view meshes
    const mainMeshes = state.meshes || [];

    // Create a map of panel IDs to their visibility and selection state
    const panelStates = new Map();
    mainMeshes.forEach(mesh => {
        const panelId = mesh.userData.data?.id;
        if (panelId) {
            panelStates.set(panelId, {
                visible: mesh.visible,
                selected: mesh.userData.isSelected
            });
        }
    });

    // Get all panels and blocks data for matching
    const blocksArray = state.modelData?.blocks || state.modelData?.Blocks || [];
    const allPanels = state.modelData?.panels || state.modelData?.Panels || [];

    // Update each block group in overview
    overviewMeshes.forEach((group, blockIndex) => {
        const block = blocksArray[blockIndex];
        if (!block) return;

        const blockPanelIds = block.childPanelIds || [];
        const isCurrent = blockIndex === currentStep;

        // For current block, sync visibility with main view
        let childIndex = 0;
        const blockPanels = allPanels.filter(p => blockPanelIds.includes(p.id));

        group.children.forEach((mesh, idx) => {
            if (!mesh.material) return;

            // Get corresponding panel
            const panel = blockPanels[idx];
            if (!panel) return;

            const panelState = panelStates.get(panel.id);

            if (isCurrent && panelState) {
                // For current block, sync visibility with main view
                mesh.visible = panelState.visible;

                // Highlight selected panels with different color
                if (panelState.selected && panelState.visible) {
                    mesh.material.color.setHex(0x3b82f6);  // Blue for selected
                    mesh.material.opacity = 1.0;
                    mesh.material.emissive.setHex(0x1d4ed8);
                    mesh.material.emissiveIntensity = 0.4;
                } else if (panelState.visible) {
                    mesh.material.color.setHex(0x10b981);  // Green for current block
                    mesh.material.opacity = 0.95;
                    mesh.material.emissive.setHex(0x059669);
                    mesh.material.emissiveIntensity = 0.2;
                }
            } else {
                // For other blocks, show normally
                mesh.visible = true;
                mesh.material.color.setHex(0xadb5bd);
                mesh.material.opacity = 0.6;
                mesh.material.emissive.setHex(0x000000);
                mesh.material.emissiveIntensity = 0;
            }

            mesh.material.needsUpdate = true;
        });
    });
}

/**
 * Handle click on overview to navigate to block
 */
function handleOverviewClick(event) {
    if (!overviewCamera || !overviewRenderer) return;

    const container = document.getElementById('model-overview-canvas');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, overviewCamera);

    // intersectObjects with recursive=true to detect meshes inside groups
    const intersects = raycaster.intersectObjects(overviewMeshes, true);
    if (intersects.length > 0) {
        // Get blockIndex from intersected mesh or its parent group
        let blockIndex = intersects[0].object.userData.blockIndex;
        if (blockIndex === undefined && intersects[0].object.parent) {
            blockIndex = intersects[0].object.parent.userData.blockIndex;
        }
        if (blockIndex !== undefined && blockIndex !== currentStep) {
            goToStep(blockIndex);
        }
    }
}

/**
 * Animation loop for overview
 */
function animateOverview() {
    overviewAnimationId = requestAnimationFrame(animateOverview);

    if (overviewRenderer && overviewScene && overviewCamera) {
        // Slow rotation for visual effect
        overviewMeshes.forEach(mesh => {
            // Don't rotate for now to keep stable view
        });

        overviewRenderer.render(overviewScene, overviewCamera);
    }
}

/**
 * Cleanup overview renderer
 */
function cleanupModelOverview() {
    if (overviewAnimationId) {
        cancelAnimationFrame(overviewAnimationId);
        overviewAnimationId = null;
    }

    if (overviewRenderer) {
        overviewRenderer.dispose();
        overviewRenderer = null;
    }

    // Dispose groups and their child meshes
    overviewMeshes.forEach(group => {
        if (group.children) {
            group.children.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            });
        }
        if (group.geometry) group.geometry.dispose();
        if (group.material) group.material.dispose();
    });
    overviewMeshes = [];
    overviewScene = null;
    overviewCamera = null;
}

/**
 * Unmount the page
 */
export function unmount() {
    // Stop animation
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Cleanup ResizeObserver
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }

    // Cleanup model overview
    cleanupModelOverview();

    // Remove event listener
    document.removeEventListener('keydown', handleKeydown);

    container = null;
    currentStep = 0;
    blocks = [];
    isInitialized = false;
}

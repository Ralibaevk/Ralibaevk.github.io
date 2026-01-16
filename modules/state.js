/**
 * Global Application State
 * Centralized state management for the 3D viewer
 */

const state = {
    // THREE.js core objects
    scene: null,
    camera: null,
    orthoCamera: null,
    activeCamera: null,
    renderer: null,
    controls: null,

    // Model data
    modelData: null,
    meshes: [],
    originalPositions: new Map(),

    // State flags
    isExploded: false,
    isWireframe: false,
    isOrtho: false,

    // Interaction
    raycaster: null,
    mouse: null,
    selectedMesh: null,
    selectedMeshes: new Set(),
    hiddenMeshes: new Set(),

    // Indexing maps
    materialColorMap: {},
    meshByPanelId: {},
    meshByBlockId: {},
    meshByFurnitureId: {},
    furnitureByBlockId: {},
    meshByExtrusionId: {},

    // View state
    modelBounds: null,
    currentViewDirection: null,

    // UI elements
    dimensionGroup: null,
    labelsGroup: null
};

// Helper functions for state management
export function resetState() {
    state.modelData = null;
    state.meshes = [];
    state.originalPositions.clear();
    state.isExploded = false;
    state.isWireframe = false;
    state.selectedMesh = null;
    state.selectedMeshes.clear();
    state.hiddenMeshes.clear();
    state.materialColorMap = {};
    state.meshByPanelId = {};
    state.meshByBlockId = {};
    state.meshByFurnitureId = {};
    state.furnitureByBlockId = {};
    state.meshByExtrusionId = {};
    state.modelBounds = null;
    state.currentViewDirection = null;
}

export function getState() {
    return state;
}

export default state;

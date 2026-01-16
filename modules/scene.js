/**
 * Scene Module
 * Handles THREE.js scene setup, lighting, and render loop
 * Uses clean rendering with contact shadows and ambient occlusion simulation through lighting
 */

import state from './state.js';
import CONFIG from './config.js';

// Reference to shadow floor mesh for dynamic scaling
let shadowFloor = null;

/**
 * Initialize the THREE.js scene with lighting
 * @param {string} containerId - Optional container element ID (default: 'canvas-container')
 */
export function initScene(containerId = 'canvas-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container #${containerId} not found`);
        return;
    }

    // Create scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(CONFIG.backgroundColor);

    // Create renderer with standard settings
    state.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
    });
    state.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    state.renderer.toneMappingExposure = 1.1;
    state.renderer.outputEncoding = THREE.sRGBEncoding;
    container.innerHTML = '';
    container.appendChild(state.renderer.domElement);

    // Setup optimized lighting for depth perception
    setupLighting();

    // Create contact shadow floor
    createShadowFloor();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

/**
 * Setup scene lighting optimized for furniture visualization
 * Multiple lights create natural depth perception similar to AO
 */
function setupLighting() {
    // Ambient light - moderate base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    state.scene.add(ambientLight);

    // Hemisphere light for natural sky/ground gradient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe8e8e8, 0.4);
    hemiLight.position.set(0, 1000, 0);
    state.scene.add(hemiLight);

    // Main key light - primary illumination
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.55);
    keyLight.position.set(400, 900, 500);
    state.scene.add(keyLight);

    // Fill light - soften shadows on opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-500, 600, -300);
    state.scene.add(fillLight);

    // Top light - emphasize horizontal surfaces
    const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
    topLight.position.set(0, 1200, 0);
    state.scene.add(topLight);

    // Rim light - edge definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 300, -700);
    state.scene.add(rimLight);
}

/**
 * Create contact shadow floor - semi-transparent gradient shadow under model
 */
function createShadowFloor() {
    const size = 1000;
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);

    // Shader material for radial gradient shadow
    const material = new THREE.ShaderMaterial({
        uniforms: {
            shadowColor: { value: new THREE.Color(0x000000) },
            shadowOpacity: { value: 0.06 },
            innerRadius: { value: 0.0 },
            outerRadius: { value: 1.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 shadowColor;
            uniform float shadowOpacity;
            uniform float innerRadius;
            uniform float outerRadius;
            varying vec2 vUv;
            
            void main() {
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(vUv, center) * 2.0;
                float alpha = 1.0 - smoothstep(innerRadius, outerRadius, dist);
                alpha *= shadowOpacity;
                gl_FragColor = vec4(shadowColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    shadowFloor = new THREE.Mesh(geometry, material);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = -0.5;
    shadowFloor.name = 'shadowFloor';
    shadowFloor.renderOrder = -1;

    state.scene.add(shadowFloor);
}

/**
 * Update shadow floor size based on model bounds
 */
export function updateShadowFloor() {
    if (!shadowFloor || !state.modelBounds) return;

    const bounds = state.modelBounds;
    if (bounds.isEmpty()) return;

    const sizeX = bounds.max.x - bounds.min.x;
    const sizeZ = bounds.max.z - bounds.min.z;
    const maxSize = Math.max(sizeX, sizeZ);

    // Scale shadow larger than model for soft fade
    const shadowScale = maxSize * 3.0;
    shadowFloor.scale.set(shadowScale / 1000, shadowScale / 1000, 1);

    // Position at center of model
    const centerX = (bounds.max.x + bounds.min.x) / 2;
    const centerZ = (bounds.max.z + bounds.min.z) / 2;
    shadowFloor.position.set(centerX, -0.5, centerZ);
}

/**
 * Handle window resize
 */
function onWindowResize() {
    // Try to get container dimensions first (for split-layout pages like assembly-guide)
    const container = state.renderer?.domElement?.parentElement;
    const width = container?.clientWidth || window.innerWidth;
    const height = container?.clientHeight || window.innerHeight;

    if (state.camera) {
        state.camera.aspect = width / height;
        state.camera.updateProjectionMatrix();
    }
    if (state.renderer) {
        state.renderer.setSize(width, height);
    }
}

/**
 * Main animation/render loop - clean standard rendering
 */
export function animate() {
    requestAnimationFrame(animate);

    if (state.controls) {
        state.controls.update();
    }

    // Standard rendering without post-processing
    if (state.renderer && state.activeCamera) {
        state.renderer.render(state.scene, state.activeCamera);
    }
}

/**
 * Clear all meshes from scene
 */
export function clearScene() {
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
    state.originalPositions.clear();
}

export default {
    initScene,
    animate,
    clearScene,
    updateShadowFloor
};

/**
 * Main Entry Point
 * Initializes the LOGiQA SPA Application
 */

import { router } from './router/router.js';
import { initAuth } from './api/auth-service.js';

/**
 * Initialize application
 */
async function init() {
    console.log('LOGiQA Furniture Technologies v5.0 - SPA Architecture');

    // Initialize authentication FIRST (handles Telegram WebApp data)
    await initAuth();

    // Set the app container for page mounting
    router.setContainer('app');

    // Register routes

    // Default route - redirect to projects
    router.on('/', async () => {
        return import('./pages/projects/projects.js');
    });

    // Profile - Personal Dashboard
    router.on('/profile', async () => {
        return import('./pages/profile/profile.js');
    });

    // Executive Dashboard - Manager/Director view
    router.on('/executive', async () => {
        return import('./pages/executive/executive.js');
    });

    // Projects list (Role-based view)
    router.on('/projects', async () => {
        return import('./pages/projects/projects.js');
    });

    router.on('/project/:projectId', async (params) => {
        return import('./pages/projects/projects.js'); // Temp: redirect to projects
    });

    router.on('/project/:projectId/viewer', async (params) => {
        return import('./pages/viewer/viewer.js');
    });

    router.on('/project/:projectId/viewer/:modelId', async (params) => {
        return import('./pages/viewer/viewer.js');
    });

    // Supplier route (read-only by token)
    router.on('/supply/:projectId/:token', async (params) => {
        return import('./pages/supply/supply.js');
    });

    // Assembler routes (read-only by token)
    router.on('/assembly/:projectId/:token', async (params) => {
        return import('./pages/assembly/assembly.js');
    });

    router.on('/assembly/:projectId/:token/:modelId', async (params) => {
        return import('./pages/viewer/viewer.js');
    });

    // Viewer route (legacy/direct)
    router.on('/viewer', async () => {
        return import('./pages/viewer/viewer.js');
    });

    // Assembly Guide routes (step-by-step assembly instructions)
    router.on('/assembly-guide', async () => {
        return import('./pages/assembly-guide/assembly-guide.js');
    });

    router.on('/project/:projectId/assembly-guide', async (params) => {
        return import('./pages/assembly-guide/assembly-guide.js');
    });
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

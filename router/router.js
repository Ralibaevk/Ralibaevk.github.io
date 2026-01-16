/**
 * Simple Hash-Based Router for SPA
 * Supports dynamic route parameters like :id, :token
 */

class Router {
    constructor() {
        this.routes = [];
        this.currentPage = null;
        this.pageContainer = null;
        this.started = false;

        // Listen for hash changes (but don't auto-start on load)
        window.addEventListener('hashchange', () => this.handleRoute());
    }

    /**
     * Start the router (call after auth is ready)
     */
    start() {
        if (this.started) return;
        this.started = true;
        this.handleRoute();
    }

    /**
     * Set the container element for page mounting
     * @param {string} containerId - ID of the container element
     */
    setContainer(containerId) {
        this.pageContainer = document.getElementById(containerId);
        if (!this.pageContainer) {
            console.error(`Router: Container #${containerId} not found`);
        }
    }

    /**
     * Register a route
     * @param {string} path - Route path with optional params (:param)
     * @param {Function} handler - Async function that returns page module
     */
    on(path, handler) {
        // Convert path pattern to regex
        const paramNames = [];
        const regexPath = path.replace(/:([^/]+)/g, (_, paramName) => {
            paramNames.push(paramName);
            return '([^/]+)';
        });

        this.routes.push({
            path,
            regex: new RegExp(`^${regexPath}$`),
            paramNames,
            handler
        });
    }

    /**
     * Navigate to a path
     * @param {string} path - Path to navigate to
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Get current route parameters
     * @returns {Object} Current route params
     */
    get params() {
        return this._currentParams || {};
    }

    /**
     * Handle route change
     */
    async handleRoute() {
        let hash = window.location.hash.slice(1) || '/projects';

        // Check if hash starts with tgWebApp params (Telegram Mini App redirect)
        // These are NOT routes, they're Telegram initialization data
        if (hash.startsWith('tgWebAppData=') || hash.startsWith('?tgWebAppData=')) {
            console.log('[Router] Detected Telegram WebApp data in hash, redirecting to default route');
            hash = '/projects';
        }

        // Parse query string from hash (e.g., /path?param=value)
        let queryString = '';
        const queryIndex = hash.indexOf('?');
        if (queryIndex !== -1) {
            queryString = hash.slice(queryIndex + 1);
            hash = hash.slice(0, queryIndex);
        }

        // Strip any Telegram-specific params from query string
        const tgParams = ['tgWebAppData', 'tgWebAppVersion', 'tgWebAppPlatform', 'tgWebAppThemeParams'];

        // Parse query params, filtering out Telegram params
        const queryParams = {};
        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                if (key) {
                    const decodedKey = decodeURIComponent(key);
                    // Skip Telegram-specific params
                    if (!tgParams.includes(decodedKey)) {
                        queryParams[decodedKey] = decodeURIComponent(value || '');
                    }
                }
            });
        }

        for (const route of this.routes) {
            const match = hash.match(route.regex);

            if (match) {
                // Extract path params
                const params = {};
                route.paramNames.forEach((name, index) => {
                    params[name] = decodeURIComponent(match[index + 1]);
                });

                // Merge query params
                Object.assign(params, queryParams);

                this._currentParams = params;

                // Unmount current page
                if (this.currentPage && this.currentPage.unmount) {
                    await this.currentPage.unmount();
                }

                // Clear container
                if (this.pageContainer) {
                    this.pageContainer.innerHTML = '';
                }

                // Load and mount new page
                try {
                    const pageModule = await route.handler(params);
                    this.currentPage = pageModule;

                    if (pageModule.mount && this.pageContainer) {
                        await pageModule.mount(this.pageContainer, params);
                    }
                } catch (error) {
                    console.error('Router: Failed to load page', error);
                    this.showError(error);
                }

                return;
            }
        }

        // No route matched - redirect to projects
        console.warn(`Router: No route matched for ${hash}, redirecting to /projects`);
        this.navigate('/projects');
    }

    /**
     * Show error page
     * @param {Error} error - Error object
     */
    showError(error) {
        if (this.pageContainer) {
            this.pageContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; gap: 16px;">
                    <h2 style="color: #666;">Ошибка загрузки страницы</h2>
                    <p style="color: #999;">${error.message}</p>
                    <button onclick="location.hash='#/projects'" style="padding: 12px 24px; cursor: pointer;">
                        На главную
                    </button>
                </div>
            `;
        }
    }
}

// Export singleton instance
export const router = new Router();

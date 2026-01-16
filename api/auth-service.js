/**
 * Telegram Authentication Service
 * Handles authentication via Telegram Mini App / Web App
 */

import { initSupabase, getSupabase } from './supabase-client.js';

// Available roles in the system
export const ROLES = {
    EXECUTIVE: 'executive',
    DESIGNER: 'designer',
    TECHNOLOGIST: 'technologist',
    SUPPLY: 'supply',
    PRODUCTION: 'production',
    ASSEMBLER: 'assembler',
    MEASURER: 'measurer',
    DRIVER: 'driver'
};

// Current user state (cached)
let currentUser = null;
let currentProfile = null;
let currentCompanyMemberships = [];

/**
 * Initialize authentication
 * Should be called on app startup
 */
export async function initAuth() {
    await initSupabase();

    // Check if running in Telegram Mini App
    if (window.Telegram?.WebApp) {
        console.log('[Auth] Running in Telegram Mini App');
        await authenticateWithTelegram();
    } else {
        console.log('[Auth] Running in browser, checking existing session');
        await loadCurrentUser();
    }
}

/**
 * Authenticate using Telegram WebApp data
 */
async function authenticateWithTelegram() {
    const tg = window.Telegram.WebApp;
    const initData = tg.initData;

    if (!initData) {
        console.warn('[Auth] No Telegram initData available');
        return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    try {
        // Call Edge Function to validate Telegram auth and get token
        const { data, error } = await supabase.functions.invoke('telegram-auth', {
            body: { initData }
        });

        if (error) {
            console.error('[Auth] Telegram auth failed:', error);
            return;
        }

        if (data?.token_hash) {
            // Verify OTP with the token_hash from Edge Function
            const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: data.token_hash,
                type: 'magiclink',
            });

            if (verifyError) {
                console.error('[Auth] OTP verification failed:', verifyError);
                return;
            }

            console.log('[Auth] Session created via OTP');
            await loadCurrentUser();
        }
    } catch (e) {
        console.error('[Auth] Telegram auth error:', e);
    }
}

/**
 * Load current user and profile from Supabase
 */
async function loadCurrentUser() {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        currentUser = null;
        currentProfile = null;
        currentCompanyMemberships = [];
        return;
    }

    currentUser = user;

    // Load profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    currentProfile = profile;

    // Load company memberships with roles
    const { data: memberships } = await supabase
        .from('company_members')
        .select(`
            id,
            status,
            specialization,
            joined_at,
            company:companies(id, name, logo_url),
            role:roles(id, code, name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

    currentCompanyMemberships = memberships || [];

    console.log('[Auth] User loaded:', currentProfile?.first_name, '| Companies:', currentCompanyMemberships.length);
}

/**
 * Get the currently logged in user (raw auth user)
 * @returns {Object|null} Current auth user
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Get current user's profile
 * @returns {Object|null} Profile with telegram_id, name, rating, etc.
 */
export function getCurrentProfile() {
    return currentProfile;
}

/**
 * Get current user's role (primary role from first company)
 * @returns {string} Role code or 'guest'
 */
export function getCurrentRole() {
    if (currentCompanyMemberships.length > 0) {
        return currentCompanyMemberships[0].role?.code || 'guest';
    }
    return 'guest';
}

/**
 * Get all available roles for the current user
 * @returns {Array} Array of role objects from memberships
 */
export function getAvailableRoles() {
    return currentCompanyMemberships.map(m => ({
        id: m.role?.code,
        label: m.role?.name,
        company: m.company?.name,
        icon: getRoleIcon(m.role?.code)
    }));
}

/**
 * Get all companies the user is a member of
 * @returns {Array} Company memberships
 */
export function getUserCompanies() {
    return currentCompanyMemberships;
}

/**
 * Switch to a different role/company context
 * @param {string} roleCode - Role to switch to
 */
export function switchRole(roleCode) {
    const membership = currentCompanyMemberships.find(m => m.role?.code === roleCode);
    if (membership) {
        // Reorder memberships to put selected first
        currentCompanyMemberships = [
            membership,
            ...currentCompanyMemberships.filter(m => m.id !== membership.id)
        ];

        window.dispatchEvent(new CustomEvent('roleChanged', {
            detail: {
                user: currentProfile,
                role: roleCode,
                company: membership.company
            }
        }));

        console.log(`[Auth] Switched to: ${membership.role?.name} at ${membership.company?.name}`);
    }
}

/**
 * Get icon name for role
 */
function getRoleIcon(roleCode) {
    const icons = {
        executive: 'crown',
        designer: 'palette',
        technologist: 'settings',
        supply: 'package',
        production: 'factory',
        assembler: 'tool',
        measurer: 'ruler',
        driver: 'truck'
    };
    return icons[roleCode] || 'user';
}

/**
 * Get columns configuration for Kanban board based on role
 * @param {string} role - User role
 * @returns {Array} Array of column definitions
 */
export function getKanbanColumnsForRole(role) {
    switch (role) {
        case ROLES.DESIGNER:
            return [
                { id: 'draft', title: 'Черновик', color: '#9CA3AF' },
                { id: 'client_review', title: 'Согласование', color: '#F59E0B' },
                { id: 'sent_to_tech', title: 'Передано', color: '#10B981' }
            ];
        case ROLES.TECHNOLOGIST:
            return [
                { id: 'inbox', title: 'Входящие', color: '#3B82F6' },
                { id: 'checking', title: 'Проверка', color: '#F59E0B' },
                { id: 'ready', title: 'Готово', color: '#10B981' },
                { id: 'return', title: 'Возврат', color: '#EF4444' }
            ];
        case ROLES.SUPPLY:
            return [
                { id: 'to_order', title: 'К заказу', color: '#3B82F6' },
                { id: 'ordered', title: 'Заказано', color: '#F59E0B' },
                { id: 'received', title: 'Получено', color: '#10B981' }
            ];
        case ROLES.PRODUCTION:
            return [
                { id: 'queue', title: 'В очереди', color: '#9CA3AF' },
                { id: 'cutting', title: 'Раскрой', color: '#3B82F6' },
                { id: 'assembly_queue', title: 'На сборку', color: '#10B981' }
            ];
        case ROLES.ASSEMBLER:
            return [
                { id: 'ready_to_assemble', title: 'К сборке', color: '#3B82F6' },
                { id: 'assembling', title: 'В работе', color: '#F59E0B' },
                { id: 'done', title: 'Готово', color: '#10B981' }
            ];
        default:
            return [];
    }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
    return currentUser !== null;
}

/**
 * Sign out current user
 */
export async function signOut() {
    const supabase = getSupabase();
    if (supabase) {
        await supabase.auth.signOut();
    }
    currentUser = null;
    currentProfile = null;
    currentCompanyMemberships = [];

    window.dispatchEvent(new CustomEvent('authChanged', { detail: { user: null } }));
}

// For backward compatibility with existing code that expects mock data
export { getCurrentUser as getUser };

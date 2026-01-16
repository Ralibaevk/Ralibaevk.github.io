/**
 * API Client - Abstraction layer for Supabase operations
 * Provides data access for projects, materials, files, etc.
 */

import { getSupabase, initSupabase } from './supabase-client.js';

// Development mode flag - set to false to use real Supabase data
const USE_MOCK = false;

/**
 * Initialize API client
 */
export async function initApi() {
    await initSupabase();
}

// ============================================
// PROJECTS
// ============================================

/**
 * Get list of projects for current user's company
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of project objects
 */
export async function getProjects(filters = {}) {
    if (USE_MOCK) return getMockProjects();

    const supabase = getSupabase();
    if (!supabase) return getMockProjects();

    let query = supabase
        .from('projects')
        .select(`
            id,
            number,
            name,
            description,
            status,
            progress,
            deadline,
            created_at,
            customer:customers(id, full_name),
            manager:profiles!projects_manager_id_fkey(id, first_name, last_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching projects:', error);
        return [];
    }

    return data || [];
}

/**
 * Get single project by ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project object
 */
export async function getProject(projectId) {
    if (USE_MOCK) {
        const projects = getMockProjects();
        return projects.find(p => p.id === projectId);
    }

    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('projects')
        .select(`
            *,
            customer:customers(*),
            manager:profiles!projects_manager_id_fkey(*),
            company:companies(id, name, logo_url)
        `)
        .eq('id', projectId)
        .single();

    if (error) {
        console.error('Error fetching project:', error);
        return null;
    }

    return data;
}

/**
 * Create a new project
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
export async function createProject(projectData) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

    if (error) {
        console.error('Error creating project:', error);
        throw error;
    }

    return data;
}

/**
 * Update project status
 * @param {string} projectId - Project ID
 * @param {string} status - New status
 * @param {string} comment - Optional comment
 */
export async function updateProjectStatus(projectId, status, comment = null) {
    const supabase = getSupabase();
    if (!supabase) return;

    // Update project
    await supabase
        .from('projects')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', projectId);

    // Log status change
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('status_history').insert({
            project_id: projectId,
            user_id: user.id,
            old_status: null, // Could fetch previous status
            new_status: status,
            comment
        });
    }
}

// ============================================
// PROJECT ITEMS (Positions)
// ============================================

/**
 * Get project items for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of project items
 */
export async function getProjectItems(projectId) {
    if (USE_MOCK) return getMockModels(projectId);

    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('project_items')
        .select(`
            *,
            files:item_files(*)
        `)
        .eq('project_id', projectId)
        .order('created_at');

    if (error) {
        console.error('Error fetching project items:', error);
        return [];
    }

    return data || [];
}

/**
 * Get project models (items with 3D files)
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of model objects
 */
export async function getProjectModels(projectId) {
    if (USE_MOCK) return getMockModels(projectId);

    const items = await getProjectItems(projectId);

    return items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.icon || 'cabinet',
        hasJson: item.files?.some(f => f.file_type === 'model_json' || f.file_type === 'model_b3d') || false
    }));
}

// ============================================
// FILES
// ============================================

/**
 * Upload file to Storage
 * @param {File} file - File to upload
 * @param {string} bucket - Storage bucket name
 * @param {string} path - Path within bucket
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadFile(file, bucket, path) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

    if (error) {
        console.error('Error uploading file:', error);
        throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

    return publicUrl;
}

/**
 * Get signed URL for private file
 * @param {string} bucket - Storage bucket
 * @param {string} path - File path
 * @param {number} expiresIn - Seconds until expiry
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    if (error) {
        console.error('Error getting signed URL:', error);
        return null;
    }

    return data.signedUrl;
}

// ============================================
// 3D MODEL PROCESSING (Server-side)
// ============================================

/**
 * Parse 3D model data using server-side Edge Function
 * Protects intellectual property by processing on server
 * @param {Object} modelData - Raw JSON model data from file
 * @returns {Promise<Object>} Processed model with meshes, BOM, bounds
 */
export async function parseModelData(modelData) {
    const supabase = getSupabase();

    // Supabase URL for Edge Function
    const functionsUrl = 'https://nyhomstjadhtpbjkjaim.supabase.co/functions/v1/parse-model';

    // Anon key for public access (Edge Functions require this)
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG9tc3RqYWRodHBiamtqYWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NDYyMTgsImV4cCI6MjA4NDEyMjIxOH0.7_g429QlHYkmkZLEeb8q0_kAR8ohCnqaz3vmzB9jxqg';

    try {
        // Get session for auth header (if logged in)
        let authHeader = {};
        if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                authHeader = { 'Authorization': `Bearer ${session.access_token}` };
            }
        }

        // If no session, use anon key
        if (!authHeader.Authorization) {
            authHeader = { 'Authorization': `Bearer ${ANON_KEY}` };
        }

        const response = await fetch(functionsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': ANON_KEY,
                ...authHeader
            },
            body: JSON.stringify({ modelData })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[parseModelData] Server response:', errorText);
            let errorData = {};
            try { errorData = JSON.parse(errorText); } catch { }
            throw new Error(errorData.details || errorData.error || `Server error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Model processing failed');
        }

        console.log(`[parseModelData] Processed ${result.data.meshes.length} meshes in ${result.meta.processingTimeMs}ms`);

        return result.data;

    } catch (error) {
        console.error('[parseModelData] Error:', error);
        throw error;
    }
}

/**
 * Convert server-processed mesh data to Three.js geometries
 * @param {Object} processedModel - Result from parseModelData
 * @returns {Array} Array of Three.js mesh objects
 */
export function createMeshesFromProcessedData(processedModel) {
    const meshes = [];

    for (const meshData of processedModel.meshes) {
        // Create BufferGeometry from position/normal arrays
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.normals, 3));

        // Create material based on type
        let material;
        if (meshData.type === 'panel') {
            material = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                roughness: 0.8,
                metalness: 0.1
            });
        } else if (meshData.type === 'edge') {
            material = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.5
            });
        } else {
            material = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.6
            });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = meshData.name;
        mesh.userData = {
            id: meshData.id,
            type: meshData.type,
            materialName: meshData.materialName
        };

        meshes.push(mesh);
    }

    return meshes;
}

// ============================================
// MATERIALS (for Supply page)
// ============================================


/**
 * Get materials list for procurement
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of material objects
 */
export async function getProjectMaterials(projectId) {
    if (USE_MOCK) return getMockMaterials(projectId);

    const supabase = getSupabase();
    if (!supabase) return [];

    // Get specifications for all items in this project
    const { data, error } = await supabase
        .from('specifications')
        .select(`
            id,
            materials_data,
            status,
            project_item:project_items!inner(
                id,
                name,
                project_id
            )
        `)
        .eq('project_item.project_id', projectId);

    if (error) {
        console.error('Error fetching materials:', error);
        return [];
    }

    // Flatten materials from all specifications
    const materials = [];
    data?.forEach(spec => {
        if (spec.materials_data?.boards) {
            spec.materials_data.boards.forEach(board => {
                materials.push({
                    id: `${spec.id}_board_${board.name}`,
                    name: board.name,
                    quantity: board.quantity,
                    unit: board.unit || 'листов',
                    purchased: spec.status === 'arrived',
                    specId: spec.id
                });
            });
        }
        if (spec.materials_data?.hardware) {
            spec.materials_data.hardware.forEach(hw => {
                materials.push({
                    id: `${spec.id}_hw_${hw.name}`,
                    name: hw.name,
                    quantity: hw.quantity,
                    unit: hw.unit || 'шт',
                    purchased: spec.status === 'arrived',
                    specId: spec.id
                });
            });
        }
    });

    return materials;
}

// ============================================
// ACCESS TOKENS (Share links)
// ============================================

/**
 * Validate access token
 * @param {string} projectId - Project ID
 * @param {string} token - Access token
 * @param {string} role - Expected role (supply, assembly)
 * @returns {Promise<boolean>} Whether token is valid
 */
export async function validateToken(projectId, token, role) {
    if (USE_MOCK) return true;

    const supabase = getSupabase();
    if (!supabase) return false;

    const { data, error } = await supabase
        .from('access_tokens')
        .select('id, expires_at')
        .eq('project_id', projectId)
        .eq('token', token)
        .eq('role', role)
        .single();

    if (error || !data) return false;

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return false;
    }

    return true;
}

/**
 * Generate share link for project
 * @param {string} projectId - Project ID
 * @param {string} role - Role for access (supply, assembly)
 * @returns {Promise<string>} Share URL
 */
export async function generateShareLink(projectId, role) {
    const supabase = getSupabase();
    if (!supabase) {
        // Fallback for dev
        const token = btoa(`${projectId}-${role}-${Date.now()}`).slice(0, 12);
        return `${location.origin}${location.pathname}#/${role}/${projectId}/${token}`;
    }

    // Generate random token
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Save token to database
    const { error } = await supabase.from('access_tokens').insert({
        project_id: projectId,
        token,
        role,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        created_by: user?.id
    });

    if (error) {
        console.error('Error creating access token:', error);
        throw error;
    }

    return `${location.origin}${location.pathname}#/${role}/${projectId}/${token}`;
}

// ============================================
// NOTIFICATIONS
// ============================================

/**
 * Get notifications for current user
 * @param {boolean} unreadOnly - Only fetch unread
 * @returns {Promise<Array>} Notifications
 */
export async function getNotifications(unreadOnly = false) {
    const supabase = getSupabase();
    if (!supabase) return [];

    let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (unreadOnly) {
        query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data || [];
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 */
export async function markNotificationRead(notificationId) {
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
}

// ============================================
// 3D MODEL PROCESSING (Local)
// ============================================

/**
 * Process 3D model JSON data
 * @param {Object} jsonData - Raw JSON model data
 * @returns {Promise<Object>} Processed model data
 */
export async function processModel(jsonData) {
    const { buildModel } = await import('../modules/model-builder.js');
    return buildModel(jsonData);
}

// ============================================
// MOCK DATA (fallback for development)
// ============================================

function getMockProjects() {
    return [
        {
            id: 'proj_402',
            number: '#402',
            name: 'Lounge Chair 01',
            description: 'High-fidelity ergonomic lounge chair design for Herman Miller.',
            status: 'in_progress',
            progress: 75,
            deadline: '2026-10-24',
            assignees: ['AV', 'SM'],
            icon: 'chair'
        },
        {
            id: 'proj_398',
            number: '#398',
            name: 'Modular Sofa B',
            description: 'Sectional sofa system with customizable fabric options.',
            status: 'review',
            progress: 90,
            deadline: '2026-10-22',
            assignees: ['JL'],
            icon: 'sofa'
        },
        {
            id: 'proj_405',
            number: '#405',
            name: 'Teak Side Table',
            description: 'Minimalist side table prototype using sustainable teak.',
            status: 'drafting',
            progress: 25,
            deadline: '2026-11-01',
            assignees: ['AV', 'KD'],
            icon: 'table'
        }
    ];
}

function getMockModels(projectId) {
    return [
        { id: 'model_1', name: 'Нижний модуль', type: 'cabinet', hasJson: true },
        { id: 'model_2', name: 'Верхний модуль', type: 'cabinet', hasJson: true },
        { id: 'model_3', name: 'Столешница', type: 'countertop', hasJson: false }
    ];
}

function getMockMaterials(projectId) {
    return [
        { id: 'mat_1', name: 'ЛДСП Дуб Галифакс', quantity: 4, unit: 'листов', purchased: false },
        { id: 'mat_2', name: 'Кромка ПВХ 2мм', quantity: 50, unit: 'м.п.', purchased: true },
        { id: 'mat_3', name: 'Петли накладные', quantity: 8, unit: 'шт', purchased: false },
        { id: 'mat_4', name: 'Направляющие 450мм', quantity: 3, unit: 'комплект', purchased: false },
        { id: 'mat_5', name: 'Ручки 128мм', quantity: 6, unit: 'шт', purchased: true }
    ];
}

/**
 * Model Builder Module
 * Builds 3D model from loaded JSON data
 */

import state from './state.js';
import CONFIG from './config.js';
import CSG from '../lib/csg.js';
import { createPanelGeometry, createBentPanelGeometry, discretizeArcForCSG, discretizeCircleForCSG, createExtrusionProfileMesh } from './contours.js';
import { createEdgeBanding } from './edges.js';
import { getContourBounds } from './geometry.js';

/**
 * Build the complete 3D model from modelData
 */
export function buildModel() {
    if (!state.modelData) return;

    const data = state.modelData;

    // Clear previous model
    clearPreviousModel();

    // Calculate center offsets from model boundingBox
    let centerX = 0, minY = 0, centerZ = 0;

    if (data.model && data.model.boundingBox) {
        const bb = data.model.boundingBox;
        centerX = (bb.min.x + bb.max.x) / 2;
        minY = bb.min.y;
        centerZ = (bb.min.z + bb.max.z) / 2;

        // Initialize modelBounds
        const width = bb.max.x - bb.min.x;
        const height = bb.max.y - bb.min.y;
        const depth = bb.max.z - bb.min.z;

        state.modelBounds = new THREE.Box3();
        state.modelBounds.min.set(-width / 2, 0, -depth / 2);
        state.modelBounds.max.set(width / 2, height, depth / 2);
    }

    // Store center offsets for panel positioning
    const modelCenter = { x: centerX, minY: minY, z: centerZ };

    // Group panels by block using childPanelIds
    const blockPanels = new Map();
    const panelBlocks = new Map();

    if (data.blocks) {
        data.blocks.forEach(block => {
            blockPanels.set(block.id, []);
            if (block.childPanelIds) {
                block.childPanelIds.forEach(pid => {
                    panelBlocks.set(pid, block.id);
                });
            }
        });
    }


    // Build panels
    if (data.panels) {
        data.panels.forEach((panel, index) => {
            const mesh = createPanelMesh(panel, index, modelCenter);
            if (mesh) {
                state.scene.add(mesh);
                state.meshes.push(mesh);
                state.originalPositions.set(mesh, mesh.position.clone());
                state.meshByPanelId[panel.id] = mesh;

                const blockId = panel.parentBlockId || panelBlocks.get(panel.id);
                if (blockId) {
                    if (!state.meshByBlockId[blockId]) {
                        state.meshByBlockId[blockId] = [];
                    }
                    state.meshByBlockId[blockId].push(mesh);
                    mesh.userData.data.parentBlockId = blockId;
                }
            }
        });
    }

    // Build furniture (Holes + Body)
    if (data.furniture) {
        data.furniture.forEach((furn, index) => {
            const furnMeshes = createFurnitureMeshes(furn, modelCenter);

            furnMeshes.forEach(mesh => {
                state.scene.add(mesh);
                state.meshes.push(mesh);
                state.originalPositions.set(mesh, mesh.position.clone());

                // Index by block
                if (furn.parentBlockId) {
                    if (!state.furnitureByBlockId[furn.parentBlockId]) {
                        state.furnitureByBlockId[furn.parentBlockId] = [];
                    }
                    state.furnitureByBlockId[furn.parentBlockId].push(mesh);
                }
            });

            // Index by ID (store array of meshes)
            if (furnMeshes.length > 0) {
                state.meshByFurnitureId[furn.id] = furnMeshes;
            }
        });
    }

    // Build extrusions (profiles)
    if (data.extrusions && data.extrusions.length > 0) {
        console.log(`Building ${data.extrusions.length} extrusion profiles...`);
        data.extrusions.forEach((profile, index) => {
            const mesh = createProfileMesh(profile, modelCenter);
            if (mesh) {
                state.scene.add(mesh);
                state.meshes.push(mesh);
                state.originalPositions.set(mesh, mesh.position.clone());
                state.meshByExtrusionId[profile.id] = mesh;
            }
        });
    }


    // Calculate model bounds if not set from boundingBox
    if (!state.modelBounds || state.modelBounds.isEmpty()) {
        calculateModelBounds();
    }
}


/**
 * Clear previous model data
 */
function clearPreviousModel() {
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
    state.meshByPanelId = {};
    state.meshByBlockId = {};
    state.meshByFurnitureId = {};
    state.furnitureByBlockId = {};
    state.meshByExtrusionId = {};
    state.materialColorMap = {};
}

/**
 * Create extrusion profile mesh
 * @param {Object} profile - Profile data from JSON
 * @param {Object} modelCenter - Model center offsets {x, minY, z}
 * @returns {THREE.Mesh|null}
 */
function createProfileMesh(profile, modelCenter) {
    const mesh = createExtrusionProfileMesh(profile);
    if (!mesh) return null;

    // PREFERRED: Use globalMatrix 4x4 for both position and rotation
    // GlobalMatrix contains the full transformation from LCS to GCS
    if (profile.globalMatrix && profile.globalMatrix.length === 16) {
        console.log(`Profile ${profile.id}: Using globalMatrix for transformation`);

        // Build THREE.Matrix4 from flat array (column-major order)
        const m = profile.globalMatrix;
        const worldMatrix = new THREE.Matrix4();
        worldMatrix.set(
            m[0], m[4], m[8], m[12],
            m[1], m[5], m[9], m[13],
            m[2], m[6], m[10], m[14],
            m[3], m[7], m[11], m[15]
        );

        // Extract position from matrix and apply model center offset
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        worldMatrix.decompose(position, quaternion, scale);

        // Apply model center offset
        position.x -= modelCenter.x;
        position.y -= modelCenter.minY;
        position.z -= modelCenter.z;

        // Geometry is centered in contours.js, globalMatrix positions the local origin
        // No additional offset needed - centered geometry at globalMatrix position is correct

        mesh.position.copy(position);
        mesh.quaternion.copy(quaternion);
        // Don't apply scale - extrusion already has correct size

        console.log(`Profile ${profile.id} position:`,
            `(${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`
        );

    } else if (profile.basis) {
        // BUILD MATRIX FROM BASIS DATA (since GlobalMatrix() returns null in Bazis)
        // basis.origin = global position of local (0,0,0)
        // basis.axisX/Y/Z = unit vectors of local axes in global coords
        const b = profile.basis;

        // Build rotation matrix from basis vectors
        let rotMatrix = null;
        try {
            const xAxis = new THREE.Vector3(b.axisX.x, b.axisX.y, b.axisX.z).normalize();
            const yAxis = new THREE.Vector3(b.axisY.x, b.axisY.y, b.axisY.z).normalize();
            const zAxis = new THREE.Vector3(b.axisZ.x, b.axisZ.y, b.axisZ.z).normalize();

            if (xAxis.lengthSq() > 0.001 && yAxis.lengthSq() > 0.001 && zAxis.lengthSq() > 0.001) {
                rotMatrix = new THREE.Matrix4();
                rotMatrix.makeBasis(xAxis, yAxis, zAxis);
                mesh.setRotationFromMatrix(rotMatrix);
            }
        } catch (e) {
            console.warn('Basis rotation failed for profile', profile.id, e);
        }

        // Position from basis.origin (already in GCS)
        let posX = b.origin.x - modelCenter.x;
        let posY = b.origin.y - modelCenter.minY;
        let posZ = b.origin.z - modelCenter.z;

        // Position directly from basis.origin - offset is now handled in export
        mesh.position.set(posX, posY, posZ);

        console.log(`Profile ${profile.id}: Using basis - pos=(${posX.toFixed(1)}, ${posY.toFixed(1)}, ${posZ.toFixed(1)})`);

    } else {
        console.warn(`Profile ${profile.id}: No positioning data (no globalMatrix, no basis)`);
    }

    return mesh;
}

/**
 * Create panel mesh
 * @param {Object} panel - Panel data
 * @param {number} index - Panel index
 * @param {Object} modelCenter - Model center offsets {x, minY, z}
 * @returns {THREE.Mesh|null}
 */
function createPanelMesh(panel, index, modelCenter) {
    // Create geometry - use bent panel geometry for curved panels
    let geometry;
    if (panel.bent && panel.bentContour) {
        console.log(`Panel ${panel.id}: Creating bent panel geometry`);
        geometry = createBentPanelGeometry(panel);
    } else {
        geometry = createPanelGeometry(panel);
    }

    // Apply CSG operations for grooves and cuts (skip for bent panels for now)
    let hadCuts = false;
    if (!panel.bent) {
        const csgResult = applyCSGOperations(geometry, panel);
        geometry = csgResult.geometry;
        hadCuts = csgResult.hadCuts;
    }

    // Get or create material color
    // Normalize material name (may contain \r separating name from article)
    const rawMaterialName = panel.material?.name || panel.materialName || 'Без материала';
    const materialName = rawMaterialName.split('\r')[0].trim() || 'Без материала';
    if (!state.materialColorMap[materialName]) {
        const colorIndex = Object.keys(state.materialColorMap).length % CONFIG.materialColors.length;
        state.materialColorMap[materialName] = CONFIG.materialColors[colorIndex];
    }
    const color = state.materialColorMap[materialName];

    // Create panel material - matte finish for clean monochrome look
    const panelMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide,
        flatShading: false
    });

    const mesh = new THREE.Mesh(geometry, panelMaterial);

    // Apply position and rotation
    applyPanelTransform(mesh, panel, geometry, modelCenter);

    // Create edge banding meshes (separate mesh approach)
    createEdgeBanding(panel, mesh);

    // Create plastic/laminate meshes on panel faces
    // Calculate center compensation to keep visual center in place
    const panelThickness = panel.material?.thickness || panel.size?.z || 16;

    // Determine thickness axis for this panel geometry
    const thicknessAxis = getThicknessAxis(geometry, panel, panelThickness);

    if (panel.plastics && panel.plastics.length > 0) {
        // First pass: calculate total plastic thickness per side
        let frontPlasticThickness = 0;
        let backPlasticThickness = 0;

        panel.plastics.forEach(plastic => {
            if (plastic.thickness >= 1) {
                if (plastic.side === 'front') {
                    frontPlasticThickness += plastic.thickness;
                } else {
                    backPlasticThickness += plastic.thickness;
                }
            }
        });

        // Calculate net offset: (back - front) / 2
        // Positive = shift towards positive axis, Negative = shift towards negative
        const netOffset = (backPlasticThickness - frontPlasticThickness) / 2;

        // Second pass: create plastic meshes with adjusted positions
        panel.plastics.forEach(plastic => {
            const plasticMesh = createPlasticMesh(plastic, panel, geometry, panelThickness, thicknessAxis);
            if (plasticMesh) {
                // Apply the same offset to plastic so it moves with panel
                applyThicknessOffset(plasticMesh, netOffset, thicknessAxis, false);
                mesh.add(plasticMesh);
            }
        });

        // Apply offset to panel geometry
        if (Math.abs(netOffset) > 0.01) {
            applyThicknessOffset(geometry, netOffset, thicknessAxis, true);
            console.log(`Panel ${panel.id}: center offset ${netOffset.toFixed(1)}mm on ${thicknessAxis} axis (front=${frontPlasticThickness}, back=${backPlasticThickness})`);
        }
    }

    // Store panel data BEFORE adding edges (so addPanelEdgeOutline can check for cuts)
    mesh.userData = {
        type: 'panel',
        data: panel,
        originalMaterial: panelMaterial.clone()
    };

    // Add edge outline to emphasize panel edges
    // Skip for panels with cuts to avoid internal edge artifacts
    addPanelEdgeOutline(mesh, geometry);

    if (hadCuts) {
        console.log(`Panel ${panel.id}: CSG applied, edge outline skipped`);
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

/**
 * Add edge outline to panel mesh
 * @param {THREE.Mesh} mesh - Panel mesh
 * @param {THREE.BufferGeometry} geometry - Panel geometry
 */
function addPanelEdgeOutline(mesh, geometry) {
    // Use higher threshold for panels with cuts to avoid internal CSG artifacts
    // but still show main panel edges and groove contours (which are 90° edges)
    const hasCuts = mesh.userData?.data?.cuts && mesh.userData.data.cuts.length > 0;
    const thresholdAngle = hasCuts ? 60 : 45;  // 60° for cuts, 45° for regular panels

    const edgeGeometry = new THREE.EdgesGeometry(geometry, thresholdAngle);

    // Dark line material for crisp edge definition
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: CONFIG.panelEdgeColor,
        transparent: false,
        linewidth: 1,
        depthTest: true
    });

    // Create line segments
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edgeLines.name = 'panelEdgeOutline';
    edgeLines.raycast = () => { }; // Disable raycasting for edges

    mesh.add(edgeLines);
}

/**
 * Determine which axis is the thickness axis for a panel geometry
 * @param {THREE.BufferGeometry} geometry - Panel geometry
 * @param {Object} panel - Panel data
 * @param {number} panelThickness - Panel thickness in mm
 * @returns {string} - 'x', 'y', or 'z'
 */
function getThicknessAxis(geometry, panel, panelThickness) {
    // ExtrudeGeometry always extrudes along Z
    if (!(geometry instanceof THREE.BoxGeometry)) {
        return 'z';
    }

    // For BoxGeometry, find which axis matches the panel thickness
    const sx = panel.size?.x || geometry.parameters.width;
    const sy = panel.size?.y || geometry.parameters.height;
    const sz = panel.size?.z || geometry.parameters.depth;

    // Thickness axis is the one closest to panelThickness
    const diffs = [
        { axis: 'x', diff: Math.abs(sx - panelThickness) },
        { axis: 'y', diff: Math.abs(sy - panelThickness) },
        { axis: 'z', diff: Math.abs(sz - panelThickness) }
    ];
    diffs.sort((a, b) => a.diff - b.diff);
    return diffs[0].axis;
}

/**
 * Apply offset along specified thickness axis
 * @param {THREE.Object3D} object - Object to offset (or geometry to translate)
 * @param {number} offset - Offset amount
 * @param {string} axis - 'x', 'y', or 'z'
 * @param {boolean} isGeometry - If true, translates geometry; if false, adjusts position
 */
function applyThicknessOffset(object, offset, axis, isGeometry = false) {
    if (Math.abs(offset) < 0.01) return;

    if (isGeometry) {
        // Translate geometry vertices
        if (axis === 'x') object.translate(offset, 0, 0);
        else if (axis === 'y') object.translate(0, offset, 0);
        else object.translate(0, 0, offset);
    } else {
        // Adjust mesh position
        if (axis === 'x') object.position.x += offset;
        else if (axis === 'y') object.position.y += offset;
        else object.position.z += offset;
    }
}

/**
 * Create plastic/laminate mesh for panel facing
 * @param {Object} plastic - Plastic data from JSON
 * @param {Object} panel - Panel data
 * @param {THREE.BufferGeometry} panelGeometry - Panel geometry to clone
 * @param {number} panelThickness - Panel thickness in mm
 * @param {string} thicknessAxis - 'x', 'y', or 'z' - which axis is thickness (from getThicknessAxis)
 * @returns {THREE.Mesh|null} - Plastic mesh or null if should be invisible
 */
function createPlasticMesh(plastic, panel, panelGeometry, panelThickness, thicknessAxis = 'z') {
    // Skip thin plastics (< 1mm) - invisible per user rule
    if (!plastic.thickness || plastic.thickness < 1) {
        console.log(`Plastic skipped (thin): ${plastic.material || 'unknown'}, ${plastic.thickness}mm`);
        return null;
    }

    // Clone panel geometry for plastic layer
    const plasticGeometry = panelGeometry.clone();

    // Scale the thickness axis to plastic thickness
    const scaleZ = plastic.thickness / panelThickness;
    if (thicknessAxis === 'x') {
        plasticGeometry.scale(scaleZ, 1, 1);
    } else if (thicknessAxis === 'y') {
        plasticGeometry.scale(1, scaleZ, 1);
    } else {
        plasticGeometry.scale(1, 1, scaleZ);
    }

    // Create material for plastic - slightly different color, glossier
    // Use a slightly lighter/darker shade based on panel material
    const plasticColor = getPlasticMaterialColor(plastic.material);

    const plasticMaterial = new THREE.MeshStandardMaterial({
        color: plasticColor,
        roughness: 0.25,    // Plastic is glossier than panel
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(plasticGeometry, plasticMaterial);

    // Position plastic on panel surface
    // Geometry is centered, extends from -thickness/2 to +thickness/2 along thickness axis
    const halfPanelThick = panelThickness / 2;
    const halfPlasticThick = plastic.thickness / 2;
    const offset = halfPanelThick + halfPlasticThick;

    if (plastic.side === 'front') {
        // Front plastic goes on positive side of thickness axis
        if (thicknessAxis === 'x') mesh.position.x = offset;
        else if (thicknessAxis === 'y') mesh.position.y = offset;
        else mesh.position.z = offset;
    } else {
        // Back plastic goes on negative side of thickness axis
        if (thicknessAxis === 'x') mesh.position.x = -offset;
        else if (thicknessAxis === 'y') mesh.position.y = -offset;
        else mesh.position.z = -offset;
    }

    // Store plastic data
    mesh.userData = {
        type: 'plastic',
        data: plastic,
        parentPanelId: panel.id
    };

    // Add edge outline to plastic
    const edgeGeometry = new THREE.EdgesGeometry(plasticGeometry, 10);
    const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x333333,
        transparent: false,
        linewidth: 1,
        depthTest: true
    });
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edgeLines.name = 'plasticEdgeOutline';
    edgeLines.raycast = () => { };
    mesh.add(edgeLines);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    console.log(`Plastic created: ${plastic.material}, ${plastic.thickness}mm, side=${plastic.side}, axis=${thicknessAxis}`);

    return mesh;
}

/**
 * Get color for plastic material based on material name
 * @param {string} materialName - Name of plastic material
 * @returns {number} - Three.js color
 */
function getPlasticMaterialColor(materialName) {
    if (!materialName) return 0xEEEEEE;

    const lowerName = materialName.toLowerCase();

    // White/light plastics
    if (lowerName.includes('бел') || lowerName.includes('white')) {
        return 0xFAFAFA;
    }
    // Black plastics
    if (lowerName.includes('черн') || lowerName.includes('black')) {
        return 0x222222;
    }
    // Gray plastics
    if (lowerName.includes('сер') || lowerName.includes('grey') || lowerName.includes('gray')) {
        return 0x888888;
    }
    // Wood veneer
    if (lowerName.includes('шпон') || lowerName.includes('дуб') || lowerName.includes('oak')) {
        return 0xBB9966;
    }
    // Beige/cream
    if (lowerName.includes('беж') || lowerName.includes('cream') || lowerName.includes('beige')) {
        return 0xE8DCC8;
    }

    // Default: light gray with slight blue tint
    return 0xD0D5DD;
}


/**
 * Apply CSG operations (cuts) to geometry
 * @param {THREE.BufferGeometry} geometry - Original geometry
 * @param {Object} panel - Panel data
 * @returns {{geometry: THREE.BufferGeometry, hadCuts: boolean}}
 */
function applyCSGOperations(geometry, panel) {
    if (!panel.cuts || panel.cuts.length === 0) {
        return { geometry, hadCuts: false };
    }

    try {
        const thickness = panel.material?.thickness || panel.size?.z || 16;
        const pos = panel.position ? `${panel.position}` : 'no-pos';
        const zAxisInfo = panel.basis ? `zAxis=(${panel.basis.axisZ.x.toFixed(1)},${panel.basis.axisZ.y.toFixed(1)},${panel.basis.axisZ.z.toFixed(1)})` : 'no-basis';
        console.log(`\n=== CSG START: Panel ${panel.id} [${pos}], ${panel.cuts.length} cut(s), thickness=${thickness}mm, ${zAxisInfo} ===`);

        // Prepare geometry for CSG
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const bbox = geometry.boundingBox;
        console.log(`Panel geometry: ${geometry.attributes.position.count} vertices, bbox X[${bbox.min.x.toFixed(1)},${bbox.max.x.toFixed(1)}] Y[${bbox.min.y.toFixed(1)},${bbox.max.y.toFixed(1)}] Z[${bbox.min.z.toFixed(1)},${bbox.max.z.toFixed(1)}]`);

        // Check for invalid geometry values
        const positions = geometry.attributes.position?.array;
        if (positions) {
            for (let i = 0; i < Math.min(positions.length, 100); i++) {
                if (!isFinite(positions[i])) {
                    console.error(`Invalid position at ${i}: ${positions[i]}, skipping CSG`);
                    return { geometry, hadCuts: false };
                }
            }
        }

        const tempMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        let resultMesh = new THREE.Mesh(geometry, tempMaterial);

        // Reset transform for CSG in local coordinates
        resultMesh.position.set(0, 0, 0);
        resultMesh.rotation.set(0, 0, 0);
        resultMesh.scale.set(1, 1, 1);
        resultMesh.updateMatrix();
        resultMesh.updateMatrixWorld(true);

        let resultCSG = CSG.fromMesh(resultMesh);

        if (!resultCSG || !resultCSG.polygons || resultCSG.polygons.length === 0) {
            console.error(`CSG.fromMesh failed for panel ${panel.id}`);
            return { geometry, hadCuts: false };
        }

        console.log(`Panel CSG: ${resultCSG.polygons.length} polygons`);

        let cutsApplied = 0;
        let failedCount = 0;

        panel.cuts.forEach((cut, cutIndex) => {
            const cutType = cut.cutType || 'freeForm';  // default to freeForm for backward compatibility
            console.log(`\nCut ${cutIndex}: "${cut.name || 'unnamed'}", type=${cutType}, side=${cut.side}, depth=${cut.depth}, width=${cut.width}, offset=${cut.offset}`);

            let cutterGeoms = null;

            if (cutType === 'extrusion' && cut.contour && cut.contour.length > 0) {
                // Extrusion cut: create geometry from contour shape
                cutterGeoms = createExtrusionCutter(cut, panel, thickness);
            } else if (cut.trajectory && cut.trajectory.length > 0) {
                // FreeForm cut: create geometry along trajectory
                cutterGeoms = createGrooveCutter(cut, panel, thickness);
            }

            if (!cutterGeoms || cutterGeoms.length === 0) {
                console.warn(`  No cutter geometries created for cut ${cutIndex}`);
                return;
            }

            console.log(`  Created ${cutterGeoms.length} cutter segment(s)`);

            cutterGeoms.forEach((cutterGeom, segIndex) => {
                if (cutterGeom) {
                    try {
                        cutterGeom.computeBoundingBox();
                        cutterGeom.computeVertexNormals();

                        const cutterBbox = cutterGeom.boundingBox;
                        console.log(`  Seg ${segIndex}: ${cutterGeom.attributes.position.count} vertices, bbox X[${cutterBbox.min.x.toFixed(1)},${cutterBbox.max.x.toFixed(1)}] Y[${cutterBbox.min.y.toFixed(1)},${cutterBbox.max.y.toFixed(1)}] Z[${cutterBbox.min.z.toFixed(1)},${cutterBbox.max.z.toFixed(1)}]`);

                        const cutterMesh = new THREE.Mesh(cutterGeom, tempMaterial);
                        cutterMesh.position.set(0, 0, 0);
                        cutterMesh.rotation.set(0, 0, 0);
                        cutterMesh.scale.set(1, 1, 1);
                        cutterMesh.updateMatrix();
                        cutterMesh.updateMatrixWorld(true);

                        const cutterCSG = CSG.fromMesh(cutterMesh);

                        if (cutterCSG && cutterCSG.polygons && cutterCSG.polygons.length > 0) {
                            const prevPolygons = resultCSG.polygons.length;
                            resultCSG = resultCSG.subtract(cutterCSG);
                            console.log(`  Subtract: ${prevPolygons} - ${cutterCSG.polygons.length} = ${resultCSG.polygons.length} polygons`);
                            cutsApplied++;
                        } else {
                            console.warn(`  Seg ${segIndex}: CSG.fromMesh returned ${cutterCSG?.polygons?.length || 0} polygons`);
                            failedCount++;
                        }
                    } catch (segError) {
                        console.warn(`  Seg ${segIndex} FAILED:`, segError.message);
                        failedCount++;
                    }
                    cutterGeom.dispose();
                }
            });
        });

        if (cutsApplied === 0) {
            console.warn(`CSG: No cuts applied for panel ${panel.id}`);
            tempMaterial.dispose();
            return { geometry, hadCuts: false };
        }

        const newGeom = CSG.toGeometry(resultCSG);
        const vertexCount = newGeom.getAttribute('position')?.count || 0;

        if (vertexCount < 3) {
            console.error(`CSG result invalid for panel ${panel.id}, keeping original`);
            tempMaterial.dispose();
            return { geometry, hadCuts: false };
        }

        console.log(`CSG: Panel ${panel.id} - ${cutsApplied} cuts${failedCount > 0 ? `, ${failedCount} failed` : ''}, ${vertexCount} vertices`);

        newGeom.computeVertexNormals();
        newGeom.computeBoundingSphere();
        newGeom.computeBoundingBox();

        geometry.dispose();
        tempMaterial.dispose();
        return { geometry: newGeom, hadCuts: cutsApplied > 0 };

    } catch (e) {
        console.error(`CSG failed for panel ${panel.id}:`, e.message);
        return { geometry, hadCuts: false };
    }
}

/**
 * Create cutter geometry for extrusion cut (pocket/cavity)
 * Creates an extruded shape from the cut contour
 * @param {Object} cut - Cut data with contour
 * @param {Object} panel - Panel data
 * @param {number} thickness - Panel thickness
 * @returns {Array<THREE.BufferGeometry>|null}
 */
function createExtrusionCutter(cut, panel, thickness) {
    if (!cut.contour || cut.contour.length === 0) {
        console.warn('Extrusion cut has no contour:', cut.name || cut.id);
        return null;
    }

    // Get depth with 1mm extension for reliable CSG
    const depth = (cut.depth || 5) + 1;

    // Determine effective side using frontSide from Bazis
    let effectiveSide = cut.side || 'front';
    if (typeof cut.frontSide !== 'undefined') {
        effectiveSide = cut.frontSide ? 'front' : 'back';
    }

    try {
        // Create shape from contour elements
        const shape = new THREE.Shape();
        let firstPoint = null;
        let currentPoint = null;

        cut.contour.forEach((elem, idx) => {
            if (elem.type === 'line') {
                if (idx === 0) {
                    shape.moveTo(elem.start.x, elem.start.y);
                    firstPoint = { x: elem.start.x, y: elem.start.y };
                }
                shape.lineTo(elem.end.x, elem.end.y);
                currentPoint = { x: elem.end.x, y: elem.end.y };
            } else if (elem.type === 'arc') {
                if (idx === 0) {
                    shape.moveTo(elem.start.x, elem.start.y);
                    firstPoint = { x: elem.start.x, y: elem.start.y };
                }
                // Convert arc to bezier curves using absarc
                const startAngle = Math.atan2(elem.start.y - elem.center.y, elem.start.x - elem.center.x);
                const endAngle = Math.atan2(elem.end.y - elem.center.y, elem.end.x - elem.center.x);
                const anticlockwise = elem.direction > 0;
                shape.absarc(elem.center.x, elem.center.y, elem.radius, startAngle, endAngle, !anticlockwise);
                currentPoint = { x: elem.end.x, y: elem.end.y };
            } else if (elem.type === 'circle') {
                // Full circle - create as separate geometry
                const circleShape = new THREE.Shape();
                circleShape.absarc(elem.center.x, elem.center.y, elem.radius, 0, Math.PI * 2, false);

                const extrudeSettings = { depth: depth, bevelEnabled: false };
                const circleGeom = new THREE.ExtrudeGeometry(circleShape, extrudeSettings);

                const zPos = (effectiveSide === 'front')
                    ? thickness / 2 - depth + 1
                    : -thickness / 2;

                let offsetX = 0, offsetY = 0;
                if (panel.contourTopology && panel.contourTopology.outerContour) {
                    const bbox = calculateContourBBox(panel.contourTopology.outerContour);
                    if (bbox) {
                        offsetX = (bbox.minX + bbox.maxX) / 2;
                        offsetY = (bbox.minY + bbox.maxY) / 2;
                    }
                } else if (panel.size) {
                    offsetX = panel.size.x / 2;
                    offsetY = panel.size.y / 2;
                }

                circleGeom.translate(-offsetX, -offsetY, zPos);
                console.log(`  Extrusion circle: center=(${elem.center.x.toFixed(1)}, ${elem.center.y.toFixed(1)}), r=${elem.radius.toFixed(1)}, depth=${depth}`);
                return [circleGeom];
            }
        });

        // Close the shape if not already closed
        if (firstPoint && currentPoint) {
            const dx = Math.abs(currentPoint.x - firstPoint.x);
            const dy = Math.abs(currentPoint.y - firstPoint.y);
            if (dx > 0.1 || dy > 0.1) {
                shape.lineTo(firstPoint.x, firstPoint.y);
            }
        }

        // Create extrusion geometry
        const extrudeSettings = { depth: depth, bevelEnabled: false };
        const extrudeGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // Position extrusion on correct side
        let zPos;
        if (effectiveSide === 'front') {
            zPos = thickness / 2 - depth + 1;
        } else {
            zPos = -thickness / 2;
        }

        // Offset to panel center
        let offsetX = 0, offsetY = 0;
        if (panel.contourTopology && panel.contourTopology.outerContour) {
            const bbox = calculateContourBBox(panel.contourTopology.outerContour);
            if (bbox) {
                offsetX = (bbox.minX + bbox.maxX) / 2;
                offsetY = (bbox.minY + bbox.maxY) / 2;
            }
        } else if (panel.size) {
            offsetX = panel.size.x / 2;
            offsetY = panel.size.y / 2;
        }

        extrudeGeom.translate(-offsetX, -offsetY, zPos);

        console.log(`  Extrusion cutter: ${cut.contour.length} contour elements, depth=${depth}, side=${effectiveSide}, zPos=${zPos.toFixed(1)}`);

        return [extrudeGeom];

    } catch (e) {
        console.error(`Failed to create extrusion cutter for "${cut.name}":`, e.message);
        return null;
    }
}

/**
 * Create cutter geometry for cut/groove
 * Creates box segments along trajectory that extend beyond panel surface
 * @param {Object} cut - Cut/groove data
 * @param {Object} panel - Panel data
 * @param {number} thickness - Panel thickness
 * @returns {Array<THREE.BufferGeometry>|null}
 */
function createGrooveCutter(cut, panel, thickness) {
    if (!cut.trajectory || cut.trajectory.length === 0) {
        console.warn('Cut has no trajectory:', cut.name || cut.id);
        return null;
    }

    // Add 2mm to depth for guaranteed surface penetration (+1mm each side)
    const originalDepth = cut.depth || 5;
    const depth = originalDepth + 2;
    const width = cut.width || 10;
    const trajOffset = cut.offset || 0;

    // Determine effective side for groove positioning
    // Use frontSide from Bazis export when available (most reliable)
    // Otherwise fall back to cut.side from thickness sign
    let effectiveSide = cut.side || 'front';

    if (typeof cut.frontSide !== 'undefined') {
        // FrontSide from Bazis: true = front face, false = back face
        effectiveSide = cut.frontSide ? 'front' : 'back';
        console.log(`  Cut "${cut.name || 'unnamed'}": using Bazis frontSide=${cut.frontSide}, effectiveSide=${effectiveSide}`);
    } else if (panel.basis) {
        // Fallback: calculate based on panel orientation and basis
        const b = panel.basis;
        const zAxis = new THREE.Vector3(b.axisZ.x, b.axisZ.y, b.axisZ.z);

        // For mirrored panels (det < 0), flip the side
        const xAxis = new THREE.Vector3(b.axisX.x, b.axisX.y, b.axisX.z);
        const yAxis = new THREE.Vector3(b.axisY.x, b.axisY.y, b.axisY.z);
        const basisMatrix = new THREE.Matrix4();
        basisMatrix.makeBasis(xAxis, yAxis, zAxis);
        const det = basisMatrix.determinant();

        if (det < 0) {
            effectiveSide = (cut.side === 'back') ? 'front' : 'back';
            console.log(`  Cut "${cut.name || 'unnamed'}": mirrored panel (det=${det.toFixed(3)}), side ${cut.side} → ${effectiveSide}`);
        }
    }

    // Calculate Z position - extend 1mm beyond surface
    // Panel geometry is centered: Z goes from -thickness/2 to +thickness/2
    let zCenter;
    if (effectiveSide === 'back') {
        // Back surface at -thickness/2, extend 1mm below
        zCenter = -thickness / 2 + depth / 2 - 1;
    } else {
        // Front surface at +thickness/2, extend 1mm above
        zCenter = thickness / 2 - depth / 2 + 1;
    }

    // Build segments from trajectory (discretize arcs/circles)
    const segments = [];
    cut.trajectory.forEach(elem => {
        if (elem.type === 'line') {
            segments.push({
                start: { x: elem.start.x, y: elem.start.y },
                end: { x: elem.end.x, y: elem.end.y }
            });
        } else if (elem.type === 'arc') {
            const arcSegs = discretizeArcForCSG(elem);
            segments.push(...arcSegs);
        } else if (elem.type === 'circle') {
            const circleSegs = discretizeCircleForCSG(elem);
            segments.push(...circleSegs);
        }
    });

    if (segments.length === 0) {
        console.warn('Cut has empty trajectory after discretization:', cut.name || cut.id);
        return null;
    }

    // Get panel contour center for offset calculation
    let offsetX = 0, offsetY = 0;
    if (panel.contourTopology && panel.contourTopology.outerContour) {
        const bbox = calculateContourBBox(panel.contourTopology.outerContour);
        if (bbox) {
            offsetX = (bbox.minX + bbox.maxX) / 2;
            offsetY = (bbox.minY + bbox.maxY) / 2;
        }
    } else if (panel.size) {
        // Fallback: assume contour goes from 0 to size
        offsetX = panel.size.x / 2;
        offsetY = panel.size.y / 2;
    }

    // Create geometry for each segment
    const geometries = [];

    segments.forEach((seg) => {
        const dx = seg.end.x - seg.start.x;
        const dy = seg.end.y - seg.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.01) return; // Skip zero-length segments

        // Create box with small buffers for reliable CSG intersection
        const boxGeom = new THREE.BoxGeometry(length + 0.5, width + 0.2, depth);

        // Calculate angle of segment
        const angle = Math.atan2(dy, dx);

        // Calculate perpendicular offset for THIS segment
        // perpAngle is 90° counterclockwise from segment direction
        // This automatically handles mirrored panels because trajectory direction is already inverted
        const perpAngle = angle + Math.PI / 2;
        const trajOffsetDx = Math.cos(perpAngle) * trajOffset;
        const trajOffsetDy = Math.sin(perpAngle) * trajOffset;

        // Apply rotation around Z
        boxGeom.rotateZ(angle);

        // Calculate center of segment with trajectory offset applied
        const cx = (seg.start.x + seg.end.x) / 2 + trajOffsetDx - offsetX;
        const cy = (seg.start.y + seg.end.y) / 2 + trajOffsetDy - offsetY;

        boxGeom.translate(cx, cy, zCenter);
        geometries.push(boxGeom);
    });

    if (geometries.length === 0) {
        return null;
    }

    return geometries;
}

/**
 * Calculate bounding box of contour elements
 * @param {Array} contour - Array of contour elements
 * @returns {Object|null} - { minX, maxX, minY, maxY }
 */
function calculateContourBBox(contour) {
    if (!contour || contour.length === 0) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    contour.forEach(el => {
        if (el.start) {
            minX = Math.min(minX, el.start.x);
            maxX = Math.max(maxX, el.start.x);
            minY = Math.min(minY, el.start.y);
            maxY = Math.max(maxY, el.start.y);
        }
        if (el.end) {
            minX = Math.min(minX, el.end.x);
            maxX = Math.max(maxX, el.end.x);
            minY = Math.min(minY, el.end.y);
            maxY = Math.max(maxY, el.end.y);
        }
        if (el.type === 'circle' && el.center) {
            minX = Math.min(minX, el.center.x - el.radius);
            maxX = Math.max(maxX, el.center.x + el.radius);
            minY = Math.min(minY, el.center.y - el.radius);
            maxY = Math.max(maxY, el.center.y + el.radius);
        }
        if (el.type === 'arc' && el.center) {
            minX = Math.min(minX, el.center.x - el.radius);
            maxX = Math.max(maxX, el.center.x + el.radius);
            minY = Math.min(minY, el.center.y - el.radius);
            maxY = Math.max(maxY, el.center.y + el.radius);
        }
    });

    return { minX, maxX, minY, maxY };
}

/**
 * DEBUG: Create visualization of groove boxes for debugging
 * Shows red semi-transparent boxes where CSG cutters are positioned
 * @param {Object} cut - Cut data
 * @param {Object} panel - Panel data
 * @param {number} thickness - Panel thickness
 * @param {number} cutIdx - Cut index for naming
 * @returns {THREE.Group|null}
 */
function createGrooveDebugVisualization(cut, panel, thickness, cutIdx) {
    if (!cut.trajectory || cut.trajectory.length === 0) {
        return null;
    }

    const group = new THREE.Group();
    group.name = `groove_debug_${cutIdx}`;

    const depth = cut.depth || 5;
    const width = cut.width || 10;
    const offset = cut.offset || 0;

    // Z position same as CSG cutter
    const overshoot = 0.5;
    let zCenter;
    if (cut.side === 'back') {
        zCenter = -thickness / 2 + depth / 2 - overshoot;
    } else {
        zCenter = thickness / 2 - depth / 2 + overshoot;
    }

    // Panel center offset
    let panelCenterX = 0, panelCenterY = 0;
    if (panel.size) {
        panelCenterX = panel.size.x / 2;
        panelCenterY = panel.size.y / 2;
    }

    // Build segments
    const segments = [];
    cut.trajectory.forEach(elem => {
        if (elem.type === 'line') {
            segments.push({
                start: { x: elem.start.x, y: elem.start.y },
                end: { x: elem.end.x, y: elem.end.y }
            });
        } else if (elem.type === 'arc') {
            const arcSegs = discretizeArcForCSG(elem);
            segments.push(...arcSegs);
        } else if (elem.type === 'circle') {
            const circleSegs = discretizeCircleForCSG(elem);
            segments.push(...circleSegs);
        }
    });

    const extendedDepth = depth + 1;

    segments.forEach((seg, segIdx) => {
        const dx = seg.end.x - seg.start.x;
        const dy = seg.end.y - seg.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 0.01) return;

        const angle = Math.atan2(dy, dx);
        const perpAngle = angle + Math.PI / 2;

        const offsetDx = Math.cos(perpAngle) * offset;
        const offsetDy = Math.sin(perpAngle) * offset;

        // Create visible red box
        const boxGeom = new THREE.BoxGeometry(length + 0.1, width, extendedDepth);
        const material = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        const box = new THREE.Mesh(boxGeom, material);

        // Same position calculation as CSG cutter
        const trajCenterX = (seg.start.x + seg.end.x) / 2;
        const trajCenterY = (seg.start.y + seg.end.y) / 2;

        const cx = trajCenterX + offsetDx - panelCenterX;
        const cy = trajCenterY + offsetDy - panelCenterY;

        box.position.set(cx, cy, zCenter);
        box.rotation.z = angle;

        // Add wireframe
        const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(boxGeom),
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
        );
        box.add(wireframe);

        group.add(box);

        console.log(`DEBUG groove ${cutIdx} seg ${segIdx}: pos=(${cx.toFixed(1)}, ${cy.toFixed(1)}, ${zCenter.toFixed(1)}), rot=${(angle * 180 / Math.PI).toFixed(1)}°`);
    });

    return group.children.length > 0 ? group : null;
}

/**
 * Apply position and rotation to panel mesh
 * @param {THREE.Mesh} mesh - Panel mesh
 * @param {Object} panel - Panel data
 * @param {THREE.BufferGeometry} geometry - Panel geometry
 * @param {Object} modelCenter - Model center offsets {x, minY, z}
 */
function applyPanelTransform(mesh, panel, geometry, modelCenter) {
    // Calculate position using panel.center (preferred) or panel.position
    let posX, posY, posZ;

    if (panel.center) {
        // Use center coordinates with model centering offsets
        posX = panel.center.x - modelCenter.x;
        posY = panel.center.y - modelCenter.minY;
        posZ = panel.center.z - modelCenter.z;
    } else if (panel.position) {
        // Fallback to position + half size
        posX = panel.position.x + (panel.size?.x || 0) / 2 - modelCenter.x;
        posY = panel.position.y + (panel.size?.y || 0) / 2 - modelCenter.minY;
        posZ = panel.position.z + (panel.size?.z || 0) / 2 - modelCenter.z;
    } else {
        posX = 0;
        posY = 0;
        posZ = 0;
    }

    mesh.position.set(posX, posY, posZ);

    // Apply rotation from basis (preferred) or orientation
    if (panel.basis && !(geometry instanceof THREE.BoxGeometry)) {
        try {
            const b = panel.basis;
            const xAxis = new THREE.Vector3(b.axisX.x, b.axisX.y, b.axisX.z).normalize();
            const yAxis = new THREE.Vector3(b.axisY.x, b.axisY.y, b.axisY.z).normalize();
            const zAxis = new THREE.Vector3(b.axisZ.x, b.axisZ.y, b.axisZ.z).normalize();

            // Check for valid basis
            if (xAxis.lengthSq() > 0.001 && yAxis.lengthSq() > 0.001 && zAxis.lengthSq() > 0.001) {
                const rotMatrix = new THREE.Matrix4();
                rotMatrix.makeBasis(xAxis, yAxis, zAxis);
                mesh.setRotationFromMatrix(rotMatrix);
            }
        } catch (e) {
            console.warn('Basis rotation failed for panel', panel.id, e);
            // Fallback to orientation-based rotation
            applyOrientationRotation(mesh, panel.orientation);
        }
    } else {
        // Fallback: Apply rotation based on orientation
        applyOrientationRotation(mesh, panel.orientation);
    }

    // Apply explicit rotation if provided (additive)
    if (panel.rotation) {
        if (panel.rotation.x) mesh.rotation.x += panel.rotation.x;
        if (panel.rotation.y) mesh.rotation.y += panel.rotation.y;
        if (panel.rotation.z) mesh.rotation.z += panel.rotation.z;
    }
}

/**
 * Apply rotation based on panel orientation
 * @param {THREE.Mesh} mesh - Panel mesh
 * @param {string} orientation - Panel orientation
 */
function applyOrientationRotation(mesh, orientation) {
    switch (orientation) {
        case 'vertical':
            mesh.rotation.x = Math.PI / 2;
            break;
        case 'frontal':
            mesh.rotation.y = Math.PI / 2;
            break;
        case 'horizontal':
        default:
            // No rotation needed
            break;
    }
}


/**
 * Classify furniture by name/type
 * @param {string} name - Furniture name
 * @returns {string} Furniture type: 'leg', 'fastener', 'rail', 'hinge', 'other'
 */
function classifyFurniture(name) {
    if (!name) return 'other';
    const lowerName = name.toLowerCase();

    // Ножки, опоры
    if (lowerName.includes('ножка') || lowerName.includes('опора') ||
        lowerName.includes('ног') || lowerName.includes('leg') ||
        lowerName.includes('foot') || lowerName.includes('цоколь')) {
        return 'leg';
    }

    // Крепёжная фурнитура
    if (lowerName.includes('еврованг') || lowerName.includes('шкант') ||
        lowerName.includes('минификс') || lowerName.includes('стяжка') ||
        lowerName.includes('эксцентрик') || lowerName.includes('конфирмат') ||
        lowerName.includes('винт') || lowerName.includes('болт')) {
        return 'fastener';
    }

    // Направляющие
    if (lowerName.includes('направляющ') || lowerName.includes('runner') ||
        lowerName.includes('slide') || lowerName.includes('рельс')) {
        return 'rail';
    }

    // Петли
    if (lowerName.includes('петл') || lowerName.includes('hinge')) {
        return 'hinge';
    }

    return 'other';
}

/**
 * Create furniture meshes with type-based rendering
 * @param {Object} furn - Furniture data
 * @param {Object} modelCenter - Model center offsets {x, minY, z}
 * @returns {Array<THREE.Mesh>} Array of furniture meshes
 */
function createFurnitureMeshes(furn, modelCenter) {
    const furnMeshes = [];
    const furnType = classifyFurniture(furn.name);

    // 1. Build Holes (cylinders oriented by direction) - for all types
    if (furn.holes && furn.holes.length > 0) {
        furn.holes.forEach(hole => {
            const radius = (hole.diameter || 8) / 2;
            const height = hole.depth || 15;

            const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
            const material = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.6,
                metalness: 0.4,
                transparent: true,
                opacity: 0.7
            });

            const mesh = new THREE.Mesh(geometry, material);

            if (hole.direction) {
                const dir = new THREE.Vector3(hole.direction.x, hole.direction.y, hole.direction.z).normalize();
                const defaultAxis = new THREE.Vector3(0, 1, 0);
                mesh.quaternion.setFromUnitVectors(defaultAxis, dir);

                if (hole.position) {
                    mesh.position.set(
                        hole.position.x + dir.x * height / 2 - modelCenter.x,
                        hole.position.y + dir.y * height / 2 - modelCenter.minY,
                        hole.position.z + dir.z * height / 2 - modelCenter.z
                    );
                }
            } else if (hole.position) {
                mesh.position.set(
                    hole.position.x - modelCenter.x,
                    hole.position.y - modelCenter.minY,
                    hole.position.z - modelCenter.z
                );
            }

            mesh.userData = { type: 'furniture', subtype: 'hole', data: furn };
            mesh.castShadow = true;
            furnMeshes.push(mesh);
        });
    }

    // 2. Build Body based on furniture type
    if (furn.bodySize && furn.bodyCenter) {
        let bodyMesh = null;

        switch (furnType) {
            case 'leg':
                // Ножка: цилиндр + основание
                bodyMesh = createLegMesh(furn, modelCenter);
                break;

            case 'fastener':
                // Крепёж: wireframe body
                bodyMesh = createFastenerBodyMesh(furn, modelCenter);
                break;

            case 'rail':
                // Направляющие: плоский бокс (серебристый)
                bodyMesh = createRailMesh(furn, modelCenter);
                break;

            case 'hinge':
                // Петли: маленький бокс (металл)
                bodyMesh = createHingeMesh(furn, modelCenter);
                break;

            default:
                // Прочее: полупрозрачный бокс
                bodyMesh = createDefaultBodyMesh(furn, modelCenter);
                break;
        }

        if (bodyMesh) {
            bodyMesh.userData = { type: 'furniture', subtype: 'body', furnType: furnType, data: furn };
            bodyMesh.castShadow = true;
            furnMeshes.push(bodyMesh);
        }
    }

    // 3. Fallback for furniture without body but with position
    if (furnMeshes.length === 0 && furn.position) {
        const size = furn.size || { x: 10, y: 10, z: 10 };

        let mesh;
        if (furnType === 'leg') {
            // Ножка без body: рендерим как цилиндр
            const radius = Math.min(size.x, size.z) / 2;
            const height = size.y;
            const geometry = new THREE.CylinderGeometry(radius, radius * 1.2, height, 16);
            const material = new THREE.MeshStandardMaterial({
                color: 0x444444,
                roughness: 0.4,
                metalness: 0.6
            });
            mesh = new THREE.Mesh(geometry, material);

            // Добавляем диск-основание
            const baseGeometry = new THREE.CylinderGeometry(radius * 1.4, radius * 1.4, 3, 16);
            const baseMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.3,
                metalness: 0.7
            });
            const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
            baseMesh.position.y = -height / 2 + 1.5;
            mesh.add(baseMesh);
        } else {
            const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            const material = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.5,
                metalness: 0.3
            });
            mesh = new THREE.Mesh(geometry, material);
        }

        mesh.position.set(
            furn.position.x - modelCenter.x,
            furn.position.y - modelCenter.minY,
            furn.position.z - modelCenter.z
        );

        mesh.userData = { type: 'furniture', furnType: furnType, data: furn };
        mesh.castShadow = true;
        furnMeshes.push(mesh);
    }

    return furnMeshes;
}

/**
 * Create leg mesh (cylinder + base disk)
 */
function createLegMesh(furn, modelCenter) {
    const group = new THREE.Group();
    const size = furn.bodySize;

    // Определяем радиус и высоту цилиндра
    const radius = Math.min(size.x, size.z) / 2;
    const height = size.y;

    // Основной цилиндр ножки (сужается книзу)
    const legGeometry = new THREE.CylinderGeometry(radius * 0.8, radius, height, 16);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.4,
        metalness: 0.6,
        transparent: true,
        opacity: 0.7
    });
    const legMesh = new THREE.Mesh(legGeometry, legMaterial);
    group.add(legMesh);

    // Диск-основание (регулятор)
    const baseGeometry = new THREE.CylinderGeometry(radius * 1.2, radius * 1.3, 4, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.3,
        metalness: 0.8,
        transparent: true,
        opacity: 0.7
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = -height / 2 - 2;
    group.add(baseMesh);

    group.position.set(
        furn.bodyCenter.x - modelCenter.x,
        furn.bodyCenter.y - modelCenter.minY,
        furn.bodyCenter.z - modelCenter.z
    );

    return group;
}

/**
 * Create fastener body mesh (wireframe box)
 */
function createFastenerBodyMesh(furn, modelCenter) {
    const geometry = new THREE.BoxGeometry(furn.bodySize.x, furn.bodySize.y, furn.bodySize.z);

    // Wireframe material для крепежа
    const material = new THREE.MeshBasicMaterial({
        color: 0x666666,
        wireframe: true,
        transparent: true,
        opacity: 0.4
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(
        furn.bodyCenter.x - modelCenter.x,
        furn.bodyCenter.y - modelCenter.minY,
        furn.bodyCenter.z - modelCenter.z
    );

    return mesh;
}

/**
 * Create rail mesh (flat silver box)
 */
function createRailMesh(furn, modelCenter) {
    const geometry = new THREE.BoxGeometry(furn.bodySize.x, furn.bodySize.y, furn.bodySize.z);
    const material = new THREE.MeshStandardMaterial({
        color: 0xAAAAAA,
        roughness: 0.3,
        metalness: 0.7,
        transparent: true,
        opacity: 0.7
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Добавляем тонкие линии-рёбра
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color: 0x888888
    }));
    mesh.add(line);

    mesh.position.set(
        furn.bodyCenter.x - modelCenter.x,
        furn.bodyCenter.y - modelCenter.minY,
        furn.bodyCenter.z - modelCenter.z
    );

    return mesh;
}

/**
 * Create hinge mesh (small metallic box)
 */
function createHingeMesh(furn, modelCenter) {
    const geometry = new THREE.BoxGeometry(furn.bodySize.x, furn.bodySize.y, furn.bodySize.z);
    const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.4,
        metalness: 0.6,
        transparent: true,
        opacity: 0.7
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(
        furn.bodyCenter.x - modelCenter.x,
        furn.bodyCenter.y - modelCenter.minY,
        furn.bodyCenter.z - modelCenter.z
    );

    return mesh;
}

/**
 * Create default body mesh (semi-transparent box with edges)
 */
function createDefaultBodyMesh(furn, modelCenter) {
    const geometry = new THREE.BoxGeometry(furn.bodySize.x, furn.bodySize.y, furn.bodySize.z);
    const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.5,
        metalness: 0.3,
        transparent: true,
        opacity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);

    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color: 0x555555,
        transparent: true,
        opacity: 0.3
    }));
    mesh.add(line);

    mesh.position.set(
        furn.bodyCenter.x - modelCenter.x,
        furn.bodyCenter.y - modelCenter.minY,
        furn.bodyCenter.z - modelCenter.z
    );

    return mesh;
}


/**
 * Calculate and store model bounding box
 */
function calculateModelBounds() {
    state.modelBounds = new THREE.Box3();

    state.meshes.forEach(mesh => {
        state.modelBounds.expandByObject(mesh);
    });
}

export default {
    buildModel
};

/**
 * Edge Banding Module
 * Creates edge banding meshes for panels
 */

import CONFIG from './config.js';

/**
 * Create edge banding meshes and add them to the panel
 * @param {Object} panel - Panel data from JSON
 * @param {THREE.Mesh} panelMesh - The panel mesh to add edges to
 * @returns {Array<THREE.Mesh>} Array of edge meshes
 */
export function createEdgeBanding(panel, panelMesh) {
    if (!panel.edges || panel.edges.length === 0) return [];

    const thickness = panel.material?.thickness || panel.size?.z || 16;
    const edgeMeshes = [];

    // Calculate center offset (must match exactly how geometry is centered in contours.js)
    // contours.js uses: geometry.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, ...)
    // THREE.js ExtrudeGeometry bbox is based on Shape points including arc curve points
    let centerOffsetX = 0, centerOffsetY = 0;

    // Use ONLY outer contour for bbox (holes are inside and don't affect bbox)
    let outerElements = [];

    if (panel.contourTopology?.outerContour) {
        outerElements = panel.contourTopology.outerContour;
    } else if (panel.contourElements) {
        outerElements = panel.contourElements;
    }

    if (outerElements.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        outerElements.forEach(elem => {
            // Include start/end points
            if (elem.start) {
                minX = Math.min(minX, elem.start.x);
                maxX = Math.max(maxX, elem.start.x);
                minY = Math.min(minY, elem.start.y);
                maxY = Math.max(maxY, elem.start.y);
            }
            if (elem.end) {
                minX = Math.min(minX, elem.end.x);
                maxX = Math.max(maxX, elem.end.x);
                minY = Math.min(minY, elem.end.y);
                maxY = Math.max(maxY, elem.end.y);
            }
            // For arcs, check if arc passes through cardinal directions
            if (elem.type === 'arc' && elem.center && elem.radius) {
                const cx = elem.center.x, cy = elem.center.y, r = elem.radius;
                const startAngle = Math.atan2(elem.start.y - cy, elem.start.x - cx);
                const endAngle = Math.atan2(elem.end.y - cy, elem.end.x - cx);
                const dir = elem.direction || 1;

                // Check each cardinal direction (0, π/2, π, 3π/2)
                const cardinals = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
                const cardinalPoints = [
                    { x: cx + r, y: cy },  // right
                    { x: cx, y: cy + r },  // top
                    { x: cx - r, y: cy },  // left
                    { x: cx, y: cy - r }   // bottom
                ];

                cardinals.forEach((angle, i) => {
                    if (isAngleInArc(angle, startAngle, endAngle, dir)) {
                        minX = Math.min(minX, cardinalPoints[i].x);
                        maxX = Math.max(maxX, cardinalPoints[i].x);
                        minY = Math.min(minY, cardinalPoints[i].y);
                        maxY = Math.max(maxY, cardinalPoints[i].y);
                    }
                });
            }
        });

        centerOffsetX = (minX + maxX) / 2;
        centerOffsetY = (minY + maxY) / 2;
    }

    // Helper: check if angle is within arc sweep
    function isAngleInArc(angle, startAngle, endAngle, direction) {
        // Normalize angles to [0, 2π]
        const normalize = a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const a = normalize(angle);
        const s = normalize(startAngle);
        const e = normalize(endAngle);

        if (direction > 0) { // CCW
            if (s <= e) return a >= s && a <= e;
            return a >= s || a <= e;
        } else { // CW
            if (s >= e) return a <= s && a >= e;
            return a <= s || a >= e;
        }
    }

    panel.edges.forEach((edge, idx) => {
        if (!edge.start || !edge.end) {
            return;
        }

        const edgeThickness = edge.thickness || 0.5;

        const elem = {
            type: edge.arc ? 'arc' : 'line',
            start: {
                x: edge.start.x - centerOffsetX,
                y: edge.start.y - centerOffsetY
            },
            end: {
                x: edge.end.x - centerOffsetX,
                y: edge.end.y - centerOffsetY
            }
        };

        if (edge.arc) {
            elem.center = {
                x: edge.arc.center.x - centerOffsetX,
                y: edge.arc.center.y - centerOffsetY
            };
            elem.radius = Math.sqrt(
                Math.pow(edge.start.x - edge.arc.center.x, 2) +
                Math.pow(edge.start.y - edge.arc.center.y, 2)
            );
            elem.direction = edge.arc.direction || 1;
        }

        let edgeMesh = null;
        if (elem.type === 'line') {
            edgeMesh = createEdgeForLine(elem, thickness, edge, edgeThickness);
        } else if (elem.type === 'arc') {
            // Check if this is a full circle (start == end)
            const isFullCircle = edge.arc?.isFullCircle || (
                Math.abs(elem.start.x - elem.end.x) < 0.1 &&
                Math.abs(elem.start.y - elem.end.y) < 0.1 &&
                elem.radius > 0
            );

            if (isFullCircle && elem.center && elem.radius > 0) {
                edgeMesh = createEdgeForFullCircle(elem, thickness, edge, edgeThickness);
            } else {
                edgeMesh = createEdgeForArc(elem, thickness, edge, edgeThickness);
            }
        }

        if (edgeMesh) {
            edgeMeshes.push(edgeMesh);
            panelMesh.add(edgeMesh);
        }
    });

    return edgeMeshes;
}

/**
 * Create edge mesh for a line segment
 * @param {Object} elem - Element data with start/end
 * @param {number} panelThickness - Panel thickness
 * @param {Object} edge - Original edge data
 * @param {number} edgeThickness - Edge banding thickness
 * @returns {THREE.Mesh|null}
 */
export function createEdgeForLine(elem, panelThickness, edge, edgeThickness) {
    const dx = elem.end.x - elem.start.x;
    const dy = elem.end.y - elem.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    if (length < 1) return null;

    const geometry = new THREE.BoxGeometry(length, edgeThickness, panelThickness);

    const material = new THREE.MeshStandardMaterial({
        color: CONFIG.edgeBandingColor,
        roughness: 0.8,
        metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);

    const centerX = (elem.start.x + elem.end.x) / 2;
    const centerY = (elem.start.y + elem.end.y) / 2;

    // Calculate normal
    let normalX, normalY;
    if (edge.normal3d && (edge.normal3d.x !== 0 || edge.normal3d.y !== 0)) {
        const nLen = Math.sqrt(edge.normal3d.x * edge.normal3d.x + edge.normal3d.y * edge.normal3d.y);
        if (nLen > 0.001) {
            normalX = edge.normal3d.x / nLen;
            normalY = edge.normal3d.y / nLen;
        } else {
            normalX = -Math.sin(angle);
            normalY = Math.cos(angle);
        }
    } else {
        normalX = -Math.sin(angle);
        normalY = Math.cos(angle);
    }

    mesh.position.set(
        centerX + normalX * edgeThickness / 2,
        centerY + normalY * edgeThickness / 2,
        0
    );

    mesh.rotation.z = angle;

    mesh.userData = {
        type: 'edgeBanding',
        elemIndex: edge.elemIndex,
        edgeName: edge.name
    };

    return mesh;
}

/**
 * Create edge mesh for an arc segment
 * @param {Object} elem - Element data with center/radius
 * @param {number} panelThickness - Panel thickness
 * @param {Object} edge - Original edge data
 * @param {number} edgeThickness - Edge banding thickness
 * @returns {THREE.Group|null}
 */
export function createEdgeForArc(elem, panelThickness, edge, edgeThickness) {
    if (!elem.center || !elem.radius) return null;

    const startAngle = Math.atan2(
        elem.start.y - elem.center.y,
        elem.start.x - elem.center.x
    );
    const endAngle = Math.atan2(
        elem.end.y - elem.center.y,
        elem.end.x - elem.center.x
    );

    let angleDiff = endAngle - startAngle;
    const direction = elem.direction ?? 1;

    // Handle full circle (start == end → angleDiff ≈ 0)
    if (Math.abs(angleDiff) < 0.01) {
        // Full circle: set angleDiff to 2π in the arc direction
        angleDiff = direction > 0 ? Math.PI * 2 : -Math.PI * 2;
    } else {
        // Regular arc: normalize angle based on direction
        if (direction > 0 && angleDiff < 0) angleDiff += Math.PI * 2;
        if (direction < 0 && angleDiff > 0) angleDiff -= Math.PI * 2;
    }

    // Determine if edge is on outer or inner side
    let isOuterArc = true;

    if (edge.normal3d && (edge.normal3d.x !== 0 || edge.normal3d.y !== 0)) {
        const midAngle = startAngle + angleDiff / 2;
        const expectedOutwardX = Math.cos(midAngle);
        const expectedOutwardY = Math.sin(midAngle);
        const dotProduct = edge.normal3d.x * expectedOutwardX + edge.normal3d.y * expectedOutwardY;
        isOuterArc = dotProduct >= 0;
    }

    const segments = Math.max(8, Math.floor(Math.abs(angleDiff) * 30));
    const group = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
        color: CONFIG.edgeBandingColor,
        roughness: 0.8,
        metalness: 0.1
    });

    for (let i = 0; i < segments; i++) {
        const t1 = i / segments;
        const t2 = (i + 1) / segments;
        const a1 = startAngle + angleDiff * t1;
        const a2 = startAngle + angleDiff * t2;

        const r = isOuterArc
            ? elem.radius + edgeThickness / 2
            : elem.radius - edgeThickness / 2;

        const x1 = elem.center.x + r * Math.cos(a1);
        const y1 = elem.center.y + r * Math.sin(a1);
        const x2 = elem.center.x + r * Math.cos(a2);
        const y2 = elem.center.y + r * Math.sin(a2);

        const segLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const segAngle = Math.atan2(y2 - y1, x2 - x1);

        const geometry = new THREE.BoxGeometry(
            segLength * 1.05,
            edgeThickness,
            panelThickness
        );

        const segMesh = new THREE.Mesh(geometry, material);
        segMesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
        segMesh.rotation.z = segAngle;

        group.add(segMesh);
    }

    group.userData = {
        type: 'edgeBanding',
        elemIndex: edge.elemIndex,
        edgeName: edge.name
    };

    return group;
}

/**
 * Create edge mesh for a full circle (hole edge)
 * @param {Object} elem - Element data with center/radius
 * @param {number} panelThickness - Panel thickness
 * @param {Object} edge - Original edge data
 * @param {number} edgeThickness - Edge banding thickness
 * @returns {THREE.Group|null}
 */
export function createEdgeForFullCircle(elem, panelThickness, edge, edgeThickness) {
    if (!elem.center || !elem.radius || elem.radius <= 0) return null;

    const segments = 36; // Full circle segments
    const group = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
        color: CONFIG.edgeBandingColor,
        roughness: 0.8,
        metalness: 0.1
    });

    // Circles inside panel (holes) → edge banding goes INSIDE the circle
    // So we use radius - edgeThickness/2
    const r = elem.radius - edgeThickness / 2;

    for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;

        const x1 = elem.center.x + r * Math.cos(a1);
        const y1 = elem.center.y + r * Math.sin(a1);
        const x2 = elem.center.x + r * Math.cos(a2);
        const y2 = elem.center.y + r * Math.sin(a2);

        const segLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const segAngle = Math.atan2(y2 - y1, x2 - x1);

        const geometry = new THREE.BoxGeometry(
            segLength * 1.05,  // Slight overlap to avoid gaps
            edgeThickness,
            panelThickness
        );

        const segMesh = new THREE.Mesh(geometry, material);
        segMesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
        segMesh.rotation.z = segAngle;

        group.add(segMesh);
    }

    group.userData = {
        type: 'edgeBanding',
        elemIndex: edge.elemIndex,
        edgeName: edge.name
    };

    return group;
}

export default {
    createEdgeBanding,
    createEdgeForLine,
    createEdgeForArc,
    createEdgeForFullCircle
};

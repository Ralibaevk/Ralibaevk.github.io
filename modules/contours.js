/**
 * Contours Module
 * Handles contour chains, shapes, and panel geometry creation
 */

/**
 * Convert simple contour points array to elements format
 * @param {Array} contourPoints - Array of {x, y} points
 * @returns {Array|null}
 */
export function convertContourToElements(contourPoints) {
    if (!contourPoints || contourPoints.length < 3) return null;

    const elements = [];
    for (let i = 0; i < contourPoints.length; i++) {
        const start = contourPoints[i];
        const end = contourPoints[(i + 1) % contourPoints.length];
        elements.push({
            type: 'line',
            start: start,
            end: end
        });
    }
    return elements;
}

/**
 * Check if chain is closed
 * @param {Array} chain - Chain of elements
 * @param {number} tolerance - Distance tolerance
 * @returns {boolean}
 */
export function isChainClosed(chain, tolerance = 1.0) {
    if (chain.length === 0) return false;

    const firstStart = chain[0].start;
    const lastEnd = chain[chain.length - 1].end;

    const dist = Math.sqrt(
        Math.pow(firstStart.x - lastEnd.x, 2) +
        Math.pow(firstStart.y - lastEnd.y, 2)
    );

    return dist < tolerance;
}

/**
 * Calculate signed area of chain
 * @param {Array} chain - Chain of elements
 * @returns {number}
 */
export function calculateChainArea(chain) {
    let area = 0;

    for (const el of chain) {
        if (el.type === 'line') {
            area += (el.end.x - el.start.x) * (el.end.y + el.start.y) / 2;
        } else if (el.type === 'arc') {
            area += (el.end.x - el.start.x) * (el.end.y + el.start.y) / 2;

            const startAngle = Math.atan2(el.start.y - el.center.y, el.start.x - el.center.x);
            const endAngle = Math.atan2(el.end.y - el.center.y, el.end.x - el.center.x);

            let angle = endAngle - startAngle;
            if (el.direction < 0 && angle > 0) angle -= 2 * Math.PI;
            if (el.direction > 0 && angle < 0) angle += 2 * Math.PI;

            const segmentArea = el.radius * el.radius * (angle - Math.sin(angle)) / 2;
            area += segmentArea;
        }
    }

    return area;
}

/**
 * Calculate chain perimeter
 * @param {Array} chain - Chain of elements
 * @returns {number}
 */
export function calculateChainPerimeter(chain) {
    let perimeter = 0;

    for (const el of chain) {
        if (el.type === 'line') {
            const dx = el.end.x - el.start.x;
            const dy = el.end.y - el.start.y;
            perimeter += Math.sqrt(dx * dx + dy * dy);
        } else if (el.type === 'arc') {
            const startAngle = Math.atan2(el.start.y - el.center.y, el.start.x - el.center.x);
            const endAngle = Math.atan2(el.end.y - el.center.y, el.end.x - el.center.x);

            let angle = Math.abs(endAngle - startAngle);
            if (angle > Math.PI) angle = 2 * Math.PI - angle;

            perimeter += el.radius * angle;
        }
    }

    return perimeter;
}

/**
 * Calculate chain bounding box
 * @param {Array} chain - Chain of elements
 * @returns {Object}
 */
export function calculateChainBBox(chain) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const el of chain) {
        minX = Math.min(minX, el.start.x, el.end.x);
        maxX = Math.max(maxX, el.start.x, el.end.x);
        minY = Math.min(minY, el.start.y, el.end.y);
        maxY = Math.max(maxY, el.start.y, el.end.y);

        if (el.type === 'arc') {
            minX = Math.min(minX, el.center.x - el.radius);
            maxX = Math.max(maxX, el.center.x + el.radius);
            minY = Math.min(minY, el.center.y - el.radius);
            maxY = Math.max(maxY, el.center.y + el.radius);
        }
    }

    return { minX, maxX, minY, maxY };
}

/**
 * Reverse chain direction (for holes)
 * @param {Array} chain - Chain of elements
 * @returns {Array}
 */
export function reverseChain(chain) {
    const reversed = [];

    for (let i = chain.length - 1; i >= 0; i--) {
        const el = chain[i];
        const reversedEl = {
            type: el.type,
            start: el.end,
            end: el.start
        };

        if (el.type === 'arc') {
            reversedEl.center = el.center;
            reversedEl.radius = el.radius;
            reversedEl.direction = -el.direction;
        }

        reversed.push(reversedEl);
    }

    return reversed;
}

/**
 * Build all possible chains from elements
 * @param {Array} elements - Array of contour elements
 * @returns {Array}
 */
export function buildAllChains(elements) {
    const TOLERANCE = 0.1;
    const chains = [];
    const used = new Array(elements.length).fill(false);

    function pointsEqual(p1, p2) {
        return Math.abs(p1.x - p2.x) < TOLERANCE &&
            Math.abs(p1.y - p2.y) < TOLERANCE;
    }

    for (let startIdx = 0; startIdx < elements.length; startIdx++) {
        if (used[startIdx]) continue;

        const chain = [elements[startIdx]];
        used[startIdx] = true;
        let lastPoint = elements[startIdx].end;

        let iterations = 0;
        const maxIterations = elements.length;

        while (iterations < maxIterations) {
            iterations++;
            let foundNext = false;

            for (let j = 0; j < elements.length; j++) {
                if (used[j]) continue;

                if (pointsEqual(lastPoint, elements[j].start)) {
                    chain.push(elements[j]);
                    used[j] = true;
                    lastPoint = elements[j].end;
                    foundNext = true;
                    break;
                }
            }

            if (!foundNext) break;
        }

        chains.push(chain);
    }

    return chains;
}

/**
 * Check if point is inside polygon
 * @param {Object} point - {x, y}
 * @param {Array} polygon - Array of {x, y}
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Check if point is inside chain
 * @param {Object} point - {x, y}
 * @param {Array} chain - Chain of elements
 * @returns {boolean}
 */
export function isPointInsideChain(point, chain) {
    const polygon = [];
    chain.forEach(el => polygon.push(el.start));
    polygon.push(chain[chain.length - 1].end);
    return isPointInPolygon(point, polygon);
}

/**
 * Check if inner chain is inside outer chain
 * @param {Array} inner - Inner chain
 * @param {Array} outer - Outer chain
 * @returns {boolean}
 */
export function isChainInsideOuter(inner, outer) {
    if (!inner || inner.length === 0) return false;
    return isPointInsideChain(inner[0].start, outer);
}

/**
 * Merge chains into contours
 * @param {Array} chains - Array of chains
 * @returns {Array}
 */
export function mergeChainsIntoContours(chains) {
    if (chains.length === 0) return [];
    const MERGE_THRESHOLD = 3000, TOLERANCE = 1.0;
    const pool = [...chains];
    const contours = [];

    function dist(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    while (pool.length > 0) {
        pool.sort((a, b) => b.length - a.length);
        let current = [...pool.shift()];
        let merged = true;

        while (merged) {
            merged = false;
            const lp = current[current.length - 1].end;
            const fp = current[0].start;
            if (dist(fp, lp) < TOLERANCE) break;

            let bestIdx = -1, bestDist = MERGE_THRESHOLD, bestMode = '';
            for (let i = 0; i < pool.length; i++) {
                const cand = pool[i];
                const cs = cand[0].start, ce = cand[cand.length - 1].end;
                const d1 = dist(lp, cs);
                if (d1 < bestDist) { bestDist = d1; bestIdx = i; bestMode = 'end-start'; }
                const d2 = dist(lp, ce);
                if (d2 < bestDist) { bestDist = d2; bestIdx = i; bestMode = 'end-end'; }
                const d3 = dist(fp, ce);
                if (d3 < bestDist) { bestDist = d3; bestIdx = i; bestMode = 'start-end'; }
                const d4 = dist(fp, cs);
                if (d4 < bestDist) { bestDist = d4; bestIdx = i; bestMode = 'start-start'; }
            }

            if (bestIdx !== -1) {
                const cand = pool[bestIdx];
                if (bestMode === 'end-start') {
                    if (bestDist > TOLERANCE) current.push({ type: 'line', start: lp, end: cand[0].start });
                    current = current.concat(cand);
                } else if (bestMode === 'end-end') {
                    if (bestDist > TOLERANCE) current.push({ type: 'line', start: lp, end: cand[cand.length - 1].end });
                    current = current.concat(reverseChain(cand));
                } else if (bestMode === 'start-end') {
                    if (bestDist > TOLERANCE) current.unshift({ type: 'line', start: cand[cand.length - 1].end, end: fp });
                    current = cand.concat(current);
                } else if (bestMode === 'start-start') {
                    if (bestDist > TOLERANCE) current.unshift({ type: 'line', start: cand[0].start, end: fp });
                    current = reverseChain(cand).concat(current);
                }
                pool.splice(bestIdx, 1);
                merged = true;
            }
        }

        const fp = current[0].start, lp = current[current.length - 1].end;
        if (dist(fp, lp) > TOLERANCE && dist(fp, lp) < MERGE_THRESHOLD) {
            current.push({ type: 'line', start: lp, end: fp });
        }
        contours.push(current);
    }
    return contours;
}

/**
 * Create THREE.Shape from chain
 * @param {Array} chain - Chain of elements
 * @returns {THREE.Shape|null}
 */
export function createShapeFromChain(chain) {
    if (!chain || chain.length === 0) return null;

    const shape = new THREE.Shape();
    const first = chain[0];

    if (first.type === 'circle') {
        console.warn('Cannot create Shape from circle chain');
        return null;
    }

    const startX = first.start?.x ?? 0;
    const startY = first.start?.y ?? 0;
    shape.moveTo(startX, startY);

    for (const el of chain) {
        if (el.type === 'line') {
            shape.lineTo(el.end?.x ?? 0, el.end?.y ?? 0);
        } else if (el.type === 'arc') {
            const startAngle = Math.atan2(el.start.y - el.center.y, el.start.x - el.center.x);
            const endAngle = Math.atan2(el.end.y - el.center.y, el.end.x - el.center.x);
            const anticlockwise = el.direction < 0;
            shape.absarc(el.center.x, el.center.y, el.radius, startAngle, endAngle, anticlockwise);
        }
    }

    return shape;
}

/**
 * Create panel geometry from panel data
 * @param {Object} panel - Panel data
 * @returns {THREE.BufferGeometry}
 */
export function createPanelGeometry(panel) {
    const thickness = panel.material?.thickness || Math.min(panel.size.x, panel.size.y, panel.size.z);

    // Check for pre-classified topology from exporter v3.2+
    if (panel.contourTopology && panel.contourTopology.outerContour && panel.contourTopology.outerContour.length > 0) {
        try {
            const topo = panel.contourTopology;

            let outerChain = topo.outerContour;
            const outerArea = calculateChainArea(outerChain);
            if (outerArea < 0) {
                outerChain = reverseChain(outerChain);
            }

            const outerShape = createShapeFromChain(outerChain);
            if (!outerShape) {
                return new THREE.BoxGeometry(panel.size.x, panel.size.y, panel.size.z);
            }

            // Add holes
            if (topo.holes && topo.holes.length > 0) {
                topo.holes.forEach((hole, idx) => {
                    if (hole.elements && hole.elements.length > 0) {
                        let holeChain = hole.elements;
                        const holeArea = calculateChainArea(holeChain);
                        if (holeArea > 0) {
                            holeChain = reverseChain(holeChain);
                        }

                        if (holeChain.length === 1 && holeChain[0].type === 'circle') {
                            const c = holeChain[0];
                            const hPath = new THREE.Path();
                            hPath.absarc(c.center.x, c.center.y, c.radius, 0, Math.PI * 2, false);
                            outerShape.holes.push(hPath);
                        } else {
                            const hShape = createShapeFromChain(holeChain);
                            if (hShape) {
                                const hPath = new THREE.Path();
                                hShape.curves.forEach(c => hPath.curves.push(c));
                                outerShape.holes.push(hPath);
                            }
                        }
                    }
                });
            }

            const extrudeSettings = { depth: thickness, bevelEnabled: false, steps: 1 };
            const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);

            geometry.computeBoundingBox();
            const bb = geometry.boundingBox;
            geometry.translate(
                -(bb.min.x + bb.max.x) / 2,
                -(bb.min.y + bb.max.y) / 2,
                -(bb.min.z + bb.max.z) / 2
            );

            return geometry;

        } catch (e) {
            console.error('Error using contourTopology:', e);
        }
    }

    // Check for complex contour
    const hasComplexContour = panel.contourElements &&
        panel.contourElements.some(el => el.type === 'arc' || el.type === 'circle');

    if (!hasComplexContour) {
        return new THREE.BoxGeometry(panel.size.x, panel.size.y, panel.size.z);
    }

    // Build from contour elements
    try {
        const elements = panel.contourElements;
        const circles = elements.filter(el => el.type === 'circle');
        const nonCircles = elements.filter(el => el.type !== 'circle');

        if (nonCircles.length === 0) {
            return new THREE.BoxGeometry(panel.size.x, panel.size.y, panel.size.z);
        }

        const rawChains = buildAllChains(nonCircles);
        const contours = mergeChainsIntoContours(rawChains);

        if (contours.length === 0) {
            return new THREE.BoxGeometry(panel.size.x, panel.size.y, panel.size.z);
        }

        const contourData = contours.map((chain, i) => {
            const area = calculateChainArea(chain);
            return { id: i, chain: chain, area: area, absArea: Math.abs(area), isClosed: true };
        });

        contourData.sort((a, b) => b.absArea - a.absArea);
        const outerData = contourData[0];
        const holesData = contourData.slice(1);

        let outerChain = outerData.chain;
        if (outerData.area < 0) {
            outerChain = reverseChain(outerChain);
        }
        const outerShape = createShapeFromChain(outerChain);
        if (!outerShape) {
            return new THREE.BoxGeometry(panel.size.x, panel.size.y, panel.size.z);
        }

        // Add holes
        holesData.forEach(h => {
            if (isChainInsideOuter(h.chain, outerChain)) {
                let hChain = h.chain;
                if (h.area > 0) {
                    hChain = reverseChain(hChain);
                }
                const hShape = createShapeFromChain(hChain);
                if (hShape) {
                    const hPath = new THREE.Path();
                    hShape.curves.forEach(c => hPath.curves.push(c));
                    outerShape.holes.push(hPath);
                }
            }
        });

        // Add circular holes
        circles.forEach(c => {
            const hPath = new THREE.Path();
            hPath.absarc(c.center.x, c.center.y, c.radius, 0, Math.PI * 2, false);
            outerShape.holes.push(hPath);
        });

        const extrudeSettings = { depth: thickness, bevelEnabled: false, steps: 1 };
        const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);

        geometry.computeBoundingBox();
        const bb = geometry.boundingBox;
        geometry.translate(
            -(bb.min.x + bb.max.x) / 2,
            -(bb.min.y + bb.max.y) / 2,
            -(bb.min.z + bb.max.z) / 2
        );

        return geometry;

    } catch (e) {
        console.error('Error creating panel geometry:', e);
        return new THREE.BoxGeometry(panel.size.x, panel.size.y, panel.size.z);
    }
}

/**
 * Generate Parallel Transport frames with fixed Up vector
 * This eliminates Frenet frame artifacts by maintaining consistent orientation
 * @param {THREE.CurvePath} path - The extrusion path
 * @param {number} segments - Number of segments
 * @param {THREE.Vector3} upVector - Fixed "up" direction (sweepUpVector from Bazis)
 * @returns {Object} Object with tangents, normals, binormals arrays
 */
function generateFixedFrames(path, segments, upVector) {
    const tangents = [];
    const normals = [];
    const binormals = [];

    for (let i = 0; i <= segments; i++) {
        const u = i / segments;

        // 1. Get tangent (path direction)
        const tangent = new THREE.Vector3();
        path.getTangentAt(u, tangent);
        tangents.push(tangent.clone());

        // 2. Calculate binormal (perpendicular to path-up plane)
        // Cross(Tangent, UpVector) gives "sideways" vector
        const binormal = new THREE.Vector3().crossVectors(tangent, upVector).normalize();

        // Handle edge case: if tangent is parallel to upVector
        if (binormal.lengthSq() < 0.001) {
            // Use fallback perpendicular
            binormal.set(1, 0, 0);
            if (Math.abs(tangent.x) > 0.9) binormal.set(0, 0, 1);
        }
        binormals.push(binormal.clone());

        // 3. Calculate normal (real "up" for this segment)
        // Cross(Binormal, Tangent) ensures orthogonality
        const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();
        normals.push(normal.clone());
    }

    return { tangents, normals, binormals };
}

/**
 * Create bent/curved panel geometry using sweep operation
 * Uses ExtrudeGeometry with custom frames and auto-correction for proper orientation
 * 
 * @param {Object} panel - Panel data with bentContour
 * @returns {THREE.BufferGeometry}
 */
export function createBentPanelGeometry(panel) {
    if (!panel.bent || !panel.bentContour || !panel.bentContour.elements || panel.bentContour.elements.length === 0) {
        console.warn('createBentPanelGeometry: No valid bentContour, falling back to regular geometry');
        return createPanelGeometry(panel);
    }

    const bentElements = panel.bentContour.elements;
    const thickness = panel.material?.thickness || 16;

    console.log(`\n=== BENT PANEL ${panel.id} ===`);
    console.log(`  Thickness: ${thickness}mm`);

    // === DETECT FLIPPED BASIS ===
    const isFlipped = (
        panel.basis &&
        panel.basis.axisY.z === 1 &&
        panel.basis.axisZ.y === -1
    );

    // === GET CORRECT PANEL HEIGHT ===
    let panelHeight;
    if (isFlipped) {
        // Для зеркальных: высота из Z, не из Y
        panelHeight = panel.size?.z || 1200;
        console.log(`  ⚠️ Flipped basis detected`);
        console.log(`  Using size.z=${panelHeight} as height`);
    } else {
        panelHeight = panel.size?.y || 1200;
        console.log(`  Height: ${panelHeight}mm (from size.y)`);
    }

    // Log basis
    if (panel.basis) {
        const b = panel.basis;
        console.log(`  Basis axisX: (${b.axisX.x.toFixed(2)}, ${b.axisX.y.toFixed(2)}, ${b.axisX.z.toFixed(2)})`);
        console.log(`  Basis axisY: (${b.axisY.x.toFixed(2)}, ${b.axisY.y.toFixed(2)}, ${b.axisY.z.toFixed(2)})`);
        console.log(`  Basis axisZ: (${b.axisZ.x.toFixed(2)}, ${b.axisZ.y.toFixed(2)}, ${b.axisZ.z.toFixed(2)})`);
    }

    try {
        // === 1. BUILD PATH (БЕЗ ТРАНСФОРМАЦИИ!) ===
        const curvePath = new THREE.CurvePath();

        for (const element of bentElements) {  // используем ОРИГИНАЛЬНЫЕ bentElements!
            if (element.type === 'line') {
                const start = new THREE.Vector3(element.start.x, 0, element.start.y);
                const end = new THREE.Vector3(element.end.x, 0, element.end.y);
                curvePath.add(new THREE.LineCurve3(start, end));
            } else if (element.type === 'arc') {
                const arcSegments = createArcSegmentsXZ(element);
                for (const segment of arcSegments) {
                    curvePath.add(segment);
                }
            }
        }

        if (curvePath.curves.length === 0) {
            return createPanelGeometry(panel);
        }

        // === 2. GENERATE FRAMES ===
        let upVector = new THREE.Vector3(0, 1, 0);
        if (panel.bentContour.sweepUpVector) {
            upVector.set(
                panel.bentContour.sweepUpVector.x,
                panel.bentContour.sweepUpVector.y,
                panel.bentContour.sweepUpVector.z
            );
        }

        const pathLength = panel.bentContour.totalLength || 1000;
        const steps = Math.max(20, Math.ceil(pathLength / 50));
        const frames = generateFixedFrames(curvePath, steps + 1, upVector);

        // === 3. DETECT PATH DIRECTION ===
        const firstTangent = curvePath.getTangent(0);
        const absX = Math.abs(firstTangent.x);
        const absZ = Math.abs(firstTangent.z);
        const pathIsVertical = absZ > absX;

        console.log(`  First tangent: (${firstTangent.x.toFixed(2)}, ${firstTangent.y.toFixed(2)}, ${firstTangent.z.toFixed(2)})`);
        console.log(`  Path type: ${pathIsVertical ? 'VERTICAL' : 'HORIZONTAL'}`);

        // === 4. CREATE CROSS-SECTION ===
        const halfHeight = panelHeight / 2;
        const shape = new THREE.Shape();

        if (pathIsVertical) {
            shape.moveTo(-halfHeight, 0);
            shape.lineTo(halfHeight, 0);
            shape.lineTo(halfHeight, thickness);    // +thickness
            shape.lineTo(-halfHeight, thickness);
            console.log(`  Shape (VERT): Y=0 → +${thickness}`);
        } else {
            shape.moveTo(0, -halfHeight);
            shape.lineTo(0, halfHeight);
            shape.lineTo(thickness, halfHeight);    // +thickness
            shape.lineTo(thickness, -halfHeight);
            console.log(`  Shape (HORIZ): X=0 → +${thickness}`);
        }

        shape.closePath();

        // === 5. EXTRUDE ===
        const extrudeSettings = {
            steps: steps,
            bevelEnabled: false,
            extrudePath: curvePath,
            frames: frames
        };

        let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // === 6. CENTER GEOMETRY ===
        geometry.computeBoundingBox();
        const bb = geometry.boundingBox;
        const sizeX = bb.max.x - bb.min.x;
        const sizeY = bb.max.y - bb.min.y;
        const sizeZ = bb.max.z - bb.min.z;

        console.log(`  Bbox: X=${sizeX.toFixed(1)} Y=${sizeY.toFixed(1)} Z=${sizeZ.toFixed(1)}`);

        const expectedX = panel.size?.x || 0;
        const expectedY = panel.size?.y || 0;
        const expectedZ = panel.size?.z || 0;
        console.log(`  Expected size: X=${expectedX} Y=${expectedY} Z=${expectedZ}`);

        geometry.translate(
            -(bb.min.x + bb.max.x) / 2,
            -(bb.min.y + bb.max.y) / 2,
            -(bb.min.z + bb.max.z) / 2
        );

        console.log(`  Result: ${geometry.attributes.position.count} vertices\n`);

        return geometry;

    } catch (e) {
        console.error(`  ERROR: ${e.message}`);
        return createPanelGeometry(panel);
    }
}

/**
 * Create LineCurve3 segments from an arc element in XZ plane
 * Maps bentContour 2D (X,Y) to 3D (X, 0, Z) where Y becomes Z
 * Returns array of LineCurve3 for accurate arc representation
 * 
 * @param {Object} arc - Arc element with start, end, center, radius, direction
 * @returns {Array<THREE.LineCurve3>}
 */
function createArcSegmentsXZ(arc) {
    const segments = [];

    if (!arc.center || !arc.radius) {
        console.warn('Invalid arc: missing center or radius');
        return segments;
    }

    const cx = arc.center.x;
    const cy = arc.center.y;  // This becomes Z in 3D
    const r = arc.radius;

    // Calculate start and end angles in the XY source plane
    const startAngle = Math.atan2(arc.start.y - cy, arc.start.x - cx);
    const endAngle = Math.atan2(arc.end.y - cy, arc.end.x - cx);

    // Calculate angle difference based on direction
    let deltaAngle = endAngle - startAngle;
    const ccw = arc.direction > 0; // direction > 0 = counter-clockwise

    if (ccw) {
        if (deltaAngle <= 0) deltaAngle += Math.PI * 2;
    } else {
        if (deltaAngle >= 0) deltaAngle -= Math.PI * 2;
    }

    // Calculate arc length and number of segments (~10mm per segment for smooth curve)
    const arcLength = Math.abs(r * deltaAngle);
    const numSegments = Math.max(12, Math.ceil(arcLength / 10));

    // Generate line segments along the arc
    let prevPoint = new THREE.Vector3(
        cx + r * Math.cos(startAngle),
        0,
        cy + r * Math.sin(startAngle)
    );

    for (let i = 1; i <= numSegments; i++) {
        const t = i / numSegments;
        const angle = startAngle + deltaAngle * t;
        const x = cx + r * Math.cos(angle);
        const z = cy + r * Math.sin(angle);  // Y in 2D becomes Z in 3D
        const currentPoint = new THREE.Vector3(x, 0, z);

        segments.push(new THREE.LineCurve3(prevPoint.clone(), currentPoint.clone()));
        prevPoint = currentPoint;
    }

    return segments;
}

/**
 * Discretize arc for CSG operations
 * @param {Object} arc - Arc data
 * @returns {Array}
 */
export function discretizeArcForCSG(arc) {
    const segments = [];
    if (!arc.center || !arc.radius) return segments;

    const cx = arc.center.x;
    const cy = arc.center.y;
    const r = arc.radius;

    const startAngle = Math.atan2(arc.start.y - cy, arc.start.x - cx);
    const endAngle = Math.atan2(arc.end.y - cy, arc.end.x - cx);

    let delta = endAngle - startAngle;
    const ccw = arc.direction > 0;

    if (ccw) {
        if (delta <= 0) delta += Math.PI * 2;
    } else {
        if (delta >= 0) delta -= Math.PI * 2;
    }

    const arcLength = Math.abs(delta * r);
    const numSegments = Math.max(4, Math.ceil(arcLength / 5));

    let prevX = arc.start.x;
    let prevY = arc.start.y;

    for (let i = 1; i <= numSegments; i++) {
        const t = i / numSegments;
        const angle = startAngle + delta * t;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        segments.push({
            start: { x: prevX, y: prevY },
            end: { x: x, y: y }
        });

        prevX = x;
        prevY = y;
    }

    return segments;
}

/**
 * Discretize circle for CSG operations
 * @param {Object} circle - Circle data
 * @returns {Array}
 */
export function discretizeCircleForCSG(circle) {
    const segments = [];
    if (!circle.center || !circle.radius) return segments;

    const cx = circle.center.x;
    const cy = circle.center.y;
    const r = circle.radius;

    const circumference = Math.PI * 2 * r;
    const numSegments = Math.max(12, Math.ceil(circumference / 5));

    let prevX = cx + r;
    let prevY = cy;

    for (let i = 1; i <= numSegments; i++) {
        const angle = (Math.PI * 2 * i) / numSegments;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);

        segments.push({
            start: { x: prevX, y: prevY },
            end: { x: x, y: y }
        });

        prevX = x;
        prevY = y;
    }

    return segments;
}

/**
 * Create THREE.Shape from contour elements array
 * Suitable for extrusion profiles (e.g., GOLA profiles)
 * @param {Array} contourElements - Array of contour elements with type, start, end, center, radius, direction
 * @returns {THREE.Shape|null}
 */
export function createShapeFromContourElements(contourElements) {
    if (!contourElements || contourElements.length === 0) {
        console.warn('createShapeFromContourElements: Empty contour');
        return null;
    }

    // DEBUG: Log contour data
    console.log('=== CONTOUR DEBUG ===');
    console.log(`Total elements: ${contourElements.length}`);
    contourElements.forEach((el, i) => {
        if (el.type === 'line') {
            console.log(`  [${i}] LINE: (${el.start?.x?.toFixed(2)}, ${el.start?.y?.toFixed(2)}) → (${el.end?.x?.toFixed(2)}, ${el.end?.y?.toFixed(2)})`);
        } else if (el.type === 'arc') {
            console.log(`  [${i}] ARC: (${el.start?.x?.toFixed(2)}, ${el.start?.y?.toFixed(2)}) → (${el.end?.x?.toFixed(2)}, ${el.end?.y?.toFixed(2)}) center=(${el.center?.x?.toFixed(2)}, ${el.center?.y?.toFixed(2)}) r=${el.radius} dir=${el.direction}`);
        } else if (el.type === 'circle') {
            console.log(`  [${i}] CIRCLE: center=(${el.center?.x?.toFixed(2)}, ${el.center?.y?.toFixed(2)}) r=${el.radius}`);
        }
    });

    const shape = new THREE.Shape();
    const GAP_TOLERANCE = 0.5; // mm - auto-bridge gaps smaller than this

    // Start with first point
    const firstElement = contourElements[0];
    if (firstElement.type === 'circle') {
        // Full circle - create directly
        shape.absarc(
            firstElement.center.x,
            firstElement.center.y,
            firstElement.radius,
            0,
            Math.PI * 2,
            false
        );
        return shape;
    }

    // Move to start point
    const startPoint = firstElement.start || { x: 0, y: 0 };
    shape.moveTo(startPoint.x, startPoint.y);
    let currentPoint = { x: startPoint.x, y: startPoint.y };
    console.log(`Starting at: (${startPoint.x?.toFixed(2)}, ${startPoint.y?.toFixed(2)})`);

    // Process each element
    contourElements.forEach((element, index) => {
        // Check for gap and auto-bridge if needed
        if (element.start) {
            const gap = Math.sqrt(
                Math.pow(element.start.x - currentPoint.x, 2) +
                Math.pow(element.start.y - currentPoint.y, 2)
            );
            if (gap > GAP_TOLERANCE) {
                console.warn(`Contour gap detected: ${gap.toFixed(2)}mm at element ${index}, auto-bridging`);
                shape.lineTo(element.start.x, element.start.y);
                currentPoint = { x: element.start.x, y: element.start.y };
            }
        }

        if (element.type === 'line') {
            shape.lineTo(element.end.x, element.end.y);
            currentPoint = { x: element.end.x, y: element.end.y };
        }
        else if (element.type === 'arc') {
            // Calculate angles from center to start/end points
            const startAngle = Math.atan2(
                element.start.y - element.center.y,
                element.start.x - element.center.x
            );
            const endAngle = Math.atan2(
                element.end.y - element.center.y,
                element.end.x - element.center.x
            );

            // Three.js absarc parameter is aClockwise: true = clockwise, false = counter-clockwise
            // Bazis export: direction > 0 = CCW, direction < 0 = CW
            // So: direction < 0 (CW in Bazis) → aClockwise = true
            //     direction > 0 (CCW in Bazis) → aClockwise = false
            const aClockwise = element.direction < 0;

            shape.absarc(
                element.center.x,
                element.center.y,
                element.radius,
                startAngle,
                endAngle,
                aClockwise
            );
            currentPoint = { x: element.end.x, y: element.end.y };
        }
        else if (element.type === 'circle') {
            // Standalone circle (e.g., hole) - should be handled separately
            shape.absarc(
                element.center.x,
                element.center.y,
                element.radius,
                0,
                Math.PI * 2,
                false
            );
            // Circle doesn't change currentPoint as it's self-contained
        }
    });

    return shape;
}

/**
 * Create mesh from extrusion profile data (e.g., TExtrusionBody from Bazis)
 * Uses chain-building logic to handle disconnected contour elements
 * @param {Object} profileData - Profile data containing contour, thickness, and basis
 * @param {Object} options - Optional settings (color, shininess)
 * @returns {THREE.Mesh|null}
 */
export function createExtrusionProfileMesh(profileData, options = {}) {
    if (!profileData || !profileData.contour || profileData.contour.length === 0) {
        console.warn('createExtrusionProfileMesh: No contour data provided');
        return null;
    }

    // Log profile creation per spec (NFR-4)
    console.log(`Profile: ${profileData.name || 'unnamed'} (${profileData.id}) - ${profileData.contour.length} elements, thickness ${profileData.thickness}mm`);

    let outerShape = null;

    // PREFERRED: Use contourTopology from exporter if available (v3.5+)
    if (profileData.contourTopology && profileData.contourTopology.outerContour) {
        console.log('Using contourTopology from exporter');
        const topology = profileData.contourTopology;

        // Use contour elements at original local coordinates (no centering)
        // globalOrigin/globalMatrix positions the local origin correctly in world space
        outerShape = createShapeFromChain(topology.outerContour);
        if (!outerShape) {
            console.warn('createExtrusionProfileMesh: Failed to create outer shape from topology');
            return null;
        }

        // Add holes from topology (at original coordinates, no centering)
        if (topology.holes && topology.holes.length > 0) {
            topology.holes.forEach((hole, i) => {
                const holeElements = hole.elements || hole;
                const holeShape = createShapeFromChain(holeElements);
                if (holeShape) {
                    const holePath = new THREE.Path();
                    holeShape.curves.forEach(c => holePath.curves.push(c));
                    outerShape.holes.push(holePath);
                    console.log(`  Added hole ${i + 1} with ${holeElements.length} elements`);
                }
            });
        }
    } else {
        // FALLBACK: Build chains from flat contour data (legacy)
        console.log('Building chains from flat contour (legacy mode)');

        // Separate circles from other elements
        const circles = profileData.contour.filter(el => el.type === 'circle');
        const nonCircles = profileData.contour.filter(el => el.type !== 'circle');

        if (nonCircles.length === 0 && circles.length === 0) {
            console.warn('createExtrusionProfileMesh: No valid contour elements');
            return null;
        }

        if (nonCircles.length > 0) {
            // Build chains from disconnected elements
            const chains = buildAllChains(nonCircles);
            console.log(`Profile chains: ${chains.length} chain(s) built from ${nonCircles.length} elements`);

            if (chains.length === 0) {
                console.warn('createExtrusionProfileMesh: No chains could be built');
                return null;
            }

            // Merge chains and identify outer vs holes
            const contours = mergeChainsIntoContours(chains);
            console.log(`Profile contours: ${contours.length} contour(s) after merging`);

            // Calculate areas and find outer contour (largest absolute area)
            const contourData = contours.map((chain, i) => {
                const area = calculateChainArea(chain);
                return { id: i, chain: chain, area: area, absArea: Math.abs(area) };
            });

            contourData.sort((a, b) => b.absArea - a.absArea);
            const outerData = contourData[0];
            const holesData = contourData.slice(1);

            // Ensure outer contour is CCW (positive area)
            let outerChain = outerData.chain;
            if (outerData.area < 0) {
                outerChain = reverseChain(outerChain);
            }

            outerShape = createShapeFromChain(outerChain);
            if (!outerShape) {
                console.warn('createExtrusionProfileMesh: Failed to create outer shape');
                return null;
            }

            // Add holes (must be CW - negative area)
            holesData.forEach(h => {
                if (isChainInsideOuter(h.chain, outerChain)) {
                    let holeChain = h.chain;
                    if (h.area > 0) {
                        holeChain = reverseChain(holeChain);
                    }
                    const holeShape = createShapeFromChain(holeChain);
                    if (holeShape) {
                        const holePath = new THREE.Path();
                        holeShape.curves.forEach(c => holePath.curves.push(c));
                        outerShape.holes.push(holePath);
                    }
                }
            });
        } else if (circles.length > 0) {
            // Only circles - use first as outer
            const c = circles[0];
            outerShape = new THREE.Shape();
            outerShape.absarc(c.center.x, c.center.y, c.radius, 0, Math.PI * 2, false);
            circles.slice(1).forEach(hole => {
                const holePath = new THREE.Path();
                holePath.absarc(hole.center.x, hole.center.y, hole.radius, 0, Math.PI * 2, true);
                outerShape.holes.push(holePath);
            });
        }
    }

    if (!outerShape) {
        console.warn('createExtrusionProfileMesh: Could not create shape');
        return null;
    }

    // Extrusion settings per spec (FR-2)
    const depth = profileData.thickness || profileData.depth || 1;
    const extrudeSettings = {
        steps: 1,
        depth: depth,
        bevelEnabled: false,
        curveSegments: 12  // Smooth arcs per spec
    };

    // Create geometry
    const geometry = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);

    // Do NOT center geometry in X/Y - keep contour at local coordinates
    // The exporter provides globalOrigin which is the profile's local origin in world space
    // Only center along Z (depth/extrusion direction) so profile is centered on its position
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    geometry.translate(
        0, // Keep X position
        0, // Keep Y position
        -(bb.min.z + bb.max.z) / 2 // Center only along extrusion depth
    );

    // Create material per spec (FR-3): gray metallic with Phong shading
    const material = new THREE.MeshPhongMaterial({
        color: options.color || 0x888888,
        flatShading: false,
        shininess: options.shininess || 30,
        specular: 0x444444,
        side: THREE.DoubleSide
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);

    // Store profile data in userData
    mesh.userData = {
        type: 'extrusionProfile',
        data: profileData,
        originalMaterial: material.clone()
    };

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

export default {
    convertContourToElements,
    isChainClosed,
    calculateChainArea,
    calculateChainPerimeter,
    calculateChainBBox,
    reverseChain,
    buildAllChains,
    isPointInPolygon,
    isPointInsideChain,
    isChainInsideOuter,
    mergeChainsIntoContours,
    createShapeFromChain,
    createPanelGeometry,
    createBentPanelGeometry,  // NEW: For curved/bent panels
    discretizeArcForCSG,
    discretizeCircleForCSG,
    createShapeFromContourElements,
    createExtrusionProfileMesh
};

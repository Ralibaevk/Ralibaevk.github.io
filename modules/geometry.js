/**
 * Geometry Helpers Module
 * Helper functions for contour analysis and edge detection
 */

/**
 * Determine which side of rectangle an edge/element belongs to
 * @param {Object} start - Start point {x, y}
 * @param {Object} end - End point {x, y}
 * @param {Object} bounds - Bounding box {minX, maxX, minY, maxY}
 * @returns {string} - 'top', 'bottom', 'left', 'right', or 'unknown'
 */
export function detectSide(start, end, bounds) {
    const tolerance = 5;
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const isHorizontal = dx > dy;

    if (isHorizontal) {
        const y = (start.y + end.y) / 2;
        if (Math.abs(y - bounds.minY) < tolerance) return 'bottom';
        if (Math.abs(y - bounds.maxY) < tolerance) return 'top';
    } else {
        const x = (start.x + end.x) / 2;
        if (Math.abs(x - bounds.minX) < tolerance) return 'left';
        if (Math.abs(x - bounds.maxX) < tolerance) return 'right';
    }
    return 'unknown';
}

/**
 * Calculate bounding box from contour elements
 * @param {Array} contourElements - Array of contour elements
 * @returns {Object} - {minX, maxX, minY, maxY}
 */
export function getContourBounds(contourElements) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    contourElements.forEach(elem => {
        if (elem.start) {
            minX = Math.min(minX, elem.start.x, elem.end.x);
            maxX = Math.max(maxX, elem.start.x, elem.end.x);
            minY = Math.min(minY, elem.start.y, elem.end.y);
            maxY = Math.max(maxY, elem.start.y, elem.end.y);
        }
    });

    return { minX, maxX, minY, maxY };
}

/**
 * Find which contour segment index matches the given edge
 * @param {Array} contourElements - Contour elements
 * @param {Object} edge - Edge data
 * @param {Object} edgeBounds - Edge bounding box
 * @returns {number} - Segment index or -1 if not found
 */
export function findContourSegmentIndex(contourElements, edge, edgeBounds) {
    // DIRECT MATCH: If exporter provides contourIndex, use it
    if (typeof edge.contourIndex === 'number' && edge.contourIndex >= 0) {
        if (edge.contourIndex < contourElements.length) {
            return edge.contourIndex;
        }
    }

    const contourBounds = getContourBounds(contourElements);
    const tolerance = 5;
    const boundaryThreshold = 10;

    // If edge has 'side' property from exporter, use it directly
    if (edge.side && edge.side !== 'unknown') {
        const edgeLen = edge.edgeLength || Math.sqrt(
            Math.pow(edge.end.x - edge.start.x, 2) +
            Math.pow(edge.end.y - edge.start.y, 2)
        );

        let bestMatch = -1;
        let bestLenDiff = Infinity;

        for (let i = 0; i < contourElements.length; i++) {
            const elem = contourElements[i];
            if (elem.type !== 'line' || !elem.start) continue;

            const elemMidX = (elem.start.x + elem.end.x) / 2;
            const elemMidY = (elem.start.y + elem.end.y) / 2;
            const elemDx = Math.abs(elem.end.x - elem.start.x);
            const elemDy = Math.abs(elem.end.y - elem.start.y);
            const elemIsHorizontal = elemDx > elemDy;
            const elemLen = Math.sqrt(elemDx * elemDx + elemDy * elemDy);

            let elemSide = null;
            if (elemIsHorizontal) {
                if (Math.abs(elemMidY - contourBounds.minY) < boundaryThreshold) elemSide = 'bottom';
                else if (Math.abs(elemMidY - contourBounds.maxY) < boundaryThreshold) elemSide = 'top';
            } else {
                if (Math.abs(elemMidX - contourBounds.minX) < boundaryThreshold) elemSide = 'left';
                else if (Math.abs(elemMidX - contourBounds.maxX) < boundaryThreshold) elemSide = 'right';
            }

            if (elemSide === edge.side) {
                const lenDiff = Math.abs(edgeLen - elemLen);
                if (lenDiff < bestLenDiff) {
                    bestLenDiff = lenDiff;
                    bestMatch = i;
                }
            }
        }

        if (bestMatch >= 0) return bestMatch;
    }

    // FALLBACK: original length + boundary matching
    const edgeDx = Math.abs(edge.end.x - edge.start.x);
    const edgeDy = Math.abs(edge.end.y - edge.start.y);
    const edgeIsHorizontal = edgeDx > edgeDy;
    const edgeLen = edge.edgeLength || Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
    const edgeMidX = (edge.start.x + edge.end.x) / 2;
    const edgeMidY = (edge.start.y + edge.end.y) / 2;
    const edgeWidth = (edgeBounds.maxX - edgeBounds.minX) || 1;
    const edgeHeight = (edgeBounds.maxY - edgeBounds.minY) || 1;

    const edgeRelPos = edgeIsHorizontal
        ? (edgeMidY - edgeBounds.minY) / edgeHeight
        : (edgeMidX - edgeBounds.minX) / edgeWidth;

    const edgeAtMin = edgeRelPos < 0.3;
    const edgeAtMax = edgeRelPos > 0.7;

    const contourWidth = (contourBounds.maxX - contourBounds.minX) || 1;
    const contourHeight = (contourBounds.maxY - contourBounds.minY) || 1;

    const candidates = [];
    for (let i = 0; i < contourElements.length; i++) {
        const elem = contourElements[i];
        if (elem.type !== 'line' || !elem.start) continue;

        const elemDx = Math.abs(elem.end.x - elem.start.x);
        const elemDy = Math.abs(elem.end.y - elem.start.y);
        const elemIsHorizontal = elemDx > elemDy;
        if (edgeIsHorizontal !== elemIsHorizontal) continue;

        const elemLen = Math.sqrt(elemDx * elemDx + elemDy * elemDy);
        const lenDiff = Math.abs(edgeLen - elemLen);
        if (lenDiff > tolerance) continue;

        const elemMidX = (elem.start.x + elem.end.x) / 2;
        const elemMidY = (elem.start.y + elem.end.y) / 2;

        let isAtBoundary = false;
        if (elemIsHorizontal) {
            const atMinY = Math.abs(elemMidY - contourBounds.minY) < boundaryThreshold;
            const atMaxY = Math.abs(elemMidY - contourBounds.maxY) < boundaryThreshold;
            isAtBoundary = atMinY || atMaxY;
        } else {
            const atMinX = Math.abs(elemMidX - contourBounds.minX) < boundaryThreshold;
            const atMaxX = Math.abs(elemMidX - contourBounds.maxX) < boundaryThreshold;
            isAtBoundary = atMinX || atMaxX;
        }

        if (!isAtBoundary) continue;

        const elemRelPos = elemIsHorizontal
            ? (elemMidY - contourBounds.minY) / contourHeight
            : (elemMidX - contourBounds.minX) / contourWidth;

        const posDiff = Math.abs(edgeRelPos - elemRelPos);
        candidates.push({ index: i, lenDiff, posDiff, elemRelPos });
    }

    if (candidates.length === 0) return -1;

    candidates.sort((a, b) => {
        const aMatchesPos = (edgeAtMin && a.elemRelPos < 0.3) || (edgeAtMax && a.elemRelPos > 0.7);
        const bMatchesPos = (edgeAtMin && b.elemRelPos < 0.3) || (edgeAtMax && b.elemRelPos > 0.7);
        if (aMatchesPos !== bMatchesPos) return bMatchesPos - aMatchesPos;
        return a.lenDiff - b.lenDiff || a.posDiff - b.posDiff;
    });

    return candidates[0].index;
}

/**
 * Assign selective material groups to ExtrudeGeometry for edge banding
 * @param {THREE.BufferGeometry} geometry - The ExtrudeGeometry
 * @param {Array} contourElements - Contour elements
 * @param {Array} edges - Panel edges with banding
 */
export function assignSelectiveEdgeGroups(geometry, contourElements, edges) {
    const groups = geometry.groups;
    if (!groups || groups.length < 2) return;

    const numContourElements = contourElements.length;
    const edgeSegmentIndices = new Set();

    // For 4-sided rectangular panels, use direct elemIndex mapping
    if (numContourElements === 4) {
        const bazisToContour = { 0: 3, 1: 2, 2: 1, 3: 0 };
        edges.forEach(edge => {
            if (typeof edge.elemIndex === 'number' && edge.elemIndex >= 0 && edge.elemIndex < 4) {
                const contourIdx = bazisToContour[edge.elemIndex];
                edgeSegmentIndices.add(contourIdx);
            }
        });
    } else {
        // Complex panels: use side-based matching
        const contourBounds = getContourBounds(contourElements);
        const boundaryThreshold = 15;

        const bandedSides = new Set();
        edges.forEach(edge => {
            if (edge.side && edge.side !== 'unknown') {
                bandedSides.add(edge.side);
            }
        });

        for (let i = 0; i < contourElements.length; i++) {
            const elem = contourElements[i];
            if (elem.type !== 'line' || !elem.start) continue;

            const elemMidX = (elem.start.x + elem.end.x) / 2;
            const elemMidY = (elem.start.y + elem.end.y) / 2;
            const elemDx = Math.abs(elem.end.x - elem.start.x);
            const elemDy = Math.abs(elem.end.y - elem.start.y);
            const elemIsHorizontal = elemDx > elemDy;

            let elemSide = null;
            if (elemIsHorizontal) {
                if (Math.abs(elemMidY - contourBounds.minY) < boundaryThreshold) elemSide = 'bottom';
                else if (Math.abs(elemMidY - contourBounds.maxY) < boundaryThreshold) elemSide = 'top';
            } else {
                if (Math.abs(elemMidX - contourBounds.minX) < boundaryThreshold) elemSide = 'left';
                else if (Math.abs(elemMidX - contourBounds.maxX) < boundaryThreshold) elemSide = 'right';
            }

            if (elemSide && bandedSides.has(elemSide)) {
                edgeSegmentIndices.add(i);
            }
        }
    }

    const capsGroup = groups[0];
    const sidesGroup = groups[1];

    const indicesPerSegment = 6;
    const totalSideIndices = numContourElements * indicesPerSegment;

    if (Math.abs(sidesGroup.count - totalSideIndices) > indicesPerSegment) {
        if (edgeSegmentIndices.size > 0) {
            return;
        }
        return;
    }

    geometry.clearGroups();
    geometry.addGroup(capsGroup.start, capsGroup.count, 0);

    let currentStart = sidesGroup.start;
    for (let segIdx = 0; segIdx < numContourElements; segIdx++) {
        const materialIndex = edgeSegmentIndices.has(segIdx) ? 2 : 1;
        geometry.addGroup(currentStart, indicesPerSegment, materialIndex);
        currentStart += indicesPerSegment;
    }
}

export default {
    detectSide,
    getContourBounds,
    findContourSegmentIndex,
    assignSelectiveEdgeGroups
};

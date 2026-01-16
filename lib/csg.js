/**
 * CSG.js - Constructive Solid Geometry (CSG) Library
 * Copyright (c) 2011 Evan Wallace (http://madebyevan.com/), under the MIT license.
 * 
 * Extended with THREE.js adapter for mesh operations.
 */

// Main CSG class
function CSG() {
    this.polygons = [];
}

CSG.fromPolygons = function (p) {
    var c = new CSG();
    c.polygons = p;
    return c;
};

CSG.prototype = {
    clone: function () {
        var c = new CSG();
        c.polygons = this.polygons.map(function (p) { return p.clone(); });
        return c;
    },
    toPolygons: function () {
        return this.polygons;
    },
    union: function (csg) {
        var a = new CSG.Node(this.clone().polygons);
        var b = new CSG.Node(csg.clone().polygons);
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        return CSG.fromPolygons(a.allPolygons());
    },
    subtract: function (csg) {
        var a = new CSG.Node(this.clone().polygons);
        var b = new CSG.Node(csg.clone().polygons);
        a.invert();
        a.clipTo(b);
        b.clipTo(a);
        b.invert();
        b.clipTo(a);
        b.invert();
        a.build(b.allPolygons());
        a.invert();
        return CSG.fromPolygons(a.allPolygons());
    },
    intersect: function (csg) {
        var a = new CSG.Node(this.clone().polygons);
        var b = new CSG.Node(csg.clone().polygons);
        a.invert();
        b.clipTo(a);
        b.invert();
        a.clipTo(b);
        b.clipTo(a);
        a.build(b.allPolygons());
        a.invert();
        return CSG.fromPolygons(a.allPolygons());
    },
    inverse: function () {
        var c = this.clone();
        c.polygons.map(function (p) { p.flip(); });
        return c;
    }
};

// Vector class
CSG.Vector = function (x, y, z) {
    if (arguments.length == 3) {
        this.x = x;
        this.y = y;
        this.z = z;
    } else if ('x' in x) {
        this.x = x.x;
        this.y = x.y;
        this.z = x.z;
    } else {
        this.x = x[0];
        this.y = x[1];
        this.z = x[2];
    }
};

CSG.Vector.prototype = {
    clone: function () { return new CSG.Vector(this.x, this.y, this.z); },
    negated: function () { return new CSG.Vector(-this.x, -this.y, -this.z); },
    plus: function (a) { return new CSG.Vector(this.x + a.x, this.y + a.y, this.z + a.z); },
    minus: function (a) { return new CSG.Vector(this.x - a.x, this.y - a.y, this.z - a.z); },
    times: function (a) { return new CSG.Vector(this.x * a, this.y * a, this.z * a); },
    dividedBy: function (a) { return new CSG.Vector(this.x / a, this.y / a, this.z / a); },
    dot: function (a) { return this.x * a.x + this.y * a.y + this.z * a.z; },
    lerp: function (a, t) { return this.plus(a.minus(this).times(t)); },
    length: function () { return Math.sqrt(this.dot(this)); },
    unit: function () { return this.dividedBy(this.length()); },
    cross: function (a) {
        return new CSG.Vector(
            this.y * a.z - this.z * a.y,
            this.z * a.x - this.x * a.z,
            this.x * a.y - this.y * a.x
        );
    }
};

// Vertex class
CSG.Vertex = function (pos, normal) {
    this.pos = new CSG.Vector(pos);
    this.normal = new CSG.Vector(normal);
};

CSG.Vertex.prototype = {
    clone: function () { return new CSG.Vertex(this.pos.clone(), this.normal.clone()); },
    flip: function () { this.normal = this.normal.negated(); },
    interpolate: function (other, t) {
        return new CSG.Vertex(
            this.pos.lerp(other.pos, t),
            this.normal.lerp(other.normal, t)
        );
    }
};

// Plane class
CSG.Plane = function (normal, w) {
    this.normal = normal;
    this.w = w;
};

CSG.Plane.EPSILON = 1e-5;

CSG.Plane.fromPoints = function (a, b, c) {
    var n = b.minus(a).cross(c.minus(a)).unit();
    return new CSG.Plane(n, n.dot(a));
};

CSG.Plane.prototype = {
    clone: function () { return new CSG.Plane(this.normal.clone(), this.w); },
    flip: function () { this.normal = this.normal.negated(); this.w = -this.w; },
    splitPolygon: function (polygon, coplanarFront, coplanarBack, front, back) {
        var COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;
        var polygonType = 0, types = [];

        for (var i = 0; i < polygon.vertices.length; i++) {
            var t = this.normal.dot(polygon.vertices[i].pos) - this.w;
            var type = (t < -CSG.Plane.EPSILON) ? BACK : (t > CSG.Plane.EPSILON) ? FRONT : COPLANAR;
            polygonType |= type;
            types.push(type);
        }

        switch (polygonType) {
            case COPLANAR:
                (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
                break;
            case FRONT:
                front.push(polygon);
                break;
            case BACK:
                back.push(polygon);
                break;
            case SPANNING:
                var f = [], b = [];
                for (var i = 0; i < polygon.vertices.length; i++) {
                    var j = (i + 1) % polygon.vertices.length;
                    var ti = types[i], tj = types[j];
                    var vi = polygon.vertices[i], vj = polygon.vertices[j];
                    if (ti != BACK) f.push(vi);
                    if (ti != FRONT) b.push(ti != BACK ? vi.clone() : vi);
                    if ((ti | tj) == SPANNING) {
                        var t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.minus(vi.pos));
                        var v = vi.interpolate(vj, t);
                        f.push(v);
                        b.push(v.clone());
                    }
                }
                if (f.length >= 3) front.push(new CSG.Polygon(f, polygon.shared));
                if (b.length >= 3) back.push(new CSG.Polygon(b, polygon.shared));
                break;
        }
    }
};

// Polygon class
CSG.Polygon = function (vertices, shared) {
    this.vertices = vertices;
    this.shared = shared;
    this.plane = CSG.Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
};

CSG.Polygon.prototype = {
    clone: function () {
        return new CSG.Polygon(
            this.vertices.map(function (v) { return v.clone(); }),
            this.shared
        );
    },
    flip: function () {
        this.vertices.reverse().map(function (v) { v.flip(); });
        this.plane.flip();
    }
};

// Node class (BSP Tree)
CSG.Node = function (polygons) {
    this.plane = null;
    this.front = null;
    this.back = null;
    this.polygons = [];
    if (polygons) this.build(polygons);
};

CSG.Node.prototype = {
    clone: function () {
        var n = new CSG.Node();
        n.plane = this.plane && this.plane.clone();
        n.front = this.front && this.front.clone();
        n.back = this.back && this.back.clone();
        n.polygons = this.polygons.map(function (p) { return p.clone(); });
        return n;
    },
    invert: function () {
        for (var i = 0; i < this.polygons.length; i++) this.polygons[i].flip();
        this.plane.flip();
        if (this.front) this.front.invert();
        if (this.back) this.back.invert();
        var t = this.front;
        this.front = this.back;
        this.back = t;
    },
    clipPolygons: function (polygons) {
        if (!this.plane) return polygons.slice();
        var front = [], back = [];
        for (var i = 0; i < polygons.length; i++) {
            this.plane.splitPolygon(polygons[i], front, back, front, back);
        }
        if (this.front) front = this.front.clipPolygons(front);
        if (this.back) back = this.back.clipPolygons(back);
        else back = [];
        return front.concat(back);
    },
    clipTo: function (bsp) {
        this.polygons = bsp.clipPolygons(this.polygons);
        if (this.front) this.front.clipTo(bsp);
        if (this.back) this.back.clipTo(bsp);
    },
    allPolygons: function () {
        var p = this.polygons.slice();
        if (this.front) p = p.concat(this.front.allPolygons());
        if (this.back) p = p.concat(this.back.allPolygons());
        return p;
    },
    build: function (polygons) {
        if (!polygons.length) return;
        if (!this.plane) this.plane = polygons[0].plane.clone();
        var front = [], back = [];
        for (var i = 0; i < polygons.length; i++) {
            this.plane.splitPolygon(polygons[i], this.polygons, this.polygons, front, back);
        }
        if (front.length) {
            if (!this.front) this.front = new CSG.Node();
            this.front.build(front);
        }
        if (back.length) {
            if (!this.back) this.back = new CSG.Node();
            this.back.build(back);
        }
    }
};

// THREE.js adapter - requires THREE to be loaded
CSG.fromMesh = function (mesh) {
    mesh.updateMatrix();
    var geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    var pos = geo.attributes.position.array;
    var norm = geo.attributes.normal ? geo.attributes.normal.array : null;
    var polys = [];

    for (var i = 0; i < pos.length; i += 9) {
        var verts = [];
        for (var j = 0; j < 3; j++) {
            var idx = i + j * 3;
            var v = new THREE.Vector3(pos[idx], pos[idx + 1], pos[idx + 2]).applyMatrix4(mesh.matrix);
            var n = norm
                ? new THREE.Vector3(norm[idx], norm[idx + 1], norm[idx + 2]).transformDirection(mesh.matrix)
                : new THREE.Vector3(0, 0, 1);
            verts.push(new CSG.Vertex(v, n));
        }
        polys.push(new CSG.Polygon(verts));
    }
    return CSG.fromPolygons(polys);
};

// Version without matrix - for working in local coordinates
CSG.fromGeometry = function (geo) {
    var geometry = geo.index ? geo.toNonIndexed() : geo.clone();
    var pos = geometry.attributes.position.array;
    var norm = geometry.attributes.normal ? geometry.attributes.normal.array : null;
    var polys = [];

    for (var i = 0; i < pos.length; i += 9) {
        var verts = [];
        for (var j = 0; j < 3; j++) {
            var idx = i + j * 3;
            var v = { x: pos[idx], y: pos[idx + 1], z: pos[idx + 2] };
            var n = norm
                ? { x: norm[idx], y: norm[idx + 1], z: norm[idx + 2] }
                : { x: 0, y: 0, z: 1 };
            verts.push(new CSG.Vertex(v, n));
        }
        polys.push(new CSG.Polygon(verts));
    }
    return CSG.fromPolygons(polys);
};

CSG.toGeometry = function (csg) {
    var polys = csg.toPolygons();
    var geo = new THREE.BufferGeometry();
    var positions = [], normals = [];

    polys.forEach(function (p) {
        var vs = p.vertices;
        for (var i = 2; i < vs.length; i++) {
            [vs[0], vs[i - 1], vs[i]].forEach(function (v) {
                positions.push(v.pos.x, v.pos.y, v.pos.z);
                normals.push(v.normal.x, v.normal.y, v.normal.z);
            });
        }
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geo;
};

CSG.toMesh = function (csg, matrix, material) {
    var geo = CSG.toGeometry(csg);
    var m = new THREE.Mesh(geo, material);
    m.matrix.copy(matrix);
    m.matrix.decompose(m.position, m.quaternion, m.scale);
    return m;
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSG;
}

// Make globally available for non-module usage
if (typeof window !== 'undefined') {
    window.CSG = CSG;
}

export default CSG;

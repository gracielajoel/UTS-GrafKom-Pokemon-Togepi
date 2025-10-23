function mainTogetic(offsetX = 0) {
    var CANVAS = document.getElementById("togetic");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    var GL = CANVAS.getContext("webgl", { antialias: true });
    if (!GL) {
        alert("WebGL not supported");
        return;
    }

    /*========================= SHADERS =========================*/
    var vs_source = `
        attribute vec3 position;
        attribute vec3 color;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        varying vec3 vColor;
        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);
            vColor = color;
        }`;
    var fs_source = `
        precision mediump float;
        varying vec3 vColor;
        void main(void) {
            gl_FragColor = vec4(vColor, 1.0);
        }`;

    function compile(src, type) {
        var sh = GL.createShader(type);
        GL.shaderSource(sh, src);
        GL.compileShader(sh);
        if (!GL.getShaderParameter(sh, GL.COMPILE_STATUS))
            console.error(GL.getShaderInfoLog(sh));
        return sh;
    }

    var vs = compile(vs_source, GL.VERTEX_SHADER);
    var fs = compile(fs_source, GL.FRAGMENT_SHADER);
    var prog = GL.createProgram();
    GL.attachShader(prog, vs);
    GL.attachShader(prog, fs);
    GL.linkProgram(prog);
    GL.useProgram(prog);

    var _pos = GL.getAttribLocation(prog, "position");
    var _col = GL.getAttribLocation(prog, "color");
    var _Pm = GL.getUniformLocation(prog, "Pmatrix");
    var _Vm = GL.getUniformLocation(prog, "Vmatrix");
    var _Mm = GL.getUniformLocation(prog, "Mmatrix");
    GL.enableVertexAttribArray(_pos);
    GL.enableVertexAttribArray(_col);

  /*========================= GEOMETRY (BODY with Bézier, condong ke belakang + SHADING) =========================*/
var latitudeBands = 40, longitudeBands = 40;

// titik kontrol kurva radius
var bodyCurve = [
    {y: -1, r: 0.5},   // dasar badan
    {y: -5, r: 1.58}, // pelebaran perut bawah
    {y: 0.2,  r: 0.38}, // mengecil ke arah leher
    {y: 1.4,  r: 0.1}   // leher atas
];

function bezier(t, p0, p1, p2, p3) {
    return Math.pow(1 - t, 3) * p0 +
           3 * Math.pow(1 - t, 2) * t * p1 +
           3 * (1 - t) * Math.pow(t, 2) * p2 +
           Math.pow(t, 3) * p3;
}

var vertices = [];
var indices = [];

for (var lat = 0; lat <= latitudeBands; lat++) {
    var t = lat / latitudeBands;
    var y = bezier(t, bodyCurve[0].y, bodyCurve[0].y, bodyCurve[2].y, bodyCurve[3].y);
    var radius = bezier(t, bodyCurve[0].r, bodyCurve[1].r, bodyCurve[3].r, bodyCurve[3].r);
    var backwardTilt = (1 - t) * 0.25;

    for (var lon = 0; lon <= longitudeBands; lon++) {
        var phi = lon * 2 * Math.PI / longitudeBands;
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);
        var x = radius * cosPhi;
        var z = radius * sinPhi - backwardTilt;
        var light = 0.8 + 0.2 * (cosPhi * 0.5 + 0.5) * (1 - 0.4 * t);
        var r = light, g = light, b = light;

        // === Simulasi arah cahaya 3D ===
        var lightDir = [0.1, 0.2, 0.6]; // arah datang cahaya (kanan-atas-depan)
        var lightLen = Math.sqrt(lightDir[0]**2 + lightDir[1]**2 + lightDir[2]**2);
        lightDir = lightDir.map(v => v / lightLen); // normalisasi

        // arah "normal" kira-kira (pakai posisi vertex yang belum ditransformasi)
        var nx = Math.cos(phi) * Math.sin(t * Math.PI);
        var ny = Math.cos(t * Math.PI);
        var nz = Math.sin(phi) * Math.sin(t * Math.PI);
        var intensity = Math.max(0.0, nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2]);

        var ambient = 0.7;
        var light = ambient + 0.6 * intensity;
        var r = light, g = light, b = light;

        // ===================== SEGITIGA BIRU MUDA 1 (atas tengah) =====================
        var latCenterBlue = 17; 
        var lonCenterBlue = 18;
        var sizeBlue = 6;
        var topB = latCenterBlue - sizeBlue / 2;
        var bottomB = latCenterBlue + sizeBlue / 2;

        if (lat >= topB && lat <= bottomB) {
            var relLatB = (lat - topB) / (bottomB - topB);
            var halfWidthB = relLatB * (sizeBlue / 2);
            var leftB = lonCenterBlue - halfWidthB;
            var rightB = lonCenterBlue + halfWidthB;
            if (lon >= leftB && lon <= rightB) {
                r = 0.3; g = 0.5; b = 1.0; // biru muda
            }
        }
        // ===================== SEGITIGA BIRU MUDA 1 (atas tengah) =====================
        var latCenterBlue = 16; 
        var lonCenterBlue = 32;
        var sizeBlue = 4;
        var topB = latCenterBlue - sizeBlue / 2;
        var bottomB = latCenterBlue + sizeBlue / 2;

        if (lat >= topB && lat <= bottomB) {
            var relLatB = (lat - topB) / (bottomB - topB);
            var halfWidthB = relLatB * (sizeBlue / 2);
            var leftB = lonCenterBlue - halfWidthB;
            var rightB = lonCenterBlue + halfWidthB;

            if (lon >= leftB && lon <= rightB) {
                r = 0.3; g = 0.5; b = 1.0; // biru muda
            }
        }
        // ===================== SEGITIGA BIRU MUDA 2 (atas tengah) =====================
        var latCenterBlue2 = 18; 
        var lonCenterBlue2 = 4;
        var sizeBlue2 = 3;

        var topB2 = latCenterBlue2 - sizeBlue2 / 2;
        var bottomB2 = latCenterBlue2 + sizeBlue2 / 2;

        if (lat >= topB2 && lat <= bottomB2) {
            var relLatB2 = (lat - topB2) / (bottomB2 - topB2);
            var halfWidthB2 = relLatB2 * (sizeBlue2 / 2);
            var leftB2 = lonCenterBlue2 - halfWidthB2;
            var rightB2 = lonCenterBlue2 + halfWidthB2;

            if (lon >= leftB2 && lon <= rightB2) {
                r = 0.3; g = 0.5; b = 1.0; // biru muda
            }
        }

        // =====================
        // SEGITIGA MERAH (bawah sedikit ke kanan)
        // =====================
        var latCenterRed = 25;  
        var lonCenterRed = 10;  
        var sizeRed = 5;        

        var topR = latCenterRed - sizeRed / 2;
        var bottomR = latCenterRed + sizeRed / 2;

        if (lat >= topR && lat <= bottomR) {
            var relLatR = (lat - topR) / (bottomR - topR);
            var halfWidthR = relLatR * (sizeRed / 2);
            var leftR = lonCenterRed - halfWidthR;
            var rightR = lonCenterRed + halfWidthR;

            if (lon >= leftR && lon <= rightR) {
                r = 0.9; g = 0.2; b = 0.2; // merah
            }
        }
        // =====================
        // SEGITIGA MERAH (bawah sedikit ke kanan)
        // =====================
        var latCenterRed = 25;  
        var lonCenterRed = 35;  
        var sizeRed = 2;        

        var topR = latCenterRed - sizeRed / 2;
        var bottomR = latCenterRed + sizeRed / 2;

        if (lat >= topR && lat <= bottomR) {
            var relLatR = (lat - topR) / (bottomR - topR);
            var halfWidthR = relLatR * (sizeRed / 2);
            var leftR = lonCenterRed - halfWidthR;
            var rightR = lonCenterRed + halfWidthR;

            if (lon >= leftR && lon <= rightR) {
                r = 0.9; g = 0.2; b = 0.2; // merah
            }
        }

        // =====================
        // SEGITIGA MERAH (bawah sedikit ke kanan)
        // =====================
        var latCenterRed = 25;  
        var lonCenterRed = 26;  
        var sizeRed = 5;        
        var topR = latCenterRed - sizeRed / 2;
        var bottomR = latCenterRed + sizeRed / 2;

        if (lat >= topR && lat <= bottomR) {
            var relLatR = (lat - topR) / (bottomR - topR);
            var halfWidthR = relLatR * (sizeRed / 2);
            var leftR = lonCenterRed - halfWidthR;
            var rightR = lonCenterRed + halfWidthR;
            if (lon >= leftR && lon <= rightR) {
                r = 0.9; g = 0.2; b = 0.2; // merah
            }
        }
        vertices.push(x, y, z, r, g, b);
    }
}
for (var lat = 0; lat < latitudeBands; lat++) {
    for (var lon = 0; lon < longitudeBands; lon++) {
        var first = lat * (longitudeBands + 1) + lon;
        var second = first + longitudeBands + 1;
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
    }
}

// =========================== PENUTUP BAWAH BADAN (DISK) ===========================
var baseCenterIndex = vertices.length / 6;
var yBottom = bodyCurve[0].y;
var rBottom = bodyCurve[0].r;
var backwardTiltBase = 0.25;
var lightDir = [0.1, 0.2, 0.6];
var lightLen = Math.sqrt(lightDir[0]**2 + lightDir[1]**2 + lightDir[2]**2);
lightDir = lightDir.map(v => v / lightLen);

// intensitas pencahayaan seperti body bagian bawah (lat = 0)
var tBottom = 0.0; // lat/lattitudeBands = 0 di bawah
var ambient = 0.7;

function getBodyLight(phi, t) {
    var nx = Math.cos(phi) * Math.sin(t * Math.PI);
    var ny = Math.cos(t * Math.PI);
    var nz = Math.sin(phi) * Math.sin(t * Math.PI);

    var intensity = Math.max(0.0, nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2]);
    return ambient + 0.6 * intensity;
}

// warna rata-rata dari body bawah (loop seluruh phi)
var sumLight = 0;
for (var lon = 0; lon <= longitudeBands; lon++) {
    var phi = lon * 2 * Math.PI / longitudeBands;
    sumLight += getBodyLight(phi, tBottom);
}
var avgLight = sumLight / (longitudeBands + 1);
var rBase = avgLight, gBase = avgLight, bBase = avgLight;
vertices.push(0.0, yBottom, -backwardTiltBase, rBase, gBase, bBase);

// lingkaran dasar
for (var lon = 0; lon <= longitudeBands; lon++) {
    var phi = lon * 2 * Math.PI / longitudeBands;
    var x = rBottom * Math.cos(phi);
    var z = rBottom * Math.sin(phi) - backwardTiltBase;

    // warna tiap tepi
    var lightEdge = getBodyLight(phi, tBottom);
    var rEdge = lightEdge, gEdge = lightEdge, bEdge = lightEdge;

    vertices.push(x, yBottom, z, rEdge, gEdge, bEdge);

    if (lon < longitudeBands) {
        indices.push(baseCenterIndex, baseCenterIndex + lon + 1, baseCenterIndex + lon + 2);
    }
}

var vertex_buffer = GL.createBuffer();
GL.bindBuffer(GL.ARRAY_BUFFER, vertex_buffer);
GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(vertices), GL.STATIC_DRAW);

var index_buffer = GL.createBuffer();
GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, index_buffer);
GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), GL.STATIC_DRAW);

/*========================= GEOMETRY (HEAD - Ellipsoid Lonjong ke Belakang) =========================*/
    var headVertices = [];
    var headIndices = [];
    var latBands = 30, longBands = 30;

    // ukuran dan posisi kepala
    var headY = 1.68;
    var rx = 0.42;   // lebar (sumbu X)
    var ry = 0.35;   // tinggi (sumbu Y)
    var rz = 0.6;   // panjang (sumbu Z)
    var backwardStretch = -0.1; // makin besar = makin lonjong ke belakang

    for (var lat = 0; lat <= latBands; lat++) {
        var theta = lat * Math.PI / latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var lon = 0; lon <= longBands; lon++) {
            var phi = lon * 2 * Math.PI / longBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            // bentuk dasar ellipsoid
            var x = rx * cosPhi * sinTheta;
            var y = ry * cosTheta + headY;

            // bagian belakang diperpanjang halus dengan faktor cosPhi
            var z = rz * sinPhi * sinTheta;
            z += backwardStretch * (1 - cosPhi) * sinTheta; // menonjol ke belakang (arah Z+)

            // shading halus
            var brightness = 0.9 + 0.1 * cosTheta;
            headVertices.push(x, y, z, brightness, brightness, brightness);
        }
    }

    // buat indeks triangulasi
    for (var lat = 0; lat < latBands; lat++) {
        for (var lon = 0; lon < longBands; lon++) {
            var first = lat * (longBands + 1) + lon;
            var second = first + longBands + 1;
            headIndices.push(first, second, first + 1);
            headIndices.push(second, second + 1, first + 1);
        }
    }

    // buat buffer untuk kepala
    var head_vertex_buffer = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, head_vertex_buffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(headVertices), GL.STATIC_DRAW);

    var head_index_buffer = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, head_index_buffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(headIndices), GL.STATIC_DRAW);

/*========================= GEOMETRY (CONE - Tanduk Kecil di Kepala Togetic, warna sama dengan kepala) =========================*/
var coneVertices = [];
var coneIndices = [];

// === PARAMETER PER CONE ===
var cones = [
    { height: 0.5, radius: 0.25, tiltBackDeg: -40, tiltSideDeg: 0, offset: {x: 0,  y: -0.08, z: 0.087} },   // tengah
    { height: 0.45, radius: 0.3,  tiltBackDeg: -40, tiltSideDeg: 48, offset: {x: 0.1, y: -0.3, z: -0.05} }, // kanan
    { height: 0.45, radius: 0.3,  tiltBackDeg: -40, tiltSideDeg: -48, offset: {x: -0.07, y: -0.3, z: 0.05} } // kiri
]

var coneSegments = 20;
var baseY = headY + ry; // dasar kepala

for (var c = 0; c < cones.length; c++) {
    var conf = cones[c];
    var baseCenterIndex = coneVertices.length / 6;

    // konversi tilt ke radian
    var tiltBack = Math.tan(conf.tiltBackDeg * Math.PI / 180);
    var tiltSide = Math.tan(conf.tiltSideDeg * Math.PI / 180);

    // titik puncak cone
    var apexX = conf.offset.x + conf.height * tiltSide;
    var apexY = baseY + conf.offset.y + conf.height;
    var apexZ = conf.offset.z + conf.height * tiltBack;

    // === warna puncak disamakan dengan kepala ===
    var apexBrightness = 0.9 + 0.1 * (apexY / (headY + ry + conf.height)); // pakai pola sama seperti kepala
    coneVertices.push(apexX, apexY, apexZ, apexBrightness, apexBrightness, apexBrightness);

    // lingkaran dasar cone
    for (var i = 0; i <= coneSegments; i++) {
        var angle = (i / coneSegments) * 2 * Math.PI;
        var x = conf.offset.x + conf.radius * Math.cos(angle);
        var y = baseY + conf.offset.y;
        var z = conf.offset.z + conf.radius * Math.sin(angle);

        // brightness sama seperti kepala — makin ke bawah sedikit gelap
        var relativeHeight = (y - headY) / (ry + conf.height); // 0..1
        var brightness = 0.95 + 0.1 * relativeHeight;

        coneVertices.push(x, y, z, brightness, brightness, brightness);

        if (i < coneSegments) {
            // segitiga antara puncak dan dasar
            coneIndices.push(baseCenterIndex, baseCenterIndex + i + 1, baseCenterIndex + i + 2);
        }
    }
}
// === Buffer untuk cone ===
var cone_vertex_buffer = GL.createBuffer();
GL.bindBuffer(GL.ARRAY_BUFFER, cone_vertex_buffer);
GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(coneVertices), GL.STATIC_DRAW);
var cone_index_buffer = GL.createBuffer();
GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, cone_index_buffer);
GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(coneIndices), GL.STATIC_DRAW);

    /*========================= GEOMETRY (EYES) =========================*/
function createEye(GL, cx, cy, cz, rx, ry, rz, segments, color) {
    var eyeVertices = [];
    var eyeIndices = [];

    for (var lat = 0; lat <= segments; lat++) {
        var theta = lat * Math.PI / segments;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var lon = 0; lon <= segments; lon++) {
            var phi = lon * 2 * Math.PI / segments;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = rx * cosPhi * sinTheta + cx;
            var y = ry * cosTheta + cy;
            var z = rz * sinPhi * sinTheta + cz;

            // posisi + warna (r,g,b)
            eyeVertices.push(x, y, z, color[0], color[1], color[2]);
        }
    }

    for (var lat = 0; lat < segments; lat++) {
        for (var lon = 0; lon < segments; lon++) {
            var first = lat * (segments + 1) + lon;
            var second = first + segments + 1;
            eyeIndices.push(first, second, first + 1);
            eyeIndices.push(second, second + 1, first + 1);
        }
    }

    // === BUAT BUFFER ===
    var vertexBuffer = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(eyeVertices), GL.STATIC_DRAW);

    var indexBuffer = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(eyeIndices), GL.STATIC_DRAW);

    return { vertexBuffer, indexBuffer, count: eyeIndices.length };
}

// Posisi dan ukuran relatif ke kepala
var leftEye  = createEye(GL, -0.11, 1.72, 0.38, 0.04, 0.08, 0.1, 16, [0.05, 0.05, 0.05]);
var rightEye = createEye(GL,  0.26, 1.72, 0.355, 0.04, 0.08, 0.1, 16, [0.05, 0.05, 0.05]);

/*========================= GEOMETRY (PUPILS PUTIH) =========================*/
function createPupil(GL, cx, cy, cz, rx, ry, rz, segments, color) {
    var vertices = [];
    var indices = [];

    for (var lat = 0; lat <= segments; lat++) {
        var theta = lat * Math.PI / 2 / segments; // hanya setengah bola
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var lon = 0; lon <= segments; lon++) {
            var phi = lon * 2 * Math.PI / segments;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = rx * cosPhi * sinTheta + cx;
            var y = ry * cosTheta + cy;
            var z = rz * sinPhi * sinTheta + cz;

            vertices.push(x, y, z, color[0], color[1], color[2]);
        }
    }

    for (var lat = 0; lat < segments; lat++) {
        for (var lon = 0; lon < segments; lon++) {
            var first = lat * (segments + 1) + lon;
            var second = first + segments + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    var vertexBuffer = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(vertices), GL.STATIC_DRAW);

    var indexBuffer = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), GL.STATIC_DRAW);

    return { vertexBuffer, indexBuffer, count: indices.length };
}

// === Tambahkan pupil di tengah mata ===
// Posisinya sedikit ke depan (z +0.02 dari mata), dan sedikit lebih kecil dari mata
var leftPupil  = createPupil(GL, -0.1 , 1.77, 0.44, 0.02, 0.03, 0.02, 16, [1.0, 1.0, 1.0]);
var rightPupil = createPupil(GL,  0.27, 1.77, 0.4, 0.02, 0.03, 0.02, 16, [1.0, 1.0, 1.0]);

/*========================= GEOMETRY (MOUTH - STRAIGHT TOP, CURVED BOTTOM) =========================*/
function createTogeticSmileMouth(GL, cx, cy, cz, width, height, gap, segments, colorOuter, colorInner) {
    var vertices = [];
    var indices = [];

    // Fungsi Bézier Quadratic sederhana
    function bezier(t, p0, p1, p2) {
        var u = 1 - t;
        return [
            u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
            u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2]
        ];
    }

    // === Titik kontrol ===
    // Bibir atas: lurus datar
    var topP0 = [-width / 2, 0, 0];
    var topP2 = [width / 2, 0, 0];

    // Bibir bawah: melengkung ke atas (senyum)
    var bottomP0 = [-width / 2, -gap, 0];
    var bottomP1 = [0, -gap + height, 0];  // melengkung ke atas
    var bottomP2 = [width / 2, -gap, 0];

    // Buat vertex mulut
    for (var i = 0; i <= segments; i++) {
        var t = i / segments;

        // Bibir atas (garis lurus)
        var x1 = topP0[0] + t * (topP2[0] - topP0[0]);
        var y1 = topP0[1];
        var z1 = 0;

        // Bibir bawah (kurva Bézier)
        var [x2, y2, z2] = bezier(t, bottomP0, bottomP1, bottomP2);

        // Tambahkan vertex atas dan bawah
        vertices.push(cx + x1, cy + y1, cz + z1, colorOuter[0], colorOuter[1], colorOuter[2]);
        vertices.push(cx + x2, cy + y2, cz + z2, colorInner[0], colorInner[1], colorInner[2]);

        if (i < segments) {
            var idx = i * 2;
            indices.push(idx, idx + 1, idx + 2);
            indices.push(idx + 1, idx + 3, idx + 2);
        }
    }

    // Buffer data
    var vertexBuffer = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(vertices), GL.STATIC_DRAW);
    var indexBuffer = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), GL.STATIC_DRAW);

    return {
        vertexBuffer,
        indexBuffer,
        count: indices.length
    };
}

var mouth = createTogeticSmileMouth(
    GL, 0.1, 1.55, 0.47, 0.2, -0.2, 0.02, 20, [0.05, 0.05, 0.05], [0.2, 0.0, 0.0])

/* =================== ALIS ================== */
function createEyebrow(GL, cx, cy, cz, width, height, tilt, segments, color, thickness) {
    var verts = [];
    var p0 = [-width / 2, 0, 0];
    var p1 = [0, height, 0];
    var p2 = [width / 2, 0, 0];
    var cosT = Math.cos(tilt);
    var sinT = Math.sin(tilt);

    for (var i = 0; i <= segments; i++) {
        var t = i / segments;
        var u = 1 - t;

        // Quadratic Bézier
        var x = u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0];
        var y = u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1];

        // Rotasi
        var xr = x * cosT - y * sinT;
        var yr = x * sinT + y * cosT;

        // Dua vertex per titik (atas & bawah)
        verts.push(cx + xr, cy + yr + thickness/2, cz, color[0], color[1], color[2]);
        verts.push(cx + xr, cy + yr - thickness/2, cz, color[0], color[1], color[2]);
    }

    var buffer = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, buffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(verts), GL.STATIC_DRAW);
    return { buffer, count: verts.length / 6 };
}

// Contoh pemanggilan
var eyebrowLeft = createEyebrow(GL, -0.1, 1.85, 0.45, 0.09, 0.015, 0.25, 14, [0.05,0.05,0.05], 0.02);
var eyebrowRight = createEyebrow(GL, 0.3, 1.85, 0.4, 0.09, 0.015, -0.25, 14, [0.05,0.05,0.05], 0.02);

/*========================= GEOMETRY (ARMS - Waving Animation) =========================*/
var armTime = 0;
var armSpeed = 0.02;      // kecepatan lambaian
var armAmplitude = 0.2;   // besar sudut lambaian (radian)

function createEllipsoid(rx, ry, rz, cx, cy, cz, latBands, longBands, rotX = 0, rotY = 0, rotZ = 0) {
    var verts = [];
    var inds = [];

    // Fungsi rotasi sederhana
    function rotateX(x, y, z, angle) {
        var cosA = Math.cos(angle), sinA = Math.sin(angle);
        return [x, y * cosA - z * sinA, y * sinA + z * cosA];
    }
    function rotateY(x, y, z, angle) {
        var cosA = Math.cos(angle), sinA = Math.sin(angle);
        return [x * cosA + z * sinA, y, -x * sinA + z * cosA];
    }
    function rotateZ(x, y, z, angle) {
        var cosA = Math.cos(angle), sinA = Math.sin(angle);
        return [x * cosA - y * sinA, x * sinA + y * cosA, z];
    }

    // arah cahaya 
    var lightDir = [0.1, 0.8, 0.7];
    var len = Math.sqrt(lightDir[0]**2 + lightDir[1]**2 + lightDir[2]**2);
    lightDir = lightDir.map(v => v / len);

    for (var lat = 0; lat <= latBands; lat++) {
        var theta = lat * Math.PI / latBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        for (var lon = 0; lon <= longBands; lon++) {
            var phi = lon * 2 * Math.PI / longBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = rx * cosPhi * sinTheta;
            var y = ry * cosTheta;
            var z = rz * sinPhi * sinTheta;

            // rotasi bentuk
            [x, y, z] = rotateX(x, y, z, rotX);
            [x, y, z] = rotateY(x, y, z, rotY);
            [x, y, z] = rotateZ(x, y, z, rotZ);

            // translasi ke posisi
            x += cx;
            y += cy;
            z += cz;

            // normal
            var nx = cosPhi * sinTheta;
            var ny = cosTheta;
            var nz = sinPhi * sinTheta;

            var dot = Math.max(0.0, nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2]);
            var ambient = 0.4;
            var light = ambient + 0.6 * dot;

            var r = light, g = light, b = light;
            verts.push(x, y, z, r, g, b);
        }
    }

    // index
    for (var lat = 0; lat < latBands; lat++) {
        for (var lon = 0; lon < longBands; lon++) {
            var first = lat * (longBands + 1) + lon;
            var second = first + longBands + 1;
            inds.push(first, second, first + 1);
            inds.push(second, second + 1, first + 1);
        }
    }
    return { vertices: verts, indices: inds };
}

// === Buffer global ===
var armL_vbuf = GL.createBuffer();
var armL_ibuf = GL.createBuffer();
var armR_vbuf = GL.createBuffer();
var armR_ibuf = GL.createBuffer();

var armLeft, armRight;

// === Update fungsi untuk animasi lambaian ===
function updateArms() {
    armTime += armSpeed;
    // sudut dasar dan sudut animasi
    var baseRotZ_L =  Math.PI / 10;  // sedikit ke luar
    var baseRotZ_R = -Math.PI / 10;  // sedikit ke luar
    var waveAngleL = Math.sin(armTime) * armAmplitude;       // kiri melambai
    var waveAngleR = Math.sin(armTime + Math.PI) * armAmplitude; // kanan berlawanan fase

    armLeft = createEllipsoid(
        0.1, 0.37, 0.15,
        -0.35, 0.6, 0.0,
        15, 15,
        Math.PI / 10, 0, baseRotZ_L + waveAngleL
    );

    armRight = createEllipsoid(
        0.1, 0.37, 0.15,
        0.35, 0.6, 0.0,
        15, 15,
        Math.PI / 10, 0, baseRotZ_R + waveAngleR
    );

    // upload ulang data
    GL.bindBuffer(GL.ARRAY_BUFFER, armL_vbuf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(armLeft.vertices), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, armL_ibuf);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(armLeft.indices), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, armR_vbuf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(armRight.vertices), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, armR_ibuf);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(armRight.indices), GL.STATIC_DRAW);
}

            /*========================= GEOMETRY (WINGS - Full Flap Like Flying Bird) =========================*/
var wingTime = 0;
var wingSpeed = 0.05;  // kecepatan kepakan
var wingAmplitude = 0.35; // tinggi turun-naik seluruh sayap

function createTogepiWing(rx, ry, rz, cx, cy, cz, k, uSteps, vSteps, flapOffset = 0) {
    var verts = [];
    var inds = [];

    // arah cahaya global (kanan-atas-depan)
    var lightDir = [0.6, 0.9, 0.7];
    var len = Math.sqrt(lightDir[0]**2 + lightDir[1]**2 + lightDir[2]**2);
    lightDir = lightDir.map(v => v / len);

    // ==== gerak seluruh sayap naik-turun ====
    var flapGlobal = Math.sin(wingTime + flapOffset) * wingAmplitude;

    for (var i = 0; i <= uSteps; i++) {
        var u = -1 + 2 * i / uSteps;
        for (var j = 0; j <= vSteps; j++) {
            var v = j / vSteps;

            // gerak lokal (ujung lebih fleksibel)
            var flapLocal = flapGlobal * (0.3 + 0.7 * v);

            // bentuk paraboloid dasar
            var x = rx * u * (1 - v * 0.5);
            var y = ry * v + flapLocal;  // seluruh sayap ikut naik-turun
            var z = k * (u * u + v * v) * rz * (1 - v);

            // shading
            var nx = -2 * u * rz * (1 - v);
            var ny = 1.0;
            var nz = -2 * v * rz * (1 - v);
            var nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
            nx /= nLen; ny /= nLen; nz /= nLen;

            var dot = Math.max(0.0, nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2]);
            var ambient = 0.5;
            var light = ambient + 0.5 * dot;

            var r = light * 0.95;
            var g = light * 0.98;
            var b = light * 1.0;

            verts.push(x + cx, y + cy, z + cz, r, g, b);
        }
    }

    // buat indeks
    for (var i = 0; i < uSteps; i++) {
        for (var j = 0; j < vSteps; j++) {
            var first = i * (vSteps + 1) + j;
            var second = first + vSteps + 1;
            inds.push(first, second, first + 1);
            inds.push(second, second + 1, first + 1);
        }
    }
    return { vertices: verts, indices: inds };
}

// === Inisialisasi sayap kiri & kanan ===
var wingLeft  = createTogepiWing(0.8, 0.37, 0.8, -0.8, 0.65, -0.49, 0.4, 12, 10, 0);
var wingRight = createTogepiWing(0.8, 0.37, 0.8,  0.8, 0.65, -0.49, 0.4, 12, 10, Math.PI);

// === Buffer awal ===
var wingL_vbuf = GL.createBuffer();
var wingL_ibuf = GL.createBuffer();
var wingR_vbuf = GL.createBuffer();
var wingR_ibuf = GL.createBuffer();

// === Update per frame ===
function updateWings() {
    wingLeft  = createTogepiWing(0.9, -0.26, 2, -0.8, 0.65, -0.9, 0.5, 12, 10, 0);
    wingRight = createTogepiWing(0.9, -0.26, 2,  0.8, 0.65, -0.9, 0.5, 12, 10, 0);

    GL.bindBuffer(GL.ARRAY_BUFFER, wingL_vbuf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(wingLeft.vertices), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, wingL_ibuf);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(wingLeft.indices), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ARRAY_BUFFER, wingR_vbuf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(wingRight.vertices), GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, wingR_ibuf);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(wingRight.indices), GL.STATIC_DRAW);
}

     /*========================= GEOMETRY (LEGS - mengarah ke depan) =========================*/
    function createCylinder(radius, height, cx, cy, cz, segments, tiltZ) {
        var verts = [];
        var inds = [];
        for (var i = 0; i <= segments; i++) {
            var theta = i * 2 * Math.PI / segments;
            var x = radius * Math.cos(theta);
            var z = radius * Math.sin(theta);
            // rotasi silinder ke arah depan (tiltZ)
            var xRot = x;
            var yRot = Math.sin(tiltZ) * z + cy;
            var zRot = Math.cos(tiltZ) * z + cz;

            // === shading sederhana berdasarkan arah normal ===
            // normal kira-kira (cosθ, 0, sinθ)
            var intensity = 0.95 + 0.4 * Math.max(0, Math.cos(theta)); 
            // bagian depan lebih terang

            var r = 0.9 * intensity;
            var g = 0.9 * intensity;
            var b = 0.9 * intensity;

            // vertex atas
            verts.push(xRot + cx, yRot + height / 2, zRot, r, g, b);
            // vertex bawah
            verts.push(xRot + cx, yRot - height / 2, zRot, r, g, b);
        }
        // indeks segitiga
        for (var i = 0; i < segments * 2; i += 2) {
            inds.push(i, i + 1, i + 2);
            inds.push(i + 1, i + 3, i + 2);
        }
        return { vertices: verts, indices: inds };
    }

    // Geser posisi kaki agar berada di bawah & sedikit maju ke depan (sumbu Z negatif = ke depan layar)
    var legLeft  = createCylinder(0.08, 0.35, -0.18, -1.1, 0.02, 20,  0.6);
    var legRight = createCylinder(0.08, 0.35,  0.18, -1.1, 0.02, 20, -0.6);
    // Telapak kaki (ellipsoid) posisinya maju ke depan juga
    var footLeft  = createEllipsoid(0.13, 0.11, 0.4, -0.18, -1.32, 0.2, 15, 15);
    var footRight = createEllipsoid(0.13, 0.11, 0.4,  0.18, -1.32, 0.2, 15, 15);

    // === Buffer kaki kiri ===
    var legL_vbuf = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, legL_vbuf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(legLeft.vertices), GL.STATIC_DRAW);
    var legL_ibuf = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, legL_ibuf);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(legLeft.indices), GL.STATIC_DRAW);

    // === Buffer kaki kanan ===
    var legR_vbuf = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, legR_vbuf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(legRight.vertices), GL.STATIC_DRAW);
    var legR_ibuf = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, legR_ibuf);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(legRight.indices), GL.STATIC_DRAW);

    // === Buffer telapak kiri ===
    var footL_vbuf = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, footL_vbuf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(footLeft.vertices), GL.STATIC_DRAW);
    var footL_ibuf = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, footL_ibuf);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(footLeft.indices), GL.STATIC_DRAW);
    // === Buffer telapak kanan ===
    var footR_vbuf = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, footR_vbuf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(footRight.vertices), GL.STATIC_DRAW);
    var footR_ibuf = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, footR_ibuf);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(footRight.indices), GL.STATIC_DRAW);

    /*========================= MATRICES =========================*/
var PROJMATRIX = TOGETIC_LIBS.get_projection(60, CANVAS.width / CANVAS.height, 1, 100);
var VIEWMATRIX = TOGETIC_LIBS.get_I4();
var MOVEMATRIX = TOGETIC_LIBS.get_I4();

TOGETIC_LIBS.translateZ(VIEWMATRIX, -4);

var THETA = 0, PHI = 0, drag = false, x_prev, y_prev;
var dX = 0, dY = 0, FRICTION = -0.0005;

CANVAS.addEventListener("mousedown", e => { drag = true; x_prev = e.pageX; y_prev = e.pageY; });
CANVAS.addEventListener("mouseup", e => drag = false);
CANVAS.addEventListener("mouseout", e => drag = false);
CANVAS.addEventListener("mousemove", e => {
    if (!drag) return;
    dX = (e.pageX - x_prev) * 2 * Math.PI / CANVAS.width;
    dY = (e.pageY - y_prev) * 2 * Math.PI / CANVAS.height;
    THETA += dX; PHI += dY;
    x_prev = e.pageX; y_prev = e.pageY;
});

/*========================= PARAMETER SALTO =========================*/
var flipActive = false;      // sedang salto?
var flipTime = 10;            // waktu frame saat salto
var flipDuration = 300;      // durasi salto (frame)
var jumpHeight = 3;        // tinggi maksimum salto
var flipInterval = 10;      // jeda antar salto (detik)
var flipTimer = 3;           // penghitung waktu antar salto
/*========================= RENDER =========================*/
GL.enable(GL.DEPTH_TEST);


function animate() {
    GL.viewport(0, 0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    TOGETIC_LIBS.set_I4(MOVEMATRIX);

    // === Posisi dasar Togetic di depan kamera ===
    TOGETIC_LIBS.translateZ(MOVEMATRIX, -7);

    // === SALTO OTOMATIS ===
    flipTimer += 1 / 60; // ~60 FPS
    var jump = 0, rot = 0;

    if (!flipActive && flipTimer >= flipInterval) {
        flipActive = true;
        flipTimer = 0;
        flipTime = 0;
    }

    if (flipActive) {
        flipTime++;
        var t = flipTime / flipDuration;
        // naik turun halus
        jump = Math.sin(Math.PI * t) * jumpHeight;
        // rotasi ke belakang penuh (360 derajat)
        rot = -t * 2 * Math.PI;

        if (flipTime >= flipDuration) {
            flipActive = false;
            flipTime = 0;
        }
    }
    // === EFEK CAHAYA BIRU SAAT SALTO (Evolusi) ===
var auraIntensity = -0.2;
// kapan aura muncul (atur di sini)
var auraStart = flipDuration * 0.4;  // mulai di 30% durasi salto
var auraEnd   = flipDuration * 0.9;  // berakhir di 60% durasi salto

if (flipActive && flipTime >= auraStart && flipTime <= auraEnd) {
    var tAura = (flipTime - auraStart) / (auraEnd - auraStart);
    auraIntensity = Math.sin(Math.PI * tAura); // fade in dan out
}
if (auraIntensity > 0) {
    GL.enable(GL.BLEND);
    GL.blendFunc(GL.SRC_ALPHA, GL.ONE);
    GL.disable(GL.DEPTH_TEST);

    // Efek aura singkat dan ringan
    var auraRadius = 3 + auraIntensity * 0.9;
    var auraAlpha = 0.8 + auraIntensity * 0.4;

    // Buat vertex lingkaran aura
    var auraVerts = [];
    var auraSteps = 128;
    for (var i = 0; i < auraSteps; i++) {
        var a = (i / auraSteps) * 2 * Math.PI;
        auraVerts.push(Math.cos(a) * auraRadius);
        auraVerts.push(Math.sin(a) * auraRadius);
        auraVerts.push(0);
    }

    // Kirim ke GPU sementara
    var auraBuf = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, auraBuf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(auraVerts), GL.STREAM_DRAW);

    // Posisi aura di sekitar tubuh Togetic
    var auraMatrix = TOGETIC_LIBS.get_I4();
    TOGETIC_LIBS.translateZ(auraMatrix, -4.5);
    TOGETIC_LIBS.translateY(auraMatrix, jump);
    TOGETIC_LIBS.rotateZ(auraMatrix, flipTime / 20); // berputar pelan

    GL.uniformMatrix4fv(_Pm, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vm, false, VIEWMATRIX);
    GL.uniformMatrix4fv(_Mm, false, auraMatrix);

    // Warna biru bercahaya
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 0, 0);
    GL.disableVertexAttribArray(_col);
    GL.vertexAttrib3f(_col, 0.3, 0.7 + 0.3 * auraIntensity, 1.0, auraAlpha);

    // Gambar aura
    GL.drawArrays(GL.LINE_LOOP, 0, auraSteps);
    GL.deleteBuffer(auraBuf);
    GL.enable(GL.DEPTH_TEST);
    GL.disable(GL.BLEND);
}

    // === TERAPKAN TRANSFORMASI ===
    TOGETIC_LIBS.translateY(MOVEMATRIX, jump);
    TOGETIC_LIBS.rotateX(MOVEMATRIX, rot);
    TOGETIC_LIBS.rotateY(MOVEMATRIX, THETA);
    TOGETIC_LIBS.rotateX(MOVEMATRIX, PHI);

    GL.uniformMatrix4fv(_Pm, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vm, false, VIEWMATRIX);
    GL.uniformMatrix4fv(_Mm, false, MOVEMATRIX);

    // === ANIMASI SAYAP DAN TANGAN ===
    wingTime += wingSpeed;
    updateWings();
    updateArms(); // tangan melambai

    // === BODY ===
    GL.bindBuffer(GL.ARRAY_BUFFER, vertex_buffer);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, index_buffer);
    GL.drawElements(GL.TRIANGLES, indices.length, GL.UNSIGNED_SHORT, 0);

    // === HEAD ===
    GL.bindBuffer(GL.ARRAY_BUFFER, head_vertex_buffer);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, head_index_buffer);
    GL.drawElements(GL.TRIANGLES, headIndices.length, GL.UNSIGNED_SHORT, 0);

    // === EYES ===
    [leftEye, rightEye].forEach(eye => {
        GL.bindBuffer(GL.ARRAY_BUFFER, eye.vertexBuffer);
        GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
        GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, eye.indexBuffer);
        GL.drawElements(GL.TRIANGLES, eye.count, GL.UNSIGNED_SHORT, 0);
    });

    // === PUPILS ===
    [leftPupil, rightPupil].forEach(pupil => {
        GL.bindBuffer(GL.ARRAY_BUFFER, pupil.vertexBuffer);
        GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
        GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, pupil.indexBuffer);
        GL.drawElements(GL.TRIANGLES, pupil.count, GL.UNSIGNED_SHORT, 0);
    });

    // === MOUTH ===
    GL.bindBuffer(GL.ARRAY_BUFFER, mouth.vertexBuffer);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, mouth.indexBuffer);
    GL.drawElements(GL.TRIANGLES, mouth.count, GL.UNSIGNED_SHORT, 0);

    // === EYEBROWS ===
    [eyebrowLeft, eyebrowRight].forEach(brow => {
        GL.bindBuffer(GL.ARRAY_BUFFER, brow.buffer);
        GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
        GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
        GL.drawArrays(GL.LINE_STRIP, 0, brow.count);
    });

    // === ARMS ===
    GL.bindBuffer(GL.ARRAY_BUFFER, armL_vbuf);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, armL_ibuf);
    GL.drawElements(GL.TRIANGLES, armLeft.indices.length, GL.UNSIGNED_SHORT, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, armR_vbuf);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, armR_ibuf);
    GL.drawElements(GL.TRIANGLES, armRight.indices.length, GL.UNSIGNED_SHORT, 0);

    // === WINGS ===
    GL.bindBuffer(GL.ARRAY_BUFFER, wingL_vbuf);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, wingL_ibuf);
    GL.drawElements(GL.TRIANGLES, wingLeft.indices.length, GL.UNSIGNED_SHORT, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, wingR_vbuf);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, wingR_ibuf);
    GL.drawElements(GL.TRIANGLES, wingRight.indices.length, GL.UNSIGNED_SHORT, 0);

    // === LEGS ===
    GL.bindBuffer(GL.ARRAY_BUFFER, legL_vbuf);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, legL_ibuf);
    GL.drawElements(GL.TRIANGLES, legLeft.indices.length, GL.UNSIGNED_SHORT, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, legR_vbuf);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, legR_ibuf);
    GL.drawElements(GL.TRIANGLES, legRight.indices.length, GL.UNSIGNED_SHORT, 0);

    // === FEET ===
    GL.bindBuffer(GL.ARRAY_BUFFER, footL_vbuf);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, footL_ibuf);
    GL.drawElements(GL.TRIANGLES, footLeft.indices.length, GL.UNSIGNED_SHORT, 0);
    GL.bindBuffer(GL.ARRAY_BUFFER, footR_vbuf);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, footR_ibuf);
    GL.drawElements(GL.TRIANGLES, footRight.indices.length, GL.UNSIGNED_SHORT, 0);

    // === CONES (SPIKES) ===
    GL.bindBuffer(GL.ARRAY_BUFFER, cone_vertex_buffer);
    GL.vertexAttribPointer(_pos, 3, GL.FLOAT, false, 24, 0);
    GL.vertexAttribPointer(_col, 3, GL.FLOAT, false, 24, 12);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, cone_index_buffer);
    GL.drawElements(GL.TRIANGLES, coneIndices.length, GL.UNSIGNED_SHORT, 0);

    GL.flush();
    requestAnimationFrame(animate);
}
// ===== Tambahkan delay 2 detik sebelum mulai bergerak =====
setTimeout(() => {
    animate(); // mulai animasi setelah 2 detik
}, 2000);
}
window.addEventListener("load", main);

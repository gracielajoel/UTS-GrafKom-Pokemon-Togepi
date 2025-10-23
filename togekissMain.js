function mainTogekiss(offsetX =0) {
    const CANVAS = document.getElementById("togekiss");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    const GL = CANVAS.getContext("webgl", { antialias: true });
    if (!GL) {
        alert("WebGL tidak bisa dijalankan di browser ini.");
        return;
    }

    // ======== SHADER (Phong lighting) =========
    const vsSource = `
        attribute vec3 position;
        attribute vec3 normal;
        attribute vec3 color;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main(void) {
            vColor = color;
            vNormal = normalize(mat3(Mmatrix) * normal);
            vPosition = vec3(Mmatrix * vec4(position, 1.0));
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);
        }
    `;

    const fsSource = `
        precision mediump float;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vPosition;

        uniform vec3 lightDirection;
        uniform vec3 lightColor;
        uniform vec3 ambientColor;
        uniform vec3 viewPosition;

        void main(void) {
            vec3 norm = normalize(vNormal);
            vec3 lightDir = normalize(lightDirection);
            float diff = max(dot(norm, lightDir), 0.0);

            vec3 viewDir = normalize(viewPosition - vPosition);
            vec3 reflectDir = reflect(-lightDir, norm);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 24.0);

            vec3 diffuse = diff * lightColor * vColor;
            vec3 specular = spec * lightColor * 0.35;
            vec3 ambient = ambientColor * vColor  * 0.9;

            gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
        }
    `;

    // Compile shader helper
    function compileShader(src, type) {
        const shader = GL.createShader(type);
        GL.shaderSource(shader, src);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            console.error(GL.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    const vs = compileShader(vsSource, GL.VERTEX_SHADER);
    const fs = compileShader(fsSource, GL.FRAGMENT_SHADER);
    const program = GL.createProgram();
    GL.attachShader(program, vs);
    GL.attachShader(program, fs);
    GL.linkProgram(program);
    GL.useProgram(program);

    const _position = GL.getAttribLocation(program, "position");
    const _normal = GL.getAttribLocation(program, "normal");
    const _color = GL.getAttribLocation(program, "color");
    GL.enableVertexAttribArray(_position);
    GL.enableVertexAttribArray(_normal);
    GL.enableVertexAttribArray(_color);

    const _Pmatrix = GL.getUniformLocation(program, "Pmatrix");
    const _Vmatrix = GL.getUniformLocation(program, "Vmatrix");
    const _Mmatrix = GL.getUniformLocation(program, "Mmatrix");
    const _lightDirection = GL.getUniformLocation(program, "lightDirection");
    const _lightColor = GL.getUniformLocation(program, "lightColor");
    const _ambientColor = GL.getUniformLocation(program, "ambientColor");
    const _viewPosition = GL.getUniformLocation(program, "viewPosition");

    // ======== NURBS UTILITIES ========
    function N(i, k, t, knots) {
        if (k === 1) {
            return (t >= knots[i] && t < knots[i + 1]) ? 1 : 0;
        } else {
            let denom1 = knots[i + k - 1] - knots[i];
            let denom2 = knots[i + k] - knots[i + 1];
            let term1 = 0, term2 = 0;
            if (denom1 !== 0)
                term1 = ((t - knots[i]) / denom1) * N(i, k - 1, t, knots);
            if (denom2 !== 0)
                term2 = ((knots[i + k] - t) / denom2) * N(i + 1, k - 1, t, knots);
            return term1 + term2;
        }
    }

    function evaluateNURBSCurve(controlPoints, degree, t, knots) {
        const n = controlPoints.length - 1;
        let x = 0, y = 0, z = 0;
        for (let i = 0; i <= n; i++) {
            const b = N(i, degree + 1, t, knots);
            x += b * controlPoints[i][0];
            y += b * controlPoints[i][1];
            z += b * controlPoints[i][2];
        }
        return [x, y, z];
    }

    // ======== Shape generator (sama seperti yang kamu punya) ========
    function generateEllipsoid(rx, ry, rz, nlat, nlong, col) {
        const vertices = [], faces = [];
        for (let i = 0; i <= nlat; i++) {
            const theta = i * Math.PI / nlat;
            for (let j = 0; j <= nlong; j++) {
                const phi = j * 2 * Math.PI / nlong;
                const x = rx * Math.sin(theta) * Math.cos(phi);
                const y = ry * Math.cos(theta);
                const z = rz * Math.sin(theta) * Math.sin(phi);
                const nx = x / (rx || 1), ny = y / (ry || 1), nz = z / (rz || 1);
                vertices.push(x, y, z, nx, ny, nz, col[0], col[1], col[2]);
            }
        }
        for (let i = 0; i < nlat; i++) {
            for (let j = 0; j < nlong; j++) {
                const first = i * (nlong + 1) + j;
                const second = first + nlong + 1;
                faces.push(first, second, first + 1);
                faces.push(second, second + 1, first + 1);
            }
        }
        return { vertices, faces };
    }

    function generateCone(r, h, n, col) {
        const vertices = [0, h, 0, 0, 1, 0, col[0], col[1], col[2]];
        for (let i = 0; i <= n; i++) {
            const ang = 2 * Math.PI * i / n;
            const x = r * Math.cos(ang);
            const z = r * Math.sin(ang);
            vertices.push(x, 0, z, 0, 0, 1, col[0], col[1], col[2]);
        }
        const faces = [];
        for (let i = 1; i <= n; i++) faces.push(0, i, i + 1);
        return { vertices, faces };
    }

    // NURBS pattern (sama)
    function generateNURBSCurvePattern(side = 1, color = [0, 0, 0]) {
        const cp = [
            [side * 1.75, -0.25, -0.15],
            [side * 1.45, -0.10,  0.10],
            [side * 1.15,  0.00,  0.25],
            [side * 0.85,  0.05,  0.30],
            [side * 0.65,  0.00,  0.25],
        ];

        const degree = 3;
        const numPoints = 60;
        const n = cp.length;
        const knots = [];
        for (let i = 0; i < n + degree + 1; i++) {
            if (i < degree + 1) knots.push(0);
            else if (i > n - 1) knots.push(1);
            else knots.push((i - degree) / (n - degree));
        }

        const width = 0.05;
        const zOffset = 0.9;

        const verts = [];
        const faces = [];

        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const [x, y, z] = evaluateNURBSCurve(cp, degree, t, knots);

            const nx = 0, ny = 0, nz = 1;

            const A = [x, y + width, z + zOffset];
            const B = [x, y - width, z + zOffset];

            verts.push(
                A[0], A[1], A[2], nx, ny, nz, color[0], color[1], color[2],
                B[0], B[1], B[2], nx, ny, nz, color[0], color[1], color[2]
            );

            if (i > 0) {
                const base = i * 2;
                faces.push(base - 2, base - 1, base);
                faces.push(base - 1, base + 1, base);
            }
        }

        return { vertices: verts, faces: faces };
    }

    // Rotate helper for wings (sama)
    function rotateVerticesAroundPoint(obj, pivot, rotX, rotY, rotZ) {
        const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);

        const verts = [];
        for (let i = 0; i < obj.vertices.length; i += 9) {
            let x = obj.vertices[i] - pivot[0];
            let y = obj.vertices[i + 1] - pivot[1];
            let z = obj.vertices[i + 2] - pivot[2];

            // rotasi X
            let y1 = y * cosX - z * sinX;
            let z1 = y * sinX + z * cosX;
            y = y1; z = z1;

            // rotasi Y
            let x1 = x * cosY + z * sinY;
            z1 = -x * sinY + z * cosY;
            x = x1; z = z1;

            // rotasi Z
            x1 = x * cosZ - y * sinZ;
            y1 = x * sinZ + y * cosZ;
            x = x1; y = y1;

            // kembalikan offset ke pivot
            x += pivot[0];
            y += pivot[1];
            z += pivot[2];

            verts.push(
                x, y, z,
                obj.vertices[i + 3], obj.vertices[i + 4], obj.vertices[i + 5], // normal
                obj.vertices[i + 6], obj.vertices[i + 7], obj.vertices[i + 8]  // warna
            );
        }
        return { vertices: verts, faces: obj.faces };
    }

    // Transform vertices (sama)
    function transformVertices(obj, tx=0, ty=0, tz=0, sx=1, sy=1, sz=1, rotY=0, rotX=0, rotZ=0) {
        const out = { vertices: [], faces: obj.faces };
        const cY = Math.cos(rotY), sY = Math.sin(rotY);
        const cX = Math.cos(rotX), sX = Math.sin(rotX);
        const cZ = Math.cos(rotZ), sZ = Math.sin(rotZ);

        for (let i = 0; i < obj.vertices.length; i += 9) {
            let x = obj.vertices[i], y = obj.vertices[i+1], z = obj.vertices[i+2];
            let nx = obj.vertices[i+3], ny = obj.vertices[i+4], nz = obj.vertices[i+5];
            const r = obj.vertices[i+6], g = obj.vertices[i+7], b = obj.vertices[i+8];

            x *= sx; y *= sy; z *= sz;

            // Rotasi Z-Y-X
            let x0 = cZ*x - sZ*y, y0 = sZ*x + cZ*y; x=x0; y=y0;
            let x1 = cY*x + sY*z, z1 = -sY*x + cY*z; x=x1; z=z1;
            let y2 = cX*y - sX*z, z2 = sX*y + cX*z; y=y2; z=z2;

            out.vertices.push(x + tx, y + ty, z + tz, nx, ny, nz, r, g, b);
        }
        return out;
    }

    // ======== Colors ========
    const white = [0.92, 0.94, 1.0];
    const red = [0.9, 0.2, 0.2];
    const blue = [0.2, 0.3, 0.9];
    const black = [0.05,0.05,0.05];

    const parts = [];

    // ======== BODY & parts (sama seperti file asli, disusun ke parts array) ========
    const bodyColor = white;
    parts.push(generateEllipsoid(1.4, 1.6, 1.3, 36, 36, bodyColor));
    parts.push(transformVertices(generateEllipsoid(1.4, 0.35, 0.7, 24, 24, bodyColor),
        -1.45, -0.05, 0.0, 1.3, 0.6, 1.05, 0.0, 0.25, 0.65));
    parts.push(transformVertices(generateEllipsoid(1.4, 0.35, 0.7, 24, 24, bodyColor),
        1.45, -0.05, 0.0, 1.3, 0.6, 1.05, 0.0, 0.25, -0.65));
    parts.push(transformVertices(generateEllipsoid(0.95, 0.25, 0.45, 20, 20, bodyColor),
        -1.25, -0.35, 0.0, 1.0, 0.7, 1.0, 0.0, 0.2, 0.55));
    parts.push(transformVertices(generateEllipsoid(0.95, 0.25, 0.45, 20, 20, bodyColor),
        1.25, -0.35, 0.0, 1.0, 0.7, 1.0, 0.0, 0.2, -0.55));
    // legs
    parts.push(transformVertices(generateEllipsoid(0.18, 0.28, 0.18, 12, 12, bodyColor),
        -0.40, -1.65, 0.15));
    parts.push(transformVertices(generateEllipsoid(0.18, 0.28, 0.18, 12, 12, bodyColor),
        0.40, -1.65, 0.15));
    // eyes
    parts.push(transformVertices(generateEllipsoid(0.07, 0.15, 0.07, 10, 10, black),
        -0.28, 0.32, 1.2));
    parts.push(transformVertices(generateEllipsoid(0.07, 0.15, 0.07, 10, 10, black),
        0.28, 0.32, 1.2));
    // mouth
    function generateMouth(size, color) {
        const vertices = [
            0, -size * 0.45, 1.25, 0, 0, 1, color[0], color[1], color[2],
           -size * 0.45, size * 0.35, 1.25, 0, 0, 1, color[0], color[1], color[2],
            size * 0.45, size * 0.35, 1.25, 0, 0, 1, color[0], color[1], color[2],
        ];
        const faces = [0,1,2];
        return { vertices, faces };
    }
    // parts.push(transformVertices(
    //     generateMouth(0.20, [0.92, 0.20, 0.20]),
    //     0.0, 0, 0.06, 1,1,1, 0.0, -0.10, 0.0
    // ));
    
    // belly triangles (same)
    function makeBellyTriangle(x, y, z, size, color, tiltX = 0, tiltY = 0) {
        const verts = [
            0, size * 0.6, 0,   0, 0, 1, color[0], color[1], color[2],
           -size * 0.5, -size * 0.4, 0,   0, 0, 1, color[0], color[1], color[2],
            size * 0.5, -size * 0.4, 0,   0, 0, 1, color[0], color[1], color[2],
        ];
        const faces = [0, 1, 2];
        return transformVertices({ vertices: verts, faces }, x, y, z, 1, 1, 1, tiltY, tiltX, 0);
    }

    // parts.push(makeBellyTriangle(-0.40, -0.35, 1.22, 0.20, red, 0.18, -0.05));
    // parts.push(makeBellyTriangle(0.00, -0.30, 1.28, 0.20, blue, 0.24, 0.00));
    // parts.push(makeBellyTriangle(0.40, -0.35, 1.22, 0.20, red, 0.18, 0.05));
    // parts.push(makeBellyTriangle(-0.25, -0.65, 1.17, 0.20, blue, 0.38, -0.05));
    // parts.push(makeBellyTriangle(0.25, -0.65, 1.17, 0.20, red, 0.38, 0.05));
    // parts.push(makeBellyTriangle(0.00, -0.90, 1.08, 0.20, blue, 0.59, 0.00));

    // horns
    function generateHeadCone(height, radius, tiltBackDeg, tiltSideDeg, offset, col) {
        const vertices = [];
        const faces = [];
        const coneSegments = 20;
        
        const tiltBack = Math.tan(tiltBackDeg * Math.PI / 180);
        const tiltSide = Math.tan(tiltSideDeg * Math.PI / 180);

        const apexX = offset.x + height * tiltSide;
        const apexY = offset.y + height;
        const apexZ = offset.z + height * tiltBack;

        vertices.push(apexX, apexY, apexZ, 0, 1, 0, col[0], col[1], col[2]);

        for (let i = 0; i <= coneSegments; i++) {
            const ang = (i / coneSegments) * 2 * Math.PI;
            const x = offset.x + radius * Math.cos(ang);
            const y = offset.y;
            const z = offset.z + radius * Math.sin(ang);
            vertices.push(x, y, z, 0, 1, 0, col[0], col[1], col[2]);

            if (i < coneSegments) {
                faces.push(0, i + 1, i + 2);
            }
        }
        return { vertices, faces };
    }

    parts.push(transformVertices(
        generateHeadCone(0.8, 0.5, -40, 0,   {x: 0,    y: 1.45, z: 0.35}, bodyColor),
        0, -0.08, -0.1, 1, 1, 1
    ));
    parts.push(transformVertices(
        generateHeadCone(0.8, 0.5, -40, 48,  {x: 0.25, y: 1.45, z: 0.15}, blue),
        0, -0.08, -0.1, 1, 1, 1
    ));
    parts.push(transformVertices(
        generateHeadCone(0.8, 0.5, -40, -48, {x: -0.25, y: 1.45, z: 0.15}, red),
        0, -0.08, -0.1, 1, 1, 1
    ));

    // tail (same)
    parts.push(transformVertices(generateEllipsoid(0.24, 0.20, 0.45, 16, 16, bodyColor),
        0.0, -0.28, -1.55, 1,1,1, 0.0, 0.45, 0.0));
    parts.push(transformVertices(generateEllipsoid(0.20, 0.18, 0.38, 16, 16, bodyColor),
        -0.32, -0.30, -1.45, 1,1,1, 0.28, 0.42, -0.18));
    parts.push(transformVertices(generateEllipsoid(0.20, 0.18, 0.38, 16, 16, bodyColor),
        0.32, -0.30, -1.45, 1,1,1, -0.28, 0.42, 0.18));

    // Clean parts & combine initial buffers (we will update vertex buffer dynamically in animate)
    const cleanParts = parts.filter(p => p && p.vertices && p.faces);

    let vertices = [], faces = [];
    let offset = 0;
    for (const p of cleanParts) {
        vertices = vertices.concat(p.vertices);
        for (const f of p.faces) faces.push(f + offset);
        offset += p.vertices.length / 9;
    }

    const vertexBuffer = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(vertices), GL.DYNAMIC_DRAW);

    const indexBuffer = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), GL.DYNAMIC_DRAW);

    // ======== MATRICES + LIGHTING ========
    const PROJMATRIX = TOGEKISS_LIBS.get_projection(45, CANVAS.width / CANVAS.height, 0.1, 100);
    const MOVEMATRIX = TOGEKISS_LIBS.get_I4();
    const VIEWMATRIX = TOGEKISS_LIBS.get_I4();
    TOGEKISS_LIBS.translateZ(VIEWMATRIX, -18);

    GL.enable(GL.DEPTH_TEST);
    //GL.clearColor(0.9, 0.95, 1.0, 1.0);

    let rotX = 0;
    let rotY = 0;
    let dragging = false;
    let lastX, lastY;

    CANVAS.addEventListener("mousedown", e => {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    CANVAS.addEventListener("mouseup", () => dragging = false);

    CANVAS.addEventListener("mousemove", e => {
        if (dragging) {
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            rotY += dx * 0.01;
            rotX += dy * 0.01;
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });

    // ======== ANIMATION STATE (walk -> jump -> fly) ========
    let startTime = performance.now();

    // state machine
    let state = "walk"; // "walk" | "jump" | "fly"
    let modelZ = -5.0; // mulai dari belakang (lebih negatif = lebih jauh)
    let modelY = -0.4; // baseline vertical offset (di badan)
    const walkTargetZ = 0.8; // titik depan yang dicapai → lalu lompat
    const walkSpeed = 1.2; // unit per detik
    let jumpStart = 0;
    const jumpDuration = 0.7; // total durasi lompat (naik + turun)
    const jumpHeight = 1.6;
    let flyStart = 0;

    function animate() {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        // Waktu (detik)
        const now = performance.now();
        const time = (now - startTime) * 0.001;

        // default flap frequency & amplitude (akan dimodifikasi sesuai state)
        let flapFreq = 3.0; // Hz-ish (digunakan di sin)
        let flapAmp = 0.6;  // radian

        // STATE MACHINE: update modelZ & modelY based on state
        if (state === "walk") {
            // bergerak maju pada sumbu Z (ke nilai yang lebih besar)
            const dz = walkSpeed * (1/60); // per frame kira-kira; agar independen gunakan dt
            // gunakan dt lebih tepat:
            // dt dalam detik
            const dt = 0.001 * (now - (animate._lastNow || now));
            animate._lastNow = now;
            modelZ += walkSpeed * dt;
            // saat mencapai target → mulai jump
            if (modelZ >= walkTargetZ) {
                state = "jump";
                jumpStart = now;
            }
        } else if (state === "jump") {
            // lompat: gunakan kurva parabola (0..1..0)
            const t = (now - jumpStart) * 0.001;
            const p = Math.min(t / jumpDuration, 1.0);
            // parabola naik-turun: y = 4p(1-p) * jumpHeight
            const jumpY = 4.0 * p * (1.0 - p) * jumpHeight;
            modelY = -0.4 + jumpY;
            // pada saat p mendekati 1 → transisi ke fly
            if (p >= 1.0) {
                state = "fly";
                flyStart = now;
            }
            // sedikit percepatan flap saat lompat
            flapFreq = 5.0;
            flapAmp = 1.0;
        }   else if (state === "fly") {
            const tFly = (now - flyStart) * 0.001;

            // posisi dasar hover (naik turun kecil)
            let modelX = 0.0;
            modelY = -0.4 + 1.0 + 0.2 * Math.sin(tFly * 3.5);
            let modelZ = walkTargetZ + 0.5;
            let lookAngleY = 0.0; // rotasi nengok kanan/kiri
            let bodyTiltX = 0.35; // sedikit condong ke atas saat terbang

            if (tFly < 2.0) {
                // 0–2 detik → hover di tempat
                modelX = 0.0;
                modelZ = walkTargetZ + 0.5;
            } else if (tFly < 4.0) {
                // 2–4 detik → geser ke kanan sambil nengok kanan
                const phase = (tFly - 2.0) / 2.0; // 0→1
                modelX = phase * 2.0; // ke kanan
                lookAngleY = phase * 0.6; // nengok kanan pelan (rad)
            } else if (tFly < 6.0) {
                // 4–6 detik → balik ke posisi awal sambil turun perlahan
                const phase = (tFly - 4.0) / 2.0; // 0→1
                modelX = 2.0 - phase * 2.0; // kanan → tengah
                lookAngleY = (1.0 - phase) * 0.6; // balik lihat depan
                modelY = (-0.4 + 1.0) * (1.0 - phase) + (-0.4) * phase + 0.2 * Math.sin(tFly * 3.5);
            } else {
                // kembali diam di posisi awal (selesai animasi)
                modelX = 0.0;
                modelY = -0.4;
                modelZ = walkTargetZ + 0.5;
                state = "idle"; // masuk mode diam
            }

            // flap cepat saat terbang
            flapFreq = 6.0;
            flapAmp = 1.2;

            // terapkan transformasi matriks model (dengan rotasi nengok)
            TOGEKISS_LIBS.set_I4(MOVEMATRIX);
            TOGEKISS_LIBS.rotateX(MOVEMATRIX, rotX + bodyTiltX);
            TOGEKISS_LIBS.rotateY(MOVEMATRIX, rotY + lookAngleY);

            if (typeof TOGEKISS_LIBS.translate === "function") {
                TOGEKISS_LIBS.translate(MOVEMATRIX, modelX, modelY, modelZ);
            } else {
                if (typeof TOGEKISS_LIBS.translateX === "function") TOGEKISS_LIBS.translateX(MOVEMATRIX, modelX);
                if (typeof TOGEKISS_LIBS.translateY === "function") TOGEKISS_LIBS.translateY(MOVEMATRIX, modelY);
                if (typeof TOGEKISS_LIBS.translateZ === "function") TOGEKISS_LIBS.translateZ(MOVEMATRIX, modelZ);
            }
        }




        // jika masih belum set animate._lastNow (pertama kali), set sekarang
        if (!animate._lastNow) animate._lastNow = now;

        // ======== Matriks utama kamera & model transform ========
                // ======== Matriks utama kamera & model transform (gabungan dengan animasi) ========
        TOGEKISS_LIBS.set_I4(MOVEMATRIX);

        let modelX = 0.0;
        let lookAngleY = 0.0;
        let bodyTiltX = 0.0;

        // gabungkan posisi & rotasi berdasarkan state
        if (state === "fly") {
            const tFly = (now - flyStart) * 0.001;

            if (tFly < 2.0) {
                modelX = 0.0;
                modelZ = walkTargetZ + 0.5;
                modelY = -0.4 + 1.0 + 0.2 * Math.sin(tFly * 3.5);
            } else if (tFly < 4.0) {
                const phase = (tFly - 2.0) / 2.0;
                modelX = phase * 2.0;
                lookAngleY = phase * 0.6;
                modelZ = walkTargetZ + 0.5;
                modelY = -0.4 + 1.0 + 0.2 * Math.sin(tFly * 3.5);
            } else if (tFly < 6.0) {
                const phase = (tFly - 4.0) / 2.0;
                modelX = 2.0 - phase * 2.0;
                lookAngleY = (1.0 - phase) * 0.6;
                modelY = (-0.4 + 1.0) * (1.0 - phase) + (-0.4) * phase + 0.2 * Math.sin(tFly * 3.5);
                modelZ = walkTargetZ + 0.5;
            } else {
                modelX = 0.0;
                modelY = -0.4;
                modelZ = walkTargetZ + 0.5;
                state = "idle";
            }

            bodyTiltX = 0.35;
        }

        // apply semua transformasi dengan urutan benar
        TOGEKISS_LIBS.rotateX(MOVEMATRIX, rotX + bodyTiltX);
        TOGEKISS_LIBS.rotateY(MOVEMATRIX, rotY + lookAngleY);
        if (typeof TOGEKISS_LIBS.translate === "function") {
            TOGEKISS_LIBS.translate(MOVEMATRIX, modelX, modelY, modelZ);
        } else {
            if (typeof TOGEKISS_LIBS.translateX === "function") TOGEKISS_LIBS.translateX(MOVEMATRIX, modelX);
            if (typeof TOGEKISS_LIBS.translateY === "function") TOGEKISS_LIBS.translateY(MOVEMATRIX, modelY);
            if (typeof TOGEKISS_LIBS.translateZ === "function") TOGEKISS_LIBS.translateZ(MOVEMATRIX, modelZ);
        }


        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

        // ======== Membuat kembali bagian-bagian (animatedParts) dengan rotasi sayap sesuai flap angle ========
        let animatedParts = [];

        // === Animasi kaki ===
        const leftLeg = parts[5];
        const rightLeg = parts[6];
        const pivotL = [-0.40, -1.45, 0.15];
        const pivotR = [0.40, -1.45, 0.15];

        if (state === "walk") {
            const stepAngle = Math.sin(time * 6.0) * 0.4;
            const rotatedL = rotateVerticesAroundPoint(leftLeg, pivotL, stepAngle, 0, 0);
            const rotatedR = rotateVerticesAroundPoint(rightLeg, pivotR, -stepAngle, 0, 0);
            animatedParts.push(rotatedL, rotatedR);
        } else if (state === "jump" || state === "fly") {
            const bend = (state === "jump") ? -0.4 : -0.6;
            const rotatedL = rotateVerticesAroundPoint(leftLeg, pivotL, bend, 0, 0);
            const rotatedR = rotateVerticesAroundPoint(rightLeg, pivotR, bend, 0, 0);
            animatedParts.push(rotatedL, rotatedR);
        } else if (state === "idle") {
            const relax = Math.max(-0.6 + 0.3 * Math.sin(time * 2.0), 0); // naik-turun kecil
            const rotatedL = rotateVerticesAroundPoint(leftLeg, pivotL, relax, 0, 0);
            const rotatedR = rotateVerticesAroundPoint(rightLeg, pivotR, relax, 0, 0);
            animatedParts.push(rotatedL, rotatedR);
        }



        // === BODY ===
        // saat terbang, beri sedikit tilt ke atas (pitch) agar terlihat "naik"

        if (state === "fly") bodyTiltX = -0.35; // membungkuk ke atas (rad)
        animatedParts.push(transformVertices(generateEllipsoid(1.4, 1.6, 1.3, 36, 36, white),
            0, 0, 0, 1, 1, 1, 0, bodyTiltX, 0));

        // === Tambahkan mulut dan pola perut ke tubuh ===
        animatedParts.push(transformVertices(
            generateMouth(0.20, [0.92, 0.20, 0.20]),
        0.0, 0, 0.06, 1,1,1, 0.0, bodyTiltX*0.49, 0.0
        ));

        // Pola perut (segitiga warna)
        let bellyYOffset = (state === "fly") ? -0.3 : 0.0;
        let bellyZOffset = (state === "fly") ? -0.06 : 0.0;
        animatedParts.push(transformVertices(makeBellyTriangle(-0.40, -0.35+ bellyYOffset, 1.22+bellyZOffset, 0.20, red, 0.18, -0.05), 0, 0, 0, 1, 1, 1, 0, bodyTiltX, 0));
        animatedParts.push(transformVertices(makeBellyTriangle(0.00, -0.30+ bellyYOffset, 1.28+bellyZOffset, 0.20, blue, 0.24, 0.00),    0, 0, 0, 1, 1, 1, 0, bodyTiltX, 0));
        animatedParts.push(transformVertices(makeBellyTriangle(0.40, -0.35+ bellyYOffset, 1.22+bellyZOffset, 0.20, red, 0.18, 0.05),    0, 0, 0, 1, 1, 1, 0, bodyTiltX, 0));
        animatedParts.push(transformVertices(makeBellyTriangle(-0.25, -0.65+ bellyYOffset, 1.17+bellyZOffset, 0.20, blue, 0.38, -0.05), 0, 0, 0, 1, 1, 1, 0, bodyTiltX, 0));
        animatedParts.push(transformVertices(makeBellyTriangle(0.25, -0.65+ bellyYOffset, 1.17+bellyZOffset, 0.20, red, 0.38, 0.05),    0, 0, 0, 1, 1, 1, 0, bodyTiltX, 0));
        animatedParts.push(transformVertices(makeBellyTriangle(0.00, -0.90+ bellyYOffset, 1.08+bellyZOffset, 0.20, blue, 0.59, 0.00),   0, 0, 0, 1, 1, 1, 0, bodyTiltX, 0));


        // compute flap angle from time and state-specific frequency/amplitude
        const flapAngle = Math.sin(time * flapFreq) * flapAmp; // radian

        // === SAYAP KIRI ===
        {
            const wingGroup = [];

            wingGroup.push(transformVertices(generateEllipsoid(1.4, 0.35, 0.7, 24, 24, white),
                -1.45, -0.05, 0.0, 1, 0.6, 1.05, 0, 0.25, 0.65));

            wingGroup.push(transformVertices(generateEllipsoid(0.95, 0.25, 0.45, 20, 20, white),
                -1.25, -0.35, 0.0, 1.0, 0.7, 1.0, 0, 0.2, 0.55));

            wingGroup.push(transformVertices(generateNURBSCurvePattern(-1, [0, 0, 0]),
                0.01, -0.4, -0.55
            ));

            const wingRoot = [-1.2, 0.0, 0.0];

            // rotasi seluruh grup sayap kiri (naik-turun alami)
            for (const part of wingGroup) {
                // saat lompatan/terbang, tambahkan rotasi outwards sedikit (untuk takeoff feel)
                const extra = (state === "jump" || state === "fly") ? -0.25 : 0.0;
                const rotated = rotateVerticesAroundPoint(part, wingRoot, 0, 0, flapAngle + extra);
                animatedParts.push(rotated);
            }
        }

        // === SAYAP KANAN ===
        {
            const wingGroup = [];

            wingGroup.push(transformVertices(generateEllipsoid(1.4, 0.35, 0.7, 24, 24, white),
                1.45, -0.05, 0.0, 1, 0.6, 1.05, 0, 0.25, -0.65));

            wingGroup.push(transformVertices(generateEllipsoid(0.95, 0.25, 0.45, 20, 20, white),
                1.25, -0.35, 0.0, 1.0, 0.7, 1.0, 0, 0.2, -0.55));

            wingGroup.push(transformVertices(generateNURBSCurvePattern(1, [0, 0, 0]),
                0.01, -0.4, -0.55
            ));

            const wingRoot = [1.2, 0.0, 0.0];

            for (const part of wingGroup) {
                const extra = (state === "jump" || state === "fly") ? 0.25 : 0.0;
                const rotated = rotateVerticesAroundPoint(part, wingRoot, 0, 0, -flapAngle + extra);
                animatedParts.push(rotated);
            }
        }

        // === sisanya (selain tubuh & sayap) ===
        for (let i = 1; i < parts.length; i++) {
            // skip sayap 1..4 are wings already animated; these indices may vary depending on how parts is constructed
            // lewati sayap dan kaki (karena sudah dianimasikan manual di atas)
            if (i >= 1 && i <= 4) continue;
            if (i === 5 || i === 6) continue;
            animatedParts.push(parts[i]);
        }

        // === Gabungkan semua vertex & faces ===
        let vertsAll = [], facesAll = [];
        let off = 0;
        for (const p of animatedParts) {
            vertsAll = vertsAll.concat(p.vertices);
            for (const f of p.faces) facesAll.push(f + off);
            off += p.vertices.length / 9;
        }

        // === Upload ke GPU ===
        GL.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer);
        GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(vertsAll), GL.DYNAMIC_DRAW);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer);
        GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(facesAll), GL.DYNAMIC_DRAW);

        // Lighting uniform
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);
        GL.uniform3fv(_lightDirection, [0.8, 1.0, 0.55]);
        GL.uniform3fv(_lightColor, [1.0, 0.98, 0.94]);
        GL.uniform3fv(_ambientColor, [0.38, 0.38, 0.42]);
        GL.uniform3fv(_viewPosition, [0.0, 0.0, 6.0]);

        // Attribute pointers
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 36, 0);
        GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false, 36, 12);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 36, 24);

        GL.drawElements(GL.TRIANGLES, facesAll.length, GL.UNSIGNED_SHORT, 0);

        requestAnimationFrame(animate);
    }
// ===== Tambahkan delay 2 detik sebelum mulai bergerak =====
setTimeout(() => {
    animate(); // mulai animasi setelah 2 detik
}, 7500);
}
window.addEventListener("load", main);

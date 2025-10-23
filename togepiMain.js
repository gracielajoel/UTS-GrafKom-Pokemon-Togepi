function mainTogepi(offsetX= 0) {
    /** @type {HTMLCanvasElement} */
    const CANVAS = document.getElementById("togepi");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    /** @type {WebGLRenderingContext} */
    const GL = CANVAS.getContext("webgl", { antialias: true });
    if (!GL) {
        alert("WebGL tidak didukung oleh browser ini.");
        return;
    }

    /*========================= SHADERS =========================*/
    const shader_vertex_source = `
        attribute vec3 position;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);
        }`;

    const shader_fragment_source = `
        precision mediump float;
        uniform vec4 uColor;
        void main(void) {
            gl_FragColor = uColor;
        }`;

    function compile_shader(src, type, name) {
        const shader = GL.createShader(type);
        GL.shaderSource(shader, src);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + name + " SHADER: " + GL.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    const shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    const shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    const SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);
    GL.linkProgram(SHADER_PROGRAM);
    GL.useProgram(SHADER_PROGRAM);

    const _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    const _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    const _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    const _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");
    const _uColor = GL.getUniformLocation(SHADER_PROGRAM, "uColor");
    GL.enableVertexAttribArray(_position);

    /*===================== LIB MATRIX =====================*/
    const TOGEPI_LIBS = {
        get_I4: () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
        set_I4: m => { for(let i=0;i<16;i++) m[i]=(i%5==0)?1:0; },
        rotateX: (m, a) => {
            const c=Math.cos(a), s=Math.sin(a);
            const m1 = m[1], m2 = m[2], m5 = m[5], m6 = m[6], m9 = m[9], m10 = m[10];
            m[1] = m1*c - m2*s; m[2] = m1*s + m2*c;
            m[5] = m5*c - m6*s; m[6] = m5*s + m6*c;
            m[9] = m9*c - m10*s; m[10] = m9*s + m10*c;
        },
        rotateY: (m, a) => {
            const c=Math.cos(a), s=Math.sin(a);
            const m0=m[0], m2=m[2], m4=m[4], m6=m[6], m8=m[8], m10=m[10];
            m[0] = m0*c + m2*s; m[2] = -m0*s + m2*c;
            m[4] = m4*c + m6*s; m[6] = -m4*s + m6*c;
            m[8] = m8*c + m10*s; m[10] = -m8*s + m10*c;
        },
        rotateZ: (m, a) => {
            const c=Math.cos(a), s=Math.sin(a);
            const m0=m[0], m1=m[1], m4=m[4], m5=m[5], m8=m[8], m9=m[9];
            m[0] = m0*c - m1*s; m[1] = m0*s + m1*c;
            m[4] = m4*c - m5*s; m[5] = m4*s + m5*c;
            m[8] = m8*c - m9*s; m[9] = m8*s + m9*c;
        },
        translateZ: (m,t)=>{ m[14] += t; },
        get_projection: function(angle, a, zMin, zMax) {
            const ang = Math.tan((angle * 0.5) * Math.PI / 180);
            return [
                0.5/ang, 0, 0, 0,
                0, 0.5*a/ang, 0, 0,
                0, 0, -(zMax+zMin)/(zMax-zMin), -1,
                0, 0, (-2*zMax*zMin)/(zMax-zMin), 0
            ];
        }
    };

    /*===================== MODEL TELUR (CRACKED) =====================*/
    const egg_vertex = [];
    const egg_faces = [];
    const slices = 96;
    const stacks = 80;
    const a = 0.6, b = 0.65, c = 0.6;

    const startStack = Math.floor(stacks * 0.25);
    const baseDepth = 5.0;
    const lateralScale = 0.4;

    function pseudoNoise(t, seed) {
        return Math.sin(t * 127.1 + seed * 311.7) * 0.5 +
               Math.sin(t * 311.7 + seed * 127.1) * 0.25;
    }

    function crackWaveBezier(phi) { //rumus bzier
        const t = (phi % (2 * Math.PI)) / (2 * Math.PI);
        const toothCount = 10;
        const segT = (t * toothCount) % 1.0;
        const segIndex = Math.floor(t * toothCount);
        const direction = (segIndex % 2 === 0) ? 1 : -1;

        const seed = segIndex * 2.5;
        const heightVar = 0.3 + 0.25 * (0.5 + pseudoNoise(seed * 3.7, 2.2));
        const tilt = 0.15 * pseudoNoise(seed * 7.1, 1.3);

        const P0 = 0.0;
        const P1 = heightVar * (0.35 + tilt) * direction;
        const P2 = heightVar * (0.65 - tilt) * direction;
        const P3 = 0.0;

        let y =
            Math.pow(1 - segT, 3) * P0 +
            3 * Math.pow(1 - segT, 2) * segT * P1 +
            3 * (1 - segT) * Math.pow(segT, 2) * P2 +
            Math.pow(segT, 3) * P3;

        const smallNoise = 0.05 * pseudoNoise(t * 18.3, 6.7);
        y += smallNoise;
        y = Math.abs(y);

        const envelope = 0.5 + 0.3 * Math.sin(t * Math.PI);
        y *= envelope;
        return y;
    }

    const topY = b * Math.cos(startStack * Math.PI / stacks);
    const maxPenetration = (b - topY) * baseDepth;

    for (let i = startStack; i <= stacks; i++) {
        const theta = i * Math.PI / stacks;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        const yBase = b * cosTheta;
        const ringIdx = i - startStack;
        const penetrationRings = Math.max(3, Math.floor((stacks - startStack) * 0.6));
        const ringFactor = Math.max(0, 1 - ringIdx / penetrationRings);


        //rumus elips dalam loop 
        for (let j = 0; j <= slices; j++) {
            const phi = j * 2 * Math.PI / slices;
            let x = a * sinTheta * Math.cos(phi);
            let z = c * sinTheta * Math.sin(phi);
            let y = yBase;

            if (ringIdx <= penetrationRings) {
                const wave = crackWaveBezier(phi);
                const localDepth = Math.max(0, wave) * ringFactor * maxPenetration *
                                   (0.9 + 0.2 * pseudoNoise((phi % (2*Math.PI)) / (2*Math.PI) * 5.0, 4.1));
                y -= localDepth;

                const radial = Math.sqrt(x * x + z * z) + 1e-6;
                const nx = x / radial;
                const nz = z / radial;
                x -= nx * (localDepth * lateralScale);
                z -= nz * (localDepth * lateralScale);
            }

            egg_vertex.push(x, y, z);
        }
    }

    const newStacks = stacks - startStack;
    for (let i = 0; i < newStacks; i++) {
        for (let j = 0; j < slices; j++) {
            const first = i * (slices + 1) + j;
            const second = first + slices + 1;
            egg_faces.push(first, second, first + 1);
            egg_faces.push(second, second + 1, first + 1);
        }
    }

    /*===================== Kepala =====================*/
    function createCylinder(radiusBottom, radiusTop, height, slices) {
        const verts = [];
        const faces = [];
        for (let i = 0; i <= 1; i++) {
            const y = (i - 0.5) * height;
            const radius = i === 0 ? radiusBottom : radiusTop;
            for (let j = 0; j <= slices; j++) {
                const theta = j * 2 * Math.PI / slices;
                const x = radius * Math.cos(theta); //rumus cylinder
                const z = radius * Math.sin(theta);
                verts.push(x, y, z);
            }
        }
        for (let i = 0; i < slices; i++) {
            const p1 = i;
            const p2 = i + slices + 1;
            const p3 = p1 + 1;
            const p4 = p2 + 1;
            faces.push(p1, p2, p3);
            faces.push(p3, p2, p4);
        }
        return { verts, faces };
    }

    function createEllipsoid(rx, ry, rz, slices, stacks, cutTop = 1.0, openTop = 0.0) {
        const verts = [];
        const faces = [];
        const startStack = Math.floor(stacks * openTop);
        const endStack = Math.floor(stacks * cutTop);

        //rumus elips
        for (let i = startStack; i <= endStack; i++) {
            const theta = i * Math.PI / stacks;
            for (let j = 0; j <= slices; j++) {
                const phi = j * 2 * Math.PI / slices;
                const x = rx * Math.sin(theta) * Math.cos(phi);
                const y = ry * Math.cos(theta);
                const z = rz * Math.sin(theta) * Math.sin(phi);
                verts.push(x, y, z);
            }
        }

        for (let i = 0; i < endStack - startStack; i++) {
            for (let j = 0; j < slices; j++) {
                const first = i * (slices + 1) + j;
                const second = first + slices + 1;
                faces.push(first, second, first + 1);
                faces.push(second, second + 1, first + 1);
            }
        }
        return { verts, faces };
    }

    // === Kerucut (cone) untuk tanduk Togepi ===
    function createCone(radius, height, slices) {
        const verts = [];
        const faces = [];
        verts.push(0, height / 2, 0); // titik atas
        for (let i = 0; i <= slices; i++) {
            const theta = (i / slices) * 2 * Math.PI;
            const x = radius * Math.cos(theta); //rumus cone
            const z = radius * Math.sin(theta);
            verts.push(x, -height / 2, z);
        }
        // sisi
        for (let i = 1; i <= slices; i++) {
            faces.push(0, i, i + 1);
        }
        return { verts, faces };
    }

    const arm = createCylinder(0.06, 0.18, 0.35, 130);
    const foot = createEllipsoid(0.15, 0.09, 0.18, 48, 32);
    const head = createEllipsoid(0.44, 0.5, 0.42, 64, 48, 1.0, 0.3);
    const horn = createCone(0.2, 0.3, 24); // tanduk lebih kecil

    /*===================== BUFFER =====================*/
    function createBuffer(obj) {
        const vBuf = GL.createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, vBuf);
        GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(obj.verts), GL.STATIC_DRAW);
        const fBuf = GL.createBuffer();
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, fBuf);
        GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.faces), GL.STATIC_DRAW);
        return { vBuf, fBuf, count: obj.faces.length };
    }

    const eggBuf = createBuffer({ verts: egg_vertex, faces: egg_faces });
    const armBuf = createBuffer(arm);
    const footBuf = createBuffer(foot);
    const headBuf = createBuffer(head);
    const hornBuf = createBuffer(horn);

    /*===================== MATRICES =====================*/
    let PROJMATRIX = TOGEPI_LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    const MOVEMATRIX = TOGEPI_LIBS.get_I4();
    const VIEWMATRIX = TOGEPI_LIBS.get_I4();
    TOGEPI_LIBS.translateZ(VIEWMATRIX, -10);
    
    MOVEMATRIX[12] = offsetX;


    /*=================== KONTROL ===================*/
    let dragging = false, oldX, oldY, rotationY = 0, rotationX = 0;
    CANVAS.addEventListener("mousedown", e => { dragging = true; oldX = e.pageX; oldY = e.pageY; e.preventDefault(); });
    CANVAS.addEventListener("mouseup", () => dragging = false);
    CANVAS.addEventListener("mousemove", e => {
        if (!dragging) return;
        const dX = (e.pageX - oldX) * Math.PI / 180;
        const dY = (e.pageY - oldY) * Math.PI / 180;
        rotationY += dX * 2;
        rotationX += dY * 2;
        oldX = e.pageX;
        oldY = e.pageY;
    });

    /*========================= ANIMATE =========================*/
    GL.enable(GL.DEPTH_TEST);
    GL.clearColor(0.0, 0.0, 0.0, 0.0);
    GL.clearDepth(1.0);

    function drawObject(buf, color, matrix) {
        GL.bindBuffer(GL.ARRAY_BUFFER, buf.vBuf);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, buf.fBuf);
        GL.uniform4fv(_uColor, color);
        GL.uniformMatrix4fv(_Mmatrix, false, matrix);
        GL.drawElements(GL.TRIANGLES, buf.count, GL.UNSIGNED_SHORT, 0);
    }

    function rotateVector(v, rotX, rotY) {
        const [x, y, z] = v;
        let cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        let y1 = y * cosX - z * sinX;
        let z1 = y * sinX + z * cosX;
        let cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        let x2 = x * cosY + z1 * sinY;
        let z2 = -x * sinY + z1 * cosY;
        return [x2, y1, z2];

    }

    // waktu mulai untuk animasi translasi maju
    let startTime = performance.now();
    let isJumping = false;
    let yJump = 0.0;
    let vy = 0.0;
    const gravity = 6.0;
    const jumpVel = 2.2;
    const walkSpeed = 0.6;
    const stopDistance = 1.0; // berhenti di titik ini
    const loopLength = 6.0;
    const bobAmplitude = 0.06;
    const bobFreq = 3.0;
    const stepFreq = 6.0;
    const stepAngle = 0.45;
    let jumpCount = 0;
    const maxJump = 3;
    let isSpinning = false;
    let spinAngle = 0;
    let isGone = false;
    let disappearStart = 0;
    let explosionStart = 0;
    let explosionParticles = [];
    let sparkleActive = false;
let sparkleStart = 0;
let sparkles = [];




    function animate() {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        const t = (performance.now() - startTime) / 1000.0;

        // === Gerak maju sampai berhenti ===
        // === Gerak maju sampai berhenti ===
    let forward = t * walkSpeed;
    if (forward > stopDistance) forward = stopDistance;

    // waktu berhenti (saat sampai)
    const stopTime = stopDistance / walkSpeed;

    // mulai lompat setelah 1 detik diam
    if (t > stopTime + 1.0 && !isJumping && yJump === 0.0 && jumpCount < maxJump) {
        isJumping = true;
        vy = jumpVel;
        jumpCount++;
    }

    // logika lompat
    const delta = 0.016;
    if (isJumping) {
        yJump += vy * delta;
        vy -= gravity * delta;
        if (yJump <= 0.0) {
            yJump = 0.0;
            isJumping = false;
        }
    }

    // setelah 3 kali lompat, mulai spin
    if (!isJumping && yJump === 0.0 && jumpCount >= maxJump && !isSpinning && !isGone) {
        isSpinning = true;
        spinAngle = 0;
    }

    // update rotasi spin
    if (isSpinning) {
        spinAngle += 720 * delta; // kecepatan putaran
        if (spinAngle >= 360) { // setelah 1 putaran penuh
            spinAngle = 360;
            isSpinning = false;
            isGone = true;
            disappearStart = performance.now();

            // 💥 mulai efek ledakan
            explosionStart = disappearStart;
            explosionParticles = [];
            for (let i = 0; i < 80; i++) {
                explosionParticles.push({
                    pos: [0, 0.5, 0], // dari posisi kepala Togepi
                    vel: [
                        (Math.random() - 0.5) * 2.5,
                        (Math.random() - 0.2) * 3.0,
                        (Math.random() - 0.5) * 2.5
                    ],
                    life: Math.random() * 1.0 + 0.5,
                });
            }
        }
    }



    // bobbing jalan
    const zOsc = (forward < stopDistance)
        ? bobAmplitude * Math.sin(t * bobFreq)
        : 0.0;

    const totalZ = forward + zOsc;
    const totalY = yJump; // posisi vertikal lompat

    // buat MOVEMATRIX (rotasi kamera/model) dan terapkan totalZ
    TOGEPI_LIBS.set_I4(MOVEMATRIX);
    TOGEPI_LIBS.rotateX(MOVEMATRIX, rotationX);

    // 🌀 putar kalau sedang spin
    if (isSpinning || isGone) {
        TOGEPI_LIBS.rotateY(MOVEMATRIX, rotationY + spinAngle * Math.PI / 180);
    } else {
        TOGEPI_LIBS.rotateY(MOVEMATRIX, rotationY);
    }

    MOVEMATRIX[13] = totalY;
    MOVEMATRIX[14] = totalZ;

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);

            let fade = 1.0;
    if (isGone) {
        const dt = (performance.now() - disappearStart) / 1000.0;
        fade = Math.max(1.0 - dt * 0.8, 0.0); // hilang dalam ~1.2 detik
        if (fade === 0.0) return; // stop render saat sudah hilang total
    }

    // contoh panggilan draw:
    drawObject(eggBuf, [1, 1, 1, fade], MOVEMATRIX);


        // === Warna Togepi ===
        const COLOR_SHELL = [0.96, 0.94, 0.85, 1.0];          // putih
        const COLOR_BODY  = [0.98, 0.88, 0.68, 1.0];        // krem sangat muda kekuningan
        const COLOR_ARM   = [0.98, 0.88, 0.68, 1.0];        // krem sangat muda kekuningan
        const COLOR_FOOT  = [0.93, 0.82, 0.58, 1.0];        // krem sangat muda kekuningan
        const COLOR_RED   = [0.85, 0.1, 0.12, 1.0];        // merah motif
        const COLOR_BLUE  = [0.03, 0.28, 0.85, 1.0];       // biru motif
        const COLOR_EYE   = [0.1, 0.1, 0.1, 1.0];          // hitam mata

        // cangkang (telur) — pakai MOVEMATRIX sehingga ikut maju
        drawObject(eggBuf, COLOR_SHELL, MOVEMATRIX);

        // tangan (ikut totalZ)
        const arms = [
            [0.62, -0.05, 0.0],   // kanan
            [-0.62, -0.05, 0.0],  // kiri
        ];
        arms.forEach((a, i) => {
            const pos = rotateVector(a, rotationX, rotationY);
            const M = TOGEPI_LIBS.get_I4();
            const angle = (i === 0) ? Math.PI / 2.3 : -Math.PI / 2.3;
            TOGEPI_LIBS.rotateZ(M, angle);
            M[12] = pos[0];
            M[13] = pos[1]+ yJump;
            M[14] = pos[2] + totalZ;
            drawObject(armBuf, COLOR_ARM, M);
        });

        // kaki dengan sedikit swing agar terasa berjalan
        const feet = [
            [-0.28, -0.62, 0.2],
            [0.28, -0.62, 0.2],
        ];
        feet.forEach((f, i) => {
            const pos = rotateVector(f, rotationX, rotationY);
            const M = TOGEPI_LIBS.get_I4();
            // salin rotasi global (agar kaki mengikuti orientasi kamera)
            TOGEPI_LIBS.rotateX(M, rotationX);
            TOGEPI_LIBS.rotateY(M, rotationY);

            // langkah: kanan dan kiri berlawanan fase
            const phase = (i === 0) ? 0 : Math.PI;
            const swing = Math.sin(t * stepFreq + phase) * stepAngle * 0.6; // rotasi kecil
            TOGEPI_LIBS.rotateX(M, swing);

            // set posisi (translation) setelah rotasi lokal
            M[12] = pos[0];
            M[13] = pos[1]+ yJump;
            M[14] = pos[2] + totalZ;
            drawObject(footBuf, COLOR_FOOT, M);
        });

        // kepala
        const headLocal = [0.0, 0.63, 0.0];
        const headPos = rotateVector(headLocal, rotationX, rotationY);
        const M_HEAD = TOGEPI_LIBS.get_I4();
        TOGEPI_LIBS.rotateX(M_HEAD, rotationX);
        if (isSpinning || isGone) {
            TOGEPI_LIBS.rotateY(M_HEAD, rotationY + spinAngle * Math.PI / 180);
        } else {
            TOGEPI_LIBS.rotateY(M_HEAD, rotationY);
        }

        M_HEAD[12] = headPos[0];
        M_HEAD[13] = headPos[1]+ yJump;
        M_HEAD[14] = headPos[2] + totalZ;
        drawObject(headBuf, COLOR_BODY, M_HEAD);

        // === Mulut segitiga (∇) ===
        {
            const mouthCenter = [0.0, -0.1, 0.36];  // relatif terhadap kepala
            const size = 0.1;
            const offsetZ = 0.08;
            const bluntHalf = 0.012;

            const p1 = [mouthCenter[0] - size / 2, mouthCenter[1] + size / 2, mouthCenter[2] + offsetZ];
            const p2 = [mouthCenter[0] + size / 2, mouthCenter[1] + size / 2, mouthCenter[2] + offsetZ];
            const bottomY = mouthCenter[1] - size / 2;
            const p3a = [mouthCenter[0] + bluntHalf, bottomY, mouthCenter[2] + offsetZ];
            const p3b = [mouthCenter[0] - bluntHalf, bottomY, mouthCenter[2] + offsetZ];
            const rawVerts = [...p1, ...p2, ...p3a, ...p3b];


            const mouthV = GL.createBuffer();
            GL.bindBuffer(GL.ARRAY_BUFFER, mouthV);
            GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(rawVerts), GL.STATIC_DRAW);
            GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);

            // aktifkan polygon offset agar selalu “menang” di depan kepala
            GL.enable(GL.POLYGON_OFFSET_FILL);
            GL.polygonOffset(-1.0, -1.0);

            GL.uniformMatrix4fv(_Mmatrix, false, M_HEAD);
            GL.uniform4fv(_uColor, [0.85, 0.1, 0.1, 1.0]);
            GL.drawArrays(GL.TRIANGLE_FAN, 0, 4);

            GL.disable(GL.POLYGON_OFFSET_FILL);
        }


        // === Mata Togepi ===
        const eye = createEllipsoid(0.07, 0.098, 0.04, 24, 24); // bentuk oval tipis
        const eyeBuf = createBuffer(eye);

        const eyes = [
            [0.14, 0.67, 0.36],  // kanan
            [-0.14, 0.67, 0.36], // kiri
        ];

        eyes.forEach(e => {
            const pos = rotateVector(e, rotationX, rotationY);
            const M = TOGEPI_LIBS.get_I4();
            TOGEPI_LIBS.rotateX(M, rotationX);
        if (isSpinning || isGone) {
            TOGEPI_LIBS.rotateY(M, rotationY + spinAngle * Math.PI / 180);
        } else {
            TOGEPI_LIBS.rotateY(M, rotationY);
        }
            M[12] = pos[0];
            M[13] = pos[1]+ yJump;
            M[14] = pos[2] + totalZ;
            drawObject(eyeBuf, COLOR_EYE, M); // warna hitam mata

            // === Tambahkan bintik putih (highlight) di mata ===
            const highlightSize = 0.025; // ukuran kecil
            const offsetZ = 0.045;       // sedikit di depan permukaan mata
            const offsetX = 0.001;        // agak ke kanan atas dari pusat mata
            const offsetY = 0.06;

            // Bintik dibuat dalam koordinat lokal terhadap bola mata
            const circleVerts = [];
            const segments = 20;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * 2 * Math.PI;
                const x = offsetX + highlightSize * Math.cos(theta);
                const y = offsetY + highlightSize * Math.sin(theta);
                const z = offsetZ;
                circleVerts.push(x, y, z);
            }

            // Buat buffer bintik putih
            const hBuf = GL.createBuffer();
            GL.bindBuffer(GL.ARRAY_BUFFER, hBuf);
            GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(circleVerts), GL.STATIC_DRAW);
            GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);

            // Aktifkan polygon offset agar bintik tidak z-fight dengan permukaan mata
            GL.enable(GL.POLYGON_OFFSET_FILL);
            GL.polygonOffset(-1.0, -1.0);

            // Gunakan matriks transformasi M (mata), supaya bintik menempel & ikut berputar
            GL.uniformMatrix4fv(_Mmatrix, false, M);
            GL.uniform4fv(_uColor, [1.0, 1.0, 1.0, 1.0]); // warna putih
            GL.drawArrays(GL.TRIANGLE_FAN, 0, segments + 1);

            GL.disable(GL.POLYGON_OFFSET_FILL);


        });

        // === Garis bawah mata (seperti huruf C / < >) ===
        {
            const offsetY = 0.015;   // sejajar dengan tengah mata
            const offsetZ = 0.4;     // sedikit ke depan

            const eyesLine = [
                [0.26, 0.65, offsetZ],   // kanan
                [-0.26, 0.65, offsetZ],  // kiri
            ];

            eyesLine.forEach((eyePos, i) => {
                const cx = eyePos[0];
                const cy = eyePos[1] + offsetY;
                const cz = eyePos[2];
                const dir = (i === 0) ? 1 : -1; // kanan positif, kiri negatif

                const w = 0.08; // panjang garis
                const h = 0.08; // tinggi garis
                const verts = [];

                // Bentuk "<" di kiri dan ">" di kanan
                verts.push(cx - dir * w * 0.5, cy + h, cz);  // atas dalam
                verts.push(cx, cy, cz);                      // titik tengah
                verts.push(cx - dir * w * 0.5, cy - h, cz);  // bawah dalam

                const buf = GL.createBuffer();
                GL.bindBuffer(GL.ARRAY_BUFFER, buf);
                GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(verts), GL.STATIC_DRAW);
                GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);

                // Untuk garis ini kita ingin ikut transform MOVEMATRIX (rotasi + totalZ)
                const Mline = TOGEPI_LIBS.get_I4();
                // copy rotation from MOVEMATRIX
                for (let k = 0; k < 12; k++) Mline[k] = MOVEMATRIX[k];
                if (isSpinning || isGone) {
                    TOGEPI_LIBS.rotateY(Mline, spinAngle * Math.PI / 180);
                }

                // set translation to include totalZ
                Mline[12] = 0; Mline[13] = yJump; Mline[14] = totalZ;

                GL.uniformMatrix4fv(_Mmatrix, false, Mline);
                GL.uniform4fv(_uColor, [0.05, 0.05, 0.05, 1.0]);
                GL.lineWidth(3.0);
                GL.drawArrays(GL.LINE_STRIP, 0, verts.length / 3);
            });
        }

        // === Motif segitiga merah & biru di cangkang ===
        function ellipsoidNormal(x, y, z, ra, rb, rc) {
            const nx = x / (ra * ra), ny = y / (rb * rb), nz = z / (rc * rc);
            const len = Math.hypot(nx, ny, nz) + 1e-9;
            return [nx / len, ny / len, nz / len];
        }

        const decals = [

             // new decals (3 in front, z > 0)
            { pos: [0.30, 0.15, 0.32], size: 0.14, color: COLOR_RED },
            { pos: [-0.25, 0.25, 0.32], size: 0.11, color: COLOR_BLUE },
            { pos: [0.10, -0.25, 0.42], size: 0.13, color: COLOR_RED }, //PAS
            { pos: [0.00, 0.10, 0.46], size: 0.12, color: COLOR_RED }, //PAS
            { pos: [0.22, -0.02, 0.40], size: 0.15, color: COLOR_BLUE }, //PAS
            { pos: [-0.21, -0.06, 0.42], size: 0.12, color: COLOR_BLUE }, //PAS


            // new decals (3 in back, z < 0)
            { pos: [0.25, -0.35, -0.27], size: 0.12, color: COLOR_BLUE }, //dh
            { pos: [-0.05, 0.25, -0.39], size: 0.14, color: COLOR_BLUE }, //dh
            { pos: [0.33, 0.00, -0.33], size: 0.13, color: COLOR_RED },//dh
            { pos: [-0.1, -0.5, -0.1], size: 0.17, color: COLOR_RED },//dh
            { pos: [-0.35, -0.3, -0.18], size: 0.12, color: COLOR_BLUE }, //dh
            { pos: [-0.2, -0.2, -0.39], size: 0.13, color: COLOR_RED },
        ];

        decals.forEach(d => {
            const [px, py, pz] = d.pos;
            const normal = ellipsoidNormal(px, py, pz, a, b, c);

            const arbitrary = Math.abs(normal[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];

            let u = [
                normal[1] * arbitrary[2] - normal[2] * arbitrary[1],
                normal[2] * arbitrary[0] - normal[0] * arbitrary[2],
                normal[0] * arbitrary[1] - normal[1] * arbitrary[0]
            ];
            let ulen = Math.hypot(u[0], u[1], u[2]) + 1e-9;
            u = [u[0] / ulen, u[1] / ulen, u[2] / ulen];

            let v = [
                normal[1] * u[2] - normal[2] * u[1],
                normal[2] * u[0] - normal[0] * u[2],
                normal[0] * u[1] - normal[1] * u[0]
            ];
            let vlen = Math.hypot(v[0], v[1], v[2]) + 1e-9;
            v = [v[0] / vlen, v[1] / vlen, v[2] / vlen];

            const pushOut = 0.13;
            const base = [
                px + normal[0] * pushOut,
                py + normal[1] * pushOut,
                pz + normal[2] * pushOut
            ];

            const s = d.size;
            const v0 = [ base[0] + u[0] * 0.0 + v[0] * s*0.6, base[1] + u[1] * 0.0 + v[1] * s*0.6, base[2] + u[2] * 0.0 + v[2] * s*0.6 ];
            const v1 = [ base[0] + u[0] * (-s*0.5) + v[0] * (-s*0.4), base[1] + u[1] * (-s*0.5) + v[1] * (-s*0.4), base[2] + u[2] * (-s*0.5) + v[2] * (-s*0.4) ];
            const v2 = [ base[0] + u[0] * (s*0.5) + v[0] * (-s*0.4), base[1] + u[1] * (s*0.5) + v[1] * (-s*0.4), base[2] + u[2] * (s*0.5) + v[2] * (-s*0.4) ];

            const triVerts = [...v0, ...v1, ...v2];
            const buf = GL.createBuffer();
            GL.bindBuffer(GL.ARRAY_BUFFER, buf);
            GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(triVerts), GL.STATIC_DRAW);
            GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);

            // gunakan MOVEMATRIX yang sudah memiliki totalZ, jadi decal ikut gerak
            GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

            // Isi putih (warna cangkang)
            GL.uniform4fv(_uColor, COLOR_SHELL);
            GL.enable(GL.POLYGON_OFFSET_FILL);
            GL.polygonOffset(-1.0, -1.0);
            GL.drawArrays(GL.TRIANGLES, 0, 3);
            GL.disable(GL.POLYGON_OFFSET_FILL);

            // Outline berwarna
            GL.uniform4fv(_uColor, d.color);

            const outlineThickness = 0.2; // ubah angka ini untuk menebalkan (0.03–0.1)

            for (let k = 0; k < 2; k++) {
                const scale = 1.0 + k * outlineThickness; // versi lebih besar di luar
                const scaledVerts = [];
                for (let i = 0; i < 3; i++) {
                    const vx = base[0] + (triVerts[i * 3] - base[0]) * scale;
                    const vy = base[1] + (triVerts[i * 3 + 1] - base[1]) * scale;
                    const vz = base[2] + (triVerts[i * 3 + 2] - base[2]) * scale;
                    scaledVerts.push(vx, vy, vz);
                }

                const buf2 = GL.createBuffer();
                GL.bindBuffer(GL.ARRAY_BUFFER, buf2);
                GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(scaledVerts), GL.STATIC_DRAW);
                GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
                GL.drawArrays(GL.LINE_LOOP, 0, 3);
            }


        });


        // === Tanduk Togepi tegak di sekeliling kepala ===
        const hornCount = 5;
        const hornRadius = 0.22;
        const hornHeight = 1.03;

        for (let i = 0; i < hornCount; i++) {
            const angle = (i / hornCount) * 2 * Math.PI;
            const x = hornRadius * Math.cos(angle);
            const z = hornRadius * Math.sin(angle);
            const y = hornHeight + 0.02 * Math.sin(angle * 2);

            const pos = rotateVector([x, y, z], rotationX, rotationY);
            const M = TOGEPI_LIBS.get_I4();
            TOGEPI_LIBS.rotateX(M, rotationX);
            if (isSpinning || isGone) {
                TOGEPI_LIBS.rotateY(M, rotationY + spinAngle * Math.PI / 180);
            } else {
                TOGEPI_LIBS.rotateY(M, rotationY);
            }

            M[12] = pos[0];
            M[13] = pos[1]+ yJump;
            M[14] = pos[2] + totalZ;

            drawObject(hornBuf, COLOR_BODY, M);

        }

        // === Efek ledakan (partikel) ===
if (isGone && explosionStart > 0) {
    const et = (performance.now() - explosionStart) / 1000.0;

    // update dan gambar partikel
    explosionParticles.forEach(p => {
        p.life -= 0.016;
        if (p.life <= 0) return;
        p.pos[0] += p.vel[0] * 0.016;
        p.pos[1] += p.vel[1] * 0.016;
        p.pos[2] += p.vel[2] * 0.016;
        p.vel[1] -= 4.0 * 0.016; // gravitasi kecil

        const M = TOGEPI_LIBS.get_I4();
        M[12] = p.pos[0];
        M[13] = p.pos[1];
        M[14] = p.pos[2];
        GL.uniformMatrix4fv(_Mmatrix, false, M);

        // warna api kekuningan ke oranye
        const fade = Math.max(p.life, 0);
        const r = 1.0;
        const g = 0.6 + 0.4 * Math.random();
        const b = 0.1;
        GL.uniform4fv(_uColor, [r, g, b, fade]);

        const size = 0.04;
        const verts = [
            -size, -size, 0,
             size, -size, 0,
             0,     size, 0
        ];
        const vBuf = GL.createBuffer();
        GL.bindBuffer(GL.ARRAY_BUFFER, vBuf);
        GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(verts), GL.STATIC_DRAW);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
        GL.drawArrays(GL.TRIANGLES, 0, 3);
    });

    // jika semua partikel habis → stop animasi total
    if (et > 2.5) return;
}


        requestAnimationFrame(animate);
    }

    animate();

    // resize handling
    window.addEventListener('resize', () => {
        CANVAS.width = window.innerWidth;
        CANVAS.height = window.innerHeight;
        PROJMATRIX = TOGEPI_LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    });
}
window.addEventListener("load", main);

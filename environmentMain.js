// main_lowered_terrain.js — Floating Island + Batu + Awan Bergerak (TERRAIN LOWERED)
let gl;

function mainEnvironment() {
  const canvas = document.getElementById("environment");
  resizeCanvas(canvas);
  gl = canvas.getContext("webgl", { antialias: true });
  if (!gl) return alert("WebGL tidak didukung di browser ini.");

  // === Shaders ===
  const vs = `
    attribute vec3 position;
    attribute vec3 color;
    uniform mat4 Pmatrix, Vmatrix, Mmatrix;
    varying vec3 vColor;
    varying vec3 vPos;
    void main(void){
      vec4 worldPos = Mmatrix * vec4(position, 1.0);
      vPos = worldPos.xyz;
      vColor = color;
      gl_Position = Pmatrix * Vmatrix * worldPos;
    }`;
  const fs = `
    precision mediump float;
    varying vec3 vColor;
    varying vec3 vPos;

    void main(void){
      float fog = smoothstep(50.0, 100.0, length(vPos));
      vec3 sky = vec3(0.6, 0.85, 1.0);
      vec3 color = mix(vColor, sky, fog);

      // Transparansi lembut tergantung tinggi posisi (lebih tebal di bawah)
      float alpha = smoothstep(-20.0, -5.0, vPos.y);
      gl_FragColor = vec4(color, alpha);
    }`;

  function compile(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(s));
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(vs, gl.VERTEX_SHADER));
  gl.attachShader(prog, compile(fs, gl.FRAGMENT_SHADER));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const aPos = gl.getAttribLocation(prog, "position");
  const aCol = gl.getAttribLocation(prog, "color");
  const uP = gl.getUniformLocation(prog, "Pmatrix");
  const uV = gl.getUniformLocation(prog, "Vmatrix");
  const uM = gl.getUniformLocation(prog, "Mmatrix");
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aCol);

  // === Geometry ===

    const island = generateRockyIsland(15, 10, 6, 64);
    const rock = generateTopRock(4, 6, 32, [0.5, 0.45, 0.4]);
    const lake = generateLake(8, 0.15, 48, 0, -8); // geser ke tepi pulau
    const waterfall = generateWaterfall(lake, 2.7, 19, 1.5);
    const clouds = generateClouds(10, 80, 25, 15);
    const trees = generateTrees(80, 12, 0.2);

  // === GLOBAL OFFSET: turunkan seluruh dataran (pulau, gunung, pohon, danau) di sini ===
  // Ubah nilai ini untuk menaikkan/menurunkan semuanya. Negatif = turun, Positif = naik.
  const TERRAIN_Y_OFFSET = -8.0;

  // buffer pulau+batu
  const terrainVertices = new Float32Array([...island.vertices, ...rock.vertices]);
  const terrainIndices = new Uint16Array([
    ...island.indices,
    ...rock.indices.map(i => i + island.vertexCount)
  ]);
  const cloudVertices = new Float32Array(clouds.vertices);
  const cloudIndices = new Uint16Array(clouds.indices);

  // === Buffers ===
  const vbufTerrain = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbufTerrain);
  gl.bufferData(gl.ARRAY_BUFFER, terrainVertices, gl.STATIC_DRAW);

  const ibufTerrain = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufTerrain);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, terrainIndices, gl.STATIC_DRAW);

  const vbufCloud = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbufCloud);
  gl.bufferData(gl.ARRAY_BUFFER, cloudVertices, gl.STATIC_DRAW);

  const ibufCloud = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufCloud);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cloudIndices, gl.STATIC_DRAW);

  // === Buffer Pohon ===
  const vbufTrees = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbufTrees);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(trees.vertices), gl.STATIC_DRAW);
  const ibufTrees = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufTrees);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(trees.indices), gl.STATIC_DRAW);


  // === Buffer Danau ===
const vbufLake = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbufLake);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lake.vertices), gl.STATIC_DRAW);
const ibufLake = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufLake);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lake.indices), gl.STATIC_DRAW);

// === Buffer Air Terjun ===
const vbufWater = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbufWater);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(waterfall.vertices), gl.STATIC_DRAW);
const ibufWater = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufWater);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(waterfall.indices), gl.STATIC_DRAW);

// === Kabut bawah air terjun ===
const mistWaterfall = generateMist(lake.offsetX, -21, lake.offsetZ - 8.5, 5, 3, 3, 1.0);
const vbufMistWater = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbufMistWater);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mistWaterfall.vertices), gl.STATIC_DRAW);
const ibufMistWater = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufMistWater);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mistWaterfall.indices), gl.STATIC_DRAW);

// === Kabut dasar (menutupi area bawah pulau) ===
const mistGround = generateMist(0, -25, 0, 60, 60, 10, 0.6);
const vbufMistGround = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbufMistGround);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mistGround.vertices), gl.STATIC_DRAW);
const ibufMistGround = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufMistGround);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mistGround.indices), gl.STATIC_DRAW);


  // === Camera & Setup ===
  let PROJ = ENV_LIBS.get_projection(60, canvas.width / canvas.height, 0.1, 1000);
  const VIEW = ENV_LIBS.get_I4();
  ENV_LIBS.translateZ(VIEW, -45);
  gl.clearColor(0.6, 0.85, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


  // === Mouse rotate ===
  let THETA = 0, PHI = 0, dragging = false, ox = 0, oy = 0;
  canvas.addEventListener("mousedown", e => { dragging = true; ox = e.pageX; oy = e.pageY; });
  canvas.addEventListener("mouseup", () => dragging = false);
  canvas.addEventListener("mousemove", e => {
    if (!dragging) return;
    THETA += (e.pageX - ox) * 0.01;
    PHI += (e.pageY - oy) * 0.01;
    ox = e.pageX; oy = e.pageY;
  });
  window.addEventListener("resize", () => {
    resizeCanvas(canvas);
    PROJ = ENV_LIBS.get_projection(60, canvas.width / canvas.height, 0.1, 1000);
  });

  // === Render ===
  function render(time) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const Mterrain = ENV_LIBS.get_I4();
    ENV_LIBS.rotateY(Mterrain, THETA);
    ENV_LIBS.rotateX(Mterrain, PHI);
    // TERJADIKAN OFFSET Y DI SINI: semua yang menggunakan Mterrain akan turun/naik
    ENV_LIBS.translateY(Mterrain, TERRAIN_Y_OFFSET);

    const Mcloud = ENV_LIBS.get_I4();
    ENV_LIBS.rotateY(Mcloud, THETA);
    ENV_LIBS.rotateX(Mcloud, PHI);
    const cloudMove = Math.sin(time * 0.0003) * 15.0;
    ENV_LIBS.translateX(Mcloud, cloudMove);

    gl.uniformMatrix4fv(uP, false, PROJ);
    gl.uniformMatrix4fv(uV, false, VIEW);

    // === Gambar pulau & batu ===
    gl.bindBuffer(gl.ARRAY_BUFFER, vbufTerrain);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufTerrain);
    gl.uniformMatrix4fv(uM, false, Mterrain);
    gl.drawElements(gl.TRIANGLES, terrainIndices.length, gl.UNSIGNED_SHORT, 0);

    // === Gambar awan ===
    gl.bindBuffer(gl.ARRAY_BUFFER, vbufCloud);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufCloud);
    gl.uniformMatrix4fv(uM, false, Mcloud);
    gl.drawElements(gl.TRIANGLES, cloudIndices.length, gl.UNSIGNED_SHORT, 0);

    // === Gambar danau ===
    gl.bindBuffer(gl.ARRAY_BUFFER, vbufLake);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufLake);
    // danau menggunakan Mterrain sehingga ikut turun
    gl.uniformMatrix4fv(uM, false, Mterrain);
    gl.drawElements(gl.TRIANGLES, lake.indices.length, gl.UNSIGNED_SHORT, 0);

    // === Gambar air terjun ===
{
  const Mwater = ENV_LIBS.get_I4();
  ENV_LIBS.rotateY(Mwater, THETA);
  ENV_LIBS.rotateX(Mwater, PHI);
  // supaya air terjun tetap terpasang pada danau/pulau, beri offset Y sama dengan dataran
  ENV_LIBS.translateY(Mwater, TERRAIN_Y_OFFSET);

  // Variabel animasi
  const animatedVertices = new Float32Array(waterfall.vertices);
  const flowSpeed = 0.015; // kecepatan aliran
  const waveAmp = 0.06;    // riak kecil
  const shineAmp = 0.25;   // intensitas kilau

  // Jalankan animasi hanya di vertex air terjun
  for (let i = 0; i < animatedVertices.length; i += 6) {
    const x = animatedVertices[i];
    const y = waterfall.vertices[i + 1]; // ⚠ pakai nilai asli dari waterfall (tidak diubah permanen)
    const z = animatedVertices[i + 2];
    const r = waterfall.vertices[i + 3];
    const g = waterfall.vertices[i + 4];
    const b = waterfall.vertices[i + 5];

    // === Efek aliran: bergerak lembut ke bawah tanpa menggeser posisi global ===
    const wave = Math.sin((time * 0.02) + x * 3.0) * waveAmp; // riak halus
    const fall = Math.sin(time * flowSpeed + z * 2.0) * 0.15; // efek jatuh ringan
    const shine = (Math.sin(time * 0.01 + x * 2.0 + z * 1.5) + 1.0) * 0.5; // kilau halus

    // Perubahan posisi hanya kecil, relatif terhadap vertex aslinya
    animatedVertices[i + 1] = y + wave - fall;

    // Efek warna berkilau (pantulan cahaya)
    animatedVertices[i + 3] = Math.min(1.0, r + shine * shineAmp);
    animatedVertices[i + 4] = Math.min(1.0, g + shine * (shineAmp - 0.05));
    animatedVertices[i + 5] = Math.min(1.0, b + shine * (shineAmp + 0.1));
  }

  // Update hanya buffer air terjun
  gl.bindBuffer(gl.ARRAY_BUFFER, vbufWater);
  gl.bufferData(gl.ARRAY_BUFFER, animatedVertices, gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufWater);
  gl.uniformMatrix4fv(uM, false, Mwater);
  gl.drawElements(gl.TRIANGLES, waterfall.indices.length, gl.UNSIGNED_SHORT, 0);
}

// === Kabut di bawah air terjun ===
{
  const MmistWater = ENV_LIBS.get_I4();
  ENV_LIBS.rotateY(MmistWater, THETA);
  ENV_LIBS.rotateX(MmistWater, PHI);
  // turunkan kabut air terjun agar mengikuti offset dataran
  ENV_LIBS.translateY(MmistWater, TERRAIN_Y_OFFSET);

  const animatedMistWater = new Float32Array(mistWaterfall.vertices);
  const mistAmp = 0.06;
  const mistSpeed = 0.003;

  for (let i = 0; i < animatedMistWater.length; i += 6) {
    const x = animatedMistWater[i];
    const y = mistWaterfall.vertices[i + 1];
    const z = animatedMistWater[i + 2];
    const wave = Math.sin(time * mistSpeed + x * 2.0 + z * 1.5) * mistAmp;
    animatedMistWater[i + 1] = y + wave;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vbufMistWater);
  gl.bufferData(gl.ARRAY_BUFFER, animatedMistWater, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufMistWater);
  gl.uniformMatrix4fv(uM, false, MmistWater);

  gl.depthMask(false); // jangan tulis z-buffer
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawElements(gl.TRIANGLES, mistWaterfall.indices.length, gl.UNSIGNED_SHORT, 0);
  gl.depthMask(true);
}

// === Kabut dasar (menutupi area bawah pulau) ===
{
  const MmistGround = ENV_LIBS.get_I4();
  ENV_LIBS.rotateY(MmistGround, THETA);
  ENV_LIBS.rotateX(MmistGround, PHI);
  // turunkan kabut dasar agar mengikuti offset dataran
  ENV_LIBS.translateY(MmistGround, TERRAIN_Y_OFFSET);

  const animatedMistGround = new Float32Array(mistGround.vertices);
  const groundAmp = 0.02;
  const groundSpeed = 0.001;

  for (let i = 0; i < animatedMistGround.length; i += 6) {
    const x = animatedMistGround[i];
    const y = mistGround.vertices[i + 1];
    const z = animatedMistGround[i + 2];
    const wave = Math.sin(time * groundSpeed + x * 0.5 + z * 0.5) * groundAmp;
    animatedMistGround[i + 1] = y + wave;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vbufMistGround);
  gl.bufferData(gl.ARRAY_BUFFER, animatedMistGround, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufMistGround);
  gl.uniformMatrix4fv(uM, false, MmistGround);

  gl.depthMask(false);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.drawElements(gl.TRIANGLES, mistGround.indices.length, gl.UNSIGNED_SHORT, 0);
  gl.depthMask(true);
}



    // === Gambar pohon-pohon ===
    gl.bindBuffer(gl.ARRAY_BUFFER, vbufTrees);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufTrees);
    // pohon menggunakan Mterrain sehingga ikut turun
    gl.uniformMatrix4fv(uM, false, Mterrain);
    gl.drawElements(gl.TRIANGLES, trees.indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
  }
  render();
}

// === Pohon di sekitar gunung ===
function generateTrees() {
  const vertices = [];
  const indices = [];

  function addTree(x, z, height = 2.0, baseY = 0.2) {
    const trunkColor = [0.4, 0.25, 0.1];
    const leavesColor = [0.1, 0.7, 0.2];
    const segs = 8;
    const radius = 0.15;
    const trunkTop = baseY + height * 0.6;
    const leavesTop = baseY + height;

    // Batang (silinder sederhana)
    const startIndex = vertices.length / 6;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const cx = Math.cos(a) * radius + x;
      const cz = Math.sin(a) * radius + z;
      vertices.push(cx, baseY, cz, ...trunkColor);
      vertices.push(cx, trunkTop, cz, ...trunkColor);
    }
    for (let i = 0; i < segs; i++) {
      const a = startIndex + i * 2;
      indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }

    // Daun (kerucut sederhana)
    const leavesStart = vertices.length / 6;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const cx = Math.cos(a) * (radius * 2.5) + x;
      const cz = Math.sin(a) * (radius * 2.5) + z;
      vertices.push(cx, trunkTop, cz, ...leavesColor);
    }
    const topIndex = vertices.length / 6;
    vertices.push(x, leavesTop, z, ...leavesColor);
    for (let i = 0; i < segs; i++) {
      indices.push(leavesStart + i, leavesStart + i + 1, topIndex);
    }
  }

  // === Pohon manual (ubah posisi & ukuran di sini) ===
  addTree(10, -9, 2.2);  // Pohon 1
  addTree(11, -8.5, 4);  // Pohon 1
  addTree(10.5, -7, 5);  // Pohon 1
  addTree(11.5, -9, 1);  // Pohon 1
  addTree(12, -8.5, 4.3);  // Pohon 1
  addTree(12.2, -7, 5.5);  // Pohon 1
  addTree(13, -7.6, 6);  // Pohon 1

  addTree(12, 8, 5);   // Pohon 3
  addTree(11, 7.8, 4);   // Pohon 3
  addTree(10.7, 8.2, 3);   // Pohon 3
  addTree(10.5, 7.5, 2);   // Pohon 3
  addTree(11.8, 8.5, 3);   // Pohon 3
  addTree(9.8, 6.9, 5.3);   // Pohon 3
  addTree(11.8, 8.5, 3);   // Pohon 3
  

  return { vertices, indices, vertexCount: vertices.length / 6 };
}

// === Awan ===
function generateClouds(count = 8, spreadX = 80, spreadZ = 40, baseHeight = 15) {
  const vertices = [];
  const indices = [];
  const colorBase = [1.0, 1.0, 1.0];
  let vertexCount = 0;

  function addSphere(cx, cy, cz, radius, col) {
    const latSegs = 8;
    const lonSegs = 12;
    const startIndex = vertices.length / 6;
    for (let i = 0; i <= latSegs; i++) {
      const theta = (i * Math.PI) / latSegs;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      for (let j = 0; j <= lonSegs; j++) {
        const phi = (j * 2 * Math.PI) / lonSegs;
        const x = cx + radius * sinT * Math.cos(phi);
        const y = cy + radius * cosT;
        const z = cz + radius * sinT * Math.sin(phi);
        const c2 = col.map(v => v * (0.9 + Math.random() * 0.1));
        vertices.push(x, y, z, ...c2);
      }
    }
    const ringVerts = lonSegs + 1;
    for (let i = 0; i < latSegs; i++) {
      for (let j = 0; j < lonSegs; j++) {
        const a = startIndex + i * ringVerts + j;
        const b = a + ringVerts;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  for (let c = 0; c < count; c++) {
    const cx = (Math.random() - 0.5) * spreadX * 2;
    const cz = (Math.random() - 0.5) * spreadZ * 2;
    const cy = baseHeight + Math.random() * 5;
    const blobCount = 5 + Math.floor(Math.random() * 4);
    for (let b = 0; b < blobCount; b++) {
      const ox = (Math.random() - 0.5) * 10;
      const oy = (Math.random() - 0.5) * 2;
      const oz = (Math.random() - 0.5) * 6;
      const r = 2.5 + Math.random() * 2.5;
      const c2 = colorBase.map(v => v * (0.85 + Math.random() * 0.15));
      addSphere(cx + ox, cy + oy, cz + oz, r, c2);
    }
    vertexCount = vertices.length / 6;
  }

  return { vertices, indices, vertexCount };
}

// === Pulau ===
function generateRockyIsland(radius = 10, height = 10, layers = 5, segs = 48) {
  const vertices = [];
  const indices = [];
  const topColor = [0.2, 0.6, 0.2];
  const midColor = [0.45, 0.3, 0.15];
  const botColor = [0.25, 0.15, 0.1];

  for (let y = 0; y <= layers; y++) {
    const t = y / layers;
    const yPos = -t * height;
    const ringRad = radius * (1.0 - t * 0.5);
    const ringColor = [
      topColor[0] * (1 - t) + midColor[0] * t,
      topColor[1] * (1 - t) + midColor[1] * t,
      topColor[2] * (1 - t) + midColor[2] * t
    ];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const jag = 1.0 + (Math.random() - 0.5) * 0.15;
      const x = Math.cos(a) * ringRad * jag;
      const z = Math.sin(a) * ringRad * jag;
      const c = ringColor.map(v => v * (0.9 + 0.2 * Math.random()));
      vertices.push(x, yPos, z, ...c);
    }
  }

  const ringVerts = segs + 1;
  for (let y = 0; y < layers; y++) {
    for (let i = 0; i < segs; i++) {
      const a = y * ringVerts + i;
      const b = a + ringVerts;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const bottomIndex = vertices.length / 6;
  vertices.push(0, -height * 1.7, 0, ...botColor);
  const lastRingStart = layers * ringVerts;
  for (let i = 0; i < segs; i++) {
    indices.push(lastRingStart + i, lastRingStart + i + 1, bottomIndex);
  }
  const topCenterIndex = vertices.length / 6;
  vertices.push(0, 0.1, 0, ...topColor);
  for (let i = 0; i < segs; i++) {
    indices.push(i, i + 1, topCenterIndex);
  }

  return { vertices, indices, vertexCount: vertices.length / 6 };
}

// === Batu di atas ===
function generateTopRock(radius = 20, height = 20, segs = 24, color = [0.5, 0.4, 0.35],
  offsetX = 8, offsetY = 0.1, offsetZ = 0, scale = 1.35) {
  const vertices = [];
  const indices = [];
  const layers = 6;
  for (let y = 0; y <= layers; y++) {
    const t = y / layers;
    const yPos = offsetY + (t * height * scale);
    const ringRad = radius * (1 - t * 0.8) * scale;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const jag = 1.0 + (Math.random() - 0.5) * 0.2;
      const x = Math.cos(a) * ringRad * jag * scale + offsetX;
      const z = Math.sin(a) * ringRad * jag * scale + offsetZ;
      const c = color.map(v => v * (0.9 + 0.2 * Math.random()));
      vertices.push(x, yPos, z, ...c);
    }
  }
  const ringVerts = segs + 1;
  for (let y = 0; y < layers; y++) {
    for (let i = 0; i < segs; i++) {
      const a = y * ringVerts + i;
      const b = a + ringVerts;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const topCenterIndex = vertices.length / 6;
  const topColor = color.map(v => v * 1.1);
  vertices.push(offsetX, offsetY + height * scale + 0.1, offsetZ, ...topColor);
  const lastRingStart = layers * ringVerts;
  for (let i = 0; i < segs; i++) {
    indices.push(lastRingStart + i, lastRingStart + i + 1, topCenterIndex);
  }
  return { vertices, indices, vertexCount: vertices.length / 6 };
}

// === Danau di tepi pulau ===
function generateLake(radius = 6, y = 0.12, segs = 48, offsetX = 0, offsetZ = -5) {
  const vertices = [];
  const indices = [];
  const color = [0.3, 0.7, 1.0]; // biru muda air

  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * radius + offsetX;
    const z = Math.sin(a) * radius + offsetZ;
    const c = color.map(v => v * (0.8 + Math.random() * 0.2));
    vertices.push(x, y, z, ...c);
  }
  const centerIndex = vertices.length / 6;
  vertices.push(offsetX, y, offsetZ, ...color);

  for (let i = 0; i < segs; i++) {
    indices.push(i, i + 1, centerIndex);
  }
  return { vertices, indices, vertexCount: vertices.length / 6, offsetX, offsetZ, y };
}

// === Air Terjun tersambung ke danau ===
function generateWaterfall(lake, width = 3, height = 10, depth = 1.2) {
  const vertices = [];
  const indices = [];
  const colorTop = [0.4, 0.8, 1.0];
  const colorBottom = [0.2, 0.5, 0.9];

  // Titik awal dari tepi danau
  const offsetY = lake.y;
  const offsetZ = lake.offsetZ - 7.34; // sedikit keluar dari tepi danau
  const offsetX = lake.offsetX;

  const positions = [
    [offsetX - width, offsetY, offsetZ],
    [offsetX + width, offsetY, offsetZ],
    [offsetX + width, offsetY - height, offsetZ - depth],
    [offsetX - width, offsetY - height, offsetZ - depth]
  ];

  for (let p of positions) {
    const t = (p[1] - (offsetY - height)) / height;
    const c = [
      colorBottom[0] * t + colorTop[0] * (1 - t),
      colorBottom[1] * t + colorTop[1] * (1 - t),
      colorBottom[2] * t + colorTop[2] * (1 - t)
    ];
    vertices.push(...p, ...c);
  }

  indices.push(0, 1, 2, 0, 2, 3);
  return { vertices, indices, vertexCount: vertices.length / 6 };
}

// === Efek kabut di bawah air terjun dan dasar pulau ===
function generateMist(centerX, baseY, centerZ, width = 5, depth = 3, height = 2, intensity = 1.0) {
  const vertices = [];
  const indices = [];
  const colorTop = [0.85, 0.9, 1.0];
  const colorBottom = [0.7, 0.8, 1.0];

  // Tambahkan beberapa lapisan kabut acak
  const layers = 4;
  for (let l = 0; l < layers; l++) {
    const dz = (Math.random() - 0.5) * depth * 2;
    const dy = Math.random() * height * 0.6;
    const alpha = 0.25 + Math.random() * 0.3;
    const positions = [
      [centerX - width, baseY + dy, centerZ + dz],
      [centerX + width, baseY + dy, centerZ + dz],
      [centerX + width, baseY + dy + height, centerZ + dz],
      [centerX - width, baseY + dy + height, centerZ + dz]
    ];
    for (let p of positions) {
      const t = (p[1] - baseY) / height;
      const c = [
        colorBottom[0] * (1 - t) + colorTop[0] * t,
        colorBottom[1] * (1 - t) + colorTop[1] * t,
        colorBottom[2] * (1 - t) + colorTop[2] * t
      ].map(v => v * intensity);
      vertices.push(...p, ...c);
    }
    const start = l * 4;
    indices.push(start, start+1, start+2, start, start+2, start+3);
  }

  return { vertices, indices, vertexCount: vertices.length / 6 };
}


function resizeCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
}

window.addEventListener("load", main);

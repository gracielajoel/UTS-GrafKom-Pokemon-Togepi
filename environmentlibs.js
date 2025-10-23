const ENV_LIBS = {
  // === Matriks identitas 4x4 ===
  get_I4: () => [1,0,0,0,
                 0,1,0,0,
                 0,0,1,0,
                 0,0,0,1],

  set_I4: m => { for (let i=0;i<16;i++) m[i]=(i%5===0)?1:0; },

  // === Matriks Proyeksi Perspektif ===
  get_projection: function(angle, aspect, zMin, zMax) {
    const f = 1.0 / Math.tan((angle * 0.5) * Math.PI / 180);
    const rangeInv = 1.0 / (zMin - zMax);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (zMax + zMin) * rangeInv, -1,
      0, 0, (2 * zMax * zMin) * rangeInv, 0
    ];
  },

  // === Translasi ===
  translate: (m, tx, ty, tz) => {
    m[12] += tx;
    m[13] += ty;
    m[14] += tz;
  },
  translateX: (m, t) => { m[12] += t; },
  translateY: (m, t) => { m[13] += t; },
  translateZ: (m, t) => { m[14] += t; },

  // === Rotasi (benar-benar kolom/row sesuai format column-major) ===
  rotateX: (m, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const mv1 = m[1], mv5 = m[5], mv9 = m[9], mv13 = m[13];
    const mv2 = m[2], mv6 = m[6], mv10 = m[10], mv14 = m[14];

    m[1] = mv1 * c + mv2 * -s;
    m[5] = mv5 * c + mv6 * -s;
    m[9] = mv9 * c + mv10 * -s;
    m[13] = mv13 * c + mv14 * -s;

    m[2] = mv1 * s + mv2 * c;
    m[6] = mv5 * s + mv6 * c;
    m[10] = mv9 * s + mv10 * c;
    m[14] = mv13 * s + mv14 * c;
  },

  rotateY: (m, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const mv0 = m[0], mv4 = m[4], mv8 = m[8], mv12 = m[12];
    const mv2 = m[2], mv6 = m[6], mv10 = m[10], mv14 = m[14];

    m[0] = mv0 * c + mv2 * s;
    m[4] = mv4 * c + mv6 * s;
    m[8] = mv8 * c + mv10 * s;
    m[12] = mv12 * c + mv14 * s;

    m[2] = mv2 * c - mv0 * s;
    m[6] = mv6 * c - mv4 * s;
    m[10] = mv10 * c - mv8 * s;
    m[14] = mv14 * c - mv12 * s;
  },

  rotateZ: (m, angle) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    const mv0 = m[0], mv4 = m[4], mv8 = m[8], mv12 = m[12];
    const mv1 = m[1], mv5 = m[5], mv9 = m[9], mv13 = m[13];

    m[0] = mv0 * c + mv1 * -s;
    m[4] = mv4 * c + mv5 * -s;
    m[8] = mv8 * c + mv9 * -s;
    m[12] = mv12 * c + mv13 * -s;

    m[1] = mv0 * s + mv1 * c;
    m[5] = mv4 * s + mv5 * c;
    m[9] = mv8 * s + mv9 * c;
    m[13] = mv12 * s + mv13 * c;
  },

  // === Utility untuk kombinasi transformasi ===
  multiply: (a, b) => {
    const r = new Array(16);
    for (let i=0; i<4; i++) {
      for (let j=0; j<4; j++) {
        r[i*4+j] =
          a[i*4+0]*b[0*4+j] +
          a[i*4+1]*b[1*4+j] +
          a[i*4+2]*b[2*4+j] +
          a[i*4+3]*b[3*4+j];
      }
    }
    return r;
    }
};

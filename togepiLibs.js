/*===================== TOGEPI_LIBS =====================*/
var TOGEPI_LIBS = {
    get_projection: function (angle, a, zMin, zMax) {
        const ang = Math.tan((angle * 0.5) * Math.PI / 180);
        return [
            0.5 / ang, 0, 0, 0,
            0, 0.5 * a / ang, 0, 0,
            0, 0, -(zMax + zMin) / (zMax - zMin), -1,
            0, 0, (-2 * zMax * zMin) / (zMax - zMin), 0
        ];
    },

    get_I4: function () {
        return [1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1];
    },

    set_I4: function (m) {
        for (let i = 0; i < 16; i++) m[i] = (i % 5 === 0) ? 1 : 0;
    },

    /* === Rotasi sumbu X === */
    rotateX: function (m, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        const mv1 = m[1], mv5 = m[5], mv9 = m[9];
        const mv2 = m[2], mv6 = m[6], mv10 = m[10];
        m[1] = c * mv1 - s * mv2;
        m[5] = c * mv5 - s * mv6;
        m[9] = c * mv9 - s * mv10;
        m[2] = s * mv1 + c * mv2;
        m[6] = s * mv5 + c * mv6;
        m[10] = s * mv9 + c * mv10;
    },

    /* === Rotasi sumbu Y === */
    rotateY: function (m, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        const mv0 = m[0], mv4 = m[4], mv8 = m[8];
        const mv2 = m[2], mv6 = m[6], mv10 = m[10];
        m[0] = c * mv0 + s * mv2;
        m[4] = c * mv4 + s * mv6;
        m[8] = c * mv8 + s * mv10;
        m[2] = c * mv2 - s * mv0;
        m[6] = c * mv6 - s * mv4;
        m[10] = c * mv10 - s * mv8;
    },

    /* === Rotasi sumbu Z === */
    rotateZ: function (m, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        const mv0 = m[0], mv4 = m[4], mv8 = m[8];
        const mv1 = m[1], mv5 = m[5], mv9 = m[9];
        m[0] = c * mv0 - s * mv1;
        m[4] = c * mv4 - s * mv5;
        m[8] = c * mv8 - s * mv9;
        m[1] = s * mv0 + c * mv1;
        m[5] = s * mv4 + c * mv5;
        m[9] = s * mv8 + c * mv9;
    },

    /* === Translasi umum === */
    translate: function (m, t) {
        m[12] += t[0];
        m[13] += t[1];
        m[14] += t[2];
    },

    /* === Translasi hanya Z === */
    translateZ: function (m, t) {
        m[14] += t;
    },

    translateY: function (m, t)  {
         m[13] += t; 
        },


    /* === Skala objek === */
    scale: function (m, s) {
        m[0] *= s[0];
        m[1] *= s[0];
        m[2] *= s[0];
        m[3] *= s[0];

        m[4] *= s[1];
        m[5] *= s[1];
        m[6] *= s[1];
        m[7] *= s[1];

        m[8] *= s[2];
        m[9] *= s[2];
        m[10] *= s[2];
        m[11] *= s[2];
    }
};  

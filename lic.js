/* SAS STOCK — licences hors ligne (signature ECDSA P-256, sans serveur) */
(function (root) {
  'use strict';
  var P = 2n ** 256n - 2n ** 224n + 2n ** 192n + 2n ** 96n - 1n;
  var N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
  var G = [0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n,
           0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n];
  var EPOCH = Date.UTC(2026, 0, 1), VIE = 0xffff;

  function mod(a, m) { var r = a % m; return r < 0n ? r + m : r; }
  function inv(a, m) {
    var r0 = m, r1 = mod(a, m), t0 = 0n, t1 = 1n;
    while (r1 !== 0n) { var q = r0 / r1, t = r0 - q * r1; r0 = r1; r1 = t; t = t0 - q * t1; t0 = t1; t1 = t; }
    return mod(t0, m);
  }
  function add(a, b) {
    if (!a) return b; if (!b) return a;
    var l;
    if (a[0] === b[0]) {
      if (mod(a[1] + b[1], P) === 0n) return null;
      l = mod((3n * a[0] * a[0] - 3n) * inv(2n * a[1], P), P);
    } else l = mod((b[1] - a[1]) * inv(b[0] - a[0], P), P);
    var x = mod(l * l - a[0] - b[0], P);
    return [x, mod(l * (a[0] - x) - a[1], P)];
  }
  function mul(k, pt) {
    var r = null, q = pt;
    while (k > 0n) { if (k & 1n) r = add(r, q); q = add(q, q); k >>= 1n; }
    return r;
  }
  function b2n(b) { var h = ''; for (var i = 0; i < b.length; i++) h += (b[i] < 16 ? '0' : '') + b[i].toString(16); return BigInt('0x' + (h || '0')); }
  function n2b(n, len) { var h = n.toString(16).padStart(len * 2, '0'), o = new Uint8Array(len); for (var i = 0; i < len; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; }

  var K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  function sha256(msg) {
    var l = msg.length, tot = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(tot), w = new Uint32Array(64);
    m.set(msg); m[l] = 0x80;
    var dv = new DataView(m.buffer); dv.setUint32(tot - 4, l * 8); dv.setUint32(tot - 8, Math.floor(l / 0x20000000));
    var h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (var o = 0; o < tot; o += 64) {
      var i;
      for (i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (i = 16; i < 64; i++) {
        var s0 = rr(w[i-15],7) ^ rr(w[i-15],18) ^ (w[i-15] >>> 3), s1 = rr(w[i-2],17) ^ rr(w[i-2],19) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
      }
      var a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
      for (i = 0; i < 64; i++) {
        var t1 = (hh + (rr(e,6)^rr(e,11)^rr(e,25)) + ((e&f)^(~e&g)) + K[i] + w[i]) | 0;
        var t2 = ((rr(a,2)^rr(a,13)^rr(a,22)) + ((a&b)^(a&c)^(b&c))) | 0;
        hh=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
      }
      h[0]+=a;h[1]+=b;h[2]+=c;h[3]+=d;h[4]+=e;h[5]+=f;h[6]+=g;h[7]+=hh;
    }
    var out = new Uint8Array(32), ov = new DataView(out.buffer);
    for (var j = 0; j < 8; j++) ov.setUint32(j * 4, h[j]);
    return out;
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  function hex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16); return s; }
  function hashTxt(s) { return hex(sha256(utf8(s))); }

  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function b64e(b) {
    var s = '';
    for (var i = 0; i < b.length; i += 3) {
      var n = (b[i] << 16) | ((b[i+1] || 0) << 8) | (b[i+2] || 0);
      s += B64[n >> 18] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '') + (i + 2 < b.length ? B64[n & 63] : '');
    }
    return s;
  }
  function b64d(s) {
    var out = [], buf = 0, bits = 0;
    for (var i = 0; i < s.length; i++) {
      var v = B64.indexOf(s[i]); if (v < 0) return null;
      buf = (buf << 6) | v; bits += 6;
      if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); }
    }
    return new Uint8Array(out);
  }
  var B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function codeFromBytes(b) { // 5 octets -> XXXX-XXXX
    var n = b2n(b), s = '';
    for (var i = 0; i < 8; i++) { s = B32[Number(n & 31n)] + s; n >>= 5n; }
    return s.slice(0, 4) + '-' + s.slice(4);
  }
  function bytesFromCode(code) {
    var c = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
    if (c.length !== 8) return null;
    var n = 0n;
    for (var i = 0; i < 8; i++) { var v = B32.indexOf(c[i]); if (v < 0) return null; n = (n << 5n) | BigInt(v); }
    return n2b(n, 5);
  }
  function newDeviceCode() { var b = new Uint8Array(5); crypto.getRandomValues(b); return codeFromBytes(b); }
  function normCode(code) { var b = bytesFromCode(code); return b ? codeFromBytes(b) : null; }

  function jour(ms) { return Math.floor((ms - EPOCH) / 86400000); }
  function dateDuJour(j) { return new Date(EPOCH + j * 86400000); }

  function verifySig(msg, sig, pub) {
    var r = b2n(sig.slice(0, 32)), s = b2n(sig.slice(32));
    if (r <= 0n || r >= N || s <= 0n || s >= N) return false;
    var z = b2n(sha256(msg)), w = inv(s, N);
    var pt = add(mul(mod(z * w, N), G), mul(mod(r * w, N), pub));
    return !!pt && mod(pt[0], N) === r;
  }
  function sign(msg, d) {
    var z = b2n(sha256(msg));
    for (;;) {
      var kb = new Uint8Array(32); crypto.getRandomValues(kb);
      var k = b2n(kb); if (k <= 0n || k >= N) continue;
      var r = mod(mul(k, G)[0], N); if (r === 0n) continue;
      var s = mod(inv(k, N) * (z + r * d), N); if (s === 0n) continue;
      var out = new Uint8Array(64); out.set(n2b(r, 32)); out.set(n2b(s, 32), 32); return out;
    }
  }

  /* Clé = "SAS1-" + base64url( v | appareil(5) | expiration(2) | émission(2) | type(1) | signature(64) ) */
  function makeKey(privHex, deviceCode, expJour, type) {
    var dev = bytesFromCode(deviceCode); if (!dev) throw new Error('Code appareil invalide');
    var p = new Uint8Array(11), dv = new DataView(p.buffer);
    p[0] = 1; p.set(dev, 1); dv.setUint16(6, expJour); dv.setUint16(8, Math.max(0, jour(Date.now()))); p[10] = type || 0;
    var sig = sign(p, BigInt('0x' + privHex)), all = new Uint8Array(75);
    all.set(p); all.set(sig, 11);
    return 'SAS1-' + b64e(all);
  }
  function readKey(key, pubHex) {
    var k = String(key || '').replace(/\s+/g, '');
    if (k.slice(0, 5).toUpperCase() !== 'SAS1-') return { ok: false, raison: 'format' };
    var all = b64d(k.slice(5));
    if (!all || all.length !== 75 || all[0] !== 1) return { ok: false, raison: 'format' };
    var p = all.slice(0, 11), dv = new DataView(p.buffer);
    var pub = [BigInt('0x' + pubHex.slice(0, 64)), BigInt('0x' + pubHex.slice(64))];
    if (!verifySig(p, all.slice(11), pub)) return { ok: false, raison: 'signature' };
    var exp = dv.getUint16(6);
    return { ok: true, appareil: codeFromBytes(p.slice(1, 6)), expJour: exp, aVie: exp === VIE,
             expDate: exp === VIE ? null : dateDuJour(exp), emisJour: dv.getUint16(8), type: p[10] };
  }
  /* Contrôle complet : signature, appareil, date. */
  function check(key, pubHex, deviceCode, nowMs) {
    var r = readKey(key, pubHex);
    if (!r.ok) return r;
    if (r.appareil !== normCode(deviceCode)) return { ok: false, raison: 'appareil' };
    var auj = jour(nowMs == null ? Date.now() : nowMs);
    r.reste = r.aVie ? Infinity : r.expJour - auj + 1;
    if (r.reste <= 0) { r.ok = false; r.raison = 'expiree'; }
    return r;
  }
  function pubFromPriv(privHex) { var q = mul(BigInt('0x' + privHex), G); return hex(n2b(q[0], 32)) + hex(n2b(q[1], 32)); }

  var api = { sha256: sha256, hashTxt: hashTxt, newDeviceCode: newDeviceCode, normCode: normCode, makeKey: makeKey,
              readKey: readKey, check: check, jour: jour, dateDuJour: dateDuJour, VIE: VIE, pubFromPriv: pubFromPriv,
              _sign: sign, _verify: verifySig, _hex: hex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LIC = api;
})(typeof self !== 'undefined' ? self : this);

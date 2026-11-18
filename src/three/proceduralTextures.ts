import * as THREE from 'three';

export interface ProceduralTextureSet {
  brushedRoughness: THREE.CanvasTexture;
  dialFace: THREE.CanvasTexture;
  floorGrid: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  particleGlow: THREE.CanvasTexture;
  sandAlbedo: THREE.CanvasTexture;
  sandBump: THREE.CanvasTexture;
  sandRoughness: THREE.CanvasTexture;
  meadowAlbedo: THREE.CanvasTexture;
  meadowBump: THREE.CanvasTexture;
  stoneAlbedo: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  stoneRoughness: THREE.CanvasTexture;
  ashlarAlbedo: THREE.CanvasTexture;
  ashlarBump: THREE.CanvasTexture;
  cobbleAlbedo: THREE.CanvasTexture;
  cobbleBump: THREE.CanvasTexture;
  barkAlbedo: THREE.CanvasTexture;
  barkBump: THREE.CanvasTexture;
  woodAlbedo: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  terracottaAlbedo: THREE.CanvasTexture;
  palmFrondAlbedo: THREE.CanvasTexture;
  oliveLeafAlbedo: THREE.CanvasTexture;
  fabricAlbedo: THREE.CanvasTexture;
  fabricBump: THREE.CanvasTexture;
  silverCoinAlbedo: THREE.CanvasTexture;
  silverCoinBump: THREE.CanvasTexture;
  parchmentAlbedo: THREE.CanvasTexture;
  scenicValleyDay: THREE.CanvasTexture;
  scenicHillsDusk: THREE.CanvasTexture;
  softLightBeam: THREE.CanvasTexture;
  dispose: () => void;
}

// Deterministic pseudo-random helper for repeatable procedural textures
function hash2d(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const anisotropy = Math.max(1, Math.min(maxAnisotropy, 16));

  // 1. Brushed metal micro-grain roughness map (linear data space)
  const brushedCanvas = document.createElement('canvas');
  brushedCanvas.width = 512;
  brushedCanvas.height = 512;
  const bCtx = brushedCanvas.getContext('2d')!;
  bCtx.fillStyle = '#787878';
  bCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) {
    const lum = 105 + Math.floor((Math.sin(y * 0.7) * 0.5 + 0.5) * 45 + (y % 3) * 8);
    bCtx.fillStyle = `rgb(${lum},${lum},${lum})`;
    bCtx.fillRect(0, y, 512, 1);
  }
  const brushedRoughness = new THREE.CanvasTexture(brushedCanvas);
  brushedRoughness.wrapS = THREE.RepeatWrapping;
  brushedRoughness.wrapT = THREE.RepeatWrapping;
  brushedRoughness.repeat.set(2, 2);
  brushedRoughness.colorSpace = THREE.NoColorSpace;
  brushedRoughness.anisotropy = anisotropy;

  // 2. Precision dial / calibration markings texture (SRGB color space)
  const dialCanvas = document.createElement('canvas');
  dialCanvas.width = 1024;
  dialCanvas.height = 1024;
  const dCtx = dialCanvas.getContext('2d')!;
  dCtx.fillStyle = '#12151c';
  dCtx.fillRect(0, 0, 1024, 1024);

  const cx = 512;
  const cy = 512;
  dCtx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
  dCtx.lineWidth = 3;
  [180, 290, 410, 465].forEach((r) => {
    dCtx.beginPath();
    dCtx.arc(cx, cy, r, 0, Math.PI * 2);
    dCtx.stroke();
  });

  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const isMajor = i % 5 === 0;
    const rInner = isMajor ? 420 : 438;
    const rOuter = 460;
    dCtx.strokeStyle = isMajor ? 'rgba(245, 158, 11, 0.92)' : 'rgba(203, 213, 225, 0.45)';
    dCtx.lineWidth = isMajor ? 5 : 2;
    dCtx.beginPath();
    dCtx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
    dCtx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
    dCtx.stroke();
  }

  dCtx.fillStyle = 'rgba(226, 232, 240, 0.72)';
  dCtx.font = '600 22px monospace';
  dCtx.textAlign = 'center';
  dCtx.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const rText = 382;
    const label = String(i * 30).padStart(3, '0');
    dCtx.fillText(label, cx + Math.cos(angle) * rText, cy + Math.sin(angle) * rText);
  }

  const dialFace = new THREE.CanvasTexture(dialCanvas);
  dialFace.colorSpace = THREE.SRGBColorSpace;
  dialFace.anisotropy = anisotropy;

  // 3. Studio floor radial grid texture
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = 512;
  gridCanvas.height = 512;
  const gCtx = gridCanvas.getContext('2d')!;
  gCtx.fillStyle = '#14171f';
  gCtx.fillRect(0, 0, 512, 512);
  gCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  gCtx.lineWidth = 1;
  const step = 64;
  for (let i = 0; i <= 512; i += step) {
    gCtx.beginPath();
    gCtx.moveTo(i, 0);
    gCtx.lineTo(i, 512);
    gCtx.stroke();
    gCtx.beginPath();
    gCtx.moveTo(0, i);
    gCtx.lineTo(512, i);
    gCtx.stroke();
  }
  const floorGrid = new THREE.CanvasTexture(gridCanvas);
  floorGrid.wrapS = THREE.RepeatWrapping;
  floorGrid.wrapT = THREE.RepeatWrapping;
  floorGrid.repeat.set(18, 18);
  floorGrid.colorSpace = THREE.SRGBColorSpace;
  floorGrid.anisotropy = anisotropy;

  // 4. Soft radial contact shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(128, 128, 8, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;

  // 5. Soft circular particle sprite
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 64;
  pCanvas.height = 64;
  const pCtx = pCanvas.getContext('2d')!;
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  pGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
  pGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);
  const particleGlow = new THREE.CanvasTexture(pCanvas);
  particleGlow.colorSpace = THREE.SRGBColorSpace;

  // 6. Natural Wind-Rippled Desert Sand Albedo + Ripple Bump + Matte Roughness
  const sandCanvas = document.createElement('canvas');
  sandCanvas.width = 512;
  sandCanvas.height = 512;
  const snCtx = sandCanvas.getContext('2d')!;
  snCtx.fillStyle = '#7b634c';
  snCtx.fillRect(0, 0, 512, 512);

  const sandBumpCanvas = document.createElement('canvas');
  sandBumpCanvas.width = 512;
  sandBumpCanvas.height = 512;
  const snbCtx = sandBumpCanvas.getContext('2d')!;
  snbCtx.fillStyle = '#808080';
  snbCtx.fillRect(0, 0, 512, 512);

  const sandRoughCanvas = document.createElement('canvas');
  sandRoughCanvas.width = 512;
  sandRoughCanvas.height = 512;
  const snrCtx = sandRoughCanvas.getContext('2d')!;
  snrCtx.fillStyle = '#e6e6e6';
  snrCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 2) {
    const ripple =
      Math.sin(y * 0.14 + Math.sin(y * 0.03) * 2.4) * 14 +
      Math.cos(y * 0.062) * 8;
    const tone = Math.floor(110 + ripple);
    snCtx.fillStyle = `rgba(${tone + 26}, ${tone + 5}, ${tone - 18}, 0.48)`;
    snCtx.fillRect(0, y, 512, 2);

    const bLum = Math.min(255, Math.max(0, Math.floor(128 + ripple * 2.6)));
    snbCtx.fillStyle = `rgb(${bLum},${bLum},${bLum})`;
    snbCtx.fillRect(0, y, 512, 2);

    const rLum = Math.min(255, Math.max(195, Math.floor(236 - ripple * 0.9)));
    snrCtx.fillStyle = `rgb(${rLum},${rLum},${rLum})`;
    snrCtx.fillRect(0, y, 512, 2);
  }
  for (let i = 0; i < 240; i++) {
    const px = hash2d(i, 1.3) * 512;
    const py = hash2d(i, 7.1) * 512;
    const rw = 18 + (i % 5) * 12;
    const rh = 4 + (i % 4) * 3;
    snCtx.fillStyle = i % 2 === 0 ? 'rgba(206, 174, 134, 0.12)' : 'rgba(58, 43, 30, 0.14)';
    snCtx.beginPath();
    snCtx.ellipse(px, py, rw, rh, 0.14, 0, Math.PI * 2);
    snCtx.fill();

    snbCtx.fillStyle = i % 2 === 0 ? 'rgba(175,175,175,0.22)' : 'rgba(92,92,92,0.22)';
    snbCtx.beginPath();
    snbCtx.ellipse(px, py, rw, rh, 0.14, 0, Math.PI * 2);
    snbCtx.fill();
  }
  for (let i = 0; i < 8500; i++) {
    const px = hash2d(i, 13.7) * 512;
    const py = hash2d(i, 29.9) * 512;
    const sz = i % 17 === 0 ? 3 : 2;
    snCtx.fillStyle =
      i % 3 === 0
        ? 'rgba(228, 200, 162, 0.2)'
        : i % 3 === 1
          ? 'rgba(42, 30, 20, 0.22)'
          : 'rgba(154, 126, 94, 0.17)';
    snCtx.fillRect(px, py, sz, sz);
    snbCtx.fillStyle = i % 2 === 0 ? 'rgba(200,200,200,0.22)' : 'rgba(72,72,72,0.24)';
    snbCtx.fillRect(px, py, sz, sz);
  }
  const sandAlbedo = new THREE.CanvasTexture(sandCanvas);
  sandAlbedo.wrapS = THREE.RepeatWrapping;
  sandAlbedo.wrapT = THREE.RepeatWrapping;
  sandAlbedo.repeat.set(16, 16);
  sandAlbedo.colorSpace = THREE.SRGBColorSpace;
  sandAlbedo.anisotropy = anisotropy;

  const sandBump = new THREE.CanvasTexture(sandBumpCanvas);
  sandBump.wrapS = THREE.RepeatWrapping;
  sandBump.wrapT = THREE.RepeatWrapping;
  sandBump.repeat.set(16, 16);
  sandBump.colorSpace = THREE.NoColorSpace;
  sandBump.anisotropy = anisotropy;

  const sandRoughness = new THREE.CanvasTexture(sandRoughCanvas);
  sandRoughness.wrapS = THREE.RepeatWrapping;
  sandRoughness.wrapT = THREE.RepeatWrapping;
  sandRoughness.repeat.set(16, 16);
  sandRoughness.colorSpace = THREE.NoColorSpace;
  sandRoughness.anisotropy = anisotropy;

  // 6b. Hillside Meadow Grass, Earth Soil & Pebble Albedo + Bump
  const meadowCanvas = document.createElement('canvas');
  meadowCanvas.width = 512;
  meadowCanvas.height = 512;
  const mdCtx = meadowCanvas.getContext('2d')!;
  mdCtx.fillStyle = '#4f5d38';
  mdCtx.fillRect(0, 0, 512, 512);

  const meadowBumpCanvas = document.createElement('canvas');
  meadowBumpCanvas.width = 512;
  meadowBumpCanvas.height = 512;
  const mdbCtx = meadowBumpCanvas.getContext('2d')!;
  mdbCtx.fillStyle = '#787878';
  mdbCtx.fillRect(0, 0, 512, 512);

  // Earthy soil & moss variation patches
  for (let i = 0; i < 280; i++) {
    const px = hash2d(i, 3.1) * 512;
    const py = hash2d(i, 8.7) * 512;
    const rx = 14 + (i % 6) * 8;
    const ry = 10 + (i % 4) * 7;
    mdCtx.fillStyle =
      i % 3 === 0
        ? 'rgba(98, 86, 56, 0.24)'
        : i % 3 === 1
          ? 'rgba(62, 78, 40, 0.28)'
          : 'rgba(110, 122, 66, 0.2)';
    mdCtx.beginPath();
    mdCtx.ellipse(px, py, rx, ry, hash2d(i, 5.2) * Math.PI, 0, Math.PI * 2);
    mdCtx.fill();

    mdbCtx.fillStyle = i % 2 === 0 ? 'rgba(148,148,148,0.22)' : 'rgba(96,96,96,0.22)';
    mdbCtx.beginPath();
    mdbCtx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    mdbCtx.fill();
  }
  // Thousands of fine grass blade flecks & dry straw wisps
  for (let i = 0; i < 7000; i++) {
    const px = hash2d(i, 19.3) * 512;
    const py = hash2d(i, 41.9) * 512;
    const len = 4 + (i % 5) * 1.6;
    const ang = -Math.PI * 0.5 + (hash2d(i, 61.1) - 0.5) * 1.1;
    mdCtx.strokeStyle =
      i % 4 === 0
        ? 'rgba(132, 146, 78, 0.36)'
        : i % 4 === 1
          ? 'rgba(54, 72, 34, 0.42)'
          : i % 4 === 2
            ? 'rgba(150, 134, 86, 0.26)'
            : 'rgba(76, 94, 48, 0.38)';
    mdCtx.lineWidth = 1.2;
    mdCtx.beginPath();
    mdCtx.moveTo(px, py);
    mdCtx.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
    mdCtx.stroke();

    mdbCtx.strokeStyle = i % 2 === 0 ? 'rgba(198,198,198,0.34)' : 'rgba(65,65,65,0.28)';
    mdbCtx.lineWidth = 1.2;
    mdbCtx.beginPath();
    mdbCtx.moveTo(px, py);
    mdbCtx.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
    mdbCtx.stroke();
  }
  // Small ground grit & pebbles
  for (let i = 0; i < 420; i++) {
    const px = hash2d(i, 73.7) * 512;
    const py = hash2d(i, 89.3) * 512;
    const pr = 1.2 + (i % 3) * 0.8;
    mdCtx.fillStyle = i % 2 === 0 ? 'rgba(120,108,90,0.4)' : 'rgba(58,50,40,0.42)';
    mdCtx.beginPath();
    mdCtx.arc(px, py, pr, 0, Math.PI * 2);
    mdCtx.fill();
  }
  const meadowAlbedo = new THREE.CanvasTexture(meadowCanvas);
  meadowAlbedo.wrapS = THREE.RepeatWrapping;
  meadowAlbedo.wrapT = THREE.RepeatWrapping;
  meadowAlbedo.repeat.set(16, 16);
  meadowAlbedo.colorSpace = THREE.SRGBColorSpace;
  meadowAlbedo.anisotropy = anisotropy;

  const meadowBump = new THREE.CanvasTexture(meadowBumpCanvas);
  meadowBump.wrapS = THREE.RepeatWrapping;
  meadowBump.wrapT = THREE.RepeatWrapping;
  meadowBump.repeat.set(16, 16);
  meadowBump.colorSpace = THREE.NoColorSpace;
  meadowBump.anisotropy = anisotropy;

  // 7. Fractured Stratified Limestone Albedo + High-Relief Bump + Roughness Map
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 512;
  stoneCanvas.height = 512;
  const stCtx = stoneCanvas.getContext('2d')!;
  stCtx.fillStyle = '#5c4e41';
  stCtx.fillRect(0, 0, 512, 512);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bmCtx = bumpCanvas.getContext('2d')!;
  bmCtx.fillStyle = '#808080';
  bmCtx.fillRect(0, 0, 512, 512);

  const stoneRoughCanvas = document.createElement('canvas');
  stoneRoughCanvas.width = 512;
  stoneRoughCanvas.height = 512;
  const srCtx = stoneRoughCanvas.getContext('2d')!;
  srCtx.fillStyle = '#dedede';
  srCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 2) {
    const strata =
      Math.sin(y * 0.065) * 18 +
      Math.sin(y * 0.23) * 10 +
      Math.cos(y * 0.51) * 5;
    const r = Math.min(255, Math.max(0, 92 + strata));
    const g = Math.min(255, Math.max(0, 78 + strata * 0.86));
    const b = Math.min(255, Math.max(0, 64 + strata * 0.72));
    stCtx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
    stCtx.fillRect(0, y, 512, 2);

    const bLum = Math.min(255, Math.max(0, 128 + strata * 2.8));
    bmCtx.fillStyle = `rgb(${Math.floor(bLum)},${Math.floor(bLum)},${Math.floor(bLum)})`;
    bmCtx.fillRect(0, y, 512, 2);

    const rLum = Math.min(255, Math.max(175, Math.floor(225 - strata * 1.4)));
    srCtx.fillStyle = `rgb(${rLum},${rLum},${rLum})`;
    srCtx.fillRect(0, y, 512, 2);
  }
  for (let c = 0; c < 56; c++) {
    const sx = hash2d(c, 29.13) * 512;
    const sy = hash2d(c, 71.77) * 512;
    const len = 34 + (c % 5) * 26;
    const ang = (c % 2 === 0 ? 0.15 : 1.45) + ((c % 7) - 3) * 0.14;
    stCtx.strokeStyle = 'rgba(20, 16, 12, 0.42)';
    stCtx.lineWidth = 1.6 + (c % 2);
    stCtx.beginPath();
    stCtx.moveTo(sx, sy);
    stCtx.lineTo(sx + Math.cos(ang) * len * 0.5, sy + Math.sin(ang) * len * 0.5 + 4);
    stCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    stCtx.stroke();

    bmCtx.strokeStyle = 'rgba(20, 20, 20, 0.72)';
    bmCtx.lineWidth = 2.8 + (c % 2);
    bmCtx.beginPath();
    bmCtx.moveTo(sx, sy);
    bmCtx.lineTo(sx + Math.cos(ang) * len * 0.5, sy + Math.sin(ang) * len * 0.5 + 4);
    bmCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    bmCtx.stroke();

    srCtx.strokeStyle = 'rgba(250, 250, 250, 0.5)';
    srCtx.lineWidth = 2.5;
    srCtx.beginPath();
    srCtx.moveTo(sx, sy);
    srCtx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
    srCtx.stroke();
  }
  for (let i = 0; i < 5200; i++) {
    const px = hash2d(i, 45.164) * 512;
    const py = hash2d(i, 91.732) * 512;
    const w = 2 + (i % 6);
    stCtx.fillStyle =
      i % 4 === 0
        ? 'rgba(20,16,13,0.26)'
        : i % 4 === 1
          ? 'rgba(162,140,115,0.16)'
          : 'rgba(98,82,64,0.16)';
    stCtx.fillRect(px, py, w, 2);
    bmCtx.fillStyle = i % 3 === 0 ? 'rgba(32,32,32,0.42)' : 'rgba(224,224,224,0.26)';
    bmCtx.fillRect(px, py, w, 2);
  }

  const stoneAlbedo = new THREE.CanvasTexture(stoneCanvas);
  stoneAlbedo.wrapS = THREE.RepeatWrapping;
  stoneAlbedo.wrapT = THREE.RepeatWrapping;
  stoneAlbedo.repeat.set(3, 3);
  stoneAlbedo.colorSpace = THREE.SRGBColorSpace;
  stoneAlbedo.anisotropy = anisotropy;

  const stoneBump = new THREE.CanvasTexture(bumpCanvas);
  stoneBump.wrapS = THREE.RepeatWrapping;
  stoneBump.wrapT = THREE.RepeatWrapping;
  stoneBump.repeat.set(3, 3);
  stoneBump.colorSpace = THREE.NoColorSpace;
  stoneBump.anisotropy = anisotropy;

  const stoneRoughness = new THREE.CanvasTexture(stoneRoughCanvas);
  stoneRoughness.wrapS = THREE.RepeatWrapping;
  stoneRoughness.wrapT = THREE.RepeatWrapping;
  stoneRoughness.repeat.set(3, 3);
  stoneRoughness.colorSpace = THREE.NoColorSpace;
  stoneRoughness.anisotropy = anisotropy;

  // 7b. Chiseled Sandstone Ashlar Masonry Albedo + Bump (columns, walls, houses, lintels)
  const ashlarCanvas = document.createElement('canvas');
  ashlarCanvas.width = 512;
  ashlarCanvas.height = 512;
  const asCtx = ashlarCanvas.getContext('2d')!;
  asCtx.fillStyle = '#9c866e';
  asCtx.fillRect(0, 0, 512, 512);

  const ashlarBumpCanvas = document.createElement('canvas');
  ashlarBumpCanvas.width = 512;
  ashlarBumpCanvas.height = 512;
  const asbCtx = ashlarBumpCanvas.getContext('2d')!;
  asbCtx.fillStyle = '#9e9e9e';
  asbCtx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 4;
  const bh = 512 / rows;
  const bw = 512 / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const bx = c * bw + offset;
      const by = r * bh;
      const shade = (hash2d(r * 13 + c, 4.7) - 0.5) * 26;
      const rr = Math.floor(164 + shade);
      const gg = Math.floor(142 + shade * 0.85);
      const bb = Math.floor(116 + shade * 0.72);
      asCtx.fillStyle = `rgb(${rr},${gg},${bb})`;
      asCtx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);

      // Subtle beveled top highlight & bottom mortar shadow
      asCtx.fillStyle = 'rgba(255, 240, 215, 0.14)';
      asCtx.fillRect(bx + 3, by + 3, bw - 6, 4);
      asCtx.fillStyle = 'rgba(38, 28, 20, 0.34)';
      asCtx.fillRect(bx, by, bw, 3);
      asCtx.fillRect(bx, by, 3, bh);

      const bVal = Math.floor(148 + shade * 1.1);
      asbCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
      asbCtx.fillRect(bx + 4, by + 4, bw - 8, bh - 8);
      asbCtx.fillStyle = '#282828';
      asbCtx.fillRect(bx, by, bw, 4);
      asbCtx.fillRect(bx, by, 4, bh);
    }
  }
  for (let i = 0; i < 3200; i++) {
    const px = hash2d(i, 12.1) * 512;
    const py = hash2d(i, 54.3) * 512;
    asCtx.fillStyle = i % 2 === 0 ? 'rgba(42,32,22,0.12)' : 'rgba(235,218,192,0.1)';
    asCtx.fillRect(px, py, 3, 2);
    asbCtx.fillStyle = i % 2 === 0 ? 'rgba(65,65,65,0.2)' : 'rgba(215,215,215,0.16)';
    asbCtx.fillRect(px, py, 2, 2);
  }
  const ashlarAlbedo = new THREE.CanvasTexture(ashlarCanvas);
  ashlarAlbedo.wrapS = THREE.RepeatWrapping;
  ashlarAlbedo.wrapT = THREE.RepeatWrapping;
  ashlarAlbedo.repeat.set(2, 2);
  ashlarAlbedo.colorSpace = THREE.SRGBColorSpace;
  ashlarAlbedo.anisotropy = anisotropy;

  const ashlarBump = new THREE.CanvasTexture(ashlarBumpCanvas);
  ashlarBump.wrapS = THREE.RepeatWrapping;
  ashlarBump.wrapT = THREE.RepeatWrapping;
  ashlarBump.repeat.set(2, 2);
  ashlarBump.colorSpace = THREE.NoColorSpace;
  ashlarBump.anisotropy = anisotropy;

  // 7c. Courtyard Cobblestone / Flagstone Pavers Albedo + Bump
  const cobbleCanvas = document.createElement('canvas');
  cobbleCanvas.width = 512;
  cobbleCanvas.height = 512;
  const cbCtx = cobbleCanvas.getContext('2d')!;
  cbCtx.fillStyle = '#473d34';
  cbCtx.fillRect(0, 0, 512, 512);

  const cobbleBumpCanvas = document.createElement('canvas');
  cobbleBumpCanvas.width = 512;
  cobbleBumpCanvas.height = 512;
  const cbbCtx = cobbleBumpCanvas.getContext('2d')!;
  cbbCtx.fillStyle = '#303030';
  cbbCtx.fillRect(0, 0, 512, 512);

  const cRows = 10;
  const cCols = 8;
  const ch = 512 / cRows;
  const cw = 512 / cCols;
  for (let r = 0; r < cRows; r++) {
    const off = (r % 2) * (cw * 0.45);
    for (let c = -1; c <= cCols; c++) {
      const jitW = (hash2d(r, c) - 0.5) * 6;
      const sx = c * cw + off + 4;
      const sy = r * ch + 4;
      const sw = cw - 8 + jitW;
      const sh = ch - 8;
      const tone = 114 + (hash2d(c * 7, r * 11) - 0.5) * 32;
      cbCtx.fillStyle = `rgb(${Math.floor(tone + 14)},${Math.floor(tone)},${Math.floor(tone - 14)})`;
      cbCtx.beginPath();
      cbCtx.roundRect(sx, sy, sw, sh, 7);
      cbCtx.fill();

      const bVal = Math.floor(156 + (hash2d(c * 3, r * 5) - 0.5) * 44);
      cbbCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
      cbbCtx.beginPath();
      cbbCtx.roundRect(sx, sy, sw, sh, 7);
      cbbCtx.fill();
    }
  }
  for (let i = 0; i < 3600; i++) {
    const px = hash2d(i, 31.7) * 512;
    const py = hash2d(i, 77.3) * 512;
    cbCtx.fillStyle = i % 2 === 0 ? 'rgba(28,22,18,0.16)' : 'rgba(218,196,166,0.12)';
    cbCtx.fillRect(px, py, 2, 2);
  }
  const cobbleAlbedo = new THREE.CanvasTexture(cobbleCanvas);
  cobbleAlbedo.wrapS = THREE.RepeatWrapping;
  cobbleAlbedo.wrapT = THREE.RepeatWrapping;
  cobbleAlbedo.repeat.set(7, 7);
  cobbleAlbedo.colorSpace = THREE.SRGBColorSpace;
  cobbleAlbedo.anisotropy = anisotropy;

  const cobbleBump = new THREE.CanvasTexture(cobbleBumpCanvas);
  cobbleBump.wrapS = THREE.RepeatWrapping;
  cobbleBump.wrapT = THREE.RepeatWrapping;
  cobbleBump.repeat.set(7, 7);
  cobbleBump.colorSpace = THREE.NoColorSpace;
  cobbleBump.anisotropy = anisotropy;

  // 8. Deeply Fissured Olive/Oak/Palm Bark Albedo + High-Relief Furrow Bump
  const barkCanvas = document.createElement('canvas');
  barkCanvas.width = 512;
  barkCanvas.height = 512;
  const bkCtx = barkCanvas.getContext('2d')!;
  bkCtx.fillStyle = '#4e3c2d';
  bkCtx.fillRect(0, 0, 512, 512);

  const barkBumpCanvas = document.createElement('canvas');
  barkBumpCanvas.width = 512;
  barkBumpCanvas.height = 512;
  const bkbCtx = barkBumpCanvas.getContext('2d')!;
  bkbCtx.fillStyle = '#808080';
  bkbCtx.fillRect(0, 0, 512, 512);

  // Vertical gnarled ridges & deep bark furrows
  for (let x = 0; x < 512; x += 2) {
    const ridge =
      Math.sin(x * 0.14) * 18 +
      Math.sin(x * 0.42) * 10 +
      Math.cos(x * 0.95) * 6;
    const r = Math.min(255, Math.max(20, Math.floor(82 + ridge)));
    const g = Math.min(255, Math.max(16, Math.floor(64 + ridge * 0.78)));
    const b = Math.min(255, Math.max(12, Math.floor(46 + ridge * 0.58)));
    bkCtx.fillStyle = `rgb(${r},${g},${b})`;
    bkCtx.fillRect(x, 0, 2, 512);

    const bLum = Math.min(255, Math.max(0, Math.floor(128 + ridge * 2.9)));
    bkbCtx.fillStyle = `rgb(${bLum},${bLum},${bLum})`;
    bkbCtx.fillRect(x, 0, 2, 512);
  }
  // Organic knotted bark cracks + lichen/moss highlights
  for (let f = 0; f < 85; f++) {
    const fx = hash2d(f, 5.1) * 512;
    const fy = hash2d(f, 11.9) * 512;
    const fl = 44 + (f % 5) * 32;
    const drift = (hash2d(f, 23.3) - 0.5) * 18;
    bkCtx.strokeStyle = 'rgba(20, 14, 9, 0.62)';
    bkCtx.lineWidth = 2 + (f % 3);
    bkCtx.beginPath();
    bkCtx.moveTo(fx, fy);
    bkCtx.quadraticCurveTo(fx + drift, fy + fl * 0.5, fx - drift * 0.4, fy + fl);
    bkCtx.stroke();

    bkbCtx.strokeStyle = 'rgba(18, 18, 18, 0.8)';
    bkbCtx.lineWidth = 3 + (f % 3);
    bkbCtx.beginPath();
    bkbCtx.moveTo(fx, fy);
    bkbCtx.quadraticCurveTo(fx + drift, fy + fl * 0.5, fx - drift * 0.4, fy + fl);
    bkbCtx.stroke();
  }
  // Subtle dry silver-olive bark lichen speckles
  for (let i = 0; i < 600; i++) {
    const px = hash2d(i, 41.2) * 512;
    const py = hash2d(i, 87.6) * 512;
    bkCtx.fillStyle = i % 3 === 0 ? 'rgba(128, 134, 102, 0.2)' : 'rgba(148, 122, 92, 0.16)';
    bkCtx.fillRect(px, py, 4 + (i % 4), 3);
  }
  const barkAlbedo = new THREE.CanvasTexture(barkCanvas);
  barkAlbedo.wrapS = THREE.RepeatWrapping;
  barkAlbedo.wrapT = THREE.RepeatWrapping;
  barkAlbedo.repeat.set(2, 4);
  barkAlbedo.colorSpace = THREE.SRGBColorSpace;
  barkAlbedo.anisotropy = anisotropy;

  const barkBump = new THREE.CanvasTexture(barkBumpCanvas);
  barkBump.wrapS = THREE.RepeatWrapping;
  barkBump.wrapT = THREE.RepeatWrapping;
  barkBump.repeat.set(2, 4);
  barkBump.colorSpace = THREE.NoColorSpace;
  barkBump.anisotropy = anisotropy;

  // 8b. Warm Carved Cedar / Walnut Timber Grain Albedo + Bump (Rehal, stalls, staffs, lattices)
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 512;
  woodCanvas.height = 512;
  const wdCtx = woodCanvas.getContext('2d')!;
  wdCtx.fillStyle = '#6c4529';
  wdCtx.fillRect(0, 0, 512, 512);

  const woodBumpCanvas = document.createElement('canvas');
  woodBumpCanvas.width = 512;
  woodBumpCanvas.height = 512;
  const wdbCtx = woodBumpCanvas.getContext('2d')!;
  wdbCtx.fillStyle = '#808080';
  wdbCtx.fillRect(0, 0, 512, 512);

  for (let x = 0; x < 512; x += 2) {
    const grain =
      Math.sin(x * 0.22 + Math.sin(x * 0.04) * 3.0) * 13 +
      Math.cos(x * 0.65) * 5;
    const r = Math.min(255, Math.max(25, Math.floor(110 + grain)));
    const g = Math.min(255, Math.max(16, Math.floor(70 + grain * 0.68)));
    const b = Math.min(255, Math.max(10, Math.floor(42 + grain * 0.44)));
    wdCtx.fillStyle = `rgb(${r},${g},${b})`;
    wdCtx.fillRect(x, 0, 2, 512);

    const bLum = Math.min(255, Math.max(0, Math.floor(128 + grain * 2.2)));
    wdbCtx.fillStyle = `rgb(${bLum},${bLum},${bLum})`;
    wdbCtx.fillRect(x, 0, 2, 512);
  }
  const woodAlbedo = new THREE.CanvasTexture(woodCanvas);
  woodAlbedo.wrapS = THREE.RepeatWrapping;
  woodAlbedo.wrapT = THREE.RepeatWrapping;
  woodAlbedo.repeat.set(2, 2);
  woodAlbedo.colorSpace = THREE.SRGBColorSpace;
  woodAlbedo.anisotropy = anisotropy;

  const woodBump = new THREE.CanvasTexture(woodBumpCanvas);
  woodBump.wrapS = THREE.RepeatWrapping;
  woodBump.wrapT = THREE.RepeatWrapping;
  woodBump.repeat.set(2, 2);
  woodBump.colorSpace = THREE.NoColorSpace;
  woodBump.anisotropy = anisotropy;

  // 8c. Kiln-Fired Terracotta Clay Texture (Urns & Amphorae)
  const clayCanvas = document.createElement('canvas');
  clayCanvas.width = 256;
  clayCanvas.height = 256;
  const clCtx = clayCanvas.getContext('2d')!;
  clCtx.fillStyle = '#995334';
  clCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    const wheelRing = Math.sin(y * 0.35) * 8;
    clCtx.fillStyle = `rgba(${155 + wheelRing}, ${84 + wheelRing * 0.6}, ${52 + wheelRing * 0.4}, 0.42)`;
    clCtx.fillRect(0, y, 256, 2);
  }
  for (let i = 0; i < 900; i++) {
    const px = hash2d(i, 9.7) * 256;
    const py = hash2d(i, 31.1) * 256;
    clCtx.fillStyle = i % 2 === 0 ? 'rgba(60, 28, 16, 0.2)' : 'rgba(210, 148, 112, 0.14)';
    clCtx.fillRect(px, py, 2, 2);
  }
  const terracottaAlbedo = new THREE.CanvasTexture(clayCanvas);
  terracottaAlbedo.wrapS = THREE.RepeatWrapping;
  terracottaAlbedo.wrapT = THREE.RepeatWrapping;
  terracottaAlbedo.colorSpace = THREE.SRGBColorSpace;
  terracottaAlbedo.anisotropy = anisotropy;

  // 9. High-Detail Pinnate Desert Date Palm Frond Texture (512x512 RGBA)
  const leafCanvas = document.createElement('canvas');
  leafCanvas.width = 512;
  leafCanvas.height = 512;
  const lfCtx = leafCanvas.getContext('2d')!;
  lfCtx.clearRect(0, 0, 512, 512);

  // Tapered woody-green central rachis stem
  const stemGrad = lfCtx.createLinearGradient(0, 504, 0, 12);
  stemGrad.addColorStop(0, '#7c7640');
  stemGrad.addColorStop(0.5, '#5b7234');
  stemGrad.addColorStop(1, '#4c662e');
  lfCtx.strokeStyle = stemGrad;
  lfCtx.lineWidth = 7;
  lfCtx.beginPath();
  lfCtx.moveTo(256, 508);
  lfCtx.quadraticCurveTo(256, 250, 256, 12);
  lfCtx.stroke();

  // 34 dense arched serrated leaflets left & right with subtle shade depth
  for (let i = 0; i < 34; i++) {
    const t = i / 33;
    const y = 486 - t * 462;
    const span = Math.sin(Math.pow(t, 0.88) * Math.PI * 0.94) * 224 + 20;
    const shadeShift = (i % 3) * 10;
    const green = Math.floor(86 + t * 34 + shadeShift);
    const red = Math.floor(46 + t * 18 + shadeShift * 0.5);
    const blue = Math.floor(30 + t * 10);

    lfCtx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    lfCtx.beginPath();
    lfCtx.moveTo(256, y);
    lfCtx.quadraticCurveTo(256 - span * 0.55, y - 16, 256 - span, y - 40);
    lfCtx.quadraticCurveTo(256 - span * 0.45, y - 3, 256, y + 8);
    lfCtx.fill();

    lfCtx.fillStyle = `rgb(${red + 4}, ${green + 4}, ${blue + 2})`;
    lfCtx.beginPath();
    lfCtx.moveTo(256, y);
    lfCtx.quadraticCurveTo(256 + span * 0.55, y - 16, 256 + span, y - 40);
    lfCtx.quadraticCurveTo(256 + span * 0.45, y - 3, 256, y + 8);
    lfCtx.fill();
  }
  const palmFrondAlbedo = new THREE.CanvasTexture(leafCanvas);
  palmFrondAlbedo.colorSpace = THREE.SRGBColorSpace;
  palmFrondAlbedo.anisotropy = anisotropy;

  // 9b. Botanical Olive / Acacia Leaf-Cluster Spray Texture (512x512 RGBA for airy tree crowns)
  const oliveCanvas = document.createElement('canvas');
  oliveCanvas.width = 512;
  oliveCanvas.height = 512;
  const olCtx = oliveCanvas.getContext('2d')!;
  olCtx.clearRect(0, 0, 512, 512);

  // Branching woody twig core inside each foliage card
  const drawTwig = (x0: number, y0: number, x1: number, y1: number, width: number) => {
    olCtx.strokeStyle = '#52412e';
    olCtx.lineWidth = width;
    olCtx.lineCap = 'round';
    olCtx.beginPath();
    olCtx.moveTo(x0, y0);
    olCtx.lineTo(x1, y1);
    olCtx.stroke();
  };
  drawTwig(256, 488, 256, 98, 7);
  drawTwig(256, 390, 128, 250, 5);
  drawTwig(256, 360, 386, 224, 5);
  drawTwig(256, 250, 152, 120, 4);
  drawTwig(256, 232, 364, 108, 4);
  drawTwig(186, 315, 76, 310, 3.5);
  drawTwig(326, 290, 434, 286, 3.5);

  // Clustered lanceolate olive/acacia leaves arranged radially around twigs
  const drawLeaf = (lx: number, ly: number, ang: number, len: number, wid: number, tone: number) => {
    olCtx.save();
    olCtx.translate(lx, ly);
    olCtx.rotate(ang);
    // Olive-sage to sun-warmed canopy leaf colors
    if (tone === 0) olCtx.fillStyle = '#43582c';
    else if (tone === 1) olCtx.fillStyle = '#58703b';
    else if (tone === 2) olCtx.fillStyle = '#6d824b';
    else olCtx.fillStyle = '#7c8f5c'; // silver-olive upper leaf face
    olCtx.beginPath();
    olCtx.moveTo(0, 0);
    olCtx.quadraticCurveTo(len * 0.5, -wid, len, 0);
    olCtx.quadraticCurveTo(len * 0.5, wid, 0, 0);
    olCtx.fill();

    // Subtle central leaf vein
    olCtx.strokeStyle = 'rgba(218, 228, 178, 0.28)';
    olCtx.lineWidth = 1;
    olCtx.beginPath();
    olCtx.moveTo(2, 0);
    olCtx.lineTo(len * 0.85, 0);
    olCtx.stroke();
    olCtx.restore();
  };

  for (let i = 0; i < 118; i++) {
    const t = i / 118;
    const branchPick = i % 5;
    let bx = 256;
    let by = 460 - t * 365;
    if (branchPick === 1) {
      bx = 256 - t * 145;
      by = 395 - t * 175;
    } else if (branchPick === 2) {
      bx = 256 + t * 145;
      by = 365 - t * 170;
    } else if (branchPick === 3) {
      bx = 165 + (hash2d(i, 2.3) - 0.5) * 120;
      by = 285 - t * 185;
    } else if (branchPick === 4) {
      bx = 345 + (hash2d(i, 6.7) - 0.5) * 120;
      by = 275 - t * 180;
    }
    const spreadX = (hash2d(i, 17.3) - 0.5) * 76;
    const spreadY = (hash2d(i, 31.9) - 0.5) * 58;
    const ang = hash2d(i, 53.1) * Math.PI * 2;
    const leafLen = 34 + (i % 4) * 9;
    const leafWid = 10.5 + (i % 3) * 2.5;
    drawLeaf(bx + spreadX, by + spreadY, ang, leafLen, leafWid, i % 4);
  }
  const oliveLeafAlbedo = new THREE.CanvasTexture(oliveCanvas);
  oliveLeafAlbedo.colorSpace = THREE.SRGBColorSpace;
  oliveLeafAlbedo.anisotropy = anisotropy;

  // 10. Woven Linen / Wool Cloth Albedo & Deeper Slub Bump Map
  const fabricCanvas = document.createElement('canvas');
  fabricCanvas.width = 256;
  fabricCanvas.height = 256;
  const fbCtx = fabricCanvas.getContext('2d')!;
  fbCtx.fillStyle = '#c8c3ba';
  fbCtx.fillRect(0, 0, 256, 256);

  const fabricBumpCanvas = document.createElement('canvas');
  fabricBumpCanvas.width = 256;
  fabricBumpCanvas.height = 256;
  const fbmCtx = fabricBumpCanvas.getContext('2d')!;
  fbmCtx.fillStyle = '#808080';
  fbmCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 256; i += 2) {
    const warp = 184 + Math.floor(Math.sin(i * 0.55) * 16 + ((i * 7) % 18));
    fbCtx.fillStyle = `rgba(${warp}, ${warp - 4}, ${warp - 10}, 0.42)`;
    fbCtx.fillRect(i, 0, 1, 256);
    fbCtx.fillRect(0, i, 256, 1);

    const bumpVal = i % 4 === 0 ? 174 : 90;
    fbmCtx.fillStyle = `rgb(${bumpVal}, ${bumpVal}, ${bumpVal})`;
    fbmCtx.fillRect(i, 0, 2, 256);
    fbmCtx.fillRect(0, i, 256, 2);
  }
  for (let i = 0; i < 2200; i++) {
    const px = hash2d(i, 37.13) * 256;
    const py = hash2d(i, 83.41) * 256;
    fbCtx.fillStyle = i % 2 === 0 ? 'rgba(255,250,240,0.1)' : 'rgba(25,22,18,0.12)';
    fbCtx.fillRect(px, py, 2, 2);
  }

  const fabricAlbedo = new THREE.CanvasTexture(fabricCanvas);
  fabricAlbedo.wrapS = THREE.RepeatWrapping;
  fabricAlbedo.wrapT = THREE.RepeatWrapping;
  fabricAlbedo.repeat.set(5, 5);
  fabricAlbedo.colorSpace = THREE.SRGBColorSpace;
  fabricAlbedo.anisotropy = anisotropy;

  const fabricBump = new THREE.CanvasTexture(fabricBumpCanvas);
  fabricBump.wrapS = THREE.RepeatWrapping;
  fabricBump.wrapT = THREE.RepeatWrapping;
  fabricBump.repeat.set(5, 5);
  fabricBump.colorSpace = THREE.NoColorSpace;
  fabricBump.anisotropy = anisotropy;

  // 11. Ancient Geometric Stamped Silver Coin Albedo & Bump (zero human faces)
  const coinCanvas = document.createElement('canvas');
  coinCanvas.width = 512;
  coinCanvas.height = 512;
  const cnCtx = coinCanvas.getContext('2d')!;
  cnCtx.fillStyle = '#aeb5be';
  cnCtx.fillRect(0, 0, 512, 512);

  const coinBumpCanvas = document.createElement('canvas');
  coinBumpCanvas.width = 512;
  coinBumpCanvas.height = 512;
  const cnbCtx = coinBumpCanvas.getContext('2d')!;
  cnbCtx.fillStyle = '#707070';
  cnbCtx.fillRect(0, 0, 512, 512);

  const cMid = 256;
  cnCtx.strokeStyle = '#68707a';
  cnCtx.lineWidth = 8;
  cnbCtx.strokeStyle = '#d8d8d8';
  cnbCtx.lineWidth = 10;
  [218, 178, 108].forEach((r) => {
    cnCtx.beginPath();
    cnCtx.arc(cMid, cMid, r, 0, Math.PI * 2);
    cnCtx.stroke();
    cnbCtx.beginPath();
    cnbCtx.arc(cMid, cMid, r, 0, Math.PI * 2);
    cnbCtx.stroke();
  });

  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const x = cMid + Math.cos(a) * 198;
    const y = cMid + Math.sin(a) * 198;
    cnCtx.fillStyle = '#d9dfe6';
    cnCtx.beginPath();
    cnCtx.arc(x, y, 5, 0, Math.PI * 2);
    cnCtx.fill();
    cnbCtx.fillStyle = '#efefef';
    cnbCtx.beginPath();
    cnbCtx.arc(x, y, 5, 0, Math.PI * 2);
    cnbCtx.fill();
  }

  for (let s = 0; s < 2; s++) {
    cnCtx.save();
    cnCtx.translate(cMid, cMid);
    cnCtx.rotate((s * Math.PI) / 4);
    cnCtx.strokeStyle = '#d4dae2';
    cnCtx.lineWidth = 7;
    cnCtx.strokeRect(-58, -58, 116, 116);
    cnCtx.restore();

    cnbCtx.save();
    cnbCtx.translate(cMid, cMid);
    cnbCtx.rotate((s * Math.PI) / 4);
    cnbCtx.strokeStyle = '#ffffff';
    cnbCtx.lineWidth = 9;
    cnbCtx.strokeRect(-58, -58, 116, 116);
    cnbCtx.restore();
  }

  const silverCoinAlbedo = new THREE.CanvasTexture(coinCanvas);
  silverCoinAlbedo.colorSpace = THREE.SRGBColorSpace;
  silverCoinAlbedo.anisotropy = anisotropy;

  const silverCoinBump = new THREE.CanvasTexture(coinBumpCanvas);
  silverCoinBump.colorSpace = THREE.NoColorSpace;
  silverCoinBump.anisotropy = anisotropy;

  // 12. Ornate Illuminated Geometric Parchment Page (for Quran stand / Rehal)
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = 512;
  pageCanvas.height = 512;
  const pgCtx = pageCanvas.getContext('2d')!;
  pgCtx.fillStyle = '#efe1bf';
  pgCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 600; i++) {
    const px = hash2d(i, 41.7) * 512;
    const py = hash2d(i, 93.1) * 512;
    pgCtx.fillStyle = i % 2 === 0 ? 'rgba(182, 148, 96, 0.08)' : 'rgba(255, 248, 230, 0.09)';
    pgCtx.fillRect(px, py, 8, 8);
  }
  pgCtx.strokeStyle = '#b9872b';
  pgCtx.lineWidth = 14;
  pgCtx.strokeRect(24, 24, 464, 464);
  pgCtx.strokeStyle = '#1e5c4c';
  pgCtx.lineWidth = 5;
  pgCtx.strokeRect(42, 42, 428, 428);
  [
    [52, 52],
    [460, 52],
    [52, 460],
    [460, 460],
  ].forEach(([mx, my]) => {
    pgCtx.fillStyle = '#b9872b';
    pgCtx.beginPath();
    pgCtx.arc(mx, my, 12, 0, Math.PI * 2);
    pgCtx.fill();
  });
  pgCtx.fillStyle = 'rgba(30, 92, 76, 0.18)';
  pgCtx.fillRect(72, 62, 368, 36);
  pgCtx.strokeStyle = '#b9872b';
  pgCtx.lineWidth = 2;
  pgCtx.strokeRect(72, 62, 368, 36);

  pgCtx.fillStyle = '#473623';
  for (let row = 0; row < 10; row++) {
    const y = 124 + row * 32;
    const w = row % 4 === 3 ? 235 : 340;
    pgCtx.fillRect(86, y, w, 5);
    pgCtx.fillStyle = '#c28f2e';
    pgCtx.beginPath();
    pgCtx.arc(86 + w + 14, y + 2.5, 4, 0, Math.PI * 2);
    pgCtx.fill();
    pgCtx.fillStyle = '#473623';
  }
  const parchmentAlbedo = new THREE.CanvasTexture(pageCanvas);
  parchmentAlbedo.colorSpace = THREE.SRGBColorSpace;
  parchmentAlbedo.anisotropy = anisotropy;

  // 13. Seamless 360° Painted Static Scenic Dome Panoramas
  const buildScenicPanorama = (variant: 'day' | 'dusk'): THREE.CanvasTexture => {
    const W = 2048;
    const H = 768;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const c = cv.getContext('2d')!;

    const skyGrad = c.createLinearGradient(0, 0, 0, H);
    if (variant === 'day') {
      skyGrad.addColorStop(0.0, '#233b54');
      skyGrad.addColorStop(0.28, '#3b5c78');
      skyGrad.addColorStop(0.55, '#6d8ba0');
      skyGrad.addColorStop(0.72, '#cfa472');
      skyGrad.addColorStop(0.84, '#dfb986');
      skyGrad.addColorStop(1.0, '#785e46');
    } else {
      skyGrad.addColorStop(0.0, '#131f36');
      skyGrad.addColorStop(0.28, '#1e304e');
      skyGrad.addColorStop(0.56, '#334866');
      skyGrad.addColorStop(0.73, '#5d5b72');
      skyGrad.addColorStop(0.86, '#755952');
      skyGrad.addColorStop(1.0, '#2a2a2e');
    }
    c.fillStyle = skyGrad;
    c.fillRect(0, 0, W, H);

    const glowX = variant === 'day' ? W * 0.45 : W * 0.52;
    const glowY = H * 0.72;
    const glow = c.createRadialGradient(glowX, glowY, 20, glowX, glowY, 540);
    if (variant === 'day') {
      glow.addColorStop(0, 'rgba(255, 226, 172, 0.5)');
      glow.addColorStop(0.5, 'rgba(235, 175, 105, 0.2)');
      glow.addColorStop(1, 'rgba(235, 175, 105, 0.0)');
    } else {
      glow.addColorStop(0, 'rgba(255, 152, 78, 0.34)');
      glow.addColorStop(0.5, 'rgba(180, 100, 72, 0.14)');
      glow.addColorStop(1, 'rgba(90, 60, 70, 0.0)');
    }
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);

    for (let i = 0; i < 38; i++) {
      const cxp = (i * 197) % W;
      const cyp = H * 0.34 + (i % 7) * 32;
      const cw = 150 + (i % 5) * 58;
      const ch = 14 + (i % 4) * 7;
      for (const shift of [0, -W, W]) {
        c.fillStyle =
          variant === 'day'
            ? 'rgba(255, 240, 212, 0.16)'
            : 'rgba(182, 198, 228, 0.1)';
        c.beginPath();
        c.ellipse(cxp + shift, cyp, cw, ch, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle =
          variant === 'day'
            ? 'rgba(220, 178, 132, 0.1)'
            : 'rgba(105, 112, 148, 0.08)';
        c.beginPath();
        c.ellipse(cxp + shift + 18, cyp + 8, cw * 0.85, ch * 0.75, 0, 0, Math.PI * 2);
        c.fill();
      }
    }

    if (variant === 'dusk') {
      for (let i = 0; i < 200; i++) {
        const sx = hash2d(i, 19.31) * W;
        const sy = hash2d(i, 73.17) * (H * 0.54);
        const r = 0.7 + (i % 3) * 0.45;
        c.fillStyle = `rgba(226, 236, 255, ${0.24 + (i % 4) * 0.14})`;
        c.beginPath();
        c.arc(sx, sy, r, 0, Math.PI * 2);
        c.fill();
      }
    }

    const drawRidge = (
      baseY: number,
      amp: number,
      freqA: number,
      freqB: number,
      phase: number,
      fillHex: string,
      rimHex?: string,
    ) => {
      c.fillStyle = fillHex;
      c.beginPath();
      c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const th = (x / W) * Math.PI * 2;
        const raw =
          Math.sin(th * freqA + phase) * 0.52 +
          Math.cos(th * freqB - phase * 0.7) * 0.32 +
          Math.sin(th * (freqA + freqB) + phase * 1.4) * 0.16;
        const plateau = Math.min(0.76, Math.abs(raw));
        c.lineTo(x, baseY - plateau * amp);
      }
      c.lineTo(W, H);
      c.closePath();
      c.fill();

      if (rimHex) {
        c.strokeStyle = rimHex;
        c.lineWidth = 2.5;
        c.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const th = (x / W) * Math.PI * 2;
          const raw =
            Math.sin(th * freqA + phase) * 0.52 +
            Math.cos(th * freqB - phase * 0.7) * 0.32 +
            Math.sin(th * (freqA + freqB) + phase * 1.4) * 0.16;
          const plateau = Math.min(0.76, Math.abs(raw));
          if (x === 0) c.moveTo(x, baseY - plateau * amp);
          else c.lineTo(x, baseY - plateau * amp);
        }
        c.stroke();
      }
    };

    if (variant === 'day') {
      drawRidge(H * 0.72, 108, 3, 7, 0.25, '#9d8c80', 'rgba(255,232,196,0.22)');
      drawRidge(H * 0.77, 92, 4, 9, 1.55, '#8a735e', 'rgba(255,220,175,0.18)');
      drawRidge(H * 0.82, 74, 5, 11, 2.8, '#735b46');
      drawRidge(H * 0.87, 50, 6, 13, 4.1, '#594534');
    } else {
      drawRidge(H * 0.72, 106, 3, 7, 0.6, '#3c4a62', 'rgba(195,214,242,0.14)');
      drawRidge(H * 0.77, 88, 4, 9, 2.0, '#2f3b4f');
      drawRidge(H * 0.82, 70, 5, 11, 3.2, '#242e3b');
      drawRidge(H * 0.87, 48, 6, 13, 4.5, '#1c2326');
    }

    for (let i = 0; i < 72; i++) {
      const th = (i / 72) * Math.PI * 2;
      const tx = (i / 72) * W;
      const ty =
        H * 0.86 -
        Math.min(
          0.76,
          Math.abs(Math.sin(th * 6 + 4.1) * 0.52 + Math.cos(th * 13 - 2.87) * 0.32),
        ) *
          38;
      const tr = 7 + (i % 5) * 3.5;
      c.fillStyle = variant === 'day' ? 'rgba(65, 62, 42, 0.72)' : 'rgba(22, 32, 26, 0.78)';
      c.beginPath();
      c.arc(tx, ty + 10, tr, 0, Math.PI * 2);
      c.fill();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
  };

  const scenicValleyDay = buildScenicPanorama('day');
  const scenicHillsDusk = buildScenicPanorama('dusk');

  // 14. Soft Volumetric God-Ray / Light Shaft Texture
  const beamCv = document.createElement('canvas');
  beamCv.width = 256;
  beamCv.height = 512;
  const bm = beamCv.getContext('2d')!;
  const bImg = bm.createImageData(256, 512);
  for (let y = 0; y < 512; y++) {
    const v = y / 511;
    const vFade = Math.pow(Math.sin(v * Math.PI), 1.35) * (1 - v * 0.25);
    for (let x = 0; x < 256; x++) {
      const u = x / 255;
      const hFade = Math.pow(Math.sin(u * Math.PI), 2.4);
      const streak = 0.85 + Math.sin(u * Math.PI * 7) * 0.15;
      const a = Math.min(1, Math.max(0, vFade * hFade * streak));
      const idx = (y * 256 + x) * 4;
      bImg.data[idx] = 255;
      bImg.data[idx + 1] = 236;
      bImg.data[idx + 2] = 192;
      bImg.data[idx + 3] = Math.round(a * 255);
    }
  }
  bm.putImageData(bImg, 0, 0);
  const softLightBeam = new THREE.CanvasTexture(beamCv);
  softLightBeam.colorSpace = THREE.SRGBColorSpace;
  softLightBeam.anisotropy = anisotropy;

  return {
    brushedRoughness,
    dialFace,
    floorGrid,
    contactShadow,
    particleGlow,
    sandAlbedo,
    sandBump,
    sandRoughness,
    meadowAlbedo,
    meadowBump,
    stoneAlbedo,
    stoneBump,
    stoneRoughness,
    ashlarAlbedo,
    ashlarBump,
    cobbleAlbedo,
    cobbleBump,
    barkAlbedo,
    barkBump,
    woodAlbedo,
    woodBump,
    terracottaAlbedo,
    palmFrondAlbedo,
    oliveLeafAlbedo,
    fabricAlbedo,
    fabricBump,
    silverCoinAlbedo,
    silverCoinBump,
    parchmentAlbedo,
    scenicValleyDay,
    scenicHillsDusk,
    softLightBeam,
    dispose: () => {
      brushedRoughness.dispose();
      dialFace.dispose();
      floorGrid.dispose();
      contactShadow.dispose();
      particleGlow.dispose();
      sandAlbedo.dispose();
      sandBump.dispose();
      sandRoughness.dispose();
      meadowAlbedo.dispose();
      meadowBump.dispose();
      stoneAlbedo.dispose();
      stoneBump.dispose();
      stoneRoughness.dispose();
      ashlarAlbedo.dispose();
      ashlarBump.dispose();
      cobbleAlbedo.dispose();
      cobbleBump.dispose();
      barkAlbedo.dispose();
      barkBump.dispose();
      woodAlbedo.dispose();
      woodBump.dispose();
      terracottaAlbedo.dispose();
      palmFrondAlbedo.dispose();
      oliveLeafAlbedo.dispose();
      fabricAlbedo.dispose();
      fabricBump.dispose();
      silverCoinAlbedo.dispose();
      silverCoinBump.dispose();
      parchmentAlbedo.dispose();
      scenicValleyDay.dispose();
      scenicHillsDusk.dispose();
      softLightBeam.dispose();
    },
  };
}

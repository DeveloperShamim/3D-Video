import * as THREE from 'three';

export interface TravelerCharacterRig {
  root: THREE.Group;
  setPoseWalk: (phase: number, cautiousLook?: number) => void;
  setPoseRest: (sleepBlend: number, time?: number, sideRoll?: number) => void;
  setPoseAwaken: (standBlend: number, time: number, sideRoll?: number) => void;
  setPoseLookout: (time: number) => void;
  setPoseSit: (sitBlend: number, time?: number, headYaw?: number, handGesture?: number) => void;
  setPoseDua: (duaBlend: number, time?: number) => void;
  setPoseStandGuard: (time: number, commandRaise?: number) => void;
  setHeldProvision: (showCoin: boolean, showPouch: boolean) => void;
  dispose: () => void;
}

export interface TravelerAppearance {
  tunicColor?: number;
  cloakColor?: number;
  scarfColor?: number;
  sashColor?: number;
  heightScale?: number;
  hasStaff?: boolean;
  fabricMap?: THREE.Texture;
  fabricBumpMap?: THREE.Texture;
  woodMap?: THREE.Texture;
  woodBumpMap?: THREE.Texture;
  leatherBumpMap?: THREE.Texture;
}

export interface CrowdCharacterGeometries {
  standBodyGeo: THREE.BufferGeometry;
  standHeadGeo: THREE.BufferGeometry;
  standVeilGeo: THREE.BufferGeometry;
  bowRobeGeo: THREE.BufferGeometry;
  bowTorsoGeo: THREE.BufferGeometry;
  bowHeadGeo: THREE.BufferGeometry;
  bowVeilGeo: THREE.BufferGeometry;
  dispose: () => void;
}

/**
 * Merges multiple BufferGeometries (matching position/normal/uv attributes)
 * into a single non-indexed BufferGeometry for low draw-call instanced crowds.
 */
function mergePartGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((p) => {
    const ni = p.index ? p.toNonIndexed() : p;
    if (!ni.attributes.normal) ni.computeVertexNormals();
    return ni;
  });

  let totalVerts = 0;
  nonIndexed.forEach((g) => {
    totalVerts += g.attributes.position.count;
  });

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  let offset = 0;
  nonIndexed.forEach((g, idx) => {
    const pos = g.attributes.position.array as Float32Array;
    const norm = g.attributes.normal.array as Float32Array;
    const uv = g.attributes.uv?.array as Float32Array | undefined;

    positions.set(pos, offset * 3);
    normals.set(norm, offset * 3);
    if (uv) {
      uvs.set(uv, offset * 2);
    }
    offset += g.attributes.position.count;
    if (g !== parts[idx]) g.dispose();
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Creates a softly curved, tapered 3D cloth ribbon (for scarf tails and sash ends)
 * instead of flat rectangular boxes.
 */
function createClothRibbonGeo(
  widthTop: number,
  widthBottom: number,
  length: number,
  thickness: number,
  curveForwardZ: number,
  swayX: number,
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, length, thickness, 4, 10, 1);
  geo.translate(0, -length * 0.5, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = THREE.MathUtils.clamp(-y / length, 0, 1);
    const w = THREE.MathUtils.lerp(widthTop, widthBottom, Math.pow(t, 0.85));
    const ripple = Math.sin(t * Math.PI * 2.2) * 0.012 * t;
    const edgeRound = Math.cos(x * Math.PI) * 0.004;
    const nx = x * w + Math.sin(t * Math.PI * 0.9) * swayX;
    const nz = z * (1 - t * 0.25) + Math.pow(t, 1.35) * curveForwardZ + ripple + edgeRound;
    pos.setXYZ(i, nx, y, nz);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an anatomical contoured leather sandal sole using an extruded rounded footprint.
 */
function createSandalSoleGeo(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.048);
  shape.bezierCurveTo(0.044, -0.048, 0.048, 0.01, 0.042, 0.055);
  shape.bezierCurveTo(0.052, 0.1, 0.054, 0.155, 0.0, 0.168);
  shape.bezierCurveTo(-0.054, 0.155, -0.052, 0.1, -0.042, 0.055);
  shape.bezierCurveTo(-0.048, 0.01, -0.044, -0.048, 0, -0.048);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, -0.038, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Shared sculpted geometries for instanced background citizens (standing & bowing)
 * so crowds share realistic robed, sleeved, and turbaned/hooded silhouettes (100% faceless).
 */
export function createCrowdCharacterGeometries(): CrowdCharacterGeometries {
  const disposables: THREE.BufferGeometry[] = [];

  // Standing dressed figure (pleated thobe + shoulder mantle + folded/hanging draped sleeves)
  const robeLathe = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.32, 0.0),
      new THREE.Vector2(0.285, 0.35),
      new THREE.Vector2(0.225, 0.72),
      new THREE.Vector2(0.185, 0.9),
      new THREE.Vector2(0.218, 1.15),
      new THREE.Vector2(0.215, 1.36),
      new THREE.Vector2(0.115, 1.46),
      new THREE.Vector2(0.075, 1.5),
    ],
    14,
  );
  const rPos = robeLathe.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rPos.count; i++) {
    const x = rPos.getX(i);
    const y = rPos.getY(i);
    const z = rPos.getZ(i);
    const ang = Math.atan2(z, x);
    const pleat = 1 + Math.sin(ang * 7) * 0.035 * Math.max(0, 1 - y / 1.1);
    const depthScale = y > 0.85 ? 0.84 : 1.02;
    rPos.setXYZ(i, x * pleat * 1.04, y, z * pleat * depthScale);
  }
  robeLathe.computeVertexNormals();

  const standSleeveL = new THREE.CylinderGeometry(0.068, 0.055, 0.48, 8);
  standSleeveL.rotateZ(-0.14);
  standSleeveL.rotateX(0.18);
  standSleeveL.translate(-0.245, 1.14, 0.05);

  const standSleeveR = new THREE.CylinderGeometry(0.068, 0.055, 0.48, 8);
  standSleeveR.rotateZ(0.14);
  standSleeveR.rotateX(0.18);
  standSleeveR.translate(0.245, 1.14, 0.05);

  const standSash = new THREE.TorusGeometry(0.195, 0.032, 7, 16);
  standSash.rotateX(Math.PI / 2);
  standSash.scale(1.06, 1.3, 0.94);
  standSash.translate(0, 0.91, 0);

  const standBodyGeo = mergePartGeometries([robeLathe, standSleeveL, standSleeveR, standSash]);
  robeLathe.dispose();
  standSleeveL.dispose();
  standSleeveR.dispose();
  standSash.dispose();

  // Standing headscarf cowl + wrapped turban band
  const hoodCore = new THREE.SphereGeometry(0.155, 14, 12);
  hoodCore.scale(0.95, 1.08, 1.08);
  hoodCore.translate(0, 1.62, -0.015);

  const hoodShoulderDrape = new THREE.CylinderGeometry(0.125, 0.21, 0.2, 12, 1, false);
  hoodShoulderDrape.translate(0, 1.46, -0.025);

  const turbanWrap = new THREE.TorusGeometry(0.148, 0.034, 7, 16);
  turbanWrap.rotateX(Math.PI * 0.44);
  turbanWrap.translate(0, 1.675, 0);

  const standHeadGeo = mergePartGeometries([hoodCore, hoodShoulderDrape, turbanWrap]);
  hoodCore.dispose();
  hoodShoulderDrape.dispose();
  turbanWrap.dispose();

  const standVeilGeo = new THREE.SphereGeometry(0.108, 10, 8);
  standVeilGeo.scale(0.82, 0.96, 0.78);
  standVeilGeo.translate(0, 1.605, 0.078);

  // Bowing worshipper geometries (crouched skirt + sleeved leaning torso + hooded/turbaned head)
  const bowRobeGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.31, -0.31),
      new THREE.Vector2(0.27, -0.05),
      new THREE.Vector2(0.21, 0.26),
      new THREE.Vector2(0.17, 0.34),
    ],
    12,
  );

  const bowCore = new THREE.CapsuleGeometry(0.175, 0.38, 5, 10);
  const bowArmL = new THREE.CylinderGeometry(0.058, 0.048, 0.44, 7);
  bowArmL.rotateX(0.45);
  bowArmL.translate(-0.215, 0.04, 0.14);
  const bowArmR = new THREE.CylinderGeometry(0.058, 0.048, 0.44, 7);
  bowArmR.rotateX(0.45);
  bowArmR.translate(0.215, 0.04, 0.14);
  const bowTorsoGeo = mergePartGeometries([bowCore, bowArmL, bowArmR]);
  bowCore.dispose();
  bowArmL.dispose();
  bowArmR.dispose();

  const bowHoodSphere = new THREE.SphereGeometry(0.148, 12, 10);
  bowHoodSphere.scale(0.96, 1.05, 1.1);
  const bowTurban = new THREE.TorusGeometry(0.142, 0.032, 6, 14);
  bowTurban.rotateX(Math.PI * 0.42);
  bowTurban.translate(0, 0.05, 0);
  const bowHeadGeo = mergePartGeometries([bowHoodSphere, bowTurban]);
  bowHoodSphere.dispose();
  bowTurban.dispose();

  const bowVeilGeo = new THREE.SphereGeometry(0.105, 8, 8);
  bowVeilGeo.scale(0.82, 0.9, 0.75);
  bowVeilGeo.translate(0, -0.03, -0.075);

  disposables.push(
    standBodyGeo,
    standHeadGeo,
    standVeilGeo,
    bowRobeGeo,
    bowTorsoGeo,
    bowHeadGeo,
    bowVeilGeo,
  );

  return {
    standBodyGeo,
    standHeadGeo,
    standVeilGeo,
    bowRobeGeo,
    bowTorsoGeo,
    bowHeadGeo,
    bowVeilGeo,
    dispose: () => {
      disposables.forEach((g) => g.dispose());
    },
  };
}

/**
 * Respectful, realistic, strictly faceless 3D traveler rig with sculpted multi-layered
 * historical desert garments (pleated thobe, rolled-hem open-front abaaya cloak,
 * draped shoulder capelet, pleated waist cummerbund sash with curved flowing end,
 * folded imamah turban & recessed cowl hood over deep shadowed veil, flared robe sleeves
 * with contoured hands, contoured leather sandals, cloth provision pouch, stamped silver
 * coin, and curved hand-carved wooden staff). Zero facial features per Islamic guidance.
 */
export function createTravelerCharacter(
  appearance: TravelerAppearance = {},
): TravelerCharacterRig {
  const {
    tunicColor = 0x7a6a58,
    cloakColor = 0x262e3d,
    scarfColor = 0xd6cbb8,
    sashColor = 0x6b3f28,
    heightScale = 1.0,
    hasStaff = true,
    fabricMap,
    fabricBumpMap,
    woodMap,
    woodBumpMap,
    leatherBumpMap,
  } = appearance;

  const root = new THREE.Group();
  root.scale.setScalar(heightScale);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const tunicMat = new THREE.MeshStandardMaterial({
    color: tunicColor,
    map: fabricMap ?? null,
    bumpMap: fabricBumpMap ?? null,
    bumpScale: 0.04,
    roughness: 0.9,
    metalness: 0.02,
  });
  const cloakMat = new THREE.MeshStandardMaterial({
    color: cloakColor,
    map: fabricMap ?? null,
    bumpMap: fabricBumpMap ?? null,
    bumpScale: 0.044,
    roughness: 0.88,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: scarfColor,
    map: fabricMap ?? null,
    bumpMap: fabricBumpMap ?? null,
    bumpScale: 0.036,
    roughness: 0.86,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const sashMat = new THREE.MeshStandardMaterial({
    color: sashColor,
    map: fabricMap ?? null,
    bumpMap: fabricBumpMap ?? null,
    bumpScale: 0.038,
    roughness: 0.84,
    metalness: 0.04,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x9c7456,
    roughness: 0.72,
    metalness: 0.02,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x3a2618,
    bumpMap: leatherBumpMap ?? null,
    bumpScale: 0.032,
    roughness: 0.76,
    metalness: 0.06,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: woodMap ? 0x8a6445 : 0x543924,
    map: woodMap ?? null,
    bumpMap: woodBumpMap ?? null,
    bumpScale: 0.045,
    roughness: 0.86,
    metalness: 0.03,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc89b46,
    roughness: 0.38,
    metalness: 0.78,
  });
  const veilShadowMat = new THREE.MeshStandardMaterial({
    color: 0x07080b,
    roughness: 0.99,
    metalness: 0.0,
  });
  const silverHandCoinMat = new THREE.MeshStandardMaterial({
    color: 0xd9e1eb,
    metalness: 0.9,
    roughness: 0.25,
  });
  materials.push(
    tunicMat,
    cloakMat,
    scarfMat,
    sashMat,
    skinMat,
    leatherMat,
    woodMat,
    brassMat,
    veilShadowMat,
    silverHandCoinMat,
  );

  // Hips / Pelvis pivot (~0.90m standing height)
  const hips = new THREE.Group();
  hips.position.y = 0.9;
  root.add(hips);

  // Sculpted Deep-Pleated Lower Thobe Skirt (roomy Z clearance so legs never clip cloth)
  const skirtProfile = [
    new THREE.Vector2(0.184, 0.045),
    new THREE.Vector2(0.215, -0.13),
    new THREE.Vector2(0.272, -0.39),
    new THREE.Vector2(0.328, -0.66),
    new THREE.Vector2(0.358, -0.785),
    new THREE.Vector2(0.342, -0.8),
  ];
  const skirtGeo = new THREE.LatheGeometry(skirtProfile, 30);
  const skPos = skirtGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < skPos.count; i++) {
    const x = skPos.getX(i);
    const y = skPos.getY(i);
    const z = skPos.getZ(i);
    const angle = Math.atan2(z, x);
    const drop = Math.max(0, -y / 0.8);
    const fold =
      1 +
      Math.sin(angle * 8.0) * 0.048 * drop +
      Math.cos(angle * 3.0 + 0.6) * 0.028 * drop;
    skPos.setXYZ(i, x * fold, y, z * fold * 1.05);
  }
  skirtGeo.computeVertexNormals();
  geometries.push(skirtGeo);

  const skirt = new THREE.Mesh(skirtGeo, tunicMat);
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  hips.add(skirt);

  // Layered Wrapped Waist Cummerbund Sash (Hizam) + Knotted Fold + Curved Hanging Cloth Tail
  const sashBandGeo = new THREE.CylinderGeometry(0.194, 0.212, 0.135, 26, 4, false);
  const sbPos = sashBandGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sbPos.count; i++) {
    const x = sbPos.getX(i);
    const y = sbPos.getY(i);
    const z = sbPos.getZ(i);
    const ang = Math.atan2(z, x);
    const wrapRidge = 1 + Math.sin(y * 78 + ang * 2.0) * 0.045;
    sbPos.setXYZ(i, x * wrapRidge * 1.06, y, z * wrapRidge * 0.94);
  }
  sashBandGeo.computeVertexNormals();
  const sashKnotGeo = new THREE.SphereGeometry(0.046, 12, 10);
  sashKnotGeo.scale(1.15, 0.95, 0.72);
  const sashTailGeo = createClothRibbonGeo(0.068, 0.056, 0.31, 0.015, 0.055, 0.018);
  geometries.push(sashBandGeo, sashKnotGeo, sashTailGeo);

  const sash = new THREE.Mesh(sashBandGeo, sashMat);
  sash.position.y = 0.04;
  sash.castShadow = true;
  hips.add(sash);

  const sashKnot = new THREE.Mesh(sashKnotGeo, sashMat);
  sashKnot.position.set(0.115, 0.038, 0.175);
  sashKnot.rotation.y = 0.45;
  sashKnot.castShadow = true;
  hips.add(sashKnot);

  const sashTail = new THREE.Mesh(sashTailGeo, sashMat);
  sashTail.position.set(0.12, 0.025, 0.19);
  sashTail.rotation.set(-0.2, 0.28, -0.08);
  sashTail.castShadow = true;
  hips.add(sashTail);

  // Torso Pivot
  const torso = new THREE.Group();
  torso.position.y = 0.05;
  hips.add(torso);

  // Sculpted Anatomical Tunic Torso (tailored waist -> broad chest & soft shoulder slope)
  const torsoProfile = [
    new THREE.Vector2(0.18, 0.0),
    new THREE.Vector2(0.194, 0.16),
    new THREE.Vector2(0.222, 0.36),
    new THREE.Vector2(0.214, 0.49),
    new THREE.Vector2(0.118, 0.565),
    new THREE.Vector2(0.09, 0.62),
  ];
  const chestGeo = new THREE.LatheGeometry(torsoProfile, 26);
  chestGeo.scale(1.08, 1.0, 0.82);
  const chPos = chestGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < chPos.count; i++) {
    const x = chPos.getX(i);
    const y = chPos.getY(i);
    const z = chPos.getZ(i);
    const ang = Math.atan2(z, x);
    const drapeRipple = 1 + Math.sin(ang * 6.0 + y * 5.0) * 0.018;
    chPos.setXYZ(i, x * drapeRipple, y, z * drapeRipple);
  }
  chestGeo.computeVertexNormals();
  geometries.push(chestGeo);

  const chest = new THREE.Mesh(chestGeo, tunicMat);
  chest.castShadow = true;
  chest.receiveShadow = true;
  torso.add(chest);

  // Flowing Rolled-Hem Outer Abaaya / Shoulder Cloak (open front faces +Z)
  const cloakPivot = new THREE.Group();
  cloakPivot.position.set(0, 0.525, -0.038);
  torso.add(cloakPivot);

  const cloakGeo = new THREE.CylinderGeometry(
    0.268,
    0.435,
    1.18,
    30,
    10,
    true,
    Math.PI * 0.36,
    Math.PI * 1.28,
  );
  cloakGeo.translate(0, -0.59, 0);
  const clPos = cloakGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < clPos.count; i++) {
    const x = clPos.getX(i);
    const y = clPos.getY(i);
    const z = clPos.getZ(i);
    const angle = Math.atan2(z, x);
    const drop = Math.max(0, -y / 1.18);
    const pleat =
      1 +
      Math.sin(angle * 7.0) * 0.048 * drop +
      Math.cos(angle * 4.0) * 0.025 * Math.sin(drop * Math.PI);
    const backSweep = -Math.pow(drop, 1.4) * 0.055;
    clPos.setXYZ(i, x * pleat * 1.07, y, z * pleat * 1.03 + backSweep);
  }
  cloakGeo.computeVertexNormals();

  // Softly curved front lapel borders so cloak edges look tailored rather than paper-thin
  const lapelGeo = new THREE.CylinderGeometry(0.022, 0.026, 1.16, 8, 8);
  lapelGeo.translate(0, -0.58, 0);
  const lpPos = lapelGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < lpPos.count; i++) {
    const y = lpPos.getY(i);
    const drop = Math.max(0, -y / 1.16);
    lpPos.setX(i, lpPos.getX(i) + drop * 0.145);
    lpPos.setZ(i, lpPos.getZ(i) + drop * 0.03);
  }
  lapelGeo.computeVertexNormals();
  geometries.push(cloakGeo, lapelGeo);

  const cloakMesh = new THREE.Mesh(cloakGeo, cloakMat);
  cloakMesh.castShadow = true;
  cloakMesh.receiveShadow = true;
  cloakPivot.add(cloakMesh);

  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(lapelGeo, cloakMat);
    const edgeAngle = Math.PI * 0.36;
    lapel.position.set(
      side * Math.sin(edgeAngle) * 0.278,
      0.0,
      Math.cos(edgeAngle) * 0.268,
    );
    if (side < 0) lapel.scale.x = -1;
    lapel.castShadow = true;
    cloakPivot.add(lapel);
  }

  // Draped Shoulder Cape Collar with organic cloth wave ripples
  const collarGeo = new THREE.CylinderGeometry(
    0.132,
    0.275,
    0.175,
    24,
    3,
    true,
    Math.PI * 0.28,
    Math.PI * 1.44,
  );
  collarGeo.translate(0, -0.075, 0);
  const coPos = collarGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < coPos.count; i++) {
    const x = coPos.getX(i);
    const y = coPos.getY(i);
    const z = coPos.getZ(i);
    const ang = Math.atan2(z, x);
    const wave = 1 + Math.sin(ang * 6.0) * 0.04;
    coPos.setXYZ(i, x * wave, y + Math.cos(ang * 5.0) * 0.008, z * wave);
  }
  collarGeo.computeVertexNormals();
  geometries.push(collarGeo);
  const collarMesh = new THREE.Mesh(collarGeo, cloakMat);
  collarMesh.position.set(0, 0.058, 0.0);
  collarMesh.castShadow = true;
  cloakPivot.add(collarMesh);

  // Neck + Sculpted Draped Headscarf Cowl & Multi-Fold Imamah (100% Faceless)
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.585;
  torso.add(headPivot);

  // Sculpted headscarf drape flowing from crown smoothly down around neck & shoulders
  const cowlGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.165, -0.03),
      new THREE.Vector2(0.128, 0.04),
      new THREE.Vector2(0.145, 0.115),
      new THREE.Vector2(0.162, 0.195),
      new THREE.Vector2(0.146, 0.275),
      new THREE.Vector2(0.088, 0.325),
      new THREE.Vector2(0.001, 0.342),
    ],
    24,
  );
  const cwPos = cowlGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cwPos.count; i++) {
    const x = cwPos.getX(i);
    const y = cwPos.getY(i);
    const z = cwPos.getZ(i);
    const ang = Math.atan2(z, x);
    const backBias = z < 0 ? 1.14 : 0.98;
    const clothFold = 1 + Math.sin(ang * 5.0 + y * 8.0) * 0.032;
    cwPos.setXYZ(i, x * 0.96 * clothFold, y, z * backBias * clothFold - 0.014);
  }
  cowlGeo.computeVertexNormals();

  // Rolled cloth cowl hood rim framing the recessed shadowed opening
  const hoodRimGeo = new THREE.TorusGeometry(0.118, 0.028, 10, 22);
  hoodRimGeo.scale(0.86, 1.06, 0.9);
  const hrPos = hoodRimGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < hrPos.count; i++) {
    const x = hrPos.getX(i);
    const y = hrPos.getY(i);
    const z = hrPos.getZ(i);
    const browForward = y > 0 ? Math.min(0.032, y * 0.28) : 0;
    hrPos.setXYZ(i, x, y, z + browForward);
  }
  hoodRimGeo.computeVertexNormals();

  // Double-wrapped woven Imamah Turban Bands with natural cloth creases
  const buildTurbanFold = (radius: number, tube: number, phase: number): THREE.BufferGeometry => {
    const tg = new THREE.TorusGeometry(radius, tube, 10, 26);
    tg.rotateX(Math.PI * 0.44);
    const tp = tg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i);
      const y = tp.getY(i);
      const z = tp.getZ(i);
      const a = Math.atan2(z, x);
      const crease = 1 + Math.sin(a * 6.0 + phase) * 0.032;
      tp.setXYZ(i, x * crease, y + Math.cos(a * 3.0 + phase) * 0.008, z * crease);
    }
    tg.computeVertexNormals();
    return tg;
  };
  const turbanFoldAGeo = buildTurbanFold(0.148, 0.029, 0.4);
  const turbanFoldBGeo = buildTurbanFold(0.145, 0.024, 2.2);

  // Outer draped abaaya hood crest over back of head
  const outerHoodGeo = new THREE.SphereGeometry(0.172, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62);
  outerHoodGeo.scale(0.98, 1.04, 1.14);

  // Curved, tapered Scarf End draped gracefully over the left shoulder
  const scarfTailGeo = createClothRibbonGeo(0.112, 0.082, 0.3, 0.015, 0.055, 0.025);

  // Deeply recessed shadowed face veil inside hood rim (100% faceless)
  const veilShadowGeo = new THREE.SphereGeometry(0.106, 16, 14);
  veilShadowGeo.scale(0.84, 1.0, 0.78);

  geometries.push(
    cowlGeo,
    hoodRimGeo,
    turbanFoldAGeo,
    turbanFoldBGeo,
    outerHoodGeo,
    scarfTailGeo,
    veilShadowGeo,
  );

  const cowlMesh = new THREE.Mesh(cowlGeo, scarfMat);
  cowlMesh.castShadow = true;
  cowlMesh.receiveShadow = true;
  headPivot.add(cowlMesh);

  const hoodRim = new THREE.Mesh(hoodRimGeo, scarfMat);
  hoodRim.position.set(0, 0.165, 0.085);
  hoodRim.castShadow = true;
  headPivot.add(hoodRim);

  const turbanFoldA = new THREE.Mesh(turbanFoldAGeo, sashMat);
  turbanFoldA.position.set(0, 0.224, -0.004);
  turbanFoldA.rotation.z = 0.06;
  turbanFoldA.castShadow = true;
  headPivot.add(turbanFoldA);

  const turbanFoldB = new THREE.Mesh(turbanFoldBGeo, sashMat);
  turbanFoldB.position.set(0, 0.252, -0.008);
  turbanFoldB.rotation.z = -0.07;
  turbanFoldB.castShadow = true;
  headPivot.add(turbanFoldB);

  const outerHood = new THREE.Mesh(outerHoodGeo, cloakMat);
  outerHood.position.set(0, 0.176, -0.032);
  outerHood.rotation.x = -0.24;
  outerHood.castShadow = true;
  headPivot.add(outerHood);

  const scarfTail = new THREE.Mesh(scarfTailGeo, scarfMat);
  scarfTail.position.set(-0.132, 0.05, 0.128);
  scarfTail.rotation.set(-0.18, 0.16, 0.1);
  scarfTail.castShadow = true;
  headPivot.add(scarfTail);

  const veilShadow = new THREE.Mesh(veilShadowGeo, veilShadowMat);
  veilShadow.position.set(0, 0.158, 0.064);
  headPivot.add(veilShadow);

  // Two-Segment Sculpted Robed Arms with Flared Cuffs & Contoured Palms
  const upperSleeveGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.056, -0.285),
      new THREE.Vector2(0.062, -0.18),
      new THREE.Vector2(0.068, -0.07),
      new THREE.Vector2(0.072, 0.0),
      new THREE.Vector2(0.001, 0.042),
    ],
    14,
  );
  const uPos = upperSleeveGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uPos.count; i++) {
    const x = uPos.getX(i);
    const z = uPos.getZ(i);
    const a = Math.atan2(z, x);
    const fl = 1 + Math.sin(a * 5.0) * 0.035;
    uPos.setXYZ(i, x * fl, uPos.getY(i), z * fl);
  }
  upperSleeveGeo.computeVertexNormals();

  const foreSleeveGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.056, -0.245),
      new THREE.Vector2(0.046, -0.22),
      new THREE.Vector2(0.048, -0.12),
      new THREE.Vector2(0.058, 0.0),
    ],
    14,
  );
  const fPos = foreSleeveGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < fPos.count; i++) {
    const x = fPos.getX(i);
    const z = fPos.getZ(i);
    const a = Math.atan2(z, x);
    const fl = 1 + Math.cos(a * 5.0) * 0.03;
    fPos.setXYZ(i, x * fl, fPos.getY(i), z * fl);
  }
  foreSleeveGeo.computeVertexNormals();

  const cuffGeo = new THREE.TorusGeometry(0.052, 0.011, 8, 16);
  cuffGeo.rotateX(Math.PI / 2);

  const palmGeo = new THREE.SphereGeometry(0.044, 12, 10);
  palmGeo.scale(0.58, 1.22, 0.84);
  palmGeo.translate(0, -0.044, 0.008);
  const thumbGeo = new THREE.CapsuleGeometry(0.013, 0.026, 4, 6);
  geometries.push(upperSleeveGeo, foreSleeveGeo, cuffGeo, palmGeo, thumbGeo);

  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.268, 0.505, 0.01);

    const upperMesh = new THREE.Mesh(upperSleeveGeo, tunicMat);
    upperMesh.castShadow = true;
    shoulder.add(upperMesh);

    const elbow = new THREE.Group();
    elbow.position.y = -0.28;
    shoulder.add(elbow);

    const foreMesh = new THREE.Mesh(foreSleeveGeo, tunicMat);
    foreMesh.castShadow = true;
    elbow.add(foreMesh);

    const cuff = new THREE.Mesh(cuffGeo, sashMat);
    cuff.position.y = -0.242;
    elbow.add(cuff);

    const hand = new THREE.Group();
    hand.position.y = -0.248;
    const palmMesh = new THREE.Mesh(palmGeo, skinMat);
    palmMesh.castShadow = true;
    const thumbMesh = new THREE.Mesh(thumbGeo, skinMat);
    thumbMesh.position.set(-side * 0.022, -0.032, 0.028);
    thumbMesh.rotation.set(0.45, 0, -side * 0.42);
    hand.add(palmMesh, thumbMesh);
    elbow.add(hand);

    torso.add(shoulder);
    return { shoulder, elbow, hand };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Hand-Carved Slightly Curved Wooden Traveling Staff with Leather Grip
  const staffGroup = new THREE.Group();
  if (hasStaff) {
    const staffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.4, 0),
      new THREE.Vector3(0.012, 0.15, 0.01),
      new THREE.Vector3(-0.008, 0.68, -0.006),
      new THREE.Vector3(0.01, 1.15, 0.012),
    ]);
    const staffGeo = new THREE.TubeGeometry(staffCurve, 14, 0.02, 8, false);
    const stPos = staffGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < stPos.count; i++) {
      const y = stPos.getY(i);
      const frac = THREE.MathUtils.clamp((y + 0.4) / 1.55, 0, 1);
      const center = staffCurve.getPointAt(frac);
      const rScale = THREE.MathUtils.lerp(1.16, 0.85, frac);
      stPos.setX(i, center.x + (stPos.getX(i) - center.x) * rScale);
      stPos.setZ(i, center.z + (stPos.getZ(i) - center.z) * rScale);
    }
    staffGeo.computeVertexNormals();

    const staffGripGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.18, 10);
    const staffKnotGeo = new THREE.SphereGeometry(0.032, 10, 8);
    staffKnotGeo.scale(1.0, 1.25, 1.0);
    geometries.push(staffGeo, staffGripGeo, staffKnotGeo);

    const staffMesh = new THREE.Mesh(staffGeo, woodMat);
    staffMesh.castShadow = true;
    const staffGrip = new THREE.Mesh(staffGripGeo, leatherMat);
    staffGrip.position.copy(staffCurve.getPointAt(0.32));
    const staffTop = new THREE.Mesh(staffKnotGeo, woodMat);
    staffTop.position.copy(staffCurve.getPointAt(1));
    staffGroup.add(staffMesh, staffGrip, staffTop);
    staffGroup.position.set(0, -0.29, 0.04);
    leftArm.elbow.add(staffGroup);
  }

  // Realistic Woven Leather Provision Pouch & Stamped Silver Coin
  const clothPouch = new THREE.Group();
  clothPouch.position.set(-0.22, -0.1, 0.08);
  clothPouch.visible = false;
  const pouchBagGeo = new THREE.SphereGeometry(0.085, 14, 10);
  pouchBagGeo.scale(0.85, 1.25, 0.72);
  const pouchNeckGeo = new THREE.CylinderGeometry(0.032, 0.048, 0.05, 10);
  const pouchStrapGeo = new THREE.TorusGeometry(0.21, 0.012, 6, 20, Math.PI * 1.15);
  geometries.push(pouchBagGeo, pouchNeckGeo, pouchStrapGeo);
  const pouchBag = new THREE.Mesh(pouchBagGeo, leatherMat);
  pouchBag.castShadow = true;
  const pouchNeck = new THREE.Mesh(pouchNeckGeo, sashMat);
  pouchNeck.position.y = 0.095;
  clothPouch.add(pouchBag, pouchNeck);
  hips.add(clothPouch);

  const heldSilverCoin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.009, 18),
    silverHandCoinMat,
  );
  geometries.push(heldSilverCoin.geometry);
  heldSilverCoin.position.set(0, -0.29, 0.045);
  heldSilverCoin.rotation.x = Math.PI * 0.35;
  heldSilverCoin.visible = false;
  rightArm.elbow.add(heldSilverCoin);

  // Two-Segment Articulated Legs + Contoured Rounded Feet & Strapped Leather Sandals
  const thighGeo = new THREE.CylinderGeometry(0.08, 0.066, 0.43, 12);
  thighGeo.translate(0, -0.215, 0);
  const shinGeo = new THREE.CylinderGeometry(0.062, 0.046, 0.41, 12);
  shinGeo.translate(0, -0.205, 0);
  const footGeo = new THREE.SphereGeometry(0.052, 12, 10);
  footGeo.scale(0.88, 0.56, 1.92);
  footGeo.translate(0, -0.018, 0.055);
  const soleGeo = createSandalSoleGeo();
  const strapGeo = new THREE.TorusGeometry(0.046, 0.009, 6, 14);
  strapGeo.scale(1.0, 0.65, 1.0);
  geometries.push(thighGeo, shinGeo, footGeo, soleGeo, strapGeo);

  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1, -0.03, 0);

    const thighMesh = new THREE.Mesh(thighGeo, tunicMat);
    thighMesh.castShadow = true;
    hip.add(thighMesh);

    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);

    const shinMesh = new THREE.Mesh(shinGeo, cloakMat);
    shinMesh.castShadow = true;
    knee.add(shinMesh);

    const ankle = new THREE.Group();
    ankle.position.y = -0.41;
    knee.add(ankle);

    const footMesh = new THREE.Mesh(footGeo, skinMat);
    footMesh.castShadow = true;
    const soleMesh = new THREE.Mesh(soleGeo, leatherMat);
    soleMesh.castShadow = true;
    const strapFront = new THREE.Mesh(strapGeo, leatherMat);
    strapFront.position.set(0, -0.014, 0.068);
    const strapInstep = new THREE.Mesh(strapGeo, leatherMat);
    strapInstep.position.set(0, -0.006, 0.02);
    strapInstep.rotation.x = 0.28;
    ankle.add(footMesh, soleMesh, strapFront, strapInstep);

    hips.add(hip);
    return { hip, knee, ankle };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    root,
    setHeldProvision: (showCoin: boolean, showPouch: boolean) => {
      heldSilverCoin.visible = showCoin;
      clothPouch.visible = showPouch;
    },
    setPoseWalk: (phase: number, cautiousLook = 0) => {
      staffGroup.visible = hasStaff;

      const stride = Math.sin(phase);
      const lift = Math.abs(Math.cos(phase));
      const sway = Math.cos(phase) * 0.022;

      hips.position.set(sway, 0.955 + lift * 0.04, 0);
      hips.rotation.set(0.04, Math.sin(phase) * 0.035, Math.cos(phase) * 0.02);
      torso.rotation.set(0.06, -Math.sin(phase) * 0.05, -Math.cos(phase) * 0.018);
      headPivot.rotation.set(
        -0.04,
        Math.sin(phase * 0.5) * 0.04 + cautiousLook * 0.42,
        0,
      );

      // Dignified thobe stride (kept cleanly inside the flared skirt hem & above uneven ground)
      const lKneeBend = Math.max(0, -stride) * 0.5 + 0.06;
      const rKneeBend = Math.max(0, stride) * 0.5 + 0.06;
      leftLeg.hip.rotation.set(stride * 0.3, 0, 0);
      leftLeg.knee.rotation.set(lKneeBend, 0, 0);
      leftLeg.ankle.rotation.set(-stride * 0.08, 0, 0);

      rightLeg.hip.rotation.set(-stride * 0.3, 0, 0);
      rightLeg.knee.rotation.set(rKneeBend, 0, 0);
      rightLeg.ankle.rotation.set(stride * 0.08, 0, 0);

      // Skirt expands slightly front-to-back with stride so shins never clip
      skirt.position.set(0, 0, 0);
      skirt.rotation.x = 0;
      skirt.scale.set(1.0, 1.0, 1.02 + Math.abs(stride) * 0.16);

      // Left arm swings outside torso/cloak with walking staff
      leftArm.shoulder.rotation.set(-stride * 0.28 + 0.12, 0, 0.12);
      leftArm.elbow.rotation.x = -0.42 + stride * 0.12;
      if (hasStaff) {
        staffGroup.rotation.x = 0.32 - stride * 0.14;
      }

      // Natural right arm walking swing
      rightArm.shoulder.rotation.set(stride * 0.26 + 0.06, 0, -0.11);
      rightArm.elbow.rotation.x = -0.32 + stride * 0.08;

      // Cloak floats gracefully behind
      cloakPivot.rotation.x = 0.08 + lift * 0.06;
      cloakPivot.scale.set(1, 1, 1);
      sashTail.rotation.x = -0.22 - lift * 0.06;
      scarfTail.rotation.x = -0.18 - Math.sin(phase * 2.0) * 0.05;
    },
    setPoseRest: (sleepBlend: number, time = 0, sideRoll = 0) => {
      staffGroup.visible = false;

      const b = THREE.MathUtils.clamp(sleepBlend, 0, 1);
      const kneelPhase = THREE.MathUtils.smoothstep(b, 0.0, 0.48);
      const reclinePhase = THREE.MathUtils.smoothstep(b, 0.34, 1.0);
      const breath = Math.sin(time * 1.15) * 0.014 * reclinePhase;

      // Roll smoothly around the spine (+Y) axis in XYZ Euler order:
      // Rx(-1.51) lays spine horizontally along -Z; Ry(rollAngle) rolls body gently onto right (+) or left (-) side.
      const clampedRoll = THREE.MathUtils.clamp(sideRoll, -1, 1);
      const rollAngle = clampedRoll * 1.24 * reclinePhase;
      const sideSign = Math.sin(rollAngle);

      // Center of gravity lowers cleanly: standing (0.94) -> low crouch (0.54) -> grounded on side (0.31)
      const kneelY = THREE.MathUtils.lerp(0.94, 0.54, kneelPhase);
      const restY = THREE.MathUtils.lerp(kneelY, 0.31, Math.pow(reclinePhase, 1.35));
      hips.position.set(
        -sideSign * 0.03 * reclinePhase,
        restY,
        THREE.MathUtils.lerp(0, -0.05, kneelPhase),
      );
      hips.rotation.set(
        THREE.MathUtils.lerp(0, -1.51, reclinePhase),
        rollAngle,
        0,
      );

      // Gentle breathing & natural spinal curve away from the resting shoulder (zero counter-twisting)
      torso.rotation.set(
        THREE.MathUtils.lerp(0.04, 0.2, kneelPhase) * (1 - reclinePhase) +
          (0.03 + breath) * reclinePhase,
        0,
        0.12 * sideSign * reclinePhase,
      );

      // Head follows spine calmly, resting gently toward the floor-side cheek
      headPivot.rotation.set(
        THREE.MathUtils.lerp(0.02, 0.12, reclinePhase),
        -0.12 * sideSign * reclinePhase,
        -0.12 * sideSign * reclinePhase,
      );

      // Legs transition seamlessly: upright -> low crouch (sandals planted) -> naturally curled on resting side
      const kneelHipX = THREE.MathUtils.lerp(0.02, -1.42, kneelPhase);
      const kneelKneeX = THREE.MathUtils.lerp(0.04, 1.36, kneelPhase);

      const rightDown = Math.max(0, clampedRoll);
      const leftDown = Math.max(0, -clampedRoll);
      const lSleepHipX = -0.38 - rightDown * 0.16 + leftDown * 0.08;
      const lSleepKneeX = 0.54 + rightDown * 0.22 - leftDown * 0.12;
      const rSleepHipX = -0.38 - leftDown * 0.16 + rightDown * 0.08;
      const rSleepKneeX = 0.54 + leftDown * 0.22 - rightDown * 0.12;

      leftLeg.hip.rotation.set(
        THREE.MathUtils.lerp(kneelHipX, lSleepHipX, reclinePhase),
        0,
        (rightDown * 0.08 - leftDown * 0.03) * reclinePhase,
      );
      leftLeg.knee.rotation.set(
        THREE.MathUtils.lerp(kneelKneeX, lSleepKneeX, reclinePhase),
        0,
        0,
      );
      leftLeg.ankle.rotation.set(0.14 * reclinePhase, 0, 0);

      rightLeg.hip.rotation.set(
        THREE.MathUtils.lerp(kneelHipX - 0.04 * (1 - kneelPhase), rSleepHipX, reclinePhase),
        0,
        (-leftDown * 0.08 + rightDown * 0.03) * reclinePhase,
      );
      rightLeg.knee.rotation.set(
        THREE.MathUtils.lerp(kneelKneeX, rSleepKneeX, reclinePhase),
        0,
        0,
      );
      rightLeg.ankle.rotation.set(0.14 * reclinePhase, 0, 0);

      // Skirt folds over crouched thighs, then hugs legs cleanly on the cave floor (zero floor penetration)
      skirt.position.set(
        0,
        THREE.MathUtils.lerp(0, 0.02, kneelPhase * (1 - reclinePhase)),
        THREE.MathUtils.lerp(0, 0.03, kneelPhase * (1 - reclinePhase)),
      );
      skirt.rotation.x =
        THREE.MathUtils.lerp(0, -1.12, kneelPhase) * (1 - reclinePhase) +
        -0.16 * reclinePhase;
      skirt.scale.set(
        THREE.MathUtils.lerp(1.0, 0.56, reclinePhase),
        THREE.MathUtils.lerp(1.0, 0.6, kneelPhase) * (1 - reclinePhase) +
          0.82 * reclinePhase,
        THREE.MathUtils.lerp(1.04, 0.56, reclinePhase),
      );

      // Arms transition smoothly from standing -> bracing crouch -> modest resting posture
      const lArmBraceX = THREE.MathUtils.lerp(0.1, -0.35, kneelPhase);
      const lElbowBraceX = THREE.MathUtils.lerp(-0.28, -0.64, kneelPhase);
      const lSleepShX = THREE.MathUtils.lerp(0.16, -0.46, leftDown);
      const lSleepShY = 0.14 * (rightDown - leftDown);
      const lSleepShZ = THREE.MathUtils.lerp(0.14, 0.18, leftDown);
      const lSleepElX = THREE.MathUtils.lerp(-0.92, -1.16, leftDown);

      leftArm.shoulder.rotation.set(
        THREE.MathUtils.lerp(lArmBraceX, lSleepShX, reclinePhase),
        lSleepShY * reclinePhase,
        THREE.MathUtils.lerp(0.14, lSleepShZ, reclinePhase),
      );
      leftArm.elbow.rotation.x = THREE.MathUtils.lerp(lElbowBraceX, lSleepElX, reclinePhase);

      const rArmBraceX = THREE.MathUtils.lerp(0.1, -0.35, kneelPhase);
      const rElbowBraceX = THREE.MathUtils.lerp(-0.28, -0.64, kneelPhase);
      const rSleepShX = THREE.MathUtils.lerp(0.16, -0.46, rightDown);
      const rSleepShY = 0.14 * (rightDown - leftDown);
      const rSleepShZ = THREE.MathUtils.lerp(-0.14, -0.18, rightDown);
      const rSleepElX = THREE.MathUtils.lerp(-0.92, -1.16, rightDown);

      rightArm.shoulder.rotation.set(
        THREE.MathUtils.lerp(rArmBraceX, rSleepShX, reclinePhase),
        rSleepShY * reclinePhase,
        THREE.MathUtils.lerp(-0.14, rSleepShZ, reclinePhase),
      );
      rightArm.elbow.rotation.x = THREE.MathUtils.lerp(rElbowBraceX, rSleepElX, reclinePhase);

      // Cloak tucks snugly around the sleeper's shoulders & back instead of extending below cave floor
      const cloakFold = Math.max(kneelPhase * 0.72, reclinePhase);
      cloakPivot.rotation.x =
        THREE.MathUtils.lerp(0.08, 0.16, kneelPhase) * (1 - reclinePhase) +
        -0.04 * reclinePhase;
      cloakPivot.scale.set(
        THREE.MathUtils.lerp(1.0, 0.48, reclinePhase),
        THREE.MathUtils.lerp(1.0, 0.62, cloakFold),
        THREE.MathUtils.lerp(1.0, 0.42, reclinePhase),
      );
      sashTail.rotation.x = THREE.MathUtils.lerp(-0.2, -0.04, reclinePhase);
      scarfTail.rotation.x = THREE.MathUtils.lerp(-0.18, -0.04, reclinePhase);
    },
    setPoseAwaken: (standBlend: number, time: number, sideRoll = 0) => {
      const ease = THREE.MathUtils.smoothstep(standBlend, 0, 1);
      staffGroup.visible = hasStaff && ease > 0.72;

      const breath = Math.sin(time * 1.9) * 0.012;
      const rollFactor = 1 - THREE.MathUtils.smoothstep(ease, 0.0, 0.52);
      const clampedRoll = THREE.MathUtils.clamp(sideRoll, -1, 1) * rollFactor;
      const reclineLeft = 1 - THREE.MathUtils.smoothstep(ease, 0.0, 0.58);
      const kneelPeak = Math.sin(THREE.MathUtils.clamp(ease, 0, 1) * Math.PI);

      const rollAngle = clampedRoll * 1.24 * reclineLeft;
      const sideSign = Math.sin(rollAngle);

      const standAlpha = THREE.MathUtils.smoothstep(ease, 0.48, 1.0);
      const yReclineToCrouch = THREE.MathUtils.lerp(0.31, 0.54, 1 - Math.pow(reclineLeft, 1.35));
      hips.position.set(
        -sideSign * 0.03 * reclineLeft,
        THREE.MathUtils.lerp(yReclineToCrouch, 0.95, standAlpha),
        THREE.MathUtils.lerp(-0.05, 0, ease),
      );
      hips.rotation.set(
        THREE.MathUtils.lerp(0, -1.51, reclineLeft),
        rollAngle,
        0,
      );

      torso.rotation.set(
        0.03 * reclineLeft +
          0.2 * kneelPeak * (1 - standAlpha) +
          (-0.02 + breath) * standAlpha,
        Math.sin(time * 1.05) * 0.05 * standAlpha,
        0.12 * sideSign * reclineLeft,
      );
      headPivot.rotation.set(
        THREE.MathUtils.lerp(0.12, -0.1, standAlpha),
        -0.12 * sideSign * reclineLeft + Math.sin((time - 4.0) * 1.05) * 0.26 * standAlpha,
        -0.12 * sideSign * reclineLeft,
      );

      const rightDown = Math.max(0, clampedRoll);
      const leftDown = Math.max(0, -clampedRoll);
      const lSleepHipX = -0.38 - rightDown * 0.16 + leftDown * 0.08;
      const lSleepKneeX = 0.54 + rightDown * 0.22 - leftDown * 0.12;
      const rSleepHipX = -0.38 - leftDown * 0.16 + rightDown * 0.08;
      const rSleepKneeX = 0.54 + leftDown * 0.22 - rightDown * 0.12;

      const midHipL = THREE.MathUtils.lerp(lSleepHipX, -1.36, kneelPeak);
      const midKneeL = THREE.MathUtils.lerp(lSleepKneeX, 1.32, kneelPeak);
      const midHipR = THREE.MathUtils.lerp(rSleepHipX, -1.18, kneelPeak);
      const midKneeR = THREE.MathUtils.lerp(rSleepKneeX, 1.18, kneelPeak);

      leftLeg.hip.rotation.set(
        THREE.MathUtils.lerp(midHipL, 0.03, standAlpha),
        0,
        (rightDown * 0.08 - leftDown * 0.03) * reclineLeft,
      );
      leftLeg.knee.rotation.set(THREE.MathUtils.lerp(midKneeL, 0.04, standAlpha), 0, 0);
      leftLeg.ankle.rotation.set(0.14 * reclineLeft, 0, 0);

      rightLeg.hip.rotation.set(
        THREE.MathUtils.lerp(midHipR, -0.08, standAlpha),
        0,
        (-leftDown * 0.08 + rightDown * 0.03) * reclineLeft,
      );
      rightLeg.knee.rotation.set(THREE.MathUtils.lerp(midKneeR, 0.12, standAlpha), 0, 0);
      rightLeg.ankle.rotation.set(0.14 * reclineLeft, 0, 0);

      skirt.position.set(
        0,
        0.02 * kneelPeak * (1 - standAlpha) * (1 - reclineLeft),
        0.03 * kneelPeak * (1 - standAlpha) * (1 - reclineLeft),
      );
      skirt.rotation.x =
        -0.16 * reclineLeft + -1.05 * kneelPeak * (1 - reclineLeft) * (1 - standAlpha);
      skirt.scale.set(
        THREE.MathUtils.lerp(0.56, 1.0, 1 - reclineLeft),
        THREE.MathUtils.lerp(0.82, THREE.MathUtils.lerp(0.6, 1.0, standAlpha), 1 - reclineLeft),
        THREE.MathUtils.lerp(0.56, 1.04, 1 - reclineLeft),
      );

      leftArm.shoulder.rotation.set(
        THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.16, -0.46, leftDown), 0.16, ease),
        0.14 * (rightDown - leftDown) * reclineLeft,
        THREE.MathUtils.lerp(0.16, 0.12, ease),
      );
      leftArm.elbow.rotation.x = THREE.MathUtils.lerp(
        THREE.MathUtils.lerp(-0.92, -1.16, leftDown),
        -0.42,
        ease,
      );
      if (hasStaff) {
        staffGroup.rotation.x = 0.24;
      }

      // Right arm pushes off floor slightly while rising, then shields eyes/wonders subtly upon waking
      const pushArmX = THREE.MathUtils.lerp(-0.46 * rightDown + 0.16 * (1 - rightDown), -0.38, kneelPeak);
      rightArm.shoulder.rotation.set(
        THREE.MathUtils.lerp(pushArmX, -0.58, standAlpha),
        THREE.MathUtils.lerp(0.14 * (rightDown - leftDown) * reclineLeft, 0.14, standAlpha),
        THREE.MathUtils.lerp(-0.16, -0.18, standAlpha),
      );
      rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
        THREE.MathUtils.lerp(-0.92, -1.16, rightDown),
        -0.96,
        standAlpha,
      );

      const cloakFold = Math.max(reclineLeft, kneelPeak * 0.72 * (1 - standAlpha));
      cloakPivot.rotation.x =
        -0.04 * reclineLeft +
        (0.08 + Math.sin(time * 2.1) * 0.025 + 0.1 * kneelPeak * (1 - standAlpha)) *
          (1 - reclineLeft);
      cloakPivot.scale.set(
        THREE.MathUtils.lerp(0.48, 1.0, 1 - reclineLeft),
        THREE.MathUtils.lerp(1.0, 0.62, cloakFold),
        THREE.MathUtils.lerp(0.42, 1.0, 1 - reclineLeft),
      );
      sashTail.rotation.x = THREE.MathUtils.lerp(-0.04, -0.2, 1 - reclineLeft);
      scarfTail.rotation.x = THREE.MathUtils.lerp(-0.04, -0.18 - Math.sin(time * 2.8) * 0.03, 1 - reclineLeft);
    },
    setPoseLookout: (time: number) => {
      staffGroup.visible = hasStaff;

      const breath = Math.sin(time * 1.8) * 0.012;
      hips.position.set(0, 0.95, 0);
      hips.rotation.set(0, 0, 0);
      torso.rotation.set(-0.03 + breath, Math.sin(time * 0.75) * 0.04, 0);
      headPivot.rotation.set(-0.12, Math.sin(time * 0.65) * 0.16, 0);

      leftLeg.hip.rotation.set(0.03, 0, 0);
      leftLeg.knee.rotation.set(0.04, 0, 0);
      leftLeg.ankle.rotation.set(0, 0, 0);

      rightLeg.hip.rotation.set(-0.1, 0, 0);
      rightLeg.knee.rotation.set(0.12, 0, 0);
      rightLeg.ankle.rotation.set(0, 0, 0);

      skirt.position.set(0, 0, 0);
      skirt.rotation.x = 0;
      skirt.scale.set(1.0, 1.0, 1.04);

      leftArm.shoulder.rotation.set(0.18, 0, 0.12);
      leftArm.elbow.rotation.x = -0.45;
      if (hasStaff) {
        staffGroup.rotation.x = 0.27;
      }

      rightArm.shoulder.rotation.set(
        heldSilverCoin.visible ? -0.52 : 0.06,
        heldSilverCoin.visible ? 0.14 : 0,
        -0.11,
      );
      rightArm.elbow.rotation.x = heldSilverCoin.visible ? -0.92 : -0.22;

      cloakPivot.rotation.x = 0.1 + Math.sin(time * 3.2) * 0.04;
      cloakPivot.scale.set(1, 1, 1);
      sashTail.rotation.x = -0.2 - Math.sin(time * 3.5 + 0.6) * 0.05;
      scarfTail.rotation.x = -0.18 - Math.sin(time * 3.8 + 1.1) * 0.06;
    },
    setPoseSit: (sitBlend: number, time = 0, headYaw = 0, handGesture = 0) => {
      staffGroup.visible = hasStaff && sitBlend < 0.35;

      const ease = sitBlend * sitBlend * (3 - 2 * sitBlend);
      const breath = Math.sin(time * 1.5) * 0.012;

      // Seated on natural stone ledge (top ~0.39m): hips rest flush at y = 0.465m
      hips.position.set(
        0,
        THREE.MathUtils.lerp(0.955, 0.465, ease),
        THREE.MathUtils.lerp(0, -0.04, ease),
      );
      hips.rotation.set(THREE.MathUtils.lerp(0, -0.08, ease), 0, 0);
      torso.rotation.set(THREE.MathUtils.lerp(0.04, 0.1 + breath, ease), 0, 0);
      headPivot.rotation.set(
        THREE.MathUtils.lerp(0, 0.11 - handGesture * 0.08, ease),
        headYaw + Math.sin(time * 0.65) * 0.08 * ease,
        0,
      );

      // Thighs forward with comfortable slight V-stance; knees bent ~80deg so sandals plant squarely
      leftLeg.hip.rotation.set(
        THREE.MathUtils.lerp(0, -1.45, ease),
        THREE.MathUtils.lerp(0, -0.16, ease),
        0,
      );
      leftLeg.knee.rotation.set(THREE.MathUtils.lerp(0.06, 1.4, ease), 0, 0);
      leftLeg.ankle.rotation.set(0, 0, 0);

      rightLeg.hip.rotation.set(
        THREE.MathUtils.lerp(0, -1.45, ease),
        THREE.MathUtils.lerp(0, 0.16, ease),
        0,
      );
      rightLeg.knee.rotation.set(THREE.MathUtils.lerp(0.06, 1.4, ease), 0, 0);
      rightLeg.ankle.rotation.set(0, 0, 0);

      // Tunic skirt drapes smoothly across thighs while seated
      skirt.position.set(
        0,
        THREE.MathUtils.lerp(0, 0.02, ease),
        THREE.MathUtils.lerp(0, 0.04, ease),
      );
      skirt.rotation.x = THREE.MathUtils.lerp(0, -1.16, ease);
      skirt.scale.set(
        THREE.MathUtils.lerp(1.0, 1.08, ease),
        THREE.MathUtils.lerp(1.0, 0.72, ease),
        THREE.MathUtils.lerp(1.04, 1.08, ease),
      );

      leftArm.shoulder.rotation.set(THREE.MathUtils.lerp(0.1, -0.52, ease), 0.08, 0.12);
      leftArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.25, -0.68, ease);
      rightArm.shoulder.rotation.set(
        THREE.MathUtils.lerp(0.1, -0.52 - handGesture * 0.32, ease),
        -0.08 - handGesture * 0.14,
        -0.12 - handGesture * 0.06,
      );
      rightArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.25, -0.68 - handGesture * 0.35, ease);

      cloakPivot.rotation.x = THREE.MathUtils.lerp(0.08, 0.18, ease);
      cloakPivot.scale.set(1, 1, 1);
      sashTail.rotation.x = THREE.MathUtils.lerp(-0.2, -0.45, ease);
      scarfTail.rotation.x = -0.18;
    },
    setPoseDua: (duaBlend: number, time = 0) => {
      staffGroup.visible = false;

      const ease = duaBlend * duaBlend * (3 - 2 * duaBlend);
      const breath = Math.sin(time * 1.4) * 0.012;

      hips.position.set(0, 0.95, 0);
      hips.rotation.set(0, 0, 0);
      torso.rotation.set(0.04 + breath, 0, 0);
      headPivot.rotation.set(
        THREE.MathUtils.lerp(0, -0.14, ease),
        Math.sin(time * 0.5) * 0.04,
        0,
      );

      leftLeg.hip.rotation.set(0.02, 0, 0);
      leftLeg.knee.rotation.set(0.04, 0, 0);
      leftLeg.ankle.rotation.set(0, 0, 0);

      rightLeg.hip.rotation.set(-0.04, 0, 0);
      rightLeg.knee.rotation.set(0.06, 0, 0);
      rightLeg.ankle.rotation.set(0, 0, 0);

      skirt.position.set(0, 0, 0);
      skirt.rotation.x = 0;
      skirt.scale.set(1.0, 1.0, 1.04);

      leftArm.shoulder.rotation.set(
        THREE.MathUtils.lerp(0.1, -0.34, ease),
        THREE.MathUtils.lerp(0, -0.22, ease),
        0.16,
      );
      leftArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.25, -1.18, ease);

      rightArm.shoulder.rotation.set(
        THREE.MathUtils.lerp(0.1, -0.34, ease),
        THREE.MathUtils.lerp(0, 0.22, ease),
        -0.16,
      );
      rightArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.25, -1.18, ease);

      cloakPivot.rotation.x = 0.08 + Math.sin(time * 2.1) * 0.02;
      cloakPivot.scale.set(1, 1, 1);
      sashTail.rotation.x = -0.2;
      scarfTail.rotation.x = -0.18;
    },
    setPoseStandGuard: (time: number, commandRaise = 0) => {
      staffGroup.visible = hasStaff;

      const breath = Math.sin(time * 1.7) * 0.01;
      hips.position.set(0, 0.95, 0);
      hips.rotation.set(0, 0, 0);
      torso.rotation.set(breath, Math.sin(time * 0.5) * 0.03, 0);
      headPivot.rotation.set(0.04, Math.sin(time * 0.45) * 0.08, 0);

      leftLeg.hip.rotation.set(0.02, 0, 0);
      leftLeg.knee.rotation.set(0.04, 0, 0);
      leftLeg.ankle.rotation.set(0, 0, 0);

      rightLeg.hip.rotation.set(-0.04, 0, 0);
      rightLeg.knee.rotation.set(0.06, 0, 0);
      rightLeg.ankle.rotation.set(0, 0, 0);

      skirt.position.set(0, 0, 0);
      skirt.rotation.x = 0;
      skirt.scale.set(1.0, 1.0, 1.04);

      leftArm.shoulder.rotation.set(0.28, 0, 0.12);
      leftArm.elbow.rotation.x = -0.52;
      if (hasStaff) {
        staffGroup.rotation.x = 0.24;
      }

      rightArm.shoulder.rotation.set(
        THREE.MathUtils.lerp(0.08, -0.82, commandRaise),
        0,
        -0.12,
      );
      rightArm.elbow.rotation.x = THREE.MathUtils.lerp(-0.22, -0.48, commandRaise);

      cloakPivot.rotation.x = 0.08 + Math.sin(time * 2.2) * 0.02;
      cloakPivot.scale.set(1, 1, 1);
      sashTail.rotation.x = -0.2;
      scarfTail.rotation.x = -0.18;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

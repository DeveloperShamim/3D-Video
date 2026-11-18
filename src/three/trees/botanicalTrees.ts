import * as THREE from 'three';
import { ProceduralTextureSet } from '../proceduralTextures';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _tangent = new THREE.Vector3();
const _pt = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export interface BotanicalTreeAssetSet {
  barkMat: THREE.MeshStandardMaterial;
  oliveCanopyMat: THREE.MeshStandardMaterial;
  palmFrondMat: THREE.MeshStandardMaterial;
  dateFruitMat: THREE.MeshStandardMaterial;
  leafSprayGeo: THREE.BufferGeometry;
  palmFrondGeo: THREE.BufferGeometry;
  palmCollarGeo: THREE.BufferGeometry;
  dateBunchGeo: THREE.BufferGeometry;
  dispose: () => void;
}

export interface BuiltBotanicalTree {
  group: THREE.Group;
  crownPivot: THREE.Group;
  dispose: () => void;
}

function seededRand(seed: number): () => number {
  let s = Math.abs(Math.floor(seed * 9301 + 49297)) || 1337;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Merges two crossed, gently bowed botanical twig-spray cards into a single
 * shared BufferGeometry so every InstancedMesh instance gives full 3D leaf volume
 * from all camera angles with alphaTest shadow casting.
 */
function createCrossedLeafSprayGeo(): THREE.BufferGeometry {
  const buildCard = (yaw: number, tiltX: number, archAmp: number): THREE.BufferGeometry => {
    const g = new THREE.PlaneGeometry(1.18, 1.18, 2, 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r2 = Math.min(1, (x * x + y * y) / 0.72);
      pos.setZ(i, archAmp * (1 - r2) - Math.abs(x) * 0.08);
    }
    g.rotateX(tiltX);
    g.rotateY(yaw);
    g.computeVertexNormals();
    return g.toNonIndexed();
  };

  const cardA = buildCard(-0.56, 0.24, 0.16);
  const cardB = buildCard(0.56, -0.22, -0.14);
  const cardC = buildCard(1.57, 0.72, 0.14);

  const cards = [cardA, cardB, cardC];
  let totalVerts = 0;
  cards.forEach((c) => {
    totalVerts += c.attributes.position.count;
  });

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);

  let vOffset = 0;
  cards.forEach((c) => {
    const p = c.attributes.position.array as Float32Array;
    const n = c.attributes.normal.array as Float32Array;
    const u = c.attributes.uv.array as Float32Array;
    positions.set(p, vOffset * 3);
    normals.set(n, vOffset * 3);
    uvs.set(u, vOffset * 2);
    vOffset += c.attributes.position.count;
    c.dispose();
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Generates a tapered, organically gnarled branch or trunk along a CatmullRomCurve3.
 */
function createTaperedBranchGeo(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radiusStart: number,
  radiusEnd: number,
  radialSegments = 8,
  gnarlAmp = 0.1,
  seed = 1,
): THREE.BufferGeometry {
  const geo = new THREE.TubeGeometry(curve, tubularSegments, 1.0, radialSegments, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const ringStride = radialSegments + 1;

  for (let i = 0; i <= tubularSegments; i++) {
    const frac = i / tubularSegments;
    const center = curve.getPointAt(frac);
    const baseR = THREE.MathUtils.lerp(radiusStart, radiusEnd, Math.pow(frac, 0.85));

    for (let j = 0; j < ringStride; j++) {
      const idx = i * ringStride + j;
      if (idx >= pos.count) continue;
      const vx = pos.getX(idx) - center.x;
      const vy = pos.getY(idx) - center.y;
      const vz = pos.getZ(idx) - center.z;
      const len = Math.hypot(vx, vy, vz) || 1;
      const ang = (j / radialSegments) * Math.PI * 2;
      const furrow =
        1 +
        Math.sin(ang * 3 + frac * 7.5 + seed * 1.9) * gnarlAmp +
        Math.cos(ang * 5 - frac * 11.0 + seed) * (gnarlAmp * 0.45);
      const r = Math.max(0.008, baseR * furrow);
      pos.setXYZ(
        idx,
        center.x + (vx / len) * r,
        center.y + (vy / len) * r,
        center.z + (vz / len) * r,
      );
    }
  }
  geo.computeVertexNormals();
  return geo;
}

export function createBotanicalTreeAssets(
  textures: ProceduralTextureSet,
): BotanicalTreeAssetSet {
  const barkMat = new THREE.MeshStandardMaterial({
    map: textures.barkAlbedo,
    bumpMap: textures.barkBump,
    bumpScale: 0.15,
    color: 0xa2886e,
    roughness: 0.94,
    metalness: 0.02,
  });

  const oliveCanopyMat = new THREE.MeshStandardMaterial({
    map: textures.oliveLeafAlbedo,
    alphaTest: 0.36,
    transparent: false,
    side: THREE.DoubleSide,
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.02,
  });

  const palmFrondMat = new THREE.MeshStandardMaterial({
    map: textures.palmFrondAlbedo,
    alphaTest: 0.36,
    transparent: false,
    side: THREE.DoubleSide,
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.02,
  });

  const dateFruitMat = new THREE.MeshStandardMaterial({
    color: 0x874318,
    roughness: 0.62,
    metalness: 0.04,
  });

  const leafSprayGeo = createCrossedLeafSprayGeo();

  // Arched 3D V-ribbed Date Palm Frond Geometry
  const palmFrondGeo = new THREE.PlaneGeometry(1.06, 2.45, 2, 10);
  palmFrondGeo.translate(0, 1.225, 0);
  const pfPos = palmFrondGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pfPos.count; i++) {
    const x = pfPos.getX(i);
    const y = pfPos.getY(i);
    const t = Math.max(0, y / 2.45);
    const vRib = -Math.abs(x) * (0.22 - t * 0.08);
    const droop = Math.pow(t, 1.78) * 1.18;
    pfPos.setZ(i, pfPos.getZ(i) + droop + vRib);
  }
  palmFrondGeo.computeVertexNormals();

  // Flared fibrous leaf-scar ring collar around palm trunk
  const palmCollarGeo = new THREE.CylinderGeometry(1.16, 0.88, 0.19, 9, 1, false);

  // Hanging cluster of desert dates
  const dateBunchGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.095, 0.09),
      new THREE.Vector2(0.115, 0.24),
      new THREE.Vector2(0.065, 0.4),
      new THREE.Vector2(0.012, 0.48),
    ],
    9,
  );
  dateBunchGeo.translate(0, -0.48, 0);

  return {
    barkMat,
    oliveCanopyMat,
    palmFrondMat,
    dateFruitMat,
    leafSprayGeo,
    palmFrondGeo,
    palmCollarGeo,
    dateBunchGeo,
    dispose: () => {
      barkMat.dispose();
      oliveCanopyMat.dispose();
      palmFrondMat.dispose();
      dateFruitMat.dispose();
      leafSprayGeo.dispose();
      palmFrondGeo.dispose();
      palmCollarGeo.dispose();
      dateBunchGeo.dispose();
    },
  };
}

/**
 * Builds a gnarled branching olive/acacia tree with flared surface roots, forked limbs,
 * and layered instanced leaf-spray canopies.
 * For `isHeroShadeTree = true`, roots stay strictly compact (r <= 0.78m) and lower boughs
 * stay cleanly above y >= 2.25m so seated/walking youths never clip geometry.
 */
export function buildOliveTree(params: {
  assets: BotanicalTreeAssetSet;
  heightScale?: number;
  spreadScale?: number;
  seed?: number;
  isHeroShadeTree?: boolean;
}): BuiltBotanicalTree {
  const {
    assets,
    heightScale = 1.0,
    spreadScale = 1.0,
    seed = 1,
    isHeroShadeTree = false,
  } = params;

  const rand = seededRand(seed);
  const group = new THREE.Group();
  const crownPivot = new THREE.Group();
  group.add(crownPivot);

  const localGeos: THREE.BufferGeometry[] = [];
  const leafSpots: { pos: THREE.Vector3; scale: number; rotY: number; rotX: number }[] = [];

  if (isHeroShadeTree) {
    // Gnarled ancient hero trunk (0 -> 3.05m)
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.14, 1.05, 0.07),
      new THREE.Vector3(0.09, 2.05, -0.05),
      new THREE.Vector3(0.0, 2.95, 0.02),
    ]);
    const trunkGeo = createTaperedBranchGeo(trunkCurve, 14, 0.36, 0.16, 10, 0.13, seed);
    localGeos.push(trunkGeo);
    const trunkMesh = new THREE.Mesh(trunkGeo, assets.barkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    // 4 compact flared ground roots (r <= 0.78m — clears all 3 stone seats & Bezier arcs)
    for (let r = 0; r < 4; r++) {
      const ang = (r / 4) * Math.PI * 2 + 0.48;
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(ang) * 0.16, 0.36, Math.sin(ang) * 0.16),
        new THREE.Vector3(Math.cos(ang) * 0.46, 0.12, Math.sin(ang) * 0.46),
        new THREE.Vector3(Math.cos(ang) * 0.78, -0.08, Math.sin(ang) * 0.78),
      ]);
      const rootGeo = createTaperedBranchGeo(rootCurve, 7, 0.11, 0.032, 6, 0.1, seed + r);
      localGeos.push(rootGeo);
      const rootMesh = new THREE.Mesh(rootGeo, assets.barkMat);
      rootMesh.castShadow = true;
      rootMesh.receiveShadow = true;
      group.add(rootMesh);
    }

    // 5 spreading primary limbs starting above y >= 2.25m + 10 forked secondary boughs
    const primaryLimbs: [number, number, number, number, number][] = [
      [-1.55, 3.62, 0.85, 2.28, 0.145],
      [1.62, 3.68, 0.78, 2.32, 0.145],
      [-1.18, 3.88, -1.28, 2.42, 0.13],
      [1.32, 3.82, -1.15, 2.45, 0.13],
      [0.05, 4.25, 0.15, 2.75, 0.14],
    ];

    primaryLimbs.forEach(([lx, ly, lz, startY, r0], idx) => {
      const origin = trunkCurve.getPointAt(THREE.MathUtils.clamp(startY / 2.95, 0.72, 0.96));
      const mid = new THREE.Vector3(
        THREE.MathUtils.lerp(origin.x, lx, 0.52),
        THREE.MathUtils.lerp(origin.y, ly, 0.62) + 0.18,
        THREE.MathUtils.lerp(origin.z, lz, 0.52),
      );
      const end = new THREE.Vector3(lx, ly, lz);
      const limbCurve = new THREE.CatmullRomCurve3([origin, mid, end]);
      const limbGeo = createTaperedBranchGeo(limbCurve, 9, r0, 0.058, 7, 0.09, seed + idx * 3);
      localGeos.push(limbGeo);
      const limbMesh = new THREE.Mesh(limbGeo, assets.barkMat);
      limbMesh.castShadow = true;
      limbMesh.receiveShadow = true;
      group.add(limbMesh);

      // Two forked secondary twigs per primary limb
      for (let sub = 0; sub < 2; sub++) {
        const subAngle = Math.atan2(lz, lx) + (sub === 0 ? -0.58 : 0.58);
        const reach = 0.85 + rand() * 0.35;
        const sx = lx + Math.cos(subAngle) * reach;
        const sy = ly + 0.26 + sub * 0.18;
        const sz = lz + Math.sin(subAngle) * reach;
        const twigCurve = new THREE.CatmullRomCurve3([
          limbCurve.getPointAt(0.74),
          new THREE.Vector3((lx + sx) * 0.5, (ly + sy) * 0.5 + 0.1, (lz + sz) * 0.5),
          new THREE.Vector3(sx, sy, sz),
        ]);
        const twigGeo = createTaperedBranchGeo(twigCurve, 6, 0.058, 0.022, 6, 0.06, seed + idx + sub);
        localGeos.push(twigGeo);
        const twigMesh = new THREE.Mesh(twigGeo, assets.barkMat);
        twigMesh.castShadow = true;
        group.add(twigMesh);

        // Cluster 3 overlapping crossed leaf sprays at each twig tip
        for (let k = 0; k < 3; k++) {
          leafSpots.push({
            pos: new THREE.Vector3(
              sx + (rand() - 0.5) * 0.72,
              sy + (rand() - 0.3) * 0.42,
              sz + (rand() - 0.5) * 0.72,
            ),
            scale: 1.05 + rand() * 0.38,
            rotY: rand() * Math.PI * 2,
            rotX: (rand() - 0.5) * 0.36,
          });
        }
      }

      // Inner canopy leaf cluster around primary limb elbow
      leafSpots.push({
        pos: new THREE.Vector3(
          lx * 0.82 + (rand() - 0.5) * 0.45,
          ly + 0.2 + rand() * 0.28,
          lz * 0.82 + (rand() - 0.5) * 0.45,
        ),
        scale: 1.15 + rand() * 0.3,
        rotY: rand() * Math.PI * 2,
        rotX: (rand() - 0.5) * 0.3,
      });
    });

    // Upper crown dome fill clusters (12 cards for thick sunlit shade above youths)
    for (let u = 0; u < 12; u++) {
      const a = (u / 12) * Math.PI * 2 + rand() * 0.4;
      const rad = 0.45 + (u % 3) * 0.65;
      leafSpots.push({
        pos: new THREE.Vector3(
          Math.cos(a) * rad,
          4.15 + (u % 4) * 0.24,
          Math.sin(a) * rad,
        ),
        scale: 1.2 + rand() * 0.35,
        rotY: rand() * Math.PI * 2,
        rotX: (rand() - 0.5) * 0.32,
      });
    }
  } else {
    // Hillside / Grove Olive & Acacia Tree
    const h = 1.85 * heightScale;
    const sp = 1.05 * spreadScale;
    const leanX = (rand() - 0.5) * 0.24;
    const leanZ = (rand() - 0.5) * 0.22;

    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(leanX * 0.5, h * 0.45, leanZ * 0.5),
      new THREE.Vector3(leanX, h * 0.92, leanZ),
    ]);
    const trunkGeo = createTaperedBranchGeo(
      trunkCurve,
      10,
      0.165 * heightScale,
      0.08 * heightScale,
      8,
      0.11,
      seed,
    );
    localGeos.push(trunkGeo);
    const trunkMesh = new THREE.Mesh(trunkGeo, assets.barkMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    group.add(trunkMesh);

    // 3 short surface root spurs
    for (let r = 0; r < 3; r++) {
      const ang = (r / 3) * Math.PI * 2 + seed;
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(ang) * 0.08, 0.22 * heightScale, Math.sin(ang) * 0.08),
        new THREE.Vector3(Math.cos(ang) * 0.36 * sp, -0.04, Math.sin(ang) * 0.36 * sp),
      ]);
      const rootGeo = createTaperedBranchGeo(rootCurve, 5, 0.068 * heightScale, 0.02, 5, 0.08, seed + r);
      localGeos.push(rootGeo);
      const rootMesh = new THREE.Mesh(rootGeo, assets.barkMat);
      rootMesh.castShadow = true;
      group.add(rootMesh);
    }

    // 4 branching upper limbs + secondary sprays
    const topOrigin = trunkCurve.getPointAt(0.84);
    for (let b = 0; b < 4; b++) {
      const ang = (b / 4) * Math.PI * 2 + seed * 0.6;
      const reach = (0.68 + (b % 2) * 0.22) * sp;
      const bx = topOrigin.x + Math.cos(ang) * reach;
      const by = h * (1.12 + (b % 2) * 0.12);
      const bz = topOrigin.z + Math.sin(ang) * reach;
      const limbCurve = new THREE.CatmullRomCurve3([
        topOrigin.clone(),
        new THREE.Vector3(
          THREE.MathUtils.lerp(topOrigin.x, bx, 0.55),
          THREE.MathUtils.lerp(topOrigin.y, by, 0.65),
          THREE.MathUtils.lerp(topOrigin.z, bz, 0.55),
        ),
        new THREE.Vector3(bx, by, bz),
      ]);
      const limbGeo = createTaperedBranchGeo(
        limbCurve,
        7,
        0.072 * heightScale,
        0.025 * heightScale,
        6,
        0.08,
        seed + b,
      );
      localGeos.push(limbGeo);
      const limbMesh = new THREE.Mesh(limbGeo, assets.barkMat);
      limbMesh.castShadow = true;
      group.add(limbMesh);

      for (let k = 0; k < 4; k++) {
        leafSpots.push({
          pos: new THREE.Vector3(
            bx + (rand() - 0.5) * 0.58 * sp,
            by + (rand() - 0.25) * 0.42 * heightScale,
            bz + (rand() - 0.5) * 0.58 * sp,
          ),
          scale: (0.76 + rand() * 0.34) * spreadScale,
          rotY: rand() * Math.PI * 2,
          rotX: (rand() - 0.5) * 0.34,
        });
      }
    }

    // Central crown crest clusters
    for (let c = 0; c < 4; c++) {
      leafSpots.push({
        pos: new THREE.Vector3(
          topOrigin.x + (rand() - 0.5) * 0.45 * sp,
          h * 1.24 + (c % 2) * 0.16 * heightScale,
          topOrigin.z + (rand() - 0.5) * 0.45 * sp,
        ),
        scale: (0.85 + rand() * 0.28) * spreadScale,
        rotY: rand() * Math.PI * 2,
        rotX: (rand() - 0.5) * 0.28,
      });
    }
  }

  // Single InstancedMesh of layered crossed leaf sprays per tree
  const leafInstances = new THREE.InstancedMesh(
    assets.leafSprayGeo,
    assets.oliveCanopyMat,
    leafSpots.length,
  );
  leafInstances.castShadow = true;
  leafInstances.receiveShadow = true;

  leafSpots.forEach((spot, i) => {
    _dummy.position.copy(spot.pos);
    _dummy.rotation.set(spot.rotX, spot.rotY, (rand() - 0.5) * 0.25);
    _dummy.scale.set(spot.scale, spot.scale * 0.88, spot.scale);
    _dummy.updateMatrix();
    leafInstances.setMatrixAt(i, _dummy.matrix);

    // Subtle botanical hue/brightness tint around white so oliveLeafAlbedo shines richly
    _color.setHSL(0.22 + (i % 4) * 0.018, 0.16, 0.84 + (i % 3) * 0.06);
    leafInstances.setColorAt(i, _color);
  });
  leafInstances.instanceMatrix.needsUpdate = true;
  if (leafInstances.instanceColor) leafInstances.instanceColor.needsUpdate = true;
  leafInstances.computeBoundingSphere();
  crownPivot.add(leafInstances);

  return {
    group,
    crownPivot,
    dispose: () => {
      leafInstances.dispose();
      localGeos.forEach((g) => g.dispose());
    },
  };
}

/**
 * Builds a desert date palm with a tapered curved fibrous trunk, stacked leaf-scar
 * collar rings, hanging date fruit bunches, and 2-tier 3D V-ribbed fronds.
 */
export function buildDatePalmTree(params: {
  assets: BotanicalTreeAssetSet;
  height?: number;
  lean?: number;
  seed?: number;
}): BuiltBotanicalTree {
  const { assets, height = 5.0, lean = 0.16, seed = 1 } = params;
  const rand = seededRand(seed);

  const group = new THREE.Group();
  const crownPivot = new THREE.Group();
  const localGeos: THREE.BufferGeometry[] = [];

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 1.35, height * 0.35, lean * 0.45),
    new THREE.Vector3(lean * 2.15, height * 0.72, lean * 0.78),
    new THREE.Vector3(lean * 2.38, height, lean * 0.95),
  ]);

  const trunkGeo = createTaperedBranchGeo(curve, 14, 0.185, 0.095, 8, 0.06, seed);
  localGeos.push(trunkGeo);
  const trunkMesh = new THREE.Mesh(trunkGeo, assets.barkMat);
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  group.add(trunkMesh);

  // Stacked fibrous leaf-scar ring collars along trunk
  const collarCount = Math.max(14, Math.floor(height * 3.8));
  const collars = new THREE.InstancedMesh(assets.palmCollarGeo, assets.barkMat, collarCount);
  collars.castShadow = true;
  collars.receiveShadow = true;
  for (let i = 0; i < collarCount; i++) {
    const frac = 0.08 + (i / (collarCount - 1)) * 0.89;
    curve.getPointAt(frac, _pt);
    curve.getTangentAt(frac, _tangent).normalize();
    _quat.setFromUnitVectors(_up, _tangent);
    const rScale = THREE.MathUtils.lerp(0.18, 0.105, frac);
    _dummy.position.copy(_pt);
    _dummy.quaternion.copy(_quat);
    _dummy.scale.set(rScale, 1.0, rScale);
    _dummy.updateMatrix();
    collars.setMatrixAt(i, _dummy.matrix);
  }
  collars.instanceMatrix.needsUpdate = true;
  collars.computeBoundingSphere();
  group.add(collars);

  // Crown Heart + Hanging Date Bunches + 12 2-Tier 3D Fronds
  crownPivot.position.copy(curve.getPointAt(1));
  group.add(crownPivot);

  const heartGeo = new THREE.SphereGeometry(0.16, 10, 8);
  localGeos.push(heartGeo);
  const heartMesh = new THREE.Mesh(heartGeo, assets.barkMat);
  heartMesh.scale.set(1.0, 1.25, 1.0);
  crownPivot.add(heartMesh);

  for (let d = 0; d < 3; d++) {
    const dAng = (d / 3) * Math.PI * 2 + seed * 0.7;
    const bunch = new THREE.Mesh(assets.dateBunchGeo, assets.dateFruitMat);
    bunch.position.set(Math.cos(dAng) * 0.14, -0.05, Math.sin(dAng) * 0.14);
    bunch.rotation.set(Math.sin(dAng) * 0.25, dAng, -Math.cos(dAng) * 0.25);
    bunch.scale.setScalar(0.85 + rand() * 0.22);
    bunch.castShadow = true;
    crownPivot.add(bunch);
  }

  // Upper spire tier (5 fronds) + lower spreading tier (7 fronds)
  for (let f = 0; f < 12; f++) {
    const isUpper = f < 5;
    const tierCount = isUpper ? 5 : 7;
    const tierIdx = isUpper ? f : f - 5;
    const frondMesh = new THREE.Mesh(assets.palmFrondGeo, assets.palmFrondMat);
    frondMesh.rotation.order = 'YXZ';
    frondMesh.rotation.y =
      (tierIdx / tierCount) * Math.PI * 2 + (isUpper ? 0.35 : 0) + seed * 0.4;
    frondMesh.rotation.x = isUpper
      ? 0.44 + rand() * 0.14
      : 0.86 + (tierIdx % 2) * 0.18 + rand() * 0.08;
    const fScale = isUpper ? 0.82 : 1.02;
    frondMesh.scale.set(fScale, fScale, fScale);
    frondMesh.castShadow = true;
    crownPivot.add(frondMesh);
  }

  return {
    group,
    crownPivot,
    dispose: () => {
      collars.dispose();
      localGeos.forEach((g) => g.dispose());
    },
  };
}

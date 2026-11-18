import * as THREE from 'three';
import { AnimatedSceneController, SceneBuildContext } from './types';
import {
  createCrowdCharacterGeometries,
  createTravelerCharacter,
  TravelerCharacterRig,
} from '../characters/travelerCharacter';
import { createKahfMarketStage } from './kahfMarketStage';
import {
  buildDatePalmTree,
  buildOliveTree,
  BuiltBotanicalTree,
  createBotanicalTreeAssets,
} from '../trees/botanicalTrees';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function createKahfSanctuaryScene(
  ctx: SceneBuildContext,
): AnimatedSceneController {
  const { materials, textures } = ctx;
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const localMaterials: THREE.Material[] = [];
  const botanicalAssets = createBotanicalTreeAssets(textures);
  const builtTrees: BuiltBotanicalTree[] = [];

  // Shared Terrain Helper for Cave & Hillside stages
  const terrainHeightAt = (x: number, z: number): number => {
    const pathMask = 1 - THREE.MathUtils.smoothstep(Math.abs(x), 0.8, 3.6);
    const caveFlat = 1 - THREE.MathUtils.smoothstep(Math.hypot(x, z + 0.5), 1.8, 4.4);
    const ridgeBehind =
      z < -1.2
        ? THREE.MathUtils.smoothstep(-z, 1.2, 8.5) *
          (4.6 + Math.cos(x * 0.28) * 1.45 + Math.sin(x * 0.7) * 0.45)
        : 0;
    const flankingHills =
      THREE.MathUtils.smoothstep(Math.abs(x), 4.0, 14.0) *
      (1.8 + Math.sin(z * 0.24 + x * 0.2) * 0.9);
    const dunes =
      (Math.sin(x * 0.22 + z * 0.18) * 0.55 +
        Math.cos(z * 0.35 - x * 0.15) * 0.32) *
      (1 - caveFlat * 0.9) *
      (1 - pathMask * 0.65);
    const valleyDip =
      z > 6.0 ? -THREE.MathUtils.smoothstep(z, 6.0, 18.0) * 0.85 : 0;

    return Math.max(-0.9, ridgeBehind + flankingHills + dunes + valleyDip);
  };

  // Shared Natural Materials
  const sandTerrainMat = new THREE.MeshStandardMaterial({
    map: textures.sandAlbedo,
    bumpMap: textures.sandBump,
    roughnessMap: textures.sandRoughness,
    bumpScale: 0.085,
    color: 0xb0987c,
    roughness: 0.94,
    metalness: 0.02,
    envMapIntensity: 0.38,
  });
  const cliffStoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    bumpMap: textures.stoneBump,
    roughnessMap: textures.stoneRoughness,
    bumpScale: 0.16,
    color: 0x8b7a68,
    roughness: 0.92,
    metalness: 0.04,
    envMapIntensity: 0.45,
  });
  localMaterials.push(sandTerrainMat, cliffStoneMat);

  // Shared Jagged Rock Geometry
  const cliffRockGeo = new THREE.DodecahedronGeometry(1.0, 2);
  const cPos = cliffRockGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cPos.count; i++) {
    const vx = cPos.getX(i);
    const vy = cPos.getY(i);
    const vz = cPos.getZ(i);
    const n =
      1 +
      Math.sin(vx * 3.1 + vy * 2.4) * 0.14 +
      Math.cos(vz * 3.7 - vx * 1.9) * 0.12;
    cPos.setXYZ(i, vx * n, vy * n, vz * n);
  }
  cliffRockGeo.computeVertexNormals();
  geometries.push(cliffRockGeo);

  // =========================================================================
  // STAGE 1 (0 - 12s): CAVE SANCTUARY, PALMS, QITMIR & 309-YEAR VALLEY
  // =========================================================================
  const caveStage = new THREE.Group();
  group.add(caveStage);

  const terrainGeo = new THREE.PlaneGeometry(76, 76, 96, 96);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setY(i, terrainHeightAt(posAttr.getX(i), posAttr.getZ(i)));
  }
  terrainGeo.computeVertexNormals();
  geometries.push(terrainGeo);

  const terrainMesh = new THREE.Mesh(terrainGeo, sandTerrainMat);
  terrainMesh.receiveShadow = true;
  caveStage.add(terrainMesh);

  // Helper: Natural winding mountain path X offset descending from cave mouth
  const trailPathX = (z: number): number =>
    z <= 1.2 ? 0 : Math.sin((z - 1.2) * 0.34) * 1.15;

  // Natural Stratified Limestone Mountain Cavern (Zero architectural arch or digital lamps)
  const archGroup = new THREE.Group();

  const cavernWallMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    bumpMap: textures.stoneBump,
    roughnessMap: textures.stoneRoughness,
    bumpScale: 0.26,
    color: 0x1a1613,
    roughness: 0.98,
    metalness: 0.01,
    envMapIntensity: 0.04,
    side: THREE.DoubleSide,
  });
  const caveInnerFloorMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    bumpMap: textures.stoneBump,
    roughnessMap: textures.stoneRoughness,
    bumpScale: 0.15,
    color: 0x221d19,
    roughness: 0.96,
    metalness: 0.01,
    envMapIntensity: 0.06,
  });
  const caveMossMat = new THREE.MeshStandardMaterial({
    map: textures.meadowAlbedo,
    bumpMap: textures.meadowBump,
    bumpScale: 0.06,
    color: 0x5c7244,
    roughness: 0.94,
    metalness: 0.01,
    envMapIntensity: 0.1,
  });
  const trailSlabMat = new THREE.MeshStandardMaterial({
    map: textures.cobbleAlbedo,
    bumpMap: textures.cobbleBump,
    bumpScale: 0.1,
    color: 0xa5927d,
    roughness: 0.91,
    metalness: 0.02,
  });
  localMaterials.push(cavernWallMat, caveInnerFloorMat, caveMossMat, trailSlabMat);

  // Organic FBM/strata-displaced limestone cavern dome open toward +Z front
  const cavernDomeGeo = new THREE.SphereGeometry(
    3.55,
    42,
    26,
    Math.PI * 0.84,
    Math.PI * 1.32,
    0,
    Math.PI * 0.53,
  );
  const cdPos = cavernDomeGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cdPos.count; i++) {
    let x = cdPos.getX(i) * 0.96;
    let y = cdPos.getY(i) * 0.94;
    let z = cdPos.getZ(i) * 1.04;
    // Stratified horizontal rock ledges + natural craggy displacement
    const strata = Math.sin(y * 5.8 + x * 1.1) * 0.14;
    const crag =
      Math.cos(x * 2.7 - z * 2.1) * 0.16 +
      Math.sin(z * 4.3 + y * 3.1) * 0.09;
    const radialScale = 1 + (strata + crag) * 0.24;
    x *= radialScale;
    y = Math.max(-0.15, y * (1 + crag * 0.12));
    z *= radialScale;
    cdPos.setXYZ(i, x, y, z);
  }
  cavernDomeGeo.computeVertexNormals();
  geometries.push(cavernDomeGeo);

  const caveChamber = new THREE.Mesh(cavernDomeGeo, cavernWallMat);
  caveChamber.position.set(0, 0.05, -1.15);
  caveChamber.castShadow = true;
  caveChamber.receiveShadow = true;
  archGroup.add(caveChamber);

  // Outer cliff massif & craggy stratified boulders framing the natural cave mouth
  const cliffMassifPlacements: [number, number, number, number, number, number][] = [
    [-3.1, 1.35, -0.55, 1.65, 1.85, 1.55],
    [3.1, 1.35, -0.55, 1.65, 1.85, 1.55],
    [-2.55, 3.05, -0.35, 1.8, 1.1, 1.35],
    [2.55, 3.05, -0.35, 1.8, 1.1, 1.35],
    [0.0, 3.85, -0.45, 2.55, 0.95, 1.45],
    [-1.35, 3.65, -0.75, 1.65, 1.05, 1.3],
    [1.35, 3.65, -0.75, 1.65, 1.05, 1.3],
    [-4.35, 1.25, -1.4, 2.25, 2.35, 2.1],
    [4.35, 1.25, -1.4, 2.25, 2.35, 2.1],
    [0.0, 4.75, -1.55, 3.4, 1.35, 2.1],
    [-2.8, 4.45, -1.65, 2.3, 1.45, 1.9],
    [2.8, 4.45, -1.65, 2.3, 1.45, 1.9],
    [-5.6, 1.8, -2.5, 2.4, 2.6, 2.4],
    [5.6, 1.8, -2.5, 2.4, 2.6, 2.4],
    [0.0, 2.4, -4.35, 3.2, 2.6, 1.6],
  ];
  cliffMassifPlacements.forEach(([x, y, z, sx, sy, sz], idx) => {
    const rock = new THREE.Mesh(cliffRockGeo, cliffStoneMat);
    rock.position.set(x, y, z);
    rock.scale.set(sx, sy, sz);
    rock.rotation.set(idx * 0.42, idx * 0.95, idx * 0.25);
    rock.castShadow = true;
    rock.receiveShadow = true;
    archGroup.add(rock);
  });

  // Natural overhanging limestone stalactites / rock teeth along upper cave lip
  const stalactiteGeo = new THREE.ConeGeometry(0.18, 0.68, 7);
  stalactiteGeo.rotateX(Math.PI);
  geometries.push(stalactiteGeo);
  const stalactiteCoords: [number, number, number, number][] = [
    [-1.85, 2.85, -0.1, 1.15],
    [-1.15, 3.22, -0.05, 0.92],
    [-0.45, 3.35, -0.15, 0.72],
    [0.52, 3.32, -0.12, 0.78],
    [1.22, 3.18, -0.08, 0.96],
    [1.88, 2.82, -0.12, 1.12],
    [-1.55, 2.95, -0.75, 0.85],
    [1.52, 2.95, -0.78, 0.88],
  ];
  stalactiteCoords.forEach(([sx, sy, sz, sc], idx) => {
    const tooth = new THREE.Mesh(stalactiteGeo, cliffStoneMat);
    tooth.position.set(sx, sy, sz);
    tooth.scale.set(sc * 0.9, sc * (0.9 + (idx % 3) * 0.22), sc * 0.9);
    tooth.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.08;
    tooth.castShadow = true;
    archGroup.add(tooth);
  });

  // Rough shaded limestone floor slab & deep cavern interior shadow pool
  const caveFloorSlabGeo = new THREE.CylinderGeometry(1.55, 1.75, 0.06, 12);
  const caveShadowPoolGeo = new THREE.CircleGeometry(3.25, 28);
  caveShadowPoolGeo.rotateX(-Math.PI / 2);
  geometries.push(caveFloorSlabGeo, caveShadowPoolGeo);
  const caveFloorRock = new THREE.Mesh(caveFloorSlabGeo, caveInnerFloorMat);
  caveFloorRock.position.set(0, 0.015, -1.55);
  caveFloorRock.scale.set(1.78, 1, 1.48);
  caveFloorRock.receiveShadow = true;

  const caveShadowMat = new THREE.MeshBasicMaterial({
    map: textures.particleGlow,
    color: 0x040305,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  localMaterials.push(caveShadowMat);
  const caveDepthShadow = new THREE.Mesh(caveShadowPoolGeo, caveShadowMat);
  caveDepthShadow.position.set(0, 0.05, -1.45);
  archGroup.add(caveFloorRock, caveDepthShadow);

  // Damp limestone moss tufts clinging around shaded cliff base crevices
  const mossTuftGeo = new THREE.DodecahedronGeometry(0.26, 1);
  geometries.push(mossTuftGeo);
  [
    [-2.15, 0.18, -0.15, 1.2],
    [2.18, 0.16, -0.18, 1.15],
    [-2.55, 1.25, 0.45, 0.85],
    [2.52, 1.45, 0.42, 0.9],
    [-1.95, 2.55, 0.38, 0.78],
    [2.02, 2.48, 0.35, 0.82],
  ].forEach(([mx, my, mz, ms], idx) => {
    const moss = new THREE.Mesh(mossTuftGeo, caveMossMat);
    moss.position.set(mx, my, mz);
    moss.scale.set(ms * 1.4, ms * 0.55, ms * 0.9);
    moss.rotation.y = idx * 1.3;
    archGroup.add(moss);
  });

  caveStage.add(archGroup);

  // Subtle Natural Sky/Stone Bounce Fill outside Cave Threshold (keeps cave interior deep dark)
  const caveBounceLight = new THREE.PointLight(0x8ba7cc, 0.48, 5.8, 2.0);
  caveBounceLight.position.set(0, 1.85, 0.95);
  caveStage.add(caveBounceLight);

  // Winding Stepped Flagstone Mountain Path descending toward distant Valley City (for 4.4 min & walking shots)
  const flagstoneGeo = new THREE.CylinderGeometry(0.56, 0.64, 0.075, 9);
  geometries.push(flagstoneGeo);
  for (let s = 0; s < 22; s++) {
    const sz = 1.45 + s * 0.58;
    const sx = trailPathX(sz) + (s % 2 === 0 ? -0.06 : 0.06);
    const sy = terrainHeightAt(sx, sz) + 0.018;
    const slab = new THREE.Mesh(flagstoneGeo, trailSlabMat);
    slab.position.set(sx, sy, sz);
    slab.rotation.set(0.03 * Math.sin(s), s * 0.9, 0.02 * Math.cos(s));
    slab.scale.set(1.18 + (s % 3) * 0.14, 1.0, 0.82 + (s % 2) * 0.12);
    slab.receiveShadow = true;
    slab.castShadow = true;
    caveStage.add(slab);
  }

  // Canyon Edge Rocks & Scrub flanking the winding trail cleanly outside walkway
  const trailFlankCount = 24;
  const trailFlankRocks = new THREE.InstancedMesh(cliffRockGeo, cliffStoneMat, trailFlankCount);
  trailFlankRocks.castShadow = true;
  trailFlankRocks.receiveShadow = true;
  for (let i = 0; i < trailFlankCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const rz = 2.0 + Math.floor(i / 2) * 1.05;
    const rx = trailPathX(rz) + side * (1.85 + (i % 3) * 0.48);
    const ry = terrainHeightAt(rx, rz);
    const rs = 0.24 + (i % 4) * 0.11;
    _dummy.position.set(rx, ry + rs * 0.24, rz);
    _dummy.rotation.set(i * 0.5, i * 1.3, i * 0.2);
    _dummy.scale.set(rs * 1.35, rs * 0.72, rs * 1.05);
    _dummy.updateMatrix();
    trailFlankRocks.setMatrixAt(i, _dummy.matrix);
  }
  trailFlankRocks.instanceMatrix.needsUpdate = true;
  trailFlankRocks.computeBoundingSphere();
  caveStage.add(trailFlankRocks);

  // Traveler's Leather Waterskin & Woven Satchel resting against side cave rock wall
  const waterskinMat = new THREE.MeshStandardMaterial({
    color: 0x4b3121,
    bumpMap: textures.stoneBump,
    bumpScale: 0.032,
    roughness: 0.82,
    metalness: 0.04,
  });
  localMaterials.push(waterskinMat);
  const waterskinGeo = new THREE.SphereGeometry(0.14, 12, 10);
  waterskinGeo.scale(0.85, 1.25, 0.7);
  const satchelGeo = new THREE.BoxGeometry(0.28, 0.2, 0.16);
  geometries.push(waterskinGeo, satchelGeo);

  const caveSatchel = new THREE.Mesh(satchelGeo, waterskinMat);
  caveSatchel.position.set(-1.58, 0.12, -1.12);
  caveSatchel.rotation.y = 0.55;
  caveSatchel.castShadow = true;
  const caveWaterskin = new THREE.Mesh(waterskinGeo, waterskinMat);
  caveWaterskin.position.set(-1.38, 0.14, -1.22);
  caveWaterskin.rotation.set(0.32, 0.2, -0.35);
  caveWaterskin.castShadow = true;
  caveStage.add(caveSatchel, caveWaterskin);

  // Stacked Stone Trail-Marker Cairn beside mountain descent path
  const cairnGroup = new THREE.Group();
  cairnGroup.position.set(1.75, terrainHeightAt(1.75, 4.45), 4.45);
  [0.2, 0.15, 0.11, 0.075].forEach((r, idx) => {
    const cStone = new THREE.Mesh(cliffRockGeo, trailSlabMat);
    cStone.position.y = idx * 0.14 + r * 0.45;
    cStone.scale.set(r * 1.45, r * 0.65, r * 1.25);
    cStone.rotation.y = idx * 1.1;
    cStone.castShadow = true;
    cStone.receiveShadow = true;
    cairnGroup.add(cStone);
  });
  caveStage.add(cairnGroup);

  // 72 Scattered Natural Desert Pebbles & Gravel Stones along path borders & cave apron
  const pebbleCount = 72;
  const pebbles = new THREE.InstancedMesh(cliffRockGeo, trailSlabMat, pebbleCount);
  pebbles.receiveShadow = true;
  for (let i = 0; i < pebbleCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const pz = 0.4 + (i * 0.21);
    const px = trailPathX(pz) + side * (0.95 + (i % 5) * 0.48);
    const py = terrainHeightAt(px, pz);
    const ps = 0.055 + (i % 4) * 0.025;
    _dummy.position.set(px, py + ps * 0.35, pz);
    _dummy.rotation.set(i * 0.9, i * 1.7, i * 0.4);
    _dummy.scale.set(ps * 1.35, ps * 0.65, ps);
    _dummy.updateMatrix();
    pebbles.setMatrixAt(i, _dummy.matrix);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  pebbles.computeBoundingSphere();
  caveStage.add(pebbles);

  // Distant Walled Valley City Ahead down the Mountain Trail (visible at z = 21..29 in 4.4 min descent)
  const distantCityGroup = new THREE.Group();
  const cityWallGeo = new THREE.BoxGeometry(16.0, 1.9, 0.75);
  const cityBattlementGeo = new THREE.BoxGeometry(0.65, 0.42, 0.82);
  const cityGateTowerGeo = new THREE.BoxGeometry(1.35, 3.2, 1.35);
  const cityHouseGeo = new THREE.BoxGeometry(1.4, 1.0, 1.4);
  cityHouseGeo.translate(0, 0.5, 0);
  const cityDomeGeo = new THREE.SphereGeometry(0.65, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  geometries.push(cityWallGeo, cityBattlementGeo, cityGateTowerGeo, cityHouseGeo, cityDomeGeo);

  const valleyWallMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    color: 0xa48e76,
    roughness: 0.93,
    metalness: 0.02,
  });
  localMaterials.push(valleyWallMat);

  const cityYBase = terrainHeightAt(0, 23.0) - 0.15;
  const wallLeft = new THREE.Mesh(cityWallGeo, valleyWallMat);
  wallLeft.position.set(-9.2, cityYBase + 0.95, 22.5);
  const wallRight = new THREE.Mesh(cityWallGeo, valleyWallMat);
  wallRight.position.set(9.2, cityYBase + 0.95, 22.5);
  const towerL = new THREE.Mesh(cityGateTowerGeo, valleyWallMat);
  towerL.position.set(-1.35, cityYBase + 1.6, 22.4);
  const towerR = new THREE.Mesh(cityGateTowerGeo, valleyWallMat);
  towerR.position.set(1.35, cityYBase + 1.6, 22.4);
  const gateDomeL = new THREE.Mesh(cityDomeGeo, valleyWallMat);
  gateDomeL.position.set(-1.35, cityYBase + 3.2, 22.4);
  const gateDomeR = new THREE.Mesh(cityDomeGeo, valleyWallMat);
  gateDomeR.position.set(1.35, cityYBase + 3.2, 22.4);
  distantCityGroup.add(wallLeft, wallRight, towerL, towerR, gateDomeL, gateDomeR);

  // Wall crenellations along valley city ramparts
  const battlementMesh = new THREE.InstancedMesh(cityBattlementGeo, valleyWallMat, 24);
  for (let b = 0; b < 24; b++) {
    const side = b < 12 ? -1 : 1;
    const bx = side * (2.6 + (b % 12) * 1.25);
    _dummy.position.set(bx, cityYBase + 2.08, 22.5);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    battlementMesh.setMatrixAt(b, _dummy.matrix);
  }
  battlementMesh.instanceMatrix.needsUpdate = true;
  distantCityGroup.add(battlementMesh);

  const valleyBuildings = new THREE.InstancedMesh(cityHouseGeo, valleyWallMat, 26);
  for (let i = 0; i < 26; i++) {
    const bx = -13.5 + i * 1.08 + Math.sin(i * 1.7) * 0.3;
    const bz = 24.0 + (i % 4) * 1.35;
    const bh = 1.45 + (i % 5) * 0.52;
    _dummy.position.set(bx, cityYBase, bz);
    _dummy.rotation.set(0, (i % 3) * 0.12, 0);
    _dummy.scale.set(0.95 + (i % 2) * 0.35, bh, 0.95);
    _dummy.updateMatrix();
    valleyBuildings.setMatrixAt(i, _dummy.matrix);
  }
  valleyBuildings.instanceMatrix.needsUpdate = true;
  distantCityGroup.add(valleyBuildings);
  caveStage.add(distantCityGroup);

  // Broad Surrounding Canyon Sandstone Mesas encircling distant horizon
  const mesaGeo = new THREE.CylinderGeometry(3.4, 5.6, 4.4, 7);
  mesaGeo.translate(0, 2.2, 0);
  geometries.push(mesaGeo);
  const mesaRingCount = 10;
  const canyonMesas = new THREE.InstancedMesh(mesaGeo, valleyWallMat, mesaRingCount);
  for (let i = 0; i < mesaRingCount; i++) {
    const ang = -Math.PI * 0.85 + (i / (mesaRingCount - 1)) * Math.PI * 1.7;
    const rad = 25.5 + (i % 3) * 3.8;
    const mx = Math.sin(ang) * rad;
    const mz = Math.cos(ang) * rad;
    const my = terrainHeightAt(mx, mz) - 0.6;
    _dummy.position.set(mx, my, mz);
    _dummy.rotation.set(0, i * 0.85, 0);
    _dummy.scale.set(1.1 + (i % 3) * 0.35, 0.85 + (i % 4) * 0.35, 0.9);
    _dummy.updateMatrix();
    canyonMesas.setMatrixAt(i, _dummy.matrix);
  }
  canyonMesas.instanceMatrix.needsUpdate = true;
  canyonMesas.computeBoundingSphere();
  caveStage.add(canyonMesas);

  // 6 Desert Date Palms (gnarled ringed trunks, hanging date clusters & 2-tier 3D fronds)
  const palmCrowns: { crown: THREE.Group; phaseOffset: number }[] = [];
  const palmSpots: [number, number, number, number][] = [
    [-4.8, 3.2, 4.9, 0.18],
    [6.8, 1.8, 5.4, -0.22],
    [-6.9, 6.4, 4.5, 0.14],
    [6.8, 7.2, 5.2, -0.16],
    [-5.2, 8.8, 4.3, 0.22],
    [4.1, 9.8, 4.8, -0.19],
  ];

  palmSpots.forEach(([px, pz, height, lean], idx) => {
    const palm = buildDatePalmTree({
      assets: botanicalAssets,
      height,
      lean,
      seed: 12 + idx * 7,
    });
    palm.group.position.set(px, terrainHeightAt(px, pz) - 0.12, pz);
    builtTrees.push(palm);
    caveStage.add(palm.group);
    palmCrowns.push({ crown: palm.crownPivot, phaseOffset: idx * 1.3 });
  });

  // 5 Hillside Olive / Acacia Trees (gnarled branching trunks & layered leaf sprays)
  const oliveSpots: [number, number, number][] = [
    [-3.8, -0.8, 1.15],
    [3.9, -0.6, 1.05],
    [-6.2, 1.8, 1.25],
    [7.6, 3.6, 1.1],
    [-5.5, 11.2, 1.3],
  ];
  oliveSpots.forEach(([ox, oz, scale], idx) => {
    const olive = buildOliveTree({
      assets: botanicalAssets,
      heightScale: scale,
      spreadScale: scale * 1.06,
      seed: 22 + idx * 5,
    });
    olive.group.position.set(ox, terrainHeightAt(ox, oz) - 0.1, oz);
    olive.group.rotation.y = idx * 1.15;
    builtTrees.push(olive);
    caveStage.add(olive.group);
  });

  // 56 Desert Grasses
  const bladeGeo = new THREE.ConeGeometry(0.06, 0.42, 4);
  bladeGeo.translate(0, 0.21, 0);
  geometries.push(bladeGeo);
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
  });
  localMaterials.push(grassMat);
  const grassCount = 56;
  const grasses = new THREE.InstancedMesh(bladeGeo, grassMat, grassCount);
  grasses.castShadow = true;
  const grassMeta: { x: number; y: number; z: number; s: number; rot: number }[] = [];
  for (let i = 0; i < grassCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (1.2 + ((i * 1.7) % 6.8));
    const z = -1.0 + ((i * 2.3) % 13.5);
    const y = terrainHeightAt(x, z);
    const s = 0.7 + (i % 5) * 0.22;
    const rot = i * 1.1;
    grassMeta.push({ x, y, z, s, rot });
    _color.setHSL(0.22 + (i % 3) * 0.03, 0.28, 0.24 + (i % 4) * 0.05);
    grasses.setColorAt(i, _color);
  }
  if (grasses.instanceColor) grasses.instanceColor.needsUpdate = true;
  caveStage.add(grasses);

  // 32 Field Boulders (strictly clear of cave & path)
  const rockCount = 32;
  const rocks = new THREE.InstancedMesh(cliffRockGeo, cliffStoneMat, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2;
    const rad = 4.2 + (i % 5) * 2.4;
    const rx = Math.cos(angle) * rad;
    const rz = Math.sin(angle) * rad + 2.0;
    const inCaveOrPath =
      (Math.abs(rx) < 3.4 && rz < 1.2) ||
      (Math.abs(rx) < 2.2 && rz >= 1.2 && rz < 7.5);
    const xAdj = inCaveOrPath
      ? Math.sign(rx || (i % 2 === 0 ? 1 : -1)) * (3.6 + (i % 3) * 0.75)
      : rx;
    const ry = terrainHeightAt(xAdj, rz);
    const scale = 0.35 + (i % 4) * 0.22;
    _dummy.position.set(xAdj, ry + scale * 0.22, rz);
    _dummy.rotation.set(i * 0.7, i * 1.1, i * 0.3);
    _dummy.scale.set(scale * 1.35, scale * 0.75, scale);
    _dummy.updateMatrix();
    rocks.setMatrixAt(i, _dummy.matrix);
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.computeBoundingSphere();
  caveStage.add(rocks);

  // Guardian Dog Qitmir at Cave Threshold
  const dogGroup = new THREE.Group();
  dogGroup.position.set(1.05, terrainHeightAt(1.05, 0.52), 0.52);
  dogGroup.rotation.y = -0.35;
  const dogMat = new THREE.MeshStandardMaterial({
    color: 0x4a392c,
    roughness: 0.88,
    metalness: 0.03,
  });
  const dogNoseMat = new THREE.MeshStandardMaterial({
    color: 0x171310,
    roughness: 0.55,
    metalness: 0.05,
  });
  localMaterials.push(dogMat, dogNoseMat);

  const dogChestGeo = new THREE.SphereGeometry(0.18, 16, 12);
  dogChestGeo.scale(0.88, 0.85, 1.35);
  const dogRumpGeo = new THREE.SphereGeometry(0.155, 14, 12);
  dogRumpGeo.scale(0.86, 0.78, 1.15);
  const dogNeckGeo = new THREE.CylinderGeometry(0.085, 0.12, 0.24, 12);
  const dogSkullGeo = new THREE.SphereGeometry(0.105, 14, 12);
  dogSkullGeo.scale(0.88, 0.9, 1.12);
  const dogSnoutGeo = new THREE.CylinderGeometry(0.042, 0.068, 0.14, 10);
  dogSnoutGeo.rotateX(Math.PI / 2);
  const dogNoseGeo = new THREE.SphereGeometry(0.025, 8, 8);
  const dogEarGeo = new THREE.ConeGeometry(0.048, 0.13, 8);
  const dogForeLegGeo = new THREE.CapsuleGeometry(0.04, 0.36, 6, 10);
  dogForeLegGeo.rotateX(Math.PI / 2);
  const dogHindLegGeo = new THREE.CapsuleGeometry(0.052, 0.24, 6, 10);
  dogHindLegGeo.rotateX(Math.PI / 2);
  const dogTailGeo = new THREE.CylinderGeometry(0.016, 0.032, 0.36, 8);
  dogTailGeo.translate(0, 0.18, 0);
  geometries.push(
    dogChestGeo,
    dogRumpGeo,
    dogNeckGeo,
    dogSkullGeo,
    dogSnoutGeo,
    dogNoseGeo,
    dogEarGeo,
    dogForeLegGeo,
    dogHindLegGeo,
    dogTailGeo,
  );

  const dogTorso = new THREE.Group();
  const dogChest = new THREE.Mesh(dogChestGeo, dogMat);
  dogChest.position.set(0, 0.16, 0.04);
  dogChest.castShadow = true;
  const dogRump = new THREE.Mesh(dogRumpGeo, dogMat);
  dogRump.position.set(0, 0.13, -0.22);
  dogRump.castShadow = true;
  dogTorso.add(dogChest, dogRump);

  const dogHeadPivot = new THREE.Group();
  dogHeadPivot.position.set(0, 0.24, 0.2);
  const dogNeck = new THREE.Mesh(dogNeckGeo, dogMat);
  dogNeck.position.set(0, 0.05, 0.04);
  dogNeck.rotation.x = 0.55;
  const dogSkull = new THREE.Mesh(dogSkullGeo, dogMat);
  dogSkull.position.set(0, 0.14, 0.1);
  const dogSnout = new THREE.Mesh(dogSnoutGeo, dogMat);
  dogSnout.position.set(0, 0.115, 0.22);
  const dogNose = new THREE.Mesh(dogNoseGeo, dogNoseMat);
  dogNose.position.set(0, 0.12, 0.295);
  const earL = new THREE.Mesh(dogEarGeo, dogMat);
  earL.position.set(-0.075, 0.21, 0.08);
  earL.rotation.set(0.35, 0, 0.45);
  const earR = new THREE.Mesh(dogEarGeo, dogMat);
  earR.position.set(0.075, 0.21, 0.08);
  earR.rotation.set(0.35, 0, -0.45);
  dogHeadPivot.add(dogNeck, dogSkull, dogSnout, dogNose, earL, earR);

  const foreLegL = new THREE.Mesh(dogForeLegGeo, dogMat);
  foreLegL.position.set(-0.085, 0.042, 0.32);
  const foreLegR = new THREE.Mesh(dogForeLegGeo, dogMat);
  foreLegR.position.set(0.085, 0.042, 0.32);
  const hindLegL = new THREE.Mesh(dogHindLegGeo, dogMat);
  hindLegL.position.set(-0.13, 0.06, -0.2);
  hindLegL.rotation.y = 0.22;
  const hindLegR = new THREE.Mesh(dogHindLegGeo, dogMat);
  hindLegR.position.set(0.13, 0.06, -0.2);
  hindLegR.rotation.y = -0.22;
  const dogTail = new THREE.Mesh(dogTailGeo, dogMat);
  dogTail.position.set(0, 0.13, -0.34);
  dogTail.rotation.set(-1.35, 0.3, 0);
  dogGroup.add(dogTorso, dogHeadPivot, foreLegL, foreLegR, hindLegL, hindLegR, dogTail);
  caveStage.add(dogGroup);

  // Distant Sunlit Valley Sandstone Foothills & Earth-Tone Oasis Terraces (zero white blocks)
  const ridgeConeGeo = new THREE.ConeGeometry(2.6, 1.8, 7);
  ridgeConeGeo.translate(0, 0.7, 0);
  geometries.push(ridgeConeGeo);
  const distantRidgeMat = new THREE.MeshStandardMaterial({
    map: textures.stoneAlbedo,
    color: 0x7d6550,
    roughness: 0.96,
    metalness: 0.01,
  });
  localMaterials.push(distantRidgeMat);
  const ridgeCount = 16;
  const distantRidges = new THREE.InstancedMesh(ridgeConeGeo, distantRidgeMat, ridgeCount);
  for (let i = 0; i < ridgeCount; i++) {
    const x = -20 + i * 2.7 + Math.sin(i * 1.9) * 0.8;
    const z = 16.5 + (i % 3) * 3.2;
    const y = terrainHeightAt(x, z) - 0.35;
    _dummy.position.set(x, y, z);
    _dummy.rotation.set(0, i * 0.7, 0);
    _dummy.scale.set(1.4 + (i % 3) * 0.45, 0.8 + (i % 4) * 0.45, 1.15);
    _dummy.updateMatrix();
    distantRidges.setMatrixAt(i, _dummy.matrix);
  }
  distantRidges.instanceMatrix.needsUpdate = true;
  distantRidges.computeBoundingSphere();
  caveStage.add(distantRidges);

  // Soft Diffused Volumetric Sunbeam Shafts & Glow Pool (zero hard cone edges)
  const softShaftGeo = new THREE.PlaneGeometry(4.4, 10.5);
  softShaftGeo.translate(0, -5.25, 0);
  const glowPoolGeo = new THREE.CircleGeometry(1.45, 32);
  glowPoolGeo.rotateX(-Math.PI / 2);
  geometries.push(softShaftGeo, glowPoolGeo);

  const beamMat = new THREE.MeshBasicMaterial({
    map: textures.softLightBeam,
    color: 0xffe4a8,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  localMaterials.push(beamMat);
  const sunBeam = new THREE.Group();
  const sunShaftA = new THREE.Mesh(softShaftGeo, beamMat);
  const sunShaftB = new THREE.Mesh(softShaftGeo, beamMat);
  sunShaftB.rotation.y = Math.PI / 2;
  sunBeam.add(sunShaftA, sunShaftB);
  sunBeam.position.set(2.4, 7.6, 2.2);
  sunBeam.rotation.z = 0.36;
  sunBeam.rotation.x = -0.28;
  caveStage.add(sunBeam);

  // Shared Celestial System (attached to root group so sky sun/moon track properly across stages)
  const crescentShape = new THREE.Shape();
  crescentShape.absarc(0, 0, 0.72, -Math.PI * 0.46, Math.PI * 0.46, false);
  crescentShape.absarc(-0.28, 0, 0.63, Math.PI * 0.39, -Math.PI * 0.39, true);
  crescentShape.closePath();
  const crescentGeo = new THREE.ExtrudeGeometry(crescentShape, {
    depth: 0.06,
    bevelEnabled: false,
  });
  crescentGeo.center();
  const sunOrbGeo = new THREE.SphereGeometry(0.84, 24, 24);
  const solarOrbitGeo = new THREE.TorusGeometry(4.4, 0.032, 10, 96);
  const lunarOrbitGeo = new THREE.TorusGeometry(5.2, 0.032, 10, 96);
  geometries.push(crescentGeo, sunOrbGeo, solarOrbitGeo, lunarOrbitGeo);

  const moonMat = new THREE.MeshBasicMaterial({
    color: 0xf1f5f9,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    fog: false,
  });
  const moonGlowInnerMat = new THREE.SpriteMaterial({
    map: textures.particleGlow,
    color: 0xbfe0ff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const moonGlowOuterMat = new THREE.SpriteMaterial({
    map: textures.particleGlow,
    color: 0x60a5fa,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const sunOrbMat = new THREE.MeshBasicMaterial({
    color: 0xfff3cc,
    transparent: true,
    opacity: 1.0,
    fog: false,
  });
  const sunCoronaInnerMat = new THREE.SpriteMaterial({
    map: textures.particleGlow,
    color: 0xffd578,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const sunCoronaOuterMat = new THREE.SpriteMaterial({
    map: textures.particleGlow,
    color: 0xff9d3b,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const sunRingMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.34,
    fog: false,
  });
  const moonRingMat = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.3,
    fog: false,
  });
  localMaterials.push(
    moonMat,
    moonGlowInnerMat,
    moonGlowOuterMat,
    sunOrbMat,
    sunCoronaInnerMat,
    sunCoronaOuterMat,
    sunRingMat,
    moonRingMat,
  );

  const sunGroup = new THREE.Group();
  const sunOrb = new THREE.Mesh(sunOrbGeo, sunOrbMat);
  const sunCoronaInner = new THREE.Sprite(sunCoronaInnerMat);
  sunCoronaInner.scale.set(3.4, 3.4, 1);
  const sunCoronaOuter = new THREE.Sprite(sunCoronaOuterMat);
  sunCoronaOuter.scale.set(6.8, 6.8, 1);
  sunGroup.add(sunOrb, sunCoronaInner, sunCoronaOuter);

  const moonGroup = new THREE.Group();
  const crescentMoon = new THREE.Mesh(crescentGeo, moonMat);
  crescentMoon.rotation.z = 0.36;
  const moonGlowInner = new THREE.Sprite(moonGlowInnerMat);
  moonGlowInner.scale.set(2.9, 2.9, 1);
  const moonGlowOuter = new THREE.Sprite(moonGlowOuterMat);
  moonGlowOuter.scale.set(5.2, 5.2, 1);
  moonGroup.add(crescentMoon, moonGlowInner, moonGlowOuter);

  // Tilted concentric orbital plane used cleanly in Chapter 13C (404 - 423s)
  const orbitalAlignmentGroup = new THREE.Group();
  orbitalAlignmentGroup.position.set(0, 6.2, 18.0);
  orbitalAlignmentGroup.rotation.x = 0.24;
  const solarRing = new THREE.Mesh(solarOrbitGeo, sunRingMat);
  const lunarRing = new THREE.Mesh(lunarOrbitGeo, moonRingMat);
  orbitalAlignmentGroup.add(solarRing, lunarRing);
  orbitalAlignmentGroup.visible = false;

  group.add(sunGroup, moonGroup, orbitalAlignmentGroup);

  // Memorial Stone Mosque Pavilion atop Cave Sanctuary Ridge (visible 347 - 363s)
  const memorialMosque = new THREE.Group();
  memorialMosque.position.set(0, 4.45, -2.55);
  memorialMosque.visible = false;
  const mosqBaseGeo = new THREE.BoxGeometry(5.8, 2.2, 3.2);
  const mosqDrumGeo = new THREE.CylinderGeometry(1.18, 1.26, 0.45, 12);
  const mosqDomeGeo = new THREE.SphereGeometry(
    1.16,
    24,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.56,
  );
  const mosqTowerGeo = new THREE.CylinderGeometry(0.24, 0.34, 4.6, 12);
  const mosqCapGeo = new THREE.ConeGeometry(0.32, 0.72, 12);
  const mosqCrescentGeo = new THREE.TorusGeometry(0.15, 0.028, 8, 16, Math.PI * 1.45);
  geometries.push(
    mosqBaseGeo,
    mosqDrumGeo,
    mosqDomeGeo,
    mosqTowerGeo,
    mosqCapGeo,
    mosqCrescentGeo,
  );

  const mosqBase = new THREE.Mesh(mosqBaseGeo, cliffStoneMat);
  mosqBase.position.y = 1.1;
  mosqBase.castShadow = true;
  mosqBase.receiveShadow = true;
  const mosqDrum = new THREE.Mesh(mosqDrumGeo, cliffStoneMat);
  mosqDrum.position.y = 2.42;
  const mosqDome = new THREE.Mesh(mosqDomeGeo, cliffStoneMat);
  mosqDome.position.y = 2.62;
  const mosqFinial = new THREE.Mesh(mosqCrescentGeo, materials.heroPrimary);
  mosqFinial.position.y = 3.92;
  mosqFinial.rotation.z = -Math.PI * 0.22;

  const mosqMinaret = new THREE.Mesh(mosqTowerGeo, cliffStoneMat);
  mosqMinaret.position.set(2.55, 2.3, 0.85);
  mosqMinaret.castShadow = true;
  const mosqMinCap = new THREE.Mesh(mosqCapGeo, materials.heroPrimary);
  mosqMinCap.position.set(2.55, 4.95, 0.85);
  const mosqMinFinial = new THREE.Mesh(mosqCrescentGeo, materials.heroPrimary);
  mosqMinFinial.position.set(2.55, 5.45, 0.85);
  mosqMinFinial.scale.setScalar(0.75);
  mosqMinFinial.rotation.z = -Math.PI * 0.22;

  const mosqLanternGlow = new THREE.PointLight(0xffcf7a, 3.2, 16, 1.3);
  mosqLanternGlow.position.set(0, 1.8, 2.2);

  memorialMosque.add(
    mosqBase,
    mosqDrum,
    mosqDome,
    mosqFinial,
    mosqMinaret,
    mosqMinCap,
    mosqMinFinial,
    mosqLanternGlow,
  );
  caveStage.add(memorialMosque);

  // =========================================================================
  // STAGE 2 (12 - 27.5s): DESERT SANCTUARY ALCOVE, QURAN REHAL & SILVER COIN
  // =========================================================================
  const rehalCoinStage = new THREE.Group();
  rehalCoinStage.visible = false;
  group.add(rehalCoinStage);

  const stage2FloorGeo = new THREE.PlaneGeometry(54, 54);
  stage2FloorGeo.rotateX(-Math.PI / 2);
  const courtyardSlabGeo = new THREE.CylinderGeometry(3.35, 3.6, 0.1, 20);
  const courtyardRugGeo = new THREE.CylinderGeometry(2.15, 2.2, 0.03, 24);
  const plinthBaseGeo = new THREE.CylinderGeometry(1.18, 1.32, 0.14, 8);
  const plinthShaftGeo = new THREE.CylinderGeometry(0.86, 0.96, 0.48, 8);
  const plinthCapGeo = new THREE.CylinderGeometry(1.04, 0.92, 0.12, 8);
  const clothDrapeGeo = new THREE.CylinderGeometry(0.88, 1.02, 0.08, 12);
  const alcoveColGeo = new THREE.CylinderGeometry(0.27, 0.33, 4.4, 16);
  const alcoveBaseGeo = new THREE.BoxGeometry(0.95, 0.32, 0.95);
  const alcoveCapGeo = new THREE.BoxGeometry(1.02, 0.28, 1.02);
  const alcoveLintelGeo = new THREE.BoxGeometry(6.4, 0.46, 0.85);
  const courtyardWallGeo = new THREE.BoxGeometry(12.0, 1.15, 0.65);
  geometries.push(
    stage2FloorGeo,
    courtyardSlabGeo,
    courtyardRugGeo,
    plinthBaseGeo,
    plinthShaftGeo,
    plinthCapGeo,
    clothDrapeGeo,
    alcoveColGeo,
    alcoveBaseGeo,
    alcoveCapGeo,
    alcoveLintelGeo,
    courtyardWallGeo,
  );

  const drapeMat = new THREE.MeshStandardMaterial({
    map: textures.fabricAlbedo,
    bumpMap: textures.fabricBump,
    bumpScale: 0.042,
    color: 0x3b1c20,
    roughness: 0.9,
    metalness: 0.03,
  });
  const sandstoneLightMat = new THREE.MeshStandardMaterial({
    map: textures.ashlarAlbedo,
    bumpMap: textures.ashlarBump,
    bumpScale: 0.09,
    color: 0xbaa790,
    roughness: 0.88,
    metalness: 0.03,
    envMapIntensity: 0.55,
  });
  localMaterials.push(drapeMat, sandstoneLightMat);

  const stage2Floor = new THREE.Mesh(stage2FloorGeo, sandTerrainMat);
  stage2Floor.receiveShadow = true;
  const courtyardSlab = new THREE.Mesh(courtyardSlabGeo, sandstoneLightMat);
  courtyardSlab.position.y = 0.05;
  courtyardSlab.receiveShadow = true;
  const courtyardRug = new THREE.Mesh(courtyardRugGeo, drapeMat);
  courtyardRug.position.y = 0.11;
  courtyardRug.receiveShadow = true;

  const plinthBase = new THREE.Mesh(plinthBaseGeo, sandstoneLightMat);
  plinthBase.position.y = 0.19;
  plinthBase.castShadow = true;
  plinthBase.receiveShadow = true;
  const plinthShaft = new THREE.Mesh(plinthShaftGeo, sandstoneLightMat);
  plinthShaft.position.y = 0.49;
  plinthShaft.castShadow = true;
  plinthShaft.receiveShadow = true;
  const plinthCap = new THREE.Mesh(plinthCapGeo, sandstoneLightMat);
  plinthCap.position.y = 0.79;
  plinthCap.castShadow = true;
  plinthCap.receiveShadow = true;

  const clothDrape = new THREE.Mesh(clothDrapeGeo, drapeMat);
  clothDrape.position.y = 0.86;
  clothDrape.receiveShadow = true;

  rehalCoinStage.add(
    stage2Floor,
    courtyardSlab,
    courtyardRug,
    plinthBase,
    plinthShaft,
    plinthCap,
    clothDrape,
  );

  // Architectural Sanctuary Arcade Pillars with Carved Bases, Capitals, Stone Lintels & Courtyard Wall
  [
    [-2.7, -2.8],
    [2.7, -2.8],
    [-4.3, -5.8],
    [4.3, -5.8],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(alcoveColGeo, sandstoneLightMat);
    col.position.set(cx, 2.45, cz);
    col.castShadow = true;
    col.receiveShadow = true;
    const cBase = new THREE.Mesh(alcoveBaseGeo, sandstoneLightMat);
    cBase.position.set(cx, 0.16, cz);
    cBase.receiveShadow = true;
    const cCap = new THREE.Mesh(alcoveCapGeo, sandstoneLightMat);
    cCap.position.set(cx, 4.72, cz);
    cCap.castShadow = true;
    rehalCoinStage.add(col, cBase, cCap);
  });
  const frontLintel = new THREE.Mesh(alcoveLintelGeo, sandstoneLightMat);
  frontLintel.position.set(0, 5.05, -2.8);
  frontLintel.castShadow = true;
  const backArcadeLintel = new THREE.Mesh(alcoveLintelGeo, sandstoneLightMat);
  backArcadeLintel.position.set(0, 5.05, -5.8);
  backArcadeLintel.scale.x = 1.52;
  backArcadeLintel.castShadow = true;
  const courtyardWallBack = new THREE.Mesh(courtyardWallGeo, cliffStoneMat);
  courtyardWallBack.position.set(0, 0.56, -6.5);
  courtyardWallBack.receiveShadow = true;

  // Ornate brass courtyard rug border trim & carved terracotta urns with palm sprigs
  const rugBorderGeo = new THREE.TorusGeometry(2.14, 0.032, 8, 48);
  rugBorderGeo.rotateX(Math.PI / 2);
  const urnGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.18, 0.02),
      new THREE.Vector2(0.28, 0.28),
      new THREE.Vector2(0.14, 0.52),
      new THREE.Vector2(0.2, 0.62),
    ],
    14,
  );
  geometries.push(rugBorderGeo, urnGeo);
  const terracottaMat = new THREE.MeshStandardMaterial({
    map: textures.terracottaAlbedo,
    bumpMap: textures.stoneBump,
    bumpScale: 0.025,
    color: 0xb06644,
    roughness: 0.82,
    metalness: 0.03,
  });
  localMaterials.push(terracottaMat);

  const rugTrim = new THREE.Mesh(rugBorderGeo, materials.heroPrimary);
  rugTrim.position.y = 0.125;
  rehalCoinStage.add(frontLintel, backArcadeLintel, courtyardWallBack, rugTrim);

  [
    [-2.45, -2.55],
    [2.45, -2.55],
  ].forEach(([ux, uz]) => {
    const urn = new THREE.Mesh(urnGeo, terracottaMat);
    urn.position.set(ux, 0.08, uz);
    urn.castShadow = true;
    urn.receiveShadow = true;
    rehalCoinStage.add(urn);
  });

  // Distant sandstone valley hills framing the Stage 2 sanctuary horizon
  for (let i = 0; i < 8; i++) {
    const hx = -18 + i * 5.2;
    const hz = -15.5 - (i % 3) * 2.8;
    const hMesh = new THREE.Mesh(cliffRockGeo, valleyWallMat);
    hMesh.position.set(hx, 0.6, hz);
    hMesh.scale.set(3.4, 1.5 + (i % 3) * 0.45, 2.2);
    hMesh.rotation.y = i * 0.8;
    rehalCoinStage.add(hMesh);
  }

  // Flanking Botanical Desert Oasis Palms & Perimeter Courtyard Stones in Stage 2
  [
    [-5.8, -4.4, 5.2, 0.16],
    [5.8, -4.1, 5.5, -0.18],
    [-7.2, 0.8, 4.6, 0.12],
    [7.0, 1.2, 4.8, -0.15],
  ].forEach(([px, pz, ph, lean], idx) => {
    const palm = buildDatePalmTree({
      assets: botanicalAssets,
      height: ph,
      lean,
      seed: 31 + idx * 9,
    });
    palm.group.position.set(px, -0.05, pz);
    builtTrees.push(palm);
    rehalCoinStage.add(palm.group);
  });

  [
    [-2.5, 1.0, 0.44],
    [2.6, 0.8, 0.5],
    [-1.9, -1.6, 0.36],
    [2.1, -1.7, 0.4],
  ].forEach(([rx, rz, rs], idx) => {
    const rock = new THREE.Mesh(cliffRockGeo, cliffStoneMat);
    rock.position.set(rx, rs * 0.35, rz);
    rock.scale.set(rs * 1.4, rs * 0.75, rs);
    rock.rotation.y = idx * 1.1;
    rock.castShadow = true;
    rock.receiveShadow = true;
    rehalCoinStage.add(rock);
  });

  // Soft Warm Courtyard Fill Light around Sanctuary Plinth (zero artificial bulb mesh)
  const sanctuarySoftFill = new THREE.PointLight(0xffdfb0, 2.4, 14, 1.2);
  sanctuarySoftFill.position.set(1.6, 3.6, 2.6);
  rehalCoinStage.add(sanctuarySoftFill);

  // Sub-prop A: Wooden Rehal (Quran Stand) + Illuminated Book (12 - 17.05s)
  const rehalGroup = new THREE.Group();
  rehalGroup.position.set(0, 0.89, 0);
  const woodRehalMat = new THREE.MeshStandardMaterial({
    map: textures.woodAlbedo,
    bumpMap: textures.woodBump,
    bumpScale: 0.055,
    color: 0x936640,
    roughness: 0.65,
    metalness: 0.08,
  });
  const bookCoverMat = new THREE.MeshStandardMaterial({
    color: 0x164236,
    roughness: 0.72,
    metalness: 0.14,
  });
  const bookPageMat = new THREE.MeshStandardMaterial({
    map: textures.parchmentAlbedo,
    roughness: 0.85,
    metalness: 0.02,
  });
  localMaterials.push(woodRehalMat, bookCoverMat, bookPageMat);

  const boardGeo = new THREE.BoxGeometry(0.58, 0.03, 0.42);
  const coverGeo = new THREE.BoxGeometry(0.38, 0.022, 0.46);
  const pageGeo = new THREE.BoxGeometry(0.34, 0.018, 0.42);
  geometries.push(boardGeo, coverGeo, pageGeo);

  const legL = new THREE.Mesh(boardGeo, woodRehalMat);
  legL.position.set(0, 0.14, 0);
  legL.rotation.z = 0.65;
  legL.castShadow = true;
  const legR = new THREE.Mesh(boardGeo, woodRehalMat);
  legR.position.set(0, 0.14, 0);
  legR.rotation.z = -0.65;
  legR.castShadow = true;

  const pageWingL = new THREE.Group();
  pageWingL.position.set(-0.02, 0.24, 0);
  pageWingL.rotation.z = -0.38;
  const covL = new THREE.Mesh(coverGeo, bookCoverMat);
  covL.position.x = -0.18;
  const pgL = new THREE.Mesh(pageGeo, bookPageMat);
  pgL.position.set(-0.18, 0.018, 0);
  pageWingL.add(covL, pgL);

  const pageWingR = new THREE.Group();
  pageWingR.position.set(0.02, 0.24, 0);
  pageWingR.rotation.z = 0.38;
  const covR = new THREE.Mesh(coverGeo, bookCoverMat);
  covR.position.x = 0.18;
  const pgR = new THREE.Mesh(pageGeo, bookPageMat);
  pgR.position.set(0.18, 0.018, 0);
  pageWingR.add(covR, pgR);

  // Soft Diffused Volumetric Light Curtains + Warm Radial Glow Pool around Rehal (zero harsh triangle)
  const sacredBeamMat = new THREE.MeshBasicMaterial({
    map: textures.softLightBeam,
    color: 0xffebb8,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  const glowPoolMat = new THREE.MeshBasicMaterial({
    map: textures.particleGlow,
    color: 0xffdca0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  localMaterials.push(sacredBeamMat, glowPoolMat);

  const sacredBeam = new THREE.Group();
  const sacredShaftA = new THREE.Mesh(softShaftGeo, sacredBeamMat);
  const sacredShaftB = new THREE.Mesh(softShaftGeo, sacredBeamMat);
  sacredShaftB.rotation.y = Math.PI / 2;
  const sacredShaftC = new THREE.Mesh(softShaftGeo, sacredBeamMat);
  sacredShaftC.rotation.y = Math.PI / 4;
  sacredBeam.add(sacredShaftA, sacredShaftB, sacredShaftC);
  sacredBeam.position.set(0, 7.6, 0);
  sacredBeam.rotation.z = 0.12;

  const plinthGlowPool = new THREE.Mesh(glowPoolGeo, glowPoolMat);
  plinthGlowPool.position.set(0, 0.02, 0);

  rehalGroup.add(legL, legR, pageWingL, pageWingR, sacredBeam, plinthGlowPool);
  rehalCoinStage.add(rehalGroup);

  // Sub-prop B: Ancient Stamped Silver Coin (17.05 - 27.5s)
  const coinGroup = new THREE.Group();
  coinGroup.position.set(0, 1.2, 0);
  const coinCushionGeo = new THREE.CylinderGeometry(0.38, 0.46, 0.08, 24);
  const coinBodyGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.036, 40);
  coinBodyGeo.rotateX(Math.PI / 2);
  geometries.push(coinCushionGeo, coinBodyGeo);

  const silverCoinMat = new THREE.MeshStandardMaterial({
    map: textures.silverCoinAlbedo,
    bumpMap: textures.silverCoinBump,
    bumpScale: 0.035,
    color: 0xd8dfe8,
    metalness: 0.92,
    roughness: 0.22,
    envMapIntensity: 1.4,
  });
  localMaterials.push(silverCoinMat);

  const cushionMesh = new THREE.Mesh(coinCushionGeo, drapeMat);
  cushionMesh.position.y = -0.28;
  cushionMesh.receiveShadow = true;
  const silverCoinMesh = new THREE.Mesh(coinBodyGeo, silverCoinMat);
  silverCoinMesh.castShadow = true;
  coinGroup.add(cushionMesh, silverCoinMesh);
  rehalCoinStage.add(coinGroup);

  // =========================================================================
  // STAGE 3 (27.5 - 47.3s): TORCHLIT DARK CITY, BOWING CROWD & TYRANT KING
  // =========================================================================
  const cityPlazaStage = new THREE.Group();
  cityPlazaStage.visible = false;
  group.add(cityPlazaStage);

  const plazaFloorGeo = new THREE.PlaneGeometry(54, 54);
  plazaFloorGeo.rotateX(-Math.PI / 2);
  geometries.push(plazaFloorGeo);
  const plazaFloorMat = new THREE.MeshStandardMaterial({
    map: textures.cobbleAlbedo,
    bumpMap: textures.cobbleBump,
    bumpScale: 0.085,
    color: 0x4b433c,
    roughness: 0.88,
    metalness: 0.05,
  });
  localMaterials.push(plazaFloorMat);
  const plazaFloor = new THREE.Mesh(plazaFloorGeo, plazaFloorMat);
  plazaFloor.receiveShadow = true;
  cityPlazaStage.add(plazaFloor);

  // Stone Temple Colonnade Pillars with Carved Bases, Capitals & Banners
  const columnGeo = new THREE.CylinderGeometry(0.31, 0.38, 5.0, 16);
  columnGeo.translate(0, 2.75, 0);
  const colBaseGeo = new THREE.BoxGeometry(1.05, 0.35, 1.05);
  const colCapGeo = new THREE.BoxGeometry(1.12, 0.32, 1.12);
  const bannerGeo = new THREE.BoxGeometry(0.55, 2.2, 0.04);
  const lintelGeo = new THREE.BoxGeometry(9.4, 0.65, 1.15);
  const shrineArchGeo = new THREE.BoxGeometry(4.4, 5.8, 0.9);
  geometries.push(columnGeo, colBaseGeo, colCapGeo, bannerGeo, lintelGeo, shrineArchGeo);

  const darkAlcoveMat = new THREE.MeshStandardMaterial({
    color: 0x101116,
    roughness: 0.96,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  localMaterials.push(darkAlcoveMat);

  for (let side of [-1, 1]) {
    for (let row = 0; row < 4; row++) {
      const cx = side * 3.8;
      const cz = -1.8 - row * 2.7;
      const colMesh = new THREE.Mesh(columnGeo, cliffStoneMat);
      colMesh.position.set(cx, 0, cz);
      colMesh.castShadow = true;
      colMesh.receiveShadow = true;
      const baseMesh = new THREE.Mesh(colBaseGeo, cliffStoneMat);
      baseMesh.position.set(cx, 0.175, cz);
      const capMeshCol = new THREE.Mesh(colCapGeo, cliffStoneMat);
      capMeshCol.position.set(cx, 5.15, cz);
      const bannerMesh = new THREE.Mesh(bannerGeo, drapeMat);
      bannerMesh.position.set(cx - side * 0.42, 3.3, cz);
      cityPlazaStage.add(colMesh, baseMesh, capMeshCol, bannerMesh);
    }
  }
  const backLintel = new THREE.Mesh(lintelGeo, cliffStoneMat);
  backLintel.position.set(0, 5.55, -9.9);
  const shrineBackdrop = new THREE.Mesh(shrineArchGeo, darkAlcoveMat);
  shrineBackdrop.position.set(0, 2.9, -10.8);
  cityPlazaStage.add(backLintel, shrineBackdrop);

  // Surrounding Dark Mudbrick City Walls & Houses
  const wallHouseGeo = new THREE.BoxGeometry(2.6, 1.0, 2.2);
  wallHouseGeo.translate(0, 0.5, 0);
  geometries.push(wallHouseGeo);
  const cityBuildingCount = 24;
  const darkCityBuildings = new THREE.InstancedMesh(
    wallHouseGeo,
    cliffStoneMat,
    cityBuildingCount,
  );
  for (let i = 0; i < cityBuildingCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bx = side * (7.5 + (i % 3) * 3.2);
    const bz = 5.0 - Math.floor(i / 2) * 1.9;
    const bh = 2.4 + (i % 4) * 1.1;
    _dummy.position.set(bx, 0, bz);
    _dummy.rotation.set(0, (i % 3) * 0.12, 0);
    _dummy.scale.set(1.1 + (i % 2) * 0.4, bh, 1.1);
    _dummy.updateMatrix();
    darkCityBuildings.setMatrixAt(i, _dummy.matrix);
  }
  darkCityBuildings.instanceMatrix.needsUpdate = true;
  cityPlazaStage.add(darkCityBuildings);

  // 6 Flickering Fire Braziers + 2 Warm Torch PointLights (Stage 3 city plaza only)
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffd27d,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.9,
    roughness: 0.25,
  });
  localMaterials.push(flameMat);
  const brazierBowlGeo = new THREE.CylinderGeometry(0.32, 0.14, 0.85, 10);
  brazierBowlGeo.translate(0, 0.425, 0);
  const emberGeo = new THREE.SphereGeometry(0.24, 10, 8);
  geometries.push(brazierBowlGeo, emberGeo);
  const brazierFlames: THREE.Mesh[] = [];
  const brazierCoords: [number, number][] = [
    [-2.8, -1.2],
    [2.8, -1.2],
    [-2.8, -5.2],
    [2.8, -5.2],
    [-2.4, -8.8],
    [2.4, -8.8],
  ];
  brazierCoords.forEach(([bx, bz]) => {
    const bowl = new THREE.Mesh(brazierBowlGeo, materials.heroSecondary);
    bowl.position.set(bx, 0, bz);
    bowl.castShadow = true;
    const ember = new THREE.Mesh(emberGeo, flameMat);
    ember.position.set(bx, 0.92, bz);
    brazierFlames.push(ember);
    cityPlazaStage.add(bowl, ember);
  });
  const plazaTorchLightA = new THREE.PointLight(0xff8433, 6.4, 22, 1.4);
  plazaTorchLightA.position.set(-2.4, 2.1, -2.2);
  const plazaTorchLightB = new THREE.PointLight(0xff9b4a, 6.2, 22, 1.4);
  plazaTorchLightB.position.set(2.4, 2.2, -6.4);
  cityPlazaStage.add(plazaTorchLightA, plazaTorchLightB);

  // Elevated 3-Step Royal Dais, Carved Throne & Draped Crimson Royal Canopy Behind Tyrant King
  const daisBaseGeo = new THREE.BoxGeometry(3.4, 0.25, 2.8);
  const daisTopGeo = new THREE.BoxGeometry(2.6, 0.25, 2.1);
  const throneSeatGeo = new THREE.BoxGeometry(0.9, 0.55, 0.72);
  const throneBackGeo = new THREE.BoxGeometry(0.94, 1.45, 0.18);
  const canopyPostGeo = new THREE.CylinderGeometry(0.055, 0.065, 2.65, 8);
  const canopyRoofGeo = new THREE.BoxGeometry(2.55, 0.12, 2.05);
  geometries.push(daisBaseGeo, daisTopGeo, throneSeatGeo, throneBackGeo, canopyPostGeo, canopyRoofGeo);
  const daisBase = new THREE.Mesh(daisBaseGeo, cliffStoneMat);
  daisBase.position.set(1.4, 0.125, -1.6);
  daisBase.receiveShadow = true;
  const daisTop = new THREE.Mesh(daisTopGeo, cliffStoneMat);
  daisTop.position.set(1.4, 0.375, -1.6);
  daisTop.receiveShadow = true;
  const throneSeat = new THREE.Mesh(throneSeatGeo, cliffStoneMat);
  throneSeat.position.set(1.65, 0.775, -2.05);
  throneSeat.rotation.y = -0.35;
  const throneBack = new THREE.Mesh(throneBackGeo, cliffStoneMat);
  throneBack.position.set(1.75, 1.35, -2.35);
  throneBack.rotation.y = -0.35;

  const royalCanopy = new THREE.Group();
  royalCanopy.position.set(1.4, 0.5, -1.75);
  royalCanopy.rotation.y = -0.35;
  [
    [-1.12, -0.88],
    [1.12, -0.88],
    [-1.12, 0.88],
    [1.12, 0.88],
  ].forEach(([px, pz]) => {
    const cPost = new THREE.Mesh(canopyPostGeo, materials.heroSecondary);
    cPost.position.set(px, 1.32, pz);
    cPost.castShadow = true;
    royalCanopy.add(cPost);
  });
  const canopyRoof = new THREE.Mesh(canopyRoofGeo, drapeMat);
  canopyRoof.position.y = 2.68;
  canopyRoof.castShadow = true;
  royalCanopy.add(canopyRoof);

  cityPlazaStage.add(daisBase, daisTop, throneSeat, throneBack, royalCanopy);

  // Tyrant King + 2 Palace Guards (faceless realistic figures)
  const tyrantKing: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x3b171b,
    cloakColor: 0x170c10,
    scarfColor: 0x261216,
    sashColor: 0xc2933b,
    heightScale: 1.08,
    hasStaff: true,
    fabricMap: textures.fabricAlbedo,
    fabricBumpMap: textures.fabricBump,
    woodMap: textures.woodAlbedo,
    woodBumpMap: textures.woodBump,
    leatherBumpMap: textures.stoneBump,
  });
  tyrantKing.root.position.set(1.4, 0.52, -1.55);
  tyrantKing.root.rotation.y = -0.35;

  const guardA: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x2a2e38,
    cloakColor: 0x161920,
    scarfColor: 0x383d4a,
    sashColor: 0x6b2824,
    heightScale: 1.03,
    hasStaff: true,
    fabricMap: textures.fabricAlbedo,
    fabricBumpMap: textures.fabricBump,
    woodMap: textures.woodAlbedo,
    woodBumpMap: textures.woodBump,
    leatherBumpMap: textures.stoneBump,
  });
  guardA.root.position.set(0.35, 0.27, -1.8);
  guardA.root.rotation.y = -0.15;

  const guardB: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x2a2e38,
    cloakColor: 0x161920,
    scarfColor: 0x383d4a,
    sashColor: 0x6b2824,
    heightScale: 1.02,
    hasStaff: true,
    fabricMap: textures.fabricAlbedo,
    fabricBumpMap: textures.fabricBump,
    woodMap: textures.woodAlbedo,
    woodBumpMap: textures.woodBump,
    leatherBumpMap: textures.stoneBump,
  });
  guardB.root.position.set(2.45, 0.27, -1.8);
  guardB.root.rotation.y = -0.5;
  cityPlazaStage.add(tyrantKing.root, guardA.root, guardB.root);

  // 35 Draped Hooded Bowing Townspeople + 28 Standing Citizens/Onlookers (Stage 3 Festival & Trial Crowd)
  const crowdGeos = createCrowdCharacterGeometries();
  const crowdMat = new THREE.MeshStandardMaterial({
    map: textures.fabricAlbedo,
    bumpMap: textures.fabricBump,
    bumpScale: 0.038,
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.02,
  });
  const crowdVeilMat = new THREE.MeshStandardMaterial({
    color: 0x07080b,
    roughness: 0.99,
    metalness: 0.0,
  });
  localMaterials.push(crowdMat, crowdVeilMat);

  const bowingSlots: { x: number; z: number; yaw: number; sc: number }[] = [];
  // 25 central festival courtyard worshippers across 5 rows (x = -1.72..+1.72, z = -3.72..-8.44, clear of dais & braziers)
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const idx = row * 5 + col;
      bowingSlots.push({
        x: (col - 2) * 0.86 + Math.sin(idx * 1.9) * 0.1,
        z: -3.72 - row * 1.18 + (col % 2) * 0.2,
        yaw: Math.sin(idx * 2.3) * 0.14,
        sc: 0.92 + (idx % 4) * 0.055,
      });
    }
  }
  // 10 outer aisle bowing worshippers flanking both temple colonnades
  for (let sideIdx = 0; sideIdx < 10; sideIdx++) {
    const side = sideIdx < 5 ? -1 : 1;
    const row = sideIdx % 5;
    bowingSlots.push({
      x: side * (4.92 + (row % 2) * 0.48),
      z: -2.0 - row * 1.72,
      yaw: -side * 0.25,
      sc: 0.94 + (sideIdx % 3) * 0.05,
    });
  }

  const crowdCount = bowingSlots.length;
  const crowdRobes = new THREE.InstancedMesh(crowdGeos.bowRobeGeo, crowdMat, crowdCount);
  const crowdBodies = new THREE.InstancedMesh(crowdGeos.bowTorsoGeo, crowdMat, crowdCount);
  const crowdHeads = new THREE.InstancedMesh(crowdGeos.bowHeadGeo, crowdMat, crowdCount);
  const crowdVeils = new THREE.InstancedMesh(crowdGeos.bowVeilGeo, crowdVeilMat, crowdCount);
  crowdRobes.castShadow = true;
  crowdBodies.castShadow = true;

  bowingSlots.forEach(({ x, z, yaw, sc }, i) => {
    _color.setHSL(0.06 + (i % 5) * 0.04, 0.18, 0.16 + (i % 4) * 0.045);
    crowdRobes.setColorAt(i, _color);
    crowdBodies.setColorAt(i, _color);
    _color.setHSL(0.08 + (i % 4) * 0.03, 0.14, 0.24 + (i % 3) * 0.05);
    crowdHeads.setColorAt(i, _color);

    _dummy.position.set(x, 0.31 * sc, z + 0.12);
    _dummy.rotation.set(0.12, yaw, 0);
    _dummy.scale.setScalar(sc);
    _dummy.updateMatrix();
    crowdRobes.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(x, 0.52 * sc, z - 0.05);
    _dummy.rotation.set(-1.05, yaw, 0);
    _dummy.scale.setScalar(sc);
    _dummy.updateMatrix();
    crowdBodies.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(x, 0.64 * sc, z - 0.36);
    _dummy.rotation.set(0.28, yaw, 0);
    _dummy.scale.setScalar(sc);
    _dummy.updateMatrix();
    crowdHeads.setMatrixAt(i, _dummy.matrix);
    crowdVeils.setMatrixAt(i, _dummy.matrix);
  });
  if (crowdRobes.instanceColor) crowdRobes.instanceColor.needsUpdate = true;
  if (crowdBodies.instanceColor) crowdBodies.instanceColor.needsUpdate = true;
  if (crowdHeads.instanceColor) crowdHeads.instanceColor.needsUpdate = true;
  crowdRobes.instanceMatrix.needsUpdate = true;
  crowdBodies.instanceMatrix.needsUpdate = true;
  crowdHeads.instanceMatrix.needsUpdate = true;
  crowdVeils.instanceMatrix.needsUpdate = true;
  crowdRobes.computeBoundingSphere();
  crowdBodies.computeBoundingSphere();
  crowdHeads.computeBoundingSphere();
  crowdVeils.computeBoundingSphere();
  cityPlazaStage.add(crowdRobes, crowdBodies, crowdHeads, crowdVeils);

  // 28 Standing Citizens, Torch Spectators & Courtyard Guards (keeping -2.8..+0.2 youth path clear)
  const standingSlots: [number, number, number, number][] = [
    // Right plaza spectators & foreground citizens (x >= 3.1, clear of dais/columns/braziers)
    [3.15, 2.3, -2.55, 1.02],
    [3.95, 1.55, -2.35, 0.96],
    [3.45, 0.45, -2.15, 1.04],
    [4.45, -0.55, -1.9, 0.98],
    [5.15, 0.85, -2.1, 1.0],
    [5.45, -2.4, -1.8, 1.03],
    [5.6, -4.6, -1.6, 0.95],
    [5.35, -6.8, -1.45, 1.01],
    [5.95, -0.85, -1.95, 0.99],
    [6.1, -3.55, -1.7, 1.02],
    [4.65, -8.45, -1.35, 0.97],
    // Far-left colonnade & plaza spectators cleanly outside x = -2.8 trial corridor
    [-3.45, 2.55, 2.45, 0.99],
    [-4.3, 1.65, 2.2, 1.03],
    [-3.65, 0.35, 2.0, 0.95],
    [-4.75, -0.85, 1.85, 1.01],
    [-5.35, 0.95, 2.1, 0.97],
    [-5.5, -2.6, 1.75, 1.04],
    [-5.65, -4.8, 1.6, 0.96],
    [-5.4, -7.1, 1.45, 1.0],
    [-6.05, -0.75, 1.95, 1.02],
    [-6.15, -3.65, 1.7, 0.98],
    [-4.65, -8.65, 1.35, 1.01],
    // Back temple terrace & archway onlookers (z = -9.6..-10.1)
    [-2.5, -9.85, 0.14, 0.98],
    [-1.45, -9.95, 0.08, 1.02],
    [-0.45, -10.02, 0.02, 0.96],
    [0.55, -10.02, -0.02, 1.01],
    [1.55, -9.95, -0.08, 0.97],
    [2.5, -9.85, -0.14, 1.02],
  ];
  const standingCount = standingSlots.length;
  const standingRobes = new THREE.InstancedMesh(crowdGeos.standBodyGeo, crowdMat, standingCount);
  const standingHeads = new THREE.InstancedMesh(crowdGeos.standHeadGeo, crowdMat, standingCount);
  const standingVeils = new THREE.InstancedMesh(crowdGeos.standVeilGeo, crowdVeilMat, standingCount);
  standingRobes.castShadow = true;
  standingHeads.castShadow = true;
  standingSlots.forEach(([sx, sz, yaw, sc], i) => {
    _color.setHSL(0.05 + (i % 6) * 0.05, 0.2, 0.17 + (i % 4) * 0.045);
    standingRobes.setColorAt(i, _color);
    _color.setHSL(0.09, 0.14, 0.28 + (i % 3) * 0.06);
    standingHeads.setColorAt(i, _color);

    _dummy.position.set(sx, 0, sz);
    _dummy.rotation.set(0, yaw, 0);
    _dummy.scale.setScalar(sc);
    _dummy.updateMatrix();
    standingRobes.setMatrixAt(i, _dummy.matrix);
    standingHeads.setMatrixAt(i, _dummy.matrix);
    standingVeils.setMatrixAt(i, _dummy.matrix);
  });
  if (standingRobes.instanceColor) standingRobes.instanceColor.needsUpdate = true;
  if (standingHeads.instanceColor) standingHeads.instanceColor.needsUpdate = true;
  standingRobes.instanceMatrix.needsUpdate = true;
  standingHeads.instanceMatrix.needsUpdate = true;
  standingVeils.instanceMatrix.needsUpdate = true;
  standingRobes.computeBoundingSphere();
  standingHeads.computeBoundingSphere();
  standingVeils.computeBoundingSphere();
  cityPlazaStage.add(standingRobes, standingHeads, standingVeils);

  // =========================================================================
  // STAGE 4 (47.3 - 60s+): LEAVING FESTIVAL & SITTING UNDER SHADE TREE
  // =========================================================================
  const shadeTreeStage = new THREE.Group();
  shadeTreeStage.visible = false;
  group.add(shadeTreeStage);

  const hillTerrainGeo = new THREE.PlaneGeometry(72, 72, 96, 96);
  hillTerrainGeo.rotateX(-Math.PI / 2);
  const hPos = hillTerrainGeo.attributes.position as THREE.BufferAttribute;
  const hillHeightAt = (x: number, z: number): number => {
    const knoll = Math.exp(-(x * x + (z - 0.6) * (z - 0.6)) / 28) * 0.48;
    const slopeBack = z < -3.5 ? THREE.MathUtils.smoothstep(-z, 3.5, 19) * -1.25 : 0;
    const wave = Math.sin(x * 0.22) * Math.cos(z * 0.2) * 0.16;
    return knoll + slopeBack + wave;
  };
  for (let i = 0; i < hPos.count; i++) {
    hPos.setY(i, hillHeightAt(hPos.getX(i), hPos.getZ(i)));
  }
  hillTerrainGeo.computeVertexNormals();
  geometries.push(hillTerrainGeo);

  const hillFloorMat = new THREE.MeshStandardMaterial({
    map: textures.meadowAlbedo,
    bumpMap: textures.meadowBump,
    bumpScale: 0.095,
    color: 0xb8c298,
    roughness: 0.94,
    metalness: 0.01,
  });
  localMaterials.push(hillFloorMat);
  const hillTerrain = new THREE.Mesh(hillTerrainGeo, hillFloorMat);
  hillTerrain.receiveShadow = true;
  shadeTreeStage.add(hillTerrain);

  // Hero Ancient Olive / Oak Shade Tree at (0, hillHeightAt(0, 0.2), 0.2)
  const heroOliveTree = buildOliveTree({
    assets: botanicalAssets,
    seed: 77,
    isHeroShadeTree: true,
  });
  heroOliveTree.group.position.set(0, hillHeightAt(0, 0.2) - 0.08, 0.2);
  builtTrees.push(heroOliveTree);
  shadeTreeStage.add(heroOliveTree.group);
  const canopyCrown = heroOliveTree.crownPivot;

  // Sculpted Natural Hillside Stone Seating Ledges (compact boulder placed cleanly behind seated calves)
  const seatRockGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.4, 10);
  geometries.push(seatRockGeo);
  const seatConfigs: { x: number; z: number; yaw: number }[] = [
    { x: -1.42, z: 1.58, yaw: 0.38 },
    { x: 0.0, z: 2.08, yaw: 0.12 },
    { x: 1.42, z: 1.55, yaw: -0.38 },
  ];
  seatConfigs.forEach(({ x, z, yaw }, idx) => {
    // Center rock 0.22m behind seated hip so torso rests on stone rim while calves & sandals stand clear on grass
    const sx = x - Math.sin(yaw) * 0.22;
    const sz = z - Math.cos(yaw) * 0.22;
    const seatStone = new THREE.Mesh(seatRockGeo, cliffStoneMat);
    seatStone.position.set(sx, hillHeightAt(sx, sz) + 0.18, sz);
    seatStone.rotation.y = yaw + idx * 0.4;
    seatStone.castShadow = true;
    seatStone.receiveShadow = true;
    shadeTreeStage.add(seatStone);
  });

  // 48 Hillside Grass Tufts (strictly outside seating footprints)
  const hillGrassCount = 48;
  const hillGrasses = new THREE.InstancedMesh(bladeGeo, grassMat, hillGrassCount);
  for (let i = 0; i < hillGrassCount; i++) {
    const ang = (i / hillGrassCount) * Math.PI * 2;
    let rad = 2.6 + (i % 6) * 0.85;
    let gx = Math.cos(ang) * rad;
    let gz = Math.sin(ang) * rad + 0.5;
    if (Math.hypot(gx, gz - 1.2) < 2.3) {
      rad += 2.2;
      gx = Math.cos(ang) * rad;
      gz = Math.sin(ang) * rad + 0.5;
    }
    const gy = hillHeightAt(gx, gz);
    const gs = 0.75 + (i % 4) * 0.25;
    _dummy.position.set(gx, gy - 0.01, gz);
    _dummy.rotation.set(0.1, i * 1.2, 0.08);
    _dummy.scale.setScalar(gs);
    _dummy.updateMatrix();
    hillGrasses.setMatrixAt(i, _dummy.matrix);
    _color.setHSL(0.24 + (i % 3) * 0.02, 0.3, 0.25 + (i % 4) * 0.04);
    hillGrasses.setColorAt(i, _color);
  }
  hillGrasses.instanceMatrix.needsUpdate = true;
  if (hillGrasses.instanceColor) hillGrasses.instanceColor.needsUpdate = true;
  shadeTreeStage.add(hillGrasses);

  // Hillside Perimeter Boulders (strictly outside walking corridor |x| < 3.4 & outside tree/seating zone)
  const hillBoulders = new THREE.InstancedMesh(cliffRockGeo, cliffStoneMat, 14);
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const rx = side * (4.2 + (i % 4) * 1.65);
    const rz = -7.5 + i * 1.15;
    const s = 0.36 + (i % 4) * 0.14;
    _dummy.position.set(rx, hillHeightAt(rx, rz) + s * 0.22, rz);
    _dummy.rotation.set(i * 0.6, i * 1.2, 0.2);
    _dummy.scale.set(s * 1.3, s * 0.72, s);
    _dummy.updateMatrix();
    hillBoulders.setMatrixAt(i, _dummy.matrix);
  }
  hillBoulders.instanceMatrix.needsUpdate = true;
  hillBoulders.computeBoundingSphere();
  shadeTreeStage.add(hillBoulders);

  // Surrounding Background Olive Grove Trees & Ridge Trail Stepping Stones (Stage 4)
  [
    [-5.8, -2.2, 0.92],
    [6.1, -1.8, 0.88],
    [-7.4, 3.8, 1.05],
    [7.2, 4.4, 0.96],
    [-4.9, -6.4, 0.84],
    [5.2, -5.9, 0.9],
  ].forEach(([ox, oz, sc], idx) => {
    const bgOlive = buildOliveTree({
      assets: botanicalAssets,
      heightScale: sc,
      spreadScale: sc * 1.06,
      seed: 60 + idx * 7,
    });
    bgOlive.group.position.set(ox, hillHeightAt(ox, oz) - 0.08, oz);
    bgOlive.group.rotation.y = idx * 0.9;
    builtTrees.push(bgOlive);
    shadeTreeStage.add(bgOlive.group);
  });

  // Distant Festival Torchlit Town Silhouette far down the valley (z = -17)
  const distantFestival = new THREE.InstancedMesh(wallHouseGeo, cliffStoneMat, 14);
  for (let i = 0; i < 14; i++) {
    const x = (i - 6.5) * 2.2;
    const z = -17.5 - (i % 3) * 2.0;
    _dummy.position.set(x, -1.6, z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(0.9, 1.5 + (i % 4) * 0.7, 0.9);
    _dummy.updateMatrix();
    distantFestival.setMatrixAt(i, _dummy.matrix);
  }
  distantFestival.instanceMatrix.needsUpdate = true;
  shadeTreeStage.add(distantFestival);

  const distantFestivalGlow = new THREE.PointLight(0xff7b29, 3.4, 24, 1.4);
  distantFestivalGlow.position.set(0, 0.5, -16.0);
  shadeTreeStage.add(distantFestivalGlow);

  // Soft Diffused Guidance Light Curtain under Shade Tree (for Hidayah & Mercy's Shade beats)
  const treeBeamMat = new THREE.MeshBasicMaterial({
    map: textures.softLightBeam,
    color: 0xffebb8,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  localMaterials.push(treeBeamMat);
  const sacredTreeBeam = new THREE.Group();
  const tShaftA = new THREE.Mesh(softShaftGeo, treeBeamMat);
  const tShaftB = new THREE.Mesh(softShaftGeo, treeBeamMat);
  tShaftB.rotation.y = Math.PI / 2;
  sacredTreeBeam.add(tShaftA, tShaftB);
  sacredTreeBeam.position.set(0, 8.5, 1.65);
  sacredTreeBeam.visible = false;
  shadeTreeStage.add(sacredTreeBeam);

  // =========================================================================
  // STAGE 5 (286.8 - 329.5s): SUNLIT MARKETPLACE & BELIEVER CITY
  // =========================================================================
  const marketStage = createKahfMarketStage({
    textures,
    sandstoneMat: sandstoneLightMat,
    cliffStoneMat,
    botanicalAssets,
    brassMat: materials.heroPrimary,
    drapeMat,
    silverCoinMat,
  });
  group.add(marketStage.group);

  // =========================================================================
  // SHARED HERO CHARACTERS (Lead + 6 Companions + Intruder for 3/5/7 & Cave beats)
  // =========================================================================
  const sharedRigTextures = {
    fabricMap: textures.fabricAlbedo,
    fabricBumpMap: textures.fabricBump,
    woodMap: textures.woodAlbedo,
    woodBumpMap: textures.woodBump,
    leatherBumpMap: textures.stoneBump,
  };
  const leadTraveler: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x8c7a64,
    cloakColor: 0x202736,
    scarfColor: 0xd9cebc,
    sashColor: 0x7a462a,
    heightScale: 1.02,
    hasStaff: true,
    ...sharedRigTextures,
  });
  const companionA: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0xa69882,
    cloakColor: 0x3b4430,
    scarfColor: 0xc8bca8,
    sashColor: 0x5c3c24,
    heightScale: 0.97,
    hasStaff: true,
    ...sharedRigTextures,
  });
  const companionB: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x6e5f50,
    cloakColor: 0x452d22,
    scarfColor: 0xdfd6c7,
    sashColor: 0x33404f,
    heightScale: 1.0,
    hasStaff: false,
    ...sharedRigTextures,
  });
  const companionC: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x94836e,
    cloakColor: 0x2c363f,
    scarfColor: 0xd5cbb8,
    sashColor: 0x61442c,
    heightScale: 0.98,
    hasStaff: false,
    ...sharedRigTextures,
  });
  const companionD: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x7c6f5e,
    cloakColor: 0x323b2c,
    scarfColor: 0xded4c3,
    sashColor: 0x4b3526,
    heightScale: 1.01,
    hasStaff: true,
    ...sharedRigTextures,
  });
  const companionE: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x9e8c77,
    cloakColor: 0x3f2e28,
    scarfColor: 0xcfc4b0,
    sashColor: 0x2e423e,
    heightScale: 0.96,
    hasStaff: false,
    ...sharedRigTextures,
  });
  const companionF: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x736658,
    cloakColor: 0x252c38,
    scarfColor: 0xe3dacb,
    sashColor: 0x6b472a,
    heightScale: 1.0,
    hasStaff: false,
    ...sharedRigTextures,
  });
  const intruderTraveler: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x423832,
    cloakColor: 0x1b191d,
    scarfColor: 0x574c45,
    sashColor: 0x3b231e,
    heightScale: 1.0,
    hasStaff: false,
    ...sharedRigTextures,
  });
  companionC.root.visible = false;
  companionD.root.visible = false;
  companionE.root.visible = false;
  companionF.root.visible = false;
  intruderTraveler.root.visible = false;
  group.add(
    leadTraveler.root,
    companionA.root,
    companionB.root,
    companionC.root,
    companionD.root,
    companionE.root,
    companionF.root,
    intruderTraveler.root,
  );

  // =========================================================================
  // STATIC PAINTED 360° SEAMLESS SKY-TO-HORIZON DOME + HIGH NIGHT STARS & MOTES
  // =========================================================================
  const vistaDomeGeo = new THREE.SphereGeometry(
    46,
    48,
    28,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.62,
  );
  geometries.push(vistaDomeGeo);
  const vistaDayMat = new THREE.MeshBasicMaterial({
    map: textures.scenicValleyDay,
    side: THREE.BackSide,
    fog: false,
  });
  const vistaDuskMat = new THREE.MeshBasicMaterial({
    map: textures.scenicHillsDusk,
    side: THREE.BackSide,
    fog: false,
  });
  localMaterials.push(vistaDayMat, vistaDuskMat);

  const vistaDayMesh = new THREE.Mesh(vistaDomeGeo, vistaDayMat);
  vistaDayMesh.position.y = -3.8;
  const vistaDuskMesh = new THREE.Mesh(vistaDomeGeo, vistaDuskMat);
  vistaDuskMesh.position.y = -3.8;
  vistaDayMesh.visible = false;
  group.add(vistaDayMesh, vistaDuskMesh);

  const starGeo = new THREE.IcosahedronGeometry(0.05, 0);
  geometries.push(starGeo);
  const starMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
  });
  localMaterials.push(starMat);
  const starCount = 220;
  const stars = new THREE.InstancedMesh(starGeo, starMat, starCount);
  stars.frustumCulled = false;
  for (let i = 0; i < starCount; i++) {
    const theta = i * 2.39996;
    const phi = Math.acos(1 - (0.65 * (i + 0.5)) / starCount);
    const r = 28.0 + (i % 5) * 1.5;
    _dummy.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      Math.max(10.5, r * Math.cos(phi) + 4.0),
      r * Math.sin(phi) * Math.sin(theta),
    );
    _dummy.scale.setScalar(0.45 + (i % 4) * 0.2);
    _dummy.updateMatrix();
    stars.setMatrixAt(i, _dummy.matrix);
    _color.setHSL(0.58 - (i % 3) * 0.14, 0.35, 0.85);
    stars.setColorAt(i, _color);
  }
  stars.instanceMatrix.needsUpdate = true;
  if (stars.instanceColor) stars.instanceColor.needsUpdate = true;
  group.add(stars);

  const moteGeo = new THREE.PlaneGeometry(0.032, 0.032);
  geometries.push(moteGeo);
  const moteMat = new THREE.MeshBasicMaterial({
    map: textures.particleGlow,
    color: 0xfcd34d,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  localMaterials.push(moteMat);
  const moteCount = 36;
  const motes = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
  motes.frustumCulled = false;
  group.add(motes);

  return {
    group,
    update: (time, _duration, intensity, explode, cameraPos) => {
      const t = time * intensity;

      // Full 0 - 527s (8m47s) Story Stage Routing aligned 1:1 with Bengali VO & SRT
      const inCave =
        time < 12.0 ||
        (time >= 133.8 && time < 286.8) ||
        (time >= 329.5 && time < 384.5) ||
        (time >= 404.0 && time < 423.0);

      const inRehalCoin =
        (time >= 12.0 && time < 27.5) ||
        (time >= 384.5 && time < 404.0) ||
        (time >= 446.5 && time < 492.0);

      const inCityPlaza =
        (time >= 27.5 && time < 47.3) || (time >= 91.7 && time < 133.8);

      const inShadeTree =
        (time >= 47.3 && time < 91.7) ||
        (time >= 423.0 && time < 446.5) ||
        time >= 492.0;

      const inMarketCity = time >= 286.8 && time < 329.5;

      caveStage.visible = inCave;
      rehalCoinStage.visible = inRehalCoin;
      cityPlazaStage.visible = inCityPlaza;
      shadeTreeStage.visible = inShadeTree;
      marketStage.group.visible = inMarketCity;

      // Default hide extra rigs & handheld provisions unless active in specific scenes
      leadTraveler.setHeldProvision(false, false);
      companionA.setHeldProvision(false, false);
      companionB.setHeldProvision(false, false);
      companionC.root.visible = false;
      companionD.root.visible = false;
      companionE.root.visible = false;
      companionF.root.visible = false;
      intruderTraveler.root.visible = false;
      memorialMosque.visible = false;
      orbitalAlignmentGroup.visible = false;
      sacredTreeBeam.visible = false;

      // Helpers for synced horizon sky-arc during valley timelapses
      const introTimelapseSunTheta =
        (time - 7.4) * ((Math.PI * 2 * 2) / 4.6) + 0.35;
      const centuriesTimelapseSunTheta =
        (time - 220.5) * ((Math.PI * 2 * 3.5) / 11.0) + 0.4;
      const isIntroTimelapse = time >= 7.4 && time < 12.0;
      const isCenturiesTimelapse = time >= 220.5 && time < 231.5;

      const setSunAlpha = (alpha: number, sc = 1.0) => {
        const a = THREE.MathUtils.clamp(alpha, 0, 1);
        sunGroup.visible = a > 0.01;
        sunGroup.scale.setScalar(sc);
        sunOrbMat.opacity = a;
        sunCoronaInnerMat.opacity = a * 0.78;
        sunCoronaOuterMat.opacity = a * 0.38;
      };
      const setMoonAlpha = (alpha: number, sc = 1.0) => {
        const a = THREE.MathUtils.clamp(alpha, 0, 1);
        moonGroup.visible = a > 0.01;
        moonGroup.scale.setScalar(sc);
        moonMat.opacity = a * 0.96;
        moonGlowInnerMat.opacity = a * 0.52;
        moonGlowOuterMat.opacity = a * 0.24;
      };

      // Static painted horizon vista: sunlit valley vs starlit dusk hills (tracks timelapse cycles)
      const useDayVista = isIntroTimelapse
        ? Math.sin(introTimelapseSunTheta) > -0.05
        : isCenturiesTimelapse
          ? Math.sin(centuriesTimelapseSunTheta) > -0.05
          : (time >= 3.85 && time < 27.5) ||
            (time >= 184.5 && time < 198.5) ||
            (time >= 231.5 && time < 347.0) ||
            (time >= 384.5 && time < 423.0) ||
            (time >= 433.0 && time < 492.0) ||
            time >= 514.0;

      vistaDayMesh.visible = useDayVista;
      vistaDuskMesh.visible = !useDayVista;
      stars.visible = !useDayVista || (time >= 404.0 && time < 423.0);
      motes.visible = !(inCave && time >= 7.0 && time < 12.0);

      // Update global Sun & Crescent Moon placement & sky-dome arc for every chapter
      const applyValleyArc = (sunTheta: number) => {
        const moonTheta = sunTheta - Math.PI;
        const sunSin = Math.sin(sunTheta);
        const moonSin = Math.sin(moonTheta);
        const arcZ = 33.8;
        const arcCenterX = -2.2;
        const arcRx = 15.8;
        const horizonY = 2.6;
        const arcRy = 10.4;

        sunGroup.position.set(
          arcCenterX - Math.cos(sunTheta) * arcRx,
          horizonY + Math.max(0, sunSin) * arcRy,
          arcZ,
        );
        setSunAlpha(THREE.MathUtils.smoothstep(sunSin, -0.05, 0.24), 1.18);

        moonGroup.position.set(
          arcCenterX - Math.cos(moonTheta) * arcRx,
          horizonY + Math.max(0, moonSin) * arcRy,
          arcZ,
        );
        setMoonAlpha(THREE.MathUtils.smoothstep(moonSin, -0.05, 0.24), 1.15);
      };

      if (inRehalCoin) {
        setSunAlpha(0);
        setMoonAlpha(0);
      } else if (time < 3.85) {
        // Intro Night: Crescent moon high in clear sky right of the cave mountain ridge
        setSunAlpha(0);
        moonGroup.position.set(17.8 - time * 0.25, 11.8 + time * 0.1, -20.5);
        setMoonAlpha(0.95, 1.08);
      } else if (time < 7.4) {
        // Intro Dawn: Sun rises cleanly above eastern cliff flank as moon fades high left
        const dawnP = THREE.MathUtils.smoothstep(time, 3.85, 7.35);
        sunGroup.position.set(
          THREE.MathUtils.lerp(18.0, 15.8, dawnP),
          THREE.MathUtils.lerp(9.8, 11.8, dawnP),
          -18.5,
        );
        setSunAlpha(THREE.MathUtils.smoothstep(time, 3.85, 4.9), 1.02);
        moonGroup.position.set(-14.0 - dawnP * 1.2, 11.6 + dawnP * 0.6, -20.5);
        setMoonAlpha(0.85 * (1 - dawnP), 1.0);
      } else if (time < 12.0) {
        // Intro 309-year Timelapse: Sun & moon arc seamlessly from East horizon to West horizon over valley
        applyValleyArc(introTimelapseSunTheta);
      } else if (inCityPlaza) {
        // Night festival plaza & royal trial: high crescent moon behind city skyline
        setSunAlpha(0);
        moonGroup.position.set(8.6 - (time % 40) * 0.04, 11.4, -23.0);
        setMoonAlpha(0.9, 1.1);
      } else if (inShadeTree) {
        // Hillside olive tree: night crescent moon transitions to golden dawn sun on Hidayah/Outro
        const isDawnSegment =
          time >= 74.0 || (time >= 433.0 && time < 446.5) || time >= 512.0;
        if (isDawnSegment) {
          const dawnFade =
            time >= 512.0
              ? THREE.MathUtils.smoothstep(time, 512.0, 524.0)
              : time >= 433.0 && time < 446.5
                ? THREE.MathUtils.smoothstep(time, 433.0, 441.0)
                : THREE.MathUtils.smoothstep(time, 74.0, 82.0);
          sunGroup.position.set(
            THREE.MathUtils.lerp(10.5, 8.2, dawnFade),
            THREE.MathUtils.lerp(7.4, 10.6, dawnFade),
            -24.0,
          );
          setSunAlpha(dawnFade, 1.05);
          moonGroup.position.set(-7.5, 11.2, -24.0);
          setMoonAlpha(0.85 * (1 - dawnFade), 1.05);
        } else {
          setSunAlpha(0);
          moonGroup.position.set(-7.5, 11.2, -24.0);
          setMoonAlpha(0.9, 1.05);
        }
      } else if (time >= 133.8 && time < 184.5) {
        // Cave consultation, flight, Du'a & veil of sleep: nocturnal crescent sky
        setSunAlpha(0);
        moonGroup.position.set(13.2, 11.4, -20.5);
        setMoonAlpha(0.92, 1.05);
      } else if (time >= 184.5 && time < 198.5) {
        // Surah Al-Kahf 18:17: Sun rises clearly above RIGHT (+X) flank of cave ridge, arcs overhead, sets on LEFT (-X)
        const pSun = (time - 184.5) / 14.0;
        const arcAng = THREE.MathUtils.lerp(0.14, Math.PI - 0.14, pSun);
        sunGroup.position.set(
          Math.cos(arcAng) * 14.8,
          9.6 + Math.sin(arcAng) * 4.2,
          -14.5,
        );
        setSunAlpha(1.0, 1.05);
        setMoonAlpha(0);
      } else if (time >= 198.5 && time < 220.5) {
        // Turning sides & night awe
        setSunAlpha(0);
        moonGroup.position.set(-8.0, 11.2, -22.5);
        setMoonAlpha(0.9, 1.05);
      } else if (time >= 220.5 && time < 231.5) {
        // Centuries pass outside timelapse over valley
        applyValleyArc(centuriesTimelapseSunTheta);
      } else if (time >= 231.5 && time < 274.5) {
        // Afternoon awakening & early canyon descent facing cave/trail
        const fadeOutSwap =
          time >= 272.0 ? 1 - THREE.MathUtils.smoothstep(time, 272.0, 274.5) : 1;
        sunGroup.position.set(-8.6, 10.2, -22.0);
        setSunAlpha(fadeOutSwap, 1.02);
        setMoonAlpha(0);
      } else if (time >= 274.5 && time < 286.8) {
        // Over-the-shoulder canyon descent facing distant walled city (+Z): golden sun over city skyline
        const fadeInSwap = THREE.MathUtils.smoothstep(time, 274.5, 277.0);
        sunGroup.position.set(-8.5, 11.8, 33.5);
        setSunAlpha(fadeInSwap, 1.15);
        setMoonAlpha(0);
      } else if (inMarketCity) {
        // Bright sunlit marketplace city
        sunGroup.position.set(-7.5, 13.0, -26.5);
        setSunAlpha(1.0, 1.1);
        setMoonAlpha(0);
      } else if (time >= 329.5 && time < 347.0) {
        // Sunlit resurrection promise at cave sanctuary
        sunGroup.position.set(7.8, 11.6, -22.5);
        setSunAlpha(1.0, 1.05);
        setMoonAlpha(0);
      } else if (time >= 347.0 && time < 384.5) {
        // Memorial Mosque & 3/5/7 silhouettes at dusk/night
        setSunAlpha(0);
        moonGroup.position.set(-7.8, 11.8, -23.0);
        setMoonAlpha(0.94, 1.1);
      } else if (time >= 404.0 && time < 423.0) {
        // Chapter 13C: 300 Solar & 309 Lunar Years — sun & moon locked strictly onto concentric orbital tracks
        orbitalAlignmentGroup.visible = true;
        const ct = time - 404.0;
        const sunAng = ct * 0.95 * intensity;
        const moonAng = sunAng * (309 / 300) + Math.PI * 0.35;

        const solarX = Math.sin(sunAng) * 4.4;
        const solarY = Math.cos(sunAng) * 4.4;
        const lunarX = Math.sin(moonAng) * 5.2;
        const lunarY = Math.cos(moonAng) * 5.2;

        // Transform local tilted-ring coordinates into world space cleanly
        const cosTilt = Math.cos(orbitalAlignmentGroup.rotation.x);
        const sinTilt = Math.sin(orbitalAlignmentGroup.rotation.x);

        sunGroup.position.set(
          orbitalAlignmentGroup.position.x + solarX,
          orbitalAlignmentGroup.position.y + solarY * cosTilt,
          orbitalAlignmentGroup.position.z + solarY * sinTilt,
        );
        setSunAlpha(1.0, 0.92);

        moonGroup.position.set(
          orbitalAlignmentGroup.position.x + lunarX,
          orbitalAlignmentGroup.position.y + lunarY * cosTilt,
          orbitalAlignmentGroup.position.z + lunarY * sinTilt,
        );
        setMoonAlpha(1.0, 0.96);
      }

      // Always face crescent moon cleanly toward active camera so it never turns edge-on
      if (moonGroup.visible && cameraPos) {
        moonGroup.lookAt(cameraPos);
      }

      // Shared helper for curved Bezier walking arcs
      const evalArc = (
        p: number,
        p0: [number, number],
        p1: [number, number],
        p2: [number, number],
      ): [number, number, number] => {
        const inv = 1 - p;
        const x = inv * inv * p0[0] + 2 * inv * p * p1[0] + p * p * p2[0];
        const z = inv * inv * p0[1] + 2 * inv * p * p1[1] + p * p * p2[1];
        const dx = 2 * inv * (p1[0] - p0[0]) + 2 * p * (p2[0] - p1[0]);
        const dz = 2 * inv * (p1[1] - p0[1]) + 2 * p * (p2[1] - p1[1]);
        return [x, z, Math.atan2(dx, dz)];
      };

      const evalCubicArc = (
        p: number,
        p0: [number, number],
        c1: [number, number],
        c2: [number, number],
        p3: [number, number],
      ): [number, number, number] => {
        const inv = 1 - p;
        const b0 = inv * inv * inv;
        const b1 = 3 * inv * inv * p;
        const b2 = 3 * inv * p * p;
        const b3 = p * p * p;
        const x = b0 * p0[0] + b1 * c1[0] + b2 * c2[0] + b3 * p3[0];
        const z = b0 * p0[1] + b1 * c1[1] + b2 * c2[1] + b3 * p3[1];
        const dx =
          3 * inv * inv * (c1[0] - p0[0]) +
          6 * inv * p * (c2[0] - c1[0]) +
          3 * p * p * (p3[0] - c2[0]);
        const dz =
          3 * inv * inv * (c1[1] - p0[1]) +
          6 * inv * p * (c2[1] - c1[1]) +
          3 * p * p * (p3[1] - c2[1]);
        return [x, z, Math.atan2(dx, dz)];
      };

      const lerpAngle = (a: number, b: number, u: number) => {
        const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
        return a + diff * u;
      };

      // -------------------------------------------------------------------
      // CAVE SANCTUARY STAGE (0-12s, 133.8-260s, 266-286.8s, 329.5-384.5s, 404-423s)
      // -------------------------------------------------------------------
      if (inCave) {
        leadTraveler.root.visible = true;
        companionA.root.visible = true;
        companionB.root.visible = true;

        palmCrowns.forEach(({ crown, phaseOffset }) => {
          crown.rotation.z = Math.sin(t * 1.3 + phaseOffset) * 0.045;
          crown.rotation.x = Math.cos(t * 1.0 + phaseOffset) * 0.03;
        });
        for (let i = 0; i < grassCount; i++) {
          const gm = grassMeta[i];
          _dummy.position.set(gm.x, gm.y - 0.02, gm.z);
          _dummy.rotation.set(
            0.1 + Math.sin(t * 2.2 + i) * 0.08,
            gm.rot,
            0.06 + Math.cos(t * 1.8 + i) * 0.06,
          );
          _dummy.scale.setScalar(gm.s);
          _dummy.updateMatrix();
          grasses.setMatrixAt(i, _dummy.matrix);
        }
        grasses.instanceMatrix.needsUpdate = true;

        caveBounceLight.position.y = 1.85 - explode * 0.2;
        caveBounceLight.color.setHex(useDayVista ? 0xffdfb0 : 0x7390ba);

        // Default Qitmir gentle breathing & threshold guard position
        dogGroup.visible = true;
        dogGroup.position.set(1.05, terrainHeightAt(1.05, 0.52), 0.52);
        dogGroup.rotation.y = -0.35;
        dogTorso.scale.y = 1 + Math.sin(t * 1.6) * 0.035;
        dogTail.rotation.y = 0.3 + Math.sin(t * 2.2) * 0.08;
        foreLegL.position.z = 0.32;
        foreLegR.position.z = 0.32;

        // Default sunBeam alignment
        sunBeam.position.set(2.4, 7.6, 2.2);
        sunBeam.rotation.set(-0.28, 0, 0.36);

        if (time < 12.0) {
          // --- INTRO CHAPTER (0 - 12s) ---
          companionA.root.position.set(-0.76, 0.045, -1.62);
          companionA.root.rotation.y = 0.22;
          companionB.root.position.set(0.76, 0.045, -1.64);
          companionB.root.rotation.y = -0.25;

          if (time >= 3.85) {
            const alert = THREE.MathUtils.smoothstep(time, 3.85, 5.2);
            dogHeadPivot.rotation.set(-alert * 0.16, Math.sin(t * 1.3) * 0.12 * alert, 0);
          } else {
            dogHeadPivot.rotation.set(0.12, 0, 0);
          }

          if (time < 1.35) {
            const p = THREE.MathUtils.clamp(time / 1.35, 0, 1);
            const travX = THREE.MathUtils.lerp(-0.35, 0.0, p);
            const travZ = THREE.MathUtils.lerp(4.6, 1.85, p);
            leadTraveler.root.position.set(
              travX,
              terrainHeightAt(travX, travZ) + 0.04,
              travZ,
            );
            leadTraveler.root.rotation.y = Math.PI;
            leadTraveler.setPoseWalk(time * 4.5);
            companionA.setPoseRest(1, time, -0.82);
            companionB.setPoseRest(1, time + 0.8, 0.85);
            caveBounceLight.intensity = 0.32 + p * 0.16;
            beamMat.opacity = 0;
            starMat.opacity = 0.88;
          } else if (time < 3.85) {
            const p = THREE.MathUtils.smoothstep(time, 1.4, 3.25);
            const dimOut = THREE.MathUtils.smoothstep(time, 2.7, 3.85);
            leadTraveler.root.position.set(0.0, 0.045, -1.15);
            leadTraveler.root.rotation.y = 0.15;
            leadTraveler.setPoseRest(p, time, 0.85 * p);
            companionA.setPoseRest(1, time, -0.82);
            companionB.setPoseRest(1, time + 0.8, 0.85);
            caveBounceLight.intensity = 0.38 * (1 - dimOut * 0.65);
            beamMat.opacity = 0;
            starMat.opacity = 0.9;
          } else if (time < 7.4) {
            const standP = THREE.MathUtils.smoothstep(time, 4.0, 6.4);
            const dawnBeam = THREE.MathUtils.smoothstep(time, 3.85, 5.1);
            leadTraveler.root.position.set(0.0, 0.045, -1.15);
            leadTraveler.root.rotation.y = THREE.MathUtils.lerp(0.15, 0.08, standP);
            leadTraveler.setPoseAwaken(standP, time, 0.85);
            companionA.setPoseAwaken(
              THREE.MathUtils.smoothstep(time, 4.45, 6.75),
              time + 0.5,
              -0.82,
            );
            companionB.setPoseAwaken(
              THREE.MathUtils.smoothstep(time, 4.8, 7.05),
              time + 1.0,
              0.85,
            );
            caveBounceLight.intensity = 0.3 + dawnBeam * 0.35;
            beamMat.opacity = dawnBeam * 0.25;
            sunBeam.rotation.z = 0.5 - dawnBeam * 0.28;
            starMat.opacity = 0.85 * (1 - dawnBeam * 0.65);
          } else {
            const walkOut = THREE.MathUtils.smoothstep(time, 7.4, 9.2);
            const tl = time - 7.4;
            const leadX = THREE.MathUtils.lerp(0.0, -0.25, walkOut);
            const leadZ = THREE.MathUtils.lerp(-1.15, 1.35, walkOut);
            leadTraveler.root.position.set(
              leadX,
              terrainHeightAt(leadX, leadZ) + 0.045,
              leadZ,
            );
            leadTraveler.root.rotation.y = THREE.MathUtils.lerp(0.08, 0.12, walkOut);
            if (walkOut < 0.96) {
              leadTraveler.setPoseWalk(time * 4.4);
            } else {
              leadTraveler.setPoseLookout(time);
            }

            const compWalk = THREE.MathUtils.smoothstep(time, 7.4, 8.9);
            const ax = THREE.MathUtils.lerp(-0.76, -0.85, compWalk);
            const az = THREE.MathUtils.lerp(-1.62, 0.4, compWalk);
            companionA.root.position.set(ax, terrainHeightAt(ax, az) + 0.045, az);
            companionA.root.rotation.y = THREE.MathUtils.lerp(0.22, 0.05, compWalk);
            if (compWalk < 0.96) {
              companionA.setPoseWalk(time * 4.2 + 0.8);
            } else {
              companionA.setPoseLookout(time + 0.4);
            }

            const bx = THREE.MathUtils.lerp(0.76, 0.65, compWalk);
            const bz = THREE.MathUtils.lerp(-1.64, 0.25, compWalk);
            companionB.root.position.set(bx, terrainHeightAt(bx, bz) + 0.045, bz);
            companionB.root.rotation.y = THREE.MathUtils.lerp(-0.25, -0.15, compWalk);
            if (compWalk < 0.96) {
              companionB.setPoseWalk(time * 4.3 + 1.6);
            } else {
              companionB.setPoseLookout(time + 0.9);
            }

            const introSin = Math.sin(introTimelapseSunTheta);
            beamMat.opacity =
              Math.max(0, introSin) * (0.14 + Math.sin(tl * 1.8) * 0.03);
            caveBounceLight.intensity = 0.42 + Math.max(0, introSin) * 0.38;
            starMat.opacity = THREE.MathUtils.smoothstep(-introSin, -0.05, 0.45) * 0.85;
          }
        } else if (time < 160.0) {
          // --- CHAPTER 7 (133.8 - 160.0s): CONSULTATION & FLIGHT INTO CAVE ---
          dogHeadPivot.rotation.set(-0.08, Math.sin(t * 0.9) * 0.1, 0);
          caveBounceLight.intensity = 0.42;
          beamMat.opacity = 0;
          starMat.opacity = 0.86;

          if (time < 144.0) {
            // Standing on mountain ridge consulting ("Where shall we go? Take refuge in the cave!")
            leadTraveler.root.position.set(-0.2, terrainHeightAt(-0.2, 4.6) + 0.045, 4.6);
            leadTraveler.root.rotation.y = Math.PI * 0.85;
            leadTraveler.setPoseLookout(t);

            companionA.root.position.set(-0.95, terrainHeightAt(-0.95, 4.9) + 0.045, 4.9);
            companionA.root.rotation.y = Math.PI * 0.65;
            companionA.setPoseLookout(t + 0.4);

            companionB.root.position.set(0.65, terrainHeightAt(0.65, 4.85) + 0.045, 4.85);
            companionB.root.rotation.y = -Math.PI * 0.68;
            companionB.setPoseLookout(t + 0.8);
          } else {
            // Walking respectfully up the trail into the sheltered natural cave (144 - 160s)
            const p = THREE.MathUtils.smoothstep(time, 144.0, 158.5);
            const lz = THREE.MathUtils.lerp(4.6, -1.05, p);
            const az = THREE.MathUtils.lerp(4.9, -1.55, p);
            const bz = THREE.MathUtils.lerp(4.85, -1.5, p);
            const lx = THREE.MathUtils.lerp(-0.2, 0.0, p);
            const ax = THREE.MathUtils.lerp(-0.95, -0.78, p);
            const bx = THREE.MathUtils.lerp(0.65, 0.78, p);

            leadTraveler.root.position.set(lx, terrainHeightAt(lx, lz) + 0.045, lz);
            leadTraveler.root.rotation.y = Math.PI;
            companionA.root.position.set(ax, terrainHeightAt(ax, az) + 0.045, az);
            companionA.root.rotation.y = Math.PI * 0.96;
            companionB.root.position.set(bx, terrainHeightAt(bx, bz) + 0.045, bz);
            companionB.root.rotation.y = -Math.PI * 0.96;

            if (p < 0.97) {
              leadTraveler.setPoseWalk(time * 3.8);
              companionA.setPoseWalk(time * 3.7 + 1.0);
              companionB.setPoseWalk(time * 3.9 + 2.0);
            } else {
              leadTraveler.setPoseLookout(t);
              companionA.setPoseLookout(t + 0.5);
              companionB.setPoseLookout(t + 1.0);
            }
          }
        } else if (time < 174.0) {
          // --- CHAPTER 8A (160.0 - 174.0s): DU'A INSIDE CAVE ("Rabbana atina milladunka rahmah...") ---
          const duaUp = THREE.MathUtils.smoothstep(time, 160.2, 163.0);
          const mercyLight = THREE.MathUtils.smoothstep(time, 164.0, 168.5);
          leadTraveler.root.position.set(0.0, 0.045, -1.05);
          leadTraveler.root.rotation.y = 0.06;
          leadTraveler.setPoseDua(duaUp, t);

          companionA.root.position.set(-0.78, 0.045, -1.48);
          companionA.root.rotation.y = 0.18;
          companionA.setPoseDua(duaUp, t + 0.3);

          companionB.root.position.set(0.78, 0.045, -1.48);
          companionB.root.rotation.y = -0.18;
          companionB.setPoseDua(duaUp, t + 0.6);

          dogHeadPivot.rotation.set(0.05, 0, 0);
          caveBounceLight.intensity = 0.42 + mercyLight * 0.35;
          sunBeam.position.set(0.0, 7.4, -0.4);
          sunBeam.rotation.set(0, 0, 0.08);
          beamMat.opacity = mercyLight * 0.22;
          starMat.opacity = 0.85;
        } else if (time < 231.5) {
          // --- CHAPTER 8B & 9 (174.0 - 231.5s): VEIL OF SLEEP, SUN PASSING RIGHT/LEFT, TURNING SIDES & QITMIR ---
          const sleepIn = THREE.MathUtils.smoothstep(time, 174.0, 179.0);
          // Slow, serene, staggered side-turning (one calm roll right <-> left and back) around 3:21 (201s)
          const calcSideTurn = (baseSign: number, delay: number) => {
            if (time < 198.5 || time >= 210.7) return baseSign;
            const u1 = THREE.MathUtils.smoothstep(time, 198.8 + delay, 203.4 + delay);
            const u2 = THREE.MathUtils.smoothstep(time, 205.1 + delay, 209.5 + delay);
            return baseSign * (1 - 2 * u1 + 2 * u2);
          };

          const leadRoll = calcSideTurn(0.85, 0.0);
          const compARoll = calcSideTurn(-0.82, 0.55);
          const compBRoll = calcSideTurn(0.85, 1.0);

          leadTraveler.root.position.set(
            0.0,
            0.045,
            THREE.MathUtils.lerp(-1.05, -1.15, sleepIn),
          );
          leadTraveler.root.rotation.y = THREE.MathUtils.lerp(0.06, 0.14, sleepIn);
          leadTraveler.setPoseRest(sleepIn, t, leadRoll);

          companionA.root.position.set(
            THREE.MathUtils.lerp(-0.78, -0.76, sleepIn),
            0.045,
            THREE.MathUtils.lerp(-1.48, -1.62, sleepIn),
          );
          companionA.root.rotation.y = THREE.MathUtils.lerp(0.18, 0.2, sleepIn);
          companionA.setPoseRest(sleepIn, t + 0.5, compARoll);

          companionB.root.position.set(
            THREE.MathUtils.lerp(0.78, 0.76, sleepIn),
            0.045,
            THREE.MathUtils.lerp(-1.48, -1.64, sleepIn),
          );
          companionB.root.rotation.y = THREE.MathUtils.lerp(-0.18, -0.22, sleepIn);
          companionB.setPoseRest(sleepIn, t + 1.0, compBRoll);

          // Qitmir stretches front paws cleanly across the cave threshold
          foreLegL.position.z = 0.37;
          foreLegR.position.z = 0.37;

          if (time < 184.5) {
            const dim = THREE.MathUtils.smoothstep(time, 175.0, 183.5);
            caveBounceLight.intensity = 0.38 * (1 - dim * 0.55);
            beamMat.opacity = 0.14 * (1 - dim);
            starMat.opacity = 0.88;
          } else if (time < 198.5) {
            // Sun rises on RIGHT of cave (184.5 - 191.5) & sets on LEFT of cave (191.5 - 198.5) without touching sleepers
            const pSun = (time - 184.5) / 14.0;
            const isSetting = pSun >= 0.5;
            const sideSign = isSetting ? -1 : 1;
            const localWave = Math.sin(((pSun % 0.5) / 0.5) * Math.PI);
            sunBeam.position.set(sideSign * 2.55, 7.6, 1.9);
            sunBeam.rotation.set(-0.22, 0, sideSign * -0.28);
            beamMat.opacity = 0.24 * localWave;
            caveBounceLight.intensity = 0.45;
            starMat.opacity = 0.0;
            dogHeadPivot.rotation.set(0.06, 0, 0);
          } else if (time < 210.7) {
            // Gentle side turning inside + Qitmir watching over cave mouth
            beamMat.opacity = 0.08;
            sunBeam.position.set(1.8, 7.6, 2.2);
            caveBounceLight.intensity = 0.28;
            starMat.opacity = 0.72;
            dogHeadPivot.rotation.set(-0.08, Math.sin(t * 0.8) * 0.12, 0);
          } else if (time < 220.5) {
            // Shadowy intruder peeks into cave mouth (210.7 - 214.8), sees Qitmir & awe, and flees down trail (214.8 - 220.5)
            intruderTraveler.root.visible = true;
            const approach = THREE.MathUtils.smoothstep(time, 210.7, 214.4);
            const flee = THREE.MathUtils.smoothstep(time, 215.2, 220.5);
            if (time < 214.6) {
              const iz = THREE.MathUtils.lerp(4.6, 1.95, approach);
              const ix = trailPathX(iz) - 0.35;
              intruderTraveler.root.position.set(ix, terrainHeightAt(ix, iz) + 0.045, iz);
              intruderTraveler.root.rotation.y = Math.PI;
              intruderTraveler.setPoseWalk(time * 3.4);
            } else if (time < 215.3) {
              const ix = trailPathX(1.95) - 0.35;
              intruderTraveler.root.position.set(ix, terrainHeightAt(ix, 1.95) + 0.045, 1.95);
              intruderTraveler.root.rotation.y = Math.PI;
              intruderTraveler.setPoseLookout(t);
            } else {
              const iz = THREE.MathUtils.lerp(1.95, 7.4, flee);
              const ix = trailPathX(iz) - 0.35;
              intruderTraveler.root.position.set(ix, terrainHeightAt(ix, iz) + 0.045, iz);
              intruderTraveler.root.rotation.y = 0.08;
              intruderTraveler.setPoseWalk(time * 5.2);
            }
            dogHeadPivot.rotation.set(-0.22, -0.25, 0);
            caveBounceLight.intensity = 0.34;
            beamMat.opacity = 0.05;
            starMat.opacity = 0.82;
          } else {
            // Centuries pass outside (220.5 - 231.5s): Sun & crescent moon cycle across sky while sleepers rest in peace
            const cl = time - 220.5;
            const centSin = Math.sin(centuriesTimelapseSunTheta);
            beamMat.opacity = Math.max(0, centSin) * (0.14 + Math.sin(cl * 2.0) * 0.04);
            caveBounceLight.intensity = 0.36 + Math.max(0, centSin) * 0.32;
            starMat.opacity = THREE.MathUtils.smoothstep(-centSin, -0.05, 0.45) * 0.85;
          }
        } else if (time < 266.0) {
          // --- CHAPTER 10A & 10B (231.5 - 266.0s): AFTERNOON AWAKENING & SILVER COIN DISPATCH AT CAVE MOUTH ---
          const wake = THREE.MathUtils.smoothstep(time, 232.0, 236.2);
          const stepOut = THREE.MathUtils.smoothstep(time, 236.6, 241.2);
          const leadX = THREE.MathUtils.lerp(0.0, 0.05, stepOut);
          const leadZ = THREE.MathUtils.lerp(-1.15, 0.15, stepOut);
          const compAX = THREE.MathUtils.lerp(-0.76, -0.88, stepOut);
          const compAZ = THREE.MathUtils.lerp(-1.62, -0.15, stepOut);
          const compBX = THREE.MathUtils.lerp(0.76, 0.9, stepOut);
          const compBZ = THREE.MathUtils.lerp(-1.64, -0.15, stepOut);

          if (time < 236.6) {
            leadTraveler.root.position.set(leadX, 0.045, leadZ);
            companionA.root.position.set(compAX, 0.045, compAZ);
            companionB.root.position.set(compBX, 0.045, compBZ);
            leadTraveler.root.rotation.y = THREE.MathUtils.lerp(0.14, 0.08, wake);
            companionA.root.rotation.y = THREE.MathUtils.lerp(0.2, 0.35, wake);
            companionB.root.rotation.y = THREE.MathUtils.lerp(-0.22, -0.35, wake);
            leadTraveler.setPoseAwaken(wake, t, 0.85);
            companionA.setPoseAwaken(wake, t + 0.4, -0.82);
            companionB.setPoseAwaken(wake, t + 0.8, 0.85);
          } else if (time < 241.2) {
            leadTraveler.root.position.set(leadX, terrainHeightAt(leadX, leadZ) + 0.045, leadZ);
            companionA.root.position.set(compAX, terrainHeightAt(compAX, compAZ) + 0.045, compAZ);
            companionB.root.position.set(compBX, terrainHeightAt(compBX, compBZ) + 0.045, compBZ);
            leadTraveler.root.rotation.y = THREE.MathUtils.lerp(0.08, -0.24, stepOut);
            companionA.root.rotation.y = THREE.MathUtils.lerp(0.35, 0.65, stepOut);
            companionB.root.rotation.y = THREE.MathUtils.lerp(-0.35, -0.58, stepOut);
            if (stepOut < 0.96) {
              leadTraveler.setPoseWalk(time * 3.8);
              companionA.setPoseWalk(time * 3.7 + 0.8);
              companionB.setPoseWalk(time * 3.9 + 1.6);
            } else {
              leadTraveler.setPoseLookout(t);
              companionA.setPoseLookout(t + 0.5);
              companionB.setPoseLookout(t + 1.0);
            }
          } else if (time < 257.0) {
            // Standing in quiet conversation at sunlit cave mouth
            leadTraveler.root.position.set(0.05, terrainHeightAt(0.05, 0.15) + 0.045, 0.15);
            companionA.root.position.set(-0.88, terrainHeightAt(-0.88, -0.15) + 0.045, -0.15);
            companionB.root.position.set(0.9, terrainHeightAt(0.9, -0.15) + 0.045, -0.15);
            leadTraveler.root.rotation.y = -0.24;
            companionA.root.rotation.y = 0.65;
            companionB.root.rotation.y = -0.58;
            leadTraveler.setPoseLookout(t);
            companionA.setPoseLookout(t + 0.5);
            companionB.setPoseLookout(t + 1.0);
          } else {
            // 257.0 - 266.0s (4.3 - 4.4 min): Entrusting the real ancient silver coin & woven pouch at cave opening
            const coinFocus = THREE.MathUtils.smoothstep(time, 257.0, 258.4);
            const lz = THREE.MathUtils.lerp(0.15, 0.25, coinFocus);
            const az = THREE.MathUtils.lerp(-0.15, -0.05, coinFocus);
            const bz = THREE.MathUtils.lerp(-0.15, -0.08, coinFocus);
            leadTraveler.root.position.set(0.05, terrainHeightAt(0.05, lz) + 0.045, lz);
            leadTraveler.root.rotation.y = THREE.MathUtils.lerp(-0.24, -0.32, coinFocus);
            leadTraveler.setHeldProvision(true, true);
            leadTraveler.setPoseLookout(t);

            companionA.root.position.set(-0.88, terrainHeightAt(-0.88, az) + 0.045, az);
            companionA.root.rotation.y = THREE.MathUtils.lerp(0.65, 0.78, coinFocus);
            companionA.setPoseLookout(t + 0.5);

            companionB.root.position.set(0.9, terrainHeightAt(0.9, bz) + 0.045, bz);
            companionB.root.rotation.y = THREE.MathUtils.lerp(-0.58, -0.75, coinFocus);
            companionB.setPoseLookout(t + 1.0);
          }
          dogHeadPivot.rotation.set(-0.14, Math.sin(t * 1.1) * 0.12, 0);
          caveBounceLight.intensity = 0.85;
          beamMat.opacity = 0.22;
          sunBeam.position.set(-1.3, 7.6, 1.8);
          sunBeam.rotation.set(-0.26, 0, -0.22);
          starMat.opacity = 0.0;
        } else if (time < 286.8) {
          // --- CHAPTER 10C (266.0 - 286.8s / ~4.4 min): CAUTIOUS DESCENT ALONG WINDING STONE TRAIL TOWARD CITY ---
          const walk = THREE.MathUtils.smoothstep(time, 266.0, 286.8);
          const lz = THREE.MathUtils.lerp(1.25, 11.4, walk);
          const lx = trailPathX(lz);
          const trailSlopeX = lz <= 1.2 ? 0 : Math.cos((lz - 1.2) * 0.34) * 1.15 * 0.34;
          const trailYaw = Math.atan2(trailSlopeX, 1);

          leadTraveler.root.position.set(lx, terrainHeightAt(lx, lz) + 0.045, lz);
          leadTraveler.root.rotation.y = trailYaw;
          leadTraveler.setHeldProvision(false, true);
          leadTraveler.setPoseWalk(time * 3.85, Math.sin((time - 266.0) * 1.25));

          // Two companions watch anxiously from rocky cave mouth behind
          companionA.root.position.set(-0.82, terrainHeightAt(-0.82, 0.12) + 0.045, 0.12);
          companionA.root.rotation.y = 0.14;
          companionA.setPoseLookout(t);

          companionB.root.position.set(0.74, terrainHeightAt(0.74, 0.05) + 0.045, 0.05);
          companionB.root.rotation.y = -0.16;
          companionB.setPoseLookout(t + 0.7);

          caveBounceLight.intensity = 0.78;
          beamMat.opacity = 0.18;
          starMat.opacity = 0.0;
        } else if (time < 363.0) {
          // --- CHAPTER 12 (329.5 - 363.0s): RESURRECTION PROMISE & MOSQUE OVER CAVE ---
          leadTraveler.root.position.set(0.0, terrainHeightAt(0.0, 0.75) + 0.045, 0.75);
          leadTraveler.root.rotation.y = 0.05;
          leadTraveler.setPoseLookout(t);

          companionA.root.position.set(-0.92, terrainHeightAt(-0.92, 0.45) + 0.045, 0.45);
          companionA.root.rotation.y = 0.18;
          companionA.setPoseLookout(t + 0.5);

          companionB.root.position.set(0.92, terrainHeightAt(0.92, 0.45) + 0.045, 0.45);
          companionB.root.rotation.y = -0.18;
          companionB.setPoseLookout(t + 1.0);

          if (time >= 347.0) {
            // Peaceful passing & Memorial Mosque Pavilion atop the cave sanctuary
            const mosqBlend = THREE.MathUtils.smoothstep(time, 347.0, 351.0);
            memorialMosque.visible = true;
            memorialMosque.position.y = THREE.MathUtils.lerp(3.8, 4.45, mosqBlend);
            leadTraveler.root.visible = false;
            companionA.root.visible = false;
            companionB.root.visible = false;
            beamMat.opacity = 0.2;
            sunBeam.position.set(0.0, 8.2, 0.5);
            sunBeam.rotation.set(0, 0, 0.1);
            caveBounceLight.intensity = 0.55;
            starMat.opacity = 0.78;
          } else {
            beamMat.opacity = 0.24;
            sunBeam.position.set(1.4, 7.8, 1.5);
            caveBounceLight.intensity = 0.75;
            starMat.opacity = 0.0;
          }
        } else if (time < 384.5) {
          // --- CHAPTER 13A (363.0 - 384.5s): 3+1, 5+1, 7+1 SILHOUETTE FORMATIONS ---
          starMat.opacity = 0.85;
          caveBounceLight.intensity = 0.65;
          beamMat.opacity = 0.14;
          sunBeam.position.set(0, 8.0, 1.6);
          sunBeam.rotation.set(0, 0, 0.05);

          const countMode = time < 368.9 ? 3 : time < 375.0 ? 5 : 7;
          const placeOnRidge = (rig: TravelerCharacterRig, x: number, z: number, yaw: number, phase: number) => {
            rig.root.visible = true;
            rig.root.position.set(x, terrainHeightAt(x, z) + 0.045, z);
            rig.root.rotation.y = yaw;
            rig.setPoseLookout(t + phase);
          };

          // Center 3
          placeOnRidge(leadTraveler, 0.0, 1.55, 0.0, 0);
          placeOnRidge(companionA, -0.95, 1.35, 0.12, 0.4);
          placeOnRidge(companionB, 0.95, 1.35, -0.12, 0.8);
          if (countMode >= 5) {
            placeOnRidge(companionC, -1.85, 1.05, 0.2, 1.2);
            placeOnRidge(companionD, 1.85, 1.05, -0.2, 1.6);
          }
          if (countMode >= 7) {
            placeOnRidge(companionE, -2.7, 0.7, 0.28, 2.0);
            placeOnRidge(companionF, 2.7, 0.7, -0.28, 2.4);
          }
          dogGroup.position.set(0.0, terrainHeightAt(0.0, 2.55), 2.55);
          dogGroup.rotation.y = 0.05;
          dogHeadPivot.rotation.set(-0.1, 0, 0);
        } else {
          // --- CHAPTER 13C (404.0 - 423.0s): 300 SOLAR & 309 LUNAR YEARS CELESTIAL ALIGNMENT ---
          leadTraveler.root.visible = false;
          companionA.root.visible = false;
          companionB.root.visible = false;
          dogGroup.visible = false;
          beamMat.opacity = 0.18;
          sunBeam.position.set(0.8, 8.2, 2.4);
          starMat.opacity = 0.55;
        }
      }

      // -------------------------------------------------------------------
      // QURAN REHAL & SILVER COIN STAGE (12-27.5s, 260-266s, 384.5-404s, 446.5-492s)
      // -------------------------------------------------------------------
      else if (inRehalCoin) {
        leadTraveler.root.visible = false;
        companionA.root.visible = false;
        companionB.root.visible = false;

        const showCoin =
          (time >= 17.05 && time < 27.5) || (time >= 260.0 && time < 266.0);
        rehalGroup.visible = !showCoin;
        coinGroup.visible = showCoin;

        if (!showCoin) {
          rehalGroup.rotation.y = Math.sin(t * 0.42) * 0.11;
          sacredBeamMat.opacity = 0.22 + Math.sin(t * 1.4) * 0.04;
          starMat.opacity = time >= 384.5 && time < 404.0 ? 0.35 : 0.0;
        } else {
          const ct = time >= 260.0 ? time - 260.0 : time - 17.05;
          silverCoinMesh.position.y = 0.05 + Math.sin(ct * 1.6) * 0.035;
          silverCoinMesh.rotation.y = ct * 0.72;
          silverCoinMesh.rotation.x = Math.sin(ct * 0.9) * 0.12;
          starMat.opacity = 0.5;
        }
      }

      // -------------------------------------------------------------------
      // DARK CITY PLAZA & ROYAL COURT TRIAL (27.5-47.3s & 91.7-133.8s)
      // -------------------------------------------------------------------
      else if (inCityPlaza) {
        const flicker = 0.88 + Math.sin(t * 7.5) * 0.12;
        plazaTorchLightA.intensity = 5.4 * flicker;
        plazaTorchLightB.intensity = 5.2 * (0.9 + Math.cos(t * 6.3) * 0.1);
        flameMat.emissiveIntensity = 1.9 * flicker;
        brazierFlames.forEach((f, idx) => {
          f.scale.setScalar(0.92 + Math.sin(t * 8.0 + idx) * 0.12);
        });

        const inTrial = time >= 91.7;
        const kingGest = inTrial
          ? time >= 123.5
            ? THREE.MathUtils.smoothstep(time, 123.5, 127.0)
            : 0.3 + Math.sin(t * 1.8) * 0.2
          : time >= 36.8
            ? THREE.MathUtils.smoothstep(time, 37.5, 40.5) *
              (0.65 + Math.sin(t * 2.2) * 0.25)
            : 0.15;

        tyrantKing.setPoseStandGuard(t, kingGest);
        guardA.setPoseStandGuard(t + 0.7, 0);
        guardB.setPoseStandGuard(t + 1.4, 0);

        if (inTrial) {
          // 91.7 - 133.8s: All 3 youths brought before Tyrant King, standing firm without bowing
          const walkIn = THREE.MathUtils.smoothstep(time, 95.0, 100.5);
          const lz = THREE.MathUtils.lerp(4.6, 1.35, walkIn);
          leadTraveler.root.visible = true;
          companionA.root.visible = true;
          companionB.root.visible = true;

          leadTraveler.root.position.set(-1.35, 0, lz);
          leadTraveler.root.rotation.y = Math.PI * 0.85;
          companionA.root.position.set(-2.15, 0, lz + 0.25);
          companionA.root.rotation.y = Math.PI * 0.83;
          companionB.root.position.set(-0.55, 0, lz + 0.28);
          companionB.root.rotation.y = Math.PI * 0.88;

          if (walkIn < 0.98) {
            leadTraveler.setPoseWalk(time * 4.2);
            companionA.setPoseWalk(time * 4.1 + 1.0);
            companionB.setPoseWalk(time * 4.3 + 2.0);
          } else {
            leadTraveler.setPoseLookout(t);
            companionA.setPoseLookout(t + 0.5);
            companionB.setPoseLookout(t + 1.0);
          }
        } else {
          // 27.5 - 47.3s: Festival plaza intro & 2 defiant youths at 36.8s
          const showDefiantYouths = time >= 36.8;
          leadTraveler.root.visible = showDefiantYouths;
          companionA.root.visible = showDefiantYouths;
          companionB.root.visible = false;
          if (showDefiantYouths) {
            leadTraveler.root.position.set(-1.75, 0, 1.35);
            leadTraveler.root.rotation.y = Math.PI * 0.85;
            leadTraveler.setPoseLookout(t);

            companionA.root.position.set(-2.45, 0, 1.55);
            companionA.root.rotation.y = Math.PI * 0.82;
            companionA.setPoseLookout(t + 0.5);
          }
        }
        starMat.opacity = 0.75;
      }

      // -------------------------------------------------------------------
      // SUNLIT MARKETPLACE STAGE (286.8 - 329.5s)
      // -------------------------------------------------------------------
      else if (inMarketCity) {
        companionA.root.visible = false;
        companionB.root.visible = false;
        marketStage.update(time, intensity, leadTraveler);
        starMat.opacity = 0.0;
      }

      // -------------------------------------------------------------------
      // SHADE TREE HILLSIDE SANCTUARY (47.3-91.7s, 423-446.5s, 492-527s)
      // -------------------------------------------------------------------
      else {
        leadTraveler.root.visible = true;
        companionA.root.visible = true;
        companionB.root.visible = true;

        canopyCrown.rotation.z = Math.sin(t * 1.1) * 0.02;
        canopyCrown.rotation.x = Math.cos(t * 0.9) * 0.015;
        distantFestivalGlow.intensity = 3.2 + Math.sin(t * 6.0) * 0.4;
        starMat.opacity = 0.65;

        const seatA = seatConfigs[0];
        const seatL = seatConfigs[1];
        const seatB = seatConfigs[2];
        // Standing spots strictly in front of each boulder (0.48m ahead of boulder center > 0.38m rock base)
        const standSpot = (s: { x: number; z: number; yaw: number }): [number, number] => [
          s.x + Math.sin(s.yaw) * 0.26,
          s.z + Math.cos(s.yaw) * 0.26,
        ];
        const standA = standSpot(seatA);
        const standL = standSpot(seatL);
        const standB = standSpot(seatB);

        if (time < 55.2) {
          // 47.3 - 55.2s (includes 0:54 / 54s): Smooth curved walk wide around tree trunk & stone seats to front standing spots
          const p = THREE.MathUtils.smoothstep(time, 47.3, 55.2);
          const [lx, lz, lyaw] = evalCubicArc(p, [-0.35, -7.2], [-1.9, -1.0], [-3.65, 3.35], standL);
          const [ax, az, ayaw] = evalArc(p, [-1.4, -7.6], [-3.1, 2.25], standA);
          const [bx, bz, byaw] = evalArc(p, [1.1, -7.4], [3.1, 2.2], standB);

          leadTraveler.root.position.set(lx, hillHeightAt(lx, lz) + 0.055, lz);
          leadTraveler.root.rotation.y = lyaw;
          leadTraveler.setPoseWalk(time * 4.3);

          companionA.root.position.set(ax, hillHeightAt(ax, az) + 0.055, az);
          companionA.root.rotation.y = ayaw;
          companionA.setPoseWalk(time * 4.1 + 1.1);

          companionB.root.position.set(bx, hillHeightAt(bx, bz) + 0.055, bz);
          companionB.root.rotation.y = byaw;
          companionB.setPoseWalk(time * 4.0 + 2.2);
        } else if (time < 91.7) {
          // 55.2 - 91.7s: Turn forward & ease cleanly back onto each stone ledge before conversing
          const sitBlend = THREE.MathUtils.smoothstep(time, 55.35, 57.4);
          const turnBlend = THREE.MathUtils.smoothstep(time, 55.2, 56.1);

          const [, , lyaw0] = evalCubicArc(1, [-0.35, -7.2], [-1.9, -1.0], [-3.65, 3.35], standL);
          const [, , ayaw0] = evalArc(1, [-1.4, -7.6], [-3.1, 2.25], standA);
          const [, , byaw0] = evalArc(1, [1.1, -7.4], [3.1, 2.2], standB);

          const lx = THREE.MathUtils.lerp(standL[0], seatL.x, sitBlend);
          const lz = THREE.MathUtils.lerp(standL[1], seatL.z, sitBlend);
          leadTraveler.root.position.set(lx, hillHeightAt(lx, lz) + THREE.MathUtils.lerp(0.055, 0.02, sitBlend), lz);
          leadTraveler.root.rotation.y = lerpAngle(lyaw0, seatL.yaw, turnBlend);

          const ax = THREE.MathUtils.lerp(standA[0], seatA.x, sitBlend);
          const az = THREE.MathUtils.lerp(standA[1], seatA.z, sitBlend);
          companionA.root.position.set(ax, hillHeightAt(ax, az) + THREE.MathUtils.lerp(0.055, 0.02, sitBlend), az);
          companionA.root.rotation.y = lerpAngle(ayaw0, seatA.yaw, turnBlend);

          const bx = THREE.MathUtils.lerp(standB[0], seatB.x, sitBlend);
          const bz = THREE.MathUtils.lerp(standB[1], seatB.z, sitBlend);
          companionB.root.position.set(bx, hillHeightAt(bx, bz) + THREE.MathUtils.lerp(0.055, 0.02, sitBlend), bz);
          companionB.root.rotation.y = lerpAngle(byaw0, seatB.yaw, turnBlend);

          const glance = Math.sin((time - 57.4) * 0.85) * 0.22 * sitBlend;
          const talkLift =
            time >= 62.0 && time < 76.0
              ? Math.max(0, Math.sin((time - 62.0) * 1.4)) * 0.85
              : 0;
          const compTalk =
            time >= 66.8 && time < 74.5
              ? Math.max(0, Math.sin((time - 66.8) * 1.2)) * 0.6
              : 0;

          leadTraveler.setPoseSit(sitBlend, t, glance, talkLift);
          companionA.setPoseSit(sitBlend, t + 0.4, -0.18 * sitBlend - glance * 0.5, compTalk);
          companionB.setPoseSit(sitBlend, t + 0.9, 0.18 * sitBlend + glance * 0.5, 0);

          if (time >= 74.5) {
            const hidayahGlow = THREE.MathUtils.smoothstep(time, 74.5, 79.0);
            sacredTreeBeam.visible = true;
            treeBeamMat.opacity = hidayahGlow * (0.2 + Math.sin(t * 1.4) * 0.03);
          }
        } else if (time < 446.5) {
          // 423.0 - 446.5s (includes 7:07 / 427s): Lesson 1 & Lesson 2 — Youths stand cleanly on open grass ahead of stone seats
          leadTraveler.root.position.set(0.0, hillHeightAt(0.0, 2.85) + 0.045, 2.85);
          leadTraveler.root.rotation.y = 0.05;
          leadTraveler.setPoseLookout(t);

          companionA.root.position.set(-1.62, hillHeightAt(-1.62, 2.35) + 0.045, 2.35);
          companionA.root.rotation.y = 0.22;
          companionA.setPoseLookout(t + 0.4);

          companionB.root.position.set(1.62, hillHeightAt(1.62, 2.35) + 0.045, 2.35);
          companionB.root.rotation.y = -0.22;
          companionB.setPoseLookout(t + 0.8);

          if (time >= 433.0) {
            const shadeMercy = THREE.MathUtils.smoothstep(time, 433.0, 437.5);
            sacredTreeBeam.visible = true;
            treeBeamMat.opacity = shadeMercy * 0.24;
            starMat.opacity = 0.25;
          }
        } else {
          // 492.0 - 527.0s: Outro reflection — seated calmly under dawn olive tree
          leadTraveler.root.position.set(seatL.x, hillHeightAt(seatL.x, seatL.z) + 0.02, seatL.z);
          leadTraveler.root.rotation.y = seatL.yaw;
          leadTraveler.setPoseSit(1, t, Math.sin(t * 0.6) * 0.14, 0);

          companionA.root.position.set(seatA.x, hillHeightAt(seatA.x, seatA.z) + 0.02, seatA.z);
          companionA.root.rotation.y = seatA.yaw;
          companionA.setPoseSit(1, t + 0.4, -0.18, 0);

          companionB.root.position.set(seatB.x, hillHeightAt(seatB.x, seatB.z) + 0.02, seatB.z);
          companionB.root.rotation.y = seatB.yaw;
          companionB.setPoseSit(1, t + 0.8, 0.18, 0);

          const dawnLight = THREE.MathUtils.smoothstep(time, 512.0, 524.0);
          sacredTreeBeam.visible = dawnLight > 0.02;
          treeBeamMat.opacity = dawnLight * 0.22;
          starMat.opacity = 0.7 * (1 - dawnLight * 0.75);
        }
      }

      // Gentle Starfield & Floating Dust Motes across all stages
      const tlFactor =
        (time < 12.0 && THREE.MathUtils.smoothstep(time, 7.2, 8.4)) ||
        (time >= 220.5 && time < 231.5 ? 1 : 0);
      stars.rotation.y =
        t * 0.015 +
        (typeof tlFactor === 'number' ? tlFactor : 0) * Math.max(0, time - 7.4) * 0.04;

      for (let i = 0; i < moteCount; i++) {
        const seed = i * 1.73;
        const radius = 1.1 + (i % 5) * 0.85;
        const angle = t * (0.24 + (i % 3) * 0.08) + seed;
        const y = 0.35 + ((i * 0.41) % 3.4) + Math.sin(t * 1.4 + seed) * 0.18;
        _dummy.position.set(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius * 0.85,
        );
        _dummy.rotation.set(0, -angle, 0);
        _dummy.scale.setScalar(0.55 + Math.sin(t * 2 + seed) * 0.28);
        _dummy.updateMatrix();
        motes.setMatrixAt(i, _dummy.matrix);
      }
      motes.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      marketStage.dispose();
      leadTraveler.dispose();
      companionA.dispose();
      companionB.dispose();
      companionC.dispose();
      companionD.dispose();
      companionE.dispose();
      companionF.dispose();
      intruderTraveler.dispose();
      tyrantKing.dispose();
      guardA.dispose();
      guardB.dispose();
      crowdGeos.dispose();
      builtTrees.forEach((t) => t.dispose());
      botanicalAssets.dispose();
      geometries.forEach((g) => g.dispose());
      localMaterials.forEach((m) => m.dispose());
    },
  };
}

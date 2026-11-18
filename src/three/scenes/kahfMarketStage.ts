import * as THREE from 'three';
import { ProceduralTextureSet } from '../proceduralTextures';
import {
  createCrowdCharacterGeometries,
  createTravelerCharacter,
  TravelerCharacterRig,
} from '../characters/travelerCharacter';
import {
  BotanicalTreeAssetSet,
  buildDatePalmTree,
  BuiltBotanicalTree,
} from '../trees/botanicalTrees';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export interface MarketStageController {
  group: THREE.Group;
  update: (
    time: number,
    intensity: number,
    leadTraveler: TravelerCharacterRig,
  ) => void;
  dispose: () => void;
}

export function createKahfMarketStage(params: {
  textures: ProceduralTextureSet;
  sandstoneMat: THREE.Material;
  cliffStoneMat: THREE.Material;
  botanicalAssets: BotanicalTreeAssetSet;
  brassMat: THREE.Material;
  drapeMat: THREE.Material;
  silverCoinMat: THREE.Material;
}): MarketStageController {
  const {
    textures,
    sandstoneMat,
    cliffStoneMat,
    botanicalAssets,
    brassMat,
    drapeMat,
    silverCoinMat,
  } = params;

  const group = new THREE.Group();
  group.visible = false;

  const geometries: THREE.BufferGeometry[] = [];
  const localMaterials: THREE.Material[] = [];
  const builtTrees: BuiltBotanicalTree[] = [];

  // Sunlit Limestone City Floor & Central Walkway
  const floorGeo = new THREE.PlaneGeometry(64, 64);
  floorGeo.rotateX(-Math.PI / 2);
  const walkwayGeo = new THREE.BoxGeometry(5.2, 0.06, 22);
  geometries.push(floorGeo, walkwayGeo);

  const cityFloorMat = new THREE.MeshStandardMaterial({
    map: textures.sandAlbedo,
    bumpMap: textures.sandBump,
    roughnessMap: textures.sandRoughness,
    bumpScale: 0.08,
    color: 0xc2ab8e,
    roughness: 0.92,
    metalness: 0.02,
  });
  const walkwayMat = new THREE.MeshStandardMaterial({
    map: textures.cobbleAlbedo,
    bumpMap: textures.cobbleBump,
    bumpScale: 0.095,
    color: 0xbda88e,
    roughness: 0.86,
    metalness: 0.03,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    map: textures.woodAlbedo,
    bumpMap: textures.woodBump,
    bumpScale: 0.055,
    color: 0x9b7454,
    roughness: 0.84,
    metalness: 0.03,
  });
  const tealBannerMat = new THREE.MeshStandardMaterial({
    map: textures.fabricAlbedo,
    bumpMap: textures.fabricBump,
    bumpScale: 0.038,
    color: 0x1e5c4c,
    roughness: 0.85,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const awningMat = new THREE.MeshStandardMaterial({
    map: textures.fabricAlbedo,
    bumpMap: textures.fabricBump,
    bumpScale: 0.038,
    color: 0xc9a97a,
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const clayMat = new THREE.MeshStandardMaterial({
    map: textures.terracottaAlbedo,
    bumpMap: textures.stoneBump,
    bumpScale: 0.028,
    color: 0xb8704e,
    roughness: 0.78,
    metalness: 0.04,
  });
  const breadMat = new THREE.MeshStandardMaterial({
    color: 0xc7924e,
    roughness: 0.9,
    metalness: 0.01,
  });
  localMaterials.push(
    cityFloorMat,
    walkwayMat,
    timberMat,
    tealBannerMat,
    awningMat,
    clayMat,
    breadMat,
  );

  const floorMesh = new THREE.Mesh(floorGeo, cityFloorMat);
  floorMesh.receiveShadow = true;
  const walkwayMesh = new THREE.Mesh(walkwayGeo, walkwayMat);
  walkwayMesh.position.set(0, 0.03, -2.5);
  walkwayMesh.receiveShadow = true;
  group.add(floorMesh, walkwayMesh);

  // Raised Carved Stone Curbs along the Market Boulevard
  const curbGeo = new THREE.BoxGeometry(0.26, 0.11, 22);
  geometries.push(curbGeo);
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(curbGeo, cliffStoneMat);
    curb.position.set(side * 2.7, 0.055, -2.5);
    curb.receiveShadow = true;
    curb.castShadow = true;
    group.add(curb);
  }

  // Sunlit Sandstone City Colonnade, Overhead Cornice Lintels & Detailed Houses (Flanking Left & Right)
  const colGeo = new THREE.CylinderGeometry(0.26, 0.32, 4.4, 14);
  colGeo.translate(0, 2.2, 0);
  const colBaseGeo = new THREE.BoxGeometry(0.84, 0.24, 0.84);
  const colCapGeo = new THREE.BoxGeometry(0.9, 0.24, 0.9);
  const sideLintelGeo = new THREE.BoxGeometry(0.75, 0.42, 11.4);
  const houseGeo = new THREE.BoxGeometry(3.2, 1.0, 2.8);
  houseGeo.translate(0, 0.5, 0);
  const windowRecessGeo = new THREE.BoxGeometry(0.14, 0.72, 0.48);
  const parapetGeo = new THREE.BoxGeometry(3.32, 0.28, 2.92);
  geometries.push(colGeo, colBaseGeo, colCapGeo, sideLintelGeo, houseGeo, windowRecessGeo, parapetGeo);

  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const cx = side * 4.4;
      const cz = 1.5 - i * 3.4;
      const col = new THREE.Mesh(colGeo, sandstoneMat);
      col.position.set(cx, 0, cz);
      col.castShadow = true;
      col.receiveShadow = true;
      const cBase = new THREE.Mesh(colBaseGeo, cliffStoneMat);
      cBase.position.set(cx, 0.12, cz);
      const cCap = new THREE.Mesh(colCapGeo, cliffStoneMat);
      cCap.position.set(cx, 4.48, cz);
      group.add(col, cBase, cCap);
    }
    const colonnadeLintel = new THREE.Mesh(sideLintelGeo, sandstoneMat);
    colonnadeLintel.position.set(side * 4.4, 4.8, -3.6);
    colonnadeLintel.castShadow = true;
    colonnadeLintel.receiveShadow = true;
    group.add(colonnadeLintel);

    for (let h = 0; h < 5; h++) {
      const hx = side * (7.2 + (h % 2) * 2.4);
      const hz = 3.0 - h * 3.2;
      const hh = 3.2 + (h % 3) * 1.1;
      const house = new THREE.Mesh(houseGeo, sandstoneMat);
      house.position.set(hx, 0, hz);
      house.scale.set(1.0, hh, 1.15);
      house.castShadow = true;
      house.receiveShadow = true;

      const parapet = new THREE.Mesh(parapetGeo, cliffStoneMat);
      parapet.position.set(hx, hh + 0.14, hz);
      parapet.scale.set(1.0, 1.0, 1.15);
      group.add(house, parapet);

      // Recessed wooden mashrabiya upper windows facing street
      for (const wz of [-0.65, 0.65]) {
        const win = new THREE.Mesh(windowRecessGeo, timberMat);
        win.position.set(hx - side * 1.62, hh * 0.68, hz + wz);
        group.add(win);
      }
    }
  }

  // Welcoming Sunlit Believer City Mosque Dome & Minaret in Background (z = -12.5)
  const masjidGroup = new THREE.Group();
  masjidGroup.position.set(0, 0, -12.5);
  const masjidBodyGeo = new THREE.BoxGeometry(8.8, 3.8, 4.2);
  const masjidDrumGeo = new THREE.CylinderGeometry(1.7, 1.82, 0.7, 16);
  const masjidDomeGeo = new THREE.SphereGeometry(
    1.68,
    24,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.56,
  );
  const minaretGeo = new THREE.CylinderGeometry(0.32, 0.44, 7.6, 12);
  const minaretCapGeo = new THREE.ConeGeometry(0.42, 0.9, 12);
  const crescentFinialGeo = new THREE.TorusGeometry(0.18, 0.032, 8, 16, Math.PI * 1.45);
  geometries.push(
    masjidBodyGeo,
    masjidDrumGeo,
    masjidDomeGeo,
    minaretGeo,
    minaretCapGeo,
    crescentFinialGeo,
  );

  const masjidBody = new THREE.Mesh(masjidBodyGeo, sandstoneMat);
  masjidBody.position.y = 1.9;
  masjidBody.castShadow = true;
  masjidBody.receiveShadow = true;
  const masjidDrum = new THREE.Mesh(masjidDrumGeo, sandstoneMat);
  masjidDrum.position.y = 4.15;
  const masjidDome = new THREE.Mesh(masjidDomeGeo, sandstoneMat);
  masjidDome.position.y = 4.45;
  const domeFinial = new THREE.Mesh(crescentFinialGeo, brassMat);
  domeFinial.position.y = 6.32;
  domeFinial.rotation.z = -Math.PI * 0.22;

  const minaretMesh = new THREE.Mesh(minaretGeo, sandstoneMat);
  minaretMesh.position.set(3.85, 3.8, 1.2);
  minaretMesh.castShadow = true;
  const minaretCap = new THREE.Mesh(minaretCapGeo, brassMat);
  minaretCap.position.set(3.85, 8.05, 1.2);
  const minFinial = new THREE.Mesh(crescentFinialGeo, brassMat);
  minFinial.position.set(3.85, 8.68, 1.2);
  minFinial.scale.setScalar(0.75);
  minFinial.rotation.z = -Math.PI * 0.22;

  masjidGroup.add(
    masjidBody,
    masjidDrum,
    masjidDome,
    domeFinial,
    minaretMesh,
    minaretCap,
    minFinial,
  );
  group.add(masjidGroup);

  // Market Food / Bread Stall (placed cleanly at x = 2.05, z = 0.6 facing left toward walkway)
  const stallGroup = new THREE.Group();
  stallGroup.position.set(2.15, 0, 0.6);
  stallGroup.rotation.y = -Math.PI * 0.5;

  const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.35, 8);
  postGeo.translate(0, 1.175, 0);
  const counterGeo = new THREE.BoxGeometry(2.3, 0.92, 0.85);
  counterGeo.translate(0, 0.46, 0);
  const awningGeo = new THREE.BoxGeometry(2.55, 0.06, 1.45);
  const bowlGeo = new THREE.CylinderGeometry(0.22, 0.14, 0.14, 12);
  const loafGeo = new THREE.SphereGeometry(0.11, 10, 8);
  loafGeo.scale(1.15, 0.55, 0.95);
  const jarGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.11, 0.02),
      new THREE.Vector2(0.16, 0.18),
      new THREE.Vector2(0.08, 0.34),
      new THREE.Vector2(0.11, 0.4),
    ],
    12,
  );
  geometries.push(postGeo, counterGeo, awningGeo, bowlGeo, loafGeo, jarGeo);

  for (const px of [-1.05, 1.05]) {
    for (const pz of [-0.36, 0.36]) {
      const post = new THREE.Mesh(postGeo, timberMat);
      post.position.set(px, 0, pz);
      post.castShadow = true;
      stallGroup.add(post);
    }
  }

  const counter = new THREE.Mesh(counterGeo, sandstoneMat);
  counter.castShadow = true;
  counter.receiveShadow = true;
  const counterCloth = new THREE.Mesh(
    new THREE.BoxGeometry(2.36, 0.05, 0.9),
    tealBannerMat,
  );
  geometries.push(counterCloth.geometry);
  counterCloth.position.set(0, 0.93, 0);

  const awning = new THREE.Mesh(awningGeo, awningMat);
  awning.position.set(0, 2.38, 0.14);
  awning.rotation.x = 0.24;
  awning.castShadow = true;

  // Bread baskets & olive-oil amphorae on counter
  for (const bx of [-0.62, 0.15]) {
    const basket = new THREE.Mesh(bowlGeo, timberMat);
    basket.position.set(bx, 1.02, 0.05);
    stallGroup.add(basket);
    for (let l = 0; l < 3; l++) {
      const loaf = new THREE.Mesh(loafGeo, breadMat);
      loaf.position.set(
        bx + (l - 1) * 0.07,
        1.09 + (l % 2) * 0.03,
        0.04 + (l === 1 ? 0.05 : -0.04),
      );
      stallGroup.add(loaf);
    }
  }
  const jarA = new THREE.Mesh(jarGeo, clayMat);
  jarA.position.set(0.75, 0.95, -0.1);
  const jarB = new THREE.Mesh(jarGeo, clayMat);
  jarB.position.set(-0.92, 0.02, 0.56);
  jarB.scale.setScalar(1.35);

  stallGroup.add(counter, counterCloth, awning, jarA, jarB);
  group.add(stallGroup);

  // Additional Authentic Bazaar Stalls (spice bowls, terracotta pottery & draped cloth awnings)
  const saffronMat = new THREE.MeshStandardMaterial({ color: 0xc97b28, roughness: 0.85, metalness: 0.02 });
  const terracottaAwningMat = new THREE.MeshStandardMaterial({
    map: textures.fabricAlbedo,
    bumpMap: textures.fabricBump,
    bumpScale: 0.038,
    color: 0x8f3f2c,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  localMaterials.push(saffronMat, terracottaAwningMat);

  const spicePileGeo = new THREE.ConeGeometry(0.18, 0.14, 10);
  geometries.push(spicePileGeo);

  const extraStalls: { x: number; z: number; yaw: number; clothMat: THREE.Material }[] = [
    { x: -3.25, z: 2.1, yaw: Math.PI * 0.5, clothMat: drapeMat },
    { x: -3.25, z: -2.4, yaw: Math.PI * 0.5, clothMat: tealBannerMat },
    { x: 3.15, z: -3.1, yaw: -Math.PI * 0.5, clothMat: terracottaAwningMat },
  ];
  extraStalls.forEach(({ x, z, yaw, clothMat }, sIdx) => {
    const sGroup = new THREE.Group();
    sGroup.position.set(x, 0, z);
    sGroup.rotation.y = yaw;
    for (const px of [-0.95, 0.95]) {
      for (const pz of [-0.32, 0.32]) {
        const post = new THREE.Mesh(postGeo, timberMat);
        post.position.set(px, 0, pz);
        post.castShadow = true;
        sGroup.add(post);
      }
    }
    const scounter = new THREE.Mesh(counterGeo, sandstoneMat);
    scounter.scale.set(0.9, 1, 0.85);
    scounter.castShadow = true;
    scounter.receiveShadow = true;
    const sawn = new THREE.Mesh(awningGeo, clothMat);
    sawn.position.set(0, 2.36, 0.12);
    sawn.scale.set(0.9, 1, 0.92);
    sawn.rotation.x = 0.24;
    sawn.castShadow = true;

    const pot1 = new THREE.Mesh(jarGeo, clayMat);
    pot1.position.set(-0.55, 0.92, 0);
    const pot2 = new THREE.Mesh(jarGeo, brassMat);
    pot2.position.set(0.58, 0.92, -0.06);
    pot2.scale.setScalar(0.85);
    const spiceBowl = new THREE.Mesh(bowlGeo, timberMat);
    spiceBowl.position.set(0, 0.98, 0.08);
    const spiceMound = new THREE.Mesh(
      spicePileGeo,
      sIdx === 0 ? saffronMat : sIdx === 1 ? breadMat : clayMat,
    );
    spiceMound.position.set(0, 1.07, 0.08);

    sGroup.add(scounter, sawn, pot1, pot2, spiceBowl, spiceMound);
    group.add(sGroup);
  });

  // Gleaming Ancient Silver Coin presented on the Market Counter (visible 294 - 308s)
  const marketCoinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.02, 28);
  marketCoinGeo.rotateX(Math.PI / 2);
  geometries.push(marketCoinGeo);
  const marketCoin = new THREE.Mesh(marketCoinGeo, silverCoinMat);
  marketCoin.position.set(1.62, 1.15, 0.65);
  marketCoin.visible = false;
  group.add(marketCoin);

  // Elevated Ruler Dais in Background Courtyard (z = -5.5)
  const rulerDaisGeo = new THREE.CylinderGeometry(1.75, 1.95, 0.34, 16);
  geometries.push(rulerDaisGeo);
  const rulerDais = new THREE.Mesh(rulerDaisGeo, sandstoneMat);
  rulerDais.position.set(0, 0.17, -5.8);
  rulerDais.receiveShadow = true;
  const rulerRug = new THREE.Mesh(
    new THREE.CylinderGeometry(1.42, 1.46, 0.03, 18),
    drapeMat,
  );
  geometries.push(rulerRug.geometry);
  rulerRug.position.set(0, 0.355, -5.8);
  group.add(rulerDais, rulerRug);

  // Flanking Sunlit Botanical Date Palms along the Boulevard
  const marketPalmCrowns: THREE.Group[] = [];
  [
    [-5.4, 2.2, 4.9, 0.14],
    [5.4, -2.5, 5.2, -0.15],
    [-5.6, -7.8, 5.4, 0.12],
    [5.6, -8.2, 5.0, -0.12],
  ].forEach(([px, pz, ph, lean], idx) => {
    const palm = buildDatePalmTree({
      assets: botanicalAssets,
      height: ph,
      lean,
      seed: 42 + idx * 11,
    });
    palm.group.position.set(px, 0, pz);
    marketPalmCrowns.push(palm.crownPivot);
    builtTrees.push(palm);
    group.add(palm.group);
  });

  // Standing Sunlit Believer Citizens (sculpted robes, sleeves, turbans & faceless veils)
  const crowdGeos = createCrowdCharacterGeometries();

  const citizenMat = new THREE.MeshStandardMaterial({
    map: textures.fabricAlbedo,
    bumpMap: textures.fabricBump,
    bumpScale: 0.036,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.02,
  });
  const citizenVeilMat = new THREE.MeshStandardMaterial({
    color: 0x07080b,
    roughness: 0.99,
    metalness: 0.0,
  });
  localMaterials.push(citizenMat, citizenVeilMat);

  const citizenCount = 10;
  const citizenBodies = new THREE.InstancedMesh(crowdGeos.standBodyGeo, citizenMat, citizenCount);
  const citizenHeads = new THREE.InstancedMesh(crowdGeos.standHeadGeo, citizenMat, citizenCount);
  const citizenVeils = new THREE.InstancedMesh(crowdGeos.standVeilGeo, citizenVeilMat, citizenCount);
  citizenBodies.castShadow = true;
  citizenHeads.castShadow = true;

  const citizenSpots: [number, number, number][] = [
    [-2.4, 2.4, 0.55],
    [-2.8, 0.4, 1.2],
    [-2.15, -1.35, 1.85],
    [2.28, -1.65, -1.9],
    [-1.8, -3.5, 2.3],
    [1.8, -3.4, -2.3],
    [-2.9, -4.8, 1.9],
    [2.9, -4.7, -1.9],
    [-2.2, -7.2, 0.6],
    [2.2, -7.2, -0.6],
  ];
  citizenSpots.forEach(([cx, cz, yaw], i) => {
    _color.setHSL(0.09 + (i % 4) * 0.09, 0.22, 0.45 + (i % 3) * 0.12);
    citizenBodies.setColorAt(i, _color);
    _color.setHSL(0.1, 0.14, 0.72 + (i % 2) * 0.1);
    citizenHeads.setColorAt(i, _color);

    _dummy.position.set(cx, 0, cz);
    _dummy.rotation.set(0, yaw, 0);
    _dummy.scale.set(1, 0.96 + (i % 3) * 0.04, 1);
    _dummy.updateMatrix();
    citizenBodies.setMatrixAt(i, _dummy.matrix);
    citizenHeads.setMatrixAt(i, _dummy.matrix);
    citizenVeils.setMatrixAt(i, _dummy.matrix);
  });
  citizenBodies.instanceMatrix.needsUpdate = true;
  citizenHeads.instanceMatrix.needsUpdate = true;
  citizenVeils.instanceMatrix.needsUpdate = true;
  if (citizenBodies.instanceColor) citizenBodies.instanceColor.needsUpdate = true;
  if (citizenHeads.instanceColor) citizenHeads.instanceColor.needsUpdate = true;
  citizenBodies.computeBoundingSphere();
  citizenHeads.computeBoundingSphere();
  citizenVeils.computeBoundingSphere();
  group.add(citizenBodies, citizenHeads, citizenVeils);

  // Market Baker & Righteous Ruler Characters
  const vendorChar: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0x9b8970,
    cloakColor: 0x5c3e2a,
    scarfColor: 0xe6dccb,
    sashColor: 0x265947,
    heightScale: 0.98,
    hasStaff: false,
    fabricMap: textures.fabricAlbedo,
    fabricBumpMap: textures.fabricBump,
    woodMap: textures.woodAlbedo,
    woodBumpMap: textures.woodBump,
    leatherBumpMap: textures.stoneBump,
  });
  vendorChar.root.position.set(2.85, 0, 0.6);
  vendorChar.root.rotation.y = -Math.PI * 0.5;

  const righteousRuler: TravelerCharacterRig = createTravelerCharacter({
    tunicColor: 0xd8cdb8,
    cloakColor: 0x164a3b,
    scarfColor: 0xf1eadc,
    sashColor: 0xc2933b,
    heightScale: 1.05,
    hasStaff: true,
    fabricMap: textures.fabricAlbedo,
    fabricBumpMap: textures.fabricBump,
    woodMap: textures.woodAlbedo,
    woodBumpMap: textures.woodBump,
    leatherBumpMap: textures.stoneBump,
  });
  righteousRuler.root.position.set(0, 0.37, -5.8);
  righteousRuler.root.rotation.y = 0.08;

  group.add(vendorChar.root, righteousRuler.root);

  // Soft Warm Sunlit Plaza Fill Light
  const plazaSunFill = new THREE.PointLight(0xffe9c2, 2.4, 24, 1.2);
  plazaSunFill.position.set(-1.5, 4.8, 2.5);
  group.add(plazaSunFill);

  return {
    group,
    update: (time, intensity, leadTraveler) => {
      const t = time * intensity;
      leadTraveler.root.visible = true;
      marketPalmCrowns.forEach((c, idx) => {
        c.rotation.z = Math.sin(t * 1.1 + idx) * 0.035;
      });

      vendorChar.setPoseStandGuard(t, time >= 296.5 && time < 306.5 ? 0.55 : 0.15);
      righteousRuler.setPoseStandGuard(
        t + 0.5,
        time >= 309.0 ? 0.4 + Math.sin(t * 1.4) * 0.15 : 0.05,
      );

      if (time < 294.2) {
        // 286.8 - 294.2s: Youth walks down sunlit unfamiliar street looking around in wonder
        const p = THREE.MathUtils.smoothstep(time, 286.8, 294.2);
        const lx = THREE.MathUtils.lerp(-0.2, 0.72, p);
        const lz = THREE.MathUtils.lerp(6.4, 0.85, p);
        leadTraveler.root.position.set(lx, 0.06, lz);
        leadTraveler.root.rotation.y = THREE.MathUtils.lerp(Math.PI, Math.PI * 0.68, p);
        leadTraveler.setPoseWalk(time * 4.2);
        marketCoin.visible = false;
        citizenBodies.visible = false;
        citizenHeads.visible = false;
        citizenVeils.visible = false;
      } else if (time < 305.5) {
        // 294.2 - 305.5s: Extends ancient silver coin at food stall; vendor amazed & small crowd gathers
        leadTraveler.root.position.set(1.05, 0.06, 0.62);
        leadTraveler.root.rotation.y = Math.PI * 0.5;
        leadTraveler.setPoseLookout(t);
        const showCoin = time >= 295.0;
        marketCoin.visible = showCoin;
        marketCoin.position.set(
          1.62,
          1.15 + Math.sin(t * 2.2) * 0.025,
          0.65,
        );
        marketCoin.rotation.y = t * 0.9;
        const crowdGather = time >= 301.5;
        citizenBodies.visible = crowdGather;
        citizenHeads.visible = crowdGather;
        citizenVeils.visible = crowdGather;
      } else if (time < 314.8) {
        // 305.5 - 314.8s: Crowd gathers & youth walks peacefully to stand clearly in front of the Righteous Ruler dais
        const p = THREE.MathUtils.smoothstep(time, 305.5, 313.5);
        const lx = THREE.MathUtils.lerp(1.05, -0.42, p);
        const lz = THREE.MathUtils.lerp(0.62, -3.42, p);
        leadTraveler.root.position.set(lx, 0.06, lz);
        leadTraveler.root.rotation.y = Math.PI * 0.92;
        if (p < 0.97) {
          leadTraveler.setPoseWalk(time * 4.2);
        } else {
          leadTraveler.setPoseLookout(t);
        }
        marketCoin.visible = false;
        citizenBodies.visible = true;
        citizenHeads.visible = true;
        citizenVeils.visible = true;
      } else {
        // 314.8 - 329.5s (includes 5:27 / 327s): Peaceful meeting cleanly in front of ruler dais & mosque skyline
        leadTraveler.root.position.set(-0.42, 0.06, -3.42);
        leadTraveler.root.rotation.y = Math.PI * 0.9;
        leadTraveler.setPoseLookout(t);
        marketCoin.visible = false;
        citizenBodies.visible = true;
        citizenHeads.visible = true;
        citizenVeils.visible = true;
      }
    },
    dispose: () => {
      vendorChar.dispose();
      righteousRuler.dispose();
      crowdGeos.dispose();
      builtTrees.forEach((t) => t.dispose());
      geometries.forEach((g) => g.dispose());
      localMaterials.forEach((m) => m.dispose());
    },
  };
}

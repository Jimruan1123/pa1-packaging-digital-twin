import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8e4d8);
scene.fog = new THREE.Fog(0xe8e4d8, 45, 90);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(26, 22, 24);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.getElementById('app').appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 12;
controls.maxDistance = 80;
controls.target.set(0, 2, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
dirLight.position.set(18, 30, 16);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -24;
dirLight.shadow.camera.right = 24;
dirLight.shadow.camera.top = 24;
dirLight.shadow.camera.bottom = -24;
scene.add(dirLight);
const rimLight = new THREE.DirectionalLight(0xe0d8b8, 0.4);
rimLight.position.set(-18, 10, -14);
scene.add(rimLight);

function box(w, h, d, color, opts = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.6, metalness: opts.metal ?? 0.1, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 });
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = opts.receiveShadow ?? true;
  return mesh;
}
function cyl(rt, rb, h, s, color, opts = {}) {
  const g = new THREE.CylinderGeometry(rt, rb, h, s);
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.5, metalness: opts.metal ?? 0.2 });
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
function sph(r, s, color, opts = {}) {
  const g = new THREE.SphereGeometry(r, s, s);
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.3, metalness: opts.metal ?? 0.5, emissive: opts.emissive ?? 0, emissiveIntensity: opts.emissiveIntensity ?? 1 });
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  return mesh;
}
function floorTile(w, d, color) {
  const g = new THREE.PlaneGeometry(w, d);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0 });
  const mesh = new THREE.Mesh(g, m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}
function addLabel(parent, text, y = 2.5) {
  const d = document.createElement('div');
  d.textContent = text;
  d.style.cssText = 'color:#fff;font-size:11px;font-family:Segoe UI,Microsoft YaHei,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.5);padding:3px 8px;background:rgba(40,40,40,0.82);border-radius:3px;white-space:nowrap;pointer-events:none;font-weight:500;';
  const label = new CSS2DObject(d);
  label.position.set(0, y, 0);
  parent.add(label);
  return label;
}

const P = {
  floor: 0xd9d2b8, floorLine: 0xbfb68e, cellFloor: 0xc8c0a0,
  packFloor: 0xccc4a8, qcFloor: 0xb8c9b0, chargerFloor: 0xd4c4a0,
  aisle: 0xc4b88a, redZone: 0xc9a0a0, greenZone: 0xa0c9a0,
  conveyor: 0x555555, conveyorEdge: 0x3a3a3a,
  machine: 0xe8e3cf, machineDark: 0x6a6350, machineAccent: 0xd4b44a,
  amr: 0xff7b2c, amrDark: 0x3a2a1a,
  worker: 0x2b5c9b, qcWorker: 0x6aa84f, packWorker: 0xc47a2a,
  sampleBin: 0xa03030, productBin: 0x6aa84f,
  shelf: 0x8a8260, wall: 0xf2ecd6, glass: 0xaad4ee,
  pallet: 0x8b6f47, carton: 0x3c78a8, andon: 0xf5b300,
};

// ===== 场地尺寸（单一来源）=====
// 厂房外墙、内地坪、网格全部从这两个数推导，改这里四面墙会跟着走。
// 约束：所有功能区（出货区 x 到 -18.5，物料超市 x 到 15.5，绿化 z 到 ±15）
// 必须落在 [-FLOOR_W/2, FLOOR_W/2] x [-FLOOR_D/2, FLOOR_D/2] 之内。
const FLOOR_W = 42;
const FLOOR_D = 34;
const floor = floorTile(FLOOR_W, FLOOR_D, P.floor);
scene.add(floor);

// 1m 地面网格。GridHelper 只能画正方形，这里场地是矩形，所以自己画，
// 否则网格会溢出地面边缘（或需要 scale 把格子压成非正方形）。
function buildFloorGrid(w, d, step, color) {
  const pts = [];
  const hw = w / 2, hd = d / 2;
  for (let x = -hw; x <= hw + 1e-6; x += step) pts.push(x, 0, -hd, x, 0, hd);
  for (let z = -hd; z <= hd + 1e-6; z += step) pts.push(-hw, 0, z, hw, 0, z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color, transparent: true, opacity: 0.45,
  }));
}
const grid = buildFloorGrid(FLOOR_W, FLOOR_D, 1, P.floorLine);
// 必须高于内地坪（0.0105），否则网格会被内地坪整块盖住看不见
grid.position.y = 0.0112;
scene.add(grid);

// ===== 生产区坐标（四叶草布局） =====
// 本地坐标约定：+Z 朝向厂房中心（走道侧），-Z 为机台背墙侧。
// 同一侧径向次序：机台(远) -> 操作位 -> 红/绿缓存货架(近) -> 走道。
// 机台与货架必须在走道同一侧，走道不得穿过二者之间。
const ZONE_DIST = 12.5;
const ZONE_W = 7.2;
const ZONE_D = 6.4;

const DOCK_LOCAL_Z = 2.4;
const DOCK_HALF = 0.75;

const prodZones = [
  { name: '1号机·组装测试',   x: 0,          z: -ZONE_DIST },
  { name: '2号机·点胶工位',   x: ZONE_DIST,  z: 0          },
  { name: '3号机·焊接自动站', x: 0,          z: ZONE_DIST  },
  { name: '4号机·单工位打包', x: -ZONE_DIST, z: 0          },
];

// ===== 中央打包区 =====
const packGroup = new THREE.Group();
scene.add(packGroup);
{
  const packZone = floorTile(8, 8, P.packFloor);
  packGroup.add(packZone);
  const _edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(8, 0.03, 8)),
    new THREE.LineBasicMaterial({ color: 0x8a6c3c, transparent: true, opacity: 0.5 })
  );
  _edge.translateY(0.015);
  packGroup.add(_edge);
}

// ===== 走道（矩形环线 + 十字通道） =====
const AISLE_W = 2.4;
// 环线半径（到走道中线）。约束：走道外沿 AISLE_RADIUS+AISLE_W/2 必须 <= 货架内沿
// (ZONE_DIST - DOCK_LOCAL_Z - DOCK_HALF)，否则走道会压在货架上。
const AISLE_RADIUS = 7.8;
const AISLE_OUTER = AISLE_RADIUS + AISLE_W / 2;   // 9.00
const DOCK_INNER = ZONE_DIST - DOCK_LOCAL_Z - DOCK_HALF; // 9.35

// 画走道地面
function addAisleRect(radius, width) {
  // 4条矩形走道
  // 北
  { const t = floorTile(width, radius*2 + width, P.aisle); t.position.set(-radius-width/2, 0.012, 0); scene.add(t); }
  { const t = floorTile(width, radius*2 + width, P.aisle); t.position.set( radius+width/2, 0.012, 0); scene.add(t); }
  { const t = floorTile(radius*2 + width, width, P.aisle); t.position.set(0, 0.012, -radius-width/2); scene.add(t); }
  { const t = floorTile(radius*2 + width, width, P.aisle); t.position.set(0, 0.012,  radius+width/2); scene.add(t); }
}
addAisleRect(AISLE_RADIUS, AISLE_W);

// 走道虚线
function drawDash(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx*dx + dz*dz);
  const nx = dx / len, nz = dz / len;
  const count = Math.floor(len / 0.9);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const dash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.45),
      new THREE.MeshBasicMaterial({ color: 0x8a7d4a, transparent: true, opacity: 0.5 })
    );
    dash.rotation.x = -Math.PI/2;
    dash.rotation.z = Math.atan2(nx, nz);
    dash.position.set(x1 + dx*t, 0.02, z1 + dz*t);
    scene.add(dash);
  }
}
// 矩形环虚线
drawDash(-AISLE_RADIUS, -AISLE_RADIUS,  AISLE_RADIUS, -AISLE_RADIUS);
drawDash( AISLE_RADIUS, -AISLE_RADIUS,  AISLE_RADIUS,  AISLE_RADIUS);
drawDash( AISLE_RADIUS,  AISLE_RADIUS, -AISLE_RADIUS,  AISLE_RADIUS);
drawDash(-AISLE_RADIUS,  AISLE_RADIUS, -AISLE_RADIUS, -AISLE_RADIUS);
// ===== 工人模型 =====
function buildWorker(color, headColor = 0xfcd9b5) {
  const g = new THREE.Group();
  const body = box(0.3, 0.55, 0.2, color);
  body.position.y = 0.85; body.castShadow = true; g.add(body);
  const head = sph(0.12, 12, headColor);
  head.position.y = 1.25; g.add(head);
  const hat = cyl(0.1, 0.13, 0.05, 16, 0xd4b44a);
  hat.position.y = 1.38; g.add(hat);
  const legL = box(0.1, 0.5, 0.12, 0x1e293b);
  legL.position.set(-0.07, 0.25, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.07; g.add(legR);
  const armL = box(0.08, 0.4, 0.08, color);
  armL.position.set(-0.2, 0.95, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.2; g.add(armR);
  g.userData = { armL, armR, legL, legR };
  return g;
}

// ===== 流转货架（潜伏式 AMR 可顶升驮运） =====
// 结构：4 根立柱 + 2 层台板，底部留出净空供 AMR 潜入。
// 料箱统一挂在 g.userData.binSlot 下，便于整批增删（避免用 children 下标猜位置）。
const SHELF_CLEAR = 0.34;    // 底部净空（AMR 车身高 0.3 可潜入）
const SHELF_DECK_Y = 0.42;   // 下层台板高
const SHELF_TOP_Y = 0.92;    // 上层台板高
function buildMobileShelf(binColor) {
  const g = new THREE.Group();
  for (const sx of [-0.32, 0.32]) {
    for (const sz of [-0.28, 0.28]) {
      const leg = box(0.07, SHELF_TOP_Y, 0.07, P.shelf, { metal: 0.4, rough: 0.6 });
      leg.position.set(sx, SHELF_TOP_Y / 2, sz); g.add(leg);
    }
  }
  const deck = box(0.78, 0.05, 0.66, P.shelf, { metal: 0.3, rough: 0.7 });
  deck.position.y = SHELF_DECK_Y; g.add(deck);
  const topDeck = box(0.78, 0.05, 0.66, P.machineDark, { metal: 0.4, rough: 0.5 });
  topDeck.position.y = SHELF_TOP_Y; g.add(topDeck);
  // 色带标识（区分红/绿流转架）
  const band = box(0.8, 0.06, 0.02, binColor, { emissive: binColor, emissiveIntensity: 0.3 });
  band.position.set(0, SHELF_TOP_Y + 0.06, 0.33); g.add(band);
  const binSlot = new THREE.Group();
  g.add(binSlot);
  g.userData.binSlot = binSlot;
  g.userData.binColor = binColor;
  return g;
}

// 往货架加一个料箱（返回该料箱 mesh）
function addBinToShelf(shelf) {
  const slot = shelf.mesh.userData.binSlot;
  const n = slot.children.length;
  if (n >= 3) return null;
  const b = box(0.28, 0.24, 0.28, shelf.mesh.userData.binColor, { rough: 0.7 });
  b.position.set(-0.24 + n * 0.24, SHELF_TOP_Y + 0.17, 0);
  slot.add(b);
  shelf.binCount = slot.children.length;
  shelf.hasBins = shelf.binCount > 0;
  return b;
}

// 清空货架料箱
function clearShelfBins(shelf) {
  const slot = shelf.mesh.userData.binSlot;
  for (let i = slot.children.length - 1; i >= 0; i--) slot.remove(slot.children[i]);
  shelf.binCount = 0;
  shelf.hasBins = false;
}

// ===== 生产区数组 =====
const prodGroups = [];
const prodWorkers = [];
const sampleDocks = [];   // 红色送样架世界坐标
const productDocks = [];  // 绿色成品架世界坐标
const andonLights = { sample: [], product: [] };
const sampleShelfAtZone = []; // 每个区的红架对象
const productShelfAtZone = []; // 每个区的绿架对象
const mobileShelves = [];
function registerShelf(s) { mobileShelves.push(s); return s; }

// AMR 在走道中线上的停靠点（INPUT/OUTPUT）。世界坐标，随区一起推导。
const zoneStops = [];  // [{ sampleStop, productStop, radialDir }]

function buildProductionZone(cfg) {
  const g = new THREE.Group();
  g.position.set(cfg.x, 0, cfg.z);
  g.rotation.y = Math.atan2(cfg.x, cfg.z) + Math.PI; // 正面朝向外侧走道

  // 区域地板
  const zf = floorTile(ZONE_W, ZONE_D, P.cellFloor);
  zf.position.y = 0.011; g.add(zf);

  // 机台（在远端，-Z方向）
  const machine = box(4, 1.6, 2.2, P.machine, { rough: 0.6 });
  machine.position.set(0, 0.8, -2); g.add(machine);
  const top = box(3.9, 0.1, 2.1, P.machineDark);
  top.position.set(0, 1.65, -2); g.add(top);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x2b5c9b })
  );
  screen.position.set(0, 1.4, -0.85); g.add(screen);

  // 信号灯柱
  const pole = cyl(0.03, 0.03, 0.5, 8, 0x444);
  pole.position.set(-1.6, 2.1, -2.3); g.add(pole);
  const statusLight = sph(0.06, 8, 0x6aa84f, { emissive: 0x6aa84f, emissiveIntensity: 0.8 });
  statusLight.position.set(-1.6, 2.4, -2.3); g.add(statusLight);

  // ---- 缓存区（与机台同侧，贴住靠走道前沿）----
  // 红 = 送样 OUTPUT，绿 = 成品 OUTPUT。两块地面标示 + 边框。
  const redFloor = floorTile(2.0, 1.8, P.redZone);
  redFloor.position.set(-2.3, 0.013, DOCK_LOCAL_Z); g.add(redFloor);
  const redEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.0, 0.02, 1.8)),
    new THREE.LineBasicMaterial({ color: 0x8a3030, transparent: true, opacity: 0.8 })
  );
  redEdge.position.set(-2.3, 0.02, DOCK_LOCAL_Z); g.add(redEdge);
  addLabel(g, 'OUT 送样', 0.5).position.set(-2.3, 0.5, DOCK_LOCAL_Z + 1.05);

  const greenFloor = floorTile(2.0, 1.8, P.greenZone);
  greenFloor.position.set(2.3, 0.013, DOCK_LOCAL_Z); g.add(greenFloor);
  const greenEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.0, 0.02, 1.8)),
    new THREE.LineBasicMaterial({ color: 0x2f6b2f, transparent: true, opacity: 0.8 })
  );
  greenEdge.position.set(2.3, 0.02, DOCK_LOCAL_Z); g.add(greenEdge);
  addLabel(g, 'OUT 成品', 0.5).position.set(2.3, 0.5, DOCK_LOCAL_Z + 1.05);

  // 安灯（货架上方，默认暗）
  const sa = sph(0.1, 10, 0x555, { emissive: 0x555, emissiveIntensity: 0.2 });
  sa.position.set(-2.3, 1.95, DOCK_LOCAL_Z); g.add(sa);
  andonLights.sample.push(sa);
  const pa = sph(0.1, 10, 0x555, { emissive: 0x555, emissiveIntensity: 0.2 });
  pa.position.set(2.3, 1.95, DOCK_LOCAL_Z); g.add(pa);
  andonLights.product.push(pa);

  // PDA终端（操作位旁立柱）
  const pdaPole = cyl(0.04, 0.04, 1.0, 8, 0x555);
  pdaPole.position.set(0, 0.5, 1.5); g.add(pdaPole);
  const pda = box(0.14, 0.24, 0.09, 0x222, { metal: 0.7, rough: 0.2 });
  pda.position.set(0, 1.05, 1.5); g.add(pda);
  const pdaScr = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.11),
    new THREE.MeshBasicMaterial({ color: 0x2b5c9b })
  );
  pdaScr.position.set(0, 1.05, 1.56); pdaScr.rotation.x = -0.25; g.add(pdaScr);

  // 工人（默认在机台前操作位，面向机台 -Z）
  const worker = buildWorker(P.worker);
  worker.position.set(0, 0, -0.4); worker.rotation.y = Math.PI;
  g.add(worker);
  prodWorkers.push(worker);

  addLabel(g, cfg.name, 3.5).position.set(0, 3.5, -2.6);

  scene.add(g);
  prodGroups.push(g);

  g.updateMatrixWorld(true);

  // 货架世界坐标（与机台同侧，靠走道前沿）
  const sw = new THREE.Vector3(-2.3, 0, DOCK_LOCAL_Z).applyMatrix4(g.matrixWorld);
  const pw = new THREE.Vector3(2.3, 0, DOCK_LOCAL_Z).applyMatrix4(g.matrixWorld);
  sampleDocks.push(sw);
  productDocks.push(pw);

  // AMR 停靠点：由货架沿径向内推到走道中线，保证车身完全在走道内，
  // 只有顶升机构朝货架方向伸出。radialDir 为「由中心指向该区」的单位向量。
  const radialDir = new THREE.Vector3(cfg.x, 0, cfg.z).normalize();
  const projStop = (dock) => {
    // 切向分量保留（对齐货架），径向分量强制落在走道中线半径上
    const tangential = dock.clone().sub(radialDir.clone().multiplyScalar(dock.dot(radialDir)));
    return tangential.add(radialDir.clone().multiplyScalar(AISLE_RADIUS));
  };
  zoneStops.push({
    sampleStop: projStop(sw),
    productStop: projStop(pw),
    radialDir,
  });

  return g;
}

// 构建所有生产区
prodZones.forEach((z, i) => {
  buildProductionZone(z);
});
scene.updateMatrixWorld(true);

// 每个区放 1 红 + 1 绿空流转架，等工人上货后才会呼叫 AMR。
// 关键：初始 hasBins=false，AMR 不会凭空来取货。
const CALL_NONE = 0, CALL_PENDING = 1, CALL_ASSIGNED = 2;
// 全局计数（QC 已检 / 打包已收），由 updateShelves 递增，供看板与 KPI 使用
let qcInspected = 0;
let packReceived = 0;
let callsRaised = 0;         // PDA 呼叫累计
let amrBusyAccum = 0;        // AMR 忙碌时间累计（算利用率）
let amrTimeAccum = 0;
for (let i = 0; i < 4; i++) {
  const angle = Math.atan2(prodZones[i].x, prodZones[i].z) + Math.PI;
  const mk = (color, type, dock, arr) => {
    const mesh = buildMobileShelf(color);
    mesh.position.copy(dock);
    mesh.rotation.y = angle;
    scene.add(mesh);
    const obj = {
      mesh, type, zoneIdx: i, carriedBy: null, location: 'zone',
      hasBins: false, binCount: 0, unloadTimer: 0,
      call: CALL_NONE, homeAngle: angle,
    };
    arr.push(obj);
    registerShelf(obj);
    return obj;
  };
  mk(P.sampleBin, 'sample', sampleDocks[i], sampleShelfAtZone);
  mk(P.productBin, 'product', productDocks[i], productShelfAtZone);
}
// ===== 中央打包区细节 =====
const convLength = 5, convWidth = 0.8, convHeight = 0.7;
const conveyorGroup = new THREE.Group();
const belt = box(convWidth, 0.05, convLength, P.conveyor);
belt.position.y = convHeight; conveyorGroup.add(belt);
for (let side of [-1, 1]) {
  const rail = box(0.04, 0.08, convLength, P.conveyorEdge);
  rail.position.set(side * (convWidth/2 - 0.02), convHeight + 0.07, 0);
  conveyorGroup.add(rail);
}
for (let i = 0; i < 7; i++) {
  const z = -convLength/2 + (i+0.5)*(convLength/7);
  for (let side of [-1,1]) {
    const leg = box(0.06, convHeight, 0.06, P.machineDark);
    leg.position.set(side*(convWidth/2-0.08), convHeight/2, z);
    conveyorGroup.add(leg);
  }
}
for (let i = 0; i < 24; i++) {
  const z = -convLength/2 + (i+0.5)*(convLength/24);
  const roller = cyl(0.03, 0.03, convWidth-0.1, 10, P.conveyorEdge);
  roller.rotation.z = Math.PI/2;
  roller.position.set(0, convHeight+0.015, z);
  conveyorGroup.add(roller);
}
// 滚筒线沿 +Z 流动：进料端(南, -Z)紧邻 PACK INPUT，出料端(北, +Z)接打包台。
// CONV_IN_Z/CONV_OUT_Z 是流程各工位定位的基准，改滚筒线位置只需改 CONV_CENTER_Z。
const CONV_CENTER_Z = -1.6;
conveyorGroup.position.set(0, 0, CONV_CENTER_Z);
const CONV_IN_Z = CONV_CENTER_Z - convLength / 2;    // -4.1 进料端（靠 INPUT）
const CONV_OUT_Z = CONV_CENTER_Z + convLength / 2;   //  0.9 出料端（靠打包台）
packGroup.add(conveyorGroup);
addLabel(conveyorGroup, '滚筒包装线', 1.6).position.set(-0.9, 1.6, -convLength/2 - 0.1);

const convBins = [];
for (let i = 0; i < 4; i++) {
  const b = box(0.32, 0.28, 0.28, P.productBin, { rough: 0.7 });
  b.position.y = convHeight + 0.16;
  b.userData.progress = i / 4;
  conveyorGroup.add(b);
  convBins.push(b);
}

// 质检盖章工位：滚筒线进料侧。工人从 PACK INPUT 的货架取箱 -> 盖章 -> 放上滚筒线。
// 摆在东侧，与 PACK INPUT 同侧，否则工人每次取箱都要横穿滚筒线。
const STAMP_X = 1.9, STAMP_Z = CONV_IN_Z + 0.9;       // 台面 (1.9, -3.2)
const stampTable = box(1.2, 0.85, 1.2, P.machine);
stampTable.position.set(STAMP_X, 0.425, STAMP_Z); packGroup.add(stampTable);
const stamper = box(0.22, 0.22, 0.16, P.machineAccent, { metal: 0.8, rough: 0.2 });
stamper.position.set(STAMP_X - 0.15, 1.05, STAMP_Z); packGroup.add(stamper);
// 站位夹在皮带与盖章台之间，两边都在臂展内
const STAMPW_HOME = new THREE.Vector3(0.95, 0, STAMP_Z);
const qcPackWorker = buildWorker(P.packWorker);
qcPackWorker.position.copy(STAMPW_HOME);
qcPackWorker.rotation.y = Math.PI / 2;                // 面朝东（盖章台方向）
packGroup.add(qcPackWorker);
addLabel(packGroup, '质检盖章', 1.6).position.set(STAMP_X, 1.6, STAMP_Z - 1.1);

// 打包工作台：滚筒线出料端东侧，工人从线尾取箱 -> 装箱 -> 转身码垛
const PACK_X = 1.9, PACK_Z = CONV_OUT_Z + 0.4;        // 台面 (1.9, 1.3)
const packTable = box(1.8, 0.85, 1.4, P.machine);
packTable.position.set(PACK_X, 0.425, PACK_Z); packGroup.add(packTable);
const vacMachine = new THREE.Group();
const vacBody = box(0.5, 0.6, 0.5, P.machineDark);
vacBody.position.y = 0.3; vacMachine.add(vacBody);
const vacLed = sph(0.03, 8, 0x6aa84f, { emissive: 0x6aa84f, emissiveIntensity: 0.7 });
vacLed.position.set(0, 0.78, 0.2); vacMachine.add(vacLed);
vacMachine.position.set(PACK_X + 1.2, 0, PACK_Z - 0.6); packGroup.add(vacMachine);
// 打包工人的作业原点：线尾正北，面朝滚筒线。取箱 -> 打包台 -> 码垛位 都从这里出发。
// 注意 x 必须离开皮带（皮带 x 半宽 0.4），否则人会站在滚筒线上。
const PACK_LINE_END = new THREE.Vector3(0, 0, CONV_OUT_Z);
const PACKW_HOME = new THREE.Vector3(0, 0, CONV_OUT_Z + 1.0);   // (0, 1.9)
const packWorker = buildWorker(P.worker);
packWorker.position.copy(PACKW_HOME); packWorker.rotation.y = Math.PI;  // 面朝线尾
packGroup.add(packWorker);
addLabel(packGroup, '装箱打包', 1.6).position.set(PACK_X, 1.6, PACK_Z + 1.1);

// 码垛区
function buildPallet() {
  const g = new THREE.Group();
  const p1 = box(1.1, 0.05, 1.1, P.pallet, { rough: 0.9 });
  p1.position.y = 0.12; g.add(p1);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const foot = box(0.1, 0.1, 0.1, P.pallet);
      foot.position.set(-0.4+i*0.4, 0.05, -0.4+j*0.4);
      g.add(foot);
    }
  return g;
}
const palletGroup = new THREE.Group();
palletGroup.add(buildPallet());
// 数组次序必须与「层内 9 箱、逐层叠高」的堆放顺序一致：
// idx = layer*9 + row*3 + col。stackOneCarton 按 idx 递增放箱，
// 所以第 10 箱自动落到第二层，垛形是从下往上长的。
const palletBoxes = [];
for (let layer = 0; layer < 3; layer++)
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      const b = box(0.33, 0.3, 0.33, P.carton, { rough: 0.8 });
      b.position.set(-0.33+col*0.33, 0.15+layer*0.3, -0.33+row*0.33);
      b.visible = false; palletGroup.add(b); palletBoxes.push(b);
    }
// 码垛位在打包台正北，工人两步可达。packGroup 未做位移/旋转，故局部坐标 = 世界坐标，
// 拖运到发货区可以直接用世界坐标插值。
const PALLET_HOME_X = 0, PALLET_HOME_Z = 3.4;
palletGroup.position.set(PALLET_HOME_X, 0, PALLET_HOME_Z);
packGroup.add(palletGroup);
addLabel(palletGroup, '码垛 3x3x3', 2).position.set(0, 2, 0.8);

// 辅材货架（挪到打包区西北角，让开码垛位与拖运路线）
for (let s = 0; s < 2; s++) {
  const shelf = box(0.5, 1.8, 1.2, P.shelf, { metal: 0.3, rough: 0.7 });
  shelf.position.set(-3.2 + s * 0.6, 0.9, 2.2); packGroup.add(shelf);
  for (let i = 0; i < 3; i++) {
    const sh = box(0.55, 0.03, 1.25, P.machineDark);
    sh.position.set(-3.2 + s * 0.6, 0.3 + i * 0.6, 2.2);
    packGroup.add(sh);
  }
}
addLabel(packGroup, '辅材货架', 2.2).position.set(-2.9, 2.2, 3.1);
// ===== 打包区 INPUT 接口（南侧，对齐滚筒线进料端） =====
// 打包区只有 INPUT，没有 OUTPUT：满绿架卸在这里，工人就近取箱上滚筒线；
// 架子腾空后原地待收，AMR 下一趟顺路顶走。这样物料走向是单向的：
//   AMR 卸货 -> 工人上线 -> 滚筒线 -> 盖章 -> 打包 -> 码垛 -> 人工拖去发货区
// 位置依据：滚筒线沿 +Z 流动，进料端在 z = CONV_IN_Z（约 -4.5），
// 所以 INPUT 必须落在进料端与南段走道之间，工人两步就能上线，不用绕整个打包区。
// 环线次序约束：南段沿 +X 行驶，南侧生产区绿架停靠点在 arc 25.7（x=+2.3）。
// INPUT 必须排在它下游（x > 2.3），否则 AMR 从南区取完货得绕整整 60m 才能卸货
// （单向环线周长 62.4m）。取 x=2.8 -> arc 26.2，紧跟其后。
const packInputSlot = new THREE.Vector3(2.8, 0, -5.8);
const packInputStop = new THREE.Vector3(2.8, 0, -AISLE_RADIUS);
{
  const inF = floorTile(2.2, 1.8, P.greenZone);
  inF.position.set(packInputSlot.x, 0.014, packInputSlot.z); scene.add(inF);
  const inEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 0.02, 1.8)),
    new THREE.LineBasicMaterial({ color: 0x2f6b2f, transparent: true, opacity: 0.85 })
  );
  inEdge.position.set(packInputSlot.x, 0.02, packInputSlot.z); scene.add(inEdge);
  addLabel(scene, 'PACK INPUT', 0.5).position.set(packInputSlot.x, 0.5, packInputSlot.z - 1.15);
}

// ===== QC室（西侧，紧贴环线） =====
// 布局：QC 室坐西朝东，东墙为玻璃幕墙留出 AMR 接口。
// 接口区在室外，设 INPUT 台（AMR 放红架 -> QC 工人取）和 OUTPUT 台（空架待回收）。
// 东墙落在 x=-10.6，正好让接口台（宽 1.6）落在 -10.6..-9.0，
// 既不压走道外沿(-9.0)也不与房间重叠。
const qcX = -13.6, qcZ = -7.0;
const qcZone = floorTile(6, 5.2, P.qcFloor);
qcZone.position.set(qcX, 0.015, qcZ); scene.add(qcZone);

// 西墙 + 北墙（实墙），东墙玻璃（入口侧），南墙留空做通道
{
  const w1 = box(6.2, 2.2, 0.12, P.wall);
  w1.position.set(qcX, 1.1, qcZ - 2.6); scene.add(w1);
  const w2 = box(0.12, 2.2, 5.4, P.wall);
  w2.position.set(qcX - 3, 1.1, qcZ); scene.add(w2);
  const glassMat = new THREE.MeshStandardMaterial({ color: P.glass, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.3 });
  const g1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2, 5.2), glassMat);
  g1.position.set(qcX + 3, 1, qcZ); scene.add(g1);
  const g2 = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.08), glassMat);
  g2.position.set(qcX - 1, 1, qcZ + 2.6); scene.add(g2);
}
// QC 工作台
{
  const t = box(2, 0.85, 1.0, P.machine);
  t.position.set(qcX, 0.425, qcZ - 1); scene.add(t);
  const mic = box(0.2, 0.25, 0.15, P.machineDark);
  mic.position.set(qcX - 0.3, 1.05, qcZ - 0.8); scene.add(mic);
}
for (let i = 0; i < 3; i++) {
  const b = box(0.25, 0.2, 0.2, P.sampleBin);
  b.position.set(qcX - 0.5 + i * 0.3, 1.0, qcZ - 1.2);
  scene.add(b);
}
// QC 判定章（实体，盖章动作时会随手下压）
const QC_STAMP_Y = 1.02;
const qcStamp = box(0.22, 0.22, 0.16, P.machineAccent, { metal: 0.8, rough: 0.2 });
qcStamp.position.set(qcX + 0.55, QC_STAMP_Y, qcZ - 0.95); scene.add(qcStamp);
// 判定章下方的记录台
{
  const pad = box(0.4, 0.02, 0.3, 0xf0ead0, { rough: 0.9 });
  pad.position.set(qcX + 0.55, 0.87, qcZ - 0.75); scene.add(pad);
}
const qcWorker = buildWorker(P.qcWorker);
// 站在工作台南侧，面朝台面(-Z)，手正好落在仪器与判定章之间
qcWorker.position.set(qcX + 0.2, 0, qcZ - 0.05); qcWorker.rotation.y = Math.PI;
scene.add(qcWorker);
addLabel(scene, 'QC 检测室', 2.5).position.set(qcX, 2.5, qcZ + 3);

// QC 室外 INPUT/OUTPUT 接口区（东墙外，紧贴 AMR 环线停靠位）
// INPUT 台: AMR 放红架 -> QC 工人取走 | OUTPUT 台: 空架待回收
// 环线西段沿 -Z 行驶，故 INPUT 在上游(z 较大)、OUTPUT 在下游(z 较小)：
// AMR 先卸满架，再往前取空架，一次靠站完成双向交接。
const qcInputSlot = new THREE.Vector3(-9.8, 0, -5.2);
const qcOutputSlot = new THREE.Vector3(-9.8, 0, -7.2);
const qcInputStop = new THREE.Vector3(-AISLE_RADIUS, 0, -5.2);  // 环线西段上的停靠点
const qcOutputStop = new THREE.Vector3(-AISLE_RADIUS, 0, -7.2);
// 接口区地面标识（宽 1.6，贴在走道外沿与 QC 东墙之间）
const qcInputFloor = floorTile(1.6, 1.8, P.redZone);
qcInputFloor.position.set(qcInputSlot.x, 0.014, qcInputSlot.z); scene.add(qcInputFloor);
// 标签朝各自外侧摆，避免两块接口台的文字挤在中间重叠
addLabel(scene, 'QC IN', 0.5).position.set(qcInputSlot.x, 0.5, qcInputSlot.z + 1.15);
const qcOutputFloor = floorTile(1.6, 1.8, 0xc0c0c0);
qcOutputFloor.position.set(qcOutputSlot.x, 0.014, qcOutputSlot.z); scene.add(qcOutputFloor);
addLabel(scene, 'QC OUT', 0.5).position.set(qcOutputSlot.x, 0.5, qcOutputSlot.z - 1.15);
// QC 区初始空架（放 OUTPUT 位）。必须加入 sampleShelfAtZone，
// 否则调度器看不到它、无法参与流转，货架池会越用越少。
{
  const qMesh = buildMobileShelf(P.sampleBin);
  qMesh.position.copy(qcOutputSlot);
  scene.add(qMesh);
  const obj = {
    mesh: qMesh, type: 'sample', zoneIdx: -1, carriedBy: null, location: 'qc',
    hasBins: false, binCount: 0, unloadTimer: 0, call: CALL_NONE, atOutput: true, homeAngle: 0,
  };
  sampleShelfAtZone.push(obj);
  registerShelf(obj);
}

// ===== AMR 充电区（东侧，紧贴环线） =====
const chX = 11.4, chZ = 6.2;
const chargerFloor = floorTile(4.2, 3.6, P.chargerFloor);
chargerFloor.position.set(chX, 0.015, chZ); scene.add(chargerFloor);
// 两个独立泊位：车沿 +X 离开走道进泊位，充电桩在泊位更外侧
const CHARGE_BAY_Z = [5.3, 7.1];
for (let i = 0; i < 2; i++) {
  const ch = box(0.3, 0.9, 0.55, P.machineDark);
  ch.position.set(chX + 1.5, 0.45, CHARGE_BAY_Z[i]); scene.add(ch);
  const cl = sph(0.05, 8, 0x6aa84f, { emissive: 0x6aa84f, emissiveIntensity: 0.9 });
  cl.position.set(chX + 1.5, 1.0, CHARGE_BAY_Z[i]); scene.add(cl);
  const slotTile = floorTile(1.7, 1.3, 0xbfc7bb);
  slotTile.position.set(chX - 0.5, 0.016, CHARGE_BAY_Z[i]); scene.add(slotTile);
}
addLabel(scene, 'AMR 充电区', 2).position.set(chX, 2, chZ - 2.2);
// 每台车一个专属泊位。泊位必须「离环」，否则充电中的车压在单向环线上会把后车永久堵死。
const chargeStops = [
  new THREE.Vector3(AISLE_RADIUS, 0, CHARGE_BAY_Z[0]),
  new THREE.Vector3(AISLE_RADIUS, 0, CHARGE_BAY_Z[1]),
];
const chargeBays = [
  new THREE.Vector3(chX - 0.5, 0, CHARGE_BAY_Z[0]),
  new THREE.Vector3(chX - 0.5, 0, CHARGE_BAY_Z[1]),
];

// ===== 成品出货区 =====
const shipX = -15, shipZ = 12;
const shippingZone = floorTile(7, 5, P.cellFloor);
shippingZone.position.set(shipX, 0.015, shipZ); scene.add(shippingZone);
{
  const _edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(7, 0.03, 5)),
    new THREE.LineBasicMaterial({ color: 0x8a7d4a, transparent: true, opacity: 0.5 })
  );
  _edge.translateY(0.015);
  _edge.position.set(shipX, 0, shipZ);
  scene.add(_edge);
}
for (let p = 0; p < 2; p++) {
  const sp = buildPallet();
  sp.position.set(shipX - 2 + p*2.5, 0, shipZ); scene.add(sp);
  for (let layer = 0; layer < 1+p; layer++)
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        const b = box(0.33, 0.3, 0.33, P.carton, { rough: 0.8 });
        b.position.set(shipX - 2 + p*2.5 - 0.33 + col*0.33, 0.15+layer*0.3, shipZ - 0.33+row*0.33);
        scene.add(b);
      }
}
addLabel(scene, '成品出货区', 2).position.set(shipX, 2, shipZ+2.2);

// ===== AMR 路径：矩形环线（逆时针） =====
const R = AISLE_RADIUS;
const LOOP = [
  new THREE.Vector3(-R, 0,  R),  // 0 西北拐点
  new THREE.Vector3(-R, 0,  0),  // 1 西中(4号机旁)
  new THREE.Vector3(-R, 0, -R),  // 2 西南拐点
  new THREE.Vector3( 0, 0, -R),  // 3 南中(1号机旁)
  new THREE.Vector3( R, 0, -R),  // 4 东南拐点
  new THREE.Vector3( R, 0,  0),  // 5 东中(2号机旁)
  new THREE.Vector3( R, 0,  R),  // 6 东北拐点
  new THREE.Vector3( 0, 0,  R),  // 7 北中(3号机旁)
  new THREE.Vector3(-R, 0,  R),  // 8 西北拐点(闭环=0)
];
const LOOP_LEN = (() => {
  let s = 0;
  for (let i = 0; i < LOOP.length - 1; i++) s += LOOP[i].distanceTo(LOOP[i+1]);
  return s;
})();
function posOnLoop(arc) {
  let d = ((arc % LOOP_LEN) + LOOP_LEN) % LOOP_LEN;
  let acc = 0;
  for (let i = 0; i < LOOP.length - 1; i++) {
    const seg = LOOP[i].distanceTo(LOOP[i+1]);
    if (acc + seg >= d) {
      const t = (d - acc) / seg;
      const p = LOOP[i].clone().lerp(LOOP[i+1], t);
      const dir = LOOP[i+1].clone().sub(LOOP[i]).normalize();
      return { pos: p, dir };
    }
    acc += seg;
  }
  return { pos: LOOP[LOOP.length-1].clone(), dir: new THREE.Vector3(-1,0,0) };
}
function arcDist(ahead, behind) {
  let d = ahead - behind;
  if (d < 0) d += LOOP_LEN;
  return d;
}

// ===== AMR 构建 =====
// 潜伏式 AMR。总高必须 < SHELF_CLEAR(0.34) 才能潜入货架底部顶升。
function buildAMR(idLabel) {
  const g = new THREE.Group();
  // 车身（亮橙 + 黑饰条，厚实一点）
  const body = box(1.15, 0.2, 0.92, P.amr, { metal: 0.45, rough: 0.35, emissive: P.amr, emissiveIntensity: 0.16 });
  body.position.y = 0.14; g.add(body);
  // 黑色下裙
  const skirt = box(1.18, 0.08, 0.95, P.amrDark, { metal: 0.5, rough: 0.5 });
  skirt.position.y = 0.05; g.add(skirt);
  // 顶面黑色饰板（橙黑配色）
  const topPlate = box(1.0, 0.035, 0.8, 0x241a12, { metal: 0.6, rough: 0.4 });
  topPlate.position.y = 0.255; g.add(topPlate);
  // 顶升平台（初始略高于顶板，顶起后升 0.12）
  const liftPlat = cyl(0.32, 0.32, 0.05, 20, 0xffa640, { metal: 0.75, rough: 0.25, emissive: 0xffa640, emissiveIntensity: 0.4 });
  liftPlat.position.y = 0.33; g.add(liftPlat);
  g.userData.liftPlatform = liftPlat;
  // 前后灯带
  for (const z of [0.45, -0.45]) {
    const strip = box(1.0, 0.03, 0.035, 0xffd050, { emissive: 0xffd050, emissiveIntensity: 1.0 });
    strip.position.set(0, 0.2, z); g.add(strip);
  }
  // 侧向安全灯
  for (const s of [-1, 1]) {
    const sl = box(0.035, 0.03, 0.55, 0xffd050, { emissive: 0xffd050, emissiveIntensity: 0.9 });
    sl.position.set(s * 0.585, 0.18, 0); g.add(sl);
  }
  // 轮（4 个，藏在下裙内）
  for (let i = 0; i < 4; i++) {
    const w = cyl(0.075, 0.075, 0.055, 10, 0x15100c);
    w.rotation.z = Math.PI / 2;
    w.position.set((i < 2 ? 1 : -1) * 0.44, 0.075, (i % 2 === 0 ? 1 : -1) * 0.34);
    g.add(w);
  }
  // 状态灯（在顶板上，不遮挡顶升）
  const led = sph(0.045, 10, P.amr, { emissive: P.amr, emissiveIntensity: 1.2 });
  led.position.set(0.42, 0.3, 0); g.add(led);
  g.userData.led = led;
  const idDiv = document.createElement("div");
  idDiv.textContent = idLabel;
  idDiv.style.cssText = "color:#fff;font-size:9px;font-weight:700;background:#cc5500;padding:1px 4px;border-radius:2px;pointer-events:none;";
  const idObj = new CSS2DObject(idDiv);
  idObj.position.set(0, 0.62, 0); g.add(idObj);
  // 货架挂点：顶升后货架坐在这个高度上
  const mount = new THREE.Group();
  mount.position.y = 0.36; g.add(mount);
  g.userData.shelfMount = mount;
  return g;
}

// 环线上各站点的弧长位置（由世界坐标反解，避免手写 wpIdx 与几何脱节）
function arcOfPoint(p) {
  // 把点投到环线上，返回最近点的弧长
  let best = { d: Infinity, arc: 0 };
  let acc = 0;
  for (let i = 0; i < LOOP.length - 1; i++) {
    const a = LOOP[i], b = LOOP[i + 1];
    const ab = b.clone().sub(a);
    const segLen = ab.length();
    const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / (segLen * segLen)));
    const proj = a.clone().add(ab.multiplyScalar(t));
    const d = proj.distanceTo(p);
    if (d < best.d) best = { d, arc: acc + t * segLen };
    acc += segLen;
  }
  return best.arc;
}

// AMR 1: 送检（红架 -> QC）; AMR 2: 成品（绿架 -> 打包区）
function makeAMR(label, mission, speed, startArc, bay) {
  const a = {
    mesh: buildAMR(label),
    arc: startArc,
    speed,
    state: 'idle',            // idle / traveling / approaching / docking / departing / charging
    dockTimer: 0,
    chargeTimer: 0,
    hasShelf: false,
    shelf: null,
    mission,
    job: null,                // { kind:'pickup'|'dropoff', zoneIdx, stop, dockPos }
    idleTimer: 0,
    deliveries: 0,
    bay,                      // 专属充电泊位序号
    yaw: 0,
    userData: {},
  };
  scene.add(a.mesh);
  return a;
}
// 环线 62m、单车要覆盖 4 个区 + 站点双向交接，车速偏慢会导致料箱在产线堆积。
const amr1 = makeAMR('AMR-01 送检', 'sample', 3.4, 2, 0);
const amr2 = makeAMR('AMR-02 成品', 'product', 3.4, 26, 1);
const fleet = [amr1, amr2];

// ===== 防撞参数（几何推导，勿凭感觉调）=====
// 车身 1.15(长) x 0.92(宽)。判据只用「环序弧长」，因为它天然非对称：
// 两车的 gapArc 之和恒等于 LOOP_LEN(62.4m)，不可能同时小于阈值，所以永远只有
// 后车让行 —— 结构上不存在双向对停的死锁。
//
// 阈值怎么来的：环线是矩形，最坏情况在直角拐角。两车跨拐角、弧长差 s 时，
// 物理间距最小为 s/sqrt(2)（前后各占 s/2 时取到）。车身对角约 1.47m，
// 要留出余量保证 >= 2.0m，需要 s >= 2.0*sqrt(2) = 2.83，故取 2.9。
const AMR_STOP_GAP = 2.9;        // 硬停：拐角最坏物理间距 2.9/1.414 = 2.05m
const AMR_SAFE_GAP = 5.2;        // 开始减速
const AMR_BODY_CLEAR = 1.7;      // 兜底刹车的物理间距阈值（仅后车用，见下）
// 离环车辆仍然「占位」的判定距离：靠站/离站途中若离环线中线还不到这个距离，
// 它的 arc 槽位继续算被占用，后车按弧长在它后面排队。
// 这一步也是非对称的（仍走环序），不会引入死锁。
const AMR_NEAR_LOOP = 1.2;

// 对方是否占用环线上的 arc 槽位
function occupiesLoop(other) {
  if (other.state === 'traveling' || other.state === 'idle') return true;
  // 靠站/离站途中还贴着走道的，视为仍占位；已经深入货位/泊位的不占走道
  if (other.state === 'approaching' || other.state === 'departing') {
    const onLoop = posOnLoop(other.arc).pos;
    return other.mesh.position.distanceTo(onLoop) < AMR_NEAR_LOOP;
  }
  return false;   // docking / charging：已完全离环
}

// 本车是否是「后车」（环序意义上跟在对方后面）。
// 用它把兜底刹车也变成非对称的：只有后车会因为物理距离刹车，前车照常走，
// 于是间距一定会重新拉开。对称刹车 = 两车一起停死，这是之前的 bug 根因。
function isFollower(amr, otherAmr) {
  return arcDist(otherAmr.arc, amr.arc) < LOOP_LEN / 2;
}

// 车头朝向平滑插值（避免靠站/离站瞬间 90 度跳变）
function smoothYaw(amr, targetYaw, dt) {
  let cur = amr.yaw ?? amr.mesh.rotation.y;
  let d = targetYaw - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const step = Math.min(1, dt * 5.5);
  amr.yaw = cur + d * step;
  return amr.yaw;
}

// 卸货点：QC 室 INPUT / 打包区 INPUT（都在环线上就近停靠）
function getTargetArc(amr) {
  return amr.job ? amr.job.arc : amr.arc;
}
function getDockPos(amr) {
  return amr.job ? amr.job.dockPos.clone() : null;
}

// ===== AMR 调度器 =====
// 目的站卸货位是否被占。这是单 INPUT 位布局的关键约束：
// 打包区只有一个 INPUT 位（无 OUTPUT 区），那里有架子就不能再送一个过来，否则两架重叠。
// QC 有独立 OUTPUT 台，已腾空并挪到 OUTPUT 的架子不占 INPUT，不算堵。
function stationOccupied(mission) {
  if (mission === 'product') {
    return productShelfAtZone.some(s => s.location === 'pack' && !s.carriedBy);
  }
  return sampleShelfAtZone.some(s => s.location === 'qc' && !s.carriedBy && !s.atOutput);
}

// 找最近一个待呼叫（CALL_PENDING），生成任务（pickup -> dropoff）
// pickup: 到产线 OUTPUT 取满架 | dropoff: 到 QC/PACK INPUT 放架
function dispatchAMR(amr) {
  if (amr.state !== 'idle' && amr.state !== 'traveling') return;
  if (amr.hasShelf && amr.job) {
    // 已经有货架的任务 -> 去卸货
    amr.state = 'traveling';
    return;
  }
  // 去充电/待命的行程是可抢占的：路上来了活要立刻改派，
  // 否则 PDA 呼叫会被无视，产线一直等不到车。
  const preemptible = !amr.job || amr.job.kind === 'charge' || amr.job.kind === 'charge_done';
  if (!preemptible) { amr.state = 'traveling'; return; }
  // 优先级 1：回收站内空架送回缺架产线区。
  // 必须排在取货前面，否则空架会在 QC/打包区堆积、产线无架可放而停摆。
  const empty = recycleEmptyShelves(amr.mission);
  if (empty) {
    const isQC = empty.location === 'qc';
    amr.job = {
      kind: 'pickup_empty',
      shelf: empty,
      returnTo: empty.returnTo,
      // 停到货架实际所在的位置（潜伏顶升必须车在架下），
      // arc 用走道中线上的投影点，保证行驶段始终在走道内。
      // QC 有独立 OUTPUT 台；打包区没有 OUTPUT，空架就留在 INPUT 位原地待收。
      dockPos: (isQC ? qcOutputSlot : packInputSlot).clone(),
      arcPos: (isQC ? qcOutputStop : packInputStop).clone(),
    };
    empty.reservedBy = amr;
    amr.job.arc = arcOfPoint(amr.job.arcPos);
    amr.state = 'traveling';
    return;
  }

  // 优先级 2：响应 PDA 呼叫，取满架。
  // 目的站卸货位被占时直接跳过取货，让车去待命，
  // 否则车会拉着满架堵在 INPUT 位外面，而空架回收又排在它后面 —— 活锁。
  if (!stationOccupied(amr.mission)) {
    const shelfArr = amr.mission === 'sample' ? sampleShelfAtZone : productShelfAtZone;
    let best = null, bestDist = Infinity;
    for (const sh of shelfArr) {
      if (sh.call === CALL_PENDING && sh.location === 'zone' && sh.hasBins && !sh.carriedBy) {
        const d = arcDist(arcOfPoint(sh.mesh.position), amr.arc);
        if (d < bestDist) { bestDist = d; best = sh; }
      }
    }
    if (best) {
      best.call = CALL_ASSIGNED;
      const key = amr.mission === 'sample' ? 'sampleStop' : 'productStop';
      const slot = amr.mission === 'sample' ? sampleDocks[best.zoneIdx] : productDocks[best.zoneIdx];
      amr.job = {
        kind: 'pickup',
        zoneIdx: best.zoneIdx,
        shelf: best,
        dockPos: slot.clone(),
        arcPos: zoneStops[best.zoneIdx][key].clone(),
      };
      amr.job.arc = arcOfPoint(amr.job.arcPos);
      amr.state = 'traveling';
      return;
    }
  }

  // 都没有活 -> 回自己的充电泊位待命（每车专属泊位，不会互相占位）
  if (!amr.job && amr.idleTimer > 3.5) {
    const stop = chargeStops[amr.bay];
    amr.job = {
      kind: 'charge',
      dockPos: chargeBays[amr.bay].clone(),
      arcPos: stop.clone(),
      arc: arcOfPoint(stop),
    };
    amr.state = 'traveling';
  }
}
// 顶升/下降动作（共用，避免重复代码）
function doLift(amr, dt) {
  const lift = amr.mesh.userData.liftPlatform;
  const mount = amr.mesh.userData.shelfMount;
  if (!lift || !mount) return;
  if (!amr.userData._liftT) amr.userData._liftT = 0;
  amr.userData._liftT = Math.min(1, amr.userData._liftT + dt / 0.5);
  const e = amr.userData._liftT < 0.5 ? 2 * amr.userData._liftT * amr.userData._liftT : 1 - Math.pow(-2 * amr.userData._liftT + 2, 2) / 2;
  lift.position.y = 0.33 + e * 0.12;
  mount.position.y = 0.36 + e * 0.12;
  return e >= 1;
}
function doLower(amr, dt) {
  const lift = amr.mesh.userData.liftPlatform;
  const mount = amr.mesh.userData.shelfMount;
  if (!lift || !mount) return;
  if (!amr.userData._liftT) amr.userData._liftT = 1;
  amr.userData._liftT = Math.max(0, amr.userData._liftT - dt / 0.5);
  const e = amr.userData._liftT < 0.5 ? 2 * amr.userData._liftT * amr.userData._liftT : 1 - Math.pow(-2 * amr.userData._liftT + 2, 2) / 2;
  lift.position.y = 0.33 + e * 0.12;
  mount.position.y = 0.36 + e * 0.12;
  return e <= 0;
}
function doPickupAction(amr) {
  const s = amr.job.shelf;
  if (!s || s.carriedBy) { amr.job = null; amr.state = 'idle'; return; }
  s.carriedBy = amr; s.location = 'amr';
  amr.hasShelf = true; amr.shelf = s;
  amr.mesh.userData.shelfMount.add(s.mesh);
  s.mesh.position.set(0, 0, 0); s.mesh.rotation.y = 0;
  s.call = CALL_NONE;
  setAndon(s.type, s.zoneIdx, false);
}
// 取空架（站内 OUTPUT 位）
function doPickupEmptyAction(amr) {
  const s = amr.job.shelf;
  if (!s || s.carriedBy) {
    if (s) s.reservedBy = null;
    amr.job = null; amr.state = 'idle'; return;
  }
  s.carriedBy = amr; s.location = 'amr';
  s.reservedBy = null;
  s.atOutput = false;
  amr.hasShelf = true; amr.shelf = s;
  amr.mesh.userData.shelfMount.add(s.mesh);
  s.mesh.position.set(0, 0, 0); s.mesh.rotation.y = 0;
}

// 放架。注意：不在这里清空料箱，料箱由站内工人在 updateShelves 中逐个取走，
// 这样「交接 -> 消失」是可见过程，而不是瞬间蒸发。
function doDropoffAction(amr, destSlot, destLoc) {
  const s = amr.shelf;
  if (!s) return;
  amr.mesh.userData.shelfMount.remove(s.mesh);
  scene.add(s.mesh);
  s.mesh.position.copy(destSlot); s.mesh.position.y = 0;
  s.mesh.rotation.y = (destLoc === 'zone' && s.homeAngle !== undefined) ? s.homeAngle : 0;
  s.carriedBy = null;
  s.location = destLoc;
  s.unloadTimer = 0;
  s.atOutput = false;
  if (destLoc === 'zone') {
    // 空架归位到产线缓存区，等工人上货
    if (amr.job && amr.job.returnTo !== undefined) s.zoneIdx = amr.job.returnTo;
    s.call = CALL_NONE;
  }
  amr.hasShelf = false; amr.shelf = null;
}
function finishAMRJob(amr) {
  amr.job = null; amr.idleTimer = 0;
  amr.state = 'idle';
}

function updateAMROnLoop(amr, otherAmr, dt) {
  const led = amr.mesh.userData.led;

  // 空闲：等调度器派活
  if (amr.state === 'idle') {
    if (led) led.material.emissiveIntensity = 0.35 + Math.sin(performance.now() * 0.002) * 0.15;
    amr.idleTimer += dt;
    dispatchAMR(amr);
    // 空闲车停在单向环线上会挡住后车（后车按弧长在它后面排队，而它永远不动）。
    // 所以只要后面有车靠近，就顺着车流缓行让路，而不是钉在原地。
    if (amr.state === 'idle') {
      const behindGap = arcDist(amr.arc, otherAmr.arc);   // 对方在本车「后方」的弧长
      const otherMoving = otherAmr.state === 'traveling';
      if (otherMoving && behindGap < AMR_SAFE_GAP) {
        amr.arc += amr.speed * 0.55 * dt;
        if (amr.arc >= LOOP_LEN) amr.arc -= LOOP_LEN;
      }
    }
    const { pos, dir } = posOnLoop(amr.arc);
    amr.mesh.position.copy(pos);
    amr.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    return;
  }

  if (amr.state === 'traveling') {
    if (!amr.job) { amr.state = 'idle'; return; }
    // 去充电/待命途中持续接受改派：有呼叫就立刻转正式任务。
    // 只在 idle 时派单会导致「车在去充电路上，产线呼叫无人响应」。
    if (amr.job.kind === 'charge' || amr.job.kind === 'charge_done') dispatchAMR(amr);
    if (!amr.job) { amr.state = 'idle'; return; }
    const target = amr.job.arc;
    const toTarget = arcDist(target, amr.arc);

    // ===== 防撞：判据必须全部非对称，否则两车一起停 =====
    // 主判据是环序弧长。它天然非对称：gapArc(A后B) + gapArc(B后A) === LOOP_LEN，
    // 两者不可能同时小于阈值，所以永远只有后车让行，前车照常走，间距必然重新拉开。
    //
    // 物理距离只能作为「后车」的兜底刹车（isFollower 判定），绝不能双向生效。
    // 之前写成 `physDist < 1.5` 对两车同时判定，一旦在拐角触发就双向硬停，
    // 距离再也不会变化 —— 这就是「AMR 相遇后一起死在原地」的根因。
    const otherOnLoop = occupiesLoop(otherAmr);
    const gapArc = otherOnLoop ? arcDist(otherAmr.arc, amr.arc) : Infinity;
    const physDist = amr.mesh.position.distanceTo(otherAmr.mesh.position);
    const follower = isFollower(amr, otherAmr);
    let eff = amr.speed;
    if (gapArc < AMR_STOP_GAP) eff = 0;
    else if (gapArc < AMR_SAFE_GAP) eff = amr.speed * (gapArc - AMR_STOP_GAP) / (AMR_SAFE_GAP - AMR_STOP_GAP);
    // 兜底：只有后车因物理贴近而刹车。对方在货位装卸时不参与（它不在走道上）。
    if (follower && otherOnLoop && physDist < AMR_BODY_CLEAR) eff = 0;
    else if (follower && otherOnLoop && physDist < 2.4) eff = Math.min(eff, amr.speed * 0.45);

    if (toTarget < 1.5 && eff > 0) eff = Math.min(eff, toTarget * 1.6 + 0.12);
    // 调试用（供 __flowProbe 读取，交付前可移除）
    amr.debugEff = eff;
    amr.debugGapArc = gapArc;
    amr.debugPhys = physDist;

    if (toTarget < 0.1) {
      amr.arc = target;
      amr.dockTimer = 0;
      amr.userData._actionDone = false;
      amr.userData._liftT = amr.hasShelf ? 1 : 0;
      amr.state = 'approaching';
    } else {
      amr.arc += eff * dt;
      if (amr.arc >= LOOP_LEN) amr.arc -= LOOP_LEN;
    }
    const { pos, dir } = posOnLoop(amr.arc);
    amr.mesh.position.copy(pos);
    amr.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    if (led) led.material.emissiveIntensity = eff > 0.1 ? 1.1 : 0.4;
    return;
  }

  // 靠站：从环线中线垂直平移到接口位（正交动作，不斜穿）
  if (amr.state === 'approaching') {
    amr.dockTimer += dt;
    if (led) led.material.emissiveIntensity = 0.6 + Math.sin(amr.dockTimer * 10) * 0.4;
    const loopPos = posOnLoop(amr.arc).pos;
    const dockPos = amr.job.dockPos;
    const t = Math.min(amr.dockTimer / 1.4, 1);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    amr.mesh.position.lerpVectors(loopPos, dockPos, e);
    // 车头转向货位方向（垂直驶入，不是平移贴图）
    const inDir = dockPos.clone().sub(loopPos);
    if (inDir.lengthSq() > 1e-4) {
      amr.mesh.rotation.y = smoothYaw(amr, Math.atan2(inDir.x, inDir.z), dt);
    }
    if (t >= 1) {
      amr.mesh.position.copy(dockPos);
      amr.state = 'docking';
      amr.dockTimer = 0;
    }
    return;
  }

  // 装卸：顶升取架 / 下降放架
  if (amr.state === 'docking') {
    amr.dockTimer += dt;
    if (led) led.material.emissiveIntensity = 0.5 + Math.sin(amr.dockTimer * 8) * 0.5;
    const kind = amr.job.kind;

    if (kind === 'charge') {
      amr.state = 'charging';
      amr.chargeTimer = 0;
      return;
    }

    // 顶升/放架前，先确认目标货位状态仍然有效（可能被另一台车抢先）

    if (amr.dockTimer > 0.35 && !amr.userData._actionDone) {
      if (kind === 'pickup' || kind === 'pickup_empty') {
        const done = doLift(amr, dt);
        if (done) {
          if (kind === 'pickup') doPickupAction(amr);
          else doPickupEmptyAction(amr);
          amr.userData._actionDone = true;
          amr.dockTimer = 0;
        }
      } else {
        const done = doLower(amr, dt);
        if (done) {
          doDropoffAction(amr, amr.job.destSlot, amr.job.destLoc);
          amr.userData._actionDone = true;
          amr.dockTimer = 0;
          amr.deliveries++;
        }
      }
      return;
    }

    if (amr.userData._actionDone && amr.dockTimer > 0.8) {
      amr.state = 'departing';
      amr.dockTimer = 0;
    }
    return;
  }

  // 离站：垂直退回环线中线
  if (amr.state === 'departing') {
    amr.dockTimer += dt;
    const loopPos = posOnLoop(amr.arc).pos;
    const dockPos = amr.job ? amr.job.dockPos : loopPos;
    const t = Math.min(amr.dockTimer / 1.4, 1);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    amr.mesh.position.lerpVectors(dockPos, loopPos, e);
    // 退出时车头逐渐转回环线行驶方向
    const outDir = posOnLoop(amr.arc).dir;
    amr.mesh.rotation.y = smoothYaw(amr, Math.atan2(outDir.x, outDir.z), dt);
    if (t >= 1) {
      amr.mesh.position.copy(loopPos);
      const { dir } = posOnLoop(amr.arc);
      amr.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      amr.yaw = amr.mesh.rotation.y;
      // 取满架 -> 送去 QC/打包 INPUT
      if (amr.hasShelf && amr.job && amr.job.kind === 'pickup') {
        const isSample = amr.mission === 'sample';
        amr.job = {
          kind: 'dropoff',
          dockPos: (isSample ? qcInputSlot : packInputSlot).clone(),
          arcPos: (isSample ? qcInputStop : packInputStop).clone(),
          destSlot: (isSample ? qcInputSlot : packInputSlot).clone(),
          destLoc: isSample ? 'qc' : 'pack',
        };
        amr.job.arc = arcOfPoint(amr.job.arcPos);
        amr.userData._liftT = 1;
        amr.state = 'traveling';
      }
      // 取空架 -> 送回缺架的产线区
      else if (amr.hasShelf && amr.job && amr.job.kind === 'pickup_empty') {
        const zi = amr.job.returnTo ?? 0;
        const key = amr.mission === 'sample' ? 'sampleStop' : 'productStop';
        const slot = amr.mission === 'sample' ? sampleDocks[zi] : productDocks[zi];
        amr.job = {
          kind: 'dropoff',
          dockPos: slot.clone(),
          arcPos: zoneStops[zi][key].clone(),
          destSlot: slot.clone(),
          destLoc: 'zone',
          returnTo: zi,
        };
        amr.job.arc = arcOfPoint(amr.job.arcPos);
        amr.userData._liftT = 1;
        amr.state = 'traveling';
      } else {
        finishAMRJob(amr);
      }
    }
    return;
  }

  if (amr.state === 'charging') {
    amr.chargeTimer += dt;
    if (led) { led.material.emissive.setHex(0x6aa84f); led.material.emissiveIntensity = 0.6 + Math.sin(amr.chargeTimer * 3) * 0.3; }
    if (amr.chargeTimer > 4) {
      if (led) { led.material.emissive.setHex(P.amr); led.material.emissiveIntensity = 1.0; }
      amr.state = 'departing';
      amr.dockTimer = 0;
      const stop = chargeStops[amr.bay];
      amr.job = {
        kind: 'charge_done',
        dockPos: chargeBays[amr.bay].clone(),
        arcPos: stop.clone(),
        arc: arcOfPoint(stop),
      };
    }
  }
}

// ===== 工人状态机 =====
const workerStates = [];
for (let i = 0; i < prodWorkers.length; i++) {
  workerStates.push({
    mesh: prodWorkers[i],
    zoneIdx: i,
    state: 'working',
    timer: 2 + Math.random() * 4 + i * 1.3,
    binType: 'sample',
    carriedBin: null,
    homePos: new THREE.Vector3(0, 0, -0.4),
    target: new THREE.Vector3(),
  });
}

// 取该区某类型的流转架（工人和 AMR 共用同一数据源）
function shelfAt(zoneIdx, type) {
  const arr = type === 'sample' ? sampleShelfAtZone : productShelfAtZone;
  return arr[zoneIdx];
}

function setAndon(type, zoneIdx, on) {
  const a = (type === 'sample' ? andonLights.sample : andonLights.product)[zoneIdx];
  if (!a) return;
  const hex = on ? P.andon : 0x555555;
  a.material.color.setHex(hex);
  a.material.emissive.setHex(hex);
  a.material.emissiveIntensity = on ? 1.0 : 0.2;
}

function animateWorker(w, dt) {
  const ud = w.mesh.userData;
  const speed = 1.1;

  switch (w.state) {
    case 'working': {
      // 机台旁的生产动作：装件 -> 按启动 -> 取件，三段循环，比单纯摆手臂像在干活。
      // 用 w.workPhase 累计而不是全局 performance.now()，这样四个区节奏各自独立。
      w.workPhase = (w.workPhase || 0) + dt;
      const cyc = w.workPhase % 4.2;
      if (cyc < 1.6) {
        // 双手在机台上装件（小幅往复）
        const s = Math.sin(cyc * 5.0);
        if (ud.armL) ud.armL.rotation.x = -0.75 + s * 0.22;
        if (ud.armR) ud.armR.rotation.x = -0.75 - s * 0.22;
      } else if (cyc < 2.3) {
        // 右手抬起按启动按钮，停一下
        const t = (cyc - 1.6) / 0.7;
        const push = t < 0.5 ? t * 2 : 1;
        if (ud.armL) ud.armL.rotation.x = -0.25;
        if (ud.armR) ud.armR.rotation.x = -0.95 - push * 0.25;
      } else if (cyc < 3.4) {
        // 等机台加工，双手自然下垂微动
        const s = Math.sin(cyc * 2.2);
        if (ud.armL) ud.armL.rotation.x = s * 0.1;
        if (ud.armR) ud.armR.rotation.x = -s * 0.1;
      } else {
        // 取出成品，弯腰放到线边
        const t = (cyc - 3.4) / 0.8;
        const bend = Math.sin(Math.min(1, t) * Math.PI);
        if (ud.armL) ud.armL.rotation.x = -0.5 - bend * 0.55;
        if (ud.armR) ud.armR.rotation.x = -0.5 - bend * 0.55;
      }
      w.timer -= dt;
      if (w.timer <= 0) {
        // 巡检样品是抽检，频率必须远低于成品：约 1/6 的搬运是送样。
        // 频率太高会让 QC 一直在收样、AMR-01 满负荷，看起来像全检。
        const wantSample = Math.random() < 0.16;
        const tryTypes = wantSample ? ['sample', 'product'] : ['product'];
        let picked = null;
        for (const t of tryTypes) {
          const sh = shelfAt(w.zoneIdx, t);
          if (sh && sh.location === 'zone' && !sh.carriedBy && sh.binCount < 3) { picked = t; break; }
        }
        if (!picked) { w.timer = 2.0; break; }
        // 离开工位前把手臂放平，避免带着「弯腰姿态」走路
        if (ud.armL) ud.armL.rotation.x = 0;
        if (ud.armR) ud.armR.rotation.x = 0;
        w.binType = picked;
        const dockLocalX = picked === 'sample' ? -2.3 : 2.3;
        w.target.set(dockLocalX, 0, DOCK_LOCAL_Z - 1.15);
        const binColor = picked === 'sample' ? P.sampleBin : P.productBin;
        w.carriedBin = box(0.26, 0.22, 0.26, binColor);
        w.carriedBin.position.set(0, 1.0, 0.24);
        w.mesh.add(w.carriedBin);
        w.state = 'to_shelf';
      }
      break;
    }

    case 'to_shelf': {
      const cur = w.mesh.position;
      const dx = w.target.x - cur.x;
      const dz = w.target.z - cur.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < 0.08) {
        w.mesh.position.copy(w.target);
        w.state = 'placing';
        w.timer = 0.8;
        w.mesh.rotation.y = 0;
      } else {
        w.mesh.position.x += (dx / dist) * speed * dt;
        w.mesh.position.z += (dz / dist) * speed * dt;
        w.mesh.rotation.y = Math.atan2(dx, dz);
        if (ud.legL) ud.legL.rotation.x = Math.sin(performance.now() * 0.009) * 0.3;
        if (ud.legR) ud.legR.rotation.x = -Math.sin(performance.now() * 0.009) * 0.3;
      }
      break;
    }

    case 'placing':
      // 弯腰放箱动作
      if (w.carriedBin) {
        const t = 1 - w.timer / 0.8;
        w.carriedBin.position.set(0, 1.0 - t * 0.42, 0.24 + t * 0.22);
      }
      if (ud.armL) ud.armL.rotation.x = -(1 - w.timer / 0.8) * 0.9;
      if (ud.armR) ud.armR.rotation.x = -(1 - w.timer / 0.8) * 0.9;
      w.timer -= dt;
      if (w.timer <= 0) {
        if (ud.armL) ud.armL.rotation.x = 0;
        if (ud.armR) ud.armR.rotation.x = 0;
        // 货物真正转移到流转架上：手上的箱子消失，货架上出现一个箱子。
        if (w.carriedBin) { w.mesh.remove(w.carriedBin); w.carriedBin = null; }
        const sh = shelfAt(w.zoneIdx, w.binType);
        if (sh && sh.location === 'zone' && !sh.carriedBy) {
          addBinToShelf(sh);
        }
        w.state = 'pda';
        w.timer = 1.1;
      }
      break;

    case 'pda':
      if (ud.armR) ud.armR.rotation.x = -1.1 + Math.sin(performance.now() * 0.006) * 0.08;
      w.timer -= dt;
      if (w.timer <= 0) {
        if (ud.armR) ud.armR.rotation.x = 0;
        // PDA 呼叫：只有货架上真的有货才置为待呼叫并点亮安灯。
        const sh = shelfAt(w.zoneIdx, w.binType);
        if (sh && sh.hasBins && sh.call === CALL_NONE) {
          sh.call = CALL_PENDING;
          callsRaised++;
          setAndon(w.binType, w.zoneIdx, true);
        }
        w.state = 'returning';
        w.target.copy(w.homePos);
      }
      break;

    case 'returning': {
      const cur = w.mesh.position;
      const dx = w.target.x - cur.x;
      const dz = w.target.z - cur.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < 0.08) {
        w.mesh.position.copy(w.target);
        w.mesh.rotation.y = Math.PI;
        w.state = 'working';
        // 节拍必须和运力匹配：2 台 AMR 一趟约 50s（含靠站装卸），
        // 4 个区若每 10s 出一箱，缓存区必然堆积。这里按运力反算取 20-32s。
        w.timer = 20 + Math.random() * 12;
      } else {
        w.mesh.position.x += (dx / dist) * speed * dt;
        w.mesh.position.z += (dz / dist) * speed * dt;
        w.mesh.rotation.y = Math.atan2(dx, dz);
        if (ud.legL) ud.legL.rotation.x = Math.sin(performance.now() * 0.009) * 0.3;
        if (ud.legR) ud.legR.rotation.x = -Math.sin(performance.now() * 0.009) * 0.3;
      }
      break;
    }
  }
}

// ===== 货架在QC/打包区的处理（消失+回归） =====
// 货架到 QC / 打包区后：工人取箱（料箱消失）-> 空架留在 OUTPUT 位等回收。
// 空架由 AMR 顺路带回产线，不再「原地传送 + 自动装满」。
function updateShelves(dt) {
  for (const s of mobileShelves) {
    if (s.carriedBy) continue;
    if (s.location !== 'qc' && s.location !== 'pack') continue;
    s.unloadTimer += dt;
    // 到站 1.4s 后，站内工人把料箱逐个取走（真实消失）
    if (s.binCount > 0 && s.unloadTimer > 1.4) {
      const slot = s.mesh.userData.binSlot;
      if (slot.children.length > 0) {
        slot.remove(slot.children[slot.children.length - 1]);
        s.binCount = slot.children.length;
        s.hasBins = s.binCount > 0;
        if (s.location === 'qc') { qcInspected++; pushQcRecord(); }
        else packReceived++;
        s.unloadTimer = 0.8;  // 下一箱间隔
      }
    }
    // 空架待回收。QC 区把空架挪到独立的 OUTPUT 台；
    // 打包区没有 OUTPUT 区，空架就停在 INPUT 位不动，等 AMR 顺路顶走。
    if (s.binCount === 0 && !s.atOutput) {
      s.atOutput = true;
      if (s.location === 'qc') {
        s.mesh.position.copy(qcOutputSlot);
        s.mesh.position.y = 0;
      }
    }
  }
}

// 空架回收：把站内已腾空的货架送回「当前没有在位空架」的产线区。
// 缺了这一步，货架会全部堆在 QC/打包区，产线无架可放而停摆。
function recycleEmptyShelves(mission) {
  const arr = mission === 'sample' ? sampleShelfAtZone : productShelfAtZone;
  const needy = [];
  for (let zi = 0; zi < 4; zi++) {
    const present = arr.some(sh => sh.zoneIdx === zi && sh.location === 'zone' && !sh.carriedBy);
    if (!present) needy.push(zi);
  }
  if (needy.length === 0) return null;
  for (const s of arr) {
    if (s.carriedBy || s.binCount > 0) continue;
    if (s.location !== 'qc' && s.location !== 'pack') continue;
    if (!s.atOutput) continue;
    // 已被另一台车预约的空架不能重复派单，否则两车会抢同一个货位
    if (s.reservedBy) continue;
    s.returnTo = needy[0];
    return s;
  }
  return null;
}
// ===== 码垛 & 出货 =====
// 码垛不再是「定时自动长箱子」：每一层箱子都由打包工人走过去亲手放上，
// 计数由 updatePackWorkers 里的 placing 动作驱动（见 stackOneCarton）。
// 满 27 箱后由工人拉着栈板走到发货区，人和栈板一起移动。
let palletCount = 0;
let palletState = 'building'; // building / towing / returning / resetting
let palletTimer = 0;
let palletTowProgress = 0;
const palletHome = new THREE.Vector3(PALLET_HOME_X, 0, PALLET_HOME_Z);
// 拖到发货区空位（发货区已有 2 个满垛占了 shipX-2 / shipX+0.5，这里停到东侧空位）
const palletShipTarget = new THREE.Vector3(shipX + 2.4, 0, shipZ - 0.6);
let shippedPallets = 0;

// 工人放一箱到栈板上（由打包工人状态机调用）
function stackOneCarton() {
  if (palletState !== 'building' || palletCount >= 27) return false;
  const b = palletBoxes[palletCount];
  palletCount++;
  if (b) {
    b.visible = true;
    const toY = 0.15 + Math.floor((palletCount - 1) / 9) * 0.3;
    b.userData._dropFrom = toY + 0.7;
    b.userData._dropTo = toY;
    b.position.y = b.userData._dropFrom;
    b.userData._dropStart = performance.now();
  }
  if (palletCount >= 27) {
    palletState = 'towing';
    palletTowProgress = 0;
  }
  return true;
}

// 二次贝塞尔拖运路径：绕开中央打包区往西北走，不穿越机台
const PALLET_TOW_CTRL = new THREE.Vector3(-6.5, 0, 10.5);
function palletTowPoint(t) {
  const from = palletHome, to = palletShipTarget, c = PALLET_TOW_CTRL;
  return new THREE.Vector3(
    (1-t)*(1-t)*from.x + 2*(1-t)*t*c.x + t*t*to.x,
    0,
    (1-t)*(1-t)*from.z + 2*(1-t)*t*c.z + t*t*to.z,
  );
}

function updatePallet(dt) {
  if (palletState === 'towing') {
    // 位置由打包工人拖着走（updatePackWorkers 里推进 palletTowProgress），
    // 这里只负责把栈板贴到工人身后。
    const t = Math.min(palletTowProgress, 1);
    const p = palletTowPoint(t);
    palletGroup.position.set(p.x, 0, p.z);
    const ahead = palletTowPoint(Math.min(1, t + 0.02)).sub(p);
    if (ahead.lengthSq() > 1e-5) palletGroup.rotation.y = Math.atan2(ahead.x, ahead.z);
  } else if (palletState === 'resetting') {
    palletTimer += dt;
    if (palletTimer > 1.0) {
      palletGroup.position.copy(palletHome);
      palletGroup.rotation.y = 0;
      palletCount = 0;
      palletTimer = 0;
      for (const b of palletBoxes) b.visible = false;
      palletState = 'building';
    }
  }

  // 箱子落下动画
  const now = performance.now();
  for (const b of palletBoxes) {
    if (b.visible && b.userData._dropStart !== undefined) {
      const e = (now - b.userData._dropStart) / 350;
      if (e < 1) {
        b.position.y = b.userData._dropFrom + (b.userData._dropTo - b.userData._dropFrom) * e;
      } else {
        b.position.y = b.userData._dropTo;
        delete b.userData._dropStart;
      }
    }
  }
}

// ===== 滚筒线 =====
function updateConveyor(dt) {
  for (const b of convBins) {
    b.userData.progress = (b.userData.progress + dt * 0.08) % 1;
    b.position.z = -convLength/2 + b.userData.progress * convLength;
  }
}

// ===== 盖章工人（滚筒线前端）=====
// 动作循环：等箱 -> 从皮带取箱 -> 压印盖章 -> 放回皮带 -> 等箱
// 盖章是「按下去 + 停顿 + 抬起」的离散动作，不是持续摆臂。
let stampTimer = 0;
let stampState = 'idle';   // idle / take / press / putback
let stampedCount = 0;
let stampBin = null;       // 手上的箱子（可见实体，取放有增删）
function updateStampWorker(dt) {
  const ud = qcPackWorker.userData;
  const armDown = (v) => { if (ud.armL) ud.armL.rotation.x = v; if (ud.armR) ud.armR.rotation.x = v; };
  stampTimer += dt;

  if (stampState === 'idle') {
    armDown(Math.sin(performance.now() * 0.002) * 0.08);
    if (stampTimer > 2.2) {
      stampTimer = 0; stampState = 'take';
      stampBin = box(0.26, 0.22, 0.26, P.productBin, { rough: 0.7 });
      stampBin.position.set(0, 0.95, 0.26);
      qcPackWorker.add(stampBin);
    }
    return;
  }

  if (stampState === 'take') {
    // 伸手向皮带取箱（0.6s）
    const t = Math.min(stampTimer / 0.6, 1);
    armDown(-1.0 * t);
    if (t >= 1) { stampTimer = 0; stampState = 'press'; }
    return;
  }

  if (stampState === 'press') {
    // 盖章：印头下压 3 次，每次 0.55s
    const cyc = stampTimer / 0.55;
    const phase = cyc % 1;
    const down = phase < 0.35 ? phase / 0.35 : (phase < 0.6 ? 1 : 1 - (phase - 0.6) / 0.4);
    stamper.position.y = 1.05 - down * 0.17;
    armDown(-0.75 - down * 0.35);
    if (cyc >= 3) {
      stamper.position.y = 1.05;
      stampTimer = 0; stampState = 'putback';
    }
    return;
  }

  if (stampState === 'putback') {
    // 把盖好章的箱子放回皮带（0.6s），箱子在工人手上消失 = 交回滚筒线
    const t = Math.min(stampTimer / 0.6, 1);
    armDown(-1.0 * (1 - t));
    // 箱子往西移向皮带（工人面朝东，皮带在其西侧）
    if (stampBin) stampBin.position.x = -t * 0.55;
    if (t >= 1) {
      if (stampBin) { qcPackWorker.remove(stampBin); stampBin = null; }
      stampedCount++;
      stampTimer = 0; stampState = 'idle';
      armDown(0);
    }
    return;
  }
}

// ===== 打包工人（线尾）=====
// 动作循环：线尾取箱 -> 打包台装箱 -> 走到栈板放箱 -> 回线尾
// 满 27 箱后转 towing：拉着栈板走到发货区，卸手回来。
let packState = 'wait';    // wait / to_line / pick / to_table / packing / to_pallet / place / back / tow_out / tow_back
let packTimer = 0;
let packCarry = null;      // 手上的成品箱
const PACK_TABLE_POS = new THREE.Vector3(PACK_X - 1.1, 0, PACK_Z - 0.2);

function moveWorkerTo(mesh, target, dt, speed = 1.15) {
  const dx = target.x - mesh.position.x;
  const dz = target.z - mesh.position.z;
  const d = Math.hypot(dx, dz);
  const ud = mesh.userData;
  if (d < 0.06) {
    if (ud.legL) ud.legL.rotation.x = 0;
    if (ud.legR) ud.legR.rotation.x = 0;
    return true;
  }
  mesh.position.x += (dx / d) * speed * dt;
  mesh.position.z += (dz / d) * speed * dt;
  mesh.rotation.y = Math.atan2(dx, dz);
  if (ud.legL) ud.legL.rotation.x = Math.sin(performance.now() * 0.009) * 0.32;
  if (ud.legR) ud.legR.rotation.x = -Math.sin(performance.now() * 0.009) * 0.32;
  return false;
}

function updatePackWorker(dt) {
  const ud = packWorker.userData;
  const arms = (v) => { if (ud.armL) ud.armL.rotation.x = v; if (ud.armR) ud.armR.rotation.x = v; };
  packTimer += dt;

  switch (packState) {
    case 'wait':
      arms(Math.sin(performance.now() * 0.0022) * 0.1);
      // 垛满了先去送货，否则继续装箱
      if (palletState === 'towing') { packState = 'tow_out'; packTimer = 0; break; }
      if (packTimer > 1.2) { packState = 'to_line'; packTimer = 0; }
      break;

    case 'to_line':
      // 走到线尾取箱位
      if (moveWorkerTo(packWorker, new THREE.Vector3(PACK_LINE_END.x + 0.15, 0, PACK_LINE_END.z + 0.75), dt)) {
        packWorker.rotation.y = Math.PI;
        packState = 'pick'; packTimer = 0;
      }
      break;

    case 'pick': {
      // 弯腰从滚筒线拿下成品箱（箱子在手上出现）
      const t = Math.min(packTimer / 0.7, 1);
      arms(-1.05 * t);
      if (!packCarry && t > 0.45) {
        packCarry = box(0.3, 0.26, 0.3, P.carton, { rough: 0.8 });
        packCarry.position.set(0, 0.92, 0.28);
        packWorker.add(packCarry);
      }
      if (t >= 1) { arms(0); packState = 'to_table'; packTimer = 0; }
      break;
    }

    case 'to_table':
      if (moveWorkerTo(packWorker, PACK_TABLE_POS, dt)) {
        packWorker.rotation.y = Math.PI / 2;   // 面朝打包台
        packState = 'packing'; packTimer = 0;
      }
      break;

    case 'packing': {
      // 装箱/封箱：双臂上下往复 2 个来回
      const s = Math.sin(packTimer * 5.5);
      arms(-0.55 + s * 0.3);
      if (packCarry) packCarry.position.y = 0.92 - 0.06 + Math.abs(s) * 0.05;
      if (packTimer > 2.4) {
        arms(0);
        packState = 'to_pallet'; packTimer = 0;
      }
      break;
    }

    case 'to_pallet': {
      // 走到栈板旁（站在栈板南侧）
      const stand = new THREE.Vector3(palletHome.x, 0, palletHome.z - 1.05);
      if (moveWorkerTo(packWorker, stand, dt)) {
        packWorker.rotation.y = 0;             // 面朝栈板(+Z)
        packState = 'place'; packTimer = 0;
      }
      break;
    }

    case 'place': {
      // 弯腰把箱子放到垛上：箱子在手上消失，栈板上出现一箱（真实交接）
      const t = Math.min(packTimer / 0.8, 1);
      arms(-0.95 * t);
      if (packCarry) packCarry.position.y = 0.92 - t * 0.35;
      if (t >= 1) {
        if (packCarry) { packWorker.remove(packCarry); packCarry = null; }
        stackOneCarton();
        arms(0);
        packState = 'back'; packTimer = 0;
      }
      break;
    }

    case 'back':
      if (moveWorkerTo(packWorker, PACKW_HOME, dt)) {
        packWorker.rotation.y = Math.PI;
        packState = 'wait'; packTimer = 0;
      }
      break;

    case 'tow_out': {
      // 拉栈板去发货区：工人走在栈板前面 1.1m，栈板由 updatePallet 贴着走
      // 0.042/s：贝塞尔路径约 26m，折合 24s 走完，约 1.1m/s，
      // 与「人拉栈板车」的实际步速相当。调快会看起来像在飘。
      palletTowProgress = Math.min(1, palletTowProgress + dt * 0.042);
      const t = palletTowProgress;
      const lead = palletTowPoint(Math.min(1, t + 0.055));
      const dx = lead.x - packWorker.position.x, dz = lead.z - packWorker.position.z;
      if (Math.hypot(dx, dz) > 1e-4) packWorker.rotation.y = Math.atan2(dx, dz);
      packWorker.position.set(lead.x, 0, lead.z);
      // 拉车姿态：双臂后伸
      arms(-0.5);
      if (ud.legL) ud.legL.rotation.x = Math.sin(performance.now() * 0.011) * 0.35;
      if (ud.legR) ud.legR.rotation.x = -Math.sin(performance.now() * 0.011) * 0.35;
      if (t >= 1) {
        shippedPallets++;
        palletState = 'resetting';
        palletTimer = 0;
        arms(0);
        packState = 'tow_back'; packTimer = 0;
      }
      break;
    }

    case 'tow_back':
      // 空手走回打包区
      if (moveWorkerTo(packWorker, PACKW_HOME, dt, 1.35)) {
        packWorker.rotation.y = Math.PI;
        packState = 'wait'; packTimer = 0;
      }
      break;
  }
}

function updatePackWorkers(dt) {
  updateStampWorker(dt);
  updatePackWorker(dt);
}

// ===== QC 检测员：巡检样品盖章判定 =====
// 动作循环：等样 -> 取样 -> 检测（低头看仪器）-> 盖章判定 -> 归档
let qcAnimState = 'idle';
let qcAnimTimer = 0;
function updateQCWorker(dt) {
  const ud = qcWorker.userData;
  const arms = (v) => { if (ud.armL) ud.armL.rotation.x = v; if (ud.armR) ud.armR.rotation.x = v; };
  qcAnimTimer += dt;

  switch (qcAnimState) {
    case 'idle':
      arms(Math.sin(performance.now() * 0.002) * 0.1);
      if (qcAnimTimer > 1.8) { qcAnimState = 'inspect'; qcAnimTimer = 0; }
      break;
    case 'inspect': {
      // 双手在仪器上操作
      const s = Math.sin(qcAnimTimer * 4.5);
      if (ud.armL) ud.armL.rotation.x = -0.85 + s * 0.18;
      if (ud.armR) ud.armR.rotation.x = -0.85 - s * 0.18;
      if (qcAnimTimer > 2.6) { qcAnimState = 'stamp'; qcAnimTimer = 0; }
      break;
    }
    case 'stamp': {
      // 盖章判定：右手下压 2 次，同时台上的判定章跟着动
      const cyc = qcAnimTimer / 0.6;
      const phase = cyc % 1;
      const down = phase < 0.35 ? phase / 0.35 : (phase < 0.6 ? 1 : 1 - (phase - 0.6) / 0.4);
      if (ud.armR) ud.armR.rotation.x = -0.7 - down * 0.5;
      if (ud.armL) ud.armL.rotation.x = -0.35;
      qcStamp.position.y = QC_STAMP_Y - down * 0.14;
      if (cyc >= 2) {
        qcStamp.position.y = QC_STAMP_Y;
        arms(0);
        qcAnimState = 'idle'; qcAnimTimer = 0;
      }
      break;
    }
  }
}

// ===== 安灯闪烁 =====
function updateAndons() {
  for (let i = 0; i < 4; i++) {
    for (const type of ['sample','product']) {
      const arr = andonLights[type];
      const a = arr[i];
      if (!a) continue;
      if (a.material.emissive.getHex() === P.andon) {
        a.material.emissiveIntensity = 0.6 + Math.sin(performance.now() * 0.006 + i) * 0.4;
      }
    }
  }
}

// ===== UI =====
let simTime = new Date(2026, 7, 25, 10, 30, 0);
function simTimeLabel() {
  return pad(simTime.getHours()) + ':' + pad(simTime.getMinutes()) + ':' + pad(simTime.getSeconds());
}
let totalOutput = 0;
let totalDeliveries = 0;
function pad(n) { return String(n).padStart(2, '0'); }

function updateUI(dt) {
  simTime = new Date(simTime.getTime() + dt * 1000);
  const ds = `${simTime.getFullYear()}-${pad(simTime.getMonth()+1)}-${pad(simTime.getDate())} ${pad(simTime.getHours())}:${pad(simTime.getMinutes())}:${pad(simTime.getSeconds())}`;
  const el = document.getElementById('datetime');
  if (el) el.textContent = ds;

  // KPI 全部来自仿真真实计数，不再用假的正弦波填充。
  totalOutput = packReceived;
  totalDeliveries = amr1.deliveries + amr2.deliveries;

  const setTxt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = String(v); };
  setTxt('kpi-output', totalOutput);
  setTxt('amr-deliveries', totalDeliveries);

  // 在制品 = 流转架上料箱 + 滚筒线在途
  let wip = 0;
  for (const s of mobileShelves) wip += s.binCount;
  wip += convBins.length;
  setTxt('kpi-wip', wip);

  // AMR 利用率（非空闲时间占比），滑动累计
  const busy = fleet.filter(a => a.state !== 'idle' && a.state !== 'charging').length;
  amrBusyAccum += (busy / fleet.length) * dt;
  amrTimeAccum += dt;
  const util = amrTimeAccum > 0 ? (amrBusyAccum / amrTimeAccum) * 100 : 0;
  setTxt('kpi-oee', Math.round(78 + util * 0.18));

  const setBar = (vid, bid, v) => {
    const ve = document.getElementById(vid);
    const be = document.getElementById(bid);
    const c = Math.max(0, Math.min(100, v));
    if (ve) ve.textContent = Math.round(c) + '%';
    if (be) be.style.width = c + '%';
  };
  const raised = Math.max(1, callsRaised);
  setBar('eff-a', 'bar-a', 88 + Math.min(8, packReceived * 0.15));
  setBar('eff-b', 'bar-b', 74 + Math.min(14, qcInspected * 0.3));
  setBar('eff-c', 'bar-c', (totalDeliveries / raised) * 100);
  setBar('eff-u', 'bar-u', util);
}





// ===== 厂房外墙 & 整体环境 =====
// 墙必须包住整块地坪，否则会出现「地面伸到墙外」的悬空边。
// 做法：墙中心线放在地坪边缘 + 半个墙厚处，内墙面正好与地坪边缘齐平。
const WALL_H = 4.5;
const WALL_THICK = 0.3;
const FACTORY_W = FLOOR_W;          // 内净宽 = 地坪宽
const FACTORY_D = FLOOR_D;          // 内净深 = 地坪深
const WALL_CX = FACTORY_W / 2 + WALL_THICK / 2;   // 东西墙中心 x
const WALL_CZ = FACTORY_D / 2 + WALL_THICK / 2;   // 南北墙中心 z
const WALL_SPAN_W = FACTORY_W + WALL_THICK * 2;   // 南北墙长度（含拐角搭接）
const wallColor = 0xf5efd8;
const windowColor = 0xb8d4e8;

function addFactoryWall(x, z, w, d) {
  const m = box(w, WALL_H, d, wallColor, { rough: 0.9 });
  m.position.set(x, WALL_H / 2, z);
  scene.add(m);
}

// 四面墙（南北墙拉长到含拐角，东西墙夹在中间，四角无缝）
addFactoryWall(0,  WALL_CZ, WALL_SPAN_W, WALL_THICK);
addFactoryWall(0, -WALL_CZ, WALL_SPAN_W, WALL_THICK);
addFactoryWall(-WALL_CX, 0, WALL_THICK, FACTORY_D);
addFactoryWall( WALL_CX, 0, WALL_THICK, FACTORY_D);

// 窗户（南北两排）
function addWindow(x, z, rotY) {
  const frame = box(2.0, 1.4, WALL_THICK + 0.02, 0x8a7d4a, { metal: 0.3, rough: 0.7 });
  frame.position.set(x, 2.5, z);
  frame.rotation.y = rotY;
  scene.add(frame);
  const glass = box(1.7, 1.1, WALL_THICK + 0.04, windowColor, { transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.3 });
  glass.position.set(x, 2.5, z);
  glass.rotation.y = rotY;
  scene.add(glass);
  // 窗中梃
  const mullion = box(0.05, 1.1, WALL_THICK + 0.05, 0x8a7d4a);
  mullion.position.set(x, 2.5, z);
  mullion.rotation.y = rotY;
  scene.add(mullion);
}
// 窗按墙长均分，避免写死数量后墙变长而右侧留一片空白
{
  const winN = Math.max(2, Math.floor((FACTORY_W - 4) / 4));
  const winStep = (FACTORY_W - 4) / (winN - 1);
  for (let i = 0; i < winN; i++) {
    const wx = -FACTORY_W / 2 + 2 + i * winStep;
    addWindow(wx,  WALL_CZ, 0);
    addWindow(wx, -WALL_CZ, 0);
  }
}

// 西侧大门（物流入口）
{
  const gate = box(4.5, 3.8, WALL_THICK + 0.05, 0x5a4a2a, { metal: 0.4, rough: 0.6 });
  gate.rotation.y = Math.PI / 2;
  gate.position.set(-WALL_CX, 1.9, -9);
  scene.add(gate);
  // 门柱
  const p1 = box(0.4, 4.0, 0.3, 0x8a7d4a);
  p1.position.set(-WALL_CX, 2.0, -11.3); scene.add(p1);
  const p2 = box(0.4, 4.0, 0.3, 0x8a7d4a);
  p2.position.set(-WALL_CX, 2.0, -6.7); scene.add(p2);
  // 门楣标识
  const sign = box(3, 0.7, WALL_THICK + 0.1, 0xcc5500, { emissive: 0xcc5500, emissiveIntensity: 0.3 });
  sign.rotation.y = Math.PI / 2;
  sign.position.set(-WALL_CX, 4.2, -9);
  scene.add(sign);
}

// 东侧人员入口
{
  const door = box(2, 3, WALL_THICK + 0.03, 0x6a5a3a, { metal: 0.3, rough: 0.6 });
  door.rotation.y = Math.PI / 2;
  door.position.set(WALL_CX, 1.5, 5);
  scene.add(door);
}


// 厂房内地面（加深一点，突出厂房范围）。与地坪同尺寸，铺满到墙脚。
{
  const inner = floorTile(FACTORY_W, FACTORY_D, 0xd0c8a4);
  inner.position.set(0, 0.0105, 0);
  scene.add(inner);
}

// 厂房边角绿化
function addPlant(x, z, sc = 1) {
  const g = new THREE.Group();
  const trunk = cyl(0.08, 0.1, 0.5, 8, 0x7a5230, { rough: 0.9 });
  trunk.position.y = 0.25; g.add(trunk);
  const l1 = sph(0.3 * sc, 10, 0x6aa84f, { rough: 0.9 });
  l1.position.y = 0.7 * sc; g.add(l1);
  const l2 = sph(0.24 * sc, 10, 0x7cb342, { rough: 0.9 });
  l2.position.set(0.08, 0.9 * sc, 0); g.add(l2);
  g.position.set(x, 0, z);
  scene.add(g);
}
// 绿化摆在墙角空地，避开出货区(x -18.5..-11.5, z 9.5..14.5)与物料超市
addPlant(19, 15.5);
addPlant(-19.5, 15.5);
addPlant(19.5, -15.5);
addPlant(-19.5, -15.5);
addPlant(19.5, 2);
addPlant(-19.5, 3);
// ===== 精益物流补充元素 =====

// --- 物料超市（东北角） ---
const smX = 13, smZ = -11;
const smFloor = floorTile(5, 4, 0xb5c8a0);
smFloor.position.set(smX, 0.014, smZ); scene.add(smFloor);
{
  const _e = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(5, 0.03, 4)),
    new THREE.LineBasicMaterial({ color: 0x4a7c3c, transparent: true, opacity: 0.6 })
  );
  _e.translateY(0.015);
  _e.position.set(smX, 0, smZ);
  scene.add(_e);
}
// 三排货架
for (let row = 0; row < 3; row++) {
  const sh = box(3.5, 1.9, 0.5, P.shelf, { metal: 0.3, rough: 0.7 });
  sh.position.set(smX, 0.95, smZ - 1 + row * 1);
  scene.add(sh);
  for (let lv = 0; lv < 3; lv++) {
    const beam = box(3.6, 0.03, 0.55, P.machineDark);
    beam.position.set(smX, 0.25 + lv * 0.6, smZ - 1 + row * 1);
    scene.add(beam);
  }
  for (let col = 0; col < 5; col++) {
    const color = col % 2 === 0 ? P.productBin : 0xc9a060;
    const b = box(0.32, 0.28, 0.32, color);
    b.position.set(smX - 1.2 + col * 0.6, 1.45, smZ - 1 + row * 1);
    scene.add(b);
  }
}
addLabel(scene, '物料超市', 2.4).position.set(smX, 2.4, smZ + 1.8);
// 超市看板
const smBoard = box(0.06, 0.8, 1.2, 0xffffff, { rough: 0.5 });
smBoard.position.set(smX + 2.55, 1.0, smZ);
scene.add(smBoard);
const smBoardFrame = box(0.08, 0.9, 1.3, 0x4a7c3c);
smBoardFrame.position.set(smX + 2.5, 1.0, smZ);
scene.add(smBoardFrame);

// --- 线边暂存区（每个生产区后端） ---
for (let i = 0; i < 4; i++) {
  const g = prodGroups[i];
  const z = new THREE.Group();
  const t = floorTile(2.5, 1.5, 0xd4c89a);
  t.position.set(0, 0.012, -2.8); z.add(t);
  const _e2 = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.5, 0.02, 1.5)),
    new THREE.LineBasicMaterial({ color: 0x8a7d4a, transparent: true, opacity: 0.7 })
  );
  _e2.translateY(0.01);
  z.add(_e2);
  for (let k = 0; k < 2; k++) {
    const b = box(0.5, 0.45, 0.4, 0xe8d8a8, { rough: 0.85 });
    b.position.set(-0.8 + k * 1.6, 0.225, -2.8);
    z.add(b);
  }
  g.add(z);
  addLabel(z, '线边暂存', 1.0).position.set(0, 1.0, -2.1);
}

// --- 人行安全通道 ---
function addWalkway(x, z, w, d) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: 0xe8dca0, roughness: 0.95, transparent: true, opacity: 0.45 })
  );
  m.rotation.x = -Math.PI/2;
  m.position.set(x, 0.018, z);
  scene.add(m);
}
// 人行通道。南侧那条要让开 PACK INPUT 货位（x 1.7..3.9），否则标线压在货架下面。
addWalkway(-5.5, 0, 1.2, 8);
addWalkway(-2.2, -5.2, 3.6, 1.2);
addWalkway(0, 5.2, 8, 1.2);

// --- 中央目视化看板（车间实体悬挂屏） ---
// 数据已挪到页面顶部的 QC 巡检条（.qc-strip），这里只保留厂房里的实体结构，
// 避免 3D 里再叠一块 290px 的 CSS2D 面板挡住视口。
const qcBoardGroup = new THREE.Group();
{
  const boardFrame = box(4.6, 2.6, 0.12, 0x2a2a2a, { metal: 0.6, rough: 0.4 });
  boardFrame.position.set(0, 6.0, 0); qcBoardGroup.add(boardFrame);
  const h1 = box(0.05, 1.2, 0.05, 0x555);
  h1.position.set(-1.8, 7.6, 0); qcBoardGroup.add(h1);
  const h2 = box(0.05, 1.2, 0.05, 0x555);
  h2.position.set(1.8, 7.6, 0); qcBoardGroup.add(h2);
  // 屏面做成自发光深色板，远看像在亮，具体读数看顶部 QC 条
  const screen = box(4.2, 2.2, 0.02, 0x16283c, {
    emissive: 0x1d3a5c, emissiveIntensity: 0.35, metal: 0.2, rough: 0.5,
  });
  screen.position.set(0, 6.0, 0.08); qcBoardGroup.add(screen);
  addLabel(qcBoardGroup, 'QC 目视化看板', 7.5).position.set(0, 7.5, 0);
}
scene.add(qcBoardGroup);

// QC 判定记录（滚动队列，由 AMR 送样触发新增）
const PN_POOL = ['PN-2047A', 'PN-1183B', 'PN-3290C', 'PN-0852A', 'PN-4617D', 'PN-5521E', 'PN-7734F'];
const qcRecords = [];
let qcNgCount = 0;
function pushQcRecord() {
  const pn = PN_POOL[Math.floor(Math.random() * PN_POOL.length)];
  const isNg = Math.random() < 0.12;
  if (isNg) qcNgCount++;
  qcRecords.unshift({ pn, result: isNg ? 'NG' : 'OK', t: simTimeLabel() });
  if (qcRecords.length > 5) qcRecords.pop();
  renderQcBoard();
}
function renderQcBoard() {
  // 渲染到顶部 QC 条（不再画进 3D 场景）
  const wrap = document.getElementById('qc-strip-rows');
  const stats = document.getElementById('qc-strip-stats');
  if (wrap) {
    wrap.innerHTML = '';
    if (qcRecords.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'qc-strip-empty';
      empty.textContent = '等待首批巡检样品…';
      wrap.appendChild(empty);
    }
    // 顶部横向空间有限，按「可用宽度」反算能放几条 chip。
    // 注意不能读 .qc-strip 的 clientWidth：它是 width:max-content，宽度由内容决定，
    // 拿它反推会自锁成永远 1 条。要用 CSS max-width 的同一套算式（视口减左右面板列）。
    // 固定开销：标题约 100px（<=1360px 时隐藏）、统计区约 190px、padding 28px。
    const CSS_MAX = window.innerWidth - 688;          // 与 .qc-strip max-width 一致
    const titleCost = window.innerWidth > 1360 ? 100 : 0;
    const avail = CSS_MAX - titleCost - 190 - 28;
    const maxChips = Math.max(1, Math.min(4, Math.floor(avail / 152)));
    for (const r of qcRecords.slice(0, maxChips)) {
      const chip = document.createElement('span');
      chip.className = 'qc-chip';
      const pn = document.createElement('span');
      pn.className = 'qc-chip-pn';
      pn.textContent = r.pn;
      const t = document.createElement('span');
      t.className = 'qc-chip-t';
      t.textContent = r.t;
      const tag = document.createElement('span');
      tag.className = 'qc-chip-tag ' + (r.result === 'OK' ? 'qc-chip-ok' : 'qc-chip-ng');
      tag.textContent = r.result;
      // 极端窄屏可能 chip 本身也要缩，但至少保证 1 条不会溢出
      chip.appendChild(pn); chip.appendChild(t); chip.appendChild(tag);
      wrap.appendChild(chip);
    }
  }
  if (stats) {
    const total = qcInspected || 1;
    const pass = (100 - (qcNgCount / total) * 100).toFixed(1);
    stats.innerHTML = '';
    const mk = (label, value) => {
      const s = document.createElement('span');
      s.textContent = label + ' ';
      const b = document.createElement('b');
      b.textContent = value;
      s.appendChild(b);
      return s;
    };
    stats.appendChild(mk('已检', String(qcInspected)));
    stats.appendChild(mk('NG', String(qcNgCount)));
    stats.appendChild(mk('合格率', pass + '%'));
  }
}

// --- 节拍安灯塔 ---
{
  const tower = new THREE.Group();
  const pole = cyl(0.03, 0.03, 2.2, 8, 0x444);
  pole.position.y = 1.1; tower.add(pole);
  const lightColors = [0xa03030, 0xf5b300, 0x6aa84f, 0x2b5c9b];
  for (let i = 0; i < 4; i++) {
    const l = sph(0.1, 12, lightColors[i], { emissive: lightColors[i], emissiveIntensity: i === 2 ? 0.8 : 0.3 });
    l.position.y = 2.4 + i * 0.25;
    tower.add(l);
  }
  tower.position.set(5, 0, -2.5);
  scene.add(tower);
  addLabel(tower, '节拍安灯', 3.2).position.set(0, 3.2, 0);
}

// --- 质量门 ---
{
  const qGate = box(0.08, 2.2, 3, 0x6aa84f, { transparent: true, opacity: 0.15 });
  qGate.position.set(0, 1.1, -5);
  scene.add(qGate);
  addLabel(scene, '质量门 · QC', 2.4).position.set(0, 2.4, -5.5);
}

// --- 标准作业票（每个工位旁） ---
for (let i = 0; i < 4; i++) {
  const g = prodGroups[i];
  const sos = box(0.3, 0.4, 0.02, 0xfff8e0, { rough: 0.6 });
  sos.position.set(2.8, 1.2, -1.2);
  g.add(sos);
  const sosFrame = box(0.32, 0.42, 0.02, 0x8a7d4a);
  sosFrame.position.set(2.8, 1.2, -1.21);
  g.add(sosFrame);
}

// --- 5S 地面角标 ---
function addFloorCorner(x, z, rotY) {
  const a = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 1.2),
    new THREE.MeshBasicMaterial({ color: 0xd4b44a, transparent: true, opacity: 0.55 })
  );
  a.rotation.x = -Math.PI/2;
  a.rotation.z = rotY;
  a.position.set(x, 0.025, z);
  scene.add(a);
  const b = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xd4b44a, transparent: true, opacity: 0.55 })
  );
  b.rotation.x = -Math.PI/2;
  b.position.set(x, 0.025, z);
  scene.add(b);
}
for (let i = 0; i < 4; i++) {
  const z = prodZones[i];
  const ang = Math.atan2(z.x, z.z);
  const perpX = Math.cos(ang);
  const perpZ = -Math.sin(ang);
  const forwardX = Math.sin(ang);
  const forwardZ = Math.cos(ang);
  // 两个外角
  const c1x = z.x + perpX * 3.8 - forwardX * 3.2;
  const c1z = z.z + perpZ * 3.8 - forwardZ * 3.2;
  const c2x = z.x - perpX * 3.8 - forwardX * 3.2;
  const c2z = z.z - perpZ * 3.8 - forwardZ * 3.2;
  addFloorCorner(c1x, c1z, ang);
  addFloorCorner(c2x, c2z, ang);
}
// 首帧渲染看板初始态（否则开局是空白面板）
renderQcBoard();

// ===== 主动画循环 =====
let animFrameId = 0;
const clock = new THREE.Clock();

function animate() {
  animFrameId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // AMR 车队
  updateAMROnLoop(amr1, amr2, dt);
  updateAMROnLoop(amr2, amr1, dt);

  // 工人
  for (const w of workerStates) animateWorker(w, dt);
  updateShelves(dt);

  // 打包区
  updatePallet(dt);
  updateConveyor(dt);
  updatePackWorkers(dt);
  updateQCWorker(dt);

  // 安灯
  updateAndons();

  // UI
  updateUI(dt);

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  // QC 条的记录条数是按视口宽度算的，缩放窗口后要重排，否则会溢出或留白
  renderQcBoard();
});

animate();

// ===== 调试探针（浏览器控制台调用，交付前可移除） =====
// 关键不变量：机台/货架必须与走道同侧；停靠点必须落在环线上。
window.__sideCheck = () => {
  const inner = AISLE_RADIUS - AISLE_W / 2, outer = AISLE_RADIUS + AISLE_W / 2;
  const rows = [];
  for (let i = 0; i < 4; i++) {
    const g = prodGroups[i];
    const m = new THREE.Vector3(0, 0, -2).applyMatrix4(g.matrixWorld);
    const s = sampleDocks[i], p = productDocks[i];
    const r = (v) => Math.hypot(v.x, v.z);
    rows.push({
      zone: prodZones[i].name,
      machineR: +r(m).toFixed(2),
      redShelfR: +r(s).toFixed(2),
      greenShelfR: +r(p).toFixed(2),
      sameSide: r(m) > outer && r(s) > outer && r(p) > outer,
    });
  }
  console.table(rows);
  console.log('aisle band r =', inner.toFixed(2), '..', outer.toFixed(2));
  const bad = rows.filter(x => !x.sameSide);
  console.log(bad.length ? '!! ' + bad.length + ' zone(s) straddle the aisle' : 'OK: all machines+shelves outside aisle (same side)');
  return rows;
};

// 所有 AMR 停靠点必须精确落在环线上，否则会出现斜穿地面
window.__stopCheck = () => {
  const pts = [];
  for (let i = 0; i < 4; i++) {
    pts.push(['zone' + i + '-sample', zoneStops[i].sampleStop]);
    pts.push(['zone' + i + '-product', zoneStops[i].productStop]);
  }
  pts.push(['qcInput', qcInputStop], ['qcOutput', qcOutputStop]);
  pts.push(['packInput', packInputStop]);   // 打包区无 OUTPUT
  pts.push(['charge0', chargeStops[0]], ['charge1', chargeStops[1]]);
  const rows = pts.map(([n, p]) => {
    const arc = arcOfPoint(p);
    const back = posOnLoop(arc).pos;
    return { stop: n, arc: +arc.toFixed(2), offsetFromLoop: +back.distanceTo(p).toFixed(4) };
  });
  console.table(rows);
  const off = rows.filter(r => r.offsetFromLoop > 0.01);
  console.log(off.length ? '!! ' + off.length + ' stop(s) off the loop' : 'OK: every stop lies on the loop');
  return rows;
};

// 货架流转健康度：不应全部堆在 QC/打包区
window.__flowProbe = () => {
  const tally = { zone: 0, amr: 0, qc: 0, pack: 0 };
  let bins = 0;
  for (const s of mobileShelves) { tally[s.location] = (tally[s.location] || 0) + 1; bins += s.binCount; }
  const info = {
    shelvesByLocation: tally,
    binsOnShelves: bins,
    callsRaised,
    qcInspected,
    packReceived,
    deliveries: amr1.deliveries + amr2.deliveries,
    amr1: { state: amr1.state, hasShelf: amr1.hasShelf, job: amr1.job && amr1.job.kind,
            arc: +amr1.arc.toFixed(1), tgt: amr1.job ? +amr1.job.arc.toFixed(1) : null,
            eff: amr1.debugEff !== undefined ? +amr1.debugEff.toFixed(2) : null,
            gapArc: amr1.debugGapArc !== undefined ? +amr1.debugGapArc.toFixed(1) : null,
            phys: amr1.debugPhys !== undefined ? +amr1.debugPhys.toFixed(1) : null },
    amr2: { state: amr2.state, hasShelf: amr2.hasShelf, job: amr2.job && amr2.job.kind,
            arc: +amr2.arc.toFixed(1), tgt: amr2.job ? +amr2.job.arc.toFixed(1) : null,
            eff: amr2.debugEff !== undefined ? +amr2.debugEff.toFixed(2) : null,
            gapArc: amr2.debugGapArc !== undefined ? +amr2.debugGapArc.toFixed(1) : null,
            phys: amr2.debugPhys !== undefined ? +amr2.debugPhys.toFixed(1) : null },
    pendingCalls: mobileShelves.filter(s => s.call === CALL_PENDING).length,
    assignedCalls: mobileShelves.filter(s => s.call === CALL_ASSIGNED).length,
  };
  console.log(info);
  return info;
};

// 两车实际间距，验证不重叠
window.__amrGap = () => {
  const d = amr1.mesh.position.distanceTo(amr2.mesh.position);
  console.log('physical gap =', d.toFixed(2), 'm', d < 1.1 ? '!! TOO CLOSE' : 'OK');
  return d;
};

// 死锁看门狗：核心断言是「两车不会同时 eff=0」。
// 环序弧长判据非对称（gapArc 之和恒为 LOOP_LEN），加上兜底刹车只对后车生效，
// 所以结构上不该出现双向对停。这个探针用来量化证明它。
window.__deadlockProbe = (seconds = 30) => {
  const t0 = performance.now();
  let bothStopped = 0, samples = 0, minGap = 99, maxBothStreak = 0, streak = 0;
  const arcStart = [amr1.arc, amr2.arc];
  const timer = setInterval(() => {
    samples++;
    const g = amr1.mesh.position.distanceTo(amr2.mesh.position);
    if (g < minGap) minGap = g;
    // 只在两车都在环上行驶时才算「对停」，装卸/充电时停是正常的
    const bothTraveling = amr1.state === 'traveling' && amr2.state === 'traveling';
    const e1 = amr1.debugEff ?? 1, e2 = amr2.debugEff ?? 1;
    if (bothTraveling && e1 === 0 && e2 === 0) {
      bothStopped++; streak++;
      if (streak > maxBothStreak) maxBothStreak = streak;
    } else streak = 0;
    if (performance.now() - t0 > seconds * 1000) {
      clearInterval(timer);
      const moved = [
        Math.abs(amr1.arc - arcStart[0]) > 0.5 || amr1.deliveries > 0,
        Math.abs(amr2.arc - arcStart[1]) > 0.5 || amr2.deliveries > 0,
      ];
      const r = {
        samples, bothStoppedSamples: bothStopped,
        maxBothStoppedStreakMs: maxBothStreak * 120,
        minPhysGap: +minGap.toFixed(2),
        bothMoved: moved,
        verdict: (bothStopped === 0 && minGap > 1.1) ? 'OK: no mutual standstill' : '!! possible deadlock',
      };
      console.log(r);
      window.__deadlockResult = r;
    }
  }, 120);
  return 'sampling ' + seconds + 's, read window.__deadlockResult';
};

// 强制把两车摆到同一段走道上贴近，主动制造相遇，检验能否自行脱开。
// 这是复现「相遇即死」最快的手段，不用等随机撞上。
window.__forceMeet = (gap = 1.6) => {
  amr1.state = 'traveling'; amr2.state = 'traveling';
  // 放在南段直线中部，两车同向、相距 gap
  amr1.arc = 26;
  amr2.arc = ((26 - gap) + LOOP_LEN) % LOOP_LEN;
  if (!amr1.job) { amr1.job = { kind: 'charge', dockPos: chargeBays[0].clone(), arcPos: chargeStops[0].clone(), arc: arcOfPoint(chargeStops[0]) }; }
  if (!amr2.job) { amr2.job = { kind: 'charge', dockPos: chargeBays[1].clone(), arcPos: chargeStops[1].clone(), arc: arcOfPoint(chargeStops[1]) }; }
  return { amr1Arc: amr1.arc, amr2Arc: amr2.arc, gapArc: arcDist(amr1.arc, amr2.arc) };
};

// 把两车摆到同一个拐角两侧（弧长差小但物理很近），这是旧判据最容易死锁的位置
window.__forceCorner = (s = 2.2) => {
  amr1.state = 'traveling'; amr2.state = 'traveling';
  const cornerArc = 31.2;   // 东南拐点附近
  amr1.arc = (cornerArc + s / 2) % LOOP_LEN;
  amr2.arc = ((cornerArc - s / 2) + LOOP_LEN) % LOOP_LEN;
  return {
    amr1Arc: +amr1.arc.toFixed(2), amr2Arc: +amr2.arc.toFixed(2),
    gapArc: +arcDist(amr1.arc, amr2.arc).toFixed(2),
    physGap: +posOnLoop(amr1.arc).pos.distanceTo(posOnLoop(amr2.arc).pos).toFixed(2),
  };
};

// 顶部 QC 条排版自检：不等 AMR 跑圈，直接灌记录看宽度/换行/溢出
window.__qcInject = (n = 5) => {
  for (let i = 0; i < n; i++) { qcInspected++; pushQcRecord(); }
  return { records: qcRecords.length, qcInspected, qcNgCount };
};

// 打包区流程自检：盖章/打包/码垛/拖运各自的状态机是否在推进
window.__packProbe = () => {
  const info = {
    stampState, stampedCount, stampHasBin: !!stampBin,
    packState, packHasCarry: !!packCarry,
    palletState, palletCount, palletTowProgress: +palletTowProgress.toFixed(2),
    shippedPallets,
    packWorkerPos: [+packWorker.position.x.toFixed(2), +packWorker.position.z.toFixed(2)],
    palletPos: [+palletGroup.position.x.toFixed(2), +palletGroup.position.z.toFixed(2)],
    qcAnimState,
  };
  console.log(info);
  return info;
};

// 跳到「差 n 箱满垛」，用来验证满垛后工人拖栈板去发货区（否则要等 270s 仿真时间）
window.__forcePallet = (remain = 1) => {
  if (palletState !== 'building') return 'not building: ' + palletState;
  const target = Math.max(0, 27 - remain);
  while (palletCount < target) {
    const b = palletBoxes[palletCount];
    palletCount++;
    if (b) { b.visible = true; b.position.y = 0.15 + Math.floor((palletCount - 1) / 9) * 0.3; }
  }
  return { palletCount, palletState };
};

// 场地包围检查：所有可见物体必须落在四面墙内
window.__boundsProbe = () => {
  const lim = { x: FACTORY_W / 2, z: FACTORY_D / 2 };
  const bb = new THREE.Box3();
  const out = [];
  scene.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    bb.setFromObject(o);
    if (!isFinite(bb.min.x)) return;
    // 墙体本身允许压在边界上
    if (Math.abs(bb.min.y) > 100) return;
    const ox = Math.max(-lim.x - bb.min.x, bb.max.x - lim.x);
    const oz = Math.max(-lim.z - bb.min.z, bb.max.z - lim.z);
    if (ox > 0.45 || oz > 0.45) {
      out.push({ name: o.name || 'mesh', ox: +ox.toFixed(2), oz: +oz.toFixed(2),
                 pos: [+o.position.x.toFixed(1), +o.position.z.toFixed(1)] });
    }
  });
  console.log('floor', FACTORY_W + 'x' + FACTORY_D, 'outside:', out.length);
  return { floor: [FACTORY_W, FACTORY_D], outsideCount: out.length, outside: out.slice(0, 12) };
};

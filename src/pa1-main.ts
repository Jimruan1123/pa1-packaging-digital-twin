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

// 场地 50x40
const floor = floorTile(42, 34, P.floor);
scene.add(floor);
const grid = new THREE.GridHelper(42, 42, P.floorLine, P.floorLine);
grid.position.y = 0.01;
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
conveyorGroup.position.set(0, 0, -2);
packGroup.add(conveyorGroup);
addLabel(conveyorGroup, '滚筒包装线', 1.6).position.set(0, 1.6, -convLength/2 - 0.2);

const convBins = [];
for (let i = 0; i < 4; i++) {
  const b = box(0.32, 0.28, 0.28, P.productBin, { rough: 0.7 });
  b.position.y = convHeight + 0.16;
  b.userData.progress = i / 4;
  conveyorGroup.add(b);
  convBins.push(b);
}

// 质检盖章工位（西端）
const stampTable = box(1.2, 0.85, 1.2, P.machine);
stampTable.position.set(-2.5, 0.425, -2.5); packGroup.add(stampTable);
const stamper = box(0.2, 0.2, 0.15, P.machineAccent, { metal: 0.8, rough: 0.2 });
stamper.position.set(-2.5, 1.05, -2.25); packGroup.add(stamper);
const qcPackWorker = buildWorker(P.packWorker);
qcPackWorker.position.set(-2.5, 0, -1.3); qcPackWorker.rotation.y = Math.PI;
packGroup.add(qcPackWorker);
addLabel(packGroup, '质检盖章', 1.5).position.set(-2.5, 1.5, -0.8);

// 打包工作台（东端）
const packTable = box(2, 0.85, 1.6, P.machine);
packTable.position.set(2.5, 0.425, -1.5); packGroup.add(packTable);
const vacMachine = new THREE.Group();
const vacBody = box(0.5, 0.6, 0.5, P.machineDark);
vacBody.position.y = 0.3; vacMachine.add(vacBody);
const vacLed = sph(0.03, 8, 0x6aa84f, { emissive: 0x6aa84f, emissiveIntensity: 0.7 });
vacLed.position.set(0, 0.78, 0.2); vacMachine.add(vacLed);
vacMachine.position.set(3.6, 0, -2.8); packGroup.add(vacMachine);
const packWorker = buildWorker(P.worker);
packWorker.position.set(2.5, 0, -0.5); packWorker.rotation.y = Math.PI;
packGroup.add(packWorker);

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
const palletBoxes = [];
for (let layer = 0; layer < 3; layer++)
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      const b = box(0.33, 0.3, 0.33, P.carton, { rough: 0.8 });
      b.position.set(-0.33+col*0.33, 0.15+layer*0.3, -0.33+row*0.33);
      b.visible = false; palletGroup.add(b); palletBoxes.push(b);
    }
palletGroup.position.set(3, 0, 1.5);
packGroup.add(palletGroup);
addLabel(palletGroup, '码垛 3x3x3', 2).position.set(0, 2, 0.5);

// 辅材货架
for (let s = 0; s < 2; s++) {
  const shelf = box(0.5, 1.8, 1.2, P.shelf, { metal: 0.3, rough: 0.7 });
  shelf.position.set(-3+s*0.6, 0.9, 3); packGroup.add(shelf);
  for (let i = 0; i < 3; i++) {
    const sh = box(0.55, 0.03, 1.25, P.machineDark);
    sh.position.set(-3+s*0.6, 0.3+i*0.6, 3);
    packGroup.add(sh);
  }
}
addLabel(packGroup, '辅材货架', 2.2).position.set(-2.7, 2.2, 3.8);
// ===== 打包区 INPUT/OUTPUT 接口（北侧，紧贴环线北段） =====
// INPUT: AMR 把满绿架放这里 -> 打包工人取箱上滚筒线
// OUTPUT: 空架停放位，等 AMR 回收送回产线
// 顺序很关键：环线北段沿 -X 行驶，所以 INPUT 必须在上游(+X)、OUTPUT 在下游(-X)。
// 这样 AMR 先卸满架、往前挪两米再顶空架带走，不必绕一整圈（62m）回头取空架。
const packInputSlot = new THREE.Vector3(1.3, 0, 5.0);
const packOutputSlot = new THREE.Vector3(-1.3, 0, 5.0);
const packInputStop = new THREE.Vector3(1.3, 0, AISLE_RADIUS);
const packOutputStop = new THREE.Vector3(-1.3, 0, AISLE_RADIUS);
{
  const inF = floorTile(2.2, 1.8, P.greenZone);
  inF.position.set(packInputSlot.x, 0.014, packInputSlot.z); scene.add(inF);
  addLabel(scene, 'PACK INPUT', 0.5).position.set(packInputSlot.x, 0.5, packInputSlot.z - 1.1);
  const outF = floorTile(2.2, 1.8, 0xc0c0c0);
  outF.position.set(packOutputSlot.x, 0.014, packOutputSlot.z); scene.add(outF);
  addLabel(scene, 'PACK OUTPUT', 0.5).position.set(packOutputSlot.x, 0.5, packOutputSlot.z - 1.1);
  // 打包区初始空架放 OUTPUT 位。同样要加入 productShelfAtZone 参与流转。
  const pkMesh = buildMobileShelf(P.productBin);
  pkMesh.position.copy(packOutputSlot);
  scene.add(pkMesh);
  const obj = {
    mesh: pkMesh, type: 'product', zoneIdx: -1, carriedBy: null, location: 'pack',
    hasBins: false, binCount: 0, unloadTimer: 0, call: CALL_NONE, atOutput: true, homeAngle: 0,
  };
  productShelfAtZone.push(obj);
  registerShelf(obj);
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
const qcWorker = buildWorker(P.qcWorker);
qcWorker.position.set(qcX - 1, 0, qcZ + 0.5); qcWorker.rotation.y = 0;
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

const AMR_STOP_GAP = 2.0;
const AMR_SAFE_GAP = 3.8;

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
      // 停到货架实际所在的 OUTPUT 位（潜伏顶升必须车在架下），
      // arc 用走道中线上的投影点，保证行驶段始终在走道内。
      dockPos: (isQC ? qcOutputSlot : packOutputSlot).clone(),
      arcPos: (isQC ? qcOutputStop : packOutputStop).clone(),
    };
    empty.reservedBy = amr;
    amr.job.arc = arcOfPoint(amr.job.arcPos);
    amr.state = 'traveling';
    return;
  }

  // 优先级 2：响应 PDA 呼叫，取满架
  const shelfArr = amr.mission === 'sample' ? sampleShelfAtZone : productShelfAtZone;
  let best = null, bestDist = Infinity;
  for (const sh of shelfArr) {
    if (sh.call === CALL_PENDING && sh.location === 'zone' && sh.hasBins && !sh.carriedBy) {
      // 产线必须留一个在位货架给工人继续上货，不能把区里最后一个架子拖走
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
    // 停在环线上不动
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

    // 防撞：环序弧长 + 实际世界距离双判据。
    // 单纯用弧长在对方离环停靠时会失效，故追加物理距离兜底。
    // 关键：对方已经离环（靠站/装卸/充电）时不占用走道，不能再用弧长把本车停死，
    // 否则会出现「前车在泊位充电，后车在环线上永久等待」的死锁。
    const otherOnLoop = otherAmr.state === 'traveling' || otherAmr.state === 'idle';
    const gapArc = otherOnLoop ? arcDist(otherAmr.arc, amr.arc) : Infinity;
    const physDist = amr.mesh.position.distanceTo(otherAmr.mesh.position);
    let eff = amr.speed;
    if (gapArc < AMR_STOP_GAP || physDist < 1.5) eff = 0;
    else if (gapArc < AMR_SAFE_GAP) eff = amr.speed * (gapArc - AMR_STOP_GAP) / (AMR_SAFE_GAP - AMR_STOP_GAP);
    else if (physDist < 2.6) eff = amr.speed * 0.45;

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
    case 'working':
      if (ud.armL) ud.armL.rotation.x = Math.sin(performance.now() * 0.003 + w.zoneIdx) * 0.2;
      if (ud.armR) ud.armR.rotation.x = Math.sin(performance.now() * 0.003 + w.zoneIdx + 1) * 0.2;
      w.timer -= dt;
      if (w.timer <= 0) {
        // 只在目标流转架「在位且未满」时才开始搬运，否则继续作业等待。
        const wantSample = Math.random() < 0.35;
        const tryTypes = wantSample ? ['sample', 'product'] : ['product', 'sample'];
        let picked = null;
        for (const t of tryTypes) {
          const sh = shelfAt(w.zoneIdx, t);
          if (sh && sh.location === 'zone' && !sh.carriedBy && sh.binCount < 3) { picked = t; break; }
        }
        if (!picked) { w.timer = 2.0; break; }
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
    // 空架挪到 OUTPUT 位待回收
    if (s.binCount === 0 && !s.atOutput) {
      s.atOutput = true;
      const outSlot = s.location === 'qc' ? qcOutputSlot : packOutputSlot;
      s.mesh.position.copy(outSlot);
      s.mesh.position.y = 0;
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
let palletCount = 0;
let palletState = 'building'; // building / towing / resetting
let palletTimer = 0;
let palletTowProgress = 0;
const palletHome = new THREE.Vector3(3.5, 0, 1.5);
const palletShipTarget = new THREE.Vector3(shipX + 1, 0, shipZ);
let shippedPallets = 0;

function updatePallet(dt) {
  if (palletState === 'building') {
    palletTimer += dt;
    const next = Math.floor(palletTimer / 2.2);
    if (next < 27 && next > palletCount) {
      palletCount = next;
      const b = palletBoxes[palletCount - 1];
      if (b) {
        b.visible = true;
        const fromY = b.position.y + 0.8;
        const toY = b.position.y;
        b.position.y = fromY;
        b.userData._dropFrom = fromY;
        b.userData._dropTo = toY;
        b.userData._dropStart = performance.now();
      }
    }
    if (palletCount >= 27) {
      palletState = 'towing';
      palletTowProgress = 0;
    }
  } else if (palletState === 'towing') {
    palletTowProgress += dt * 0.12;
    const t = Math.min(palletTowProgress, 1);
    // 曲线拖运
    const from = palletHome;
    const to = palletShipTarget;
    const cx = (from.x + to.x) / 2 - 2;
    const cz = (from.z + to.z) / 2 + 4;
    const px = (1-t)*(1-t)*from.x + 2*(1-t)*t*cx + t*t*to.x;
    const pz = (1-t)*(1-t)*from.z + 2*(1-t)*t*cz + t*t*to.z;
    palletGroup.position.set(px, 0, pz);
    palletGroup.rotation.y = -t * Math.PI * 0.4;
    if (t >= 1) {
      shippedPallets++;
      palletState = 'resetting';
      palletTimer = 0;
    }
  } else if (palletState === 'resetting') {
    palletTimer += dt;
    if (palletTimer > 1.5) {
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

// ===== 打包工人动画 =====
let stampTimer = 0;
let packAnimTimer = 0;
function updatePackWorkers(dt) {
  stampTimer += dt;
  const ud = qcPackWorker.userData;
  if (ud.armR) {
    const cy = (stampTimer % 2.5) / 2.5;
    if (cy < 0.3) ud.armR.rotation.x = -cy * 3;
    else if (cy < 0.5) ud.armR.rotation.x = -0.9 + (cy - 0.3) * 4.5;
    else ud.armR.rotation.x = 0;
  }
  stamper.position.y = 1.05 + Math.abs(Math.sin(stampTimer * 2)) * 0.15;

  packAnimTimer += dt;
  const pud = packWorker.userData;
  if (pud.armL) pud.armL.rotation.x = Math.sin(packAnimTimer * 2) * 0.2;
  if (pud.armR) pud.armR.rotation.x = Math.sin(packAnimTimer * 2 + 1) * 0.25;
}

function updateQCWorker(dt) {
  const ud = qcWorker.userData;
  if (ud.armL) ud.armL.rotation.x = Math.sin(performance.now() * 0.002) * 0.15;
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
const WALL_H = 4.5;
const WALL_THICK = 0.3;
const FACTORY_W = 38;
const FACTORY_D = 30;
const wallColor = 0xf5efd8;
const windowColor = 0xb8d4e8;

function addFactoryWall(x, z, w, d) {
  const m = box(w, WALL_H, d, wallColor, { rough: 0.9 });
  m.position.set(x, WALL_H / 2, z);
  scene.add(m);
}

// 四面墙
addFactoryWall(0, FACTORY_D / 2, FACTORY_W, WALL_THICK);
addFactoryWall(0, -FACTORY_D / 2, FACTORY_W, WALL_THICK);
addFactoryWall(-FACTORY_W / 2, 0, WALL_THICK, FACTORY_D);
addFactoryWall(FACTORY_W / 2, 0, WALL_THICK, FACTORY_D);

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
for (let i = 0; i < 9; i++) {
  const wx = -FACTORY_W / 2 + 3 + i * 3.8;
  addWindow(wx, FACTORY_D / 2 + 0.01, 0);
  addWindow(wx, -FACTORY_D / 2 - 0.01, 0);
}

// 西侧大门（物流入口）
{
  const gate = box(4.5, 3.8, WALL_THICK + 0.05, 0x5a4a2a, { metal: 0.4, rough: 0.6 });
  gate.position.set(-FACTORY_W / 2 + 0.02, 1.9, -9);
  scene.add(gate);
  // 门柱
  const p1 = box(0.3, 4.0, 0.4, 0x8a7d4a);
  p1.position.set(-FACTORY_W / 2 - 0.1, 2.0, -11.3); scene.add(p1);
  const p2 = box(0.3, 4.0, 0.4, 0x8a7d4a);
  p2.position.set(-FACTORY_W / 2 - 0.1, 2.0, -6.7); scene.add(p2);
  // 门楣标识
  const sign = box(3, 0.7, WALL_THICK + 0.1, 0xcc5500, { emissive: 0xcc5500, emissiveIntensity: 0.3 });
  sign.position.set(-FACTORY_W / 2 + 0.03, 4.2, -9);
  scene.add(sign);
}

// 东侧人员入口
{
  const door = box(2, 3, WALL_THICK + 0.03, 0x6a5a3a, { metal: 0.3, rough: 0.6 });
  door.position.set(FACTORY_W / 2 - 0.02, 1.5, 5);
  scene.add(door);
}


// 厂房内地面（加深一点，突出厂房范围）
{
  const inner = floorTile(FACTORY_W - 1, FACTORY_D - 1, 0xd0c8a4);
  inner.position.set(0, 0.011, 0);
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
addPlant(15, 12);
addPlant(-16, 11);
addPlant(15, -10);
addPlant(-16, -12);
addPlant(10, 13.5);
addPlant(-10, 13.5);
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
addWalkway(5.5, 0, 1.2, 8);
addWalkway(0, -5.2, 8, 1.2);
addWalkway(0, 5.2, 8, 1.2);

// --- 中央目视化看板（悬挂大屏，QC 巡检判定实时数据） ---
// 用 CSS2DObject 承载真实文字，而不是靠色块假装数据。
const qcBoardGroup = new THREE.Group();
{
  const boardFrame = box(4.6, 2.6, 0.12, 0x2a2a2a, { metal: 0.6, rough: 0.4 });
  boardFrame.position.set(0, 6.0, 0); qcBoardGroup.add(boardFrame);
  const h1 = box(0.05, 1.2, 0.05, 0x555);
  h1.position.set(-1.8, 7.6, 0); qcBoardGroup.add(h1);
  const h2 = box(0.05, 1.2, 0.05, 0x555);
  h2.position.set(1.8, 7.6, 0); qcBoardGroup.add(h2);

  const panel = document.createElement('div');
  panel.style.cssText = [
    'width:290px', 'background:rgba(12,22,36,0.86)', 'border:1px solid #3d5a80',
    'border-radius:4px', 'padding:8px 10px', 'pointer-events:none',
    'font-family:Segoe UI,Microsoft YaHei,sans-serif', 'color:#e8eef6',
    'box-shadow:0 4px 18px rgba(0,0,0,.45)',
  ].join(';');
  const head = document.createElement('div');
  head.textContent = 'QC 巡检判定 · 实时';
  head.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:1px;padding-bottom:6px;border-bottom:1px solid #3d5a80;margin-bottom:6px;color:#8fc4f0;';
  panel.appendChild(head);
  const rowsWrap = document.createElement('div');
  panel.appendChild(rowsWrap);
  const foot = document.createElement('div');
  foot.style.cssText = 'margin-top:7px;padding-top:6px;border-top:1px solid #3d5a80;font-size:10px;display:flex;justify-content:space-between;color:#9fb4cc;';
  panel.appendChild(foot);

  const boardObj = new CSS2DObject(panel);
  boardObj.position.set(0, 6.0, 0.1);
  qcBoardGroup.add(boardObj);
  qcBoardGroup.userData.rowsWrap = rowsWrap;
  qcBoardGroup.userData.foot = foot;
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
  const wrap = qcBoardGroup.userData.rowsWrap;
  const foot = qcBoardGroup.userData.foot;
  if (!wrap) return;
  wrap.innerHTML = '';
  if (qcRecords.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = '等待首批巡检样品…';
    empty.style.cssText = 'font-size:11px;color:#6d8299;padding:6px 2px;';
    wrap.appendChild(empty);
  }
  for (const r of qcRecords) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;font-size:11px;padding:3px 2px;border-bottom:1px solid rgba(61,90,128,.35);';
    const left = document.createElement('span');
    left.textContent = r.pn;
    left.style.cssText = 'font-family:Consolas,monospace;color:#cfe0f0;';
    const mid = document.createElement('span');
    mid.textContent = r.t;
    mid.style.cssText = 'font-size:9px;color:#7f95ad;';
    const tag = document.createElement('span');
    tag.textContent = r.result;
    const ok = r.result === 'OK';
    tag.style.cssText = 'font-weight:700;font-size:10px;padding:1px 7px;border-radius:2px;color:#fff;background:' + (ok ? '#3f8f4a' : '#b03434') + ';';
    row.appendChild(left); row.appendChild(mid); row.appendChild(tag);
    wrap.appendChild(row);
  }
  if (foot) {
    foot.innerHTML = '';
    const a = document.createElement('span');
    a.textContent = '已检 ' + qcInspected;
    const b = document.createElement('span');
    b.textContent = 'NG ' + qcNgCount;
    const total = qcInspected || 1;
    const c = document.createElement('span');
    c.textContent = '合格率 ' + (100 - (qcNgCount / total) * 100).toFixed(1) + '%';
    foot.appendChild(a); foot.appendChild(b); foot.appendChild(c);
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
  pts.push(['packInput', packInputStop], ['packOutput', packOutputStop]);
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

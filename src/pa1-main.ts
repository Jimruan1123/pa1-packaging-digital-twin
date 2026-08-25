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

// ===== 生产区坐标（四叶草，距中心14m） =====
// 朝向：每个区的+Z朝向中心（即货架靠前在+Z端，机台在-Z端）
const ZONE_DIST = 10;
const ZONE_W = 5.5;
const ZONE_D = 5;

const prodZones = [
  { name: '1号机·组装测试', angle: 180, x: 0,   z: -ZONE_DIST },
  { name: '2号机·点胶工位', angle:  90, x: ZONE_DIST, z: 0   },
  { name: '3号机·焊接自动站', angle:   0, x: 0,   z: ZONE_DIST },
  { name: '4号机·单工位打包', angle: -90, x: -ZONE_DIST, z: 0 },
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
const AISLE_W = 2.2;
const AISLE_RADIUS = 8; // 环线半径（到走道中线）

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

// ===== 货架（移动货架，AGV可驮运） =====
function buildMobileShelf(binColor, binCount = 2) {
  const g = new THREE.Group();
  const frame = box(0.6, 0.85, 0.5, P.shelf, { metal: 0.3, rough: 0.7 });
  frame.position.y = 0.425; g.add(frame);
  const top = box(0.65, 0.03, 0.55, P.machineDark);
  top.position.y = 0.86; g.add(top);
  for (let i = 0; i < binCount; i++) {
    const b = box(0.3, 0.26, 0.26, binColor);
    b.position.set(-0.11 + i * 0.25, 1.0, 0); g.add(b);
  }
  return g;
}

// ===== 生产区数组 =====
const prodGroups = [];
const prodWorkers = [];
const sampleDocks = [];   // 红色送样架世界坐标
const productDocks = [];  // 绿色成品架世界坐标
const andonLights = { sample: [], product: [] };
const sampleShelfAtZone = []; // 每个区的红架对象
const productShelfAtZone = []; // 每个区的绿架对象
const shelfCallQueue = { sample: [], product: [] }; // 呼叫队列

const mobileShelves = [];
function registerShelf(s) { mobileShelves.push(s); return s; }

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

  // 红区（左前方，靠走道）
  const redFloor = floorTile(1.8, 1.4, P.redZone);
  redFloor.position.set(-2, 0.013, 2.2); g.add(redFloor);
  // 绿区（右前方，靠走道）
  const greenFloor = floorTile(1.8, 1.4, P.greenZone);
  greenFloor.position.set(2, 0.013, 2.2); g.add(greenFloor);

  // 安灯（货架上方，默认暗）
  const sa = sph(0.09, 10, 0x555, { emissive: 0x555, emissiveIntensity: 0.2 });
  sa.position.set(-2, 1.9, 2.2); g.add(sa);
  andonLights.sample.push(sa);
  const pa = sph(0.09, 10, 0x555, { emissive: 0x555, emissiveIntensity: 0.2 });
  pa.position.set(2, 1.9, 2.2); g.add(pa);
  andonLights.product.push(pa);

  // PDA终端
  const pda = box(0.12, 0.22, 0.08, 0x222, { metal: 0.7, rough: 0.2 });
  pda.position.set(0, 0.75, 2.6); g.add(pda);
  const pdaScr = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.11),
    new THREE.MeshBasicMaterial({ color: 0x2b5c9b })
  );
  pdaScr.position.set(0, 0.82, 2.64); pdaScr.rotation.x = -0.25; g.add(pdaScr);

  // 工人
  const worker = buildWorker(P.worker);
  worker.position.set(0, 0, 0.2); worker.rotation.y = Math.PI;
  g.add(worker);
  prodWorkers.push(worker);

  addLabel(g, cfg.name, 3.5).position.set(0, 3.5, -2.5);

  scene.add(g);
  prodGroups.push(g);

  // 货架世界坐标（前方靠走道）
  const sw = new THREE.Vector3(-2, 0, 2.2).applyMatrix4(g.matrixWorld);
  const pw = new THREE.Vector3(2, 0, 2.2).applyMatrix4(g.matrixWorld);
  sampleDocks.push(sw);
  productDocks.push(pw);

  return g;
}

// 构建所有生产区
prodZones.forEach((z, i) => {
  buildProductionZone(z);
});
scene.updateMatrixWorld(true);

// 每个区前放初始货架（满货架，等AMR来驮）
for (let i = 0; i < 4; i++) {
  const angle = Math.atan2(sampleDocks[i].x, sampleDocks[i].z) + Math.PI;
  // 红架（满）
  const sMesh = buildMobileShelf(P.sampleBin, 2);
  sMesh.position.copy(sampleDocks[i]);
  sMesh.rotation.y = angle;
  scene.add(sMesh);
  const sObj = { mesh: sMesh, type: "sample", zoneIdx: i, carriedBy: null, location: "zone", hasBins: true, binCount: 2, unloadTimer: 0 };
  sampleShelfAtZone.push(sObj);
  registerShelf(sObj);
  // 绿架（满）
  const pMesh = buildMobileShelf(P.productBin, 2);
  pMesh.position.copy(productDocks[i]);
  pMesh.rotation.y = angle;
  scene.add(pMesh);
  const pObj = { mesh: pMesh, type: "product", zoneIdx: i, carriedBy: null, location: "zone", hasBins: true, binCount: 2, unloadTimer: 0 };
  productShelfAtZone.push(pObj);
  registerShelf(pObj);
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
  // 打包区2个空货架
  for (let i = 0; i < 2; i++) {
    const pkMesh = buildMobileShelf(P.productBin, 0);
    pkMesh.position.set(0.5 - i * 1.2, 0, 4.5);
    pkMesh.rotation.y = 0;
    packGroup.add(pkMesh);
    registerShelf({ mesh: pkMesh, type: 'product', zoneIdx: -1, carriedBy: null, location: 'pack', hasBins: false, binCount: 0, unloadTimer: 0 });
  }

// ===== QC室（西北角） =====
const qcX = -15, qcZ = -13;
const qcZone = floorTile(6, 5, P.qcFloor);
qcZone.position.set(qcX, 0.015, qcZ); scene.add(qcZone);
{
  const w1 = box(6.2, 2.2, 0.12, P.wall);
  w1.position.set(qcX, 1.1, qcZ-2.5); scene.add(w1);
  const w2 = box(0.12, 2.2, 5.2, P.wall);
  w2.position.set(qcX-3, 1.1, qcZ); scene.add(w2);
  const glassMat = new THREE.MeshStandardMaterial({ color: P.glass, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.3 });
  const g1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2, 5), glassMat);
  g1.position.set(qcX+3, 1, qcZ); scene.add(g1);
  const g2 = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.08), glassMat);
  g2.position.set(qcX-1, 1, qcZ+2.5); scene.add(g2);
}
{
  const t = box(2, 0.85, 1.0, P.machine);
  t.position.set(qcX, 0.425, qcZ-1); scene.add(t);
  const mic = box(0.2, 0.25, 0.15, P.machineDark);
  mic.position.set(qcX-0.3, 1.05, qcZ-0.8); scene.add(mic);
}
for (let i = 0; i < 3; i++) {
  const b = box(0.25, 0.2, 0.2, P.sampleBin);
  b.position.set(qcX-0.5+i*0.3, 1.0, qcZ-1.2);
  scene.add(b);
}
const qcWorker = buildWorker(P.qcWorker);
qcWorker.position.set(qcX-1, 0, qcZ+0.5); qcWorker.rotation.y = Math.PI/2;
scene.add(qcWorker);
addLabel(scene, 'QC 检测室', 2.5).position.set(qcX, 2.5, qcZ+3);
  // QC室空货架
  const qMesh = buildMobileShelf(P.sampleBin, 0);
  qMesh.position.set(qcX + 1.5, 0, qcZ - 1);
  qMesh.rotation.y = -Math.PI / 2;
  scene.add(qMesh);
  registerShelf({ mesh: qMesh, type: 'sample', zoneIdx: -1, carriedBy: null, location: 'qc', hasBins: false, binCount: 0, unloadTimer: 0 });
const qcDockPoint = new THREE.Vector3(qcX+2.5, 0, qcZ+0.5);
const qcShelfSpot = new THREE.Vector3(qcX+0.5, 0, qcZ+0.8);

// ===== AGV充电区（东南角） =====
const chX = 15, chZ = 12;
const chargerFloor = floorTile(4, 3, P.chargerFloor);
chargerFloor.position.set(chX, 0.015, chZ); scene.add(chargerFloor);
for (let i = 0; i < 2; i++) {
  const ch = box(0.4, 0.8, 0.2, P.machineDark);
  ch.position.set(chX - 1 + i*1.2, 0.4, chZ + 1.2); scene.add(ch);
  const cl = sph(0.04, 8, 0x6aa84f, { emissive: 0x6aa84f, emissiveIntensity: 0.8 });
  cl.position.set(chX - 1 + i*1.2, 0.9, chZ + 1.3); scene.add(cl);
}
addLabel(scene, 'AGV 充电区', 2).position.set(chX, 2, chZ - 1.5);
const chargerPos1 = new THREE.Vector3(chX - 1, 0, chZ);
const chargerPos2 = new THREE.Vector3(chX + 0.2, 0, chZ);

// ===== 成品出货区（西南角） =====
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
const shippingDock = new THREE.Vector3(shipX + 2.5, 0, shipZ);

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
function arcOfWp(idx) {
  let s = 0;
  for (let i = 0; i < idx && i < LOOP.length - 1; i++) s += LOOP[i].distanceTo(LOOP[i+1]);
  return s;
}
function arcDist(ahead, behind) {
  let d = ahead - behind;
  if (d < 0) d += LOOP_LEN;
  return d;
}

// ===== AMR 构建 =====
function buildAMR(idLabel) {
  const g = new THREE.Group();
  // 潜伏式车身（加厚橙黑）
  const body = box(1.1, 0.24, 0.88, P.amrDark, { metal: 0.5, rough: 0.4 });
  body.position.y = 0.12; g.add(body);
  const top = box(1.0, 0.06, 0.78, P.amr, { metal: 0.6, rough: 0.3, emissive: P.amr, emissiveIntensity: 0.12 });
  top.position.y = 0.27; g.add(top);
  // 升降平台
  const liftPlat = box(0.65, 0.06, 0.55, 0xff9933, { metal: 0.8, rough: 0.2, emissive: 0xff9933, emissiveIntensity: 0.35 });
  liftPlat.position.y = 0.31; g.add(liftPlat);
  g.userData.liftPlatform = liftPlat;
  // 前后灯带
  for (let z of [0.43, -0.43]) {
    const strip = box(0.95, 0.025, 0.04, 0xffaa00, { emissive: 0xffaa00, emissiveIntensity: 1.0 });
    strip.position.set(0, 0.18, z); g.add(strip);
  }
  // 侧灯
  for (let s of [-1, 1]) {
    const sl = box(0.04, 0.025, 0.5, 0xffaa00, { emissive: 0xffaa00, emissiveIntensity: 0.9 });
    sl.position.set(s * 0.56, 0.16, 0); g.add(sl);
  }
  for (let i = 0; i < 4; i++) {
    const w = cyl(0.08, 0.08, 0.06, 10, 0x111);
    w.rotation.z = Math.PI / 2;
    w.position.set((i < 2 ? 1 : -1) * 0.42, 0.09, (i % 2 === 0 ? 1 : -1) * 0.32);
    g.add(w);
  }
  const led = sph(0.04, 8, P.amr, { emissive: P.amr, emissiveIntensity: 1.2 });
  led.position.set(0, 0.44, 0); g.add(led);
  g.userData.led = led;
  const idDiv = document.createElement("div");
  idDiv.textContent = idLabel;
  idDiv.style.cssText = "color:#fff;font-size:9px;font-weight:700;background:#cc5500;padding:1px 4px;border-radius:2px;pointer-events:none;";
  const idObj = new CSS2DObject(idDiv);
  idObj.position.set(0, 0.62, 0); g.add(idObj);
  const mount = new THREE.Group();
  mount.position.y = 0.44; g.add(mount);
  g.userData.shelfMount = mount;
  return g;
}

// AMR 1: 送检（红架）
const amr1 = {
  mesh: buildAMR("AMR-01 送检"),
  arc: arcOfWp(0) + 2,
  speed: 2.8,
  state: 'traveling',
  dockTimer: 0,
  chargeTimer: 0,
  hasShelf: false,
  shelf: null,
  mission: 'sample',
  route: [
    { wpIdx: 3, action: 'load_zone', zoneIdx: 0 },
    { action: 'unload_qc' },
    { wpIdx: 7, action: 'load_zone', zoneIdx: 2 },
    { action: 'unload_qc' },
    { wpSide: 'E', offset: 2, action: 'charge' },
  ],
  routeIdx: 0,
  userData: {},
};
scene.add(amr1.mesh);

// AMR 2: 成品搬运（绿架）
const amr2 = {
  mesh: buildAMR("AMR-02 成品"),
  arc: arcOfWp(0) + 12,
  speed: 3.0,
  state: 'traveling',
  dockTimer: 0,
  chargeTimer: 0,
  hasShelf: false,
  shelf: null,
  mission: 'product',
  route: [
    { wpIdx: 1, action: 'load_zone', zoneIdx: 3 },
    { wpIdx: 7, action: 'unload_pack' },
    { wpIdx: 5, action: 'load_zone', zoneIdx: 1 },
    { wpIdx: 7, action: 'unload_pack' },
    { wpSide: 'E', offset: 1, action: 'charge' },
  ],
  routeIdx: 0,
  userData: {},
};
scene.add(amr2.mesh);

const AMR_STOP_GAP = 1.8;
const AMR_SAFE_GAP = 3.5;

function getTargetArc(amr) {
  const step = amr.route[amr.routeIdx];
  if (step.wpIdx !== undefined) return arcOfWp(step.wpIdx);
  if (step.wpSide === 'W') return arcOfWp(1) + step.offset;
  if (step.wpSide === 'E') return arcOfWp(6) - step.offset;
  return 0;
}

function getDockPos(amr) {
  const step = amr.route[amr.routeIdx];
  if (step.action === 'load_zone') {
    const docks = amr.mission === "sample" ? sampleDocks : productDocks;
    return docks[step.zoneIdx].clone();
  }
  if (step.action === 'unload_pack') {
    return new THREE.Vector3(0, 0, 4.5);
  }
  if (step.action === 'unload_qc') {
    return new THREE.Vector3(qcX + 1.5, 0, qcZ);
  }
  return null;
}

function doDockAction(amr) {
  const step = amr.route[amr.routeIdx];
  const act = step.action;
  if (act === 'load_zone') {
    const zi = step.zoneIdx;
    const shelfArr = amr.mission === "sample" ? sampleShelfAtZone : productShelfAtZone;
    let s = null;
    for (const sh of shelfArr) {
      if (sh.location === "zone" && sh.zoneIdx === zi && sh.hasBins && sh.binCount >= 2 && !sh.carriedBy) {
        s = sh; break;
      }
    }
    if (s) {
      s.carriedBy = amr;
      s.location = "amr";
      amr.hasShelf = true;
      amr.shelf = s;
      amr.mesh.userData.shelfMount.add(s.mesh);
      s.mesh.position.set(0, 0, 0);
      s.mesh.rotation.y = 0;
      const andonArr = amr.mission === "sample" ? andonLights.sample : andonLights.product;
      if (andonArr[zi]) {
        andonArr[zi].material.color.setHex(0x555);
        andonArr[zi].material.emissive.setHex(0x555);
        andonArr[zi].material.emissiveIntensity = 0.2;
      }
    }
  } else if (act === 'unload_qc' || act === 'unload_pack') {
    if (amr.hasShelf && amr.shelf) {
      const s = amr.shelf;
      amr.mesh.userData.shelfMount.remove(s.mesh);
      scene.add(s.mesh);
      const pos = getDockPos(amr);
      s.mesh.position.copy(pos);
      s.mesh.position.y = 0;
      s.mesh.rotation.y = act === "unload_qc" ? -Math.PI / 2 : 0;
      s.carriedBy = null;
      s.location = act === "unload_qc" ? "qc" : "pack";
      s.unloadTimer = 0;
      amr.hasShelf = false;
      amr.shelf = null;
    }
  }
}

function updateAMROnLoop(amr, otherAmr, dt) {
  const led = amr.mesh.userData.led;
  if (amr.state === 'traveling') {
    const target = getTargetArc(amr);
    const toTarget = arcDist(target, amr.arc);
    const gap = arcDist(otherAmr.arc, amr.arc);
    let eff = amr.speed;
    if (gap < AMR_STOP_GAP) eff = 0;
    else if (gap < AMR_SAFE_GAP) eff = amr.speed * (gap - AMR_STOP_GAP) / (AMR_SAFE_GAP - AMR_STOP_GAP);
    if (toTarget < 1.5 && eff > 0) eff = Math.min(eff, toTarget * 1.5 + 0.1);
    if (toTarget < 0.08) {
      amr.arc = target;
      const step = amr.route[amr.routeIdx];
      amr.dockTimer = 0;
      amr.userData._actionDone = false;
      amr.userData._liftStarted = false;
      amr.userData._liftT = 0;
      if (step.action === 'unload_qc') {
        amr.state = 'entering_qc';
      } else if (step.action === 'load_zone' || step.action === 'unload_pack') {
        amr.state = 'approaching';
      } else {
        amr.state = 'docking';
      }
    } else {
      amr.arc += eff * dt;
      if (amr.arc >= LOOP_LEN) amr.arc -= LOOP_LEN;
    }
    const { pos, dir } = posOnLoop(amr.arc);
    amr.mesh.position.copy(pos);
    amr.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  } else if (amr.state === 'approaching') {
    amr.dockTimer += dt;
    if (led) led.material.emissiveIntensity = 0.6 + Math.sin(amr.dockTimer * 10) * 0.4;
    const dockPos = getDockPos(amr);
    const loopPos = posOnLoop(amr.arc).pos;
    const t = Math.min(amr.dockTimer / 1.2, 1);
    const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
    amr.mesh.position.lerpVectors(loopPos, dockPos, e);
    const lookDir = dockPos.clone().sub(loopPos).normalize();
    amr.mesh.rotation.y = Math.atan2(lookDir.x, lookDir.z);
    if (t >= 1) { amr.mesh.position.copy(dockPos); amr.state = "docking"; amr.dockTimer = 0; }
  } else if (amr.state === 'docking') {
    amr.dockTimer += dt;
    if (led) led.material.emissiveIntensity = 0.5 + Math.sin(amr.dockTimer * 8) * 0.5;
    if (!amr.userData._liftStarted && amr.dockTimer > 0.3) { amr.userData._liftStarted = true; amr.userData._liftT = 0; }
    if (amr.userData._liftStarted && amr.userData._liftT < 1) {
      amr.userData._liftT = Math.min(1, amr.userData._liftT + dt / 0.5);
      const lt = amr.userData._liftT;
      const e2 = lt < 0.5 ? 2*lt*lt : 1 - Math.pow(-2*lt+2, 2)/2;
      const lift = amr.mesh.userData.liftPlatform;
      const mount = amr.mesh.userData.shelfMount;
      if (lift) lift.position.y = 0.31 + e2 * 0.1;
      if (mount) mount.position.y = 0.44 + e2 * 0.12;
      if (amr.userData._liftT >= 1 && !amr.userData._actionDone) { amr.userData._actionDone = true; doDockAction(amr); }
    }
    if (amr.dockTimer > 2.8) {
      const lift = amr.mesh.userData.liftPlatform;
      const mount = amr.mesh.userData.shelfMount;
      if (lift) lift.position.y = 0.31;
      if (mount) mount.position.y = 0.44;
      amr.userData._liftStarted = false;
      if (led) led.material.emissiveIntensity = 1.2;
      const step = amr.route[amr.routeIdx];
      if (step.action === 'charge') { amr.state = 'charging'; amr.chargeTimer = 0; }
      else { amr.state = 'departing'; amr.dockTimer = 0; }
    }
  } else if (amr.state === 'departing') {
    amr.dockTimer += dt;
    const dockPos = getDockPos(amr);
    const loopPos = posOnLoop(amr.arc).pos;
    const t = Math.min(amr.dockTimer / 1.2, 1);
    const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
    amr.mesh.position.lerpVectors(dockPos, loopPos, e);
    const lookDir = loopPos.clone().sub(dockPos).normalize();
    amr.mesh.rotation.y = Math.atan2(lookDir.x, lookDir.z);
    if (t >= 1) {
      amr.mesh.position.copy(loopPos);
      const { dir } = posOnLoop(amr.arc);
      amr.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      amr.routeIdx = (amr.routeIdx + 1) % amr.route.length;
      amr.state = 'traveling';
    }
  } else if (amr.state === 'entering_qc') {
    amr.dockTimer += dt;
    if (led) led.material.emissiveIntensity = 0.6 + Math.sin(amr.dockTimer * 10) * 0.4;
    const loopPos = posOnLoop(amr.arc).pos;
    const qcPos = new THREE.Vector3(qcX + 1.5, 0, qcZ);
    const t = Math.min(amr.dockTimer / 2.0, 1);
    if (t < 1) {
      const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
      amr.mesh.position.lerpVectors(loopPos, qcPos, e);
      const d = qcPos.clone().sub(loopPos).normalize();
      amr.mesh.rotation.y = Math.atan2(d.x, d.z);
    } else if (!amr.userData._qcDone) {
      amr.userData._qcDone = true;
      amr.mesh.position.copy(qcPos);
      doDockAction(amr);
    } else if (amr.dockTimer > 4.5) {
      const bt = Math.min((amr.dockTimer - 4.5) / 2.0, 1);
      const e = bt < 0.5 ? 2*bt*bt : 1 - Math.pow(-2*bt+2, 2)/2;
      amr.mesh.position.lerpVectors(qcPos, loopPos, e);
      const d = loopPos.clone().sub(qcPos).normalize();
      amr.mesh.rotation.y = Math.atan2(d.x, d.z);
      if (bt >= 1) {
        amr.mesh.position.copy(loopPos);
        const { dir } = posOnLoop(amr.arc);
        amr.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        amr.userData._qcDone = false;
        amr.routeIdx = (amr.routeIdx + 1) % amr.route.length;
        amr.state = 'traveling';
      }
    }
  } else if (amr.state === 'charging') {
    amr.chargeTimer += dt;
    if (led) { led.material.emissive.setHex(0x6aa84f); led.material.emissiveIntensity = 0.6 + Math.sin(amr.chargeTimer*3)*0.3; }
    if (amr.chargeTimer > 6) {
      if (led) { led.material.emissive.setHex(P.amr); led.material.emissiveIntensity = 1.2; }
      amr.routeIdx = (amr.routeIdx + 1) % amr.route.length;
      amr.state = 'traveling';
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
    timer: 2 + Math.random() * 4,
    binType: 'sample',
    carriedBin: null,
    homePos: new THREE.Vector3(0, 0, 0.2),
    target: new THREE.Vector3(),
  });
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
        w.binType = Math.random() < 0.35 ? 'sample' : 'product';
        const lx = w.binType === 'sample' ? -2 : 2;
        w.target.set(lx, 0, 2.2);
        const binColor = w.binType === 'sample' ? P.sampleBin : P.productBin;
        w.carriedBin = box(0.24, 0.2, 0.24, binColor);
        w.carriedBin.position.set(0, 1.0, 0.22);
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
      if (w.carriedBin) {
        const t = 1 - w.timer / 0.8;
        w.carriedBin.position.set(0, 1.0 - t * 0.4, 0.22 + t * 0.2);
      }
      w.timer -= dt;
      if (w.timer <= 0) {
        if (w.carriedBin) { w.mesh.remove(w.carriedBin); w.carriedBin = null; }
        w.state = 'pda';
        w.timer = 1.0;
        // 点亮安灯 + 入队
        const andonArr = w.binType === 'sample' ? andonLights.sample : andonLights.product;
        const a = andonArr[w.zoneIdx];
        if (a) {
          a.material.color.setHex(P.andon);
          a.material.emissive.setHex(P.andon);
          a.material.emissiveIntensity = 1.0;
        }
      }
      break;

    case 'pda':
      if (ud.armR) ud.armR.rotation.x = -1.1 + Math.sin(performance.now() * 0.006) * 0.08;
      w.timer -= dt;
      if (w.timer <= 0) {
        if (ud.armR) ud.armR.rotation.x = 0;
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
        w.timer = 3 + Math.random() * 3;
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
function updateShelves(dt) {
  for (const s of mobileShelves) {
    if (s.carriedBy) continue;
    if (s.location === "zone") continue;
    if (s.location === "qc" || s.location === "pack") {
      s.unloadTimer += dt;
      // 2秒后料箱被取走
      if (s.unloadTimer > 1.5 && s.unloadTimer < 1.8) {
        s.hasBins = false;
        s.binCount = 0;
        for (let i = s.mesh.children.length - 1; i >= 3; i--) {
          s.mesh.remove(s.mesh.children[i]);
        }
      }
      // 3秒后空货架消失并回归生产区
      if (s.unloadTimer > 2.5 && s.unloadTimer < 2.8) {
        s.mesh.visible = false;
      }
      if (s.unloadTimer > 3.0) {
        if (s.zoneIdx >= 0) {
          const homePos = s.type === "sample" ? sampleDocks[s.zoneIdx] : productDocks[s.zoneIdx];
          const angle = Math.atan2(homePos.x, homePos.z) + Math.PI;
          s.mesh.position.copy(homePos);
          s.mesh.rotation.y = angle;
          s.location = "zone";
          // 重新装满料箱
          const color = s.type === "sample" ? P.sampleBin : P.productBin;
          for (let i = 0; i < 2; i++) {
            const b = box(0.3, 0.26, 0.26, color);
            b.position.set(-0.11 + i * 0.25, 1.0, 0);
            s.mesh.add(b);
          }
          s.hasBins = true;
          s.binCount = 2;
        }
        s.mesh.visible = true;
        s.unloadTimer = 0;
      }
    }
  }
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
let totalOutput = 0;
let totalDeliveries = 0;
function pad(n) { return String(n).padStart(2, '0'); }

function updateUI(dt) {
  simTime = new Date(simTime.getTime() + dt * 1000);
  const ds = `${simTime.getFullYear()}-${pad(simTime.getMonth()+1)}-${pad(simTime.getDate())} ${pad(simTime.getHours())}:${pad(simTime.getMinutes())}:${pad(simTime.getSeconds())}`;
  const el = document.getElementById('datetime');
  if (el) el.textContent = ds;

  totalOutput += dt * 0.8;
  totalDeliveries = shippedPallets * 27 + Math.floor(performance.now() / 8000);

  const outEl = document.getElementById('kpi-output');
  if (outEl) outEl.textContent = String(Math.floor(totalOutput));
  const delEl = document.getElementById('amr-deliveries');
  if (delEl) delEl.textContent = String(totalDeliveries);
  const wipEl = document.getElementById('kpi-wip');
  if (wipEl) wipEl.textContent = String(8 + Math.floor(Math.sin(performance.now()/5000)*3));
  const oeeEl = document.getElementById('kpi-oee');
  if (oeeEl) oeeEl.textContent = String(82 + Math.floor(Math.sin(performance.now()/7000)*4));

  const bars = [['eff-a','bar-a',92], ['eff-b','bar-b',78], ['eff-c','bar-c',99], ['eff-u','bar-u',65]];
  for (const [vid, bid, base] of bars) {
    const v = base + Math.sin(performance.now()/(3000+base*50)) * 3;
    const ve = document.getElementById(vid);
    const be = document.getElementById(bid);
    if (ve) ve.textContent = `${Math.round(v)}%`;
    if (be) be.style.width = `${v}%`;
  }
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

// --- 中央目视化看板（悬挂大屏） ---
const qcBoardGroup = new THREE.Group();
{
  const boardFrame = box(4.2, 2.2, 0.1, 0x2a2a2a, { metal: 0.6, rough: 0.4 });
  boardFrame.position.set(0, 5.8, 0); qcBoardGroup.add(boardFrame);
  const boardScreen = box(4.0, 2.0, 0.03, 0x0a1628, { metal: 0.1, rough: 0.3, emissive: 0x0a1628, emissiveIntensity: 0.2 });
  boardScreen.position.set(0, 5.8, 0.05); qcBoardGroup.add(boardScreen);
  // 挂架
  const h1 = box(0.05, 1.2, 0.05, 0x555);
  h1.position.set(-1.6, 7.5, 0); qcBoardGroup.add(h1);
  const h2 = box(0.05, 1.2, 0.05, 0x555);
  h2.position.set(1.6, 7.5, 0); qcBoardGroup.add(h2);
  // 看板标题条
  const titleBar = box(3.8, 0.25, 0.02, 0x2b5c9b, { emissive: 0x2b5c9b, emissiveIntensity: 0.3 });
  titleBar.position.set(0, 6.6, 0.06); qcBoardGroup.add(titleBar);
  // QC判定栏（6行）
  for (let row = 0; row < 5; row++) {
    const y = 6.3 - row * 0.35;
    // 行背景
    const rowBg = box(3.6, 0.28, 0.01, 0x1a2a3a);
    rowBg.position.set(0, y, 0.06); qcBoardGroup.add(rowBg);
    // 料号
    const pnBox = box(1.6, 0.18, 0.005, 0x2a3a50);
    pnBox.position.set(-1.2, y, 0.07); qcBoardGroup.add(pnBox);
    // 结果OK/NG
    const isOk = row !== 2; // 模拟一行NG
    const resultColor = isOk ? 0x6aa84f : 0xa03030;
    const resBox = box(0.8, 0.2, 0.01, resultColor, { emissive: resultColor, emissiveIntensity: 0.4 });
    resBox.position.set(1.4, y, 0.07); qcBoardGroup.add(resBox);
  }
}
scene.add(qcBoardGroup);
addLabel(qcBoardGroup, 'QC 巡检判定 · 实时数据看板', 7.0).position.set(0, 7.0, 0.1);

// QC检验数据（模拟）
const qcRecords = [
  { pn: 'PN-2047A', result: 'OK' },
  { pn: 'PN-1183B', result: 'OK' },
  { pn: 'PN-3290C', result: 'NG' },
  { pn: 'PN-0852A', result: 'OK' },
  { pn: 'PN-4617D', result: 'OK' },
];

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
// ===== 主动画循环 =====
let animFrameId = 0;
const clock = new THREE.Clock();

function animate() {
  animFrameId = requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // AGV
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

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ========== 基础场景 ==========
const container = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8e4d8);
scene.fog = new THREE.Fog(0xe8e4d8, 40, 110);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);
camera.position.set(26, 22, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 12;
controls.maxDistance = 55;
controls.target.set(0, 1, 2);

// ========== 灯光 ==========
const hemi = new THREE.HemisphereLight(0xffffee, 0x8a8260, 0.75);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff6d8, 1.15);
sun.position.set(18, 28, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 70;
sun.shadow.bias = -0.0005;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x88aacc, 0.25);
fill.position.set(-12, 15, -10);
scene.add(fill);

// ========== 调色板（米黄工业风） ==========
const P = {
  floor:      0xd9d2b8,
  floorLine:  0xbfb68e,
  cellFloor:  0xc8c0a0,
  wall:       0xf2ecd6,
  wallFrame:  0xb8ad7a,
  machine:    0xe8e3cf,
  machineDark:0x6a6350,
  belt:       0x555555,
  beltSide:   0x3a3a3a,
  robotArm:   0xe0dcc8,
  robotJoint: 0x5a9bd4,
  robotBase:  0x4a4a4a,
  amr:        0xf5c842,
  amrDark:    0xb8860b,
  binBlue:    0x3c78a8,
  binGreen:   0x6aa84f,
  binRed:     0xa03030,
  binYellow:  0xd4a017,
  binGray:    0x8a8260,
  worker:     0x2b5c9b,
  workerHat:  0xd4b44a,
  glass:      0xaad4ee,
  rack:       0x8a8260,
  stOk:       0x6aa84f,
  stWarn:     0xd4a017,
  stErr:      0xa03030,
  stBlue:     0x3c78a8,
  partColor:  0x222222,
};

// ========== 工具函数 ==========
function box(w, h, d, color, opts = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
function cyl(rt, rb, h, s, color, opts = {}) {
  const g = new THREE.CylinderGeometry(rt, rb, h, s);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts });
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
function sph(r, s, color, opts = {}) {
  const g = new THREE.SphereGeometry(r, s, s);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts });
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  return mesh;
}
function addLabel(parent, text, y = 2.5) {
  const div = document.createElement('div');
  div.className = 'station-label';
  div.textContent = text;
  const lbl = new CSS2DObject(div);
  lbl.position.set(0, y, 0);
  parent.add(lbl);
  return lbl;
}
// ========== 地面 & 厂房 ==========
const floorGeo = new THREE.PlaneGeometry(60, 55);
const floorMat = new THREE.MeshStandardMaterial({ color: P.floor, roughness: 0.95 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// 单元区域地面（稍深色）
const cellFloor = box(19.6, 0.05, 11.4, P.cellFloor);   // 覆盖 U 型线作业区
cellFloor.position.set(0, 0.025, 0);
scene.add(cellFloor);

// 地面标线
function addLine(x1, z1, x2, z2, color = P.floorLine, width = 0.08) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ang = Math.atan2(z2 - z1, x2 - x1);
  const line = box(len, 0.01, width, color);
  line.rotation.y = -ang;
  line.position.set((x1 + x2) / 2, 0.06, (z1 + z2) / 2);
  scene.add(line);
  return line;
}
// 单元外围黄色安全线
// U 型包装线作业区安全线（避开通道）
addLine(-9.5, -4.9, 9.5, -4.9, P.binYellow, 0.12);
addLine(-9.5,  5.3, 9.5,  5.3, P.binYellow, 0.12);
addLine(-9.5, -4.9, -9.5, 5.3, P.binYellow, 0.12);
addLine( 9.5, -4.9,  9.5, 5.3, P.binYellow, 0.12);

// ========== 协作机器人 ==========
function buildRobot(armColor = P.robotArm, jointColor = P.robotJoint) {
  const g = new THREE.Group();
  // 底座
  const base = cyl(0.28, 0.32, 0.2, 16, P.robotBase);
  base.position.y = 0.1;
  g.add(base);
  // 转台
  const turret = cyl(0.22, 0.22, 0.15, 16, P.machineDark);
  turret.position.y = 0.27;
  g.add(turret);
  // 下臂
  const lowerArm = new THREE.Group();
  lowerArm.position.y = 0.35;
  const lower = box(0.16, 0.9, 0.14, armColor);
  lower.position.y = 0.45;
  lowerArm.add(lower);
  // 关节
  const j1 = cyl(0.13, 0.13, 0.2, 12, jointColor);
  j1.rotation.z = Math.PI / 2;
  lowerArm.add(j1);
  turret.add(lowerArm);
  // 上臂
  const upperArm = new THREE.Group();
  upperArm.position.y = 0.9;
  const upper = box(0.13, 0.7, 0.12, armColor);
  upper.position.y = 0.35;
  upperArm.add(upper);
  const j2 = cyl(0.11, 0.11, 0.18, 12, jointColor);
  j2.rotation.z = Math.PI / 2;
  upperArm.add(j2);
  lowerArm.add(upperArm);
  // 末端执行器
  const wrist = new THREE.Group();
  wrist.position.y = 0.7;
  const w = cyl(0.07, 0.07, 0.18, 10, P.machineDark);
  wrist.add(w);
  // 夹爪
  const claw1 = box(0.04, 0.16, 0.03, P.machineDark);
  claw1.position.set(0.06, -0.08, 0);
  wrist.add(claw1);
  const claw2 = box(0.04, 0.16, 0.03, P.machineDark);
  claw2.position.set(-0.06, -0.08, 0);
  wrist.add(claw2);
  upperArm.add(wrist);

  g.userData = { lowerArm, upperArm, wrist, turret };
  return g;
}

// ========== 工人 ==========
function buildWorker(uniformColor = P.worker) {
  const g = new THREE.Group();
  // 身体
  const body = box(0.32, 0.55, 0.22, uniformColor);
  body.position.y = 0.8;
  g.add(body);
  // 头
  const head = sph(0.14, 12, 0xd8b89a);
  head.position.y = 1.22;
  g.add(head);
  // 帽子
  const hat = cyl(0.16, 0.14, 0.08, 12, P.workerHat);
  hat.position.y = 1.34;
  g.add(hat);
  // 腿
  const leg1 = box(0.13, 0.45, 0.14, 0x3a3a3a);
  leg1.position.set(-0.08, 0.3, 0);
  g.add(leg1);
  const leg2 = box(0.13, 0.45, 0.14, 0x3a3a3a);
  leg2.position.set(0.08, 0.3, 0);
  g.add(leg2);
  // 手臂
  const armL = box(0.1, 0.4, 0.1, uniformColor);
  armL.position.set(-0.22, 0.9, 0);
  g.add(armL);
  const armR = box(0.1, 0.4, 0.1, uniformColor);
  armR.position.set(0.22, 0.9, 0);
  g.add(armR);
  g.userData = { armL, armR, body };
  return g;
}

// ========== 周转箱 / 料箱 ==========
function buildBin(color = P.binBlue, size = 0.45) {
  const g = new THREE.Group();
  const s = size;
  const shellMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
  // 箱体
  const b = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.75, s), shellMat);
  b.castShadow = true; b.receiveShadow = true;
  g.add(b);
  // 顶边（稍宽）
  const rim = box(s * 1.08, 0.04, s * 1.08, color, { roughness: 0.5 });
  rim.position.y = s * 0.375 + 0.02;
  g.add(rim);
  // 标签面
  const label = box(s * 0.6, s * 0.2, 0.01, 0xffffff, { roughness: 0.9 });
  label.position.set(0, 0, s / 2 + 0.005);
  g.add(label);
  g.userData.size = s;
  return g;
}

// ========== 小零件（汽车连接器示意） ==========
function buildPart() {
  const g = new THREE.Group();
  const body = box(0.14, 0.06, 0.1, P.partColor);
  g.add(body);
  // 针脚
  for (let i = 0; i < 3; i++) {
    const pin = cyl(0.008, 0.008, 0.1, 6, 0xd4af37, { metalness: 0.8, roughness: 0.3 });
    pin.position.set(-0.04 + i * 0.04, 0, -0.09);
    g.add(pin);
  }
  return g;
}

// ========== 工位设备 ==========
function buildStation(type, width = 1.6, depth = 1.4) {
  const g = new THREE.Group();
  // 基座
  const base = box(width, 0.8, depth, P.machine);
  base.position.y = 0.4;
  g.add(base);
  // 台面
  const top = box(width * 0.95, 0.06, depth * 0.95, P.machineDark);
  top.position.y = 0.83;
  g.add(top);

  // 根据类型加设备
  if (type === 'scan') {
    // 扫码/上料：上方一个扫描头
    const pole = cyl(0.04, 0.04, 0.8, 8, P.machineDark);
    pole.position.set(0, 1.23, 0);
    g.add(pole);
    const head = box(0.4, 0.18, 0.25, 0x222222);
    head.position.set(0, 1.6, 0);
    g.add(head);
    // 红光
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.5, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
    );
    beam.rotation.x = Math.PI;
    beam.position.y = 1.35;
    g.add(beam);
    g.userData.beam = beam;
  } else if (type === 'etest' || type === 'pin') {
    // 电测 / 针检：一个带盖测试盒
    const chamber = box(width * 0.6, 0.5, depth * 0.6, P.machineDark);
    chamber.position.y = 1.1;
    g.add(chamber);
    // 指示灯
    const led = sph(0.06, 8, P.stOk, { emissive: P.stOk, emissiveIntensity: 0.6 });
    led.position.set(width * 0.25, 1.4, 0);
    g.add(led);
    g.userData.led = led;
  } else if (type === 'aoi') {
    // 视觉检测：带透明罩
    const aoiBox = box(width * 0.6, 0.5, depth * 0.6, P.machineDark);
    aoiBox.position.y = 1.1;
    g.add(aoiBox);
    const glass = box(width * 0.55, 0.35, depth * 0.55, P.glass, { transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0.3 });
    glass.position.y = 1.1;
    g.add(glass);
    const led = sph(0.06, 8, P.stBlue, { emissive: P.stBlue, emissiveIntensity: 0.8 });
    led.position.set(width * 0.25, 1.4, 0);
    g.add(led);
    g.userData.led = led;
  } else if (type === 'function') {
    // 功能/气密测试
    const fbox = box(width * 0.65, 0.55, depth * 0.6, P.machineDark);
    fbox.position.y = 1.12;
    g.add(fbox);
    // 屏幕
    const screen = box(width * 0.4, 0.25, 0.03, 0x1a3a5a);
    screen.position.set(0, 1.25, depth * 0.3 + 0.015);
    g.add(screen);
    const led = sph(0.06, 8, P.stOk, { emissive: P.stOk, emissiveIntensity: 0.6 });
    led.position.set(width * 0.28, 1.45, 0);
    g.add(led);
    g.userData.led = led;
  } else if (type === 'marking') {
    // 打标
    const mk = box(width * 0.5, 0.4, depth * 0.5, P.machineDark);
    mk.position.y = 1.05;
    g.add(mk);
    // 激光头
    const lhead = box(0.15, 0.3, 0.15, 0x333333);
    lhead.position.set(0, 1.4, -0.15);
    g.add(lhead);
    const beam = cyl(0.01, 0.01, 0.4, 6, 0xff4444, { emissive: 0xff2222, emissiveIntensity: 1 });
    beam.position.set(0, 1.05, -0.15);
    g.add(beam);
    g.userData.beam = beam;
  } else if (type === 'pack') {
    // 包装/分拣
    const pk = box(width * 0.7, 0.45, depth * 0.6, P.machineDark);
    pk.position.y = 1.03;
    g.add(pk);
    // 出料滑槽
    const chute = box(0.4, 0.05, 0.6, P.machineDark);
    chute.rotation.x = -0.3;
    chute.position.set(width * 0.35, 0.8, depth * 0.2);
    g.add(chute);
  }
  return g;
}
// ========== 传送带 ==========
// U 型线：顶部直线段（上料端在左，包装端在右）+ 右侧弧 + 底部回流段 + 左侧弧
// 我们用一组滚轮/皮带段来模拟
const BELT_H = 0.72;      // 传送带高度（地面到皮带面）
const BELT_W = 0.75;      // 传送带宽度
const BELT_THICK = 0.08;  // 皮带厚度

// 直段传送带
function buildBeltStraight(length, width = BELT_W) {
  const g = new THREE.Group();
  // 两侧框架
  const side1 = box(length, 0.08, 0.06, P.beltSide);
  side1.position.set(0, BELT_H - BELT_THICK / 2, width / 2 - 0.03);
  g.add(side1);
  const side2 = box(length, 0.08, 0.06, P.beltSide);
  side2.position.set(0, BELT_H - BELT_THICK / 2, -width / 2 + 0.03);
  g.add(side2);
  // 皮带面（动的纹理用滚动效果）
  const beltGeo = new THREE.PlaneGeometry(length, width);
  const beltMat = new THREE.MeshStandardMaterial({ color: P.belt, roughness: 0.9, side: THREE.DoubleSide });
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.rotation.x = -Math.PI / 2;
  belt.position.y = BELT_H;
  g.add(belt);
  g.userData.belt = belt;
  // 支腿
  const legCount = Math.max(2, Math.floor(length / 1.5));
  for (let i = 0; i < legCount; i++) {
    const t = (i + 0.5) / legCount;
    const x = -length / 2 + t * length;
    const leg1 = box(0.06, BELT_H - 0.05, 0.06, P.machineDark);
    leg1.position.set(x, (BELT_H - 0.05) / 2, width / 2 - 0.06);
    g.add(leg1);
    const leg2 = box(0.06, BELT_H - 0.05, 0.06, P.machineDark);
    leg2.position.set(x, (BELT_H - 0.05) / 2, -width / 2 + 0.06);
    g.add(leg2);
  }
  return g;
}

// 弧形传送带：直接在 XZ 平面按极角构建，弧面/支腿/轨迹共用同一坐标约定
// a0 -> a1 为极角范围，位置 = (cos(a)*R, z = sin(a)*R)
function buildBeltCurve(radius, a0, a1, segments = 20, width = BELT_W) {
  const g = new THREE.Group();
  const innerR = radius - width / 2;
  const outerR = radius + width / 2;

  // 皮带面：沿极角扫出一条环形带
  const pos = [];
  const idx = [];
  for (let i = 0; i <= segments; i++) {
    const a = a0 + (a1 - a0) * (i / segments);
    const ca = Math.cos(a), sa = Math.sin(a);
    pos.push(outerR * ca, 0, outerR * sa);
    pos.push(innerR * ca, 0, innerR * sa);
  }
  for (let i = 0; i < segments; i++) {
    const o = i * 2;
    idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: P.belt, roughness: 0.9, side: THREE.DoubleSide });
  const belt = new THREE.Mesh(geo, mat);
  belt.position.y = BELT_H;
  belt.receiveShadow = true;
  g.add(belt);
  g.userData.belt = belt;

  // 侧边护栏（内外两圈）
  [innerR, outerR].forEach(r => {
    const rail = [];
    for (let i = 0; i <= segments; i++) {
      const a = a0 + (a1 - a0) * (i / segments);
      rail.push(new THREE.Vector3(Math.cos(a) * r, BELT_H, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(rail);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, segments, 0.03, 6, false),
      new THREE.MeshStandardMaterial({ color: P.beltSide, roughness: 0.7 })
    );
    tube.castShadow = true;
    g.add(tube);
  });

  // 支腿：与皮带面同一坐标系
  const legCount = Math.max(2, Math.round(segments / 5));
  for (let i = 0; i <= legCount; i++) {
    const a = a0 + (a1 - a0) * (i / legCount);
    const leg = cyl(0.04, 0.05, BELT_H - 0.05, 6, P.machineDark);
    leg.position.set(Math.cos(a) * radius, (BELT_H - 0.05) / 2, Math.sin(a) * radius);
    g.add(leg);
  }
  return g;
}


// ========== U 型线布局 ==========
// 尺寸设定
const U_TOP_LEN = 17;     // 线体总长（x 方向，含两端弯道）
const U_BOT_LEN = 17;     // 回流段总长，必须与顶段一致
const U_DEPTH = 6.5;      // U 型深度（z 方向，两直段中心距）
const U_TOP_Z = U_DEPTH / 2 + 0.2;     // 顶部直线 z
const U_BOT_Z = -U_DEPTH / 2 - 0.2;    // 底部直线 z
const U_MID_Z = (U_TOP_Z + U_BOT_Z) / 2;      // 弯道中心 z
// 闭环约束：弯道半径必须等于 U 型半深度，弧端才落在直段所在的 z 上
const U_CURVE_R = U_TOP_Z - U_MID_Z;   // = 3.45，保证首尾无断口
const U_LEFT_X = -U_TOP_LEN / 2 + U_CURVE_R;   // 左侧弯道中心 x
const U_RIGHT_X = U_TOP_LEN / 2 - U_CURVE_R;   // 右侧弯道中心 x

// ========== 车间总体布局常量（自西向东，单一来源避免重合） ==========
const LAYOUT = {
  podX:      -20.0,   // 注塑岛机身中心 x
  podHandX:  -17.8,   // 注塑岛出料交接台 x（AMR 侧向对接）
  mainX:     -16.4,   // 南北主通道中心 x
  pickX:     -13.8,   // FIFO 拣货巷中心 x
  fifoX:     -12.3,   // FIFO 货架中心 x
  podZ:      [-6, 0, 6],   // 三个注塑岛 z
};

const uLine = new THREE.Group();
scene.add(uLine);

// 顶部直段（从左到右流动）
const beltTop = buildBeltStraight(U_TOP_LEN - U_CURVE_R * 2);
beltTop.position.set(0, 0, U_TOP_Z);
uLine.add(beltTop);

// 底部直段（从右到左流动，回流）
const beltBot = buildBeltStraight(U_BOT_LEN - U_CURVE_R * 2);
beltBot.position.set(0, 0, U_BOT_Z);
uLine.add(beltBot);

// 右侧弯（顶部末端 -> 底部始端）：极角 +90° 扫到 -90°，弧面凸向 +X
const curveRight = buildBeltCurve(U_CURVE_R, Math.PI / 2, -Math.PI / 2, 24);
curveRight.position.set(U_RIGHT_X, 0, U_MID_Z);
uLine.add(curveRight);

// 左侧弯（底部末端 -> 顶部始端）：极角 -90° 扫到 -270°，弧面凸向 -X
const curveLeft = buildBeltCurve(U_CURVE_R, -Math.PI / 2, -Math.PI * 1.5, 24);
curveLeft.position.set(U_LEFT_X, 0, U_MID_Z);
uLine.add(curveLeft);

// ========== 7 个工位（顶部直线段均匀分布） ==========
// 人机协同分工：manual = 人工柔性工位，auto = 自动检测/加工工位
const stationTypes = [
  { key: 'load',    name: '① 人工上料/扫码', type: 'scan',     mode: 'manual' },
  { key: 'pin',     name: '② 人工装针',      type: 'pin',      mode: 'manual' },
  { key: 'etest',   name: '③ 自动电测',      type: 'etest',    mode: 'auto'   },
  { key: 'aoi',     name: '④ 自动视觉 AOI',  type: 'aoi',      mode: 'auto'   },
  { key: 'function',name: '⑤ 自动气密测试',  type: 'function', mode: 'auto'   },
  { key: 'marking', name: '⑥ 自动打标',      type: 'marking',  mode: 'auto'   },
  { key: 'pack',    name: '⑦ 人工包装/下料', type: 'pack',     mode: 'manual' },
];

const stations = [];
const stationSpacing = (U_TOP_LEN - U_CURVE_R * 2) / (stationTypes.length + 1);
stationTypes.forEach((s, i) => {
  const x = - (U_TOP_LEN - U_CURVE_R * 2) / 2 + stationSpacing * (i + 1);
  const st = buildStation(s.type, 1.3, 1.1);
  st.position.set(x, 0, U_TOP_Z + 1.1);  // 位于传送带外侧
  uLine.add(st);
  addLabel(st, s.name, 2.4);
  stations.push({ obj: st, data: s, x, z: U_TOP_Z + 1.1 });
});

// ========== 自动工位的协作机器人（仅 auto 工位配机器人） ==========
const robots = [];
stations.forEach((s, i) => {
  if (s.data.mode !== "auto") return;
  const r = buildRobot();
  r.position.set(s.x + 0.42, 0, s.z - 0.32);
  r.userData.turret.rotation.y = -Math.PI / 3;
  uLine.add(r);
  robots.push({ obj: r, stationIdx: i, phase: i * 0.35 });
});

// ========== 人工工位的作业员（站在 U 型开口内侧，面朝各自工位） ==========
const workers = [];
stations.forEach((s, i) => {
  if (s.data.mode !== "manual") return;
  const w = buildWorker();
  // 站位：工位正对面，位于 U 型内侧（传送带南侧）
  w.position.set(s.x + 0.1, 0, U_TOP_Z - 1.25);
  w.rotation.y = Math.PI;   // 面朝北侧工位
  uLine.add(w);
  workers.push({ obj: w, stationIdx: i, task: s.data.key, phase: i * 0.8 });
});

// 额外一名物流作业员：负责给 AMR 上下货（站在上料缓存台旁）
const logisticsWorker = buildWorker(0x2b7c5c);
logisticsWorker.position.set(-5.6, 0, U_TOP_Z + 2.75);
logisticsWorker.rotation.y = -Math.PI / 2;
scene.add(logisticsWorker);
addLabel(logisticsWorker, "物流作业员 · AMR 上下货", 2.0);

// ========== 内侧料架（工具/周转箱） ==========
const rackColors = [P.binBlue, P.binGray, P.binGreen, P.binRed, P.binYellow, P.binBlue];
for (let i = 0; i < 5; i++) {
  const rack = box(1.0, 0.9, 0.6, P.rack);
  rack.position.set(-5.6 + i * 2.8, 0.45, U_BOT_Z + 1.15);
  uLine.add(rack);
  // 每层放料箱
  for (let j = 0; j < 2; j++) {
    for (let k = 0; k < 2; k++) {
      const bin = buildBin(rackColors[(i + j + k) % rackColors.length], 0.32);
      bin.position.set(-0.25 + k * 0.5, 0.15 + j * 0.42, 0);
      rack.add(bin);
    }
  }
}
// ========== 注塑工作岛（左侧 3 个） ==========
const injectionPods = [];
function buildInjectionMachine(podIndex) {
  const g = new THREE.Group();
  const body = box(1.8, 1.3, 1.2, P.machine);
  body.position.y = 0.65;
  g.add(body);
  const hopper = cyl(0.25, 0.5, 0.6, 8, P.machineDark);
  hopper.position.set(0, 1.6, 0.35);
  g.add(hopper);
  const barrel = cyl(0.12, 0.12, 1.3, 12, P.machineDark);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.2, 1.1, 0.4);
  g.add(barrel);
  const door = box(1.4, 0.9, 0.05, P.glass, { transparent: true, opacity: 0.45, roughness: 0.1 });
  door.position.set(0, 0.95, -0.6);
  g.add(door);
  const ftop = box(1.5, 0.05, 0.06, P.machineDark);
  ftop.position.set(0, 1.4, -0.58);
  g.add(ftop);
  const fbot = box(1.5, 0.05, 0.06, P.machineDark);
  fbot.position.set(0, 0.5, -0.58);
  g.add(fbot);
  const panel = box(0.3, 0.5, 0.08, P.machineDark);
  panel.position.set(-0.85, 1.05, -0.5);
  panel.rotation.y = 0.3;
  g.add(panel);
  const screen = box(0.22, 0.18, 0.02, 0x1a3a5a);
  screen.position.set(-0.85, 1.15, -0.455);
  g.add(screen);
  const lampColor = podIndex === 1 ? P.stWarn : P.stOk;
  const lamp = sph(0.08, 8, lampColor, { emissive: lampColor, emissiveIntensity: 0.7 });
  lamp.position.set(0.7, 1.8, 0);
  g.add(lamp);
  g.userData.lamp = lamp;
  return g;
}

for (let i = 0; i < 3; i++) {
  const pod = new THREE.Group();
  const machine = buildInjectionMachine(i);
  machine.position.set(LAYOUT.podX, 0, LAYOUT.podZ[i]);
  pod.add(machine);
  addLabel(machine, '注塑岛 ' + String.fromCharCode(65 + i) + ' · 产品族' + String.fromCharCode(65 + i), 2.6);

  const binOut = buildBin(P.binBlue, 0.55);
  binOut.position.set(LAYOUT.podHandX, 0.25, LAYOUT.podZ[i] + 0.45);
  pod.add(binOut);
  const binOut2 = buildBin(P.binGray, 0.55);
  binOut2.position.set(LAYOUT.podHandX, 0.25, LAYOUT.podZ[i] - 0.45);
  pod.add(binOut2);

  const stand = box(0.7, 0.6, 0.5, P.machineDark);
  stand.position.set(LAYOUT.podHandX, 0.35, LAYOUT.podZ[i]);
  pod.add(stand);
  const smallBin = buildBin(P.binGreen, 0.38);
  smallBin.position.set(LAYOUT.podHandX, 0.86, LAYOUT.podZ[i]);
  pod.add(smallBin);

  const arm = buildRobot(P.robotArm, P.robotJoint);
  arm.scale.setScalar(0.7);
  arm.position.set(LAYOUT.podX + 1.5, 0, LAYOUT.podZ[i] - 0.8);
  arm.userData.turret.rotation.y = Math.PI / 3;
  pod.add(arm);

  scene.add(pod);
  injectionPods.push({ group: pod, machine, arm, idx: i, outputBin: binOut, phase: i * 0.7, handoff: 0 });
}

// ========== 车间通道系统（正交主干道） ==========
// 布局理念：注塑岛沿西墙排布，其东侧为南北向主通道；
// FIFO 超市位于主通道东侧，货架开口朝通道；
// U 型包装线在东区，经北侧横向通道与主通道连通。
const AISLE = {
  mainX:   LAYOUT.mainX,   // 南北主通道 x
  pickX:   LAYOUT.pickX,   // FIFO 拣货巷 x
  southZ:  -8.8,           // 南侧横向通道 z（U 型线南缘 -3.83 之外）
  northZ:  10.4,           // 北侧横向通道 z
  feedZ:    6.35,          // 上料端支道 z（北侧工位外缘 5.10 之外）
  feedEndX: -6.0,          // 上料支道东端 x（上料缓存台西侧）
  width:    2.2,
};

// 通道路面（比地面略浅，带边缘标线）
function addAisleStrip(x1, z1, x2, z2, w) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const ang = Math.atan2(z2 - z1, x2 - x1);
  const road = box(len, 0.02, w, 0xe2dcc4, { roughness: 0.95 });
  road.rotation.y = -ang;
  road.position.set((x1 + x2) / 2, 0.035, (z1 + z2) / 2);
  scene.add(road);
  // 两侧黄色边线
  [-1, 1].forEach(s => {
    const edge = box(len, 0.012, 0.07, P.binYellow, { roughness: 0.8 });
    edge.rotation.y = -ang;
    const ox = Math.sin(ang) * (w / 2) * s;
    const oz = -Math.cos(ang) * (w / 2) * s;
    edge.position.set((x1 + x2) / 2 + ox, 0.05, (z1 + z2) / 2 + oz);
    scene.add(edge);
  });
  return road;
}

// 主通道：南北贯通，沿注塑岛东侧
addAisleStrip(AISLE.mainX, AISLE.southZ, AISLE.mainX, AISLE.northZ, AISLE.width);
// FIFO 拣货巷：南接主通道，北通上料支道
addAisleStrip(AISLE.pickX, -7.4, AISLE.pickX, AISLE.feedZ, 1.9);
// 拣货巷南端与主通道的连接口
addAisleStrip(AISLE.mainX, -7.4, AISLE.pickX, -7.4, 1.9);
// 上料支道：拣货巷北端向东，绕过 U 型线北侧工位
addAisleStrip(AISLE.pickX, AISLE.feedZ, AISLE.feedEndX, AISLE.feedZ, AISLE.width);
// 上料端东侧回车道：北上接北通道
addAisleStrip(AISLE.feedEndX, AISLE.feedZ, AISLE.feedEndX, AISLE.northZ, AISLE.width);
// 北侧横向通道：回主通道（单向环通）
addAisleStrip(AISLE.mainX, AISLE.northZ, AISLE.feedEndX, AISLE.northZ, AISLE.width);
// 南侧横向通道（备用）
addAisleStrip(AISLE.mainX, AISLE.southZ, 2.0, AISLE.southZ, AISLE.width);
// 通道方向箭头（地面导向标识）
function addAisleArrow(x, z, yaw) {
  const a = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.42, 3),
    new THREE.MeshStandardMaterial({ color: 0xb8ad7a, roughness: 0.85 })
  );
  a.rotation.x = -Math.PI / 2;
  a.rotation.z = -yaw;
  a.position.set(x, 0.055, z);
  scene.add(a);
}
// 主通道：自北向南
for (let z = -6.0; z <= 8.0; z += 3.4) addAisleArrow(AISLE.mainX, z, Math.PI);
// 拣货巷：自南向北
for (let z = -5.4; z <= 4.6; z += 3.3) addAisleArrow(AISLE.pickX, z, 0);
// 上料支道：自西向东
for (let x = -12.0; x <= -7.6; x += 2.2) addAisleArrow(x, AISLE.feedZ, Math.PI / 2);
// 北通道：自东向西（回程）
for (let x = -8.0; x >= -14.0; x -= 2.6) addAisleArrow(x, AISLE.northZ, -Math.PI / 2);
// ========== FIFO 超市 ==========
const fifoRacks = [];
const fifoGroup = new THREE.Group();
scene.add(fifoGroup);
const fifoX = LAYOUT.fifoX;   // 拣货巷东侧，取货面朝西

const rackCount = 4;
for (let i = 0; i < rackCount; i++) {
  const rack = new THREE.Group();
  for (let j = 0; j < 4; j++) {
    const col = box(0.08, 1.8, 0.08, P.rack);
    col.position.set(-0.55 + (j % 2) * 1.1, 0.9, -0.45 + Math.floor(j / 2) * 0.9);
    rack.add(col);
  }
  for (let k = 0; k < 3; k++) {
    const shelf = box(1.2, 0.05, 1.0, P.rack);
    shelf.position.set(0, 0.3 + k * 0.6, 0);
    rack.add(shelf);
    for (let b = 0; b < 3; b++) {
      const colors = [P.binBlue, P.binGreen, P.binRed, P.binYellow, P.binGray];
      const bin = buildBin(colors[(i + k + b) % colors.length], 0.34);
      bin.position.set(-0.38 + b * 0.38, 0.3 + k * 0.6 + 0.17, 0);
      rack.add(bin);
    }
  }
  const z = -(rackCount - 1) / 2 * 1.5 + i * 1.5;
  rack.position.set(fifoX, 0, z);
  rack.rotation.y = Math.PI / 2;   // 取货面朝主通道

  fifoGroup.add(rack);
  fifoRacks.push(rack);
}
const fifoLabelAnchor = new THREE.Group();
fifoLabelAnchor.position.set(fifoX, 0, 0);
scene.add(fifoLabelAnchor);
addLabel(fifoLabelAnchor, 'FIFO 超市 · 小批量缓存区', 2.8);

// ========== AMR 小车 ==========
function buildAMR() {
  const g = new THREE.Group();
  const body = box(0.9, 0.3, 0.7, P.amr);
  body.position.y = 0.15;
  g.add(body);
  const base = box(0.95, 0.06, 0.75, P.amrDark);
  base.position.y = 0.03;
  g.add(base);
  const deck = box(0.8, 0.06, 0.6, P.machineDark);
  deck.position.y = 0.33;
  g.add(deck);
  const led = sph(0.05, 8, P.stOk, { emissive: P.stOk, emissiveIntensity: 0.8 });
  led.position.set(0, 0.42, 0.25);
  g.add(led);
  g.userData.led = led;
  for (let i = 0; i < 4; i++) {
    const w = cyl(0.08, 0.08, 0.06, 12, 0x222222);
    w.rotation.z = Math.PI / 2;
    w.position.set((i < 2 ? 0.32 : -0.32), 0.08, (i % 2 === 0 ? 0.3 : -0.3));
    g.add(w);
  }
  const sensor = cyl(0.04, 0.04, 0.06, 8, P.machineDark);
  sensor.position.set(0, 0.38, -0.3);
  g.add(sensor);
  const cargo = new THREE.Group();
  cargo.position.y = 0.55;
  g.add(cargo);
  g.userData.cargo = cargo;
  return g;
}

// AMR 环线：全程沿通道中心线行驶，转向均为 90 度正交
// 主通道南下取料 -> 拣货巷入库 -> 主通道北上 -> 上料支道东折补料 -> 折返
const AZ = AISLE;
const amrPath = [
  // 主通道自北向南，侧向对接三个注塑岛出料口
  { p: new THREE.Vector3(AZ.mainX, 0,  8.4) },
  { p: new THREE.Vector3(AZ.mainX, 0,  6.0), stop: "pod", podIdx: 2, dwell: 2.2 },
  { p: new THREE.Vector3(AZ.mainX, 0,  0.0), stop: "pod", podIdx: 1, dwell: 2.2 },
  { p: new THREE.Vector3(AZ.mainX, 0, -6.0), stop: "pod", podIdx: 0, dwell: 2.2 },
  // 南下至拣货巷南连接口，东折进巷
  { p: new THREE.Vector3(AZ.mainX, 0, -7.4) },
  { p: new THREE.Vector3(AZ.pickX, 0, -7.4) },
  // 拣货巷北上：入库成品、取空箱
  { p: new THREE.Vector3(AZ.pickX, 0, -1.6), stop: "fifo", dwell: 2.6 },
  { p: new THREE.Vector3(AZ.pickX, 0,  1.6), stop: "fifo", dwell: 2.0 },
  // 继续北上出巷，走上料支道东折（不与主通道共线）
  { p: new THREE.Vector3(AZ.pickX, 0, AZ.feedZ) },
  { p: new THREE.Vector3(AZ.feedEndX, 0, AZ.feedZ), stop: "line", dwell: 2.4 },
  // 东端北上，经北通道西折回主通道北端（单向环通，无折返）
  { p: new THREE.Vector3(AZ.feedEndX, 0, AZ.northZ) },
  { p: new THREE.Vector3(AZ.mainX, 0, AZ.northZ) },
];
const amrPathPts = amrPath.map(n => n.p);

// AMR 停靠位地面标记（注塑岛 / FIFO / 上料端）
const dockMarks = [];
amrPath.forEach(node => {
  if (!node.stop) return;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 24),
    new THREE.MeshStandardMaterial({ color: P.binYellow, roughness: 0.8,
      emissive: P.binYellow, emissiveIntensity: 0.15,
      transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(node.p.x, 0.07, node.p.z);
  scene.add(ring);
  dockMarks.push({ mesh: ring, kind: node.stop });
});

// U 型线上料端收料台（AMR 补料的落点）
const lineInfeed = new THREE.Group();
lineInfeed.position.set(-5.6, 0, U_TOP_Z + 1.75);
const infeedTable = box(1.1, 0.7, 0.8, P.machine);
infeedTable.position.y = 0.35;
lineInfeed.add(infeedTable);
const infeedTop = box(1.05, 0.06, 0.75, P.machineDark);
infeedTop.position.y = 0.72;
lineInfeed.add(infeedTop);
const infeedBin = buildBin(P.binGreen, 0.42);
infeedBin.position.y = 0.96;
lineInfeed.add(infeedBin);
scene.add(lineInfeed);
addLabel(lineInfeed, '上料缓存台', 1.9);

const amrs = [];
const AMR_COUNT = 3;
for (let i = 0; i < AMR_COUNT; i++) {
  const amr = buildAMR();
  scene.add(amr);
  // 初始沿环线均匀错开，避免开局聚集
  amrs.push({
    obj: amr,
    seg: Math.floor(i * amrPath.length / AMR_COUNT),
    segT: 0.15,
    speed: 1.5,          // 统一车速，靠车距控制防追尾
    speedFactor: 1,
    blocked: false,
    dwellLeft: 0,
    carrying: false,
    deliveryCount: 0,
  });
}
// ========== 货物交接动画系统 ==========
// 料箱在世界坐标之间飞行，落位后归属目标容器；实现真实的"转移"而非凭空生成/消失
const transfers = [];

function startTransfer(bin, fromWorld, toWorld, dur = 0.9, onDone = null) {
  // 把 bin 挂到场景根，用世界坐标做插值
  scene.add(bin);
  bin.position.copy(fromWorld);
  transfers.push({
    bin, from: fromWorld.clone(), to: toWorld.clone(),
    t: 0, dur, onDone,
    arc: 0.45 + Math.random() * 0.15,   // 抛物线高度
  });
}

function updateTransfers(dt) {
  for (let i = transfers.length - 1; i >= 0; i--) {
    const tr = transfers[i];
    tr.t += dt / tr.dur;
    const k = Math.min(1, tr.t);
    // 水平线性 + 垂直抛物线
    tr.bin.position.lerpVectors(tr.from, tr.to, k);
    tr.bin.position.y += Math.sin(k * Math.PI) * tr.arc;
    tr.bin.rotation.y += dt * 2.2;
    if (k >= 1) {
      if (tr.onDone) tr.onDone(tr.bin);
      else scene.remove(tr.bin);
      transfers.splice(i, 1);
    }
  }
}

// 取某物体的世界坐标
const _wv = new THREE.Vector3();
function worldPos(obj, offY = 0) {
  obj.getWorldPosition(_wv);
  return new THREE.Vector3(_wv.x, _wv.y + offY, _wv.z);
}
// 逐段推进的 AMR 运动：按真实距离行走，可在站点停留
const amrSegLens = amrPathPts.map((a, i) =>
  a.distanceTo(amrPathPts[(i + 1) % amrPathPts.length]));

// 环线累计弧长（保留用于调试与里程统计）
const amrSegStart = [];
{ let acc = 0; for (let i = 0; i < amrSegLens.length; i++) { amrSegStart.push(acc); acc += amrSegLens[i]; } }
const amrLoopLen = amrSegLens.reduce((s, v) => s + v, 0);
function amrArc(a) { return amrSegStart[a.seg] + a.segT * amrSegLens[a.seg]; }

// 防碰撞参数
const AMR_BODY = 0.95;      // 车长
const AMR_SAFE_GAP = 2.4;   // 期望安全净距 m
const AMR_STOP_GAP = 1.35;  // 硬停净距 m
// 弧长 -> 世界坐标（供环线几何自检使用）
function arcToPoint(arc) {
  let x = ((arc % amrLoopLen) + amrLoopLen) % amrLoopLen;
  for (let i = 0; i < amrSegLens.length; i++) {
    if (x <= amrSegLens[i] || i === amrSegLens.length - 1) {
      const from = amrPathPts[i], to = amrPathPts[(i + 1) % amrPathPts.length];
      return new THREE.Vector3().lerpVectors(from, to, Math.min(1, x / amrSegLens[i]));
    }
    x -= amrSegLens[i];
  }
  return amrPathPts[0].clone();
}

// 防碰撞：单向闭环上的"环序跟车"
// 前置事实：__pathOverlap() 为空 —— 环线不自重叠，故沿环弧长的间距与物理间距一致。
// 车辆不允许超车，环序恒定；总间距 = 56.4 - 3*0.95 = 53.6m，远大于 3 倍硬停间距，
// 故不可能出现三车互相等待的闭环 —— 结构上无死锁，不需要超时脱困兜底。
function clearanceAhead(a, fleet) {
  const myArc = amrArc(a);
  let minGap = Infinity;
  for (const o of fleet) {
    if (o === a) continue;
    let d = amrArc(o) - myArc;
    if (d < 0) d += amrLoopLen;      // 只取环序意义上位于前方的车
    const gap = d - AMR_BODY;        // 扣掉车身长度得净距
    if (gap < minGap) minGap = gap;
  }
  return minGap;
}

function advanceAMR(a, dt, fleet) {
  // 停靠中：倒计时，不移动
  if (a.dwellLeft > 0) {
    a.dwellLeft -= dt;
    a.blocked = false;
    a.speedFactor = 0;
    return false;
  }
  // 按前车净距线性限速：>= 安全间距全速，<= 硬停间距停住
  const gap = clearanceAhead(a, fleet);
  let factor = 1;
  if (gap < AMR_STOP_GAP) factor = 0;
  else if (gap < AMR_SAFE_GAP)
    factor = (gap - AMR_STOP_GAP) / (AMR_SAFE_GAP - AMR_STOP_GAP);

  a.blocked = factor < 0.05;
  a.speedFactor = factor;
  if (factor <= 0) return false;

  const segLen = amrSegLens[a.seg];
  a.segT += (a.speed * factor * dt) / segLen;
  let arrived = false;
  while (a.segT >= 1) {
    a.segT -= 1;
    a.seg = (a.seg + 1) % amrPathPts.length;
    arrived = true;
  }
  return arrived;
}

function amrTransform(a) {
  const from = amrPathPts[a.seg];
  const to = amrPathPts[(a.seg + 1) % amrPathPts.length];
  const pos = new THREE.Vector3().lerpVectors(from, to, a.segT);
  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  return { pos, dir };
}
// ========== 传送带上的零件托盘（循环流动） ==========
const beltParts = [];
const PART_COUNT = 22;   // 沿 41.9m 环线约每 1.9m 一个载具
const U_TOP_INNER = U_TOP_LEN - U_CURVE_R * 2;
const U_BOT_INNER = U_BOT_LEN - U_CURVE_R * 2;
const U_CURVE_LEN = Math.PI * U_CURVE_R;
const uTotalLen = U_TOP_INNER + U_BOT_INNER + U_CURVE_LEN * 2;
const BELT_LINE_SPEED = 2.3;                       // 传送带物理线速 m/s
const BELT_SPEED_RATIO = BELT_LINE_SPEED / uTotalLen;  // 折算为每秒进度比例

function getPosOnULine(progress01) {
  let dist = progress01 * uTotalLen;
  if (dist < U_TOP_INNER) {
    const x = -U_TOP_INNER / 2 + dist;
    return { pos: new THREE.Vector3(x, BELT_H + 0.06, U_TOP_Z), angle: 0 };
  }
  dist -= U_TOP_INNER;
  if (dist < U_CURVE_LEN) {
    const t = dist / U_CURVE_LEN;
    const a = Math.PI / 2 - t * Math.PI;
    const x = U_RIGHT_X + Math.cos(a) * U_CURVE_R;
    const z = U_MID_Z + Math.sin(a) * U_CURVE_R;
    return { pos: new THREE.Vector3(x, BELT_H + 0.06, z), angle: -t * Math.PI };
  }
  dist -= U_CURVE_LEN;
  if (dist < U_BOT_INNER) {
    const x = U_BOT_INNER / 2 - dist;
    return { pos: new THREE.Vector3(x, BELT_H + 0.06, U_BOT_Z), angle: Math.PI };
  }
  dist -= U_BOT_INNER;
  const t = dist / U_CURVE_LEN;
  const a = -Math.PI / 2 - t * Math.PI;
  const x = U_LEFT_X + Math.cos(a) * U_CURVE_R;
  const z = U_MID_Z + Math.sin(a) * U_CURVE_R;
  return { pos: new THREE.Vector3(x, BELT_H + 0.06, z), angle: Math.PI - t * Math.PI };
}

for (let i = 0; i < PART_COUNT; i++) {
  const tray = box(0.3, 0.04, 0.22, P.machineDark);
  const part = buildPart();
  part.position.y = 0.06;
  tray.add(part);
  scene.add(tray);
  beltParts.push({ mesh: tray, progress: i / PART_COUNT });
}

// ========== 厂房背景墙 & 装饰 ==========
// 后面厂房墙体
const backWall = box(55, 8, 0.3, P.wall);
backWall.position.set(0, 4, -14);
backWall.receiveShadow = true;
scene.add(backWall);

// 厂房窗户（一排）
for (let i = 0; i < 9; i++) {
  const win = box(2.5, 1.8, 0.15, P.glass, { transparent: true, opacity: 0.5 });
  win.position.set(-20 + i * 5, 5, -13.85);
  scene.add(win);
}

// 右侧墙
const rightWall = box(0.3, 7, 28, P.wall);
rightWall.position.set(18, 3.5, -2);
rightWall.receiveShadow = true;
scene.add(rightWall);

// 屋顶横梁
for (let i = 0; i < 6; i++) {
  const beam = box(38, 0.3, 0.4, P.wallFrame);
  beam.position.set(-2, 7.8, -12 + i * 4);
  scene.add(beam);
}

// 树木 & 绿化（厂房外）
function buildTree() {
  const g = new THREE.Group();
  const trunk = cyl(0.12, 0.15, 1.2, 6, 0x6b4a2b);
  trunk.position.y = 0.6;
  g.add(trunk);
  const leaves = sph(0.7, 10, 0x6aa84f, { roughness: 0.9 });
  leaves.position.y = 1.4;
  g.add(leaves);
  const leaves2 = sph(0.55, 10, 0x7cb85a, { roughness: 0.9 });
  leaves2.position.set(0.3, 1.2, 0.2);
  g.add(leaves2);
  return g;
}

const treePositions = [
  [-18, -13], [-16, -13.5], [-19, -10],
  [18, -8], [19, -11], [17, -13],
  [-20, 8], [-20, 4], [-20, 0], [-20, -4],
  [14, -13.5], [10, -13.5], [6, -13.5],
];
treePositions.forEach(([x, z]) => {
  const t = buildTree();
  t.position.set(x, 0, z);
  t.scale.setScalar(0.9 + Math.random() * 0.4);
  scene.add(t);
});

// 地面小草坪块
for (let i = 0; i < 6; i++) {
  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(1.2 + Math.random(), 16),
    new THREE.MeshStandardMaterial({ color: 0x8ab86a, roughness: 1 })
  );
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(-22 + Math.random() * 6, 0.015, -10 + Math.random() * 18);
  scene.add(patch);
}

// ========== 信息流动画线（绿色虚线指示方向，注塑→FIFO→U型线） ==========
function buildFlowArrow(start, end, color = 0x6aa84f) {
  const group = new THREE.Group();
  const len = start.distanceTo(end);
  const dir = new THREE.Vector3().subVectors(end, start).normalize();
  // 虚线段
  const segCount = Math.floor(len / 0.4);
  for (let i = 0; i < segCount; i += 2) {
    const segLen = len / segCount;
    const s = i * segLen;
    const seg = box(segLen, 0.03, 0.06, color, { emissive: color, emissiveIntensity: 0.3 });
    const mid = start.clone().add(dir.clone().multiplyScalar(s + segLen / 2));
    seg.position.copy(mid);
    seg.rotation.y = -Math.atan2(dir.z, dir.x);
    group.add(seg);
  }
  // 箭头头
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.3, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 })
  );
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.copy(end.clone().add(dir.clone().multiplyScalar(-0.15)));
  arrow.position.y += 0.02;
  // 绕z轴旋转以对齐方向
  arrow.rotation.z = Math.atan2(dir.z, dir.x) - Math.PI / 2;
  group.add(arrow);
  return group;
}

// 物流指示：沿通道正交走向，与 AMR 实际路线一致
// 注塑岛出料 -> 主通道（侧向短箭头）
for (let i = 0; i < 3; i++) {
  const z = -6 + i * 6;
  scene.add(buildFlowArrow(
    new THREE.Vector3(-11.4, 0.05, z),
    new THREE.Vector3(AISLE.mainX - 0.5, 0.05, z), P.stOk));
}
// 主通道 -> 拣货巷（入库方向）
scene.add(buildFlowArrow(
  new THREE.Vector3(AISLE.mainX + 0.4, 0.05, -4.4),
  new THREE.Vector3(AISLE.pickX - 0.3, 0.05, -4.4), P.stOk));
// 拣货巷 -> 主通道（空箱回流）
scene.add(buildFlowArrow(
  new THREE.Vector3(AISLE.pickX - 0.3, 0.05, 3.8),
  new THREE.Vector3(AISLE.mainX + 0.4, 0.05, 3.8), P.stWarn));
// 主通道 -> 上料端支道（补料方向）
scene.add(buildFlowArrow(
  new THREE.Vector3(AISLE.mainX + 0.5, 0.05, AISLE.feedZ),
  new THREE.Vector3(AISLE.feedEndX - 0.4, 0.05, AISLE.feedZ), P.stOk));

// ========== 动画循环 ==========
const clock = new THREE.Clock();
let outputCount = 0;
let deliveries = 0;
let fifoPulse = 0;   // FIFO 入库高亮衰减
let linePulse = 0;   // U型线补料高亮衰减
const ui = {
  kpiOutput: document.getElementById('kpi-output'),
  kpiOee:    document.getElementById('kpi-oee'),
  kpiWip:    document.getElementById('kpi-wip'),
  stYield:   document.getElementById('st-yield'),
  stAlert:   document.getElementById('st-alert'),
  amrDel:    document.getElementById('amr-deliveries'),
  effA: document.getElementById('eff-a'), barA: document.getElementById('bar-a'),
  effB: document.getElementById('eff-b'), barB: document.getElementById('bar-b'),
  effC: document.getElementById('eff-c'), barC: document.getElementById('bar-c'),
  effU: document.getElementById('eff-u'), barU: document.getElementById('bar-u'),
};

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  // ----- 传送带零件流动 -----
  const beltSpeed = BELT_SPEED_RATIO;
  for (const p of beltParts) {
    p.progress = (p.progress + dt * beltSpeed) % 1;
    const { pos, angle } = getPosOnULine(p.progress);
    p.mesh.position.copy(pos);
    p.mesh.rotation.y = angle;
  }

  // ----- 机械臂动画 -----
  for (const r of robots) {
    const phase = (t * 1.2 + r.phase) % 3;
    const turret = r.obj.userData.turret;
    const lower  = r.obj.userData.lowerArm;
    const upper  = r.obj.userData.upperArm;
    const wrist  = r.obj.userData.wrist;
    if (phase < 1) {
      // 伸向传送带取件
      turret.rotation.y = -Math.PI / 2.5 + Math.sin(t * 2 + r.phase) * 0.1;
      lower.rotation.z = 0.3 + Math.sin(t * 2 + r.phase) * 0.1;
      upper.rotation.z = -0.8 + Math.sin(t * 3 + r.phase) * 0.15;
      wrist.rotation.z = 0.6;
    } else if (phase < 2) {
      // 回到工位检测
      turret.rotation.y = -Math.PI / 6 + Math.sin(t * 2 + r.phase) * 0.1;
      lower.rotation.z = 0.6;
      upper.rotation.z = -0.5;
      wrist.rotation.z = -0.3;
    } else {
      // 放下/等待
      turret.rotation.y = -Math.PI / 3;
      lower.rotation.z = 0.2;
      upper.rotation.z = -0.3;
      wrist.rotation.z = 0.1;
    }
  }

  // ----- 注塑岛机械臂（AMR 到站时做交接动作） -----
  for (const pod of injectionPods) {
    const arm = pod.arm;
    const tt = t * 1.5 + pod.phase;
    // handoff 从 1 衰减到 0，期间机械臂转向 AMR 侧并下探
    if (pod.handoff > 0) pod.handoff = Math.max(0, pod.handoff - dt * 0.5);
    const h = pod.handoff;
    const ease = Math.sin(h * Math.PI);   // 0->1->0 的平滑包络
    arm.userData.turret.rotation.y = Math.PI / 3 + Math.sin(tt) * 0.4 * (1 - h) + ease * 0.9;
    arm.userData.lowerArm.rotation.z = 0.4 + Math.sin(tt * 1.3) * 0.2 * (1 - h) + ease * 0.45;
    arm.userData.upperArm.rotation.z = -0.6 + Math.sin(tt * 1.7) * 0.2 * (1 - h) - ease * 0.5;
    // 状态灯：交接时转蓝，B 岛常态琥珀
    if (pod.machine.userData.lamp) {
      const lm = pod.machine.userData.lamp.material;
      const pulse = 0.5 + 0.5 * Math.sin(t * 4 + pod.phase);
      if (h > 0.05) {
        lm.color.setHex(P.stBlue); lm.emissive.setHex(P.stBlue);
        lm.emissiveIntensity = 0.6 + ease * 0.8;
      } else {
        const base = pod.idx === 1 ? P.stWarn : P.stOk;
        lm.color.setHex(base); lm.emissive.setHex(base);
        lm.emissiveIntensity = 0.4 + pulse * 0.6;
      }
    }
  }
  // ----- 人工工位作业员动作（按任务差异化） -----
  for (const w of workers) {
    const tt = t * 1.0 + w.phase;
    const aL = w.obj.userData.armL, aR = w.obj.userData.armR;
    if (w.task === "pin") {
      // 装针：小幅高频精细动作，双手交替
      aL.rotation.x = -0.7 + Math.sin(tt * 4.5) * 0.16;
      aR.rotation.x = -0.7 + Math.sin(tt * 4.5 + Math.PI) * 0.16;
      w.obj.rotation.y = Math.PI + Math.sin(tt * 0.5) * 0.05;
    } else if (w.task === "pack") {
      // 包装：大幅取放动作，含转身放箱
      const cyc = (tt * 0.7) % 1;
      const reach = Math.sin(cyc * Math.PI);
      aL.rotation.x = -0.45 - reach * 0.7;
      aR.rotation.x = -0.45 - reach * 0.7;
      w.obj.rotation.y = Math.PI + Math.sin(cyc * Math.PI * 2) * 0.35;
    } else {
      // 上料/扫码：中幅节律动作
      aL.rotation.x = -0.5 + Math.sin(tt * 2.2) * 0.34;
      aR.rotation.x = -0.5 + Math.sin(tt * 2.2 + 0.6) * 0.3;
      w.obj.rotation.y = Math.PI + Math.sin(tt * 0.6) * 0.12;
    }
  }

  // 物流作业员：AMR 到站时做搬运动作，否则待机张望
  {
    const amrAtLine = amrs.some(a => a.dwellLeft > 0 && a._activeStop && a._activeStop.stop === "line");
    const lw = logisticsWorker.userData;
    if (amrAtLine) {
      const s = Math.sin(t * 3.2);
      lw.armL.rotation.x = -1.0 + s * 0.5;
      lw.armR.rotation.x = -1.0 + s * 0.5;
      logisticsWorker.rotation.y = -Math.PI / 2 + Math.sin(t * 1.6) * 0.5;
    } else {
      lw.armL.rotation.x = Math.sin(t * 0.9) * 0.12;
      lw.armR.rotation.x = Math.sin(t * 0.9 + 0.4) * 0.12;
      logisticsWorker.rotation.y = -Math.PI / 2 + Math.sin(t * 0.4) * 0.18;
    }
  }

  // ----- AMR 移动 + 到站装卸 -----
  for (const a of amrs) {
    const wasDwelling = a.dwellLeft > 0;
    const arrived = advanceAMR(a, dt, amrs);

    // 抵达新路径点：若是停靠站则触发动作
    if (arrived) {
      const node = amrPath[a.seg];
      if (node && node.stop) {
        a.dwellLeft = node.dwell || 2.0;
        a._activeStop = node;
      }
    }

    // 到站装卸：货物在容器之间真实转移（飞行动画 + 归属切换）
    if (a._activeStop && a.dwellLeft > 0 && !a._stopHandled) {
      a._stopHandled = true;
      const node = a._activeStop;
      const cargo = a.obj.userData.cargo;

      if (node.stop === "pod" && !a.carrying) {
        // 注塑岛 -> AMR：从交接台料箱位起飞，落到 AMR 货台
        const pod = injectionPods[node.podIdx];
        a.carrying = true;
        const colors = [P.binBlue, P.binGreen, P.binRed, P.binYellow];
        const bin = buildBin(colors[node.podIdx % colors.length], 0.45);
        const src = pod ? worldPos(pod.outputBin, 0.3) : worldPos(a.obj, 1.2);
        const dst = worldPos(cargo);
        startTransfer(bin, src, dst, 0.85, b2 => {
          scene.remove(b2);
          b2.position.set(0, 0, 0);
          cargo.add(b2);          // 归属转移到 AMR
        });
        if (pod) pod.handoff = 1.0;

      } else if (node.stop === "fifo") {
        if (a.carrying) {
          // AMR -> FIFO 货架：成品入库，货物离开 AMR 后消失于货架
          a.carrying = false;
          const bin = cargo.children[0];
          if (bin) {
            const src = worldPos(bin);
            const rack = fifoRacks[a.deliveryCount % fifoRacks.length];
            const dst = worldPos(rack, 1.15);
            cargo.remove(bin);
            startTransfer(bin, src, dst, 0.95, b2 => scene.remove(b2));
          }
          a.deliveryCount++;
          deliveries++;
          ui.amrDel.textContent = deliveries;
          fifoPulse = 1.0;
        } else {
          // FIFO -> AMR：取空周转箱回流
          a.carrying = true;
          const bin = buildBin(P.binGray, 0.42);
          const rack = fifoRacks[(a.deliveryCount + 1) % fifoRacks.length];
          startTransfer(bin, worldPos(rack, 1.15), worldPos(cargo), 0.85, b2 => {
            scene.remove(b2);
            b2.position.set(0, 0, 0);
            cargo.add(b2);
          });
        }

      } else if (node.stop === "line" && a.carrying) {
        // AMR -> 上料缓存台：物流作业员卸货，货物转移到线边
        a.carrying = false;
        const bin = cargo.children[0];
        if (bin) {
          const src = worldPos(bin);
          const dst = worldPos(lineInfeed, 1.0);
          cargo.remove(bin);
          startTransfer(bin, src, dst, 1.0, b2 => scene.remove(b2));
        }
        outputCount += 6;
        ui.kpiOutput.textContent = outputCount.toLocaleString();
        linePulse = 1.0;
      }
    }
    // 停靠结束，复位标记
    if (a.dwellLeft <= 0 && a._stopHandled) {
      a._stopHandled = false;
      a._activeStop = null;
    }

    // 位姿更新
    const { pos, dir } = amrTransform(a);
    a.obj.position.set(pos.x, 0, pos.z);
    const targetYaw = Math.atan2(dir.x, dir.z);
    // 平滑转向
    let dy = targetYaw - a.obj.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    a.obj.rotation.y += dy * Math.min(1, dt * 6);

    // 状态灯：停靠琥珀快闪 / 避让红灯 / 行进绿灯呼吸
    const dwelling = a.dwellLeft > 0;
    const targetLift = dwelling ? -0.02 : 0;
    a.obj.position.y += (targetLift - a.obj.position.y) * Math.min(1, dt * 8);
    if (a.obj.userData.led) {
      const led = a.obj.userData.led.material;
      if (a.blocked) {
        led.color.setHex(P.stErr);
        led.emissive.setHex(P.stErr);
        led.emissiveIntensity = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 12));
      } else if (dwelling) {
        led.color.setHex(P.stWarn);
        led.emissive.setHex(P.stWarn);
        led.emissiveIntensity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 8));
      } else {
        led.color.setHex(P.stOk);
        led.emissive.setHex(P.stOk);
        led.emissiveIntensity = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3));
      }
    }
    // 车载料箱：行进中轻微颠簸，体现载货状态
    const cargoG = a.obj.userData.cargo;
    if (cargoG.children.length && !dwelling) {
      cargoG.children[0].position.y = Math.sin(t * 9 + a.seg) * 0.012;
    }
  }
  // ----- 货物交接飞行动画 -----
  updateTransfers(dt);

  // ----- 到货高亮衰减：FIFO 入库 / 上料台补料 -----
  if (fifoPulse > 0) fifoPulse = Math.max(0, fifoPulse - dt * 0.8);
  if (linePulse > 0) linePulse = Math.max(0, linePulse - dt * 0.8);

  // 停靠圈：有 AMR 驻留时高亮呼吸
  for (const dm of dockMarks) {
    const near = amrs.some(a => a.dwellLeft > 0 &&
      a.obj.position.distanceTo(dm.mesh.position) < 1.2);
    const target = near ? 0.85 : 0.15;
    const m = dm.mesh.material;
    m.emissiveIntensity += (target - m.emissiveIntensity) * Math.min(1, dt * 6);
    if (near) {
      m.color.setHex(P.stOk); m.emissive.setHex(P.stOk);
    } else {
      m.color.setHex(P.binYellow); m.emissive.setHex(P.binYellow);
    }
  }

  // 上料缓存台料箱：补料时上跳一下
  infeedBin.position.y = 0.96 + Math.sin(linePulse * Math.PI) * 0.18;
  infeedBin.rotation.y = linePulse * Math.PI * 0.5;

  // FIFO 货架：入库时整体轻微亮起
  fifoRacks.forEach((rack, i) => {
    const s = 1 + Math.sin(fifoPulse * Math.PI) * 0.02;
    rack.scale.setScalar(s);
  });
  // ----- 工位指示灯 -----
  stations.forEach((s, i) => {
    const led = s.obj.userData.led;
    if (led) {
      // 正常节奏呼吸，3号工位随机报警
      const base = (i === 3) ? 1 : 0;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + i * 0.5);
      if (i === 1) {
        // 电测工位 - 偶尔异常红
        const alarm = Math.sin(t * 0.7 + i) > 0.85;
        led.material.color.setHex(alarm ? P.stErr : P.stOk);
        led.material.emissive.setHex(alarm ? P.stErr : P.stOk);
        led.material.emissiveIntensity = alarm ? 1.0 : 0.4 + pulse * 0.4;
      } else {
        led.material.emissiveIntensity = 0.4 + pulse * 0.4;
      }
    }
    const beam = s.obj.userData.beam;
    if (beam) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5 + i);
      beam.material.opacity = 0.2 + pulse * 0.3;
    }
  });

  // ----- OEE / WIP 数据波动 -----
  const oee = 88 + Math.sin(t * 0.3) * 3;
  ui.kpiOee.textContent = oee.toFixed(1) + '%';
  ui.kpiWip.textContent = 12 + Math.floor(Math.sin(t * 0.5) * 3);

  // 设备效率条轻微波动
  const eA = 85 + Math.sin(t * 0.4) * 3;
  const eB = 70 + Math.sin(t * 0.35 + 1) * 4;
  const eC = 92 + Math.sin(t * 0.3 + 2) * 2.5;
  const eU = 89 + Math.sin(t * 0.45) * 2.5;
  ui.effA.textContent = Math.round(eA) + '%'; ui.barA.style.width = eA + '%';
  ui.effB.textContent = Math.round(eB) + '%'; ui.barB.style.width = eB + '%';
  ui.effC.textContent = Math.round(eC) + '%'; ui.barC.style.width = eC + '%';
  ui.effU.textContent = Math.round(eU) + '%'; ui.barU.style.width = eU + '%';
  ui.stYield.textContent = (98.8 + Math.sin(t * 0.2) * 0.6).toFixed(1) + '%';
  ui.stAlert.textContent = 1 + (Math.sin(t * 0.6) > 0 ? 1 : 0);

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
// 调试探针：供自动化验证 AMR 停靠行为
// 闭环探针：测量 U 型线四个接口的实际间隙
// 运动探针：报告传送带载具与线速
window.__beltProbe = () => ({
  speed_mps: +(BELT_SPEED_RATIO * uTotalLen).toFixed(3),
  totalLen: +uTotalLen.toFixed(2),
  count: beltParts.length,
  spacing: +(uTotalLen / beltParts.length).toFixed(2),
  firstProgress: +beltParts[0].progress.toFixed(5),
  samplePos: beltParts.slice(0, 3).map(p => ({
    x: +p.mesh.position.x.toFixed(3), z: +p.mesh.position.z.toFixed(3) })),
});
// 防碰撞探针
window.__fleetDebug = () => ({
  segLens: amrSegLens.map(v => +v.toFixed(2)),
  segStart: amrSegStart.map(v => +v.toFixed(2)),
  loopLen: +amrLoopLen.toFixed(2),
  nodes: amrPath.length,
  safeGap: AMR_SAFE_GAP, stopGap: AMR_STOP_GAP,
  cars: amrs.map(a => ({
    seg: a.seg, segT: +a.segT.toFixed(3), arc: +amrArc(a).toFixed(2),
    dwell: +a.dwellLeft.toFixed(2), blocked: a.blocked,
    factor: +(a.speedFactor ?? 1).toFixed(2),
    clearance: +clearanceAhead(a, amrs).toFixed(2),
  })),
});
window.__arcToPoint = (arc) => arcToPoint(arc);
// 路径几何自检：找出物理上重叠的路径段对
window.__pathOverlap = () => {
  const segs = amrPathPts.map((a, i) => ({
    i, a, b: amrPathPts[(i + 1) % amrPathPts.length] }));
  const res = [];
  const segDist = (s1, s2) => {
    // 采样近似最小距离
    let m = Infinity;
    for (let u = 0; u <= 10; u++) {
      const p1 = new THREE.Vector3().lerpVectors(s1.a, s1.b, u / 10);
      for (let v = 0; v <= 10; v++) {
        const p2 = new THREE.Vector3().lerpVectors(s2.a, s2.b, v / 10);
        const d = p1.distanceTo(p2);
        if (d < m) m = d;
      }
    }
    return m;
  };
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 2; j < segs.length; j++) {
      if (i === 0 && j === segs.length - 1) continue;  // 相邻首尾
      const d = segDist(segs[i], segs[j]);
      if (d < 0.5) res.push({
        segA: i, segB: j, minDist: +d.toFixed(3),
        aFrom: [+segs[i].a.x.toFixed(1), +segs[i].a.z.toFixed(1)],
        aTo:   [+segs[i].b.x.toFixed(1), +segs[i].b.z.toFixed(1)],
        bFrom: [+segs[j].a.x.toFixed(1), +segs[j].a.z.toFixed(1)],
        bTo:   [+segs[j].b.x.toFixed(1), +segs[j].b.z.toFixed(1)],
      });
    }
  return res;
};
// 测试钩子：强制设置车辆位置（用于防碰撞压力测试）
window.__setFleet = (specs) => {
  specs.forEach((s, i) => {
    if (!amrs[i]) return;
    if (s.seg !== undefined)  amrs[i].seg = s.seg;
    if (s.segT !== undefined) amrs[i].segT = s.segT;
    amrs[i].dwellLeft = s.dwell ?? 0;
    amrs[i]._stopHandled = false;
    amrs[i]._activeStop = null;
  });
  return amrs.length;
};
window.__fleetProbe = () => {
  const arcs = amrs.map(a => amrArc(a));
  const pairs = [];
  for (let i = 0; i < amrs.length; i++)
    for (let j = i + 1; j < amrs.length; j++) {
      const d3 = amrs[i].obj.position.distanceTo(amrs[j].obj.position);
      let dArc = Math.abs(arcs[i] - arcs[j]);
      dArc = Math.min(dArc, amrLoopLen - dArc);
      pairs.push({ i, j, dist3d: +d3.toFixed(3), dArc: +dArc.toFixed(3) });
    }
  return {
    loopLen: +amrLoopLen.toFixed(2),
    cars: amrs.map(a => ({
      x: +a.obj.position.x.toFixed(2), z: +a.obj.position.z.toFixed(2),
      arc: +amrArc(a).toFixed(2), blocked: a.blocked,
      factor: +(a.speedFactor ?? 1).toFixed(2),
      dwell: +a.dwellLeft.toFixed(2), carrying: a.carrying,
    })),
    pairs,
    minDist3d: +Math.min(...pairs.map(p => p.dist3d)).toFixed(3),
  };
};

// 布局重合探针：检测 FIFO / 通道 / U 型线的 AABB 是否相交
window.__overlapProbe = () => {
  const boxOf = (obj) => new THREE.Box3().setFromObject(obj);
  const uBox = boxOf(uLine);
  const fBox = boxOf(fifoGroup);
  const inter = uBox.clone().intersect(fBox);
  const isEmpty = inter.isEmpty();
  const fmt = b => b.isEmpty() ? null : {
    x: [+b.min.x.toFixed(2), +b.max.x.toFixed(2)],
    z: [+b.min.z.toFixed(2), +b.max.z.toFixed(2)] };
  return {
    uLine: fmt(uBox), fifo: fmt(fBox),
    overlap: isEmpty ? "none" : fmt(inter),
    gapX: +(uBox.min.x - fBox.max.x).toFixed(3),
  };
};

// 交接探针：当前在飞的货物数量
window.__transferProbe = () => ({
  inFlight: transfers.length,
  totalBinsInScene: (() => { let n = 0; scene.traverse(o => { if (o.userData && o.userData.size) n++; }); return n; })(),
});
window.__uSeam = () => {
  const R = U_CURVE_R, inner = U_TOP_LEN - R * 2;
  const P2 = (x, z) => new THREE.Vector2(x, z);
  const topEnd   = P2( inner / 2, U_TOP_Z);
  const topStart = P2(-inner / 2, U_TOP_Z);
  const botEnd   = P2(-inner / 2, U_BOT_Z);
  const botStart = P2( inner / 2, U_BOT_Z);
  const pol = (cx, a) => P2(cx + R * Math.cos(a), U_MID_Z + R * Math.sin(a));
  const rS = pol(U_RIGHT_X,  Math.PI / 2);
  const rE = pol(U_RIGHT_X, -Math.PI / 2);
  const lS = pol(U_LEFT_X,  -Math.PI / 2);
  const lE = pol(U_LEFT_X,  -Math.PI * 1.5);
  return {
    R, inner, topZ: U_TOP_Z, midZ: U_MID_Z,
    seams: {
      'top->rightCurve':  +topEnd.distanceTo(rS).toFixed(6),
      'rightCurve->bot':  +rE.distanceTo(botStart).toFixed(6),
      'bot->leftCurve':   +botEnd.distanceTo(lS).toFixed(6),
      'leftCurve->top':   +lE.distanceTo(topStart).toFixed(6),
    }
  };
};

// 轨迹连续性探针：沿 getPosOnULine 采样，检测是否有跳变
window.__uContinuity = (n = 2000) => {
  let maxJump = 0, at = 0, prev = null;
  for (let i = 0; i <= n; i++) {
    const p = getPosOnULine(i / n).pos;
    if (prev) {
      const d = p.distanceTo(prev);
      if (d > maxJump) { maxJump = d; at = i / n; }
    }
    prev = p;
  }
  // 首尾闭合
  const a = getPosOnULine(0).pos, b = getPosOnULine(1).pos;
  return { maxJump: +maxJump.toFixed(6), atProgress: +at.toFixed(4),
           loopClose: +a.distanceTo(b).toFixed(6),
           expectedStep: +((U_TOP_LEN - U_CURVE_R*2)*2 + Math.PI*U_CURVE_R*2) / n };
};
window.__amrProbe = () => amrs.map(a => ({
  x: +a.obj.position.x.toFixed(3),
  z: +a.obj.position.z.toFixed(3),
  dwell: +a.dwellLeft.toFixed(2),
  seg: a.seg,
  carrying: a.carrying,
  deliveries: a.deliveryCount,
}));

animate();

// ========== 自适应 ==========
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// ========== 初始视角微动（引导效果） ==========
let introT = 0;
const introAnim = () => {
  introT += 0.008;
  if (introT < 1) {
    const e = 1 - Math.pow(1 - introT, 3);
    camera.position.set(26 - 4 * e, 22 - 2 * e, 30 - 4 * e);
    controls.target.set(0, 1, 2);
    requestAnimationFrame(introAnim);
  }
};
introAnim();

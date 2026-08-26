# AGENTS.md

汽车零部件包装车间数字孪生 — Three.js + Vite 标准源码。

## 技术栈

- Vite 5 + TypeScript + Three.js 0.160
- 纯前端，无后端，`npm run build` 输出到 `dist/`
- 完全兼容 ESA Pages 标准构建流程，且符合"标准 Vite 源码 → npm install && npm run build → dist"模式

## 目录结构

```
.
├── index.html           # 入口 HTML，当前引用 /src/pa1-main.ts（PA1 分支）
├── package.json         # scripts: dev / build / preview / verify*
├── vite.config.ts       # Vite 配置（host + es2020 目标）
├── tsconfig.json        # TS 配置
├── esa.jsonc            # ESA Pages 配置（assets.directory = dist，SPA 回退）
├── deploy-oss.ps1       # 备选：阿里云 OSS 一键上传脚本
├── tools/
│   └── verify.cjs       # 无头 Chrome + CDP 自动验证器（改完必跑，见「验证 SOP」）
├── src/
│   ├── main.ts          # 旧的 U 型线场景（另一套项目，勿动）
│   ├── style.css        # U 型线样式
│   ├── pa1-main.ts      # PA1 打包区场景全部代码（当前主线）
│   ├── pa1-style.css    # PA1 样式
│   └── pa1-main.backup.ts  # PA1 改动前的原始备份
├── public/              # 静态资源原样输出（目前空）
└── .gitignore
```

**两套场景并存**：`src/main.ts` 是早期 U 型线项目，`src/pa1-main.ts` 是当前 PA1 打包区分支。
两者常量体系互不相干，改 PA1 时不要参照 U 型线的数值（详见文末 PA1 章节）。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 输出 dist/
npm run preview  # 预览构建产物
```

## 验证 SOP（改完必跑，不要口头交付）

**血泪教训**：有好几轮我改完代码只告诉用户「已完成」，但实际渲染是坏的 / 需求没落地，
用户反复反馈「没变化」「没渲染」。根因是**我没有能力自己看到画面**，只能靠用户当测试员。
现在这条通路已经打通并固化成脚本，**任何场景改动后必须自己先验证再交付**。

### 固定流程（4 步，别跳）

```bash
# 1. 语法快检（秒级，esbuild 只做 transform，不碰文件系统）
node -e "const e=require('esbuild'),f=require('fs');e.transform(f.readFileSync('src/pa1-main.ts','utf8'),{loader:'ts'}).then(()=>console.log('PARSE OK')).catch(x=>x.errors.forEach(y=>console.log(y.location.line+': '+y.text)))"

# 2. 构建（注意下面 vite.config.ts 改名的坑）
Rename-Item vite.config.ts vite.config.ts.hold
npx vite build --base=./
Rename-Item vite.config.ts.hold vite.config.ts

# 3. 自动验证（无头 Chrome 真跑，看渲染 + 动画 + 逻辑）
npm run verify              # 60s 快检
npm run verify:long         # 180s，看完整物流循环（一个 AMR 循环约 50s 仿真时间）
npm run verify:trace        # 卡死时用：每 2s 打一行 state/job/arc/tgt/eff

# 4. PASS 之后才把 dist/index.html 交给用户
```

`tools/verify.cjs` 自动断言：canvas 尺寸、像素多样性（防黑屏）、机台与货架同侧、
停靠点偏离环线、两车全程最小间距、运行时异常，最后给 `RESULT: PASS/FAIL` 并存截图。

### 为什么必须用这个脚本（环境硬约束）

- **dev server 起得来但连不上**：跨进程访问 `127.0.0.1` 直接 ECONNREFUSED / 502。
  不要再浪费时间尝试「起 server 然后 curl / Invoke-WebRequest」。
- **同进程内 listen + 请求是通的**。所以正确姿势是：一个 node 脚本里 `spawn` 无头 Chrome，
  再连它的 CDP WebSocket（node 22 自带全局 `WebSocket`）。`tools/verify.cjs` 就是这个。
- 机器上**没有 Playwright / Puppeteer**，装不上就别等了，直接用 CDP。
- 无头必须加 `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`，
  否则 WebGL 拿不到 context，截图必然空白。
- `file://` 打开要加 `--allow-file-access-from-files`；中文路径里的空格要转 `%20`。
- **无头只有 4~6 FPS**（软件渲染），而 `animate()` 里 `dt` 被 clamp 到 0.05，
  所以仿真时间比墙上时间慢约 3 倍。**动画看着慢 ≠ 代码有 bug**，先跑 `npm run verify:fps` 确认。

### 调试方法论（这轮真正花时间的地方）

1. **先建观测能力，再改代码**。缺观测时的「改完即宣称完成」是最大的时间浪费来源。
2. **bug 会层层遮蔽**：充电死锁挡住了派单问题，派单问题挡住了停靠点全在走道中线的问题，
   修完才暴露 INPUT/OUTPUT 顺序逆向 + 工人节拍超运力 5 倍。**一次只修一层，每层重新长观察**。
3. **不要靠读代码猜卡死原因**，直接在页面里 `setInterval` 采样 `state/job/arc/tgt/eff/gapArc`
   打成时间序列（即 `--trace`）。这轮所有硬 bug 都是这样一眼看出来的。
4. **判据要能区分「在环」和「离环」**：任何"车停住了"的现象，先看 `eff` 是被谁按到 0 的。

## 关键不变量（改几何前必读）

U 型线闭环依赖一条等式，改动任何一个数必须同步改另一个，否则四个接口会出现断口：

```
U_CURVE_R = U_TOP_Z - U_MID_Z   // 当前 = 3.45
```

其他常量：`U_TOP_LEN=17, U_DEPTH=6.5, U_TOP_Z=3.45, U_BOT_Z=-3.45,
U_LEFT_X=-5.05, U_RIGHT_X=5.05`，皮带环线约 41.88m。
闭环自检：浏览器控制台 `window.__uSeam()` 四个间隙必须全为 0。

## 布局单一来源

所有位置从 `LAYOUT{}` 和 `AISLE{}` 两个常量推导，不要硬编码坐标。FIFO 超市必须
留在 U 型线西侧（当前净距约 2.9m），用 `window.__overlapProbe()` 验证 AABB 不相交。

## AMR 防碰撞设计（已验证，勿退回投影判据）

- 路径是 56.4m 的正交单向闭环，12 个节点，**不得自重叠**（`window.__pathOverlap()` 必须为空）。
- 跟车用**环序弧长**（`amrArc(a)` + 环线回绕），不是"相对位移在朝向上的投影"。
  投影判据在 90 度拐角会失效，导致两车同时让行/同时硬停死锁。
- 参数：`AMR_BODY=0.95, AMR_STOP_GAP=1.35, AMR_SAFE_GAP=2.4`。
- 弧长间距等价于物理间距的前提是路径不自重叠。已量化最坏情况：弧长差 2.0m 时
  物理间距 1.414m（拣货巷拐角），硬停阈值要求弧长差 >=2.3m，故物理间距恒大于车身。
- **绝对不要**加"阻塞 N 秒就低速前进脱困"之类的兜底，那会让车撞进正在停靠装卸的前车。
  环序恒定 + 总间距远大于车长，结构上无死锁。

## 人机协同分工

`stationTypes[].mode` 区分：`manual` 工位（① 上料扫码、② 装针、⑦ 包装下料）配工人；
`auto` 工位（③ 电测、④ AOI、⑤ 气密、⑥ 打标）配机器人。另有一个 `logisticsWorker`
负责 AMR 到站上下货。这是人机协调线，不是全自动线。

## 货物交接

`startTransfer(bin, fromWorld, toWorld, dur, onDone)` 做抛物线飞行，落位后切换归属。
料箱进入 FIFO 货架或上料缓存台后必须 `scene.remove` 消失，不能一直挂着。
泄漏自检：`window.__transferProbe()` 的 `totalBinsInScene` 应稳定在 67-69 附近，不累积。

## 调试探针（在 main.ts 末尾，交付前可移除）

`__amrProbe __uSeam __uContinuity(n) __beltProbe __fleetProbe __fleetDebug
__overlapProbe __transferProbe __pathOverlap __setFleet(specs) __arcToPoint(arc)`

---

# PA1 打包区分支（src/pa1-main.ts）

**注意：上面 U 型线的常量与本节无关，两套场景各自独立，不要混用。**
`index.html` 当前入口是 `/src/pa1-main.ts`。原始版本备份在 `src/pa1-main.backup.ts`。

## PA1 布局：四叶草 + 单向环线

4 个生产区以四叶草围绕中央滚筒打包区，外圈一条矩形单向环线（逆时针，约 62m）。
全部坐标从常量推导，不要硬编码：

```
ZONE_DIST=12.5  ZONE_W=7.2  ZONE_D=6.4
DOCK_LOCAL_Z=2.4  DOCK_HALF=0.75
AISLE_W=2.4  AISLE_RADIUS=7.8
SHELF_CLEAR=0.34  SHELF_DECK_Y=0.42  SHELF_TOP_Y=0.92
```

**同侧不变量**（用户明确要求：机器和货架必须在走道同一边）：
`AISLE_RADIUS + AISLE_W/2 <= ZONE_DIST - DOCK_LOCAL_Z - DOCK_HALF`
当前走道外沿 9.00 / 货架内沿 9.35 / 机台内沿 13.40。改任一常量后跑 `__sideCheck()` 必须全 true。

生产区朝向公式 `atan2(cfg.x, cfg.z) + PI` 是对的（本地 +Z 朝厂房中心），别再"修正"它。

## PA1 三个已修死锁（回归风险最高，勿退回）

1. **充电位必须离环、且每车专属**。
   曾经两车共用一个充电位、且该位正好落在环线上 → 前车充电，后车在环线永久硬停，
   66 秒 0 次配送。现在 `chargeStops[bay]`（环线投影）+ `chargeBays[bay]`（离环泊位），
   `amr.bay` 一车一个。
2. **去充电的行程必须可抢占**。
   派单原来只在 `state==='idle'` 时轮询，车一旦上路去充电就再也不看呼叫，
   PDA 呼叫全被无视。现在 `traveling` 分支里若 `job.kind` 是 `charge/charge_done`
   会继续调用 `dispatchAMR`。**不要把 dispatchAMR 收回只在 idle 调用。**
3. **防撞判据必须区分「在环 / 离环」**。
   `gapArc` 只在对方 `state` 为 `traveling|idle` 时计算，否则取 `Infinity`。
   否则对方在泊位充电/装卸（已让出走道）仍会把本车按停。

## PA1 停靠语义：dockPos 是货位，arcPos 才是走道点

这是"AMR 要停在正确的靠近位置、潜伏顶起货架"能否成立的关键。曾经两者都取走道中线投影，
于是 `approaching` 从环线点插值到同一个点 → 顶升动画在原地播，车根本没进货位。

```
job.dockPos  = 货架/接口台真实世界坐标   ← 车最终停这里（潜入架下）
job.arcPos   = 该点在走道中线上的投影     ← 只用来算 job.arc，保证行驶段在走道内
```

`approaching`/`departing` 是环线点与 dockPos 之间的垂直插值，配合 `smoothYaw()` 转车头。
`__stopCheck()` 里所有 `offsetFromLoop` 必须为 0（校验 arcPos 落在环线上）。

## PA1 INPUT/OUTPUT 必须顺着车流方向排

单向环线，所以 **INPUT 在上游、OUTPUT 在下游**，AMR 一次靠站就能卸满架 + 顶空架走。
排反了会导致取空架要绕一整圈 62m（实测单趟从 50s 涨到 130s+）。

- 西段沿 -Z 行驶：`qcInputSlot.z=-5.2`（上游）> `qcOutputSlot.z=-7.2`（下游）
- 北段沿 -X 行驶：`packInputSlot.x=1.3`（上游）> `packOutputSlot.x=-1.3`（下游）

## PA1 节拍必须与运力匹配

2 台 AMR 单趟约 50s 仿真时间（含靠站装卸），4 个区共 8 个货位。
工人上货节拍 `w.timer = 20 + random*12`（秒）就是按这个反算的。
改快（曾经 3-6s）会让料箱在缓存区无限堆积，看板 WIP 一路涨、`del` 却上不去。
调节拍或车速后，用 `npm run verify:long` 看 `bins` 是否稳定、`del/qc/pack` 是否持续增长。

## PA1 货架流转闭环

每区 1 红（送样→QC）+ 1 绿（成品→打包），QC 和打包区各 1 个初始空架，
且**必须 push 进 `sampleShelfAtZone`/`productShelfAtZone`**，否则调度器看不见、货架池越用越少。

调度优先级（顺序不能换）：
1. `pickup_empty` 回收站内空架送回缺架产线区 —— 排第一，否则空架全堆在站内、产线停摆
2. `pickup` 响应 PDA 呼叫取满架
3. `charge` 回自己泊位待命

空架用 `reservedBy` 防两车抢同一货位。料箱由站内工人在 `updateShelves` 中**逐个取走**
（每 0.8s 一箱，可见消失），不是瞬间蒸发；取空后挪到 OUTPUT 位 `atOutput=true` 等回收。

## PA1 调试探针

`__sideCheck()` 四区机台/红架/绿架半径与同侧判定
`__stopCheck()` 所有停靠点弧长与偏离环线距离（须全 0）
`__flowProbe()` 货架分布、料箱数、呼叫数、已检/已收、两车 state/job/arc/tgt/eff/gapArc/phys
`__amrGap()` 两车实际物理间距（< 1.1 报警）
`__qcInject(n)` 直接灌 n 条 QC 判定记录，不用等 AMR 跑圈就能看顶部条排版

`__flowProbe()` 里的 `debugEff/debugGapArc/debugPhys` 是定位"车为什么停住"的主要手段，
交付前可移除，但**调试期别删**。

## PA1 顶部 QC 条（HTML 覆盖层，不在 3D 里）

QC 巡检实时判定原来是 3D 场景内一块 290px 宽的 `CSS2DObject`，悬在中央上方挡视口，
已改为顶栏下方的 HTML 横条：`index.html` 里的 `.qc-strip`（`#qc-strip-rows` + `#qc-strip-stats`），
样式在 `src/pa1-style.css` 末尾。3D 里只留看板实体（黑框 + 吊杆 + 自发光屏面 + 文字标签），
**不要再往 `qcBoardGroup` 里加 CSS2DObject 面板**。

定位：`position:fixed; top:56px; left:50%; transform:translateX(-50%); width:max-content;
max-width:calc(100vw - 688px); height:34px; z-index:60`。688 = 左面板 340 + 右面板 300 + 余量，
改面板宽度必须同步改这个数**以及** `renderQcBoard()` 里的 `CSS_MAX`。

chip 条数按视口宽度算，勿改回固定值：

```js
const CSS_MAX = window.innerWidth - 688;
const titleCost = window.innerWidth > 1360 ? 100 : 0;   // 标题在 <=1360 时隐藏
const avail = CSS_MAX - titleCost - 190 - 28;           // 190=统计区, 28=padding+gap
const maxChips = Math.max(1, Math.min(4, Math.floor(avail / 152)));
```

- ❌ 固定 4 条：1600 及以下 `qc-strip-rows` 会横向溢出
- ❌ 用 `.qc-strip` 的 `clientWidth` 反推条数：它是 `width:max-content`，宽度由内容决定，会自锁成永远 1 条
- 两级媒体查询降级：`<=1360px` 隐藏标题，`<=1100px` 整条 `display:none`
- `resize` 里必须调 `renderQcBoard()`，否则缩放后条数不重排

实测（`__qcInject(6)` 后）：1920→4 chip / 1600→3 / 1440→2 / 1280→2，
chip 宽 139-140px，`gapUnderTopbar=0`，与其他固定面板无重叠。

## 部署：ESA Pages

### 前置条件（非常重要，容易漏）

**ESA Pages 项目 和 ESA 站点 是两个东西。**
Pages 项目构建成功 ≠ 能绑自定义域名。绑域名需要账号下先有一个**已经接入激活的 ESA 站点**
（站点管理 → 新增站点 → 填根域名 → CNAME 接入 → TXT 验证归属权 → 站点状态变为已激活）。
没有 ESA 站点就绑域名，会报 `ActiveSiteNotExist`。

### 正确顺序

1. ESA 站点管理 → 新增根域名站点（比如 `mydomain.com`），完成接入激活（一次性操作）
2. ESA 函数和 Pages → 导入 GitHub 仓库
3. 构建参数：
   - 生产分支：`master`
   - 安装命令：`npm install`
   - 构建命令：`npm run build`
   - **根目录：留空**（这是源码根目录，不是输出目录！普通单项目空着）
   - **静态资源目录：`dist`**（构建产物所在，托管内容）
   - 函数文件路径：空
   - SPA 路由策略：`singlePageApplication`
4. 构建成功 → 发布到生产环境 → **等 2-3 分钟**让网关同步
5. Pages 项目 → 域名 → 添加子域名（比如 `dt.mydomain.com`），获取 CNAME
6. DNS 添加 CNAME 记录 → 申请免费证书 → 强制 HTTPS

### esa.jsonc 配置

仓库里有 `esa.jsonc` 兜底（控制台优先级 > 文件，但文件存在也不会错）：

```jsonc
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "assets": {
    "directory": "dist",
    "notFoundStrategy": "singlePageApplication"
  }
}
```

### 容易踩的坑

- ❌ 根目录填 `dist`：等于告诉 ESA 源码在 dist 里，找不到 package.json，报 assets not set
- ❌ 静态资源目录空着：构建完的产物找不到，报 Both assets and function js file are not found
- ❌ 构建完立刻绑域名：网关未同步，报 ActiveSiteNotExist
- ❌ 只有 Pages 项目没有 ESA 站点：报 ActiveSiteNotExist（这个和项目类型无关，纯静态也会报）
- ❌ 仓库只有 index.html + vendor（打包产物）而不是 Vite 源码：
  可能触发 ESA 内部状态 bug，预览正常但自定义域名网关不激活，同样报 ActiveSiteNotExist

## 部署：Cloudflare Pages（推荐，免备案，适合演示）

海外节点，国内访问有波动但**无需 ICP 备案**，子域名 CNAME 绑定不改 NS，风险低。

### 步骤

1. Cloudflare → Workers & Pages → 底部 "Get started"（**Pages 入口，不是 Create a Worker**）
2. Connect Git → 选仓库 → 分支 `master`
3. 构建配置：
   - Framework preset：`None`
   - Build command：`npm run build`
   - Build output directory：`dist`
   - Root directory：留空
4. Save and Deploy
5. **SPA 刷新 404** 用 `public/_redirects` 文件配置（新版 Pages 已移除后台 Rewrites UI，
   这是官方标准方案）：
   - 在 `public/` 下建无后缀文件 `_redirects`（Windows 注意删掉 .txt 后缀）
   - 内容一行：`/*    /index.html   200`
   - 提交 push，自动重建部署生效
6. Custom domains → 添加子域名（如 `demo.jrcom.cn`，**不要填裸域名**，会强制迁 NS）
7. 阿里云 DNS 加 CNAME 记录（主机记录 `demo`，记录值为 pages.dev 域名）
8. 等 3-10 分钟 DNS 同步后点 Check DNS records

### 注意

- 同一主机记录下 CNAME 不能和 A/AAAA/MX 共存，加之前清空 `demo` 前缀下所有旧记录
- 大模型/3D 资源从海外加载慢，仅适合内部演示
- 根域名接入需要迁 NS，影响全域名，慎重
## 部署：阿里云 OSS（备选，更简单）

纯静态页面可以直接走 OSS，没有 ESA 站点那层概念。`deploy-oss.ps1` 一键上传。
步骤：开通 OSS → 创建公共读 Bucket → 静态网站托管 → CORS 配置 →
`deploy-oss.ps1` 上传 dist 内容 → 绑定域名 → DNS CNAME → SSL 证书。
注意不要直接访问 OSS 自带测试域名（会把 html 当文件下载）。

## 远程仓库

两个仓库对应两套场景，**别推错**：

| 场景 | 仓库 | 分支 |
|---|---|---|
| PA1 打包区（当前主线，`src/pa1-main.ts`） | `Jimruan1123/pa1-packaging-digital-twin` | `main` |
| 早期 U 型线（`src/main.ts`） | `Jimruan1123/amr-packaging-line-digital-twin` | `master` |

### 推送方式：tools/gh-push.cjs

公司电脑 `git` 命令行出站被拦（schannel `SEC_E_NO_CREDENTIALS`、`.git` 目录可能没写权限），
所以走 Clash Verge 的 HTTP CONNECT 隧道 + GitHub REST API。详细原理见 `DEPLOYMENT-GITHUB-UPLOAD.md`。

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"        # 绕过 Clash 自签证书
$env:GITHUB_TOKEN="github_pat_..."           # fine-grained，Contents 必须 Read and write
$env:COMMIT_MESSAGE=@"
多行提交说明写这里
"@
node tools/gh-push.cjs --repo Jimruan1123/pa1-packaging-digital-twin --branch main
```

**推送前务必 `--dry` 看一遍文件清单**，确认没有把临时脚本、备份、`dist/` 带上去。

### 这个脚本修掉的两个坑（勿退回旧 gh_push.cjs）

1. **旧脚本建 commit 不带 `parents`**，每次推送都把提交历史冲成孤立 commit。
   现在会先 `GET /git/ref/heads/{branch}` 取当前 HEAD 当 parent。
2. **多行提交说明不能用 `-m` 传**：PowerShell 下换行会截断参数解析，脚本会报「缺提交说明」。
   用 `$env:COMMIT_MESSAGE` here-string 传。

其他注意：Clash Verge 默认端口 `7897`（可用 `PROXY_PORT` 覆盖）；
`dist/` 永远不上传，Cloudflare Pages 会云端 `npm run build`（见部署章节的红线）。

https://github.com/Jimruan1123/amr-packaging-line-digital-twin

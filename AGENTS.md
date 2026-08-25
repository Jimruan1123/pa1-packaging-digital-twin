# AGENTS.md

汽车零部件包装车间数字孪生 — Three.js + Vite 标准源码。

## 技术栈

- Vite 5 + TypeScript + Three.js 0.160
- 纯前端，无后端，`npm run build` 输出到 `dist/`
- 完全兼容 ESA Pages 标准构建流程，且符合"标准 Vite 源码 → npm install && npm run build → dist"模式

## 目录结构

```
.
├── index.html           # 入口 HTML，引用 /src/main.ts
├── package.json         # scripts: dev / build / preview
├── vite.config.ts       # Vite 配置（host + es2020 目标）
├── tsconfig.json        # TS 配置
├── esa.jsonc            # ESA Pages 配置（assets.directory = dist，SPA 回退）
├── deploy-oss.ps1       # 备选：阿里云 OSS 一键上传脚本
├── src/
│   ├── main.ts          # 全部场景代码
│   └── style.css        # 全部样式
├── public/              # 静态资源原样输出（目前空）
└── .gitignore
```

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 输出 dist/
npm run preview  # 预览构建产物
```

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

https://github.com/Jimruan1123/amr-packaging-line-digital-twin
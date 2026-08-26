// 数字孪生场景自动验证器（无头 Chrome + CDP）
//
// 为什么需要它：本机沙箱内 dev server 端口不通（跨进程 127.0.0.1 直接 ECONNREFUSED），
// 也没有 Playwright。但「同一个 node 进程内 spawn Chrome + 连它的 CDP WebSocket」是通的。
// 所以任何渲染/动画/逻辑验证都必须走这个脚本，不要再尝试起 dev server 然后 curl。
//
// 用法：
//   node tools/verify.cjs                 # 默认观察 60s
//   node tools/verify.cjs --seconds 180   # 长观察，看完整物流循环
//   node tools/verify.cjs --trace         # 每 2s 打一行 AMR 状态轨迹（定位卡死用）
//   node tools/verify.cjs --fps           # 只测帧率
//
// 前置：先 npm run build（见 AGENTS.md 里 vite.config.ts 改名的坑）。
// 读的是 dist/index.html，靠 vite base:'./' 支持 file:// 直开。

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const zlib = require('zlib');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findBrowser() {
  for (const p of CHROME_CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error('找不到 Chrome/Edge，请检查 CHROME_CANDIDATES');
}

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return (v && !v.startsWith('--')) ? v : true;
}

const SECONDS = Number(arg('seconds', arg('fps', false) ? 8 : 60));
const TRACE = !!arg('trace', false);
const FPS_ONLY = !!arg('fps', false);
const PORT = 9200 + Math.floor(Math.random() * 500);

// 中文路径必须转义，否则 file:// 打不开
const fileUrl = 'file:///' + path.resolve('dist/index.html').replace(/\\/g, '/').replace(/ /g, '%20');

function httpJson(p) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

async function waitForBrowser() {
  for (let i = 0; i < 60; i++) {
    try { return await httpJson('/json/version'); }
    catch (e) { await sleep(500); }
  }
  throw new Error('浏览器没起来');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 手写 PNG 解码，用来判断画面是否真的有内容（防「黑屏但无报错」）
function pngStats(buf) {
  let off = 8, w = 0, h = 0, ct = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    off += len + 12;
    if (type === 'IEND') break;
  }
  const ch = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  let prev = Buffer.alloc(stride);
  const colors = new Set();
  let sum = 0, n = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 255;
    }
    if (y % 3 === 0) {
      for (let x = 0; x < w; x += 3) {
        const i = x * ch;
        colors.add(cur[i] + ',' + cur[i + 1] + ',' + cur[i + 2]);
        sum += (cur[i] + cur[i + 1] + cur[i + 2]) / 3;
        n++;
      }
    }
    cur.copy(prev);
  }
  return { w, h, uniqueColors: colors.size, meanLum: +(sum / n).toFixed(1) };
}

(async () => {
  if (!fs.existsSync('dist/index.html')) {
    console.log('FAIL: 没有 dist/index.html，先跑构建（见 AGENTS.md）');
    process.exit(1);
  }

  const browser = findBrowser();
  const profile = path.join(process.env.TEMP || '/tmp', 'dtverify' + Date.now());
  const proc = spawn(browser, [
    '--headless=new', '--no-sandbox',
    // 软件渲染：无头环境没有 GPU，缺这几个开关 WebGL 直接拿不到 context
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--allow-file-access-from-files',
    '--window-size=1600,900',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile,
    'about:blank',
  ], { stdio: 'ignore' });

  const kill = () => { try { proc.kill(); } catch (e) {} };

  try {
    const ver = await waitForBrowser();
    const ws = new WebSocket(ver.webSocketDebuggerUrl);
    let msgId = 0;
    const pending = new Map();
    const errors = [];
    const logs = [];

    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      } else if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails;
        errors.push((d.exception && d.exception.description) || d.text);
      } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        logs.push(m.params.args.map(a => a.value || a.description || a.type).join(' '));
      }
    };

    const send = (method, params, sessionId) => new Promise((res, rej) => {
      const id = ++msgId;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
    });

    await new Promise(r => ws.onopen = r);
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const S = (m, p) => send(m, p, sessionId);

    await S('Runtime.enable');
    await S('Page.enable');
    await S('Page.navigate', { url: fileUrl });

    const ev = async expr => {
      const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        return 'EVAL_ERR ' + ((d.exception && d.exception.description) || d.text);
      }
      return r.result.value;
    };

    await sleep(5000);

    if (FPS_ONLY) {
      const fps = await ev('new Promise(res=>{let n=0;const t0=performance.now();function f(){n++;if(performance.now()-t0<3000)requestAnimationFrame(f);else res(+(n/((performance.now()-t0)/1000)).toFixed(1))}requestAnimationFrame(f)})');
      console.log('headless FPS = ' + fps + '  (软件渲染，约为真机的 1/5~1/10；场景内 dt 被 clamp 到 0.05，' +
                  '所以仿真时间比墙上时间慢，动画看着慢不等于代码有 bug)');
      ws.close(); kill(); process.exit(0);
    }

    // 静音场景自带的 console.log 探针，避免长观察时刷屏
    await ev('window.__origLog=console.log;console.log=function(){};"ok"');
    // 全程记录两车最小间距（比结束时抽一次可靠）
    await ev('window.__minGap=99;window.__gapTimer=setInterval(function(){if(window.__amrGap){var d=window.__amrGap();if(d<window.__minGap)window.__minGap=d}},120);"ok"');

    const canvas = await ev('(function(){var c=document.querySelector("canvas");return c?JSON.stringify({w:c.width,h:c.height}):"NO_CANVAS"})()');
    console.log('canvas: ' + canvas);

    if (TRACE) {
      await ev('window.__tr=[];window.__trTimer=setInterval(function(){if(!window.__flowProbe)return;var r=window.__flowProbe();window.__tr.push([r.amr1.state,r.amr1.job,r.amr1.arc,r.amr1.tgt,r.amr1.eff,r.amr2.state,r.amr2.job,r.amr2.arc,r.amr2.tgt,r.amr2.eff,"del="+r.deliveries,"bins="+r.binsOnShelves].join(","))},2000);"ok"');
    }

    const step = 10000;
    for (let t = 0; t < Math.ceil(SECONDS * 1000 / step); t++) {
      await sleep(step);
      const p = await ev('(function(){if(!window.__flowProbe)return "NO_PROBE";var r=window.__flowProbe();return JSON.stringify({shelves:r.shelvesByLocation,bins:r.binsOnShelves,calls:r.callsRaised,qc:r.qcInspected,pack:r.packReceived,del:r.deliveries,a1:r.amr1.state+"/"+r.amr1.job,a2:r.amr2.state+"/"+r.amr2.job,pend:r.pendingCalls})})()');
      console.log(String((t + 1) * 10 + 5).padStart(4) + 's ' + p);
    }

    if (TRACE) {
      console.log('--- AMR 轨迹 (state,job,arc,tgt,eff) ---');
      const tr = await ev('window.__tr.join("\\n")');
      String(tr).split('\n').forEach((l, i) => console.log(String(i * 2).padStart(4) + 's ' + l));
    }

    console.log('--- 结构断言 ---');
    const side = await ev('window.__sideCheck?JSON.stringify(window.__sideCheck().map(function(r){return r.sameSide})):"NO_PROBE"');
    const stopMax = await ev('window.__stopCheck?Math.max.apply(null,window.__stopCheck().map(function(s){return Math.abs(s.offsetFromLoop)})):"NO_PROBE"');
    const minGap = await ev('+window.__minGap.toFixed(2)');
    console.log('机台与货架同侧 (应全 true): ' + side);
    console.log('停靠点偏离环线最大值 (应为 0): ' + stopMax);
    console.log('两车最小间距 (应 > 1.1 车身): ' + minGap);

    const shot = await S('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    const out = path.join(process.env.TEMP || '/tmp', 'dt_verify.png');
    fs.writeFileSync(out, buf);
    const stats = pngStats(buf);
    console.log('像素统计 (uniqueColors 太低=黑屏/白屏): ' + JSON.stringify(stats));
    console.log('截图: ' + out);

    const allErrors = errors.concat(logs);
    console.log('运行时异常: ' + (allErrors.length ? allErrors.slice(0, 5).join(' | ') : 'none'));

    const bad = allErrors.length > 0 || stats.uniqueColors < 200 || minGap < 1.1 ||
                String(side).indexOf('false') >= 0 || Number(stopMax) > 0.01;
    console.log(bad ? 'RESULT: FAIL' : 'RESULT: PASS');

    ws.close(); kill();
    process.exit(bad ? 1 : 0);
  } catch (e) {
    console.log('FATAL ' + e.message);
    kill();
    process.exit(1);
  }
})();

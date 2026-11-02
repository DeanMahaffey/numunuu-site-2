"use strict";
/* =======================================================================
   PAINTED LANDSCAPE
   Everything is drawn from layered profiles: sky, far ridge (with
   atmospheric haze), mid ground, near ground, then details (herd, trees,
   camp, travellers, grass strokes) and a grain/vignette pass.
   ======================================================================= */
const PAL = [
  { skyT:"#7fb0d6", skyH:"#f6dcc0", sun:"#fff3dc", far:"#8ea891", mid:"#86a35d", near:"#5f7f3d", grass:"#9dbb63", cloud:"#ffffff", tree:"#86a957" },
  { skyT:"#5f9cc9", skyH:"#f8e6b0", sun:"#fff8de", far:"#a7a68f", mid:"#bba862", near:"#987f3e", grass:"#dcc472", cloud:"#fffaf0", tree:"#5d7d3a" },
  { skyT:"#7584a8", skyH:"#f3b480", sun:"#ffe3bb", far:"#a08c84", mid:"#bf8a4f", near:"#8b5f33", grass:"#d7a15a", cloud:"#ffe1c9", tree:"#d9a83f" },
  { skyT:"#8494a6", skyH:"#e3e5e7", sun:"#f6f6f3", far:"#a5abb3", mid:"#c4beb2", near:"#dedad3", grass:"#f2efe9", cloud:"#f0f1f2", tree:"#8b8178" }
];
const BIOMES = {
  river:  { far:"hills", farAmp:.05, horizon:.55, midAmp:.025, water:true, trees:"cottonwood" },
  mesa:   { far:"mesa",  farAmp:.13, horizon:.57, midAmp:.03, rock:"#b77a57" },
  canyon: { far:"mesa",  farAmp:.06, horizon:.36, midAmp:.02, canyon:true, rock:"#b65a3d" },
  llano:  { far:"flat",  farAmp:.006,horizon:.64, midAmp:.008 },
  granite:{ far:"dome",  farAmp:.2,  horizon:.58, midAmp:.035, rock:"#9b8580" },
  plains: { far:"hills", farAmp:.035,horizon:.6,  midAmp:.02 },
  hill:   { far:"hills", farAmp:.085,horizon:.56, midAmp:.04, trees:"oak" }
};

const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
function waves(x, s){ return .5*Math.sin(x*.0021 + s) + .3*Math.sin(x*.0053 + s*2.1) + .2*Math.sin(x*.0117 + s*3.3); }
function mesaH(x, s){
  const P = 1500, u = ((x + s * 377) % P + P) % P;
  const tops = [[80,420],[560,860],[1000,1180],[1260,1330]];
  let h = 0;
  for (const [a, b] of tops){ const e = 34; h = Math.max(h, smooth((u - a) / e) * smooth((b - u) / e)); }
  return h + .03 * Math.sin(x * .05 + s);
}
function domeH(x, s){
  const P = 1600, u = ((x + s * 211) % P + P) % P;
  const domes = [[180,150,1],[420,110,.75],[690,190,.95],[980,130,.6],[1260,170,.85]];
  let h = 0; for (const [c, w, a] of domes) h = Math.max(h, a * Math.exp(-Math.pow((u - c) / w, 2)));
  return h;
}

/* Pre-rendered paper grain */
const grain = (() => { const c = document.createElement("canvas"); c.width = c.height = 220; const g = c.getContext("2d"); const id = g.createImageData(220,220);
  for (let i = 0; i < id.data.length; i += 4){ const v = 128 + (Math.random() - .5) * 120; id.data[i] = id.data[i+1] = id.data[i+2] = v; id.data[i+3] = 255; }
  g.putImageData(id,0,0); return c; })();

function drawBuffalo(ctx, x, y, s, phase, opt = {}){
  const dir = opt.dir || 1; const body = opt.color || "#3d2b1f"; const shag = opt.shag || "#2a1b12";
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  if (opt.fall){ ctx.rotate(opt.fall); }
  const leg = (lx, off) => { const a = Math.sin(phase + off) * (opt.still ? .06 : .55);
    ctx.beginPath(); ctx.moveTo(lx*s, 6*s); ctx.lineTo(lx*s + Math.sin(a)*16*s, 6*s + Math.cos(a)*17*s); ctx.stroke(); };
  ctx.strokeStyle = shag; ctx.lineWidth = Math.max(1, 4.2*s); ctx.lineCap = "round";
  leg(-20, 0); leg(-14, Math.PI); leg(18, Math.PI*.9); leg(24, .1);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(-4*s, 0, 30*s, 15*s, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = shag;
  ctx.beginPath(); ctx.ellipse(12*s, -6*s, 21*s, 19*s, -.15, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(32*s, 6*s, 9*s, 11*s, .3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(26*s, 12*s); ctx.quadraticCurveTo(30*s, 24*s, 36*s, 16*s); ctx.fill();
  ctx.strokeStyle = "#d8cbb4"; ctx.lineWidth = Math.max(.8, 1.6*s);
  ctx.beginPath(); ctx.moveTo(30*s, -2*s); ctx.quadraticCurveTo(35*s, -9*s, 31*s, -10*s); ctx.stroke();
  ctx.strokeStyle = shag; ctx.lineWidth = Math.max(1, 2*s);
  ctx.beginPath(); ctx.moveTo(-33*s, -4*s); ctx.quadraticCurveTo(-40*s, 2*s + Math.sin(phase)*3*s, -38*s, 10*s); ctx.stroke();
  ctx.restore();
}

function drawHorse(ctx, x, y, s, phase, opt = {}){
  const coat = opt.coat || "#8a5634", patch = opt.patch || "#efe4d2", dark = "#2a1a12";
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = coat; ctx.lineWidth = Math.max(1, 3.6*s); ctx.lineCap = "round";
  const leg = (lx, off) => { const a = Math.sin(phase + off) * (opt.walk ? .3 : .7);
    ctx.beginPath(); ctx.moveTo(lx*s, 5*s); ctx.lineTo(lx*s + Math.sin(a)*15*s, 5*s + Math.cos(a)*20*s); ctx.stroke(); };
  leg(-18, 0); leg(-12, Math.PI); leg(16, Math.PI*.95); leg(22, .15);
  ctx.fillStyle = coat; ctx.beginPath(); ctx.ellipse(0, 0, 27*s, 11*s, 0, 0, Math.PI*2); ctx.fill();
  if (opt.pinto){ ctx.fillStyle = patch; ctx.beginPath(); ctx.ellipse(-6*s, 2*s, 10*s, 7*s, .4, 0, Math.PI*2); ctx.fill(); }
  ctx.fillStyle = coat; ctx.beginPath(); ctx.moveTo(18*s, -6*s); ctx.lineTo(30*s, -22*s); ctx.lineTo(38*s, -18*s); ctx.lineTo(27*s, 2*s); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(36*s, -18*s, 8*s, 4.5*s, .5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, 2.4*s);
  ctx.beginPath(); ctx.moveTo(-26*s, -3*s); ctx.quadraticCurveTo(-36*s, 0, -34*s + Math.sin(phase)*3*s, 12*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20*s, -8*s); ctx.lineTo(29*s, -21*s); ctx.stroke();
  if (opt.rider){
    ctx.fillStyle = "#6b4028"; ctx.strokeStyle = "#6b4028"; ctx.lineWidth = Math.max(1, 5*s);
    ctx.beginPath(); ctx.moveTo(-2*s, -8*s); ctx.lineTo(3*s, -30*s); ctx.stroke();
    ctx.beginPath(); ctx.arc(4*s, -36*s, 5.2*s, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#1c130e"; ctx.beginPath(); ctx.arc(3*s, -37.5*s, 5.4*s, Math.PI, Math.PI*2.1); ctx.fill();
    ctx.lineWidth = Math.max(1, 3*s); ctx.strokeStyle = "#1c130e"; ctx.beginPath(); ctx.moveTo(0, -34*s); ctx.lineTo(-6*s, -22*s); ctx.stroke();
    ctx.strokeStyle = "#6b4028"; ctx.lineWidth = Math.max(1, 3*s); ctx.beginPath(); ctx.moveTo(2*s, -26*s); ctx.lineTo(14*s, -24*s); ctx.stroke();
    if (opt.bow){ ctx.strokeStyle = "#3b2414"; ctx.lineWidth = Math.max(1, 2*s);
      ctx.beginPath(); ctx.arc(14*s, -24*s, 12*s, -Math.PI/2.1, Math.PI/2.1); ctx.stroke();
      ctx.strokeStyle = "rgba(240,230,210,.8)"; ctx.lineWidth = Math.max(.6, 1*s);
      ctx.beginPath(); ctx.moveTo(14*s + 12*s*Math.cos(-Math.PI/2.1), -24*s + 12*s*Math.sin(-Math.PI/2.1)); ctx.lineTo(8*s, -24*s); ctx.lineTo(14*s + 12*s*Math.cos(Math.PI/2.1), -24*s + 12*s*Math.sin(Math.PI/2.1)); ctx.stroke(); }
  }
  if (opt.travois){ ctx.strokeStyle = "#5a3a22"; ctx.lineWidth = Math.max(1, 1.8*s);
    ctx.beginPath(); ctx.moveTo(10*s, -10*s); ctx.lineTo(-70*s, 22*s); ctx.moveTo(14*s, -9*s); ctx.lineTo(-66*s, 24*s); ctx.stroke();
    ctx.fillStyle = "#cdb48c"; ctx.beginPath(); ctx.moveTo(-30*s, 4*s); ctx.lineTo(-56*s, 15*s); ctx.lineTo(-52*s, 21*s); ctx.lineTo(-26*s, 10*s); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

function drawTipi(ctx, x, base, h, season, k){
  const w = h * .82;
  const cover = season === 3 ? "#e9e1d3" : "#e6d6b8", shade = season === 3 ? "#c9bfae" : "#c4ad86";
  ctx.strokeStyle = "#4c3322"; ctx.lineWidth = Math.max(1, h*.022);
  ctx.beginPath(); for (let i = -2; i <= 2; i++){ ctx.moveTo(x, base - h); ctx.lineTo(x + i*h*.06, base - h - h*.18); } ctx.stroke();
  ctx.fillStyle = cover; ctx.beginPath(); ctx.moveTo(x, base - h*.98); ctx.lineTo(x - w/2, base); ctx.lineTo(x + w/2, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade; ctx.beginPath(); ctx.moveTo(x, base - h*.98); ctx.lineTo(x + w*.08, base); ctx.lineTo(x + w/2, base); ctx.closePath(); ctx.fill();
  const bands = ["#9e4a2c","#2f4a5a","#b8862e"];
  ctx.strokeStyle = bands[k % 3]; ctx.lineWidth = Math.max(1, h*.05);
  ctx.beginPath(); ctx.moveTo(x - w*.37, base - h*.26); ctx.lineTo(x + w*.37, base - h*.26); ctx.stroke();
  ctx.fillStyle = "#3a2618"; ctx.beginPath(); ctx.ellipse(x - w*.06, base - h*.08, w*.07, h*.1, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x - w*.13, base - h*.08, w*.14, h*.08);
}

const scene = { biome:"granite", season:0, herd:true, camp:true, caravan:false, scroll:0, speed:0, t:0, seed:7, hunting:false };
let sceneCanvas, sctx, SW = 0, SH = 0, DPR = 1;

function sizeScene(){
  const r = sceneCanvas.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1);
  SW = Math.max(1, r.width); SH = Math.max(1, r.height);
  sceneCanvas.width = Math.round(SW * DPR); sceneCanvas.height = Math.round(SH * DPR);
}

function paintScene(ctx, W, H, o){
  const P = PAL[o.season], B = BIOMES[o.biome] || BIOMES.plains, rng = mulberry(o.seed);
  const t = o.t, sc = o.scroll;
  /* --- time of day ---
     o.tod: 0..1 through the day (0.25 sunrise, 0.5 noon, 0.75 sunset). Omit for a fixed midday look.
     n = how dark it is (0 day .. 1 night), g = golden-hour warmth near sunrise and sunset. */
  const timed = o.tod != null;
  const el = timed ? Math.sin((o.tod - .25) * Math.PI * 2) : 1;
  const n = timed ? clamp((.08 - el) / .38, 0, 1) : 0;
  const g = timed ? clamp(1 - Math.abs(el - .02) / .3, 0, 1) : 0;
  const glowPts = [];
  /* --- sky --- */
  const skyT = mix(mix(P.skyT, "#5b6aa2", g * .7), "#060b18", n), skyH = mix(mix(P.skyH, "#ff9e62", g * .8), "#1d2944", n);
  const sky = ctx.createLinearGradient(0, 0, 0, H * B.horizon + 40);
  sky.addColorStop(0, skyT); sky.addColorStop(1, skyH);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  let sx = W * .72, sy = H * (o.season === 2 ? .3 : .2);
  if (timed){ const k = clamp((o.tod - .22) / .56, 0, 1); sx = W * (.08 + .84 * k); sy = H * (B.horizon - .02) - Math.max(el, -.2) * H * .5; }
  const sunCol = mix(P.sun, "#ffb36e", g);
  if (sy < H * B.horizon + 20){
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * (.7 + g * .4));
    glow.addColorStop(0, rgba(sunCol, .85)); glow.addColorStop(.12, rgba(sunCol, .35 + g * .2)); glow.addColorStop(1, rgba(sunCol, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = rgba(sunCol, .95); ctx.beginPath(); ctx.arc(sx, sy, Math.min(W,H) * (.035 + g * .01), 0, Math.PI*2); ctx.fill();
  }
  /* clouds: soft stacked ellipses drifting */
  for (let i = 0; i < 6; i++){
    const cw = W * (.12 + rng() * .16), cy = H * (.06 + rng() * .22);
    const cx = ((rng() * W * 1.6 + t * (4 + i) - sc * .05) % (W * 1.6)) - W * .3;
    ctx.fillStyle = rgba(mix(mix(P.cloud, "#ffb59a", g * .6), "#2a3450", n), (o.season === 3 ? .5 : .38) * (1 - n * .4));
    for (let k = 0; k < 5; k++){ ctx.beginPath(); ctx.ellipse(cx + (k - 2) * cw * .18, cy + Math.sin(k*1.7) * cw * .03, cw * (.16 + .05 * Math.sin(k)), cw * .06, 0, 0, Math.PI*2); ctx.fill(); }
  }
  const hz = H * B.horizon;
  /* --- far ridge with haze --- */
  const farCol = B.rock && !B.canyon ? mix(B.rock, P.skyH, .45) : mix(P.far, P.skyH, .35);
  const farY = x => {
    const wx = x + sc * .15;
    if (B.far === "mesa") return hz - H * B.farAmp * mesaH(wx, o.seed) - H * .012 * waves(wx, o.seed);
    if (B.far === "dome") return hz - H * B.farAmp * domeH(wx, o.seed) - H * .01 * (1 + waves(wx * 2, o.seed));
    if (B.far === "flat") return hz - H * .004 * (1 + waves(wx, o.seed));
    return hz - H * B.farAmp * (1 + waves(wx, o.seed));
  };
  layer(ctx, W, H, farY, farCol, mix(farCol, P.skyH, .25));
  if (B.far === "mesa" && !B.canyon){ /* caprock line along mesa tops */
    ctx.strokeStyle = rgba("#5a3a2c", .35); ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x <= W; x += 6){ const y = farY(x) + 3; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  }
  if (o.season === 3 && (B.far === "dome" || B.far === "mesa")){ /* snow dusting */
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = 0; x <= W; x += 6){ const y = farY(x) + 1.5; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  }
  /* --- canyon strata (Palo Duro) --- */
  if (B.canyon){
    const strata = o.season === 3 ? ["#b9876f","#c99a7d","#a76550","#d4b29a","#9c5a45"] : ["#b4553a","#d38a5c","#9e4532","#e2b48a","#8f3f2e"];
    for (let i = 0; i < 5; i++){
      const base = H * (.38 + i * .055);
      const f = x => base + H * .03 * waves(x * 1.4 + sc * (.25 + i * .07) + i * 300, o.seed + i) + H * .012 * Math.sin(x * .03 + i);
      layer(ctx, W, H, f, strata[i], mix(strata[i], "#ffffff", .15));
      if (o.season === 3){ ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= W; x += 8){ const y = f(x) + 1; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    }
  }
  /* --- mid ground --- */
  const midBase = B.canyon ? H * .68 : hz + H * .05;
  const midY = x => midBase - H * B.midAmp * (1 + waves(x * 1.3 + sc * .45 + 900, o.seed + 5));
  layer(ctx, W, H, midY, mix(P.mid, P.skyH, .12), mix(P.mid, "#ffffff", .1));
  /* herd grazing on the mid ground */
  if (o.herd){
    const hr = mulberry(o.seed + 99); const n = o.biome === "llano" ? 70 : 40;
    for (let i = 0; i < n; i++){
      const bx = ((W * (.08 + hr() * .9) - sc * .45) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * .1;
      const by = midY(bx) + H * (.004 + hr() * .035);
      const s = H * .00062 * (.8 + hr() * .5) * (by / midBase);
      drawBuffalo(ctx, bx, by, s, t * .6 + i, { still:true, dir: hr() > .5 ? 1 : -1, color: o.season === 3 ? "#4a372a" : "#3d2b1f" });
    }
  }
  /* water + trees */
  if (B.water){
    const wy = midBase + H * .055;
    const wg = ctx.createLinearGradient(0, wy - 6, 0, wy + 14);
    wg.addColorStop(0, o.season === 3 ? "#c9d6de" : "#9fc0cf"); wg.addColorStop(1, o.season === 3 ? "#e8eef0" : "#d8e6e2");
    ctx.fillStyle = wg; ctx.beginPath();
    for (let x = 0; x <= W; x += 8){ const y = wy + 5 * Math.sin(x * .006 + sc * .006); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    for (let x = W; x >= 0; x -= 8){ ctx.lineTo(x, wy + 12 + 4 * Math.sin(x * .009 + 2 + sc * .006)); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++){ const x = ((i * 97 + t * 12 - sc * .6) % W + W) % W; ctx.beginPath(); ctx.moveTo(x, wy + 6); ctx.lineTo(x + 14, wy + 6); ctx.stroke(); }
  }
  if (B.trees){
    const tr = mulberry(o.seed + 31);
    const n = B.trees === "oak" ? 34 : 16;
    for (let i = 0; i < n; i++){
      const tx = ((W * tr() * 1.3 - sc * .6) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * .15;
      const ty = B.water ? midBase + H * .05 : midY(tx) + H * (.01 + tr() * .05);
      const r = H * (B.trees === "oak" ? .016 : .03) * (.7 + tr() * .6);
      if (o.season === 3 && B.trees === "cottonwood"){
        ctx.strokeStyle = "#7d7268"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - r * 2.2);
        for (let b = 0; b < 5; b++){ const a = -Math.PI/2 + (b - 2) * .45; ctx.moveTo(tx, ty - r * (1 + b * .2)); ctx.lineTo(tx + Math.cos(a) * r * 1.3, ty - r * (1 + b * .2) + Math.sin(a) * r * 1.3); }
        ctx.stroke();
      } else {
        ctx.fillStyle = "#4a3828"; ctx.fillRect(tx - 1.2, ty - r * .9, 2.4, r * .9);
        const col = B.trees === "oak" ? (o.season === 3 ? "#5c6644" : "#4d6334") : P.tree;
        for (let k = 0; k < 5; k++){ ctx.fillStyle = mix(col, k % 2 ? "#ffffff" : "#000000", .08 + k * .02);
          ctx.beginPath(); ctx.ellipse(tx + (k - 2) * r * .35, ty - r * (1.2 + (k % 2) * .35), r * .7, r * .6, 0, 0, Math.PI*2); ctx.fill(); }
      }
    }
  }
  /* --- near ground --- */
  const nearBase = H * .86;
  const nearY = x => nearBase - H * .025 * (1 + waves(x * 1.8 + sc + 400, o.seed + 9));
  layer(ctx, W, H, nearY, P.near, mix(P.near, "#ffffff", .12));
  /* another band's camp, farther off */
  if (o.rival && o.camp){
    const rr = mulberry(o.seed + 71);
    for (let k = 0; k < 5; k++){ const x = W * (.06 + k * .055 + rr() * .02), base = midY(x) + H * .07; drawTipi(ctx, x, base, H * .06, o.season, k + 1); }
  }
  /* camp */
  if (o.camp){
    const cr = mulberry(o.seed + 3);
    const spots = [.56, .64, .72, .8, .9, .48, .41, .97, .86, .35].slice(0, o.lodges || 6);
    spots.forEach((f, k) => {
      const x = W * f + (cr() - .5) * W * .03, base = nearY(x) + H * .01, h = H * (.13 + cr() * .03) * (k >= 5 ? .82 : 1);
      drawTipi(ctx, x, base, h, o.season, k); glowPts.push([x, base, h, k]);
      if (k === 1 || k === 3){ for (let p = 0; p < 6; p++){ const age = ((t * .25 + p / 6) % 1);
        ctx.fillStyle = `rgba(235,230,224,${.35 * (1 - age)})`; ctx.beginPath(); ctx.arc(x + Math.sin(age * 5 + k) * 10 * age + age * 30, base - h * 1.15 - age * H * .12, 4 + age * 14, 0, Math.PI*2); ctx.fill(); } }
    });
    const hr = mulberry(o.seed + 17);
    for (let i = 0; i < 9; i++){ const x = W * (.1 + hr() * .32), y = nearY(x) - H * .005 + hr() * H * .05;
      drawHorse(ctx, x, y, H * .0012, t + i, { walk:true, pinto: hr() > .6, coat: ["#8a5634","#5a3a26","#b0835a","#3a2a20"][i % 4] }); }
  }
  /* travellers */
  if (o.caravan){
    for (let i = 0; i < 7; i++){
      const x = W * (.2 + i * .07), y = nearY(x) + H * .04 + Math.sin(t * 6 + i) * 1.2;
      drawHorse(ctx, x, y, H * .0016, t * 7 + i * 1.3, { walk:true, rider: i % 2 === 0, travois: i % 2 === 1, pinto: i % 3 === 0, coat:["#8a5634","#5a3a26","#b0835a","#3a2a20"][i % 4] });
    }
  }
  /* grass strokes (painterly) */
  const gr = mulberry(o.seed + 55);
  ctx.lineCap = "round";
  for (let i = 0; i < 420; i++){
    const x = ((gr() * W * 1.2 - sc) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * .1;
    const y0 = nearY(x), y = y0 + gr() * (H - y0);
    const len = (4 + gr() * 12) * (y / H) * (H / 600);
    const sway = Math.sin(t * 1.5 + x * .02) * 2 + Math.max(0, Math.sin(t * .9 - x * .006)) * 6;
    ctx.strokeStyle = rgba(gr() > .5 ? P.grass : mix(P.near, "#000000", .25), .5);
    ctx.lineWidth = 1 + (y / H) * 1.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sway + (gr() - .5) * 4, y - len); ctx.stroke();
  }
  /* extra drawing from the page (e.g. the camp's own objects), so it gets the same light and weather */
  if (o.extra){ const gp = o.extra(ctx, W, H); if (gp) glowPts.push(...gp); }
  /* cloud shadows sliding across the ground (daytime) */
  if (o.fx !== false && n < .6){
    ctx.save(); ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 3; i++){
      const cx = ((i * W * .55 + t * 16 - sc * .7) % (W * 1.7) + W * 1.7) % (W * 1.7) - W * .35, cy = hz + (H - hz) * (.3 + i * .22);
      const r = W * (.22 + i * .05);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      cg.addColorStop(0, `rgba(60,50,70,${.16 * (1 - n)})`); cg.addColorStop(1, "rgba(60,50,70,0)");
      ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .22, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  /* golden hour wash and night darkness */
  if (g > 0){ ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = rgba("#ff8a4a", .45 * g); ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (n > 0){
    ctx.save(); ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = rgba("#1a2550", .72 * n); ctx.fillRect(0, 0, W, H); ctx.restore();
    /* stars and moon, only in the sky above the far ridge */
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0);
    for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, farY(x) - 2);
    ctx.closePath(); ctx.clip();
    const st = mulberry(o.seed + 777);
    for (let i = 0; i < 220; i++){
      const x = st() * W, y = st() * hz * .95, r = st() < .08 ? 1.6 : .5 + st() * .8;
      const tw = .55 + .45 * Math.sin(t * (1 + st() * 2) + i);
      ctx.fillStyle = `rgba(255,250,235,${n * tw * (1 - y / (hz * 1.1))})`; ctx.fillRect(x, y, r, r);
    }
    /* a faint band of the Milky Way */
    const mw = mulberry(o.seed + 99);
    for (let i = 0; i < 46; i++){ const k = i / 46, x = W * (k * 1.1 - .05) + (mw() - .5) * W * .06, y = hz * (.06 + k * .6) + (mw() - .5) * hz * .08, r = Math.min(W, H) * (.05 + mw() * .06);
      const mgr = ctx.createRadialGradient(x, y, 0, x, y, r); mgr.addColorStop(0, `rgba(205,212,255,${.05 * n})`); mgr.addColorStop(1, "rgba(205,212,255,0)");
      ctx.fillStyle = mgr; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    const mx = W * .24, my = H * .16, mr = Math.min(W, H) * .028;
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 6); mg.addColorStop(0, `rgba(230,236,255,${.35 * n})`); mg.addColorStop(1, "rgba(230,236,255,0)");
    ctx.fillStyle = mg; ctx.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
    ctx.fillStyle = `rgba(244,240,226,${n})`; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(200,196,182,${.5 * n})`; for (const [dx, dy, r] of [[-.3,-.2,.22],[.25,.15,.18],[-.05,.35,.12]]){ ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    /* firelight inside the lodges */
    if (glowPts.length){
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const [x, base, h, k] of glowPts){
        const fl = .85 + .15 * Math.sin(t * 7 + k * 2);
        const lg = ctx.createRadialGradient(x, base - h * .3, 0, x, base - h * .3, h * .75);
        lg.addColorStop(0, `rgba(255,150,60,${.5 * n * fl})`); lg.addColorStop(1, "rgba(255,150,60,0)");
        ctx.fillStyle = lg; ctx.fillRect(x - h, base - h * 1.2, h * 2, h * 1.4);
        if (k === 1) for (let p = 0; p < 8; p++){ const a = (t * .5 + p / 8) % 1;
          ctx.fillStyle = `rgba(255,190,90,${n * (1 - a)})`; ctx.fillRect(x + Math.sin(a * 9 + p) * 8, base - h * 1.1 - a * H * .1, 2, 2); }
      }
      ctx.restore();
    }
  }
  /* weather and life */
  if (o.fx !== false){
    const wx = o.weather || ["birds","dust","leaves","snow"][o.season];
    const fx = mulberry(o.seed + 4242);
    if (n < .55){ /* birds crossing the sky */
      ctx.strokeStyle = rgba(mix("#2a2420", "#0a0a12", n), .75); ctx.lineWidth = 1.6; ctx.lineCap = "round";
      for (let i = 0; i < 5; i++){
        const sp = 18 + fx() * 22, x = ((fx() * W + t * sp - sc * .2) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * .2;
        const y = H * (.1 + fx() * .18) + Math.sin(t * .8 + i) * 6, s = 4 + fx() * 4, f = Math.sin(t * 9 + i * 2) * s * .6;
        ctx.beginPath(); ctx.moveTo(x - s, y - f); ctx.quadraticCurveTo(x - s * .4, y - s * .2, x, y); ctx.quadraticCurveTo(x + s * .4, y - s * .2, x + s, y - f); ctx.stroke();
      }
    }
    if (wx === "snow"){
      for (let i = 0; i < 160; i++){
        const sp = 18 + fx() * 30, x = ((fx() * W + Math.sin(t * .6 + i) * 18 + t * 10 - sc * .3) % W + W) % W, y = (fx() * H + t * sp) % H, r = .8 + fx() * 2;
        ctx.fillStyle = `rgba(255,255,255,${.55 + fx() * .35})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    } else if (wx === "leaves"){
      for (let i = 0; i < 22; i++){
        const sp = 14 + fx() * 18, x = ((fx() * W + t * (26 + fx() * 20) - sc * .5) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * .1, y = (fx() * H + t * sp) % H;
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 2 + i); ctx.fillStyle = ["#d9a83f","#c7742e","#a8502a"][i % 3];
        ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    } else if (wx === "rain"){
      ctx.strokeStyle = "rgba(210,225,240,.35)"; ctx.lineWidth = 1;
      for (let i = 0; i < 180; i++){ const x = (fx() * W + t * 60) % W, y = (fx() * H + t * 700) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); ctx.stroke(); }
    } else if (wx === "dust" && n < .3){
      for (let i = 0; i < 40; i++){ const x = ((fx() * W + t * 14) % W), y = hz + fx() * (H - hz) + Math.sin(t + i) * 6;
        ctx.fillStyle = `rgba(255,236,190,${.18 + .12 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill(); }
    }
    if ((o.season === 1 || o.season === 0) && (n > .2 || (g > .4 && o.tod > .5))){ /* fireflies at dusk */
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 34; i++){
        const x = ((fx() * W + Math.sin(t * .5 + i) * 30) % W + W) % W, y = hz + (H - hz) * (.25 + fx() * .7) + Math.sin(t * .7 + i * 3) * 10;
        const on = Math.max(0, Math.sin(t * 2.2 + i * 1.7)); if (on < .2) continue;
        const fg = ctx.createRadialGradient(x, y, 0, x, y, 7); fg.addColorStop(0, `rgba(220,255,140,${on * .9 * Math.max(n, g * .6)})`); fg.addColorStop(1, "rgba(220,255,140,0)");
        ctx.fillStyle = fg; ctx.fillRect(x - 7, y - 7, 14, 14);
      }
      ctx.restore();
    }
  }
  /* grain + vignette */
  ctx.save(); ctx.globalAlpha = .07; ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = ctx.createPattern(grain, "repeat"); ctx.fillRect(0, 0, W, H); ctx.restore();
  const v = ctx.createRadialGradient(W/2, H*.45, Math.min(W,H)*.3, W/2, H*.5, Math.max(W,H)*.8);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(20,10,4,.38)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function layer(ctx, W, H, f, col, topCol){
  let minY = H; const pts = [];
  for (let x = 0; x <= W + 6; x += 6){ const y = f(x); pts.push([x, y]); if (y < minY) minY = y; }
  const g = ctx.createLinearGradient(0, minY, 0, H); g.addColorStop(0, topCol); g.addColorStop(.35, col); g.addColorStop(1, mix(col, "#000000", .18));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  /* soft painted edge */
  ctx.strokeStyle = rgba(topCol, .45); ctx.lineWidth = 2.5; ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y + 1.5) : ctx.moveTo(x, y + 1.5)); ctx.stroke();
}

let lastFrame = 0;
function frame(ts){
  const dt = Math.min(.05, (ts - lastFrame) / 1000 || 0); lastFrame = ts;
  scene.t += dt; scene.scroll += scene.speed * dt;
  if (!scene.hunting && SW > 0){
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    paintScene(sctx, SW, SH, scene);
  }
  requestAnimationFrame(frame);
}
function setScene(loc){
  const L = LOCS[loc];
  Object.assign(scene, { biome:L.biome, season:seasonOf(Math.min(S.moon, 11)), herd:S.herdHere, camp:true, caravan:false, speed:0,
    lodges: clamp(Math.round(S.people / 14), 3, 10), rival: S.rivals.some(r => r.loc === loc), seed: Object.keys(LOCS).indexOf(loc) * 13 + 5 });
}

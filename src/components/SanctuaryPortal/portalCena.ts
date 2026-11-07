/*
 * PORTAL DO SANTUÁRIO — cena, progresso, amanhecer e interação.
 *
 * A noite (abismo + lilás lunar) carrega enquanto a trepadeira sobe pelo portal-lua;
 * em 100% amanhece (nácar + esmeralda), as flores abrem e os botões aparecem.
 * Mouse/dedo: rastro de estrelas; clique/toque: ondas com som de gota; paralaxe em camadas.
 */
import { SomDoSantuario } from "./portalSom";

export interface OpcoesPortal {
  /** Abre já amanhecido (modo de depuração visual). */
  pronto?: boolean;
  /** Sem progresso real, o portal anima sozinho. */
  demo?: boolean;
  aoEntrar: (comSom: boolean) => void;
}

export interface ControlePortal {
  progresso: (p: number) => void;
  concluir: () => void;
  destruir: () => void;
}

export function montarPortal(raiz: HTMLElement, opcoes: OpcoesPortal): ControlePortal {
  const $ = <T extends Element = HTMLElement>(nome: string) =>
    raiz.querySelector(`[data-p="${nome}"]`) as T;
  const limpezas: (() => void)[] = [];
  const ouvir = (alvoEvento: EventTarget, tipo: string, fn: EventListener) => {
    alvoEvento.addEventListener(tipo, fn);
    limpezas.push(() => alvoEvento.removeEventListener(tipo, fn));
  };
  let vivo = true;

  const NS = "http://www.w3.org/2000/svg";
  const W = 1440, H = 900, CX = 720, CY = 360;
  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const portal = raiz;
  const cena = $<SVGSVGElement>("cena");
  const astro = $<SVGSVGElement>("astro");
  const astrolabio = $("astrolabio");
  const som = new SomDoSantuario();

  let semente = 7;
  const acaso = () => (semente = (semente * 16807) % 2147483647) / 2147483647;

  // ===================================================================
  // PRIMITIVAS DE DESENHO
  // ===================================================================

  const el = (tag: string, attrs: Record<string, string | number>, pai?: Element) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    if (pai) pai.appendChild(n);
    return n;
  };
  const grupo = (pai: Element, classe?: string, estilo?: string) =>
    el("g", { ...(classe ? { class: classe } : {}), ...(estilo ? { style: estilo } : {}) }, pai);

  /** Camada de profundidade: quanto maior, mais ela acompanha o ponteiro. */
  const camadas: [SVGElement, number][] = [];
  const camada = (profundidade: number) => {
    const g = grupo(cena, "camada");
    camadas.push([g, profundidade]);
    return g;
  };

  function suave(pts: number[][]) {
    let d = `M${pts[0][0]},${pts[0][1]} `;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ` +
        `${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]} `;
    }
    return d;
  }

  /** Estrela de quatro pontas com lados côncavos. */
  function estrela(cx: number, cy: number, r: number, pai: Element, attrs?: Record<string, string | number>) {
    let d = "";
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 - Math.PI / 2, b = a + Math.PI / 4, an = ((i + 1) % 4) * Math.PI / 2 - Math.PI / 2;
      if (i === 0) d += `M${cx + Math.cos(a) * r},${cy + Math.sin(a) * r} `;
      d += `Q${cx + Math.cos(b) * r * .16},${cy + Math.sin(b) * r * .16} ${cx + Math.cos(an) * r},${cy + Math.sin(an) * r} `;
    }
    return el("path", { d: d + "Z", fill: "currentColor", ...(attrs || {}) }, pai);
  }

  /** Anéis concêntricos segmentados: ondulação na água e interface que mede. */
  function ondulacao(cx: number, cy: number, r0: number, aneis: number, pai: Element, opacidade: number, comEstrela: boolean) {
    const g = grupo(pai);
    for (let i = 0; i < aneis; i++) {
      const segs: number[] = [];
      for (let k = 0; k < 2 + Math.floor(acaso() * 3); k++) segs.push(Math.round(20 + acaso() * 120), Math.round(8 + acaso() * 34));
      el("circle", {
        cx, cy, r: r0 * (1 + i * .34), fill: "none", stroke: "currentColor", "stroke-width": i ? 1 : 1.6,
        "stroke-dasharray": segs.join(" "), "stroke-dashoffset": Math.round(acaso() * 300), "stroke-linecap": "round",
        opacity: (opacidade * (1 - i / (aneis + 1))).toFixed(2),
      }, g);
    }
    if (comEstrela) {
      el("circle", { cx, cy, r: r0 * .5, fill: "currentColor", opacity: .12 }, g);
      estrela(cx, cy, r0 * 1.1, g, { class: "respira" });
    }
    return g;
  }

  function folha(x: number, y: number, ang: number, L: number, larg: number, pai: Element, classe?: string, estilo?: string) {
    const tx = x + Math.cos(ang) * L, ty = y + Math.sin(ang) * L;
    const nx = -Math.sin(ang) * larg, ny = Math.cos(ang) * larg, mx = (x + tx) / 2, my = (y + ty) / 2;
    const d = `M${x},${y} Q${mx + nx},${my + ny} ${tx},${ty} Q${mx - nx},${my - ny} ${x},${y} Z`;
    const g = grupo(pai, classe, estilo);
    el("path", { d, fill: "currentColor", opacity: .12 }, g);
    el("path", { d, fill: "none", stroke: "currentColor", "stroke-width": 1, opacity: .85 }, g);
    el("line", { x1: x, y1: y, x2: tx, y2: ty, stroke: "currentColor", "stroke-width": .6, opacity: .5 }, g);
    return g;
  }

  function margarida(cx: number, cy: number, r: number, pai: Element, classe?: string, estilo?: string) {
    const g = grupo(pai, classe, estilo);
    const petalas = grupo(g, "flor-gira");
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, px = cx + Math.cos(a) * r * .62, py = cy + Math.sin(a) * r * .62;
      el("ellipse", {
        cx: px, cy: py, rx: r * .42, ry: r * .16, transform: `rotate(${a * 180 / Math.PI} ${px} ${py})`,
        fill: "currentColor", "fill-opacity": .14, stroke: "currentColor", "stroke-width": .9,
      }, petalas);
    }
    el("circle", { cx, cy, r: r * .24, fill: "currentColor" }, g);
    return g;
  }

  function vitoriaRegia(cx: number, cy: number, r: number, rot: number, pai: Element) {
    const a0 = rot + .35, a1 = rot + Math.PI * 2 - .35;
    const d = `M${cx},${cy} L${cx + Math.cos(a0) * r},${cy + Math.sin(a0) * r * .55} ` +
      `A${r},${r * .55} 0 1,1 ${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r * .55} Z`;
    el("path", { d, fill: "currentColor", opacity: .07 }, pai);
    el("path", { d, fill: "none", stroke: "currentColor", "stroke-width": 1.2, "stroke-linejoin": "round", opacity: .55 }, pai);
    for (let k = 0; k < 5; k++) {
      const a = rot + .9 + k * 1.1;
      el("line", { x1: cx, y1: cy, x2: cx + Math.cos(a) * r * .75, y2: cy + Math.sin(a) * r * .41, stroke: "currentColor", "stroke-width": .7, opacity: .33 }, pai);
    }
  }

  function lotus(cx: number, cy: number, s: number, pai: Element) {
    for (const [ang, L, larg] of [[0, 1, .32], [-.55, .85, .3], [.55, .85, .3], [-1.05, .62, .26], [1.05, .62, .26]]) {
      const tx = cx + Math.sin(ang) * s * L, ty = cy - Math.cos(ang) * s * L;
      const nx = Math.cos(ang) * s * larg, ny = Math.sin(ang) * s * larg, mx = (cx + tx) / 2, my = (cy + ty) / 2;
      const d = `M${cx},${cy} Q${mx - nx},${my - ny} ${tx},${ty} Q${mx + nx},${my + ny} ${cx},${cy} Z`;
      el("path", { d, fill: "currentColor", opacity: .08 }, pai);
      el("path", { d, fill: "none", stroke: "currentColor", "stroke-width": 1.2, opacity: .85 }, pai);
    }
  }

  /** Nuvem ilustrada: lombos sobrepostos com contornos internos e uma espiral. */
  function nuvem(cx: number, cy: number, s: number, pai: Element) {
    const g = grupo(pai);
    const lombos = [[-1.15, .15, .42], [-.6, -.18, .55], [0, -.32, .66], [.62, -.12, .54], [1.12, .12, .4], [-.25, .2, .5], [.4, .22, .48]];
    for (const [bx, by, br] of lombos) el("circle", { cx: cx + bx * s, cy: cy + by * s, r: br * s, class: "preenche", stroke: "currentColor", "stroke-width": 1.2, opacity: .9 }, g);
    el("rect", { x: cx - s * 1.6, y: cy + s * .32, width: s * 3.2, height: s * .5, class: "preenche" }, g);
    el("line", { x1: cx - s * 1.5, y1: cy + s * .32, x2: cx + s * 1.5, y2: cy + s * .32, stroke: "currentColor", "stroke-width": 1, opacity: .5 }, g);
    for (const [bx, by, br] of lombos.slice(0, 5)) el("circle", { cx: cx + bx * s, cy: cy + by * s, r: br * s, fill: "currentColor", opacity: .05 }, g);
    const espiral: number[][] = [];
    for (let j = 0; j < 22; j++) { const t = j * .42, rr = s * .2 * (1 - j / 22); espiral.push([cx - s * .2 + Math.cos(t) * rr, cy - s * .05 + Math.sin(t) * rr]); }
    el("path", { d: suave(espiral), fill: "none", stroke: "currentColor", "stroke-width": 1, opacity: .6 }, g);
  }

  function ganso(x: number, y: number, s: number, pai: Element) {
    const d = `M${x},${y} q${-s * .55},${-s * .45} ${-s * 1.2},${-s * .2} q${s * .6},${s * .05} ${s * 1.2},${s * .34} ` +
      `q${s * .55},${-s * .5} ${s * 1.15},${-s * .62} q${-s * .45},${s * .3} ${-s * 1.15},${s * .48}z`;
    el("path", { d, fill: "currentColor", opacity: .85 }, pai);
    el("path", { d: `M${x},${y} l${s * .45},${s * .05}`, stroke: "currentColor", "stroke-width": 1.4, "stroke-linecap": "round", opacity: .85 }, pai);
  }

  function movel(x: number, comprimento: number, pai: Element, i: number) {
    const g = grupo(pai, "balanca", `--dur:${6 + i * 1.3}s; --d:${-i * 1.7}s`);
    el("line", { x1: x, y1: 0, x2: x, y2: comprimento, stroke: "currentColor", "stroke-width": .8, opacity: .6 }, g);
    let y = 40 + acaso() * 50;
    while (y < comprimento - 24) {
      el("circle", { cx: x, cy: y, r: 2.5 + acaso() * 2.6, fill: "none", stroke: "currentColor", "stroke-width": 1, opacity: .8 }, g);
      y += 40 + acaso() * 40;
    }
    estrela(x, comprimento + 12, 12, g, { opacity: .9 });
  }

  function quadrifolio(cx: number, cy: number, r: number, pai: Element) {
    const g = grupo(pai);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      el("circle", { cx: cx + dx * r * .5, cy: cy + dy * r * .5, r: r * .55, class: "preenche", stroke: "currentColor", "stroke-width": 1.2, opacity: .8 }, g);
    }
    el("circle", { cx, cy, r: r * .62, class: "preenche" }, g);
    el("line", { x1: cx - r, y1: cy, x2: cx + r, y2: cy, stroke: "currentColor", "stroke-width": .8, opacity: .5 }, g);
    el("line", { x1: cx, y1: cy - r, x2: cx, y2: cy + r, stroke: "currentColor", "stroke-width": .8, opacity: .5 }, g);
    for (let k = -2; k <= 2; k++) {
      const fim = cy + r + 170 - Math.abs(k) * 30;
      el("path", {
        d: `M${cx + k * 6 - 3},${cy + r * .9} L${cx + k * 6 + 3},${cy + r * .9} L${cx + k * 26 + 2},${fim} L${cx + k * 26 - 2},${fim} Z`,
        fill: "currentColor", class: "raio-luz", style: `--dur:${6 + Math.abs(k)}s; --d:${-k * 1.3}s`,
      }, g);
    }
  }

  function samambaia(x: number, y: number, ang: number, L: number, pai: Element, i: number) {
    const g = grupo(pai, "samambaia", `--dur:${8 + i}s; --d:${-i * 1.7}s`);
    const pts: number[][] = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([x + Math.cos(ang) * L * t + Math.sin(t * 3) * 18 * t, y + Math.sin(ang) * L * t + t * t * 40]); }
    el("path", { d: suave(pts), fill: "none", stroke: "currentColor", "stroke-width": 1.2, opacity: .8 }, g);
    for (let k = 1; k < 10; k++) {
      const [px, py] = pts[k], tam = 34 * (1 - k / 11);
      folha(px, py, ang - 1.1, tam, tam * .28, g);
      folha(px, py, ang + 1.1, tam, tam * .28, g);
    }
  }

  // ===================================================================
  // A CENA (em camadas: do fundo para a frente)
  // ===================================================================

  // céu estrelado
  const ceu = camada(.15);
  for (let i = 0; i < 230; i++) {
    const x = acaso() * W, y = acaso() * H;
    if (Math.hypot(x - CX, y - CY) < 230) continue;
    if (acaso() < .16) estrela(x, y, 4 + acaso() * 7, ceu, { class: "brilha", style: `--dur:${3 + acaso() * 4}s; --d:${-acaso() * 6}s; --min:.2; --max:.95` });
    else el("circle", { cx: x, cy: y, r: (.6 + acaso() * 1.2).toFixed(1), fill: "currentColor", class: "brilha", style: `--dur:${2.5 + acaso() * 5}s; --d:${-acaso() * 6}s; --min:.15; --max:.8` }, ceu);
  }

  // a estufa: janelas de quatro folhas e o arco de ferro
  const estufa = camada(.25);
  quadrifolio(560, 74, 30, estufa);
  quadrifolio(880, 74, 30, estufa);
  el("path", { d: "M470,0 Q720,150 970,0", fill: "none", stroke: "currentColor", "stroke-width": 1, opacity: .35 }, estufa);
  el("path", { d: "M430,0 Q720,190 1010,0", fill: "none", stroke: "currentColor", "stroke-width": .7, opacity: .22, "stroke-dasharray": "2 6" }, estufa);

  // nuvens ao longe
  const nuvensLonge = grupo(camada(.3), "deriva", "--dur:140s; --d:-40s");
  nuvem(210, 250, 70, nuvensLonge);
  nuvem(1230, 200, 82, nuvensLonge);

  // gansos e andorinhas atravessando
  const bando = grupo(camada(.35), "voo", "--dur:34s; --d:-8s");
  [[0, 0, 15], [-38, 22, 12], [-74, 40, 10], [-30, -26, 11], [-66, -44, 9]].forEach(([x, y, s]) => ganso(260 + x, 300 + y, s, bando));
  const bandoVolta = grupo(camada(.35), "voo-volta", "--dur:46s; --d:-20s");
  [[0, 0, 11], [-30, 16, 9], [-58, 6, 8]].forEach(([x, y, s]) => ganso(x, 180 + y, s, bandoVolta));

  // estrelas-guia dentro de ondulações
  const guias = camada(.4);
  [[430, 140, 22], [1020, 110, 18], [1110, 470, 26], [330, 470, 20]].forEach(([x, y, r]) => ondulacao(x, y, r, 4, guias, .7, true));

  // móbiles e trepadeiras pendendo do teto
  const teto = camada(.5);
  [[180, 330], [262, 212], [1180, 262], [1272, 384], [1342, 180]].forEach(([x, c], i) => movel(x, c, teto, i));
  [[70, 260], [380, 150], [1060, 170], [1420, 290]].forEach(([x, L], i) => {
    const g = grupo(teto, "balanca", `--dur:${7 + i}s; --d:${-i * 2}s`);
    const pts: number[][] = [];
    for (let k = 0; k <= 12; k++) pts.push([x + Math.sin(k * .9 + i) * 10, k / 12 * L]);
    el("path", { d: suave(pts), fill: "none", stroke: "currentColor", "stroke-width": 1, opacity: .7 }, g);
    for (let k = 1; k < 12; k++) folha(pts[k][0], pts[k][1], (k % 2 ? .4 : Math.PI - .4) + .3, 14 + (12 - k), 5, g);
  });

  // rio serpenteando e caminho de pedras que acende pedra por pedra
  const rio = camada(.6);
  const curso = suave([[-40, 900], [140, 840], [320, 878], [520, 812], [700, 850], [880, 800], [1080, 846], [1260, 790], [1480, 820]]);
  el("path", { d: curso, fill: "none", stroke: "currentColor", "stroke-width": 1.2, opacity: .5 }, rio);
  el("path", { d: curso, fill: "none", stroke: "currentColor", "stroke-width": .8, opacity: .3, transform: "translate(0,14)" }, rio);
  [[560, 868, 22], [612, 846, 19], [666, 862, 21], [720, 842, 18], [772, 858, 20], [826, 838, 17], [880, 852, 19]].forEach(([x, y, r], i) => {
    el("ellipse", { cx: x, cy: y, rx: r, ry: r * .42, fill: "currentColor", "fill-opacity": .06, stroke: "currentColor", "stroke-width": 1, class: "pedra-luz", style: `--d:${i * .45}s` }, rio);
  });

  // nuvens próximas
  const nuvensPerto = grupo(camada(.7), "deriva", "--dur:90s; --d:-20s; animation-direction: alternate");
  nuvem(130, 610, 96, nuvensPerto);
  nuvem(1330, 560, 110, nuvensPerto);

  // jardim d'água: vitórias-régias, lótus, ondas e flores do campo
  const jardim = camada(.85);
  [[250, 795, 70, .3], [384, 838, 46, 4], [1180, 805, 60, 2.6], [1310, 765, 40, 1.2], [600, 870, 34, 2.1], [860, 880, 40, 5.2]].forEach(([x, y, r, rot]) => vitoriaRegia(x, y, r, rot, jardim));
  lotus(290, 778, 46, jardim);
  lotus(1160, 790, 34, jardim);
  [[290, 795, 46], [1160, 805, 40]].forEach(([x, y, r], i) => {
    for (let k = 0; k < 3; k++) el("ellipse", { cx: x, cy: y, rx: r * 1.6, ry: r * .7, fill: "none", stroke: "currentColor", "stroke-width": 1, class: "onda", style: `--dur:6s; --d:${-k * 2 - i}s` }, jardim);
  });
  [[150, 740, 9], [205, 708, 7], [430, 790, 8], [470, 760, 6], [980, 790, 8], [1030, 760, 6], [1250, 730, 9], [1370, 700, 7], [90, 690, 6], [1410, 650, 6]].forEach(([x, y, r], i) => {
    el("path", { d: `M${x},${y} q${-4 + (i % 3) * 4},30 -2,70`, fill: "none", stroke: "currentColor", "stroke-width": .9, opacity: .55 }, jardim);
    margarida(x, y, r * 1.6, jardim, "flor", `--atraso:${.6 + i * .12}s`);
  });

  // vagalumes subindo devagar
  const luzes = camada(.95);
  for (let i = 0; i < 46; i++) {
    const x = acaso() * W, y = 380 + acaso() * 480;
    if (Math.abs(x - CX) < 200 && y < 640) continue;
    el("circle", {
      cx: x.toFixed(0), cy: y.toFixed(0), r: (1 + acaso() * 1.6).toFixed(1), fill: "currentColor", class: "vagalume",
      style: `--dur:${9 + acaso() * 9}s; --d:${-acaso() * 16}s; --x:${(-30 + acaso() * 60).toFixed(0)}px`,
    }, luzes);
  }

  // samambaias em primeiro plano, nos cantos
  const frente = camada(1.2);
  [[-10, 905, -1.15, 260], [40, 910, -.85, 220], [-20, 900, -1.45, 200]].forEach(([x, y, a, L], i) => samambaia(x, y, a, L, frente, i));
  [[1450, 905, -2.0, 260], [1400, 910, -2.3, 220], [1460, 900, -1.7, 200]].forEach(([x, y, a, L], i) => samambaia(x, y, a, L, frente, i + 3));

  // ===================================================================
  // O PORTAL-LUA E O ASTROLÁBIO (centro)
  // ===================================================================

  const A = 200, R = 132, GR = 214;

  ondulacao(A, A, 150, 1, grupo(astro, "gira", "--dur:80s"), .55, false);
  el("circle", { cx: A, cy: A, r: 186, fill: "none", stroke: "currentColor", "stroke-width": .8, "stroke-dasharray": "1 7", opacity: .7 }, astro);
  const marcas = grupo(astro, "gira ao-contrario", "--dur:140s");
  for (let d = 0; d < 360; d += 6) {
    const a = d * Math.PI / 180, L = d % 30 === 0 ? 10 : 4;
    el("line", { x1: A + Math.cos(a) * 168, y1: A + Math.sin(a) * 168, x2: A + Math.cos(a) * (168 + L), y2: A + Math.sin(a) * (168 + L), stroke: "currentColor", "stroke-width": .8, opacity: .55 }, marcas);
  }
  ondulacao(A, A, 196, 1, grupo(astro, "gira ao-contrario", "--dur:55s"), .4, false);

  // pedras do portal-lua
  const ponto = (r: number, a: number) => `${(A + Math.cos(a) * r).toFixed(1)},${(A + Math.sin(a) * r).toFixed(1)}`;
  for (let i = 0; i < 30; i++) {
    const a0 = i / 30 * Math.PI * 2 + .012, a1 = (i + 1) / 30 * Math.PI * 2 - .012, r1 = GR - 11, r2 = GR + 11;
    el("path", {
      d: `M${ponto(r1, a0)} L${ponto(r2, a0)} A${r2},${r2} 0 0,1 ${ponto(r2, a1)} L${ponto(r1, a1)} A${r1},${r1} 0 0,0 ${ponto(r1, a0)} Z`,
      fill: "currentColor", "fill-opacity": .06, stroke: "currentColor", "stroke-width": .9, opacity: .7,
    }, astro);
  }

  // a trepadeira que cresce com o progresso
  const vinhaPts: number[][] = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, a = (155 + t * 230) * Math.PI / 180, r = GR + Math.sin(t * Math.PI * 9) * 9;
    vinhaPts.push([A + Math.cos(a) * r, A + Math.sin(a) * r]);
  }
  const vinha = el("path", { d: suave(vinhaPts), fill: "none", stroke: "currentColor", "stroke-width": 1.6, "stroke-linecap": "round", pathLength: 100, "stroke-dasharray": "0 100" }, astro);
  const folhasVinha: [number, SVGElement][] = [];
  for (let k = 2; k < 78; k += 4) {
    const [x, y] = vinhaPts[k], a = Math.atan2(y - A, x - A) + (k % 8 ? .9 : -.9);
    folhasVinha.push([k / 80, folha(x, y, a, 12 + (k % 3) * 3, 4.5, astro, "folha")]);
  }
  [.12, .3, .48, .62, .78, .94].forEach((t, i) => {
    const [x, y] = vinhaPts[Math.round(t * 80)];
    margarida(x, y, 9 + (i % 2) * 3, astro, "flor", `--atraso:${.3 + i * .18}s`);
  });

  // arco de progresso e o ponto de luz
  el("circle", { cx: A, cy: A, r: R, fill: "none", stroke: "currentColor", "stroke-width": .6, opacity: .35 }, astro);
  const arco = el("circle", { cx: A, cy: A, r: R, fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", pathLength: 100, "stroke-dasharray": "0 100", transform: `rotate(-90 ${A} ${A})` }, astro);
  const luz = el("circle", { cx: A, cy: A - R, r: 4, fill: "currentColor" }, astro);
  const revelacao = grupo(astro);

  // ===================================================================
  // PROGRESSO E AMANHECER
  // ===================================================================

  const pct = $("pct");
  const estadoTxt = $("estado-txt");
  const estadoNum = $("estado-num");
  const sussurro = $("sussurro");
  const cantoDir = $("canto-dir");
  const frases: [number, string][] = [[0, "acendendo as estrelas"], [.22, "enchendo o lago"], [.45, "acordando os lótus"], [.68, "a trepadeira sobe pelo portal"], [.88, "abrindo o santuário"]];

  let alvo = 0, atual = 0, terminou = false;

  function desenhar(p: number) {
    arco.setAttribute("stroke-dasharray", `${(p * 100).toFixed(2)} 100`);
    vinha.setAttribute("stroke-dasharray", `${(p * 100).toFixed(2)} 100`);
    for (const [t, f] of folhasVinha) f.classList.toggle("on", p >= t);
    const a = -Math.PI / 2 + p * Math.PI * 2;
    luz.setAttribute("cx", (A + Math.cos(a) * R).toFixed(1));
    luz.setAttribute("cy", (A + Math.sin(a) * R).toFixed(1));
    pct.textContent = String(Math.round(p * 100));
    const frase = String(frases.filter(([lim]) => p >= (lim as number)).pop()![1]);
    if (!terminou && sussurro.textContent !== frase) sussurro.textContent = frase;
  }

  function laco() {
    atual += (alvo - atual) * .06;
    if (Math.abs(alvo - atual) < .0008) atual = alvo;
    desenhar(atual);
    if (atual >= 1 && !terminou) amanhecer();
    if (!terminou && vivo) quadroLaco = requestAnimationFrame(laco);
  }

  function amanhecer() {
    terminou = true;
    for (let k = 0; k < 3; k++) el("circle", { cx: A, cy: A, r: 60, fill: "none", stroke: "currentColor", "stroke-width": 1.2, class: "revela", style: `animation-delay:${k * .25}s` }, revelacao);
    portal.classList.add("dia", "pronto");
    estadoTxt.textContent = "O santuário está pronto";
    estadoNum.hidden = true;
    sussurro.textContent = "a noite virou manhã";
    cantoDir.textContent = "GD-01 · 100%";
    raiz.setAttribute("data-testid", "visual-intro");
    $("portas").inert = false;
    som.amanhecer();
  }

  // ===================================================================
  // SOM
  // ===================================================================

  const botaoSom = $("som");
  const rotuloSom = $("som-rotulo");
  async function definirSom(ligar: boolean) {
    const ok = ligar ? await som.ligar() : (som.desligar(), false);
    botaoSom.setAttribute("aria-pressed", String(Boolean(ok)));
    rotuloSom.textContent = ok ? "Som ligado" : "Som desligado";
  }
  ouvir(botaoSom, "click", () => void definirSom(!som.ligado));

  // ===================================================================
  // INTERAÇÃO: rastro de estrelas, ondas no toque e paralaxe
  // ===================================================================

  const tela = $<HTMLCanvasElement>("rastro");
  const ctx = tela.getContext("2d")!;
  const particulas: { x: number; y: number; vx: number; vy: number; vida: number; queda: number; r: number; estrela: boolean; giro: number }[] = [];
  const ondas: { x: number; y: number; t: number }[] = [];
  let largura = 0, altura = 0, dpr = 1;
  let ultimo: { x: number; y: number } | null = null;
  const ponteiro = { x: 0, y: 0 };

  function redimensionar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    largura = tela.clientWidth;
    altura = tela.clientHeight;
    tela.width = Math.round(largura * dpr);
    tela.height = Math.round(altura * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ouvir(window, "resize", redimensionar);
  redimensionar();

  function soltarEstrelas(x: number, y: number, quantidade: number, forca: number) {
    for (let i = 0; i < quantidade; i++) {
      const ang = Math.random() * Math.PI * 2, v = (.2 + Math.random() * .8) * forca;
      particulas.push({
        x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - .25,
        vida: 1, queda: .008 + Math.random() * .014, r: 1.5 + Math.random() * 3.5,
        estrela: Math.random() < .45, giro: Math.random() * Math.PI,
      });
    }
    if (particulas.length > 260) particulas.splice(0, particulas.length - 260);
  }

  ouvir(portal, "pointermove", (ev) => {
    const e = ev as PointerEvent;
    const r = portal.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    ponteiro.x = (x / r.width) * 2 - 1;
    ponteiro.y = (y / r.height) * 2 - 1;
    if (reduzMovimento) return;
    const dist = ultimo ? Math.hypot(x - ultimo.x, y - ultimo.y) : 0;
    if (!ultimo || dist > 7) {
      soltarEstrelas(x, y, 1 + Math.min(3, Math.floor(dist / 14)), .5);
      som.brilho(ponteiro.x * .8, dist / 60);
      ultimo = { x, y };
    }
  });

  ouvir(portal, "pointerdown", (ev) => {
    const e = ev as PointerEvent;
    if ((e.target as Element).closest("button")) return;
    const r = portal.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    ondas.push({ x, y, t: 0 });
    soltarEstrelas(x, y, reduzMovimento ? 0 : 14, 2.2);
    som.gota(((x / r.width) * 2 - 1) * .8);
  });

  ouvir(portal, "pointerleave", () => { ultimo = null; ponteiro.x = 0; ponteiro.y = 0; });

  function desenharEstrela(x: number, y: number, r: number, giro: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2, b = a + Math.PI / 4;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.quadraticCurveTo(Math.cos(b) * r * .16, Math.sin(b) * r * .16, Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r);
    }
    ctx.fill();
    ctx.restore();
  }

  let suaveX = 0, suaveY = 0;
  function animarInteracao() {
    ctx.clearRect(0, 0, largura, altura);
    const cor = getComputedStyle(portal).color;
    ctx.fillStyle = cor;
    ctx.strokeStyle = cor;

    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.x += p.vx; p.y += p.vy; p.vx *= .97; p.vy = p.vy * .97 - .006; p.giro += .03; p.vida -= p.queda;
      if (p.vida <= 0) { particulas.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.vida * 1.4) * .9;
      if (p.estrela) desenharEstrela(p.x, p.y, p.r * 2, p.giro);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .5, 0, Math.PI * 2); ctx.fill(); }
    }

    for (let i = ondas.length - 1; i >= 0; i--) {
      const o = ondas[i];
      o.t += 1 / 90;
      if (o.t >= 1) { ondas.splice(i, 1); continue; }
      for (let k = 0; k < 3; k++) {
        const t = o.t - k * .12;
        if (t <= 0) continue;
        ctx.globalAlpha = (1 - t) * .7;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(o.x, o.y, 10 + t * 150, (10 + t * 150) * .45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // paralaxe: cada camada acompanha o ponteiro na sua profundidade
    if (!reduzMovimento) {
      suaveX += (ponteiro.x - suaveX) * .05;
      suaveY += (ponteiro.y - suaveY) * .05;
      for (const [g, prof] of camadas) g.style.transform = `translate(${(-suaveX * 18 * prof).toFixed(2)}px, ${(-suaveY * 12 * prof).toFixed(2)}px)`;
      astrolabio.style.transform = `translate(${(suaveX * 6).toFixed(2)}px, ${(suaveY * 5).toFixed(2)}px) rotate(${(suaveX * 2).toFixed(2)}deg)`;
    }
    if (vivo) quadroInteracao = requestAnimationFrame(animarInteracao);
  }
  let quadroInteracao = requestAnimationFrame(animarInteracao);

  // ===================================================================
  // ENTRAR
  // ===================================================================

  async function entrar(comSom: boolean) {
    if (comSom) await definirSom(true);
    // a música do site assume daqui em diante: a paisagem do portal some devagar
    som.encerrar();
    opcoes.aoEntrar(comSom);
  }
  ouvir($("entrar-som"), "click", () => void entrar(true));
  ouvir($("entrar-silencio"), "click", () => void entrar(false));

  // ===================================================================
  // DEMONSTRAÇÃO (quando não há progresso real)
  // ===================================================================

  const passosDemo = [.08, .17, .29, .36, .44, .58, .64, .64, .73, .86, .93, 1];
  let temporizador = 0;
  function demo(i = 0) {
    if (i >= passosDemo.length) return;
    temporizador = window.setTimeout(() => { alvo = Math.max(alvo, passosDemo[i]); demo(i + 1); }, 420 + Math.random() * 520);
  }

  // os botões só recebem foco depois que amanhece
  $("portas").inert = true;

  let quadroLaco = 0;
  if (opcoes.pronto) {
    alvo = atual = 1;
    desenhar(1);
    amanhecer();
  } else {
    if (opcoes.demo !== false) demo();
    quadroLaco = requestAnimationFrame(laco);
  }

  return {
    progresso(p: number) { alvo = Math.max(alvo, Math.min(1, p)); },
    concluir() { alvo = 1; },
    destruir() {
      vivo = false;
      cancelAnimationFrame(quadroLaco);
      cancelAnimationFrame(quadroInteracao);
      clearTimeout(temporizador);
      limpezas.forEach((f) => f());
      som.encerrar();
      cena.replaceChildren();
      astro.replaceChildren();
    },
  };
}

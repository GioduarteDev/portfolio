/*
 * SOM DO SANTUÁRIO
 * Paisagem sonora gerada ao vivo com a Web Audio API — nenhum arquivo de áudio.
 *
 *   pads etéreos que respiram  ·  água correndo  ·  vento
 *   pássaros  ·  sininhos de vento  ·  gotas  ·  brilho ao mexer o mouse
 *
 * O navegador só libera som depois de um clique ou toque,
 * por isso tudo começa em `ligar()`, chamado a partir de um botão.
 */
export class SomDoSantuario {
  ctx: AudioContext | null = null;
  ligado = false;
  eventos = 0;
  ultimoBrilho = 0;
  mestre!: GainNode;
  reverb!: ConvolverNode;
  seco!: GainNode;
  ruido!: AudioBuffer;

  /** Some devagar e libera o áudio (ao sair do portal). */
  encerrar() {
    this.desligar();
    const ctx = this.ctx;
    if (ctx) window.setTimeout(() => void ctx.close(), 2500);
    this.ctx = null;
  }

  // ---------- liga / desliga ----------

  async ligar() {
    const pronto = await this.#iniciar();
    if (!pronto) return false;
    this.ligado = true;
    const t = this.ctx!.currentTime;
    this.mestre.gain.cancelScheduledValues(t);
    this.mestre.gain.setTargetAtTime(0.9, t, 1.2);
    this.#agendarEventos();
    return true;
  }

  desligar() {
    if (!this.ctx) return;
    this.ligado = false;
    const t = this.ctx!.currentTime;
    this.mestre.gain.cancelScheduledValues(t);
    this.mestre.gain.setTargetAtTime(0, t, 0.4);
    clearTimeout(this.eventos);
  }

  async alternar() {
    if (this.ligado) {
      this.desligar();
      return false;
    }
    return this.ligar();
  }

  // ---------- sons de interação ----------

  /** Gota d'água: clique ou toque na tela. */
  gota(pan = 0) {
    if (!this.ligado || !this.ctx) return;
    const c = this.ctx!;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    const p = this.#panner(pan);
    o.type = "sine";
    o.frequency.setValueAtTime(1300 + Math.random() * 300, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(p);
    p.connect(this.seco);
    p.connect(this.reverb);
    o.start(t);
    o.stop(t + 0.4);
    // um sininho responde, como eco do lago
    setTimeout(() => this.sino(0.06, pan), 140);
  }

  /** Brilho sutil enquanto o ponteiro se move (limitado para não virar ruído). */
  brilho(pan = 0, velocidade = 0.5) {
    if (!this.ligado) return;
    const agora = performance.now();
    if (agora - this.ultimoBrilho < 140) return;
    this.ultimoBrilho = agora;
    this.sino(0.012 + Math.min(velocidade, 1) * 0.02, pan, true);
  }

  /** Acorde que se abre quando o santuário amanhece. */
  amanhecer() {
    if (!this.ligado) return;
    [0, 1, 2, 3, 4, 5].forEach((i) => setTimeout(() => this.sino(0.09, (i - 2.5) / 3), i * 170));
  }

  /** Sininho de vento (escala pentatônica de Ré, bem aguda e cristalina). */
  sino(volume = 0.05, pan = 0, agudo = false) {
    if (!this.ctx) return;
    const c = this.ctx!;
    const t = c.currentTime;
    const escala = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51];
    const base = escala[Math.floor(Math.random() * escala.length)] * (agudo ? 2 : 1);
    const p = this.#panner(pan);
    p.connect(this.reverb);
    p.connect(this.seco);
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([parcial, peso]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = base * parcial;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(volume * peso, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (agudo ? 1.4 : 3.4) / parcial ** 0.3);
      o.connect(g).connect(p);
      o.start(t);
      o.stop(t + 3.6);
    });
  }

  /** Pássaro: dois a quatro piados curtos, de algum lado da cena. */
  passaro() {
    if (!this.ligado || !this.ctx) return;
    const c = this.ctx!;
    const pan = Math.random() * 1.6 - 0.8;
    const p = this.#panner(pan);
    p.connect(this.seco);
    p.connect(this.reverb);
    const piados = 2 + Math.floor(Math.random() * 3);
    const tom = 2600 + Math.random() * 1400;
    for (let i = 0; i < piados; i++) {
      const t = c.currentTime + i * (0.11 + Math.random() * 0.06);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(tom, t);
      o.frequency.exponentialRampToValueAtTime(tom * (1.25 + Math.random() * 0.3), t + 0.05);
      o.frequency.exponentialRampToValueAtTime(tom * 0.9, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.035, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g).connect(p);
      o.start(t);
      o.stop(t + 0.12);
    }
  }

  // ---------- construção da paisagem ----------

  async #iniciar() {
    if (!this.ctx) {
      const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Contexto) return false;
      this.ctx = new Contexto();
      this.#montar();
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return true;
  }

  #montar() {
    const c = this.ctx!;
    this.mestre = c.createGain();
    this.mestre.gain.value = 0;
    this.mestre.connect(c.destination);

    // reverberação de caverna/estufa, gerada por código
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.#impulso(4.8, 2.4);
    const molhado = c.createGain();
    molhado.gain.value = 0.6;
    this.reverb.connect(molhado).connect(this.mestre);

    this.seco = c.createGain();
    this.seco.gain.value = 0.55;
    this.seco.connect(this.mestre);

    this.ruido = this.#bufferRuido(6);

    this.#pads();
    this.#agua();
    this.#vento();
  }

  /** Acorde suspenso em Ré lídio: cada nota respira no seu próprio ritmo. */
  #pads() {
    const c = this.ctx!;
    const notas = [73.42, 146.83, 220, 329.63, 369.99, 493.88];
    const filtro = c.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 1200;
    filtro.Q.value = 0.4;
    filtro.connect(this.reverb);
    filtro.connect(this.seco);

    notas.forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      const lfo = c.createOscillator();
      const profundidade = c.createGain();
      o.type = i % 2 ? "sine" : "triangle";
      o.frequency.value = freq;
      o.detune.value = (Math.random() - 0.5) * 10;
      g.gain.value = i === 0 ? 0.03 : 0.018;
      lfo.frequency.value = 0.03 + i * 0.013;
      profundidade.gain.value = i === 0 ? 0.012 : 0.015;
      lfo.connect(profundidade).connect(g.gain);
      o.connect(g).connect(filtro);
      o.start();
      lfo.start();
    });

    // o filtro abre e fecha devagar, como maré
    const mare = c.createOscillator();
    const mareProf = c.createGain();
    mare.frequency.value = 0.02;
    mareProf.gain.value = 500;
    mare.connect(mareProf).connect(filtro.frequency);
    mare.start();
  }

  /** Riacho: ruído filtrado com borbulhas que oscilam. */
  #agua() {
    const c = this.ctx!;
    const fonte = c.createBufferSource();
    fonte.buffer = this.ruido;
    fonte.loop = true;

    const banda = c.createBiquadFilter();
    banda.type = "bandpass";
    banda.frequency.value = 1100;
    banda.Q.value = 0.9;
    const agudo = c.createBiquadFilter();
    agudo.type = "highpass";
    agudo.frequency.value = 400;

    const g = c.createGain();
    g.gain.value = 0.045;

    const borbulha = c.createOscillator();
    const borbProf = c.createGain();
    borbulha.type = "triangle";
    borbulha.frequency.value = 3.3;
    borbProf.gain.value = 380;
    borbulha.connect(borbProf).connect(banda.frequency);

    const p = this.#panner(-0.25);
    fonte.connect(agudo).connect(banda).connect(g).connect(p);
    p.connect(this.seco);
    p.connect(this.reverb);
    fonte.start();
    borbulha.start();
  }

  /** Vento: ruído grave que sobe e desce como respiração. */
  #vento() {
    const c = this.ctx!;
    const fonte = c.createBufferSource();
    fonte.buffer = this.ruido;
    fonte.loop = true;
    fonte.playbackRate.value = 0.7;

    const banda = c.createBiquadFilter();
    banda.type = "bandpass";
    banda.frequency.value = 500;
    banda.Q.value = 0.6;

    const g = c.createGain();
    g.gain.value = 0.02;

    const sopro = c.createOscillator();
    const soproProf = c.createGain();
    sopro.frequency.value = 0.07;
    soproProf.gain.value = 260;
    sopro.connect(soproProf).connect(banda.frequency);

    const forca = c.createOscillator();
    const forcaProf = c.createGain();
    forca.frequency.value = 0.045;
    forcaProf.gain.value = 0.014;
    forca.connect(forcaProf).connect(g.gain);

    fonte.connect(banda).connect(g).connect(this.reverb);
    g.connect(this.seco);
    fonte.start();
    sopro.start();
    forca.start();
  }

  /** De tempos em tempos: pássaros, sininhos e gotas, sempre diferentes. */
  #agendarEventos() {
    clearTimeout(this.eventos);
    const proximo = () => {
      if (!this.ligado) return;
      const sorte = Math.random();
      if (sorte < 0.22) this.passaro();
      else if (sorte < 0.5) this.sino(0.03 + Math.random() * 0.03, Math.random() * 1.4 - 0.7);
      else if (sorte < 0.6) this.sino(0.02, Math.random() * 1.4 - 0.7, true);
      this.eventos = window.setTimeout(proximo, 1400 + Math.random() * 2600);
    };
    this.eventos = window.setTimeout(proximo, 1200);
  }

  // ---------- utilidades ----------

  #panner(pan: number): AudioNode {
    const c = this.ctx!;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      return p;
    }
    return c.createGain();
  }

  #bufferRuido(segundos: number) {
    const c = this.ctx!;
    const tamanho = c.sampleRate * segundos;
    const buffer = c.createBuffer(1, tamanho, c.sampleRate);
    const dados = buffer.getChannelData(0);
    // ruído rosado aproximado: mais suave que o branco, mais "natural"
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < tamanho; i++) {
      const branco = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + branco * 0.099046;
      b1 = 0.963 * b1 + branco * 0.2965164;
      b2 = 0.57 * b2 + branco * 1.0526913;
      dados[i] = (b0 + b1 + b2 + branco * 0.1848) * 0.11;
    }
    return buffer;
  }

  #impulso(segundos: number, queda: number) {
    const c = this.ctx!;
    const tamanho = c.sampleRate * segundos;
    const buffer = c.createBuffer(2, tamanho, c.sampleRate);
    for (let canal = 0; canal < 2; canal++) {
      const dados = buffer.getChannelData(canal);
      for (let i = 0; i < tamanho; i++) {
        dados[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / tamanho, queda);
      }
    }
    return buffer;
  }
}


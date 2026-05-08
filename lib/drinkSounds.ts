// Web Audio API — WAY ドリンクバー効果音
// No audio files required; all sounds are generated programmatically.

let _ctx: AudioContext | null = null

function ctx(): AudioContext {
  if (!_ctx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)() as AudioContext
  }
  const ac = _ctx
  if (ac.state === 'suspended') void ac.resume()
  return ac
}

function mkNoise(ac: AudioContext, duration: number): AudioBufferSourceNode {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buf
  return src
}

function mkGain(ac: AudioContext, v: number): GainNode {
  const g = ac.createGain()
  g.gain.setValueAtTime(v, ac.currentTime)
  return g
}

function mkFilter(
  ac: AudioContext,
  type: BiquadFilterType,
  freq: number,
  q = 1,
): BiquadFilterNode {
  const f = ac.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

// ── 個別サウンド ────────────────────────────────────────────────

// メロンソーダ：シュワシュワ + 泡ポコポコ
function playMelonSoda(ac: AudioContext) {
  const t = ac.currentTime
  const dur = 1.8

  const fizz = mkNoise(ac, dur)
  const hp   = mkFilter(ac, 'highpass',  700)
  const bp   = mkFilter(ac, 'bandpass', 2600, 0.6)
  const g    = mkGain(ac, 0.13)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  fizz.connect(hp); hp.connect(bp); bp.connect(g); g.connect(ac.destination)
  fizz.start(t); fizz.stop(t + dur)

  for (let i = 0; i < 20; i++) {
    const st = t + Math.random() * 1.3
    const osc = ac.createOscillator()
    const bg  = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = 500 + Math.random() * 1400
    bg.gain.setValueAtTime(0, st)
    bg.gain.linearRampToValueAtTime(0.06, st + 0.008)
    bg.gain.exponentialRampToValueAtTime(0.001, st + 0.07)
    osc.connect(bg); bg.connect(ac.destination)
    osc.start(st); osc.stop(st + 0.08)
  }
}

// エスプレッソ：コポコポ — 低音ドリップ
function playEspresso(ac: AudioContext) {
  const t = ac.currentTime
  for (let i = 0; i < 7; i++) {
    const st  = t + i * 0.16 + Math.random() * 0.05
    const osc = ac.createOscillator()
    const bg  = ac.createGain()
    const base = 70 + Math.random() * 50
    osc.type = 'sine'
    osc.frequency.setValueAtTime(base * 1.6, st)
    osc.frequency.exponentialRampToValueAtTime(base, st + 0.12)
    bg.gain.setValueAtTime(0.18, st)
    bg.gain.exponentialRampToValueAtTime(0.001, st + 0.18)
    osc.connect(bg); bg.connect(ac.destination)
    osc.start(st); osc.stop(st + 0.2)
  }
}

// いもけんぴ：カリカリ — 高音ノイズバースト × 5
function playImoKenpi(ac: AudioContext) {
  const t = ac.currentTime
  for (let i = 0; i < 6; i++) {
    const st = t + i * 0.055 + Math.random() * 0.025
    const n  = mkNoise(ac, 0.04)
    const hp = mkFilter(ac, 'highpass', 2200)
    const bg = mkGain(ac, 0.28)
    bg.gain.exponentialRampToValueAtTime(0.001, st + 0.04)
    n.connect(hp); hp.connect(bg); bg.connect(ac.destination)
    n.start(st); n.stop(st + 0.04)
  }
}

// コーラ：プシュッ — 圧力放出 + 炭酸
function playCola(ac: AudioContext) {
  const t = ac.currentTime

  // プシュ
  const burst = mkNoise(ac, 0.12)
  const bg    = mkGain(ac, 0.45)
  bg.gain.setValueAtTime(0.45, t)
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  burst.connect(bg); bg.connect(ac.destination)
  burst.start(t); burst.stop(t + 0.12)

  // 炭酸
  const fizz = mkNoise(ac, 1.4)
  const hp   = mkFilter(ac, 'highpass', 350)
  const fg   = mkGain(ac, 0.001)
  fg.gain.linearRampToValueAtTime(0.09, t + 0.18)
  fg.gain.exponentialRampToValueAtTime(0.001, t + 1.5)
  fizz.connect(hp); hp.connect(fg); fg.connect(ac.destination)
  fizz.start(t + 0.06); fizz.stop(t + 1.5)
}

// 眠眠打破：ゆらゆら — 低音ビブラート
function playNemnemDaha(ac: AudioContext) {
  const t   = ac.currentTime
  const osc = ac.createOscillator()
  const lfo = ac.createOscillator()
  const lg  = ac.createGain()
  const mg  = mkGain(ac, 0.001)

  osc.type = 'sine'
  osc.frequency.value = 180
  lfo.type = 'sine'
  lfo.frequency.value = 1.8
  lg.gain.value = 35

  lfo.connect(lg); lg.connect(osc.frequency)
  mg.gain.linearRampToValueAtTime(0.1, t + 0.6)
  mg.gain.setValueAtTime(0.1, t + 1.2)
  mg.gain.exponentialRampToValueAtTime(0.001, t + 2.2)

  osc.connect(mg); mg.connect(ac.destination)
  osc.start(t); osc.stop(t + 2.2)
  lfo.start(t); lfo.stop(t + 2.2)
}

// 栄養ドリンク：キリッ — 周波数スイープ
function playEnergyDrink(ac: AudioContext) {
  const t = ac.currentTime

  // クリック
  const click = mkNoise(ac, 0.04)
  const cg    = mkGain(ac, 0.35)
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
  click.connect(cg); cg.connect(ac.destination)
  click.start(t); click.stop(t + 0.04)

  // 上昇スイープ
  const osc = ac.createOscillator()
  const lp  = mkFilter(ac, 'lowpass', 1600, 0.4)
  const g   = mkGain(ac, 0.2)
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(1100, t + 0.35)
  g.gain.setValueAtTime(0.2, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
  osc.connect(lp); lp.connect(g); g.connect(ac.destination)
  osc.start(t + 0.02); osc.stop(t + 0.45)
}

// ほうじ茶：ほっこり — 暖かいポア
function playHoujiCha(ac: AudioContext) {
  const t   = ac.currentTime
  const dur = 1.6
  const n   = mkNoise(ac, dur)
  const lp  = mkFilter(ac, 'lowpass', 550)
  const hp  = mkFilter(ac, 'highpass', 80)
  const g   = mkGain(ac, 0.001)
  g.gain.linearRampToValueAtTime(0.08, t + 0.35)
  g.gain.setValueAtTime(0.08, t + 0.9)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  n.connect(lp); lp.connect(hp); hp.connect(g); g.connect(ac.destination)
  n.start(t); n.stop(t + dur)
}

// ホットミルク：ふわっ — ごく静かな温かさ
function playHotMilk(ac: AudioContext) {
  const t = ac.currentTime
  for (let i = 0; i < 4; i++) {
    const st  = t + i * 0.28 + Math.random() * 0.1
    const osc = ac.createOscillator()
    const bg  = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = 55 + Math.random() * 25
    bg.gain.setValueAtTime(0.1, st)
    bg.gain.exponentialRampToValueAtTime(0.001, st + 0.25)
    osc.connect(bg); bg.connect(ac.destination)
    osc.start(st); osc.stop(st + 0.28)
  }
}

// ビール：泡 + 低音フィズ
function playBeer(ac: AudioContext) {
  const t   = ac.currentTime
  const dur = 1.5
  const n   = mkNoise(ac, dur)
  const lp  = mkFilter(ac, 'lowpass', 900)
  const hp  = mkFilter(ac, 'highpass', 150)
  const g   = mkGain(ac, 0.09)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  n.connect(lp); lp.connect(hp); hp.connect(g); g.connect(ac.destination)
  n.start(t); n.stop(t + dur)

  for (let i = 0; i < 9; i++) {
    const st  = t + Math.random() * 1.1
    const osc = ac.createOscillator()
    const bg  = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = 150 + Math.random() * 350
    bg.gain.setValueAtTime(0.07, st)
    bg.gain.exponentialRampToValueAtTime(0.001, st + 0.14)
    osc.connect(bg); bg.connect(ac.destination)
    osc.start(st); osc.stop(st + 0.16)
  }
}

// かき氷：キーン — 氷を削る高音
function playKakigori(ac: AudioContext) {
  const t = ac.currentTime

  for (let i = 0; i < 3; i++) {
    const st = t + i * 0.14
    const n  = mkNoise(ac, 0.1)
    const hp = mkFilter(ac, 'highpass', 3500)
    const bp = mkFilter(ac, 'bandpass', 5200, 2.5)
    const g  = mkGain(ac, 0.22)
    g.gain.exponentialRampToValueAtTime(0.001, st + 0.1)
    n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(ac.destination)
    n.start(st); n.stop(st + 0.1)
  }

  // 冷たい余韻
  const osc = ac.createOscillator()
  const g   = mkGain(ac, 0.04)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1800, t)
  osc.frequency.linearRampToValueAtTime(700, t + 0.55)
  g.gain.setValueAtTime(0.04, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
  osc.connect(g); g.connect(ac.destination)
  osc.start(t); osc.stop(t + 0.55)
}

// 抹茶ラテ：泡立て — フォームミルク
function playMatchaLatte(ac: AudioContext) {
  const t   = ac.currentTime
  const dur = 1.3
  const n   = mkNoise(ac, dur)
  const bp  = mkFilter(ac, 'bandpass', 850, 0.5)
  const g   = mkGain(ac, 0.001)
  g.gain.linearRampToValueAtTime(0.07, t + 0.25)
  g.gain.setValueAtTime(0.07, t + 0.8)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  n.connect(bp); bp.connect(g); g.connect(ac.destination)
  n.start(t); n.stop(t + dur)
}

// ホットチョコ：じんわり — 低音でトロっとした音
function playHotChocolate(ac: AudioContext) {
  const t   = ac.currentTime
  const osc = ac.createOscillator()
  const lp  = mkFilter(ac, 'lowpass', 250)
  const g   = mkGain(ac, 0.001)
  osc.type = 'triangle'
  osc.frequency.value = 75
  g.gain.linearRampToValueAtTime(0.12, t + 0.5)
  g.gain.setValueAtTime(0.12, t + 1.1)
  g.gain.exponentialRampToValueAtTime(0.001, t + 2.0)
  osc.connect(lp); lp.connect(g); g.connect(ac.destination)
  osc.start(t); osc.stop(t + 2.0)

  for (let i = 0; i < 3; i++) {
    const st  = t + 0.4 + i * 0.45 + Math.random() * 0.2
    const b   = ac.createOscillator()
    const bg  = ac.createGain()
    b.type = 'sine'
    b.frequency.value = 55 + Math.random() * 18
    bg.gain.setValueAtTime(0.1, st)
    bg.gain.exponentialRampToValueAtTime(0.001, st + 0.3)
    b.connect(bg); bg.connect(ac.destination)
    b.start(st); b.stop(st + 0.32)
  }
}

// 魔女のスープ：ぶくぶく — 低音の禍々しい煮えたぎり
function playWitchSoup(ac: AudioContext) {
  const t = ac.currentTime

  for (let i = 0; i < 7; i++) {
    const st  = t + Math.random() * 1.6
    const osc = ac.createOscillator()
    const lp  = mkFilter(ac, 'lowpass', 180)
    const bg  = ac.createGain()
    const base = 38 + Math.random() * 55
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(base * 1.9, st)
    osc.frequency.exponentialRampToValueAtTime(base, st + 0.22)
    bg.gain.setValueAtTime(0.14, st)
    bg.gain.exponentialRampToValueAtTime(0.001, st + 0.32)
    osc.connect(lp); lp.connect(bg); bg.connect(ac.destination)
    osc.start(st); osc.stop(st + 0.35)
  }

  // 不気味な高音
  const eerie = ac.createOscillator()
  const eg    = mkGain(ac, 0.035)
  eerie.type = 'sine'
  eerie.frequency.value = 466 // Bb（短調）
  eg.gain.linearRampToValueAtTime(0.035, t + 0.3)
  eg.gain.exponentialRampToValueAtTime(0.001, t + 2.2)
  eerie.connect(eg); eg.connect(ac.destination)
  eerie.start(t); eerie.stop(t + 2.2)
}

// ── エクスポート ─────────────────────────────────────────────────

const SOUND_MAP: Record<string, (ac: AudioContext) => void> = {
  melon_soda:    playMelonSoda,
  espresso:      playEspresso,
  imo_kenpi:     playImoKenpi,
  cola:          playCola,
  nemnem_daha:   playNemnemDaha,
  energy_drink:  playEnergyDrink,
  houji_cha:     playHoujiCha,
  hot_milk:      playHotMilk,
  beer:          playBeer,
  kakigori:      playKakigori,
  matcha_latte:  playMatchaLatte,
  hot_chocolate: playHotChocolate,
  witch_soup:    playWitchSoup,
}

export function playDrinkSound(key: string): void {
  if (typeof window === 'undefined') return
  try {
    const fn = SOUND_MAP[key]
    if (fn) fn(ctx())
  } catch {
    // Web Audio API 非対応環境では無音でスルー
  }
}

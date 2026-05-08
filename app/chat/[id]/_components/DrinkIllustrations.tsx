// WAY ドリンクバー手描き風SVGイラスト集
// チュートリアルイラストと同テイスト：丸みのある線・WAYパレットのみ

interface P { size?: number }

// ── 無料 ────────────────────────────────────────────────────────

// メロンソーダ：透明感ある高いグラス + ストロー + 泡
function MelonSoda({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <path d="M16 11H40L37 47H19Z" fill="#5C6E52" fillOpacity="0.14" stroke="#5C6E52" strokeWidth="2.2" strokeLinejoin="round"/>
      <line x1="15" y1="11" x2="41" y2="11" stroke="#5C6E52" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="35" y1="5" x2="31" y2="47" stroke="#C4A882" strokeWidth="2.8" strokeLinecap="round"/>
      <circle cx="23" cy="27" r="2.5" fill="#5C6E52" fillOpacity="0.45"/>
      <circle cx="27" cy="19" r="1.8" fill="#5C6E52" fillOpacity="0.35"/>
      <circle cx="23" cy="38" r="1.4" fill="#5C6E52" fillOpacity="0.3"/>
      <circle cx="30" cy="33" r="1.2" fill="#5C6E52" fillOpacity="0.28"/>
    </svg>
  )
}

// エスプレッソ：デミタスカップ + ソーサー + 湯気
function Espresso({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <ellipse cx="28" cy="43" rx="15" ry="4.5" fill="#EDE5D4" stroke="#C4A882" strokeWidth="2"/>
      <path d="M17 22Q17 38 21 40Q28 43 35 40Q39 38 39 22Q33 20 28 20Q22 20 17 22Z" fill="#5C6E52" fillOpacity="0.22" stroke="#5C6E52" strokeWidth="2.2"/>
      <ellipse cx="28" cy="22" rx="11" ry="3" fill="#5C6E52" fillOpacity="0.28" stroke="#5C6E52" strokeWidth="1.8"/>
      <path d="M39 27Q47 27 47 33Q47 39 39 39" stroke="#C4A882" strokeWidth="2.3" strokeLinecap="round" fill="none"/>
      <path d="M22 16Q23.5 10 21 6" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.65"/>
      <path d="M28 14Q29.5 8 27 4" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// いもけんぴ：斜めに並んだ細長い棒
function ImoKenpi({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <rect x="7" y="14" width="9" height="30" rx="4.5" transform="rotate(-7 7 14)" fill="#C4A882" fillOpacity="0.85" stroke="#5C6E52" strokeWidth="1.8"/>
      <rect x="17" y="11" width="9" height="32" rx="4.5" transform="rotate(-3 17 11)" fill="#C4A882" stroke="#5C6E52" strokeWidth="1.8"/>
      <rect x="27" y="10" width="9" height="32" rx="4.5" fill="#C4A882" fillOpacity="0.9" stroke="#5C6E52" strokeWidth="1.8"/>
      <rect x="37" y="11" width="9" height="32" rx="4.5" transform="rotate(3 37 11)" fill="#C4A882" fillOpacity="0.82" stroke="#5C6E52" strokeWidth="1.8"/>
    </svg>
  )
}

// コーラ：丸いカップ + 泡 + ストロー
function Cola({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <path d="M14 14H42L39 48H17Z" fill="#5C6E52" fillOpacity="0.1" stroke="#5C6E52" strokeWidth="2.2" strokeLinejoin="round"/>
      <line x1="13" y1="14" x2="43" y2="14" stroke="#5C6E52" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="34" y1="6" x2="30.5" y2="48" stroke="#C4A882" strokeWidth="2.8" strokeLinecap="round"/>
      <circle cx="20" cy="18" r="2.3" fill="#F2EEE6" stroke="#5C6E52" strokeWidth="1.6"/>
      <circle cx="26" cy="16" r="2.8" fill="#F2EEE6" stroke="#5C6E52" strokeWidth="1.6"/>
      <circle cx="32" cy="18" r="2.3" fill="#F2EEE6" stroke="#5C6E52" strokeWidth="1.6"/>
    </svg>
  )
}

// ── サブスク ────────────────────────────────────────────────────

// 眠眠打破：小さいガラス瓶 + 三日月
function NemnemDaha({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <rect x="20" y="10" width="16" height="36" rx="8" fill="#EDE5D4" stroke="#5C6E52" strokeWidth="2.2"/>
      <rect x="22" y="6" width="12" height="6" rx="3" fill="#C4A882" stroke="#5C6E52" strokeWidth="2"/>
      <line x1="20" y1="24" x2="36" y2="24" stroke="#5C6E52" strokeWidth="1.4" strokeDasharray="2.5 2" opacity="0.45"/>
      {/* 三日月 */}
      <path d="M27 34Q33 30 33 38Q29 42 25 38Q24 34 27 34Z" fill="#5C6E52" fillOpacity="0.38"/>
      <circle cx="37" cy="14" r="2" fill="#C4A882" fillOpacity="0.5"/>
      <circle cx="42" cy="10" r="1.4" fill="#C4A882" fillOpacity="0.35"/>
    </svg>
  )
}

// 栄養ドリンク：スリムな缶 + 稲妻
function EnergyDrink({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <rect x="18" y="11" width="20" height="38" rx="5" fill="#EDE5D4" stroke="#5C6E52" strokeWidth="2.2"/>
      <ellipse cx="28" cy="11" rx="10" ry="3.5" fill="#C4A882" stroke="#5C6E52" strokeWidth="1.8"/>
      <ellipse cx="28" cy="49" rx="10" ry="3.5" fill="#C4A882" stroke="#5C6E52" strokeWidth="1.8"/>
      <rect x="24" y="6" width="8" height="6" rx="2.5" fill="#C4A882" stroke="#5C6E52" strokeWidth="1.8"/>
      {/* 稲妻 */}
      <path d="M31 20L25 32H31L24 46" stroke="#5C6E52" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ほうじ茶：丸いお茶碗 + ソーサー + 湯気
function HoujiCha({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <ellipse cx="28" cy="44" rx="16" ry="5" fill="#EDE5D4" stroke="#C4A882" strokeWidth="2"/>
      <path d="M15 27Q15 41 20 43Q28 45 36 43Q41 41 41 27Q35 25 28 25Q21 25 15 27Z" fill="#C4A882" fillOpacity="0.2" stroke="#C4A882" strokeWidth="2.2"/>
      <ellipse cx="28" cy="27" rx="13" ry="4" fill="#C4A882" fillOpacity="0.22" stroke="#C4A882" strokeWidth="1.8"/>
      <path d="M41 31Q49 31 49 37Q49 43 41 43" stroke="#C4A882" strokeWidth="2.3" strokeLinecap="round" fill="none"/>
      <path d="M21 21Q22.5 15 20 11" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
      <path d="M28 19Q29.5 13 27 9" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
    </svg>
  )
}

// ホットミルク：シンプルな白いグラス + 湯気
function HotMilk({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <path d="M16 12H40L37 47H19Z" fill="#F2EEE6" stroke="#C4A882" strokeWidth="2.2" strokeLinejoin="round"/>
      <line x1="15" y1="12" x2="41" y2="12" stroke="#C4A882" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M21 7Q22.5 3 20 1" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
      <path d="M28 5Q29.5 1 27.5 0" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.42"/>
      <path d="M35 7Q36.5 3 34 1" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.45"/>
    </svg>
  )
}

// ビール：マグカップ + 泡
function Beer({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <path d="M11 22H36L33 49H14Z" fill="#C4A882" fillOpacity="0.25" stroke="#C4A882" strokeWidth="2.2" strokeLinejoin="round"/>
      <line x1="10" y1="22" x2="37" y2="22" stroke="#C4A882" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M36 26Q46 26 46 35Q46 44 36 44" stroke="#C4A882" strokeWidth="2.6" strokeLinecap="round" fill="none"/>
      <circle cx="16" cy="20" r="4" fill="#F2EEE6" stroke="#C4A882" strokeWidth="1.8"/>
      <circle cx="24" cy="17" r="5.5" fill="#F2EEE6" stroke="#C4A882" strokeWidth="1.8"/>
      <circle cx="32" cy="19" r="4.5" fill="#F2EEE6" stroke="#C4A882" strokeWidth="1.8"/>
    </svg>
  )
}

// ── 季節限定 ────────────────────────────────────────────────────

// かき氷：お椀 + 盛り上がった氷 + シロップ
function Kakigori({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <path d="M12 37Q14 47 28 49Q42 47 44 37Z" fill="#EDE5D4" stroke="#5C6E52" strokeWidth="2.2" strokeLinejoin="round"/>
      <ellipse cx="28" cy="37" rx="16" ry="4.5" fill="#F2EEE6" stroke="#5C6E52" strokeWidth="2"/>
      <path d="M13 37Q15 28 20 23Q24 17 28 15Q32 17 36 23Q41 28 43 37" fill="#F2EEE6" stroke="#5C6E52" strokeWidth="2.2" strokeLinejoin="round"/>
      <path d="M19 32Q28 28 37 32" stroke="#5C6E52" strokeWidth="1.3" strokeLinecap="round" opacity="0.35"/>
      <path d="M17 36Q28 31 39 36" stroke="#5C6E52" strokeWidth="1.3" strokeLinecap="round" opacity="0.28"/>
      <path d="M28 20Q29 28 28 37" stroke="#C4A882" strokeWidth="3.2" strokeLinecap="round" opacity="0.55"/>
    </svg>
  )
}

// 抹茶ラテ：カップ + ラテアート渦巻き（緑系）
function MatchaLatte({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <ellipse cx="28" cy="44" rx="16" ry="5" fill="#EDE5D4" stroke="#C4A882" strokeWidth="2"/>
      <path d="M15 27Q15 41 20 43Q28 45 36 43Q41 41 41 27Q35 25 28 25Q21 25 15 27Z" fill="#5C6E52" fillOpacity="0.14" stroke="#5C6E52" strokeWidth="2.2"/>
      <ellipse cx="28" cy="27" rx="13" ry="4" fill="#5C6E52" fillOpacity="0.2" stroke="#5C6E52" strokeWidth="1.8"/>
      <path d="M41 31Q49 31 49 37Q49 43 41 43" stroke="#5C6E52" strokeWidth="2.3" strokeLinecap="round" fill="none"/>
      {/* ラテアート渦 */}
      <path d="M22 27Q28 23 34 27" stroke="#F2EEE6" strokeWidth="1.8" strokeLinecap="round" opacity="0.8"/>
      <path d="M24 29Q28 26 32 29" stroke="#F2EEE6" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

// ホットチョコ：マグ + ゆったりした湯気
function HotChocolate({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <path d="M12 24H42L39 47H15Z" fill="#C4A882" fillOpacity="0.22" stroke="#C4A882" strokeWidth="2.2" strokeLinejoin="round"/>
      <line x1="11" y1="24" x2="43" y2="24" stroke="#C4A882" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M42 30Q51 30 51 38Q51 46 42 46" stroke="#C4A882" strokeWidth="2.6" strokeLinecap="round" fill="none"/>
      <path d="M19 19Q21 13 18 9" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
      <path d="M27 17Q29 11 26 7" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.52"/>
      <path d="M35 19Q37 13 34 9" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.45"/>
    </svg>
  )
}

// 魔女のスープ：大鍋 + 泡
function WitchSoup({ size = 52 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      {/* 鍋 */}
      <path d="M9 36Q9 49 28 49Q47 49 47 36Q47 28 28 28Q9 28 9 36Z" fill="#5C6E52" fillOpacity="0.22" stroke="#5C6E52" strokeWidth="2.2"/>
      <ellipse cx="28" cy="28" rx="19" ry="5.5" fill="#5C6E52" fillOpacity="0.28" stroke="#5C6E52" strokeWidth="2"/>
      {/* 取っ手 */}
      <line x1="7" y1="32" x2="2" y2="32" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="49" y1="32" x2="54" y2="32" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      {/* 泡 */}
      <circle cx="18" cy="22" r="4"   stroke="#5C6E52" strokeWidth="1.8" fill="#EDE5D4" fillOpacity="0.8"/>
      <circle cx="28" cy="16" r="5"   stroke="#5C6E52" strokeWidth="1.8" fill="#EDE5D4" fillOpacity="0.75"/>
      <circle cx="38" cy="21" r="3.5" stroke="#5C6E52" strokeWidth="1.8" fill="#EDE5D4" fillOpacity="0.7"/>
      <circle cx="23" cy="13" r="2.5" stroke="#5C6E52" strokeWidth="1.5" fill="#EDE5D4" fillOpacity="0.6"/>
    </svg>
  )
}

// ── エクスポート ────────────────────────────────────────────────

const ILLUST_MAP: Record<string, ({ size }: P) => React.ReactElement> = {
  melon_soda:    MelonSoda,
  espresso:      Espresso,
  imo_kenpi:     ImoKenpi,
  cola:          Cola,
  nemnem_daha:   NemnemDaha,
  energy_drink:  EnergyDrink,
  houji_cha:     HoujiCha,
  hot_milk:      HotMilk,
  beer:          Beer,
  kakigori:      Kakigori,
  matcha_latte:  MatchaLatte,
  hot_chocolate: HotChocolate,
  witch_soup:    WitchSoup,
}

export function DrinkIllustration({
  drinkKey,
  size = 52,
}: {
  drinkKey: string
  size?: number
}) {
  const Comp = ILLUST_MAP[drinkKey]
  if (!Comp) {
    // フォールバック：絵文字テキスト
    return <span className="text-2xl leading-none">{drinkKey}</span>
  }
  return <Comp size={size} />
}

const ADJECTIVES = [
  '深夜の', '眠れぬ', '迷子の', '静かな', '夜更けの',
  '気ままな', '浮かぶ', '揺れる', '光る', '消えゆく',
  'はぐれた', '漂う', '宵の', '朝露の', 'さまよう',
]

const NOUNS = [
  'キツネ', 'ネコ', 'タヌキ', 'クマ', 'ウサギ',
  'カラス', 'フクロウ', 'サカナ', 'クラゲ', 'カメ',
  'ヤモリ', 'ホシ', 'ツキ', 'カゼ', 'アメ',
]

export function generateRandomCodename(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return adj + noun
}

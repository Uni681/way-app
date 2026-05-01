// Layer 1 クライアント側キーワードチェック
// WAY三無ルール（素顔・連絡先・オフ会）+ 明確な有害コンテンツに限定
// 曖昧なものは Layer 2 (Claude) に委ねる

const PATTERNS: RegExp[] = [
  // ── 連絡先交換（WAY三無ルール違反）──────────────────────────
  /\bLINE\b|ライン|line\s?id|らいん/i,
  /instagram|インスタ|insta\b/i,
  /twitter|ツイッター|twitterのid/i,
  /discord|ディスコード/i,
  /telegram|テレグラム/i,
  /\bDM\b|でぃーえむ|ダイレクトメッセージ/i,
  /\b[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}\b/i,  // メールアドレス
  /\b0[789]0[-\s]?\d{4}[-\s]?\d{4}\b/,              // 携帯番号
  /\b0\d{1,4}[-\s]?\d{2,4}[-\s]?\d{4}\b/,           // 固定電話

  // ── オフ会・実会（WAY三無ルール違反）────────────────────────
  /会おう|あおう|オフ会|オフ\s?会|off会|meet\s?up/i,
  /直接会|リアルで会|現実で会|今から会/,

  // ── 性的な勧誘・売春 ─────────────────────────────────────────
  /援交|円交|えんこう|パパ活|ぱぱかつ|売春|買春/,
  /セックスしよう|えっちしよう|やらせて|ヤラせて/,

  // ── 脅迫・暴力 ──────────────────────────────────────────────
  /殺す|殺してやる|ころす|ぶっ殺|刺す|刺してやる/,
  /死ね|しね\b|氏ね|くたばれ/,
]

export type Layer1Result =
  | { blocked: false }
  | { blocked: true; reason: string }

export function checkLayer1(content: string): Layer1Result {
  for (const pattern of PATTERNS) {
    if (pattern.test(content)) {
      return { blocked: true, reason: 'banned_content' }
    }
  }
  return { blocked: false }
}

export const LAYER1_ERROR_MESSAGE =
  'このメッセージは送信できません。WAYのルールに反する内容が含まれています。'

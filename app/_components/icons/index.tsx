// WAY unified icon set — hand-drawn style, rounded strokes, WAY palette

interface WayIconProps {
  size?: number
  className?: string
  strokeWidth?: number
}

// ── ナビゲーション ────────────────────────────────────────────────

export function NavBellIcon({ size = 20, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 4c-3 0-5.5 2.3-5.5 5.5v4.2L4.5 17h15l-2-3.3V9.5C17.5 6.3 15 4 12 4z"/>
      <path d="M10 17a2 2 0 0 0 4 0"/>
      <line x1="12" y1="4" x2="12" y2="2.5"/>
    </svg>
  )
}

export function NavChatIcon({ size = 20, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 11.5C20 16 16.5 19.5 12 19.5a8.6 8.6 0 0 1-2.7-.42C8.6 19.4 7 20 4.5 20.3c.32-.9.52-2.1.46-3.1C4 16 4 14 4 11.5 4 7 7.5 3.5 12 3.5c4.5 0 8 3.5 8 8z"/>
    </svg>
  )
}

export function NavBookmarkIcon({ size = 20, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4-7 4v-16a1 1 0 0 1 1-1z"/>
    </svg>
  )
}

export function NavBookIcon({ size = 20, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 5.5h5A2 2 0 0 1 11 7.5v11A2.5 2.5 0 0 0 8.5 16H4V5.5z"/>
      <path d="M20 5.5h-5a2 2 0 0 0-2 2v11a2.5 2.5 0 0 1 2.5-2.5H20V5.5z"/>
    </svg>
  )
}

// ── アクション ────────────────────────────────────────────────────

// ベル（ホームの声を投げるボタン用、サイズ自由）
export function BellIcon({ size = 24, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 4c-3 0-5.5 2.3-5.5 5.5v4.2L4.5 17h15l-2-3.3V9.5C17.5 6.3 15 4 12 4z"/>
      <path d="M10 17a2 2 0 0 0 4 0"/>
      <line x1="12" y1="4" x2="12" y2="2.5"/>
    </svg>
  )
}

// ドリンク（ドリンクバーボタン）
export function DrinkIcon({ size = 24, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 9h8l-1.5 10H9.5z"/>
      <line x1="6.5" y1="9" x2="17.5" y2="9"/>
      <line x1="15" y1="5" x2="13" y2="19"/>
    </svg>
  )
}

// ピン（相思相愛ストック）
export function PinIcon({ size = 24, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3a5 5 0 0 1 5 5c0 3.2-5 9.5-5 9.5S7 11.2 7 8a5 5 0 0 1 5-5z"/>
      <circle cx="12" cy="8" r="2"/>
    </svg>
  )
}

// ブックマーク（ワンサイドストック・印）
export function BookmarkIcon({ size = 24, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-4-7 4v-16a1 1 0 0 1 1-1z"/>
    </svg>
  )
}

// 鍵（サブスク未契約ロック）
export function LockIcon({ size = 24, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/>
      <circle cx="12" cy="16" r="1.5"/>
    </svg>
  )
}

// 送信（↑ 矢印）
export function SendIcon({ size = 24, className, strokeWidth = 2 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 19.5V4.5"/>
      <path d="M7 9l5-4.5L17 9"/>
    </svg>
  )
}

// 戻る（← 矢印）
export function BackIcon({ size = 24, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15.5 4.5l-7 7.5 7 7.5"/>
    </svg>
  )
}

// チャット吹き出し（チャットリスト空状態）
export function ChatBubbleIcon({ size = 24, className, strokeWidth = 1.8 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 11.5C20 16 16.5 19.5 12 19.5a8.6 8.6 0 0 1-2.7-.42C8.6 19.4 7 20 4.5 20.3c.32-.9.52-2.1.46-3.1C4 16 4 14 4 11.5 4 7 7.5 3.5 12 3.5c4.5 0 8 3.5 8 8z"/>
      <line x1="8.5" y1="11" x2="15.5" y2="11" strokeWidth={strokeWidth * 0.9}/>
      <line x1="8.5" y1="14" x2="13.5" y2="14" strokeWidth={strokeWidth * 0.9}/>
    </svg>
  )
}

// プラス（リアクション追加・ストック追加）
export function PlusIcon({ size = 24, className, strokeWidth = 2 }: WayIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

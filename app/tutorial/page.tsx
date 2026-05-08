'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/* ─── Illustrations ─── */

function TutorialIllustration1() {
  return (
    <svg viewBox="0 0 280 210" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[300px]">
      {/* platform */}
      <rect x="10" y="170" width="260" height="16" rx="4" fill="#C4A882" opacity="0.3"/>
      <line x1="10" y1="170" x2="270" y2="170" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      {/* yellow line */}
      <line x1="10" y1="180" x2="270" y2="180" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="8 6" opacity="0.5"/>

      {/* person 1 */}
      <circle cx="65" cy="100" r="19" stroke="#5C6E52" strokeWidth="2.5" fill="#F2EEE6"/>
      <line x1="65" y1="119" x2="65" y2="158" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="44" y1="131" x2="86" y2="131" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="65" y1="158" x2="55" y2="172" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="65" y1="158" x2="75" y2="172" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>

      {/* thought dots */}
      <circle cx="97" cy="97" r="3.5" fill="#C4A882" opacity="0.55"/>
      <circle cx="108" cy="92" r="2.5" fill="#C4A882" opacity="0.35"/>

      {/* person 2 */}
      <circle cx="140" cy="96" r="19" stroke="#C4A882" strokeWidth="2.5" fill="#F2EEE6"/>
      <line x1="140" y1="115" x2="140" y2="158" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="119" y1="128" x2="161" y2="128" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="140" y1="158" x2="130" y2="172" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="140" y1="158" x2="150" y2="172" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>

      {/* thought dots */}
      <circle cx="172" cy="92" r="2.5" fill="#C4A882" opacity="0.35"/>
      <circle cx="181" cy="97" r="3.5" fill="#C4A882" opacity="0.55"/>

      {/* person 3 */}
      <circle cx="215" cy="100" r="19" stroke="#5C6E52" strokeWidth="2.5" fill="#F2EEE6"/>
      <line x1="215" y1="119" x2="215" y2="158" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="194" y1="131" x2="236" y2="131" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="215" y1="158" x2="205" y2="172" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="215" y1="158" x2="225" y2="172" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>

      {/* overhead sign */}
      <rect x="100" y="22" width="80" height="28" rx="6" fill="#EDE5D4" stroke="#C4A882" strokeWidth="1.5"/>
      <text x="140" y="41" textAnchor="middle" fontSize="11" fill="#7A7568" fontFamily="sans-serif">遅延中</text>
      <line x1="140" y1="50" x2="140" y2="60" stroke="#C4A882" strokeWidth="1.5"/>
    </svg>
  )
}

function TutorialIllustration2() {
  return (
    <svg viewBox="0 0 280 210" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[300px]">
      {/* shelves */}
      <rect x="80" y="40" width="160" height="130" rx="6" fill="#EDE5D4" stroke="#C4A882" strokeWidth="1.5"/>
      <line x1="80" y1="95" x2="240" y2="95" stroke="#C4A882" strokeWidth="1.5"/>
      <line x1="80" y1="148" x2="240" y2="148" stroke="#C4A882" strokeWidth="1.5"/>

      {/* shelf items row 1 */}
      <rect x="93" y="65" width="22" height="26" rx="5" fill="#5C6E52" opacity="0.7"/>
      <rect x="122" y="68" width="18" height="23" rx="4" fill="#C4A882" opacity="0.8"/>
      <rect x="147" y="63" width="24" height="28" rx="5" fill="#5C6E52" opacity="0.5"/>
      <rect x="178" y="67" width="20" height="24" rx="4" fill="#C4A882" opacity="0.6"/>
      <rect x="204" y="65" width="22" height="26" rx="5" fill="#5C6E52" opacity="0.65"/>

      {/* shelf items row 2 */}
      <rect x="93" y="112" width="26" height="30" rx="6" fill="#C4A882" opacity="0.6"/>
      <rect x="125" y="116" width="20" height="26" rx="5" fill="#5C6E52" opacity="0.6"/>
      <rect x="151" y="112" width="22" height="30" rx="5" fill="#C4A882" opacity="0.75"/>
      <rect x="179" y="115" width="24" height="27" rx="5" fill="#5C6E52" opacity="0.5"/>
      <rect x="208" y="112" width="18" height="30" rx="4" fill="#C4A882" opacity="0.55"/>

      {/* floor */}
      <line x1="20" y1="185" x2="260" y2="185" stroke="#C4A882" strokeWidth="2" strokeLinecap="round"/>

      {/* person */}
      <circle cx="45" cy="110" r="18" stroke="#5C6E52" strokeWidth="2.5" fill="#F2EEE6"/>
      <line x1="45" y1="128" x2="45" y2="168" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="28" y1="140" x2="67" y2="140" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="45" y1="168" x2="36" y2="183" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="45" y1="168" x2="54" y2="183" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>

      {/* thought bubble */}
      <circle cx="67" cy="95" r="4" fill="#C4A882" opacity="0.4"/>
      <circle cx="76" cy="86" r="6" fill="#C4A882" opacity="0.3"/>
      <ellipse cx="88" cy="76" rx="10" ry="8" fill="#EDE5D4" stroke="#C4A882" strokeWidth="1.5" opacity="0.9"/>
      <text x="88" y="80" textAnchor="middle" fontSize="9" fill="#7A7568">!?</text>
    </svg>
  )
}

function TutorialIllustration3() {
  return (
    <svg viewBox="0 0 280 210" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[300px]">
      {/* table */}
      <ellipse cx="140" cy="145" rx="65" ry="22" fill="#EDE5D4" stroke="#C4A882" strokeWidth="2.5"/>
      <line x1="90" y1="155" x2="90" y2="185" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="190" y1="155" x2="190" y2="185" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      {/* table top items */}
      <circle cx="140" cy="140" r="8" stroke="#C4A882" strokeWidth="1.5" fill="#F2EEE6"/>
      <circle cx="120" cy="138" r="5" stroke="#C4A882" strokeWidth="1.5" fill="#F2EEE6"/>
      <circle cx="160" cy="138" r="5" stroke="#C4A882" strokeWidth="1.5" fill="#F2EEE6"/>

      {/* person left */}
      <circle cx="60" cy="100" r="18" stroke="#5C6E52" strokeWidth="2.5" fill="#F2EEE6"/>
      <line x1="60" y1="118" x2="60" y2="155" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="42" y1="130" x2="85" y2="138" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="60" y1="155" x2="50" y2="175" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="60" y1="155" x2="70" y2="175" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>

      {/* person right */}
      <circle cx="220" cy="100" r="18" stroke="#C4A882" strokeWidth="2.5" fill="#F2EEE6"/>
      <line x1="220" y1="118" x2="220" y2="155" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="195" y1="138" x2="238" y2="130" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="220" y1="155" x2="210" y2="175" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="220" y1="155" x2="230" y2="175" stroke="#C4A882" strokeWidth="2.5" strokeLinecap="round"/>

      {/* speech lines from left */}
      <line x1="79" y1="95" x2="95" y2="90" stroke="#5C6E52" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="79" y1="100" x2="98" y2="100" stroke="#5C6E52" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <line x1="79" y1="105" x2="95" y2="110" stroke="#5C6E52" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>

      {/* speech lines from right */}
      <line x1="201" y1="95" x2="185" y2="90" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <line x1="201" y1="100" x2="182" y2="100" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <line x1="201" y1="105" x2="185" y2="110" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
    </svg>
  )
}

function TutorialIllustration4() {
  return (
    <svg viewBox="0 0 200 210" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[220px]">
      <g className="tut-bell-anim">
        {/* bell body */}
        <path
          d="M100 30 C70 30, 48 55, 46 90 L40 148 L160 148 L154 90 C152 55, 130 30, 100 30 Z"
          fill="#EDE5D4"
          stroke="#5C6E52"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* bell top knob */}
        <circle cx="100" cy="26" r="9" fill="#F2EEE6" stroke="#5C6E52" strokeWidth="2.5"/>
        {/* bell bottom rim */}
        <path
          d="M36 148 Q100 168, 164 148"
          stroke="#5C6E52"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* clapper */}
        <line x1="100" y1="148" x2="100" y2="162" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="100" cy="167" r="7" fill="#C4A882" stroke="#5C6E52" strokeWidth="2"/>
        {/* inner highlight */}
        <path d="M80 80 Q88 72, 96 76" stroke="#C4A882" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      </g>
      {/* vibration lines */}
      <line x1="26" y1="80" x2="14" y2="74" stroke="#C4A882" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <line x1="22" y1="95" x2="8" y2="95" stroke="#C4A882" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <line x1="26" y1="110" x2="14" y2="116" stroke="#C4A882" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
      <line x1="174" y1="80" x2="186" y2="74" stroke="#C4A882" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <line x1="178" y1="95" x2="192" y2="95" stroke="#C4A882" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <line x1="174" y1="110" x2="186" y2="116" stroke="#C4A882" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
    </svg>
  )
}

function TutorialIllustration5() {
  return (
    <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[300px]">
      {/* bubble 1 - large, left */}
      <g style={{ animation: 'way-float-a 3.2s ease-in-out infinite' }}>
        <circle cx="72" cy="110" r="52" fill="#EDE5D4" stroke="#C4A882" strokeWidth="2.5" opacity="0.85"/>
        <line x1="55" y1="104" x2="89" y2="104" stroke="#C4A882" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <line x1="50" y1="114" x2="94" y2="114" stroke="#C4A882" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
      </g>
      {/* bubble 2 - medium, right */}
      <g style={{ animation: 'way-float-b 2.8s ease-in-out infinite' }}>
        <circle cx="200" cy="100" r="44" fill="#F2EEE6" stroke="#5C6E52" strokeWidth="2.5" opacity="0.8"/>
        <line x1="185" y1="94" x2="215" y2="94" stroke="#5C6E52" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
        <line x1="180" y1="104" x2="220" y2="104" stroke="#5C6E52" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
      </g>
      {/* bubble 3 - small, top center */}
      <g style={{ animation: 'way-float-c 3.6s ease-in-out infinite' }}>
        <circle cx="148" cy="52" r="30" fill="#EDE5D4" stroke="#C4A882" strokeWidth="2" opacity="0.7"/>
        <line x1="136" y1="48" x2="160" y2="48" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round" opacity="0.45"/>
      </g>
    </svg>
  )
}

function TutorialIllustration6() {
  return (
    <svg viewBox="0 0 280 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[300px]">
      {/* icon 1: no real name */}
      <circle cx="56" cy="65" r="38" fill="#EDE5D4" stroke="#C4A882" strokeWidth="2"/>
      <text x="56" y="58" textAnchor="middle" fontSize="18" fill="#5C6E52" fontWeight="bold" fontFamily="sans-serif">名</text>
      <line x1="34" y1="78" x2="78" y2="50" stroke="#D85A30" strokeWidth="3" strokeLinecap="round"/>
      <text x="56" y="122" textAnchor="middle" fontSize="11" fill="#7A7568" fontFamily="sans-serif">本名なし</text>

      {/* icon 2: no face */}
      <circle cx="140" cy="65" r="38" fill="#EDE5D4" stroke="#C4A882" strokeWidth="2"/>
      <circle cx="128" cy="58" r="4" fill="#5C6E52" opacity="0.6"/>
      <circle cx="152" cy="58" r="4" fill="#5C6E52" opacity="0.6"/>
      <path d="M128 76 Q140 84 152 76" stroke="#5C6E52" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
      <line x1="118" y1="78" x2="162" y2="50" stroke="#D85A30" strokeWidth="3" strokeLinecap="round"/>
      <text x="140" y="122" textAnchor="middle" fontSize="11" fill="#7A7568" fontFamily="sans-serif">顔なし</text>

      {/* icon 3: no dating */}
      <circle cx="224" cy="65" r="38" fill="#EDE5D4" stroke="#C4A882" strokeWidth="2"/>
      <path d="M224 80 C224 80, 206 66, 206 55 C206 48, 212 43, 218 46 C220 47, 222 49, 224 52 C226 49, 228 47, 230 46 C236 43, 242 48, 242 55 C242 66, 224 80, 224 80 Z"
        fill="#C4A882" opacity="0.7"/>
      <line x1="202" y1="78" x2="246" y2="50" stroke="#D85A30" strokeWidth="3" strokeLinecap="round"/>
      <text x="224" y="122" textAnchor="middle" fontSize="11" fill="#7A7568" fontFamily="sans-serif">出会い目的なし</text>
    </svg>
  )
}

function TutorialIllustration7() {
  return (
    <svg viewBox="0 0 280 210" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[300px]">
      {/* floating bubbles */}
      <g style={{ animation: 'way-float-a 3s ease-in-out infinite' }}>
        <circle cx="48" cy="80" r="24" fill="#EDE5D4" stroke="#C4A882" strokeWidth="1.8" opacity="0.75"/>
        <line x1="37" y1="77" x2="59" y2="77" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      </g>
      <g style={{ animation: 'way-float-c 3.8s ease-in-out infinite' }}>
        <circle cx="232" cy="90" r="20" fill="#EDE5D4" stroke="#C4A882" strokeWidth="1.8" opacity="0.7"/>
        <line x1="222" y1="88" x2="242" y2="88" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      </g>
      <g style={{ animation: 'way-float-b 2.6s ease-in-out infinite' }}>
        <circle cx="56" cy="158" r="16" fill="#F2EEE6" stroke="#5C6E52" strokeWidth="1.5" opacity="0.6"/>
      </g>
      <g style={{ animation: 'way-float-a 4.2s ease-in-out infinite' }}>
        <circle cx="228" cy="160" r="14" fill="#EDE5D4" stroke="#C4A882" strokeWidth="1.5" opacity="0.55"/>
      </g>

      {/* bell */}
      <g className="tut-bell-anim" style={{ transformOrigin: '140px 45px' }}>
        <path
          d="M140 45 C118 45, 100 64, 99 90 L94 135 L186 135 L181 90 C180 64, 162 45, 140 45 Z"
          fill="#EDE5D4"
          stroke="#5C6E52"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <circle cx="140" cy="41" r="8" fill="#F2EEE6" stroke="#5C6E52" strokeWidth="2.5"/>
        <path d="M90 135 Q140 152, 190 135" stroke="#5C6E52" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
        <line x1="140" y1="135" x2="140" y2="147" stroke="#5C6E52" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="140" cy="152" r="6" fill="#C4A882" stroke="#5C6E52" strokeWidth="2"/>
      </g>
    </svg>
  )
}

/* ─── Page data ─── */

const PAGES = [
  {
    copy: '電車が遅延してる。隣の人も、絶対同じこと思ってる。でも、声をかけられない。',
    illustration: <TutorialIllustration1 />,
  },
  {
    copy: 'スーパーで見つけた、美味しそうなやつ。「これ、よくない？」って言いたい。でも、言えない。',
    illustration: <TutorialIllustration2 />,
  },
  {
    copy: '友達となら、最初からぜんぶすっ飛ばしてだらだら駄弁れるのに。あの感じ、知らない人ともできたら。',
    illustration: <TutorialIllustration3 />,
  },
  {
    copy: 'WAYは、それをやるアプリ。名前も顔も要らない。ひとこと置いたら、誰かが乗ってくる。',
    illustration: <TutorialIllustration4 />,
  },
  {
    copy: '届いたひとことを見て、ノリそうだったら乗ればいい。スルーしてもいい。それだけ。',
    illustration: <TutorialIllustration5 />,
  },
  {
    copy: '3つだけ約束して。本名は言わない。顔は見せない。出会い目的にしない。30回話して初めて、次に進める。',
    illustration: <TutorialIllustration6 />,
  },
  {
    copy: '24時間だけ。ひとこと、置いてみて。',
    illustration: <TutorialIllustration7 />,
  },
] as const

/* ─── Page ─── */

export default function TutorialPage() {
  const [page, setPage] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('way_tutorial_done')) {
      router.replace('/')
    }
  }, [router])

  function advance() {
    if (page < PAGES.length - 1) {
      setPage(p => p + 1)
      setAnimKey(k => k + 1)
    }
  }

  function finish() {
    localStorage.setItem('way_tutorial_done', '1')
    router.push('/')
  }

  const current = PAGES[page]
  const isLast = page === PAGES.length - 1

  return (
    <div
      className="min-h-screen bg-way-base flex flex-col select-none"
      onClick={isLast ? undefined : advance}
    >
      <div key={animKey} className="tut-page-enter flex-1 flex flex-col items-center justify-between px-8 py-12">
        {/* illustration */}
        <div className="flex-1 flex items-center justify-center w-full">
          {current.illustration}
        </div>

        {/* copy */}
        <div className="w-full max-w-sm mt-6">
          <p className="text-xl font-medium text-way-text leading-relaxed tracking-wide">
            {current.copy}
          </p>
        </div>

        {/* last page button */}
        {isLast && (
          <button
            onClick={finish}
            className="mt-10 w-full max-w-sm py-4 rounded-2xl bg-way-green text-white text-base font-semibold tracking-wide"
          >
            はじめる
          </button>
        )}

        {/* page dots */}
        <div className="flex gap-2 mt-8">
          {PAGES.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === page
                  ? 'w-6 h-2 bg-way-green'
                  : 'w-2 h-2 bg-way-wood opacity-40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* tap hint on non-last pages */}
      {!isLast && (
        <p className="text-center text-xs text-way-muted pb-4 opacity-60">
          タップで次へ
        </p>
      )}
    </div>
  )
}

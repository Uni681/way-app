'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OCCUPATIONS, MBTI_TYPES, INTERESTS } from '@/lib/tags'

type ZukanEntry = {
  tag_type: 'occupation' | 'mbti' | 'interest'
  tag_value: string
  count: number
}

export default function ZukanPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<ZukanEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/auth'); return }

      const { data } = await supabase
        .from('zukan_entries')
        .select('tag_type, tag_value, count')
        .eq('user_id', session.user.id)

      setEntries((data ?? []) as ZukanEntry[])
      setLoading(false)
    }
    init()
  }, [router])

  const countMap = new Map(entries.map(e => [`${e.tag_type}:${e.tag_value}`, e.count]))
  const total = entries.reduce((sum, e) => sum + e.count, 0)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-way-muted text-sm">…</p>
      </div>
    )
  }

  return (
    <>
      <header className="px-4 py-3 border-b border-way-wood-light shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-way-text">人間図鑑</h2>
          {total > 0 && <span className="text-xs text-way-muted">{total}種類</span>}
        </div>
        <p className="text-xs text-way-muted mt-0.5">完走した会話から集まった成分</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-8 min-h-0">
        {total === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-way-muted text-sm">まだ図鑑は空です</p>
            <p className="text-way-muted text-xs text-center leading-relaxed">
              会話を完走（20往復以上）すると<br />相手の成分が集まります
            </p>
          </div>
        )}
        <ZukanSection title="職種" tagType="occupation" values={OCCUPATIONS} countMap={countMap} />
        <ZukanSection title="MBTI" tagType="mbti" values={MBTI_TYPES} countMap={countMap} />
        <ZukanSection title="趣味" tagType="interest" values={INTERESTS} countMap={countMap} />
      </main>
    </>
  )
}

function ZukanSection({
  title,
  tagType,
  values,
  countMap,
}: {
  title: string
  tagType: string
  values: string[]
  countMap: Map<string, number>
}) {
  const discovered = values.filter(v => (countMap.get(`${tagType}:${v}`) ?? 0) > 0)

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs font-medium text-way-muted uppercase tracking-wider">{title}</p>
        <span className="text-xs text-way-muted">{discovered.length} / {values.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map(v => {
          const count = countMap.get(`${tagType}:${v}`) ?? 0
          const found = count > 0
          const isRare = count >= 5
          return (
            <span
              key={v}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors
                ${found
                  ? isRare
                    ? 'bg-way-green/10 border-way-green text-way-green font-medium'
                    : 'bg-way-surface border-way-wood text-way-text'
                  : 'bg-way-base border-way-wood-light text-way-muted opacity-40'
                }`}
            >
              {v}
              {found && (
                <span className={`font-semibold ${isRare ? 'text-way-green' : 'text-way-muted'}`}>
                  {count}
                </span>
              )}
            </span>
          )
        })}
      </div>
    </section>
  )
}

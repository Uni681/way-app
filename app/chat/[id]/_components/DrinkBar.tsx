'use client'

import type { DrinkItem } from '@/lib/types'

type Props = {
  items: DrinkItem[]
  onSend: (item: DrinkItem) => Promise<void>
  onClose: () => void
  sending: boolean
}

const FREE_LABEL = '無料'
const PAID_LABEL = 'サブスク'

export default function DrinkBar({ items, onSend, onClose, sending }: Props) {
  const freeItems = items.filter(i => i.is_free)
  const paidItems = items.filter(i => !i.is_free)

  return (
    <>
      {/* バックドロップ */}
      <div
        className="fixed inset-0 bg-black/20"
        onClick={onClose}
        aria-hidden
      />

      {/* パネル */}
      <div className="fixed bottom-0 left-0 right-0 bg-way-base rounded-t-3xl shadow-2xl"
        style={{ maxWidth: 430, margin: '0 auto' }}
      >
        {/* ハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-way-wood" />
        </div>

        <div className="px-5 pt-2 pb-8 space-y-5">
          {/* 無料 */}
          <div>
            <p className="text-xs font-medium text-way-muted uppercase tracking-wider mb-3">{FREE_LABEL}</p>
            <div className="grid grid-cols-4 gap-3">
              {freeItems.map(item => (
                <DrinkButton key={item.id} item={item} onSend={onSend} disabled={sending} />
              ))}
            </div>
          </div>

          {/* サブスク */}
          {paidItems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-way-muted uppercase tracking-wider mb-3">{PAID_LABEL}</p>
              <div className="grid grid-cols-4 gap-3">
                {paidItems.map(item => (
                  <DrinkButton key={item.id} item={item} onSend={onSend} disabled={sending} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function DrinkButton({
  item,
  onSend,
  disabled,
}: {
  item: DrinkItem
  onSend: (item: DrinkItem) => Promise<void>
  disabled: boolean
}) {
  return (
    <button
      onClick={() => onSend(item)}
      disabled={disabled}
      className="flex flex-col items-center gap-1 p-2 rounded-2xl hover:bg-way-wood-light active:scale-95 transition-all disabled:opacity-40"
      title={item.description ?? item.name}
    >
      <span className="text-2xl leading-none">{item.emoji}</span>
      <span className="text-[10px] text-way-muted text-center leading-tight line-clamp-2">
        {item.name}
      </span>
    </button>
  )
}

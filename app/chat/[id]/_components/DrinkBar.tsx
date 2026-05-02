'use client'

import { useRouter } from 'next/navigation'
import type { DrinkItem } from '@/lib/types'

type Props = {
  items: DrinkItem[]
  onSend: (item: DrinkItem) => Promise<void>
  onClose: () => void
  sending: boolean
  isSubscribed: boolean
}

export default function DrinkBar({ items, onSend, onClose, sending, isSubscribed }: Props) {
  const router = useRouter()
  const freeItems = items.filter(i => i.is_free)
  const paidItems = items.filter(i => !i.is_free)

  function handlePaidClick() {
    onClose()
    router.push('/settings')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20" onClick={onClose} aria-hidden />

      <div
        className="fixed bottom-0 left-0 right-0 bg-way-base rounded-t-3xl shadow-2xl"
        style={{ maxWidth: 430, margin: '0 auto' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-way-wood" />
        </div>

        <div className="px-5 pt-2 pb-8 space-y-5">
          {/* 無料 */}
          <div>
            <p className="text-xs font-medium text-way-muted uppercase tracking-wider mb-3">無料</p>
            <div className="grid grid-cols-4 gap-3">
              {freeItems.map(item => (
                <DrinkButton key={item.id} item={item} onSend={onSend} disabled={sending} />
              ))}
            </div>
          </div>

          {/* サブスク */}
          {paidItems.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-medium text-way-muted uppercase tracking-wider">サブスク</p>
                {!isSubscribed && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-way-wood-light text-way-muted leading-none">
                    ¥980/月
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {paidItems.map(item =>
                  isSubscribed ? (
                    <DrinkButton key={item.id} item={item} onSend={onSend} disabled={sending} />
                  ) : (
                    <LockedButton key={item.id} item={item} onClick={handlePaidClick} />
                  )
                )}
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

function LockedButton({ item, onClick }: { item: DrinkItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-2xl hover:bg-way-wood-light active:scale-95 transition-all opacity-50"
      title="サブスクで解放"
    >
      <span className="text-2xl leading-none grayscale">{item.emoji}</span>
      <span className="text-[10px] text-way-muted text-center leading-tight">🔒</span>
    </button>
  )
}

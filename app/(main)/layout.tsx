import BottomNav from '@/app/_components/BottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-dvh flex flex-col bg-way-base"
      style={{ maxWidth: 430, margin: '0 auto' }}
    >
      {/* min-h-0 で flex child が縮める。overflow-hidden でスクロール制御を子に委譲 */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}

import Stripe from 'stripe'

// 実行時に初期化（ビルド時に STRIPE_SECRET_KEY が未設定でも失敗しない）
export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
  })
}

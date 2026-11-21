import { processModeration } from '@/lib/moderation'

export const maxDuration = 60

// Schedule server-to-server once per minute. Body and caller-supplied IDs are ignored.
export async function POST(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }
  let processed = 0
  let deferred = 0
  try {
    for (let i = 0; i < 3; i++) {
      const result = await processModeration()
      if (result.status === 409) break
      if (result.ok) processed++
      else deferred++
    }
    return Response.json({ processed, deferred }, { status: deferred ? 503 : 200 })
  } catch {
    return Response.json({ error: 'worker_unavailable' }, { status: 503 })
  }
}

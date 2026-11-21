export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// Exact provider domains only: no arbitrary hosts, ports, credentials or redirects.
export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.port && !url.username && !url.password &&
      !url.hash && ['fcm.googleapis.com', 'updates.push.services.mozilla.com',
        'updates-autopush.webpush.mozgcp.net', 'web.push.apple.com'].includes(url.hostname)
  } catch { return false }
}

export function canDisplayMessage(message: { sender_id: string; ban_check_status: string; is_deleted: boolean }, viewer: string) {
  return !message.is_deleted && (message.sender_id === viewer || message.ban_check_status === 'passed')
}

export function moderationLabel(state: string, status: string) {
  if (status === 'passed') return ''
  if (state === 'held') return '審査を保留しています。相手には未送信です。'
  if (state === 'retry') return '審査を再試行します。相手には未送信です。'
  return '審査中・相手には未送信'
}

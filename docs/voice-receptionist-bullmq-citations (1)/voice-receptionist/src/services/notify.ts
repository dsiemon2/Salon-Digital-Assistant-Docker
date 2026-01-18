// Minimal notifier stubs
export async function notifyEmail(subject: string, body: string) {
  console.log('[EMAIL]', subject, body);
}
export async function notifySlack(message: string) {
  console.log('[SLACK]', message);
}

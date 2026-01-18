// Voicemail helper stub (persist + transcribe notifications, etc.)
export async function handleVoicemail(payload: any) {
  console.log('[VOICEMAIL]', payload?.TranscriptionText || '(no transcription)');
}

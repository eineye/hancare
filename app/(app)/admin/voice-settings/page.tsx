import AdminVoiceSettings from '@/components/AdminVoiceSettings';
import { getTtsSettings } from '@/lib/ttsSettings';
import { TTS_VOICE_OPTIONS } from '@/lib/ttsVoices';

export const dynamic = 'force-dynamic';

export default async function AdminVoiceSettingsPage() {
  const settings = await getTtsSettings();
  return (
    <AdminVoiceSettings
      voices={TTS_VOICE_OPTIONS}
      initialVoiceId={settings.voiceId}
      geminiConfigured={Boolean(process.env.GEMINI_API_KEY)}
    />
  );
}

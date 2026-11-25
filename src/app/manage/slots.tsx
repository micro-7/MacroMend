import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { Slot } from '@/core/slots';
import { useDb } from '@/db/DbContext';
import { useProfile } from '@/db/ProfileContext';
import { saveProfile } from '@/db/profile';
import { SlotsEditor } from '@/ui/forms/SlotsEditor';
import { StepScreen } from '@/ui/kit';

export default function SlotsSettings() {
  const router = useRouter();
  const db = useDb();
  const { profile, reload } = useProfile();
  const [slots, setSlots] = useState<Slot[]>(profile?.slots ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProfile(db, { ...profile, slots });
      await reload();
      router.back();
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  return (
    <StepScreen title="Meal slots" onNext={save} nextLabel={saving ? 'Saving…' : 'Save'} nextDisabled={saving} error={error}>
      <SlotsEditor slots={slots} onChange={setSlots} />
    </StepScreen>
  );
}

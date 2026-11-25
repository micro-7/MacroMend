import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDb } from '@/db/DbContext';
import { useProfile } from '@/db/ProfileContext';
import { listStaples, setStaples } from '@/db/staples';
import { buildStaples, type StapleDraft } from '@/onboarding/buildProfile';
import { StaplesPicker } from '@/ui/forms/StaplesPicker';
import { StepScreen } from '@/ui/kit';

export default function StaplesSettings() {
  const router = useRouter();
  const db = useDb();
  const { profile } = useProfile();
  const [selected, setSelected] = useState<StapleDraft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStaples(db).then((rows) => {
      if (!cancelled) setSelected(rows.map((r) => ({ food: r.food, qty: String(r.usualQty) })));
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  if (!profile || !selected) return null;

  const save = async () => {
    const built = buildStaples(selected);
    if (!built.ok) return setError(built.error);
    setSaving(true);
    setError(null);
    try {
      await setStaples(db, built.value);
      router.back();
    } catch (e) {
      setError(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  return (
    <StepScreen title="Usual foods" scroll={false} onNext={save} nextLabel={saving ? 'Saving…' : 'Save'} nextDisabled={saving} error={error}>
      <StaplesPicker dietType={profile.dietType} selected={selected} onChange={setSelected} />
    </StepScreen>
  );
}

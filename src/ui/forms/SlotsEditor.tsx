import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TextInput } from '@/ui/TextInput';
import { Text } from '@/ui/Text';
import { MAX_SLOTS, addSlot, moveSlot, removeSlot, renameSlot, type Slot } from '@/core/slots';
import { Button, ErrorText, Field, Hint } from '../kit';
import { palette } from '../theme';

function SlotRow({
  slot,
  index,
  count,
  onRename,
  onMove,
  onRemove,
}: {
  slot: Slot;
  index: number;
  count: number;
  onRename: (id: string, name: string) => string | null;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  const [text, setText] = useState(slot.name);
  const commit = () => {
    const error = onRename(slot.id, text);
    if (error) setText(slot.name); // refused: show the old name again
  };
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        onEndEditing={commit}
        onSubmitEditing={commit}
        maxLength={40}
        accessibilityLabel={`Meal ${index + 1} name`}
      />
      <Pressable accessibilityLabel="Move up" disabled={index === 0} onPress={() => onMove(slot.id, -1)} style={[styles.icon, index === 0 && styles.off]}>
        <Text style={styles.iconText}>↑</Text>
      </Pressable>
      <Pressable accessibilityLabel="Move down" disabled={index === count - 1} onPress={() => onMove(slot.id, 1)} style={[styles.icon, index === count - 1 && styles.off]}>
        <Text style={styles.iconText}>↓</Text>
      </Pressable>
      <Pressable accessibilityLabel="Remove meal" onPress={() => onRemove(slot.id)} style={styles.icon}>
        <Text style={[styles.iconText, { color: palette.danger }]}>✕</Text>
      </Pressable>
    </View>
  );
}

export function SlotsEditor({ slots, onChange }: { slots: Slot[]; onChange: (next: Slot[]) => void }) {
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const apply = (r: { ok: true; slots: Slot[] } | { ok: false; error: string }): string | null => {
    if (r.ok) {
      setMessage(null);
      onChange(r.slots);
      return null;
    }
    setMessage(r.error);
    return r.error;
  };

  return (
    <View>
      <Hint>Your day is split into these meals. Rename them, reorder them or add your own, like Pre-workout.</Hint>
      {slots.map((s, i) => (
        <SlotRow
          // Include the name so the text box resets when a rename is applied or refused.
          key={`${s.id}:${s.name}`}
          slot={s}
          index={i}
          count={slots.length}
          onRename={(id, name) => (name.trim() === s.name ? null : apply(renameSlot(slots, id, name)))}
          onMove={(id, d) => {
            setMessage(null);
            onChange(moveSlot(slots, id, d));
          }}
          onRemove={(id) => void apply(removeSlot(slots, id))}
        />
      ))}
      {message ? <ErrorText>{message}</ErrorText> : null}
      <View style={{ marginTop: 16 }}>
        <Field
          label={slots.length >= MAX_SLOTS ? `Maximum of ${MAX_SLOTS} meals reached` : 'Add a meal'}
          value={newName}
          onChangeText={setNewName}
          placeholder="e.g. Pre-workout"
          editable={slots.length < MAX_SLOTS}
          maxLength={40}
        />
        <Button
          label="Add meal"
          variant="secondary"
          disabled={slots.length >= MAX_SLOTS || newName.trim() === ''}
          onPress={() => {
            if (apply(addSlot(slots, newName)) === null) setNewName('');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: palette.text,
    backgroundColor: palette.card,
  },
  icon: { width: 38, height: 40, borderRadius: 10, backgroundColor: palette.card, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 18, color: palette.text },
  off: { opacity: 0.3 },
});

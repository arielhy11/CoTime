import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-app confirmation (never Alert.alert). */
export function ConfirmModal({ visible, title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <AppText variant="title" center style={styles.title}>{title}</AppText>
          <AppText center color={colors.textMuted}>{message}</AppText>
          <View style={styles.actions}>
            <Button title={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} />
            <Button title={cancelLabel} variant="ghost" onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 24 },
  actions: { marginTop: spacing.md, gap: spacing.xs },
});

import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRTL } from '../../hooks/useRTL';
import type { PhotoChange } from '../../store/authStore';
import { colors, fonts, radii, spacing } from '../../theme/tokens';
import { cleanName, MAX_NAME_LENGTH } from '../../utils/initials';
import { AppText } from '../common/AppText';
import { Button } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';
import { DamagedAvatar } from '../avatar/DamagedAvatar';
import type { DamageLevel } from '../../game/damage';
import { buzzExplosion } from '../../services/haptics';
import { playSound } from '../../services/sound';

interface ProfileFormProps {
  uid: string;
  initialName: string;
  initialPhotoURL: string | null;
  submitLabel: string;
  onSubmit: (name: string, photo: PhotoChange) => Promise<void>;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

const PREVIEW_SIZE = 168;

export function ProfileForm({ uid, initialName, initialPhotoURL, submitLabel, onSubmit }: ProfileFormProps) {
  const { t } = useTranslation();
  const rtl = useRTL();
  const [name, setName] = useState(initialName);
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' });
  const [previewLevel, setPreviewLevel] = useState<DamageLevel>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewURL = photo.kind === 'new' ? photo.localUri : photo.kind === 'remove' ? null : initialPhotoURL;
  const valid = cleanName(name).length > 0;

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError(t('profile.cameraDenied'));
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ ...PICKER_OPTIONS, cameraType: ImagePicker.CameraType.front })
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      const asset = result.canceled ? null : result.assets[0];
      if (asset) {
        setPhoto({ kind: 'new', localUri: asset.uri });
        setPreviewLevel(0);
      }
    } catch (e) {
      console.error('Photo pick failed:', e instanceof Error ? e.message : e);
      setError(t('profile.photoFailed'));
    }
  };

  // Tap the preview to see what's coming for them.
  const smashPreview = () => {
    const next = previewLevel >= 4 ? 0 : ((previewLevel + 1) as DamageLevel);
    if (next === 4) playSound('whistle');
    else if (next > 0) playSound('crack');
    setPreviewLevel(next);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(name, photo);
    } catch (e) {
      console.error('Saving profile failed:', e instanceof Error ? e.message : e);
      setError(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('profile.smashPreview')} onPress={smashPreview} style={styles.previewWrap}>
        <DamagedAvatar
          key={previewLevel === 0 ? `fresh-${previewURL ?? 'none'}` : 'preview'}
          identity={{ uid, name: cleanName(name) || '?', photoURL: previewURL }}
          size={PREVIEW_SIZE}
          level={previewLevel}
          onExplode={() => {
            playSound('boom');
            buzzExplosion();
          }}
        />
      </Pressable>
      <AppText variant="caption" center>{t('profile.tapToPreview')}</AppText>

      <View style={styles.photoButtons}>
        <Button title={t('profile.selfie')} variant="secondary" icon={<Camera color={colors.text} size={20} />} onPress={() => void pick('camera')} style={styles.flex} />
        <Button title={t('profile.library')} variant="secondary" icon={<ImageIcon color={colors.text} size={20} />} onPress={() => void pick('library')} style={styles.flex} />
      </View>
      {previewURL ? (
        <Button title={t('profile.removePhoto')} variant="ghost" onPress={() => setPhoto({ kind: 'remove' })} />
      ) : null}

      <AppText variant="label" style={styles.label}>{t('profile.nameLabel')}</AppText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('profile.namePlaceholder')}
        placeholderTextColor={colors.textDim}
        maxLength={MAX_NAME_LENGTH}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        style={[styles.input, { textAlign: rtl ? 'right' : 'left' }]}
        accessibilityLabel={t('profile.nameLabel')}
      />

      <ErrorBanner message={error} />
      <Button title={submitLabel} size="lg" onPress={() => void submit()} isLoading={saving} disabled={!valid} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  previewWrap: { alignSelf: 'center', marginVertical: spacing.md, padding: 20 },
  photoButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  label: { marginTop: spacing.md },
  input: {
    minHeight: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 20,
    marginBottom: spacing.sm,
  },
});

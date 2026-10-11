import * as ImageManipulator from 'expo-image-manipulator';

export const AVATAR_SIZE_PX = 320;
const AVATAR_QUALITY = 0.6;

/**
 * Square-crop and shrink a picked photo into a small JPEG data URI that fits
 * comfortably on the Firestore user doc (≈20–40 KB).
 */
export async function toAvatarDataUri(localUri: string): Promise<string> {
  const scaled = await ImageManipulator.manipulateAsync(localUri, [{ resize: { width: AVATAR_SIZE_PX * 2 } }], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const side = Math.min(scaled.width, scaled.height);
  const cropped = await ImageManipulator.manipulateAsync(
    scaled.uri,
    [
      {
        crop: {
          originX: Math.floor((scaled.width - side) / 2),
          originY: Math.floor((scaled.height - side) / 2),
          width: side,
          height: side,
        },
      },
      { resize: { width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX } },
    ],
    { compress: AVATAR_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!cropped.base64) {
    throw new Error('AVATAR_ENCODE_FAILED');
  }
  return `data:image/jpeg;base64,${cropped.base64}`;
}

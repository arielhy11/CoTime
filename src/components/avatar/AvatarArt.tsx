import { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Image as SvgImage, Text as SvgText } from 'react-native-svg';
import { hashString } from '../../game/avatarFx';
import { fonts } from '../../theme/tokens';
import { avatarColorFor, initialsOf } from '../../utils/initials';

export interface AvatarIdentity {
  uid: string;
  name: string;
  photoURL: string | null;
}

/** SVG ids are global on web — strip React's id punctuation and keep them unique. */
export function useSvgId(prefix: string): string {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/**
 * The face itself, drawn into an existing <Svg> (photo or initials), so
 * shards and overlays can clip the very same pixels.
 */
export function FaceContent({ identity, size }: { identity: AvatarIdentity; size: number }) {
  if (identity.photoURL) {
    return (
      <SvgImage
        href={identity.photoURL}
        x={0}
        y={0}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid slice"
      />
    );
  }
  const seed = hashString(identity.uid);
  return (
    <G>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={avatarColorFor(seed)} />
      <SvgText
        x={size / 2}
        y={size / 2 + size * 0.14}
        fontSize={size * 0.4}
        fontFamily={fonts.black}
        fill="#0D0A14"
        textAnchor="middle"
      >
        {initialsOf(identity.name)}
      </SvgText>
    </G>
  );
}

/** A clean, round avatar. */
export function AvatarFace({ identity, size }: { identity: AvatarIdentity; size: number }) {
  const clipId = useSvgId('face');
  return (
    <Svg width={size} height={size}>
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <FaceContent identity={identity} size={size} />
      </G>
    </Svg>
  );
}

import { fifaToIso } from '@/lib/flags';

type CountryFlagProps = {
  fifaCode?: string | null | undefined;
  /** ISO 2 文字コードを直接指定する場合（監督国籍など FIFA コードを持たない国向け）。優先される。 */
  iso?: string | null;
  fallback?: string | null;
  ariaLabel?: string;
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_PX: Record<NonNullable<CountryFlagProps['size']>, number> = {
  sm: 16,
  md: 22,
  lg: 28,
};

export function CountryFlag({
  fifaCode,
  iso: isoProp,
  fallback,
  ariaLabel,
  size = 'md',
}: CountryFlagProps) {
  // iso prop が与えられればそれを優先、なければ FIFA コードから解決。
  const iso = isoProp ?? fifaToIso(fifaCode ?? null);
  const px = SIZE_PX[size];

  if (!iso) {
    return (
      <span
        aria-label={ariaLabel ?? fifaCode ?? undefined}
        style={{ fontSize: `${px}px`, lineHeight: 1 }}
      >
        {fallback ?? '🏳️'}
      </span>
    );
  }

  return (
    <span
      className={`fi fi-${iso}`}
      role="img"
      aria-label={ariaLabel ?? fifaCode ?? iso}
      style={{
        width: `${Math.round(px * 1.35)}px`,
        height: `${px}px`,
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: 2,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
      }}
    />
  );
}

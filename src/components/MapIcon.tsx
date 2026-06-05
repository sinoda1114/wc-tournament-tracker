type MapIconProps = {
  size?: number;
};

/**
 * 折り畳み地図アイコン（Googleマップへのリンク用）。
 * 📍 などの絵文字は OS フォント依存で字形がブレるため、24x24 viewBox の SVG で固定する。
 */
export function MapIcon({ size = 14 }: MapIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </svg>
  );
}

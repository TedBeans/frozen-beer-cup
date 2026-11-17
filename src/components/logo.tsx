/** The Frozen Beer Cup trophy: a beer-mug cup, frost snowflake and a golf ball on the foam. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="96 60 320 410"
      width={size * (320 / 410)}
      height={size}
      className={className}
      role="img"
      aria-label="Frozen Beer Cup"
    >
      <path d="M158 232 C98 232 98 322 168 322" fill="none" stroke="#c8a227" strokeWidth="22" strokeLinecap="round" />
      <path d="M354 232 C414 232 414 322 344 322" fill="none" stroke="#c8a227" strokeWidth="22" strokeLinecap="round" />
      <rect x="232" y="384" width="48" height="40" fill="#c8a227" />
      <rect x="172" y="420" width="168" height="36" rx="12" fill="#c8a227" />
      <rect x="172" y="420" width="168" height="10" rx="5" fill="#e6c85a" />
      <path d="M146 196 H366 L338 386 Q336 396 326 396 H186 Q176 396 174 386 Z" fill="#f2b32a" />
      <path d="M146 196 H366 L360 238 H152 Z" fill="#f7cf63" />
      <path d="M174 386 L146 196 H190 L206 396 H186 Q176 396 174 386Z" fill="#fff" opacity=".22" />
      <path d="M256 268 V344 M223 287 L289 325 M289 287 L223 325" stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M138 204 C124 176 154 150 184 164 C194 138 238 134 252 158 C270 136 316 140 322 168 C352 156 384 182 372 206 C360 220 150 220 138 204Z" fill="#fff" />
      <circle cx="256" cy="112" r="40" fill="#fff" stroke="#c9dac8" strokeWidth="4" />
      <g fill="#b8c9bd">
        <circle cx="240" cy="100" r="4.5" />
        <circle cx="258" cy="94" r="4.5" />
        <circle cx="274" cy="106" r="4.5" />
        <circle cx="246" cy="118" r="4.5" />
        <circle cx="264" cy="124" r="4.5" />
        <circle cx="232" cy="124" r="4.5" />
      </g>
    </svg>
  );
}

/** Green brand bar with a gold underline. Sits at the top of every page except the board and scoring. */
export function BrandBar() {
  return (
    <div className="mb-5 border-b-4 border-amber bg-ink text-frost">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
        <Logo size={44} />
        <div className="leading-tight">
          <p className="font-display text-2xl font-extrabold">Frozen Beer Cup</p>
          <p className="text-xs font-semibold text-amber">Nov 27 &middot; The Quarry at Crystal Springs</p>
        </div>
      </div>
    </div>
  );
}

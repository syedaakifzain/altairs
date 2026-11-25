interface SectionHeadingProps {
  title: string;
  subtitle: string;
}

export function SectionHeading({ title, subtitle }: SectionHeadingProps) {
  return (
    <div className="mb-8 sm:mb-12">
      {/* Double-slash accent matching brand mark — same visual language as reference image */}
      <div className="flex items-center gap-2.5 mb-3">
        <svg width="16" height="14" viewBox="0 0 18 16" fill="none" aria-hidden="true" className="shrink-0">
          <path d="M4.8 14.5H1.6L6.2 1.5H9.4L4.8 14.5Z" fill="#B7F000" />
          <path d="M11.6 14.5H8.4L13 1.5H16.2L11.6 14.5Z" fill="#B7F000" />
        </svg>
      </div>
      <h2 className="font-display font-bold text-[2rem] sm:text-[2.4rem] tracking-[-0.025em] uppercase text-[#151515] leading-none mb-2">
        {title}
      </h2>
      <p className="text-[14px] sm:text-[15px] text-[#666666] leading-relaxed max-w-[560px]">
        {subtitle}
      </p>
    </div>
  );
}

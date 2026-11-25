import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'features', label: 'Features' },
  { id: 'workspace', label: 'Workspace' },
] as const;

export function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <a href="#home" className="inline-flex items-center gap-2 group focus:outline-none">
      <svg
        width="18"
        height="16"
        viewBox="0 0 18 16"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M4.8 14.5H1.6L6.2 1.5H9.4L4.8 14.5Z" fill="#B7F000" />
        <path d="M11.6 14.5H8.4L13 1.5H16.2L11.6 14.5Z" fill="#B7F000" />
      </svg>
      <span
        className={`font-display font-bold text-[19px] tracking-[-0.02em] ${
          dark ? 'text-white' : 'text-[#151515]'
        }`}
      >
        PS05
      </span>
    </a>
  );
}

export function Navbar() {
  const [activeId, setActiveId] = useState<string>('home');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.1, 0.4, 0.7] },
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#E5E5DF]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
        <BrandMark />

        <div className="hidden md:flex items-center gap-8">
          <nav aria-label="Primary" className="flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveId(item.id)}
                  className={`relative py-1 text-[13.5px] transition-colors ${
                    isActive
                      ? 'text-[#151515] font-semibold'
                      : 'text-[#666666] font-medium hover:text-[#151515]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute left-0 right-0 -bottom-[2px] h-[2px] bg-[#B7F000]" />
                  )}
                </a>
              );
            })}
          </nav>

          <a
            href="#workspace"
            className="inline-flex items-center gap-1.5 bg-[#151515] text-white text-[13px] font-medium px-4 py-2 rounded-[6px] hover:bg-[#2A2A2A] transition-colors"
          >
            <span>Try Now</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-[6px] border border-[#D8D8D2] text-[#151515] hover:bg-[#F5F5F0]"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E5DF] bg-[#FFFFFF] px-5 py-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => {
                setActiveId(item.id);
                setMobileOpen(false);
              }}
              className={`block py-2 text-sm border-l-2 pl-3 ${
                activeId === item.id
                  ? 'border-[#B7F000] text-[#151515] font-semibold'
                  : 'border-transparent text-[#666666] font-medium'
              }`}
            >
              {item.label}
            </a>
          ))}
          <div className="pt-2">
            <a
              href="#workspace"
              onClick={() => setMobileOpen(false)}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-[#151515] text-white text-sm font-medium px-4 py-2.5 rounded-[6px]"
            >
              <span>Try Now</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

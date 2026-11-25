import { ArrowUpRight } from 'lucide-react';
import { HeroTrackingVisual } from './HeroTrackingVisual';

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative bg-[#F5F5F0] border-b border-[#E5E5DF] overflow-hidden"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8 items-center">
        {/* Left Side — text content */}
        <div className="relative z-20">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#666666] mb-4">
            PROJECT PS05
          </p>

          <h1 className="font-display font-bold text-[2.6rem] sm:text-[3.4rem] lg:text-[3.75rem] leading-[0.95] tracking-[-0.025em] uppercase text-[#151515]">
            MULTI-OBJECT
            <br />
            TRACKING SYSTEM
          </h1>

          {/* Accent underline — thick lime bar matching mockup */}
          <div className="w-14 h-[4px] bg-[#B7F000] mt-6 mb-6" />

          <p className="text-[15px] sm:text-[16px] text-[#666666] leading-relaxed max-w-[400px]">
            Detects and tracks multiple objects across video frames with high accuracy and
            consistency.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#workspace"
              className="inline-flex items-center gap-1.5 bg-[#B7F000] text-[#151515] font-semibold text-[13.5px] px-5 py-3 rounded-[6px] hover:brightness-95 transition-all"
            >
              <span>Try the Workspace</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>

            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center bg-[#FFFFFF] text-[#151515] border border-[#D8D8D2] font-medium text-[13.5px] px-5 py-3 rounded-[6px] hover:border-[#999] transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Right Side — custom tracking animation */}
        <div className="lg:-mr-8 xl:-mr-12">
          <HeroTrackingVisual />
        </div>
      </div>
    </section>
  );
}

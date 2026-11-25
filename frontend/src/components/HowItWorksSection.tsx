import { Fragment } from 'react';
import { ArrowRight, Layers, Scan, SquarePlay } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

function BarsIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="9" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </svg>
  );
}

const STAGES = [
  {
    step: '1. Input',
    description: 'Upload a video for analysis.',
    icon: <SquarePlay className="w-[26px] h-[26px] text-[#151515]" strokeWidth={1.6} />,
  },
  {
    step: '2. Detect',
    description: 'Identify objects in each frame.',
    icon: <Scan className="w-[26px] h-[26px] text-[#151515]" strokeWidth={1.6} />,
  },
  {
    step: '3. Track',
    description: 'Maintain unique IDs across frames.',
    icon: <Layers className="w-[26px] h-[26px] text-[#151515]" strokeWidth={1.6} />,
  },
  {
    step: '4. Output',
    description: 'Get the tracked video and analysis results.',
    icon: <BarsIcon />,
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-[#FFFFFF] border-b border-[#E5E5DF] py-16 sm:py-20">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <SectionHeading
          title="HOW IT WORKS"
          subtitle="A simple and effective pipeline for multi-object tracking."
        />

        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          {STAGES.map((stage, index) => (
            <Fragment key={stage.step}>
              <div className="flex-1 bg-[#FAFAF8] border border-[#E5E5DF] rounded-[8px] px-6 py-8 flex flex-col items-center text-center">
                <div className="mb-5 text-[#151515]">{stage.icon}</div>
                <h3 className="font-semibold text-[14.5px] text-[#151515] mb-2">{stage.step}</h3>
                <p className="text-[13px] text-[#666666] leading-relaxed max-w-[180px]">
                  {stage.description}
                </p>
              </div>

              {index < STAGES.length - 1 && (
                <div
                  aria-hidden="true"
                  className="hidden lg:flex items-center justify-center text-[#D8D8D2] px-0.5 shrink-0"
                >
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

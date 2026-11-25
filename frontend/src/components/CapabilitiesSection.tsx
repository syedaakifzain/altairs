import { Crosshair, Layers } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

function TrajectoryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="18" r="2.2" />
      <circle cx="12" cy="11" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <path d="M6.8 16.4 L10.3 12.7" />
      <path d="M13.9 9.7 L17.1 7.4" />
    </svg>
  );
}

function InsightsBarsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="9" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </svg>
  );
}

const CAPABILITIES = [
  {
    title: 'Object Detection',
    description: 'Locate and identify objects in video frames.',
    icon: <Crosshair className="w-6 h-6 text-[#151515]" strokeWidth={1.65} />,
  },
  {
    title: 'Multi-Object Tracking',
    description: 'Assign and maintain unique IDs for each object.',
    icon: <Layers className="w-6 h-6 text-[#151515]" strokeWidth={1.65} />,
  },
  {
    title: 'Trajectory Mapping',
    description: 'Visualize the movement path of tracked objects.',
    icon: <TrajectoryIcon />,
  },
  {
    title: 'Tracking Insights',
    description: 'Get useful statistics from the tracking results.',
    icon: <InsightsBarsIcon />,
  },
] as const;

export function CapabilitiesSection() {
  return (
    <section id="features" className="bg-[#F5F5F0] border-b border-[#E5E5DF] py-16 sm:py-20">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <SectionHeading
          title="CORE CAPABILITIES"
          subtitle="Key features of the tracking system."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CAPABILITIES.map((cap) => (
            <article
              key={cap.title}
              className="bg-[#FFFFFF] border border-[#E5E5DF] rounded-[10px] p-7 flex flex-col justify-between hover:border-[#C8C8C0] transition-colors"
            >
              <div>
                <div className="mb-4 text-[#151515]">{cap.icon}</div>
                <h3 className="font-semibold text-[15px] text-[#151515] mb-1.5">{cap.title}</h3>
                <p className="text-[13px] text-[#666666] leading-relaxed">{cap.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

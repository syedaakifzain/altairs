import { BrandMark } from './Navbar';

export function Footer() {
  return (
    <footer className="relative bg-[#151515] text-white overflow-hidden">
      {/* Diagonal lime accent slice on bottom-right matching visual reference */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 w-16 sm:w-24 h-44 sm:h-52 bg-[#B7F000]"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
      />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-14 pb-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/15">
          {/* Left column */}
          <div className="lg:col-span-5">
            <BrandMark dark />
            <p className="mt-4 text-[13.5px] text-[#A8A8A2] leading-relaxed max-w-[300px]">
              A multi-object tracking system for analyzing and understanding object movement in
              videos.
            </p>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3">
            <h3 className="font-semibold text-[13.5px] text-white mb-3.5">Quick Links</h3>
            <ul className="space-y-2 text-[13px] text-[#A8A8A2]">
              <li>
                <a href="#home" className="hover:text-white transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#workspace" className="hover:text-white transition-colors">
                  Workspace
                </a>
              </li>
            </ul>
          </div>

          {/* Project Info */}
          <div className="lg:col-span-4">
            <h3 className="font-semibold text-[13.5px] text-white mb-3.5">Project</h3>
            <ul className="space-y-2 text-[13px] text-[#A8A8A2]">
              <li>PS05</li>
              <li>Computer Vision</li>
              <li>Object Tracking</li>
              <li>Video Analysis</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 text-[12px] text-[#8E8E88]">
          © 2025 PS05. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

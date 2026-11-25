import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { CapabilitiesSection } from './components/CapabilitiesSection';
import { TrackingWorkspaceSection } from './components/TrackingWorkspaceSection';
import { ResultsSection } from './components/ResultsSection';
import { Footer } from './components/Footer';
import { fetchBackendStatus } from './services/api';
import type { BackendConnectionState, TrackingJobResult } from './types';

export default function App() {
  const [backendStatus, setBackendStatus] = useState<BackendConnectionState>({
    online: false,
    supportsVideoUpload: false,
    modeLabel: 'Checking backend...',
    detail: 'Probing backend readiness endpoint...',
    readiness: null,
  });
  const [checkingBackend, setCheckingBackend] = useState(true);
  const [jobResult, setJobResult] = useState<TrackingJobResult | null>(null);

  const checkBackend = useCallback(async () => {
    setCheckingBackend(true);
    const status = await fetchBackendStatus();
    setBackendStatus(status);
    setCheckingBackend(false);
  }, []);

  useEffect(() => {
    void checkBackend();
  }, [checkBackend]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0] text-[#151515]">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <CapabilitiesSection />
        <TrackingWorkspaceSection
          backendStatus={backendStatus}
          checkingBackend={checkingBackend}
          onRefreshBackend={checkBackend}
          onJobCompleted={setJobResult}
        />
        <ResultsSection result={jobResult} />
      </main>

      <Footer />
    </div>
  );
}

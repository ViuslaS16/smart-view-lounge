"use client";

import { useEffect, useState } from "react";

export function ClosureBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Cutoff time: May 30, 2026 23:59:59 SL Time
    // Which is May 30, 2026 18:30:00 UTC
    const cutoff = new Date('2026-05-30T18:30:00.000Z');
    
    if (Date.now() <= cutoff.getTime()) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-[#E24B4A] text-[#F0EAE0] text-center py-3 px-4 font-dm-sans font-medium text-sm md:text-base sticky top-0 z-[100] shadow-md">
      <p>May 30 is Vesak Poya day. That day our theater is closed.</p>
    </div>
  );
}

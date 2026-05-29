"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export function ClosureBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

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
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#13131A]/80 p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          >
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute right-4 top-4 rounded-full p-1 text-[#A09080] hover:bg-white/10 hover:text-[#F0EAE0] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E24B4A]/10 text-[#E24B4A]">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 style={{ fontFamily: 'var(--font-playfair)' }} className="mb-2 text-xl font-bold text-[#F0EAE0]">
              Theater Closed
            </h3>
            <p className="text-[15px] leading-relaxed text-[#A09080]">
              May 30 is Vesak Poya day. Our theater will remain closed for the entire day. Normal operations will resume on May 31.
            </p>
            
            <button
              onClick={() => setIsDismissed(true)}
              className="mt-6 w-full rounded-xl bg-[#C9933A] py-3 text-[15px] font-semibold text-[#0A0A0B] shadow-[0_0_15px_rgba(201,147,58,0.2)] transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

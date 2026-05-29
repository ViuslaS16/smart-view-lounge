"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Moon } from "lucide-react";

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

            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#C9933A]/10 text-[#C9933A] ring-1 ring-[#C9933A]/30 shadow-[0_0_15px_rgba(201,147,58,0.15)]">
              <Moon size={24} strokeWidth={1.5} />
            </div>
            
            <h3 style={{ fontFamily: 'var(--font-playfair)' }} className="mb-3 text-2xl font-semibold tracking-wide text-[#F0EAE0]">
              Vesak Poya Holiday
            </h3>
            <p className="px-2 text-[15px] leading-relaxed text-[#A09080]">
              SmartView Lounge will be closed on May 30th in observance of Vesak Poya. We look forward to welcoming you back on May 31st.
            </p>
            
            <button
              onClick={() => setIsDismissed(true)}
              className="mt-8 px-10 rounded-full bg-gradient-to-r from-[#C9933A] to-[#A87828] py-2.5 text-[14px] font-semibold tracking-wide text-[#0A0A0B] shadow-[0_4px_14px_rgba(201,147,58,0.25)] transition-transform hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

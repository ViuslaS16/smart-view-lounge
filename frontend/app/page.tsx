"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// ─── SVG Icon Components ─────────────────────────────────────────────────────
const IconLock = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="3"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);
const IconCard = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="3"/>
    <path d="M2 10h20"/>
  </svg>
);
const IconClock = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 3"/>
  </svg>
);
const IconPhone = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="3"/>
    <circle cx="12" cy="17" r="1" fill={color}/>
  </svg>
);
const IconScreen = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
);
const IconGift = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12v9H4v-9"/>
    <path d="M22 7H2v5h20V7z"/>
    <path d="M12 22V7"/>
    <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
    <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
  </svg>
);
const IconUser = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconCalendar = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);
const IconCheck = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M8 12l3 3 5-5"/>
  </svg>
);
const IconPlay = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M10 8l6 4-6 4V8z" fill={color} stroke="none"/>
  </svg>
);

// ─── Data ────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: "lock",
    title: "Fully Private",
    desc: "Zero staff on premise. Your session, your space — completely uninterrupted. Total cinematic immersion.",
    color: "#C9933A",
  },
  {
    icon: "card",
    title: "Book & Pay Online",
    desc: "Choose your slot, pay securely through PayHere, and you're confirmed instantly. No calls. No queues.",
    color: "#C9933A",
  },
  {
    icon: "clock",
    title: "Extend Anytime",
    desc: "Running long? Add more time right from the app if the next slot is free. Stay as long as you want.",
    color: "#C9933A",
  },
  {
    icon: "phone",
    title: "Self-Service Access",
    desc: "Get your digital access code via SMS. Walk in, scan, and the theater opens — no waiting for anyone.",
    color: "#C9933A",
  },
  {
    icon: "screen",
    title: "4K + Surround Sound",
    desc: "Ultra-HD projection with immersive Dolby surround sound. Every frame and note, exactly as intended.",
    color: "#C9933A",
  },
  {
    icon: "gift",
    title: "Bring Your Own",
    desc: "No restrictions. Bring your own food, drinks, and guests. Make it exactly the experience you want.",
    color: "#C9933A",
  },
];

const steps = [
  {
    num: "01",
    title: "Register & Verify",
    desc: "Create your account and upload your NIC. Quick identity check — done once, book forever after.",
    icon: "user",
  },
  {
    num: "02",
    title: "Pick Your Slot",
    desc: "Browse open times on the calendar, choose your date and duration — starting from just 1 hour.",
    icon: "calendar",
  },
  {
    num: "03",
    title: "Pay & Confirm",
    desc: "Secure online payment via PayHere. Instant confirmation SMS with your unique access code.",
    icon: "check",
  },
  {
    num: "04",
    title: "Walk In & Enjoy",
    desc: "Enter at your time, the theater starts automatically. Pure cinematic magic — just for you.",
    icon: "play",
  },
];

const stats = [
  { value: "4K", label: "Ultra HD Projection" },
  { value: "7.1", label: "Surround Sound" },
  { value: "12", label: "Seat Premium Theater" },
  { value: "24/7", label: "Available to Book" },
];

// ─── Film grain canvas overlay ────────────────────────────────────────────────
function FilmGrain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      frame++;
      if (frame % 3 !== 0) { animRef.current = requestAnimationFrame(render); return; }
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 30;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 18;
      }
      ctx.putImageData(imageData, 0, 0);
      animRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 999, mixBlendMode: "overlay",
      }}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);
  const featureCardsRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const curtainLeftRef = useRef<HTMLDivElement>(null);
  const curtainRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ── Nav entrance ──
      gsap.from(navRef.current, {
        y: -80, opacity: 0, duration: 1, ease: "power3.out", delay: 0.2,
      });

      // ── Curtain open ──
      const tl = gsap.timeline({ delay: 0.5 });
      tl.to(curtainLeftRef.current, { x: "-101%", duration: 1.4, ease: "power4.inOut" })
        .to(curtainRightRef.current, { x: "101%", duration: 1.4, ease: "power4.inOut" }, "<")

        // ── Spotlight sweep ──
        .fromTo(spotlightRef.current,
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" }, "-=0.6"
        )

        // ── Text reveals ──
        .from(taglineRef.current, { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.5")
        .from(h1Ref.current, {
          y: 60, opacity: 0, duration: 1, ease: "power4.out",
          filter: "blur(12px)",
        }, "-=0.4")
        .from(subRef.current, { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
        .from(ctaRef.current, { y: 20, opacity: 0, duration: 0.7, ease: "power3.out" }, "-=0.4")
        .from(statsRef.current?.children ? Array.from(statsRef.current.children) : [], {
          y: 30, opacity: 0, stagger: 0.1, duration: 0.6, ease: "power3.out",
        }, "-=0.3")
        .from(scrollIndicatorRef.current, { opacity: 0, duration: 0.5 }, "-=0.1");

      // ── Scroll indicator bounce ──
      gsap.to(scrollIndicatorRef.current, {
        y: 10, repeat: -1, yoyo: true, duration: 1.1, ease: "power1.inOut", delay: 3,
      });

      // ── Scroll-reveal via IntersectionObserver (avoids opacity:0 flash) ──
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target as HTMLElement;
              const delay = parseFloat(el.dataset.delay ?? "0");

              if (el.classList.contains("feature-card")) {
                gsap.fromTo(el,
                  { y: 50, opacity: 0, scale: 0.93 },
                  { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "power3.out", delay }
                );
              } else if (el.classList.contains("step-item")) {
                gsap.fromTo(el,
                  { x: -50, opacity: 0 },
                  { x: 0, opacity: 1, duration: 0.7, ease: "power3.out", delay }
                );
              } else if (el.classList.contains("scroll-reveal")) {
                gsap.fromTo(el,
                  { y: 36, opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.85, ease: "power3.out", delay }
                );
              }
              io.unobserve(el);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
      );

      // Observe feature cards with stagger delays
      if (featureCardsRef.current) {
        featureCardsRef.current.querySelectorAll(".feature-card").forEach((el, i) => {
          (el as HTMLElement).dataset.delay = String(i * 0.1);
          io.observe(el);
        });
      }
      // Observe steps with stagger delays
      if (stepsRef.current) {
        stepsRef.current.querySelectorAll(".step-item").forEach((el, i) => {
          (el as HTMLElement).dataset.delay = String(i * 0.12);
          io.observe(el);
        });
      }
      // Observe scroll-reveal section headings
      document.querySelectorAll(".scroll-reveal").forEach((el) => io.observe(el));

      return () => {
        io.disconnect();
      };
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      <FilmGrain />

      {/* ─── Curtain Reveal ─────────────────────────────────────────── */}
      <div ref={curtainLeftRef} style={{
        position: "fixed", inset: 0, right: "50%", zIndex: 998,
        background: "linear-gradient(135deg, #0A0A0B 60%, #1a1208 100%)",
        transformOrigin: "left center",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        paddingRight: 40,
      }}>
        <div style={{ opacity: 0.3, userSelect: "none", fontSize: 64, lineHeight: 0.8 }}>
          {"▐▐▐▐▐▐▐▐".split("").map((c, i) => (
            <div key={i} style={{ color: "#C9933A", fontSize: 8, lineHeight: "24px", letterSpacing: 2 }}>
              {"●●●●●●●●●"}
            </div>
          ))}
        </div>
      </div>
      <div ref={curtainRightRef} style={{
        position: "fixed", inset: 0, left: "50%", zIndex: 998,
        background: "linear-gradient(225deg, #0A0A0B 60%, #1a1208 100%)",
        transformOrigin: "right center",
        display: "flex", alignItems: "center", justifyContent: "flex-start",
        paddingLeft: 40,
      }}>
        <div style={{ opacity: 0.3, userSelect: "none" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ color: "#C9933A", fontSize: 8, lineHeight: "24px", letterSpacing: 2 }}>
              {"●●●●●●●●●"}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--bg-root)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", overflowX: "hidden" }}>

        {/* ─── Navbar ─────────────────────────────────────────────────── */}
        <nav ref={navRef} style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          padding: "16px 48px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(10,10,11,0.7)", backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(201,147,58,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Image src="/logo.png" alt="SmartView Lounge" width={44} height={44} style={{ borderRadius: 10, objectFit: "cover" }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>
              SmartView Lounge
            </span>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Link href="/login" style={{
              padding: "9px 22px", borderRadius: 10, fontSize: 14, fontWeight: 500,
              color: "var(--text-secondary)", textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.06)",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(201,147,58,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
            >
              Sign In
            </Link>
            <Link href="/register" style={{
              padding: "9px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              background: "linear-gradient(135deg, #C9933A, #A87828)",
              color: "#0A0A0B", textDecoration: "none",
              boxShadow: "0 0 24px rgba(201,147,58,0.25)",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 40px rgba(201,147,58,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 24px rgba(201,147,58,0.25)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Book Now
            </Link>
          </div>
        </nav>

        {/* ─── Hero ───────────────────────────────────────────────────── */}
        <section ref={heroRef} style={{
          position: "relative", minHeight: "100dvh",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          overflow: "hidden", paddingTop: 80,
        }}>
          {/* Background cinematic glow */}
          <div ref={spotlightRef} style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(201,147,58,0.12) 0%, rgba(201,147,58,0.04) 40%, transparent 70%)",
          }} />

          {/* Floating orbs */}
          <div style={{
            position: "absolute", top: "15%", left: "8%", width: 320, height: 320, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,147,58,0.08) 0%, transparent 70%)",
            filter: "blur(40px)", animation: "float 7s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: "20%", right: "6%", width: 250, height: 250, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,106,255,0.08) 0%, transparent 70%)",
            filter: "blur(40px)", animation: "float 9s ease-in-out infinite reverse",
          }} />

          {/* Film perforations left */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 28,
            display: "flex", flexDirection: "column", justifyContent: "space-around",
            paddingBlock: 20, opacity: 0.12,
          }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{
                width: 16, height: 12, borderRadius: 3, background: "#C9933A", marginLeft: 6,
              }} />
            ))}
          </div>
          {/* Film perforations right */}
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 28,
            display: "flex", flexDirection: "column", justifyContent: "space-around",
            paddingBlock: 20, opacity: 0.12,
          }}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{
                width: 16, height: 12, borderRadius: 3, background: "#C9933A", marginRight: 6,
              }} />
            ))}
          </div>

          {/* Content */}
          <div style={{ textAlign: "center", maxWidth: 820, padding: "0 24px", position: "relative", zIndex: 1 }}>
            <p ref={taglineRef} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 12, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase",
              color: "#C9933A", marginBottom: 24,
              padding: "6px 16px", borderRadius: 999,
              border: "1px solid rgba(201,147,58,0.25)",
              background: "rgba(201,147,58,0.06)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9933A", animation: "pulse 2s ease-in-out infinite" }} />
              Sri Lanka&apos;s First Fully Automated Private Theater
            </p>

            <h1 ref={h1Ref} style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(48px, 8vw, 96px)",
              fontWeight: 800, lineHeight: 1.0,
              marginBottom: 28, letterSpacing: "-2px",
            }}>
              Your Private<br />
              <span style={{
                background: "linear-gradient(90deg, #C9933A, #F0C060, #C9933A)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                animation: "shimmer 4s linear infinite",
                display: "inline-block",
              }}>
                Cinema Experience
              </span>
            </h1>

            <p ref={subRef} style={{
              fontSize: "clamp(15px, 2vw, 19px)", lineHeight: 1.7,
              color: "var(--text-secondary)", marginBottom: 44, maxWidth: 600, margin: "0 auto 44px",
            }}>
              Book an exclusive private movie theater session. Walk in, press play, and lose yourself in 4K + Dolby surround sound — completely alone, on your terms.
            </p>

            <div ref={ctaRef} style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "16px 36px", borderRadius: 14, fontSize: 16, fontWeight: 700,
                background: "linear-gradient(135deg, #C9933A, #A87828)",
                color: "#0A0A0B", textDecoration: "none",
                boxShadow: "0 8px 40px rgba(201,147,58,0.35), 0 0 0 1px rgba(201,147,58,0.2)",
                transition: "all 0.25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 60px rgba(201,147,58,0.55), 0 0 0 1px rgba(201,147,58,0.4)"; e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 8px 40px rgba(201,147,58,0.35), 0 0 0 1px rgba(201,147,58,0.2)"; e.currentTarget.style.transform = "translateY(0) scale(1)"; }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                Book Your Session
              </Link>
              <Link href="/login" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "16px 32px", borderRadius: 14, fontSize: 15, fontWeight: 600,
                color: "var(--text-secondary)", textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(12px)",
                transition: "all 0.25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,147,58,0.3)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                Sign In →
              </Link>
            </div>

            {/* Stats row */}
            <div ref={statsRef} style={{
              display: "flex", gap: 0, justifyContent: "center", marginTop: 72,
              flexWrap: "wrap",
            }}>
              {stats.map((s, i) => (
                <div key={i} style={{
                  textAlign: "center", padding: "0 32px",
                  borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}>
                  <p style={{
                    fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 40px)",
                    fontWeight: 800, lineHeight: 1, marginBottom: 6,
                    background: "linear-gradient(135deg, #C9933A, #F0C060)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.5px" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div ref={scrollIndicatorRef} style={{
            position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            color: "var(--text-muted)", fontSize: 11, letterSpacing: "2px", textTransform: "uppercase",
          }}>
            <span>Scroll</span>
            <div style={{
              width: 22, height: 36, borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex", justifyContent: "center", paddingTop: 6,
            }}>
              <div style={{
                width: 4, height: 8, borderRadius: 999, background: "#C9933A",
                animation: "scrollDot 1.8s ease-in-out infinite",
              }} />
            </div>
          </div>
        </section>

        {/* ─── Features ───────────────────────────────────────────────── */}
        <section style={{ padding: "120px 48px", maxWidth: 1200, margin: "0 auto" }}>
          <div className="scroll-reveal" style={{ textAlign: "center", marginBottom: 72 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase",
              color: "#C9933A", marginBottom: 16,
            }}>Why SmartView</p>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 800, letterSpacing: "-1px", marginBottom: 20,
            }}>
              A theater built around{" "}
              <span style={{ fontStyle: "italic", color: "#C9933A" }}>you</span>
            </h2>
            <p style={{ fontSize: 17, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto" }}>
              Every detail was designed for one purpose — your perfect private cinema experience.
            </p>
          </div>

          <div ref={featureCardsRef} style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20,
          }}>
            {features.map((f, i) => (
              <div key={i} className="feature-card" style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20, padding: "32px 28px",
                transition: "all 0.3s ease",
                cursor: "default", position: "relative", overflow: "hidden",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.background = "rgba(255,255,255,0.04)";
                  el.style.borderColor = `${f.color}30`;
                  el.style.transform = "translateY(-4px)";
                  el.style.boxShadow = `0 20px 60px ${f.color}10`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.background = "rgba(255,255,255,0.02)";
                  el.style.borderColor = "rgba(255,255,255,0.06)";
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `${f.color}15`,
                  border: `1px solid ${f.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20,
                }}>
                  {f.icon === "lock" && <IconLock color={f.color} />}
                  {f.icon === "card" && <IconCard color={f.color} />}
                  {f.icon === "clock" && <IconClock color={f.color} />}
                  {f.icon === "phone" && <IconPhone color={f.color} />}
                  {f.icon === "screen" && <IconScreen color={f.color} />}
                  {f.icon === "gift" && <IconGift color={f.color} />}
                </div>
                <h3 style={{
                  fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700,
                  marginBottom: 10, letterSpacing: "-0.3px",
                }}>{f.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>{f.desc}</p>
                {/* corner accent */}
                <div style={{
                  position: "absolute", top: 0, right: 0, width: 80, height: 80,
                  background: `radial-gradient(circle at top right, ${f.color}08, transparent)`,
                  borderRadius: "0 20px 0 0",
                }} />
              </div>
            ))}
          </div>
        </section>

        {/* ─── How It Works ───────────────────────────────────────────── */}
        <section style={{
          padding: "120px 48px",
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(201,147,58,0.05) 0%, transparent 70%)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div className="scroll-reveal" style={{ textAlign: "center", marginBottom: 72 }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#C9933A", marginBottom: 16 }}>
                Simple Process
              </p>
              <h2 style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 800, letterSpacing: "-1px", marginBottom: 16,
              }}>
                From signup to showtime in{" "}
                <span style={{ color: "#C9933A" }}>4 steps</span>
              </h2>
            </div>

            <div ref={stepsRef} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {steps.map((s, i) => (
                <div key={i} className="step-item" style={{
                  display: "flex", gap: 28, alignItems: "flex-start",
                  padding: "32px 36px", borderRadius: 18,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  transition: "all 0.25s",
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(201,147,58,0.04)";
                    e.currentTarget.style.borderColor = "rgba(201,147,58,0.15)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: "linear-gradient(135deg, rgba(201,147,58,0.15), rgba(201,147,58,0.05))",
                      border: "1px solid rgba(201,147,58,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {s.icon === "user" && <IconUser color="#C9933A" />}
                      {s.icon === "calendar" && <IconCalendar color="#C9933A" />}
                      {s.icon === "check" && <IconCheck color="#C9933A" />}
                      {s.icon === "play" && <IconPlay color="#C9933A" />}
                    </div>
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: "2px",
                        color: "#C9933A", opacity: 0.7,
                      }}>{s.num}</span>
                      <h3 style={{
                        fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px",
                      }}>{s.title}</h3>
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)" }}>{s.desc}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{
                      position: "absolute", left: 72, marginTop: 88,
                      width: 1, height: 28, background: "rgba(201,147,58,0.15)",
                      pointerEvents: "none",
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA Section ────────────────────────────────────────────── */}
        <section className="scroll-reveal" style={{
          padding: "120px 48px", textAlign: "center",
          maxWidth: 800, margin: "0 auto",
        }}>
          <div style={{
            position: "relative",
            background: "radial-gradient(ellipse 100% 120% at 50% 100%, rgba(201,147,58,0.12) 0%, rgba(201,147,58,0.04) 50%, transparent 70%)",
            border: "1px solid rgba(201,147,58,0.15)",
            borderRadius: 28, padding: "72px 48px",
            overflow: "hidden",
          }}>
            {/* Cinema screen glow at top */}
            <div style={{
              position: "absolute", top: -1, left: "15%", right: "15%", height: 2,
              background: "linear-gradient(90deg, transparent, #C9933A, #F0C060, #C9933A, transparent)",
              borderRadius: 999,
            }} />
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#C9933A", marginBottom: 20 }}>
              Ready to Watch?
            </p>
            <h2 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, letterSpacing: "-1.5px",
              marginBottom: 24, lineHeight: 1.1,
            }}>
              Your private screening<br />awaits
            </h2>
            <p style={{ fontSize: 17, color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto 44px", lineHeight: 1.7 }}>
              Join hundreds of guests who have already discovered the SmartView experience. Your perfect private night starts here.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/register" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700,
                background: "linear-gradient(135deg, #C9933A, #A87828)",
                color: "#0A0A0B", textDecoration: "none",
                boxShadow: "0 8px 40px rgba(201,147,58,0.4)",
                transition: "all 0.25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 60px rgba(201,147,58,0.6)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 8px 40px rgba(201,147,58,0.4)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                Create Free Account
              </Link>
              <Link href="/login" style={{
                display: "inline-flex", alignItems: "center",
                padding: "16px 32px", borderRadius: 14, fontSize: 15, fontWeight: 600,
                color: "var(--text-secondary)", textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
                transition: "all 0.25s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,147,58,0.3)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                Already have an account? Sign in →
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <footer style={{
          padding: "28px 48px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
        }}>
          <span style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--text-primary)",
            letterSpacing: "-0.2px",
          }}>
            SmartView Lounge
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              © 2026 SmartView Lounge
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", opacity: 0.4 }}>·</span>
            {[
              { label: "Return Policy", href: "/return-policy" },
              { label: "Privacy Policy", href: "/privacy-policy" },
              { label: "Terms & Conditions", href: "/terms-conditions" },
              { label: "Contact", href: "#" },
              { label: "Built by AviterX", href: "#" },
            ].map((item, i, arr) => (
              <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Link
                  href={item.href}
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    transition: "color 0.18s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                >
                  {item.label}
                </Link>
                {i < arr.length - 1 && (
                  <span style={{ fontSize: 13, color: "var(--text-muted)", opacity: 0.4 }}>·</span>
                )}
              </span>
            ))}
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-24px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes scrollDot {
          0% { transform: translateY(0); opacity: 1; }
          80% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 0; }
        }
      `}</style>
    </>
  );
}

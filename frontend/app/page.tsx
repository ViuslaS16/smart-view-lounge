"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18"/>
  </svg>
);
const IconX = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12"/>
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
  { value: "4K", label: "Ultra HD" },
  { value: "7.1", label: "Surround" },
  { value: "12", label: "Seats" },
  { value: "24/7", label: "Available" },
];

const pricingPackages = [
  {
    duration: "1 Hour",
    price: "LKR 990",
    popular: false,
    features: ["Private 4K Screening", "Dolby 7.1 Surround", "Up to 12 Guests", "Bring Your Own Food"],
  },
  {
    duration: "2 Hours",
    price: "LKR 1990",
    popular: true,
    features: ["Private 4K Screening", "Dolby 7.1 Surround", "Up to 12 Guests", "Bring Your Own Food", "Perfect for a Feature Film"],
  },
  {
    duration: "3 Hours",
    price: "LKR 2990",
    popular: false,
    features: ["Private 4K Screening", "Dolby 7.1 Surround", "Up to 12 Guests", "Bring Your Own Food", "Ideal for Extended Director's Cuts"],
  },
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

      // ── Scroll-reveal via IntersectionObserver ──
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

      if (featureCardsRef.current) {
        featureCardsRef.current.querySelectorAll(".feature-card").forEach((el, i) => {
          (el as HTMLElement).dataset.delay = String(i * 0.1);
          io.observe(el);
        });
      }
      if (stepsRef.current) {
        stepsRef.current.querySelectorAll(".step-item").forEach((el, i) => {
          (el as HTMLElement).dataset.delay = String(i * 0.12);
          io.observe(el);
        });
      }
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
        <nav ref={navRef} className="land-nav">
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Image src="/logo.png" alt="SmartView Lounge" width={38} height={38} style={{ borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
            <span className="land-nav-brand">SmartView Lounge</span>
          </div>

          {/* Desktop nav links */}
          <div className="land-nav-links">
            <Link href="/login" className="land-nav-signin">Sign In</Link>
            <Link href="/register" className="land-nav-book">Book Now</Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="land-nav-hamburger"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <IconX /> : <IconMenu />}
          </button>
        </nav>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="land-mobile-menu">
            <Link href="/login" className="land-mobile-link" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            <Link href="/register" className="land-mobile-book" onClick={() => setMobileMenuOpen(false)}>Book Now</Link>
          </div>
        )}

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
          <div className="land-orb-left" />
          <div className="land-orb-right" />

          {/* Film perforations — hidden on very small screens */}
          <div className="land-perforations land-perf-left">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{ width: 14, height: 11, borderRadius: 3, background: "#C9933A", marginLeft: 6 }} />
            ))}
          </div>
          <div className="land-perforations land-perf-right">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{ width: 14, height: 11, borderRadius: 3, background: "#C9933A", marginRight: 6 }} />
            ))}
          </div>

          {/* Content */}
          <div className="land-hero-content">
            <p ref={taglineRef} className="land-tagline">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9933A", animation: "pulse 2s ease-in-out infinite", display: "inline-block", flexShrink: 0 }} />
              Sri Lanka&apos;s First Fully Automated Private Theater
            </p>

            <h1 ref={h1Ref} className="land-h1">
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

            <p ref={subRef} className="land-sub">
              Book an exclusive private movie theater session. Walk in, press play, and lose yourself in 4K + Dolby surround sound — completely alone, on your terms.
            </p>

            <div ref={ctaRef} className="land-cta">
              <Link href="/register" className="land-cta-primary">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                </svg>
                Book Your Session
              </Link>
              <Link href="/login" className="land-cta-secondary">
                Sign In →
              </Link>
            </div>

            {/* Stats row */}
            <div ref={statsRef} className="land-stats">
              {stats.map((s, i) => (
                <div key={i} className="land-stat-item">
                  <p className="land-stat-value">{s.value}</p>
                  <p className="land-stat-label">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div ref={scrollIndicatorRef} style={{
            position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
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
        <section className="land-section">
          <div className="scroll-reveal land-section-header">
            <p className="land-eyebrow">Why SmartView</p>
            <h2 className="land-section-title">
              A theater built around{" "}
              <span style={{ fontStyle: "italic", color: "#C9933A" }}>you</span>
            </h2>
            <p className="land-section-sub">
              Every detail was designed for one purpose — your perfect private cinema experience.
            </p>
          </div>

          <div ref={featureCardsRef} className="land-feature-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card land-feature-card"
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
                  width: 48, height: 48, borderRadius: 14,
                  background: `${f.color}15`,
                  border: `1px solid ${f.color}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 18, flexShrink: 0,
                }}>
                  {f.icon === "lock" && <IconLock color={f.color} />}
                  {f.icon === "card" && <IconCard color={f.color} />}
                  {f.icon === "clock" && <IconClock color={f.color} />}
                  {f.icon === "phone" && <IconPhone color={f.color} />}
                  {f.icon === "screen" && <IconScreen color={f.color} />}
                  {f.icon === "gift" && <IconGift color={f.color} />}
                </div>
                <h3 style={{
                  fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700,
                  marginBottom: 8, letterSpacing: "-0.3px",
                }}>{f.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>{f.desc}</p>
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
        <section className="land-section land-section-alt">
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div className="scroll-reveal land-section-header">
              <p className="land-eyebrow">Simple Process</p>
              <h2 className="land-section-title">
                From signup to showtime in{" "}
                <span style={{ color: "#C9933A" }}>4 steps</span>
              </h2>
            </div>

            <div ref={stepsRef} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {steps.map((s, i) => (
                <div key={i} className="step-item land-step-item"
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
                      width: 50, height: 50, borderRadius: 14,
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, letterSpacing: "2px",
                        color: "#C9933A", opacity: 0.7,
                      }}>{s.num}</span>
                      <h3 style={{
                        fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px",
                      }}>{s.title}</h3>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing ────────────────────────────────────────────────── */}
        <section className="land-section">
          <div className="scroll-reveal land-section-header">
            <p className="land-eyebrow">Pricing</p>
            <h2 className="land-section-title">
              Simple, transparent <span style={{ color: "#C9933A" }}>pricing</span>
            </h2>
            <p className="land-section-sub">
              Book the entire theater for your private group. Pay securely via PayHere to instantly confirm your slot.
            </p>
          </div>

          <div className="land-pricing-grid">
            {pricingPackages.map((pkg, i) => (
              <div key={i} className={`scroll-reveal land-pricing-card ${pkg.popular ? "land-pricing-popular" : ""}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                {pkg.popular && (
                  <div className="land-pricing-badge">Most Popular</div>
                )}
                <h3 className="land-pricing-duration">{pkg.duration}</h3>
                <div className="land-pricing-price">{pkg.price}</div>
                <div className="land-pricing-divider" />
                <ul className="land-pricing-features">
                  {pkg.features.map((feat, j) => (
                    <li key={j}>
                      <IconCheck color="#C9933A" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`land-pricing-btn ${pkg.popular ? "primary" : "secondary"}`}>
                  Book {pkg.duration}
                </Link>
              </div>
            ))}
          </div>
          
          <div className="scroll-reveal" style={{ textAlign: "center", marginTop: 32, fontSize: 14, color: "var(--text-secondary)" }}>
            Need more time? Add extra 30-minute increments for LKR 500.
          </div>
        </section>

        {/* ─── CTA Section ────────────────────────────────────────────── */}
        <section className="scroll-reveal land-cta-section">
          <div className="land-cta-box">
            <div style={{
              position: "absolute", top: -1, left: "10%", right: "10%", height: 2,
              background: "linear-gradient(90deg, transparent, #C9933A, #F0C060, #C9933A, transparent)",
              borderRadius: 999,
            }} />
            <p className="land-eyebrow">Ready to Watch?</p>
            <h2 className="land-cta-title">
              Your private screening<br />awaits
            </h2>
            <p className="land-cta-sub">
              Join hundreds of guests who have already discovered the SmartView experience. Your perfect private night starts here.
            </p>
            <div className="land-cta">
              <Link href="/register" className="land-cta-primary">
                Create Free Account
              </Link>
              <Link href="/login" className="land-cta-secondary">
                Already have an account? Sign in →
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <footer className="land-footer">
          <span className="land-footer-brand">SmartView Lounge</span>
          <div className="land-footer-links">
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>© 2026 SmartView Lounge</span>
            {[
              { label: "Return Policy", href: "/return-policy" },
              { label: "Privacy Policy", href: "/privacy-policy" },
              { label: "Terms & Conditions", href: "/terms-conditions" },
              { label: "Contact", href: "#" },
              { label: "Built by AviterX", href: "https://aviterx.com" },
            ].map((item, i, arr) => (
              <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", opacity: 0.4 }}>·</span>
                <Link
                  href={item.href}
                  style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.18s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </div>
        </footer>
      </div>

      <style>{`
        /* ── Navbar ─────────────────────────────────────────────── */
        .land-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(10,10,11,0.8); backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(201,147,58,0.08);
          gap: 12px;
        }
        .land-nav-brand {
          font-family: var(--font-display); font-weight: 700; font-size: 17px;
          letter-spacing: -0.3px; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis;
        }
        .land-nav-links {
          display: flex; gap: 10px; align-items: center; flex-shrink: 0;
        }
        .land-nav-signin {
          padding: 8px 18px; border-radius: 10px; font-size: 14px; font-weight: 500;
          color: var(--text-secondary); text-decoration: none;
          border: 1px solid rgba(255,255,255,0.06); transition: all 0.2s; white-space: nowrap;
        }
        .land-nav-signin:hover { color: #fff; border-color: rgba(201,147,58,0.3); }
        .land-nav-book {
          padding: 8px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;
          background: linear-gradient(135deg, #C9933A, #A87828);
          color: #0A0A0B; text-decoration: none; white-space: nowrap;
          box-shadow: 0 0 20px rgba(201,147,58,0.25); transition: all 0.2s;
        }
        .land-nav-book:hover { box-shadow: 0 0 36px rgba(201,147,58,0.5); transform: translateY(-1px); }
        .land-nav-hamburger {
          display: none; background: none; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 6px; cursor: pointer; color: var(--text-secondary);
          align-items: center; justify-content: center; flex-shrink: 0;
          transition: all 0.2s;
        }
        .land-nav-hamburger:hover { color: #fff; border-color: rgba(201,147,58,0.3); }

        /* Mobile menu drawer */
        .land-mobile-menu {
          position: fixed; top: 65px; left: 0; right: 0; z-index: 99;
          background: rgba(10,10,11,0.97); backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(201,147,58,0.1);
          padding: 16px 24px; display: flex; flex-direction: column; gap: 10px;
        }
        .land-mobile-link {
          display: block; padding: 12px 16px; border-radius: 10px; font-size: 15px;
          font-weight: 500; color: var(--text-secondary); text-decoration: none;
          border: 1px solid rgba(255,255,255,0.06); text-align: center;
          transition: all 0.2s;
        }
        .land-mobile-link:hover { color: #fff; border-color: rgba(201,147,58,0.3); }
        .land-mobile-book {
          display: block; padding: 13px 16px; border-radius: 10px; font-size: 15px;
          font-weight: 700; background: linear-gradient(135deg, #C9933A, #A87828);
          color: #0A0A0B; text-decoration: none; text-align: center;
          box-shadow: 0 4px 24px rgba(201,147,58,0.3);
        }

        /* ── Hero ───────────────────────────────────────────────── */
        .land-hero-content {
          text-align: center; width: 100%; max-width: 820px;
          padding: 0 20px; position: relative; z-index: 1;
        }
        .land-tagline {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase;
          color: #C9933A; margin-bottom: 20px;
          padding: 6px 14px; border-radius: 999px;
          border: 1px solid rgba(201,147,58,0.25); background: rgba(201,147,58,0.06);
          max-width: 100%; flex-wrap: wrap; justify-content: center;
        }
        .land-h1 {
          font-family: var(--font-display);
          font-size: clamp(40px, 10vw, 96px);
          font-weight: 800; line-height: 1.05;
          margin-bottom: 20px; letter-spacing: -1.5px;
        }
        .land-sub {
          font-size: clamp(14px, 2vw, 18px); line-height: 1.7;
          color: var(--text-secondary); margin-bottom: 36px;
          max-width: 560px; margin-left: auto; margin-right: auto;
        }
        .land-cta {
          display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
        }
        .land-cta-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 14px; font-size: 15px; font-weight: 700;
          background: linear-gradient(135deg, #C9933A, #A87828);
          color: #0A0A0B; text-decoration: none;
          box-shadow: 0 8px 36px rgba(201,147,58,0.35), 0 0 0 1px rgba(201,147,58,0.2);
          transition: all 0.25s; white-space: nowrap;
        }
        .land-cta-primary:hover { box-shadow: 0 12px 56px rgba(201,147,58,0.55), 0 0 0 1px rgba(201,147,58,0.4); transform: translateY(-2px) scale(1.02); }
        .land-cta-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 24px; border-radius: 14px; font-size: 14px; font-weight: 600;
          color: var(--text-secondary); text-decoration: none;
          border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03);
          backdrop-filter: blur(12px); transition: all 0.25s; white-space: nowrap;
        }
        .land-cta-secondary:hover { border-color: rgba(201,147,58,0.3); color: #fff; }

        /* Stats */
        .land-stats {
          display: flex; gap: 0; justify-content: center; margin-top: 52px;
          flex-wrap: wrap; row-gap: 20px;
        }
        .land-stat-item {
          text-align: center; padding: 0 20px;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .land-stat-item:last-child { border-right: none; }
        .land-stat-value {
          font-family: var(--font-display); font-size: clamp(24px, 5vw, 40px);
          font-weight: 800; line-height: 1; margin-bottom: 4px;
          background: linear-gradient(135deg, #C9933A, #F0C060);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .land-stat-label { font-size: 11px; color: var(--text-muted); letter-spacing: 0.5px; }

        /* Orbs */
        .land-orb-left {
          position: absolute; top: 15%; left: 5%; width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(201,147,58,0.08) 0%, transparent 70%);
          filter: blur(40px); animation: float 7s ease-in-out infinite; pointer-events: none;
        }
        .land-orb-right {
          position: absolute; bottom: 20%; right: 4%; width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(124,106,255,0.08) 0%, transparent 70%);
          filter: blur(40px); animation: float 9s ease-in-out infinite reverse; pointer-events: none;
        }

        /* Film perforations */
        .land-perforations {
          position: absolute; top: 0; bottom: 0; width: 24px;
          display: flex; flex-direction: column; justify-content: space-around;
          padding-block: 20px; opacity: 0.12; pointer-events: none;
        }
        .land-perf-left { left: 0; }
        .land-perf-right { right: 0; }

        /* ── Sections ───────────────────────────────────────────── */
        .land-section {
          padding: clamp(60px, 10vw, 120px) clamp(16px, 5vw, 48px);
          max-width: 1200px; margin: 0 auto;
        }
        .land-section-alt {
          max-width: 100%;
          background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(201,147,58,0.05) 0%, transparent 70%);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-left: clamp(16px, 5vw, 48px);
          padding-right: clamp(16px, 5vw, 48px);
        }
        .land-section-header { text-align: center; margin-bottom: 52px; }
        .land-eyebrow {
          font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;
          color: #C9933A; margin-bottom: 14px;
        }
        .land-section-title {
          font-family: var(--font-display); font-size: clamp(28px, 5vw, 52px);
          font-weight: 800; letter-spacing: -1px; margin-bottom: 16px; line-height: 1.1;
        }
        .land-section-sub {
          font-size: 16px; color: var(--text-secondary); max-width: 500px; margin: 0 auto;
          line-height: 1.7;
        }

        /* Feature grid */
        .land-feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: 16px;
        }
        .land-feature-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px; padding: 28px 22px;
          transition: all 0.3s ease; cursor: default;
          position: relative; overflow: hidden;
        }

        /* Step items */
        .land-step-item {
          display: flex; gap: 20px; align-items: flex-start;
          padding: clamp(18px, 3vw, 28px) clamp(16px, 3vw, 28px);
          border-radius: 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.25s;
        }

        /* Pricing */
        .land-pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-top: 48px;
        }
        .land-pricing-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 40px 32px;
          position: relative;
          display: flex;
          flex-direction: column;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .land-pricing-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .land-pricing-popular {
          background: linear-gradient(180deg, rgba(201,147,58,0.08) 0%, rgba(255,255,255,0.02) 100%);
          border-color: rgba(201,147,58,0.3);
        }
        .land-pricing-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #C9933A, #A87828);
          color: #0A0A0B;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 6px 16px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(201,147,58,0.3);
        }
        .land-pricing-duration {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }
        .land-pricing-price {
          font-family: var(--font-display);
          font-size: 40px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 24px;
          letter-spacing: -1px;
        }
        .land-pricing-divider {
          height: 1px;
          background: rgba(255,255,255,0.08);
          margin-bottom: 24px;
        }
        .land-pricing-features {
          list-style: none;
          padding: 0;
          margin: 0 0 32px 0;
          flex-grow: 1;
        }
        .land-pricing-features li {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          font-size: 15px;
          color: var(--text-secondary);
        }
        .land-pricing-features li svg {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
        }
        .land-pricing-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 14px 0;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }
        .land-pricing-btn.primary {
          background: linear-gradient(135deg, #C9933A, #A87828);
          color: #0A0A0B;
          box-shadow: 0 8px 24px rgba(201,147,58,0.25);
        }
        .land-pricing-btn.primary:hover {
          box-shadow: 0 12px 32px rgba(201,147,58,0.4);
          transform: translateY(-2px);
        }
        .land-pricing-btn.secondary {
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .land-pricing-btn.secondary:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.2);
        }

        /* CTA section */
        .land-cta-section {
          padding: clamp(40px, 8vw, 100px) clamp(16px, 5vw, 48px);
          max-width: 800px; margin: 0 auto; text-align: center;
        }
        .land-cta-box {
          position: relative;
          background: radial-gradient(ellipse 100% 120% at 50% 100%, rgba(201,147,58,0.12) 0%, rgba(201,147,58,0.04) 50%, transparent 70%);
          border: 1px solid rgba(201,147,58,0.15);
          border-radius: 24px; padding: clamp(36px, 6vw, 64px) clamp(20px, 5vw, 48px);
          overflow: hidden;
        }
        .land-cta-title {
          font-family: var(--font-display);
          font-size: clamp(28px, 5vw, 56px); font-weight: 800; letter-spacing: -1.5px;
          margin-bottom: 20px; line-height: 1.1;
        }
        .land-cta-sub {
          font-size: 16px; color: var(--text-secondary);
          max-width: 460px; margin: 0 auto 36px; line-height: 1.7;
        }

        /* Footer */
        .land-footer {
          padding: clamp(20px, 3vw, 28px) clamp(16px, 5vw, 48px);
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .land-footer-brand {
          font-family: var(--font-display); font-weight: 700; font-size: 14px;
          color: var(--text-primary); letter-spacing: -0.2px; white-space: nowrap;
        }
        .land-footer-links {
          display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
        }

        /* ── Responsive breakpoints ─────────────────────────────── */
        @media (max-width: 640px) {
          .land-nav { padding: 12px 16px; }
          .land-nav-links { display: none; }
          .land-nav-hamburger { display: flex; }
          .land-nav-brand { font-size: 15px; }

          .land-orb-left { width: 180px; height: 180px; left: -20px; }
          .land-orb-right { width: 140px; height: 140px; right: -20px; }
          .land-perforations { display: none; }

          .land-tagline { font-size: 10px; letter-spacing: 1.5px; padding: 5px 12px; }
          .land-h1 { letter-spacing: -0.5px; margin-bottom: 16px; }
          .land-sub { margin-bottom: 28px; }

          .land-stat-item { padding: 0 14px; }
          .land-stats { margin-top: 40px; }

          .land-cta-primary { padding: 13px 22px; font-size: 14px; width: 100%; justify-content: center; }
          .land-cta-secondary { padding: 13px 20px; font-size: 13px; width: 100%; justify-content: center; }
          .land-cta { flex-direction: column; align-items: stretch; }

          .land-step-item { gap: 14px; }

          .land-footer { flex-direction: column; align-items: flex-start; gap: 8px; }
          .land-footer-links { gap: 2px; }

          .land-cta-sub { font-size: 14px; }
          .land-section-sub { font-size: 14px; }
        }

        @media (max-width: 400px) {
          .land-stat-item { padding: 0 10px; }
          .land-cta-box { padding: 28px 16px; }
        }

        /* ── Animations ─────────────────────────────────────────── */
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

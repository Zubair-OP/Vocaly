import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Brand() {
  return <Link to="/" className="landing-brand" aria-label="Vocally home"><AudioLines strokeWidth={1.4} aria-hidden="true" /><span>vocally<span>.</span></span></Link>;
}

export function StudioLink({ children = "Open Studio", compact = false }: { children?: ReactNode; compact?: boolean }) {
  return <Button asChild size={compact ? "default" : "lg"}><Link to="/new" className={cn("landing-cta", compact && "landing-cta-small")}>{children}<span className="cta-island"><ArrowUpRight strokeWidth={1.4} aria-hidden="true" data-icon="inline-end" /></span></Link></Button>;
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.dataset.visible = "true";
        observer.disconnect();
      }
    }, { threshold: 0, rootMargin: "0px 0px 80px 0px" });
    element.dataset.reveal = "true";
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={cn("landing-reveal", className)} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>{children}</div>;
}

export function Waveform({ variant = 0, className }: { variant?: number; className?: string }) {
  return <div className={cn("landing-wave", className)} aria-hidden="true">{Array.from({ length: 64 }, (_, i) => {
    const envelope = Math.sin((i / 63) * Math.PI);
    const height = 9 + Math.abs(Math.sin(i * 1.37 + variant * 0.9) * Math.cos(i * 0.28 + variant)) * 88 * envelope;
    return <span key={i} style={{ height: `${height}%`, "--wave-delay": `${-(i % 13) * 0.17}s` } as CSSProperties} />;
  })}</div>;
}

export function SectionHeading({ number, label, title, description }: { number: string; label: string; title: ReactNode; description?: string }) {
  return <div className="landing-section-heading"><p className="landing-eyebrow"><span>{number}</span> {label}</p><h2>{title}</h2>{description && <p className="landing-description">{description}</p>}</div>;
}

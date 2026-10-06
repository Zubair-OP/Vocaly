import { useEffect, useRef, useState } from "react";
import { Brand, StudioLink } from "./LandingPrimitives";

const links = [["Features", "features"], ["How it works", "how-it-works"], ["Use cases", "use-cases"], ["Explore the demo", "demo"]];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const navigation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: "-15% 0px -65% 0px" });
    links.forEach(([, id]) => { const section = document.getElementById(id); if (section) observer.observe(section); });
    const hero = document.querySelector(".cinematic-hero");
    if (hero) observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { if (menu.current) menu.current.inert = !open; }, [open]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const background = Array.from(document.querySelectorAll<HTMLElement>(".landing > main, .landing > footer, .landing-skip"));
    background.forEach((element) => { element.inert = true; });
    const focusFrame = requestAnimationFrame(() => menu.current?.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true }));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
      if (event.key === "Tab") {
        const items = Array.from(navigation.current?.querySelectorAll<HTMLElement>("a, button") ?? []).filter((element) => element.getClientRects().length > 0);
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); items[items.length - 1]?.focus(); }
        else if (!event.shiftKey && index === items.length - 1) { event.preventDefault(); items[0]?.focus(); }
      }
    };
    const media = window.matchMedia("(min-width: 901px)");
    const onResize = () => { if (media.matches) setOpen(false); };
    media.addEventListener("change", onResize);
    document.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(focusFrame); document.body.style.overflow = previousOverflow; background.forEach((element) => { element.inert = false; }); document.removeEventListener("keydown", onKey); media.removeEventListener("change", onResize); };
  }, [open]);

  function closeToSection(id: string) {
    setOpen(false);
    // Release the dialog's scroll lock before starting the smooth journey.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const section = document.getElementById(id);
      if (!section) return;
      history.pushState(null, "", `#${id}`);
      section.focus({ preventScroll: true });
      section.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }));
  }

  return <>
    <div ref={sentinel} className="landing-nav-sentinel" aria-hidden="true" />
    <div ref={navigation} className="landing-navigation" data-open={open} role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label={open ? "Site navigation" : undefined}>
    <header className="landing-nav" data-scrolled={scrolled}>
      <Brand />
      <nav className="landing-desktop-links" aria-label="Landing navigation">{links.map(([label, id]) => <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined}>{label}</a>)}</nav>
      <div className="landing-nav-actions"><StudioLink compact /><button ref={toggle} className="landing-menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={() => setOpen(!open)}><span /><span /></button></div>
    </header>
    <div className="landing-mobile-menu" id="landing-mobile-menu" ref={menu} data-open={open} aria-hidden={!open}><nav aria-label="Mobile landing navigation">{links.map(([label, id], i) => <a key={id} href={`#${id}`} tabIndex={open ? 0 : -1} style={{ transitionDelay: open ? `${70 + i * 55}ms` : "0ms" }} onClick={(event) => { event.preventDefault(); closeToSection(id); }}><span>0{i + 1}</span>{label}</a>)}</nav><p>Your voice. A world of possibilities.</p></div>
    </div>
  </>;
}

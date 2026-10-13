import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { PublicTitle } from "@/lib/catalogTypes";
import { limitSeoHeading } from "@/lib/siteSeo";
import TitleCard from "./TitleCard";

export default function TitleShelf({ title, subtitle, titles, href, linkLabel = "See all" }: { title: string; subtitle?: string; titles: PublicTitle[]; href?: string; linkLabel?: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const heading = limitSeoHeading(title);
  function scroll(direction: -1 | 1) {
    const node = rail.current;
    if (!node) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({ left: direction * node.clientWidth * 0.76, behavior: reduceMotion ? "auto" : "smooth" });
  }
  if (!titles.length) return null;
  return <section className="site-container section-block title-shelf-section">
    <div className="section-heading"><div><h2 className="section-title">{heading}</h2>{subtitle && <p className="section-subtitle">{subtitle}</p>}</div><div className="shelf-controls">{href && <Link className="section-link" href={href}>{linkLabel} <ArrowRight size={12} style={{ verticalAlign: "middle" }} /></Link>}<button className="row-action shelf-arrow" type="button" aria-label={`Scroll ${heading} left`} onClick={() => scroll(-1)}><ArrowLeft size={15} /></button><button className="row-action shelf-arrow" type="button" aria-label={`Scroll ${heading} right`} onClick={() => scroll(1)}><ArrowRight size={15} /></button></div></div>
    <div className="title-shelf-rail" ref={rail} aria-label={heading}>{titles.map(item => <div className="title-shelf-item" key={item.id}><TitleCard title={item} /></div>)}</div>
  </section>;
}

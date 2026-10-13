import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Play, PlayCircle } from "lucide-react";
import { Link } from "wouter";
import EmptyState from "@/components/EmptyState";
import { SiteLayout } from "@/components/SiteLayout";
import TitleShelf from "@/components/TitleShelf";
import { limitSeoHeading } from "@/lib/siteSeo";
import { trpc } from "@/lib/trpc";

function HeroArtwork({ backdropUrl, posterUrl, title }: { backdropUrl?: string | null; posterUrl?: string | null; title: string }) {
  const sources = [backdropUrl, posterUrl].filter((source, index, all): source is string => Boolean(source) && all.indexOf(source) === index);
  const [sourceIndex, setSourceIndex] = useState(0);
  useEffect(() => setSourceIndex(0), [backdropUrl, posterUrl]);
  const source = sources[sourceIndex];
  if (!source) return null;
  return <img className="hero-backdrop-image" src={source} alt={`${title} featured artwork`} decoding="async" fetchPriority="high" onError={() => setSourceIndex(index => Math.min(index + 1, sources.length))} />;
}

export default function Home() {
  const catalog = trpc.catalog.publicList.useQuery(undefined);
  const categoriesQuery = trpc.catalog.publicCategories.useQuery();
  const interpretersQuery = trpc.catalog.publicInterpreters.useQuery();
  const sectionsQuery = trpc.site.publicHomepageSections.useQuery();
  const titles = catalog.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const interpreters = interpretersQuery.data ?? [];
  const featured = titles.filter(title => title.featured).sort((a, b) => (a.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (b.featuredOrder ?? Number.MAX_SAFE_INTEGER));
  const movies = titles.filter(title => title.kind === "movie").slice(0, 12);
  const series = titles.filter(title => title.kind === "series").slice(0, 12);
  const categoryShelves = useMemo(() => categories.map(category => ({
    category,
    titles: titles.filter(title => title.categories.some(name => name.trim().toLocaleLowerCase() === category.name.trim().toLocaleLowerCase())),
  })).filter(shelf => shelf.titles.length > 0), [categories, titles]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeSlide = featured[slideIndex] ?? featured[0];

  useEffect(() => { if (slideIndex >= featured.length) setSlideIndex(0); }, [featured.length, slideIndex]);
  useEffect(() => {
    if (featured.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setSlideIndex(index => (index + 1) % featured.length), 6000);
    return () => window.clearInterval(timer);
  }, [featured.length, paused]);

  return (
    <SiteLayout>
      <main>
        <section className={`hero-section${activeSlide ? " hero-has-slide" : ""}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
          {activeSlide && <HeroArtwork key={activeSlide.id} backdropUrl={activeSlide.backdropUrl} posterUrl={activeSlide.posterUrl} title={activeSlide.title} />}
          <div className="hero-shade" />
          <div className="hero-content">
            <span className="eyebrow">{activeSlide ? `Featured ${activeSlide.kind === "series" ? "series" : "movie"} · AgaStream` : "AgaStream catalog · NobleCash Group"}</span>
            <h1 className="hero-title" key={activeSlide?.id ?? "hero-default"}>{limitSeoHeading(activeSlide?.title ?? "Your next story starts here.")}</h1>
            <p className="hero-copy">{activeSlide?.synopsis || "Discover movies and series, browse by category, and meet the interpreters who bring every story to life."}</p>
            <div className="hero-actions">
              {activeSlide?.trailerUrl ? <Link className="button-primary" href={`/title/${encodeURIComponent(activeSlide.slug)}?play=trailer`}><PlayCircle size={15} /> Watch trailer</Link> : activeSlide ? <Link className="button-primary" href={`/title/${encodeURIComponent(activeSlide.slug)}`}><Play size={15} fill="currentColor" /> Explore title</Link> : <Link className="button-primary" href="/movies">Browse movies <ArrowRight size={15} /></Link>}
              <Link className="button-secondary" href={activeSlide ? `/title/${encodeURIComponent(activeSlide.slug)}` : "/categories"}>{activeSlide ? "More info" : "Explore categories"}</Link>
            </div>
            {featured.length > 1 && <div className="hero-slide-controls" aria-label="Featured slides">
              <button className="hero-slide-arrow" type="button" aria-label="Previous featured title" onClick={() => setSlideIndex(index => (index - 1 + featured.length) % featured.length)}><ArrowLeft size={15} /></button>
              {featured.map((item, index) => <button key={item.id} className={`hero-slide-dot${index === slideIndex ? " active" : ""}`} type="button" aria-label={`Show featured title ${index + 1}: ${item.title}`} aria-pressed={index === slideIndex} onClick={() => setSlideIndex(index)} />)}
              <button className="hero-slide-arrow" type="button" aria-label="Next featured title" onClick={() => setSlideIndex(index => (index + 1) % featured.length)}><ArrowRight size={15} /></button>
            </div>}
          </div>
        </section>

        <section className="site-container section-block">
          <div className="section-heading"><div><h2 className="section-title">Browse categories</h2><p className="section-subtitle">Find your next watch by mood or genre.</p></div><Link className="section-link" href="/categories">See all <ArrowRight size={12} style={{ verticalAlign: "middle" }} /></Link></div>
          {categoriesQuery.isLoading ? <div className="empty-state"><p>Loading categories…</p></div> : categories.length ? <div className="category-grid">
            {categories.slice(0, 9).map((category, index) => <Link key={category.id} className="category-tile" href={`/category/${encodeURIComponent(category.slug)}`}>
              <span className="category-mark">{["✦", "◈", "✳", "✧", "◇", "✺"][index % 6]}</span>
              <div><div className="category-name">{category.name}</div><div className="category-count">{category.titleCount} {category.titleCount === 1 ? "title" : "titles"}</div></div>
            </Link>)}
          </div> : <EmptyState title="Categories are being prepared" message="The AgaStream administrator can create categories in Admin Studio." />}
        </section>

        {catalog.isLoading ? <section className="site-container section-block"><div className="empty-state"><p>Loading the catalog…</p></div></section> : movies.length ? <TitleShelf title="New Films" subtitle="Fresh stories in the AgaStream library." titles={movies} href="/movies" linkLabel="See all" /> : <section className="site-container section-block"><EmptyState title="The movie shelf is ready for its first story" message="Movies added by the AgaStream administrator will appear here." /></section>}

        {series.length ? <TitleShelf title="Series" titles={series} href="/tv-series" linkLabel="See all" /> : <section className="site-container section-block"><EmptyState title="Series will appear here" message="Add a series in Admin Studio, then organize its seasons and episodes." /></section>}

        {categoryShelves.map(({ category, titles: categoryTitles }) => <TitleShelf key={`category-${category.id}`} title={category.name} titles={categoryTitles} href={`/category/${encodeURIComponent(category.slug)}`} linkLabel="See all" />)}

        {(sectionsQuery.data ?? []).map(section => {
          const shelfTitles = titles.filter(title => (title.homeSections ?? []).includes(section.slug));
          return shelfTitles.length ? <TitleShelf key={section.id} title={section.name} subtitle={`${shelfTitles.length} selected title${shelfTitles.length === 1 ? "" : "s"}`} titles={shelfTitles} href={`/shelf/${encodeURIComponent(section.slug)}`} linkLabel="See all" /> : null;
        })}

        <section className="site-container section-block">
          <div className="section-heading"><div><h2 className="section-title">Interpreters</h2><p className="section-subtitle">The voices behind the stories.</p></div><Link className="section-link" href="/interpreters">See all <ArrowRight size={12} style={{ verticalAlign: "middle" }} /></Link></div>
          {interpretersQuery.isLoading ? <div className="empty-state"><p>Loading interpreter profiles…</p></div> : interpreters.length ? <div className="interpreter-grid">{interpreters.slice(0, 10).map(interpreter => <Link key={interpreter.id} className="interpreter-tile" href={`/interpreter/${encodeURIComponent(interpreter.slug)}`}><span className="interpreter-avatar">{interpreter.photoUrl ? <img src={interpreter.photoUrl} alt={`${interpreter.name} interpreter portrait`} /> : interpreter.name.slice(0, 2).toUpperCase()}</span><span className="interpreter-copy"><span className="interpreter-name">{interpreter.name}</span><span className="interpreter-count">{interpreter.titleCount} {interpreter.titleCount === 1 ? "title" : "titles"} interpreted</span></span></Link>)}</div> : <EmptyState title="AgaStream interpreters" message="Create interpreter profiles in Admin Studio or add names when cataloging titles." />}
        </section>
      </main>
    </SiteLayout>
  );
}

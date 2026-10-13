import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import EmptyState from "@/components/EmptyState";
import { SiteLayout } from "@/components/SiteLayout";
import TitleCard from "@/components/TitleCard";
import { slugLabel } from "@/lib/catalogTypes";
import { trpc } from "@/lib/trpc";

type BrowseKind = "movie" | "series" | "category" | "interpreter";

export default function BrowsePage({ kind }: { kind: BrowseKind }) {
  const [, categoryParams] = useRoute("/category/:slug");
  const [, interpreterParams] = useRoute("/interpreter/:slug");
  const routeSlug = kind === "category" ? categoryParams?.slug ?? "" : kind === "interpreter" ? interpreterParams?.slug ?? "" : "";
  const categoriesQuery = trpc.catalog.publicCategories.useQuery(undefined, { enabled: kind === "category" });
  const interpretersQuery = trpc.catalog.publicInterpreters.useQuery(undefined, { enabled: kind === "interpreter" });
  const routeLabel = kind === "category"
    ? categoriesQuery.data?.find(item => item.slug === routeSlug)?.name ?? slugLabel(routeSlug)
    : kind === "interpreter"
      ? interpretersQuery.data?.find(item => item.slug === routeSlug)?.name ?? slugLabel(routeSlug)
      : "";
  const queryKind = kind === "movie" || kind === "series" ? kind : undefined;
  const catalog = trpc.catalog.publicList.useQuery(queryKind ? { kind: queryKind } : undefined);
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const onSearch = (event: Event) => {
      const custom = event as CustomEvent<string>;
      setSearch(custom.detail ?? "");
    };
    window.addEventListener("agastream-search", onSearch);
    return () => window.removeEventListener("agastream-search", onSearch);
  }, []);

  const titles = catalog.data ?? [];
  const categories = useMemo(() => [...new Set(titles.flatMap(title => title.categories))].sort((a, b) => a.localeCompare(b)), [titles]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return titles.filter(title => {
      const matchesSearch = !term || [title.title, title.synopsis ?? "", ...title.categories, ...title.interpreters].join(" ").toLowerCase().includes(term);
      const matchesCategory = !selectedCategory || title.categories.some(value => value.toLowerCase() === selectedCategory.toLowerCase());
      const matchesRoute = kind === "category" ? title.categories.some(value => value.toLowerCase() === routeLabel.toLowerCase()) : kind === "interpreter" ? title.interpreters.some(value => value.toLowerCase() === routeLabel.toLowerCase()) : true;
      return matchesSearch && matchesCategory && matchesRoute;
    }).sort((a, b) => sortBy === "title" ? a.title.localeCompare(b.title) : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [titles, search, selectedCategory, kind, routeLabel, sortBy]);
  const categoryMovies = kind === "category" ? filtered.filter(title => title.kind === "movie") : [];
  const categorySeries = kind === "category" ? filtered.filter(title => title.kind === "series") : [];

  const heading = kind === "movie" ? "Movies" : kind === "series" ? "TV Series" : kind === "category" ? routeLabel : routeLabel;
  const description = kind === "movie" ? "Discover movies added by the AgaStream catalog team." : kind === "series" ? "Explore series and continue into their seasons and episodes." : kind === "category" ? `Browse stories filed under ${routeLabel}.` : `Titles interpreted by ${routeLabel}.`;

  return (
    <SiteLayout>
      <main className="site-container">
        <header className="page-header"><span className="eyebrow">Discover AgaStream</span><h1 className="page-title">{heading}</h1><p className="page-description">{description}</p></header>
        <div className="catalog-controls">
          <input className="text-control" style={{ width: "min(100%, 270px)" }} aria-label="Filter titles" placeholder="Search this catalog…" value={search} onChange={event => setSearch(event.target.value)} />
          {(kind === "movie" || kind === "series") && <select className="select-control" style={{ width: 160 }} aria-label="Filter by category" value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}><option value="">All categories</option>{categories.map(category => <option key={category}>{category}</option>)}</select>}
          <select className="select-control" style={{ width: 152 }} aria-label="Sort titles" value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="recent">Recently updated</option><option value="title">Title A–Z</option></select>
        </div>
        {catalog.isLoading ? <div className="empty-state"><p>Loading the catalog…</p></div> : kind === "category" ? filtered.length ? <>
          {categoryMovies.length > 0 && <section className="section-block category-results-section" aria-label="Movies in this category"><div className="section-heading"><div><h2 className="section-title">Movies</h2></div></div><div className="title-grid">{categoryMovies.map(title => <TitleCard key={title.id} title={title} />)}</div></section>}
          {categorySeries.length > 0 && <section className="section-block category-results-section" aria-label="Series in this category"><div className="section-heading"><div><h2 className="section-title">Series</h2></div></div><div className="title-grid">{categorySeries.map(title => <TitleCard key={title.id} title={title} />)}</div></section>}
        </> : <EmptyState title="No titles found" message="Try another search or check back as the AgaStream catalog grows." /> : filtered.length ? <div className="title-grid">{filtered.map(title => <TitleCard key={title.id} title={title} />)}</div> : <EmptyState title="No titles found" message="Try another search or check back as the AgaStream catalog grows." />}
      </main>
    </SiteLayout>
  );
}

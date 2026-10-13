import { useEffect, useMemo, useState } from "react";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { getHomeDocumentTitle } from "@/lib/siteSeo";

const links = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/tv-series", label: "TV Series" },
  { href: "/categories", label: "Categories" },
  { href: "/interpreters", label: "Interpreters" },
];

export default function SiteHeader() {
  const [location, setLocation] = useLocation();
  const route = location.split("?")[0];
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const theme = useTheme();
  const settingsQuery = trpc.site.publicSettings.useQuery();
  const titlesQuery = trpc.catalog.publicList.useQuery(undefined, { enabled: search.trim().length >= 2, staleTime: 30_000 });
  const settings = settingsQuery.data;
  const logoUrl = settings?.logoUrl || "/agastream-logo.png";
  const siteName = settings?.siteName || "AgaStream";
  const suggestions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (term.length < 2) return [];
    return (titlesQuery.data ?? []).filter(title => [title.title, title.synopsis ?? "", ...title.categories, ...title.interpreters].join(" ").toLocaleLowerCase().includes(term)).slice(0, 6);
  }, [titlesQuery.data, search]);

  useEffect(() => setMenuOpen(false), [route]);
  useEffect(() => setLogoFailed(false), [logoUrl]);
  useEffect(() => {
    if (!settings) return;
    const titleLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (titleLink) titleLink.href = settings.faviconUrl || "/favicon.png";
    const titleRoute = route === "/" ? settings.pageTitle : route === "/admin" || route === "/admin-panel" ? "Admin Studio" : route === "/movies" ? "Movies" : route === "/tv-series" ? "TV Series" : route === "/categories" ? "Categories" : route === "/interpreters" ? "Interpreters" : route.startsWith("/title/") ? route.slice("/title/".length).replace(/-/g, " ").toUpperCase() : "Discover";
    const documentTitle = route === "/" ? getHomeDocumentTitle(settings.pageTitle) : `${titleRoute} · ${siteName}`;
    document.title = documentTitle;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", documentTitle);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", documentTitle);
  }, [settings, route, siteName]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    window.dispatchEvent(new CustomEvent("agastream-search", { detail: query }));
    setSearchOpen(false);
    setLocation(query ? `/movies?q=${encodeURIComponent(query)}` : "/movies");
  }

  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Link href="/" className="brand-link" aria-label="AgaStream home">
          <img className="brand-logo" src={logoFailed ? "/agastream-logo.png" : logoUrl} alt={`${siteName} logo`} onError={() => setLogoFailed(true)} />
          <span className="brand-name">{siteName}</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          {links.map(link => <Link key={link.href} href={link.href} aria-current={route === link.href ? "page" : undefined}>{link.label}</Link>)}
        </nav>
        <div className="header-tools">
          <div className="header-search-wrap">
            <form className="search-field" role="search" onSubmit={submitSearch}>
              <Search size={15} aria-hidden="true" />
              <input aria-label="Search titles" value={search} onFocus={() => setSearchOpen(true)} onChange={event => { setSearch(event.target.value); setSearchOpen(true); }} placeholder="Search movies, series…" />
            </form>
            {searchOpen && search.trim().length >= 2 && <div className="search-suggestions" role="listbox" aria-label="Matching titles">
              {titlesQuery.isLoading ? <span className="suggestion-note">Searching the AgaStream catalog…</span> : suggestions.length ? suggestions.map(title => <Link key={title.id} role="option" href={`/title/${encodeURIComponent(title.slug)}`} onMouseDown={event => event.preventDefault()} onClick={() => { setSearchOpen(false); setSearch(""); }}><span className="suggestion-thumb">{title.posterUrl ? <img src={title.posterUrl} alt={`${title.title} poster`} /> : title.title.slice(0, 1)}</span><span><strong>{title.title}</strong><small>{title.kind === "series" ? "TV series" : "Movie"}{title.releaseYear ? ` · ${title.releaseYear}` : ""}</small></span></Link>) : <span className="suggestion-note">No quick matches. Press Enter to search.</span>}
            </div>}
          </div>
          {theme.switchable && theme.toggleTheme && <button className="theme-toggle" type="button" aria-label={`Switch to ${theme.theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme.theme === "dark" ? "light" : "dark"} theme`} onClick={theme.toggleTheme}>{theme.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>}
          <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>
      {menuOpen && <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(link => <Link key={link.href} href={link.href} aria-current={route === link.href ? "page" : undefined}>{link.label}</Link>)}
      </nav>}
    </header>
  );
}

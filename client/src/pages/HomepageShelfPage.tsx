import { Link, useRoute } from "wouter";
import EmptyState from "@/components/EmptyState";
import { SiteLayout } from "@/components/SiteLayout";
import TitleCard from "@/components/TitleCard";
import { limitSeoHeading } from "@/lib/siteSeo";
import { trpc } from "@/lib/trpc";

export default function HomepageShelfPage() {
  const [, params] = useRoute("/shelf/:slug");
  const slug = params?.slug ?? "";
  const sectionsQuery = trpc.site.publicHomepageSections.useQuery(undefined, { enabled: Boolean(slug) });
  const catalogQuery = trpc.catalog.publicList.useQuery(undefined, { enabled: Boolean(slug) });
  const section = sectionsQuery.data?.find(item => item.slug === slug);
  const titles = (catalogQuery.data ?? []).filter(title => (title.homeSections ?? []).includes(slug));

  if (sectionsQuery.isLoading || catalogQuery.isLoading) return <SiteLayout><main className="site-container"><div className="empty-state" style={{ marginTop: 55 }}><p>Loading this AgaStream shelf…</p></div></main></SiteLayout>;
  if (!section) return <SiteLayout><main className="site-container" style={{ paddingTop: 40 }}><EmptyState title="Shelf not found" message="This public shelf may have been removed or hidden by the administrator." /><Link className="button-secondary" style={{ marginTop: 18 }} href="/">Back to the homepage</Link></main></SiteLayout>;

  return <SiteLayout><main className="site-container">
    <header className="page-header"><span className="eyebrow">AgaStream collection</span><h1 className="page-title">{limitSeoHeading(section.name)}</h1><p className="page-description">Explore every title selected for this collection.</p></header>
    {titles.length ? <div className="title-grid">{titles.map(title => <TitleCard key={title.id} title={title} />)}</div> : <EmptyState title="No titles in this shelf" message="The administrator may add titles to this collection soon." />}
  </main></SiteLayout>;
}

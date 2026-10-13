import { Mic2 } from "lucide-react";
import { Link } from "wouter";
import EmptyState from "@/components/EmptyState";
import { SiteLayout } from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";

export default function InterpretersPage() {
  const query = trpc.catalog.publicInterpreters.useQuery();
  const people = query.data ?? [];
  return <SiteLayout><main className="site-container">
    <header className="page-header"><span className="eyebrow">The voices behind the stories</span><h1 className="page-title">Interpreters</h1><p className="page-description">Meet the interpreters connected to the AgaStream catalog and explore their titles.</p></header>
    {query.isLoading ? <div className="empty-state"><p>Loading interpreter profiles…</p></div> : people.length ? <div className="interpreter-grid">{people.map(person => <Link key={person.id} className="interpreter-tile" href={`/interpreter/${encodeURIComponent(person.slug)}`}>
      <span className="interpreter-avatar">{person.photoUrl ? <img src={person.photoUrl} alt={`${person.name} interpreter portrait`} /> : <Mic2 size={18} aria-hidden="true" />}</span>
      <span className="interpreter-copy"><span className="interpreter-name">{person.name}</span><span className="interpreter-count">{person.titleCount} {person.titleCount === 1 ? "title" : "titles"} interpreted</span>{person.description && <span className="interpreter-description">{person.description}</span>}</span>
    </Link>)}</div> : <EmptyState title="Interpreter profiles will appear here" message="Create profiles in Admin Studio or add interpreters to catalog titles." />}
  </main></SiteLayout>;
}

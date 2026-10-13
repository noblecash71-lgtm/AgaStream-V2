import { Link } from "wouter";
import EmptyState from "@/components/EmptyState";
import { SiteLayout } from "@/components/SiteLayout";
import { trpc } from "@/lib/trpc";

export default function CategoriesPage() {
  const categoriesQuery = trpc.catalog.publicCategories.useQuery();
  const categories = categoriesQuery.data ?? [];
  return <SiteLayout><main className="site-container">
    <header className="page-header"><span className="eyebrow">Browse by mood</span><h1 className="page-title">Categories</h1><p className="page-description">From action to documentary, choose the kind of story you want to watch.</p></header>
    {categoriesQuery.isLoading ? <div className="empty-state"><p>Loading categories…</p></div> : categories.length ? <div className="category-grid">{categories.map((category, index) => <Link key={category.id} className="category-tile" href={`/category/${encodeURIComponent(category.slug)}`}><span className="category-mark">{["✦", "◈", "✳", "✧", "◇", "✺"][index % 6]}</span><div><div className="category-name">{category.name}</div><div className="category-count">{category.titleCount} {category.titleCount === 1 ? "title" : "titles"}</div></div></Link>)}</div> : <EmptyState title="Categories are being prepared" message="The administrator can add categories in Admin Studio." />}
  </main></SiteLayout>;
}

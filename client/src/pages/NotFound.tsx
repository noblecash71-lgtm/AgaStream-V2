import { Home } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <SiteLayout>
      <main className="site-container" style={{ paddingTop: 70, paddingBottom: 80 }}>
        <div className="empty-state">
          <span className="eyebrow">404 · Not found</span>
          <h1>That story isn’t here.</h1>
          <p>The page may have moved, or the title hasn’t been added to the catalog yet.</p>
          <button className="button-primary" style={{ marginTop: 18 }} onClick={handleGoHome}><Home size={14} /> Back to AgaStream</button>
        </div>
      </main>
    </SiteLayout>
  );
}

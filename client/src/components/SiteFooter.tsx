import { Link } from "wouter";
import { Facebook, Instagram, Mail, Phone, Youtube } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function SiteFooter() {
  const settingsQuery = trpc.site.publicSettings.useQuery();
  const settings = settingsQuery.data;
  const siteName = settings?.siteName || "AgaStream";
  const logoUrl = settings?.logoUrl || "/agastream-logo.png";
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="footer-grid">
          <div className="footer-brand-block">
            <Link href="/" className="footer-brand"><img src={logoUrl} alt={`${siteName} logo`} /><strong>{siteName.toUpperCase()}</strong></Link>
            <p className="footer-copy">{settings?.footerAbout || "Kinyarwanda-first film discovery, shaped by the interpreters who bring every story to life."}</p>
          </div>
          <div><h2 className="footer-heading">Explore</h2><div className="footer-links"><Link href="/movies">Movies</Link><Link href="/tv-series">TV Series</Link><Link href="/categories">Categories</Link></div></div>
          <div><h2 className="footer-heading">Community</h2><div className="footer-links"><Link href="/interpreters">Interpreters</Link>{settings?.email && <a href={`mailto:${settings.email}`}><Mail size={12} />{settings.email}</a>}{settings?.phone && <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}><Phone size={12} />{settings.phone}</a>}</div></div>
          <div><h2 className="footer-heading">Follow AgaStream</h2><div className="footer-links footer-socials">{settings?.youtubeUrl && <a href={settings.youtubeUrl} target="_blank" rel="noreferrer"><Youtube size={14} />YouTube</a>}{settings?.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noreferrer"><Instagram size={14} />Instagram</a>}{settings?.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noreferrer"><Facebook size={14} />Facebook</a>}{!settings?.youtubeUrl && !settings?.instagramUrl && !settings?.facebookUrl && <span>Stories worth sharing.</span>}</div></div>
        </div>
        <div className="footer-bottom"><span>© {settings?.footerYear || new Date().getFullYear()} {siteName}{settings?.copyrightText ? ` · ${settings.copyrightText}` : ""}</span><span>Share only media you have permission to distribute.</span></div>
      </div>
    </footer>
  );
}

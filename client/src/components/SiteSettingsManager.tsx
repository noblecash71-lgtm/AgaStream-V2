import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { PublicSiteSettings } from "@/lib/catalogTypes";
import { trpc } from "@/lib/trpc";
import MediaUpload from "@/components/MediaUpload";

type SettingsForm = {
  siteName: string;
  pageTitle: string;
  logoUrl: string;
  faviconUrl: string;
  footerYear: string;
  footerAbout: string;
  phone: string;
  email: string;
  youtubeUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  copyrightText: string;
};

const defaults: SettingsForm = {
  siteName: "AgaStream",
  pageTitle: "AgaStream | Movies and Series",
  logoUrl: "/agastream-logo.png",
  faviconUrl: "/favicon.png",
  footerYear: String(new Date().getFullYear()),
  footerAbout: "Kinyarwanda-first film discovery, shaped by the interpreters who bring every story to life.",
  phone: "",
  email: "",
  youtubeUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  copyrightText: "NobleCash Group",
};

function fromSettings(settings: PublicSiteSettings): SettingsForm {
  return {
    siteName: settings.siteName,
    pageTitle: settings.pageTitle,
    logoUrl: settings.logoUrl ?? "",
    faviconUrl: settings.faviconUrl ?? "",
    footerYear: settings.footerYear,
    footerAbout: settings.footerAbout ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    youtubeUrl: settings.youtubeUrl ?? "",
    instagramUrl: settings.instagramUrl ?? "",
    facebookUrl: settings.facebookUrl ?? "",
    copyrightText: settings.copyrightText ?? "",
  };
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div className="form-field"><label>{label}</label>{children}{hint && <span className="form-hint">{hint}</span>}</div>;
}

export default function SiteSettingsManager() {
  const query = trpc.site.publicSettings.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<SettingsForm>(defaults);
  useEffect(() => { if (query.data) setForm(fromSettings(query.data)); }, [query.data]);

  const save = trpc.site.saveSettings.useMutation({
    onSuccess: async () => {
      await utils.site.publicSettings.invalidate();
      toast.success("Site settings updated for all visitors");
    },
    onError: error => toast.error(error.message),
  });
  const set = (key: keyof SettingsForm, value: string) => setForm(previous => ({ ...previous, [key]: value }));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate({
      siteName: form.siteName.trim(),
      pageTitle: form.pageTitle.trim(),
      logoUrl: form.logoUrl.trim() || null,
      faviconUrl: form.faviconUrl.trim() || null,
      footerYear: form.footerYear.trim(),
      footerAbout: form.footerAbout.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      youtubeUrl: form.youtubeUrl.trim() || null,
      instagramUrl: form.instagramUrl.trim() || null,
      facebookUrl: form.facebookUrl.trim() || null,
      copyrightText: form.copyrightText.trim() || null,
    });
  }

  if (query.isLoading) return <section className="admin-panel"><div className="empty-state"><p>Loading shared site settings…</p></div></section>;
  if (query.isError) return <section className="admin-panel"><div className="empty-state"><h3>Settings unavailable</h3><p>Check database readiness and refresh Admin Studio.</p></div></section>;

  return <section className="admin-panel settings-panel">
    <div className="panel-head"><div><h2>Public site settings</h2><p>Changes are saved centrally and appear to every visitor and device.</p></div></div>
    <form onSubmit={submit}>
      <div className="settings-form-grid">
        <Field label="Site name"><input className="text-control" required maxLength={120} value={form.siteName} onChange={event => set("siteName", event.target.value)} /></Field>
        <Field label="Browser page title"><input className="text-control" required maxLength={180} value={form.pageTitle} onChange={event => set("pageTitle", event.target.value)} /></Field>
        <Field label="Header logo URL" hint="Paste a secure image URL or upload a logo. The default uses the supplied AgaStream logo."><input className="text-control" type="text" maxLength={2048} value={form.logoUrl} onChange={event => set("logoUrl", event.target.value)} placeholder="/agastream-logo.png or https://…" /><MediaUpload purpose="logo" label="header logo" onUploaded={url => set("logoUrl", url)} /></Field>
        <Field label="Browser icon (favicon) URL" hint="Paste a secure image URL or upload a small site icon."><input className="text-control" type="text" maxLength={2048} value={form.faviconUrl} onChange={event => set("faviconUrl", event.target.value)} placeholder="/favicon.png or https://…" /><MediaUpload purpose="favicon" label="favicon" onUploaded={url => set("faviconUrl", url)} /></Field>
        <Field label="Footer year"><input className="text-control" maxLength={8} value={form.footerYear} onChange={event => set("footerYear", event.target.value)} /></Field>
        <Field label="Copyright / publisher"><input className="text-control" maxLength={180} value={form.copyrightText} onChange={event => set("copyrightText", event.target.value)} placeholder="NobleCash Group" /></Field>
        <Field label="Footer description"><textarea className="textarea-control" maxLength={10000} value={form.footerAbout} onChange={event => set("footerAbout", event.target.value)} /></Field>
        <div className="settings-contact-grid">
          <Field label="Contact phone"><input className="text-control" type="tel" maxLength={80} value={form.phone} onChange={event => set("phone", event.target.value)} placeholder="+250…" /></Field>
          <Field label="Contact email"><input className="text-control" type="email" maxLength={320} value={form.email} onChange={event => set("email", event.target.value)} placeholder="info@example.com" /></Field>
        </div>
        <Field label="YouTube profile URL"><input className="text-control" type="text" maxLength={2048} value={form.youtubeUrl} onChange={event => set("youtubeUrl", event.target.value)} placeholder="https://youtube.com/@…" /></Field>
        <Field label="Instagram profile URL"><input className="text-control" type="text" maxLength={2048} value={form.instagramUrl} onChange={event => set("instagramUrl", event.target.value)} placeholder="https://instagram.com/…" /></Field>
        <Field label="Facebook page URL"><input className="text-control" type="text" maxLength={2048} value={form.facebookUrl} onChange={event => set("facebookUrl", event.target.value)} placeholder="https://facebook.com/…" /></Field>
      </div>
      <div className="settings-form-actions"><span className="form-hint">This editor controls public branding and footer information—not sign-in, administrator access, or project security.</span><button className="button-primary" type="submit" disabled={save.isPending}><Save size={14} />{save.isPending ? "Saving…" : "Save settings"}</button></div>
    </form>
  </section>;
}

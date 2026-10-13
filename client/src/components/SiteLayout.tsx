import { createContext, useContext, type ReactNode } from "react";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const SiteAdminContext = createContext(false);
export function useSiteAdminAccess() { return useContext(SiteAdminContext); }

export function SiteLayout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const adminStatus = trpc.auth.adminStatus.useQuery(undefined, { enabled: auth.isAuthenticated, retry: false });
  return <SiteAdminContext.Provider value={adminStatus.data === true}><div className="site-shell"><SiteHeader />{children}<SiteFooter /></div></SiteAdminContext.Provider>;
}

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import AdminStudio from "./pages/AdminStudio";
import BrowsePage from "./pages/BrowsePage";
import CategoriesPage from "./pages/CategoriesPage";
import Home from "./pages/Home";
import HomepageShelfPage from "./pages/HomepageShelfPage";
import InterpretersPage from "./pages/InterpretersPage";
import NotFound from "./pages/NotFound";
import TitleDetail from "./pages/TitleDetail";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Route, Switch } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/movies">
        <BrowsePage kind="movie" />
      </Route>
      <Route path="/tv-series">
        <BrowsePage kind="series" />
      </Route>
      <Route path="/categories" component={CategoriesPage} />
      <Route path="/category/:slug">
        <BrowsePage kind="category" />
      </Route>
      <Route path="/shelf/:slug" component={HomepageShelfPage} />
      <Route path="/interpreters" component={InterpretersPage} />
      <Route path="/interpreter/:slug">
        <BrowsePage kind="interpreter" />
      </Route>
      <Route path="/title/:slug" component={TitleDetail} />
      <Route path="/admin-panel" component={AdminStudio} />
      <Route path="/admin" component={AdminStudio} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster theme="dark" richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

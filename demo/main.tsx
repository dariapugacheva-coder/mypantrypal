import { createRoot } from "react-dom/client";
import { useEffect, type ReactNode } from "react";
import { AppProviders } from "@/components/providers/AppProviders";
import { usePath, useNav } from "@/lib/nav";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ProtectedApp, Splash } from "@/components/layout/Guards";
import { LoginView, SignupView, ResetPasswordView } from "@/components/views/AuthViews";
import { OnboardingView } from "@/components/views/OnboardingView";
import { HomeView } from "@/components/views/HomeView";
import { FridgeView } from "@/components/views/FridgeView";
import { CookView } from "@/components/views/CookView";
import { RecipeView } from "@/components/views/RecipeView";
import { ShopView } from "@/components/views/ShopView";
import { ProgressView } from "@/components/views/ProgressView";
import { ProfileView } from "@/components/views/ProfileView";
import { SettingsView } from "@/components/views/SettingsView";
import { NotificationsView, HelpView } from "@/components/views/InfoViews";

const APP: Record<string, () => ReactNode> = {
  "/home": () => <HomeView />, "/fridge": () => <FridgeView />, "/cook": () => <CookView />, "/shop": () => <ShopView />,
  "/progress": () => <ProgressView />, "/profile": () => <ProfileView />, "/settings": () => <SettingsView />,
  "/notifications": () => <NotificationsView />, "/help": () => <HelpView />
};

function Index() {
  const { status } = useAuth();
  const nav = useNav();
  useEffect(() => { if (status !== "loading") nav.replace(status === "signed-in" ? "/home" : "/login"); }, [status, nav]);
  return <Splash label="Loading" />;
}

function Router() {
  const path = usePath();
  if (path === "/login") return <LoginView />;
  if (path === "/signup") return <SignupView />;
  if (path === "/reset-password") return <ResetPasswordView />;
  if (path === "/onboarding") return <OnboardingView />;
  if (path.startsWith("/cook/")) return <ProtectedApp key={path}><RecipeView /></ProtectedApp>;
  const view = APP[path];
  if (view) return <ProtectedApp>{view()}</ProtectedApp>;
  return <Index />;
}

createRoot(document.getElementById("root")!).render(<AppProviders><Router /></AppProviders>);

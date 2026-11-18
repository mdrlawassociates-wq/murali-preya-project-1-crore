"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";
import { api } from "@/lib/client";
import type { AuthUser, Member } from "@/lib/types";
import { AppContext, type AppContextValue, type QuickAddDefaults } from "./AppContext";
import { TransactionDialog } from "./TransactionDialog";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/loans", label: "Loans", icon: Landmark },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/members", label: "People", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

const titles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Where the money went this month" },
  "/transactions": { title: "Transactions", subtitle: "Every entry, in one ledger" },
  "/loans": { title: "Loans", subtitle: "What you owe and what is owed to you" },
  "/budgets": { title: "Budgets", subtitle: "Monthly limits and how you are tracking" },
  "/members": { title: "People", subtitle: "Who each entry belongs to" },
  "/settings": { title: "Settings", subtitle: "Household and account details" },
};

interface Props {
  user: AuthUser;
  members: Member[];
  children: React.ReactNode;
}

interface Toast {
  message: string;
  tone: "success" | "error";
  id: number;
}

export function AppShell({ user, members, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [quickAdd, setQuickAdd] = useState<{ defaults: QuickAddDefaults } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const notify = useCallback((message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const openQuickAdd = useCallback((defaults: QuickAddDefaults = {}) => {
    setQuickAdd({ defaults });
  }, []);

  const contextValue = useMemo<AppContextValue>(
    () => ({
      openQuickAdd,
      notify,
      members,
      currentUserId: user.id,
    }),
    [openQuickAdd, notify, members, user.id],
  );

  async function signOut() {
    setSigningOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      notify("Could not sign out. Try again.", "error");
      setSigningOut(false);
    }
  }

  const heading = titles[pathname] ?? titles["/dashboard"]!;

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-frame">
        <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="brand__text">
              <strong>Murali Preya project 1 Crore</strong>
              <small>{user.household.name}</small>
            </span>
            <button
              className="icon-btn sidebar__close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="sidebar__nav" aria-label="Main navigation">
            <p className="nav-label">Ledger</p>
            {navigation.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "nav-link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </a>
              );
            })}
            <p className="nav-label nav-label--gap">Household</p>
            {navigation.slice(4).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${active ? "nav-link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="sidebar__footer">
            <div className="identity">
              <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="identity__text">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </span>
            </div>
            <button className="signout" onClick={signOut} disabled={signingOut}>
              <LogOut size={16} /> {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        {menuOpen && (
          <button
            className="sidebar-scrim"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <div className="app-content">
          <header className="topbar">
            <div className="topbar__left">
              <button
                className="icon-btn topbar__menu"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1>{heading.title}</h1>
                <p>{heading.subtitle}</p>
              </div>
            </div>
            <button className="btn btn--primary topbar__add" onClick={() => openQuickAdd()}>
              <Plus size={17} /> Add entry
            </button>
          </header>

          <main className="page">{children}</main>
        </div>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={active ? "mobile-nav__item mobile-nav__item--active" : "mobile-nav__item"}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <TransactionDialog
          open={quickAdd !== null}
          onClose={() => setQuickAdd(null)}
          members={members}
          currentUserId={user.id}
          defaults={quickAdd?.defaults}
          notify={notify}
        />

        {toast && (
          <div className={`toast toast--${toast.tone}`} role="status" key={toast.id}>
            {toast.message}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}

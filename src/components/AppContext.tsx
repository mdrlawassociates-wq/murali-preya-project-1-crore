"use client";

import { createContext, useContext } from "react";
import type { Member, TxType } from "@/lib/types";

export interface QuickAddDefaults {
  type?: TxType;
  category?: string;
  occurredOn?: string;
  memberId?: string;
}

export interface AppContextValue {
  openQuickAdd: (defaults?: QuickAddDefaults) => void;
  notify: (message: string, tone?: "success" | "error") => void;
  members: Member[];
  currentUserId: string;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppShell");
  return value;
}

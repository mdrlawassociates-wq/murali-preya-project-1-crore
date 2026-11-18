"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "@/lib/dates";

export function MonthSwitcher({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function go(delta: number) {
    router.push(`${pathname}?month=${shiftMonth(month, delta)}`);
  }

  return (
    <div className="month-switcher">
      <button onClick={() => go(-1)} aria-label="Previous month">
        <ChevronLeft size={16} />
      </button>
      <span>{monthLabel(month)}</span>
      <button onClick={() => go(1)} aria-label="Next month">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

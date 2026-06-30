import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export type NavSection = {
  group: string;
  items: { id: string; label: string }[];
};

interface SidebarProps {
  firmName: string;
  tagline?: string | null;
  activeId: string;
  onSelect: (id: string) => void;
  sections: NavSection[];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function Sidebar({ firmName, tagline, activeId, onSelect, sections }: SidebarProps) {
  const [, setLocation] = useLocation();
  const initials = getInitials(firmName);

  return (
    <aside className="hidden lg:flex w-72 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Firm identity */}
      <button
        onClick={() => setLocation("/")}
        className="text-left px-7 pt-8 pb-7 border-b border-sidebar-border hover:opacity-90 transition-opacity"
        data-testid="sidebar-firm"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-shell-accent text-shell-accent-foreground flex items-center justify-center font-semibold text-[13px] tracking-wide shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="text-eyebrow text-shell-accent mb-1.5">Detailed Project Report</div>
            <div className="font-display text-[16px] leading-[1.2] text-sidebar-heading line-clamp-2" title={firmName}>
              {firmName}
            </div>
            {tagline && (
              <div className="text-[12px] text-sidebar-foreground/55 mt-1.5 line-clamp-2 leading-snug">
                {tagline}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Grouped nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        {sections.map((group) => (
          <div key={group.group || "_default"}>
            {group.group && (
              <div className="text-eyebrow text-sidebar-foreground/40 px-3 mb-2.5">
                {group.group}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    data-testid={`nav-${item.id}`}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-[13.5px] font-medium transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/65 hover:text-sidebar-heading hover:bg-sidebar-foreground/5"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer mark */}
      <div className="px-7 py-5 border-t border-sidebar-border">
        <div className="text-eyebrow text-sidebar-foreground/40 mb-1">Prepared by</div>
        <div className="font-display text-[15px] text-sidebar-heading">Finvois AI</div>
      </div>
    </aside>
  );
}

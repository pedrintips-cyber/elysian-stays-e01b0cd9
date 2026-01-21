import * as React from "react";
import { House, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavKey = "home" | "search";

const items: Array<{ key: NavKey; label: string; Icon: React.ComponentType<{ className?: string }>; path: string }> = [
  { key: "home", label: "Início", Icon: House, path: "/" },
  { key: "search", label: "Buscar", Icon: Search, path: "/?search=true" },
];

interface BottomNavAirProps {
  activeKey?: NavKey;
}

export function BottomNavAir({ activeKey = "home" }: BottomNavAirProps) {
  const [active, setActive] = React.useState<NavKey>(activeKey);
  const navigate = useNavigate();

  React.useEffect(() => {
    setActive(activeKey);
  }, [activeKey]);

  const handleNavClick = (key: NavKey, path: string) => {
    setActive(key);
    navigate(path);
  };

  return (
    <nav
      aria-label="Navegação inferior"
      className={cn(
        "safe-pb fixed inset-x-0 bottom-0 z-50",
        "border-t bg-surface/85 backdrop-blur-xl shadow-nav",
      )}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-3 pb-2 pt-2">
        {items.map(({ key, label, Icon, path }) => {
          const isActive = active === key;
          return (
            <Button
              key={key}
              type="button"
              variant="nav"
              size="nav"
              aria-current={isActive ? "page" : undefined}
              onClick={() => handleNavClick(key, path)}
              className={cn(
                "flex flex-col gap-1 rounded-2xl px-2",
                "transition-transform duration-200 active:scale-[0.98]",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center",
                  isActive ? "animate-nav-pop text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-[22px] w-[22px]", isActive ? "stroke-[1.8]" : "stroke-[1.6]")} />
              </span>
              <span
                className={cn(
                  "text-[11px] leading-none",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

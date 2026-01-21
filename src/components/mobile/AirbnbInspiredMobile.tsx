import * as React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

import { AmbientGlow } from "./AmbientGlow";
import { BottomNavAir } from "./BottomNavAir";
import { Listing, ListingCardAir } from "./ListingCardAir";

export default function AirbnbInspiredMobile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [geoCities, setGeoCities] = React.useState<string[] | null>(null);
  const [geoStateLabel, setGeoStateLabel] = React.useState<string | null>(null);
  const [geoPromptDismissed, setGeoPromptDismissed] = React.useState<boolean>(() => {
    return localStorage.getItem("geo_prompt_dismissed") === "1";
  });
  const [geoLoading, setGeoLoading] = React.useState(false);

  const showFavorites = searchParams.get("favorites") === "true";
  const showSearch = searchParams.get("search") === "true";

  const activeNavKey = showSearch ? "search" : "home";

  React.useEffect(() => {
    fetchListings();
  }, [showFavorites, query, geoCities]);

  React.useEffect(() => {
    // Prompt once (only on home explore view)
    if (showFavorites) return;
    if (showSearch) return;
    if (geoPromptDismissed) return;
    if (geoCities) return;

    // Don't auto-prompt if the browser doesn't support geolocation
    if (!("geolocation" in navigator)) {
      setGeoPromptDismissed(true);
      localStorage.setItem("geo_prompt_dismissed", "1");
    }
  }, [geoCities, geoPromptDismissed, showFavorites, showSearch]);

  const stateToCities = (state?: string | null): string[] | null => {
    if (!state) return null;
    const s = state.toLowerCase();
    if (s.includes("bahia")) return ["Salvador"]; // BA
    if (s.includes("pernambuco")) return ["Recife", "Olinda"]; // PE
    if (s.includes("são paulo") || s.includes("sao paulo")) return ["São Paulo"]; // SP
    if (s.includes("rio de janeiro")) return ["Rio de Janeiro"]; // RJ
    if (s.includes("minas gerais")) return ["Belo Horizonte"]; // MG
    if (s.includes("ceará") || s.includes("ceara")) return ["Fortaleza"]; // CE
    if (s.includes("espírito santo") || s.includes("espirito santo")) return ["Vitória", "Vitoria"]; // ES
    if (s.includes("santa catarina")) return ["Florianópolis", "Florianopolis"]; // SC
    return null;
  };

  const enableLocation = async () => {
    if (!("geolocation" in navigator)) {
      setGeoPromptDismissed(true);
      localStorage.setItem("geo_prompt_dismissed", "1");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          // Reverse geocoding via OpenStreetMap Nominatim (no API key).
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                "Accept": "application/json",
              },
            },
          );
          const json = await res.json();
          const state: string | null = json?.address?.state ?? null;

          const mapped = stateToCities(state);
          if (mapped?.length) {
            setGeoCities(mapped);
            setGeoStateLabel(state || null);
          } else {
            setGeoCities(null);
            setGeoStateLabel(state || null);
          }

          setGeoPromptDismissed(true);
          localStorage.setItem("geo_prompt_dismissed", "1");
        } catch (e) {
          console.warn("Falha ao resolver localização:", e);
          setGeoPromptDismissed(true);
          localStorage.setItem("geo_prompt_dismissed", "1");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        console.warn("Permissão de localização negada/erro:", err);
        setGeoPromptDismissed(true);
        localStorage.setItem("geo_prompt_dismissed", "1");
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const dismissLocation = () => {
    setGeoPromptDismissed(true);
    localStorage.setItem("geo_prompt_dismissed", "1");
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      // Manual search has priority
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike("city", `%${query}%`);
      } else if (geoCities?.length) {
        // Geo filter (auto)
        queryBuilder = queryBuilder.in("city", geoCities);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error("Erro ao buscar propriedades:", error);
      } else {
        setListings(
          data.map((p) => ({
            id: p.id,
            title: p.title,
            subtitle: p.city,
            rating: p.rating,
            price: `R$ ${p.price_per_night.toFixed(0)} / noite`,
            imageSrc: p.image_url,
            isFavorite: false,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="relative mx-auto min-h-dvh max-w-md overflow-hidden">
        <AmbientGlow />

        <header
          className={cn(
            "sticky top-0 z-40",
            "glass border-b",
          )}
        >
          <div className="px-4 pb-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12px] font-medium text-muted-foreground">
                  Explore
                </span>
                <span className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                  stay
                </span>
              </div>
            </div>

            {!showFavorites && !showSearch && !geoPromptDismissed && (
              <div className="mt-3 rounded-3xl border bg-surface px-4 py-3 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">
                      Quer ver casas perto de você?
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                      Se você permitir a localização, eu filtro automaticamente pela sua região.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Fechar"
                    className="h-9 w-9"
                    onClick={dismissLocation}
                  >
                    ×
                  </Button>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="default"
                    className="rounded-2xl"
                    onClick={enableLocation}
                    disabled={geoLoading}
                  >
                    {geoLoading ? "Ativando..." : "Ativar localização"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={dismissLocation}
                  >
                    Agora não
                  </Button>
                </div>
              </div>
            )}

            {!showFavorites && !showSearch && geoCities?.length ? (
              <div className="mt-3 flex items-center justify-between rounded-3xl border bg-surface px-4 py-3 shadow-soft">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-muted-foreground">Mostrando sua região</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-foreground truncate">
                    {geoStateLabel || geoCities.join(", ")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => setGeoCities(null)}
                >
                  Limpar
                </Button>
              </div>
            ) : null}

            {!showFavorites && (
              <div className="mt-4 flex items-center gap-3">
              <div className="flex-1">
                <label className="sr-only" htmlFor="search">
                  Buscar
                </label>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-full border bg-surface px-4 py-3 shadow-elev",
                  )}
                >
                  <Search className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
                  <input
                    id="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={cn(
                      "w-full bg-transparent text-[14px] font-medium text-foreground",
                      "placeholder:text-muted-foreground focus:outline-none",
                    )}
                    placeholder="Buscar por cidade..."
                  />
                </div>
              </div>

              <Button
                variant="pill"
                size="icon"
                aria-label="Filtros"
                className="h-12 w-12"
              >
                <SlidersHorizontal className="h-5 w-5" strokeWidth={1.7} />
              </Button>
            </div>
            )}
          </div>
        </header>

        <main className="relative px-4 pb-28 pt-4">
          <h1 className="sr-only">
            Propriedades disponíveis
          </h1>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando...
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {query
                  ? "Nenhuma propriedade encontrada"
                  : "Nenhuma propriedade disponível"}
              </p>
            </div>
          ) : (
            <section aria-label="Anúncios" className="space-y-5">
            {listings.map((l, idx) => (
              <div key={l.id} className={cn("animate-fade-up", idx === 0 && "")}
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <ListingCardAir listing={l} />
              </div>
            ))}
          </section>
          )}
        </main>

        <BottomNavAir activeKey={activeNavKey} />
      </div>
    </div>
  );
}

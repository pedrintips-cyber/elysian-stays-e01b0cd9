import * as React from "react";
import { Search, SlidersHorizontal, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { AmbientGlow } from "./AmbientGlow";
import { BottomNavAir } from "./BottomNavAir";
import { Listing, ListingCardAir } from "./ListingCardAir";

export default function AirbnbInspiredMobile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = React.useState("");
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());

  const showFavorites = searchParams.get("favorites") === "true";
  const showSearch = searchParams.get("search") === "true";

  const activeNavKey = showFavorites ? "wishlists" : showSearch ? "search" : "home";

  React.useEffect(() => {
    fetchListings();
    if (user) {
      fetchFavorites();
    }
  }, [showFavorites, query, user]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (showFavorites && user) {
        const { data: favData } = await supabase
          .from("favorites")
          .select("property_id")
          .eq("user_id", user.id);

        const favIds = favData?.map((f) => f.property_id) || [];
        if (favIds.length > 0) {
          queryBuilder = queryBuilder.in("id", favIds);
        } else {
          setListings([]);
          setLoading(false);
          return;
        }
      }

      if (query.trim()) {
        queryBuilder = queryBuilder.ilike("city", `%${query}%`);
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
            isFavorite: favorites.has(p.id),
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select("property_id")
      .eq("user_id", user.id);

    if (data) {
      setFavorites(new Set(data.map((f) => f.property_id)));
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
                  {showFavorites ? "Meus" : "Explore"}
                </span>
                <span className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
                  {showFavorites ? "favoritos" : "stay"}
                </span>
              </div>

              <Button
                type="button"
                variant="pill"
                size="icon"
                aria-label={user ? "Abrir perfil" : "Entrar"}
                className="h-11 w-11 overflow-hidden"
                onClick={() => navigate(user ? "/profile" : "/auth")}
              >
                {user ? (
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-[12px]">
                      {(user.email?.split("@")[0].slice(0, 2).toUpperCase() || "U")}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <User className="h-5 w-5" strokeWidth={1.7} />
                )}
              </Button>
            </div>

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
            {showFavorites ? "Seus favoritos" : "Propriedades disponíveis"}
          </h1>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando...
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {showFavorites
                  ? "Nenhum favorito ainda"
                  : query
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
                <ListingCardAir 
                  listing={{ ...l, isFavorite: favorites.has(l.id) }} 
                  onFavoriteToggle={fetchFavorites}
                />
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

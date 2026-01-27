import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
 import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Users, Bed, Bath } from "lucide-react";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
 
 interface Property {
   id: string;
   title: string;
   city: string;
   price_per_night: number;
   rating: number;
   image_url: string;
   description: string;
   bedrooms: number;
   bathrooms: number;
   guests: number;
   amenities: string[];
 }

type PropertyPhoto = {
  url: string;
  sort_order: number;
};
 
 export default function PropertyDetail() {
   const { id } = useParams();
   const navigate = useNavigate();
   const [property, setProperty] = useState<Property | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<PropertyPhoto[]>([]);
   const [loading, setLoading] = useState(true);

  const handleBack = () => {
    // If the user landed directly on this URL, there may be no SPA history to go back to.
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };
 
  useEffect(() => {
    if (!id) return;
    fetchProperty();
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
 
   const fetchProperty = async () => {
     const { data, error } = await supabase
       .from("properties")
       .select("*")
       .eq("id", id)
       .single();
 
     if (error) {
       console.error("Erro ao buscar propriedade:", error);
     } else {
       setProperty(data);
     }
     setLoading(false);
   };

  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from("property_photos")
      .select("url, sort_order")
      .eq("property_id", id)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Erro ao buscar fotos do álbum:", error);
      setAlbumPhotos([]);
      return;
    }

    setAlbumPhotos((data ?? []) as PropertyPhoto[]);
  };

  const galleryUrls = useMemo(() => {
    if (!property) return [] as string[];
    const cover = property.image_url ? [property.image_url] : [];
    const extras = (albumPhotos ?? []).map((p) => p.url).filter(Boolean);
    // evita duplicar a capa caso ela também esteja no álbum
    const uniq = Array.from(new Set([...cover, ...extras]));
    return uniq.length ? uniq : cover;
  }, [property, albumPhotos]);
 
   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="text-muted-foreground">Carregando...</div>
       </div>
     );
   }
 
   if (!property) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="text-center">
           <p className="text-muted-foreground mb-4">Propriedade não encontrada</p>
           <Button onClick={() => navigate("/")}>Voltar</Button>
         </div>
       </div>
     );
   }
 
   return (
    <div className="min-h-dvh bg-background">
      <div className="relative mx-auto min-h-dvh max-w-md overflow-hidden">
        <div className="relative">
            <Carousel
              className="relative"
              opts={{ loop: true, align: "start" }}
            >
              <CarouselContent className="ml-0">
                {(galleryUrls.length ? galleryUrls : [property.image_url]).map((url, idx) => (
                  <CarouselItem key={`${url}-${idx}`} className="pl-0">
                    <img
                      src={url}
                      alt={`${property.title} — foto ${idx + 1}`}
                      loading={idx === 0 ? "eager" : "lazy"}
                      className="h-[420px] w-full object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>

            </Carousel>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/60 to-transparent" />

          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <Button
              onClick={handleBack}
              variant="pill"
              size="icon"
              className="pointer-events-auto"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.7} />
            </Button>
          </div>
        </div>

        <main className="px-4 pb-32 pt-5">
          <header className="space-y-2">
            <h1 className="text-[26px] font-semibold leading-[1.08] tracking-[-0.02em]">
              {property.title}
            </h1>

            <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-medium text-foreground">{property.rating}</span>
              </div>
              <span aria-hidden="true">•</span>
              <span>{property.city}</span>
            </div>
          </header>

          <section className="mt-5 grid grid-cols-3 gap-2 rounded-3xl border bg-surface p-3 shadow-elev">
            <div className="rounded-2xl bg-surface-2 px-3 py-2 text-left">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Hóspedes</span>
              </div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{property.guests}</div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-3 py-2 text-left">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Bed className="h-4 w-4" />
                <span>Quartos</span>
              </div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{property.bedrooms}</div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-3 py-2 text-left">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Bath className="h-4 w-4" />
                <span>Banheiros</span>
              </div>
              <div className="mt-1 text-[14px] font-semibold text-foreground">{property.bathrooms}</div>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border bg-surface p-4 shadow-soft">
            <h2 className="text-[15px] font-semibold text-foreground">Sobre este lugar</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {property.description || "Sem descrição no momento. Em breve, mais detalhes sobre o espaço."}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-[15px] font-semibold text-foreground">Comodidades</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(property.amenities?.length ? property.amenities : ["Wi‑Fi", "Cozinha", "Ar‑condicionado"]).map(
                (amenity, index) => (
                  <Badge key={index} variant="secondary" className="rounded-full">
                    {amenity}
                  </Badge>
                ),
              )}
            </div>
          </section>
        </main>

        <aside
          className={cn(
            "safe-pb fixed inset-x-0 bottom-0 z-50",
            "border-t bg-surface/85 backdrop-blur-xl shadow-nav",
          )}
        >
          <div className="mx-auto max-w-md px-4 pb-3 pt-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-muted-foreground">Preço por noite</div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">
                    R$ {property.price_per_night.toFixed(0)}
                  </span>
                  <span className="text-[12px] text-muted-foreground">/ noite</span>
                </div>
              </div>

              <Button
                size="lg"
                className="h-12 rounded-2xl px-6"
                onClick={() => navigate(`/checkout?property=${property.id}`)}
              >
                Reservar
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
   );
 }
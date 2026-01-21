import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

export type Listing = {
  id: string;
  title: string;
  subtitle: string;
  rating: number;
  price: string;
  imageSrc: string;
};

export function ListingCardAir({ 
  listing, 
  className
}: { 
  listing: Listing; 
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <article
      onClick={() => navigate(`/property/${listing.id}`)}
      className={cn(
        "overflow-hidden rounded-3xl border bg-card shadow-soft",
        "transition-transform duration-300 will-change-transform",
        "hover:-translate-y-0.5 cursor-pointer",
        className,
      )}
    >
      <div className="relative">
        <img
          src={listing.imageSrc}
          alt={`Foto do anúncio: ${listing.title}`}
          loading="lazy"
          className="h-56 w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/10 via-transparent to-transparent" />
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-foreground">
              {listing.title}
            </h2>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{listing.subtitle}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface/80 px-2 py-1 shadow-elev">
            <Star className="h-4 w-4 text-primary" strokeWidth={1.8} />
            <span className="text-[13px] font-medium tabular-nums text-foreground">{listing.rating.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[14px] text-muted-foreground">A partir de</p>
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{listing.price}</p>
        </div>
      </div>
    </article>
  );
}

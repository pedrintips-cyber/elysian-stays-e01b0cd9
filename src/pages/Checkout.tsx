 import { useEffect, useState } from "react";
 import { useNavigate, useSearchParams } from "react-router-dom";
 import { supabase } from "@/lib/supabase";
 import { useAuth } from "@/hooks/useAuth";
 import { useToast } from "@/hooks/use-toast";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Slider } from "@/components/ui/slider";
 import { ArrowLeft, Calendar, DollarSign, Loader2 } from "lucide-react";
 
 interface Property {
   id: string;
   title: string;
   city: string;
   price_per_night: number;
   image_url: string;
 }
 
 export default function Checkout() {
   const [searchParams] = useSearchParams();
   const navigate = useNavigate();
   const { user } = useAuth();
   const { toast } = useToast();
 
   const propertyId = searchParams.get("property");
 
   const [property, setProperty] = useState<Property | null>(null);
   const [nights, setNights] = useState(1);
   const [guestName, setGuestName] = useState("");
   const [guestEmail, setGuestEmail] = useState(user?.email || "");
   const [guestPhone, setGuestPhone] = useState("");
   const [loading, setLoading] = useState(true);
   const [submitting, setSubmitting] = useState(false);
 
   useEffect(() => {
     if (!user) {
       toast({
         variant: "destructive",
         title: "Login necessário",
         description: "Faça login para continuar com a reserva",
       });
       navigate("/auth");
       return;
     }
 
     if (!propertyId) {
       toast({
         variant: "destructive",
         title: "Propriedade não informada",
       });
       navigate("/");
       return;
     }
 
     fetchProperty();
   }, [propertyId, user]);
 
   const fetchProperty = async () => {
     const { data, error } = await supabase
       .from("properties")
       .select("id, title, city, price_per_night, image_url")
       .eq("id", propertyId)
       .maybeSingle();
 
     if (error || !data) {
       toast({
         variant: "destructive",
         title: "Erro ao carregar propriedade",
       });
       navigate("/");
     } else {
       setProperty(data);
     }
     setLoading(false);
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
     if (!property || !user) return;
 
     setSubmitting(true);
 
     const totalPrice = property.price_per_night * nights;
 
     const { error } = await supabase.from("bookings").insert({
       user_id: user.id,
       property_id: property.id,
       nights,
       price_per_night: property.price_per_night,
       total_price: totalPrice,
       guest_name: guestName || user.email?.split("@")[0] || "Hóspede",
       guest_email: guestEmail || user.email || "",
       guest_phone: guestPhone,
     });
 
     setSubmitting(false);
 
     if (error) {
       console.error("Erro ao criar reserva:", error);
       toast({
         variant: "destructive",
         title: "Erro ao criar reserva",
         description: error.message,
       });
     } else {
       toast({
         title: "Reserva confirmada!",
         description: `Você reservou ${nights} diária(s) em ${property.city}`,
       });
       navigate("/");
     }
   };
 
   if (loading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   if (!property) return null;
 
   const total = property.price_per_night * nights;
 
   return (
     <div className="min-h-dvh bg-background">
       <div className="relative mx-auto min-h-dvh max-w-md">
         <header className="sticky top-0 z-40 glass border-b">
           <div className="px-4 py-4 flex items-center gap-3">
             <Button
               type="button"
               variant="pill"
               size="icon"
               onClick={() => navigate(-1)}
               aria-label="Voltar"
             >
               <ArrowLeft className="h-5 w-5" strokeWidth={1.7} />
             </Button>
             <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">
               Finalizar reserva
             </h1>
           </div>
         </header>
 
         <main className="px-4 pb-8 pt-6 space-y-6">
           <Card className="overflow-hidden shadow-soft">
             <div className="flex gap-4 p-4">
               <img
                 src={property.image_url}
                 alt={property.title}
                 className="h-20 w-20 rounded-2xl object-cover"
               />
               <div className="min-w-0 flex-1">
                 <h2 className="text-[15px] font-semibold text-foreground truncate">
                   {property.title}
                 </h2>
                 <p className="mt-1 text-[13px] text-muted-foreground">{property.city}</p>
                 <p className="mt-2 text-[14px] font-semibold text-foreground">
                   R$ {property.price_per_night.toFixed(0)} / noite
                 </p>
               </div>
             </div>
           </Card>
 
           <Card className="shadow-soft">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-[16px]">
                 <Calendar className="h-5 w-5" />
                 Quantas diárias?
               </CardTitle>
               <CardDescription>Escolha a duração da sua estadia</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="flex items-center justify-between">
                 <span className="text-[15px] font-semibold text-foreground">
                   {nights} {nights === 1 ? "dia" : "dias"}
                 </span>
                 <span className="text-[13px] text-muted-foreground">
                   1 a 30 dias
                 </span>
               </div>
               <Slider
                 value={[nights]}
                 onValueChange={(v) => setNights(v[0])}
                 min={1}
                 max={30}
                 step={1}
                 className="w-full"
               />
             </CardContent>
           </Card>
 
           <Card className="shadow-soft">
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-[16px]">
                 <DollarSign className="h-5 w-5" />
                 Resumo da reserva
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               <div className="flex justify-between text-[14px]">
                 <span className="text-muted-foreground">
                   R$ {property.price_per_night.toFixed(0)} × {nights} {nights === 1 ? "noite" : "noites"}
                 </span>
                 <span className="font-medium text-foreground">
                   R$ {total.toFixed(2)}
                 </span>
               </div>
               <div className="border-t pt-3 flex justify-between text-[16px] font-semibold">
                 <span className="text-foreground">Total</span>
                 <span className="text-foreground">R$ {total.toFixed(2)}</span>
               </div>
             </CardContent>
           </Card>
 
           <form onSubmit={handleSubmit} className="space-y-4">
             <Card className="shadow-soft">
               <CardHeader>
                 <CardTitle className="text-[16px]">Dados do hóspede</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="guestName">Nome completo</Label>
                   <Input
                     id="guestName"
                     type="text"
                     placeholder="Seu nome"
                     value={guestName}
                     onChange={(e) => setGuestName(e.target.value)}
                     required
                     disabled={submitting}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="guestEmail">E-mail</Label>
                   <Input
                     id="guestEmail"
                     type="email"
                     placeholder="seu@email.com"
                     value={guestEmail}
                     onChange={(e) => setGuestEmail(e.target.value)}
                     required
                     disabled={submitting}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="guestPhone">Telefone</Label>
                   <Input
                     id="guestPhone"
                     type="tel"
                     placeholder="(00) 00000-0000"
                     value={guestPhone}
                     onChange={(e) => setGuestPhone(e.target.value)}
                     required
                     disabled={submitting}
                   />
                 </div>
               </CardContent>
             </Card>
 
             <Button
               type="submit"
               size="lg"
               className="w-full h-12 rounded-2xl"
               disabled={submitting}
             >
               {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               Confirmar reserva — R$ {total.toFixed(2)}
             </Button>
           </form>
         </main>
       </div>
     </div>
   );
 }
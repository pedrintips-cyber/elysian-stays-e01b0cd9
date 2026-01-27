import * as React from "react";
import { useNavigate } from "react-router-dom";

import { BottomNavAir } from "@/components/mobile/BottomNavAir";
import { PixPaymentDialog } from "@/components/payments/PixPaymentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserAuth } from "@/hooks/useUserAuth";
import { supabase } from "@/lib/supabase";

type BookingRow = {
  id: string;
  created_at: string;
  payment_status: string;
  total_price: number;
  nights: number;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  property: {
    id: string;
    title: string;
    city: string;
    image_url: string;
  } | null;
};

function formatBRL(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

function statusLabel(status: string) {
  if (status === "paid") return "Pago";
  if (status === "pending") return "Aguardando pagamento";
  if (status === "payment_failed") return "Pagamento não gerado";
  return status;
}

export default function Reservations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useUserAuth();

  const [bookings, setBookings] = React.useState<BookingRow[]>([]);
  const [fetching, setFetching] = React.useState(true);

  const [pixOpen, setPixOpen] = React.useState(false);
  const [pixQrCode, setPixQrCode] = React.useState<string | null>(null);
  const [pixCopyPaste, setPixCopyPaste] = React.useState<string | null>(null);
  const [pixTitle, setPixTitle] = React.useState<string>("Reserva");
  const [pixAmount, setPixAmount] = React.useState<number>(0);

  const [cpfOpen, setCpfOpen] = React.useState(false);
  const [cpfValue, setCpfValue] = React.useState("");
  const [cpfTarget, setCpfTarget] = React.useState<BookingRow | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent("/reservas")}`, { replace: true });
    }
  }, [loading, user, navigate]);

  const fetchBookings = React.useCallback(async () => {
    if (!user) return;
    setFetching(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, created_at, payment_status, total_price, nights, guest_name, guest_email, guest_phone, property:properties(id, title, city, image_url)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setFetching(false);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao carregar reservas", description: error.message });
      return;
    }
    setBookings((data as unknown as BookingRow[]) ?? []);
  }, [user, toast]);

  React.useEffect(() => {
    if (user) fetchBookings();
  }, [user, fetchBookings]);

  const payAgain = (b: BookingRow) => {
    if (!b.property) return;
    if (!b.guest_name || !b.guest_email || !b.guest_phone) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: "Não encontramos dados suficientes do hóspede para gerar o PIX.",
      });
      return;
    }

    setCpfTarget(b);
    setCpfValue("");
    setCpfOpen(true);
  };

  // NOTE: Flow above is conservative; we can extend later to ask CPF in a modal.

  const openPixModal = async (b: BookingRow, cpfDigits: string) => {
    if (!b.property) return;
    if (!b.guest_name || !b.guest_email || !b.guest_phone) return;

    const amountCents = Math.max(1, Math.round(Number(b.total_price) * 100));
    const items = [
      {
        title: `${b.property.title} (${b.nights} noite(s))`,
        quantity: 1,
        unitPrice: amountCents,
      },
    ];

    setPixQrCode(null);
    setPixCopyPaste(null);
    setPixTitle(b.property.title);
    setPixAmount(b.total_price);
    setPixOpen(true);

    const { data: payData, error: payErr } = await supabase.functions.invoke("hurapayments-create", {
      body: {
        bookingId: b.id,
        amountCents,
        guest: {
          name: b.guest_name,
          email: b.guest_email,
          phone: b.guest_phone,
          cpf: cpfDigits,
        },
        items,
        metadata: {
          booking_id: b.id,
          property_id: b.property.id,
          source: "reservations",
        },
      },
    });

    if (payErr || !payData?.ok) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar PIX",
        description: "Não conseguimos gerar o PIX agora. Tente novamente.",
      });
      setPixOpen(false);
      return;
    }

    setPixQrCode(payData?.pix?.qrCode ?? null);
    setPixCopyPaste(payData?.pix?.copyPaste ?? null);
  };

  const confirmCpfAndPay = async () => {
    if (!cpfTarget) return;
    const digits = cpfValue.replace(/\D+/g, "");
    if (digits.length !== 11) {
      toast({
        variant: "destructive",
        title: "CPF inválido",
        description: "Digite um CPF com 11 dígitos para gerar o PIX.",
      });
      return;
    }
    setCpfOpen(false);
    await openPixModal(cpfTarget, digits);
  };

  // Small UX: if we later add a CPF prompt, we can call openPixModal().

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="relative mx-auto min-h-dvh max-w-md overflow-hidden">
        <header className="sticky top-0 z-40 glass border-b">
          <div className="px-4 py-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-foreground">Reservas</h1>
              <p className="text-[12px] text-muted-foreground">Suas reservas e pagamentos</p>
            </div>
            <Button type="button" variant="pill" className="rounded-2xl" onClick={fetchBookings} disabled={fetching}>
              Atualizar
            </Button>
          </div>
        </header>

        <main className="px-4 pb-28 pt-5 space-y-4">
          <PixPaymentDialog
            open={pixOpen}
            onOpenChange={setPixOpen}
            title={pixTitle}
            qrCode={pixQrCode}
            copyPaste={pixCopyPaste}
            amountLabel={formatBRL(pixAmount)}
          />

          <Dialog open={cpfOpen} onOpenChange={setCpfOpen}>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle>Gerar PIX</DialogTitle>
                <DialogDescription>
                  Para gerar o PIX, informe o CPF do pagador (11 dígitos).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={cpfValue}
                    onChange={(e) => setCpfValue(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="pill" className="flex-1" onClick={confirmCpfAndPay}>
                    Gerar PIX
                  </Button>
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setCpfOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {fetching ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Você ainda não tem reservas.</div>
          ) : (
            bookings.map((b) => (
              <Card key={b.id} className="shadow-soft overflow-hidden">
                <div className="flex gap-4 p-4">
                  {b.property?.image_url ? (
                    <img
                      src={b.property.image_url}
                      alt={b.property.title}
                      className="h-16 w-16 rounded-2xl object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-muted" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-foreground truncate">{b.property?.title ?? "Reserva"}</div>
                        <div className="mt-0.5 text-[12px] text-muted-foreground truncate">{b.property?.city ?? ""}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold text-foreground">{formatBRL(Number(b.total_price))}</div>
                        <div className="mt-0.5 text-[12px] text-muted-foreground">{statusLabel(b.payment_status)}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {b.payment_status !== "paid" ? (
                        <Button type="button" variant="default" className="rounded-2xl flex-1" onClick={() => payAgain(b)}>
                          Pagar
                        </Button>
                      ) : (
                        <Button type="button" variant="secondary" className="rounded-2xl flex-1" disabled>
                          Pago
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => navigate(`/property/${b.property?.id ?? ""}`)}
                        disabled={!b.property?.id}
                      >
                        Ver imóvel
                      </Button>
                    </div>
                  </div>
                </div>

                <CardHeader className="sr-only">
                  <CardTitle>Reserva</CardTitle>
                </CardHeader>
                <CardContent className="sr-only" />
              </Card>
            ))
          )}
        </main>

        <BottomNavAir activeKey="bookings" />
      </div>
    </div>
  );
}

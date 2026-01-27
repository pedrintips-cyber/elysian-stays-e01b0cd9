import { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  qrCode?: string | null;
  copyPaste?: string | null;
  amountLabel: string;
};

function isProbablyImageUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:image/");
}

export function PixPaymentDialog({ open, onOpenChange, title, qrCode, copyPaste, amountLabel }: Props) {
  const { toast } = useToast();

  const qrIsImage = useMemo(() => (qrCode ? isProbablyImageUrl(qrCode) : false), [qrCode]);

  const handleCopy = async () => {
    if (!copyPaste) return;
    await navigator.clipboard.writeText(copyPaste);
    toast({ title: "Copiado!", description: "Código PIX copiado para a área de transferência." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Pague com PIX</DialogTitle>
          <DialogDescription>
            {title} • Total: {amountLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {qrCode ? (
            <div className="rounded-2xl border bg-surface p-4 shadow-soft">
              {qrIsImage ? (
                <img
                  src={qrCode}
                  alt="QR Code PIX"
                  className="mx-auto h-56 w-56 rounded-2xl object-contain"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  QR Code recebido, mas não veio como imagem. Use o código copia-e-cola abaixo.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border bg-surface p-4 text-sm text-muted-foreground">
              Gerando PIX…
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Copia e cola</div>
            <Input value={copyPaste ?? ""} readOnly />
            <div className="flex gap-2">
              <Button type="button" variant="pill" className="flex-1" onClick={handleCopy} disabled={!copyPaste}>
                Copiar código
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

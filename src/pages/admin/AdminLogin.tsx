import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const credentialsSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").max(72),
});

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signIn, signUp } = useAdminAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/admin");
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: parsed.error.issues[0]?.message,
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } =
        mode === "login"
          ? await signIn(parsed.data.email, parsed.data.password)
          : await signUp(parsed.data.email, parsed.data.password);

      if (error) {
        toast({
          variant: "destructive",
          title: mode === "login" ? "Erro ao entrar" : "Erro ao criar conta",
          description: error.message,
        });
        return;
      }

      toast({
        title: mode === "login" ? "Bem-vindo!" : "Conta criada!",
        description:
          mode === "login"
            ? "Você entrou no painel."
            : "Você já pode entrar no painel.",
      });
      navigate("/admin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4 py-10">
        <Card className="w-full shadow-soft">
          <CardHeader className="space-y-1">
            <CardTitle className="text-[20px]">Painel administrativo</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Entre para cadastrar e publicar imóveis."
                : "Crie uma conta para acessar o painel."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  disabled={submitting}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 8 caracteres.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
                disabled={submitting}
              >
                {mode === "login" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

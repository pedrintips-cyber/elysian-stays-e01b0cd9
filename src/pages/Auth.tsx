import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserAuth } from "@/hooks/useUserAuth";

const emailSchema = z.string().trim().email("E-mail inválido.").max(255);
const passwordSchema = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres.")
  .max(72, "Senha muito longa.")
  .regex(/[A-Z]/, "Inclua ao menos 1 letra maiúscula.")
  .regex(/[a-z]/, "Inclua ao menos 1 letra minúscula.")
  .regex(/[0-9]/, "Inclua ao menos 1 número.");

export default function Auth() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const { user, loading, signIn, signUp } = useUserAuth();

  const redirectTo = searchParams.get("redirect") || "/";
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true, state: { from: location.pathname } });
    }
  }, [loading, user, navigate, redirectTo, location.pathname]);

  const validate = () => {
    const e = emailSchema.safeParse(email);
    if (!e.success) return e.error.issues[0]?.message ?? "E-mail inválido.";
    const p = passwordSchema.safeParse(password);
    if (!p.success) return p.error.issues[0]?.message ?? "Senha inválida.";
    return null;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const err = validate();
    if (err) {
      toast({ variant: "destructive", title: "Verifique os dados", description: err });
      return;
    }

    setSubmitting(true);
    const result = mode === "signin" ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: mode === "signin" ? "Falha no login" : "Falha no cadastro",
        description: result.error.message,
      });
      return;
    }

    toast({
      title: mode === "signin" ? "Bem-vindo!" : "Cadastro realizado!",
      description: "Você já pode ver suas reservas.",
    });
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="relative mx-auto min-h-dvh max-w-md px-4 py-8">
        <header className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">{mode === "signin" ? "Entrar" : "Criar conta"}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Para ver suas reservas e continuar pagamentos pendentes.
          </p>
        </header>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-[16px]">{mode === "signin" ? "Acesse sua conta" : "Crie sua conta"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                />
                {mode === "signup" ? (
                  <p className="text-[12px] text-muted-foreground">
                    Mínimo 8 caracteres, com maiúscula, minúscula e número.
                  </p>
                ) : null}
              </div>

              <Button type="submit" size="lg" className="w-full h-12 rounded-2xl" disabled={submitting}>
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </Button>

              <div className="flex items-center justify-between gap-3 text-[13px]">
                <button
                  type="button"
                  className="text-primary underline underline-offset-4"
                  onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
                  disabled={submitting}
                >
                  {mode === "signin" ? "Criar uma conta" : "Já tenho conta"}
                </button>

                <button
                  type="button"
                  className="text-muted-foreground underline underline-offset-4"
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                >
                  Voltar
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

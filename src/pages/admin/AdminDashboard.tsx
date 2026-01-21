import * as React from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PropertyRow = {
  id: string;
  title: string;
  city: string;
  description: string | null;
  guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  price_per_night: number;
  image_url: string;
  host_id: string | null;
  created_at?: string | null;
};

const cities = [
  "Salvador",
  "Recife",
  "Olinda",
  "São Paulo",
  "Rio de Janeiro",
  "Belo Horizonte",
  "Fortaleza",
  "Vitória",
  "Florianópolis",
];

const propertySchema = z.object({
  title: z.string().trim().min(5, "Título muito curto").max(120),
  city: z.string().min(1, "Selecione uma cidade"),
  description: z.string().trim().min(30, "Descrição muito curta").max(4000),
  guests: z.coerce.number().int().min(1).max(20),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(0).max(20),
  price_per_night: z.coerce.number().min(1).max(100000),
});

function extFromFile(file: File) {
  const name = file.name.toLowerCase();
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1) : "jpg";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signOut } = useAdminAuth();

  const [list, setList] = React.useState<PropertyRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = React.useState<File[]>([]);

  const selected = React.useMemo(
    () => list.find((p) => p.id === selectedId) ?? null,
    [list, selectedId],
  );

  const [form, setForm] = React.useState({
    title: "",
    city: "",
    description: "",
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    price_per_night: 220,
  });

  React.useEffect(() => {
    if (!loading && !user) navigate("/admin/login");
  }, [loading, user, navigate]);

  React.useEffect(() => {
    if (user) void fetchMyProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchMyProperties = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("id,title,city,description,guests,bedrooms,bathrooms,price_per_night,image_url,host_id,created_at")
        .eq("host_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setList((data ?? []) as PropertyRow[]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao carregar imóveis", description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const resetFormForNew = () => {
    setSelectedId(null);
    setForm({
      title: "",
      city: "",
      description: "",
      guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      price_per_night: 220,
    });
    setCoverFile(null);
    setGalleryFiles([]);
  };

  const loadIntoForm = (p: PropertyRow) => {
    setSelectedId(p.id);
    setForm({
      title: p.title ?? "",
      city: p.city ?? "",
      description: p.description ?? "",
      guests: p.guests ?? 2,
      bedrooms: p.bedrooms ?? 1,
      bathrooms: p.bathrooms ?? 1,
      price_per_night: Number(p.price_per_night ?? 0),
    });
    setCoverFile(null);
    setGalleryFiles([]);
  };

  const uploadToStorage = async (propertyId: string, file: File, kind: "cover" | "gallery") => {
    if (!user) throw new Error("Não autenticado");
    const ext = extFromFile(file);
    const safeKind = kind === "cover" ? "cover" : "gallery";
    const path = `${user.id}/${propertyId}/${safeKind}-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("property-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = propertySchema.safeParse(form);
    if (!parsed.success) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: parsed.error.issues[0]?.message,
      });
      return;
    }

    setBusy(true);
    try {
      if (!selectedId) {
        // Create
        const { data, error } = await supabase
          .from("properties")
          .insert({
            host_id: user.id,
            title: parsed.data.title,
            city: parsed.data.city,
            description: parsed.data.description,
            guests: parsed.data.guests,
            bedrooms: parsed.data.bedrooms,
            bathrooms: parsed.data.bathrooms,
            price_per_night: parsed.data.price_per_night,
            image_url: "/placeholder.svg",
          })
          .select("id,title,city,description,guests,bedrooms,bathrooms,price_per_night,image_url,host_id,created_at")
          .single();
        if (error) throw error;
        const created = data as PropertyRow;

        // Upload cover and update
        if (coverFile) {
          const coverUrl = await uploadToStorage(created.id, coverFile, "cover");
          const { error: upErr } = await supabase
            .from("properties")
            .update({ image_url: coverUrl })
            .eq("id", created.id);
          if (upErr) throw upErr;
          created.image_url = coverUrl;
        }

        // Upload gallery and insert rows
        if (galleryFiles.length) {
          const uploaded = await Promise.all(
            galleryFiles.map((f) => uploadToStorage(created.id, f, "gallery")),
          );
          const rows = uploaded.map((url, idx) => ({
            property_id: created.id,
            url,
            sort_order: idx,
          }));
          const { error: photoErr } = await supabase.from("property_photos").insert(rows);
          if (photoErr) throw photoErr;
        }

        toast({ title: "Imóvel publicado", description: "Já está visível no site." });
        resetFormForNew();
        await fetchMyProperties();
        return;
      }

      // Update
      const { error } = await supabase
        .from("properties")
        .update({
          title: parsed.data.title,
          city: parsed.data.city,
          description: parsed.data.description,
          guests: parsed.data.guests,
          bedrooms: parsed.data.bedrooms,
          bathrooms: parsed.data.bathrooms,
          price_per_night: parsed.data.price_per_night,
        })
        .eq("id", selectedId);
      if (error) throw error;

      if (coverFile) {
        const coverUrl = await uploadToStorage(selectedId, coverFile, "cover");
        const { error: upErr } = await supabase
          .from("properties")
          .update({ image_url: coverUrl })
          .eq("id", selectedId);
        if (upErr) throw upErr;
      }

      if (galleryFiles.length) {
        const uploaded = await Promise.all(
          galleryFiles.map((f) => uploadToStorage(selectedId, f, "gallery")),
        );
        // Append at end
        const { data: existing, error: exErr } = await supabase
          .from("property_photos")
          .select("sort_order")
          .eq("property_id", selectedId)
          .order("sort_order", { ascending: false })
          .limit(1);
        if (exErr) throw exErr;
        const start = (existing?.[0]?.sort_order ?? -1) + 1;
        const rows = uploaded.map((url, idx) => ({
          property_id: selectedId,
          url,
          sort_order: start + idx,
        }));
        const { error: photoErr } = await supabase.from("property_photos").insert(rows);
        if (photoErr) throw photoErr;
      }

      toast({ title: "Imóvel atualizado", description: "Mudanças publicadas no site." });
      setCoverFile(null);
      setGalleryFiles([]);
      await fetchMyProperties();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("properties").delete().eq("id", selectedId);
      if (error) throw error;
      toast({ title: "Imóvel removido" });
      resetFormForNew();
      await fetchMyProperties();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao remover", description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ variant: "destructive", title: "Erro ao sair", description: error.message });
      return;
    }
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto min-h-dvh max-w-5xl px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
              Painel — Imóveis
            </h1>
            <p className="text-sm text-muted-foreground">
              Você publica e o site já mostra automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/")}
              className="rounded-2xl">
              Ver site
            </Button>
            <Button variant="outline" onClick={onSignOut} className="rounded-2xl">
              Sair
            </Button>
          </div>
        </header>

        <main className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-[16px]">Seus anúncios</CardTitle>
              <CardDescription>
                {list.length} imóvel(is) cadastrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="default"
                className="w-full rounded-2xl"
                onClick={resetFormForNew}
                disabled={busy}
              >
                + Novo imóvel
              </Button>

              <div className="space-y-2">
                {list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => loadIntoForm(p)}
                    className={
                      "w-full text-left rounded-2xl border bg-surface px-3 py-3 hover:bg-accent transition-colors"
                    }
                    disabled={busy}
                  >
                    <div className="text-[14px] font-semibold text-foreground line-clamp-1">
                      {p.title}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground flex items-center justify-between">
                      <span>{p.city}</span>
                      <span>R$ {Number(p.price_per_night).toFixed(0)}/noite</span>
                    </div>
                  </button>
                ))}

                {!busy && list.length === 0 ? (
                  <div className="rounded-2xl border bg-surface p-4 text-sm text-muted-foreground">
                    Nenhum imóvel ainda. Clique em “Novo imóvel”.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-[16px]">
                {selected ? "Editar imóvel" : "Cadastrar imóvel"}
              </CardTitle>
              <CardDescription>
                {selected
                  ? "Edite e publique novamente." 
                  : "Preencha e publique em 1 clique."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                      placeholder="Ex: Flat econômico com piscina"
                      disabled={busy}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Select
                      value={form.city}
                      onValueChange={(v) => setForm((s) => ({ ...s, city: v }))}
                      disabled={busy}
                    >
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Descrição</Label>
                  <Textarea
                    id="desc"
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    placeholder="Descreva o espaço, localização, diferenciais, regras…"
                    disabled={busy}
                    rows={6}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="guests">Hóspedes</Label>
                    <Input
                      id="guests"
                      type="number"
                      value={form.guests}
                      onChange={(e) => setForm((s) => ({ ...s, guests: Number(e.target.value) }))}
                      disabled={busy}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Quartos</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      value={form.bedrooms}
                      onChange={(e) => setForm((s) => ({ ...s, bedrooms: Number(e.target.value) }))}
                      disabled={busy}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms">Banheiros</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      value={form.bathrooms}
                      onChange={(e) => setForm((s) => ({ ...s, bathrooms: Number(e.target.value) }))}
                      disabled={busy}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Diária (R$)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={form.price_per_night}
                      onChange={(e) => setForm((s) => ({ ...s, price_per_night: Number(e.target.value) }))}
                      disabled={busy}
                      min={1}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cover">Foto de capa</Label>
                    <Input
                      id="cover"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                      disabled={busy}
                    />
                    {selected?.image_url ? (
                      <a
                        href={selected.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Ver capa atual
                      </a>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gallery">Galeria (múltiplas)</Label>
                    <Input
                      id="gallery"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setGalleryFiles(Array.from(e.target.files ?? []))}
                      disabled={busy}
                    />
                    <p className="text-xs text-muted-foreground">
                      As fotos ficam salvas no storage; no banco vai só o link.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="submit" className="rounded-2xl" disabled={busy}>
                    {selected ? "Salvar alterações" : "Publicar imóvel"}
                  </Button>

                  {selected ? (
                    <Button
                      type="button"
                      variant="destructive"
                      className="rounded-2xl"
                      onClick={onDelete}
                      disabled={busy}
                    >
                      Remover imóvel
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Ao publicar, já aparece no site.
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

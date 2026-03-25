import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest, apiFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Users, ClipboardList, BarChart3, ChevronRight,
  Calendar, Banknote, Bike, UserPlus, Search, Filter, Package,
  Plus, AlertTriangle, ArrowUp, ArrowDown, RefreshCw, Trash2,
  TrendingUp, Download, Edit, CheckCircle2, Car, ShieldCheck, ShieldX, Clock
} from "lucide-react";
import TasksPanel from "@/components/TasksPanel";
import type { RepairOrder, Vehicle, User, Payment, Part, PartMovement } from "@shared/schema";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const navItems = [{ href: "/", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> }];

export default function OwnerDashboard() {
  return (
    <AppLayout title="Panel Właściciela" navItems={navItems}>
      <OwnerContent />
    </AppLayout>
  );
}

function OwnerContent() {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/stats"] });
  const { data: orders, isLoading: oLoading } = useQuery<RepairOrder[]>({ queryKey: ["/api/orders"] });
  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { data: users, isLoading: uLoading } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: payments } = useQuery<Payment[]>({ queryKey: ["/api/payments"] });
  const { data: parts } = useQuery<Part[]>({ queryKey: ["/api/parts"] });

  const vehicleMap = Object.fromEntries((vehicles || []).map(v => [v.id, v]));
  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
  const lowStock = (parts || []).filter(p => p.stockQty <= p.minQty);

  const filteredOrders = (orders || []).filter(o => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const v = vehicleMap[o.vehicleId];
    const matchSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) ||
      (v && `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Panel właściciela</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3 mb-1">
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">Zlecenia</TabsTrigger>
          <TabsTrigger value="users" className="text-xs relative">
            Użytkownicy
            {stats?.pendingApprovals > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{stats.pendingApprovals}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="vehicles" className="text-xs">Pojazdy</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs">Zadania</TabsTrigger>
          <TabsTrigger value="magazine" className="text-xs relative">
            Magazyn
            {lowStock.length > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{lowStock.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">Zestawienia</TabsTrigger>
        </TabsList>

        {/* ===== DASHBOARD ===== */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Wszystkich zleceń" value={stats?.totalOrders ?? "–"} icon={<ClipboardList className="w-4 h-4 text-primary" />} />
            <StatCard label="Przychód" value={stats ? `${stats.totalRevenue.toFixed(0)} zł` : "–"} icon={<Banknote className="w-4 h-4 text-emerald-500" />} />
            <StatCard label="Klientów" value={stats?.totalClients ?? "–"} icon={<Users className="w-4 h-4 text-blue-500" />} />
            <StatCard label="Pojazdów" value={stats?.totalVehicles ?? "–"} icon={<Bike className="w-4 h-4 text-amber-500" />} />
          </div>

          {lowStock.length > 0 && (
            <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Niski stan magazynowy</p>
                </div>
                <div className="space-y-1">
                  {lowStock.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-amber-800 dark:text-amber-200">{p.name}</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">{p.stockQty} / min {p.minQty} {p.unit}</span>
                    </div>
                  ))}
                  {lowStock.length > 3 && <p className="text-xs text-amber-600 dark:text-amber-400">+{lowStock.length - 3} więcej → zakładka Magazyn</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {stats?.byStatus && (
            <Card>
              <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Statusy zleceń</CardTitle></CardHeader>
              <CardContent className="pb-4 space-y-1.5">
                {Object.entries(stats.byStatus).map(([status, count]: [string, any]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <StatusBadge status={status} />
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Ostatnie płatności</CardTitle></CardHeader>
            <CardContent className="pb-4">
              {(payments || []).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 text-sm border-b last:border-0 border-border">
                  <div><span className="text-xs text-muted-foreground">{format(new Date(p.paidAt), "d MMM", { locale: pl })}</span><span className="ml-2 capitalize">{p.method === "cash" ? "Gotówka" : p.method === "card" ? "Karta" : "Przelew"}</span></div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.amount.toFixed(2)} zł</span>
                </div>
              ))}
              {(payments || []).length === 0 && <p className="text-xs text-muted-foreground">Brak płatności</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ORDERS ===== */}
        <TabsContent value="orders" className="space-y-3 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Szukaj..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-orders" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32" data-testid="select-filter-orders"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="pending">Nowe</SelectItem>
                <SelectItem value="quoted">Wyceny</SelectItem>
                <SelectItem value="in_progress">W naprawie</SelectItem>
                <SelectItem value="completed">Zakończone</SelectItem>
                <SelectItem value="paid">Opłacone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {oLoading ? <Skeleton className="h-40 rounded-xl" /> : (
            <div className="space-y-2">
              {filteredOrders.map(o => {
                const v = vehicleMap[o.vehicleId];
                const c = userMap[o.clientId];
                return (
                  <Link key={o.id} href={`/orders/${o.id}`}>
                    <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`card-order-${o.id}`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm flex-1 min-w-0 truncate">{o.title}</p>
                          <div className="flex gap-1.5 flex-shrink-0"><PriorityBadge priority={o.priority} /><StatusBadge status={o.status} /></div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {v && <span>{v.brand} {v.model}</span>}
                          {c && <span>{c.name}</span>}
                          <span className="ml-auto">{format(new Date(o.createdAt), "d MMM yyyy", { locale: pl })}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
              {filteredOrders.length === 0 && <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Brak zleceń</CardContent></Card>}
            </div>
          )}
        </TabsContent>

        {/* ===== USERS ===== */}
        <TabsContent value="users" className="space-y-3 mt-4">
          <UsersTab users={users || []} loading={uLoading} />
        </TabsContent>

        {/* ===== POJAZDY ===== */}
        <TabsContent value="vehicles" className="space-y-3 mt-4">
          <VehiclesTab vehicles={vehicles || []} users={users || []} />
        </TabsContent>

        {/* ===== ZADANIA PRACOWNIKÓW ===== */}
        <TabsContent value="tasks" className="space-y-3 mt-4">
          <div>
            <h2 className="text-sm font-semibold mb-3">Zadania pracowników</h2>
            <TasksPanel showAll />
          </div>
        </TabsContent>

        {/* ===== MAGAZYN ===== */}
        <TabsContent value="magazine" className="space-y-3 mt-4">
          <MagazineTab parts={parts || []} />
        </TabsContent>

        {/* ===== ZESTAWIENIA ===== */}
        <TabsContent value="reports" className="space-y-3 mt-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ───────────────── MAGAZYN ─────────────────
function MagazineTab({ parts }: { parts: Part[] }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showLow, setShowLow] = useState(false);

  const filtered = parts.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.catalogNumber || "").toLowerCase().includes(search.toLowerCase());
    const matchLow = !showLow || p.stockQty <= p.minQty;
    return matchSearch && matchLow;
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/parts"] });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Szukaj części..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setShowLow(v => !v)}
          className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${showLow ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300" : "border-border text-muted-foreground"}`}>
          <AlertTriangle className="w-3.5 h-3.5" />Niski stan
        </button>
        <AddPartDialog onSuccess={invalidate} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="py-2.5 px-3 text-center"><p className="text-lg font-bold">{parts.length}</p><p className="text-xs text-muted-foreground">Pozycji</p></CardContent></Card>
        <Card><CardContent className="py-2.5 px-3 text-center"><p className="text-lg font-bold text-amber-600">{parts.filter(p => p.stockQty <= p.minQty).length}</p><p className="text-xs text-muted-foreground">Niski stan</p></CardContent></Card>
        <Card><CardContent className="py-2.5 px-3 text-center"><p className="text-lg font-bold text-emerald-600">{parts.reduce((s, p) => s + (p.stockQty * (p.buyPrice || 0)), 0).toFixed(0)} zł</p><p className="text-xs text-muted-foreground">Wartość</p></CardContent></Card>
      </div>

      {/* Parts list */}
      <div className="space-y-2">
        {filtered.map(p => (
          <PartCard key={p.id} part={p} onSuccess={invalidate} />
        ))}
        {filtered.length === 0 && (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Brak części w magazynie</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function PartCard({ part, onSuccess }: { part: Part; onSuccess: () => void }) {
  const { toast } = useToast();
  const isLow = part.stockQty <= part.minQty;

  const del = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/parts/${part.id}`, {}),
    onSuccess: () => { onSuccess(); toast({ title: "Część usunięta" }); },
  });

  return (
    <Card className={isLow ? "border-amber-300 dark:border-amber-700" : ""} data-testid={`card-part-${part.id}`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isLow ? "bg-amber-100 dark:bg-amber-950" : "bg-muted"}`}>
            <Package className={`w-4 h-4 ${isLow ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{part.name}</p>
              {part.catalogNumber && <span className="text-xs text-muted-foreground font-mono">{part.catalogNumber}</span>}
              {isLow && <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:text-amber-300">Niski stan</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              {part.brand && <span>{part.brand}</span>}
              {part.category && <span>· {part.category}</span>}
              {part.location && <span>· 📍 {part.location}</span>}
            </div>
            <div className="flex items-center gap-4 mt-1.5">
              <span className={`text-sm font-bold ${isLow ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {part.stockQty} {part.unit}
              </span>
              {part.sellPrice && <span className="text-xs text-muted-foreground">Sprzedaż: {part.sellPrice.toFixed(2)} zł</span>}
              {part.buyPrice && <span className="text-xs text-muted-foreground">Zakup: {part.buyPrice.toFixed(2)} zł</span>}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <MovementDialog part={part} onSuccess={onSuccess} />
            <EditPartDialog part={part} onSuccess={onSuccess} />
            <button onClick={() => del.mutate()} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddPartDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", catalogNumber: "", brand: "", category: "", unit: "szt", stockQty: "0", minQty: "1", buyPrice: "", sellPrice: "", location: "", notes: "" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/parts", {
      ...form,
      stockQty: parseFloat(form.stockQty) || 0,
      minQty: parseFloat(form.minQty) || 1,
      buyPrice: form.buyPrice ? parseFloat(form.buyPrice) : undefined,
      sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : undefined,
    }),
    onSuccess: () => { setOpen(false); onSuccess(); toast({ title: "Część dodana" }); },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex-shrink-0" data-testid="button-add-part">
          <Plus className="w-3.5 h-3.5 mr-1" />Dodaj
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nowa część</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label className="text-xs">Nazwa *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="np. Filtr oleju HF138" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Nr katalogowy</Label><Input value={form.catalogNumber} onChange={e => setForm(f => ({ ...f, catalogNumber: e.target.value }))} /></div>
            <div><Label className="text-xs">Marka</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Honda, NGK..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Kategoria</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Filtry, Oleje..." /></div>
            <div><Label className="text-xs">Jednostka</Label>
              <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["szt", "l", "ml", "kg", "g", "m", "kpl"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Stan początkowy</Label><Input type="number" step="0.01" value={form.stockQty} onChange={e => setForm(f => ({ ...f, stockQty: e.target.value }))} /></div>
            <div><Label className="text-xs">Min. ilość (alert)</Label><Input type="number" step="0.01" value={form.minQty} onChange={e => setForm(f => ({ ...f, minQty: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Cena zakupu (zł)</Label><Input type="number" step="0.01" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} /></div>
            <div><Label className="text-xs">Cena sprzedaży (zł)</Label><Input type="number" step="0.01" value={form.sellPrice} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} /></div>
          </div>
          <div><Label className="text-xs">Lokalizacja w magazynie</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Półka A3, Szuflada B2..." /></div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !form.name}>
            {mut.isPending ? "Zapisywanie..." : "Dodaj część"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditPartDialog({ part, onSuccess }: { part: Part; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: part.name, catalogNumber: part.catalogNumber || "", brand: part.brand || "",
    category: part.category || "", unit: part.unit, location: part.location || "",
    minQty: String(part.minQty), buyPrice: String(part.buyPrice || ""), sellPrice: String(part.sellPrice || ""),
  });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/parts/${part.id}`, {
      ...form,
      minQty: parseFloat(form.minQty) || 1,
      buyPrice: form.buyPrice ? parseFloat(form.buyPrice) : undefined,
      sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : undefined,
    }),
    onSuccess: () => { setOpen(false); onSuccess(); toast({ title: "Zaktualizowano" }); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><Edit className="w-3.5 h-3.5" /></button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edytuj część</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label className="text-xs">Nazwa</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Nr katalogowy</Label><Input value={form.catalogNumber} onChange={e => setForm(f => ({ ...f, catalogNumber: e.target.value }))} /></div>
            <div><Label className="text-xs">Marka</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Min. ilość</Label><Input type="number" step="0.01" value={form.minQty} onChange={e => setForm(f => ({ ...f, minQty: e.target.value }))} /></div>
            <div><Label className="text-xs">Lokalizacja</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Cena zakupu (zł)</Label><Input type="number" step="0.01" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} /></div>
            <div><Label className="text-xs">Cena sprzedaży (zł)</Label><Input type="number" step="0.01" value={form.sellPrice} onChange={e => setForm(f => ({ ...f, sellPrice: e.target.value }))} /></div>
          </div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>Zapisz</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({ part, onSuccess }: { part: Part; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "in", qty: "1", price: String(part.buyPrice || ""), note: "" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/parts/${part.id}/movements`, {
      type: form.type,
      qty: parseFloat(form.qty),
      price: form.price ? parseFloat(form.price) : undefined,
      note: form.note || undefined,
    }),
    onSuccess: () => { setOpen(false); setForm({ type: "in", qty: "1", price: String(part.buyPrice || ""), note: "" }); onSuccess(); toast({ title: form.type === "in" ? "Przyjęto na magazyn" : form.type === "out" ? "Wydano z magazynu" : "Stan skorygowany" }); },
  });

  const newStock = form.type === "adjustment" ? parseFloat(form.qty) || 0 : form.type === "in" ? part.stockQty + (parseFloat(form.qty) || 0) : Math.max(0, part.stockQty - (parseFloat(form.qty) || 0));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Ruch magazynowy — {part.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="flex rounded-lg overflow-hidden border bg-muted p-1 gap-1">
            {[{ v: "in", l: "Przyjęcie", icon: <ArrowDown className="w-3 h-3" /> }, { v: "out", l: "Wydanie", icon: <ArrowUp className="w-3 h-3" /> }, { v: "adjustment", l: "Korekta", icon: <RefreshCw className="w-3 h-3" /> }].map(({ v, l, icon }) => (
              <button key={v} onClick={() => setForm(f => ({ ...f, type: v }))}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1 ${form.type === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                {icon}{l}
              </button>
            ))}
          </div>

          <div className="bg-muted rounded-lg px-3 py-2 text-xs flex justify-between">
            <span>Aktualny stan: <strong>{part.stockQty} {part.unit}</strong></span>
            <span>Po operacji: <strong className={newStock <= part.minQty ? "text-amber-600" : "text-emerald-600"}>{newStock.toFixed(2)} {part.unit}</strong></span>
          </div>

          <div>
            <Label className="text-xs">{form.type === "adjustment" ? "Nowy stan" : "Ilość"} ({part.unit})</Label>
            <Input type="number" step="0.01" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
          </div>
          {form.type !== "adjustment" && (
            <div><Label className="text-xs">Cena jedn. (zł)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
          )}
          <div><Label className="text-xs">Uwaga</Label><Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Np. Dostawa od hurtowni X" /></div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !form.qty}>
            {mut.isPending ? "Zapisywanie..." : "Zapisz ruch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────── ZESTAWIENIA ─────────────────
function ReportsTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: report, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/reports/monthly", year, month],
    queryFn: async () => {
      const r = await apiFetch(`/api/reports/monthly?year=${year}&month=${month}`);
      return r.json();
    },
  });

  const months = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];

  const exportCSV = () => {
    if (!report) return;
    const lines = [
      `MotoSerwis — Zestawienie miesięczne: ${months[month-1]} ${year}`,
      "",
      "PODSUMOWANIE",
      `Przychód;${report.summary.revenue.toFixed(2)} zł`,
      `Koszt części (wydane);${report.summary.partsCostOut.toFixed(2)} zł`,
      `Marża;${report.summary.margin.toFixed(2)} zł`,
      `Liczba zleceń;${report.summary.ordersCount}`,
      `Liczba płatności;${report.summary.paidCount}`,
      "",
      "PŁATNOŚCI",
      "Data;Kwota;Metoda;Uwagi",
      ...(report.payments || []).map((p: any) => `${p.paidAt.slice(0,10)};${p.amount.toFixed(2)};${p.method};${p.notes||""}`),
      "",
      "TOP UŻYTE CZĘŚCI",
      "Nazwa;Ilość;Koszt",
      ...(report.topParts || []).map((p: any) => `${p.name};${p.qty};${p.cost.toFixed(2)}`),
    ];
    const csv = lines.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `zestawienie-${year}-${String(month).padStart(2,"0")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-2 items-center">
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={exportCSV} disabled={!report} data-testid="button-export-csv">
          <Download className="w-3.5 h-3.5 mr-1" />CSV
        </Button>
      </div>

      {isLoading ? <Skeleton className="h-64 rounded-xl" /> : !report ? null : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Przychód</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{report.summary.revenue.toFixed(2)} zł</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Koszt części</p>
                <p className="text-xl font-bold text-red-500">{report.summary.partsCostOut.toFixed(2)} zł</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Marża</p>
                <p className={`text-xl font-bold ${report.summary.margin >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>{report.summary.margin.toFixed(2)} zł</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Zlecenia</p>
                <p className="text-xl font-bold">{report.summary.ordersCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Status breakdown */}
          {Object.keys(report.byStatus || {}).length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Zlecenia wg statusu</CardTitle></CardHeader>
              <CardContent className="pb-4 space-y-1.5">
                {Object.entries(report.byStatus).map(([status, count]: [string, any]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <StatusBadge status={status} />
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Daily revenue */}
          {Object.keys(report.dailyRevenue || {}).length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Płatności dzień po dniu</CardTitle></CardHeader>
              <CardContent className="pb-4">
                {Object.entries(report.dailyRevenue).sort(([a],[b])=>a.localeCompare(b)).map(([day, amt]: [string, any]) => (
                  <div key={day} className="flex items-center justify-between py-1.5 border-b last:border-0 border-border text-sm">
                    <span className="text-muted-foreground">{format(new Date(day), "d MMM yyyy", { locale: pl })}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{amt.toFixed(2)} zł</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Top parts */}
          {report.topParts?.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">Najczęściej wydawane części</CardTitle></CardHeader>
              <CardContent className="pb-4">
                {report.topParts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0 border-border text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground mr-2">#{i+1}</span>
                      <span>{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{p.qty} szt</span>
                      {p.cost > 0 && <span className="text-xs text-muted-foreground ml-2">{p.cost.toFixed(2)} zł</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Low stock alert */}
          {report.lowStock?.length > 0 && (
            <Card className="border-amber-300 dark:border-amber-700">
              <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />Niski stan magazynowy</CardTitle></CardHeader>
              <CardContent className="pb-4">
                {report.lowStock.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0 border-border text-sm">
                    <span>{p.name}</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{p.stockQty}/{p.minQty} {p.unit}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {report.summary.ordersCount === 0 && report.summary.paidCount === 0 && (
            <Card className="border-dashed"><CardContent className="py-10 text-center text-muted-foreground text-sm">Brak danych za wybrany okres</CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────── HELPERS ─────────────────
function StatCard({ label, value, icon }: { label: string; value: any; icon: React.ReactNode }) {
  return (
    <Card><CardContent className="pt-4 pb-4">
      <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-muted-foreground">{label}</p></div>
      <p className="text-xl font-bold">{value}</p>
    </CardContent></Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string,{label:string;c:string}> = {
    owner:    { label:"Właściciel", c:"bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
    mechanic: { label:"Mechanik",   c:"bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
    client:   { label:"Klient",     c:"bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  };
  const r = map[role] || { label: role, c: "bg-muted text-muted-foreground" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.c}`}>{r.label}</span>;
}

function AddUserDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", phone:"", password:"demo1234", role:"client" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/register", form),
    onSuccess: () => { setOpen(false); onSuccess(); toast({ title: "Użytkownik dodany" }); },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-add-user">
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />Dodaj
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Nowy użytkownik</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label className="text-xs">Imię i nazwisko</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
          <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
          <div><Label className="text-xs">Telefon</Label><Input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
          <div><Label className="text-xs">Hasło</Label><Input value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} /></div>
          <div><Label className="text-xs">Rola</Label>
            <Select value={form.role} onValueChange={v => setForm(f=>({...f,role:v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Klient</SelectItem>
                <SelectItem value="mechanic">Mechanik</SelectItem>
                <SelectItem value="owner">Właściciel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !form.name || !form.email}>
            {mut.isPending ? "Dodawanie..." : "Dodaj"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── UsersTab z zatwierdzaniem kont ──────────────────────────────────────────
function UsersTab({ users, loading }: { users: any[]; loading: boolean }) {
  const { toast } = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/users"] });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/users/${id}/status`, { status }),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ["/api/stats"] }); },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  const pending = users.filter(u => u.status === "pending");
  const active  = users.filter(u => u.status !== "pending");

  return (
    <div className="space-y-4">
      {/* Oczekujące na zatwierdzenie */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Czeka na zatwierdzenie ({pending.length})</h3>
          </div>
          <div className="space-y-2">
            {pending.map(u => (
              <Card key={u.id} className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-900 flex items-center justify-center text-sm font-bold text-amber-700 dark:text-amber-300 flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}{u.phone && ` · ${u.phone}`}</p>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setStatus.mutate({ id: u.id, status: "active" })}
                      disabled={setStatus.isPending}
                      data-testid={`button-approve-${u.id}`}>
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />Zatwierdź
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => setStatus.mutate({ id: u.id, status: "blocked" })}
                      disabled={setStatus.isPending}
                      data-testid={`button-block-${u.id}`}>
                      <ShieldX className="w-3.5 h-3.5 mr-1" />Odrzuć
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Aktywni/zablokowani */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Wszyscy ({active.length})</h3>
          <AddUserDialog onSuccess={invalidate} />
        </div>
        {loading ? <Skeleton className="h-40 rounded-xl" /> : (
          <div className="space-y-2">
            {active.map(u => (
              <Card key={u.id} className={u.status === "blocked" ? "opacity-60" : ""} data-testid={`card-user-${u.id}`}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}{u.phone && ` · ${u.phone}`}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RoleBadge role={u.role} />
                    {u.status === "blocked" && <span className="text-xs text-red-500 font-medium">Zablokowany</span>}
                    {u.status === "blocked" ? (
                      <button onClick={() => setStatus.mutate({ id: u.id, status: "active" })}
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors" title="Odblokuj">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                    ) : u.role !== "owner" ? (
                      <button onClick={() => setStatus.mutate({ id: u.id, status: "blocked" })}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Zablokuj">
                        <ShieldX className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VehiclesTab — wszystkie pojazdy warsztatu ────────────────────────────────
function VehiclesTab({ vehicles, users }: { vehicles: any[]; users: any[] }) {
  const [search, setSearch] = useState("");
  const clientMap = Object.fromEntries(users.filter(u => u.role === "client").map(u => [u.id, u]));

  const filtered = vehicles.filter(v => {
    const owner = clientMap[v.clientId];
    return !search
      || `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase())
      || (v.licensePlate || "").toLowerCase().includes(search.toLowerCase())
      || (owner?.name || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Wszystkie pojazdy ({vehicles.length})</h2>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Szukaj pojazdu lub klienta..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        {filtered.map(v => {
          const owner = clientMap[v.clientId];
          return (
            <Card key={v.id} data-testid={`card-vehicle-${v.id}`}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Car className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{v.brand} {v.model}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {v.year && <span>{v.year}</span>}
                    {v.licensePlate && <span>· {v.licensePlate}</span>}
                    {v.engineSize && <span>· {v.engineSize}</span>}
                  </div>
                  {owner && <p className="text-xs text-primary mt-0.5 font-medium">{owner.name}{owner.phone && ` · ${owner.phone}`}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">Brak pojazdów</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

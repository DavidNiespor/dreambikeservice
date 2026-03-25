import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, ChevronRight, Plus, LayoutDashboard, ClipboardList } from "lucide-react";
import type { Vehicle } from "@shared/schema";

const navItems = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: "/pojazdy", label: "Moje pojazdy", icon: <Car className="w-4 h-4" /> },
  { href: "/zlecenia", label: "Moje zlecenia", icon: <ClipboardList className="w-4 h-4" /> },
];

export default function ClientVehicles() {
  const { toast } = useToast();
  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });

  return (
    <AppLayout title="Moje pojazdy" navItems={navItems}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Moje pojazdy</h1>
          <AddVehicleDialog onSuccess={invalidate} />
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : vehicles?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Car className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Brak pojazdów. Dodaj swój motocykl.</p>
              <div className="mt-4">
                <AddVehicleDialog onSuccess={invalidate} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {vehicles?.map(v => (
              <Link key={v.id} href={`/vehicles/${v.id}/history`}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`card-vehicle-${v.id}`}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{v.brand} {v.model}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                        {v.year && <span>{v.year}</span>}
                        {v.licensePlate && <span>· {v.licensePlate}</span>}
                        {v.engineSize && <span>· {v.engineSize}</span>}
                      </div>
                      {v.vin && <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">VIN: {v.vin}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AddVehicleDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand: "", model: "", year: "", licensePlate: "", vin: "", engineSize: "", notes: "" });
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/vehicles", { ...form, year: form.year ? parseInt(form.year) : undefined }),
    onSuccess: () => { setOpen(false); setForm({ brand: "", model: "", year: "", licensePlate: "", vin: "", engineSize: "", notes: "" }); onSuccess(); toast({ title: "Pojazd dodany" }); },
    onError: (e: any) => toast({ title: "Błąd", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="button-add-vehicle">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Dodaj pojazd
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader><DialogTitle>Nowy pojazd</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Marka *</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Honda" /></div>
            <div><Label className="text-xs">Model *</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="CBR600" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Rok</Label><Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2020" /></div>
            <div><Label className="text-xs">Pojemność</Label><Input value={form.engineSize} onChange={e => setForm(f => ({ ...f, engineSize: e.target.value }))} placeholder="600cc" /></div>
          </div>
          <div><Label className="text-xs">Tablica rejestracyjna</Label><Input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))} placeholder="KR 12345" /></div>
          <div><Label className="text-xs">VIN</Label><Input value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} placeholder="JH2PC..." /></div>
          <div><Label className="text-xs">Uwagi</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="np. zmodyfikowany wydech" /></div>
          <Button className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending || !form.brand || !form.model}>
            {mut.isPending ? "Zapisywanie..." : "Dodaj pojazd"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

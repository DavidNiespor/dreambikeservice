import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch } from "@/lib/queryClient";
import AppLayout from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Car, ChevronRight, Calendar, Gauge } from "lucide-react";
import type { Vehicle, RepairOrder } from "@shared/schema";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useLocation } from "wouter";

const navItems: any[] = [];

export default function VehicleHistory() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: vehicle, isLoading: vLoading } = useQuery<Vehicle>({
    queryKey: ["/api/vehicles", id],
    queryFn: async () => { const r = await apiFetch(`/api/vehicles/${id}`); return r.json(); }
  });

  const { data: orders = [], isLoading: oLoading } = useQuery<RepairOrder[]>({
    queryKey: ["/api/vehicles", id, "orders"],
    queryFn: async () => { const r = await apiFetch(`/api/vehicles/${id}/orders`); return r.json(); }
  });

  return (
    <AppLayout title="Historia pojazdu" navItems={navItems}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold">Książka napraw</h1>
        </div>

        {vLoading ? <Skeleton className="h-24 rounded-xl" /> : vehicle && (
          <Card>
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-base">{vehicle.brand} {vehicle.model}</h2>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                    {vehicle.year && <span>{vehicle.year}</span>}
                    {vehicle.licensePlate && <span>· {vehicle.licensePlate}</span>}
                    {vehicle.engineSize && <span>· {vehicle.engineSize}</span>}
                  </div>
                  {vehicle.vin && <p className="text-xs text-muted-foreground font-mono mt-1">VIN: {vehicle.vin}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Historia napraw</h2>
          <span className="text-xs text-muted-foreground">{orders.length} wpisów</span>
        </div>

        {oLoading ? <Skeleton className="h-40 rounded-xl" /> : orders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Brak historii napraw dla tego pojazdu
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
            <div className="space-y-3 pl-10">
              {orders.map((o, i) => (
                <Link key={o.id} href={`/orders/${o.id}`}>
                  <div className="relative" data-testid={`history-order-${o.id}`}>
                    {/* Dot */}
                    <div className={`absolute -left-[1.85rem] top-3 w-3 h-3 rounded-full border-2 ${o.status === "paid" || o.status === "completed" ? "bg-emerald-500 border-emerald-500" : "bg-background border-primary"}`} />
                    <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                      <CardContent className="py-3 px-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm">{o.title}</p>
                          <StatusBadge status={o.status} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{o.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(o.createdAt), "d MMM yyyy", { locale: pl })}</span>
                          {o.mileage && <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{o.mileage.toLocaleString()} km</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

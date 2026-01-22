import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, 
  Clock, CheckCircle, AlertTriangle, Loader2,
  Calendar, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, differenceInDays, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrderReport {
  id: string;
  order_name: string;
  fabric_type: string | null;
  po_termin_date: string | null;
  shipped_date: string | null;
  is_fast_track: boolean;
  status: string;
  delay_days: number | null;
}

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_name, fabric_type, po_termin_date, shipped_date, is_fast_track, status")
        .eq("user_id", user.id)
        .order("po_termin_date", { ascending: false });

      if (error) throw error;

      const mappedData: OrderReport[] = (data || []).map((order: any) => {
        let delay_days: number | null = null;
        
        if (order.po_termin_date && order.shipped_date) {
          delay_days = differenceInDays(
            parseISO(order.shipped_date),
            parseISO(order.po_termin_date)
          );
        }

        return {
          id: order.id,
          order_name: order.order_name,
          fabric_type: order.fabric_type,
          po_termin_date: order.po_termin_date,
          shipped_date: order.shipped_date,
          is_fast_track: order.is_fast_track || false,
          status: order.status,
          delay_days,
        };
      });

      setOrders(mappedData);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [{ value: "all", label: "Tüm Zamanlar" }];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy", { locale: tr }),
      });
    }
    return options;
  }, []);

  // Filter orders by selected month
  const filteredOrders = useMemo(() => {
    if (selectedMonth === "all") return orders;
    
    const [year, month] = selectedMonth.split("-").map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    
    return orders.filter(order => {
      if (!order.po_termin_date) return false;
      const date = parseISO(order.po_termin_date);
      return date >= start && date <= end;
    });
  }, [orders, selectedMonth]);

  // Calculate stats
  const stats = useMemo(() => {
    const withShipDate = filteredOrders.filter(o => o.shipped_date && o.po_termin_date);
    const onTime = withShipDate.filter(o => o.delay_days !== null && o.delay_days <= 0);
    const delayed = withShipDate.filter(o => o.delay_days !== null && o.delay_days > 0);
    const ftOrders = filteredOrders.filter(o => o.is_fast_track);
    const ftWithShipDate = ftOrders.filter(o => o.shipped_date && o.po_termin_date);
    const ftOnTime = ftWithShipDate.filter(o => o.delay_days !== null && o.delay_days <= 0);
    
    const onTimePercent = withShipDate.length > 0 
      ? Math.round((onTime.length / withShipDate.length) * 100) 
      : 0;
    
    const ftOnTimePercent = ftWithShipDate.length > 0
      ? Math.round((ftOnTime.length / ftWithShipDate.length) * 100)
      : 0;
    
    const avgDelay = delayed.length > 0
      ? Math.round(delayed.reduce((acc, o) => acc + (o.delay_days || 0), 0) / delayed.length)
      : 0;

    return {
      total: filteredOrders.length,
      withShipDate: withShipDate.length,
      onTime: onTime.length,
      delayed: delayed.length,
      onTimePercent,
      ftTotal: ftOrders.length,
      ftOnTimePercent,
      avgDelay,
    };
  }, [filteredOrders]);

  // Delayed orders list
  const delayedOrders = useMemo(() => {
    return filteredOrders
      .filter(o => o.delay_days !== null && o.delay_days > 0)
      .sort((a, b) => (b.delay_days || 0) - (a.delay_days || 0));
  }, [filteredOrders]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Button>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gradient">Raporlar</h1>
              <p className="text-muted-foreground mt-1">
                Sipariş performansı ve termin analizi
              </p>
            </div>
            
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Dönem seçin" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <BarChart3 className="h-10 w-10 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Zamanında Yüklenen</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-green-600">{stats.onTimePercent}%</p>
                    <span className="text-sm text-muted-foreground">({stats.onTime}/{stats.withShipDate})</span>
                  </div>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
              </div>
              <Progress value={stats.onTimePercent} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Geciken Siparişler</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-red-600">{stats.delayed}</p>
                    <span className="text-sm text-muted-foreground">(ort. {stats.avgDelay} gün)</span>
                  </div>
                </div>
                <TrendingDown className="h-10 w-10 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Zap className="h-4 w-4 text-amber-500" />
                    FT Siparişler
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-amber-600">{stats.ftTotal}</p>
                    <span className="text-sm text-muted-foreground">(%{stats.ftOnTimePercent} zamanında)</span>
                  </div>
                </div>
                <Zap className="h-10 w-10 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delayed Orders Table */}
        {delayedOrders.length > 0 && (
          <Card className="glass-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Geciken Siparişler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Kumaş</TableHead>
                    <TableHead>PO Termin</TableHead>
                    <TableHead>Yüklenme Tarihi</TableHead>
                    <TableHead>Gecikme</TableHead>
                    <TableHead>Tip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delayedOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_name}</TableCell>
                      <TableCell>{order.fabric_type || "-"}</TableCell>
                      <TableCell>
                        {order.po_termin_date 
                          ? format(parseISO(order.po_termin_date), "d MMM yyyy", { locale: tr })
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {order.shipped_date 
                          ? format(parseISO(order.shipped_date), "d MMM yyyy", { locale: tr })
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {order.delay_days} gün
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.is_fast_track ? (
                          <Badge className="bg-amber-500/20 text-amber-700 gap-1">
                            <Zap className="h-3 w-3" />
                            FT
                          </Badge>
                        ) : (
                          <Badge variant="outline">Standart</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* All Orders Summary */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Sipariş Özeti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Toplam</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-100 dark:bg-green-900/30">
                <p className="text-2xl font-bold text-green-600">{stats.onTime}</p>
                <p className="text-sm text-muted-foreground">Zamanında</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-100 dark:bg-red-900/30">
                <p className="text-2xl font-bold text-red-600">{stats.delayed}</p>
                <p className="text-sm text-muted-foreground">Gecikmiş</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-100 dark:bg-gray-900/30">
                <p className="text-2xl font-bold">{stats.total - stats.withShipDate}</p>
                <p className="text-sm text-muted-foreground">Beklemede</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <footer className="border-t border-border/50 py-6 mt-12 bg-card/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            TAHA GİYİM - 2025 ARALIK - AKIN ALTUN
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Reports;

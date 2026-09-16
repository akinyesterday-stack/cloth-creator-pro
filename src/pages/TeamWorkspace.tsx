import { useState } from "react";
import { Header } from "@/components/Header";
import { NotificationsPage } from "@/components/NotificationsPage";
import { WorkOrderList } from "@/components/WorkOrderList";
import { TeamReport } from "@/components/TeamReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Bell, ClipboardList } from "lucide-react";

const TITLES: Record<string, string> = {
  planlama: "Planlama Uzmanı Paneli",
  fabric: "Kumaş Sorumlusu Paneli",
  kesim_takip: "Kesim Takip Paneli",
  fason: "Fason Paneli",
};

const TeamWorkspace = () => {
  const { userType } = useAuth();
  const [activeTab, setActiveTab] = useState("workorders");

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <Header onRadioToggle={() => {}} isRadioOpen={false} />

      <main className="container mx-auto px-4 py-8 relative z-10">
        <h1 className="text-2xl font-bold mb-6">{TITLES[userType] || "Ekip Paneli"}</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-card/80 backdrop-blur-sm border">
            <TabsTrigger value="workorders" className="gap-2">
              <ClipboardList className="h-4 w-4" /> İş Emirleri
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" /> Bildirimler
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Ekip Raporu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workorders">
            <WorkOrderList />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsPage />
          </TabsContent>
          <TabsContent value="report">
            <TeamReport />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeamWorkspace;

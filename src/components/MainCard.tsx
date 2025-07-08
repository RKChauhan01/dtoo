import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendSection } from "./SendSection";
import { ReceiveSection } from "./ReceiveSection";
export const MainCard = () => {
  const [activeTab, setActiveTab] = useState("send");
  return <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-4">
      {/* Tab Navigation */}
      <div className="mb-8 flex gap-4">
        <Button onClick={() => setActiveTab("send")} className={`px-12 py-3 rounded-full text-white font-medium transition-all ${activeTab === "send" ? "bg-primary hover:bg-primary/90" : "bg-transparent border-2 border-white/30 hover:border-white/50"}`}>
          SEND
        </Button>
        <Button onClick={() => setActiveTab("receive")} className={`px-12 py-3 rounded-full text-white font-medium transition-all ${activeTab === "receive" ? "bg-primary hover:bg-primary/90" : "bg-transparent border-2 border-white/30 hover:border-white/50"}`}>
          RECEIVE
        </Button>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-2xl bg-card border-card-border shadow-2xl">
        <CardContent className="p-0">
          {activeTab === "send" ? <SendSection /> : <ReceiveSection />}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-12 text-center text-white/70 text-sm">
        <p className="text-base">©2024 dtoo.lovable.app all right reserve.</p>
        <div className="mt-2 space-x-4">
          <span className="hover:text-white cursor-pointer">terms of use</span>
          <span>|</span>
          <span className="hover:text-white cursor-pointer">privacy policy</span>
        </div>
      </div>
    </div>;
};
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SendFileTab } from "@/components/SendFileTab";
import { ReceiveFileTab } from "@/components/ReceiveFileTab";
import { Share, File, Zap, Shield, Globe } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
const Index = () => {
  const [activeTab, setActiveTab] = useState("send");
  useEffect(() => {
    // Check for receive URL parameter on page load
    const hash = window.location.hash;
    if (hash.startsWith("#receive=")) {
      setActiveTab("receive");
    }
  }, []);
  return <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="relative">
              <img src={heroImage} alt="File sharing visualization" className="w-full h-64 object-cover rounded-2xl shadow-card mb-8 opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent rounded-2xl" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">WebRTC</span> File Share
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Share files directly between devices with zero servers. Fast, secure, and completely peer-to-peer.
            </p>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span>No Upload Limits</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>End-to-End</span>  
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span>Works Anywhere</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Sharing Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="glass-effect border-card-border">
            <CardContent className="p-8 bg-gray-50">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold gradient-text mb-4">File Transfer Tool</h2>
                <p className="text-zinc-950">Send or receive files instantly</p>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full bg-gray-50">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-amber-500">
                  <TabsTrigger value="send" className="flex items-center gap-2 text-zinc-50 bg-pink-950 hover:bg-pink-800">
                    <Share className="w-4 h-4" />
                    Share File
                  </TabsTrigger>
                  <TabsTrigger value="receive" className="data-[state=active]:text-primary-foreground flex items-center gap-2 bg-blue-950 hover:bg-blue-800">
                    <File className="w-4 h-4" />
                    Receive File
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="send">
                  <SendFileTab />
                </TabsContent>
                
                <TabsContent value="receive">
                  <ReceiveFileTab />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold text-card-foreground">Lightning Fast</h4>
            <p className="text-sm text-muted-foreground">Direct peer-to-peer connection for maximum speed</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold text-card-foreground">Completely Private</h4>
            <p className="text-sm text-muted-foreground">Files never touch our servers - 100% private transfer</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold text-card-foreground">No Limits</h4>
            <p className="text-sm text-muted-foreground">Share files of any size without restrictions</p>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;
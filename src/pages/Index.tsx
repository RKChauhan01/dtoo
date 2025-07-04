import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileShareModal } from "@/components/FileShareModal";
import { Share2, Zap, Shield, Globe } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="relative">
              <img 
                src={heroImage} 
                alt="File sharing visualization" 
                className="w-full h-64 object-cover rounded-2xl shadow-card mb-8 opacity-80"
              />
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

      {/* Tool Card Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card 
            className="glass-effect hover:glow-effect transition-all duration-300 cursor-pointer group border-card-border"
            onClick={() => setIsModalOpen(true)}
          >
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-primary rounded-2xl flex items-center justify-center shadow-button group-hover:scale-110 transition-transform duration-300">
                <Share2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-card-foreground">
                Start File Transfer
              </h3>
              <p className="text-muted-foreground">
                Send or receive files instantly using WebRTC technology
              </p>
              <div className="pt-2">
                <Button className="bg-gradient-primary hover:shadow-button transition-all duration-300">
                  Launch Tool
                </Button>
              </div>
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

      <FileShareModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default Index;
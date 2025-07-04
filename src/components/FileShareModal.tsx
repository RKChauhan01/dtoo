import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendFileTab } from "@/components/SendFileTab";
import { ReceiveFileTab } from "@/components/ReceiveFileTab";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
interface FileShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}
export const FileShareModal = ({
  isOpen,
  onClose
}: FileShareModalProps) => {
  const [activeTab, setActiveTab] = useState("send");
  useEffect(() => {
    if (isOpen) {
      // Check for receive URL parameter
      const hash = window.location.hash;
      if (hash.startsWith("#receive=")) {
        setActiveTab("receive");
        // Don't clear the hash yet - let the receive tab handle it
      }
    }
  }, [isOpen]);
  const handleClose = () => {
    // Reset everything when modal closes
    setActiveTab("send");
    // Clear URL hash
    if (window.location.hash.startsWith("#receive=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    onClose();
  };
  return <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full border-card-border shadow-card max-h-[90vh] flex flex-col bg-stone-200 rounded">
        <div className="flex items-center justify-between p-6 border-b border-card-border flex-shrink-0">
          <h2 className="text-2xl font-bold gradient-text">WebRTC File Transfer</h2>
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted">
                <TabsTrigger value="send" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Send File
                </TabsTrigger>
                <TabsTrigger value="receive" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Receive File
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="send" className="mt-6">
                <SendFileTab />
              </TabsContent>
              
              <TabsContent value="receive" className="mt-6">
                <ReceiveFileTab />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>;
};
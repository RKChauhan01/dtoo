import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileInfo {
  name: string;
  size: number;
  type: string;
  file: File;
}

export const SendSection = () => {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [sendMethod, setSendMethod] = useState("direct");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    setSelectedFile({
      name: file.name,
      size: file.size,
      type: file.type,
      file
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSend = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    
    // Simulate sending process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "File Sent Successfully!",
      description: `${selectedFile.name} has been sent via ${sendMethod}`,
    });
    
    setIsLoading(false);
    setSelectedFile(null);
    setEmail("");
    setMessage("");
  };

  return (
    <div className="p-8">
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors mb-6 ${
          selectedFile 
            ? "border-primary bg-primary/5" 
            : "border-gray-300 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
      >
        {selectedFile ? (
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-card-foreground">
              {selectedFile.name}
            </div>
            <div className="text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="mt-2"
            >
              Remove File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <div>
              <div className="text-lg text-card-foreground mb-2">
                <strong>Choose a file</strong> or drag it here
              </div>
              <div className="text-sm text-muted-foreground">
                Any file type, any size
              </div>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
      </div>

      {/* Send Methods */}
      <Tabs value={sendMethod} onValueChange={setSendMethod} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger 
            value="direct" 
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            DIRECT
          </TabsTrigger>
          <TabsTrigger 
            value="link" 
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            LINK
          </TabsTrigger>
          <TabsTrigger 
            value="email" 
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            EMAIL
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="direct" className="mt-4">
          <div className="text-center text-muted-foreground">
            Direct peer-to-peer file transfer
          </div>
        </TabsContent>
        
        <TabsContent value="link" className="mt-4">
          <div className="text-center text-muted-foreground">
            Generate a shareable link for the file
          </div>
        </TabsContent>
        
        <TabsContent value="email" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Recipient email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
          </div>
          <Textarea
            placeholder="Your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </TabsContent>
      </Tabs>

      {/* Send Button */}
      <Button
        onClick={handleSend}
        disabled={!selectedFile || isLoading || (sendMethod === "email" && !email)}
        className="w-full bg-accent-purple hover:bg-accent-purple/90 text-white py-6 text-lg font-medium rounded-xl"
      >
        {isLoading ? (
          <>
            <Send className="w-5 h-5 mr-2 animate-pulse" />
            SENDING...
          </>
        ) : (
          "SEND"
        )}
      </Button>
    </div>
  );
};
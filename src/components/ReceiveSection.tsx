import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReceivedFile {
  name: string;
  size: number;
  type: string;
  blob: Blob;
  date: string;
}

export const ReceiveSection = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<ReceivedFile[]>([]);
  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "receiving" | "complete">("idle");
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const expectedSizeRef = useRef<number>(0);
  const receivedSizeRef = useRef<number>(0);
  const currentFileMetadataRef = useRef<any>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Check for receive URL parameter on component mount
    const hash = window.location.hash;
    if (hash.startsWith("#receive=")) {
      try {
        const receivedCode = hash.substring(9); // Remove "#receive="
        setCode(receivedCode);
        
        // Clear the hash from URL
        window.history.replaceState(null, "", window.location.pathname);
      } catch (error) {
        console.error("Error parsing URL code:", error);
      }
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleReceive = async () => {
    if (!code.trim() || code.length !== 6) return;
    
    setIsLoading(true);
    setConnectionState("connecting");

    try {
      // Check if there's a file with this code in localStorage
      const storedFileData = localStorage.getItem(`file_${code}`);
      
      if (!storedFileData) {
        throw new Error("Invalid code or file not found");
      }

      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const fileData = JSON.parse(storedFileData);
      
      // Check if file is not expired (1 hour)
      if (Date.now() - fileData.timestamp > 3600000) {
        localStorage.removeItem(`file_${code}`);
        throw new Error("File has expired");
      }

      setConnectionState("receiving");
      toast({
        title: "Code Accepted!",
        description: "Receiving file..."
      });

      // Simulate receiving progress
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create blob from stored array buffer
      const arrayBuffer = new Uint8Array(fileData.fileArrayBuffer).buffer;
      const blob = new Blob([arrayBuffer], { type: fileData.metadata.type });
      
      const newFile: ReceivedFile = {
        name: fileData.metadata.name,
        size: fileData.metadata.size,
        type: fileData.metadata.type,
        blob: blob,
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })
      };

      setFiles(prev => [...prev, newFile]);
      setConnectionState("complete");
      setIsLoading(false);
      
      toast({
        title: "File Received!",
        description: `Successfully received ${fileData.metadata.name}`
      });

      // Clean up the stored file after successful receive
      localStorage.removeItem(`file_${code}`);
      
    } catch (error) {
      console.error("Error during receive:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not connect to sender. Please check the code.";
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsLoading(false);
      setConnectionState("idle");
    }
  };

  const handleDataChannelMessage = (data: any) => {
    if (typeof data === "string") {
      // File metadata received
      try {
        const metadata = JSON.parse(data);
        currentFileMetadataRef.current = metadata;
        setConnectionState("receiving");
        expectedSizeRef.current = metadata.size;
        receivedSizeRef.current = 0;
        receivedChunksRef.current = [];
        
        toast({
          title: "Receiving File",
          description: `Receiving ${metadata.name}...`
        });
      } catch (error) {
        console.error("Error parsing file metadata:", error);
      }
    } else if (data instanceof ArrayBuffer) {
      // File chunk received
      receivedChunksRef.current.push(data);
      receivedSizeRef.current += data.byteLength;
      
      const progress = Math.round((receivedSizeRef.current / expectedSizeRef.current) * 100);
      
      if (receivedSizeRef.current >= expectedSizeRef.current || progress >= 100) {
        completeFileReceive();
      }
    }
  };

  const completeFileReceive = () => {
    const metadata = currentFileMetadataRef.current;
    if (!metadata) return;

    try {
      const blob = new Blob(receivedChunksRef.current, { type: metadata.type });
      
      const newFile: ReceivedFile = {
        name: metadata.name,
        size: metadata.size,
        type: metadata.type,
        blob: blob,
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        })
      };

      setFiles(prev => [...prev, newFile]);
      setConnectionState("complete");
      setIsLoading(false);
      
      toast({
        title: "File Received!",
        description: `Successfully received ${metadata.name}`
      });

    } catch (error) {
      console.error("Error creating file:", error);
      toast({
        title: "Error",
        description: "Failed to process received file",
        variant: "destructive"
      });
    }
  };

  const downloadFile = (file: ReceivedFile) => {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `Downloading ${file.name}`
    });
  };

  const downloadAllFiles = () => {
    files.forEach(file => {
      setTimeout(() => downloadFile(file), 100);
    });
  };

  const handleRefresh = () => {
    setFiles([]);
    setCode("");
    setConnectionState("idle");
    setIsLoading(false);
    
    // Clean up WebRTC connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  return (
    <div className="p-8">
      {/* Code Input */}
      <div className="mb-6">
        <div className="text-center mb-4">
          <div className="text-6xl font-bold text-primary mb-2">
            {code || "000000"}
          </div>
          <div className="text-muted-foreground">
            Enter the 6-digit code from sender
          </div>
        </div>
        
        <Input 
          placeholder="Enter 6-digit code" 
          value={code} 
          onChange={(e) => setCode(e.target.value.slice(0, 6).toUpperCase())} 
          maxLength={6} 
          className="text-center text-4xl font-mono py-6 mb-4 bg-white" 
        />
        
        <Button 
          onClick={handleReceive} 
          disabled={code.length !== 6 || isLoading || connectionState !== "idle"} 
          className="w-full py-6 text-lg font-medium rounded-xl"
          style={{
            backgroundColor: code.length !== 6 || isLoading || connectionState !== "idle" ? 'hsl(240 5% 90%)' : 'hsl(283 100% 60%)',
            color: code.length !== 6 || isLoading || connectionState !== "idle" ? 'hsl(240 3.8% 46.1%)' : 'white',
            borderColor: code.length !== 6 || isLoading || connectionState !== "idle" ? 'hsl(240 20% 80%)' : 'hsl(283 100% 60%)',
            cursor: code.length !== 6 || isLoading || connectionState !== "idle" ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              {connectionState === "connecting" ? "CONNECTING..." : "RECEIVING..."}
            </>
          ) : connectionState === "connected" ? (
            "WAITING FOR FILE..."
          ) : connectionState === "receiving" ? (
            "RECEIVING FILE..."
          ) : (
            "RECEIVE"
          )}
        </Button>
      </div>

      {/* Files List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">Files</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            className="bg-rose-700 hover:bg-rose-600 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-sm">
              {connectionState === "connected" ? "Waiting for files..." : "No files received yet"}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-card-foreground">
                    {file.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} • Received {file.date}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => downloadFile(file)}
                  className="text-primary border-primary hover:bg-primary hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
            
            <div className="text-center pt-4">
              <div className="text-sm text-muted-foreground mb-2">
                Total {files.length} files • {formatFileSize(files.reduce((acc, file) => acc + file.size, 0))}
              </div>
              <Button 
                variant="outline" 
                onClick={downloadAllFiles}
                className="text-primary border-primary hover:bg-primary hover:text-white"
              >
                Download All
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
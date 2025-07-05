import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Copy, CheckCircle2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

export const ReceiveFileTab = () => {
  const [offerText, setOfferText] = useState("");
  const [answer, setAnswer] = useState("");
  const [connectionState, setConnectionState] = useState<"idle" | "generating" | "waiting" | "receiving" | "complete">("idle");
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const expectedSizeRef = useRef<number>(0);
  const receivedSizeRef = useRef<number>(0);
  const fileMetadataRef = useRef<FileMetadata | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for receive URL parameter on component mount
    const hash = window.location.hash;
    if (hash.startsWith("#receive=")) {
      try {
        const base64Offer = hash.substring(9); // Remove "#receive="
        const offerJson = atob(base64Offer);
        setOfferText(offerJson);
        setStatus("Offer loaded from URL. Click 'Generate Response Code' to continue.");
        
        // Clear the hash from URL
        window.history.replaceState(null, "", window.location.pathname);
      } catch (error) {
        console.error("Error parsing URL offer:", error);
        setStatus("Error: Invalid offer in URL");
      }
    }
  }, []);

  const generateAnswer = async () => {
    if (!offerText.trim()) return;

    try {
      setConnectionState("generating");
      setStatus("Generating response code...");

      // Create RTCPeerConnection with STUN servers
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Handle incoming data channel
      peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        console.log("Data channel received:", dataChannel.label);

        dataChannel.onopen = () => {
          console.log("Data channel opened");
          setConnectionState("waiting");
          setStatus("Connected! Waiting for file...");
        };

        dataChannel.onmessage = (event) => {
          handleDataChannelMessage(event.data);
        };

        dataChannel.onclose = () => {
          console.log("Data channel closed");
        };

        dataChannel.onerror = (error) => {
          console.error("Data channel error:", error);
          setStatus("Error: Connection failed");
        };
      };

      // Parse and set remote description
      const offer = JSON.parse(offerText.trim());
      await peerConnection.setRemoteDescription(offer);

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        peerConnection.onicecandidate = (event) => {
          if (event.candidate === null) {
            // ICE gathering complete
            resolve();
          }
        };
      });

      const answerJson = JSON.stringify(peerConnection.localDescription);
      setAnswer(answerJson);
      setStatus("Response code generated. Share it with the sender.");

    } catch (error) {
      console.error("Error generating answer:", error);
      setStatus("Error: Invalid offer code");
      toast({
        title: "Error",
        description: "Invalid offer code format",
        variant: "destructive"
      });
    }
  };

  const handleDataChannelMessage = (data: any) => {
    console.log("Data channel message received, type:", typeof data, "data:", data);
    
    if (typeof data === "string") {
      // First message should be metadata
      console.log("Received string message, parsing as metadata:", data);
      try {
        const metadata: FileMetadata = JSON.parse(data);
        console.log("Parsed metadata:", metadata);
        setFileMetadata(metadata);
        fileMetadataRef.current = metadata; // Store in ref for immediate access
        setConnectionState("receiving");
        setStatus(`Receiving ${metadata.name}...`);
        expectedSizeRef.current = metadata.size;
        receivedSizeRef.current = 0;
        receivedChunksRef.current = [];
        setReceiveProgress(0);
        console.log("File metadata set successfully:", metadata);
      } catch (error) {
        console.error("Error parsing metadata:", error);
      }
    } else if (data instanceof ArrayBuffer) {
      // File chunk received
      receivedChunksRef.current.push(data);
      receivedSizeRef.current += data.byteLength;
      
      const progress = Math.round((receivedSizeRef.current / expectedSizeRef.current) * 100);
      setReceiveProgress(progress);
      
      console.log(`Received: ${receivedSizeRef.current}/${expectedSizeRef.current} bytes (${progress}%)`);
      
      // Check if we've received all data - use a small tolerance for floating point comparison
      if (receivedSizeRef.current >= expectedSizeRef.current || progress >= 100) {
        console.log("File transfer complete, calling completeFileReceive");
        completeFileReceive();
      } else {
        setStatus(`Receiving file... ${progress}%`);
      }
    }
  };

  const completeFileReceive = () => {
    console.log("completeFileReceive called");
    const metadata = fileMetadataRef.current;
    if (!metadata) {
      console.log("No file metadata available in ref");
      return;
    }

    try {
      console.log("Creating blob from", receivedChunksRef.current.length, "chunks");
      // Combine all chunks into a single blob
      const blob = new Blob(receivedChunksRef.current, { type: metadata.type });
      const url = URL.createObjectURL(blob);
      
      console.log("Blob created successfully, size:", blob.size);
      
      setDownloadUrl(url);
      setConnectionState("complete");
      setStatus("File received successfully!");
      setReceiveProgress(100);
      
      toast({
        title: "Success",
        description: "File received successfully!",
        variant: "default"
      });

      console.log("File received successfully:", {
        name: metadata.name,
        size: blob.size,
        type: metadata.type
      });

    } catch (error) {
      console.error("Error creating download:", error);
      setStatus("Error creating download");
      toast({
        title: "Error",
        description: "Failed to create download",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      toast({
        title: "Copied!",
        description: "Response code copied to clipboard",
        variant: "default"
      });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const downloadFile = () => {
    if (!downloadUrl || !fileMetadata) return;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileMetadata.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Paste Offer */}
      <Card className="border-card-border">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-card-foreground">1. Paste Sender's Code</h3>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Paste the connection code from the sender here..."
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              className="font-mono text-xs"
              rows={4}
            />
            <Button
              onClick={generateAnswer}
              disabled={!offerText.trim() || connectionState !== "idle"}
              className="bg-gradient-primary hover:shadow-button transition-all duration-300"
            >
              Generate Response Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Code */}
      {answer && (
        <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">2. Share Response Code</h3>
            
            <div className="space-y-4">
              <Textarea
                value={answer}
                readOnly
                className="font-mono text-xs bg-muted"
                rows={4}
              />
              <Button
                variant="outline"
                size="sm"
                className={copySuccess ? 'copy-success' : ''}
                onClick={() => copyToClipboard(answer)}
              >
                {copySuccess ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copySuccess ? 'Copied!' : 'Copy Code'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Send this response code back to the sender
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Metadata */}
      {fileMetadata && (
        <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Incoming File</h3>
            
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-card-foreground">{fileMetadata.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(fileMetadata.size)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {connectionState === "receiving" && (
        <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Receiving File</h3>
            <Progress value={receiveProgress} className="mb-2" />
            <p className="text-sm text-muted-foreground">{status}</p>
          </CardContent>
        </Card>
      )}

      {/* Download */}
      {connectionState === "complete" && downloadUrl && fileMetadata && (
        <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Download Ready</h3>
            
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 p-4 bg-success/10 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-success" />
                <div>
                  <p className="font-medium text-card-foreground">File received successfully!</p>
                  <p className="text-sm text-muted-foreground">{fileMetadata.name}</p>
                </div>
              </div>
              
              <Button
                onClick={downloadFile}
                className="bg-gradient-primary hover:shadow-button transition-all duration-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Download {fileMetadata.name}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Messages */}
      {status && (
        <div className="text-center">
          <p className={`text-sm ${
            connectionState === "complete" ? "text-success" : 
            status.includes("Error") ? "text-destructive" : 
            "text-muted-foreground"
          }`}>
            {status}
          </p>
        </div>
      )}
    </div>
  );
};
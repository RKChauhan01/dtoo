import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Copy, CheckCircle2, FileText, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface FileMetadata {
  name: string;
  size: number;
  type: string;
}
export const ReceiveFileTab = () => {
  const [offerText, setOfferText] = useState("");
  const [sixDigitCode, setSixDigitCode] = useState("");
  const [answer, setAnswer] = useState("");
  const [connectionState, setConnectionState] = useState<"idle" | "generating" | "waiting" | "receiving" | "complete">("idle");
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [status, setStatus] = useState("");
  const [receivedFiles, setReceivedFiles] = useState<Array<{
    metadata: FileMetadata;
    url: string;
  }>>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const expectedSizeRef = useRef<number>(0);
  const receivedSizeRef = useRef<number>(0);
  const currentFileMetadataRef = useRef<FileMetadata | null>(null);
  const {
    toast
  } = useToast();

  // Helper function to extract code from offer if needed
  const extractCodeFromOffer = (offerJson: string): string | null => {
    // This would be used if the offer contained the original code
    // For now, we'll rely on the sixDigitCode state
    return null;
  };
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

  // Handle 6-digit code input
  const handleSixDigitCodeSubmit = async () => {
    if (sixDigitCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }
    try {
      // Retrieve offer data using the 6-digit code
      const storedOffer = localStorage.getItem(`offer_${sixDigitCode}`);
      if (!storedOffer) {
        setStatus("Error: Invalid 6-digit code");
        toast({
          title: "Error",
          description: "Invalid 6-digit code or code has expired",
          variant: "destructive"
        });
        return;
      }
      setOfferText(storedOffer);
      await generateAnswer(storedOffer);
    } catch (error) {
      console.error("Error with 6-digit code:", error);
      setStatus("Error: Invalid 6-digit code");
      toast({
        title: "Error",
        description: "Failed to process 6-digit code",
        variant: "destructive"
      });
    }
  };
  const generateAnswer = async (customOfferText?: string) => {
    const offerToUse = customOfferText || offerText.trim();
    if (!offerToUse) return;
    try {
      setConnectionState("generating");
      setStatus("Connecting to sender...");

      // Create RTCPeerConnection with STUN servers
      const peerConnection = new RTCPeerConnection({
        iceServers: [{
          urls: "stun:stun.l.google.com:19302"
        }, {
          urls: "stun:stun1.l.google.com:19302"
        }]
      });
      peerConnectionRef.current = peerConnection;

      // Handle incoming data channel
      peerConnection.ondatachannel = event => {
        const dataChannel = event.channel;
        console.log("Data channel received:", dataChannel.label);
        dataChannel.onopen = () => {
          console.log("Data channel opened");
          setConnectionState("waiting");
          setStatus("Connected! Waiting for file...");
        };
        dataChannel.onmessage = event => {
          handleDataChannelMessage(event.data);
        };
        dataChannel.onclose = () => {
          console.log("Data channel closed");
        };
        dataChannel.onerror = error => {
          console.error("Data channel error:", error);
          setStatus("Error: Connection failed");
        };
      };

      // Parse and set remote description
      const offer = JSON.parse(offerToUse);
      await peerConnection.setRemoteDescription(offer);

      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Wait for ICE gathering to complete
      await new Promise<void>(resolve => {
        peerConnection.onicecandidate = event => {
          if (event.candidate === null) {
            // ICE gathering complete
            resolve();
          }
        };
      });
      const answerJson = JSON.stringify(peerConnection.localDescription);
      setAnswer(answerJson);

      // Store the answer using the original 6-digit code for automatic connection
      const originalCode = sixDigitCode || extractCodeFromOffer(offerToUse);
      if (originalCode) {
        localStorage.setItem(`answer_${originalCode}`, answerJson);
        setStatus("Connected! File transfer will start automatically.");
      } else {
        // Fallback: Generate a 6-digit response code for manual sharing
        const responseCode = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem(`answer_${responseCode}`, answerJson);
        setStatus(`Your response code: ${responseCode}. Share this with the sender.`);
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      setStatus("Error: Invalid connection code");
      toast({
        title: "Error",
        description: "Invalid connection code format",
        variant: "destructive"
      });
    }
  };
  const handleDataChannelMessage = (data: any) => {
    console.log("Data channel message received, type:", typeof data);
    if (typeof data === "string") {
      try {
        const message = JSON.parse(data);
        console.log("Received message:", message);
        if (message.type === 'total_files') {
          // First message: total files info
          setTotalFiles(message.count);
          setConnectionState("receiving");
          setStatus(`Receiving ${message.count} file${message.count > 1 ? 's' : ''}...`);
          setOverallProgress(0);
          console.log(`Expecting ${message.count} files, total size: ${message.totalSize}`);
        } else if (message.type === 'file_metadata') {
          // File metadata for each file
          const metadata: FileMetadata = {
            name: message.name,
            size: message.size,
            type: message.fileType
          };
          console.log("File metadata received:", metadata);
          currentFileMetadataRef.current = metadata;
          expectedSizeRef.current = metadata.size;
          receivedSizeRef.current = 0;
          receivedChunksRef.current = [];
          setReceiveProgress(0);
          setCurrentFileIndex(message.fileIndex);
          setStatus(`Receiving ${metadata.name}... (${message.fileIndex + 1}/${totalFiles})`);
        }
      } catch (error) {
        console.error("Error parsing metadata:", error);
      }
    } else if (data instanceof ArrayBuffer) {
      // File chunk received
      receivedChunksRef.current.push(data);
      receivedSizeRef.current += data.byteLength;
      const fileProgress = Math.round(receivedSizeRef.current / expectedSizeRef.current * 100);
      setReceiveProgress(fileProgress);

      // Calculate overall progress
      const filesCompleted = currentFileIndex;
      const currentFileWeight = 1 / totalFiles;
      const currentFileProgress = fileProgress / 100 * currentFileWeight;
      const overallPercent = Math.round((filesCompleted / totalFiles + currentFileProgress) * 100);
      setOverallProgress(overallPercent);
      console.log(`Received: ${receivedSizeRef.current}/${expectedSizeRef.current} bytes (${fileProgress}%)`);

      // Check if current file is complete
      if (receivedSizeRef.current >= expectedSizeRef.current || fileProgress >= 100) {
        console.log("File transfer complete, calling completeFileReceive");
        completeCurrentFileReceive();
      } else {
        setStatus(`Receiving ${currentFileMetadataRef.current?.name}... ${fileProgress}% (${currentFileIndex + 1}/${totalFiles})`);
      }
    }
  };
  const completeCurrentFileReceive = () => {
    console.log("completeCurrentFileReceive called");
    const metadata = currentFileMetadataRef.current;
    if (!metadata) {
      console.log("No file metadata available in ref");
      return;
    }
    try {
      console.log("Creating blob from", receivedChunksRef.current.length, "chunks");
      const blob = new Blob(receivedChunksRef.current, {
        type: metadata.type
      });
      const url = URL.createObjectURL(blob);
      console.log("Blob created successfully, size:", blob.size);

      // Add completed file to the list
      setReceivedFiles(prev => [...prev, {
        metadata,
        url
      }]);

      // Check if all files are received
      if (currentFileIndex + 1 >= totalFiles) {
        // All files received
        setConnectionState("complete");
        setStatus(`All ${totalFiles} files received successfully!`);
        setOverallProgress(100);
        toast({
          title: "Success",
          description: `All ${totalFiles} files received successfully!`,
          variant: "default"
        });
      } else {
        // Reset for next file
        receivedChunksRef.current = [];
        receivedSizeRef.current = 0;
        expectedSizeRef.current = 0;
        currentFileMetadataRef.current = null;
        setReceiveProgress(0);
        setStatus(`Waiting for next file... (${currentFileIndex + 2}/${totalFiles})`);
      }
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
  const downloadFile = (fileData: {
    metadata: FileMetadata;
    url: string;
  }) => {
    const link = document.createElement('a');
    link.href = fileData.url;
    link.download = fileData.metadata.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const downloadAllFiles = () => {
    receivedFiles.forEach((fileData, index) => {
      setTimeout(() => downloadFile(fileData), index * 100); // Small delay between downloads
    });
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  return <div className="space-y-6">
      {/* 6-Digit Code Input */}
      <Card className="border-card-border">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-card-foreground">Enter 6-Digit Code</h3>
          
          <div className="space-y-4">
            <div>
              <Input placeholder="Enter 6-digit code from sender" value={sixDigitCode} onChange={e => setSixDigitCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center text-2xl font-mono tracking-widest" maxLength={6} />
              
            </div>
            <Button onClick={handleSixDigitCodeSubmit} disabled={sixDigitCode.length !== 6 || connectionState !== "idle"} className="w-full bg-gradient-primary hover:shadow-button transition-all duration-300">
              Connect & Receive File
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Response Code Display */}
      {answer && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Response Generated</h3>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="font-medium text-card-foreground">Connected successfully!</p>
                <p className="text-sm text-muted-foreground">
                  {totalFiles > 0 ? `Waiting for ${totalFiles} file${totalFiles > 1 ? 's' : ''}...` : 'Waiting for files...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Files Overview */}
      {totalFiles > 0 && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Incoming Files</h3>
            
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Package className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-card-foreground">
                  {totalFiles} file{totalFiles > 1 ? 's' : ''} incoming
                </p>
                <p className="text-sm text-muted-foreground">
                  {connectionState === "receiving" && currentFileMetadataRef.current && `Currently receiving: ${currentFileMetadataRef.current.name}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Progress */}
      {connectionState === "receiving" && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Receiving Files</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="mb-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Current File</span>
                  <span>{receiveProgress}%</span>
                </div>
                <Progress value={receiveProgress} className="mb-2" />
              </div>
              <p className="text-sm text-muted-foreground">{status}</p>
            </div>
          </CardContent>
        </Card>}

      {/* Download */}
      {connectionState === "complete" && receivedFiles.length > 0 && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Downloads Ready</h3>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="font-medium text-card-foreground">
                  All {receivedFiles.length} file{receivedFiles.length > 1 ? 's' : ''} received successfully!
                </p>
              </div>
              
              <div className="flex justify-center gap-4 mb-4">
                <Button onClick={downloadAllFiles} className="bg-gradient-primary hover:shadow-button transition-all duration-300">
                  <Download className="w-4 h-4 mr-2" />
                  Download All Files
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-card-foreground">Individual Downloads:</h4>
                {receivedFiles.map((fileData, index) => <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-card-foreground text-sm">{fileData.metadata.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(fileData.metadata.size)}</p>
                      </div>
                    </div>
                    <Button onClick={() => downloadFile(fileData)} variant="outline" size="sm">
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>)}
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Status Messages */}
      {status && <div className="text-center">
          <p className={`text-sm ${connectionState === "complete" ? "text-success" : status.includes("Error") ? "text-destructive" : "text-muted-foreground"}`}>
            {status}
          </p>
        </div>}
    </div>;
};
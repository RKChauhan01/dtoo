import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Copy, QrCode, Send, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
interface FileInfo {
  name: string;
  size: number;
  type: string;
  file: File;
}
export const SendFileTab = () => {
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [offer, setOffer] = useState("");
  const [shareableLink, setShareableLink] = useState("");
  const [sixDigitCode, setSixDigitCode] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [receiverCode, setReceiverCode] = useState("");
  const [connectionState, setConnectionState] = useState<"idle" | "generating" | "waiting" | "connected" | "sending" | "complete">("idle");
  const [sendProgress, setSendProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const {
    toast
  } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const handleFileSelect = (files: FileList) => {
    const newFiles = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setStatus("");
  };
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Generate 6-digit code and store offer data
  const generateSixDigitCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Start polling for receiver's answer
  const startPollingForAnswer = (code: string, peerConnection: RTCPeerConnection) => {
    const pollForAnswer = () => {
      const answer = localStorage.getItem(`answer_${code}`);
      if (answer) {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Connect automatically
        connectAndSend(answer);
        setStatus("Receiver connected! Establishing connection...");
      }
    };

    // Poll every 200ms for faster connection
    pollingIntervalRef.current = setInterval(pollForAnswer, 200);

    // Stop polling after 5 minutes to prevent indefinite polling
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }, 5 * 60 * 1000);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Generate QR code from URL
  const generateQRCode = async (url: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };
  const generateOffer = async () => {
    if (selectedFiles.length === 0) return;
    try {
      setConnectionState("generating");
      setStatus("Generating connection code...");

      // Create RTCPeerConnection with STUN servers
      const peerConnection = new RTCPeerConnection({
        iceServers: [{
          urls: "stun:stun.l.google.com:19302"
        }, {
          urls: "stun:stun1.l.google.com:19302"
        }]
      });
      peerConnectionRef.current = peerConnection;

      // Create data channel
      const dataChannel = peerConnection.createDataChannel("fileChannel", {
        ordered: true
      });
      dataChannelRef.current = dataChannel;

      // Set up data channel event handlers
      dataChannel.onopen = () => {
        console.log("Data channel opened");
        setConnectionState("connected");
        setStatus("Connected! Connection established and ready for multiple transfers.");
        // Only send files if we have some selected
        if (selectedFiles.length > 0) {
          sendFiles();
        }
      };
      dataChannel.onclose = () => {
        console.log("Data channel closed");
      };
      dataChannel.onerror = error => {
        console.error("Data channel error:", error);
        setStatus("Error: Connection failed");
      };

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      await new Promise<void>(resolve => {
        peerConnection.onicecandidate = event => {
          if (event.candidate === null) {
            // ICE gathering complete
            resolve();
          }
        };
      });
      const offerJson = JSON.stringify(peerConnection.localDescription);
      setOffer(offerJson);

      // Generate 6-digit code and store the offer data
      const code = generateSixDigitCode();
      setSixDigitCode(code);

      // Store offer data temporarily (in real app, use backend)
      localStorage.setItem(`offer_${code}`, offerJson);

      // Create shareable link
      const base64Offer = btoa(offerJson);
      const link = `${window.location.origin}${window.location.pathname}#receive=${base64Offer}`;
      setShareableLink(link);

      // Generate QR code for the 6-digit code
      const qrCodeUrl = await generateQRCode(code);
      setQrCodeDataUrl(qrCodeUrl);
      setConnectionState("waiting");
      setStatus("Share the 6-digit code with the receiver. Connection will start automatically when receiver connects.");

      // Start polling for receiver's answer
      startPollingForAnswer(code, peerConnection);
    } catch (error) {
      console.error("Error generating offer:", error);
      setStatus("Error generating connection code");
      toast({
        title: "Error",
        description: "Failed to generate connection code",
        variant: "destructive"
      });
    }
  };

  // Handle 6-digit response code from receiver
  const handleReceiverCodeSubmit = async () => {
    if (receiverCode.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit response code",
        variant: "destructive"
      });
      return;
    }
    try {
      // Retrieve answer data using the 6-digit response code
      const storedAnswer = localStorage.getItem(`answer_${receiverCode}`);
      if (!storedAnswer) {
        setStatus("Error: Invalid 6-digit response code");
        toast({
          title: "Error",
          description: "Invalid 6-digit response code or code has expired",
          variant: "destructive"
        });
        return;
      }
      setAnswerText(storedAnswer);
      await connectAndSend(storedAnswer);
    } catch (error) {
      console.error("Error with 6-digit response code:", error);
      setStatus("Error: Invalid 6-digit response code");
      toast({
        title: "Error",
        description: "Failed to process 6-digit response code",
        variant: "destructive"
      });
    }
  };
  const connectAndSend = async (customAnswerText?: string) => {
    const answerToUse = customAnswerText || answerText.trim();
    if (!answerToUse || !peerConnectionRef.current) return;
    try {
      const answer = JSON.parse(answerToUse);
      await peerConnectionRef.current.setRemoteDescription(answer);
      setStatus("Connecting...");
    } catch (error) {
      console.error("Error setting remote description:", error);
      setStatus("Error: Invalid response code");
      toast({
        title: "Error",
        description: "Invalid response code format",
        variant: "destructive"
      });
    }
  };
  const sendFiles = async () => {
    if (selectedFiles.length === 0 || !dataChannelRef.current) return;
    try {
      setConnectionState("sending");
      setCurrentFileIndex(0);
      setOverallProgress(0);

      // Send total number of files first
      const totalFilesMetadata = {
        type: 'total_files',
        count: selectedFiles.length,
        totalSize: selectedFiles.reduce((sum, file) => sum + file.size, 0)
      };
      dataChannelRef.current.send(JSON.stringify(totalFilesMetadata));

      // Send files one by one
      for (let i = 0; i < selectedFiles.length; i++) {
        setCurrentFileIndex(i);
        await sendSingleFile(selectedFiles[i], i);
      }
      setConnectionState("connected");
      setStatus("All files sent successfully! Connection remains active for more transfers.");
      setOverallProgress(100);
      setSendProgress(0);
      setCurrentFileIndex(0);
      toast({
        title: "Success",
        description: `All ${selectedFiles.length} files sent successfully! You can send more files.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error sending files:", error);
      setStatus("Error sending files");
      toast({
        title: "Error",
        description: "Failed to send files",
        variant: "destructive"
      });
    }
  };
  const sendSingleFile = async (fileInfo: FileInfo, fileIndex: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!dataChannelRef.current) {
        reject(new Error("Data channel not available"));
        return;
      }
      try {
        const dataChannel = dataChannelRef.current;
        const file = fileInfo.file;

        // Send file metadata
        const metadata = {
          type: 'file_metadata',
          fileIndex,
          name: fileInfo.name,
          size: fileInfo.size,
          fileType: fileInfo.type
        };
        dataChannel.send(JSON.stringify(metadata));

        // Send file in chunks with larger size for faster transfer
        const chunkSize = 256 * 1024; // 256KB chunks for better performance
        const totalChunks = Math.ceil(file.size / chunkSize);
        let sentChunks = 0;
        const reader = new FileReader();
        let offset = 0;
        const sendNextChunk = () => {
          if (offset >= file.size) {
            // File complete, update overall progress
            const overallPercent = Math.round((fileIndex + 1) / selectedFiles.length * 100);
            setOverallProgress(overallPercent);
            setStatus(`Sent ${fileIndex + 1}/${selectedFiles.length} files`);
            resolve();
            return;
          }
          const chunk = file.slice(offset, offset + chunkSize);
          reader.readAsArrayBuffer(chunk);
        };
        reader.onload = e => {
          if (e.target?.result) {
            dataChannel.send(e.target.result as ArrayBuffer);
            sentChunks++;
            offset += chunkSize;
            const fileProgress = Math.round(sentChunks / totalChunks * 100);
            setSendProgress(fileProgress);

            // Calculate overall progress
            const filesCompleted = fileIndex;
            const currentFileWeight = 1 / selectedFiles.length;
            const currentFileProgress = fileProgress / 100 * currentFileWeight;
            const overallPercent = Math.round((filesCompleted / selectedFiles.length + currentFileProgress) * 100);
            setOverallProgress(overallPercent);
            setStatus(`Sending ${fileInfo.name}... ${fileProgress}% (${fileIndex + 1}/${selectedFiles.length})`);

            // Continue sending immediately for faster transfer
            sendNextChunk();
          }
        };
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
        sendNextChunk();
      } catch (error) {
        reject(error);
      }
    });
  };
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
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
  const getTotalFileSize = () => {
    return selectedFiles.reduce((sum, file) => sum + file.size, 0);
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  return <div className="space-y-6">
      {/* File Selection */}
      <Card className="border-card-border">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-card-foreground">Select Files</h3>
          
          {selectedFiles.length === 0 ? <div className="border-2 border-dashed border-card-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors" onDrop={handleDrop} onDragOver={handleDragOver} onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-card-foreground mb-2">Drop your files here or click to browse</p>
              <p className="text-sm text-muted-foreground">Select multiple files of any type</p>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && handleFileSelect(e.target.files)} />
            </div> : <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected ({formatFileSize(getTotalFileSize())})
                </p>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Add More Files
                </Button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && handleFileSelect(e.target.files)} />
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {selectedFiles.map((fileInfo, index) => <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-card-foreground truncate">{fileInfo.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(fileInfo.size)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeFile(index)} className="flex-shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>)}
              </div>
            </div>}
        </CardContent>
      </Card>

      {/* Generate Code or Send More Files */}
      {selectedFiles.length > 0 && connectionState === "idle" && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">2. Generate Connection Code</h3>
            <Button onClick={generateOffer} className="bg-gradient-primary hover:shadow-button transition-all duration-300">
              Generate Code
            </Button>
          </CardContent>
        </Card>}

      {/* Send More Files Button */}
      {selectedFiles.length > 0 && connectionState === "connected" && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Send More Files</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connection is active. You can send more files without reconnecting.
            </p>
            <Button onClick={sendFiles} className="bg-gradient-primary hover:shadow-button transition-all duration-300">
              Send Selected Files
            </Button>
          </CardContent>
        </Card>}

      {/* Connection Code & QR Code */}
      {sixDigitCode && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Share Connection Info</h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-card-foreground mb-2 block">
                  6-Digit Code
                </label>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-mono font-bold text-primary tracking-widest">
                    {sixDigitCode}
                  </div>
                  <Button variant="outline" size="sm" className={copySuccess === '6-digit code' ? 'copy-success' : ''} onClick={() => copyToClipboard(sixDigitCode, "6-digit code")}>
                    {copySuccess === '6-digit code' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copySuccess === '6-digit code' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              {qrCodeDataUrl && <div>
                  <label className="text-sm font-medium text-card-foreground mb-2 block">
                    QR Code
                  </label>
                  <div className="flex flex-col items-center gap-3 p-4 bg-muted rounded-lg">
                    <img src={qrCodeDataUrl} alt="QR Code for 6-digit code" className="w-48 h-48 border rounded-lg" />
                    <p className="text-sm text-muted-foreground text-center">
                      Scan this QR code or share the 6-digit code above
                    </p>
                  </div>
                </div>}
            </div>
          </CardContent>
        </Card>}

      {/* Waiting for Connection */}
      {connectionState === "waiting" && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Waiting for Receiver</h3>
            
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-4 p-4 bg-info/10 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div>
                  <p className="font-medium text-card-foreground">Waiting for receiver to connect...</p>
                  <p className="text-sm text-muted-foreground">Connection will start automatically when receiver joins</p>
                </div>
              </div>
              
            </div>
          </CardContent>
        </Card>}

      {/* Progress */}
      {connectionState === "sending" && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Sending Files</h3>
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
                  <span>{sendProgress}%</span>
                </div>
                <Progress value={sendProgress} className="mb-2" />
              </div>
              <p className="text-sm text-muted-foreground">{status}</p>
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
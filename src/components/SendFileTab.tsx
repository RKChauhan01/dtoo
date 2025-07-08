import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Copy, Link, Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface FileInfo {
  name: string;
  size: number;
  type: string;
  file: File;
}
export const SendFileTab = () => {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [offer, setOffer] = useState("");
  const [shareableLink, setShareableLink] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [connectionState, setConnectionState] = useState<"idle" | "generating" | "waiting" | "connected" | "sending" | "complete">("idle");
  const [sendProgress, setSendProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const {
    toast
  } = useToast();
  const handleFileSelect = (file: File) => {
    setSelectedFile({
      name: file.name,
      size: file.size,
      type: file.type,
      file
    });
    setStatus("");
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
  const generateOffer = async () => {
    if (!selectedFile) return;
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
        setStatus("Connected! Starting file transfer...");
        sendFile();
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

      // Create shareable link
      const base64Offer = btoa(offerJson);
      const link = `${window.location.origin}${window.location.pathname}#receive=${base64Offer}`;
      setShareableLink(link);
      setConnectionState("waiting");
      setStatus("Share the code with the receiver and wait for their response");
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
  const connectAndSend = async () => {
    if (!answerText.trim() || !peerConnectionRef.current) return;
    try {
      const answer = JSON.parse(answerText.trim());
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
  const sendFile = async () => {
    if (!selectedFile || !dataChannelRef.current) return;
    try {
      setConnectionState("sending");
      setSendProgress(0);
      const dataChannel = dataChannelRef.current;
      const file = selectedFile.file;

      // Send metadata first
      const metadata = {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      };
      dataChannel.send(JSON.stringify(metadata));

      // Send file in chunks
      const chunkSize = 64 * 1024; // 64KB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      let sentChunks = 0;
      const reader = new FileReader();
      let offset = 0;
      const sendNextChunk = () => {
        if (offset >= file.size) {
          setConnectionState("complete");
          setStatus("File sent successfully!");
          setSendProgress(100);
          toast({
            title: "Success",
            description: "File sent successfully!",
            variant: "default"
          });
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
          const progress = Math.round(sentChunks / totalChunks * 100);
          setSendProgress(progress);
          setStatus(`Sending file... ${progress}%`);

          // Continue sending
          setTimeout(sendNextChunk, 10); // Small delay to prevent overwhelming
        }
      };
      sendNextChunk();
    } catch (error) {
      console.error("Error sending file:", error);
      setStatus("Error sending file");
      toast({
        title: "Error",
        description: "Failed to send file",
        variant: "destructive"
      });
    }
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
          <h3 className="text-lg font-semibold mb-4 text-card-foreground">Select File</h3>
          
          {!selectedFile ? <div className="border-2 border-dashed border-card-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors" onDrop={handleDrop} onDragOver={handleDragOver} onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-card-foreground mb-2">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">Any file type, any size</p>
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </div> : <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-card-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
                Remove
              </Button>
            </div>}
        </CardContent>
      </Card>

      {/* Generate Code */}
      {selectedFile && connectionState === "idle" && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">2. Generate Connection Code</h3>
            <Button onClick={generateOffer} className="bg-gradient-primary hover:shadow-button transition-all duration-300">
              Generate Code
            </Button>
          </CardContent>
        </Card>}

      {/* Connection Code */}
      {offer && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">3. Share Connection Code</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-card-foreground mb-2 block">
                  Connection Code (JSON)
                </label>
                <Textarea value={offer} readOnly className="font-mono text-xs bg-muted" rows={4} />
                <Button variant="outline" size="sm" className={`mt-2 ${copySuccess === 'Connection code' ? 'copy-success' : ''}`} onClick={() => copyToClipboard(offer, "Connection code")}>
                  {copySuccess === 'Connection code' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copySuccess === 'Connection code' ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium text-card-foreground mb-2 block">
                  Shareable Link
                </label>
                <Textarea value={shareableLink} readOnly className="font-mono text-xs bg-muted" rows={2} />
                <Button variant="outline" size="sm" className={`mt-2 ${copySuccess === 'Shareable link' ? 'copy-success' : ''}`} onClick={() => copyToClipboard(shareableLink, "Shareable link")}>
                  {copySuccess === 'Shareable link' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Link className="w-4 h-4 mr-2" />}
                  {copySuccess === 'Shareable link' ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Paste Answer */}
      {connectionState === "waiting" && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">4. Paste Receiver's Response</h3>
            
            <div className="space-y-4">
              <Textarea placeholder="Paste the response code from the receiver here..." value={answerText} onChange={e => setAnswerText(e.target.value)} className="font-mono text-xs" rows={4} />
              <Button onClick={connectAndSend} disabled={!answerText.trim()} className="bg-gradient-primary hover:shadow-button transition-all duration-300">
                <Send className="w-4 h-4 mr-2" />
                Connect & Send
              </Button>
            </div>
          </CardContent>
        </Card>}

      {/* Progress */}
      {connectionState === "sending" && <Card className="border-card-border">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Sending File</h3>
            <Progress value={sendProgress} className="mb-2" />
            <p className="text-sm text-muted-foreground">{status}</p>
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
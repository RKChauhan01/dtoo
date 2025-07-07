import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ReceiveSection = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const { toast } = useToast();

  const handleReceive = async () => {
    if (!code.trim()) return;
    
    setIsLoading(true);
    
    // Simulate receiving process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate received files
    setFiles([
      {
        name: "document.pdf",
        size: "2.4 MB",
        date: "Apr 15 03:32 AM"
      }
    ]);
    
    toast({
      title: "Files Received!",
      description: "Successfully received files using the code",
    });
    
    setIsLoading(false);
  };

  const handleRefresh = () => {
    setFiles([]);
    setCode("");
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
          onChange={(e) => setCode(e.target.value.slice(0, 6))}
          className="text-center text-2xl font-mono py-6 mb-4"
          maxLength={6}
        />
        
        <Button
          onClick={handleReceive}
          disabled={code.length !== 6 || isLoading}
          className="w-full bg-accent-purple hover:bg-accent-purple/90 text-white py-6 text-lg font-medium rounded-xl"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              RECEIVING...
            </>
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
            className="text-muted-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-lg mb-2">目前沒有檔案哦！</div>
            <div className="text-sm">No files received yet</div>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-card-foreground">
                    {file.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {file.size} • Exp. {file.date}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-primary border-primary hover:bg-primary hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
            
            <div className="text-center pt-4">
              <div className="text-sm text-muted-foreground mb-2">
                Total {files.length} files · {files.reduce((acc, file) => acc + file.size, "2.4 MB")}
              </div>
              <Button
                variant="outline"
                className="text-primary border-primary hover:bg-primary hover:text-white"
              >
                Receive All
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
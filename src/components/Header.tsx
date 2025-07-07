import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-white">
          DropHere
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-white text-sm">
            HAZELLIANG@MEMBER.CC
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-primary text-primary-foreground border-primary hover:bg-primary/90"
          >
            LOGOUT
          </Button>
        </div>
      </div>
    </header>
  );
};
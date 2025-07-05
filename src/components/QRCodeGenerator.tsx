import { useEffect, useRef } from "react";
import QRCode from "qrcode.js";

interface QRCodeGeneratorProps {
  text: string;
  size?: number;
  className?: string;
}

export const QRCodeGenerator = ({ text, size = 200, className = "" }: QRCodeGeneratorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && text) {
      try {
        // Clear previous QR code
        containerRef.current.innerHTML = '';
        
        const qr = new QRCode({
          text,
          width: size,
          height: size,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
        });
        
        // Insert the QR code HTML
        containerRef.current.innerHTML = qr.toString();
      } catch (error) {
        console.error("Error generating QR code:", error);
        containerRef.current.innerHTML = '<p class="text-sm text-destructive">Error generating QR code</p>';
      }
    }
  }, [text, size]);

  if (!text) return null;

  return (
    <div className={`flex items-center justify-center p-4 bg-white rounded-lg shadow-sm ${className}`}>
      <div ref={containerRef} />
    </div>
  );
};
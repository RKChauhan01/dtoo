import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeGeneratorProps {
  text: string;
  size?: number;
  className?: string;
}

export const QRCodeGenerator = ({ text, size = 200, className = "" }: QRCodeGeneratorProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (text) {
      QRCode.toDataURL(text, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
      .then(url => setQrDataUrl(url))
      .catch(error => {
        console.error("Error generating QR code:", error);
        setQrDataUrl("");
      });
    }
  }, [text, size]);

  if (!text || !qrDataUrl) return null;

  return (
    <div className={`flex items-center justify-center p-4 bg-white rounded-lg shadow-sm ${className}`}>
      <img src={qrDataUrl} alt="QR Code" className="max-w-full h-auto" />
    </div>
  );
};
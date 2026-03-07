import QRCode from 'qrcode';
import { QR_BASE_URL } from '../../constants';

/**
 * Generates a high-resolution QR code image with a consistent format and label.
 * @param id The unique identifier (UID or Serial Number) to encode in the URL.
 * @param label The serial number or name to display below the QR code.
 * @returns A promise that resolves to a data URL of the generated image.
 */
export const generateStandardQRImage = async (id: string, label: string): Promise<string> => {
  const canvas = document.createElement('canvas');
  // High resolution for better scannability
  const qrSize = 800; 
  const padding = 80;
  const textHeight = 120;
  canvas.width = qrSize + (padding * 2);
  canvas.height = qrSize + (padding * 2) + textHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get canvas context");
  
  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // URL format: https://www.toletbro.com/q/{id}
  const qrUrl = `${QR_BASE_URL}/${id}`;
  
  // Generate QR Data URL with high error correction
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
    width: qrSize, 
    margin: 1, 
    errorCorrectionLevel: 'H', // High error correction for better scannability
    color: { dark: '#000000', light: '#FFFFFF' } 
  });
  
  // Load the QR image onto the canvas
  const img = new Image();
  await new Promise((resolve, reject) => { 
    img.onload = resolve; 
    img.onerror = reject;
    img.src = qrDataUrl; 
  });
  
  ctx.drawImage(img, padding, padding);
  
  // Draw Label (Serial Number)
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 64px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`S.NO: ${label}`, canvas.width / 2, qrSize + padding + 80);
  
  return canvas.toDataURL('image/png', 1.0); // Max quality
};

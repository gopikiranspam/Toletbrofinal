import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Search, X, QrCode, Zap, ShieldCheck, Info, Loader2, Image as ImageIcon, Flashlight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerProps {
  onScan: (code: string) => Promise<void> | void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [manualCode, setManualCode] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const startScanner = async () => {
      if (!readerRef.current) return;
      try {
        setIsInitializing(true);
        setError(null);

        // Ensure any previous instance is cleaned up
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
          } catch (e) {
            console.warn("Cleanup error:", e);
          }
        }

        const html5QrCode = new Html5Qrcode("reader");
        html5QrCodeRef.current = html5QrCode;

        const config = { 
          fps: 20, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };
        
        // Try to start with environment camera first
        try {
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              onScan(decodedText);
              stopScanner();
            },
            () => {} // Ignore scan errors
          );
        } catch (envErr) {
          console.warn("Environment camera failed, trying default...", envErr);
          // Fallback to any available camera
          await html5QrCode.start(
            { facingMode: "user" },
            config,
            (decodedText) => {
              onScan(decodedText);
              stopScanner();
            },
            () => {}
          );
        }

        // Check for flash support
        try {
          const capabilities = html5QrCode.getRunningTrackCapabilities();
          setHasFlash(!!(capabilities as any).torch);
        } catch (capErr) {
          setHasFlash(false);
        }
        
        setIsInitializing(false);
      } catch (err: any) {
        console.error("Scanner init error:", err);
        let msg = "Could not access camera.";
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = "Camera permission denied. Please enable camera access in your browser settings and try again.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = "No camera found on this device.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = "Camera is already in use by another application.";
        }
        setError(msg);
        setIsInitializing(false);
      }
    };

    // Start immediately since it's triggered by user click
    startScanner();

    return () => {
      stopScanner();
    };
  }, [onScan]);

  const handleRetry = () => {
    window.location.reload(); // Sometimes a full reload is needed to reset permission state in iframes
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const toggleFlash = async () => {
    if (!html5QrCodeRef.current || !hasFlash) return;
    try {
      const newState = !isFlashOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: newState } as any]
      });
      setIsFlashOn(newState);
    } catch (err) {
      console.error("Flash toggle error:", err);
    }
  };

  const optimizeImageForScanning = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension for scanning optimization
          const MAX_DIM = 800;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file); // Fallback to original
            return;
          }
          
          // Draw with high contrast / grayscale if possible
          ctx.drawImage(img, 0, 0, width, height);
          
          // Apply a simple grayscale filter to help detection
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg;     // R
            data[i + 1] = avg; // G
            data[i + 2] = avg; // B
          }
          ctx.putImageData(imageData, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], "optimized.png", { type: "image/png" }));
            } else {
              resolve(file);
            }
          }, 'image/png');
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`File selected for scanning: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert("Unsupported file format. Please upload a PNG or JPG image.");
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);
      
      // Stop camera if running to avoid conflicts
      await stopScanner();
      
      // Small delay to ensure camera is fully released
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Ensure we have a scanner instance
      if (!html5QrCodeRef.current && readerRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("reader");
      }

      console.log("Starting file scan...");
      // Attempt 1: Standard scan
      try {
        const decodedText = await html5QrCodeRef.current!.scanFile(file, false);
        if (decodedText) {
          console.log("QR decoded successfully (v1):", decodedText);
          await Promise.resolve(onScan(decodedText));
          return;
        }
      } catch (firstErr) {
        console.warn("First scan attempt failed, trying with showImage=true...", firstErr);
        
        // Attempt 2: With showImage=true
        try {
          const decodedText = await html5QrCodeRef.current!.scanFile(file, true);
          if (decodedText) {
            console.log("QR decoded successfully (v2):", decodedText);
            await Promise.resolve(onScan(decodedText));
            return;
          }
        } catch (secondErr) {
          console.warn("Second scan attempt failed, trying optimization...", secondErr);
          
          // Attempt 3: Optimized image (resized + grayscale)
          const optimizedFile = await optimizeImageForScanning(file);
          const decodedText = await html5QrCodeRef.current!.scanFile(optimizedFile, false);
          if (decodedText) {
            console.log("QR decoded successfully (v3 - optimized):", decodedText);
            await Promise.resolve(onScan(decodedText));
            return;
          }
        }
      }
      
      throw new Error("No QR code detected in image");
    } catch (err: any) {
      console.error("File scan error:", err);
      const errorMessage = err?.message || "Could not find a valid QR code";
      alert(`Could not find a valid QR code in this image. \n\nError: ${errorMessage}\n\nTips:\n- Ensure the QR code is clearly visible and not blurry.\n- Use a high-resolution image.\n- Try taking a closer photo of the QR code.`);
    } finally {
      setIsInitializing(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.length >= 6) {
      await Promise.resolve(onScan(manualCode.toUpperCase()));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="w-full max-w-md bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-[0_0_50px_rgba(79,70,229,0.1)] relative flex flex-col"
      >
        {/* Hardware Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2 rounded-xl border border-indigo-500/20">
              <QrCode className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">ToletBro Lens</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">System Active</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all border border-slate-700/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Scanner Container */}
          <div className="relative group">
            {/* Decorative Corners */}
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-indigo-500 rounded-tl-xl z-10"></div>
            <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-indigo-500 rounded-tr-xl z-10"></div>
            <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-indigo-500 rounded-bl-xl z-10"></div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-indigo-500 rounded-br-xl z-10"></div>

            <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800 aspect-square shadow-inner">
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-slate-950">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Initializing Optics...</span>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-slate-950 p-6 text-center">
                  <Camera className="w-8 h-8 text-rose-500 mb-2" />
                  <p className="text-xs font-bold text-slate-400">{error}</p>
                  <button onClick={handleRetry} className="mt-4 px-4 py-2 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Grant Permission & Retry</button>
                </div>
              )}
              <div ref={readerRef} id="reader" className="w-full h-full"></div>
              
              {/* Scanning Animation Overlay */}
              {!isInitializing && !error && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-indigo-500/5 to-transparent animate-scan-line"></div>
                  <div className="absolute inset-0 border-[40px] border-slate-950/40"></div>
                </div>
              )}

              {/* Controls Overlay */}
              {!isInitializing && !error && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-20">
                  <button 
                    onClick={toggleFlash}
                    disabled={!hasFlash}
                    className={`p-4 rounded-2xl backdrop-blur-md border transition-all ${isFlashOn ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/40' : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <Flashlight className={`w-5 h-5 ${!hasFlash && 'opacity-20'}`} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Manual Input</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-3">
              <div className="relative flex-1 group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Search className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="ENTER SERIAL (E.G. ABC123)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-xs font-mono uppercase tracking-[0.3em] text-white placeholder:text-slate-700 transition-all"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  maxLength={6}
                />
              </div>
              <button 
                disabled={manualCode.length < 6}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                Find <Zap className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

        {/* Technical Footer */}
        <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Secure Encrypted Scan</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-50">
            <Info className="w-3 h-3 text-slate-400" />
            <span className="text-[8px] font-medium text-slate-400">Point at property board QR</span>
          </div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
        #reader video {
          border-radius: 24px !important;
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}} />
    </motion.div>
  );
};

import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, Search, X, QrCode, Zap, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [manualCode, setManualCode] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Small delay to ensure DOM is ready and avoid race conditions with React 19
    const timer = setTimeout(() => {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 20, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          /* verbose= */ false
        );

        scannerRef.current.render(
          (decodedText) => {
            onScan(decodedText);
            scannerRef.current?.clear();
          },
          (error) => {
            // Quietly handle scan errors
          }
        );
        setIsInitializing(false);
      } catch (err) {
        console.error("Scanner init error:", err);
        setIsInitializing(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.length >= 6) {
      onScan(manualCode.toUpperCase());
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
              <div id="reader" className="w-full h-full"></div>
              
              {/* Scanning Animation Overlay */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-indigo-500/5 to-transparent animate-scan-line"></div>
                <div className="absolute inset-0 border-[40px] border-slate-950/40"></div>
              </div>
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
        #reader__status_span { display: none !important; }
        #reader__dashboard_section_csr button {
          background: #4f46e5 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 12px !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          cursor: pointer !important;
        }
        #reader video {
          border-radius: 24px !important;
          object-fit: cover !important;
        }
      `}} />
    </motion.div>
  );
};

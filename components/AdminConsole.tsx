
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Users, QrCode, Download, Printer, Plus, Search, Filter, Trash2, CheckCircle, Share2, FileArchive, Loader2, AlertCircle } from 'lucide-react';
import { QR_BASE_URL } from '../constants';
import { generateStandardQRImage } from '../src/utils/qrUtils';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, serverTimestamp, onSnapshot, where } from 'firebase/firestore';

interface GeneratedQR {
  id: string;
  code: string;
  createdAt: any;
  status: 'Available' | 'Assigned' | 'Used';
}

export const AdminConsole: React.FC = () => {
  const [qrList, setQrList] = useState<GeneratedQR[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "properties"), where("isSystemQR", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GeneratedQR[];
      // Sort in memory to avoid composite index requirement
      list.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setQrList(list);
      setError(null);
    }, (err) => {
      console.error("Snapshot listener failed", err);
      if (err.code === 'permission-denied') {
        setError("Missing or insufficient permissions to read system QRs. This is likely due to Firestore Security Rules. Please ensure your rules allow read access to the 'properties' collection.");
      }
    });
    return () => unsubscribe();
  }, []);

  const generateBulk = async (count: number) => {
    setIsProcessing(true);
    setError(null);
    try {
      for (let i = 0; i < count; i++) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const randomLetters = letters.charAt(Math.floor(Math.random() * 26)) + 
                             letters.charAt(Math.floor(Math.random() * 26)) + 
                             letters.charAt(Math.floor(Math.random() * 26));
        const randomNumbers = Math.floor(100 + Math.random() * 900).toString();
        const code = `${randomLetters}${randomNumbers}`;
        
        await addDoc(collection(db, "properties"), {
          code,
          status: 'Available',
          isSystemQR: true,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error("Bulk generation failed", err);
      if (err.code === 'permission-denied') {
        setError("Missing or insufficient permissions to create system QRs. Ensure you have write access to the 'properties' collection.");
      } else {
        setError("Failed to generate QRs. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (qr: GeneratedQR) => {
    try {
      const dataUrl = await generateStandardQRImage(qr.code, qr.code);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ToletBro_QR_${qr.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handleShare = async (qr: GeneratedQR) => {
    try {
      const dataUrl = await generateStandardQRImage(qr.code, qr.code);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `ToletBro_QR_${qr.code}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Property QR Code: ${qr.code}`,
          text: `Scan this code to view property details for ${qr.code}`
        });
      } else {
        // Fallback for browsers that don't support file sharing
        handleDownload(qr);
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this QR code?")) {
      setError(null);
      try {
        await deleteDoc(doc(db, "properties", id));
      } catch (err: any) {
        console.error("Delete failed", err);
        if (err.code === 'permission-denied') {
          setError("Missing or insufficient permissions to delete this QR. Check your security rules.");
        }
      }
    }
  };

  const handleDownloadAllZip = async () => {
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      for (const qr of qrList) {
        const dataUrl = await generateStandardQRImage(qr.code, qr.code);
        // Extract base64 part
        const base64Data = dataUrl.split(',')[1];
        zip.file(`${qr.code}.png`, base64Data, { base64: true });
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `ToletBro_QR_Batch_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("ZIP generation failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = async (qr: GeneratedQR) => {
    try {
      const dataUrl = await generateStandardQRImage(qr.code, qr.code);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Print QR - ${qr.code}</title></head>
            <body style="display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
              <img src="${dataUrl}" style="max-width:100%; height:auto;" onload="window.print();window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error("Print failed", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Console</h1>
          <p className="text-slate-400 text-sm">Manage system-wide QR codes and distribution</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => generateBulk(10)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            Bulk Generate (10)
          </button>
          <button 
            disabled={isProcessing || qrList.length === 0}
            onClick={handleDownloadAllZip}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
            Download All (ZIP)
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            <Printer className="w-4 h-4" />
            Print List
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-500">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <Users className="w-8 h-8 text-indigo-500 mb-4" />
          <h3 className="text-slate-400 text-sm mb-1">Total Users</h3>
          <span className="text-2xl font-bold">2,482</span>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <QrCode className="w-8 h-8 text-green-500 mb-4" />
          <h3 className="text-slate-400 text-sm mb-1">Active QRs</h3>
          <span className="text-2xl font-bold">{qrList.length}</span>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <LayoutGrid className="w-8 h-8 text-blue-500 mb-4" />
          <h3 className="text-slate-400 text-sm mb-1">Properties</h3>
          <span className="text-2xl font-bold">843</span>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <CheckCircle className="w-8 h-8 text-yellow-500 mb-4" />
          <h3 className="text-slate-400 text-sm mb-1">Verifications</h3>
          <span className="text-2xl font-bold">92</span>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="font-bold">QR Inventory</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Search Code..." className="bg-slate-800 border-none rounded-xl py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-indigo-500 w-full" />
            </div>
            <button className="bg-slate-800 p-2 rounded-xl"><Filter className="w-4 h-4 text-slate-400" /></button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs uppercase tracking-wider bg-slate-950/50">
                <th className="px-6 py-4 font-semibold">QR Code</th>
                <th className="px-6 py-4 font-semibold">Generated On</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {qrList.map((qr) => (
                <tr key={qr.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="font-mono font-bold text-indigo-400">{qr.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {qr.createdAt?.toDate ? qr.createdAt.toDate().toLocaleDateString() : 'Just now'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                      qr.status === 'Available' ? 'bg-green-500/10 text-green-400' :
                      qr.status === 'Assigned' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-slate-700/50 text-slate-500'
                    }`}>
                      {qr.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleDownload(qr)} 
                        title="Download" 
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handlePrint(qr)} 
                        title="Print" 
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleShare(qr)} 
                        title="Share" 
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(qr.id)} 
                        title="Delete" 
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

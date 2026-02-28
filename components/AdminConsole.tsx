
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Users, QrCode, Download, Printer, Plus, Search, Filter, Trash2, CheckCircle, Share2, FileArchive, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import JSZip from 'jszip';

interface GeneratedQR {
  id: string;
  code: string;
  createdAt: string;
  status: 'Available' | 'Assigned' | 'Used';
}

export const AdminConsole: React.FC = () => {
  const [qrList, setQrList] = useState<GeneratedQR[]>([
    { id: '1', code: 'ABC586', createdAt: '2024-05-20', status: 'Available' },
    { id: '2', code: 'XYZ921', createdAt: '2024-05-19', status: 'Assigned' },
    { id: '3', code: 'LMN443', createdAt: '2024-05-18', status: 'Used' },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const generateBulk = (count: number) => {
    const newCodes: GeneratedQR[] = [];
    for (let i = 0; i < count; i++) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomLetters = letters.charAt(Math.floor(Math.random() * 26)) + 
                           letters.charAt(Math.floor(Math.random() * 26)) + 
                           letters.charAt(Math.floor(Math.random() * 26));
      const randomNumbers = Math.floor(100 + Math.random() * 900).toString();
      newCodes.push({
        id: Math.random().toString(36).substr(2, 9),
        code: `${randomLetters}${randomNumbers}`,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'Available'
      });
    }
    setQrList([...newCodes, ...qrList]);
  };

  const generateQRImage = async (code: string): Promise<string> => {
    // Create a temporary canvas to draw the QR and label
    const canvas = document.createElement('canvas');
    const qrSize = 400;
    const padding = 40;
    const textHeight = 80;
    canvas.width = qrSize + (padding * 2);
    canvas.height = qrSize + (padding * 2) + textHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Generate QR Data URL first
    const qrDataUrl = await QRCode.toDataURL(code, {
      width: qrSize,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Draw QR image onto canvas
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = qrDataUrl;
    });
    ctx.drawImage(img, padding, padding);

    // Draw Serial Number Text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`S.NO: ${code}`, canvas.width / 2, qrSize + padding + 60);

    return canvas.toDataURL('image/png');
  };

  const handleDownload = async (qr: GeneratedQR) => {
    try {
      const dataUrl = await generateQRImage(qr.code);
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
      const dataUrl = await generateQRImage(qr.code);
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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this QR code?")) {
      setQrList(qrList.filter(item => item.id !== id));
    }
  };

  const handleDownloadAllZip = async () => {
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      for (const qr of qrList) {
        const dataUrl = await generateQRImage(qr.code);
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
      const dataUrl = await generateQRImage(qr.code);
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
                  <td className="px-6 py-4 text-sm text-slate-400">{qr.createdAt}</td>
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

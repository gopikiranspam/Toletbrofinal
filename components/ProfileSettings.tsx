
import React, { useState, useEffect } from 'react';
import { User, UserType, Language } from '../types';
import { 
  User as UserIcon, Shield, ChevronRight, Package, Smartphone, 
  Download, Share2, Printer, ArrowLeft, Loader2, QrCode,
  CheckCircle2, AlertCircle, LogOut, BellOff, MessageSquare, MessageCircle, PhoneCall, Plus, X as CloseIcon, Clock, Calendar, RefreshCw, Tags, Settings2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { QRScanner } from './QRScanner';

interface ProfileSettingsProps {
  user: User;
  onUpdate: (updatedUser: Partial<User>) => void;
  onLogout: () => void;
  properties?: any[];
  onEditProperty?: (property: any) => void;
  onDeleteProperty?: (id: string) => void;
  onRepostProperty?: (id: string) => void;
}

type ToolView = 'main' | 'selection' | 'generate' | 'setup' | 'active_board' | 'privacy' | 'my_properties' | 'profile';

const DEFAULT_CALL_MESSAGE = "Please contact me only after viewing the home images and details. All details provided are genuine. No negotiation. Vegetarian tenants preferred. Please contact only if you are serious.";

const AVAILABLE_TAGS = [
  "No Negotiation",
  "Only for Family",
  "Not for Bachelors",
  "Brokers Not Allowed",
  "Serious Buyers Only",
  "Vegetarian Only"
];

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  user, onUpdate, onLogout, properties = [], onEditProperty, onDeleteProperty, onRepostProperty 
}) => {
  const [name, setName] = useState(user.name);
  const [language, setLanguage] = useState<Language>(user.language || 'English');
  const [toolView, setToolView] = useState<ToolView>('main');
  const [myPropsTab, setMyPropsTab] = useState<'active' | 'past'>('active');
  const [hasNoPhysicalBoard, setHasNoPhysicalBoard] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Privacy State
  const [showDndModal, setShowDndModal] = useState(false);
  const [tempSecondaryPhone, setTempSecondaryPhone] = useState(user.secondaryPhone || '');

  // Initialize defaults if missing
  useEffect(() => {
    if (user.primaryPhoneEnabled === undefined) {
      onUpdate({ 
        primaryPhoneEnabled: true, 
        secondaryPhoneEnabled: false, 
        whatsappOnly: false,
        showCallMessage: false,
        callMessageText: DEFAULT_CALL_MESSAGE,
        ownerTags: []
      });
    }
  }, []);

  const handleSave = () => {
    onUpdate({ name, language });
    alert('Settings saved successfully!');
  };

  const generateNewCode = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetters = letters.charAt(Math.floor(Math.random() * 26)) + 
                         letters.charAt(Math.floor(Math.random() * 26)) + 
                         letters.charAt(Math.floor(Math.random() * 26));
    const randomNumbers = Math.floor(100 + Math.random() * 900).toString();
    return `${randomLetters}${randomNumbers}`;
  };

  const handleGenerateOwn = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      const code = generateNewCode();
      onUpdate({ qrCode: code, primaryPhoneEnabled: true, showCallMessage: true, callMessageText: DEFAULT_CALL_MESSAGE });
      setIsGenerating(false);
      setToolView('main');
    }, 800);
  };

  const generateQRImage = async (code: string): Promise<string> => {
    const canvas = document.createElement('canvas');
    const qrSize = 400;
    const padding = 40;
    const textHeight = 80;
    canvas.width = qrSize + (padding * 2);
    canvas.height = qrSize + (padding * 2) + textHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const qrDataUrl = await QRCode.toDataURL(code, { width: qrSize, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } });
    const img = new Image();
    await new Promise((resolve) => { img.onload = resolve; img.src = qrDataUrl; });
    ctx.drawImage(img, padding, padding);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`S.NO: ${code}`, canvas.width / 2, qrSize + padding + 60);
    return canvas.toDataURL('image/png');
  };

  const toggleTag = (tag: string) => {
    const currentTags = user.ownerTags || [];
    if (currentTags.includes(tag)) {
      onUpdate({ ownerTags: currentTags.filter(t => t !== tag) });
    } else {
      onUpdate({ ownerTags: [...currentTags, tag] });
    }
  };

  const handleDownload = async () => {
    if (!user.qrCode) return;
    try {
      const dataUrl = await generateQRImage(user.qrCode);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ToletBro_User_QR_${user.qrCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { console.error(err); }
  };

  const handlePrint = async () => {
    if (!user.qrCode) return;
    try {
      const dataUrl = await generateQRImage(user.qrCode);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><body style="display:flex; justify-content:center; align-items:center; height:100vh; margin:0;"><img src="${dataUrl}" style="max-width:100%;" onload="window.print();window.close();" /></body></html>`);
        printWindow.document.close();
      }
    } catch (err) { console.error(err); }
  };

  const togglePhone = (type: 'primary' | 'secondary') => {
    const isPrimary = type === 'primary';
    const currentPrimary = user.primaryPhoneEnabled ?? true;
    const currentSecondary = user.secondaryPhoneEnabled ?? false;
    if (isPrimary) {
      if (currentPrimary && !currentSecondary) {
        alert("At least one contact number must be enabled.");
        return;
      }
      onUpdate({ primaryPhoneEnabled: !currentPrimary });
    } else {
      if (currentSecondary && !currentPrimary) {
        alert("At least one contact number must be enabled.");
        return;
      }
      onUpdate({ secondaryPhoneEnabled: !currentSecondary });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-2xl mx-auto space-y-6 pb-24 px-4"
    >
      {/* Refined Header */}
      <div className="flex items-center gap-3 md:gap-4 p-4 md:p-6 bg-slate-900/50 rounded-2xl md:rounded-3xl border border-slate-800/50 backdrop-blur-sm">
        <div className="w-12 md:w-16 h-12 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-xl md:text-2xl font-black shadow-lg shadow-indigo-500/20">
          {user.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-lg md:text-xl font-bold text-white">{user.name}</h2>
          <p className="text-[10px] md:text-xs font-medium text-slate-500 tracking-wide">{user.phone}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-md border border-indigo-500/10">
              {user.type.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="space-y-2.5 md:space-y-3">
        {/* Smart Tolet Board - Moved to First */}
        {user.type === UserType.OWNER && (
          <div className="bg-slate-900/50 rounded-3xl border border-slate-800/50 overflow-hidden">
            <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Smart Tolet Board</h3>
              </div>
              {toolView !== 'main' && (
                <button 
                  onClick={() => setToolView('main')} 
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
              )}
            </div>
            
            <div className="p-4">
              <AnimatePresence mode="wait">
                {toolView === 'main' && (
                  <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {user.qrCode ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-2xl border border-indigo-500/10">
                          <div className="bg-white p-2 rounded-xl">
                            <QRCodeSVG value={user.qrCode} />
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-mono font-bold text-indigo-400 tracking-tighter">{user.qrCode}</p>
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              Active
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={handleDownload} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                          <button onClick={() => setToolView('privacy')} className="flex items-center justify-center gap-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            <Shield className="w-3.5 h-3.5" /> Privacy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 space-y-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
                          <AlertCircle className="w-6 h-6 text-slate-600" />
                        </div>
                        <p className="text-xs font-medium text-slate-500">No board linked to this account</p>
                        <button 
                          onClick={() => setToolView('setup')}
                          className="w-full bg-indigo-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                          Link Physical Board
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {toolView === 'setup' && (
                  <motion.div key="setup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 py-4">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <QrCode className="w-8 h-8 text-indigo-500" />
                      </div>
                      <h3 className="text-lg font-bold">Link Your Board</h3>
                      <p className="text-xs text-slate-500 px-4">Choose how you want to set up your Smart Tolet Board</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => setToolView('selection')}
                        className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 rounded-2xl border border-slate-700/50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                            <Smartphone className="w-5 h-5 text-indigo-500 group-hover:text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">I have a physical board</p>
                            <p className="text-[10px] text-slate-500">Scan the QR on your board</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>

                      <button 
                        onClick={() => setToolView('generate')}
                        className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 rounded-2xl border border-slate-700/50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 transition-all">
                            <QrCode className="w-5 h-5 text-emerald-500 group-hover:text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">Generate Digital Board</p>
                            <p className="text-[10px] text-slate-500">Create a new S.No instantly</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {toolView === 'selection' && (
                  <motion.div key="selection" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 py-4">
                    <div className="bg-slate-800/50 rounded-3xl p-1 overflow-hidden border border-slate-700/50">
                      <QRScanner onScan={(code) => {
                        onUpdate({ qrCode: code });
                        setToolView('main');
                        alert('Board linked successfully!');
                      }} onClose={() => setToolView('setup')} />
                    </div>
                    <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">Position QR code within the frame</p>
                  </motion.div>
                )}

                {toolView === 'generate' && (
                  <motion.div key="generate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-8 text-center">
                    {isGenerating ? (
                      <div className="space-y-4">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
                        <p className="text-sm font-bold animate-pulse">Generating unique S.No...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="w-20 h-20 bg-indigo-600/20 rounded-3xl flex items-center justify-center mx-auto border-2 border-indigo-500/20">
                          <Sparkles className="w-10 h-10 text-indigo-500" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold">Ready to Generate?</h3>
                          <p className="text-xs text-slate-400 px-8">This will create a unique Serial Number for your property that you can print or share.</p>
                        </div>
                        <button 
                          onClick={handleGenerateOwn}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                        >
                          Generate Now
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {toolView === 'privacy' && (
                  <motion.div key="privacy" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Privacy Controls</span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">Manage how tenants can interact with you through the Smart Board.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-4 h-4 text-indigo-400" />
                          <div>
                            <p className="text-xs font-bold">Pre-call Message</p>
                            <p className="text-[9px] text-slate-500 uppercase font-bold">Show before call</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onUpdate({ showCallMessage: !user.showCallMessage })} 
                          className={`w-10 h-5 rounded-full relative transition-all ${user.showCallMessage ? 'bg-indigo-600' : 'bg-slate-700'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${user.showCallMessage ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <MessageCircle className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="text-xs font-bold">Chat Only Mode</p>
                            <p className="text-[9px] text-slate-500 uppercase font-bold">Disable direct calls</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onUpdate({ whatsappOnly: !user.whatsappOnly })} 
                          className={`w-10 h-5 rounded-full relative transition-all ${user.whatsappOnly ? 'bg-emerald-600' : 'bg-slate-700'}`}
                        >
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${user.whatsappOnly ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                          <BellOff className="w-4 h-4 text-orange-400" />
                          <div>
                            <p className="text-xs font-bold">DND Mode</p>
                            <p className="text-[9px] text-slate-500 uppercase font-bold">Silence inquiries</p>
                          </div>
                        </div>
                        <button onClick={() => setShowDndModal(true)} className={`w-10 h-5 rounded-full relative transition-all ${user.dnd?.enabled ? 'bg-orange-600' : 'bg-slate-700'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${user.dnd?.enabled ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {toolView === 'my_properties' && (
                  <motion.div key="my_properties" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="flex gap-4 border-b border-slate-800">
                      <button 
                        onClick={() => setMyPropsTab('active')}
                        className={`pb-3 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${myPropsTab === 'active' ? 'text-indigo-400' : 'text-slate-500'}`}
                      >
                        Active ({properties.filter(p => p.status !== 'occupied').length})
                        {myPropsTab === 'active' && <motion.div layoutId="myprops-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />}
                      </button>
                      <button 
                        onClick={() => setMyPropsTab('past')}
                        className={`pb-3 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${myPropsTab === 'past' ? 'text-indigo-400' : 'text-slate-500'}`}
                      >
                        Past ({properties.filter(p => p.status === 'occupied').length})
                        {myPropsTab === 'past' && <motion.div layoutId="myprops-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />}
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {properties
                        .filter(p => myPropsTab === 'active' ? p.status !== 'occupied' : p.status === 'occupied')
                        .map(p => (
                          <div key={p.id} className="p-3 bg-slate-800/30 rounded-2xl border border-slate-700/50 flex gap-3 group">
                            <img src={p.images[0]} className="w-16 h-16 rounded-xl object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{p.title}</h4>
                              <p className="text-[10px] text-slate-500 truncate">{p.locality}, {p.city}</p>
                              <div className="flex gap-2 mt-2">
                                {myPropsTab === 'past' && (
                                  <button onClick={() => onRepostProperty?.(p.id)} className="p-1 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all"><RefreshCw className="w-3 h-3" /></button>
                                )}
                                <button onClick={() => onEditProperty?.(p)} className="p-1 bg-indigo-600/10 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Settings2 className="w-3 h-3" /></button>
                                <button onClick={() => onDeleteProperty?.(p.id)} className="p-1 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><CloseIcon className="w-3 h-3" /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      {properties.filter(p => myPropsTab === 'active' ? p.status !== 'occupied' : p.status === 'occupied').length === 0 && (
                        <div className="py-8 text-center">
                          <p className="text-xs text-slate-500 font-medium">No properties found</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {toolView === 'profile' && (
                  <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 md:mb-1.5 ml-1">Full Name</label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 md:py-2.5 px-3 md:px-4 text-xs md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 md:mb-1.5 ml-1">Mobile Number</label>
                        <div className="w-full bg-slate-800/30 border border-slate-700/30 rounded-xl py-2 md:py-2.5 px-3 md:px-4 text-xs md:text-sm font-medium text-slate-400 flex items-center justify-between">
                          {user.phone}
                          <Shield className="w-3 h-3 text-slate-600" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 md:mb-1.5 ml-1">Language Preference</label>
                        <select 
                          value={language} 
                          onChange={(e) => setLanguage(e.target.value as Language)} 
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2 md:py-2.5 px-3 md:px-4 text-xs md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        >
                          <option>English</option>
                          <option>Hindi</option>
                          <option>Spanish</option>
                        </select>
                      </div>
                      <button 
                        onClick={handleSave} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 py-2.5 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
                      >
                        Update Profile
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* My Properties Section */}
        {user.type === UserType.OWNER && (
          <div className="bg-slate-900/50 rounded-2xl md:rounded-3xl border border-slate-800/50 overflow-hidden">
            <button 
              onClick={() => setToolView('my_properties')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/10 transition-all">
                  <Package className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                </div>
                <span className="text-xs font-bold text-slate-300">My Properties</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}

        {/* Profile Settings Section - Minimized */}
        <div className="bg-slate-900/50 rounded-2xl md:rounded-3xl border border-slate-800/50 overflow-hidden">
          <button 
            onClick={() => setToolView('profile')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/10 transition-all">
                <UserIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
              </div>
              <span className="text-xs font-bold text-slate-300">Profile Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* App Preferences Section */}
        <div className="bg-slate-900/50 rounded-2xl md:rounded-3xl border border-slate-800/50 overflow-hidden">
          <div className="p-3 md:p-4 border-b border-slate-800/50 flex items-center gap-2">
            <Settings2 className="w-3.5 md:w-4 h-3.5 md:h-4 text-indigo-500" />
            <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">App Preferences</h3>
          </div>
          <div className="p-3 md:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Push Notifications</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">New property alerts</p>
              </div>
              <button className="w-8 h-4 bg-indigo-600 rounded-full relative">
                <div className="absolute right-1 top-1 w-2 h-2 bg-white rounded-full" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Email Updates</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Weekly market reports</p>
              </div>
              <button className="w-8 h-4 bg-slate-700 rounded-full relative">
                <div className="absolute left-1 top-1 w-2 h-2 bg-white rounded-full" />
              </button>
            </div>
          </div>
        </div>

        {/* Support & Security */}
        <div className="bg-slate-900/50 rounded-3xl border border-slate-800/50 overflow-hidden">
          <div className="divide-y divide-slate-800/50">
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/10 transition-all">
                  <Shield className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                </div>
                <span className="text-xs font-bold text-slate-300">Security & Privacy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/10 transition-all">
                  <Smartphone className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                </div>
                <span className="text-xs font-bold text-slate-300">Linked Devices</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-3 md:p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl md:rounded-3xl border border-rose-500/20 font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98]"
        >
          <LogOut className="w-3.5 md:w-4 h-3.5 md:h-4" />
          Log Out Account
        </button>
      </div>

      <p className="text-center text-[8px] font-black uppercase tracking-[0.3em] text-slate-600 mt-6">
        ToletBro • Version 1.0.5
      </p>

      <AnimatePresence>
        {showDndModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6">
              <div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="bg-orange-500/20 p-2 rounded-lg"><BellOff className="w-5 h-5 text-orange-400" /></div><h3 className="text-xl font-bold">DND Range Setup</h3></div><button onClick={() => setShowDndModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors"><CloseIcon className="w-5 h-5" /></button></div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold tracking-wider">From Date</label><div className="relative group"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" /><input type="date" className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" value={user.dnd?.fromDate || ''} onChange={(e) => onUpdate({ dnd: { ...user.dnd!, fromDate: e.target.value, enabled: true } })} /></div></div>
                  <div><label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold tracking-wider">To Date</label><div className="relative group"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" /><input type="date" className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" value={user.dnd?.toDate || ''} onChange={(e) => onUpdate({ dnd: { ...user.dnd!, toDate: e.target.value, enabled: true } })} /></div></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold tracking-wider">From Time</label><div className="relative group"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" /><input type="time" className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" value={user.dnd?.fromTime || ''} onChange={(e) => onUpdate({ dnd: { ...user.dnd!, fromTime: e.target.value, enabled: true } })} /></div></div>
                  <div><label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold tracking-wider">To Time</label><div className="relative group"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" /><input type="time" className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-xs focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" value={user.dnd?.toTime || ''} onChange={(e) => onUpdate({ dnd: { ...user.dnd!, toTime: e.target.value, enabled: true } })} /></div></div>
                </div>
                <div><label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold tracking-wider">Auto-Response Message (Max 2 lines)</label><textarea maxLength={100} rows={2} className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-2 focus:ring-indigo-500 transition-all resize-none" placeholder="E.g., We are currently unavailable." value={user.dnd?.message || ''} onChange={(e) => onUpdate({ dnd: { ...user.dnd!, message: e.target.value, enabled: true } })} /></div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800"><button onClick={() => { onUpdate({ dnd: { enabled: false } }); setShowDndModal(false); }} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition-colors text-slate-400 hover:text-white">Turn Off</button><button onClick={() => { onUpdate({ dnd: { ...user.dnd!, enabled: true } }); setShowDndModal(false); alert('Settings updated!'); }} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20">Save Settings</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const QRCodeSVG: React.FC<{ value: string }> = ({ value }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  useEffect(() => { if (value) QRCode.toDataURL(value, { width: 200, margin: 1 }).then(setDataUrl); }, [value]);
  return dataUrl ? <img src={dataUrl} alt="QR" className="w-32 h-32" /> : <div className="w-32 h-32 bg-slate-800 animate-pulse flex items-center justify-center"><Loader2 className="animate-spin text-slate-500" /></div>;
};

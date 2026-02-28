
import React, { useState } from 'react';
import { Property, User, UserType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, MapPin, BedDouble, Bath, Square, Calendar, User as UserIcon, 
  ArrowLeft, CheckCircle2, Phone, MessageCircle, ChevronRight,
  Home, Building, Layers, Info, Share2, Heart, ShieldCheck,
  ChevronLeft, AlertCircle, PhoneCall
} from 'lucide-react';
import { MOCK_USERS } from '../constants';

interface PropertyDetailsProps {
  property: Property;
  onClose: () => void;
  isFavourite: boolean;
  onToggleFavourite: (id: string) => void;
  allUsers: User[];
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({ property, onClose, isFavourite, onToggleFavourite, allUsers }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactFlow, setShowContactFlow] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const owner = allUsers.find(u => u.id === property.ownerId) || MOCK_USERS.find(u => u.id === property.ownerId);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  const handleContactClick = () => {
    setShowContactFlow(true);
    setAcknowledged(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-slate-950 overflow-y-auto"
    >
      {/* Dynamic Header */}
      <nav className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur-xl border-b border-white/5 p-3 md:p-4 flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-all bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-white/5">
          <ArrowLeft className="w-3.5 md:w-4 h-3.5 md:h-4" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Exit</span>
        </button>
        <div className="hidden md:flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-black tracking-widest uppercase text-slate-300">Verified Listing</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 md:p-2.5 bg-white/5 rounded-xl text-slate-300 hover:text-indigo-400 transition-all"><Share2 className="w-3.5 md:w-4 h-3.5 md:h-4" /></button>
          <button 
            onClick={() => onToggleFavourite(property.id)}
            className={`p-2 md:p-2.5 rounded-xl transition-all border ${isFavourite ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-white/5 border-white/5 text-slate-300 hover:text-rose-500'}`}
          >
            <Heart className={`w-3.5 md:w-4 h-3.5 md:h-4 ${isFavourite ? 'fill-current' : ''}`} />
          </button>
          <button onClick={onClose} className="p-2 md:p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20"><X className="w-3.5 md:w-4 h-3.5 md:h-4" /></button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-3 md:p-6 space-y-6 md:space-y-8">
        {/* Premium Slideshow Section */}
        <div className="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-xl h-[240px] sm:h-[300px] md:h-[500px] group bg-slate-900">
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentImageIndex}
              src={property.images[currentImageIndex]} 
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full object-cover" 
              alt="" 
            />
          </AnimatePresence>
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-60"></div>
          
          {/* Slideshow Controls */}
          <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={prevImage}
              className="p-2 bg-black/40 backdrop-blur-xl rounded-full text-white hover:bg-indigo-600 transition-all border border-white/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextImage}
              className="p-2 bg-black/40 backdrop-blur-xl rounded-full text-white hover:bg-indigo-600 transition-all border border-white/10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {property.images.map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`h-1 rounded-full transition-all ${i === currentImageIndex ? 'w-6 bg-indigo-500' : 'w-1.5 bg-white/30'}`}
              />
            ))}
          </div>

          <div className="absolute bottom-4 left-4">
             <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-[8px] font-black uppercase tracking-[0.2em] text-white border border-white/10">
               {currentImageIndex + 1} / {property.images.length}
             </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            {/* Main Header */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">For {property.type}</span>
                <span className="px-3 py-1 bg-slate-800/80 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-full">Available</span>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Verified</span>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <h1 className="text-xl md:text-3xl font-bold leading-tight tracking-tight">{property.title}</h1>
                  <div className="flex items-center gap-1.5 md:gap-2 text-slate-400">
                    <MapPin className="w-3.5 md:w-4 h-3.5 md:h-4 text-indigo-500" />
                    <span className="text-xs md:text-sm font-medium text-slate-300">{property.locality}, {property.city}</span>
                  </div>
                </div>
                <div className="bg-slate-900/80 p-3 md:p-4 rounded-2xl border border-white/5 text-right min-w-[140px] md:min-w-[180px]">
                  <span className="block text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Total Price</span>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-2xl md:text-3xl font-bold text-white">₹{property.price.toLocaleString()}</span>
                    {property.type === 'rent' && <span className="text-[10px] md:text-xs text-slate-500 font-bold uppercase">/mo</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
              {[
                { icon: BedDouble, val: property.bhkType, label: 'Config' },
                { icon: Bath, val: property.bathrooms, label: 'Baths' },
                { icon: Square, val: `${property.sqft} ft²`, label: 'Area' },
                { icon: Layers, val: `${property.floorNo}/${property.totalFloors}`, label: 'Floor' },
                { icon: Home, val: property.furnishing, label: 'Furnishing' },
                { icon: Building, val: property.propertyType, label: 'Property Type' }
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 p-3 md:p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center gap-1.5 md:gap-2">
                  <stat.icon className="w-4 md:w-5 h-4 md:h-5 text-indigo-400" />
                  <div>
                    <span className="text-xs md:text-sm font-bold block">{stat.val}</span>
                    <span className="text-[7px] md:text-[8px] uppercase tracking-widest text-slate-500 font-bold">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing & Availability Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {property.type === 'rent' ? (
                <>
                  <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Security Deposit</span>
                    <span className="text-sm font-bold text-white">₹{property.securityDeposit?.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Maintenance</span>
                    <span className="text-sm font-bold text-white">₹{property.maintenanceCharges?.toLocaleString()} /mo</span>
                  </div>
                  <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Available From</span>
                    <span className="text-sm font-bold text-white">{property.availableFrom ? new Date(property.availableFrom).toLocaleDateString() : 'Immediate'}</span>
                  </div>
                  <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Preferred Tenant</span>
                    <span className="text-sm font-bold text-indigo-400">{property.preferredTenant}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Negotiable</span>
                    <span className={`text-sm font-bold ${property.isNegotiable ? 'text-emerald-400' : 'text-slate-400'}`}>{property.isNegotiable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Loan Available</span>
                    <span className={`text-sm font-bold ${property.loanAvailable ? 'text-emerald-400' : 'text-slate-400'}`}>{property.loanAvailable ? 'Yes' : 'No'}</span>
                  </div>
                </>
              )}
            </div>

            {/* About Section */}
            <div className="p-5 md:p-6 bg-slate-900/40 rounded-2xl md:rounded-3xl border border-white/5 space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
                <Info className="w-4 md:w-5 h-4 md:h-5 text-indigo-500" />
                Description
              </h3>
              <p className="text-slate-400 leading-relaxed text-xs md:text-sm font-medium">
                {property.description}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div className="space-y-3 md:space-y-4">
                <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 px-2">Amenities</h4>
                <div className="grid grid-cols-1 gap-1.5 md:gap-2">
                  {property.amenities.map(a => (
                    <div key={a} className="flex items-center gap-2.5 md:gap-3 bg-white/5 p-2.5 md:p-3 rounded-xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                      <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-indigo-500"></div>
                      <span className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-widest">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 md:space-y-4">
                <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 px-2">Nearby</h4>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {property.nearbyFacilities.map(f => (
                    <span key={f} className="px-2.5 md:px-3 py-1.5 md:py-2 bg-slate-800/40 rounded-xl text-[8px] md:text-[9px] font-black text-slate-400 border border-slate-800 uppercase tracking-widest">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Premium Sticky Sidebar */}
          <div className="lg:col-span-4 sticky top-24 space-y-6">
            <div className="bg-gradient-to-br from-indigo-900/30 via-slate-900 to-slate-950 p-6 rounded-[2rem] border border-white/10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/10 rounded-full blur-3xl -mr-12 -mt-12"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center gap-4">
                <div className="relative">
                   <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-black shadow-lg border-2 border-slate-950">
                    {property.listedBy.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-lg shadow-md border border-slate-950">
                    <ShieldCheck className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg">Listed by {property.listedBy}</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mt-0.5">Verified Owner</p>
                </div>

                <div className="w-full space-y-3 mt-2">
                  <button 
                    onClick={handleContactClick}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group active:scale-95"
                  >
                    <PhoneCall className="w-4 h-4" />
                    Contact Owner
                  </button>
                  <button className="w-full bg-white/5 hover:bg-white/10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-slate-300 border border-white/5 active:scale-95">
                    <MessageCircle className="w-4 h-4" />
                    Chat Online
                  </button>
                </div>

                <div className="pt-6 w-full border-t border-white/5 mt-2 space-y-4">
                   <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Board Serial</span>
                     <span className="text-xs font-bold text-indigo-400 font-mono bg-indigo-400/10 px-2 py-0.5 rounded-md border border-indigo-400/20">{property.qrCode || 'PS-9923'}</span>
                   </div>
                   <div className="bg-white p-4 rounded-2xl shadow-lg flex flex-col items-center gap-2">
                      <div className="w-24 h-24 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[8px] font-black p-3 text-center leading-relaxed">
                         QR PREVIEW
                      </div>
                      <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Scan to access</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Trust Banner */}
            <div className="p-4 bg-slate-900/40 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest">Safe Inquiry</h4>
                <p className="text-[8px] text-slate-500 font-bold">Privacy protected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTACT FLOW MODAL */}
      <AnimatePresence>
        {showContactFlow && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="bg-slate-900 border border-slate-800/60 rounded-[2.5rem] p-8 max-w-sm w-full space-y-6 shadow-2xl overflow-hidden relative"
            >
              <button onClick={() => setShowContactFlow(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-full"><X className="w-4 h-4" /></button>

              {!acknowledged && owner?.showCallMessage ? (
                <div className="space-y-6 pt-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="bg-indigo-600/20 p-5 rounded-3xl border border-indigo-500/20 shadow-inner">
                      <AlertCircle className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-black">Owner's Message</h3>
                    <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                      <p className="text-slate-300 text-sm italic leading-relaxed">"{owner.callMessageText}"</p>
                    </div>
                  </div>

                  {owner.ownerTags && owner.ownerTags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {owner.ownerTags.map(tag => (
                        <span key={tag} className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 text-slate-400 text-[9px] font-black rounded-full uppercase tracking-widest">{tag}</span>
                      ))}
                    </div>
                  )}

                  <button 
                    onClick={() => setAcknowledged(true)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                  >
                    I Understand, Show Number
                  </button>
                </div>
              ) : (
                <div className="space-y-6 pt-4">
                   <div className="text-center">
                    <div className="flex justify-center mb-5">
                      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 border border-green-500/20 shadow-inner"><CheckCircle2 className="w-8 h-8" /></div>
                    </div>
                    <h3 className="text-xl font-black">Verified Contact</h3>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Direct access to the owner</p>
                  </div>

                  <div className="space-y-3">
                    {owner?.primaryPhoneEnabled && !owner?.whatsappOnly && (
                      <a href={`tel:${owner.phone}`} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-indigo-500 hover:bg-slate-800 transition-all group/opt">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-black">{owner.phone}</p>
                            <span className="text-[9px] text-slate-500 uppercase font-black">Primary Phone</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover/opt:translate-x-1 transition-transform" />
                      </a>
                    )}

                    <a href={`https://wa.me/${owner?.phone.replace(/\s+/g, '')}`} target="_blank" className="flex items-center justify-between p-4 bg-emerald-600/10 rounded-2xl border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-600/20 transition-all group/opt">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-white">Send Message</p>
                          <span className="text-[9px] text-emerald-500 uppercase font-black">Instant WhatsApp</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-emerald-500 group-hover/opt:translate-x-1 transition-transform" />
                    </a>
                  </div>

                  <p className="text-[10px] text-center text-slate-500 italic px-4">Mention ToletBro to get priority response from the owner.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

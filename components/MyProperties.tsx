
import React, { useMemo } from 'react';
import { Property, User, UserType } from '../types';
import { PropertyCard } from './PropertyCard';
import { motion } from 'framer-motion';
import { Package, ArrowLeft, QrCode, User as UserIcon, Phone, MessageCircle, Info, AlertCircle } from 'lucide-react';

interface MyPropertiesProps {
  owner: User | null;
  properties: Property[];
  isOwnProfile: boolean;
  onBack?: () => void;
  onSelectProperty: (id: string) => void;
  onEditProperty?: (property: Property) => void;
  onDeleteProperty?: (id: string) => void;
}

export const MyProperties: React.FC<MyPropertiesProps> = ({ 
  owner, 
  properties, 
  isOwnProfile, 
  onBack, 
  onSelectProperty,
  onEditProperty,
  onDeleteProperty
}) => {
  const filteredProperties = useMemo(() => {
    if (!owner) return [];
    return properties.filter(p => p.ownerId === owner.id && !p.isSystemQR);
  }, [owner, properties]);

  if (!owner) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800">
          <AlertCircle className="w-10 h-10 text-slate-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Owner Not Found</h2>
        <p className="text-slate-400 max-w-md">The property owner you are looking for could not be identified. Please check the QR code or Serial Number.</p>
        {onBack && (
          <button 
            onClick={onBack}
            className="mt-8 flex items-center gap-2 text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-16 md:w-24 h-16 md:h-24 rounded-2xl md:rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-2xl md:text-4xl font-black shadow-xl shadow-indigo-600/20">
            {owner.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight">{isOwnProfile ? 'My Properties' : `${owner.name}'s Properties`}</h1>
              {!isOwnProfile && <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/10">Verified Owner</span>}
            </div>
            <p className="text-slate-400 text-sm md:text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              {filteredProperties.length} {filteredProperties.length === 1 ? 'Property' : 'Properties'} Listed
            </p>
          </div>
        </div>

        {!isOwnProfile && (
          <div className="flex flex-wrap gap-3">
            <a 
              href={`tel:${owner.phone}`}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-5 py-3 rounded-2xl text-sm font-bold border border-slate-800 transition-all"
            >
              <Phone className="w-4 h-4 text-indigo-400" />
              Call Owner
            </a>
            <a 
              href={`https://wa.me/${owner.phone.replace(/\D/g, '')}`}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* Owner Info Card (for finders) */}
      {!isOwnProfile && owner.ownerTags && owner.ownerTags.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Owner Preferences</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {owner.ownerTags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-xl border border-slate-700">
                {tag}
              </span>
            ))}
          </div>
          {owner.showCallMessage && owner.callMessageText && (
            <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
              <p className="text-xs text-slate-400 italic leading-relaxed">"{owner.callMessageText}"</p>
            </div>
          )}
        </div>
      )}

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {filteredProperties.map((property) => (
          <motion.div
            key={property.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <PropertyCard 
              property={property} 
              onClick={() => onSelectProperty(property.id)}
              isOwner={isOwnProfile}
              onEdit={() => onEditProperty?.(property)}
              onDelete={() => onDeleteProperty?.(property.id)}
            />
          </motion.div>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="py-20 text-center bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
          <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-400">No properties listed yet</h3>
          <p className="text-slate-500 text-sm mt-2">Check back later for updates.</p>
        </div>
      )}

      {onBack && (
        <div className="pt-8 border-t border-slate-900">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-bold text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </button>
        </div>
      )}
    </div>
  );
};


import React, { useState } from 'react';
import { Property, User, UserType } from '../types';
import { BedDouble, Bath, Square, MapPin, QrCode, PhoneCall, MessageCircle, X, CheckCircle2, Phone, AlertCircle, ChevronRight, Heart, Sparkles, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_USERS } from '../constants';

interface PropertyCardProps {
  property: Property;
  onClick: (id: string) => void;
  isFavourite: boolean;
  onToggleFavourite: (id: string) => void;
  isOwner?: boolean;
  onEdit?: (property: Property) => void;
  onDelete?: (id: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, onClick, isFavourite, onToggleFavourite, isOwner, onEdit, onDelete 
}) => {
  // Find owner from mock users
  const owner = MOCK_USERS.find(u => u.id === property.ownerId);

  const toggleFavourite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavourite(property.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(property);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(property.id);
  };

  // Title = Configuration + Property type
  const displayTitle = `${property.bhkType} ${property.propertyType}`;

  return (
    <>
      <div 
        onClick={() => onClick(property.id)}
        className="group bg-slate-900 rounded-2xl overflow-hidden border border-slate-800/50 hover:border-indigo-500/40 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/5 flex flex-col h-full relative"
      >
        {/* Heart Icon Overlay */}
        <button 
          onClick={toggleFavourite}
          className={`absolute top-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-md transition-all ${isFavourite ? 'bg-rose-500 text-white shadow-lg' : 'bg-black/20 text-white/80 hover:bg-black/40 hover:text-white'}`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavourite ? 'fill-current' : ''}`} />
        </button>

        {/* Image container */}
        <div className="relative h-40 overflow-hidden">
          <img 
            src={property.images[0]} 
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60"></div>
          
          <div className="absolute bottom-2 left-2 bg-indigo-600/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 text-white shadow-lg">
            <QrCode className="w-2.5 h-2.5" />
            {property.qrCode || owner?.qrCode || '...'}
          </div>

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <span className="bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/20 shadow-xl">
              For {property.type}
            </span>
          </div>
        </div>
        
        <div className="p-2.5 md:p-3 flex-1 flex flex-col justify-between">
          <div className="space-y-1.5 md:space-y-2">
            <div>
              <div className="flex justify-between items-start gap-2 mb-0.5">
                <h3 className="text-xs md:text-sm font-bold line-clamp-1 text-slate-100 group-hover:text-indigo-400 transition-colors">{displayTitle}</h3>
                <div className="flex flex-col items-end">
                  <span className="text-xs md:text-sm font-bold text-white">₹{property.price.toLocaleString()}</span>
                  {property.type === 'rent' && <span className="text-[7px] md:text-[8px] text-slate-500 font-bold -mt-0.5 uppercase tracking-tighter">/ month</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-[9px] md:text-[10px] font-medium">
                <MapPin className="w-2 md:w-2.5 h-2 md:h-2.5 text-indigo-500" />
                {property.locality}, {property.city}
              </div>
            </div>

            {/* Quick details row */}
            <div className="flex items-center justify-between py-1.5 md:py-2 px-2 md:px-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <div className="flex items-center gap-1 md:gap-1.5">
                <BedDouble className="w-2.5 md:w-3 h-2.5 md:h-3 text-indigo-400" />
                <span className="text-[8px] md:text-[9px] font-bold text-white">{property.bhkType}</span>
              </div>
              <div className="w-px h-2.5 md:h-3 bg-slate-800"></div>
              <div className="flex items-center gap-1 md:gap-1.5">
                <Square className="w-2.5 md:w-3 h-2.5 md:h-3 text-indigo-400" />
                <span className="text-[8px] md:text-[9px] font-bold text-white">{property.sqft} ft²</span>
              </div>
              <div className="w-px h-2.5 md:h-3 bg-slate-800"></div>
              <div className="flex items-center gap-1 md:gap-1.5">
                <Bath className="w-2.5 md:w-3 h-2.5 md:h-3 text-indigo-400" />
                <span className="text-[8px] md:text-[9px] font-bold text-white">{property.bathrooms}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            {isOwner ? (
              <div className="flex gap-2">
                <button 
                  onClick={handleEdit}
                  className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                >
                  Edit
                </button>
                <button 
                  onClick={handleDelete}
                  className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                >
                  Delete
                </button>
              </div>
            ) : (
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Quick View</span>
            )}
            <ChevronRight className="w-3 h-3 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </>
  );
};

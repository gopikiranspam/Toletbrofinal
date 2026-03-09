
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Property, User } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { PropertyCard } from './PropertyCard';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MapPin, Filter, Loader2, AlertCircle, ChevronLeft, 
  Building2, QrCode, ShieldCheck, Phone, MessageCircle, Share2,
  ArrowRight, Info, Home
} from 'lucide-react';
import { MOCK_PROPERTIES, MOCK_USERS } from '../constants';

export const SearchResults: React.FC = () => {
  const { ownerId, qrSerial } = useParams<{ ownerId: string; qrSerial: string }>();
  const navigate = useNavigate();
  const [owner, setOwner] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!ownerId) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch Owner
        let ownerData: User | null = null;
        
        // Try API first (more robust against permission issues)
        try {
          const response = await fetch(`/api/owner/lookup?serial=${encodeURIComponent(ownerId)}`);
          if (response.ok) {
            const data = await response.json();
            ownerData = data.owner;
          }
        } catch (e) {
          console.warn("API owner lookup failed, trying direct Firestore...");
        }

        if (!ownerData) {
          // Try direct Firestore
          const userRef = doc(db, 'users', ownerId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            ownerData = { id: userDoc.id, ...userDoc.data() } as User;
          }
        }

        // Fallback to Mock Data if still not found
        if (!ownerData) {
          const mockOwner = MOCK_USERS.find(u => u.id === ownerId || u.qrCode?.toUpperCase() === ownerId.toUpperCase());
          if (mockOwner) {
            ownerData = mockOwner as User;
          }
        }

        if (!ownerData) {
          setError("Owner not found. Please check the QR code or Serial Number.");
          setLoading(false);
          return;
        }

        setOwner(ownerData);

        // 2. Fetch Properties for this owner
        const q = query(
          collection(db, "properties"), 
          where("ownerId", "==", ownerData.id),
          where("status", "==", "active")
        );
        
        const querySnapshot = await getDocs(q);
        const firestoreProps = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => !p.isSystemQR) as Property[];

        if (firestoreProps.length > 0) {
          setProperties(firestoreProps);
        } else {
          // Fallback to Mock Data
          const mockProps = MOCK_PROPERTIES.filter(p => p.ownerId === ownerData!.id);
          setProperties(mockProps);
        }

      } catch (err: any) {
        console.error("Error fetching search results:", err);
        if (err.code === 'permission-denied') {
          setError("Database access denied. Please update Firestore Security Rules.");
        } else {
          setError("An error occurred while fetching listings. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ownerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="bg-indigo-600/10 p-8 rounded-[3rem] mb-8 border border-indigo-500/20">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        </div>
        <h2 className="text-xl font-black mb-2 uppercase tracking-widest text-white">Searching Listings...</h2>
        <p className="text-slate-400 text-sm animate-pulse">Fetching properties for {qrSerial || ownerId}</p>
      </div>
    );
  }

  if (error || !owner) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-6">
        <div className="bg-rose-500/10 p-8 rounded-[3rem] mb-8 border border-rose-500/20">
          <AlertCircle className="w-12 h-12 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black mb-4 text-white uppercase tracking-widest">No Listings Found</h2>
        <p className="text-slate-400 max-w-md mx-auto leading-relaxed mb-10">
          {error || "We couldn't find any properties matching this QR code or Owner ID."}
        </p>
        <button 
          onClick={() => navigate('/')}
          className="bg-indigo-600 hover:bg-indigo-700 px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2"
        >
          <Home className="w-5 h-5" /> Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Search Header Style */}
      <div className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-indigo-400">Search Results</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                Owner: {owner.name} • S.No: {qrSerial || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  navigator.share({ title: `${owner.name}'s Properties`, url });
                } else {
                  navigator.clipboard.writeText(url);
                  alert('Link copied!');
                }
              }}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Owner Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-900/20 to-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-indigo-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-3xl font-black shadow-xl shadow-indigo-600/20">
              {owner.name.charAt(0)}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{owner.name}</h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600/10 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                  <ShieldCheck className="w-3 h-3" /> Verified Owner
                </span>
              </div>
              <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                Viewing all properties posted by this owner. Scan the Smart Board on the property to view details instantly or contact the owner directly.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs font-bold">{properties.length} Active Listings</span>
                </div>
                {qrSerial && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <QrCode className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono uppercase">S.No: {qrSerial}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <a 
                href={`tel:${owner.phone}`}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-700 transition-all"
              >
                <Phone className="w-4 h-4 text-indigo-400" /> Call Owner
              </a>
              <a 
                href={`https://wa.me/${owner.phone.replace(/\D/g, '')}`}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>
        </motion.div>

        {/* Results Info */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div>
            <h3 className="text-lg font-bold">Matching Listings</h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Showing {properties.length} results</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <Filter className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Sort: Newest</span>
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence>
            {properties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <PropertyCard 
                  property={property} 
                  onClick={(id) => navigate(`/property/${id}`)}
                  isFavourite={false}
                  onToggleFavourite={() => {}}
                  isOwner={false}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {properties.length === 0 && (
          <div className="text-center py-20 bg-slate-900 rounded-[3rem] border border-slate-800">
            <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">No active properties</h3>
            <p className="text-slate-400 max-w-sm mx-auto">
              This owner has no active property listings at the moment.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="max-w-4xl mx-auto px-4 mt-12">
        <div className="bg-indigo-600/5 border border-indigo-500/10 p-6 rounded-3xl flex items-start gap-4">
          <div className="bg-indigo-600/20 p-2 rounded-xl">
            <Info className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold mb-1">About Smart To-Let Boards</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              ToletBro Smart Boards allow tenants to view property details, images, and owner profiles instantly by scanning a QR code. This system protects owner privacy and saves time for both parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

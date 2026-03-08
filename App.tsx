
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams, Navigate, useMatch } from 'react-router-dom';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { ChatBot } from './components/ChatBot';
import { QRScanner } from './components/QRScanner';
import { PropertyCard } from './components/PropertyCard';
import { ProfileSettings } from './components/ProfileSettings';
import { AdminConsole } from './components/AdminConsole';
import { PropertyDetails } from './components/PropertyDetails';
import { MyProperties } from './components/MyProperties';
import { User, Property, UserType } from './types';
import { MOCK_PROPERTIES, MOCK_TESTIMONIALS, MOCK_USERS } from './constants';
import { gemini } from './services/geminiService';
import { 
  Search, MapPin, Filter, Plus, ChevronRight, Star, QrCode as QrIcon, 
  BarChart3, Globe, Smartphone, Phone, MessageSquare, X, Camera, Image as ImageIcon, 
  Sparkles, Zap, ShieldCheck, CheckCircle2, ChevronLeft, Loader2, Upload, Navigation, PlusCircle, Building2, Map as MapIcon, Locate, Heart, AlertCircle, Info
} from 'lucide-react';
import { auth, db, storage } from './firebase';
import { 
  collection, addDoc, updateDoc, doc, getDocs, query, where, getDoc, 
  onSnapshot, deleteDoc, orderBy, serverTimestamp, setDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';

// Haversine formula to calculate distance in KM
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'rent' | 'buy'>('rent');
  const [isScanning, setIsScanning] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isPropertiesLoading, setIsPropertiesLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>(MOCK_USERS);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [lastScannedQr, setLastScannedQr] = useState<string | null>(null);
  const [scannedOwnerId, setScannedOwnerId] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'valid' | 'unlinked' | 'invalid' | null>(null);
  const [isQrInvalid, setIsQrInvalid] = useState(false);
  const [isOwnerLoading, setIsOwnerLoading] = useState(false);
  const [userBoard, setUserBoard] = useState<any>(null);

  const normalizedSearchQuery = searchQuery.trim().toUpperCase();
  const isQrFormat = /^[A-Z]{3}\d{3}$/.test(normalizedSearchQuery);
  const isSNoFormat = (s: string) => /^[A-Z]{3}\d{3}$/.test(s.toUpperCase());
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  const propertyMatch = useMatch('/property/:propertyId');
  const propertyId = propertyMatch?.params.propertyId;

  useEffect(() => {
    setSelectedPropertyId(propertyId || null);
  }, [propertyId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            // If user document doesn't exist, create a default one
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'New User',
              phone: firebaseUser.phoneNumber || '',
              type: UserType.FINDER,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
            };
            
            try {
              await setDoc(userRef, newUser);
              setUser(newUser);
            } catch (writeErr: any) {
              console.error("Error creating user document:", writeErr);
              // Fallback to local state if write fails (likely due to permissions)
              setUser(newUser);
              if (writeErr.code === 'permission-denied') {
                console.warn("Firestore write permission denied for users collection. Please check your rules.");
              }
            }
          }
        } catch (error: any) {
          console.error("Error fetching user data:", error);
          if (error.code === 'permission-denied') {
            // Fallback to a minimal user object if read fails
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              phone: firebaseUser.phoneNumber || '',
              type: UserType.FINDER,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
            });
          }
        }
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!scannedOwnerId) {
      return;
    }

    const fetchOwner = async () => {
      setIsOwnerLoading(true);
      try {
        // Try API first to avoid permission issues
        const response = await fetch(`/api/owner/lookup?serial=${encodeURIComponent(scannedOwnerId)}`);
        if (response.ok) {
          const data = await response.json();
          const userData = data.owner;
          setAllUsers(prev => prev.find(u => u.id === userData.id) ? prev : [...prev, userData]);
        } else {
          // Fallback to client-side
          const userRef = doc(db, 'users', scannedOwnerId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = { ...userDoc.data(), id: userDoc.id } as User;
            setAllUsers(prev => prev.find(u => u.id === userData.id) ? prev : [...prev, userData]);
          }
        }
      } catch (error: any) {
        if (error.code !== 'permission-denied') {
          console.error("Error fetching QR owner:", error);
        }
      } finally {
        setIsOwnerLoading(false);
      }
    };

    fetchOwner();
  }, [scannedOwnerId]);

  useEffect(() => {
    if (!isQrFormat || scannedOwnerId) return;

    const fetchOwnerBySerial = async () => {
      // Check if already in allUsers to avoid unnecessary queries
      if (allUsers.find(u => u.qrCode?.toUpperCase() === normalizedSearchQuery)) return;

      try {
        // Try API first
        const response = await fetch(`/api/owner/lookup?serial=${encodeURIComponent(normalizedSearchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          const userData = data.owner;
          setAllUsers(prev => prev.find(u => u.id === userData.id) ? prev : [...prev, userData]);
        }
      } catch (error: any) {
        if (error.code !== 'permission-denied') {
          console.error("Error fetching owner by serial:", error);
        }
      }
    };

    fetchOwnerBySerial();
  }, [isQrFormat, normalizedSearchQuery, scannedOwnerId]);

  useEffect(() => {
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot: any) => {
      const firestoreProps = querySnapshot.docs
        .map((doc: any) => ({
          ...doc.data(),
          id: doc.id
        }))
        .filter((p: any) => !p.isSystemQR) as Property[];
      
      if (firestoreProps.length > 0) {
        setProperties(firestoreProps);
      } else {
        // If collection is empty, use mock data as fallback
        setProperties(MOCK_PROPERTIES);
      }
      setIsPropertiesLoading(false);
    }, (error: any) => {
      setIsPropertiesLoading(false);
      if (error.code === 'permission-denied') {
        console.warn("Firestore read permission denied for properties collection. Falling back to mock data. Please check your Firestore Security Rules.");
        setProperties(MOCK_PROPERTIES);
      } else {
        console.error("Error listening to properties:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.qrCode) {
      const q = query(collection(db, "properties"), where("code", "==", user.qrCode.toUpperCase()));
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setUserBoard({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setUserBoard(null);
        }
      }, (err) => {
        console.error("Error fetching user board:", err);
      });
      return () => unsubscribe();
    } else {
      setUserBoard(null);
    }
  }, [user?.qrCode]);
  
  // Nearby search states
  const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [radiusFilter, setRadiusFilter] = useState<number>(10); // Default 10km
  const [isNearbyActive, setIsNearbyActive] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; propertyId: string | null; step: 1 | 2 }>({ isOpen: false, propertyId: null, step: 1 });
  const [dashboardSubTab, setDashboardSubTab] = useState<'active' | 'past'>('active');

  // Multi-step Property Form State
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [currentFormStep, setCurrentFormStep] = useState(1);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [newProp, setNewProp] = useState<Partial<Property>>({
    title: '',
    description: '',
    price: 0,
    location: '',
    locality: '',
    city: '',
    state: '',
    type: 'rent',
    propertyType: 'Apartment',
    bhkType: '2 BHK',
    furnishing: 'Unfurnished',
    bedrooms: 2,
    bathrooms: 2,
    sqft: 0,
    floorNo: 0,
    totalFloors: 0,
    latitude: 0,
    longitude: 0,
    amenities: [],
    nearbyFacilities: [],
    listedBy: 'Owner',
    images: [],
    securityDeposit: 0,
    maintenanceCharges: 0,
    isNegotiable: false,
    loanAvailable: false,
    preferredTenant: 'Anyone'
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    setUploadingImages(true);
    const files = Array.from(e.target.files) as File[];
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const storageRef = ref(storage, `properties/${user.id}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }
      setNewProp(prev => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls]
      }));
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("Failed to upload images. Please try again.");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleEditProperty = (property: Property) => {
    setNewProp(property);
    setEditingPropertyId(property.id);
    setIsEditingProperty(true);
    setIsAddingProperty(true);
    setCurrentFormStep(1);
    setSelectedPropertyId(null);
  };

  const handleDeleteProperty = (propertyId: string) => {
    setDeleteModal({ isOpen: true, propertyId, step: 1 });
  };

  const updateOwnerDynamicUrl = async (ownerId: string) => {
    try {
      const propsQuery = query(
        collection(db, "properties"), 
        where("ownerId", "==", ownerId),
        where("status", "==", "active")
      );
      const propsSnap = await getDocs(propsQuery);
      const ownerProperties = propsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let dynamicUrl = '';
      if (ownerProperties.length === 1) {
        dynamicUrl = `/property/${ownerProperties[0].id}`;
      } else {
        dynamicUrl = `/owner/${ownerId}/properties`;
      }

      // Find the assigned board for this owner
      const boardQuery = query(
        collection(db, "properties"), 
        where("ownerId", "==", ownerId),
        where("isSystemQR", "==", true)
      );
      const boardSnap = await getDocs(boardQuery);
      
      for (const boardDoc of boardSnap.docs) {
        await updateDoc(doc(db, "properties", boardDoc.id), {
          dynamicUrl,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error updating dynamic URL:", error);
    }
  };

  const handleMarkAsOccupied = async () => {
    if (!deleteModal.propertyId || !user) return;
    try {
      await updateDoc(doc(db, "properties", deleteModal.propertyId), {
        status: 'occupied'
      });
      await updateOwnerDynamicUrl(user.id);
      alert("Property marked as occupied.");
      setDeleteModal({ isOpen: false, propertyId: null, step: 1 });
      setSelectedPropertyId(null);
    } catch (error) {
      console.error("Error marking as occupied:", error);
      alert("Failed to update property status.");
    }
  };

  const handleConfirmDeletePermanently = async () => {
    if (!deleteModal.propertyId || !user) return;
    try {
      await deleteDoc(doc(db, "properties", deleteModal.propertyId));
      await updateOwnerDynamicUrl(user.id);
      alert("Property deleted permanently.");
      setDeleteModal({ isOpen: false, propertyId: null, step: 1 });
      setSelectedPropertyId(null);
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Failed to delete property.");
    }
  };

  const handleRepostProperty = async (propertyId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "properties", propertyId), {
        status: 'active'
      });
      await updateOwnerDynamicUrl(user.id);
      alert("Property reposted successfully.");
    } catch (error) {
      console.error("Error reposting property:", error);
      alert("Failed to repost property.");
    }
  };

  const toggleFavourite = (id: string) => {
    setFavourites(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  // Auto-generate Title and Description
  useEffect(() => {
    if (isAddingProperty) {
      const { propertyType, bhkType, furnishing, locality, city, type } = newProp;
      
      // Auto-generate Title: BHK Type + Property Type
      const newTitle = `${bhkType || ''} ${propertyType || ''}`.trim();
      if (newProp.title !== newTitle && newTitle.length > 1) {
        setNewProp(prev => ({ ...prev, title: newTitle }));
      }

      // Auto-generate Description if it's empty or very short
      if (!newProp.description || newProp.description.length < 5) {
        const action = type === 'rent' ? 'available for rent' : 'available for sale';
        const desc = `This beautiful ${bhkType || '[BHK]'} ${propertyType || '[Type]'} is ${action} in the prime locality of ${locality || '[Locality]'}, ${city || '[City]'}. The property is ${furnishing || 'unfurnished'} and comes with all modern amenities. Perfect for those looking for a comfortable and convenient living space.`;
        setNewProp(prev => ({ ...prev, description: desc }));
      }
    }
  }, [newProp.propertyType, newProp.bhkType, newProp.furnishing, newProp.locality, newProp.city, newProp.type, isAddingProperty]);

  const scrollToFormTop = () => {
    if (formContainerRef.current) {
      formContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    if (!newProp.images) return;
    const newImages = [...newProp.images];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    setNewProp(prev => ({ ...prev, images: newImages }));
  };

  const qrOwner = useMemo(() => {
    if (scannedOwnerId) {
      const byId = allUsers.find(u => u.id === scannedOwnerId);
      if (byId) return byId;
      // Fallback for cases where serial might be passed as ID
      const bySerial = allUsers.find(u => u.qrCode?.toUpperCase() === scannedOwnerId.toUpperCase());
      if (bySerial) return bySerial;
    }
    if (isQrFormat) {
      return allUsers.find(u => u.qrCode?.toUpperCase() === normalizedSearchQuery);
    }
    return null;
  }, [scannedOwnerId, isQrFormat, allUsers, normalizedSearchQuery]);

  const filteredProperties = useMemo(() => {
    let result = properties;

    if (location.pathname === '/saved') {
      result = result.filter(p => favourites.includes(p.id));
    }

    if (scannedOwnerId) {
      if (qrOwner) {
        result = result.filter(p => p.ownerId === qrOwner.id);
      } else {
        // If owner not found, we'll show the error message via conditional rendering
        result = [];
      }
    } else if (normalizedSearchQuery) {
      if (isQrFormat) {
        if (qrOwner) {
          result = result.filter(p => p.ownerId === qrOwner.id);
        } else {
          result = result.filter(p => 
            p.title.toUpperCase().includes(normalizedSearchQuery) ||
            p.locality.toUpperCase().includes(normalizedSearchQuery)
          );
        }
      } else {
        result = result.filter(p => 
          p.title.toUpperCase().includes(normalizedSearchQuery) ||
          p.locality.toUpperCase().includes(normalizedSearchQuery) ||
          p.city.toUpperCase().includes(normalizedSearchQuery)
        );
      }
    }

    if (!scannedOwnerId) {
      result = result.filter(p => p.type === searchType);
    }
    
    // Filter out occupied properties from public search
    result = result.filter(p => p.status !== 'occupied');

    if (isNearbyActive && userCoords && !scannedOwnerId) {
      result = result
        .map(p => ({
          ...p,
          distance: getDistance(userCoords.lat, userCoords.lng, p.latitude, p.longitude)
        }))
        .filter(p => p.distance <= radiusFilter)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return result;
  }, [searchQuery, searchType, properties, allUsers, isNearbyActive, userCoords, radiusFilter, location.pathname, favourites, normalizedSearchQuery, isQrFormat, qrOwner]);

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedData };
      setUser(newUser);
      setAllUsers(prev => prev.map(u => u.id === user.id ? newUser : u).concat(allUsers.find(u => u.id === user.id) ? [] : [newUser]));
      
      try {
        await updateDoc(doc(db, "users", user.id), updatedData);
      } catch (error: any) {
        console.error("Error updating profile in Firestore:", error);
        if (error.code === 'permission-denied') {
          alert("Missing or insufficient permissions to update profile. Please check your Firestore Security Rules.");
        }
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/');
      setSelectedPropertyId(null);
      setIsNearbyActive(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const generatePredefinedDescription = (prop: Partial<Property>) => {
    const { propertyType, bhkType, furnishing, locality, city, type } = prop;
    const action = type === 'rent' ? 'available for rent' : 'available for sale';
    return `This beautiful ${bhkType} ${propertyType} is ${action} in the prime locality of ${locality}, ${city}. The property is ${furnishing} and comes with all modern amenities. Perfect for those looking for a comfortable and convenient living space.`;
  };

  const handleAddPropertySubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!user) return;

    // Validation
    if (!newProp.price || newProp.price <= 0) {
      alert("Please enter a valid price.");
      return;
    }
    if (!newProp.locality || !newProp.city || !newProp.location) {
      alert("Please provide complete address details (Locality, City, and Address).");
      return;
    }
    if (!newProp.description || newProp.description.length < 20) {
      alert("Please provide a detailed description (at least 20 characters).");
      return;
    }
    if (!newProp.images || newProp.images.length === 0) {
      alert("Please upload at least one image of the property.");
      return;
    }
    
    let finalLat = newProp.latitude;
    let finalLng = newProp.longitude;

    // Forward Geocoding Fallback if coordinates are missing but address is provided
    if (!finalLat || !finalLng) {
      if (newProp.location) {
        setIsFetchingAddress(true);
        try {
          const fullAddress = `${newProp.location}, ${newProp.locality}, ${newProp.city}, ${newProp.state}`;
          const response = await fetch(`/api/geocode/forward?address=${encodeURIComponent(fullAddress)}`);
          const data = await response.json();
          
          if (data.status === "OK" && data.results && data.results.length > 0) {
            finalLat = data.results[0].geometry.location.lat;
            finalLng = data.results[0].geometry.location.lng;
          }
        } catch (error) {
          console.error("Forward geocoding failed:", error);
        } finally {
          setIsFetchingAddress(false);
        }
      }
    }

    const propertyData = {
      ...newProp,
      latitude: finalLat,
      longitude: finalLng,
      ownerId: user.id,
      updatedAt: serverTimestamp(),
    };

    // Remove ID from data if it exists (for updates)
    if ((propertyData as any).id) delete (propertyData as any).id;

    try {
      if (isEditingProperty && editingPropertyId) {
        await updateDoc(doc(db, "properties", editingPropertyId), propertyData);
        await updateOwnerDynamicUrl(user.id);
        alert('Property updated successfully!');
      } else {
        (propertyData as any).createdAt = serverTimestamp();
        (propertyData as any).analytics = {
          totalVisitors: 0,
          smartBoardScans: 0,
          onlineSearches: 0,
          callClicks: 0,
          whatsappClicks: 0
        };
        await addDoc(collection(db, "properties"), propertyData);
        await updateOwnerDynamicUrl(user.id);
        if (user.type === UserType.FINDER) {
          handleUpdateProfile({ type: UserType.OWNER });
          alert('Congratulations! Your first property is listed and your account has been upgraded to Owner status.');
        } else {
          alert('Property listed successfully!');
        }
      }

      setIsAddingProperty(false);
      setIsEditingProperty(false);
      setEditingPropertyId(null);
      setCurrentFormStep(1);
      setNewProp({
        type: 'rent',
        propertyType: 'Apartment',
        bhkType: '2 BHK',
        furnishing: 'Unfurnished',
        amenities: [],
        nearbyFacilities: [],
        listedBy: 'Owner',
        latitude: 0,
        longitude: 0,
        images: [],
        securityDeposit: 0,
        maintenanceCharges: 0,
        isNegotiable: false,
        loanAvailable: false,
        preferredTenant: 'Anyone'
      });
      
      navigate(user ? `/user/${user.id}/dashboard` : '/dashboard');
    } catch (error: any) {
      console.error("Error saving property:", error);
      if (error.code === 'permission-denied') {
        alert("Missing or insufficient permissions to save property. Please check your Firestore Security Rules.");
      } else {
        alert("Failed to save property. Please check your connection and try again.");
      }
    }
  };

  const findNearby = () => {
    if ("geolocation" in navigator) {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsNearbyActive(true);
          setIsFetchingLocation(false);
        },
        (err) => {
          setIsFetchingLocation(false);
          let message = "Location access is required to find nearby properties.";
          if (err.code === 1) message = "Location permission denied. Please enable it in your browser settings.";
          if (err.code === 3) message = "Location request timed out. Please try again.";
          alert(message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleFetchAddress = async () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setIsFetchingAddress(true);
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        
        if (isNaN(latitude) || isNaN(longitude)) {
          alert("Invalid coordinates received.");
          setIsFetchingAddress(false);
          return;
        }

        try {
          // Store coordinates immediately
          setNewProp(prev => ({ 
            ...prev, 
            latitude, 
            longitude 
          }));

          // Call backend proxy for Google Geocoding
          const response = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();
          
          if (data.status === "OK" && data.results && data.results.length > 0) {
            const result = data.results[0];
            const addressComponents = result.address_components;
            
            const getComponent = (types: string[]) => {
              const comp = addressComponents.find((c: any) => types.some(t => c.types.includes(t)));
              return comp ? comp.long_name : "";
            };

            const locality = getComponent(["sublocality_level_1", "sublocality", "neighborhood"]);
            const city = getComponent(["locality", "administrative_area_level_2"]);
            const state = getComponent(["administrative_area_level_1"]);

            setNewProp(prev => ({
              ...prev,
              location: result.formatted_address || prev.location,
              locality: locality || prev.locality,
              city: city || prev.city,
              state: state || prev.state
            }));
          } else {
            throw new Error(data.error_message || "No results found");
          }
        } catch (error) {
          console.error("Geocoding failed:", error);
          alert("Captured location, but failed to auto-fill address details. Please complete the address fields manually.");
        } finally {
          setIsFetchingAddress(false);
        }
      },
      (err) => {
        setIsFetchingAddress(false);
        let message = "Could not capture location.";
        if (err.code === 1) message = "Location permission denied. Please allow location access in your browser.";
        if (err.code === 3) message = "Location request timed out. Please try again or check your signal.";
        alert(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!selectedProperty) return;
    if (allUsers.find(u => u.id === selectedProperty.ownerId)) return;

    const fetchPropertyOwner = async () => {
      try {
        // Try API first to avoid permission issues
        const response = await fetch(`/api/owner/lookup?serial=${encodeURIComponent(selectedProperty.ownerId)}`);
        if (response.ok) {
          const data = await response.json();
          const userData = data.owner;
          setAllUsers(prev => prev.find(u => u.id === userData.id) ? prev : [...prev, userData]);
        } else {
          // Fallback to client-side
          const userRef = doc(db, 'users', selectedProperty.ownerId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = { ...userDoc.data(), id: userDoc.id } as User;
            setAllUsers(prev => prev.find(u => u.id === userData.id) ? prev : [...prev, userData]);
          }
        }
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.warn("Permission denied fetching property owner. Falling back to client-side lookup.");
        } else {
          console.error("Error fetching property owner:", error);
        }
      }
    };

    fetchPropertyOwner();
  }, [selectedPropertyId, allUsers.length]);

  const handleLinkBoard = async (serial: string) => {
    if (!user) return;
    const code = serial.toUpperCase();
    
    try {
      // 1. Update user profile
      await handleUpdateProfile({ qrCode: code });
      
      // 2. Update the property document (the system QR)
      const q = query(collection(db, "properties"), where("code", "==", code));
      const querySnapshot = await getDocs(q);
      
      // Calculate dynamic URL based on current properties
      const propsQuery = query(
        collection(db, "properties"), 
        where("ownerId", "==", user.id),
        where("status", "==", "active")
      );
      const propsSnap = await getDocs(propsQuery);
      const ownerProperties = propsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let dynamicUrl = '';
      if (ownerProperties.length === 1) {
        dynamicUrl = `/property/${ownerProperties[0].id}`;
      } else {
        dynamicUrl = `/owner/${user.id}/properties`;
      }

      if (!querySnapshot.empty) {
        const propDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, "properties", propDoc.id), {
          ownerId: user.id,
          isSystemQR: true, // Keep as system QR so it doesn't show in property listings
          status: 'Assigned',
          dynamicUrl,
          updatedAt: serverTimestamp()
        });
      } else {
        // If it doesn't exist in properties yet, create it as a linked board
        await addDoc(collection(db, "properties"), {
          code,
          ownerId: user.id,
          isSystemQR: true,
          status: 'Assigned',
          dynamicUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      alert('Board linked successfully!');
    } catch (error) {
      console.error("Error linking board:", error);
      alert("Failed to link board. Please try again.");
    }
  };

  const handleScan = useCallback(async (code: string) => {
    if (!code) return;
    
    let serial = '';
    try {
      if (code.startsWith('http')) {
        const url = new URL(code);
        // Handle various URL patterns
        const match = url.pathname.match(/\/q\/([a-zA-Z0-9_-]+)/i) || 
                      url.pathname.match(/\/properties\/qrcode\/([a-zA-Z0-9_-]+)/i) ||
                      url.pathname.match(/\/owner\/([a-zA-Z0-9_-]+)\/properties/i) ||
                      url.pathname.match(/\/user\/([a-zA-Z0-9_-]+)\/my-properties/i) ||
                      url.pathname.match(/\/property\/([a-zA-Z0-9_-]+)/i);
        
        if (match) {
          serial = match[1];
        } else {
          // Fallback: get the last part of the path
          const parts = url.pathname.split('/').filter(Boolean);
          serial = parts[parts.length - 1] || '';
        }
      } else {
        serial = code;
      }
    } catch (e) {
      serial = code;
    }

    if (!serial) return;
    const upperSerial = serial.toUpperCase();

    // Reset states and show loader
    setQrStatus(null);
    setIsQrInvalid(false);
    setIsOwnerLoading(true);

    let linkedOwner: User | null = null;
    let ownerProperties: any[] = [];

    try {
      console.log(`Scanning code: ${code}`);
      const response = await fetch(`/api/owner/lookup?serial=${encodeURIComponent(serial)}`);
      const data = await response.json().catch(() => ({}));
      
      if (response.ok) {
        linkedOwner = data.owner;
        ownerProperties = data.properties || [];
        
        if (linkedOwner) {
          console.log(`Owner found via API: ${linkedOwner.id}`);
          setAllUsers(prev => prev.find(u => u.id === linkedOwner!.id) ? prev : [...prev, linkedOwner!]);
        }
      } else {
        console.warn("API lookup failed:", response.status, data);
        // If the API failed due to permissions, try to find in local mocks immediately
        if (response.status === 403 || response.status === 500 || data.isPermissionError) {
          const mockOwner = MOCK_USERS.find(u => u.qrCode === upperSerial || u.id === serial);
          if (mockOwner) {
            console.log("Found owner in local mock data after API permission error");
            linkedOwner = mockOwner as User;
            ownerProperties = MOCK_PROPERTIES.filter(p => p.ownerId === mockOwner.id);
            setAllUsers(prev => prev.find(u => u.id === mockOwner.id) ? prev : [...prev, mockOwner as User]);
          }
        }
      }
    } catch (error) {
      console.error("Error finding owner by serial/id via API:", error);
      // Fallback to local mocks on network error
      const mockOwner = MOCK_USERS.find(u => u.qrCode === upperSerial || u.id === serial);
      if (mockOwner) {
        linkedOwner = mockOwner as User;
        ownerProperties = MOCK_PROPERTIES.filter(p => p.ownerId === mockOwner.id);
      }
    }

    if (linkedOwner) {
      const linkedOwnerId = linkedOwner.id;
      console.log(`Redirecting to owner: ${linkedOwnerId} with ${ownerProperties.length} properties`);
      setScannedOwnerId(linkedOwnerId);
      setLastScannedQr(serial);
      setQrStatus('valid');
      setIsScanning(false);
      setIsNearbyActive(false);
      setSearchQuery('');
      setIsOwnerLoading(false);

      if (ownerProperties.length === 1) {
        const targetUrl = `/property/${ownerProperties[0].id}`;
        navigate(targetUrl, { replace: true });
      } else if (ownerProperties.length > 1) {
        const targetUrl = `/owner/${linkedOwnerId}/properties`;
        navigate(targetUrl, { replace: true });
      } else {
        // No active properties, show the owner profile view in Home
        navigate('/', { replace: true });
      }
    } else {
      // Check if it's a Property QR (linked directly to a property)
      console.log("API lookup returned no owner, trying client-side fallback...");
      try {
        const qProp = query(collection(db, "properties"), where("code", "==", upperSerial));
        const propSnapshot = await getDocs(qProp);
        
        if (!propSnapshot.empty) {
          const propertyData = { id: propSnapshot.docs[0].id, ...propSnapshot.docs[0].data() } as any;
          console.log("Found property via client-side fallback:", propertyData.id);
          
          setLastScannedQr(serial);
          setSearchQuery('');
          setIsScanning(false);
          setIsNearbyActive(false);

          if (propertyData.isSystemQR && !propertyData.ownerId) {
            setScannedOwnerId(serial);
            setQrStatus('unlinked');
            setIsQrInvalid(false);
            setIsOwnerLoading(false);
            navigate(`/q/${serial}`, { replace: true });
          } else if (propertyData.dynamicUrl) {
            // Use the stored dynamic URL if available
            setScannedOwnerId(propertyData.ownerId || serial);
            setQrStatus('valid');
            setIsQrInvalid(false);
            setIsOwnerLoading(false);
            navigate(propertyData.dynamicUrl, { replace: true });
          } else {
            const ownerId = propertyData.ownerId;
            if (!ownerId) {
              setQrStatus('invalid');
              setIsOwnerLoading(false);
              navigate('/', { replace: true });
              return;
            }

            // Fetch properties for this owner to decide where to redirect
            const propsQuery = query(
              collection(db, "properties"), 
              where("ownerId", "==", ownerId),
              where("status", "==", "active")
            );
            const propsSnap = await getDocs(propsQuery);
            const ownerProperties = propsSnap.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter((p: any) => !p.isSystemQR);

            setScannedOwnerId(ownerId);
            setQrStatus('valid');
            setIsQrInvalid(false);
            setLastScannedQr(serial);
            setSearchQuery('');
            setIsScanning(false);
            setIsNearbyActive(false);
            setIsOwnerLoading(false);

            if (ownerProperties.length === 1) {
              const targetUrl = `/property/${ownerProperties[0].id}`;
              navigate(targetUrl, { replace: true });
            } else if (ownerProperties.length > 1) {
              const targetUrl = `/owner/${ownerId}/properties`;
              navigate(targetUrl, { replace: true });
            } else {
              navigate('/', { replace: true });
            }
          }
        } else {
          // One last check: maybe it's a direct property ID
          console.log("No property found by code, checking if it is a direct property ID...");
          const propRef = doc(db, "properties", serial);
          const propSnap = await getDoc(propRef);
          if (propSnap.exists()) {
            const propData = { id: propSnap.id, ...propSnap.data() } as Property;
            if (!propData.isSystemQR) {
              setIsOwnerLoading(false);
              navigate(`/property/${propSnap.id}`, { replace: true });
              setIsScanning(false);
              return;
            }
          }

          console.warn("All scan lookups failed for:", serial);
          setLastScannedQr(serial);
          setScannedOwnerId(serial);
          setSearchQuery('');
          setIsScanning(false);
          setIsNearbyActive(false);
          setQrStatus('invalid');
          setIsQrInvalid(true);
          setIsOwnerLoading(false);
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        console.error("Error in handleScan fallback:", err);
        
        // Final fallback to mock data if permissions are denied
        if (err.message?.includes("permission") || err.code === 'permission-denied') {
          const mockOwner = MOCK_USERS.find(u => u.qrCode === upperSerial || u.id === serial);
          if (mockOwner) {
            console.log("Found owner in mock data fallback after permission error");
            setScannedOwnerId(mockOwner.id);
            setQrStatus('valid');
            setIsOwnerLoading(false);
            navigate(`/owner/${mockOwner.id}/properties`, { replace: true });
            return;
          }
          alert("Scan failed: Access denied. Please ensure you are scanning a valid board.");
        }
        setIsOwnerLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    const handleRouting = () => {
      let path = location.pathname;
      // Remove trailing slash if any
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      
      // Match /q/SERIAL, /properties/qrcode/SERIAL, or just /SERIAL if it looks like a serial
      const match = path.match(/\/q\/([a-zA-Z0-9_-]+)/i) || 
                    path.match(/\/properties\/qrcode\/([a-zA-Z0-9_-]+)/i) ||
                    path.match(/\/property\/([a-zA-Z0-9_-]+)/i);
      
      if (match) {
        const serial = match[1];
        if (serial !== lastScannedQr) {
          handleScan(serial);
        }
      } else if (path.length >= 7 && path.startsWith('/')) {
        // Handle /ABC123 or /USER_ID pattern
        const potentialSerial = path.substring(1);
        if (potentialSerial !== lastScannedQr && !['admin', 'profile', 'search', 'login'].includes(potentialSerial.toLowerCase())) {
          handleScan(potentialSerial);
        }
      }
    };
    handleRouting();
  }, [location.pathname, handleScan, lastScannedQr]);


  const isOwner = user?.type === UserType.OWNER;
  const isFinder = user?.type === UserType.FINDER;

  const handleNavigate = (tab: string) => {
    const authRequired = ['dashboard', 'settings', 'favourites', 'admin'].includes(tab) || (tab === 'my-properties' && !scannedOwnerId);
    if (!user && authRequired) {
      setShowAuth(true);
      return;
    }
    
    const routeMap: Record<string, string> = {
      'home': '/',
      'dashboard': user ? `/user/${user.id}/dashboard` : '/dashboard',
      'settings': user ? `/user/${user.id}/profile` : '/profile',
      'favourites': '/saved',
      'admin': '/admin',
      'my-properties': user ? `/user/${user.id}/my-properties` : '/my-properties',
      'scan': '/scan'
    };

    navigate(routeMap[tab] || '/');
    setShowAuth(false);
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setShowAuth(false);
    navigate(`/user/${userData.id}/dashboard`);
  };

  const handleAddPropertyClick = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setIsAddingProperty(true);
  };

  const handleToggleFavourite = (propertyId: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const isAdding = !favourites.includes(propertyId);
    toggleFavourite(propertyId);
    if (isAdding) {
      navigate('/saved');
    }
  };

  const handleSelectProperty = (id: string | null) => {
    if (id) {
      navigate(`/property/${id}`);
    } else {
      // Navigate back to the previous page or home
      if (location.pathname.startsWith('/property/')) {
        navigate(-1);
      } else {
        setSelectedPropertyId(null);
      }
    }
  };

  const handleSearch = async () => {
    const queryStr = searchQuery.trim().toUpperCase();
    if (!queryStr) return;

    // Check if it's a S.No format
    if (/^[A-Z]{3}\d{3}$/.test(queryStr)) {
      handleScan(queryStr);
      return;
    }

    // Normal search is handled by filteredProperties memo
  };

  const closeScanner = () => {
    setIsScanning(false);
    navigate('/');
  };

  // Aggregated Stats for Dashboard
  const allOwnerProperties = user ? properties.filter(p => p.ownerId === user.id) : [];
  const activeOwnerProperties = allOwnerProperties.filter(p => p.status !== 'occupied');
  const pastOwnerProperties = allOwnerProperties.filter(p => p.status === 'occupied');
  const totalScans = allOwnerProperties.reduce((acc, p) => acc + (p.analytics?.smartBoardScans || 0), 0);
  const totalViews = allOwnerProperties.reduce((acc, p) => acc + (p.analytics?.onlineSearches || 0), 0);

  const smartBoardAdvantages = [
    "No more unnecessary calls from random tenants",
    "No need to show your house to every tenant physically",
    "Tenants scan QR and view house images without disturbing you",
    "No need to write your private mobile number on Tolet boards",
    "Activate Do Not Disturb (DND) mode anytime",
    "Track how many people scanned and viewed your property",
    "One QR code shows all your posted properties",
    "100% Free – No hidden charges"
  ];

  const HomeView = () => (
    <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 md:space-y-12">
      {isOwnerLoading ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <div className="bg-indigo-600/10 p-8 rounded-[3rem] mb-8 border border-indigo-500/20">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
          </div>
          <h2 className="text-2xl font-black mb-4 uppercase tracking-widest">Resolving Smart Board...</h2>
          <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
            Please wait while we fetch the property details and owner information.
          </p>
        </div>
      ) : !scannedOwnerId ? (
        <div className="text-center max-w-3xl mx-auto space-y-4 md:space-y-6 py-6 md:py-10 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight">
            Find Your Perfect <span className="text-indigo-500">Living Space</span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg">Premium property listings with instant QR discovery and AI-powered insights.</p>
          
          <div className="bg-slate-900 p-4 md:p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-4">
              <div className="inline-flex bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                <button onClick={() => setSearchType('rent')} className={`flex-1 sm:flex-none px-6 md:px-8 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${searchType === 'rent' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}>Rent</button>
                <button onClick={() => setSearchType('buy')} className={`flex-1 sm:flex-none px-6 md:px-8 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${searchType === 'buy' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}>Buy</button>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                {isNearbyActive && (
                  <div className="flex items-center gap-2 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Radius:</span>
                    <select 
                      className="bg-transparent text-[10px] font-bold text-indigo-400 focus:ring-0 border-none p-0 cursor-pointer"
                      value={radiusFilter}
                      onChange={(e) => setRadiusFilter(Number(e.target.value))}
                    >
                      <option value={2}>2 km</option>
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                      <option value={20}>20 km</option>
                    </select>
                    <button onClick={() => setIsNearbyActive(false)} className="text-slate-500 hover:text-red-400 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button 
                  onClick={findNearby}
                  disabled={isFetchingLocation}
                  className={`flex items-center gap-2 font-bold text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 rounded-xl transition-all ${isNearbyActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20'}`}
                >
                  {isFetchingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                  {isNearbyActive ? 'Refine Near Me' : 'Find Nearby'}
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-slate-500" />
                <input type="text" placeholder="Location, locality or enter Owner S.No" className="w-full bg-slate-800 border-none rounded-2xl py-3 md:py-4 pl-11 md:pl-12 pr-4 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); if(isNearbyActive) setIsNearbyActive(false); if(scannedOwnerId) setScannedOwnerId(null); }} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsScanning(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 md:px-6 py-3 md:py-4 rounded-2xl font-medium transition-colors border border-slate-700">
                  <QrIcon className="w-4 md:w-5 h-4 md:h-5 text-indigo-500" /><span className="md:hidden text-xs">Scan QR</span>
                </button>
                <button onClick={handleSearch} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 px-6 md:px-10 py-3 md:py-4 rounded-2xl font-semibold text-xs md:text-sm transition-all shadow-lg shadow-indigo-500/20">Search</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-6 md:py-10 px-4">
          <div className="max-w-4xl mx-auto">
            <button 
              onClick={() => { setScannedOwnerId(null); setLastScannedQr(null); setQrStatus(null); navigate('/'); }}
              className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-6 group"
            >
              <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 group-hover:bg-slate-800 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Back to Search</span>
            </button>

            {qrOwner ? (
              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-6 md:p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                  <img src={qrOwner.avatar} className="w-24 h-24 rounded-3xl border-2 border-indigo-500/20 shadow-xl" alt="" />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{qrOwner.name}</h2>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600/10 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                        <ShieldCheck className="w-3 h-3" /> Verified Owner
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm max-w-xl">
                      Viewing all properties posted by this owner. Scan the Smart Board on the property to view details instantly.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs font-bold">{filteredProperties.length} Active Listings</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <QrIcon className="w-4 h-4" />
                        <span className="text-xs font-bold font-mono uppercase">S.No: {lastScannedQr}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isOwnerLoading ? (
              <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-12 mb-8 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Fetching Owner Details...</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              {scannedOwnerId && qrOwner ? `Properties by ${qrOwner.name}` : isNearbyActive ? `Properties within ${radiusFilter}km` : 'Recommended for you'}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm">
              {scannedOwnerId && qrOwner ? 'Exclusive property listings for this owner' : isNearbyActive ? 'Sorted by nearest distance' : 'Based on your recent activity'}
            </p>
          </div>
          {(scannedOwnerId || isNearbyActive) ? (
            <button 
              onClick={() => { setScannedOwnerId(null); setIsNearbyActive(false); setSearchQuery(''); navigate('/'); }} 
              className="text-indigo-500 font-bold text-xs md:text-sm hover:underline"
            >
              Reset View
            </button>
          ) : (
            <button className="flex items-center gap-1 text-indigo-500 font-semibold hover:text-indigo-400 transition-colors text-xs md:text-sm">View All <ChevronRight className="w-3.5 h-3.5" /></button>
          )}
        </div>
        
        {scannedOwnerId && qrStatus === 'unlinked' && (
          <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[2.5rem] text-center space-y-6 max-w-lg mx-auto">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto">
              <QrIcon className="w-10 h-10 text-indigo-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Valid Board - Not Linked</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                This Smart Board (S.No: <span className="text-indigo-400 font-mono font-bold">{scannedOwnerId}</span>) is a genuine ToletBro board, but it hasn't been linked to an owner's account yet.
              </p>
            </div>
            <div className="pt-4">
              <button 
                onClick={() => { setScannedOwnerId(null); setLastScannedQr(null); setQrStatus(null); navigate('/'); }} 
                className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Back to Search
              </button>
            </div>
          </div>
        )}

        {scannedOwnerId && qrStatus === 'invalid' && (
          <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[2.5rem] text-center space-y-6 max-w-lg mx-auto">
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Invalid QR Code</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                The QR code you scanned is not a valid ToletBro Smart Board code. Please try again with a genuine board.
              </p>
            </div>
            <div className="pt-4">
              <button 
                onClick={() => { setScannedOwnerId(null); setLastScannedQr(null); setQrStatus(null); navigate('/'); }} 
                className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Back to Search
              </button>
            </div>
          </div>
        )}

        {scannedOwnerId && qrOwner && filteredProperties.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[2.5rem] text-center space-y-6 max-w-lg mx-auto">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-10 h-10 text-indigo-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">No properties posted yet</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Owner <span className="text-indigo-400 font-bold">{qrOwner.name}</span> has linked this board, but hasn't posted any active property listings yet.
              </p>
            </div>
            <div className="pt-4">
              <button 
                onClick={() => { setScannedOwnerId(null); setLastScannedQr(null); setQrStatus(null); navigate('/'); }} 
                className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Back to Search
              </button>
            </div>
          </div>
        )}

        {scannedOwnerId && qrOwner && filteredProperties.length > 0 && (
          <div className="mb-8 flex items-center justify-between bg-indigo-600/10 p-4 rounded-2xl border border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <QrIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Viewing Listings For</p>
                <p className="text-sm font-bold text-white">{qrOwner.name}'s Smart Board</p>
              </div>
            </div>
            <button 
              onClick={() => { setScannedOwnerId(null); setLastScannedQr(null); setQrStatus(null); navigate('/'); }}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              Clear Filter
            </button>
          </div>
        )}

        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredProperties.map(property => (
              <PropertyCard 
                key={property.id} 
                property={property} 
                onClick={(id) => handleSelectProperty(id)}
                isFavourite={favourites.includes(property.id)}
                onToggleFavourite={handleToggleFavourite}
                isOwner={user?.id === property.ownerId}
                onEdit={handleEditProperty}
                onDelete={handleDeleteProperty}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800">
            <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapIcon className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {isNearbyActive ? 'No nearby properties found' : 'No properties found'}
            </h3>
            <p className="text-slate-400 max-w-sm mx-auto">
              {isNearbyActive ? `Try increasing the search radius beyond ${radiusFilter}km or try a different city.` : 'Try adjusting your filters or search for a different owner QR.'}
            </p>
            {isNearbyActive && (
              <button onClick={() => setRadiusFilter(prev => prev + 10)} className="mt-6 text-indigo-400 font-bold text-sm underline">Expand Radius to {radiusFilter + 10}km</button>
            )}
          </div>
        )}
      </div>

      <div className="py-12 md:py-20 border-t border-slate-900">
        <div className="text-center mb-10 md:mb-16 space-y-3 md:space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold italic">What our users say</h2>
          <div className="flex justify-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 md:w-5 h-4 md:h-5 text-yellow-500 fill-yellow-500" />)}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">{MOCK_TESTIMONIALS.map(t => (
          <div key={t.id} className="bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 relative">
            <p className="text-slate-300 italic mb-6 md:mb-8 relative z-10 text-sm md:text-base leading-relaxed">"{t.content}"</p>
            <div className="flex items-center gap-3 md:gap-4"><img src={t.avatar} className="w-10 md:w-12 h-10 md:h-12 rounded-full border border-slate-700" alt="" /><div><h4 className="font-bold text-sm md:text-base">{t.name}</h4><span className="text-slate-500 text-[10px] md:text-xs">{t.role}</span></div></div>
          </div>
        ))}</div>
      </div>
    </motion.div>
  );

  const FavouritesView = () => (
    <motion.div key="favourites" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 md:space-y-8">
      <div><h1 className="text-2xl md:text-3xl font-bold">My Favourites</h1><p className="text-slate-400 text-xs md:text-sm">Properties you've saved for later</p></div>
      {filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredProperties.map(property => (
            <PropertyCard 
              key={property.id} 
              property={property} 
              onClick={(id) => handleSelectProperty(id)}
              isFavourite={favourites.includes(property.id)}
              onToggleFavourite={handleToggleFavourite}
              isOwner={user?.id === property.ownerId}
              onEdit={handleEditProperty}
              onDelete={handleDeleteProperty}
            />
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-800 p-20 text-center">
          <Heart className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-400">No saved properties yet</h3>
          <p className="text-sm text-slate-500 mt-2">Start exploring and save properties you like!</p>
          <button onClick={() => navigate('/')} className="mt-6 bg-indigo-600 px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">Explore Properties</button>
        </div>
      )}
    </motion.div>
  );

  const DashboardView = () => {
    if (!user) return null;
    return (
      <motion.div key="dashboard-tab" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6 md:space-y-8">
        {isOwner ? (
          <div className="space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div><h1 className="text-2xl md:text-3xl font-bold">My Dashboard</h1><p className="text-slate-400 text-xs md:text-sm">Manage your property listings and monitor performance</p></div>
              <button onClick={handleAddPropertyClick} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 md:py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20">
                <Plus className="w-4 md:w-5 h-4 md:h-5" /> Add New Property
              </button>
            </div>

            {!user.qrCode && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/user/${user.id}/profile`)}
                className="bg-gradient-to-br from-indigo-900/40 via-indigo-800/20 to-slate-900 p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-indigo-500/30 shadow-2xl relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6">
                  <div className="flex-1 space-y-3 md:space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/20">
                        <Sparkles className="w-4 md:w-5 h-4 md:h-5 text-white" />
                      </div>
                      <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Upgrade to Smart Tolet Board</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 md:gap-y-2">
                      {smartBoardAdvantages.map((adv, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] md:text-[11px] text-slate-300">
                          <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5 text-indigo-400 flex-shrink-0" />
                          <span className="leading-tight">{adv}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 md:gap-3 bg-slate-900/40 p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-indigo-500/10 group-hover:bg-indigo-600/10 transition-all min-w-[120px] md:min-w-[140px]">
                    <div className="bg-white p-2 md:p-2.5 rounded-xl shadow-xl shadow-indigo-500/10 opacity-70 group-hover:opacity-100 transition-opacity">
                      <QrIcon className="w-8 md:w-10 h-8 md:h-10 text-slate-900" />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-indigo-400 group-hover:text-indigo-300 text-center uppercase tracking-wider">Setup Now <ChevronRight className="inline w-3 h-3 ml-0.5" /></span>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6">
              <div className="bg-slate-900 p-3 md:p-6 rounded-2xl md:rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-1 md:mb-4">
                  <BarChart3 className="w-3 md:w-5 h-3 md:h-5 text-indigo-500" />
                  <h3 className="text-slate-400 text-[8px] md:text-sm font-medium uppercase tracking-tighter md:tracking-normal">Active</h3>
                </div>
                <span className="text-lg md:text-3xl font-bold">{activeOwnerProperties.length}</span>
              </div>
              <div className="bg-slate-900 p-3 md:p-6 rounded-2xl md:rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-1 md:mb-4">
                  <QrIcon className="w-3 md:w-5 h-3 md:h-5 text-green-500" />
                  <h3 className="text-slate-400 text-[8px] md:text-sm font-medium uppercase tracking-tighter md:tracking-normal">Scans</h3>
                </div>
                <span className="text-lg md:text-3xl font-bold">{totalScans}</span>
              </div>
              <div className="bg-slate-900 p-3 md:p-6 rounded-2xl md:rounded-3xl border border-slate-800 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2 mb-1 md:mb-4">
                  <Globe className="w-3 md:w-5 h-3 md:h-5 text-blue-500" />
                  <h3 className="text-slate-400 text-[8px] md:text-sm font-medium uppercase tracking-tighter md:tracking-normal">Views</h3>
                </div>
                <span className="text-lg md:text-3xl font-bold">{totalViews}</span>
              </div>
            </div>

            <div className="flex gap-4 border-b border-slate-800 mb-6">
              <button 
                onClick={() => setDashboardSubTab('active')}
                className={`pb-4 px-2 text-sm font-bold transition-all relative ${dashboardSubTab === 'active' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Active Listings ({activeOwnerProperties.length})
                {dashboardSubTab === 'active' && <motion.div layoutId="dash-subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />}
              </button>
              <button 
                onClick={() => setDashboardSubTab('past')}
                className={`pb-4 px-2 text-sm font-bold transition-all relative ${dashboardSubTab === 'past' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Past Properties ({pastOwnerProperties.length})
                {dashboardSubTab === 'past' && <motion.div layoutId="dash-subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400" />}
              </button>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-bold">{dashboardSubTab === 'active' ? 'Active Listings' : 'Past Properties'} Analytics</h2>
                <p className="text-indigo-400 text-sm font-bold">Owner QR: {user.qrCode || 'Not Set'}</p>
              </div>
              <div className="divide-y divide-slate-800">
                {(dashboardSubTab === 'active' ? activeOwnerProperties : pastOwnerProperties).map(p => (
                  <div key={p.id} className="p-8 flex flex-col lg:flex-row gap-8 hover:bg-slate-800/20 transition-all group/row">
                    <div className="flex items-start gap-6 lg:w-1/3">
                      <img src={p.images[0]} className="w-24 h-24 rounded-2xl object-cover shadow-lg" alt="" />
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-lg">{p.title}</h4>
                          <div className="flex gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            {dashboardSubTab === 'past' && (
                              <button onClick={() => handleRepostProperty(p.id)} title="Repost Property" className="p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all"><Zap className="w-3.5 h-3.5" /></button>
                            )}
                            <button onClick={() => handleEditProperty(p)} className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                            <button onClick={() => handleDeleteProperty(p.id)} className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <p className="text-slate-500 text-xs mb-3">{p.locality}, {p.location}</p>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold uppercase text-slate-400">{p.type}</span>
                          <span className="px-2 py-1 bg-indigo-500/10 rounded text-[10px] font-bold uppercase text-indigo-400">₹{p.price}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4">
                      <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="block text-xl font-bold text-white">{p.analytics?.totalVisitors || 0}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Total Visitors</span>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="block text-xl font-bold text-green-400">{p.analytics?.smartBoardScans || 0}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Board Scans</span>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="block text-xl font-bold text-blue-400">{p.analytics?.onlineSearches || 0}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Online Search</span>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="block text-xl font-bold text-indigo-400">{p.analytics?.callClicks || 0}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Call Attempts</span>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 text-center">
                        <span className="block text-xl font-bold text-emerald-400">{p.analytics?.whatsappClicks || 0}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">WhatsApp Msg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="bg-indigo-600/10 p-6 rounded-[3rem] mb-8 border border-indigo-500/20">
              <Building2 className="w-16 h-16 text-indigo-500" />
            </div>
            <h2 className="text-3xl font-black mb-4">Start Your Property Journey</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-10 leading-relaxed">
              Have a house to rent or sell? List your property today and get access to our premium Owner Dashboard and Smart Tolet features.
            </p>
            <button 
              onClick={handleAddPropertyClick}
              className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 px-10 py-5 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/30 group"
            >
              <PlusCircle className="w-6 h-6" />
              List My Property Now
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  const MyPropertiesWrapper = () => {
    const { ownerId, userId } = useParams();
    
    useEffect(() => {
      const id = ownerId || userId;
      if (id && id !== scannedOwnerId) {
        setScannedOwnerId(id);
        setLastScannedQr(id);
      }
    }, [ownerId, userId]);

    const displayOwner = (ownerId || userId) ? qrOwner : user;
    const isOwnProfile = !!user && (!ownerId || user.id === ownerId || user.id === userId);

    return (
      <MyProperties 
        owner={displayOwner}
        properties={properties}
        isOwnProfile={isOwnProfile}
        onBack={() => navigate('/')}
        onSelectProperty={handleSelectProperty}
        onEditProperty={handleEditProperty}
        onDeleteProperty={handleDeleteProperty}
        loading={isOwnerLoading}
      />
    );
  };

  const AMENITIES_LIST = ["Lift", "Parking", "Security", "Gated Community", "Children's Play Area", "Water Supply"];
  const NEARBY_FACILITIES_LIST = ["School", "Hospital", "Metro", "Bus Stop", "Market"];

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (showAuth) {
    return <Auth onLogin={handleAuthSuccess} onClose={() => setShowAuth(false)} />;
  }

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      onLoginClick={() => setShowAuth(true)}
      scannedOwnerId={scannedOwnerId}
    >
      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<HomeView />} />
          <Route path="/marketplace" element={<HomeView />} />
          <Route path="/saved" element={<FavouritesView />} />
          
          {/* Redirection routes for legacy/simplified paths */}
          <Route path="/dashboard" element={<Navigate to={user ? `/user/${user.id}/dashboard` : "/"} replace />} />
          <Route path="/profile" element={<Navigate to={user ? `/user/${user.id}/profile` : "/"} replace />} />
          <Route path="/my-properties" element={<Navigate to={user ? `/user/${user.id}/my-properties` : "/"} replace />} />

          <Route path="/user/:userId/dashboard" element={<DashboardView />} />
          <Route path="/user/:userId/profile" element={
            <ProfileSettings 
              user={user} 
              onUpdate={handleUpdateProfile} 
              onLinkBoard={handleLinkBoard}
              onLogout={handleLogout}
              properties={allOwnerProperties}
              onEditProperty={handleEditProperty}
              onDeleteProperty={handleDeleteProperty}
              onRepostProperty={handleRepostProperty}
              setActiveTab={handleNavigate}
              dynamicUrl={userBoard?.dynamicUrl}
            />
          } />
          <Route path="/admin" element={<AdminConsole />} />
          <Route path="/user/:userId/my-properties" element={<MyPropertiesWrapper />} />
          <Route path="/q/:serialNumber" element={<HomeView />} />
          <Route path="/owner/:ownerId/properties" element={<MyPropertiesWrapper />} />
          <Route path="/property/:propertyId" element={<HomeView />} />
          <Route path="/scan" element={
            <div className="min-h-[60vh] flex items-center justify-center">
              {isOwner ? (
                <div className="w-full max-w-4xl">
                  <ProfileSettings 
                    user={user} 
                    onUpdate={handleUpdateProfile} 
                    onLinkBoard={handleLinkBoard}
                    onLogout={handleLogout}
                    properties={allOwnerProperties}
                    onEditProperty={handleEditProperty}
                    onDeleteProperty={handleDeleteProperty}
                    onRepostProperty={handleRepostProperty}
                    setActiveTab={handleNavigate}
                    dynamicUrl={userBoard?.dynamicUrl}
                  />
                </div>
              ) : (
                <QRScanner onScan={handleScan} onClose={closeScanner} />
              )}
            </div>
          } />
          <Route path="*" element={
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
              <div className="bg-rose-500/10 p-6 rounded-[3rem] mb-8 border border-rose-500/20">
                <AlertCircle className="w-16 h-16 text-rose-500" />
              </div>
              <h2 className="text-3xl font-black mb-4">Page Not Found</h2>
              <p className="text-slate-400 max-w-md mx-auto mb-10 leading-relaxed">
                The resource you are looking for does not exist or has been moved.
              </p>
              <button 
                onClick={() => navigate('/')}
                className="bg-indigo-600 hover:bg-indigo-700 px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/30"
              >
                Back to Home
              </button>
            </div>
          } />
        </Routes>
      </AnimatePresence>

      <AnimatePresence>
        {propertyId && isPropertiesLoading && (
          <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-[10px]">Loading Property Details...</p>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {propertyId && !isPropertiesLoading && !selectedProperty && (
          <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] text-center space-y-6 max-w-lg w-full shadow-2xl"
            >
              <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-rose-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Property Not Found</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The property you are looking for might have been removed or the link is incorrect.
                </p>
              </div>
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
              >
                Back to Marketplace
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProperty && (
          <PropertyDetails 
            property={selectedProperty} 
            onClose={() => handleSelectProperty(null)}
            isFavourite={favourites.includes(selectedProperty.id)}
            onToggleFavourite={handleToggleFavourite}
            allUsers={allUsers}
            currentUser={user}
            onRequireAuth={() => setShowAuth(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingProperty && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl"><Plus className="w-6 h-6 text-white" /></div>
                    <h3 className="text-xl font-bold">List New Property</h3>
                  </div>
                  <button onClick={() => setIsAddingProperty(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex items-center justify-between px-4">
                  {[1, 2, 3].map(step => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        currentFormStep >= step ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-800 text-slate-600'
                      }`}>
                        {currentFormStep > step ? <CheckCircle2 className="w-4 h-4" /> : step}
                      </div>
                      <span className={`text-[10px] uppercase font-bold tracking-wider hidden sm:inline ${
                        currentFormStep === step ? 'text-indigo-400' : 'text-slate-600'
                      }`}>
                        {step === 1 ? 'Location' : step === 2 ? 'Details' : 'Finish'}
                      </span>
                      {step < 3 && <div className="w-12 h-0.5 bg-slate-800 mx-2" />}
                    </div>
                  ))}
                </div>
              </div>

              <div ref={formContainerRef} className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleAddPropertySubmit} className="space-y-8">
                  {currentFormStep === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Property For</label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'rent', label: 'Rent' },
                              { id: 'buy', label: 'Sale' }
                            ].map(t => (
                              <button key={t.id} type="button" onClick={() => setNewProp({...newProp, type: t.id as any})} className={`py-3 rounded-xl text-xs font-bold border transition-all ${newProp.type === t.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-800 border-transparent text-slate-400'}`}>
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Property Type*</label>
                          <select className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.propertyType} onChange={e => setNewProp({...newProp, propertyType: e.target.value as any})}>
                            {['Independent House', 'Apartment', 'Standalone Building', 'Hostel', 'Commercial'].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">BHK Type*</label>
                          <select className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.bhkType} onChange={e => setNewProp({...newProp, bhkType: e.target.value as any})}>
                            {['1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK'].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Furnishing*</label>
                          <select className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.furnishing} onChange={e => setNewProp({...newProp, furnishing: e.target.value as any})}>
                            {['Unfurnished', 'Semi-Furnished', 'Fully Furnished'].map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        
                        <div className="md:col-span-2 space-y-4">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Locate Your Property</label>
                          <div className="flex flex-col sm:flex-row gap-4 p-5 bg-slate-950/40 rounded-2xl border border-slate-800 items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${newProp.latitude ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-indigo-500/20 text-indigo-500'}`}>
                                {isFetchingAddress ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                              </div>
                              <div className="text-left">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Location Status</p>
                                <p className={`text-xs font-black ${newProp.latitude ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {isFetchingAddress ? 'Verifying location...' : newProp.latitude ? 'Verified Precise Location' : 'Not verified yet'}
                                </p>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={handleFetchAddress}
                              disabled={isFetchingAddress}
                              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                            >
                              {isFetchingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Locate className="w-3.5 h-3.5" />}
                              Fetch Current Location
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-500 italic px-2">Capturing coordinates ensures tenants can find your property in 'Near Me' searches.</p>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Locality*</label>
                          <input required type="text" placeholder="Locality name" className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.locality} onChange={e => setNewProp({...newProp, locality: e.target.value})} />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">City*</label>
                          <input required type="text" placeholder="City name" className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.city} onChange={e => setNewProp({...newProp, city: e.target.value})} />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Full Address*</label>
                          <textarea required placeholder="Complete address detail..." className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs resize-none focus:ring-1 focus:ring-indigo-500" rows={2} value={newProp.location} onChange={e => setNewProp({...newProp, location: e.target.value})} />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">State</label>
                          <input type="text" placeholder="State" className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.state} onChange={e => setNewProp({...newProp, state: e.target.value})} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentFormStep === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Property Specifications</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Built-up Area (sq ft)</label>
                            <input type="number" className="w-full bg-slate-800 py-3 px-4 rounded-xl text-xs border-none focus:ring-1 focus:ring-indigo-500" value={newProp.sqft || ''} onChange={e => setNewProp({...newProp, sqft: Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Floor No</label>
                            <input type="number" className="w-full bg-slate-800 py-3 px-4 rounded-xl text-xs border-none focus:ring-1 focus:ring-indigo-500" value={newProp.floorNo || ''} onChange={e => setNewProp({...newProp, floorNo: Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Floors</label>
                            <input type="number" className="w-full bg-slate-800 py-3 px-4 rounded-xl text-xs border-none focus:ring-1 focus:ring-indigo-500" value={newProp.totalFloors || ''} onChange={e => setNewProp({...newProp, totalFloors: Number(e.target.value)})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">Bathrooms</label>
                            <input type="number" className="w-full bg-slate-800 py-3 px-4 rounded-xl text-xs border-none focus:ring-1 focus:ring-indigo-500" value={newProp.bathrooms || ''} onChange={e => setNewProp({...newProp, bathrooms: Number(e.target.value)})} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Pricing Details</h4>
                        {newProp.type === 'rent' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Monthly Rent (₹)*</label>
                              <input required type="number" className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.price || ''} onChange={e => setNewProp({...newProp, price: Number(e.target.value)})} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Security Deposit (₹)</label>
                              <input type="number" className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.securityDeposit || ''} onChange={e => setNewProp({...newProp, securityDeposit: Number(e.target.value)})} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Maintenance Charges (₹)</label>
                              <input type="number" placeholder="0" className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.maintenanceCharges || ''} onChange={e => setNewProp({...newProp, maintenanceCharges: Number(e.target.value)})} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Available From</label>
                              <input type="date" className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.availableFrom || ''} onChange={e => setNewProp({...newProp, availableFrom: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Preferred Tenant</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {['Family only', 'Bachelor', 'Office Only', 'Anyone'].map(v => (
                                  <button key={v} type="button" onClick={() => setNewProp({...newProp, preferredTenant: v as any})} className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${newProp.preferredTenant === v ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-800 border-transparent text-slate-400'}`}>
                                    {v}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Expected Price (₹)*</label>
                              <input required type="number" className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs focus:ring-1 focus:ring-indigo-500" value={newProp.price || ''} onChange={e => setNewProp({...newProp, price: Number(e.target.value)})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Price Negotiable?</label>
                                <div className="flex gap-2">
                                  {[true, false].map(v => (
                                    <button key={String(v)} type="button" onClick={() => setNewProp({...newProp, isNegotiable: v})} className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${newProp.isNegotiable === v ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-800 border-transparent text-slate-400'}`}>
                                      {v ? 'Yes' : 'No'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Loan Available?</label>
                                <div className="flex gap-2">
                                  {[true, false].map(v => (
                                    <button key={String(v)} type="button" onClick={() => setNewProp({...newProp, loanAvailable: v})} className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${newProp.loanAvailable === v ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-800 border-transparent text-slate-400'}`}>
                                      {v ? 'Yes' : 'No'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Amenities</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {AMENITIES_LIST.map(amenity => (
                            <button key={amenity} type="button" onClick={() => {
                              const list = newProp.amenities || [];
                              setNewProp({...newProp, amenities: list.includes(amenity) ? list.filter(a => a !== amenity) : [...list, amenity]});
                            }} className={`p-3 rounded-xl border text-[10px] font-bold transition-all text-left ${newProp.amenities?.includes(amenity) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                              {amenity}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentFormStep === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <div className="space-y-4">
                        <label className="block text-[10px] text-slate-500 uppercase mb-2 font-bold">Photos (Min 1 Required)*</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {newProp.images?.map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden shadow-lg border border-white/5 group/img">
                              <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <button 
                                  type="button" 
                                  onClick={() => moveImage(i, 'left')}
                                  disabled={i === 0}
                                  className="p-1 bg-indigo-600 rounded-lg text-white disabled:opacity-50"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => moveImage(i, 'right')}
                                  disabled={i === (newProp.images?.length || 0) - 1}
                                  className="p-1 bg-indigo-600 rounded-lg text-white disabled:opacity-50"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setNewProp(prev => ({...prev, images: prev.images?.filter((_, idx) => idx !== i)}))}
                                  className="p-1 bg-rose-500 rounded-lg text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <label className="aspect-square border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-all cursor-pointer">
                            {uploadingImages ? (
                              <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                              <>
                                <Upload className="w-6 h-6 mb-2" />
                                <span className="text-[8px] font-bold uppercase tracking-widest">Upload</span>
                              </>
                            )}
                            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Nearby Facilities</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {NEARBY_FACILITIES_LIST.map(facility => (
                            <button key={facility} type="button" onClick={() => {
                              const list = newProp.nearbyFacilities || [];
                              setNewProp({...newProp, nearbyFacilities: list.includes(facility) ? list.filter(f => f !== facility) : [...list, facility]});
                            }} className={`p-3 rounded-xl border text-[10px] font-bold transition-all text-left ${newProp.nearbyFacilities?.includes(facility) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/10' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                              {facility}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase mb-2 font-bold">Property Title</label>
                        <input type="text" readOnly placeholder="Auto-generated title" className="w-full bg-slate-800/50 border-none rounded-xl py-3 px-4 text-xs text-slate-400 cursor-not-allowed" value={newProp.title} />
                        <p className="text-[8px] text-slate-500 mt-1 italic">Automatically generated from Property Type and BHK Type.</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-[10px] text-slate-500 uppercase font-bold">Description*</label>
                          <button 
                            type="button" 
                            onClick={() => setNewProp({...newProp, description: generatePredefinedDescription(newProp)})}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest"
                          >
                            Auto-generate
                          </button>
                        </div>
                        <textarea required rows={4} placeholder="Detailed description..." className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs resize-none focus:ring-1 focus:ring-indigo-500" value={newProp.description} onChange={e => setNewProp({...newProp, description: e.target.value})} />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Are you Owner or Agent?</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Owner', 'Agent'].map(t => (
                            <button key={t} type="button" onClick={() => setNewProp({...newProp, listedBy: t as any})} className={`py-3 rounded-xl text-xs font-bold border transition-all ${newProp.listedBy === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-800 border-transparent text-slate-400'}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </form>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/80 backdrop-blur flex justify-between gap-4">
                <button type="button" onClick={() => {
                  if (currentFormStep > 1) {
                    setCurrentFormStep(currentFormStep - 1);
                    scrollToFormTop();
                  } else {
                    setIsAddingProperty(false);
                  }
                }} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-2 text-slate-400 hover:text-white"><ChevronLeft className="w-4 h-4" /> Back</button>
                {currentFormStep < 3 ? (
                  <button type="button" onClick={() => {
                    setCurrentFormStep(currentFormStep + 1);
                    scrollToFormTop();
                  }} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">Continue <ChevronRight className="w-4 h-4" /></button>
                ) : (
                  <button onClick={handleAddPropertySubmit} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">Finish & List <CheckCircle2 className="w-4 h-4" /></button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isScanning && <QRScanner onScan={handleScan} onClose={closeScanner} />}
      
      <AnimatePresence>
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-rose-500/10 p-4 rounded-full">
                  <X className="w-8 h-8 text-rose-500" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-center mb-4">
                {deleteModal.step === 1 ? 'Delete Property?' : 'Warning: Permanent Deletion'}
              </h2>
              
              <p className="text-slate-400 text-center mb-8 leading-relaxed">
                {deleteModal.step === 1 
                  ? "Are you sure you want to delete this property? You can also mark it as 'Occupied' instead."
                  : "Deleted properties cannot be recovered. You will need to re-enter all details to post again. Marking as 'Occupied' is recommended."}
              </p>
              
              <div className="space-y-3">
                {deleteModal.step === 1 ? (
                  <>
                    <button 
                      onClick={handleMarkAsOccupied}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Mark as Occupied
                    </button>
                    <button 
                      onClick={() => setDeleteModal(prev => ({ ...prev, step: 2 }))}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all text-slate-300"
                    >
                      Delete Permanently
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleConfirmDeletePermanently}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-700 rounded-2xl font-bold transition-all shadow-lg shadow-rose-600/20"
                    >
                      Confirm Permanent Delete
                    </button>
                    <button 
                      onClick={() => setDeleteModal(prev => ({ ...prev, step: 1 }))}
                      className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold transition-all text-slate-300"
                    >
                      Go Back
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, propertyId: null, step: 1 })}
                  className="w-full py-2 text-slate-500 hover:text-slate-400 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ChatBot />
    </Layout>
  );
};

export default App;

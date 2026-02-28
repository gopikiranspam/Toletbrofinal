
export enum UserType {
  FINDER = 'FINDER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN'
}

export type Language = 'English' | 'Spanish' | 'French' | 'German' | 'Hindi';

export interface PropertyAnalytics {
  totalVisitors: number;
  smartBoardScans: number;
  onlineSearches: number;
  callClicks: number;
  whatsappClicks: number;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  type: UserType;
  avatar?: string;
  language?: Language;
  qrCode?: string; // Per-user QR code
  // Privacy & Contact Settings
  whatsappOnly?: boolean;
  secondaryPhone?: string;
  primaryPhoneEnabled?: boolean;
  secondaryPhoneEnabled?: boolean;
  showCallMessage?: boolean;
  callMessageText?: string;
  ownerTags?: string[];
  dnd?: {
    enabled: boolean;
    fromDate?: string;
    toDate?: string;
    fromTime?: string;
    toTime?: string;
    message?: string;
  };
}

export interface Property {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  price: number; // For Rent: Monthly Rent, For Sale: Expected Price
  location: string; // Full address
  city: string;
  state: string;
  type: 'rent' | 'buy';
  propertyType: 'Independent House' | 'Apartment' | 'Standalone Building' | 'Hostel' | 'Commercial';
  bhkType: '1 RK' | '1 BHK' | '2 BHK' | '3 BHK' | '4+ BHK';
  furnishing: 'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished';
  images: string[];
  qrCode?: string; 
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  locality: string;
  floorNo: number;
  totalFloors: number;
  // Geo coordinates
  latitude: number;
  longitude: number;
  distance?: number; // Calculated field for frontend
  // Rent Specifics
  securityDeposit?: number;
  maintenanceCharges?: number;
  availableFrom?: string;
  preferredTenant?: 'Family only' | 'Bachelor' | 'Office Only' | 'Anyone';
  // Sale Specifics
  isNegotiable?: boolean;
  loanAvailable?: boolean;
  // Amenities & More
  amenities: string[];
  nearbyFacilities: string[];
  listedBy: 'Owner' | 'Agent';
  status?: 'active' | 'occupied';
  analytics?: PropertyAnalytics;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  avatar: string;
}

export interface QRRequest {
  id: string;
  code: string;
  status: 'available' | 'assigned' | 'activated';
  assignedTo?: string;
  createdAt: number;
}

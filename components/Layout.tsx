
import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { User, UserType } from '../types';
import { Home, Search, Scan, User as UserIcon, LogOut, LayoutDashboard, Settings, ShieldCheck, Package, Heart, PlusCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  onLoginClick?: () => void;
  scannedOwnerId?: string | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onLoginClick, scannedOwnerId }) => {
  const isOwner = user?.type === UserType.OWNER;
  const isFinder = user?.type === UserType.FINDER;
  const navigate = useNavigate();

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `hover:text-white transition-colors flex items-center gap-2 ${isActive ? 'text-white font-bold' : 'text-slate-400'}`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 ${isActive ? 'text-indigo-500' : 'text-slate-500'}`;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg">
            <Home className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="font-bold text-lg md:text-xl tracking-tight">ToletBro</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {isOwner ? (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
              <NavLink to="/my-properties" className={navLinkClass}>
                <Package className="w-4 h-4" />
                My Properties
              </NavLink>
              <NavLink to="/marketplace" className={navLinkClass}>
                <Home className="w-4 h-4" />
                Marketplace
              </NavLink>
              <NavLink to="/profile" className={navLinkClass}>
                <ShieldCheck className="w-4 h-4" />
                Smart Tolet Board
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" className={navLinkClass} end>
                <Home className="w-4 h-4" /> Home
              </NavLink>
              <NavLink to="/scan" className={navLinkClass}>
                <Scan className="w-4 h-4" /> Scan QR
              </NavLink>
              {scannedOwnerId && (
                <NavLink to={`/properties/qrcode/${scannedOwnerId}`} className={navLinkClass}>
                  <Package className="w-4 h-4" />
                  Owner Properties
                </NavLink>
              )}
              {(!user || isFinder) && (
                <NavLink 
                  to="/dashboard" 
                  className={({ isActive }) => `flex items-center gap-2 transition-colors font-bold ${isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-indigo-400'}`}
                >
                  <PlusCircle className="w-4 h-4" /> List Property
                </NavLink>
              )}
              {user?.type === UserType.ADMIN && <NavLink to="/admin" className={navLinkClass}>Admin Console</NavLink>}
            </>
          )}
        </div>

        {/* Header Right Section */}
        <div className="flex items-center gap-3 md:gap-5">
          {/* List Property Link for Mobile Finder */}
          {(!user || isFinder) && (
            <button 
              onClick={() => navigate('/dashboard')} 
              className="md:hidden flex items-center gap-1.5 bg-indigo-600/10 text-indigo-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-indigo-500/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              List Property
            </button>
          )}

          {/* Replacement for Logout Button: Favourites */}
          <NavLink 
            to="/saved"
            className={({ isActive }) => `hidden md:flex p-2.5 rounded-xl transition-all border ${isActive ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-rose-400'}`}
            title="My Favourites"
          >
            <Heart className="w-5 h-5" />
          </NavLink>

          {user ? (
            <div className="hidden md:flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/profile')}>
              <NavLink to="/profile" className={({ isActive }) => `w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-slate-800 border-slate-700 group-hover:border-slate-500'}`}>
                <UserIcon className="w-4.5 h-4.5 text-inherit" />
              </NavLink>
              <div className="flex flex-col">
                 <span className="text-[11px] font-bold text-slate-300">{user.name}</span>
                 <button 
                   onClick={(e) => { e.stopPropagation(); onLogout(); }} 
                   className="text-[9px] text-rose-400 uppercase font-black tracking-tighter -mt-1 hover:text-rose-300 transition-colors flex items-center gap-1"
                 >
                   <LogOut className="w-2 h-2" />
                   Logout
                 </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
            >
              <UserIcon className="w-4 h-4" />
              Login / Signup
            </button>
          )}

          {/* Mobile Profile Link */}
          {!isOwner && (
            <NavLink to="/profile" className="md:hidden p-2 text-slate-400">
              {user ? <UserIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5 text-indigo-500" />}
            </NavLink>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        {children}
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800 px-4 py-3 flex justify-between items-center z-50">
        {isOwner ? (
          <>
            <NavLink to="/dashboard" className={mobileNavLinkClass}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[9px] font-medium">Dashboard</span>
            </NavLink>
            <NavLink to="/my-properties" className={mobileNavLinkClass}>
              <Package className="w-5 h-5" />
              <span className="text-[9px] font-medium">My Props</span>
            </NavLink>
            <NavLink to="/marketplace" className={mobileNavLinkClass}>
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-medium">Market</span>
            </NavLink>
            <NavLink to="/profile" className={mobileNavLinkClass}>
              <UserIcon className="w-5 h-5" />
              <span className="text-[9px] font-medium">Profile</span>
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/" className={mobileNavLinkClass} end>
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-medium">Home</span>
            </NavLink>
            <NavLink to="/scan" className={mobileNavLinkClass}>
              <div className="bg-indigo-600 p-2.5 rounded-full -mt-8 border-4 border-slate-950 shadow-xl shadow-indigo-600/30">
                <Scan className="w-5 h-5 text-white" />
              </div>
              <span className="text-[9px] font-medium">Scan</span>
            </NavLink>
            {scannedOwnerId ? (
              <NavLink to={`/properties/qrcode/${scannedOwnerId}`} className={mobileNavLinkClass}>
                <Package className="w-5 h-5" />
                <span className="text-[9px] font-medium">Owner</span>
              </NavLink>
            ) : (
              <NavLink to="/saved" className={mobileNavLinkClass}>
                <Heart className="w-5 h-5" />
                <span className="text-[9px] font-medium">Saved</span>
              </NavLink>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-12 md:mt-20 pt-12 md:pt-16 pb-24 md:pb-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg">
                <Home className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <span className="font-bold text-lg md:text-xl">ToletBro</span>
            </div>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
              Redefining real estate through AI-powered visualization and instant discovery. Find your next luxury home in seconds.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm md:text-base mb-4 md:mb-6"> Explore</h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm text-slate-400">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">Smart Tolet Board</Link></li>
              <li><button className="hover:text-white transition-colors">Property Management</button></li>
              <li><button className="hover:text-white transition-colors">Virtual Tours</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm md:text-base mb-4 md:mb-6">Company</h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm text-slate-400">
              <li><button className="hover:text-white transition-colors">About Us</button></li>
              <li><button className="hover:text-white transition-colors">Privacy Policy</button></li>
              <li><button className="hover:text-white transition-colors">Terms of Service</button></li>
              <li><button className="hover:text-white transition-colors">Contact Support</button></li>
              <li>
                <Link 
                  to="/admin"
                  className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors font-bold mt-1 md:mt-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Admin Console
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm md:text-base mb-4 md:mb-6">Newsletter</h4>
            <p className="text-slate-400 text-xs md:text-sm mb-3 md:mb-4">Get the latest property insights.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email" className="bg-slate-800 border-none rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm flex-1 focus:ring-1 focus:ring-indigo-500" />
              <button className="bg-indigo-600 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium hover:bg-indigo-700">Join</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-800 mt-12 md:mt-16 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] md:text-xs text-slate-500">
          <span>&copy; 2024 ToletBro. All rights reserved.</span>
          <div className="flex gap-4 md:gap-6">
            <button className="hover:text-white">Cookie Policy</button>
            <button className="hover:text-white">API Access</button>
            <button className="hover:text-white">Help Center</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

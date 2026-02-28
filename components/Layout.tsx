
import React from 'react';
import { User, UserType } from '../types';
import { Home, Search, Scan, User as UserIcon, LogOut, LayoutDashboard, Settings, ShieldCheck, Package, Heart, PlusCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLoginClick?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab, onLoginClick }) => {
  const isOwner = user?.type === UserType.OWNER;
  const isFinder = user?.type === UserType.FINDER;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
          <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg">
            <Home className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <span className="font-bold text-lg md:text-xl tracking-tight">ToletBro</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          {isOwner ? (
            <>
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`hover:text-white transition-colors flex items-center gap-2 ${activeTab === 'dashboard' ? 'text-white font-bold' : ''}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('home')} 
                className={`hover:text-white transition-colors flex items-center gap-2 ${activeTab === 'home' ? 'text-white font-bold' : ''}`}
              >
                <Home className="w-4 h-4" />
                {isOwner ? 'Marketplace' : 'Home'}
              </button>
              <button 
                onClick={() => setActiveTab('settings')} 
                className={`hover:text-white transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'text-white font-bold' : ''}`}
              >
                <Package className="w-4 h-4" />
                Smart Tolet Board
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setActiveTab('home')} className={`hover:text-white transition-colors flex items-center gap-2 ${activeTab === 'home' ? 'text-white font-bold' : ''}`}>
                <Home className="w-4 h-4" /> Home
              </button>
              <button onClick={() => setActiveTab('scan')} className={`hover:text-white transition-colors flex items-center gap-2 ${activeTab === 'scan' ? 'text-white font-bold' : ''}`}>
                <Scan className="w-4 h-4" /> Scan QR
              </button>
              {(!user || isFinder) && (
                <button 
                  onClick={() => setActiveTab('dashboard')} 
                  className={`flex items-center gap-2 transition-colors font-bold ${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-400 hover:text-indigo-400'}`}
                >
                  <PlusCircle className="w-4 h-4" /> List Property
                </button>
              )}
              {user?.type === UserType.ADMIN && <button onClick={() => setActiveTab('admin')} className={`hover:text-white transition-colors ${activeTab === 'admin' ? 'text-white font-bold' : ''}`}>Admin Console</button>}
            </>
          )}
        </div>

        {/* Header Right Section */}
        <div className="flex items-center gap-3 md:gap-5">
          {/* List Property Link for Mobile Finder */}
          {(!user || isFinder) && (
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className="md:hidden flex items-center gap-1.5 bg-indigo-600/10 text-indigo-400 px-3 py-1.5 rounded-full text-[10px] font-bold border border-indigo-500/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              List Property
            </button>
          )}

          {/* Replacement for Logout Button: Favourites */}
          <button 
            onClick={() => setActiveTab('favourites')}
            className={`hidden md:flex p-2.5 rounded-xl transition-all border ${activeTab === 'favourites' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-rose-400'}`}
            title="My Favourites"
          >
            <Heart className={`w-5 h-5 ${activeTab === 'favourites' ? 'fill-current' : ''}`} />
          </button>

          {user ? (
            <div className="hidden md:flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('settings')}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'settings' ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-slate-800 border-slate-700 group-hover:border-slate-500'}`}>
                <UserIcon className={`w-4.5 h-4.5 ${activeTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <div className="flex flex-col">
                 <span className={`text-[11px] font-bold transition-colors ${activeTab === 'settings' ? 'text-white' : 'text-slate-300'}`}>{user.name}</span>
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
            <button onClick={() => setActiveTab('settings')} className="md:hidden p-2 text-slate-400">
              {user ? <UserIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5 text-indigo-500" />}
            </button>
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
            <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-500' : 'text-slate-500'}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[9px] font-medium">Dashboard</span>
            </button>
            <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-indigo-500' : 'text-slate-500'}`}>
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-medium">Marketplace</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-indigo-500' : 'text-slate-500'}`}>
              <UserIcon className="w-5 h-5" />
              <span className="text-[9px] font-medium">Profile</span>
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-indigo-500' : 'text-slate-500'}`}>
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-medium">Home</span>
            </button>
            <button onClick={() => setActiveTab('scan')} className={`flex flex-col items-center gap-1 ${activeTab === 'scan' ? 'text-indigo-500' : 'text-slate-500'}`}>
              <div className="bg-indigo-600 p-2.5 rounded-full -mt-8 border-4 border-slate-950 shadow-xl shadow-indigo-600/30">
                <Scan className="w-5 h-5 text-white" />
              </div>
              <span className="text-[9px] font-medium">Scan</span>
            </button>
            <button onClick={() => setActiveTab('favourites')} className={`flex flex-col items-center gap-1 ${activeTab === 'favourites' ? 'text-indigo-500' : 'text-slate-500'}`}>
              <Heart className={`w-5 h-5 ${activeTab === 'favourites' ? 'fill-current' : ''}`} />
              <span className="text-[9px] font-medium">Saved</span>
            </button>
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
            <h4 className="font-semibold text-sm md:text-base mb-4 md:mb-6">Explore</h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm text-slate-400">
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition-colors">Home</button></li>
              <li><button onClick={() => setActiveTab('settings')} className="hover:text-white transition-colors">Smart Tolet Board</button></li>
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
                <button 
                  onClick={() => setActiveTab('admin')}
                  className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors font-bold mt-1 md:mt-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Admin Console
                </button>
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

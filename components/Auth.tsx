
import React, { useState, useEffect } from 'react';
import { User, UserType } from '../types';
import { Phone, CheckCircle2, UserCircle2, Home, Loader2, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthProps {
  onLogin: (user: User) => void;
  onClose?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onClose }) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<UserType>(UserType.FINDER);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentDomain = window.location.hostname;
  const recommendedDomains = [
    'toletbro.com',
    'ais-dev-x5awqe5igsso54ooohvsz7-231502474473.asia-east1.run.app',
    'ais-pre-x5awqe5igsso54ooohvsz7-231502474473.asia-east1.run.app',
    'localhost',
    '127.0.0.1'
  ];
  const isAuthorizedDomain = recommendedDomains.includes(currentDomain);

  useEffect(() => {
    let verifier: RecaptchaVerifier | null = null;
    
    try {
      verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
      (window as any).recaptchaVerifier = verifier;
    } catch (err) {
      console.error("Error initializing reCAPTCHA:", err);
    }

    return () => {
      if (verifier) {
        try {
          verifier.clear();
        } catch (e) {
          console.error("Error clearing reCAPTCHA:", e);
        }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (!phone.startsWith('+') && cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (phone.startsWith('+') && cleanPhone.length < 7) {
      setError("Phone number is too short.");
      return;
    }

    setIsLoading(true);
    
    try {
      // Ensure phone number is in E.164 format
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const appVerifier = (window as any).recaptchaVerifier;
      
      if (!appVerifier) {
        throw new Error("reCAPTCHA not initialized. Please refresh the page.");
      }

      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setStep('otp');
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      let errorMessage = "Failed to send OTP. Please try again.";
      
      if (err.message?.includes('reCAPTCHA not initialized')) {
        errorMessage = err.message;
      } else if (err.code === 'auth/captcha-check-failed' || err.message?.includes('Hostname match not found')) {
        errorMessage = "Domain not authorized. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.";
      } else if (err.code === 'auth/invalid-phone-number') {
        errorMessage = "Invalid phone number format. Please include country code (e.g., +91).";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please try again in a few minutes.";
      }
      
      setError(errorMessage);
      
      // Reset reCAPTCHA if possible
      if ((window as any).recaptchaVerifier && (window as any).grecaptcha) {
        try {
          const widgetId = await (window as any).recaptchaVerifier.render();
          (window as any).grecaptcha.reset(widgetId);
        } catch (resetErr) {
          console.error("Error resetting reCAPTCHA:", resetErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (!confirmationResult) {
        throw new Error("Session expired. Please request a new OTP.");
      }
      
      // 1. Verify OTP with Firebase Auth
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;
      
      // 2. Check if user exists in Firestore
      // We use a shorter timeout for this check to avoid "hanging" the UI
      let userDoc;
      try {
        // Create a promise that rejects after 5 seconds
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Firestore timeout")), 5000)
        );
        
        const fetchPromise = getDoc(doc(db, 'users', firebaseUser.uid));
        
        userDoc = await Promise.race([fetchPromise, timeoutPromise]) as any;
      } catch (e: any) {
        console.warn("Initial Firestore fetch failed or timed out:", e);
        
        // If it's a network/offline error, try one more time with a slightly longer delay
        if (e.message?.includes('offline') || e.code === 'unavailable' || e.message?.includes('timeout')) {
          console.warn("Retrying Firestore fetch in 2s...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          } catch (retryErr) {
            console.error("Retry Firestore fetch failed:", retryErr);
            // If retry fails, we still have a successful Auth session.
            // We can proceed to details step as a fallback or let App.tsx handle it.
            setStep('details');
            return;
          }
        } else {
          throw e;
        }
      }

      if (userDoc && userDoc.exists()) {
        onLogin(userDoc.data() as User);
      } else {
        setStep('details');
      }
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      let errorMessage = "Invalid OTP. Please try again.";
      
      if (err.message?.includes('Session expired')) {
        errorMessage = err.message;
        setStep('phone');
      } else if (err.code === 'auth/invalid-verification-code') {
        errorMessage = "The OTP you entered is incorrect.";
      } else if (err.code === 'auth/code-expired') {
        errorMessage = "This OTP has expired. Please request a new one.";
        setStep('phone');
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('offline')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp('');
    setStep('phone');
    setError(null);
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error("Not authenticated");
      
      const userData: User = {
        id: firebaseUser.uid,
        name,
        phone: firebaseUser.phoneNumber || phone,
        type,
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      onLogin(userData);
    } catch (err: any) {
      console.error("Error saving user details:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div id="recaptcha-container"></div>
      <div className="max-w-md w-full bg-slate-900 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl">
        <div className="flex justify-center mb-4 md:mb-6 relative">
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
              title="Back to Home"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="bg-indigo-600 p-3 md:p-4 rounded-xl md:rounded-2xl">
            <Home className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
        </div>
        
        <h2 className="text-xl md:text-2xl font-bold text-center mb-1 md:mb-2">Welcome to ToletBro</h2>
        <p className="text-slate-400 text-center text-xs md:text-sm mb-6 md:mb-8">Premium real estate at your fingertips</p>

        {!isAuthorizedDomain && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-[10px] text-center">
            <p className="font-bold mb-1 uppercase tracking-widest">Domain Status: Not Authorized</p>
            <p className="opacity-80">Please add <span className="font-mono">{currentDomain}</span> to Firebase Authorized Domains.</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs text-center">
            {error}
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-slate-500" />
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  className="w-full bg-slate-800 border-none rounded-xl py-2.5 md:py-3 pl-11 md:pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow only + at the start, and digits elsewhere
                    if (val === '' || val === '+' || /^\+?\d*$/.test(val)) {
                      setPhone(val);
                    }
                  }}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <button 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 md:py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send OTP"}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2">Verify OTP</label>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                className="w-full bg-slate-800 border-none rounded-xl py-2.5 md:py-3 px-4 focus:ring-2 focus:ring-indigo-500 text-center tracking-widest text-lg md:text-xl"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                disabled={isLoading}
              />
            </div>
            <button 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 md:py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Continue"}
            </button>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={handleResendOtp} className="w-full text-indigo-400 text-xs md:text-sm hover:text-indigo-300 font-medium" disabled={isLoading}>
                Resend OTP
              </button>
              <button type="button" onClick={() => setStep('phone')} className="w-full text-slate-400 text-xs md:text-sm hover:text-white" disabled={isLoading}>
                Edit Phone Number
              </button>
            </div>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={handleComplete} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full bg-slate-800 border-none rounded-xl py-2.5 md:py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium mb-1.5 md:mb-2">User Type</label>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={() => setType(UserType.FINDER)}
                  className={`p-3 md:p-4 rounded-xl border flex flex-col items-center gap-1.5 md:gap-2 transition-all ${
                    type === UserType.FINDER ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-transparent text-slate-400'
                  }`}
                  disabled={isLoading}
                >
                  <UserCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-xs font-semibold">House Finder</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType(UserType.OWNER)}
                  className={`p-3 md:p-4 rounded-xl border flex flex-col items-center gap-1.5 md:gap-2 transition-all ${
                    type === UserType.OWNER ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-transparent text-slate-400'
                  }`}
                  disabled={isLoading}
                >
                  <Home className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-xs font-semibold">Property Owner</span>
                </button>
              </div>
            </div>
            <button 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 md:py-3 rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Exploring"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

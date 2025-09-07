import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../config/firebase.js';

const PhoneAuth = ({ onSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const recaptchaRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  // Initialize reCAPTCHA
  useEffect(() => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow sending SMS
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
        }
      });
    }
  }, []);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = useCallback((value) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Limit to 10 digits for India numbers
    const limited = cleaned.slice(0, 10);
    
    // Format as XXXXX XXXXX for India numbers (without +91)
    if (limited.length === 0) {
      return '';
    } else if (limited.length <= 5) {
      return limited;
    } else {
      return `${limited.slice(0, 5)} ${limited.slice(5)}`;
    }
  }, []);

  const handlePhoneSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (phoneNumber.replace(/\D/g, '').length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Render reCAPTCHA
      await recaptchaVerifierRef.current.render();
      
      // Send OTP
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        `+91${formattedPhone}`, 
        recaptchaVerifierRef.current
      );
      
      setVerificationId(confirmationResult.verificationId);
      setStep('otp');
      setCountdown(60); // 60 second countdown
      
    } catch (error) {
      console.error('Phone auth error:', error);
      
      switch (error.code) {
        case 'auth/invalid-phone-number':
          setError('Invalid phone number format');
          break;
        case 'auth/invalid-app-credential':
          setError('Authentication setup issue. Please check Firebase configuration.');
          break;
        case 'auth/too-many-requests':
          setError('Too many attempts. Please try again later.');
          break;
        case 'auth/quota-exceeded':
          setError('SMS quota exceeded. Please try again later.');
          break;
        case 'auth/app-not-authorized':
          setError('App not authorized for phone authentication.');
          break;
        default:
          setError('Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [phoneNumber]);

  const handleOtpSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      
      // Success! User is now signed in
      onSuccess?.(result.user);
      
    } catch (error) {
      console.error('OTP verification error:', error);
      
      switch (error.code) {
        case 'auth/invalid-verification-code':
          setError('Invalid OTP. Please check and try again.');
          break;
        case 'auth/invalid-verification-id':
          setError('OTP expired. Please request a new one.');
          setStep('phone');
          break;
        case 'auth/code-expired':
          setError('OTP has expired. Please request a new one.');
          setStep('phone');
          break;
        default:
          setError('Failed to verify OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [otp, verificationId, onSuccess]);

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError('');

    try {
      await recaptchaVerifierRef.current.render();
      
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        `+91${formattedPhone}`, 
        recaptchaVerifierRef.current
      );
      
      setVerificationId(confirmationResult.verificationId);
      setCountdown(60);
      setError('');
      
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtp('');
    setError('');
    setCountdown(0);
  };

  return (
    <div className="min-h-screen bg-[rgba(20,20,22,0.9)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {step === 'phone' ? 'Welcome to PaveBoard' : 'Verify OTP'}
          </h1>
          <p className="text-gray-400">
            {step === 'phone' ? 'Sign in with your phone number' : 'Enter the verification code'}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-gray-800/40 via-gray-700/30 to-gray-800/40 backdrop-blur-xl border border-gray-600/40 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-red-400">⚠️</span>
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-300 mb-3">
                  📱 Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                  className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-gray-100 placeholder-gray-500 focus:border-blue-500/50 focus:bg-gray-700/70 focus:outline-none transition-all duration-300"
                  placeholder="98765 43210"
                  maxLength="11"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span>💡</span>
                  We'll send you a verification code
                </p>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || phoneNumber.replace(/\D/g, '').length !== 10}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>📤</span>
                    <span>Send OTP</span>
                  </div>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-300 mb-3">
                  🔢 Verification Code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-4 bg-gray-700/50 border border-gray-600/50 rounded-xl text-gray-100 placeholder-gray-500 focus:border-blue-500/50 focus:bg-gray-700/70 focus:outline-none transition-all duration-300 text-center text-2xl tracking-widest font-mono"
                  placeholder="123456"
                  maxLength="6"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <span>📱</span>
                  Enter the 6-digit code sent to {phoneNumber}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>✅</span>
                      <span>Verify OTP</span>
                    </div>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleBackToPhone}
                  className="px-6 py-4 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 hover:border-gray-500/50 text-gray-300 font-semibold rounded-xl transition-all duration-300 disabled:opacity-50"
                  disabled={loading}
                >
                  ← Back
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-600/30">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-sm text-blue-400 hover:text-blue-300 disabled:text-gray-500 font-medium transition-colors duration-200"
                  disabled={loading || countdown > 0}
                >
                  {countdown > 0 
                    ? `⏰ Resend in ${countdown}s` 
                    : '🔄 Resend OTP'
                  }
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Secure authentication powered by Firebase
          </p>
        </div>

        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default React.memo(PhoneAuth);

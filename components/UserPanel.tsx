
import React, { useState, useRef, useEffect } from 'react';
import { CartItem, Product, User } from '../types';
import { GoogleGenAI } from "@google/genai";

interface UserPanelProps {
  cart: CartItem[];
  users: User[];
  wishlist: Product[];
  onViewProduct: (p: Product) => void;
  onPlaceOrder: (details: { name: string; email: string; phone: string; address: string; location: string; courier: 'Pathao' | 'SteadFast' | '' }) => Promise<void>;
  onUpdateCartItem: (index: number, updates: Partial<CartItem>) => void;
  onRemoveFromCart: (index: number) => void;
  onCloseSuccess: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ 
  cart, 
  users,
  wishlist, 
  onViewProduct, 
  onPlaceOrder, 
  onUpdateCartItem,
  onRemoveFromCart,
  onCloseSuccess 
}) => {
  const [details, setDetails] = useState({
    name: '',
    email: '',
    phone: '+880', // Pre-fill with Bangladesh country code
    address: '',
    location: '',
    courier: '' as 'Pathao' | 'SteadFast' | ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const validatePhone = (phone: string) => {
    const bdPhoneRegex = /^\+8801[3-9]\d{8}$/;
    return bdPhoneRegex.test(phone.trim());
  };

  const handleAutoFill = (user: User) => {
    setDetails({
      ...details,
      name: user.name,
      email: user.email,
      phone: user.phone || '+880'
    });
    setErrors({});
  };

  const handleSubmitOrder = async () => {
    const newErrors: Record<string, string> = {};

    if (!details.name.trim()) newErrors.name = 'Required';
    if (!details.email.trim()) {
      newErrors.email = 'Correct the email.';
    } else if (!validateEmail(details.email)) {
      newErrors.email = 'Correct the email.';
    }
    
    if (details.phone === '+880') {
      newErrors.phone = 'Correct the number.';
    } else if (!validatePhone(details.phone)) {
      newErrors.phone = 'Correct the number.';
    }

    if (!details.location.trim()) newErrors.location = 'Required';
    if (!details.address.trim()) newErrors.address = 'Required';
    if (!details.courier) newErrors.courier = 'Please select a courier';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty. Please select a product first.');
      return;
    }

    setIsPlacingOrder(true);
    try {
        await onPlaceOrder(details);
        setShowSuccessModal(true);
    } catch (err) {
        console.error("Order placement failed", err);
        alert("Something went wrong. Please try again.");
    } finally {
        setIsPlacingOrder(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.startsWith('+880')) {
      setDetails({...details, phone: val});
    } else if (val === '' || val.length < 4) {
      setDetails({...details, phone: '+880'});
    }
    if(errors.phone) setErrors({...errors, phone: ''});
  };

  const startSilenceDetection = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    let lastTimeWithSound = Date.now();

    const checkVolume = () => {
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > 15) { // Threshold for "speaking"
          lastTimeWithSound = Date.now();
        } else {
          // If no sound for more than 3.5 seconds, auto stop
          if (Date.now() - lastTimeWithSound > 3500) {
            stopVoiceInput();
            return;
          }
        }
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      }
    };

    checkVolume();
  };

  const toggleVoiceInput = () => {
    if (isRecording) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  const startVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioChunksRef.current.length > 0) {
          await transcribeAudio(audioBlob);
        }
        // Cleanup stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      startSilenceDetection(stream);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check browser permissions.');
    }
  };

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview', 
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/webm',
                  data: base64Audio,
                },
              },
              { text: "Transcribe the shipping address from this audio into Bengali. Only return the Bengali text of the address. If the audio is in English or another language, translate it to Bengali. If it is already in Bengali, just transcribe it accurately. If no address or meaningful speech is detected, return nothing. Do not include any introductory remarks, conversation, or concluding text—only the address itself." },
            ],
          },
        });

        const transcribedText = response.text?.trim();
        if (transcribedText) {
          setDetails(prev => ({ ...prev, address: transcribedText }));
          if(errors.address) setErrors(prev => ({ ...prev, address: '' }));
        }
        setIsTranscribing(false);
      };
    } catch (err) {
      console.error('Transcription error:', err);
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 animate-fadeIn relative">
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="lg:w-2/3 space-y-12">
          {/* PRODUCT INFORMATION (TOP) */}
          <section>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-8 flex items-center justify-between">
              <span className="flex items-center gap-3">
                Your Selection
                <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{cart.length} Items</span>
              </span>
            </h2>

            <div className="space-y-6">
              {cart.length === 0 ? (
                <div className="bg-white p-12 rounded-[32px] border border-dashed border-gray-200 text-center">
                   <p className="text-gray-400 font-medium">No items selected yet. Go back to browse.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-xl shadow-gray-100/50 flex flex-col md:flex-row gap-8 relative group">
                    {/* Remove button */}
                    <button 
                      onClick={() => onRemoveFromCart(idx)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>

                    <div className="w-full md:w-48 h-64 md:h-auto rounded-2xl overflow-hidden shadow-sm bg-gray-50 flex-shrink-0">
                      <img src={item.product.images[0]} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-grow space-y-6 py-2">
                      <div>
                        <h3 className="text-2xl font-black text-gray-900">{item.product.name}</h3>
                        <p className="text-indigo-600 font-black text-xl mt-1">${item.product.price.toFixed(2)}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Size Selection */}
                        {item.product.hasSizes && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select Size</label>
                            <div className="flex flex-wrap gap-2">
                              {item.product.sizes.map(size => (
                                <button 
                                  key={size}
                                  onClick={() => onUpdateCartItem(idx, { selectedSize: size })}
                                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${item.selectedSize === size ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'}`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Color Selection */}
                        {item.product.hasColors && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Select Color</label>
                            <div className="flex flex-wrap gap-3">
                              {item.product.colors.map(color => (
                                <button 
                                  key={color}
                                  onClick={() => onUpdateCartItem(idx, { selectedColor: color })}
                                  className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${item.selectedColor === color ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent'}`}
                                >
                                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quantity Control */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Quantity</label>
                          <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-2xl w-fit">
                            <button 
                              onClick={() => item.quantity > 1 && onUpdateCartItem(idx, { quantity: item.quantity - 1 })}
                              className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors disabled:opacity-30"
                              disabled={item.quantity <= 1}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/></svg>
                            </button>
                            <span className="text-lg font-black w-8 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => onUpdateCartItem(idx, { quantity: item.quantity + 1 })}
                              className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total</p>
                           <p className="text-2xl font-black text-gray-900">${(item.product.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ORDER INFORMATION (BOTTOM) */}
          <section className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-50">
              <h3 className="text-2xl font-black text-gray-900">Customer Delivery Details</h3>
              
              {/* Profile Selection */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Quick Select Profile</span>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar max-w-[400px]">
                  {users.filter(u => u.role === 'Customer').map(u => (
                    <button 
                      key={u.id}
                      onClick={() => handleAutoFill(u)}
                      className="flex-shrink-0 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all whitespace-nowrap"
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between px-1">
                  Full Name {errors.name && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  placeholder="Enter your name"
                  value={details.name} 
                  onChange={e => { setDetails({...details, name: e.target.value}); if(errors.name) setErrors({...errors, name: ''}); }} 
                  className={`w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all ${errors.name ? 'ring-2 ring-red-400' : ''}`} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between px-1">
                  Email Address {errors.email && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="email" 
                  placeholder="example@mail.com"
                  value={details.email} 
                  onChange={e => { setDetails({...details, email: e.target.value}); if(errors.email) setErrors({...errors, email: ''}); }} 
                  className={`w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all ${errors.email ? 'ring-2 ring-red-400' : ''}`} 
                />
                {errors.email && <p className="text-[10px] text-red-500 font-bold mt-1 px-1 animate-fadeIn">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between px-1">
                  Phone Number (BD) {errors.phone && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  value={details.phone} 
                  onChange={handlePhoneChange} 
                  placeholder="+8801XXXXXXXXX"
                  className={`w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all ${errors.phone ? 'ring-2 ring-red-400' : ''}`} 
                />
                {errors.phone && <p className="text-[10px] text-red-500 font-bold mt-1 px-1 animate-fadeIn">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between px-1">
                  General Location {errors.location && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  placeholder="City, Area"
                  value={details.location} 
                  onChange={e => { setDetails({...details, location: e.target.value}); if(errors.location) setErrors({...errors, location: ''}); }} 
                  className={`w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all ${errors.location ? 'ring-2 ring-red-400' : ''}`} 
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between px-1">
                Shipping Address {errors.address && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <textarea 
                  placeholder="House #, Road #, Area Details..."
                  value={details.address} 
                  onChange={e => { setDetails({...details, address: e.target.value}); if(errors.address) setErrors({...errors, address: ''}); }} 
                  rows={3} 
                  className={`w-full bg-gray-50 border-none rounded-[24px] px-6 py-5 pr-14 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 resize-none placeholder:text-gray-300 transition-all ${errors.address ? 'ring-2 ring-red-400' : ''}`} 
                />
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`absolute right-4 top-5 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isRecording ? 'bg-red-500 text-white scale-110 animate-pulse shadow-lg ring-4 ring-red-100' : 
                    isTranscribing ? 'bg-indigo-100 text-indigo-500 cursor-wait' : 
                    'bg-gray-200 text-gray-500 hover:bg-indigo-600 hover:text-white shadow-sm'
                  }`}
                  title="Tap to start voice address entry"
                >
                  {isTranscribing ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                  )}
                </button>
              </div>
              {isRecording && <p className="text-[10px] text-red-500 font-black mt-2 animate-pulse px-2">Listening... (Speak clearly, auto-off on silence)</p>}
              {isTranscribing && <p className="text-[10px] text-indigo-500 font-black mt-2 px-2">Processing voice to Bengali address...</p>}
            </div>

            <div className="space-y-4 pt-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Choose Delivery Method</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { id: 'Pathao', name: 'Pathao Courier', icon: '🚀' },
                  { id: 'SteadFast', name: 'SteadFast Courier', icon: '📦' }
                ].map((courier) => (
                  <button
                    key={courier.id}
                    type="button"
                    onClick={() => setDetails({...details, courier: courier.id as any})}
                    className={`flex items-center gap-4 p-6 rounded-[24px] border-2 transition-all text-left ${
                      details.courier === courier.id 
                        ? 'border-indigo-600 bg-indigo-50 shadow-xl shadow-indigo-100/50' 
                        : 'border-gray-50 bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-3xl bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm">{courier.icon}</span>
                    <div>
                      <span className="font-black text-lg text-gray-900 block">{courier.name}</span>
                      <span className="text-gray-400 text-xs font-bold">Standard 48h Delivery</span>
                    </div>
                  </button>
                ))}
              </div>
              {errors.courier && <p className="text-[10px] text-red-500 font-black px-1">{errors.courier}</p>}
            </div>
          </section>
        </div>

        {/* RIGHT SIDE: SUMMARY */}
        <div className="lg:w-1/3">
          <div className="bg-[#111827] text-white rounded-[40px] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] sticky top-24 border border-gray-800">
            <h3 className="text-2xl font-black mb-10 tracking-tight">Order Summary</h3>
            <div className="space-y-6 mb-12 border-b border-gray-800 pb-10">
               <div className="flex justify-between text-gray-400 text-sm font-bold"><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
               <div className="flex justify-between text-gray-400 text-sm font-bold"><span>Shipping</span><span className="text-green-400 font-black">FREE</span></div>
               <div className="flex flex-col items-center mt-10">
                  <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Total Amount Due</span>
                  <span className="text-white text-6xl font-black tracking-tighter">${total.toFixed(2)}</span>
               </div>
            </div>
            
            <button 
              onClick={handleSubmitOrder}
              disabled={cart.length === 0 || isPlacingOrder}
              className={`w-full py-6 rounded-[24px] font-black text-xl transition-all transform active:scale-95 shadow-2xl flex items-center justify-center gap-3 ${
                cart.length === 0 || isPlacingOrder 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/50 hover:shadow-indigo-600/30'
              }`}
            >
              {isPlacingOrder ? (
                <>
                  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
                </>
              ) : 'Confirm Order Now'}
            </button>
            
            <p className="text-[10px] text-gray-500 mt-8 text-center leading-relaxed font-bold px-4">
              By confirming, you agree to our terms of service and acknowledge that your data will be handled securely.
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[48px] shadow-2xl p-12 w-full max-w-md text-center transform scale-100 animate-scaleIn border border-gray-100">
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">ধন্যবাদ!</h3>
            <p className="text-gray-500 font-bold text-lg mb-10 leading-relaxed">আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ।</p>
            <button 
              onClick={() => { setShowSuccessModal(false); onCloseSuccess(); }}
              className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 transform active:scale-95"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default UserPanel;

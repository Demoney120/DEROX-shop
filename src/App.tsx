import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { User, Product, Order } from './types';
import { 
  ShoppingBag, 
  Search, 
  PlusCircle, 
  User as UserIcon, 
  LogOut, 
  TrendingUp, 
  ShieldCheck, 
  MessageSquare,
  LayoutDashboard,
  Package,
  ArrowRight,
  Star,
  CheckCircle2,
  AlertCircle,
  Globe,
  Zap,
  CreditCard,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  generateProductDescription, 
  getGeminiModel, 
  searchProductsConversational,
  getPersonalizedRecommendations
} from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className={cn(
      "fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border",
      type === 'success' ? "bg-emerald-500 text-white border-emerald-400" : "bg-red-500 text-white border-red-400"
    )}
  >
    {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
    <p className="font-bold">{message}</p>
    <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full">
      <PlusCircle className="w-4 h-4 rotate-45" />
    </button>
  </motion.div>
);

const TrustCenter = ({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: User }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl relative"
        >
          <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full">
            <PlusCircle className="w-6 h-6 rotate-45" />
          </button>
          
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Trust Center</h3>
              <p className="text-zinc-500">Your reliability score is calculated by Gemini AI based on your activity.</p>
            </div>
            
            <div className="bg-zinc-50 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-600">Current Score</span>
                <span className="text-2xl font-black text-emerald-500">{user.trustScore}/100</span>
              </div>
              <div className="h-3 w-full bg-zinc-200 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${user.trustScore}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">Status</p>
                  <p className="text-sm font-bold">{user.isVerified ? 'Verified' : 'Pending'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">Level</p>
                  <p className="text-sm font-bold">{user.subscription?.plan !== 'none' ? 'Premium' : 'Silver Tier'}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Maintain a high score by completing transactions promptly, resolving disputes fairly, and providing accurate product descriptions.
            </p>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const PremiumModal = ({ isOpen, onClose, onSubscribe, user }: { isOpen: boolean, onClose: () => void, onSubscribe: (plan: 'weekly' | 'monthly' | 'yearly') => void, user: User }) => {
  const plans = [
    { id: 'weekly', name: 'Weekly', price: 5, period: 'week', icon: <Zap className="w-5 h-5" />, color: 'bg-amber-100 text-amber-600' },
    { id: 'monthly', name: 'Monthly', price: 49, period: 'month', icon: <Globe className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-600', popular: true },
    { id: 'yearly', name: 'Yearly', price: 499, period: 'year', icon: <BarChart3 className="w-5 h-5" />, color: 'bg-violet-100 text-violet-600' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[160] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -mr-32 -mt-32" />
            
            <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-zinc-100 rounded-full z-10">
              <PlusCircle className="w-6 h-6 rotate-45" />
            </button>

            <div className="relative z-10 space-y-10">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-bold">
                  <Star className="w-4 h-4 fill-emerald-700" />
                  DEROX PREMIUM
                </div>
                <h2 className="text-4xl font-bold tracking-tight">Go Global with <span className="text-emerald-500">Premium</span></h2>
                <p className="text-zinc-500 max-w-md mx-auto">Unlock advanced AI tools designed to scale your business across borders and build ultimate trust.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <button 
                    key={plan.id}
                    onClick={() => onSubscribe(plan.id as any)}
                    className={cn(
                      "p-6 rounded-[32px] border-2 transition-all text-left flex flex-col justify-between group relative",
                      plan.popular ? "border-emerald-500 bg-emerald-50/30" : "border-zinc-100 hover:border-zinc-200"
                    )}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Most Popular</span>
                    )}
                    <div className="space-y-4">
                      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", plan.color)}>
                        {plan.icon}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{plan.name}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black">${plan.price}</span>
                          <span className="text-xs text-zinc-400 font-bold">/{plan.period}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 w-full bg-white border border-zinc-200 py-2 rounded-xl text-center text-xs font-bold group-hover:bg-black group-hover:text-white group-hover:border-black transition-all">
                      Select Plan
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-8 pt-6 border-t border-zinc-100">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Global Reach AI</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Auto-translate listings and localize pricing for 150+ countries.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Advanced Analytics</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Deep insights into global market trends and demand forecasting.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Priority Verification</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Get verified 5x faster and boost your trust score instantly.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Lower Fees</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">Reduced transaction fees on all global sales.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Navbar = ({ 
  user, 
  onLogin, 
  onLogout, 
  searchQuery, 
  setSearchQuery, 
  onSearch,
  isSearching,
  onOpenTrustCenter,
  onOpenPremium
}: { 
  user: User | null, 
  onLogin: () => void, 
  onLogout: () => void,
  searchQuery: string,
  setSearchQuery: (q: string) => void,
  onSearch: () => void,
  isSearching: boolean,
  onOpenTrustCenter: () => void,
  onOpenPremium: () => void
}) => (
  <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">D</div>
      <span className="font-bold text-xl tracking-tight hidden sm:block">DEROX</span>
    </div>
    
    <div className="flex-1 max-w-md mx-8 hidden md:block">
      <form 
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
        className="relative group"
      >
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
          isSearching ? "text-emerald-500 animate-pulse" : "text-zinc-400 group-focus-within:text-emerald-500"
        )} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ask Gemini to find products..." 
          className="w-full bg-zinc-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            <PlusCircle className="w-4 h-4 rotate-45" />
          </button>
        )}
      </form>
    </div>

    <div className="flex items-center gap-4">
      {user ? (
        <>
          {user.subscription?.plan === 'none' && (
            <button 
              onClick={onOpenPremium}
              className="hidden lg:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all"
            >
              <Star className="w-4 h-4 fill-emerald-600" />
              Go Premium
            </button>
          )}
          <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors relative">
            <ShoppingBag className="w-5 h-5 text-zinc-600" />
            <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">0</span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user.displayName}</p>
              <button 
                onClick={onOpenTrustCenter}
                className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" />
                Score: {user.trustScore}
              </button>
            </div>
            <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-zinc-200" referrerPolicy="no-referrer" />
            <button onClick={onLogout} className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </>
      ) : (
        <button 
          onClick={onLogin}
          className="bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-2"
        >
          <UserIcon className="w-4 h-4" />
          Sign In
        </button>
      )}
    </div>
  </nav>
);

const Hero = () => (
  <section className="pt-32 pb-20 px-6">
    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium">
          <TrendingUp className="w-4 h-4" />
          Powered by Gemini 3.1 Pro
        </div>
        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight leading-[0.9]">
          Where Buyers & Sellers <span className="text-emerald-500">Meet</span> & Deals <span className="text-zinc-400 italic">Convert.</span>
        </h1>
        <p className="text-xl text-zinc-500 max-w-xl leading-relaxed">
          Built on AI, designed for trust. Experience the future of marketplaces with predictive recommendations and secure escrow payments.
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            Start Shopping
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="bg-white border border-zinc-200 text-zinc-900 px-8 py-4 rounded-2xl font-semibold hover:bg-zinc-50 transition-all">
            Become a Seller
          </button>
        </div>
        <div className="flex items-center gap-8 pt-8 border-t border-zinc-100">
          <div>
            <p className="text-2xl font-bold">10k+</p>
            <p className="text-sm text-zinc-500">Verified Sellers</p>
          </div>
          <div>
            <p className="text-2xl font-bold">99.9%</p>
            <p className="text-sm text-zinc-500">Trust Score</p>
          </div>
          <div>
            <p className="text-2xl font-bold">Instant</p>
            <p className="text-sm text-zinc-500">AI Support</p>
          </div>
        </div>
      </motion.div>
      <div className="relative hidden lg:block">
        <div className="aspect-square bg-zinc-100 rounded-[40px] overflow-hidden relative">
          <img 
            src="https://picsum.photos/seed/marketplace/1000/1000" 
            alt="Marketplace" 
            className="w-full h-full object-cover opacity-80"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -right-8 top-1/4 bg-white p-6 rounded-3xl shadow-2xl border border-zinc-100 max-w-xs"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">Verified Trust</p>
              <p className="text-xs text-zinc-500">AI-Scored Seller Badge</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full w-[95%] bg-emerald-500" />
            </div>
            <p className="text-[10px] text-zinc-400 text-right font-medium">95/100 Trust Rating</p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

const Onboarding = ({ onComplete }: { onComplete: (role: 'buyer' | 'seller') => void }) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full text-center space-y-12"
      >
        <div className="space-y-4">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold">D</div>
          <h2 className="text-4xl font-bold tracking-tight">Welcome to DEROX</h2>
          <p className="text-zinc-500 text-lg">Let's personalize your AI-powered experience.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <button 
            onClick={() => { setRole('buyer'); setStep(2); }}
            className={cn(
              "p-8 rounded-3xl border-2 transition-all text-left group",
              role === 'buyer' ? "border-emerald-500 bg-emerald-50" : "border-zinc-100 hover:border-zinc-200"
            )}
          >
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">I want to Buy</h3>
            <p className="text-sm text-zinc-500">Discover products with AI recommendations and secure escrow.</p>
          </button>
          <button 
            onClick={() => { setRole('seller'); setStep(2); }}
            className={cn(
              "p-8 rounded-3xl border-2 transition-all text-left group",
              role === 'seller' ? "border-emerald-500 bg-emerald-50" : "border-zinc-100 hover:border-zinc-200"
            )}
          >
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">I want to Sell</h3>
            <p className="text-sm text-zinc-500">Scale your business with AI-assisted listings and analytics.</p>
          </button>
        </div>

        {role && (
          <button 
            onClick={() => onComplete(role)}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all"
          >
            Complete Setup
          </button>
        )}
      </motion.div>
    </div>
  );
};

const SellerDashboard = ({ user, onShowFeedback }: { user: User, onShowFeedback: (m: string, t?: 'success' | 'error') => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!title || !category) return;
    setIsGenerating(true);
    try {
      const result = await generateProductDescription(title, category);
      setDescription(result.description || '');
      setTags(result.tags || []);
      onShowFeedback("AI description generated!");
    } catch (error) {
      console.error(error);
      onShowFeedback("AI generation failed.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'products';
    try {
      await addDoc(collection(db, path), {
        sellerId: user.uid,
        title,
        category,
        price: parseFloat(price),
        description,
        tags,
        status: 'active',
        images: [`https://picsum.photos/seed/${title}/800/600`],
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setTitle('');
      setCategory('');
      setPrice('');
      setDescription('');
      setTags([]);
      onShowFeedback("Listing published successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      onShowFeedback("Failed to publish listing.", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Seller Dashboard</h2>
          <p className="text-zinc-500">Manage your listings and track performance.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          New Listing
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Total Sales</p>
          <p className="text-3xl font-bold">$0.00</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <TrendingUp className="w-4 h-4" />
            +0% from last month
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Active Listings</p>
          <p className="text-3xl font-bold">0</p>
          <div className="mt-4 flex items-center gap-2 text-zinc-400 text-xs font-bold">
            <Package className="w-4 h-4" />
            Ready to scale
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
          <p className="text-sm text-zinc-500 mb-1">Trust Score</p>
          <p className="text-3xl font-bold">{user.trustScore}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            Verified Seller
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Create New Listing</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <PlusCircle className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Product Title</label>
                    <input 
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Vintage Leather Camera Bag"
                      className="w-full bg-zinc-50 border-zinc-100 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700">Category</label>
                    <input 
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Accessories"
                      className="w-full bg-zinc-50 border-zinc-100 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Price ($)</label>
                  <input 
                    required
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-50 border-zinc-100 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-700">Description</label>
                    <button 
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating || !title || !category}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-50"
                    >
                      <TrendingUp className="w-3 h-3" />
                      {isGenerating ? 'Generating...' : 'AI Assist'}
                    </button>
                  </div>
                  <textarea 
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe your product..."
                    className="w-full bg-zinc-50 border-zinc-100 rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                  />
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium">#{tag}</span>
                    ))}
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Publish Listing
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductCard = ({ product }: { product: Product }) => (
  <motion.div 
    whileHover={{ y: -8 }}
    className="bg-white rounded-[32px] border border-zinc-100 overflow-hidden group shadow-sm hover:shadow-xl transition-all"
  >
    <div className="aspect-[4/3] relative overflow-hidden">
      <img 
        src={product.images[0]} 
        alt={product.title} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-4 left-4">
        <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-zinc-900">
          {product.category}
        </span>
      </div>
      <button className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all">
        <PlusCircle className="w-5 h-5 text-emerald-500" />
      </button>
    </div>
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-lg truncate flex-1">{product.title}</h3>
        <p className="font-bold text-emerald-600">${product.price}</p>
      </div>
      <p className="text-zinc-500 text-sm line-clamp-2 mb-4 leading-relaxed">{product.description}</p>
      <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-bold">4.9</span>
          <span className="text-xs text-zinc-400">(128)</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600">
          <ShieldCheck className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Verified</span>
        </div>
      </div>
    </div>
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTrustCenter, setShowTrustCenter] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }
    setIsSearching(true);
    try {
      const matchedIds = await searchProductsConversational(searchQuery, products);
      if (matchedIds.length === 0) {
        setFilteredProducts([]);
      } else {
        setFilteredProducts(products.filter(p => matchedIds.includes(p.id)));
      }
    } catch (error) {
      console.error("Search failed", error);
      showFeedback("Search failed. Please try again.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (user && products.length > 0 && recommendations.length === 0) {
      const fetchRecommendations = async () => {
        try {
          const recIds = await getPersonalizedRecommendations(user, products);
          setRecommendations(products.filter(p => recIds.includes(p.id)));
        } catch (e) {
          console.error("Recs failed", e);
        }
      };
      fetchRecommendations();
    }
  }, [user, products]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const path = `users/${firebaseUser.uid}`;
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            let userData = userDoc.data() as User;
            // Migration for existing users
            if (!userData.subscription) {
              userData = {
                ...userData,
                subscription: {
                  plan: 'none',
                  expiresAt: new Date().toISOString()
                }
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            }
            setUser(userData);
            if (!userData.onboardingCompleted) {
              setShowOnboarding(true);
            }
          } else {
            // New user
            const newUser: User = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              role: 'buyer',
              trustScore: 80,
              isVerified: false,
              onboardingCompleted: false,
              subscription: {
                plan: 'none',
                expiresAt: new Date().toISOString()
              },
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
            setShowOnboarding(true);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const path = 'products';
    const q = query(collection(db, path), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOnboardingComplete = async (role: 'buyer' | 'seller') => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      const updatedUser = { ...user, role, onboardingCompleted: true };
      await setDoc(doc(db, 'users', user.uid), updatedUser);
      setUser(updatedUser);
      setShowOnboarding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleSubscribe = async (plan: 'weekly' | 'monthly' | 'yearly') => {
    if (!user) return;
    const path = `users/${user.uid}`;
    
    // Calculate expiration date
    const now = new Date();
    if (plan === 'weekly') now.setDate(now.getDate() + 7);
    else if (plan === 'monthly') now.setMonth(now.getMonth() + 1);
    else if (plan === 'yearly') now.setFullYear(now.getFullYear() + 1);

    try {
      const updatedUser: User = {
        ...user,
        subscription: {
          plan,
          expiresAt: now.toISOString()
        }
      };
      await setDoc(doc(db, 'users', user.uid), updatedUser);
      setUser(updatedUser);
      setShowPremiumModal(false);
      showFeedback(`Successfully subscribed to ${plan} plan! Welcome to DEROX Premium.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      showFeedback("Failed to subscribe. Please try again.", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
        >
          D
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        isSearching={isSearching}
        onOpenTrustCenter={() => setShowTrustCenter(true)}
        onOpenPremium={() => setShowPremiumModal(true)}
      />
      
      <main>
        {user?.role === 'seller' ? (
          <SellerDashboard user={user} onShowFeedback={showFeedback} />
        ) : (
          <>
            <Hero />
            
            {recommendations.length > 0 && !searchQuery && (
              <section className="px-6 py-12">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-2 mb-8 text-emerald-600">
                    <Star className="w-5 h-5 fill-emerald-600" />
                    <h3 className="text-xl font-bold">Recommended for You</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {recommendations.map(p => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className="px-6 py-20 bg-zinc-50">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-12">
                  <div>
                    <h2 className="text-4xl font-bold tracking-tight mb-2">
                      {searchQuery ? `Search Results for "${searchQuery}"` : 'Featured Products'}
                    </h2>
                    <p className="text-zinc-500">
                      {searchQuery ? `Found ${filteredProducts.length} matches using AI search.` : 'Handpicked for you by our AI recommendation engine.'}
                    </p>
                  </div>
                  {!searchQuery && (
                    <button className="text-emerald-600 font-bold flex items-center gap-2 hover:gap-3 transition-all">
                      View All
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
                
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-[32px] p-6 border border-zinc-100 space-y-4 animate-pulse">
                        <div className="aspect-[4/3] bg-zinc-100 rounded-2xl" />
                        <div className="h-6 bg-zinc-100 rounded-full w-3/4" />
                        <div className="h-4 bg-zinc-100 rounded-full w-full" />
                        <div className="h-4 bg-zinc-100 rounded-full w-1/2" />
                      </div>
                    ))
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-10 h-10 text-zinc-400" />
                      </div>
                      <h3 className="text-2xl font-bold">No products found</h3>
                      <p className="text-zinc-500">Try searching for something else or browse our categories.</p>
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="text-emerald-600 font-bold"
                      >
                        Clear Search
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="px-6 py-32">
              <div className="max-w-7xl mx-auto bg-black rounded-[48px] p-12 sm:p-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-500/10 blur-[120px]" />
                <div className="relative z-10 max-w-2xl space-y-8">
                  <h2 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
                    Scale Your Business with <span className="text-emerald-400">AI Empowerment.</span>
                  </h2>
                  <p className="text-zinc-400 text-xl">
                    Join thousands of sellers using DEROX to automate listings, optimize pricing, and build buyer confidence through AI trust scoring.
                  </p>
                  <button className="bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all flex items-center gap-2">
                    Open Your Shop
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="px-6 py-20 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">D</div>
              <span className="font-bold text-xl">DEROX</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              The future of marketplaces, powered by Google AI Studio and Gemini 3.1 Pro. Built for trust, designed for conversion.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">Marketplace</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">All Products</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Featured Sellers</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">AI Recommendations</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Trust Scoring</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Seller Guide</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">AI Dispute Resolution</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">Secure Payments</a></li>
              <li><a href="#" className="hover:text-emerald-500 transition-colors">API Documentation</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Newsletter</h4>
            <p className="text-sm text-zinc-500 mb-4">Get the latest insights on AI e-commerce.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email address" className="bg-zinc-100 border-none rounded-xl px-4 py-2 text-sm flex-1" />
              <button className="bg-emerald-500 text-white p-2 rounded-xl hover:bg-emerald-600 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-zinc-50 flex flex-wrap justify-between gap-4 text-xs text-zinc-400 font-medium uppercase tracking-widest">
          <p>© 2026 DEROX SHOP BY DESTINY OLUWAFEMI DANIEL. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-zinc-900">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-900">Terms of Service</a>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {user && <TrustCenter isOpen={showTrustCenter} onClose={() => setShowTrustCenter(false)} user={user} />}
      {user && <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} onSubscribe={handleSubscribe} user={user} />}
    </div>
  );
}

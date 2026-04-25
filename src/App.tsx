import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Info, 
  LogIn, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  Send,
  Loader2,
  X,
  Target,
  Shield,
  Zap,
  Building,
  AlertCircle,
  Calendar,
  Users,
  Database,
  MessageSquare,
  Trophy,
  Mic,
  ShieldCheck,
  AlertTriangle,
  Flag,
  CheckCircle as CircleCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { UserProfile, JobPosting, Evaluation, ChatMessage } from './types';
import { evaluateVacancy, createChat, createInterviewSession, auditProfile, createPracticeInterview } from './services/geminiService';
import { cn } from './lib/utils';
import { onAuthStateChanged, User, sendEmailVerification } from 'firebase/auth';
import { collection, query, onSnapshot, doc, getDoc, setDoc, serverTimestamp, where, orderBy, addDoc, limit } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './lib/firebase';
import { seedSampleData } from './lib/seedData';
import Onboarding from './components/Onboarding';
import JobForm from './components/JobForm';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [experienceFilter, setExperienceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [employmentFilter, setEmploymentFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<UserProfile[]>([]);

  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [aiChatSessions, setAiChatSessions] = useState<any[]>([]);
  const [activeAiChatSession, setActiveAiChatSession] = useState<any>(null);
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'ui'>('profile');
  
  // Messaging State
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [activeChatRecipient, setActiveChatRecipient] = useState<UserProfile | null>(null);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [directInput, setDirectInput] = useState('');

  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const pSnap = await getDoc(doc(db, 'profiles', u.uid));
          if (pSnap.exists()) {
            setProfile(pSnap.data() as UserProfile);
            setShowOnboarding(false);
          } else {
            setShowOnboarding(true);
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `profiles/${u.uid}`);
        }
      } else {
        setProfile(null);
        setShowOnboarding(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Loading based on role
  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    let q;
    if (profile.role === 'candidate') {
      q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
      const unsubJobs = onSnapshot(q, (snap) => {
        setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as JobPosting)));
        setLoading(false);
      }, (e) => {
        handleFirestoreError(e, OperationType.LIST, 'jobs');
      });

      // Subscribe to sessions
      const qSessions = query(collection(db, 'ai_chats'), where('userId', '==', profile.uid), orderBy('updatedAt', 'desc'));
      const unsubSessions = onSnapshot(qSessions, (snap) => {
        setAiChatSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => {
        unsubJobs();
        unsubSessions();
      };
    } else {
      q = query(collection(db, 'profiles'), where('role', '==', 'candidate'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snap) => {
        setCandidates(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        setLoading(false);
      }, (e) => {
        handleFirestoreError(e, OperationType.LIST, 'profiles');
      });
    }
  }, [profile]);

  // Subscribe to active AI chat messages
  useEffect(() => {
    if (!activeAiChatSession?.id) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'ai_chats', activeAiChatSession.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }) as any as ChatMessage);
      setMessages(msgs);
      
      // Re-initialize chat object if missing
      if (activeAiChatSession && !chatRef.current && msgs.length > 0) {
        const history = msgs.map(m => ({
          role: m.role as any,
          parts: [{ text: m.text }]
        }));
        
        try {
          if (activeAiChatSession.isInterview) {
            if (activeAiChatSession.isPractice) {
              if (profile) chatRef.current = createPracticeInterview(profile, history);
            } else if (selectedJob) {
              chatRef.current = createInterviewSession(selectedJob, history);
            }
          } else if (selectedJob) {
            chatRef.current = createChat(selectedJob, history);
          }
        } catch (err) {
          console.error("AI service re-init error:", err);
        }
      }
    });
  }, [activeAiChatSession]);

  // Subscribe to Direct Messages
  useEffect(() => {
    if (!user) return;
    
    const qSent = query(collection(db, 'messages'), where('senderId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50));
    const qReceived = query(collection(db, 'messages'), where('receiverId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50));

    const unsubSent = onSnapshot(qSent, (snap) => {
      setDirectMessages(prev => {
        const sent = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const others = prev.filter(m => m.senderId !== user.uid);
        return [...sent, ...others].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      });
    });

    const unsubReceived = onSnapshot(qReceived, (snap) => {
      setDirectMessages(prev => {
        const received = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const others = prev.filter(m => m.receiverId !== user.uid);
        return [...received, ...others].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      });
    });

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [user]);

  const handleProfileSubmit = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      photoURL: user.photoURL || undefined,
      isProfileComplete: true,
      createdAt: profile?.createdAt || serverTimestamp(),
      ...data as UserProfile
    };
    try {
      await setDoc(doc(db, 'profiles', user.uid), newProfile, { merge: true });
      setProfile(prev => ({ ...prev, ...newProfile }));
      setShowOnboarding(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `profiles/${user.uid}`);
    }
  };

  const handleVerifyProfile = async () => {
    if (!profile) return;
    setIsAuditing(true);
    try {
      const result = await auditProfile(profile);
      setAuditResult(result);
      
      await setDoc(doc(db, 'profiles', profile.uid), {
        verificationStatus: result.status === 'verified' ? 'verified' : 'pending',
        trustScore: result.integrityScore,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error(e);
      setError("AI Verification failed to complete.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleFlagUser = async (targetUid: string) => {
    if (!user) return;
    try {
      const profileDoc = await getDoc(doc(db, 'profiles', targetUid));
      if (profileDoc.exists()) {
        const currentFlags = profileDoc.data().flaggedCount || 0;
        await setDoc(doc(db, 'profiles', targetUid), {
          flaggedCount: currentFlags + 1,
          updatedAt: serverTimestamp()
        }, { merge: true });
        alert("Verification request sent to moderators. Candidate flagged for review.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyEmail = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 30000); // 30s debounce
    } catch (e) {
      console.error(e);
      setError("Failed to send verification email. Try again later.");
    }
  };

  const startPracticeInterview = async () => {
    if (!profile) return;
    setChatOpen(true);
    setIsEvaluating(true);
    setIsInterviewMode(true);
    setIsPracticeMode(true);
    chatRef.current = null;

    // Check for existing general practice session
    const existingSession = aiChatSessions.find(s => s.isPractice && s.userId === profile.uid);
    if (existingSession) {
      setActiveAiChatSession(existingSession);
      setIsEvaluating(false);
      return;
    }

    try {
      chatRef.current = createPracticeInterview(profile);
      const result = await chatRef.current.sendMessage({ message: "I am ready for the AI Integrity Interview." });
      
      const sessionData = {
        userId: profile.uid,
        jobTitle: "General Portfolio Practice",
        companyName: "Vacancification",
        isInterview: true,
        isPractice: true,
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'ai_chats'), sessionData);
      setActiveAiChatSession({ id: docRef.id, ...sessionData });

      await addDoc(collection(db, 'ai_chats', docRef.id, 'messages'), {
        role: 'model',
        text: result.text,
        createdAt: serverTimestamp()
      });

    } catch (e) {
      console.error(e);
      setMessages([{ role: 'model', text: "Practice session failed to start." }]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handlePostJob = async (data: Partial<JobPosting>) => {
    if (!user || !profile) return;
    try {
      await addDoc(collection(db, 'jobs'), {
        ...data,
        employerId: user.uid,
        employerName: profile.fullName || 'Anonymous Employer',
        createdAt: serverTimestamp()
      });
      setShowJobForm(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'jobs');
    }
  };

  const handleSendDirectMessage = async () => {
    if (!user || !profile || !activeChatRecipient || !directInput.trim()) return;
    const msgData = {
      senderId: user.uid,
      senderName: profile.fullName,
      receiverId: activeChatRecipient.uid,
      receiverName: activeChatRecipient.fullName,
      content: directInput.trim(),
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'messages'), msgData);
      setDirectInput('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'messages');
    }
  };

  const handleSeed = async () => {
    if (!user) return;
    setSeedLoading(true);
    try {
      await seedSampleData(user.uid);
      alert('Sample data added successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to add sample data. See console for details.');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.state || "";
          
          if (city) {
            setLocationQuery(city);
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          setError("Failed to determine your city.");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        console.error("Geo error:", err);
        setError("Location access denied.");
        setGeoLoading(false);
      }
    );
  };

  const startAIEvaluation = async (job: JobPosting) => {
    if (!profile) return;
    setSelectedJob(job);
    setChatOpen(true);
    setIsEvaluating(true);
    setIsInterviewMode(false);
    chatRef.current = null; // Reset chat ref for new selection
    
    // Check for existing session (must NOT be an interview session)
    const existingSession = aiChatSessions.find(s => s.jobId === job.id && !s.isInterview);
    if (existingSession) {
      setActiveAiChatSession(existingSession);
      setEvaluation(existingSession.evaluation);
      setIsEvaluating(false);
      return;
    }

    try {
      const evalData = await evaluateVacancy(job as any);
      setEvaluation(evalData);
      
      const sessionData = {
        userId: profile.uid,
        jobId: job.id,
        jobTitle: job.profession,
        companyName: job.employerName,
        evaluation: evalData,
        isInterview: false,
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'ai_chats'), sessionData);
      const newSession = { id: docRef.id, ...sessionData };
      
      // Initialization will be handled by the effect once this is set
      setActiveAiChatSession(newSession);

      const welcomeMsg: ChatMessage = { 
        role: 'model', 
        text: `I've analyzed the **${job.profession}** position at **${job.employerName}**. Based on your skills and profile, here is my verdict:\n\n**Summary:** ${evalData.summary}` 
      };

      await addDoc(collection(db, 'ai_chats', docRef.id, 'messages'), {
        ...welcomeMsg,
        createdAt: serverTimestamp()
      });

    } catch (e) {
      console.error(e);
      setMessages([{ role: 'model', text: "Evaluation failed. Please try again." }]);
    } finally {
      setIsEvaluating(false);
    }
  };

  const startMockInterview = async (job: JobPosting) => {
    if (!profile) return;
    setSelectedJob(job);
    setChatOpen(true);
    setIsEvaluating(true);
    setIsInterviewMode(true);
    chatRef.current = null; // Reset chat ref for new selection

    // Check for existing session
    const existingSession = aiChatSessions.find(s => s.jobId === job.id && s.isInterview);
    if (existingSession) {
      setActiveAiChatSession(existingSession);
      setIsEvaluating(false);
      return;
    }

    try {
      chatRef.current = createInterviewSession(job);
      const result = await chatRef.current.sendMessage({ message: "Hello, I am ready for the interview." });
      
      const sessionData = {
        userId: profile.uid,
        jobId: job.id,
        jobTitle: job.profession,
        companyName: job.employerName,
        isInterview: true,
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'ai_chats'), sessionData);
      setActiveAiChatSession({ id: docRef.id, ...sessionData });

      await addDoc(collection(db, 'ai_chats', docRef.id, 'messages'), {
        role: 'model',
        text: result.text,
        createdAt: serverTimestamp()
      });

    } catch (e) {
      console.error(e);
      setMessages([{ role: 'model', text: "Interview simulation failed. Please try again." }]);
    } finally {
      setIsEvaluating(false);
    }
  };
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !chatRef.current || !activeAiChatSession?.id) return;
    const userMsg = inputMessage;
    setInputMessage('');
    
    const chatId = activeAiChatSession.id;

    setIsTyping(true);
    try {
      // Save user message
      await addDoc(collection(db, 'ai_chats', chatId, 'messages'), {
        role: 'user',
        text: userMsg,
        createdAt: serverTimestamp()
      });

      const result = await chatRef.current.sendMessage({ message: userMsg });
      
      // Save model message
      await addDoc(collection(db, 'ai_chats', chatId, 'messages'), {
        role: 'model',
        text: result.text,
        createdAt: serverTimestamp()
      });

      // Update session timestamp
      await setDoc(doc(db, 'ai_chats', chatId), { updatedAt: serverTimestamp() }, { merge: true });

    } catch (err) {
      console.error(err);
      // In a real app we might show a toast or error in chat
    } finally {
      setIsTyping(false);
    }
  };

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const filteredJobs = jobs.filter(j => 
    (j.profession.toLowerCase().includes(searchQuery.toLowerCase()) || j.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
    j.city.toLowerCase().includes(locationQuery.toLowerCase()) &&
    (experienceFilter === 'all' || j.experienceRequired === experienceFilter) &&
    (categoryFilter === 'all' || j.category === categoryFilter) &&
    (employmentFilter === 'all' || j.employmentType === employmentFilter) &&
    (districtFilter === '' || j.district?.toLowerCase().includes(districtFilter.toLowerCase()) || j.microDistrict?.toLowerCase().includes(districtFilter.toLowerCase()))
  );

  const filteredCandidates = candidates.filter(c => 
    (c.profession.toLowerCase().includes(searchQuery.toLowerCase()) || c.fullName.toLowerCase().includes(searchQuery.toLowerCase())) &&
    c.city.toLowerCase().includes(locationQuery.toLowerCase()) &&
    (experienceFilter === 'all' || c.experience === experienceFilter) &&
    (categoryFilter === 'all' || c.category === categoryFilter) &&
    (employmentFilter === 'all' || c.employmentType === employmentFilter) &&
    (districtFilter === '' || c.district?.toLowerCase().includes(districtFilter.toLowerCase()) || c.microDistrict?.toLowerCase().includes(districtFilter.toLowerCase())) &&
    (c.flaggedCount || 0) < 5
  );

  const ui = profile?.uiSettings || { accentColor: 'orange', font: 'sans', darkMode: false };

  const themeColors = {
    orange: { text: 'text-orange-600', bg: 'bg-orange-600', border: 'border-orange-600', ring: 'focus:ring-orange-600/20', hoverBg: 'hover:bg-orange-700', shadow: 'shadow-orange-600/20' },
    blue: { text: 'text-blue-600', bg: 'bg-blue-600', border: 'border-blue-600', ring: 'focus:ring-blue-600/20', hoverBg: 'hover:bg-blue-700', shadow: 'shadow-blue-600/20' },
    green: { text: 'text-green-600', bg: 'bg-green-600', border: 'border-green-600', ring: 'focus:ring-green-600/20', hoverBg: 'hover:bg-green-700', shadow: 'shadow-green-600/20' },
    purple: { text: 'text-purple-600', bg: 'bg-purple-600', border: 'border-purple-600', ring: 'focus:ring-purple-600/20', hoverBg: 'hover:bg-purple-700', shadow: 'shadow-purple-600/20' },
  };

  const theme = themeColors[ui.accentColor] || themeColors.orange;

  return (
    <div className={cn(
      ui.font === 'serif' ? 'font-serif' : 'font-sans',
      ui.darkMode ? 'dark bg-stone-950 text-stone-200' : 'bg-[#faf9f6] text-stone-900',
      "min-h-screen transition-colors duration-500 selection:bg-orange-100 selection:text-orange-900"
    )}>
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 backdrop-blur-xl border-b px-4 sm:px-6 py-4 transition-all duration-300",
        ui.darkMode ? "bg-stone-900/80 border-stone-800 shadow-2xl shadow-black/50" : "bg-white/80 border-stone-200/60 shadow-sm"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
          <div className="flex items-center gap-3 shrink-0 group cursor-pointer">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3", theme.bg, theme.shadow)}>
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <div className="hidden md:block">
              <h1 className={cn("text-xl font-black tracking-tighter leading-none transition-colors", ui.darkMode ? "text-white" : "text-stone-900")}>Vacancification</h1>
              <span className={cn("text-[10px] font-bold uppercase tracking-[0.2em] leading-none opacity-60", theme.text)}>Enterprise v2.0</span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-orange-600 transition-colors" />
              <input 
                type="text" 
                placeholder={profile?.role === 'employer' ? "Find candidates..." : "Find opportunities..."}
                className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:ring-4 focus:ring-orange-600/10 focus:border-orange-600 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="relative w-full group hidden sm:block">
              <button 
                onClick={handleGeolocation}
                disabled={geoLoading}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 hover:text-orange-600 transition-colors z-10 disabled:opacity-50"
                title="Detect my location"
              >
                {geoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </button>
              <input 
                type="text" 
                placeholder="City..."
                className="w-full pl-11 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:ring-4 focus:ring-orange-600/10 focus:border-orange-600 transition-all outline-none"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {profile && (
              <button 
                onClick={() => setShowInbox(true)}
                className="relative p-2.5 bg-stone-100 rounded-2xl text-stone-600 hover:bg-orange-50 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100"
              >
                <MessageSquare className="w-5 h-5" />
                {directMessages.filter(m => m.receiverId === user?.uid).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[10px] font-bold rounded-lg flex items-center justify-center border-2 border-white shadow-lg shadow-orange-600/20">
                    {Array.from(new Set(directMessages.filter(m => m.receiverId === user?.uid).map(m => m.senderId))).length}
                  </span>
                )}
              </button>
            )}

            {profile?.role === 'employer' && (
              <button 
                onClick={() => setShowJobForm(true)}
                className="bg-stone-900 text-white p-2.5 sm:px-5 sm:py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-xl shadow-stone-900/10"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Post Job</span>
              </button>
            )}
            
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-stone-300" />
            ) : user ? (
              <div className="relative group/profile">
                <div className="flex items-center gap-3 cursor-pointer">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-transparent group-hover/profile:border-orange-600 transition-all" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="absolute right-0 mt-3 w-64 bg-white border border-stone-200 rounded-3xl shadow-2xl py-4 z-50 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all translate-y-2 group-hover/profile:translate-y-0 overflow-hidden">
                  <div className="px-5 pb-3 border-b border-stone-100 mb-2">
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">Authenticated</p>
                    <p className="text-sm font-bold truncate leading-tight">{user.displayName || user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-stone-100 rounded text-[10px] font-bold text-stone-600 uppercase">
                      {profile?.role || 'Setting up...'}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setShowProfileSettings(true);
                      setActiveSettingsTab('profile');
                    }}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-stone-600 hover:bg-stone-50 font-bold transition-colors"
                  >
                    <UserIcon className="w-4 h-4" /> Settings
                  </button>
                  <button 
                    onClick={() => {
                      setShowProfileSettings(true);
                      setActiveSettingsTab('ui');
                    }}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-stone-600 hover:bg-stone-50 font-bold transition-colors"
                  >
                    <Zap className="w-4 h-4" /> UI Customization
                  </button>
                  <button onClick={logout} className="w-full flex items-center gap-3 px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className={cn("text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all", theme.bg, theme.hoverBg)}
              >
                Sign In
              </button>
            )}
          </div>

          {profile && (
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-stone-100/50">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  showFilters ? theme.bg + " text-white" : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                )}
              >
                <Plus className={cn("w-3 h-3 transition-transform", showFilters && "rotate-45")} />
                Advanced Filters
              </button>
              
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <select 
                    value={experienceFilter}
                    onChange={(e) => setExperienceFilter(e.target.value)}
                    className={cn("bg-white border-none rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none ring-1 ring-stone-200 transition-all", theme.ring)}
                  >
                    <option value="all">Any Experience</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Middle</option>
                    <option value="senior">Senior</option>
                  </select>

                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className={cn("bg-white border-none rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none ring-1 ring-stone-200 transition-all", theme.ring)}
                  >
                    <option value="all">Any Sphere</option>
                    <option value="IT">IT</option>
                    <option value="Service">Service</option>
                    <option value="Education">Education</option>
                    <option value="Finance">Finance</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Other">Other</option>
                  </select>

                  <select 
                    value={employmentFilter}
                    onChange={(e) => setEmploymentFilter(e.target.value)}
                    className={cn("bg-white border-none rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none ring-1 ring-stone-200 transition-all", theme.ring)}
                  >
                    <option value="all">Any Type</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="flexible">Flexible</option>
                  </select>

                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-300" />
                    <input 
                      type="text"
                      placeholder="District..."
                      className={cn("bg-white border-none rounded-xl pl-8 pr-3 py-2 text-[10px] font-bold uppercase tracking-widest outline-none ring-1 ring-stone-200 transition-all w-28 focus:w-40", theme.ring)}
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                    />
                  </div>
                  
                  {(experienceFilter !== 'all' || categoryFilter !== 'all' || employmentFilter !== 'all' || districtFilter !== '') && (
                    <button 
                      onClick={() => {
                        setExperienceFilter('all');
                        setCategoryFilter('all');
                        setEmploymentFilter('all');
                        setDistrictFilter('');
                      }}
                      className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline px-2"
                    >
                      Reset
                    </button>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        {/* Main Feed */}
        <div className="order-2 lg:order-1 lg:col-span-8 space-y-6 md:space-y-8">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-3xl font-serif italic text-stone-900">
                {profile?.role === 'employer' ? 'Pool of Talent' : 'Dream Vacancies'}
              </h2>
              <p className="text-stone-500 text-sm font-serif italic">
                {profile?.role === 'employer' ? "Top professionals sorted by your needs" : "Internal listings matching your career path"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-4">
              <Loader2 className={cn("w-10 h-10 animate-spin mx-auto", theme.text)} />
              <p className="text-stone-400 font-serif italic">Curating your customized feed...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {profile?.role === 'candidate' ? (
                filteredJobs.length > 0 ? filteredJobs.map(job => (
                  <motion.div 
                    key={job.id}
                    layoutId={job.id}
                    whileHover={{ y: -4 }}
                    className={cn(
                      "group relative bg-white border rounded-[2.5rem] p-8 transition-all duration-500",
                      ui.darkMode ? "bg-stone-900 border-stone-800 hover:border-stone-700" : "border-stone-200/60 hover:border-stone-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)]"
                    )}
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-[1.25rem] flex items-center justify-center border transition-all duration-500 group-hover:scale-105",
                          ui.darkMode ? "bg-stone-800 border-stone-700 text-stone-500" : "bg-stone-50 border-stone-100 text-stone-300 group-hover:border-stone-200"
                        )}>
                          <Building className="w-10 h-10" />
                        </div>
                        <div>
                          <h3 className={cn("text-2xl font-bold transition-colors tracking-tight", ui.darkMode ? "text-white" : "text-stone-900", `group-hover:${theme.text}`)}>{job.profession}</h3>
                          <p className="text-stone-500 font-serif italic text-lg">{job.employerName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-2xl font-black tracking-tight leading-none", theme.text)}>
                          <DollarSign className="inline w-5 h-5 -mt-1.5" />{job.preferredSalary.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em] mt-2">Target Monthly</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 mb-8">
                      <div className={cn("px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2", ui.darkMode ? "bg-stone-800 text-stone-400" : "bg-stone-50 text-stone-500")}>
                        <MapPin className="w-3.5 h-3.5" /> {job.city}{job.district ? `, ${job.district}` : ''}
                      </div>
                      <div className={cn("px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2", theme.bg + " bg-opacity-10 " + theme.text)}>
                        <Search className="w-3.5 h-3.5" /> {job.category || 'General'}
                      </div>
                      <div className="px-4 py-2 bg-stone-50 dark:bg-stone-800 rounded-xl text-xs font-bold text-stone-500 flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5" /> {job.experienceRequired || 'Entry'}
                      </div>
                    </div>

                    <p className={cn("text-sm leading-relaxed line-clamp-3 mb-8 font-medium", ui.darkMode ? "text-stone-400" : "text-stone-600")}>
                      {job.description}
                    </p>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => startAIEvaluation(job)}
                        className={cn(
                          "flex-1 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                          ui.darkMode ? "bg-stone-800 text-stone-300 hover:bg-stone-700" : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                        )}
                      >
                        Advisor Intel <Target className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => startMockInterview(job)}
                        className={cn(
                          "flex-1 text-white py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-2xl",
                          theme.bg, theme.hoverBg, theme.shadow
                        )}
                      >
                        Interview Prep <Trophy className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-20 text-center bg-white border-2 border-dashed border-stone-200 rounded-3xl">
                    <Search className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-400 font-serif italic">No matching vacancies in our private registry.</p>
                  </div>
                )
              ) : (
                filteredCandidates.length > 0 ? filteredCandidates.map(cand => (
                  <motion.div 
                    key={cand.uid}
                    whileHover={{ scale: 1.01 }}
                    className={cn(
                      "bg-white border rounded-[2.5rem] p-8 transition-all duration-500",
                      ui.darkMode ? "bg-stone-900 border-stone-800" : "border-stone-200/60 hover:shadow-2xl hover:border-stone-300"
                    )}
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex gap-6">
                        <div className={cn(
                          "w-20 h-20 rounded-[1.5rem] flex items-center justify-center overflow-hidden border shadow-inner",
                          ui.darkMode ? "bg-stone-800 border-stone-700" : "bg-stone-50 border-stone-100"
                        )}>
                          {cand.photoURL ? <img src={cand.photoURL} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-10 h-10 text-stone-300" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                             <h3 className={cn("text-2xl font-bold tracking-tight", ui.darkMode ? "text-white" : "text-stone-900")}>{cand.fullName}</h3>
                             {cand.verificationStatus === 'verified' && <ShieldCheck className="w-6 h-6 text-green-500 fill-green-50" />}
                             {cand.trustScore !== undefined && cand.trustScore < 40 && (
                               <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100 uppercase tracking-widest">
                                 <AlertTriangle className="w-3.5 h-3.5" /> High Risk
                               </div>
                             )}
                          </div>
                          <p className="text-stone-500 font-serif italic text-lg">{cand.profession}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className={cn("px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest", theme.bg + " bg-opacity-10 " + theme.text)}>
                              {cand.category || 'Generalist'}
                            </span>
                            <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-400 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                              {cand.experience || 'Entry'} Level
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleFlagUser(cand.uid)}
                        className="p-2 text-stone-300 hover:text-red-400 transition-colors bg-stone-50 dark:bg-stone-800 rounded-xl"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className={cn("p-5 rounded-2xl border", ui.darkMode ? "bg-stone-800/50 border-stone-700" : "bg-green-50/30 border-green-100/50")}>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-widest mb-3">
                          <Shield className="w-3.5 h-3.5" /> Core Assets
                        </div>
                        <p className={cn("text-xs font-medium leading-relaxed italic", ui.darkMode ? "text-stone-400" : "text-stone-700")}>{cand.strengths || 'Not cataloged'}</p>
                      </div>
                      <div className={cn("p-5 rounded-2xl border", ui.darkMode ? "bg-stone-800/50 border-stone-700" : "bg-orange-50/30 border-orange-100/50")}>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-3">
                          <AlertCircle className="w-3.5 h-3.5" /> Focus Zones
                        </div>
                        <p className={cn("text-xs font-medium leading-relaxed italic", ui.darkMode ? "text-stone-400" : "text-stone-700")}>{cand.weaknesses || 'Developmental'}</p>
                      </div>
                    </div>

                    <div className={cn("flex flex-wrap items-center justify-between p-4 rounded-2xl border-t", ui.darkMode ? "border-stone-800 border-t-2" : "bg-stone-50/50 border-stone-100")}>
                       <div className="flex flex-wrap items-center gap-6">
                          <div className="flex items-center gap-2 text-xs text-stone-500 font-bold">
                            <MapPin className="w-3.5 h-3.5" /> {cand.city}{cand.district ? `, ${cand.district}` : ''}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-stone-500 font-bold">
                            <Calendar className="w-3.5 h-3.5" /> Age: {calculateAge(cand.birthDate)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-stone-500 font-bold uppercase tracking-widest">
                            <Users className="w-3.5 h-3.5" /> {cand.gender}
                          </div>
                       </div>
                       <div className="flex items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto">
                          <button 
                            onClick={() => {
                              setActiveChatRecipient(cand);
                              setIsMessagingOpen(true);
                            }}
                            className={cn("flex-1 sm:flex-none text-white px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2", theme.bg, theme.hoverBg, theme.shadow)}
                          >
                            Encrypted Message <MessageSquare className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="py-20 text-center bg-white border-2 border-dashed border-stone-200 rounded-3xl">
                    <UserIcon className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-400 font-serif italic">No candidates found for your search criteria.</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="order-1 lg:order-2 lg:col-span-4 space-y-8">
          {profile ? (
            <div className="bg-white border border-stone-200/60 rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-stone-900/5 lg:sticky lg:top-28">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-stone-50 rounded-full mx-auto mb-4 p-1 border-2 border-orange-100 ring-8 ring-stone-50/50 overflow-hidden">
                  {profile.photoURL ? <img src={profile.photoURL} alt="" className="w-full h-full rounded-full object-cover" /> : <UserIcon className="w-12 h-12 text-stone-300 m-4" />}
                </div>
                <h3 className="text-2xl font-bold text-stone-900 tracking-tight">{profile.fullName}</h3>
                <p className="text-stone-500 text-sm font-serif italic">{profile.profession}</p>
                <div className="mt-3 inline-block px-4 py-1 bg-stone-100 rounded-full text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  {profile.role} account
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-400 uppercase tracking-wider">
                    <span>Profile Data</span>
                    <span className="text-orange-600">100%</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-600 w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-stone-50 rounded-2xl text-center">
                    <p className="text-stone-400 text-[10px] font-bold uppercase mb-1">City</p>
                    <p className="text-xs font-bold text-stone-900">{profile.city}</p>
                  </div>
                   <div className="p-4 bg-stone-50 rounded-2xl text-center">
                    <p className="text-stone-400 text-[10px] font-bold uppercase mb-1">Age</p>
                    <p className="text-xs font-bold text-stone-900">{calculateAge(profile.birthDate)}</p>
                  </div>
                </div>

                {profile.role === 'candidate' ? (
                  <div className="pt-6 border-t border-stone-100">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Your Identity</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-stone-900">Strengths</p>
                          <p className="text-xs text-stone-500 truncate">{profile.strengths}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-stone-900">Weaknesses</p>
                          <p className="text-xs text-stone-500 truncate">{profile.weaknesses}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-6 border-t border-stone-100">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Employer Profile</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <Building className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-stone-900">Company / Industry</p>
                          <p className="text-xs text-stone-500 truncate">{profile.profession}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-stone-900">Hiring Status</p>
                          <p className="text-xs text-stone-500">Active Recruiter</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setShowProfileSettings(true)}
                  className="w-full bg-stone-900 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-stone-900/10"
                >
                  <UserIcon className="w-4 h-4" /> Edit Profile
                </button>

                {profile.role === 'candidate' && (
                  <>
                    <button 
                      onClick={startPracticeInterview}
                      className="w-full mt-3 bg-orange-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
                    >
                      <Trophy className="w-4 h-4 fill-white/20" /> AI Practice Interview
                    </button>
                    <div className="mt-4 p-4 rounded-3xl border border-dashed border-stone-200 bg-stone-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Starlight Trust Index</h4>
                      {profile.verificationStatus === 'verified' ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          <ShieldCheck className="w-3 h-3" /> VERIFIED
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> UNVERIFIED
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-bold text-stone-900">{profile.trustScore || 0}%</span>
                         <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Integrity Rank</span>
                      </div>
                      <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-1000", (profile.trustScore || 0) > 70 ? 'bg-green-500' : 'bg-stone-500')} 
                          style={{ width: `${profile.trustScore || 0}%` }} 
                        />
                      </div>
                      
                      <button 
                        onClick={handleVerifyProfile}
                        disabled={isAuditing}
                        className="w-full mt-2 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-[10px] font-bold uppercase tracking-widest hover:border-orange-200 hover:text-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isAuditing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Search className="w-3 h-3" />}
                        Run AI Integrity Audit
                      </button>
                    </div>

                    {auditResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 bg-white rounded-2xl border border-stone-100 shadow-sm"
                      >
                         <p className="text-[9px] font-bold text-stone-400 uppercase mb-1">AI Recommendation</p>
                         <p className="text-[11px] text-stone-600 leading-snug italic">{auditResult.recommendation}</p>
                         {auditResult.issues && auditResult.issues.length > 0 && (
                           <div className="mt-2 space-y-1">
                             {auditResult.issues.map((issue: string, i: number) => (
                               <div key={i} className="flex items-center gap-1.5 text-[9px] font-bold text-orange-600">
                                 <AlertCircle className="w-2.5 h-2.5" /> {issue}
                               </div>
                             ))}
                           </div>
                         )}
                      </motion.div>
                    )}
                  </div>
                </>
              )}
                <button 
                  onClick={logout}
                  className="w-full mt-3 bg-stone-100 text-stone-600 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          ) : (
             <div className="bg-stone-900 rounded-[2.5rem] p-10 text-white text-center shadow-2xl sticky top-28">
                <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-white backdrop-blur-md">
                  <UserIcon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif italic mb-2">Guest Access</h3>
                <p className="text-stone-400 text-sm mb-8 leading-relaxed">Log in to create your professional profile and unlock exclusive listings.</p>
                <button 
                  onClick={signInWithGoogle}
                  className="w-full bg-white text-stone-900 py-4 rounded-2xl font-bold hover:bg-orange-600 hover:text-white transition-all shadow-xl shadow-stone-900/10"
                >
                  Get Started
                </button>
             </div>
          )}
        </aside>
      </main>

      <AnimatePresence>
        {profile?.role === 'candidate' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={startPracticeInterview}
            className={cn("fixed bottom-6 right-6 w-16 h-16 text-white rounded-full flex items-center justify-center shadow-2xl z-40 border-4 border-white group transition-all", theme.bg, theme.shadow)}
          >
            <Trophy className="w-8 h-8 group-hover:rotate-12 transition-transform" />
            <span className="absolute right-20 bg-stone-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
               AI Killer Mock Interview
            </span>
          </motion.button>
        )}

        {showOnboarding && <Onboarding onSubmit={handleProfileSubmit} />}
        {showJobForm && <JobForm onClose={() => setShowJobForm(false)} onSubmit={handlePostJob} />}
        
        {/* Email Verification Overlay */}
        {user && !user.emailVerified && (
          <div className="fixed inset-0 z-[100] bg-stone-950 flex items-center justify-center p-6 text-center">
            <div className="max-w-sm w-full space-y-8">
               <div className="w-20 h-20 bg-orange-600/10 rounded-3xl flex items-center justify-center mx-auto text-orange-600 border border-orange-600/20">
                 <ShieldCheck className="w-10 h-10" />
               </div>
               <div className="space-y-4">
                 <h2 className="text-3xl font-serif italic text-white">Trust Check</h2>
                 <p className="text-stone-400 text-sm leading-relaxed">
                   To keep Vacancification a premium, fraud-free environment for small businesses, we require email verification via Google.
                 </p>
               </div>
               <div className="flex flex-col gap-3">
                 <button 
                  onClick={handleVerifyEmail}
                  disabled={verificationSent}
                  className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black tracking-tight hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 disabled:bg-stone-800 disabled:text-stone-500"
                 >
                   {verificationSent ? "Check your Inbox..." : "Send Verification Email"}
                 </button>
                 <button 
                  onClick={logout}
                  className="text-stone-500 text-sm font-bold uppercase tracking-widest hover:text-white transition-colors"
                 >
                   Sign Out
                 </button>
               </div>
               <p className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">
                 Refresh the page after verifying link.
               </p>
            </div>
          </div>
        )}
        
        {/* Inbox Drawer */}
        <AnimatePresence>
          {showInbox && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex justify-end"
            >
              <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowInbox(false)} />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="relative w-full max-w-[100%] sm:max-w-md bg-white h-full shadow-2xl flex flex-col"
              >
                <div className="p-6 md:p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                  <div>
                    <h2 className="text-xl md:text-2xl font-serif italic text-stone-900">Your Conversations</h2>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Direct communication layer</p>
                  </div>
                  <button onClick={() => setShowInbox(false)} className="p-2.5 hover:bg-stone-200 rounded-2xl transition-all">
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* AI Labs Section */}
                  {aiChatSessions.length > 0 && (
                    <div className="space-y-2">
                       <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                         <Zap className="w-3 h-3" /> AI Labs History
                       </h3>
                       {aiChatSessions.map(session => (
                         <button 
                           key={session.id}
                           onClick={() => {
                             const job = jobs.find(j => j.id === session.jobId);
                             if (job) {
                               setSelectedJob(job);
                               setActiveAiChatSession(session);
                               setChatOpen(true);
                               setIsInterviewMode(!!session.isInterview);
                               setShowInbox(false);
                               if (session.evaluation) setEvaluation(session.evaluation);
                             }
                           }}
                           className="w-full flex items-center gap-4 p-4 hover:bg-stone-50 rounded-3xl transition-all text-left border border-stone-100 group shadow-sm bg-white"
                         >
                            <div className={cn(
                              "w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0",
                              session.isInterview ? "bg-orange-600" : "bg-stone-900"
                            )}>
                              {session.isInterview ? <Trophy className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-center">
                                  <h4 className="font-bold text-stone-900 truncate text-sm">
                                    {session.isInterview ? 'Mock Interview' : session.jobTitle}
                                  </h4>
                               </div>
                               <p className="text-[10px] text-stone-400 font-bold uppercase tracking-tight">
                                 {session.companyName} • {session.isInterview ? 'Simulation' : 'Evaluation'}
                               </p>
                            </div>
                         </button>
                       ))}
                    </div>
                  )}

                  {/* Direct Messages Section */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-4 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" /> Direct Messages
                    </h3>
                    {Array.from(new Set([
                      ...directMessages.filter(m => m.receiverId === user?.uid).map(m => m.senderId),
                      ...directMessages.filter(m => m.senderId === user?.uid).map(m => m.receiverId)
                    ]))
                  .filter(uid => uid !== user?.uid)
                  .map(otherUid => {
                    const latestMsg = directMessages.find(m => (m.senderId === otherUid && m.receiverId === user?.uid) || (m.senderId === user?.uid && m.receiverId === otherUid));
                    const isUnread = latestMsg?.receiverId === user?.uid;
                    const otherName = latestMsg?.senderId === otherUid ? latestMsg.senderName : latestMsg?.receiverName;

                    return (
                      <button 
                        key={otherUid}
                        onClick={async () => {
                          const snap = await getDoc(doc(db, 'profiles', otherUid));
                          if (snap.exists()) {
                            setActiveChatRecipient(snap.data() as UserProfile);
                            setIsMessagingOpen(true);
                            setShowInbox(false);
                          }
                        }}
                        className="w-full flex items-center gap-4 p-4 hover:bg-stone-50 rounded-3xl transition-all text-left border border-transparent hover:border-stone-100 group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-orange-600/10 shrink-0">
                          {otherName?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <h4 className="font-bold text-stone-900 truncate group-hover:text-orange-600 transition-colors">{otherName}</h4>
                            <span className="text-[10px] text-stone-400 font-bold">
                              {latestMsg?.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={cn("text-xs truncate", isUnread ? "font-bold text-stone-800" : "text-stone-500 font-medium")}>
                            {latestMsg?.senderId === user?.uid ? 'You: ' : ''}{latestMsg?.content}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  </div>

                  {directMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-10 py-20">
                      <MessageSquare className="w-16 h-16 mb-4 text-stone-200" />
                      <p className="text-lg font-serif italic text-stone-500">No active conversations yet.</p>
                      <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-2">Start a dialogue from candidate pool or job analysis</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {showProfileSettings && profile && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-serif italic text-stone-900">Settings</h2>
                <button onClick={() => setShowProfileSettings(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              </div>

              <div className="flex gap-4 mb-6 border-b border-stone-100">
                <button 
                  onClick={() => setActiveSettingsTab('profile')}
                  className={cn(
                    "pb-2 px-1 text-[10px] font-bold uppercase tracking-widest transition-all",
                    activeSettingsTab === 'profile' ? cn(theme.text, "border-b-2", theme.border) : "text-stone-400 hover:text-stone-600"
                  )}
                >
                  Profile
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('ui')}
                  className={cn(
                    "pb-2 px-1 text-[10px] font-bold uppercase tracking-widest transition-all",
                    activeSettingsTab === 'ui' ? cn(theme.text, "border-b-2", theme.border) : "text-stone-400 hover:text-stone-600"
                  )}
                >
                  UI / Theme
                </button>
              </div>

              {activeSettingsTab === 'profile' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Account Role</label>
                      <select 
                        className={cn("w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm transition-all outline-none font-bold", theme.text, theme.ring)}
                        value={profile.role}
                        onChange={(e) => setProfile({...profile, role: e.target.value as any})}
                      >
                        <option value="candidate">Candidate (Job Seeker)</option>
                        <option value="employer">Employer (Hiring)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Full Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                        value={profile.fullName}
                        onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Profession / Industry</label>
                    <input 
                      type="text" 
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                      value={profile.profession}
                      onChange={(e) => setProfile({...profile, profession: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">City</label>
                      <input 
                        type="text" 
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                        value={profile.city}
                        onChange={(e) => setProfile({...profile, city: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Birth Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-orange-600/20 transition-all outline-none"
                        value={profile.birthDate || ''}
                        onChange={(e) => setProfile({...profile, birthDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-stone-100">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">Development Tools</p>
                    <button 
                      onClick={handleSeed}
                      disabled={seedLoading}
                      className="w-full bg-orange-50 text-orange-600 py-3 rounded-2xl font-bold hover:bg-orange-100 transition-all flex items-center justify-center gap-2"
                    >
                      {seedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                      Seed Sample Candidates & Jobs
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Accent Color</label>
                    <div className="flex gap-4">
                      {['orange', 'blue', 'green', 'purple'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setProfile({
                            ...profile, 
                            uiSettings: { 
                              ...(profile.uiSettings || { font: 'sans', darkMode: false }), 
                              accentColor: color as any 
                            }
                          })}
                          className={cn(
                            "w-10 h-10 rounded-full border-4 transition-all",
                            color === 'orange' ? 'bg-orange-600' : 
                            color === 'blue' ? 'bg-blue-600' : 
                            color === 'green' ? 'bg-green-600' : 'bg-purple-600',
                            (profile.uiSettings?.accentColor || 'orange') === color ? "border-stone-900 scale-110" : "border-white"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 ml-1">Typography</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setProfile({
                          ...profile,
                          uiSettings: {
                            ...(profile.uiSettings || { accentColor: 'orange', darkMode: false }),
                            font: 'sans'
                          }
                        })}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all text-left",
                          (profile.uiSettings?.font || 'sans') === 'sans' ? "border-stone-900 bg-stone-50" : "border-stone-100 hover:border-stone-200"
                        )}
                      >
                        <p className="font-bold text-sm">Sans Serif</p>
                        <p className="text-[10px] text-stone-400">Modern & Clean</p>
                      </button>
                      <button
                        onClick={() => setProfile({
                          ...profile,
                          uiSettings: {
                            ...(profile.uiSettings || { accentColor: 'orange', darkMode: false }),
                            font: 'serif'
                          }
                        })}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all text-left",
                          (profile.uiSettings?.font || 'sans') === 'serif' ? "border-stone-900 bg-stone-50" : "border-stone-100 hover:border-stone-200"
                        )}
                      >
                        <p className="font-bold font-serif text-sm">Serif</p>
                        <p className="text-[10px] text-stone-400 font-serif italic">Elegant & Classic</p>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div>
                      <p className="text-sm font-bold">Dark Mode</p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest">Experimental Feature</p>
                    </div>
                    <button
                      onClick={() => setProfile({
                        ...profile,
                        uiSettings: {
                          ...(profile.uiSettings || { accentColor: 'orange', font: 'sans' }),
                          darkMode: !profile.uiSettings?.darkMode
                        }
                      })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        profile.uiSettings?.darkMode ? "bg-stone-900" : "bg-stone-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        profile.uiSettings?.darkMode ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowProfileSettings(false)}
                  className="flex-1 bg-stone-100 text-stone-900 py-3 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, 'profiles', user!.uid), profile);
                      setShowProfileSettings(false);
                    } catch (e) {
                      handleFirestoreError(e, OperationType.UPDATE, `profiles/${user!.uid}`);
                    }
                  }}
                  className={cn("flex-1 text-white py-3 rounded-2xl font-bold shadow-lg transition-all", theme.bg, theme.shadow, theme.hoverBg)}
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Evaluation Chat Drawer */}
        {chatOpen && selectedJob && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end"
          >
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setChatOpen(false)} />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", isInterviewMode ? "bg-orange-600 shadow-orange-600/20" : "bg-stone-900 shadow-stone-900/20")}>
                    {isInterviewMode ? <Mic className="w-6 h-6" /> : <Building className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 leading-tight">
                      {isInterviewMode ? "Starlight Mock Interview" : selectedJob.profession}
                    </h3>
                    <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">
                      {isInterviewMode ? `Hiring simulation for ${selectedJob.employerName}` : selectedJob.employerName}
                    </p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-stone-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-stone-50/30 transition-colors" ref={scrollRef}>
                {!isInterviewMode && evaluation && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-green-100 shadow-sm">
                          <h4 className="text-[10px] font-black text-green-700 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <CircleCheck className="w-3.5 h-3.5" /> Strategic Wins
                          </h4>
                          <ul className="space-y-2">
                            {evaluation.pros.map((p, i) => (
                              <li key={i} className="text-xs text-stone-700 font-bold flex items-start gap-2.5">
                                <Zap className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-orange-100 shadow-sm">
                          <h4 className="text-[10px] font-black text-orange-700 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5" /> Critical Friction
                          </h4>
                          <ul className="space-y-2">
                            {evaluation.cons.map((c, i) => (
                              <li key={i} className="text-xs text-stone-700 font-bold flex items-start gap-2.5">
                                <AlertCircle className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" /> {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                     </div>
                     <div className={cn("p-6 rounded-[2rem] border-2 shadow-sm bg-white", theme.border)}>
                        <h4 className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-2", theme.text)}>Advisor Verdict</h4>
                        <p className="text-sm text-stone-700 font-serif italic leading-relaxed">{evaluation.summary}</p>
                     </div>
                  </motion.div>
                )}

                {messages.map((msg, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn("flex flex-col max-w-[85%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}
                  >
                    <div className={cn(
                      "px-6 py-4 rounded-[1.75rem] text-sm leading-relaxed shadow-sm transition-all", 
                      msg.role === 'user' ? "bg-stone-900 text-white rounded-tr-sm" : "bg-white border border-stone-100 text-stone-800 rounded-tl-sm hover:border-stone-200"
                    )}>
                        <Markdown>{msg.text}</Markdown>
                    </div>
                    <span className="text-[9px] font-bold text-stone-300 uppercase tracking-widest mt-2">{msg.role === 'user' ? 'Direct Source' : 'Vacancification AI'}</span>
                  </motion.div>
                ))}
                
                {(isEvaluating || isTyping) && (
                  <div className="flex items-center gap-4 text-stone-400 p-2">
                    <div className="flex gap-1.5">
                      <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }} className={cn("w-1.5 h-1.5 rounded-full", theme.bg)} />
                      <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={cn("w-1.5 h-1.5 rounded-full", theme.bg)} />
                      <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={cn("w-1.5 h-1.5 rounded-full", theme.bg)} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                      {isEvaluating ? "Processing Neural Audit..." : "Crafting Logic response..."}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-stone-100 bg-white shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder={isInterviewMode ? "Speak to your interviewer..." : "Ask Advisor anything about this role..."}
                    className={cn("w-full pl-6 pr-12 py-4 bg-stone-50 border-none rounded-2xl text-sm transition-all outline-none", theme.ring)}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button 
                    onClick={handleSendMessage}
                    className={cn("absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-white rounded-xl transition-all", theme.bg, theme.hoverBg)}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Direct Messaging Dialog */}
        <AnimatePresence>
          {isMessagingOpen && activeChatRecipient && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex justify-end"
            >
              <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsMessagingOpen(false)} />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="relative w-full max-w-[100%] sm:max-w-lg bg-white h-full shadow-2xl flex flex-col"
              >
                <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white overflow-hidden shadow-lg shadow-orange-600/20">
                      {activeChatRecipient.photoURL ? (
                        <img src={activeChatRecipient.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 leading-tight">{activeChatRecipient.fullName}</h3>
                      <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">{activeChatRecipient.profession}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsMessagingOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/30">
                  {directMessages
                    .filter(m => 
                      (m.senderId === user?.uid && m.receiverId === activeChatRecipient.uid) ||
                      (m.senderId === activeChatRecipient.uid && m.receiverId === user?.uid)
                    )
                    .sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
                    .map((msg, i) => (
                      <div key={i} className={cn("flex flex-col max-w-[80%]", msg.senderId === user?.uid ? "ml-auto items-end" : "mr-auto items-start")}>
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                          msg.senderId === user?.uid 
                            ? "bg-stone-900 text-white rounded-tr-none" 
                            : "bg-white border border-stone-100 text-stone-800 rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-stone-400 mt-1 font-bold">
                          {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  {directMessages.filter(m => (m.senderId === user?.uid && m.receiverId === activeChatRecipient.uid) || (m.senderId === activeChatRecipient.uid && m.receiverId === user?.uid)).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-10">
                      <MessageSquare className="w-12 h-12 mb-4 text-stone-200" />
                      <p className="text-sm font-serif italic text-stone-500">Start a direct conversation with {activeChatRecipient.fullName.split(' ')[0]}. Discuss opportunities and values.</p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-stone-100 bg-white">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Type a message..."
                      className="w-full pl-6 pr-12 py-4 bg-stone-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-600 transition-all outline-none"
                      value={directInput}
                      onChange={(e) => setDirectInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendDirectMessage()}
                    />
                    <button 
                      onClick={handleSendDirectMessage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-stone-900 text-white rounded-xl hover:bg-orange-600 transition-all shadow-lg"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}

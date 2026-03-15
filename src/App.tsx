import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Code, 
  Image as ImageIcon, 
  Video, 
  History, 
  Send, 
  Plus, 
  Trash2, 
  Loader2,
  ChevronRight,
  Terminal,
  Sparkles,
  Zap,
  Copy,
  Download,
  Check,
  Share2,
  Maximize2,
  ExternalLink,
  LayoutTemplate,
  X,
  Sliders,
  Bookmark,
  Activity,
  BarChart3,
  ChevronDown,
  Search,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from './lib/utils';
import { generateText, generateCode, generateImage, generateVideo } from './services/gemini';
import { format } from 'date-fns';
import { ImageEditor } from './components/ImageEditor';
import { VideoPlayer } from './components/VideoPlayer';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { auth, db } from './lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { LogOut, User as UserIcon, AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-6 backdrop-blur-xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Something went wrong</h2>
              <p className="text-sm text-white/40">The application encountered an unexpected error and had to stop.</p>
            </div>
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-left overflow-auto max-h-32">
              <code className="text-[10px] text-red-400 font-mono break-all">
                {this.state.error?.message}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-white text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type Modality = 'text' | 'code' | 'image' | 'video';

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  modality: Modality;
  result?: string;
  createdAt: any;
  uid: string;
}

const CodeBlock = ({ language, value, model }: { language: string; value: string; model: string }) => {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExplain = async () => {
    setLoading(true);
    try {
      const result = await generateText(`Explain this code in detail:\n\n\`\`\`${language}\n${value}\n\`\`\``, model);
      setExplanation(result);
    } catch (err) {
      console.error("Explanation failed", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 my-6">
      <div className="relative group/code">
        <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10 flex gap-2">
          <button
            onClick={handleExplain}
            disabled={loading}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md border border-white/10 transition-all backdrop-blur-sm flex items-center gap-1.5 disabled:opacity-50"
            title="Explain code"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-yellow-400" />}
            <span className="text-[10px] font-bold uppercase text-white/70">Explain</span>
          </button>
          <button
            onClick={() => copyToClipboard(value)}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md border border-white/10 transition-all backdrop-blur-sm"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-white/70 hover:text-white" />}
          </button>
        </div>
        <div className="bg-white/5 border-b border-white/10 px-4 py-1.5 text-xs text-white/40 font-mono rounded-t-lg flex justify-between items-center">
          <span>{language}</span>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
      
      <AnimatePresence>
        {explanation && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Zap className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">AI Explanation</span>
              </div>
              <div className="text-sm text-white/70 leading-relaxed markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeModality, setActiveModality] = useState<Modality>('text');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [view, setView] = useState<'playground' | 'analytics'>('playground');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<Modality | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [userTemplates, setUserTemplates] = useState<Record<Modality, { title: string; prompt: string }[]>>(() => {
    const saved = localStorage.getItem('user_templates');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          text: Array.isArray(parsed.text) ? parsed.text : [],
          code: Array.isArray(parsed.code) ? parsed.code : [],
          image: Array.isArray(parsed.image) ? parsed.image : [],
          video: Array.isArray(parsed.video) ? parsed.video : [],
        };
      }
    } catch (e) {
      console.error("Failed to parse user templates", e);
    }
    return { text: [], code: [], image: [], video: [] };
  });

  useEffect(() => {
    localStorage.setItem('user_templates', JSON.stringify(userTemplates));
  }, [userTemplates]);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoResolution, setVideoResolution] = useState<'720p' | '1080p'>('720p');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeComplexity, setCodeComplexity] = useState('intermediate');
  const [imageSize, setImageSize] = useState<'512px' | '1K' | '2K'>('1K');
  const [imageQuality, setImageQuality] = useState<'standard' | 'HD'>('standard');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [imageSubject, setImageSubject] = useState('');
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<{ prompt: string; model: string; timestamp: string }[]>(() => {
    const saved = localStorage.getItem('text_drafts');
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error("Failed to parse drafts", e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('text_drafts', JSON.stringify(drafts));
  }, [drafts]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditingImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveDraft = () => {
    if (!prompt.trim()) return;
    const newDraft = {
      prompt,
      model: textModel,
      timestamp: new Date().toISOString()
    };
    setDrafts([newDraft, ...drafts]);
  };
  const [useCustomResolution, setUseCustomResolution] = useState(false);
  const [imageWidth, setImageWidth] = useState(1024);
  const [imageHeight, setImageHeight] = useState(1024);
  const [textModel, setTextModel] = useState('gemini-3.1-pro-preview');
  const [textSystemInstruction, setTextSystemInstruction] = useState('');
  const [codeModel, setCodeModel] = useState('gemini-3.1-pro-preview');
  const [imageModel, setImageModel] = useState('gemini-2.5-flash-image');
  const [videoModel, setVideoModel] = useState('veo-3.1-fast-generate-preview');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user && auth) {
    return <Login />;
  }

  const imageStyles = [
    { id: 'none', label: 'No Style' },
    { id: 'photorealistic', label: 'Photorealistic' },
    { id: 'cartoon', label: 'Cartoon' },
    { id: 'oil-painting', label: 'Oil Painting' },
    { id: 'digital-art', label: 'Digital Art' },
    { id: 'sketch', label: 'Sketch' },
    { id: 'watercolor', label: 'Watercolor' },
    { id: 'cyberpunk', label: 'Cyberpunk' },
    { id: 'anime', label: 'Anime' },
    { id: '3d-render', label: '3D Render' }
  ];

  const videoLoadingMessages = [
    "Initializing Veo video engine...",
    "Analyzing your prompt for cinematic details...",
    "Generating keyframes and motion paths...",
    "Rendering high-definition video frames...",
    "Applying lighting and texture effects...",
    "Finalizing your masterpiece...",
    "Almost there! Just a few more seconds..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && activeModality === 'video') {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % videoLoadingMessages.length);
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [loading, activeModality]);

  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'prompts'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prompts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedPrompt[];
      setSavedPrompts(prompts);
    }, (error) => {
      console.error("Firestore Error: ", error);
    });

    return () => unsubscribe();
  }, [user]);

  const isCustomResolutionValid = !useCustomResolution || (imageWidth >= 256 && imageWidth <= 2048 && imageHeight >= 256 && imageHeight <= 2048);

  const handleGenerate = async () => {
    if (!prompt.trim() || !isCustomResolutionValid || !user || !db) return;
    setLoading(true);
    setResult(null);
    setLoadingMessageIndex(0);
    try {
      let output: string | null = null;
      if (activeModality === 'text') output = await generateText(prompt, textModel, textSystemInstruction);
      else if (activeModality === 'code') output = await generateCode(prompt, codeModel, codeLanguage, codeComplexity);
      else if (activeModality === 'image') {
        const styleSuffix = imageStyle !== 'none' ? `, in ${imageStyle} style` : '';
        const finalPrompt = `${prompt}${styleSuffix}`;
        output = await generateImage(
          finalPrompt, 
          imageModel,
          imageSize, 
          imageQuality, 
          useCustomResolution ? 'custom' : imageAspectRatio,
          imageWidth,
          imageHeight
        );
      }
      else if (activeModality === 'video') output = await generateVideo(prompt, videoModel, videoAspectRatio, videoResolution);
      
      setResult(output);

      // Save to history (Firestore)
      await addDoc(collection(db, 'prompts'), {
        uid: user.uid,
        title: prompt.slice(0, 30) + (prompt.length > 30 ? '...' : ''),
        content: prompt,
        modality: activeModality,
        result: output,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Generation failed', err);
      setResult('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const deletePrompt = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'prompts', id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const loadPrompt = (p: SavedPrompt) => {
    setActiveModality(p.modality);
    setPrompt(p.content);
    if (p.result) {
      setResult(p.result);
    } else {
      setResult(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMedia = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareImage = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Generated AI Image',
          text: 'Check out this image I generated with PromptFlow AI!',
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(url);
      alert('Link copied to clipboard for sharing!');
    }
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    history: true,
    drafts: false,
    textTemplates: false,
    codeTemplates: false,
    imageTemplates: false,
    videoTemplates: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredHistory = savedPrompts.filter(p => {
    if (!p) return false;
    const matchesModality = historyFilter === 'all' || p.modality === historyFilter;
    const content = p.content || '';
    const title = p.title || '';
    const matchesSearch = content.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesModality && matchesSearch;
  });

  const modalities = [
    { id: 'text', icon: MessageSquare, label: 'Text Generation', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'code', icon: Code, label: 'Code Gen', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'image', icon: ImageIcon, label: 'Image Gen', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'video', icon: Video, label: 'Video Gen', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  const staticTemplates: Record<Modality, { title: string; prompt: string }[]> = {
    text: [
      { title: "Summarize Text", prompt: "Summarize the following text into a concise bulleted list of key takeaways:\n\n[Paste text here]" },
      { title: "Creative Story", prompt: "Write a short science fiction story about a robot discovering a forgotten garden on a desolate planet." },
      { title: "Email Draft", prompt: "Draft a professional email to a client explaining a slight delay in the project timeline while offering a solution." },
      { title: "Explain Concept", prompt: "Explain the concept of 'Quantum Entanglement' to a 10-year-old using simple analogies." },
      { title: "Product Concept Generator", prompt: "Generate 3 innovative product concepts for a [Target Audience, e.g., busy parents] in the [Industry, e.g., kitchenware] space. For each concept, include: 1. Product Name, 2. Key Features, 3. Unique Value Proposition, and 4. Target Problem Solved." }
    ],
    code: [
      { title: "React Component", prompt: "Create a responsive React component for a user profile card using Tailwind CSS. Include an avatar, name, bio, and social links." },
      { title: "Python Script", prompt: "Write a Python script that scrapes the latest headlines from a news website and saves them to a CSV file." },
      { title: "Python Sum Function", prompt: "Write a Python function that takes a list of numbers as input and returns their sum. Include type hints and a simple example usage." },
      { title: "SQL Query", prompt: "Write a SQL query to find the top 5 customers by total order value in the last 30 days, joining the 'customers' and 'orders' tables." },
      { title: "Unit Test", prompt: "Write a Jest unit test for a function that calculates the Fibonacci sequence up to 'n' terms, handling edge cases." }
    ],
    image: [
      { title: "Cyberpunk City", prompt: "A hyper-realistic cyberpunk city at night with neon signs, flying vehicles, and rain-slicked streets, 8k resolution, cinematic lighting." },
      { title: "Minimalist Logo", prompt: "A minimalist, modern logo for a sustainable tech company featuring a stylized leaf and a circuit pattern, vector style, white background." },
      { title: "Oil Painting", prompt: "An impressionist oil painting of a sun-drenched lavender field in Provence at sunset, thick brushstrokes, vibrant colors." },
      { title: "3D Character", prompt: "A cute, stylized 3D character of a baby dragon sitting on a pile of gold coins, Pixar style, soft lighting, high detail." }
    ],
    video: [
      { title: "Drone Shot", prompt: "A cinematic drone shot flying over a misty pine forest at sunrise, revealing a hidden lake, 4k, smooth motion." },
      { title: "Time-lapse", prompt: "A high-speed time-lapse of a flower blooming in a dark room with a single spotlight, dramatic shadows." },
      { title: "Abstract Motion", prompt: "Abstract fluid motion of liquid gold and silver swirling together in zero gravity, macro shot, elegant." },
      { title: "City Traffic", prompt: "A fast-paced time-lapse of city traffic at night, long exposure light trails, urban energy." }
    ]
  };

  const templates = {
    text: [...staticTemplates.text, ...userTemplates.text],
    code: [...staticTemplates.code, ...userTemplates.code],
    image: [...staticTemplates.image, ...userTemplates.image],
    video: [...staticTemplates.video, ...userTemplates.video],
  };

  const handleSaveTemplate = () => {
    if (!prompt.trim()) return;
    const title = window.prompt("Enter a title for this template:");
    if (!title) return;

    setUserTemplates(prev => ({
      ...prev,
      [activeModality]: [...prev[activeModality], { title, prompt }]
    }));
    setShowTemplates(true);
  };

  const handleDeleteTemplate = (modality: Modality, index: number) => {
    setUserTemplates(prev => ({
      ...prev,
      [modality]: prev[modality].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 300 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="border-r border-white/10 bg-[#0F0F0F] flex flex-col overflow-hidden"
      >
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">PromptFlow</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Quick Tools */}
          <div className="space-y-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2">Quick Tools</h2>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-sm font-medium text-white/70 group-hover:text-white">Upload & Edit</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </button>
          </div>

          {/* History Section */}
          <div>
            <button 
              onClick={() => toggleSection('history')}
              className="w-full flex items-center justify-between mb-2 px-2 py-1 hover:bg-white/5 rounded-lg transition-colors group"
            >
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/40 flex items-center gap-2">
                <History className="w-3 h-3" /> History
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setPrompt(''); setResult(null); }}
                  className="p-1 hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Plus className="w-3 h-3 text-white/40" />
                </button>
                <ChevronRight className={cn("w-3 h-3 text-white/20 transition-transform", openSections.history && "rotate-90")} />
              </div>
            </button>

            {openSections.history && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {/* Search Bar */}
                <div className="px-2 mb-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search history..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded-md transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-white/20" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="flex gap-1 mb-4 px-2 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setHistoryFilter('all')}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap",
                      historyFilter === 'all' ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
                    )}
                  >
                    All
                  </button>
                  {modalities.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setHistoryFilter(m.id as Modality)}
                      className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap flex items-center gap-1",
                        historyFilter === m.id ? cn(m.bg, m.color) : "text-white/30 hover:text-white/50"
                      )}
                    >
                      <m.icon className="w-2.5 h-2.5" />
                      {m.label.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  {filteredHistory.length === 0 ? (
                    <p className="text-[10px] text-white/20 px-2 py-4 text-center italic">No history yet</p>
                  ) : (
                    filteredHistory.map((p) => (
                      <div 
                        key={p.id}
                        className="group flex flex-col gap-2 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/10"
                        onClick={() => loadPrompt(p)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", 
                            p.modality === 'text' ? 'bg-blue-500' : 
                            p.modality === 'code' ? 'bg-emerald-500' : 
                            p.modality === 'image' ? 'bg-purple-500' : 'bg-orange-500'
                          )} />
                          <span className="text-sm text-white/70 truncate flex-1 font-medium">{p.title}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deletePrompt(p.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        
                        {p.result && (p.modality === 'image' || p.modality === 'video') && (
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/40 border border-white/5">
                            {p.modality === 'image' ? (
                              <img 
                                src={p.result} 
                                alt={p.title} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <video 
                                src={p.result} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                              {p.modality === 'image' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingImage(p.result!);
                                  }}
                                  className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 hover:bg-black/70 transition-colors"
                                  title="Edit Image"
                                >
                                  <Sliders className="w-3 h-3 text-white" />
                                </button>
                              )}
                              <div className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 hover:bg-black/70 transition-colors">
                                <Maximize2 className="w-3 h-3 text-white" />
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadMedia(p.result!, p.modality === 'image' ? 'downloaded-image.png' : 'downloaded-video.mp4');
                                }}
                                className="p-1.5 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 hover:bg-black/70 transition-colors"
                                title="Download"
                              >
                                <Download className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Drafts Section */}
          <div>
            <button 
              onClick={() => toggleSection('drafts')}
              className="w-full flex items-center justify-between mb-2 px-2 py-1 hover:bg-white/5 rounded-lg transition-colors group"
            >
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Bookmark className="w-3 h-3" /> Drafts
              </h2>
              <ChevronRight className={cn("w-3 h-3 text-white/20 transition-transform", openSections.drafts && "rotate-90")} />
            </button>

            {openSections.drafts && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1"
              >
                {drafts.length === 0 ? (
                  <p className="text-[10px] text-white/20 px-2 py-4 text-center italic">No drafts yet</p>
                ) : (
                  drafts.map((d, i) => (
                    <div 
                      key={i}
                      className="group flex flex-col gap-1 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/10"
                      onClick={() => {
                        setPrompt(d.prompt);
                        setTextModel(d.model);
                        setActiveModality('text');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70 truncate font-medium">{d.prompt}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDrafts(drafts.filter((_, idx) => idx !== i)); }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase tracking-tighter">
                          {d.model.split('-').slice(1, 3).join(' ')}
                        </span>
                        <span className="text-[9px] text-white/20">
                          {new Date(d.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </div>

            <div className="pt-4 border-t border-white/5 space-y-2">
              <button 
                onClick={() => setView('playground')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all border",
                  view === 'playground' 
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-400" 
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                )}
              >
                <LayoutTemplate className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Playground</span>
              </button>
              <button 
                onClick={() => setView('analytics')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all border",
                  view === 'analytics' 
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-400" 
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                )}
              >
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Analytics</span>
              </button>
            </div>

          {/* Template Sections */}
          {modalities.map((m) => (
            <div key={m.id} className="pt-2">
              <button 
                onClick={() => toggleSection(`${m.id}Templates`)}
                className="w-full flex items-center justify-between px-2 py-1 hover:bg-white/5 rounded-lg transition-colors group"
              >
                <h2 className="text-xs font-medium uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <m.icon className="w-3 h-3" /> {m.label.split(' ')[0]} Templates
                </h2>
                <ChevronRight className={cn("w-3 h-3 text-white/20 transition-transform", openSections[`${m.id}Templates`] && "rotate-90")} />
              </button>

              {openSections[`${m.id}Templates`] && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2 space-y-1"
                >
                  {templates[m.id as Modality].map((template, idx) => {
                    const isUserTemplate = idx >= staticTemplates[m.id as Modality].length;
                    const userIdx = idx - staticTemplates[m.id as Modality].length;
                    
                    return (
                      <div key={template.title + idx} className="relative group/item">
                        <button
                          onClick={() => {
                            setActiveModality(m.id as Modality);
                            setPrompt(template.prompt);
                            setResult(null);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                        >
                          <p className="text-xs font-medium text-white/60 group-hover/item:text-white transition-colors truncate pr-6">
                            {template.title}
                          </p>
                          <p className="text-[10px] text-white/20 line-clamp-1 group-hover/item:text-white/40">
                            {template.prompt}
                          </p>
                        </button>
                        {isUserTemplate && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(m.id as Modality, userIdx);
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500/10 hover:bg-red-500/20 rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 space-y-3">
          {!auth && (
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-orange-400">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Guest Mode</span>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">
                Firebase is not configured. Add keys in Settings to enable cloud sync and auth.
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
              {user?.email?.[0].toUpperCase() || <UserIcon className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
            </div>
            <button 
              onClick={() => logout()}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-white/20 hover:text-red-500"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition-all group"
          >
            <SettingsIcon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
            <span className="text-xs font-bold uppercase tracking-widest">Settings</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-b from-[#0A0A0A] to-[#111] overflow-hidden">
        {view === 'analytics' ? (
          <div className="flex-1 overflow-y-auto">
            <Dashboard />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 backdrop-blur-xl bg-black/20 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronRight className={cn("w-5 h-5 transition-transform", sidebarOpen && "rotate-180")} />
            </button>
            <div className="flex gap-1">
              {modalities.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveModality(m.id as Modality)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                    activeModality === m.id 
                      ? cn(m.bg, m.color, "ring-1 ring-inset ring-white/10") 
                      : "text-white/40 hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
              Gemini 3.1 Pro
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {!result && !loading ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-8"
              >
                <div className="relative">
                  <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl rounded-full" />
                  <Sparkles className="w-16 h-16 text-emerald-500 relative" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-bold tracking-tight">What shall we build today?</h2>
                  <p className="text-white/40 max-w-md mx-auto">
                    Select a modality above and enter your prompt below to generate high-quality AI content.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                  {templates[activeModality].map((template) => (
                    <button
                      key={template.title}
                      onClick={() => setPrompt(template.prompt)}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-left transition-all group"
                    >
                      <p className="text-sm font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">{template.title}</p>
                      <p className="text-xs text-white/40 line-clamp-2">{template.prompt}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8 pb-32"
              >
                {/* Prompt Display */}
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 shrink-0" />
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none max-w-2xl markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{prompt}</ReactMarkdown>
                  </div>
                </div>

                {/* Result Display */}
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-black" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-4">
                    {loading ? (
                      <div className="flex flex-col gap-3 text-white/40">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm animate-pulse">
                            {activeModality === 'video' 
                              ? videoLoadingMessages[loadingMessageIndex] 
                              : "Thinking..."}
                          </span>
                        </div>
                        {activeModality === 'video' && (
                          <p className="text-[10px] text-white/20 ml-8">
                            Video generation typically takes 1-3 minutes. Please stay on this page.
                          </p>
                        )}
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 p-6 rounded-2xl rounded-tl-none relative group/result"
                      >
                        <div className="absolute right-4 top-4 opacity-0 group-hover/result:opacity-100 transition-opacity flex gap-2">
                          {(activeModality === 'text' || activeModality === 'code') && (
                            <button 
                              onClick={() => copyToClipboard(result || '')}
                              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg border border-white/10 transition-all"
                              title="Copy to clipboard"
                            >
                              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          )}
                          {(activeModality === 'image' || activeModality === 'video') && (
                            <button 
                              onClick={() => downloadMedia(result!, `generated-${activeModality}`)}
                              className="p-2 bg-black/50 hover:bg-black/70 rounded-lg border border-white/10 transition-all"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {activeModality === 'text' || activeModality === 'code' ? (
                          <div className="markdown-body">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                pre({ children }) {
                                  return <>{children}</>;
                                },
                                code({ node, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeString = String(children).replace(/\n$/, '');
                                  return match ? (
                                    <CodeBlock language={match[1]} value={codeString} model={textModel} />
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {result || ''}
                            </ReactMarkdown>
                          </div>
                        ) : activeModality === 'image' ? (
                          <div className="space-y-4">
                            <div className="group/img-card relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl transition-all hover:border-emerald-500/50">
                              <img 
                                src={result!} 
                                alt="Generated" 
                                className="w-full h-auto max-h-[70vh] object-contain transition-transform duration-500 group-hover/img-card:scale-[1.02]" 
                                referrerPolicy="no-referrer" 
                              />
                              
                              {/* Overlay Actions (Quick Access) */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img-card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => setEditingImage(result)}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 transition-all hover:scale-110"
                                    title="Edit Image"
                                  >
                                    <Sliders className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => window.open(result!, '_blank')}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 transition-all hover:scale-110"
                                    title="Open in new tab"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => shareImage(result!)}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 transition-all hover:scale-110"
                                    title="Share"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Persistent Action Bar */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">Image Generated</p>
                                  <p className="text-xs text-white/40">Ready for download</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setEditingImage(result)}
                                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-medium transition-all flex items-center gap-2"
                                >
                                  <Sliders className="w-4 h-4" />
                                  Edit
                                </button>
                                <button 
                                  onClick={() => shareImage(result!)}
                                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-medium transition-all flex items-center gap-2"
                                >
                                  <Share2 className="w-4 h-4" />
                                  Share
                                </button>
                                <button 
                                  onClick={() => downloadMedia(result!, 'generated-image.png')}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                >
                                  <Download className="w-4 h-4" />
                                  Download Image
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className={cn(
                              "group/video-card relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl transition-all hover:border-orange-500/50 mx-auto",
                              videoAspectRatio === '16:9' ? "aspect-video w-full" : "aspect-[9/16] h-[60vh] max-w-[35vh]"
                            )}>
                              <VideoPlayer 
                                src={result!} 
                                className="w-full h-full"
                                autoPlay
                                loop
                              />
                              <button 
                                onClick={() => downloadMedia(result!, 'generated-video.mp4')}
                                className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl text-white opacity-0 group-hover/video-card:opacity-100 transition-all hover:bg-orange-500 hover:text-black hover:border-orange-500 shadow-xl"
                                title="Download Video"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Persistent Action Bar */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                  <Video className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold">Video Generated</p>
                                  <p className="text-xs text-white/40">Ready for playback & download</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => window.open(result!, '_blank')}
                                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-medium transition-all flex items-center gap-2"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Open
                                </button>
                                <button 
                                  onClick={() => downloadMedia(result!, 'generated-video.mp4')}
                                  className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                                >
                                  <Download className="w-4 h-4" />
                                  Download Video
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent">
          <div className="max-w-4xl mx-auto relative">
            <AnimatePresence>
              {showPromptBuilder && activeModality === 'image' && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-4 left-0 right-0 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-6 z-20"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-purple-400">
                      <Sparkles className="w-4 h-4" />
                      Image Prompt Builder
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setImageStyle('none');
                          setImageSubject('');
                          setPrompt('');
                          setImageAspectRatio('1:1');
                          setImageQuality('standard');
                        }}
                        className="text-[10px] text-white/40 hover:text-white transition-colors uppercase font-bold tracking-widest px-2 py-1"
                      >
                        Reset
                      </button>
                      <button onClick={() => setShowPromptBuilder(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Model Selection</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash', desc: 'Standard generation' },
                            { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash', desc: 'High quality preview' },
                            { id: 'stable-diffusion', label: 'Stable Diffusion', desc: 'Stability AI XL' }
                          ].map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setImageModel(model.id);
                                if (model.id === 'gemini-2.5-flash-image') {
                                  setImageQuality('standard');
                                } else {
                                  setImageQuality('HD');
                                }
                              }}
                              className={cn(
                                "px-4 py-3 rounded-xl text-left transition-all border flex flex-col gap-0.5",
                                imageModel === model.id 
                                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-lg shadow-purple-500/10" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                              )}
                            >
                              <span className="text-sm font-bold">{model.label}</span>
                              <span className="text-[10px] font-medium opacity-60">{model.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Subject</label>
                        <input
                          type="text"
                          value={imageSubject}
                          onChange={(e) => {
                            setImageSubject(e.target.value);
                            setPrompt(e.target.value);
                          }}
                          placeholder="What do you want to see?"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Style</label>
                        <div className="grid grid-cols-2 gap-2">
                          {imageStyles.map((style) => (
                            <button
                              key={style.id}
                              onClick={() => setImageStyle(style.id)}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-medium transition-all border text-left",
                                imageStyle === style.id 
                                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                              )}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Aspect Ratio</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['1:1', '16:9', '9:16', 'custom'].map((ratio) => (
                            <button
                              key={ratio}
                              onClick={() => {
                                if (ratio === 'custom') {
                                  setUseCustomResolution(true);
                                } else {
                                  setUseCustomResolution(false);
                                  setImageAspectRatio(ratio as any);
                                }
                              }}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                                (useCustomResolution ? ratio === 'custom' : imageAspectRatio === ratio)
                                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                              )}
                            >
                              {ratio.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        
                        {useCustomResolution && (
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-1">
                              <span className="text-[10px] text-white/20 uppercase">Width (px)</span>
                              <input
                                type="number"
                                value={imageWidth}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setImageWidth(isNaN(val) ? 0 : val);
                                }}
                                min={256}
                                max={2048}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-white/20 uppercase">Height (px)</span>
                              <input
                                type="number"
                                value={imageHeight}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  setImageHeight(isNaN(val) ? 0 : val);
                                }}
                                min={256}
                                max={2048}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                              />
                            </div>
                            {(imageWidth < 256 || imageWidth > 2048 || imageHeight < 256 || imageHeight > 2048) && (
                              <p className="col-span-2 text-[10px] text-red-400 italic">
                                * Recommended range: 256px - 2048px
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Quality</label>
                        <div className="flex gap-2">
                          {['standard', 'HD'].map((q) => (
                            <button
                              key={q}
                              onClick={() => setImageQuality(q as any)}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                                imageQuality === q 
                                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                              )}
                            >
                              {q.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Size</label>
                        <div className="flex gap-2">
                          {['512px', '1K', '2K'].map((s) => (
                            <button
                              key={s}
                              onClick={() => setImageSize(s as any)}
                              className={cn(
                                "flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                                imageSize === s 
                                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {showPromptBuilder && activeModality === 'text' && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-4 left-0 right-0 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-6 z-20"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-blue-400">
                      <MessageSquare className="w-4 h-4" />
                      Text Prompt Builder
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setTextModel('gemini-3.1-pro-preview');
                          setTextSystemInstruction('');
                        }}
                        className="text-[10px] text-white/40 hover:text-white transition-colors uppercase font-bold tracking-widest px-2 py-1"
                      >
                        Reset
                      </button>
                      <button onClick={() => setShowPromptBuilder(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Model Selection</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'gemini-3.1-flash-preview', label: 'Gemini 3.1 Flash', desc: 'Fast & efficient' },
                          { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', desc: 'Complex reasoning' },
                          { id: 'gpt-4o', label: 'GPT-4o', desc: 'OpenAI Flagship' },
                          { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Fast & Cheap' }
                        ].map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setTextModel(model.id)}
                            className={cn(
                              "px-4 py-3 rounded-xl text-left transition-all border flex flex-col gap-0.5",
                              textModel === model.id 
                                ? "bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/10" 
                                : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                            )}
                          >
                            <span className="text-sm font-bold">{model.label}</span>
                            <span className="text-[10px] font-medium opacity-60">{model.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">System Instruction (Optional)</label>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setTextSystemInstruction("You are a world-class creative writer. Your goal is to produce evocative, imaginative, and emotionally resonant prose. Use rich metaphors, vivid sensory details, and compelling narrative structures. Focus on storytelling and atmosphere.")}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-bold uppercase tracking-widest px-2 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20"
                          >
                            Creative Writing
                          </button>
                          <span className="text-[10px] text-white/20 italic">Advanced Users</span>
                        </div>
                      </div>
                      <textarea
                        value={textSystemInstruction}
                        onChange={(e) => setTextSystemInstruction(e.target.value)}
                        placeholder="e.g., You are a helpful assistant that speaks like a pirate..."
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                      />
                      <p className="text-[10px] text-white/20">
                        System instructions set the behavior, tone, and constraints for the AI across the entire conversation.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {showPromptBuilder && activeModality === 'video' && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-4 left-0 right-0 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-6 z-20"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-orange-400">
                      <Sparkles className="w-4 h-4" />
                      Video Prompt Builder
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setVideoAspectRatio('16:9');
                          setVideoResolution('720p');
                          setVideoModel('veo-3.1-fast-generate-preview');
                        }}
                        className="text-[10px] text-white/40 hover:text-white transition-colors uppercase font-bold tracking-widest px-2 py-1"
                      >
                        Reset
                      </button>
                      <button onClick={() => setShowPromptBuilder(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Model Selection</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast', desc: 'Quick generation' },
                          { id: 'veo-3.1-generate-preview', label: 'Veo 3.1 High', desc: 'Highest quality' }
                        ].map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setVideoModel(model.id)}
                            className={cn(
                              "px-4 py-3 rounded-xl text-left transition-all border flex flex-col gap-0.5",
                              videoModel === model.id 
                                ? "bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-lg shadow-orange-500/10" 
                                : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                            )}
                          >
                            <span className="text-sm font-bold">{model.label}</span>
                            <span className="text-[10px] font-medium opacity-60">{model.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Resolution</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['720p', '1080p'].map((res) => (
                            <button
                              key={res}
                              onClick={() => setVideoResolution(res as any)}
                              className={cn(
                                "px-4 py-3 rounded-xl text-sm font-bold transition-all border flex flex-col items-center gap-1",
                                videoResolution === res 
                                  ? "bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-lg shadow-orange-500/10" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                              )}
                            >
                              <span>{res}</span>
                              <span className="text-[10px] font-medium opacity-60">
                                {res === '720p' ? 'Standard HD' : 'Full HD'}
                              </span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-white/20 mt-2 italic">
                          * 1080p generation may take longer to process.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Aspect Ratio</label>
                        <div className="flex gap-2">
                          {[
                            { id: '16:9', label: 'Landscape', sub: '16:9' },
                            { id: '9:16', label: 'Portrait', sub: '9:16' }
                          ].map((ratio) => (
                            <button
                              key={ratio.id}
                              onClick={() => setVideoAspectRatio(ratio.id as any)}
                              className={cn(
                                "flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all border flex flex-col items-center gap-1",
                                videoAspectRatio === ratio.id 
                                  ? "bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-lg shadow-orange-500/10" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                              )}
                            >
                              <span>{ratio.label}</span>
                              <span className="text-[10px] font-medium opacity-60">{ratio.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {showPromptBuilder && activeModality === 'code' && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-4 left-0 right-0 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-6 z-20"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                      <Terminal className="w-4 h-4" />
                      Code Prompt Builder
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setCodeLanguage('javascript');
                          setCodeComplexity('intermediate');
                          setCodeModel('gemini-3.1-pro-preview');
                        }}
                        className="text-[10px] text-white/40 hover:text-white transition-colors uppercase font-bold tracking-widest px-2 py-1"
                      >
                        Reset
                      </button>
                      <button onClick={() => setShowPromptBuilder(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Model Selection</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'gemini-3.1-flash-preview', label: 'Gemini 3.1 Flash', desc: 'Fast & efficient' },
                          { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', desc: 'Complex reasoning' },
                          { id: 'gpt-4o', label: 'GPT-4o', desc: 'OpenAI Power' }
                        ].map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setCodeModel(model.id)}
                            className={cn(
                              "px-4 py-3 rounded-xl text-left transition-all border flex flex-col gap-0.5",
                              codeModel === model.id 
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10" 
                                : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                            )}
                          >
                            <span className="text-sm font-bold">{model.label}</span>
                            <span className="text-[10px] font-medium opacity-60">{model.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Language</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'javascript', label: 'JavaScript' },
                            { id: 'typescript', label: 'TypeScript' },
                            { id: 'python', label: 'Python' },
                            { id: 'java', label: 'Java' },
                            { id: 'cpp', label: 'C++' },
                            { id: 'go', label: 'Go' }
                          ].map((lang) => (
                            <button
                              key={lang.id}
                              onClick={() => setCodeLanguage(lang.id)}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                                codeLanguage === lang.id 
                                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                              )}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Complexity</label>
                        <div className="flex flex-col gap-2">
                          {[
                            { id: 'beginner', label: 'Beginner', desc: 'Simple, well-commented code' },
                            { id: 'intermediate', label: 'Intermediate', desc: 'Standard patterns & best practices' },
                            { id: 'advanced', label: 'Advanced', desc: 'Optimized, complex architectures' }
                          ].map((comp) => (
                            <button
                              key={comp.id}
                              onClick={() => setCodeComplexity(comp.id)}
                              className={cn(
                                "w-full px-4 py-3 rounded-xl text-left transition-all border flex flex-col gap-0.5",
                                codeComplexity === comp.id 
                                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/10" 
                                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                              )}
                            >
                              <span className="text-sm font-bold">{comp.label}</span>
                              <span className="text-[10px] font-medium opacity-60">{comp.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {showTemplates && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full mb-4 left-0 right-0 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl p-6 z-20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-emerald-500" />
                      {activeModality.charAt(0).toUpperCase() + activeModality.slice(1)} Templates
                    </h3>
                    <button onClick={() => setShowTemplates(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!prompt.trim()}
                      className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-left transition-all group flex flex-col items-center justify-center gap-2 border-dashed"
                    >
                      <Bookmark className="w-5 h-5 text-emerald-500" />
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Save Current Prompt</p>
                    </button>
                    {templates[activeModality].map((template, idx) => {
                      const isUserTemplate = idx >= staticTemplates[activeModality].length;
                      const userIdx = idx - staticTemplates[activeModality].length;
                      
                      return (
                        <div key={template.title + idx} className="relative group">
                          <button
                            onClick={() => {
                              setPrompt(template.prompt);
                              setShowTemplates(false);
                            }}
                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-left transition-all"
                          >
                            <p className="text-xs font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{template.title}</p>
                            <p className="text-[10px] text-white/40 line-clamp-1">{template.prompt}</p>
                          </button>
                          {isUserTemplate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(activeModality, userIdx);
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500/10 hover:bg-red-500/20 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 blur-xl rounded-2xl opacity-50" />
            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder={`Enter your ${activeModality} prompt...`}
                className="w-full bg-transparent p-4 pr-32 text-white placeholder-white/20 focus:outline-none resize-none min-h-[60px] max-h-[200px]"
                rows={1}
              />
              {activeModality === 'image' && imageStyle !== 'none' && (
                <div className="absolute left-4 bottom-2 flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    {imageStyle} style
                  </div>
                </div>
              )}
              {activeModality === 'text' && (
                <div className="absolute left-4 bottom-2 flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-2.5 h-2.5" />
                    {textModel.split('-').slice(1, 3).join(' ')}
                  </div>
                  {textSystemInstruction && (
                    <div className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sliders className="w-2.5 h-2.5" />
                      System Active
                    </div>
                  )}
                </div>
              )}
              {activeModality === 'code' && (
                <div className="absolute left-4 bottom-2 flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Terminal className="w-2.5 h-2.5" />
                    {codeLanguage}
                  </div>
                  <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    {codeComplexity}
                  </div>
                </div>
              )}
              {activeModality === 'video' && (
                <div className="absolute left-4 bottom-2 flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Maximize2 className="w-2.5 h-2.5" />
                    {videoResolution}
                  </div>
                  <div className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <LayoutTemplate className="w-2.5 h-2.5" />
                    {videoAspectRatio}
                  </div>
                </div>
              )}
              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                {activeModality === 'code' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Language</span>
                    <div className="relative">
                      <select
                        value={codeLanguage}
                        onChange={(e) => setCodeLanguage(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer w-full hover:text-emerald-400 transition-colors"
                      >
                        <option value="javascript" className="bg-[#1A1A1A]">JavaScript</option>
                        <option value="typescript" className="bg-[#1A1A1A]">TypeScript</option>
                        <option value="python" className="bg-[#1A1A1A]">Python</option>
                        <option value="java" className="bg-[#1A1A1A]">Java</option>
                        <option value="cpp" className="bg-[#1A1A1A]">C++</option>
                        <option value="go" className="bg-[#1A1A1A]">Go</option>
                        <option value="rust" className="bg-[#1A1A1A]">Rust</option>
                        <option value="php" className="bg-[#1A1A1A]">PHP</option>
                        <option value="ruby" className="bg-[#1A1A1A]">Ruby</option>
                        <option value="swift" className="bg-[#1A1A1A]">Swift</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                    </div>
                  </div>
                )}
                {activeModality === 'code' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Complexity</span>
                    <div className="relative">
                      <select
                        value={codeComplexity}
                        onChange={(e) => setCodeComplexity(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer w-full hover:text-emerald-400 transition-colors"
                      >
                        <option value="beginner" className="bg-[#1A1A1A]">Beginner</option>
                        <option value="intermediate" className="bg-[#1A1A1A]">Intermediate</option>
                        <option value="advanced" className="bg-[#1A1A1A]">Advanced</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                    </div>
                  </div>
                )}
                {activeModality === 'text' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Model</span>
                    <div className="relative">
                      <select
                        value={textModel}
                        onChange={(e) => setTextModel(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer w-full hover:text-blue-400 transition-colors"
                      >
                        <option value="gemini-3.1-flash-preview" className="bg-[#1A1A1A]">Gemini 3.1 Flash</option>
                        <option value="gemini-3.1-pro-preview" className="bg-[#1A1A1A]">Gemini 3.1 Pro</option>
                        <option value="gpt-4o" className="bg-[#1A1A1A]">GPT-4o</option>
                        <option value="gpt-4o-mini" className="bg-[#1A1A1A]">GPT-4o Mini</option>
                        <option value="gemini-3-flash-preview" className="bg-[#1A1A1A]">Gemini 3 Flash</option>
                        <option value="gemini-3.1-flash-lite-preview" className="bg-[#1A1A1A]">Gemini 3.1 Flash Lite</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                    </div>
                  </div>
                )}
                {activeModality === 'code' && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Code Model</span>
                    <div className="relative">
                      <select
                        value={codeModel}
                        onChange={(e) => setCodeModel(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer w-full hover:text-emerald-400 transition-colors"
                      >
                        <option value="gemini-3.1-pro-preview" className="bg-[#1A1A1A]">Gemini 3.1 Pro (Default)</option>
                        <option value="gemini-3.1-flash-preview" className="bg-[#1A1A1A]">Gemini 3.1 Flash</option>
                        <option value="gpt-4o" className="bg-[#1A1A1A]">GPT-4o</option>
                        <option value="gemini-3-flash-preview" className="bg-[#1A1A1A]">Gemini 3 Flash</option>
                        <option value="gemini-3.1-flash-lite-preview" className="bg-[#1A1A1A]">Gemini 3.1 Flash Lite</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                    </div>
                  </div>
                )}
                {activeModality === 'image' && (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Model</span>
                      <div className="relative">
                        <select
                          value={imageModel}
                          onChange={(e) => {
                            setImageModel(e.target.value);
                            if (e.target.value === 'gemini-2.5-flash-image') {
                              setImageQuality('standard');
                            } else {
                              setImageQuality('HD');
                            }
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer hover:text-purple-400 transition-colors"
                        >
                          <option value="gemini-2.5-flash-image" className="bg-[#1A1A1A]">Standard</option>
                          <option value="gemini-3.1-flash-image-preview" className="bg-[#1A1A1A]">HD Preview</option>
                          <option value="stable-diffusion" className="bg-[#1A1A1A]">Stable Diffusion</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Size</span>
                      <div className="relative">
                        <select
                          value={imageSize}
                          onChange={(e) => setImageSize(e.target.value as any)}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer hover:text-purple-400 transition-colors"
                        >
                          <option value="512px" className="bg-[#1A1A1A]">512px</option>
                          <option value="1K" className="bg-[#1A1A1A]">1K (HD)</option>
                          <option value="2K" className="bg-[#1A1A1A]">2K (QHD)</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Ratio</span>
                      <div className="relative">
                        <select
                          value={useCustomResolution ? 'custom' : imageAspectRatio}
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setUseCustomResolution(true);
                              setShowPromptBuilder(true);
                            } else {
                              setUseCustomResolution(false);
                              setImageAspectRatio(e.target.value as any);
                            }
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer hover:text-purple-400 transition-colors"
                        >
                          <option value="1:1" className="bg-[#1A1A1A]">1:1 Square</option>
                          <option value="16:9" className="bg-[#1A1A1A]">16:9 Wide</option>
                          <option value="9:16" className="bg-[#1A1A1A]">9:16 Tall</option>
                          <option value="custom" className="bg-[#1A1A1A]">Custom...</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
                {activeModality === 'video' && (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Model</span>
                      <div className="relative">
                        <select
                          value={videoModel}
                          onChange={(e) => setVideoModel(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer hover:text-orange-400 transition-colors"
                        >
                          <option value="veo-3.1-fast-generate-preview" className="bg-[#1A1A1A]">Veo 3.1 Fast</option>
                          <option value="veo-3.1-generate-preview" className="bg-[#1A1A1A]">Veo 3.1 High</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Ratio</span>
                      <div className="relative">
                        <select
                          value={videoAspectRatio}
                          onChange={(e) => setVideoAspectRatio(e.target.value as any)}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer hover:text-orange-400 transition-colors"
                        >
                          <option value="16:9" className="bg-[#1A1A1A]">16:9 Wide</option>
                          <option value="9:16" className="bg-[#1A1A1A]">9:16 Tall</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-white/20 uppercase font-bold tracking-wider ml-1">Res</span>
                      <div className="relative">
                        <select
                          value={videoResolution}
                          onChange={(e) => setVideoResolution(e.target.value as any)}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 pr-8 text-xs font-medium text-white/80 focus:outline-none focus:border-white/20 appearance-none cursor-pointer hover:text-orange-400 transition-colors"
                        >
                          <option value="720p" className="bg-[#1A1A1A]">720p</option>
                          <option value="1080p" className="bg-[#1A1A1A]">1080p</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
                {(activeModality === 'image' || activeModality === 'video' || activeModality === 'code' || activeModality === 'text') && (
                  <button
                    onClick={() => setShowPromptBuilder(!showPromptBuilder)}
                    className={cn(
                      "p-2 rounded-xl transition-all flex items-center gap-2 border border-white/10",
                      showPromptBuilder 
                        ? (activeModality === 'image' ? "bg-purple-500/20 text-purple-500 border-purple-500/30" : 
                           activeModality === 'video' ? "bg-orange-500/20 text-orange-500 border-orange-500/30" :
                           activeModality === 'text' ? "bg-blue-500/20 text-blue-500 border-blue-500/30" :
                           "bg-emerald-500/20 text-emerald-500 border-emerald-500/30")
                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                    )}
                    title="Prompt Builder"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                )}
                {activeModality === 'text' && (
                  <button
                    onClick={saveDraft}
                    disabled={loading || !prompt.trim()}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
                    title="Save as Draft"
                  >
                    <Bookmark className="w-5 h-5" />
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Save as Draft
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={cn(
                    "p-2 rounded-xl transition-all flex items-center gap-2 border border-white/10",
                    showTemplates ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                  )}
                  title="Templates"
                >
                  <LayoutTemplate className="w-5 h-5" />
                </button>
                <div className="text-[10px] text-white/20 font-mono mr-2 hidden sm:block">
                  {prompt.length} chars
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim() || !isCustomResolutionValid}
                  className={cn(
                    "p-2 rounded-xl transition-all flex items-center gap-2",
                    loading || !prompt.trim() || !isCustomResolutionValid
                      ? "bg-white/5 text-white/20 cursor-not-allowed" 
                      : "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  <span className="text-sm font-bold pr-1 hidden sm:inline">Generate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
        )}
      </main>

      {/* Image Editor Modal */}
      <AnimatePresence>
        {editingImage && (
          <ImageEditor
            image={editingImage}
            onSave={(editedImage) => {
              setResult(editedImage);
              setEditingImage(null);
            }}
            onCancel={() => setEditingImage(null)}
          />
        )}
      </AnimatePresence>
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Key, Shield, AlertCircle, Save, Loader2, Eye, EyeOff, User, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiKeys {
  geminiKey: string;
  openaiKey: string;
  anthropicKey: string;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'api' | 'profile'>('api');
  const [keys, setKeys] = useState<ApiKeys>({
    geminiKey: '',
    openaiKey: '',
    anthropicKey: ''
  });
  const [profile, setProfile] = useState({
    displayName: user?.displayName || '',
    photoURL: user?.photoURL || ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (isOpen && user && db) {
      loadSettings();
      setProfile({
        displayName: user.displayName || '',
        photoURL: user.photoURL || ''
      });
    }
  }, [isOpen, user]);

  const loadSettings = async () => {
    if (!user || !db) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setKeys({
          geminiKey: data.geminiKey || '',
          openaiKey: data.openaiKey || '',
          anthropicKey: data.anthropicKey || ''
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings. Check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !db) return;
    setSaving(true);
    setMessage(null);
    try {
      if (activeTab === 'api') {
        const docRef = doc(db, 'settings', user.uid);
        await setDoc(docRef, {
          ...keys,
          uid: user.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await updateProfile(profile.displayName, profile.photoURL);
      }
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Ensure you are logged in.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-xl">
                {activeTab === 'api' ? (
                  <Shield className="w-5 h-5 text-indigo-400" />
                ) : (
                  <User className="w-5 h-5 text-indigo-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {activeTab === 'api' ? 'API Settings' : 'Profile Settings'}
                </h2>
                <p className="text-xs text-white/40">
                  {activeTab === 'api' ? 'Manage your service credentials' : 'Update your personal information'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white/40" />
            </button>
          </div>

          <div className="flex border-b border-white/5">
            <button
              onClick={() => setActiveTab('api')}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'api' ? "text-indigo-400 border-indigo-500 bg-indigo-500/5" : "text-white/20 border-transparent hover:text-white/40 hover:bg-white/5"
              )}
            >
              API Keys
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                activeTab === 'profile' ? "text-indigo-400 border-indigo-500 bg-indigo-500/5" : "text-white/20 border-transparent hover:text-white/40 hover:bg-white/5"
              )}
            >
              User Profile
            </button>
          </div>

          <div className="p-6 space-y-6">
            {loading && activeTab === 'api' ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm text-white/40">Loading your settings...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeTab === 'api' ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Security Note</p>
                        <p className="text-[11px] text-amber-200/60 leading-relaxed">
                          Your keys are stored in your private Firestore document, protected by security rules. 
                          Only you can access them. For Gemini, we recommend using the platform's native key manager.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {[
                        { id: 'geminiKey', label: 'Gemini API Key', icon: Key },
                        { id: 'openaiKey', label: 'OpenAI API Key', icon: Key },
                        { id: 'anthropicKey', label: 'Anthropic API Key', icon: Key }
                      ].map((field) => (
                        <div key={field.id} className="space-y-2">
                          <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-2">
                            <field.icon className="w-3 h-3" />
                            {field.label}
                          </label>
                          <div className="relative">
                            <input
                              type={showKeys[field.id] ? 'text' : 'password'}
                              value={keys[field.id as keyof ApiKeys]}
                              onChange={(e) => setKeys({ ...keys, [field.id]: e.target.value })}
                              placeholder={`Enter your ${field.label}`}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all pr-12"
                            />
                            <button
                              onClick={() => toggleShowKey(field.id)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                            >
                              {showKeys[field.id] ? (
                                <EyeOff className="w-4 h-4 text-white/40" />
                              ) : (
                                <Eye className="w-4 h-4 text-white/40" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-3xl bg-indigo-500/20 border-2 border-dashed border-indigo-500/40 flex items-center justify-center overflow-hidden">
                          {profile.photoURL ? (
                            <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-10 h-10 text-indigo-400" />
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl cursor-pointer">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <p className="text-[10px] text-white/20 uppercase font-bold tracking-widest">Click to change avatar</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Display Name</label>
                        <input
                          type="text"
                          value={profile.displayName}
                          onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                          placeholder="Your full name"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Avatar URL</label>
                        <input
                          type="url"
                          value={profile.photoURL}
                          onChange={(e) => setProfile({ ...profile, photoURL: e.target.value })}
                          placeholder="https://example.com/avatar.jpg"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-white/40 font-bold uppercase tracking-wider ml-1">Email Address</label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/40 cursor-not-allowed"
                        />
                        <p className="text-[10px] text-white/20 italic">Email cannot be changed for security reasons.</p>
                      </div>
                    </div>
                  </div>
                )}

                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-3 rounded-xl text-xs font-medium flex items-center gap-2",
                      message.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                    )}
                  >
                    {message.text}
                  </motion.div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

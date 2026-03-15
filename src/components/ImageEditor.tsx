import React, { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Crop, Sliders, Maximize, RotateCcw, Sun, Contrast, Droplets, Palette, Ghost, Moon, Wind, Layers, Undo2, Redo2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface EditorState {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  filters: {
    brightness: number;
    contrast: number;
    saturate: number;
    'hue-rotate': number;
    invert: number;
    grayscale: number;
    sepia: number;
    blur: number;
  };
}

interface ImageEditorProps {
  image: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'crop' | 'filters' | 'resize'>('crop');
  const [isSaving, setIsSaving] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    'hue-rotate': 0,
    invert: 0,
    grayscale: 0,
    sepia: 0,
    blur: 0,
  });

  // History state
  const [history, setHistory] = useState<EditorState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoingRedoing = useRef(false);

  // Initialize history
  useEffect(() => {
    const initialState: EditorState = {
      crop: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0,
      filters: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        'hue-rotate': 0,
        invert: 0,
        grayscale: 0,
        sepia: 0,
        blur: 0,
      }
    };
    setHistory([initialState]);
    setHistoryIndex(0);
  }, []);

  const pushToHistory = useCallback((newState: EditorState) => {
    if (isUndoingRedoing.current) return;
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      // Only push if different from current
      const lastState = newHistory[newHistory.length - 1];
      if (lastState && JSON.stringify(lastState) === JSON.stringify(newState)) {
        return prev;
      }
      return [...newHistory, newState];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      isUndoingRedoing.current = true;
      const prevState = history[historyIndex - 1];
      setCrop(prevState.crop);
      setZoom(prevState.zoom);
      setRotation(prevState.rotation);
      setFilters(prevState.filters);
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => { isUndoingRedoing.current = false; }, 0);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      isUndoingRedoing.current = true;
      const nextState = history[historyIndex + 1];
      setCrop(nextState.crop);
      setZoom(nextState.zoom);
      setRotation(nextState.rotation);
      setFilters(nextState.filters);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => { isUndoingRedoing.current = false; }, 0);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
    pushToHistory({ crop, zoom, rotation, filters });
  }, [crop, zoom, rotation, filters, pushToHistory]);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
    rotation = 0,
    filters: any
  ): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Set canvas size to the cropped area size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Apply filters to the context
    ctx.filter = `
      brightness(${filters.brightness}%) 
      contrast(${filters.contrast}%) 
      saturate(${filters.saturate}%)
      hue-rotate(${filters['hue-rotate']}deg)
      invert(${filters.invert}%)
      grayscale(${filters.grayscale}%) 
      sepia(${filters.sepia}%) 
      blur(${filters.blur}px)
    `;

    // Translate and rotate for the full image
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw the image with the crop offset
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/png');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const croppedImage = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation,
        filters
      );
      if (croppedImage) {
        onSave(croppedImage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">Edit Image</h2>
          
          <div className="h-6 w-px bg-white/10 mx-2" />
          
          <div className="flex items-center gap-1">
            <button 
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent rounded-xl transition-colors"
              title="Undo"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button 
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent rounded-xl transition-colors"
              title="Redo"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black rounded-xl font-bold transition-all flex items-center gap-2"
        >
          {isSaving ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {isSaving ? 'Processing...' : 'Apply Changes'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 relative bg-black/40">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: {
                filter: `
                  brightness(${filters.brightness}%) 
                  contrast(${filters.contrast}%) 
                  saturate(${filters.saturate}%)
                  hue-rotate(${filters['hue-rotate']}deg)
                  invert(${filters.invert}%)
                  grayscale(${filters.grayscale}%) 
                  sepia(${filters.sepia}%) 
                  blur(${filters.blur}px)
                `,
              },
            }}
          />
        </div>

        {/* Controls Sidebar */}
        <div className="w-full md:w-80 border-l border-white/10 bg-[#111] p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setActiveTab('crop')}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                activeTab === 'crop' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              <Crop className="w-3.5 h-3.5" />
              Crop
            </button>
            <button
              onClick={() => setActiveTab('filters')}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                activeTab === 'filters' ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              <Sliders className="w-3.5 h-3.5" />
              Filters
            </button>
          </div>

          {activeTab === 'crop' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Zoom</label>
                  <span className="text-xs font-mono text-emerald-500">{zoom.toFixed(1)}x</span>
                </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    onMouseUp={() => pushToHistory({ crop, zoom, rotation, filters })}
                    onTouchEnd={() => pushToHistory({ crop, zoom, rotation, filters })}
                    className="w-full accent-emerald-500"
                  />
                </div>
  
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Rotation</label>
                    <span className="text-xs font-mono text-emerald-500">{rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    onMouseUp={() => pushToHistory({ crop, zoom, rotation, filters })}
                    onTouchEnd={() => pushToHistory({ crop, zoom, rotation, filters })}
                    className="w-full accent-emerald-500"
                  />
                </div>
  
                <button
                  onClick={() => {
                    const resetState = {
                      crop: { x: 0, y: 0 },
                      zoom: 1,
                      rotation: 0,
                      filters
                    };
                    setZoom(1);
                    setRotation(0);
                    setCrop({ x: 0, y: 0 });
                    pushToHistory(resetState);
                  }}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Transform
              </button>
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="space-y-6">
              {/* Dedicated sliders for common adjustments */}
              <div className="space-y-4">
                {/* Blur Control */}
                <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Wind className="w-3.5 h-3.5 text-emerald-500" />
                      <label className="text-xs font-bold text-white uppercase tracking-wider">Blur</label>
                    </div>
                    <span className="text-xs font-mono text-emerald-500">{filters.blur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    step={0.5}
                    value={filters.blur}
                    onChange={(e) => setFilters(prev => ({ ...prev, blur: Number(e.target.value) }))}
                    onMouseUp={() => pushToHistory({ crop, zoom, rotation, filters: { ...filters, blur: filters.blur } })}
                    onTouchEnd={() => pushToHistory({ crop, zoom, rotation, filters: { ...filters, blur: filters.blur } })}
                    className="w-full accent-emerald-500"
                  />
                </div>
  
                {/* Hue Rotate Control */}
                <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Palette className="w-3.5 h-3.5 text-emerald-500" />
                      <label className="text-xs font-bold text-white uppercase tracking-wider">Hue Rotate</label>
                    </div>
                    <span className="text-xs font-mono text-emerald-500">{filters['hue-rotate']}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={filters['hue-rotate']}
                    onChange={(e) => setFilters(prev => ({ ...prev, 'hue-rotate': Number(e.target.value) }))}
                    onMouseUp={() => pushToHistory({ crop, zoom, rotation, filters: { ...filters, 'hue-rotate': filters['hue-rotate'] } })}
                    onTouchEnd={() => pushToHistory({ crop, zoom, rotation, filters: { ...filters, 'hue-rotate': filters['hue-rotate'] } })}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
  
              <div className="space-y-4">
                {Object.entries(filters).filter(([key]) => key !== 'blur' && key !== 'hue-rotate').map(([key, value]) => {
                  let min = 0;
                  let max = 200;
                  let unit = '%';
                  let Icon = Sliders;
  
                  if (key === 'brightness') Icon = Sun;
                  else if (key === 'contrast') Icon = Contrast;
                  else if (key === 'saturate') Icon = Droplets;
                  else if (key === 'invert') Icon = Ghost;
                  else if (key === 'grayscale') Icon = Moon;
                  else if (key === 'sepia') Icon = Layers;
  
                  if (key === 'invert' || key === 'grayscale' || key === 'sepia') {
                    max = 100;
                  }
  
                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-white/40" />
                          <label className="text-xs font-bold text-white/40 uppercase tracking-wider capitalize">{key.replace('-', ' ')}</label>
                        </div>
                        <span className="text-xs font-mono text-emerald-500">{value}{unit}</span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => setFilters(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                        onMouseUp={() => pushToHistory({ crop, zoom, rotation, filters: { ...filters, [key]: Number(value) } })}
                        onTouchEnd={() => pushToHistory({ crop, zoom, rotation, filters: { ...filters, [key]: Number(value) } })}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  );
                })}
              </div>
              
              <button
                onClick={() => {
                  const resetFilters = {
                    brightness: 100,
                    contrast: 100,
                    saturate: 100,
                    'hue-rotate': 0,
                    invert: 0,
                    grayscale: 0,
                    sepia: 0,
                    blur: 0,
                  };
                  setFilters(resetFilters);
                  pushToHistory({ crop, zoom, rotation, filters: resetFilters });
                }}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

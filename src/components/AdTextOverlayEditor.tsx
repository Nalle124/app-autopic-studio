import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Move, Type, X, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { AdTemplate, TextSlot } from '@/data/adTemplates';

interface TextElement {
  id: string;
  label: string;
  text: string;
  x: number; // percentage
  y: number; // percentage
  fontSize: number;
  fontWeight: string;
  color: string;
  fontFamily: string;
  maxWidth?: number;
  textAlign?: CanvasTextAlign;
}

interface AdTextOverlayEditorProps {
  backgroundImageUrl: string;
  template: AdTemplate;
  userTexts?: Record<string, string>; // slot id -> user text
  onClose: () => void;
  onExport?: (dataUrl: string, name: string) => void;
}

export const AdTextOverlayEditor = ({
  backgroundImageUrl,
  template,
  userTexts = {},
  onClose,
  onExport,
}: AdTextOverlayEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<TextElement[]>(() =>
    template.textSlots.map((slot) => ({
      ...slot,
      text: userTexts[slot.id] || slot.defaultText,
    }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Load background image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBgImage(img);
    };
    img.src = backgroundImageUrl;
  }, [backgroundImageUrl]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to image dimensions
    canvas.width = bgImage.naturalWidth;
    canvas.height = bgImage.naturalHeight;

    // Draw background
    ctx.drawImage(bgImage, 0, 0);

    // Draw text elements
    for (const el of elements) {
      if (!el.text) continue;

      const x = (el.x / 100) * canvas.width;
      const y = (el.y / 100) * canvas.height;
      const scaledFontSize = (el.fontSize / 1024) * canvas.width; // Scale font relative to canvas width
      const maxW = el.maxWidth ? (el.maxWidth / 100) * canvas.width : canvas.width * 0.9;

      ctx.save();
      ctx.font = `${el.fontWeight} ${scaledFontSize}px ${el.fontFamily}, sans-serif`;
      ctx.fillStyle = el.color;
      ctx.textAlign = el.textAlign || 'center';
      ctx.textBaseline = 'middle';

      // Text shadow for readability
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = scaledFontSize * 0.1;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = scaledFontSize * 0.05;

      // Word wrap
      const words = el.text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxW && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = scaledFontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = y - totalHeight / 2 + lineHeight / 2;

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, startY + i * lineHeight);
      }

      // Draw selection indicator
      if (selectedId === el.id) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
        const pad = scaledFontSize * 0.3;
        const rectX = el.textAlign === 'center' ? x - textWidth / 2 - pad :
                      el.textAlign === 'right' ? x - textWidth - pad : x - pad;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(rectX, startY - lineHeight / 2 - pad, textWidth + pad * 2, totalHeight + pad * 2);
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }, [bgImage, elements, selectedId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle canvas click for selection
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check if click is on any element (rough hit test)
    let found: string | null = null;
    for (const el of [...elements].reverse()) {
      if (!el.text) continue;
      const elX = (el.x / 100) * canvas.width;
      const elY = (el.y / 100) * canvas.height;
      const scaledFontSize = (el.fontSize / 1024) * canvas.width;
      const hitSize = scaledFontSize * 2;
      if (Math.abs(clickX - elX) < hitSize && Math.abs(clickY - elY) < hitSize) {
        found = el.id;
        break;
      }
    }
    setSelectedId(found);
    setEditingId(null);
  };

  // Handle canvas drag for repositioning
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedId) return;

    const rect = canvas.getBoundingClientRect();
    const clickXPct = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPct = ((e.clientY - rect.top) / rect.height) * 100;

    const el = elements.find((el) => el.id === selectedId);
    if (!el) return;

    setDragging(selectedId);
    setDragOffset({ x: clickXPct - el.x, y: clickYPct - el.y });
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const newX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x));
    const newY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y));

    setElements((prev) =>
      prev.map((el) => (el.id === dragging ? { ...el, x: newX, y: newY } : el))
    );
  }, [dragging, dragOffset]);

  const handleCanvasMouseUp = () => {
    setDragging(null);
  };

  // Start editing text inline
  const startEditing = (el: TextElement) => {
    setEditingId(el.id);
    setEditText(el.text);
    setSelectedId(el.id);
  };

  const commitEdit = () => {
    if (!editingId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === editingId ? { ...el, text: editText } : el))
    );
    setEditingId(null);
  };

  // Update element property
  const updateElement = (id: string, updates: Partial<TextElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  // Export final image
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Deselect before final render
    setSelectedId(null);
    setTimeout(() => {
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      if (onExport) {
        onExport(dataUrl, template.label);
        return;
      }

      // Download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${template.label.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.click();
      toast.success('Bild exporterad!');
    }, 100);
  };

  // Reset to defaults
  const handleReset = () => {
    setElements(
      template.textSlots.map((slot) => ({
        ...slot,
        text: userTexts[slot.id] || slot.defaultText,
      }))
    );
    setSelectedId(null);
    setEditingId(null);
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold">Redigera text</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="rounded-full">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Återställ
          </Button>
          <Button size="sm" onClick={handleExport} className="rounded-full">
            <Download className="w-3.5 h-3.5 mr-1" />
            Exportera
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/20">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className="max-w-full max-h-full rounded-lg shadow-lg border border-border/30"
          style={{ cursor: dragging ? 'grabbing' : selectedId ? 'grab' : 'pointer' }}
        />
      </div>

      {/* Text elements panel */}
      <div className="border-t border-border/50 bg-card">
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Type className="w-3.5 h-3.5" />
            Textelement
            <span className="ml-auto text-[10px] text-muted-foreground/60">
              <Move className="w-3 h-3 inline mr-0.5" />
              Dra på bilden för att flytta
            </span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {elements.map((el) => (
              <div
                key={el.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                  selectedId === el.id
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted/40 border border-transparent hover:bg-muted/60'
                }`}
                onClick={() => setSelectedId(el.id)}
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-16 flex-shrink-0">
                  {el.label}
                </span>
                {editingId === el.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="h-7 text-sm bg-background"
                      autoFocus
                    />
                    <button onClick={commitEdit} className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20">
                      <Check className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex-1 text-left text-sm text-foreground truncate hover:text-primary transition-colors"
                    onClick={(e) => { e.stopPropagation(); startEditing(el); }}
                  >
                    {el.text || <span className="text-muted-foreground italic">Tom — klicka för att redigera</span>}
                  </button>
                )}
                {/* Font size controls */}
                {selectedId === el.id && editingId !== el.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateElement(el.id, { fontSize: Math.max(12, el.fontSize - 4) }); }}
                      className="w-6 h-6 rounded bg-muted/60 text-xs font-bold flex items-center justify-center hover:bg-muted"
                    >
                      A-
                    </button>
                    <span className="text-[10px] text-muted-foreground w-6 text-center">{el.fontSize}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateElement(el.id, { fontSize: Math.min(96, el.fontSize + 4) }); }}
                      className="w-6 h-6 rounded bg-muted/60 text-xs font-bold flex items-center justify-center hover:bg-muted"
                    >
                      A+
                    </button>
                    {/* Color picker */}
                    <input
                      type="color"
                      value={el.color}
                      onChange={(e) => updateElement(el.id, { color: e.target.value })}
                      className="w-6 h-6 rounded border border-border/50 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

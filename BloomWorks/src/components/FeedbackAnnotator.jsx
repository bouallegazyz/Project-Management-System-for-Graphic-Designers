import React, { useRef, useState, useMemo } from 'react';
import clsx from 'clsx';
import Button from './Button';

// Simple popover anchored to a point
function Popover({ x, y, children }) {
  return (
    <div
      className="absolute z-20 w-72 bg-[#0b1c34] text-white rounded-xl shadow-xl"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(6px, -6px)' }}
    >
      <div className="p-3 text-sm">{children}</div>
    </div>
  );
}

function Marker({ index, x, y, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer',
        active ? 'z-30' : 'z-10'
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="w-9 h-9 rounded-full bg-blue-600/90 border-2 border-blue-300 grid place-items-center text-white font-semibold shadow-lg">
        {index}
      </div>
    </div>
  );
}

export default function FeedbackAnnotator({ imageUrl, onSubmit, onApprove }) {
  const containerRef = useRef(null);
  const [list, setList] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [zoom, setZoom] = useState(1);

  const active = useMemo(() => list.find(a => a.id === activeId) || null, [list, activeId]);

  // Convert click to percent coords (stable under zoom/responsive)
  const handleAddPoint = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const x = Math.min(Math.max((xPx / rect.width) * 100, 1), 99);
    const y = Math.min(Math.max((yPx / rect.height) * 100, 1), 99);

    const id = crypto.randomUUID();
    const item = {
      id,
      x,
      y,
      title: '',
      description: '',
      createdAt: new Date().toISOString()
    };
    setList(prev => [...prev, item]);
    setActiveId(id);
  };

  const saveActive = (values) => {
    setList(prev => prev.map(a => (a.id === activeId ? { ...a, ...values } : a)));
    setActiveId(null);
  };

  const deleteItem = (id) => setList(prev => prev.filter(a => a.id !== id));

  const modifyItem = (id) => setActiveId(id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
      {/* Image + canvas */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0b1c34]">
        <div className="absolute left-4 top-4 text-white font-medium bg-black/40 px-3 py-2 rounded-lg">
          Cliquez n'importe où pour ajouter une correction
        </div>
        <div
          ref={containerRef}
          className="relative w-full h-130 lg:h-160"
          onClick={handleAddPoint}
        >
          {/* Image */}
          {imageUrl ? (
            <img
              alt="review"
              src={imageUrl}
              className="w-full h-full object-contain select-none"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-white/70">
              Aucune image sélectionnée
            </div>
          )}

          {/* Markers */}
          {list.map((a, i) => (
            <Marker
              key={a.id}
              index={i + 1}
              x={a.x}
              y={a.y}
              active={activeId === a.id}
              onClick={(ev) => { ev.stopPropagation(); setActiveId(a.id); }}
            />
          ))}

          {/* Active popover */}
          {active && (
            <Popover x={active.x} y={active.y}>
              <div className="space-y-2">
                <div className="text-xs font-semibold">Point #{list.findIndex(l => l.id === active.id) + 1}</div>
                <input
                  className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 outline-none"
                  placeholder="Titre"
                  value={active.title}
                  onChange={(e) => setList(prev => prev.map(a => a.id === active.id ? { ...a, title: e.target.value } : a))}
                />
                <textarea
                  className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 outline-none"
                  rows={3}
                  placeholder="Votre commentaire…"
                  value={active.description}
                  onChange={(e) => setList(prev => prev.map(a => a.id === active.id ? { ...a, description: e.target.value } : a))}
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button className="text-xs px-3 py-1 bg-white/10 text-white rounded" label="Annuler" onClick={() => setActiveId(null)} />
                  <Button className="text-xs px-3 py-1 bg-green-500 text-white rounded" label="Sauvegarder" onClick={() => saveActive({})} />
                </div>
              </div>
            </Popover>
          )}

          {/* Bottom controls */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 bg-black/40 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-3 text-white">
            <button className="px-2" onClick={() => setZoom(z => Math.max(0.75, z - 0.25))}>-
            </button>
            <div className="text-sm">{Math.round(zoom * 100)}%</div>
            <button className="px-2" onClick={() => setZoom(z => Math.min(2, z + 0.25))}>+
            </button>
            <button className="ml-2 text-xs underline" onClick={() => setZoom(1)}>Reset</button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <aside className="bg-[#0b1c34] text-white rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Corrections à faire</div>
          <div className="text-xs opacity-70">{list.length} point(s)</div>
        </div>
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {list.length === 0 && (
            <div className="text-white/60 text-sm">Ajoutez des points sur l'image pour commencer.</div>
          )}
          {list.map((a, i) => (
            <div key={a.id} className="bg-white/5 rounded-xl p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs bg-blue-600 text-white rounded-full w-6 h-6 grid place-items-center font-semibold">{i + 1}</div>
                </div>
                <div className="flex-1 ml-3">
                  <div className="font-medium text-sm">{a.title || 'Sans titre'}</div>
                  <div className="text-xs text-white/80 mt-1 whitespace-pre-wrap">{a.description || '—'}</div>
                  <div className="flex gap-3 mt-2 text-xs">
                    <button className="text-blue-300" onClick={() => modifyItem(a.id)}>MODIFIER</button>
                    <button className="text-red-300" onClick={() => deleteItem(a.id)}>SUPPRIMER</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2">
          <textarea className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm outline-none" placeholder="Cliquez sur l'image pour lier un commentaire…" rows={2} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button className="flex-1 bg-orange-500 text-white rounded-lg py-3" label="Envoyer les Corrections" onClick={() => onSubmit?.(list)} />
          <Button className="flex-1 bg-green-600 text-white rounded-lg py-3" label="Approuver le Modèle" onClick={() => onApprove?.()} />
        </div>
      </aside>
    </div>
  );
}

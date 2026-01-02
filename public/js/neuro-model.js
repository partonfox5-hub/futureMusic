// public/js/neuro-model.js

const NeuroModel = () => {
  // --- RECHARTS CHECK ---
  // Ensure both Recharts and the required ReactIs check (implicit in Recharts UMD) are ready
  if (!window.Recharts || !window.React) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border border-white/10 rounded-xl bg-white/5">
        <div className="text-[#D4AF37] animate-pulse font-mono uppercase tracking-widest text-sm">
          Initializing Neural Engine...
        </div>
      </div>
    );
  }

  // Destructure components safely
  const { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer 
  } = window.Recharts;

  // --- STATE ---
  const [drinks, setDrinks] = React.useState(4);    
  const [cigs, setCigs] = React.useState(0);        
  const [vape, setVape] = React.useState(0);        
  const [thc, setThc] = React.useState(0);          
  const [activeTab, setActiveTab] = React.useState('alcohol');

  const BASELINE_LIFESPAN = 82;
  const TIMELINES = [0, 1, 5, 10, 20, 30, 40];

  // --- METRICS CONFIG ---
  const metrics = React.useMemo(() => [
    { 
      id: 'focus', name: 'Focus & Executive', color: '#D4AF37', 
      calc: (y, d, c, v, t) => 100 - (y * (c * 0.3 + v * 0.1 + t * 0.5)) 
    },
    { 
      id: 'memory', name: 'Memory & Recall', color: '#20B2AA', 
      calc: (y, d, c, v, t) => {
        let loss = 0;
        if (d > 14) loss += (d - 14) * 0.25; 
        loss += t * 0.6; 
        return 100 - (y * loss * 0.5); 
      }
    },
    { 
      id: 'energy', name: 'Vascular Energy', color: '#FF4500', 
      calc: (y, d, c, v, t) => 100 - (y * (c * 0.8 + v * 0.6 + d * 0.15))
    }
  ], []);

  // --- CALCULATION ENGINE ---
  const data = React.useMemo(() => {
    return TIMELINES.map(year => {
      let lifeLoss = 0;
      
      if (drinks > 7) lifeLoss += (Math.pow(drinks - 7, 1.3) * 0.05) * (year / 40);
      if (cigs > 0) lifeLoss += ((cigs / 20) * year * 0.8) + (year > 1 ? 1.5 : 0);
      if (vape > 0) lifeLoss += (vape * 0.33 / 20) * year * 0.4;
      if (drinks > 10 && cigs > 5) lifeLoss *= 1.35; 

      const point = { name: `${year}y`, lifespan: Math.max(60, BASELINE_LIFESPAN - lifeLoss) };
      
      metrics.forEach(m => {
        point[m.id] = Math.max(40, m.calc(year, drinks, cigs, vape, thc));
      });

      return point;
    });
  }, [drinks, cigs, vape, thc, metrics]);

  const final = data[data.length - 1];
  const microlivesLost = Math.round((BASELINE_LIFESPAN - final.lifespan) * 17520);

  return (
    <div className="w-full text-white font-sans">
      <div className="mb-8 border-l-4 border-[#D4AF37] pl-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
          Actuarial Calibration <span className="text-[#D4AF37]">v2.1</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
              {['alcohol', 'tobacco'].map(tabId => (
                <button 
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all
                    ${activeTab === tabId ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}
                >
                  {tabId}
                </button>
              ))}
            </div>

            <div className="min-h-[100px]">
              {activeTab === 'alcohol' ? (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs uppercase text-[#D4AF37] font-bold">Drinks / Week</label>
                    <span className="text-xl font-mono">{drinks}</span>
                  </div>
                  <input type="range" min="0" max="40" value={drinks} onChange={e => setDrinks(Number(e.target.value))} className="w-full accent-[#D4AF37]" />
                </div>
              ) : (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs uppercase text-[#FF4500] font-bold">Cigs / Day</label>
                    <span className="text-xl font-mono">{cigs}</span>
                  </div>
                  <input type="range" min="0" max="40" value={cigs} onChange={e => setCigs(Number(e.target.value))} className="w-full accent-[#FF4500]" />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-gray-500 mb-1 uppercase">Lifespan</div>
                <div className="text-2xl font-mono font-bold">{final.lifespan.toFixed(1)}</div>
             </div>
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-gray-500 mb-1 uppercase">Microlives</div>
                <div className="text-2xl font-mono font-bold text-[#FF4500]">{microlivesLost.toLocaleString()}</div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-black/40 border border-white/10 rounded-xl p-6">
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={12} />
                        <YAxis domain={[40, 100]} stroke="#666" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                        <Legend />
                        <Line type="monotone" dataKey="focus" stroke="#D4AF37" strokeWidth={2} dot={false} name="Focus" />
                        <Line type="monotone" dataKey="memory" stroke="#20B2AA" strokeWidth={2} dot={false} name="Memory" />
                        <Line type="monotone" dataKey="energy" stroke="#FF4500" strokeWidth={2} dot={false} name="Vascular" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

// Start logic
window.addEventListener('load', () => {
  const mountApp = () => {
    const rootNode = document.getElementById('neuro-model-root');
    // Ensure all global dependencies are loaded
    if (rootNode && window.React && window.ReactDOM && window.Recharts) {
      const root = ReactDOM.createRoot(rootNode);
      root.render(React.createElement(NeuroModel));
    } else {
      // Retry if libraries haven't finished executing
      setTimeout(mountApp, 50);
    }
  };
  mountApp();
});
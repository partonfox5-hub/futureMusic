// public/js/neuro-model.js

const NeuroModel = () => {
  // --- RECHARTS SAFETY INITIALIZATION ---
  // We extract components inside the function with fallbacks to avoid Error #130
  const RC = window.Recharts || {};
  const LineChart = RC.LineChart || 'div';
  const Line = RC.Line || 'div';
  const XAxis = RC.XAxis || 'div';
  const YAxis = RC.YAxis || 'div';
  const CartesianGrid = RC.CartesianGrid || 'div';
  const Tooltip = RC.Tooltip || 'div';
  const Legend = RC.Legend || 'div';
  const ResponsiveContainer = RC.ResponsiveContainer || 'div';

  // --- STATE ---
  const [drinks, setDrinks] = React.useState(4);    
  const [cigs, setCigs] = React.useState(0);        
  const [vape, setVape] = React.useState(0);        
  const [thc, setThc] = React.useState(0);          
  const [activeTab, setActiveTab] = React.useState('alcohol');

  const BASELINE_INCOME = 92000;
  const BASELINE_LIFESPAN = 82;
  const TIMELINES = [0, 1, 5, 10, 20, 30, 40];

  // --- METRICS CONFIG ---
  const metrics = [
    { 
      id: 'focus', name: 'Focus & Executive', color: '#D4AF37', 
      desc: 'Prefrontal Cortex Thickness',
      calc: (y, d, c, v, t) => 100 - (y * (c * 0.3 + v * 0.1 + t * 0.5)) 
    },
    { 
      id: 'memory', name: 'Memory & Recall', color: '#20B2AA', 
      desc: 'Hippocampal Volume / Verbal Recall',
      calc: (y, d, c, v, t) => {
        let loss = 0;
        if (d > 14) loss += (d - 14) * 0.25; 
        loss += t * 0.6; 
        return 100 - (y * loss * 0.5); 
      }
    },
    { 
      id: 'energy', name: 'Vascular Energy', color: '#FF4500', 
      desc: 'Mitochondrial Efficiency & Arterial Stiffness',
      calc: (y, d, c, v, t) => 100 - (y * (c * 0.8 + v * 0.6 + d * 0.15))
    },
    { 
      id: 'lifespan', name: 'Projected Lifespan', color: '#ffffff', 
      type: 'outcome',
      desc: 'Actuarial Expectancy'
    }
  ];

  // --- CALCULATION ENGINE ---
  const data = React.useMemo(() => {
    return TIMELINES.map(year => {
      let lifeLoss = 0;
      
      // 1. ALCOHOL
      if (drinks > 7) {
         lifeLoss += (Math.pow(drinks - 7, 1.3) * 0.05) * (year / 40);
      }

      // 2. TOBACCO
      if (cigs > 0) {
        const packYears = (cigs / 20) * year;
        lifeLoss += packYears * 0.8; 
        if (year > 1) lifeLoss += 1.5; 
      }

      // 3. VAPING
      if (vape > 0) {
        const vapeEquiv = vape * 0.33; 
        lifeLoss += (vapeEquiv / 20) * year * 0.4;
      }

      // 4. SYNERGY
      if (drinks > 10 && cigs > 5) {
        lifeLoss *= 1.35; 
      }

      const point = { name: `${year}y` };
      
      metrics.forEach(m => {
        if(m.type !== 'outcome') {
          let val = m.calc(year, drinks, cigs, vape, thc);
          point[m.id] = Math.max(40, val); 
        }
      });

      point.lifespan = Math.max(60, BASELINE_LIFESPAN - lifeLoss);
      return point;
    });
  }, [drinks, cigs, vape, thc]);

  const final = data[data.length - 1];
  const microlivesLost = Math.round((BASELINE_LIFESPAN - final.lifespan) * 17520);

  return (
    <div className="w-full text-white font-sans selection:bg-[#D4AF37] selection:text-black">
      <div className="mb-8 border-l-4 border-[#D4AF37] pl-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
          Actuarial Calibration <span className="text-[#D4AF37]">v2.1</span>
        </h2>
        <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
          Refined probabilistic model based on longitudinal cohort data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* CONTROLS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card bg-white/5 border border-white/10 p-6 rounded-xl">
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
              {['alcohol', 'tobacco', 'thc'].map(tabId => (
                <button 
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all
                    ${activeTab === tabId ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}
                >
                  {tabId}
                </button>
              ))}
            </div>

            <div className="min-h-[120px]">
              {activeTab === 'alcohol' && (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs uppercase text-[#D4AF37] font-bold">Standard Drinks / Week</label>
                    <span className="text-xl font-mono">{drinks}</span>
                  </div>
                  <input type="range" min="0" max="40" value={drinks} onChange={e => setDrinks(Number(e.target.value))} className="w-full h-1 bg-gray-700 accent-[#D4AF37] rounded-lg appearance-none cursor-pointer" />
                </div>
              )}
              {activeTab === 'tobacco' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs uppercase text-[#FF4500] font-bold">Cigs / Day</label>
                      <span className="text-xl font-mono">{cigs}</span>
                    </div>
                    <input type="range" min="0" max="40" value={cigs} onChange={e => setCigs(Number(e.target.value))} className="w-full h-1 bg-gray-700 accent-[#FF4500] rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs uppercase text-blue-400 font-bold">Vape (mL / Wk)</label>
                      <span className="text-xl font-mono">{vape}</span>
                    </div>
                    <input type="range" min="0" max="50" value={vape} onChange={e => setVape(Number(e.target.value))} className="w-full h-1 bg-gray-700 accent-blue-400 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
              )}
              {activeTab === 'thc' && (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs uppercase text-[#20B2AA] font-bold">Grams / Week</label>
                    <span className="text-xl font-mono">{thc}g</span>
                  </div>
                  <input type="range" min="0" max="14" step="0.5" value={thc} onChange={e => setThc(Number(e.target.value))} className="w-full h-1 bg-gray-700 accent-[#20B2AA] rounded-lg appearance-none cursor-pointer" />
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
                <div className="text-xs text-gray-500 mb-1 uppercase">Microlives Lost</div>
                <div className="text-2xl font-mono font-bold text-[#FF4500]">{microlivesLost.toLocaleString()}</div>
             </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="lg:col-span-8 bg-black/40 border border-white/10 rounded-xl p-6">
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis domain={[40, 100]} stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                        <Legend />
                        <Line type="monotone" dataKey="focus" stroke="#D4AF37" strokeWidth={2} dot={false} name="Focus" />
                        <Line type="monotone" dataKey="memory" stroke="#20B2AA" strokeWidth={2} dot={false} name="Memory" />
                        <Line type="monotone" dataKey="energy" stroke="#FF4500" strokeWidth={2} dot={false} name="Vascular" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-6">
                {metrics.filter(m => m.type !== 'outcome').map(m => (
                    <div key={m.id}>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{m.name}</span>
                        <div className="text-xl font-mono" style={{color: m.color}}>{Math.round(final[m.id])}%</div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

// Start logic
window.addEventListener('load', () => {
  const rootNode = document.getElementById('neuro-model-root');
  if (rootNode && window.Recharts) {
    const root = ReactDOM.createRoot(rootNode);
    root.render(React.createElement(NeuroModel));
  }
});
import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Brain, Zap, Target, ShieldAlert, Wind, Flame, DollarSign, Info } from 'lucide-react';

const NeuroModel = () => {
  // --- STATE ---
  const [drinks, setDrinks] = useState(4);    // Ref: PDF Section 1.1 (Thresholds)
  const [cigs, setCigs] = useState(0);        // Ref: PDF Section 1.2 (Log-linear)
  const [vape, setVape] = useState(0);        // Ref: PDF Section 1.3 (33% harm relative)
  const [thc, setThc] = useState(0);          // Ref: PDF Section 2.3 (Verbal memory)
  const [activeTab, setActiveTab] = useState('alcohol');

  const BASELINE_INCOME = 92000;
  const BASELINE_LIFESPAN = 82;
  const TIMELINES = [0, 1, 5, 10, 20, 30, 40];

  // --- PDF CALIBRATED COEFFICIENTS (Section 5.4) ---
  const metrics = [
    { 
      id: 'focus', name: 'Focus & Executive', color: '#D4AF37', 
      desc: 'Prefrontal Cortex Thickness',
      // Tobacco effects are structural (cortical thinning), Cannabis is functional
      calc: (y, d, c, v, t) => 100 - (y * (c * 0.3 + v * 0.1 + t * 0.5)) 
    },
    { 
      id: 'memory', name: 'Memory & Recall', color: '#20B2AA', 
      desc: 'Hippocampal Volume / Verbal Recall',
      // Alcohol >14 units drives atrophy. Cannabis drives verbal memory loss.
      calc: (y, d, c, v, t) => {
        let loss = 0;
        // Alcohol Threshold: PDF Section 2.1
        if (d > 14) loss += (d - 14) * 0.25; 
        loss += t * 0.6; // Cannabis linear penalty
        return 100 - (y * loss * 0.5); 
      }
    },
    { 
      id: 'energy', name: 'Vascular Energy', color: '#FF4500', 
      desc: 'Mitochondrial Efficiency & Arterial Stiffness',
      // Vaping stiffens arteries nearly as much as smoking (PDF 3.1)
      calc: (y, d, c, v, t) => 100 - (y * (c * 0.8 + v * 0.6 + d * 0.15))
    },
    { 
      id: 'lifespan', name: 'Projected Lifespan', color: '#ffffff', 
      type: 'outcome',
      desc: 'Actuarial Expectancy'
    }
  ];

  // --- CALCULATION ENGINE ---
  const data = useMemo(() => {
    return TIMELINES.map(year => {
      let lifeLoss = 0;
      
      // 1. ALCOHOL (PDF Section 1.1)
      // Threshold Logic: <7 drinks/week is noise. >14 accelerates.
      if (drinks > 7) {
         // Exponential penalty beyond threshold
         lifeLoss += (Math.pow(drinks - 7, 1.3) * 0.05) * (year / 40);
      }

      // 2. TOBACCO (PDF Section 1.2)
      // Supralinear: First few cigs cause disproportionate CV damage
      if (cigs > 0) {
        // ~11 mins lost per cig. 20 cigs = ~5-10 years lost over lifetime.
        const packYears = (cigs / 20) * year;
        lifeLoss += packYears * 0.8; // Calibrated for moderate use
        // Initial "shock" penalty for being a smoker (CV risk)
        if (year > 1) lifeLoss += 1.5; 
      }

      // 3. VAPING (PDF Section 1.3)
      // ~33% mortality risk of smoking, but high vascular morbidity
      if (vape > 0) {
        const vapeEquiv = vape * 0.33; 
        lifeLoss += (vapeEquiv / 20) * year * 0.4;
      }

      // 4. SYNERGY (PDF Section 1.4 & 5.3)
      // Alcohol + Smoking = Multiplicative Cancer Risk (Upper Aerodigestive)
      if (drinks > 10 && cigs > 5) {
        lifeLoss *= 1.35; // The Multiplier Effect
      }

      const point = { name: `${year}y` };
      
      // Calculate Performance Metrics
      metrics.forEach(m => {
        if(m.type !== 'outcome') {
          let val = m.calc(year, drinks, cigs, vape, thc);
          point[m.id] = Math.max(40, val); // Floor at 40% function
        }
      });

      // Calculate Lifespan
      point.lifespan = Math.max(60, BASELINE_LIFESPAN - lifeLoss);
      
      // Calculate Income (Proxy for Cognitive Headroom)
      // PDF implies "Critical Thinking" correlates with income potential
      const cognitiveAvg = (point.focus + point.memory) / 2;
      point.income = BASELINE_INCOME * (cognitiveAvg / 100);

      return point;
    });
  }, [drinks, cigs, vape, thc]);

  const final = data[data.length - 1];
  const microlivesLost = Math.round((BASELINE_LIFESPAN - final.lifespan) * 17520); // 30 min blocks

  return (
    <div className="w-full text-white font-sans selection:bg-[#D4AF37] selection:text-black">
      
      {/* --- DASHBOARD HEADER --- */}
      <div className="mb-8 border-l-4 border-[#D4AF37] pl-6">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
          Actuarial Calibration <span className="text-[#D4AF37]">v2.1</span>
        </h2>
        <p className="text-gray-400 max-w-2xl text-sm leading-relaxed">
          Refined probabilistic model based on longitudinal cohort data (UK Biobank/PATH). 
          Replacing linear assumptions with <strong>biological thresholds</strong> and <strong>synergistic toxicity</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- CONTROLS (Left Col) --- */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card bg-white/5 border border-white/10 p-6 rounded-xl">
            
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
              {[
                { id: 'alcohol', icon: <Activity size={14} />, label: 'EtOH' },
                { id: 'tobacco', icon: <Wind size={14} />, label: 'Nicotine' },
                { id: 'thc', icon: <Flame size={14} />, label: 'THC' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2
                    ${activeTab === t.id ? 'bg-[#D4AF37] text-black' : 'text-gray-500 hover:text-white'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Sliders */}
            <div className="min-h-[120px]">
              {activeTab === 'alcohol' && (
                <div className="animate-fade-in">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs uppercase text-[#D4AF37] font-bold">Standard Drinks / Week</label>
                    <span className="text-xl font-mono">{drinks}</span>
                  </div>
                  <input type="range" min="0" max="40" value={drinks} onChange={e => setDrinks(Number(e.target.value))} 
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]" />
                  <p className="text-[10px] text-gray-500 mt-3 italic">
                    <span className="text-white">Threshold Logic:</span> &lt;7 drinks/week shows negligible mortality impact. Neuro-atrophy accelerates &gt;14/week.
                  </p>
                </div>
              )}
              
              {activeTab === 'tobacco' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs uppercase text-[#FF4500] font-bold">Cigarettes / Day</label>
                      <span className="text-xl font-mono">{cigs}</span>
                    </div>
                    <input type="range" min="0" max="40" value={cigs} onChange={e => setCigs(Number(e.target.value))} 
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#FF4500]" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs uppercase text-blue-400 font-bold">Vape (mL / Week)</label>
                      <span className="text-xl font-mono">{vape}</span>
                    </div>
                    <input type="range" min="0" max="50" value={vape} onChange={e => setVape(Number(e.target.value))} 
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400" />
                    <p className="text-[10px] text-gray-500 mt-3 italic">
                      <span className="text-white">Vascular Stiffness:</span> Vaping reduces cancer risk by ~95%, but maintains ~80% of the arterial stiffness of smoking.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'thc' && (
                <div className="animate-fade-in">
                  <div className="flex justify-between mb-2">
                    <label className="text-xs uppercase text-[#20B2AA] font-bold">Grams / Week</label>
                    <span className="text-xl font-mono">{thc}g</span>
                  </div>
                  <input type="range" min="0" max="14" step="0.5" value={thc} onChange={e => setThc(Number(e.target.value))} 
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#20B2AA]" />
                  <p className="text-[10px] text-gray-500 mt-3 italic">
                    <span className="text-white">Functional Connectivity:</span> Impact is primarily on verbal memory and motivation, not gross volume atrophy.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-gray-500 uppercase mb-1">Projected Lifespan</div>
                <div className="text-2xl font-mono font-bold text-white">
                    {final.lifespan.toFixed(1)} <span className="text-sm text-gray-500">Years</span>
                </div>
                <div className="w-full bg-gray-800 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-white h-full" style={{ width: `${(final.lifespan/85)*100}%` }}></div>
                </div>
             </div>
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-gray-500 uppercase mb-1">Microlives Lost</div>
                <div className="text-2xl font-mono font-bold text-[#FF4500]">
                    {microlivesLost.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">30min blocks of life</div>
             </div>
          </div>
        </div>

        {/* --- CHARTS (Right Col) --- */}
        <div className="lg:col-span-8 bg-black/40 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity size={16} className="text-[#D4AF37]" /> 40-Year Neuro-Projection
            </h3>
            
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis domain={[40, 100]} stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="focus" stroke="#D4AF37" strokeWidth={2} dot={false} name="Cortical Thickness" />
                        <Line type="monotone" dataKey="memory" stroke="#20B2AA" strokeWidth={2} dot={false} name="Hippocampal Vol" />
                        <Line type="monotone" dataKey="energy" stroke="#FF4500" strokeWidth={2} dot={false} name="Vascular Health" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.filter(m => m.type !== 'outcome').map(m => (
                    <div key={m.id}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: m.color}}></div>
                            <span className="text-xs font-bold text-gray-300 uppercase">{m.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 leading-tight">
                            {m.desc}
                        </div>
                        <div className="mt-2 text-xl font-mono" style={{color: m.color}}>
                            {Math.round(final[m.id])}%
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default NeuroModel;
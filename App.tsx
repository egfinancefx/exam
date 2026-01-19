
// App.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { TRADING_QUESTIONS, TELEGRAM_HANDLE } from './constants';
import { QuizState, FeedbackSummary } from './types';
import ProgressBar from './components/ProgressBar';
import FileUpload from './components/FileUpload';
import { getQuizFeedback } from './services/geminiService';

const STORAGE_KEY = 'trading_quiz_completed_v4';

const App: React.FC = () => {
  const [state, setState] = useState<QuizState>({
    step: 'START',
    userName: '',
    currentQuestionIndex: 0,
    answers: {},
    files: {},
    reasoning: {},
    aiFeedback: null
  });
  const [loading, setLoading] = useState(false);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const isCompleted = localStorage.getItem(STORAGE_KEY);
    if (isCompleted) {
      setState(prev => ({ ...prev, step: 'BLOCKED' }));
    }
  }, []);

  useEffect(() => {
    setIsFullscreenImage(false);
    setZoomScale(1);
    setImageError(false);
  }, [state.currentQuestionIndex]);

  // Define skill info interface for better type safety
  interface SkillInfo {
    correct: number;
    total: number;
  }

  const results = useMemo(() => {
    let score = 0;
    const skills: Record<string, SkillInfo> = {
      structure: { correct: 0, total: 0 },
      technical: { correct: 0, total: 0 },
      risk: { correct: 0, total: 0 },
      fundamentals: { correct: 0, total: 0 }
    };

    TRADING_QUESTIONS.forEach((q, idx) => {
      const isCorrect = state.answers[idx] === q.correctAnswer;
      if (isCorrect) score++;

      if ([1, 4, 6, 8, 9].includes(q.id)) {
        skills.structure.total++;
        if (isCorrect) skills.structure.correct++;
      } else if ([2, 5, 10].includes(q.id)) {
        skills.technical.total++;
        if (isCorrect) skills.technical.correct++;
      } else if (q.id === 3) {
        skills.risk.total++;
        if (isCorrect) skills.risk.correct++;
      } else if (q.id === 7) {
        skills.fundamentals.total++;
        if (isCorrect) skills.fundamentals.correct++;
      }
    });

    return {
      score,
      total: TRADING_QUESTIONS.length,
      percentage: Math.round((score / TRADING_QUESTIONS.length) * 100),
      skills
    };
  }, [state.answers]);

  const parseAiFeedback = (feedback: string | null) => {
    if (!feedback) return null;
    const sections: Record<string, string> = {};
    const keys = ['LEVEL', 'STRENGTHS', 'WEAKNESSES', 'ROADMAP', 'PSYCHOLOGY'];
    
    keys.forEach(key => {
      const regex = new RegExp(`\\[${key}\\]:?\\s*([\\s\\S]*?)(?=\\[|$)`, 'i');
      const match = feedback.match(regex);
      if (match) sections[key] = match[1].trim();
    });
    
    return sections;
  };

  const aiSections = useMemo(() => parseAiFeedback(state.aiFeedback), [state.aiFeedback]);

  const startQuiz = () => {
    if (state.userName.trim().length < 3) {
      alert("يرجى إدخال اسمك الكامل للمتابعة");
      return;
    }
    setState(prev => ({ ...prev, step: 'QUIZ' }));
  };

  const handleAnswerSelect = (optionIndex: number) => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [prev.currentQuestionIndex]: optionIndex }
    }));
  };

  const handleReasoningChange = (text: string) => {
    setState(prev => ({
      ...prev,
      reasoning: { ...prev.reasoning, [prev.currentQuestionIndex]: text }
    }));
  };

  const handleFileSelect = (base64: string | null) => {
    setState(prev => ({
      ...prev,
      files: { ...prev.files, [prev.currentQuestionIndex]: base64 }
    }));
  };

  const nextStep = () => {
    if (state.currentQuestionIndex < TRADING_QUESTIONS.length - 1) {
      setState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setLoading(true);
    try {
      const feedback = await getQuizFeedback(state.answers, state.files, state.reasoning);
      setState(prev => ({ ...prev, step: 'COMPLETED', aiFeedback: feedback }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        name: state.userName, 
        date: new Date().toISOString(),
        score: results.score 
      }));
    } catch (err) {
      alert("حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.");
    } finally {
      setLoading(false);
    }
  };

  const generateReportText = () => {
    // Explicitly type entries to avoid "unknown" type error in some TS configurations
    const skillsEntries = Object.entries(results.skills) as [string, SkillInfo][];
    const skillsText = skillsEntries.map(([key, val]) => {
      const label = key === 'structure' ? 'هيكلية السوق' : key === 'technical' ? 'التحليل الفني' : key === 'risk' ? 'إدارة المخاطر' : 'الأساسيات';
      const perc = Math.round((val.correct / val.total) * 100 || 0);
      return `${label}: ${perc}%`;
    }).join('\n');

    return `📊 تقرير التقييم الفني للمتداول
👤 المتداول: ${state.userName}
✅ الدقة الإجمالية: ${results.percentage}% (${results.score}/${results.total})
🏆 المستوى: ${aiSections?.LEVEL || 'قيد التحليل'}

📉 المهارات التفصيلية:
${skillsText}

🔬 التحليل الذكي:
${state.aiFeedback || 'التحليل غير متوفر حالياً'}

📍 تم التوليد عبر منصة الأكاديمية الذكية`;
  };

  const handleCopyReport = async () => {
    const report = generateReportText();
    try {
      await navigator.clipboard.writeText(report);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
      return report;
    } catch (err) {
      return report;
    }
  };

  const handleTelegramAction = async () => {
    const report = await handleCopyReport();
    // استخدام الرابط العالمي للمشاركة لضمان وصول النص للمدرب
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent('https://egfinance.academy')}&text=${encodeURIComponent(report)}`;
    window.open(telegramUrl, '_blank');
  };

  // Improved typing for getRadarPoints to prevent property access errors from unknown types
  const getRadarPoints = (skills: Record<string, SkillInfo>) => {
    const centerX = 150;
    const centerY = 150;
    const radius = 110;
    
    // Safely extract skill values with defaults to avoid "unknown" access issues
    const fundamentals = skills.fundamentals || { correct: 0, total: 1 };
    const risk = skills.risk || { correct: 0, total: 1 };
    const structure = skills.structure || { correct: 0, total: 1 };
    const technical = skills.technical || { correct: 0, total: 1 };

    const values = [
      fundamentals.total > 0 ? Math.max(0.15, fundamentals.correct / fundamentals.total) : 0.15,
      risk.total > 0 ? Math.max(0.15, risk.correct / risk.total) : 0.15,
      structure.total > 0 ? Math.max(0.15, structure.correct / structure.total) : 0.15,
      technical.total > 0 ? Math.max(0.15, technical.correct / technical.total) : 0.15
    ];

    return [
      `${centerX},${centerY - (radius * values[0])}`,
      `${centerX + (radius * values[1])},${centerY}`,
      `${centerX},${centerY + (radius * values[2])}`,
      `${centerX - (radius * values[3])},${centerY}`
    ].join(' ');
  };

  if (state.step === 'BLOCKED') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-right font-['Cairo']" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-10 rounded-[2.5rem] text-center shadow-2xl">
          <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500 text-4xl">⚠️</div>
          <h2 className="text-3xl font-black text-white mb-4">محاولة مكررة</h2>
          <p className="text-slate-400 mb-6 leading-relaxed">يسمح لكل طالب بإجراء التقييم مرة واحدة فقط لضمان دقة النتائج الفنية.</p>
        </div>
      </div>
    );
  }

  if (state.step === 'START') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-right relative overflow-hidden font-['Cairo']" dir="rtl">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="max-w-xl w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl text-center relative z-10">
          <div className="mb-8 inline-block p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] shadow-lg shadow-blue-500/20">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-indigo-400 mb-6 leading-tight">أكاديمية المتداول المحترف</h1>
          <p className="text-slate-400 mb-10 text-lg leading-relaxed font-medium">حدد مستواك الحقيقي في أسواق المال عبر {TRADING_QUESTIONS.length} اختبارات ذكية.</p>
          <div className="space-y-6">
            <input 
              type="text"
              placeholder="الاسم الكامل للمتداول"
              value={state.userName}
              onChange={(e) => setState(prev => ({ ...prev, userName: e.target.value }))}
              className="w-full p-5 bg-slate-950/50 border border-slate-800 rounded-2xl text-white text-center text-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-600"
            />
            <button onClick={startQuiz} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xl rounded-2xl shadow-2xl shadow-blue-900/20 transform transition-all active:scale-95">دخول منصة التقييم</button>
          </div>
        </div>
      </div>
    );
  }

  if (state.step === 'COMPLETED') {
    return (
      <div className="min-h-screen bg-[#020617] p-4 md:p-10 text-right font-['Cairo'] overflow-x-hidden" dir="rtl">
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          {/*Header*/}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-emerald-500 rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-lg">
                {state.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-4xl font-black text-white">{state.userName}</h1>
                <p className="text-blue-400 font-bold mt-1">مستوى الأداء: {aiSections?.LEVEL || 'قيد التحليل'}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
               <button 
                  onClick={handleCopyReport} 
                  className={`px-8 py-4 ${copySuccess ? 'bg-emerald-600' : 'bg-slate-800 hover:bg-slate-700'} text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 border border-slate-700`}
                >
                 {copySuccess ? 'تم النسخ ✅' : 'نسخ التقرير 📋'}
               </button>
               <button onClick={handleTelegramAction} className="px-10 py-4 bg-[#0088cc] hover:bg-[#0077b3] text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 flex items-center gap-3">
                 إرسال للمدرب الآن 🚀
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Speedometer Gauge - بديل الشارت الدائري المقطوع */}
            <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-md p-10 rounded-[2.5rem] border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
               <h3 className="text-slate-500 font-black mb-6 uppercase tracking-widest text-xs">معدل الدقة الإجمالي</h3>
               <div className="relative w-64 h-40 flex items-end justify-center overflow-hidden">
                  <svg viewBox="0 0 200 100" className="w-full h-full">
                    {/* Background Track */}
                    <path d="M20,90 A80,80 0 0,1 180,90" fill="none" stroke="#1e293b" strokeWidth="20" strokeLinecap="round" />
                    {/* Fill Progress */}
                    <path 
                      d="M20,90 A80,80 0 0,1 180,90" 
                      fill="none" 
                      stroke={results.percentage >= 70 ? '#10b981' : results.percentage >= 40 ? '#3b82f6' : '#ef4444'}
                      strokeWidth="20" 
                      strokeLinecap="round"
                      strokeDasharray="251.32"
                      strokeDashoffset={251.32 - (251.32 * results.percentage) / 100}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute bottom-0 flex flex-col items-center">
                    <span className="text-5xl font-black text-white">{results.percentage}%</span>
                    <span className="text-[10px] text-slate-500 font-black uppercase mt-1">Accuracy Score</span>
                  </div>
               </div>
               <div className="mt-8 flex justify-between w-full text-center">
                  <div className="flex-1">
                    <span className="block text-emerald-400 font-black text-2xl">{results.score}</span>
                    <span className="text-[10px] text-slate-500 font-black uppercase">Correct</span>
                  </div>
                  <div className="flex-1 border-r border-slate-800">
                    <span className="block text-red-400 font-black text-2xl">{results.total - results.score}</span>
                    <span className="text-[10px] text-slate-500 font-black uppercase">Failed</span>
                  </div>
               </div>
            </div>

            {/* Radar Chart */}
            <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-md p-10 rounded-[2.5rem] border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
               <h3 className="text-slate-500 font-black mb-4 uppercase tracking-widest text-xs">توزيع الكفاءة</h3>
               <div className="relative w-64 h-64">
                  <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.25)]">
                    {[0.2, 0.4, 0.6, 0.8, 1].map(r => (
                      <circle key={r} cx="150" cy="150" r={r * 110} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    ))}
                    <line x1="150" y1="40" x2="150" y2="260" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    <line x1="40" y1="150" x2="260" y2="150" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    
                    <polygon 
                      points={getRadarPoints(results.skills)} 
                      fill="rgba(59, 130, 246, 0.45)" 
                      stroke="#3b82f6" 
                      strokeWidth="3" 
                      strokeLinejoin="round"
                    />
                    {getRadarPoints(results.skills).split(' ').map((p, i) => {
                      const [x, y] = p.split(',');
                      return <circle key={i} cx={x} cy={y} r="5" fill="#60a5fa" className="animate-pulse" />;
                    })}
                  </svg>
               </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-[2.5rem] relative">
                  <h4 className="text-emerald-400 font-black text-lg mb-4">✅ مواطن القوة</h4>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{aiSections?.STRENGTHS || 'تحليل جاري...'}</p>
               </div>
               <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-[2.5rem] relative">
                  <h4 className="text-red-400 font-black text-lg mb-4">⚠️ فجوات التطوير</h4>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{aiSections?.WEAKNESSES || 'تحليل جاري...'}</p>
               </div>
               <div className="md:col-span-2 bg-blue-500/5 border border-blue-500/20 p-8 rounded-[2.5rem] relative">
                  <h4 className="text-blue-400 font-black text-lg mb-4">🚀 خارطة الطريق الفنية</h4>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{aiSections?.ROADMAP || 'تحليل جاري...'}</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = TRADING_QUESTIONS[state.currentQuestionIndex];
  const isAnswerSelected = state.answers[state.currentQuestionIndex] !== undefined;

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-8 flex items-center justify-center text-right font-['Cairo']" dir="rtl">
      {isFullscreenImage && currentQuestion.image && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-4 backdrop-blur-xl" onClick={() => setIsFullscreenImage(false)}>
           <div className="absolute top-6 right-6 z-[110]">
              <button className="bg-red-500 px-8 py-3 rounded-2xl text-white font-black shadow-xl">إغلاق ✖</button>
           </div>
           <div className="w-full h-full overflow-auto flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              <img src={currentQuestion.image} alt="Chart" className="max-w-full max-h-full object-contain rounded-lg" onError={() => setImageError(true)} />
           </div>
        </div>
      )}

      <div className="max-w-2xl w-full">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <ProgressBar current={state.currentQuestionIndex} total={TRADING_QUESTIONS.length} />
          <div className="mt-6 flex flex-col">
            <h2 className="text-3xl font-black text-white mb-10 leading-snug">{currentQuestion.text}</h2>
            {currentQuestion.image && (
              <div className="mb-10 relative group bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 min-h-[200px] flex flex-col items-center justify-center">
                 {!imageError ? (
                   <>
                     <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-all z-10 flex items-center justify-center cursor-zoom-in" onClick={() => setIsFullscreenImage(true)}>
                        <div className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-2xl">توسيع الشارت 🔎</div>
                     </div>
                     <img src={currentQuestion.image} alt="Chart" className="w-full max-h-[350px] object-cover opacity-90 transition-opacity" onError={() => setImageError(true)} />
                   </>
                 ) : (
                   <div className="p-10 text-center">
                     <p className="text-slate-400 mb-4">تعذر تحميل الشارت</p>
                     <a href={currentQuestion.image} target="_blank" rel="noreferrer" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">عرض الشارت ↗</a>
                   </div>
                 )}
              </div>
            )}
            <div className="grid grid-cols-1 gap-5 mb-10">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = state.answers[state.currentQuestionIndex] === idx;
                return (
                  <button key={idx} onClick={() => handleAnswerSelect(idx)} className={`p-6 text-right rounded-2xl border-2 transition-all flex items-center justify-between ${isSelected ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-800 bg-slate-950/50 text-slate-400'}`}>
                    <span className="text-xl font-bold">{option}</span>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-blue-400 bg-blue-400' : 'border-slate-700'}`}>
                      {isSelected && <div className="w-3 h-3 bg-white rounded-full"></div>}
                    </div>
                  </button>
                );
              })}
            </div>
            {currentQuestion.requiresReasoning && (
              <div className="mb-10">
                <label className="block text-blue-400 font-black mb-4">💡 اشرح منطقك الفني (اختياري):</label>
                <textarea
                  value={state.reasoning[state.currentQuestionIndex] || ''}
                  onChange={(e) => handleReasoningChange(e.target.value)}
                  placeholder="مثال: سحب سيولة مع انتظار تأكيد..."
                  className="w-full p-8 bg-slate-950 border border-slate-800 rounded-[2rem] text-white outline-none min-h-[160px] resize-none"
                />
              </div>
            )}
            <FileUpload onFileSelect={handleFileSelect} currentFile={state.files[state.currentQuestionIndex] || null} />
          </div>
          <div className="mt-12 flex gap-6">
            <button disabled={!isAnswerSelected || loading} onClick={nextStep} className={`flex-[2] py-6 font-black text-2xl rounded-2xl shadow-2xl transition-all ${(!isAnswerSelected || loading) ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}>
              {loading ? "جاري التحليل..." : (state.currentQuestionIndex === TRADING_QUESTIONS.length - 1 ? 'استخراج التقرير الفني' : 'السؤال التالي')}
            </button>
            {state.currentQuestionIndex > 0 && (
              <button onClick={() => setState(p => ({ ...p, currentQuestionIndex: p.currentQuestionIndex - 1 }))} className="flex-1 py-6 bg-slate-800 text-white font-black text-xl rounded-2xl">السابق</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

// Add BossRaid components later...
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Flame, Loader2, Coins, ChevronLeft, Plus, Skull, ShieldAlert, Swords, XCircle, CheckCircle2, Share2, Copy, MessageCircle, Send, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMascot } from "@/context/MascotContext";

const DISPLAY = "font-['Baloo_2'] tracking-tight";
const STICKER = "border-[3px] border-[#0F172A] rounded-[28px] shadow-[4px_4px_0_0_#0F172A] bg-white";
const SIDE_CARD = "border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white p-5";
const BTN = "inline-flex w-full md:w-auto justify-center items-center gap-2.5 font-extrabold font-['Baloo_2'] border-[3px] border-[#0F172A] rounded-full px-6 py-3.5 shadow-[4px_4px_0_0_#0F172A] transition-all duration-150 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] disabled:opacity-40 disabled:pointer-events-none";

const SHAKE_ANIMATION = `
@keyframes shake-err {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
.shake-err {
  animation: shake-err 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
`;

interface BossRaidArenaProps {
  initialRaidId?: string | null;
  aceCoins: number;
  onCoinsChanged: (newAmount: number) => void;
  onNavigate: (path: string) => void;
}

export const BossRaidArena = ({ initialRaidId, aceCoins, onCoinsChanged, onNavigate }: BossRaidArenaProps) => {
  const { user } = useAuth();
  const { pushMessage } = useMascot();
  const [view, setView] = useState<"list" | "create" | "detail" | "taking" | "result">("list");
  const [activeRaidId, setActiveRaidId] = useState<string | null>(initialRaidId || null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [raidResult, setRaidResult] = useState<"won" | "lost" | null>(null);

  useEffect(() => {
    if (initialRaidId) {
      setActiveRaidId(initialRaidId);
      setView("detail");
    }
  }, [initialRaidId]);

  if (view === "list") {
    return <BossRaidList onSelect={(id) => { setActiveRaidId(id); setView("detail"); }} onCreate={() => setView("create")} aceCoins={aceCoins} />;
  }

  if (view === "create") {
    return <BossRaidCreate onCancel={() => setView("list")} onCreated={(id, amount) => { setActiveRaidId(id); setView("detail"); onCoinsChanged(aceCoins - amount); }} />;
  }

  if (view === "detail" && activeRaidId) {
    return <BossRaidDetail raidId={activeRaidId} onBack={() => { setActiveRaidId(null); setView("list"); onNavigate("/quiz"); }} onStart={(cost, attId) => { setAttemptId(attId); onCoinsChanged(aceCoins - cost); setView("taking"); }} />;
  }

  if (view === "taking" && activeRaidId && attemptId) {
    return <BossRaidTaking raidId={activeRaidId} attemptId={attemptId} onComplete={(res) => { setRaidResult(res); setView("result"); }} />;
  }

  if (view === "result" && raidResult) {
    return (
      <div className={`${STICKER} p-10 text-center mx-auto max-w-lg mt-10 bg-slate-50`}>
        {raidResult === "won" ? (
          <div>
            <div className="text-[80px] mb-4">🏆</div>
            <h1 className={`${DISPLAY} font-extrabold text-4xl text-amber-500 mb-2`}>YOU DEFEATED THE BOSS</h1>
            <p className="font-bold text-slate-500 mb-6">You've claimed the entire bounty pot! Your coins have been added to your balance.</p>
          </div>
        ) : (
          <div>
            <div className="text-[80px] mb-4 grayscale">💀</div>
            <h1 className={`${DISPLAY} font-extrabold text-4xl text-slate-700 mb-2`}>WASTED</h1>
            <p className="font-bold text-slate-500 mb-6">You failed to get a perfect score. Your entry fee was added to the boss's pot.</p>
          </div>
        )}
        <button className={`${BTN} text-white w-full`} style={{ background: "#2F7CFF" }} onClick={() => { setActiveRaidId(null); setView("list"); onNavigate("/quiz"); }}>
           Return to Arena
        </button>
      </div>
    );
  }

  return (
    <div className={`${STICKER} p-8 text-center`}>
      <h2 className={`${DISPLAY} font-bold text-2xl`}>Work in progress</h2>
      <button onClick={() => setView("list")} className="underline text-blue-600 mt-4 font-bold">Go Back</button>
    </div>
  );
};

// -- SUBCOMPONENTS --

function BossRaidList({ onSelect, onCreate, aceCoins }: { onSelect: (id: string) => void, onCreate: () => void, aceCoins: number }) {
  const [raids, setRaids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRaids = async () => {
      setLoading(true);
      try {
        // Fetch active raids
        const { data: raidsData, error: raidsError } = await (supabase as any).from("boss_raids")
          .select(`*`)
          .eq("status", "active")
          .order("created_at", { ascending: false });
          
        if (raidsError) throw raidsError;
        
        if (raidsData && raidsData.length > 0) {
          // Fetch creator usernames
          const creatorIds = [...new Set(raidsData.map((r: any) => r.creator_id))];
          const { data: profilesData, error: profilesError } = await (supabase as any).from("profiles")
            .select("user_id, username")
            .in("user_id", creatorIds);
            
          if (!profilesError && profilesData) {
            const profileMap = new Map(profilesData.map((p: any) => [p.user_id, p.username]));
            const raidsWithCreators = raidsData.map((r: any) => ({
              ...r,
              creator_username: profileMap.get(r.creator_id)
            }));
            setRaids(raidsWithCreators);
          } else {
            setRaids(raidsData);
          }
        } else {
          setRaids([]);
        }
      } catch (err: any) {
        console.error("Error fetching raids:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRaids();
  }, []);

  return (
    <div className="space-y-6">
      <div className={`${STICKER} p-6 flex flex-col md:flex-row items-center justify-between gap-4`} style={{ background: "#9333ea" }}>
        <div className="text-white">
          <h2 className={`${DISPLAY} font-extrabold text-3xl flex items-center gap-2`}>
            <Skull className="w-7 h-7" /> Boss Raids
          </h2>
          <p className="font-semibold opacity-90">High stakes, high rewards. Challenge the toughest quizzes.</p>
        </div>
        <button className={`${BTN} bg-white text-[#9333ea] shrink-0`} onClick={onCreate}>
          <Plus className="w-5 h-5" /> Be a Quiz Lord
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-[#9333ea]" /></div>
      ) : raids.length === 0 ? (
        <div className={`${STICKER} p-10 text-center bg-slate-50`}>
          <Skull className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className={`${DISPLAY} font-extrabold text-2xl text-slate-400`}>No active raids</p>
          <p className="font-medium text-slate-500 mt-1">Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {raids.map((r, i) => (
             <div key={r.id} className={`${STICKER} p-5 flex flex-col gap-3 transition-all hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A]`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="bg-[#fdf4ff] text-[#9333ea] border-2 border-[#9333ea] px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1 shrink-0">
                    <Swords className="w-3 h-3" /> Active Raid
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">Bounty Pot</p>
                    <p className={`${DISPLAY} font-bold text-xl text-amber-500 flex items-center justify-end gap-1 leading-none`}><Coins className="w-4 h-4"/> {(r.initial_bounty + r.bounty_pot).toLocaleString()}</p>
                  </div>
                </div>
                <h3 className={`${DISPLAY} font-extrabold text-xl leading-tight line-clamp-2`}>{r.title}</h3>
                <p className="text-sm font-semibold text-slate-500 line-clamp-2 mt-auto">By {r.creator_username || 'Anonymous'}</p>
                
                <button className={`${BTN} mt-2 w-full text-white`} style={{ background: "#9333ea", padding: "10px 20px" }} onClick={() => onSelect(r.id)}>
                   Challenge ({r.min_entry_fee} ACE)
                </button>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BossRaidCreate({ onCancel, onCreated }: any) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [bounty, setBounty] = useState(100);
  const [fee, setFee] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState([{ text: "", answers: [{ text: "", is_correct: true, id: "1" }, { text: "", is_correct: false, id: "2" }] }]);

  const addOpt = (qIdx: number) => {
    const q = [...questions];
    q[qIdx].answers.push({ text: "", is_correct: false, id: Math.random().toString() });
    setQuestions(q);
  };

  const addQ = () => {
    setQuestions([...questions, { text: "", answers: [{ text: "", is_correct: true, id: "1" }, { text: "", is_correct: false, id: "2" }] }]);
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
       const { data, error } = await (supabase as any).rpc('create_boss_raid', {
          p_title: title,
          p_description: desc,
          p_visibility: 'global',
          p_university: null,
          p_initial_bounty: bounty,
          p_min_entry_fee: fee,
          p_questions: questions
       });
       if (error) throw error;
       onCreated(data, bounty);
    } catch(e: any) {
       alert(e.message || "Failed to create raid");
    } finally {
       setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button onClick={onCancel} className="font-bold flex items-center gap-1 hover:underline"><ChevronLeft className="w-4 h-4" /> Back to Arena</button>
      <div className={`${STICKER} p-6 md:p-8 space-y-6`}>
         <div className="text-center mb-6">
            <h2 className={`${DISPLAY} font-extrabold text-3xl`}>Create Boss Raid</h2>
            <p className="font-medium text-slate-500">Put your ACE coins on the line and challenge the world.</p>
         </div>

         <div className="space-y-4">
            <div>
               <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Raid Title</label>
               <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full border-[2.5px] border-[#0F172A] rounded-[16px] px-4 py-3 font-semibold mt-1 outline-none" placeholder="e.g., The Ultimate Biology Exam" />
            </div>
            <div>
               <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Description</label>
               <textarea value={desc} onChange={e=>setDesc(e.target.value)} className="w-full border-[2.5px] border-[#0F172A] rounded-[16px] px-4 py-3 font-semibold mt-1 outline-none min-h-[80px]" placeholder="Rules or taunts..." />
            </div>
            <div className="flex gap-4">
               <div className="flex-1">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Your Stake (Bounty)</label>
                  <input type="number" min={50} value={bounty} onChange={e=>setBounty(Number(e.target.value))} className="w-full border-[2.5px] border-[#0F172A] rounded-[16px] px-4 py-3 font-semibold mt-1 outline-none" />
               </div>
               <div className="flex-1">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Challenger Entry Fee</label>
                  <input type="number" min={5} value={fee} onChange={e=>setFee(Number(e.target.value))} className="w-full border-[2.5px] border-[#0F172A] rounded-[16px] px-4 py-3 font-semibold mt-1 outline-none" />
               </div>
            </div>
         </div>

         <div className="border-t-2 border-slate-100 my-6"></div>
         
         <div className="space-y-6">
            <h3 className={`${DISPLAY} font-bold text-xl`}>Questions ({questions.length})</h3>
            {questions.map((q, i) => (
               <div key={i} className="border-2 border-[#0F172A] rounded-[20px] p-4 space-y-4 bg-slate-50 relative">
                  {questions.length > 1 && (
                     <button type="button" onClick={() => {
                        const newQ = [...questions];
                        newQ.splice(i, 1);
                        setQuestions(newQ);
                     }} className="absolute top-2 right-4 text-xs font-bold text-red-500 hover:underline">
                        Remove Question
                     </button>
                  )}
                  <input value={q.text} onChange={e=>{const n=[...questions]; n[i].text=e.target.value; setQuestions(n)}} placeholder={`Question ${i+1}`} className="w-full border-[2.5px] border-[#0F172A] rounded-[12px] px-3 py-2 font-semibold outline-none" />
                  <div className="space-y-2">
                     {q.answers.map((a, j) => (
                        <div key={a.id} className="flex items-center gap-2">
                           <button onClick={()=>{const n=[...questions]; n[i].answers.forEach(x=>x.is_correct=false); n[i].answers[j].is_correct=true; setQuestions(n)}} className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center ${a.is_correct ? 'bg-green-500 border-green-700 text-white' : 'border-slate-300'}`}>
                              {a.is_correct && <CheckCircle2 className="w-4 h-4" />}
                           </button>
                           <input value={a.text} onChange={e=>{const n=[...questions]; n[i].answers[j].text=e.target.value; setQuestions(n)}} placeholder={`Option ${j+1}`} className="flex-1 border-[2px] border-slate-300 rounded-[8px] px-3 py-1 text-sm font-semibold outline-none" />
                        </div>
                     ))}
                  </div>
                  <button onClick={()=>addOpt(i)} className="text-xs font-bold text-blue-600 hover:underline">+ Add Option</button>
               </div>
            ))}
            <button onClick={addQ} className="w-full py-3 border-[2.5px] border-dashed border-[#0F172A] rounded-[20px] font-bold text-slate-600 hover:bg-slate-50">+ Add Question</button>
         </div>

         <button disabled={!title || submitting} onClick={handleCreate} className={`${BTN} w-full text-white mt-6`} style={{ background: "#9333ea" }}>
            {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "Deploy Raid"}
         </button>
      </div>
    </div>
  );
}

function BossRaidDetail({ raidId, onBack, onStart }: any) {
  const [raid, setRaid] = useState<any>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shake, setShake] = useState(false);
  const { user } = useAuth();
  const { pushMessage } = useMascot();

  useEffect(() => {
    const fetchIt = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: raidError } = await (supabase as any).from("boss_raids")
          .select(`*`)
          .eq("id", raidId).single();
        
        if (raidError) throw raidError;
        
        const { count } = await (supabase as any).from("boss_raid_questions").select("*", { count: "exact" }).eq("raid_id", raidId);
        
        // Fetch creator username separately to be safer with joins
        const { data: creatorData } = await (supabase as any).from("profiles").select("username").eq("user_id", data.creator_id).single();
        
        setRaid({...data, creator_username: creatorData?.username });
        setQuestionCount(count || 0);
      } catch (err: any) {
        console.error("Detail Fetch Error:", err);
        setError(err.message || "Failed to load raid details.");
      } finally {
        setLoading(false);
      }
    };
    fetchIt();
  }, [raidId]);

  const handleStart = async () => {
    if (!raid) return;
    setStarting(true);
    setShake(false);
    try {
      const { data, error } = await ((supabase as any).rpc as any)('start_raid_attempt', {
        p_raid_id: raid.id,
        p_bet_amount: raid.min_entry_fee
      });
      if (error) throw error;
      
      onStart(raid.min_entry_fee, data); // pass cost and attemptId
    } catch(e: any) {
       setShake(true);
       setTimeout(() => setShake(false), 500);
       let errorMsg = e.message || "Failed to start raid.";
       if (errorMsg.includes("Insufficient ACE Coins")) {
           errorMsg = `Not enough ACE Coins! You need ${raid.min_entry_fee} ACE to enter this raid.`;
       }
       pushMessage(errorMsg, "high", "urgent");
    } finally {
       setStarting(false);
    }
  };

  const shareUrl = `${window.location.origin}/quiz?raid=${raidId}`;
  const shareText = `Bet you can't pass my Boss Raid: "${raid?.title}"! Entry is ${raid?.min_entry_fee} ACE Coins. Can you take my pot of ${raid ? (raid.initial_bounty + raid.bounty_pot) : 0} ACE Coins?`;

  const copyLink = () => {
     navigator.clipboard.writeText(shareUrl);
     pushMessage("Raid Link copied! Dare your friends to attempt it.", "normal", "happy");
     setShowShare(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Boss Raid: ${raid.title}`,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    }
  };

  const handleStopRaid = async () => {
    if (!window.confirm("Are you sure you want to stop this raid? The pot will be refunded to you.")) return;
    setStarting(true);
    try {
      const { error } = await (supabase as any).rpc('stop_boss_raid', { p_raid_id: raid.id });
      if (error) throw error;
      onBack();
    } catch(err: any) {
      alert(err.message || "Failed to stop raid.");
      setStarting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-[#9333ea]" /></div>;
  if (error || !raid) return <div className="text-center p-10 font-bold">{error || "Raid not found."}</div>;

  const totalPot = raid.initial_bounty + raid.bounty_pot;
  const isCreator = user?.id === raid.creator_id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <style>{SHAKE_ANIMATION}</style>
      <button onClick={onBack} className="font-bold flex items-center gap-1 hover:underline"><ChevronLeft className="w-4 h-4" /> Back to Arena</button>
      
      <div className={`${STICKER} p-8 text-center bg-gradient-to-br from-slate-900 to-indigo-900 text-white relative overflow-hidden`}>
         <div className="absolute top-4 right-4 bg-amber-500 text-[#0F172A] px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 shadow-[2px_2px_0_0_#0F172A]">
           <Swords className="w-4 h-4"/> Active
         </div>
         <Skull className="w-16 h-16 mx-auto mb-4 opacity-50" />
         <h1 className={`${DISPLAY} font-extrabold text-4xl mb-2 leading-tight`}>{raid.title}</h1>
         <p className="font-medium text-indigo-200 mb-6 border-b border-white/10 pb-6">{raid.description || "Prepare yourself."}</p>
         
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-black/30 rounded-[16px] p-4 border-2 border-white/10">
               <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest pl-1 mb-1">Total Pot</p>
               <p className={`${DISPLAY} font-extrabold text-2xl text-amber-500`}>{totalPot}</p>
            </div>
            <div className="bg-black/30 rounded-[16px] p-4 border-2 border-white/10">
               <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest pl-1 mb-1">Entry Fee</p>
               <p className={`${DISPLAY} font-extrabold text-2xl text-blue-400`}>{raid.min_entry_fee}</p>
            </div>
            <div className="bg-black/30 rounded-[16px] p-4 border-2 border-white/10">
               <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest pl-1 mb-1">Questions</p>
               <p className={`${DISPLAY} font-extrabold text-2xl text-white`}>{questionCount}</p>
            </div>
            <div className="bg-black/30 rounded-[16px] p-4 border-2 border-white/10">
               <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest pl-1 mb-1">Visibility</p>
               <p className={`${DISPLAY} font-extrabold text-2xl text-white capitalize`}>{raid.visibility}</p>
            </div>
         </div>
         
         <p className="text-sm font-semibold opacity-70">Created by {raid.creator_username || 'Anonymous'}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {isCreator ? (
          <div className={`${STICKER} p-6 flex-1 text-center bg-slate-50 flex flex-col justify-center`}>
             <h3 className="font-bold mb-1">You are the Quiz Lord</h3>
             <p className="text-sm text-slate-500 mb-3">You cannot challenge your own Boss Raid.</p>
             <button onClick={handleStopRaid} disabled={starting} className={`${BTN} mx-auto bg-red-50 text-red-600 border-red-200 shadow-none hover:bg-red-100`}>
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Stop Raid & Refund Pot"}
             </button>
          </div>
        ) : raid.status === 'cleared' ? (
          <div className={`${STICKER} p-6 flex-1 text-center bg-green-50`}>
             <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
             <h3 className="font-bold mb-1">Raid Cleared</h3>
             <p className="text-sm text-slate-500">Someone already defeated this boss and took all the coins!</p>
          </div>
        ) : (
          <button onClick={handleStart} disabled={starting} className={`${BTN} flex-1 text-white ${shake ? 'shake-err bg-red-500 border-red-700 shadow-[4px_4px_0_0_#b91c1c]' : 'bg-[#9333ea]'}`} style={!shake ? { background: "#9333ea" } : {}}>
            {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Enter Raid (-${raid.min_entry_fee} ACE)`}
          </button>
        )}

        <div className="relative md:flex-none">
          <button className={`${BTN} w-full md:w-auto bg-white text-[#0F172A]`} onClick={() => setShowShare(!showShare)}>
            <Share2 className="w-5 h-5" /> Share Raid
          </button>
          
          {showShare && (
            <div className="absolute right-0 bottom-full mb-3 w-64 bg-white border-[3px] border-[#0F172A] rounded-[20px] p-4 shadow-[4px_4px_0_0_#0F172A] z-10 flex flex-col gap-2">
              <h4 className="font-extrabold text-[#0F172A] text-sm mb-1 pb-2 border-b-2 border-slate-100 uppercase tracking-wider">Share via...</h4>
              <button onClick={copyLink} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-xl text-sm font-bold text-left transition-colors">
                <Copy className="w-4 h-4 text-slate-600"/> Copy Link
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-xl text-sm font-bold text-left transition-colors">
                <MessageCircle className="w-4 h-4 text-green-500"/> WhatsApp
              </a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-xl text-sm font-bold text-left transition-colors">
                <Send className="w-4 h-4 text-blue-500"/> Telegram
              </a>
              {navigator.share && (
                <button onClick={handleNativeShare} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-xl text-sm font-bold text-left transition-colors">
                  <Smartphone className="w-4 h-4 text-purple-500"/> More (IG, TikTok...)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function BossRaidTaking({ raidId, attemptId, onComplete }: any) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
     const fetchQ = async () => {
        setLoading(true);
        const { data } = await supabase.from("boss_raid_questions" as any).select("*").eq("raid_id", raidId).order("position", { ascending: true });
        if (data) setQuestions(data);
        setLoading(false);
     };
     fetchQ();
  }, [raidId]);

  const handleSubmit = async () => {
     setSubmitting(true);
     try {
        // Build answer map: { question_id: selected_answer_id }
        const answerMap: Record<string, string> = {};
        questions.forEach((q: any, idx: number) => {
           if (answers[idx]) {
              answerMap[q.id] = answers[idx];
           }
        });

        const { data, error } = await (supabase.rpc as any)('finish_raid_attempt', {
           p_attempt_id: attemptId,
           p_answers: answerMap
        });

        if (error) throw error;
        onComplete(data);
     } catch(e: any) {
        alert(e.message || "Failed to submit attempt.");
     } finally {
        setSubmitting(false);
     }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-[#9333ea]" /></div>;
  if (!questions.length) return <div className="text-center font-bold p-10">No questions found.</div>;

  const currentQ = questions[currentIndex];
  const isSelected = answers[currentIndex];
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div className="flex items-center justify-between">
          <span className="font-extrabold text-[#9333ea] border-2 border-[#9333ea] px-3 py-1 bg-[#fdf4ff] rounded-full">
             Question {currentIndex + 1} of {questions.length}
          </span>
       </div>
       
       <div className={`${STICKER} p-6 md:p-10 bg-slate-50 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#9333ea]/10 rounded-bl-[100px] -mr-10 -mt-10" />
          <h2 className={`${DISPLAY} font-extrabold text-2xl mb-8 relative z-10`}>{currentQ.question_text}</h2>
          
          <div className="space-y-3 relative z-10">
             {currentQ.answers.map((a: any, i: number) => {
                const isActive = answers[currentIndex] === a.id;
                return (
                  <button
                     key={a.id}
                     onClick={() => setAnswers({...answers, [currentIndex]: a.id})}
                     className={cn(
                        "w-full rounded-[20px] border-[3px] border-[#0F172A] p-4 text-left shadow-[4px_4px_0_0_#0F172A] transition-all hover:-translate-y-1 active:translate-y-0.5",
                        isActive ? "bg-[#9333ea] text-white" : "bg-white hover:bg-slate-100 text-[#0F172A]"
                     )}
                  >
                     <div className="flex gap-4 items-center">
                        <span className={cn(
                           "shrink-0 w-8 h-8 rounded-[10px] border-2 flex items-center justify-center font-extrabold font-['Baloo_2']",
                           isActive ? "bg-white text-[#9333ea] border-white/50" : "bg-slate-100 border-[#0F172A] text-[#0F172A]"
                        )}>
                           {["A","B","C","D","E","F"][i]}
                        </span>
                        <span className="font-semibold text-lg">{a.text}</span>
                     </div>
                  </button>
                )
             })}
          </div>
       </div>

       <div className="flex gap-4">
          <button 
             disabled={currentIndex === 0} 
             onClick={() => setCurrentIndex(currentIndex - 1)}
             className={`${BTN} bg-white flex-1 disabled:opacity-50 text-[#0F172A]`}
          >
             <ChevronLeft className="w-5 h-5"/> Previous
          </button>

          {currentIndex === questions.length - 1 ? (
             <button 
                disabled={submitting || !isSelected}
                onClick={handleSubmit} 
                className={`${BTN} flex-1 text-white bg-amber-500 hover:bg-amber-400`}
             >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "Submit Raid"}
             </button>
          ) : (
             <button 
                disabled={!isSelected}
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className={`${BTN} flex-1 text-white`} 
                style={{ background: "#9333ea" }}
             >
                Next
             </button>
          )}
       </div>
    </div>
  );
}


import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, Sparkles, Star, Zap, Flame, Trophy, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/assets/logo.webp";

const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", skySoft: "#DDF3FF", cloud: "#F3FAFF",
  sun: "#FFD65C", pop: "#FF7A59",
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";

const Auth = () => {
  useEffect(() => {
    document.title = "Sign In – AceTerus";
    return () => { document.title = "AceTerus – AI Tutor & Quiz Platform for Malaysian Students"; };
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        // Supabase returns this error when email confirmation is disabled
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already in use")
        ) {
          setError("An account with this email already exists. Please sign in instead.");
        } else {
          setError(error.message);
        }
      } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        // When email confirmation is enabled, duplicate emails return an empty identities array
        setError("An account with this email already exists. Please sign in instead.");
      } else {
        setSuccess("Check your email for the confirmation link!");
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    "w-full border-[2.5px] border-[#0F172A] rounded-[14px] px-4 py-3 font-medium bg-white focus:outline-none focus:border-[#2F7CFF] focus:shadow-[0_0_0_3px_rgba(47,124,255,0.15)] transition-all placeholder:text-slate-400 pl-10";

  return (
    <div
      className="font-['Nunito'] min-h-screen relative text-[#0F172A] overflow-x-hidden"
      style={{
        backgroundColor: C.cloud,
        backgroundImage: `
          radial-gradient(900px 600px at 90% -10%, rgba(59,214,245,.5), transparent 60%),
          radial-gradient(700px 500px at -5% 20%,  rgba(47,124,255,.4), transparent 60%),
          radial-gradient(600px 500px at 50% 110%, rgba(46,43,229,.25), transparent 60%)
        `,
      }}
    >
      {/* grain */}
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.04] mix-blend-multiply"
        style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")" }} />

      <style>{`
        @keyframes auth-float  { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-10px)} }
        @keyframes auth-wobble { 0%,100%{transform:rotate(-3deg)}  50%{transform:rotate(3deg)}      }
        .auth-float  { animation: auth-float  4s ease-in-out infinite; }
        .auth-float2 { animation: auth-float  5.5s ease-in-out infinite .7s; }
        .auth-float3 { animation: auth-float  3.8s ease-in-out infinite 1.4s; }
        .auth-wobble { animation: auth-wobble 6s ease-in-out infinite; }
        .auth-tab-active { background:${C.blue}; color:#fff; box-shadow:3px 3px 0 0 ${C.ink}; transform:translateY(-1px); }
        .auth-input-wrap { position:relative; }
        .auth-input-wrap svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); width:16px; height:16px; color:#94a3b8; pointer-events:none; }
      `}</style>

      {/* floating decorators */}
      <Sparkles className="auth-float  fixed pointer-events-none" style={{ top: 120, left: "5%",  color: C.cyan,   width: 28, height: 28, opacity: 0.7 }} />
      <Star     className="auth-float2 fixed pointer-events-none" style={{ top: 80,  right: "8%", color: C.indigo, fill: C.indigo, width: 26, height: 26, opacity: 0.7 }} />
      <Zap      className="auth-float3 fixed pointer-events-none" style={{ bottom: 160, left: "8%",  color: C.sun, fill: C.sun, width: 24, height: 24, opacity: 0.7 }} />
      <Flame    className="auth-float  fixed pointer-events-none" style={{ bottom: 120, right: "6%", color: C.pop, fill: C.pop, width: 26, height: 26, opacity: 0.7 }} />

      {/* cloud blobs */}
      <div className="auth-float2 fixed pointer-events-none bg-white border-[3px] border-[#0F172A] rounded-full shadow-[4px_4px_0_0_#0F172A]"
        style={{ top: 200, left: "2%", width: 90, height: 38, opacity: 0.8 }} />
      <div className="auth-float  fixed pointer-events-none bg-white border-[3px] border-[#0F172A] rounded-full shadow-[4px_4px_0_0_#0F172A]"
        style={{ bottom: 200, right: "3%", width: 110, height: 44, opacity: 0.8 }} />

      <div className="min-h-screen flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-14 items-center">

          {/* ── LEFT: mascot + copy ── */}
          <div className="hidden lg:flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-3 w-fit">
              <img src={Logo} alt="AceTerus" className="w-12 h-12 rounded-2xl border-[3px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A]" />
              <span className={`${DISPLAY} font-extrabold text-2xl`}>AceTerus</span>
            </Link>

            <h1 className={`${DISPLAY} font-extrabold leading-[0.95]`} style={{ fontSize: "clamp(40px,5vw,72px)" }}>
              {activeTab === "signin" ? (
                <>Welcome<br />back,<br /><span style={{ color: C.blue }}>legend! 👋</span></>
              ) : (
                <>Join the<br /><span style={{ color: C.blue }}>squad</span><br />today! 🚀</>
              )}
            </h1>
            <p className="font-medium text-lg max-w-xs text-slate-600">
              {activeTab === "signin"
                ? "Your streak is waiting. Pick up right where you left off."
                : "Free forever. Quizzes, streaks, AI tutor, and your whole squad — all in one place."}
            </p>

            {/* mini stat cards */}
            <div className="flex flex-col gap-3 mt-2">
              <div className="auth-float flex items-center gap-3 w-fit px-4 py-3 rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] bg-white"
                style={{ transform: "rotate(-2deg)" }}>
                <Flame className="w-5 h-5" style={{ color: C.pop }} />
                <div>
                  <div className={`${DISPLAY} font-extrabold text-sm leading-none`}>12-day streak</div>
                  <div className="text-[10px] font-bold opacity-60">keep it going 🔥</div>
                </div>
              </div>
              <div className="auth-float2 flex items-center gap-3 w-fit px-4 py-3 rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] ml-10"
                style={{ background: C.cyan, transform: "rotate(1.5deg)" }}>
                <Trophy className="w-5 h-5" style={{ color: C.indigo }} />
                <div>
                  <div className={`${DISPLAY} font-extrabold text-sm leading-none`}>Top of the board!</div>
                  <div className="text-[10px] font-bold opacity-70">this week's #1 🏆</div>
                </div>
              </div>
              <div className="auth-float3 flex items-center gap-3 w-fit px-4 py-3 rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A]"
                style={{ background: C.indigo, color: "#fff", transform: "rotate(-1deg)" }}>
                <Sparkles className="w-5 h-5" style={{ color: C.sun }} />
                <div>
                  <div className={`${DISPLAY} font-extrabold text-sm leading-none`}>+250 XP earned</div>
                  <div className="text-[10px] font-bold opacity-70">from today's quiz ✨</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: form card ── */}
          <div className="flex flex-col gap-5">
            {/* mobile logo */}
            <Link to="/" className="lg:hidden flex items-center gap-3 justify-center">
              <img src={Logo} alt="AceTerus" className="w-10 h-10 rounded-xl border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A]" />
              <span className={`${DISPLAY} font-extrabold text-xl`}>AceTerus</span>
            </Link>

            {/* card */}
            <div className="border-[3px] border-[#0F172A] rounded-[28px] shadow-[8px_8px_0_0_#0F172A] bg-white p-8">
              {/* tab switcher */}
              <div className="flex gap-2 p-1 rounded-full border-[2.5px] border-[#0F172A] bg-[#F3FAFF] mb-7">
                {(["signin", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setActiveTab(t); setError(""); setSuccess(""); }}
                    className={`${DISPLAY} flex-1 py-2.5 rounded-full font-extrabold text-sm transition-all duration-200 ${activeTab === t ? "auth-tab-active" : "hover:bg-white/60"}`}
                  >
                    {t === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              {activeTab === "signin" ? (
                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-sm" htmlFor="si-email">Email</label>
                    <div className="auth-input-wrap">
                      <Mail />
                      <input id="si-email" type="email" placeholder="you@email.com" required
                        value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-sm" htmlFor="si-pw">Password</label>
                    <div className="auth-input-wrap">
                      <Lock />
                      <input id="si-pw" type="password" placeholder="••••••••" required
                        value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  <button type="submit" disabled={isLoading}
                    className={`${DISPLAY} w-full py-3.5 rounded-full border-[3px] border-[#0F172A] font-extrabold text-white shadow-[5px_5px_0_0_#0F172A] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center gap-2`}
                    style={{ background: C.blue }}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {isLoading ? "Signing in…" : "Let's go!"}
                  </button>

                  <div className="relative my-4 flex items-center justify-center">
                    <div className="border-t-[2px] border-slate-200 w-full"></div>
                    <span className="bg-white px-3 font-bold text-sm text-slate-400 uppercase tracking-widest absolute">Or</span>
                  </div>

                  <button type="button" disabled={isLoading} onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
                    className={`${DISPLAY} w-full py-3.5 rounded-full border-[3px] border-[#0F172A] font-extrabold text-[#0F172A] bg-white shadow-[5px_5px_0_0_#0F172A] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center gap-3`}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Sign in with Google
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-sm" htmlFor="su-email">Email</label>
                    <div className="auth-input-wrap">
                      <Mail />
                      <input id="su-email" type="email" placeholder="you@email.com" required
                        value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-sm" htmlFor="su-pw">Password</label>
                    <div className="auth-input-wrap">
                      <Lock />
                      <input id="su-pw" type="password" placeholder="••••••••" required
                        value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-sm" htmlFor="su-cpw">Confirm Password</label>
                    <div className="auth-input-wrap">
                      <Lock />
                      <input id="su-cpw" type="password" placeholder="••••••••" required
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  {error   && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
                  <button type="submit" disabled={isLoading}
                    className={`${DISPLAY} w-full py-3.5 rounded-full border-[3px] border-[#0F172A] font-extrabold text-white shadow-[5px_5px_0_0_#0F172A] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center gap-2`}
                    style={{ background: C.indigo }}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isLoading ? "Creating account…" : "Join the squad!"}
                  </button>

                  <div className="relative my-4 flex items-center justify-center">
                    <div className="border-t-[2px] border-slate-200 w-full"></div>
                    <span className="bg-white px-3 font-bold text-sm text-slate-400 uppercase tracking-widest absolute">Or</span>
                  </div>

                  <button type="button" disabled={isLoading} onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
                    className={`${DISPLAY} w-full py-3.5 rounded-full border-[3px] border-[#0F172A] font-extrabold text-[#0F172A] bg-white shadow-[5px_5px_0_0_#0F172A] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center gap-3`}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Sign up with Google
                  </button>
                </form>
              )}
            </div>

            <Link to="/" className="flex items-center justify-center gap-1.5 font-bold text-sm opacity-60 hover:opacity-100 transition-opacity">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
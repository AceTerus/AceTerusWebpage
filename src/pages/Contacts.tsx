import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  MessageCircle,
  Mail,
  Globe,
  Instagram,
  MapPin,
  Send,
  CheckCircle2,
  Building2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/assets/logo.webp";

const C = {
  cyan: "#3BD6F5",
  blue: "#2F7CFF",
  indigo: "#2E2BE5",
  ink: "#0F172A",
  cloud: "#F3FAFF",
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";

const PHONE_INTL = "+60195796233";
const PHONE_DISPLAY = "+6019-579 6233";
const WHATSAPP_URL = "https://wa.me/60195796233";
const CEO_EMAIL = "chinwei@aceterus.com";
const GENERAL_EMAIL = "hello@aceterus.com";
const WEBSITE_URL = "https://aceterus.com";
const WEBSITE_DISPLAY = "aceterus.com";
const INSTAGRAM_URL = "https://instagram.com/aceterus";
const INSTAGRAM_HANDLE = "@aceterus";
const ADDRESS =
  "Blok C, Fakulti Teknologi dan Sains Maklumat, Universiti Kebangsaan Malaysia, 43600 Bangi, Selangor";

type ActionColor = "cyan" | "blue" | "indigo" | "green";

const colorMap: Record<ActionColor, string> = {
  cyan: "#3BD6F5",
  blue: "#2F7CFF",
  indigo: "#2E2BE5",
  green: "#25D366",
};

type ContactsProps = { variant?: "ceo" | "general" };

const Contacts = ({ variant = "general" }: ContactsProps) => {
  const isCeo = variant === "ceo";
  const contactEmail = isCeo ? CEO_EMAIL : GENERAL_EMAIL;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = isCeo ? "Chin Wei · AceTerus" : "Contact Us – AceTerus";
    return () => {
      document.title = prev;
    };
  }, [isCeo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      toast.error("That email address doesn't look right.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("contact_submissions")
        .insert({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
          source: isCeo ? "qr-contacts-ceo" : "web-contacts-general",
          user_agent: navigator.userAgent.slice(0, 500),
        });

      if (error) throw error;

      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
      toast.success("Thanks! We'll get back to you soon.");
    } catch (err) {
      console.error("contact submission failed", err);
      toast.error(
        isCeo
          ? "Couldn't send just yet. Please try WhatsApp or email us directly."
          : "Couldn't send just yet. Please email us directly."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="font-['Nunito'] min-h-screen text-[#0F172A]"
      style={{
        backgroundColor: C.cloud,
        backgroundImage: `
          radial-gradient(600px 420px at 90% -10%, rgba(59,214,245,.45), transparent 60%),
          radial-gradient(520px 360px at -10% 10%, rgba(47,124,255,.35), transparent 60%),
          radial-gradient(700px 500px at 50% 110%, rgba(46,43,229,.22), transparent 60%)
        `,
      }}
    >
      <main className="mx-auto w-full max-w-[520px] px-5 pt-8 pb-14">
        {/* Logo + brand */}
        <div className="flex flex-col items-center text-center">
          <img
            src={Logo}
            alt="AceTerus"
            className="w-20 h-20 rounded-[22px] border-[3px] border-[#0F172A] shadow-[5px_5px_0_0_#0F172A] bg-white"
          />
          <span
            className={`${DISPLAY} font-extrabold text-[22px] mt-3 tracking-tight`}
          >
            AceTerus
          </span>
        </div>

        {/* Persona card — CEO variant only */}
        {isCeo && (
          <section
            className="mt-5 border-[3px] border-[#0F172A] rounded-[22px] shadow-[5px_5px_0_0_#0F172A] bg-white p-4 flex items-center gap-4"
            style={{
              backgroundImage: `linear-gradient(135deg, #ffffff 0%, ${C.cloud} 100%)`,
            }}
          >
            <div
              className="shrink-0 w-14 h-14 rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${C.cyan} 0%, ${C.blue} 100%)`,
              }}
            >
              <UserRound className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`${DISPLAY} font-extrabold text-[22px] leading-none`}>
                Chin Wei
              </p>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span
                  className={`${DISPLAY} inline-block text-[11px] font-extrabold uppercase tracking-[0.18em] px-2.5 py-0.5 rounded-full border-[2px] border-[#0F172A] text-white`}
                  style={{ background: C.indigo }}
                >
                  CEO
                </span>
                <span className="text-[13px] font-bold text-[#0F172A]/60">
                  AceTerus
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Headline card */}
        <section
          className="mt-6 border-[3px] border-[#0F172A] rounded-[26px] shadow-[6px_6px_0_0_#0F172A] bg-white p-6 text-center"
          style={{
            backgroundImage: `linear-gradient(140deg, #ffffff 0%, ${C.cloud} 100%)`,
          }}
        >
          <span
            className={`${DISPLAY} inline-block text-[11px] font-extrabold uppercase tracking-[0.18em] px-3 py-1 rounded-full border-[2px] border-[#0F172A] text-[#0F172A]`}
            style={{ background: C.cyan }}
          >
            Say hello
          </span>
          <h1
            className={`${DISPLAY} font-extrabold text-[30px] leading-[1.1] mt-3`}
          >
            A door to the future of education.
          </h1>
          <p className="mt-3 text-[15px] text-[#0F172A]/70 font-medium leading-snug">
            Let's start a conversation about better learning experiences.
          </p>
        </section>

        {/* Contact action buttons */}
        <section className="mt-6 space-y-3">
          {isCeo && (
            <>
              <ActionButton
                href={`tel:${PHONE_INTL}`}
                icon={<Phone className="w-6 h-6" strokeWidth={2.5} />}
                label="Call us"
                value={PHONE_DISPLAY}
                color="blue"
              />
              <ActionButton
                href={WHATSAPP_URL}
                external
                icon={<MessageCircle className="w-6 h-6" strokeWidth={2.5} />}
                label="WhatsApp us"
                value={PHONE_DISPLAY}
                color="green"
              />
            </>
          )}
          <ActionButton
            href={`mailto:${contactEmail}`}
            icon={<Mail className="w-6 h-6" strokeWidth={2.5} />}
            label="Email us"
            value={contactEmail}
            color="cyan"
          />
          <ActionButton
            href={WEBSITE_URL}
            external
            icon={<Globe className="w-6 h-6" strokeWidth={2.5} />}
            label="Visit our website"
            value={WEBSITE_DISPLAY}
            color="indigo"
          />
        </section>

        {/* Company info */}
        <section className="mt-8 border-[3px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-5">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center"
              style={{ background: C.cyan }}
            >
              <Building2 className="w-5 h-5 text-[#0F172A]" strokeWidth={2.5} />
            </div>
            <div>
              <p
                className={`${DISPLAY} font-extrabold text-[11px] uppercase tracking-[0.16em] text-[#0F172A]/60`}
              >
                Company
              </p>
              <p className={`${DISPLAY} font-extrabold text-[18px] leading-none mt-0.5`}>
                AceTerus
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5">
            <div
              className="shrink-0 w-9 h-9 rounded-xl border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center"
              style={{ background: C.blue }}
            >
              <MapPin className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p
                className={`${DISPLAY} font-extrabold text-[11px] uppercase tracking-[0.16em] text-[#0F172A]/60`}
              >
                Address
              </p>
              <p className="text-[14.5px] font-semibold leading-snug mt-1 text-[#0F172A]/85">
                {ADDRESS}
              </p>
            </div>
          </div>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center gap-3 rounded-[16px] border-[2.5px] border-[#0F172A] bg-[#F3FAFF] px-4 py-3 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-[1px] transition-transform"
          >
            <div
              className="w-9 h-9 rounded-xl border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg,#f58529 0%,#dd2a7b 50%,#8134af 100%)",
              }}
            >
              <Instagram className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className={`${DISPLAY} font-extrabold text-[15px] leading-none`}>
                Instagram
              </p>
              <p className="text-[13px] font-semibold text-[#0F172A]/60 mt-0.5">
                {INSTAGRAM_HANDLE}
              </p>
            </div>
            <span className="text-[13px] font-extrabold text-[#2F7CFF]">
              Follow →
            </span>
          </a>
        </section>

        {/* Contact form */}
        <section
          className="mt-8 border-[3px] border-[#0F172A] rounded-[26px] shadow-[6px_6px_0_0_#0F172A] bg-white p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-9 h-9 rounded-xl border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center"
              style={{ background: C.indigo }}
            >
              <Send className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p
                className={`${DISPLAY} font-extrabold text-[11px] uppercase tracking-[0.16em] text-[#0F172A]/60`}
              >
                Or leave a note
              </p>
              <h2
                className={`${DISPLAY} font-extrabold text-[20px] leading-none mt-0.5`}
              >
                Send us a message
              </h2>
            </div>
          </div>

          {sent ? (
            <div className="rounded-[18px] border-[2.5px] border-[#0F172A] bg-[#ECFDF5] p-5 flex items-start gap-3">
              <CheckCircle2
                className="w-6 h-6 text-[#16A34A] shrink-0"
                strokeWidth={2.5}
              />
              <div>
                <p className={`${DISPLAY} font-extrabold text-[16px]`}>
                  Message received!
                </p>
                <p className="text-[14px] font-medium text-[#0F172A]/75 mt-1">
                  Thanks for reaching out — we'll reply to your email shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-3 text-[13px] font-extrabold text-[#2F7CFF] hover:underline"
                >
                  Send another message
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Field label="Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  maxLength={120}
                  className={inputClass}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  maxLength={254}
                  className={inputClass}
                />
              </Field>
              <Field label="Message">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you're thinking about…"
                  required
                  rows={4}
                  maxLength={4000}
                  className={`${inputClass} resize-none min-h-[110px]`}
                />
              </Field>
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-1 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] px-5 py-3.5 font-['Baloo_2'] font-extrabold text-[17px] text-white flex items-center justify-center gap-2 hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_#0F172A] transition-all disabled:opacity-70 disabled:pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${C.blue} 0%, ${C.indigo} 100%)`,
                }}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-[2.5px] border-white/70 border-t-transparent animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" strokeWidth={2.75} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center text-[12.5px] font-semibold text-[#0F172A]/60">
          <div className="flex items-center justify-center gap-3">
            <Link to="/privacy" className="hover:text-[#0F172A] hover:underline">
              Privacy Policy
            </Link>
            <span aria-hidden>·</span>
            <a
              href={WEBSITE_URL}
              className="hover:text-[#0F172A] hover:underline"
            >
              aceterus.com
            </a>
          </div>
          <p className="mt-2">© {new Date().getFullYear()} AceTerus. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

const inputClass =
  "w-full rounded-[14px] border-[2.5px] border-[#0F172A] bg-white px-4 py-3 text-[15px] font-semibold text-[#0F172A] placeholder:text-[#0F172A]/40 focus:outline-none focus:ring-4 focus:ring-[#3BD6F5]/40 shadow-[3px_3px_0_0_#0F172A] transition-shadow";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span
      className={`${DISPLAY} block text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#0F172A]/70 mb-1.5`}
    >
      {label}
    </span>
    {children}
  </label>
);

const ActionButton = ({
  href,
  icon,
  label,
  value,
  color,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  color: ActionColor;
  external?: boolean;
}) => (
  <a
    href={href}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    className="group flex items-center gap-4 rounded-[20px] border-[2.5px] border-[#0F172A] bg-white px-4 py-3.5 shadow-[5px_5px_0_0_#0F172A] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_#0F172A] transition-all"
  >
    <div
      className="shrink-0 w-12 h-12 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center text-white"
      style={{ background: colorMap[color] }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p
        className={`${DISPLAY} font-extrabold text-[11px] uppercase tracking-[0.16em] text-[#0F172A]/55`}
      >
        {label}
      </p>
      <p className="font-extrabold text-[16px] text-[#0F172A] truncate">
        {value}
      </p>
    </div>
    <span
      className={`${DISPLAY} font-extrabold text-[18px] text-[#0F172A]/50 group-hover:text-[#0F172A] transition-colors`}
      aria-hidden
    >
      →
    </span>
  </a>
);

export default Contacts;

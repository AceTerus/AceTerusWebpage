import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";
import Logo from "@/assets/logo.webp";

const C = {
  cyan: "#3BD6F5", blue: "#2F7CFF", indigo: "#2E2BE5",
  ink: "#0F172A", cloud: "#F3FAFF",
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const EFFECTIVE_DATE = "6 August 2026";
const LAST_UPDATED = "6 August 2026";

type Section = { id: string; title: string };

const SECTIONS: Section[] = [
  { id: "acceptance", title: "1. Agreement to the Terms" },
  { id: "eligibility", title: "2. Eligibility" },
  { id: "account", title: "3. Your account" },
  { id: "your-content", title: "4. Your content" },
  { id: "acceptable-use", title: "5. Acceptable use" },
  { id: "prohibited", title: "6. Prohibited conduct" },
  { id: "ai", title: "7. AI features" },
  { id: "ace-coins", title: "8. ACE Coins and virtual items" },
  { id: "events", title: "9. Events and third-party organisers" },
  { id: "ip", title: "10. Intellectual property" },
  { id: "third-party", title: "11. Third-party services and links" },
  { id: "termination", title: "12. Suspension and termination" },
  { id: "disclaimers", title: "13. Disclaimers" },
  { id: "liability", title: "14. Limitation of liability" },
  { id: "indemnity", title: "15. Indemnification" },
  { id: "governing-law", title: "16. Governing law and disputes" },
  { id: "changes", title: "17. Changes to these Terms" },
  { id: "misc", title: "18. Miscellaneous" },
  { id: "contact", title: "19. Contact us" },
];

const Terms = () => {
  useEffect(() => {
    document.title = "Terms of Service – AceTerus";
    return () => { document.title = "AceTerus – AI Tutor & Quiz Platform for Malaysian Students"; };
  }, []);

  return (
    <div
      className="font-['Nunito'] min-h-screen text-[#0F172A]"
      style={{
        backgroundColor: C.cloud,
        backgroundImage: `
          radial-gradient(700px 500px at 95% -5%, rgba(59,214,245,.35), transparent 60%),
          radial-gradient(600px 400px at -5% 15%, rgba(47,124,255,.28), transparent 60%)
        `,
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-[2.5px] border-[#0F172A] bg-white/95 backdrop-blur shadow-[0_2px_0_0_#0F172A]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={Logo} alt="AceTerus" className="w-8 h-8 rounded-lg border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]" />
            <span className={`${DISPLAY} font-extrabold text-[17px]`}>AceTerus</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-[#0F172A]/20 text-[13px] font-bold text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-10 lg:py-14">
        {/* Title card */}
        <div
          className="border-[3px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-8 lg:p-10 mb-8"
          style={{ backgroundImage: `linear-gradient(135deg, ${C.cloud} 0%, #ffffff 60%)` }}
        >
          <div className="flex items-start gap-4">
            <div
              className="shrink-0 w-14 h-14 rounded-2xl border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
              style={{ background: C.indigo }}
            >
              <ScrollText className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className={`${DISPLAY} font-extrabold text-[36px] lg:text-[44px] leading-none`}>
                Terms of Service
              </h1>
              <p className="mt-2 text-slate-600 font-medium">
                The agreement between you and AceTerus for using our platform.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-[12px] font-bold px-3 py-1 rounded-full border-[2px] border-[#0F172A] bg-white">
                  Effective: {EFFECTIVE_DATE}
                </span>
                <span className="text-[12px] font-bold px-3 py-1 rounded-full border-[2px] border-[#0F172A]/30 text-[#0F172A]/60">
                  Last updated: {LAST_UPDATED}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* TOC */}
          <aside className="lg:sticky lg:top-20 self-start">
            <div className="border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[4px_4px_0_0_#0F172A] bg-white p-4">
              <p className={`${DISPLAY} font-extrabold text-sm uppercase tracking-widest text-[#0F172A]/60 mb-2`}>
                Contents
              </p>
              <nav className="flex flex-col gap-0.5 text-[13px] font-semibold">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="px-2 py-1.5 rounded-lg text-[#0F172A]/70 hover:text-[#0F172A] hover:bg-[#F3FAFF] transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Body */}
          <article className="border-[3px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-8 lg:p-12 space-y-10 leading-relaxed text-[15px] text-[#0F172A]/85">
            <Section id="acceptance" title="1. Agreement to the Terms">
              <p>
                These Terms of Service ("Terms") form a binding agreement between you and AceTerus
                ("AceTerus", "we", "us", or "our") and govern your access to and use of our website,
                applications, and related services (together, the "Service"). By creating an account or
                otherwise using the Service, you agree to these Terms and to our{" "}
                <Link to="/privacy" className="font-bold text-[#2F7CFF] hover:underline">Privacy Policy</Link>.
                If you do not agree, do not use the Service.
              </p>
              <p>
                If you use the Service on behalf of an organisation, school, or other entity, you
                represent that you have authority to bind that entity to these Terms.
              </p>
            </Section>

            <Section id="eligibility" title="2. Eligibility">
              <p>
                You must be at least <b>13 years old</b> to create an AceTerus account. Users between
                13 and the age of majority in their jurisdiction (18 in Malaysia) must have permission
                from a parent or legal guardian to use the Service. You must have the legal capacity to
                enter into a binding contract in your jurisdiction.
              </p>
              <p>
                The Service is designed with Malaysian students in mind. Certain features (such as
                school and university selection) are optimised for Malaysia. You are responsible for
                complying with all laws that apply to your use of the Service in your location.
              </p>
            </Section>

            <Section id="account" title="3. Your account">
              <p>
                To use most features you need an account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>Provide accurate, current, and complete information during registration and keep it up to date.</li>
                <li>Keep your login credentials confidential and not share your account with anyone else.</li>
                <li>Be responsible for all activity that happens on your account, whether or not you authorised it.</li>
                <li>Notify us promptly at <a className="font-bold text-[#2F7CFF] hover:underline" href="mailto:support@aceterus.com">support@aceterus.com</a> if you suspect unauthorised access.</li>
              </ul>
              <p>
                We may require identity verification for certain features (such as administrator access
                or high-value redemptions). We may refuse to create, suspend, or terminate accounts at
                our reasonable discretion.
              </p>
            </Section>

            <Section id="your-content" title="4. Your content">
              <p>
                You retain ownership of the quizzes, posts, comments, uploads, and other materials you
                submit to the Service ("Your Content"). By submitting Your Content, you grant AceTerus a
                worldwide, non-exclusive, royalty-free licence to host, store, reproduce, adapt, display,
                distribute, and process Your Content solely for the purposes of operating, improving, and
                promoting the Service — including sharing Your Content with other users to whom you have
                chosen to make it visible, and processing Your Content through our AI features when you
                use them.
              </p>
              <p>
                You represent and warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>You own Your Content or have all necessary rights to submit it.</li>
                <li>Your Content does not violate any third party's intellectual property, privacy, or other rights.</li>
                <li>Your Content complies with these Terms and applicable law.</li>
              </ul>
              <p>
                You are solely responsible for Your Content and the consequences of submitting it. We
                may (but are not obliged to) review, moderate, or remove Your Content at our discretion,
                including where it violates these Terms.
              </p>
            </Section>

            <Section id="acceptable-use" title="5. Acceptable use">
              <p>You may use the Service to:</p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>Create, take, and share quizzes for personal learning.</li>
                <li>Interact with other users through posts, comments, and direct messages.</li>
                <li>Use the AI mascot, quiz generator, and grading tools to support your studies.</li>
                <li>Register for events, redeem legitimate reward codes, and use deals offered on the platform.</li>
                <li>Track your progress, streaks, and achievements.</li>
              </ul>
              <p>
                Use the Service in a way that is fair to other users. Bullying, harassment, spam, or
                cheating on educational assessments outside the platform is not what we're here for.
              </p>
            </Section>

            <Section id="prohibited" title="6. Prohibited conduct">
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>Upload, post, or share content that is unlawful, harmful, threatening, abusive, harassing, defamatory, obscene, hateful, or that incites violence or discrimination.</li>
                <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
                <li>Collect or harvest personal data of other users without their consent.</li>
                <li>Attempt to gain unauthorised access to any part of the Service, other users' accounts, or our infrastructure.</li>
                <li>Reverse engineer, decompile, or attempt to extract the source code of the Service, except where allowed by law.</li>
                <li>Use bots, scrapers, or automated means to access the Service in a manner that adversely affects performance or bypasses rate limits, except for legitimate search engine indexing of publicly available pages.</li>
                <li>Interfere with, disrupt, or overload the Service or the networks connected to it.</li>
                <li>Use the Service to distribute malware, viruses, or any other harmful code.</li>
                <li>Circumvent, disable, or defeat security or authentication features of the Service.</li>
                <li>Use the Service to cheat on formal examinations, or to violate any academic integrity policy that applies to you.</li>
                <li>Use the Service in a way that violates any applicable law, including the Malaysian Communications and Multimedia Act 1998 and the Personal Data Protection Act 2010.</li>
                <li>Resell, rent, or commercially exploit the Service without our prior written permission.</li>
                <li>Manipulate, farm, or fraudulently obtain ACE Coins, streaks, achievements, or event reward codes.</li>
              </ul>
              <p>Violation of any of these may result in suspension or termination of your account.</p>
            </Section>

            <Section id="ai" title="7. AI features">
              <p>
                The Service uses artificial intelligence (currently Google Gemini) to power features
                including the Ace mascot chat, AI-generated quizzes, subjective answer grading, and
                performance analysis. When you use an AI feature, the content you submit is processed by
                our AI provider to generate a response.
              </p>
              <p>
                <b>AI output is not guaranteed to be accurate.</b> AI-generated content — including
                explanations, grades, quiz questions, and analyses — may contain errors, omissions, or
                biased results. You should independently verify important information and treat AI
                output as a study aid, not as authoritative academic advice. AceTerus is not liable for
                decisions you make based on AI output.
              </p>
              <p>
                Do not submit sensitive personal data, confidential information, or third-party personal
                data into AI features. See our{" "}
                <Link to="/privacy" className="font-bold text-[#2F7CFF] hover:underline">Privacy Policy</Link>{" "}
                for details on how AI-processed content is handled.
              </p>
            </Section>

            <Section id="ace-coins" title="8. ACE Coins and virtual items">
              <p>
                ACE Coins are a virtual currency used only within the Service to unlock features,
                cosmetics, or other in-app items. ACE Coins:
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li><b>Have no monetary value</b>, cannot be exchanged for cash, and are not transferable outside the Service.</li>
                <li>Are licensed, not sold — you do not own them; you have a limited, non-transferable, revocable licence to use them within the Service.</li>
                <li>May be earned, awarded, spent, expired, forfeited, or adjusted by us at our reasonable discretion, including in cases of abuse, fraud, or technical error.</li>
                <li>Will be forfeited if your account is terminated for any reason.</li>
              </ul>
              <p>
                Achievements, streaks, boss raid rewards, event reward codes, and similar virtual items
                are subject to the same terms. We may modify, suspend, or discontinue any virtual item
                or currency at any time.
              </p>
            </Section>

            <Section id="events" title="9. Events and third-party organisers">
              <p>
                The Service includes an events platform that connects users with events organised by
                third parties ("Organisers") and referred by third-party promoters ("Promoters"). When
                you register for an event, your registration information is shared with the Organiser
                (and, where applicable, the Promoter) so they can run the event.
              </p>
              <p>
                AceTerus is not the organiser of these events (unless expressly stated) and is not
                responsible for the conduct, safety, quality, or fulfilment of any event, deal, or
                reward offered by an Organiser or Promoter. Your interactions with Organisers and
                Promoters are between you and them; we are not a party to those arrangements.
              </p>
              <p>
                Reward codes and deals are subject to the terms set by the Organiser and any additional
                rules displayed at the point of redemption.
              </p>
            </Section>

            <Section id="ip" title="10. Intellectual property">
              <p>
                The Service, including its software, design, logos, brand elements, and content we
                provide (excluding Your Content and third-party content), is owned by AceTerus or our
                licensors and is protected by intellectual property laws. We grant you a limited,
                non-exclusive, non-transferable, revocable licence to access and use the Service for
                your personal, non-commercial educational use, subject to these Terms.
              </p>
              <p>
                Nothing in these Terms transfers ownership of any AceTerus intellectual property to you.
                You may not use our name, logos, or brand elements without our prior written permission,
                except as expressly allowed.
              </p>
            </Section>

            <Section id="third-party" title="11. Third-party services and links">
              <p>
                The Service may integrate with, link to, or rely on third-party services (for example,
                Google Sign-In, Google Gemini, Supabase, Vercel, Resend, and event Organiser sites).
                Those services are governed by their own terms and privacy policies. We are not
                responsible for the content, policies, or practices of any third party.
              </p>
            </Section>

            <Section id="termination" title="12. Suspension and termination">
              <p>
                You may delete your account at any time by contacting{" "}
                <a className="font-bold text-[#2F7CFF] hover:underline" href="mailto:support@aceterus.com">support@aceterus.com</a>{" "}
                or using an in-app deletion option, if available.
              </p>
              <p>
                We may suspend, restrict, or terminate your access to the Service (in whole or in part)
                at any time, with or without notice, if we reasonably believe that you have violated
                these Terms, that continued access poses a risk to us or other users, or that we are
                required to do so by law. Where reasonably practicable, we will provide notice and a
                chance to remedy the issue.
              </p>
              <p>
                On termination: (a) your right to use the Service ends immediately; (b) sections that by
                their nature should survive (including sections 4, 6, 8, 10, 13, 14, 15, and 16) will
                survive; and (c) Your Content and account data will be handled as described in our
                Privacy Policy.
              </p>
            </Section>

            <Section id="disclaimers" title="13. Disclaimers">
              <p>
                To the fullest extent permitted by law, the Service is provided <b>"as is" and "as
                available"</b>, without warranties of any kind, whether express, implied, or statutory,
                including implied warranties of merchantability, fitness for a particular purpose,
                non-infringement, and any warranty arising out of course of dealing or usage of trade.
              </p>
              <p>
                We do not warrant that the Service will be uninterrupted, error-free, secure, or free
                from viruses or other harmful components; that any content (including AI-generated
                content) is accurate, complete, or reliable; or that the Service will meet your
                expectations or academic requirements.
              </p>
              <p>
                Nothing in these Terms excludes or limits any warranty, right, or remedy that cannot be
                excluded or limited under applicable law.
              </p>
            </Section>

            <Section id="liability" title="14. Limitation of liability">
              <p>
                To the fullest extent permitted by law, AceTerus and its officers, directors, employees,
                and agents shall not be liable for any indirect, incidental, consequential, special,
                exemplary, or punitive damages; loss of profits, revenue, data, use, goodwill, or other
                intangible losses; or damages arising out of or related to your access to or use of
                (or inability to access or use) the Service, whether based in contract, tort (including
                negligence), statute, or any other legal theory, even if we have been advised of the
                possibility of such damages.
              </p>
              <p>
                Our aggregate liability to you for all claims arising out of or relating to the Service
                or these Terms will not exceed the greater of (a) the total amount you paid to AceTerus
                in the twelve months before the event giving rise to the claim, or (b) MYR 100.
              </p>
              <p>
                Some jurisdictions do not allow the exclusion or limitation of certain damages. In
                those jurisdictions, the above limitations apply only to the extent permitted by law.
              </p>
            </Section>

            <Section id="indemnity" title="15. Indemnification">
              <p>
                You agree to defend, indemnify, and hold harmless AceTerus and its officers, directors,
                employees, and agents from and against any claims, liabilities, damages, losses, and
                expenses (including reasonable legal fees) arising out of or in any way connected with:
                (a) your use or misuse of the Service; (b) Your Content; (c) your violation of these
                Terms; or (d) your violation of any law or third-party right.
              </p>
            </Section>

            <Section id="governing-law" title="16. Governing law and disputes">
              <p>
                These Terms and any dispute arising out of or in connection with them or the Service are
                governed by the laws of <b>Malaysia</b>, without regard to conflict of law principles.
              </p>
              <p>
                The parties submit to the exclusive jurisdiction of the courts of Malaysia in respect of
                any dispute arising out of or in connection with these Terms or the Service, subject to
                any mandatory consumer protection laws in your country of residence that give you the
                right to bring proceedings in the courts of that country.
              </p>
              <p>
                Before starting a formal proceeding, please contact us at{" "}
                <a className="font-bold text-[#2F7CFF] hover:underline" href="mailto:support@aceterus.com">support@aceterus.com</a>{" "}
                — many disputes can be resolved informally.
              </p>
            </Section>

            <Section id="changes" title="17. Changes to these Terms">
              <p>
                We may modify these Terms from time to time. If we make material changes, we will
                notify you by email, by an in-product notice, or by updating the "Last updated" date at
                the top of these Terms. Your continued use of the Service after the changes take
                effect constitutes acceptance of the updated Terms. If you do not agree with the
                changes, you must stop using the Service.
              </p>
            </Section>

            <Section id="misc" title="18. Miscellaneous">
              <ul className="list-disc pl-6 space-y-1.5">
                <li><b>Entire agreement.</b> These Terms and the Privacy Policy constitute the entire agreement between you and AceTerus concerning the Service and supersede all prior agreements on that subject.</li>
                <li><b>Severability.</b> If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.</li>
                <li><b>No waiver.</b> Our failure to enforce any right or provision of these Terms is not a waiver of that right or provision.</li>
                <li><b>Assignment.</b> You may not assign or transfer these Terms without our prior written consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets, or by operation of law.</li>
                <li><b>Force majeure.</b> We are not liable for any delay or failure to perform where caused by events beyond our reasonable control.</li>
                <li><b>Notices.</b> We may give notices to you by email or through the Service. You may give notices to us at <a className="font-bold text-[#2F7CFF] hover:underline" href="mailto:support@aceterus.com">support@aceterus.com</a>.</li>
              </ul>
            </Section>

            <Section id="contact" title="19. Contact us">
              <p>
                Questions about these Terms? Reach us at:
              </p>
              <div className="border-[2.5px] border-[#0F172A] rounded-[16px] bg-[#F3FAFF] p-5 font-semibold">
                <div>AceTerus</div>
                <div className="text-slate-600 font-medium mt-1">Email: <a className="font-bold text-[#2F7CFF] hover:underline" href="mailto:support@aceterus.com">support@aceterus.com</a></div>
              </div>
            </Section>
          </article>
        </div>

        {/* Footer link */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link to="/privacy" className="font-bold text-[#2F7CFF] hover:underline">
            View Privacy Policy →
          </Link>
          <Link to="/" className="font-bold opacity-60 hover:opacity-100 transition-opacity">
            Back to AceTerus
          </Link>
        </div>
      </main>
    </div>
  );
};

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 space-y-3">
    <h2 className={`${DISPLAY} font-extrabold text-[22px] lg:text-[26px] text-[#0F172A]`}>{title}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

export default Terms;

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
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
  { id: "intro", title: "1. Introduction" },
  { id: "who-we-are", title: "2. Who we are" },
  { id: "info-we-collect", title: "3. Information we collect" },
  { id: "how-we-use", title: "4. How we use your information" },
  { id: "ai-features", title: "5. AI features and processing" },
  { id: "sharing", title: "6. How we share information" },
  { id: "storage", title: "7. Storage, retention and security" },
  { id: "your-rights", title: "8. Your rights and choices" },
  { id: "children", title: "9. Children and student users" },
  { id: "cookies", title: "10. Cookies and similar technologies" },
  { id: "transfers", title: "11. International data transfers" },
  { id: "changes", title: "12. Changes to this policy" },
  { id: "contact", title: "13. Contact us" },
];

const Privacy = () => {
  useEffect(() => {
    document.title = "Privacy Policy – AceTerus";
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
              style={{ background: C.cyan }}
            >
              <Shield className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className={`${DISPLAY} font-extrabold text-[36px] lg:text-[44px] leading-none`}>
                Privacy Policy
              </h1>
              <p className="mt-2 text-slate-600 font-medium">
                How AceTerus collects, uses, and protects your information.
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
            <Section id="intro" title="1. Introduction">
              <p>
                AceTerus ("AceTerus", "we", "us", or "our") provides a learning platform designed for
                Malaysian students. This Privacy Policy explains what personal data we collect when you
                use our website, mobile experiences, and related services (together, the "Service"), how we
                use that data, who we share it with, and the rights you have over it.
              </p>
              <p>
                We handle personal data in accordance with the Malaysian Personal Data Protection Act 2010
                ("PDPA") and, where applicable to users located in those regions, the EU/UK General Data
                Protection Regulation ("GDPR"). If you do not agree with this Policy, please do not use the
                Service.
              </p>
            </Section>

            <Section id="who-we-are" title="2. Who we are">
              <p>
                AceTerus operates the Service from Malaysia. For any enquiry — including privacy
                questions and data-subject requests — please contact us at{" "}
                <a className="font-bold text-[#2F7CFF] hover:underline" href="mailto:support@aceterus.com">support@aceterus.com</a>.
              </p>
              <p>
                For the purposes of the PDPA, AceTerus is the "data user" in respect of personal data
                processed through the Service. For the purposes of the GDPR (where applicable), AceTerus
                is the "controller".
              </p>
            </Section>

            <Section id="info-we-collect" title="3. Information we collect">
              <p>We collect the following categories of information:</p>

              <SubHeading>3.1 Information you provide directly</SubHeading>
              <ul className="list-disc pl-6 space-y-1.5">
                <li><b>Account details</b> — email address, password (stored as a salted hash), and, if you sign in with Google, the identifier, email, and profile picture Google shares with us.</li>
                <li><b>Profile information</b> — username, display name, profile photo, cover image, biography, and educational history (schools, universities, year ranges).</li>
                <li><b>Content you create</b> — quizzes, questions, answer keys, posts, comments, direct messages, uploaded files (including PDFs and images used for quiz generation or OMR scanning), and any other content you submit.</li>
                <li><b>Event and registration data</b> — information you provide when registering for events on the AceTerus events platform, including responses to event registration forms and reward code redemptions.</li>
                <li><b>Communications</b> — messages you send to us, feedback, and support requests.</li>
              </ul>

              <SubHeading>3.2 Information collected automatically</SubHeading>
              <ul className="list-disc pl-6 space-y-1.5">
                <li><b>Usage data</b> — actions you take within the Service, such as quizzes completed, decks created, posts published, streak activity, ACE Coins earned or spent, and features used. Where possible we aggregate this information for analytics.</li>
                <li><b>Device and connection data</b> — IP address, browser type and version, operating system, device identifiers, referring URL, and timestamps of requests. This is collected by our hosting and infrastructure providers as part of routine operation.</li>
                <li><b>Authentication tokens</b> — session tokens and cookies used to keep you signed in.</li>
                <li><b>Diagnostic data</b> — error logs and performance metrics generated when the Service does not work correctly.</li>
              </ul>

              <SubHeading>3.3 Information from third parties</SubHeading>
              <ul className="list-disc pl-6 space-y-1.5">
                <li><b>Google Sign-In</b> — if you choose to sign in with Google, Google shares your email, name, and profile picture with us in accordance with the permissions you grant.</li>
                <li><b>Event organisers and promoters</b> — if you register for an event through the Service, information about your registration may be shared with the organiser and, where applicable, the promoter who referred you.</li>
              </ul>
            </Section>

            <Section id="how-we-use" title="4. How we use your information">
              <p>We use personal data for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li><b>Providing the Service</b> — creating your account, showing your content, powering quizzes and OMR grading, personalising your feed, and delivering notifications.</li>
                <li><b>AI-assisted features</b> — generating quizzes from text or PDFs you upload, grading subjective answers, analysing your performance, and powering the Ace mascot chat companion (see Section 5).</li>
                <li><b>Gamification</b> — tracking streaks, awarding ACE Coins, calculating achievements, and running boss raids.</li>
                <li><b>Social features</b> — displaying your posts, comments, likes, follows, and direct messages to other users you interact with.</li>
                <li><b>Product analytics</b> — understanding how the Service is used in aggregate, measuring performance, and improving features. Where possible we rely on de-identified or aggregate data.</li>
                <li><b>Communication</b> — sending you transactional emails (sign-up confirmation, password reset, security notices), event updates, and, where you have opted in, product updates.</li>
                <li><b>Safety and enforcement</b> — detecting and preventing abuse, spam, fraud, security incidents, and violations of our Terms of Service.</li>
                <li><b>Legal compliance</b> — meeting our obligations under Malaysian law and responding to lawful requests from authorities.</li>
              </ul>
              <p>
                Our lawful bases (where GDPR applies) are: performance of a contract (delivering the
                Service you asked for), legitimate interests (improving and securing the Service),
                consent (where you opt in to specific processing such as marketing emails), and legal
                obligation.
              </p>
            </Section>

            <Section id="ai-features" title="5. AI features and processing">
              <p>
                AceTerus uses <b>Google Gemini</b> to power its AI features, including the Ace mascot
                chat, AI-generated quizzes (from text you paste or PDFs you upload), subjective answer
                grading, and performance analysis.
              </p>
              <p>
                When you use an AI feature, the content you submit for processing — such as the text of
                your question, an uploaded PDF, your quiz answer, or your message to the mascot — is
                transmitted to Google's Gemini API in order to generate a response. Google processes this
                content in accordance with its own privacy terms for the Gemini API.
              </p>
              <p>
                <b>What we log:</b> for the mascot chat, we record an anonymous engagement count
                (the fact that a message was sent, and by which user) so we can track usage and prevent
                abuse. We do <b>not</b> store the content of your mascot chat messages on our servers.
                For AI-generated quizzes and subjective grading, the resulting output (the generated
                question, the grade, the analysis) is stored so you can revisit it.
              </p>
              <p>
                <b>Please do not submit sensitive personal information</b> (identification numbers,
                financial data, health information, or third-party personal data) into any AI feature.
                AI-generated output may occasionally be inaccurate or incomplete; it is provided for
                learning support and should not be relied on as a definitive academic or professional
                answer.
              </p>
            </Section>

            <Section id="sharing" title="6. How we share information">
              <p>
                We do not sell your personal data. We share information only in the following limited
                circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li><b>With other users</b> — content you post publicly (posts, comments, profile information you have marked as public) is visible to other users of the Service. Direct messages are visible only to you and the recipient.</li>
                <li><b>With service providers</b> that host or support the Service, under contract, and only for the purposes described in this Policy. Our current key providers are:
                  <ul className="list-[circle] pl-6 mt-1.5 space-y-1">
                    <li><b>Supabase</b> — database, authentication, file storage, and edge functions (data hosted on AWS infrastructure).</li>
                    <li><b>Vercel</b> — hosting of our web front-end.</li>
                    <li><b>Google</b> — Sign-in with Google (authentication) and Google Gemini (AI features).</li>
                    <li><b>Resend</b> — delivery of transactional emails.</li>
                    <li><b>Render</b> — hosting of our OMR (optical mark recognition) processing service.</li>
                  </ul>
                </li>
                <li><b>With event organisers and promoters</b> — where you register for an event, your registration details and form responses are shared with the organiser and, where relevant, the promoter who referred you, so they can manage the event.</li>
                <li><b>For legal reasons</b> — where required by law, court order, or valid legal process, or where we believe in good faith that disclosure is necessary to protect our rights, users' safety, or to investigate fraud or abuse.</li>
                <li><b>In a business transfer</b> — if AceTerus is involved in a merger, acquisition, or sale of assets, personal data may be transferred as part of that transaction. We will notify you before your data becomes subject to a different privacy policy.</li>
              </ul>
            </Section>

            <Section id="storage" title="7. Storage, retention and security">
              <p>
                Personal data is stored primarily on Supabase (AWS) infrastructure, with a subset of
                data processed on Vercel and Render. We retain personal data for as long as your account
                is active and for a reasonable period thereafter to comply with our legal obligations,
                resolve disputes, and enforce our agreements.
              </p>
              <p>
                We apply industry-standard technical and organisational measures to protect personal data,
                including encryption in transit (TLS), encrypted storage at rest, role-based access
                controls, row-level security policies at the database layer, and regular security
                monitoring. No online service is 100% secure; we cannot guarantee absolute security.
              </p>
              <p>
                If you delete your account, we delete or de-identify your personal data within a
                reasonable period, except where retention is required by law (for example, financial or
                tax records) or is necessary to prevent fraud, abuse, or to enforce our Terms.
              </p>
            </Section>

            <Section id="your-rights" title="8. Your rights and choices">
              <p>Depending on where you live, you may have the following rights over your personal data:</p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li><b>Access</b> — request a copy of the personal data we hold about you.</li>
                <li><b>Correction</b> — ask us to correct inaccurate or incomplete data (much of this you can update directly in your account settings).</li>
                <li><b>Deletion</b> — request deletion of your account and associated personal data.</li>
                <li><b>Withdrawal of consent</b> — withdraw any consent you have given, where processing is based on consent.</li>
                <li><b>Objection and restriction</b> — where the GDPR applies, object to certain processing or ask us to restrict processing.</li>
                <li><b>Portability</b> — where the GDPR applies, receive a machine-readable copy of certain data you provided to us.</li>
                <li><b>Complaint</b> — lodge a complaint with your local data protection authority. In Malaysia, this is the Department of Personal Data Protection (Jabatan Perlindungan Data Peribadi, JPDP).</li>
              </ul>
              <p>
                To exercise any of these rights, contact <a className="font-bold text-[#2F7CFF] hover:underline" href="mailto:support@aceterus.com">support@aceterus.com</a>.
                We may need to verify your identity before acting on a request. We will respond within
                the timeframe required by applicable law.
              </p>
            </Section>

            <Section id="children" title="9. Children and student users">
              <p>
                AceTerus is designed for Malaysian students, including secondary and pre-university
                students. Users must be at least <b>13 years old</b> to create an account. Users between
                13 and 18 should use the Service only with the involvement of a parent or legal
                guardian. If you are a parent or guardian and believe your child under 13 has created an
                account without consent, please contact us at <a className="font-bold text-[#2F7CFF] hover:underline" href="mailto:support@aceterus.com">support@aceterus.com</a> and we will delete the account.
              </p>
              <p>
                We do not knowingly collect personal data from children under 13. We do not use
                personal data of student users for advertising purposes.
              </p>
            </Section>

            <Section id="cookies" title="10. Cookies and similar technologies">
              <p>We use a limited set of cookies and browser storage for:</p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li><b>Authentication</b> — to keep you signed in.</li>
                <li><b>Preferences</b> — to remember settings like sidebar state and onboarding completion.</li>
                <li><b>Security</b> — to protect against cross-site request forgery and other attacks.</li>
              </ul>
              <p>
                We do not currently use third-party advertising cookies. If we introduce optional
                analytics or advertising cookies in future, we will update this Policy and, where
                required, ask for your consent.
              </p>
              <p>
                You can control cookies through your browser settings. Blocking essential cookies may
                prevent parts of the Service from working correctly.
              </p>
            </Section>

            <Section id="transfers" title="11. International data transfers">
              <p>
                Our service providers are based in a number of countries, including the United States and
                Singapore. When personal data is transferred outside Malaysia, we take reasonable steps
                to ensure that the recipient is subject to appropriate safeguards — including contractual
                protections and, where required, standard data protection clauses recognised under
                applicable law.
              </p>
            </Section>

            <Section id="changes" title="12. Changes to this policy">
              <p>
                We may update this Privacy Policy from time to time. If we make material changes, we will
                notify you by email, through an in-product notice, or by updating the "Last updated" date
                at the top of this page. Your continued use of the Service after changes take effect
                constitutes acceptance of the updated Policy.
              </p>
            </Section>

            <Section id="contact" title="13. Contact us">
              <p>
                Questions about this Policy or how we handle your personal data? Reach us at:
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
          <Link to="/terms" className="font-bold text-[#2F7CFF] hover:underline">
            View Terms of Service →
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

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className={`${DISPLAY} font-extrabold text-[16px] text-[#0F172A] pt-2`}>{children}</h3>
);

export default Privacy;

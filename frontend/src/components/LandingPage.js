
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import {
  HeartPulse, Stethoscope, Brain, History, Upload, Shield,
  Zap, BookOpen, Database, Server, Lock, Eye, CheckCircle,
  ArrowRight, Activity, FileSearch, Users, ChevronRight,
  FlaskConical, TrendingUp,
} from 'lucide-react';
import '../styles/LandingPage.css';

/** Mini SVG dashboard card shown in the hero */
function HeroDashboard() {
  return (
    <div className="hero-dashboard">
      <div className="hd-topbar">
        <span className="hd-dot red" /><span className="hd-dot yellow" /><span className="hd-dot green" />
        <span className="hd-title">ThyroRAG · Live Analysis</span>
      </div>
      <div className="hd-body">
        <div className="hd-metric">
          <span className="hd-metric-label">TSH</span>
          <span className="hd-metric-val warn">7.4 <small>mIU/L</small></span>
          <span className="hd-bar"><span className="hd-fill warn" style={{ width: '74%' }} /></span>
        </div>
        <div className="hd-metric">
          <span className="hd-metric-label">T3</span>
          <span className="hd-metric-val ok">2.1 <small>nmol/L</small></span>
          <span className="hd-bar"><span className="hd-fill ok" style={{ width: '55%' }} /></span>
        </div>
        <div className="hd-metric">
          <span className="hd-metric-label">TT4</span>
          <span className="hd-metric-val ok">98 <small>nmol/L</small></span>
          <span className="hd-bar"><span className="hd-fill ok" style={{ width: '62%' }} /></span>
        </div>
        <div className="hd-metric">
          <span className="hd-metric-label">FTI</span>
          <span className="hd-metric-val warn">128 <small>index</small></span>
          <span className="hd-bar"><span className="hd-fill warn" style={{ width: '80%' }} /></span>
        </div>
        <div className="hd-result">
          <HeartPulse size={16} />
          <span>ML Prediction: <strong>Hypothyroid</strong></span>
          <span className="hd-conf">89.3% confidence</span>
        </div>

      </div>
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goToApp    = () => navigate('/app');
  const goToSignIn = () => navigate('/sign-in');
  const goToSignUp = () => navigate('/sign-up');

  /* ── Data ── */
  const features = [
    {
      icon: Stethoscope, color: 'fc-green',
      title: 'AI Thyroid Diagnosis',
      desc: 'Enter lab values (TSH, T3, T4, FTI) and receive an instant CatBoost ML prediction with clinical confidence scores.',
      cta: 'Run Diagnosis',
    },
    {
      icon: Brain, color: 'fc-olive',
      title: 'Medical AI Chatbot',
      desc: 'Ask thyroid-related questions and get context-aware answers powered by RAG + Groq LLaMA with vector-retrieved knowledge.',
      cta: 'Start Chat',
    },
    {
      icon: FileSearch, color: 'fc-sage',
      title: 'Document Analyzer',
      desc: 'Upload PDF, Word, Excel or image reports. Apache Tika extracts medical data and feeds it into the knowledge base.',
      cta: 'Upload Files',
    },
    {
      icon: TrendingUp, color: 'fc-accent',
      title: 'Patient History',
      desc: 'Track past predictions, review thyroid health trends over time, and visualise lab value progression with interactive charts.',
      cta: 'View History',
    },
  ];

  const problems = [
    { icon: Eye,         title: 'Hard to Detect Early',   body: 'Thyroid disorders affect 1 in 10 adults, yet symptoms are often silent until significant damage has occurred.' },
    { icon: FileSearch,  title: 'Reports Are Confusing',   body: 'Lab reports list cryptic values like TSH, T3, T4U with no explanation — most patients don\'t know what is normal.' },
    { icon: Users,       title: 'Limited Access to Experts', body: 'Specialist consultations are expensive and delayed. Patients need fast, reliable thyroid information now.' },
  ];

  const steps = [
    { n: '01', title: 'Create an Account',           body: 'Sign up in seconds using Clerk. Your data is encrypted and isolated to your profile via Row Level Security.' },
    { n: '02', title: 'Enter Lab Values or Upload',  body: 'Input TSH, T3, T4 readings manually, or upload any medical report (PDF, image, Word, Excel) for auto-extraction.' },
    { n: '03', title: 'AI Processes Your Data',      body: 'CatBoost ML screens for disorders. The RAG pipeline retrieves relevant medical context and the LLM composes your answer.' },
    { n: '04', title: 'Receive Insights',             body: 'Get a clear diagnosis prediction, probability breakdown, clinical interpretation and the ability to ask follow-up questions.' },
  ];

  const techStack = [
    { icon: Zap,         title: 'CatBoost ML',          body: 'Gradient-boosted model trained on clinical thyroid records. Screens for Negative, Hypothyroid, and Hyperthyroid.' },
    { icon: BookOpen,    title: 'RAG Pipeline',          body: 'Vector search (Qdrant) + Groq LLaMA for context-grounded medical Q&A. Answers are always sourced from real documents.' },
    { icon: Database,    title: 'Qdrant Vector DB',      body: 'High-performance vector database stores and retrieves medical document embeddings for sub-second semantic search.' },
    { icon: Server,      title: 'FastAPI Backend',       body: 'Async Python API handling ML inference, RAG orchestration, file processing, and Supabase database operations.' },
    { icon: FlaskConical,title: 'Supabase PostgreSQL',  body: 'Managed Postgres stores user predictions, queries, and reports with RLS policies ensuring per-user data isolation.' },
    { icon: Lock,        title: 'Clerk Authentication', body: 'Secure user identity with JWT tokens, social login, and session management — no password handling in our codebase.' },
  ];

  const capabilities = [
    'Predict Hypothyroid, Hyperthyroid, or Negative from lab values',
    'Explain what TSH, T3, T4, FTI results mean in plain language',
    'Answer thyroid-related clinical questions using RAG + LLM',
    'Analyse uploaded PDF, Word, Excel and image medical reports',
    'Extract structured lab data from unstructured documents',
    'Track and visualise a patient\'s health trends over multiple visits',
  ];

  const security = [
    { icon: Lock,         title: 'Clerk Auth + JWT',        body: 'Every API request is verified with a signed JWT issued by Clerk.' },
    { icon: Shield,       title: 'Row Level Security',       body: 'Supabase RLS ensures users can only read and write their own records.' },
    { icon: Eye,          title: 'Encrypted Storage',        body: 'Data in transit uses TLS. Supabase encrypts data at rest by default.' },
    { icon: CheckCircle,  title: 'No Third-party Data Sharing', body: 'Your medical data is never sold or shared with advertisers or third parties.' },
  ];

  return (
    <div className="lp-root">

      {/* ══ NAV ══════════════════════════════════════════════════════ */}
      <header className={`lp-nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <HeartPulse size={28} className="lp-brand-icon" />
            <span className="lp-brand-name">ThyroRAG</span>
          </div>
          <nav className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#tech">Technology</a>
            <a href="#security">Security</a>
          </nav>
          <div className="lp-nav-actions">
            {isSignedIn ? (
              <>
                <span className="lp-greeting">Hi, {user?.firstName || 'back'}!</span>
                <button className="lp-btn-primary" onClick={goToApp}>Go to App <ArrowRight size={15} /></button>
              </>
            ) : (
              <>
                <button className="lp-btn-ghost" onClick={goToSignIn}>Sign In</button>
                <button className="lp-btn-primary" onClick={goToSignUp}>Get Started Free</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-content">
            <h1 className="lp-hero-h1">
              AI-Powered<br />
              <span className="lp-accent">Thyroid Health</span><br />
              Insights
            </h1>
            <p className="lp-hero-sub">
              ThyroRAG combines a CatBoost ML model with Retrieval-Augmented Generation
              to deliver fast thyroid screening, lab-value explanations, and medical
              Q&amp;A — all in one secure platform.
            </p>
            <div className="lp-hero-ctas">
              {isSignedIn ? (
                <button className="lp-btn-primary lp-btn-lg" onClick={goToApp}>
                  Open Dashboard <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  <button className="lp-btn-primary lp-btn-lg" onClick={goToSignUp}>
                    Start Free Diagnosis <ArrowRight size={16} />
                  </button>
                  <button className="lp-btn-outline lp-btn-lg" onClick={goToApp}>
                    Try AI Chatbot
                  </button>
                </>
              )}
            </div>
            <div className="lp-hero-stats">
              <div className="lp-stat"><strong>3</strong><span>Disorder Classes</span></div>
              <div className="lp-stat-divider" />
              <div className="lp-stat"><strong>RAG</strong><span>Context-Aware AI</span></div>
              <div className="lp-stat-divider" />
              <div className="lp-stat"><strong>RLS</strong><span>Data Isolation</span></div>
            </div>
          </div>
          <div className="lp-hero-graphic">
            <HeroDashboard />
          </div>
        </div>
        <div className="lp-hero-glow" />
      </section>

      {/* ══ PROBLEM ═══════════════════════════════════════════════════ */}
      <section className="lp-section lp-problem">
        <div className="lp-section-inner lp-split">
          <div className="lp-split-content">
            <p className="lp-eyebrow">The Problem</p>
            <h2 className="lp-section-h2">Thyroid Disorders Are<br />Widely Misunderstood</h2>
            <p className="lp-section-sub">
              Millions of people live with undiagnosed thyroid conditions. ThyroRAG bridges the gap
              between clinical data and patient understanding.
            </p>
            <div className="lp-problem-grid">
              {problems.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="lp-problem-card">
                    <div className="lp-problem-icon"><Icon size={22} /></div>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="lp-split-image">
            <img src="/images/problem.png" alt="Modern flat vector illustration of a thyroid gland" />
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════ */}
      <section className="lp-section lp-features" id="features">
        <div className="lp-section-inner lp-split reverse">
          <div className="lp-split-content">
            <p className="lp-eyebrow">Modules</p>
            <h2 className="lp-section-h2">Everything You Need,<br />In One Platform</h2>
            <p className="lp-section-sub">Four integrated tools — all secured per account.</p>
            <div className="lp-features-grid">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className={`lp-feature-card ${f.color}`}>
                    <div className="lp-fc-icon"><Icon size={26} /></div>
                    <h3 className="lp-fc-title">{f.title}</h3>
                    <p className="lp-fc-desc">{f.desc}</p>
                    <button className="lp-fc-cta" onClick={goToApp}>
                      {f.cta} <ChevronRight size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="lp-split-image">
            <img src="/images/features.png" alt="Clean UI mockup of a medical dashboard" />
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════ */}
      <section className="lp-section lp-how" id="how">
        <div className="lp-section-inner lp-split">
          <div className="lp-split-content">
            <p className="lp-eyebrow">Workflow</p>
            <h2 className="lp-section-h2">How ThyroRAG Works</h2>
            <p className="lp-section-sub">From raw lab values to actionable health insights in four steps.</p>
            <div className="lp-steps">
              {steps.map((s) => (
                <div key={s.n} className="lp-step">
                  <div className="lp-step-num">{s.n}</div>
                  <h4 className="lp-step-title">{s.title}</h4>
                  <p className="lp-step-body">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-split-image">
            <img src="/images/workflow.png" alt="Workflow of medical data analyzed by AI" />
          </div>
        </div>
      </section>

      {/* ══ TECHNOLOGY ════════════════════════════════════════════════ */}
      <section className="lp-section lp-tech" id="tech">
        <div className="lp-section-inner lp-split reverse">
          <div className="lp-split-content">
            <p className="lp-eyebrow">Technology</p>
            <h2 className="lp-section-h2">Built on a Solid<br />Technical Foundation</h2>
            <div className="lp-tech-grid">
              {techStack.map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.title} className="lp-tech-card">
                    <div className="lp-tech-icon"><Icon size={22} /></div>
                    <h4 className="lp-tech-title">{t.title}</h4>
                    <p className="lp-tech-body">{t.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="lp-split-image">
            <img src="/images/tech.png" alt="Technologies stack vector art" />
          </div>
        </div>
      </section>



      {/* ══ SECURITY ══════════════════════════════════════════════════ */}
      <section className="lp-section lp-security" id="security">
        <div className="lp-section-inner lp-split reverse">
          <div className="lp-split-content">
            <p className="lp-eyebrow">Security & Privacy</p>
            <h2 className="lp-section-h2">Your Medical Data<br />Stays Private</h2>
            <p className="lp-section-sub">
              ThyroRAG is designed from the ground up to protect sensitive health information.
            </p>
            <div className="lp-security-grid">
              {security.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="lp-security-card">
                    <div className="lp-sec-icon"><Icon size={20} /></div>
                    <div>
                      <h4>{s.title}</h4>
                      <p>{s.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="lp-disclaimer" style={{marginTop: '2rem'}}>
              <Shield size={16} />
              <span>
                <strong>Medical Disclaimer:</strong> This platform is intended for educational and screening purposes only.
                Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment.
              </span>
            </div>
          </div>
          <div className="lp-split-image">
            <img src="/images/security.png" alt="Secure medical folder with lock illustration" />
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══════════════════════════════════════════════════ */}
      <section className="lp-final-cta">
        <div className="lp-fca-inner">
          <div className="lp-fca-glow" />
          <p className="lp-eyebrow lp-eyebrow-light">Get Started Today</p>
          <h2 className="lp-fca-h2">Start Understanding<br />Your Thyroid Health</h2>
          <p className="lp-fca-sub">
            Free to use. No credit card required. Instant AI insights from your first login.
          </p>
          <div className="lp-fca-btns">
            <button className="lp-btn-primary lp-btn-lg" onClick={isSignedIn ? goToApp : goToSignUp}>
              {isSignedIn ? 'Open Dashboard' : 'Create Free Account'} <ArrowRight size={16} />
            </button>
            <button className="lp-btn-outline-light lp-btn-lg" onClick={goToApp}>
              Try AI Chatbot
            </button>
            <button className="lp-btn-outline-light lp-btn-lg" onClick={goToApp}>
              Run AI Diagnosis
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <HeartPulse size={22} className="lp-brand-icon" />
            <span className="lp-brand-name">ThyroRAG</span>
          </div>
          <nav className="lp-footer-links">
            <a href="#features">About</a>
            <a href="#security">Privacy Policy</a>
            <a href="#security">Terms</a>
            <a href="mailto:contact@thyrorag.app">Contact</a>
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
          </nav>
          <p className="lp-footer-note">
            © {new Date().getFullYear()} ThyroRAG · For educational and screening purposes only.
            Always consult a qualified healthcare professional.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;


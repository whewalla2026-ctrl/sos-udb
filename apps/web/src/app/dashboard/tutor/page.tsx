'use client';
import { useState, useRef, useEffect } from 'react';

type Message = { id: string; role: 'user' | 'tutor'; text: string; intent?: string };

const SUBJECTS = ['Math (Fractions)', 'Math (Algebra)', 'Science', 'History', 'English Literature'];

export default function SocraticTutorPage() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'tutor', text: "Hello! I'm your Socratic Tutor. I see we're working on Math (Fractions) today. What concept are you exploring, or where are you stuck?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Mock AI response with Socratic logic
    setTimeout(() => {
      let response = "That's a great start. What do you think should be the next step to solve this?";
      let intent = "EXPLORING";
      
      const lower = userMsg.text.toLowerCase();
      if (lower.includes('answer') || lower.includes('tell me')) {
        response = "I know it feels tough right now, but you're closer than you think! Instead of giving you the answer, let me ask: what do you already know about this concept?";
        intent = "REFUSAL";
      } else if (lower.includes('stuck') || lower.includes('confused')) {
        response = "It's totally normal to feel stuck here. Let's break it down. What was the very last thing that made sense to you?";
        intent = "SCAFFOLDING";
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'tutor', text: response, intent }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1 className="page-title">🧠 Socratic AI Tutor</h1>
        <p className="page-subtitle">I won't give you the answers, but I will help you find them.</p>
      </div>

      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tutor Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--bg-glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🤖</div>
            <div>
              <div style={{ fontWeight: 600 }}>Aristotle (Gemini 1.5 Pro)</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} /> Online
              </div>
            </div>
          </div>
          <select className="input" style={{ width: 200, padding: '8px 12px' }} value={subject} onChange={e => setSubject(e.target.value)} id="subject-select">
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }} id={`msg-${msg.id}`}>
              <div style={{
                maxWidth: '75%', padding: '12px 16px', borderRadius: 'var(--radius-lg)',
                background: msg.role === 'user' ? 'var(--gradient-primary)' : 'var(--bg-elevated)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                borderBottomRightRadius: msg.role === 'user' ? 4 : 'var(--radius-lg)',
                borderBottomLeftRadius: msg.role === 'tutor' ? 4 : 'var(--radius-lg)',
                boxShadow: msg.role === 'user' ? '0 4px 12px rgba(124,58,237,0.2)' : 'none',
                border: msg.role === 'tutor' ? '1px solid var(--bg-glass-border)' : 'none',
              }}>
                <div style={{ lineHeight: 1.5, fontSize: '0.9375rem' }}>{msg.text}</div>
              </div>
              {msg.intent && msg.role === 'tutor' && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--color-accent-light)' }}>⚡ AI Intent:</span> {msg.intent}
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)', border: '1px solid var(--bg-glass-border)', borderBottomLeftRadius: 4 }}>
                <div className="typing-indicator"><span>.</span><span>.</span><span>.</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ padding: 20, borderTop: '1px solid var(--bg-glass-border)', background: 'rgba(10,10,26,0.5)' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 12 }}>
            <input
              id="tutor-input"
              className="input"
              style={{ flex: 1, borderRadius: 'var(--radius-full)', paddingLeft: 20 }}
              placeholder="Ask a question or explain where you are stuck..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button id="send-msg-btn" type="submit" className="btn btn-primary btn-icon" style={{ borderRadius: '50%', width: 44, height: 44 }} disabled={!input.trim() || isTyping}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            The AI Tutor will guide you to the answer, but will never give it to you directly.
          </div>
        </div>
      </div>
      <style>{`
        .typing-indicator span { animation: blink 1.4s infinite both; font-size: 1.5rem; line-height: 0.5; font-weight: 700; color: var(--color-primary-light); }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
      `}</style>
    </div>
  );
}

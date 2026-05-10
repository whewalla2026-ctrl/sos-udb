'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { ASK_TUTOR } from '../../../lib/queries';

type Message = { id: string; role: 'user' | 'tutor'; text: string; intent?: string };

var SUBJECTS = ['Math (Fractions)', 'Math (Algebra)', 'Science', 'History', 'English Literature'];

export default function SocraticTutorPage() {
  var [subject, setSubject] = useState(SUBJECTS[0]);
  var [input, setInput] = useState('');
  var [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'tutor', text: "Hello! I'm your Socratic Tutor. What concept are you exploring today?" }
  ]);
  var [isTyping, setIsTyping] = useState(false);
  var [sessionId, setSessionId] = useState('session-' + Date.now());
  var scrollRef = useRef<HTMLDivElement>(null);
  var [askTutor] = useMutation(ASK_TUTOR);

  useEffect(function() {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  var handleSend = function(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    var userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(function(prev) { return [...prev, userMsg]; });
    setInput('');
    setIsTyping(true);

    var subjectClean = subject.toLowerCase().replace(' (', '-').replace(')', '');
    askTutor({ variables: { input: userMsg.text, sessionId: sessionId, subject: subjectClean } })
      .then(function(result) {
        var data = result.data?.askTutor;
        var tutorMsg: Message = {
          id: Date.now().toString(),
          role: 'tutor',
          text: data?.response || 'Let me think about that...',
          intent: data?.intent
        };
        setMessages(function(prev) { return [...prev, tutorMsg]; });
        setIsTyping(false);
      })
      .catch(function() {
        var fallback = "That is a great question. Let me help you break it down step by step. What part do you understand already?";
        setMessages(function(prev) { return [...prev, { id: Date.now().toString(), role: 'tutor', text: fallback }]; });
        setIsTyping(false);
      });
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div className="page-header flex items-center justify-between" style={{ flexShrink: 0 }}>
        <div>
          <h1 className="page-title">Socratic AI Tutor</h1>
          <p className="page-subtitle">I will not give you the answer. I will help you discover it.</p>
        </div>
        <select className="input" style={{ width: 200 }} value={subject} onChange={function(e) { setSubject(e.target.value); }}>
          {SUBJECTS.map(function(s) { return <option key={s} value={s}>{s}</option>; })}
        </select>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0', marginBottom: 16 }}>
        {messages.map(function(m) {
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div className={'glass-card ' + (m.role === 'user' ? 'user-bubble' : 'tutor-bubble')} style={{ padding: '14px 18px', maxWidth: '70%', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
                <div style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>{m.text}</div>
                {m.intent && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 8, textTransform: 'uppercase' }}>{m.intent}</div>}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="glass-card" style={{ padding: '14px 18px', borderRadius: '18px 18px 18px 4px' }}>
              <span className="typing-indicator">Thinking</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
        <input
          className="input" style={{ flex: 1, padding: '14px 18px' }}
          placeholder="Type your question or answer..."
          value={input}
          onChange={function(e) { setInput(e.target.value); }}
          disabled={isTyping}
        />
        <button type="submit" className="btn btn-primary" disabled={isTyping || !input.trim()} style={{ padding: '14px 24px' }}>
          Send
        </button>
      </form>
    </div>
  );
}

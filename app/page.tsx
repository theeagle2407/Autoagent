'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

type Message = {
  id: number;
  role: 'user' | 'agent';
  content: string;
  txHash?: string;
  explorerUrl?: string;
  action?: string;
  loading?: boolean;
  schedule?: any;
};

type Schedule = {
  id: string;
  description: string;
  recipient: string;
  amount: string;
  interval: string;
  nextRun: string;
  lastRun?: string;
  lastTxHash?: string;
  explorerUrl?: string;
  executionCount: number;
  active: boolean;
};

const SUGGESTIONS = [
  { icon: '💰', label: 'Check my balance', cmd: 'Check my balance' },
  { icon: '📤', label: 'Send ETH now', cmd: 'Send 0.001 ETH to 0xC3d60A3dE236Fa03BF9fd16e1199fEFfCD0D5DAF' },
  { icon: '⏰', label: 'Schedule weekly payment', cmd: 'Send 0.001 ETH to 0xC3d60A3dE236Fa03BF9fd16e1199fEFfCD0D5DAF every week' },
  { icon: '🔁', label: 'Schedule daily payment', cmd: 'Send 0.001 ETH to 0xC3d60A3dE236Fa03BF9fd16e1199fEFfCD0D5DAF every day' },
];

const AGENT_STEPS = [
  'Reading your command...',
  'Deciding best action...',
  'Building transaction...',
  'Executing gaslessly on Status Network...',
];

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'now';
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `in ${d}d ${h % 24}h`;
  if (h > 0) return `in ${h}h ${m % 60}m`;
  return `in ${m}m`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [txCount, setTxCount] = useState(0);
  const [gasSaved, setGasSaved] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'schedules'>('chat');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stepInterval = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (loading) {
      setStepIndex(0);
      stepInterval.current = setInterval(() => {
        setStepIndex(prev => Math.min(prev + 1, AGENT_STEPS.length - 1));
      }, 800);
    } else {
      clearInterval(stepInterval.current);
    }
    return () => clearInterval(stepInterval.current);
  }, [loading]);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      setSchedules(data);
      const totalExec = data.reduce((acc: number, s: Schedule) => acc + s.executionCount, 0);
      setTxCount(totalExec);
      setGasSaved(parseFloat((totalExec * 0.0021).toFixed(4)));
    } catch {}
  }, []);

  useEffect(() => {
    fetchSchedules();
    const interval = setInterval(fetchSchedules, 10000);
    return () => clearInterval(interval);
  }, [fetchSchedules]);

  const deleteSchedule = async (id: string) => {
    await fetch('/api/schedules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchSchedules();
  };

  const sendMessage = async (text?: string) => {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;
    setInput('');
    setLoading(true);
    setShowWelcome(false);
    setActiveTab('chat');

    const userMsg: Message = { id: Date.now(), role: 'user', content: userMessage };
    const loadingMsg: Message = { id: Date.now() + 1, role: 'agent', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();

      if (data.txHash) {
        setTxCount(prev => prev + 1);
        setGasSaved(prev => parseFloat((prev + 0.0021).toFixed(4)));
      }

      if (data.schedule) {
        fetchSchedules();
        setTimeout(() => setActiveTab('schedules'), 2000);
      }

      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, loading: false, content: data.message || 'Done.', txHash: data.txHash, explorerUrl: data.explorerUrl, action: data.action, schedule: data.schedule } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, loading: false, content: '❌ Something went wrong. Please try again.' } : m
      ));
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#07070f', color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(7,7,15,0.97)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>⚡</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.5px' }}>AutoAgent</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>AI Chief of Staff · Status Network · Gas Free</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '5px 12px', backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#818cf8' }}>{txCount}</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>TXs Executed</div>
          </div>
          <div style={{ padding: '5px 12px', backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#4ade80' }}>{gasSaved} ETH</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>Gas Saved</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '999px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
            <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: '600' }}>Live</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 28px', display: 'flex', gap: '4px', backgroundColor: 'rgba(7,7,15,0.97)' }}>
        {[
          { key: 'chat', label: '💬 Chat' },
          { key: 'schedules', label: `⏰ Schedules ${schedules.length > 0 ? `(${schedules.length})` : ''}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === tab.key ? '#818cf8' : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '-1px' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <>
          {showWelcome && (
            <div style={{ maxWidth: '720px', width: '100%', margin: '40px auto 0', padding: '0 24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '999px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: '600' }}>⚡ Powered by Status Network · Gas = $0.00</span>
                </div>
                <h1 style={{ fontSize: '38px', fontWeight: '900', letterSpacing: '-1.5px', marginBottom: '14px', lineHeight: 1.1 }}>
                  Your AI Agent.<br />
                  <span style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Zero Gas. Every Time.</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', maxWidth: '460px', margin: '0 auto', lineHeight: 1.7 }}>
                  Tell AutoAgent to send payments, schedule recurring transactions, or manage on-chain tasks — all gaslessly on Status Network.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '28px' }}>
                {[
                  { icon: '💬', title: 'You speak', desc: 'Plain English commands' },
                  { icon: '🤖', title: 'Agent acts', desc: 'AI interprets & executes' },
                  { icon: '⚡', title: 'Zero gas', desc: '$0 fee every transaction' },
                ].map((item, i) => (
                  <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', marginBottom: '10px', letterSpacing: '0.5px' }}>TRY THESE</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s.cmd)}
                    style={{ padding: '12px 14px', backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', cursor: 'pointer', fontWeight: '500', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', maxWidth: '720px', width: '100%', margin: '0 auto' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'agent' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>⚡</div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>AutoAgent</span>
                  </div>
                )}
                <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px', backgroundColor: msg.role === 'user' ? '#6366f1' : 'rgba(255,255,255,0.04)', border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)', fontSize: '14px', lineHeight: '1.6' }}>
                  {msg.loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px' }}>
                      {AGENT_STEPS.map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: i <= stepIndex ? 1 : 0.2, transition: 'opacity 0.4s' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: i < stepIndex ? '#4ade80' : i === stepIndex ? '#6366f1' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', flexShrink: 0, boxShadow: i === stepIndex ? '0 0 8px rgba(99,102,241,0.6)' : 'none' }}>
                            {i < stepIndex ? '✓' : i === stepIndex ? '●' : '○'}
                          </div>
                          <span style={{ fontSize: '12px', color: i === stepIndex ? 'white' : 'rgba(255,255,255,0.4)' }}>{step}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                  )}
                </div>
                {msg.txHash && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', maxWidth: '85%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                      <div>
                        <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: '700' }}>GASLESS TX CONFIRMED · $0.00 GAS</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Status Network Sepolia</div>
                      </div>
                    </div>
                    {React.createElement('a', { href: msg.explorerUrl, target: '_blank', rel: 'noopener noreferrer', style: { fontSize: '10px', color: '#818cf8', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap' } }, `${msg.txHash.slice(0, 8)}...${msg.txHash.slice(-6)} ↗`)}
                  </div>
                )}
                {msg.schedule && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', maxWidth: '85%' }}>
                    <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: '700', marginBottom: '4px' }}>⏰ SCHEDULE CREATED — FULLY AUTONOMOUS</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>First run: {new Date(msg.schedule.nextRun).toLocaleString()}</div>
                    <button onClick={() => setActiveTab('schedules')} style={{ marginTop: '6px', fontSize: '11px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: '600' }}>View Schedules →</button>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '720px', width: '100%', margin: '0 auto' }}>
          {schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏰</div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>No active schedules</h3>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '20px' }}>Tell AutoAgent to schedule a recurring payment</p>
              <button onClick={() => { setActiveTab('chat'); sendMessage('Send 0.001 ETH to 0xC3d60A3dE236Fa03BF9fd16e1199fEFfCD0D5DAF every week'); }}
                style={{ padding: '10px 20px', backgroundColor: '#6366f1', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                Create your first schedule
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>Active Schedules</h2>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{schedules.length} running · auto-executes on Vercel</span>
              </div>
              {schedules.map(s => (
                <div key={s.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{s.description}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>To: {shortAddr(s.recipient)} · {s.amount} ETH · {s.interval}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ padding: '4px 10px', backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '6px', fontSize: '10px', color: '#4ade80', fontWeight: '700' }}>ACTIVE</div>
                      <button onClick={() => deleteSchedule(s.id)} style={{ padding: '4px 10px', backgroundColor: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: '6px', fontSize: '10px', color: 'rgba(255,100,100,0.8)', fontWeight: '700', cursor: 'pointer' }}>DELETE</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    {[
                      { label: 'Next Run', value: timeUntil(s.nextRun) },
                      { label: 'Executions', value: s.executionCount.toString() },
                      { label: 'Gas Cost', value: '$0.00 always' },
                    ].map((stat, i) => (
                      <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#818cf8' }}>{stat.value}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  {s.lastTxHash && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.1)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Last tx: {new Date(s.lastRun!).toLocaleString()}</div>
                      {React.createElement('a', { href: s.explorerUrl, target: '_blank', rel: 'noopener noreferrer', style: { fontSize: '10px', color: '#4ade80', fontWeight: '700', textDecoration: 'none' } }, `${s.lastTxHash.slice(0, 8)}...${s.lastTxHash.slice(-6)} ↗`)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 24px', backgroundColor: 'rgba(7,7,15,0.97)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>⚡</span>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder='Try: "Send 0.001 ETH to 0x... every week"'
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '14px', fontFamily: 'inherit' }}
            />
          </div>
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ width: '44px', height: '44px', borderRadius: '12px', border: 'none', backgroundColor: !input.trim() || loading ? 'rgba(255,255,255,0.06)' : '#6366f1', color: 'white', fontSize: '18px', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: !input.trim() || loading ? 'none' : '0 0 20px rgba(99,102,241,0.4)', flexShrink: 0 }}>
            ↑
          </button>
        </div>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '10px', marginTop: '8px' }}>
          ⚡ gasPrice = 0 · Status Network Sepolia · Chain ID: 1660990954
        </p>
      </div>
    </div>
  );
}
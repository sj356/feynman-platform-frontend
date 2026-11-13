// src/pages/AiChatPage.jsx
// AI 助教问答：选择一个知识点，围绕其原文多轮对话
import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';

function AiChatPage() {
  const [kps, setKps] = useState([]);
  const [kpId, setKpId] = useState('');
  const [messages, setMessages] = useState([]); // [{ role, content }]
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  // 拉取知识点列表
  useEffect(() => {
    const fetchKps = async () => {
      try {
        const res = await apiClient.get('/knowledge-points');
        setKps(res.data);
      } catch (err) {
        console.error('获取知识点失败', err);
        setError('获取知识点失败，请确认后端已启动且已登录');
      }
    };
    fetchKps();
  }, []);

  const currentKp = kps.find((k) => k._id === kpId) || null;

  // 切换知识点时清空对话
  const onSelectKp = (id) => {
    setKpId(id);
    setMessages([]);
    setError('');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !currentKp || sending) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError('');

    try {
      const res = await apiClient.post(
        '/ai/chat',
        {
          kpTitle: currentKp.title,
          kpContent: currentKp.content,
          messages: nextMessages,
        },
        { timeout: 30000 }
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply || '（暂无回复）' }]);
    } catch (err) {
      console.error('AI 问答失败', err);
      setError('AI 问答失败：' + (err.response?.data?.msg || err.message));
      // 把失败的用户消息保留，便于重试
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>🤖 AI 助教问答</h1>
      <p style={{ color: '#6b7280', margin: '0 0 20px' }}>
        选择一个知识点，就它的内容向助教自由提问
      </p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151' }}>
          选择知识点：
          <select
            value={kpId}
            onChange={(e) => onSelectKp(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 15,
              maxWidth: 420,
            }}
          >
            <option value="">-- 请选择 --</option>
            {kps.map((kp) => (
              <option key={kp._id} value={kp._id}>{kp.title}</option>
            ))}
          </select>
        </label>

        {error && <p style={{ color: '#ef4444', marginTop: 12 }}>{error}</p>}

        {/* 对话区 */}
        <div
          style={{
            marginTop: 20,
            minHeight: 320,
            maxHeight: 420,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: '4px 2px',
          }}
        >
          {!currentKp && (
            <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: 60 }}>
              请先选择一个知识点开始提问
            </p>
          )}

          {currentKp && messages.length === 0 && (
            <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: 60 }}>
              试着问：这个概念是什么意思？举个例子？和其他概念有什么区别？
            </p>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: m.role === 'user' ? '#7c3aed' : '#f3f4f6',
                color: m.role === 'user' ? '#fff' : '#1f2937',
                padding: '12px 14px',
                borderRadius: 12,
                fontSize: 15,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 输入区 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            disabled={!currentKp || sending}
            placeholder={currentKp ? '输入你的问题...' : '请先选择知识点'}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 15,
            }}
          />
          <button
            onClick={send}
            disabled={!currentKp || sending}
            style={{
              padding: '10px 22px',
              background: !currentKp || sending ? '#d1d5db' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {sending ? '思考中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AiChatPage;

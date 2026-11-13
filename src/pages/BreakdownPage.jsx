// src/pages/BreakdownPage.jsx
// AI 知识点拆解：输入大主题，AI 生成子知识点，可批量入库
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

function BreakdownPage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState([]); // [{ title, content, added }]
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  // 调用 AI 拆解
  const handleBreakdown = async () => {
    if (!topic.trim()) {
      alert('请先输入要拆解的主题');
      return;
    }
    setLoading(true);
    setError('');
    setTopics([]);
    setAddedCount(0);
    try {
      const res = await apiClient.post('/ai/breakdown', { topic: topic.trim() }, { timeout: 30000 });
      const list = res.data.topics || [];
      setTopics(list.map((t) => ({ ...t, added: false })));
      if (list.length === 0) setError('AI 未返回有效子知识点，请换个主题重试');
    } catch (err) {
      console.error('拆解失败', err);
      setError('AI 拆解失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 单个入库
  const addOne = async (index) => {
    const t = topics[index];
    if (!t || t.added) return;
    try {
      await apiClient.post('/knowledge-points', { title: t.title, content: t.content });
      setTopics((prev) => prev.map((p, i) => (i === index ? { ...p, added: true } : p)));
      setAddedCount((c) => c + 1);
    } catch (err) {
      console.error('入库失败', err);
      alert('添加失败：' + (err.response?.data?.msg || err.message));
    }
  };

  // 批量入库未添加的
  const addAll = async () => {
    const pending = topics.map((t, i) => ({ ...t, i })).filter((t) => !t.added);
    if (pending.length === 0) return;
    setAdding(true);
    let ok = 0;
    for (const t of pending) {
      try {
        await apiClient.post('/knowledge-points', { title: t.title, content: t.content });
        setTopics((prev) => prev.map((p, i) => (i === t.i ? { ...p, added: true } : p)));
        ok += 1;
      } catch (err) {
        console.error('批量入库失败', err);
      }
    }
    setAddedCount((c) => c + ok);
    setAdding(false);
    alert(`已成功添加 ${ok} 个知识点`);
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>🧩 AI 知识点拆解</h1>
      <p style={{ color: '#6b7280', margin: '0 0 20px' }}>
        输入一个大主题，AI 帮你拆成若干子知识点，再一键加入你的知识库
      </p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBreakdown(); }}
            placeholder="例如：React Hooks、操作系统进程管理、排序算法"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 15,
            }}
          />
          <button
            onClick={handleBreakdown}
            disabled={loading}
            style={{
              padding: '10px 22px',
              background: loading ? '#d1d5db' : '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {loading ? '拆解中...' : 'AI 拆解'}
          </button>
        </div>

        {error && <p style={{ color: '#ef4444', marginTop: 12 }}>{error}</p>}

        {topics.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: 15, color: '#1f2937' }}>
                拆解出 {topics.length} 个子知识点{addedCount > 0 ? `（已添加 ${addedCount}）` : ''}
              </strong>
              <button
                onClick={addAll}
                disabled={adding || topics.every((t) => t.added)}
                style={{
                  padding: '8px 18px',
                  background: adding ? '#d1d5db' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {adding ? '添加中...' : '全部添加到知识点'}
              </button>
            </div>

            {topics.map((t, i) => (
              <div
                key={i}
                style={{
                  background: '#fafafa',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                  border: t.added ? '1px solid #10b981' : '1px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 15, color: '#1f2937' }}>{t.title}</strong>
                  {t.added ? (
                    <span style={{ color: '#10b981', fontSize: 13 }}>✅ 已添加</span>
                  ) : (
                    <button
                      onClick={() => addOne(i)}
                      style={{
                        padding: '6px 14px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      添加
                    </button>
                  )}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                  {t.content}
                </p>
              </div>
            ))}

            <button
              onClick={() => navigate('/')}
              style={{ marginTop: 8, padding: '8px 18px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
            >
              返回主页查看知识点
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BreakdownPage;

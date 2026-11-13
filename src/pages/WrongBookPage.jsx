// src/pages/WrongBookPage.jsx
// 错题本：错题列表、AI 讲解、勾选重做、移出错题
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

const TYPE_LABEL = {
  'single-choice': '单项选择',
  'multiple-choice': '多项选择',
  'true-false': '判断对错',
  'short-answer': '简答题',
  feynman: '复述',
};

const SOURCE_LABEL = {
  feynman: '复述',
  quiz: '单题测评',
  exam: '综合测评',
};

function WrongBookPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState({}); // recordId -> true
  const [explainingId, setExplainingId] = useState(null);
  const [explains, setExplains] = useState({}); // recordId -> { explain, pitfalls, variant }

  const fetchWrong = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/records', { params: { wrong: 1 } });
      setRecords(res.data);
    } catch (err) {
      console.error('获取错题失败', err);
      setError('获取错题失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWrong();
  }, []);

  const toggleCheck = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedRecords = records.filter((r) => checked[r._id]);

  // 勾选错题进入重做页
  const handleRetry = () => {
    if (checkedRecords.length === 0) {
      alert('请先勾选要重做的错题');
      return;
    }
    navigate('/retry', { state: { records: checkedRecords } });
  };

  // AI 讲解
  const handleExplain = async (r) => {
    if (explainingId) return;
    setExplainingId(r._id);
    try {
      let kpContent = '';
      if (r.kp?._id) {
        try {
          const kpRes = await apiClient.get(`/knowledge-points/${r.kp._id}`);
          kpContent = kpRes.data.content || '';
        } catch (e) {
          console.error('获取知识点原文失败', e);
        }
      }
      const res = await apiClient.post(
        '/ai/explain-wrong',
        {
          kpTitle: r.kp?.title || '',
          kpContent,
          questionType: r.questionType,
          question: r.question,
          userAnswer: r.userAnswer,
          correctAnswer: r.correctAnswer,
          explanation: r.explanation,
        },
        { timeout: 30000 }
      );
      setExplains((prev) => ({ ...prev, [r._id]: res.data }));
    } catch (err) {
      console.error('AI 讲解失败', err);
      alert('AI 讲解失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setExplainingId(null);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('确定把这道题移出错题本吗？')) return;
    try {
      await apiClient.delete(`/records/${id}`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setChecked((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error('移出错题失败', err);
      alert('操作失败：' + (err.response?.data?.msg || err.message));
    }
  };

  const formatTime = (t) => {
    if (!t) return '';
    return new Date(t).toLocaleString('zh-CN', { hour12: false });
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>📕 错题本</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>
            勾选错题重做，或让 AI 帮你讲解
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleRetry}
            style={{
              padding: '10px 20px',
              background: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            🔥 重做选中（{checkedRecords.length}）
          </button>
          <Link to="/exam" style={{ textDecoration: 'none' }}>
            <button
              style={{
                padding: '10px 20px',
                background: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              📋 去综合测评
            </button>
          </Link>
        </div>
      </div>

      {loading && <p style={{ textAlign: 'center', marginTop: 40, color: '#7c3aed' }}>加载中...</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {!loading && records.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#fff',
            borderRadius: 12,
            color: '#9ca3af',
          }}
        >
          🎉 目前没有错题，继续保持！
        </div>
      )}

      {records.map((r) => {
        const ex = explains[r._id];
        return (
          <div
            key={r._id}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              borderLeft: '4px solid #ef4444',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!checked[r._id]}
                  onChange={() => toggleCheck(r._id)}
                />
                <strong style={{ color: '#1f2937' }}>
                  {TYPE_LABEL[r.questionType] || '题目'}
                  {r.kp?.title ? ` · ${r.kp.title}` : ''}
                </strong>
              </label>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                {SOURCE_LABEL[r.source] || ''} ｜ {formatTime(r.createdAt)}
              </span>
            </div>

            <p style={{ margin: '10px 0 6px', fontSize: 15 }}>{r.question}</p>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#ef4444' }}>
              <strong>你的回答：</strong>{r.userAnswer || '（未作答）'}
            </p>
            {r.correctAnswer && (
              <p style={{ margin: '0 0 6px', fontSize: 14, color: '#10b981' }}>
                <strong>正确答案：</strong>{r.correctAnswer}
              </p>
            )}
            {r.explanation && (
              <p style={{ margin: '0 0 10px', fontSize: 14, color: '#6b7280' }}>
                <strong>解析：</strong>{r.explanation}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button
                onClick={() => handleExplain(r)}
                disabled={explainingId === r._id}
                style={{
                  padding: '6px 16px',
                  background: explainingId === r._id ? '#d1d5db' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {explainingId === r._id ? '讲解中...' : '🤖 AI 讲解'}
              </button>
              <button
                onClick={() => handleRemove(r._id)}
                style={{
                  padding: '6px 16px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ✅ 已攻克，移出错题本
              </button>
            </div>

            {ex && (
              <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 8, padding: 14 }}>
                {ex.explain && (
                  <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.7 }}>
                    <strong>讲解：</strong>{ex.explain}
                  </p>
                )}
                {ex.pitfalls && (
                  <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.7, color: '#b45309' }}>
                    <strong>易错点：</strong>{ex.pitfalls}
                  </p>
                )}
                {ex.variant && (
                  <p style={{ margin: '0', fontSize: 14, lineHeight: 1.7, color: '#2563eb' }}>
                    <strong>变式题：</strong>{ex.variant}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WrongBookPage;

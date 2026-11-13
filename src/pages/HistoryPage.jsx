// src/pages/HistoryPage.jsx
// 学习历史：复述记录 / 测评记录 两个 Tab 回看
import { useState, useEffect } from 'react';
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

function HistoryPage() {
  const [tab, setTab] = useState('feynman'); // feynman | quiz
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      setError('');
      try {
        if (tab === 'feynman') {
          const res = await apiClient.get('/records', { params: { source: 'feynman' } });
          setList(res.data);
        } else {
          const [quizRes, examRes] = await Promise.all([
            apiClient.get('/records', { params: { source: 'quiz' } }),
            apiClient.get('/records', { params: { source: 'exam' } }),
          ]);
          const merged = [...quizRes.data, ...examRes.data].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setList(merged);
        }
      } catch (err) {
        console.error('获取历史记录失败', err);
        setError('获取历史记录失败：' + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [tab]);

  const formatTime = (t) => {
    if (!t) return '';
    return new Date(t).toLocaleString('zh-CN', { hour12: false });
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>📜 学习历史</h1>
      <p style={{ color: '#6b7280', margin: '0 0 20px' }}>回看你的复述与测评记录</p>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { key: 'feynman', label: '🎤 复述记录' },
          { key: 'quiz', label: '📝 测评记录' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              fontSize: 14,
              cursor: 'pointer',
              background: tab === t.key ? '#7c3aed' : '#e5e7eb',
              color: tab === t.key ? '#fff' : '#374151',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ textAlign: 'center', marginTop: 40, color: '#7c3aed' }}>加载中...</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {!loading && list.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#fff',
            borderRadius: 12,
            color: '#9ca3af',
          }}
        >
          暂无{tab === 'feynman' ? '复述' : '测评'}记录
        </div>
      )}

      {list.map((r) => (
        <div
          key={r._id}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 14, color: '#1f2937' }}>
              {r.kp?.title || '未关联知识点'}
            </strong>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {SOURCE_LABEL[r.source] || ''} ｜ {formatTime(r.createdAt)}
            </span>
          </div>

          {/* 复述记录 */}
          {r.source === 'feynman' && (
            <div style={{ marginTop: 10 }}>
              {r.score != null && (
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: Number(r.score) >= 60 ? '#10b981' : '#ef4444',
                    background: Number(r.score) >= 60 ? '#ecfdf5' : '#fef2f2',
                    padding: '3px 12px',
                    borderRadius: 6,
                    marginBottom: 8,
                  }}
                >
                  得分 {r.score}
                </span>
              )}
              {r.userAnswer && (
                <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                  <strong>我的复述：</strong>{r.userAnswer}
                </p>
              )}
              {r.feedback?.evaluation && (
                <p style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.7, color: '#6b7280' }}>
                  <strong>AI 评价：</strong>{r.feedback.evaluation}
                </p>
              )}
              {r.feedback?.strengths && (
                <p style={{ margin: '0 0 6px', fontSize: 14, color: '#10b981' }}>
                  <strong>优点：</strong>{r.feedback.strengths}
                </p>
              )}
              {r.feedback?.weaknesses && (
                <p style={{ margin: '0', fontSize: 14, color: '#b45309' }}>
                  <strong>不足：</strong>{r.feedback.weaknesses}
                </p>
              )}
            </div>
          )}

          {/* 测评记录 */}
          {r.source !== 'feynman' && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#7c3aed' }}>{TYPE_LABEL[r.questionType] || '题目'}</span>
                {r.isCorrect === null ? (
                  <span style={{ fontSize: 13, color: '#6b7280' }}>未判分</span>
                ) : r.isCorrect ? (
                  <span style={{ fontSize: 13, color: '#10b981' }}>✅ 答对</span>
                ) : (
                  <span style={{ fontSize: 13, color: '#ef4444' }}>❌ 答错</span>
                )}
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 15 }}>{r.question}</p>
              <p style={{ margin: '0 0 6px', fontSize: 14, color: '#ef4444' }}>
                <strong>我的回答：</strong>{r.userAnswer || '（未作答）'}
              </p>
              {r.correctAnswer && (
                <p style={{ margin: '0 0 6px', fontSize: 14, color: '#10b981' }}>
                  <strong>正确答案：</strong>{r.correctAnswer}
                </p>
              )}
              {r.explanation && (
                <p style={{ margin: '0', fontSize: 14, color: '#6b7280' }}>
                  <strong>解析：</strong>{r.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default HistoryPage;

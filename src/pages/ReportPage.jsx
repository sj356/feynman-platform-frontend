// src/pages/ReportPage.jsx
// 学习报告：汇总看板统计、掌握度、复述与测评记录，支持打印 / 导出 PDF
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';

const TYPE_LABEL = {
  'single-choice': '单项选择',
  'multiple-choice': '多项选择',
  'true-false': '判断对错',
  'short-answer': '简答题',
  feynman: '复述',
};

function masteryColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function ReportPage() {
  const [stats, setStats] = useState(null);
  const [mastery, setMastery] = useState({ map: {}, avgMastery: 0 });
  const [kps, setKps] = useState([]);
  const [feynmanList, setFeynmanList] = useState([]);
  const [quizList, setQuizList] = useState([]);
  const [examList, setExamList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ov, mst, kpRes, feynmanRes, quizRes, examRes] = await Promise.all([
          apiClient.get('/statistics/overview'),
          apiClient.get('/statistics/mastery-map'),
          apiClient.get('/knowledge-points'),
          apiClient.get('/records', { params: { source: 'feynman' } }),
          apiClient.get('/records', { params: { source: 'quiz' } }),
          apiClient.get('/records', { params: { source: 'exam' } }),
        ]);
        setStats(ov.data);
        setMastery(mst.data);
        setKps(kpRes.data);
        setFeynmanList(feynmanRes.data);
        setQuizList(quizRes.data);
        setExamList(examRes.data);
      } catch (err) {
        console.error('获取报告数据失败', err);
        setError('获取报告失败：' + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <p style={{ textAlign: 'center', marginTop: 60 }}>报告生成中...</p>;
  if (error) return <p style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{error}</p>;

  const quizRecords = [...quizList, ...examList].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // 薄弱题型：按答错数统计
  const wrongByType = {};
  quizRecords.forEach((r) => {
    if (r.isCorrect === false) {
      wrongByType[r.questionType] = (wrongByType[r.questionType] || 0) + 1;
    }
  });
  const weakTypes = Object.entries(wrongByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // 知识点掌握度列表（有分数的）
  const masteryList = kps
    .map((kp) => ({ kp, score: mastery.map[kp._id] ?? 0 }))
    .sort((a, b) => a.score - b.score);

  const now = new Date().toLocaleString('zh-CN', { hour12: false });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>📊 学习报告</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>生成时间：{now}</p>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            padding: '10px 22px',
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          🖨️ 打印 / 保存 PDF
        </button>
      </div>

      {/* 概览 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: '知识点总数', value: stats.kpTotal, color: '#1f2937' },
            { label: '已掌握', value: stats.mastered, color: '#10b981' },
            { label: '待复习', value: stats.reviewCount, color: '#ef4444' },
            { label: '累计答题', value: stats.answerCount, color: '#2563eb' },
            { label: '正确率', value: `${stats.accuracy}%`, color: '#7c3aed' },
            { label: '复述均分', value: stats.avgScore, color: '#f59e0b' },
            { label: '平均掌握度', value: `${mastery.avgMastery}%`, color: '#0ea5e9' },
          ].map((c) => (
            <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 掌握度列表 */}
      <section style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 18, color: '#1f2937', margin: '0 0 14px' }}>知识点掌握度</h2>
        {masteryList.length === 0 && <p style={{ color: '#9ca3af' }}>暂无知识点</p>}
        {masteryList.map(({ kp, score }) => (
          <div key={kp._id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
              <span>{kp.title}</span>
              <span style={{ color: masteryColor(score), fontWeight: 700 }}>{score} 分</span>
            </div>
            <div style={{ background: '#f3f4f6', borderRadius: 999, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${score}%`, background: masteryColor(score), height: '100%', borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </section>

      {/* 薄弱题型 */}
      {weakTypes.length > 0 && (
        <section style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 18, color: '#1f2937', margin: '0 0 14px' }}>薄弱题型（按答错数）</h2>
          {weakTypes.map(([type, count]) => (
            <p key={type} style={{ margin: '0 0 6px', fontSize: 14 }}>
              {TYPE_LABEL[type] || type}：答错 {count} 题
            </p>
          ))}
        </section>
      )}

      {/* 复述记录 */}
      <section style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 18, color: '#1f2937', margin: '0 0 14px' }}>🎤 复述记录（{feynmanList.length}）</h2>
        {feynmanList.length === 0 && <p style={{ color: '#9ca3af' }}>暂无复述记录</p>}
        {feynmanList.map((r) => (
          <div key={r._id} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <strong>{r.kp?.title || '未关联知识点'}</strong>
              <span style={{ color: r.score != null && Number(r.score) >= 60 ? '#10b981' : '#ef4444' }}>
                得分 {r.score ?? '-'}
              </span>
            </div>
            {r.feedback?.evaluation && (
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>{r.feedback.evaluation}</p>
            )}
          </div>
        ))}
      </section>

      {/* 测评记录 */}
      <section style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 18, color: '#1f2937', margin: '0 0 14px' }}>📝 测评记录（{quizRecords.length}）</h2>
        {quizRecords.length === 0 && <p style={{ color: '#9ca3af' }}>暂无测评记录</p>}
        {quizRecords.map((r) => (
          <div key={r._id} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{TYPE_LABEL[r.questionType] || '题目'} · {r.kp?.title || '未关联'}</span>
              <span style={{ color: r.isCorrect ? '#10b981' : '#ef4444' }}>
                {r.isCorrect === null ? '未判分' : r.isCorrect ? '✅ 答对' : '❌ 答错'}
              </span>
            </div>
            <p style={{ margin: '0', fontSize: 14 }}>{r.question}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export default ReportPage;

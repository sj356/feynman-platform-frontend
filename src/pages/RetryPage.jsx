// src/pages/RetryPage.jsx
// 错题重做：基于错题记录快照重新作答，答对后自动移出错题本
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';

const TYPE_LABEL = {
  'single-choice': '单项选择',
  'multiple-choice': '多项选择',
  'true-false': '判断对错',
  'short-answer': '简答题',
};

// 判断题答案归一化：兼容 true / "true" / 对 / 正确 / ✅
function normalizeBool(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return ['true', '对', '正确', '✅', 'yes'].includes(s) ? 'true' : 'false';
}

function RetryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const questions = location.state?.records || [];

  const [idx, setIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedMulti, setSelectedMulti] = useState([]);
  const [shortAnswer, setShortAnswer] = useState('');
  const [result, setResult] = useState(null); // { isCorrect, explanation }
  const [grading, setGrading] = useState(false);
  const [summary, setSummary] = useState(null); // { solved, kept }
  const [solvedIds, setSolvedIds] = useState([]);
  const [solvedCount, setSolvedCount] = useState(0);

  // 切换题目时重置作答状态
  useEffect(() => {
    setSelectedOption('');
    setSelectedMulti([]);
    setShortAnswer('');
    setResult(null);
  }, [idx]);

  if (questions.length === 0) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>没有可重做的错题。</p>
        <Link to="/wrong-book">
          <button style={{ padding: '10px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            返回错题本
          </button>
        </Link>
      </div>
    );
  }

  const current = questions[idx];
  const isLast = idx === questions.length - 1;

  const toggleMulti = (key) => {
    setSelectedMulti((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  // 删除已攻克的错题记录（静默失败）
  const removeRecord = async (id) => {
    try {
      await apiClient.delete(`/records/${id}`);
      setSolvedIds((prev) => [...prev, id]);
    } catch (e) {
      console.error('移出错题失败', e);
    }
  };

  const finish = (solvedCount) => {
    setSummary({ solved: solvedCount, kept: questions.length - solvedCount });
  };

  const gradeCurrent = async () => {
    if (result) return; // 已判分
    let correct = false;
    let explanation = current.explanation || '';

    if (current.questionType === 'single-choice') {
      if (!selectedOption) return alert('请选择一个答案！');
      correct = selectedOption === String(current.correctAnswer).trim();
    } else if (current.questionType === 'multiple-choice') {
      if (selectedMulti.length === 0) return alert('请至少选择一个选项！');
      const user = [...selectedMulti].sort().join(',');
      const ans = String(current.correctAnswer || '')
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .sort()
        .join(',');
      correct = user === ans;
    } else if (current.questionType === 'true-false') {
      if (!selectedOption) return alert('请判断对错！');
      correct = normalizeBool(selectedOption) === normalizeBool(current.correctAnswer);
    } else {
      // 简答：交 AI 评分
      if (!shortAnswer.trim()) return alert('请先写下你的回答！');
      setGrading(true);
      try {
        const res = await apiClient.post(
          '/ai/grade-answer',
          {
            question: current.question,
            answerKeyPoints: current.correctAnswer,
            studentAnswer: shortAnswer.trim(),
          },
          { timeout: 30000 }
        );
        correct = res.data.isCorrect;
        explanation = res.data.explanation || explanation;
      } catch (err) {
        console.error('AI 评分失败', err);
        alert('AI 评分失败：' + (err.response?.data?.msg || err.message));
        setGrading(false);
        return;
      } finally {
        setGrading(false);
      }
    }

    setResult({ isCorrect: correct, explanation });
    if (correct) {
      removeRecord(current._id);
      setSolvedCount((c) => c + 1);
    }
  };

  const goNext = () => {
    if (isLast) {
      finish(solvedCount);
    } else {
      setIdx((i) => i + 1);
    }
  };

  // 完成页
  if (summary) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 0', textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, color: '#1f2937', marginBottom: 12 }}>🎉 重做完成</h1>
        <p style={{ fontSize: 16, color: '#374151' }}>
          本次共 {questions.length} 题，攻克 {summary.solved} 题，仍需复习 {summary.kept} 题。
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <Link to="/wrong-book">
            <button style={{ padding: '10px 22px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              返回错题本
            </button>
          </Link>
          <Link to="/">
            <button style={{ padding: '10px 22px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              回主页
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const optionsEntries = Object.entries(current.options || {});

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 26, color: '#1f2937', margin: 0 }}>🔥 错题重做</h1>
        <span style={{ color: '#6b7280', fontSize: 14 }}>第 {idx + 1} / {questions.length} 题</span>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#7c3aed', background: '#f3e8ff', padding: '3px 10px', borderRadius: 6 }}>
            {TYPE_LABEL[current.questionType] || '题目'}
          </span>
          {current.kp?.title && (
            <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>{current.kp.title}</span>
          )}
        </div>

        <p style={{ fontSize: 16, lineHeight: 1.7, margin: '0 0 16px' }}>{current.question}</p>

        {/* 单选 */}
        {current.questionType === 'single-choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {optionsEntries.map(([key, value]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: '12px 14px',
                  border: selectedOption === key ? '1px solid #7c3aed' : '1px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: selectedOption === key ? '#faf5ff' : '#fff',
                }}
              >
                <input type="radio" name="retry-single" checked={selectedOption === key} onChange={() => setSelectedOption(key)} disabled={!!result} />
                <span><strong>{key}.</strong> {value}</span>
              </label>
            ))}
          </div>
        )}

        {/* 多选 */}
        {current.questionType === 'multiple-choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {optionsEntries.map(([key, value]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: '12px 14px',
                  border: selectedMulti.includes(key) ? '1px solid #7c3aed' : '1px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: selectedMulti.includes(key) ? '#faf5ff' : '#fff',
                }}
              >
                <input type="checkbox" checked={selectedMulti.includes(key)} onChange={() => toggleMulti(key)} disabled={!!result} />
                <span><strong>{key}.</strong> {value}</span>
              </label>
            ))}
          </div>
        )}

        {/* 判断对错 */}
        {current.questionType === 'true-false' && (
          <div style={{ display: 'flex', gap: 12 }}>
            {['true', 'false'].map((v) => (
              <button
                key={v}
                onClick={() => setSelectedOption(v)}
                disabled={!!result}
                style={{
                  padding: '12px 28px',
                  borderRadius: 8,
                  border: selectedOption === v ? '1px solid #7c3aed' : '1px solid #e5e7eb',
                  background: selectedOption === v ? '#faf5ff' : '#fff',
                  cursor: 'pointer',
                  fontSize: 15,
                }}
              >
                {v === 'true' ? '✅ 正确' : '❌ 错误'}
              </button>
            ))}
          </div>
        )}

        {/* 简答 */}
        {current.questionType === 'short-answer' && (
          <textarea
            value={shortAnswer}
            onChange={(e) => setShortAnswer(e.target.value)}
            disabled={!!result}
            rows={5}
            placeholder="写下你的回答..."
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15, resize: 'vertical' }}
          />
        )}

        {/* 结果区 */}
        {result && (
          <div
            style={{
              marginTop: 16,
 padding: 16,
              borderRadius: 8,
              background: result.isCorrect ? '#ecfdf5' : '#fef2f2',
              color: result.isCorrect ? '#065f46' : '#991b1b',
            }}
          >
            <strong>{result.isCorrect ? '✅ 回答正确，已移出错题本' : '❌ 回答错误，仍保留在错题本'}</strong>
            {result.explanation && <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>{result.explanation}</p>}
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          {!result && (
            <button
              onClick={gradeCurrent}
              disabled={grading}
              style={{
                padding: '10px 24px',
                background: grading ? '#d1d5db' : '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              {grading ? 'AI 评分中...' : '提交答案'}
            </button>
          )}
          {result && (
            <button
              onClick={goNext}
              style={{
                padding: '10px 24px',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              {isLast ? '查看结果' : '下一题'}
            </button>
          )}
          <button
            onClick={() => navigate('/wrong-book')}
            style={{
              padding: '10px 24px',
              background: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            放弃重做
          </button>
        </div>
      </div>
    </div>
  );
}

export default RetryPage;

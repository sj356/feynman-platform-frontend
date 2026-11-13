// src/pages/QuizPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useReactMediaRecorder } from 'react-media-recorder';

// 题型中文文案
const TYPE_LABEL = {
  'single-choice': '单项选择',
  'multiple-choice': '多项选择',
  'true-false': '判断对错',
  'short-answer': '简答题',
};

// 判断题答案归一化：兼容 true/"true"/"对"/"正确" 等写法
function normalizeBool(v) {
  if (v === true || v === 'true' || v === '对' || v === '正确') return 'true';
  return 'false';
}

function QuizPage() {
  const { id } = useParams(); // 知识点 ID
  const navigate = useNavigate();

  const [knowledgePoint, setKnowledgePoint] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');   // 单选 / 判断
  const [selectedMulti, setSelectedMulti] = useState([]);     // 多选
  const [shortAnswer, setShortAnswer] = useState('');         // 简答输入
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [difficulty, setDifficulty] = useState('基础');
  const [qType, setQType] = useState('single-choice');

  // 1. 加载知识点内容
  useEffect(() => {
    const fetchKp = async () => {
      try {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setKnowledgePoint(res.data);
      } catch (err) {
        console.error('获取知识点失败', err);
        setError('获取知识点失败，请确认后端已启动且已登录');
      }
    };
    fetchKp();
  }, [id]);

  // 2. 请求 AI 出题
  const fetchQuestion = async (level = difficulty, type = qType) => {
    if (!knowledgePoint) return;
    setIsLoading(true);
    setQuestion(null);
    setResult(null);
    setSelectedOption('');
    setSelectedMulti([]);
    setShortAnswer('');
    setError('');
    try {
      const res = await apiClient.post('/ai/generate-question', {
        knowledgePointContent: knowledgePoint.content,
        difficulty: level,
        type,
      });
      setQuestion(res.data);
    } catch (err) {
      console.error('出题失败', err);
      setError('AI 出题失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  // 3a. 答错后加入复习列表
  const markNeedsReview = async () => {
    try {
      await apiClient.put(`/knowledge-points/${id}`, {
        reviewList: true,
        status: knowledgePoint.status,
      });
      setKnowledgePoint((prev) => (prev ? { ...prev, reviewList: true } : prev));
    } catch (err) {
      console.error('更新复习状态失败', err);
    }
  };

  // 3b. 答对后标记为已掌握
  const markMastered = async () => {
    try {
      await apiClient.put(`/knowledge-points/${id}`, {
        reviewList: false,
        status: 'mastered',
      });
      setKnowledgePoint((prev) =>
        prev ? { ...prev, reviewList: false, status: 'mastered' } : prev
      );
    } catch (err) {
      console.error('更新掌握状态失败', err);
    }
  };

  // 4. 语音输入：停止录音 → 转写 → 追加到简答框
  const uploadAudio = async (blobUrl) => {
    setIsTranscribing(true);
    setError('');
    try {
      const audioBlob = await fetch(blobUrl).then((r) => r.blob());
      const audioFile = new File([audioBlob], `quiz-answer-${id}.wav`, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('knowledgePointId', id);
      const res = await apiClient.post('/audio/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const text = res.data.result || '';
      if (text) {
        setShortAnswer((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
      }
    } catch (err) {
      console.error('语音转写失败', err);
      setError('语音转写失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setIsTranscribing(false);
    }
  };

  const { status, startRecording, stopRecording } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl) => uploadAudio(blobUrl),
  });
  const isRecording = status === 'recording';

  // 多选勾选切换
  const toggleMulti = (key) => {
    setSelectedMulti((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // 5. 提交答案
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question) return;

    // 单选：前端比对字符串
    if (question.type === 'single-choice') {
      if (!selectedOption) {
        alert('请选择一个答案！');
        return;
      }
      const correct = selectedOption === question.answer;
      setResult({ isCorrect: correct, explanation: question.explanation });
      correct ? markMastered() : markNeedsReview();
      return;
    }

    // 多选：排序后逐选项比对
    if (question.type === 'multiple-choice') {
      if (selectedMulti.length === 0) {
        alert('请至少选择一个选项！');
        return;
      }
      const ans = Array.isArray(question.answer)
        ? question.answer
        : [question.answer].filter(Boolean);
      const sortedUser = [...selectedMulti].sort().join(',');
      const sortedAns = [...ans].sort().join(',');
      const correct = sortedUser === sortedAns;
      setResult({ isCorrect: correct, explanation: question.explanation });
      correct ? markMastered() : markNeedsReview();
      return;
    }

    // 判断对错：归一化后比对
    if (question.type === 'true-false') {
      if (!selectedOption) {
        alert('请判断对错！');
        return;
      }
      const correct = normalizeBool(selectedOption) === normalizeBool(question.answer);
      setResult({ isCorrect: correct, explanation: question.explanation });
      correct ? markMastered() : markNeedsReview();
      return;
    }

    // 简答：后端 AI 评分
    if (!shortAnswer.trim()) {
      alert('请先写下你的回答！');
      return;
    }
    setIsGrading(true);
    setError('');
    try {
      const res = await apiClient.post(
        '/ai/grade-answer',
        {
          question: question.question,
          answerKeyPoints: question.answer_key_points,
          studentAnswer: shortAnswer.trim(),
        },
        { timeout: 30000 }
      );
      setResult({ isCorrect: res.data.isCorrect, explanation: res.data.explanation });
      res.data.isCorrect ? markMastered() : markNeedsReview();
    } catch (err) {
      console.error('AI 评分失败', err);
      setError('AI 评分失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setIsGrading(false);
    }
  };

  if (!knowledgePoint) {
    return <p style={{ textAlign: 'center', marginTop: 60 }}>加载知识点信息...</p>;
  }

  const btnBase = {
    padding: '8px 18px',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  };

  // 结果区正确答案文案
  const renderCorrectAnswer = () => {
    if (question.type === 'single-choice') {
      return <p><strong>正确答案是：{question.answer}</strong></p>;
    }
    if (question.type === 'multiple-choice') {
      const ans = Array.isArray(question.answer) ? question.answer : [question.answer].filter(Boolean);
      return <p><strong>正确答案是：{ans.join('、')}</strong></p>;
    }
    if (question.type === 'true-false') {
      return <p><strong>正确答案是：{normalizeBool(question.answer) === 'true' ? '✅ 正确' : '❌ 错误'}</strong></p>;
    }
    return null;
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>📝 知识点测评</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>
        当前知识点：<strong style={{ color: '#7c3aed' }}>{knowledgePoint.title}</strong>
      </p>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        }}
      >
        {/* 难度选择 */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>选择难度：</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {['基础', '中等', '困难'].map((lv) => (
              <button
                key={lv}
                onClick={() => setDifficulty(lv)}
                style={{
                  ...btnBase,
                  background: difficulty === lv ? '#7c3aed' : '#e5e7eb',
                  color: difficulty === lv ? '#fff' : '#374151',
                }}
              >
                {lv}
              </button>
            ))}
          </div>

          {/* 题型选择：单选 / 多选 / 判断 / 简答 */}
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>题型：</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { v: 'single-choice', label: '单项选择' },
              { v: 'multiple-choice', label: '多项选择' },
              { v: 'true-false', label: '判断对错' },
              { v: 'short-answer', label: '简答题' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setQType(o.v)}
                style={{
                  ...btnBase,
                  background: qType === o.v ? '#7c3aed' : '#e5e7eb',
                  color: qType === o.v ? '#fff' : '#374151',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchQuestion()}
            style={{ ...btnBase, background: '#2563eb', color: '#fff' }}
          >
            开始出题
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

        {isLoading && <p style={{ color: '#7c3aed' }}>AI 正在出题中...</p>}
        {error && <p style={{ color: '#ef4444' }}>{error}</p>}

        {/* 答题区 */}
        {question && !result && (
          <form onSubmit={handleSubmit}>
            <h3 style={{ fontSize: 17, color: '#1f2937', margin: '0 0 16px' }}>{question.question}</h3>

            {/* 单选 */}
            {question.type === 'single-choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(question.options || {}).map(([key, value]) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      background: '#fafafa',
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 15,
                    }}
                  >
                    <input
                      type="radio"
                      name="option"
                      value={key}
                      checked={selectedOption === key}
                      onChange={(e) => setSelectedOption(e.target.value)}
                    />
                    <span><strong>{key}.</strong> {value}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 多选 */}
            {question.type === 'multiple-choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(question.options || {}).map(([key, value]) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      background: '#fafafa',
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 15,
                    }}
                  >
                    <input
                      type="checkbox"
                      name="option"
                      value={key}
                      checked={selectedMulti.includes(key)}
                      onChange={() => toggleMulti(key)}
                    />
                    <span><strong>{key}.</strong> {value}</span>
                  </label>
                ))}
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>（本题为多选题，可勾选多个选项）</p>
              </div>
            )}

            {/* 判断对错 */}
            {question.type === 'true-false' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { v: 'true', label: '✅ 正确' },
                  { v: 'false', label: '❌ 错误' },
                ].map((o) => (
                  <label
                    key={o.v}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      background: '#fafafa',
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 15,
                    }}
                  >
                    <input
                      type="radio"
                      name="tf"
                      value={o.v}
                      checked={selectedOption === o.v}
                      onChange={(e) => setSelectedOption(e.target.value)}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 简答 + 语音 */}
            {question.type === 'short-answer' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    style={{
                      ...btnBase,
                      background: isRecording ? '#ef4444' : '#2563eb',
                      color: '#fff',
                    }}
                  >
                    {isRecording ? '⏹ 停止录音' : '🎤 语音输入'}
                  </button>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>
                    {isRecording
                      ? '● 正在录音，说完点停止...'
                      : isTranscribing
                      ? '语音转写中...'
                      : '可录音口述，文字会自动填入下方框'}
                  </span>
                </div>
                <textarea
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  placeholder="用你自己的话写下回答，也可以点上方语音输入口述..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 15,
                    lineHeight: 1.7,
                    resize: 'vertical',
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isGrading}
              style={{
                ...btnBase,
                marginTop: 16,
                background: isGrading ? '#d1d5db' : '#10b981',
                color: '#fff',
              }}
            >
              {isGrading ? 'AI 批阅中...' : '提交答案'}
            </button>
          </form>
        )}

        {/* 结果区 */}
        {result && (
          <div style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>测评结果</h2>
            <p
              style={{
                color: result.isCorrect ? '#10b981' : '#ef4444',
                fontWeight: 'bold',
                fontSize: 16,
              }}
            >
              {result.isCorrect ? '✅ 回答正确！' : '❌ 回答错误！'}
            </p>

            {renderCorrectAnswer()}

            {question.type === 'short-answer' && (
              <div style={{ marginBottom: 10 }}>
                <strong>答案要点：</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                  {(question.answer_key_points || []).map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            <p><strong>解释：</strong>{result.explanation}</p>

            {result.isCorrect && (
              <p style={{ color: '#10b981' }}>该知识点已标记为掌握。</p>
            )}
            {!result.isCorrect && (
              <p style={{ color: '#f59e0b' }}>该知识点已加入你的复习列表。</p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => fetchQuestion()}
                style={{ ...btnBase, background: '#7c3aed', color: '#fff' }}
              >
                再来一题
              </button>
              <button
                onClick={() => navigate('/')}
                style={{ ...btnBase, background: '#e5e7eb', color: '#374151' }}
              >
                返回主页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizPage;

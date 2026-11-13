// src/pages/ExamPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useReactMediaRecorder } from 'react-media-recorder';

// 随机打乱数组
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// 判断题答案归一化：兼容 true/"true"/"对"/"正确" 等写法
function normalizeBool(v) {
  if (v === true || v === 'true' || v === '对' || v === '正确') return 'true';
  return 'false';
}

// 题型中文文案
const TYPE_LABEL = {
  'single-choice': '单项选择',
  'multiple-choice': '多项选择',
  'true-false': '判断对错',
  'short-answer': '简答题',
};

function ExamPage() {
  const navigate = useNavigate();

  // 知识点列表
  const [kps, setKps] = useState([]);
  // 已勾选要测评的知识点 ID（默认全选）
  const [selectedKpIds, setSelectedKpIds] = useState([]);
  // 阶段：setup 配置 → generating 生成中 → answering 答题中 → result 结果总览
  const [phase, setPhase] = useState('setup');

  // 配置项：四种题型各自数量，自由搭配
  const [countSingle, setCountSingle] = useState(2);
  const [countMultiple, setCountMultiple] = useState(1);
  const [countTf, setCountTf] = useState(1);
  const [countShort, setCountShort] = useState(2);
  const [difficulty, setDifficulty] = useState('基础');

  // 试卷与答题状态
  const [questions, setQuestions] = useState([]); // [{ kp, type, question }]
  const [currentIndex, setCurrentIndex] = useState(0);
  // 每题暂存的作答：[{ selectedOption, selectedMulti, shortAnswer }]
  const [answers, setAnswers] = useState([]);
  // 当前题正在编辑的作答
  const [selectedOption, setSelectedOption] = useState('');   // 单选 / 判断
  const [selectedMulti, setSelectedMulti] = useState([]);     // 多选
  const [shortAnswer, setShortAnswer] = useState('');         // 简答
  const [results, setResults] = useState([]);

  const [isGrading, setIsGrading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [error, setError] = useState('');

  // 1. 拉取全部知识点
  useEffect(() => {
    const fetchKps = async () => {
      try {
        const res = await apiClient.get('/knowledge-points');
        setKps(res.data);
        setSelectedKpIds(res.data.map((k) => k._id));
      } catch (err) {
        console.error('获取知识点失败', err);
        setError('获取知识点失败，请确认后端已启动且已登录');
      }
    };
    fetchKps();
  }, []);

  // 2. 语音输入：停止录音 → 上传转写 → 追加到简答框
  const uploadAudio = async (blobUrl) => {
    setIsTranscribing(true);
    setError('');
    try {
      const audioBlob = await fetch(blobUrl).then((r) => r.blob());
      const audioFile = new File([audioBlob], 'exam-answer.wav', { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioFile);
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

  // 把当前题的作答保存到 answers[currentIndex]
  const saveCurrent = () => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = {
        selectedOption,
        selectedMulti,
        shortAnswer,
      };
      return next;
    });
  };

  // 跳到指定题：先保存当前题，再恢复目标题的作答
  const goTo = (index) => {
    saveCurrent();
    const ans = answers[index] || { selectedOption: '', selectedMulti: [], shortAnswer: '' };
    setSelectedOption(ans.selectedOption);
    setSelectedMulti(ans.selectedMulti);
    setShortAnswer(ans.shortAnswer);
    setCurrentIndex(index);
  };

  // 3. 组卷：按各题型数量拼类型 → 抽知识点 → 逐题 AI 出题
  const buildExam = async () => {
    if (kps.length === 0) {
      alert('你还没有知识点，请先新建知识点再测评');
      return;
    }
    const nSingle = Number(countSingle) || 0;
    const nMultiple = Number(countMultiple) || 0;
    const nTf = Number(countTf) || 0;
    const nShort = Number(countShort) || 0;
    const total = nSingle + nMultiple + nTf + nShort;

    if (total < 1) {
      alert('请至少为一种题型填写大于 0 的数量');
      return;
    }
    const chosenKps = kps.filter((kp) => selectedKpIds.includes(kp._id));
    if (chosenKps.length === 0) {
      alert('请至少勾选一个要测评的知识点');
      return;
    }
    if (total > chosenKps.length) {
      alert(`总题量（${total}）不能超过已选知识点数量（${chosenKps.length}）`);
      return;
    }

    setPhase('generating');
    setError('');
    setGenProgress(0);

    // 拼出每道题的类型，再打乱顺序
    const types = shuffle([
      ...Array(nSingle).fill('single-choice'),
      ...Array(nMultiple).fill('multiple-choice'),
      ...Array(nTf).fill('true-false'),
      ...Array(nShort).fill('short-answer'),
    ]);

    const picked = shuffle(chosenKps).slice(0, total);
    const list = [];

    try {
      for (let i = 0; i < picked.length; i++) {
        const kp = picked[i];
        const t = types[i];
        const res = await apiClient.post('/ai/generate-question', {
          knowledgePointContent: kp.content,
          difficulty,
          type: t,
        });
        list.push({ kp, type: t, question: res.data });
        setGenProgress(i + 1);
      }
      setQuestions(list);
      setResults([]);
      setCurrentIndex(0);
      setSelectedOption('');
      setSelectedMulti([]);
      setShortAnswer('');
      // 初始化每题空作答
      setAnswers(list.map(() => ({ selectedOption: '', selectedMulti: [], shortAnswer: '' })));
      setPhase('answering');
    } catch (err) {
      console.error('组卷失败', err);
      setError('出题失败：' + (err.response?.data?.msg || err.message));
      setPhase('setup');
    }
  };

  // 4. 交卷后统一同步后端：答对→已掌握，答错→加入复习
  const syncReviewStatus = async (finalResults) => {
    for (const r of finalResults) {
      try {
        await apiClient.put(`/knowledge-points/${r.kpId}`, r.isCorrect
          ? { reviewList: false, status: 'mastered' }
          : { reviewList: true, status: 'not_started' });
      } catch (e) {
        console.error('更新知识点状态失败', e);
      }
    }
  };

  // 5. 统一提交：校验作答 → 逐题判分（选择/判断前端比对，简答 AI 评分）→ 汇总结果
  const handleSubmit = async () => {
    // 先把当前题作答落盘，再并入最终答案
    saveCurrent();
    const finalAnswers = answers.map((a, i) =>
      i === currentIndex
        ? { selectedOption, selectedMulti, shortAnswer }
        : a
    );

    // 校验是否有未作答的题
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      const a = finalAnswers[i];
      let missing = false;
      if (item.type === 'single-choice' && !a.selectedOption) missing = true;
      else if (item.type === 'multiple-choice' && a.selectedMulti.length === 0) missing = true;
      else if (item.type === 'true-false' && !a.selectedOption) missing = true;
      else if (item.type === 'short-answer' && !a.shortAnswer.trim()) missing = true;

      if (missing) {
        alert(`第 ${i + 1} 题还未作答，请先完成`);
        // 跳到未作答的题并恢复其作答
        setCurrentIndex(i);
        setSelectedOption(a.selectedOption);
        setSelectedMulti(a.selectedMulti);
        setShortAnswer(a.shortAnswer);
        return;
      }
    }

    setIsGrading(true);
    setError('');
    const newResults = [];

    try {
      for (let i = 0; i < questions.length; i++) {
        const item = questions[i];
        const a = finalAnswers[i];
        let r;

        if (item.type === 'single-choice') {
          const correct = a.selectedOption === item.question.answer;
          r = {
            isCorrect: correct,
            explanation: item.question.explanation,
            userAnswer: `${a.selectedOption}. ${item.question.options?.[a.selectedOption] || ''}`,
          };
        } else if (item.type === 'multiple-choice') {
          const ans = Array.isArray(item.question.answer)
            ? item.question.answer
            : [item.question.answer].filter(Boolean);
          const sortedUser = [...a.selectedMulti].sort().join(',');
          const sortedAns = [...ans].sort().join(',');
          const correct = sortedUser === sortedAns;
          r = {
            isCorrect: correct,
            explanation: item.question.explanation,
            userAnswer: [...a.selectedMulti].sort().join(', '),
          };
        } else if (item.type === 'true-false') {
          const correct = normalizeBool(a.selectedOption) === normalizeBool(item.question.answer);
          r = {
            isCorrect: correct,
            explanation: item.question.explanation,
            userAnswer: normalizeBool(a.selectedOption) === 'true' ? '✅ 正确' : '❌ 错误',
          };
        } else {
          // 简答：后端 AI 评分
          const res = await apiClient.post(
            '/ai/grade-answer',
            {
              question: item.question.question,
              answerKeyPoints: item.question.answer_key_points,
              studentAnswer: a.shortAnswer.trim(),
            },
            { timeout: 30000 }
          );
          r = {
            isCorrect: res.data.isCorrect,
            explanation: res.data.explanation,
            userAnswer: a.shortAnswer.trim(),
          };
        }

        newResults.push({
          kpId: item.kp._id,
          kpTitle: item.kp.title,
          type: item.type,
          isCorrect: r.isCorrect,
          explanation: r.explanation,
          userAnswer: r.userAnswer,
          questionText: item.question.question,
        });
      }

      await syncReviewStatus(newResults);
      setResults(newResults);
      setPhase('result');
    } catch (err) {
      console.error('提交评分失败', err);
      setError('提交失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setIsGrading(false);
    }
  };

  const restart = () => {
    setPhase('setup');
    setQuestions([]);
    setAnswers([]);
    setResults([]);
    setCurrentIndex(0);
    setSelectedOption('');
    setSelectedMulti([]);
    setShortAnswer('');
    setError('');
  };

  const btnBase = {
    padding: '8px 18px',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  };

  const totalCount =
    (Number(countSingle) || 0) +
    (Number(countMultiple) || 0) +
    (Number(countTf) || 0) +
    (Number(countShort) || 0);

  // ---------- 阶段一：配置 ----------
  if (phase === 'setup') {
    const countInputStyle = {
      width: 90,
      padding: '8px 12px',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      fontSize: 15,
    };

    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
        <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>📋 综合测评</h1>
        <p style={{ color: '#6b7280', margin: '0 0 24px' }}>
          自由选择题型、数量与测评知识点，从中随机抽题组卷
        </p>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          {/* 各题型数量 */}
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>选择题型与数量：</p>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              单项选择
              <input
                type="number"
                min={0}
                max={selectedKpIds.length || 1}
                value={countSingle}
                onChange={(e) => setCountSingle(e.target.value)}
                style={countInputStyle}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              多项选择
              <input
                type="number"
                min={0}
                max={selectedKpIds.length || 1}
                value={countMultiple}
                onChange={(e) => setCountMultiple(e.target.value)}
                style={countInputStyle}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              判断对错
              <input
                type="number"
                min={0}
                max={selectedKpIds.length || 1}
                value={countTf}
                onChange={(e) => setCountTf(e.target.value)}
                style={countInputStyle}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              简答题
              <input
                type="number"
                min={0}
                max={selectedKpIds.length || 1}
                value={countShort}
                onChange={(e) => setCountShort(e.target.value)}
                style={countInputStyle}
              />
            </label>
          </div>

          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>选择难度：</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
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

          {/* 选择测评知识点 */}
          <p style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>选择测评知识点：</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setSelectedKpIds(kps.map((k) => k._id))}
              style={{ ...btnBase, background: '#e5e7eb', color: '#374151' }}
            >
              全选
            </button>
            <button
              type="button"
              onClick={() => setSelectedKpIds([])}
              style={{ ...btnBase, background: '#e5e7eb', color: '#374151' }}
            >
              清空
            </button>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, padding: '4px 2px' }}>
            {kps.map((kp) => (
              <label
                key={kp._id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  background: '#fafafa',
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedKpIds.includes(kp._id)}
                  onChange={() => {
                    setSelectedKpIds((prev) =>
                      prev.includes(kp._id)
                        ? prev.filter((id) => id !== kp._id)
                        : [...prev, kp._id]
                    );
                  }}
                />
                <span>{kp.title}</span>
              </label>
            ))}
          </div>

          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 16px' }}>
            本次共 {totalCount} 题 ｜ 已选 {selectedKpIds.length} / {kps.length} 个知识点
          </p>

          {error && <p style={{ color: '#ef4444' }}>{error}</p>}

          <div>
            <button
              onClick={buildExam}
              style={{ ...btnBase, background: '#2563eb', color: '#fff', padding: '10px 24px' }}
            >
              开始组卷
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 阶段二：生成中 ----------
  if (phase === 'generating') {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 18, color: '#7c3aed' }}>AI 正在组卷中...</p>
          <p style={{ color: '#6b7280' }}>第 {genProgress} / {questions.length || totalCount} 题</p>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];

  // ---------- 阶段三：答题中 ----------
  if (phase === 'answering' && current) {
    const isMulti = current.type === 'multiple-choice';
    const isTf = current.type === 'true-false';
    const isShort = current.type === 'short-answer';
    const isLast = currentIndex + 1 === questions.length;

    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, color: '#1f2937', margin: 0 }}>📋 综合测评</h1>
          <span style={{ color: '#6b7280', fontSize: 14 }}>第 {currentIndex + 1} / {questions.length} 题</span>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 12px' }}>
            来源知识点：{current.kp.title} ｜ 题型：{TYPE_LABEL[current.type]}
          </p>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <h3 style={{ fontSize: 17, color: '#1f2937', margin: '0 0 16px' }}>{current.question.question}</h3>

            {/* 判断对错 */}
            {isTf ? (
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
            ) : !isShort ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(current.question.options || {}).map(([key, value]) => (
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
                      type={isMulti ? 'checkbox' : 'radio'}
                      name="option"
                      value={key}
                      checked={isMulti ? selectedMulti.includes(key) : selectedOption === key}
                      onChange={() => {
                        if (isMulti) toggleMulti(key);
                        else setSelectedOption(key);
                      }}
                    />
                    <span><strong>{key}.</strong> {value}</span>
                  </label>
                ))}
                {isMulti && (
                  <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>（本题为多选题，可勾选多个选项）</p>
                )}
              </div>
            ) : (
              <div>
                {/* 语音输入工具条 */}
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
                    {isRecording ? '● 正在录音，说完点停止...' : isTranscribing ? '语音转写中...' : '可录音口述，文字自动填入下方框'}
                  </span>
                </div>
                <textarea
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  placeholder="用你自己的话写下回答..."
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

            {error && <p style={{ color: '#ef4444', marginTop: 12 }}>{error}</p>}

            {/* 底部导航：上一题 / 下一题（或提交） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
              <div>
                {currentIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => goTo(currentIndex - 1)}
                    style={{ ...btnBase, background: '#e5e7eb', color: '#374151' }}
                  >
                    上一题
                  </button>
                )}
              </div>
              <div>
                {!isLast ? (
                  <button
                    type="button"
                    onClick={() => goTo(currentIndex + 1)}
                    style={{ ...btnBase, background: '#10b981', color: '#fff' }}
                  >
                    下一题
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isGrading}
                    style={{
                      ...btnBase,
                      background: isGrading ? '#d1d5db' : '#10b981',
                      color: '#fff',
                    }}
                  >
                    {isGrading ? 'AI 批阅中...' : '提交并查看结果'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ---------- 阶段四：结果总览 ----------
  const correctCount = results.filter((r) => r.isCorrect).length;
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>📊 测评结果</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>
        答对 <strong style={{ color: '#10b981' }}>{correctCount}</strong> / {results.length} 题
      </p>

      {results.map((r, i) => (
        <div
          key={i}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            borderLeft: `4px solid ${r.isCorrect ? '#10b981' : '#ef4444'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 15, color: '#1f2937' }}>
              第 {i + 1} 题（{TYPE_LABEL[r.type]} · {r.kpTitle}）
            </strong>
            <span style={{ color: r.isCorrect ? '#10b981' : '#ef4444', fontWeight: 600 }}>
              {r.isCorrect ? '✅ 正确' : '❌ 错误'}
            </span>
          </div>
          <p style={{ margin: '10px 0 6px', fontSize: 14 }}>{r.questionText}</p>
          <p style={{ margin: '0 0 6px', fontSize: 14, color: '#374151' }}>
            <strong>你的回答：</strong>{r.userAnswer}
          </p>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            <strong>解析：</strong>{r.explanation}
          </p>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={restart} style={{ ...btnBase, background: '#7c3aed', color: '#fff' }}>
          再测一次
        </button>
        <button onClick={() => navigate('/')} style={{ ...btnBase, background: '#e5e7eb', color: '#374151' }}>
          返回主页
        </button>
      </div>
    </div>
  );
}

export default ExamPage;

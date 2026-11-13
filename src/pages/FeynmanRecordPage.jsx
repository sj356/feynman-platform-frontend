// src/pages/FeynmanRecordPage.jsx
import { useReactMediaRecorder } from 'react-media-recorder';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';

function FeynmanRecordPage() {
  const { id } = useParams();
  const [kpTitle, setKpTitle] = useState('');
  const [kpContent, setKpContent] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState('');

   // 👇 先定义评价函数（uploadAudio 里要调用它，必须放在前面）
  const getAiEvaluation = async (transcribed) => {
    setIsEvaluating(true);
    setAiFeedback(null);
    try {
      const feedbackRes = await apiClient.post(
        '/audio/evaluate',
        {
          originalContent: kpContent,
          transcribedText: transcribed,
        },
        { timeout: 30000 } // 大模型回复较慢，单独放宽超时
      );
      const feedback = feedbackRes.data;
      setAiFeedback(feedback);

      // 写入复述学习记录（失败静默，不阻断主流程）
      try {
        await apiClient.post('/records', {
          kp: id,
          source: 'feynman',
          questionType: 'feynman',
          question: kpContent,
          userAnswer: transcribed,
          score: feedback.score != null ? Number(feedback.score) : null,
          explanation: feedback.evaluation || '',
          feedback: {
            polishedText: feedback.polishedText,
            evaluation: feedback.evaluation,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
          },
        });
      } catch (e) {
        console.error('写入复述记录失败', e);
      }

      // 评价后更新状态：及格(≥60)标记为已掌握并移出复习；不及格(<60)加入复习列表
      if (feedback.score != null) {
        const passed = Number(feedback.score) >= 60;
        await apiClient.put(`/knowledge-points/${id}`, {
          reviewList: !passed,
          status: passed ? 'mastered' : 'not_started',
        });
      }
    } catch (err) {
      console.error('获取AI评价失败', err);
      setError('AI 评价失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setIsEvaluating(false);
    }
  };


  // 录音 Hook：停止时自动上传
  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl) => {
      uploadAudio(blobUrl);
    },
  });

  // 进页面时拉知识点标题和原文（评价要用原文做对照）
  useEffect(() => {
    const fetchKp = async () => {
      try {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setKpTitle(res.data.title);
        setKpContent(res.data.content);
      } catch (err) {
        console.error('获取知识点失败', err);
      }
    };
    fetchKp();
  }, [id]);

  // 上传音频 → 转录 → 自动触发 AI 评价
  const uploadAudio = async (blobUrl) => {
    setIsUploading(true);
    setTranscribedText('');
    setAiFeedback(null);
    setError('');
    try {
      const audioBlob = await fetch(blobUrl).then((r) => r.blob());
      const audioFile = new File([audioBlob], `feynman-record-${id}.wav`, { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('knowledgePointId', id);

      const res = await apiClient.post('/audio/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const text = res.data.result || '';
      setTranscribedText(text);

      // 转录出文字后自动调大模型评价
      if (text) {
        getAiEvaluation(text);
      }
    } catch (err) {
      console.error('上传或转录失败', err);
      setError('转录失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const isRecording = status === 'recording';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>🎤 费曼复述</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>
        当前知识点：<strong style={{ color: '#7c3aed' }}>{kpTitle || '加载中...'}</strong>
      </p>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        }}
      >
        <p style={{ margin: '0 0 16px', fontSize: 15 }}>
          录音状态：
          <span style={{ color: isRecording ? '#ef4444' : '#6b7280', fontWeight: 600 }}>
            {isRecording ? '● 正在录音...' : '○ 待机'}
          </span>
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            onClick={startRecording}
            disabled={isRecording}
            style={{
              padding: '10px 24px',
              background: isRecording ? '#d1d5db' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: isRecording ? 'not-allowed' : 'pointer',
            }}
          >
            开始录音
          </button>
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            style={{
              padding: '10px 24px',
              background: !isRecording ? '#d1d5db' : '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: !isRecording ? 'not-allowed' : 'pointer',
            }}
          >
            停止录音
          </button>
        </div>

        {mediaBlobUrl && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: 14 }}>本地回放：</p>
            <audio src={mediaBlobUrl} controls style={{ width: '100%' }} />
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

        {/* 转录结果 */}
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#1f2937' }}>🤖 语音转录结果</h3>
        {isUploading && <p style={{ color: '#7c3aed' }}>正在上传并转录，请稍候...</p>}
        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            minHeight: 80,
            background: '#fafafa',
            fontSize: 15,
            lineHeight: 1.7,
            color: transcribedText ? '#1f2937' : '#9ca3af',
          }}
        >
          {transcribedText || '转录后的文字会显示在这里...'}
        </div>

        {/* AI 教练反馈 */}
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#1f2937' }}>🧑‍🏫 AI 教练反馈</h3>

        {isEvaluating && <p style={{ color: '#7c3aed' }}>AI 教练正在批阅你的答卷...</p>}

        {aiFeedback && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* 左侧：润色 + 评价 + 优缺点 */}
            <div style={{ flex: 1, minWidth: 320 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#1f2937' }}>✍️ 润色后的文本</h4>
              <p style={{ background: '#eef2ff', padding: 12, borderRadius: 8, fontSize: 14, lineHeight: 1.7, margin: '0 0 16px' }}>
                {aiFeedback.polishedText}
              </p>

              <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#1f2937' }}>📝 综合评价</h4>
              <p style={{ fontSize: 14, lineHeight: 1.7, margin: '0 0 16px' }}>{aiFeedback.evaluation}</p>

              <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#10b981' }}>👍 优点</h4>
              <ul style={{ fontSize: 14, margin: '0 0 16px', paddingLeft: 20 }}>
                {(aiFeedback.strengths || []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>

              <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#ef4444' }}>👇 待改进</h4>
              <ul style={{ fontSize: 14, margin: 0, paddingLeft: 20 }}>
                {(aiFeedback.weaknesses || []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            {/* 右侧：分数 */}
            <div style={{ flex: '0 0 150px', textAlign: 'center', alignSelf: 'flex-start' }}>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 8px' }}>综合得分</p>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color:
                    Number(aiFeedback.score) >= 80
                      ? '#10b981'
                      : Number(aiFeedback.score) >= 60
                      ? '#f59e0b'
                      : '#ef4444',
                }}
              >
                {aiFeedback.score}
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '8px 0 0' }}>满分 100</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeynmanRecordPage;

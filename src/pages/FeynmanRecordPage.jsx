// src/pages/FeynmanRecordPage.jsx
import { useReactMediaRecorder } from 'react-media-recorder';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../api/axios';

function FeynmanRecordPage() {
  const { id } = useParams();
  const [kpTitle, setKpTitle] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // 录音 Hook：停止时自动触发 onStop → 上传音频
  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl) => {
      uploadAudio(blobUrl);
    },
  });

  // 进页面时拉一下知识点标题
  useEffect(() => {
    const fetchKpTitle = async () => {
      try {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setKpTitle(res.data.title);
      } catch (err) {
        console.error('获取知识点失败', err);
      }
    };
    fetchKpTitle();
  }, [id]);

  // 上传音频到后端，后端再调百度
  const uploadAudio = async (blobUrl) => {
    setIsUploading(true);
    setTranscribedText('');
    setError('');
    try {
      const audioBlob = await fetch(blobUrl).then((r) => r.blob());
      const audioFile = new File([audioBlob], `feynman-record-${id}.wav`, { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('audio', audioFile);           // 字段名要和后端 multer 的 'audio' 一致
      formData.append('knowledgePointId', id);

      const res = await apiClient.post('/audio/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTranscribedText(res.data.result);
    } catch (err) {
      console.error('上传或转录失败', err);
      setError('转录失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const isRecording = status === 'recording';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 0' }}>
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

        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#1f2937' }}>🤖 AI 转录结果</h3>
        {isUploading && <p style={{ color: '#7c3aed' }}>正在上传并转录，请稍候...</p>}
        {error && <p style={{ color: '#ef4444' }}>{error}</p>}
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            minHeight: 120,
            background: '#fafafa',
            fontSize: 15,
            lineHeight: 1.7,
            color: transcribedText ? '#1f2937' : '#9ca3af',
          }}
        >
          {transcribedText || '转录后的文字会显示在这里...'}
        </div>
      </div>
    </div>
  );
}

export default FeynmanRecordPage;

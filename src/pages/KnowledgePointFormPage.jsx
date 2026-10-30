// src/pages/KnowledgePointFormPage.jsx
// 新建 / 编辑知识点表单页（复用同一组件，根据 URL 是否带 id 自动切换模式）
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useReactMediaRecorder } from 'react-media-recorder';

// 实时预览用的 Markdown 渲染
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// 👇 新增：富文本编辑器
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';

function KnowledgePointFormPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeMsg, setTranscribeMsg] = useState('');

  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // ===== 录音 Hook：停止后自动上传并转录，结果追加到 content =====
  const { status, startRecording, stopRecording } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl) => {
      handleTranscribe(blobUrl);
    },
  });
  const isRecording = status === 'recording';

  const handleTranscribe = async (blobUrl) => {
    setIsTranscribing(true);
    setTranscribeMsg('正在识别语音...');
    try {
      const audioBlob = await fetch(blobUrl).then((r) => r.blob());
      const audioFile = new File([audioBlob], 'feynman-record.wav', { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioFile);

      const res = await apiClient.post('/audio/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const recognized = res.data.result || '';
      if (recognized) {
        setContent((prev) => (prev ? prev + '\n' + recognized : recognized));
        setTranscribeMsg(`✅ 已追加："${recognized}"`);
      } else {
        setTranscribeMsg('识别结果为空，请对着麦大声说清楚一点');
      }
    } catch (err) {
      console.error('语音识别失败', err);
      setTranscribeMsg('识别失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setIsTranscribing(false);
    }
  };

  // ===== 编辑模式回填 =====
  useEffect(() => {
    if (!isEditing) return;
    const fetchKp = async () => {
      try {
        const res = await apiClient.get(`/knowledge-points/${id}`);
        setTitle(res.data.title);
        setContent(res.data.content);
      } catch (err) {
        console.error('拉取知识点失败', err);
        alert('未找到该知识点或无权访问');
        navigate('/');
      }
    };
    fetchKp();
  }, [id, isEditing, navigate]);

  // ===== 提交 =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('标题和内容都不能为空');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { title: title.trim(), content };
      if (isEditing) {
        await apiClient.put(`/knowledge-points/${id}`, payload);
      } else {
        await apiClient.post('/knowledge-points', payload);
      }
      navigate('/');
    } catch (err) {
      console.error('保存失败', err);
      alert('保存失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 24, margin: '0 0 20px', color: '#1f2937' }}>
        {isEditing ? '编辑知识点' : '新建知识点'}
      </h1>

      <form onSubmit={handleSubmit}>
        {/* 标题输入 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>
            标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：React useEffect 详解"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* ===== 语音输入区 ===== */}
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            background: '#f9fafb',
            border: '1px dashed #d1d5db',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: '#374151' }}>🎙️ 语音输入：</span>
            <button
              type="button"
              onClick={startRecording}
              disabled={isRecording || isTranscribing}
              style={{
                padding: '6px 16px',
                background: isRecording ? '#d1d5db' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                cursor: isRecording || isTranscribing ? 'not-allowed' : 'pointer',
              }}
            >
              {isRecording ? '● 录音中...' : '开始录音'}
            </button>
            <button
              type="button"
              onClick={stopRecording}
              disabled={!isRecording || isTranscribing}
              style={{
                padding: '6px 16px',
                background: !isRecording ? '#d1d5db' : '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                cursor: !isRecording ? 'not-allowed' : 'pointer',
              }}
            >
              停止并识别
            </button>
            {isTranscribing && <span style={{ color: '#7c3aed', fontSize: 13 }}>识别中...</span>}
            {transcribeMsg && !isTranscribing && (
              <span style={{ color: '#6b7280', fontSize: 13 }}>{transcribeMsg}</span>
            )}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9ca3af' }}>
            录完点"停止并识别"，识别出的文字会自动追加到下方编辑器，可继续编辑
          </p>
        </div>

        {/* 内容：左右两栏 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>
              内容（点上方工具栏可加粗、加标题、插表格等）
            </label>
            {/* 👇 左边：把原来的 textarea 换成带工具栏的 MDEditor 富文本编辑器 */}
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || '')}
              height={480}
              preview="edit"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#374151' }}>
              实时预览
            </label>
            <div
              style={{
                height: 480,
                overflowY: 'auto',
                padding: 12,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#fafafa',
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {content}
                </ReactMarkdown>
              ) : (
                <span style={{ color: '#9ca3af' }}>预览区域...</span>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 28px',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? '保存中...' : isEditing ? '更新' : '创建'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              padding: '10px 28px',
              background: '#fff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

export default KnowledgePointFormPage;

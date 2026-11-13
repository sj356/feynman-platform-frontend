// src/pages/AiNotePage.jsx
// AI 生成学习笔记：选知识点 -> AI 整理成结构化 Markdown 笔记 -> 复制 / 保存为新知识点
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import DOMPurify from 'dompurify';

function AiNotePage() {
  const navigate = useNavigate();
  const [kps, setKps] = useState([]);
  const [kpId, setKpId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchKps = async () => {
      try {
        const res = await apiClient.get('/knowledge-points');
        setKps(res.data);
      } catch (err) {
        console.error('获取知识点失败', err);
        setError('获取知识点失败，请确认后端已启动且已登录');
      }
    };
    fetchKps();
  }, []);

  const currentKp = kps.find((k) => k._id === kpId) || null;

  const handleGenerate = async () => {
    if (!currentKp) {
      alert('请先选择一个知识点');
      return;
    }
    setLoading(true);
    setError('');
    setNote('');
    setCopied(false);
    try {
      const res = await apiClient.post(
        '/ai/note',
        { title: currentKp.title, content: currentKp.content },
        { timeout: 30000 }
      );
      setNote(res.data.note || '（AI 未返回内容）');
    } catch (err) {
      console.error('生成笔记失败', err);
      setError('生成笔记失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败', err);
      alert('复制失败，请手动选择文本复制');
    }
  };

  const handleSave = async () => {
    if (!note || !currentKp) return;
    setSaving(true);
    try {
      await apiClient.post('/knowledge-points', {
        title: `${currentKp.title}（AI 笔记）`,
        content: note,
      });
      alert('笔记已保存为新知识点！');
      navigate('/');
    } catch (err) {
      console.error('保存笔记失败', err);
      alert('保存失败：' + (err.response?.data?.msg || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 26, color: '#1f2937', margin: '0 0 6px' }}>📝 AI 学习笔记</h1>
      <p style={{ color: '#6b7280', margin: '0 0 20px' }}>
        选择一个知识点，让 AI 帮你整理成结构化复习笔记
      </p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={kpId}
            onChange={(e) => { setKpId(e.target.value); setNote(''); }}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              fontSize: 15,
              maxWidth: 420,
            }}
          >
            <option value="">-- 请选择知识点 --</option>
            {kps.map((kp) => (
              <option key={kp._id} value={kp._id}>{kp.title}</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={!currentKp || loading}
            style={{
              padding: '10px 22px',
              background: !currentKp || loading ? '#d1d5db' : '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {loading ? '生成中...' : '✨ 生成笔记'}
          </button>
        </div>

        {error && <p style={{ color: '#ef4444', marginTop: 12 }}>{error}</p>}

        {note && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <button
                onClick={handleCopy}
                style={{
                  padding: '8px 18px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {copied ? '✅ 已复制' : '📋 复制笔记'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 18px',
                  background: saving ? '#d1d5db' : '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {saving ? '保存中...' : '💾 保存为新知识点'}
              </button>
            </div>

            <div
              className="markdown-body"
              style={{
                background: '#fafafa',
                padding: '18px 20px',
                borderRadius: 8,
                fontSize: 15,
                lineHeight: 1.8,
                color: '#1f2937',
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {DOMPurify.sanitize(note)}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AiNotePage;

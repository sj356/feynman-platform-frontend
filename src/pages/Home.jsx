// src/pages/Home.jsx
// 知识点列表页（Dashboard）：展示当前用户所有知识点，支持增删改 + Markdown 渲染
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ===== Markdown 渲染相关 =====
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

// ===== 数学公式 KaTeX =====
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// ===== Mermaid 流程图 =====
import mermaid from 'mermaid';

// ---------- Mermaid 单独组件 ----------
function MermaidBlock({ chart }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let cancelled = false;
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
    const id = `mmd-${Math.random().toString(36).slice(2)}`;
    mermaid
      .render(id, chart)
      .then(({ svg }) => { if (!cancelled) setSvg(svg); })
      .catch((e) => console.error('Mermaid 渲染失败:', e));
    return () => { cancelled = true; };
  }, [chart]);
  return <div dangerouslySetInnerHTML={{ __html: svg }} style={{ background: '#fff', padding: 12, borderRadius: 8 }} />;
}

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredId, setHoveredId] = useState(null);

  // ===== 1. 拉取知识点列表 =====
  useEffect(() => {
    const fetchKps = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/knowledge-points');
        setKnowledgePoints(res.data);
      } catch (err) {
        console.error(err);
        setError('获取知识点失败，请确认后端已启动且已登录');
      } finally {
        setLoading(false);
      }
    };
    fetchKps();
  }, []);

  // ===== 2. 删除知识点 =====
  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个知识点吗？此操作不可恢复。')) return;
    try {
      await apiClient.delete(`/knowledge-points/${id}`);
      setKnowledgePoints((prev) => prev.filter((kp) => kp._id !== id));
    } catch (err) {
      console.error('删除失败', err);
      alert('删除失败：' + (err.response?.data?.msg || err.message));
    }
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: 60 }}>加载中...</p>;
  if (error) return <p style={{ color: 'red', textAlign: 'center', marginTop: 60 }}>{error}</p>;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 28, margin: '0 0 6px', color: '#1f2937' }}>我的知识点</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            欢迎回来，{user?.email}
          </p>
        </div>
        <Link to="/kp/new">
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
            + 新建知识点
          </button>
        </Link>
      </div>

      <p style={{ color: '#9ca3af', fontSize: 13, margin: '10px 0 0' }}>
        💡 小提示：双击任意卡片可快速进入编辑
      </p>

      <div style={{ marginTop: 16 }}>
        {knowledgePoints.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#fff',
              borderRadius: 12,
              color: '#9ca3af',
            }}
          >
            你还没有任何知识点，点击右上角"新建知识点"开始吧！
          </div>
        ) : (
          knowledgePoints.map((kp) => (
            <div
              key={kp._id}
              onDoubleClick={() => navigate(`/kp/edit/${kp._id}`)}
              onMouseEnter={() => setHoveredId(kp._id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                background: '#fff',
                borderRadius: 12,
                boxShadow:
                  hoveredId === kp._id
                    ? '0 2px 10px rgba(124, 58, 237, 0.25)'
                    : '0 2px 10px rgba(0, 0, 0, 0.06)',
                padding: 20,
                marginBottom: 16,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 style={{ fontSize: 18, margin: '0 0 10px', color: '#1f2937' }}>
                  {kp.title}
                </h2>

                {/* 右上角状态标签：待复习 > 掌握得很好 > 学习中 > 未开始 */}
                {kp.reviewList ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#ef4444',
                      background: '#fef2f2',
                      padding: '2px 10px',
                      borderRadius: 999,
                    }}
                  >
                    📌 待复习
                  </span>
                ) : kp.status === 'mastered' ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#10b981',
                      background: '#ecfdf5',
                      padding: '2px 10px',
                      borderRadius: 999,
                    }}
                  >
                    掌握得很好
                  </span>
                ) : kp.status === 'in_progress' ? (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#7c3aed',
                      background: '#f3e8ff',
                      padding: '2px 10px',
                      borderRadius: 999,
                    }}
                  >
                    学习中
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      color: '#7c3aed',
                      background: '#f3e8ff',
                      padding: '2px 10px',
                      borderRadius: 999,
                    }}
                  >
                    未开始
                  </span>
                )}
              </div>

              <div
                style={{
                  background: '#fafafa',
                  padding: '14px 16px',
                  borderRadius: 8,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: '#374151',
                }}
                className="markdown-body"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      if (match && match[1] === 'mermaid') {
                        return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
                      }
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {DOMPurify.sanitize(kp.content)}
                </ReactMarkdown>
              </div>

              {/* 操作按钮：编辑 | 开始复述 | 删除 */}
              <div
                style={{ marginTop: 14, display: 'flex', gap: 10 }}
                onDoubleClick={(e) => e.stopPropagation()}
              >
                <Link to={`/kp/edit/${kp._id}`}>
                  <button
                    style={{
                      padding: '6px 16px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    编辑
                  </button>
                </Link>

                {/* 绿色"开始复述"按钮 */}
                <Link to={`/feynman/${kp._id}`}>
                  <button
                    style={{
                      padding: '6px 16px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    🎤 开始复述
                  </button>
                </Link>

                <button
                  onClick={() => handleDelete(kp._id)}
                  style={{
                    padding: '6px 16px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Home;

// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import KnowledgePointFormPage from './pages/KnowledgePointFormPage';
import FeynmanRecordPage from './pages/FeynmanRecordPage';
import QuizPage from './pages/QuizPage';
// 👇 新增：综合测评页
import ExamPage from './pages/ExamPage';
// 👇 新增：错题本 / AI 助教 / AI 拆解
import WrongBookPage from './pages/WrongBookPage';
import AiChatPage from './pages/AiChatPage';
import BreakdownPage from './pages/BreakdownPage';
// 👇 新增：错题重做 / 学习历史
import RetryPage from './pages/RetryPage';
import HistoryPage from './pages/HistoryPage';
// 👇 新增：AI 笔记 / 学习报告
import AiNotePage from './pages/AiNotePage';
import ReportPage from './pages/ReportPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/kp/new" element={<KnowledgePointFormPage />} />
          <Route path="/kp/edit/:id" element={<KnowledgePointFormPage />} />
          <Route path="/feynman/:id" element={<FeynmanRecordPage />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          {/* 👇 新增：综合测评 */}
          <Route path="/exam" element={<ExamPage />} />
          {/* 👇 新增：错题本 / AI 助教 / AI 拆解 */}
          <Route path="/wrong-book" element={<WrongBookPage />} />
          <Route path="/ai-chat" element={<AiChatPage />} />
          <Route path="/ai-breakdown" element={<BreakdownPage />} />
          {/* 👇 新增：错题重做 / 学习历史 */}
          <Route path="/retry" element={<RetryPage />} />
          <Route path="/history" element={<HistoryPage />} />
          {/* 👇 新增：AI 笔记 / 学习报告 */}
          <Route path="/ai-note" element={<AiNotePage />} />
          <Route path="/report" element={<ReportPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;

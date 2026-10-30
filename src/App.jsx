// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import KnowledgePointFormPage from './pages/KnowledgePointFormPage';
// 👇 新增
import FeynmanRecordPage from './pages/FeynmanRecordPage';

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
          {/* 👇 新增：费曼复述录音页 */}
          <Route path="/feynman/:id" element={<FeynmanRecordPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;

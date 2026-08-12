import { Routes, Route, Navigate } from "react-router-dom";
import Requirement from "../pages/Requirement";
import Dashboard from "../pages/Dashboard";
import ImpactAnalysis from "../pages/ImpactAnalysis";
import CodeReview from "../pages/CodeReview";
import PRGenerator from "../pages/PRGenerator";
import Agents from "../pages/Agents";
import Analytics from "../pages/Analytics";
import Settings from "../pages/Settings";
import CodebaseFiles from "../pages/CodebaseFiles";
import Login from "../pages/Login";
import Register from "../pages/Register";
import { useAuth } from "../context/AuthContext";

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/files" element={isAuthenticated ? <CodebaseFiles /> : <Navigate to="/login" />} />
      <Route path="/requirements" element={isAuthenticated ? <Requirement /> : <Navigate to="/login" />} />
      <Route path="/impact-analysis" element={isAuthenticated ? <ImpactAnalysis /> : <Navigate to="/login" />} />
      <Route path="/agents" element={isAuthenticated ? <Agents /> : <Navigate to="/login" />} />
      <Route path="/code-review" element={isAuthenticated ? <CodeReview /> : <Navigate to="/login" />} />
      <Route path="/pr-generator" element={isAuthenticated ? <PRGenerator /> : <Navigate to="/login" />} />
      <Route path="/analytics" element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />} />
      <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
    </Routes>
  );
};

export default AppRoutes;
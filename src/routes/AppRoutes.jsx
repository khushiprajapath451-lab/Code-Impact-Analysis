import { Routes, Route, Navigate } from "react-router-dom";
 import Requirement from "../pages/Requirement";
import Dashboard from "../pages/Dashboard";
import ImpactAnalysis from "../pages/ImpactAnalysis";
import CodeReview from "../pages/CodeReview";
import PRGenerator from "../pages/PRGenerator";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />


        <Route
        path="/requirements"
        element={<Requirement />}
        />
      <Route
path="/impact-analysis"
element={<ImpactAnalysis />}
/>

      <Route
path="/code-review"
element={<CodeReview />}
/>

      <Route
path="/pr-generator"
element={<PRGenerator />}
/>

      <Route
        path="/settings"
        element={<h1 style={{ color: "white", padding: "40px" }}>Settings</h1>}
      />
    </Routes>
  );
};

export default AppRoutes;
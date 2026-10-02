import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { AnalysisProvider } from "./context/AnalysisContext";
import AnimatedBackground from "./components/AnimatedBackground";

function App() {
  return (
    <AuthProvider>
      <AnalysisProvider>
        <div style={{ position: "relative", minHeight: "100vh" }}>
          <AnimatedBackground />
          <div style={{ position: "relative", zIndex: 1 }}>
            <AppRoutes />
          </div>
        </div>
      </AnalysisProvider>
    </AuthProvider>
  );
}

export default App;
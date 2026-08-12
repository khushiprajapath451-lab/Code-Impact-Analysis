import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { AnalysisProvider } from "./context/AnalysisContext";

function App() {
  return (
    <AuthProvider>
      <AnalysisProvider>
        <AppRoutes />
      </AnalysisProvider>
    </AuthProvider>
  );
}

export default App;
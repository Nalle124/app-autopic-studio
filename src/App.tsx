import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SetupScenes from "./pages/SetupScenes";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminScenes from "./pages/AdminScenes";
import Examples from "./pages/Examples";
import { Profile } from "./pages/Profile";
import NotFound from "./pages/NotFound";
import UploadSceneImages from "./pages/UploadSceneImages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/exempel" element={<Examples />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/admin/scener" element={<ProtectedRoute><AdminScenes /></ProtectedRoute>} />
            <Route path="/setup-scenes" element={<ProtectedRoute><SetupScenes /></ProtectedRoute>} />
            <Route path="/upload-scenes" element={<ProtectedRoute><UploadSceneImages /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

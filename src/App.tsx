import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Demo from "./pages/Demo";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import { Profile } from "./pages/Profile";
import { Onboarding } from "./pages/Onboarding";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentPending from "./pages/PaymentPending";
import GuestCheckout from "./pages/GuestCheckout";
import SignupAfterPayment from "./pages/SignupAfterPayment";
import NotFound from "./pages/NotFound";
import UploadSceneImages from "./pages/UploadSceneImages";
import InviteSignup from "./pages/InviteSignup";
import Guide from "./pages/Guide";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <Sonner />
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/try" element={<Demo />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
              <Route path="/payment-pending" element={<ProtectedRoute><PaymentPending /></ProtectedRoute>} />
              <Route path="/guest-checkout" element={<GuestCheckout />} />
              <Route path="/signup-after-payment" element={<SignupAfterPayment />} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/upload-scenes" element={<ProtectedRoute><UploadSceneImages /></ProtectedRoute>} />
              <Route path="/invite" element={<InviteSignup />} />
              <Route path="/guide" element={<Guide />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
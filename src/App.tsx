import { useEffect, lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile").then(m => ({ default: m.Profile })));
const Onboarding = lazy(() => import("./pages/Onboarding").then(m => ({ default: m.Onboarding })));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentPending = lazy(() => import("./pages/PaymentPending"));
const GuestCheckout = lazy(() => import("./pages/GuestCheckout"));
const SignupAfterPayment = lazy(() => import("./pages/SignupAfterPayment"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UploadSceneImages = lazy(() => import("./pages/UploadSceneImages"));
const InviteSignup = lazy(() => import("./pages/InviteSignup"));
const Guide = lazy(() => import("./pages/Guide"));
const AutopicV2 = lazy(() => import("./pages/AutopicV2"));
const TryV2 = lazy(() => import("./pages/TryV2"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

function App() {
  useEffect(() => {
    // Dismiss splash screen after React has mounted
    const splash = document.getElementById('splash-screen');
    if (splash) {
      // Longer delay to let initial render fully settle and avoid white flash
      const timer = setTimeout(() => {
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
        setTimeout(() => splash.remove(), 400);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Defer preloading of AI Studio menu images until after idle
  useEffect(() => {
    const preload = () => {
      const preloadImages = [
        '/mode-previews/thumbs/redigera-fritt-thumb.jpg',
        '/mode-previews/logo-apply-preview.jpg',
        '/mode-previews/blur-plates-preview.jpg',
        '/mode-previews/fix-interior-preview.jpg',
        '/mode-previews/logo-preview.jpg',
        '/mode-previews/thumbs/ad-sasongsrea-thumb.jpg',
      ];
      preloadImages.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preload);
    } else {
      setTimeout(preload, 3000);
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <Sonner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                <Route path="/" element={<ProtectedRoute><AutopicV2 /></ProtectedRoute>} />
                <Route path="/classic" element={<Index />} />
                <Route path="/try" element={<TryV2 />} />
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
                <Route path="/autopic-v2" element={<ProtectedRoute><AutopicV2 /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
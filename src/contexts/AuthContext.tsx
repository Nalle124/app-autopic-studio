import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as Sentry from '@sentry/react';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to check admin status - deferred to avoid deadlock
  const checkAdminStatus = (userId: string) => {
    setAdminLoading(true);
    setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin', {
          _user_id: userId
        });
        if (!error) {
          setIsAdmin(data || false);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      } finally {
        setAdminLoading(false);
      }
    }, 0);
  };

  useEffect(() => {
    // Set up auth state listener FIRST - must be synchronous callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only synchronous state updates here
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Identify user in Sentry for error tracking
        if (session?.user) {
          Sentry.setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.full_name || ''
          });
        } else {
          Sentry.setUser(null);
        }
        
        // Defer admin check with setTimeout to avoid deadlock
        if (session?.user) {
          checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
          setAdminLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setAdminLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Check if email confirmation is required
    if (!error && data.user && !data.session) {
      // User created but needs email confirmation
      return { error: null, needsEmailConfirmation: true };
    }
    
    if (!error && data.user && data.session) {
      
      // Send welcome email (non-blocking)
      supabase.functions.invoke('send-welcome-email', {
        body: {
          userId: data.user.id,
          email: email,
          name: fullName
        }
      }).catch(err => console.error('Welcome email error:', err));
      
      // Notify about new lead (non-blocking)
      supabase.functions.invoke('notify-new-lead', {
        body: {
          email: email,
          name: fullName,
          stage: 'signup'
        }
      }).catch(err => console.error('Lead notification error:', err));
      
      navigate('/onboarding');
    }
    
    return { error, needsEmailConfirmation: false };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      navigate('/');
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, adminLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

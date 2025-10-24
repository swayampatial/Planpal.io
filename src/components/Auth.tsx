import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Sparkles, Mail, Lock, User } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface AuthProps {
  onAuthSuccess: (user: any, profile: any) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [signUpData, setSignUpData] = useState({ name: "", email: "", password: "" });
  const [signInData, setSignInData] = useState({ email: "", password: "" });

  const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
  );

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user via backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(signUpData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Sign up failed");
      }

      const { user, profile } = await response.json();

      // Sign in the user
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: signUpData.email,
        password: signUpData.password,
      });

      if (signInError) throw signInError;

      onAuthSuccess(data.user, profile);
    } catch (error: any) {
      console.error("Sign up error:", error);
      alert(error.message || "Failed to sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) throw error;

      // Fetch profile
      const profileResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dbafed67/profile/${data.user.id}`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        onAuthSuccess(data.user, profile);
      } else {
        onAuthSuccess(data.user, null);
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      alert(error.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <Card className="w-full max-w-md border-purple-500/30 neon-glow relative z-10">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-neon rounded-2xl flex items-center justify-center neon-pulse mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl neon-text">Welcome to PlanPal</CardTitle>
          <CardDescription className="text-purple-300">
            Your AI-powered event planning companion
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                    disabled={loading}
                    className="neon-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                    disabled={loading}
                    className="neon-border"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-neon neon-glow hover:neon-glow-strong transition-all"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">
                    <User className="w-4 h-4 inline mr-2" />
                    Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your name"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                    required
                    disabled={loading}
                    className="neon-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    required
                    disabled={loading}
                    className="neon-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    required
                    disabled={loading}
                    className="neon-border"
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-neon neon-glow hover:neon-glow-strong transition-all"
                >
                  {loading ? "Creating account..." : "Sign Up & Get 100 Points!"}
                </Button>
                
                <p className="text-xs text-center text-purple-400">
                  🎁 New users get 100 bonus points to start!
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-6 border-t border-purple-500/30">
            <p className="text-center text-sm text-purple-300">
              100% Free to use • No credit card required
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

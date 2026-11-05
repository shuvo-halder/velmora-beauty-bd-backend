import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  
  const { login } = useAuth();
  const { branding, setPageTitle } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    setPageTitle("Login");
  }, [setPageTitle]);

  const logoSource = branding.logoUrl || branding.adminPanelLogo;
  const portalName = branding.adminPanelName || branding.siteName || "Admin Portal";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.token, data.refreshToken, data.data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error?.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-3 text-center">
          {logoSource && !logoError ? (
            <div className="flex justify-center pb-2">
              <img
                src={logoSource}
                alt={portalName}
                onError={() => setLogoError(true)}
                className="h-12 max-w-[200px] object-contain"
              />
            </div>
          ) : (
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
              {portalName.charAt(0)}
            </div>
          )}
          <CardTitle className="text-2xl font-bold tracking-tight">
            Sign in to {portalName}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{branding.siteTagline}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-sm font-medium text-destructive text-center">{error}</div>}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

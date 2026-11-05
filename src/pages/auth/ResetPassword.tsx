import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setMessage("Password has been successfully reset.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Card className="w-full max-w-md p-6 text-center shadow-lg border-muted">
          <h2 className="text-xl font-semibold text-destructive mb-4">Invalid Link</h2>
          <p className="text-muted-foreground mb-4">The password reset link is missing or invalid.</p>
          <Link to="/login"><Button variant="outline">Back to Login</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-sm font-medium text-destructive text-center">{error}</div>}
            {message && <div className="text-sm font-medium text-green-600 text-center">{message}</div>}
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">New Password</label>
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Must be at least 12 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character.</p>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// src/Auth.jsx

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// This is a simple, presentational component for our login/signup form.
// It receives handler functions from App.jsx as props.
export default function Auth({ onSignUp, onLogin, logoUrl }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true); // Set loading to true
    try {
      await onSignUp(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false); // Set loading to false when done
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true); // Set loading to true
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false); // Set loading to false when done
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="flex justify-center mb-6">
        <img src={logoUrl} alt="Rocket Productivity Logo" className="h-12 w-auto" />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{isLogin ? 'Login' : 'Sign Up'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Enter your email below to login to your account.' : 'Enter your information to create an account.'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={isLogin ? handleLogin : handleSignUp}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full text-sm text-muted-foreground"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
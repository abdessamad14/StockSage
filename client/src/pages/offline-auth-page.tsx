import { useState } from "react";
import { useOfflineAuth } from "@/hooks/use-offline-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";

export default function OfflineAuthPage() {
  const [, setLocation] = useLocation();
  const { login, register } = useOfflineAuth();
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    username: "",
    email: "",
    businessName: "",
    role: "manager" as const
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const success = await login(loginForm.username, loginForm.password);
    if (success) {
      setLocation("/");
    }
    
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await register(registerForm);
      setLocation("/");
    } catch (error) {
      // Error handled by toast in register function
    }
    
    setIsLoading(false);
  };

  const handleQuickLogin = async (username: string) => {
    setIsLoading(true);
    const success = await login(username);
    if (success) {
      setLocation("/");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">StockSage</h1>
          <p className="text-gray-600 mt-2">Offline Inventory Management</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access StockSage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter username"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="mobile-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password (optional for demo)"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="mobile-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="mobile-button-primary"
                    disabled={isLoading || !loginForm.username}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600 text-center">Quick Demo Login:</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleQuickLogin("admin")}
                      disabled={isLoading}
                      className="mobile-button-secondary"
                    >
                      Login as Admin
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleQuickLogin("manager")}
                      disabled={isLoading}
                      className="mobile-button-secondary"
                    >
                      Login as Manager
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleQuickLogin("cashier")}
                      disabled={isLoading}
                      className="mobile-button-secondary"
                    >
                      Login as Cashier
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Register</CardTitle>
                <CardDescription>
                  Create a new account for StockSage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      className="mobile-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Username</Label>
                    <Input
                      id="reg-username"
                      type="text"
                      placeholder="Choose a username"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      className="mobile-input"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="mobile-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business">Business Name</Label>
                    <Input
                      id="business"
                      type="text"
                      placeholder="Enter your business name"
                      value={registerForm.businessName}
                      onChange={(e) => setRegisterForm({ ...registerForm, businessName: e.target.value })}
                      className="mobile-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="mobile-button-primary"
                    disabled={isLoading || !registerForm.name || !registerForm.username}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

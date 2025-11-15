import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { databaseUserStorage } from '@/lib/database-user-storage';
import { OfflineUser } from '@/lib/user-storage';
import { Lock, User, Shield, UserCheck } from 'lucide-react';

interface PinLoginProps {
  onLogin: (user: OfflineUser) => void;
}

export default function PinLogin({ onLogin }: PinLoginProps) {
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [users, setUsers] = useState<OfflineUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<OfflineUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      // Clear any existing session to start fresh
      databaseUserStorage.clearSession();
      
      console.log('PinLogin: Initializing users...');
      await databaseUserStorage.initializeDefaultUsers();
      const allUsers = await databaseUserStorage.getAll();
      console.log('PinLogin: All users:', allUsers);
      const activeUsers = allUsers.filter((user: OfflineUser) => user.active);
      console.log('PinLogin: Active users:', activeUsers);
      setUsers(activeUsers);
      
      // Auto-select first user for easier testing
      if (activeUsers.length > 0) {
        setSelectedUser(activeUsers[0]);
      }
    };
    
    loadUsers();
  }, []);

  const handleNumberClick = (number: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + number);
    }
  };

  const handleClear = () => {
    setPin('');
    setSelectedUser(null);
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    if (pin.length !== 4) {
      toast({
        title: "PIN incomplet",
        description: "Veuillez saisir un PIN à 4 chiffres",
        variant: "destructive",
      });
      return;
    }

    if (!selectedUser) {
      toast({
        title: "Utilisateur non sélectionné",
        description: "Veuillez sélectionner un utilisateur",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Validate that the PIN matches the selected user
      if (selectedUser.pin === pin && selectedUser.active) {
        // Create session
        databaseUserStorage.createSession(selectedUser);
        
        toast({
          title: "Connexion réussie",
          description: `Bienvenue ${selectedUser.name}`,
        });
        
        console.log('PinLogin: calling onLogin with user:', selectedUser);
        onLogin(selectedUser);
      } else if (!selectedUser.active) {
        toast({
          title: "Compte désactivé",
          description: "Ce compte utilisateur est désactivé",
          variant: "destructive",
        });
        setPin('');
      } else {
        toast({
          title: "PIN incorrect",
          description: "Le PIN ne correspond pas à l'utilisateur sélectionné",
          variant: "destructive",
        });
        setPin('');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Erreur de connexion",
        description: "Une erreur s'est produite lors de la connexion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: OfflineUser) => {
    setSelectedUser(user);
    setPin('');
  };

  // Auto-login when PIN is complete
  useEffect(() => {
    if (pin.length === 4) {
      handleLogin();
    }
  }, [pin]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'cashier':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'cashier':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">igoodar POS</h1>
          <p className="text-gray-600">Connexion Caissier</p>
        </div>

        {/* User Selection */}
        {!selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Sélectionnez votre profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.map(user => (
                <Button
                  key={user.id}
                  variant="outline"
                  className="w-full h-16 flex items-center justify-between p-4"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.username}</div>
                    </div>
                  </div>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role === 'admin' ? 'Admin' : 'Caissier'}
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* PIN Entry */}
        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  {getRoleIcon(selectedUser.role)}
                </div>
                <span>{selectedUser.name}</span>
              </CardTitle>
              <p className="text-center text-gray-600">Saisissez votre code PIN</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* PIN Display */}
              <div className="flex justify-center space-x-3">
                {[0, 1, 2, 3].map(index => (
                  <div
                    key={index}
                    className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${
                      pin.length > index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {pin.length > index && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(number => (
                  <Button
                    key={number}
                    variant="outline"
                    size="lg"
                    className="h-14 text-xl font-semibold"
                    onClick={() => handleNumberClick(number.toString())}
                    disabled={loading}
                  >
                    {number}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14"
                  onClick={handleClear}
                  disabled={loading}
                >
                  Effacer
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 text-xl font-semibold"
                  onClick={() => handleNumberClick('0')}
                  disabled={loading}
                >
                  0
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14"
                  onClick={handleBackspace}
                  disabled={loading}
                >
                  ⌫
                </Button>
              </div>

              {/* Back Button */}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setSelectedUser(null)}
                disabled={loading}
              >
                ← Changer d'utilisateur
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Default PINs Info */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-yellow-800">
              <p className="font-medium mb-2">Codes PIN par défaut:</p>
              {users.map(user => (
                <p key={user.id}>
                  {user.role === 'admin' ? 'Admin' : 'Caissier'}: 
                  <span className="font-mono bg-yellow-100 px-2 py-1 rounded ml-1">{user.pin}</span>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

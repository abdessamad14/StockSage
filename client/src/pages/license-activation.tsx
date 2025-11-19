import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Shield, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LicenseActivation() {
  const [licenseKey, setLicenseKey] = useState('');
  const [machineId, setMachineId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch machine ID on component mount
  useEffect(() => {
    fetchMachineId();
  }, []);

  const fetchMachineId = async () => {
    try {
      const response = await fetch('/api/license/machine-id');
      const data = await response.json();
      setMachineId(data.machineId);
    } catch (err) {
      console.error('Failed to fetch machine ID:', err);
    }
  };

  const copyMachineId = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKey.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(data.message || 'Invalid license key');
      }
    } catch (err) {
      setError('Failed to activate license. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-indigo-100 rounded-full">
              <Shield className="w-12 h-12 text-indigo-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Activation Igoodar</CardTitle>
          <CardDescription className="text-base">
            Activez votre licence pour commencer à utiliser Igoodar POS & Gestion de Stock
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {success ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">
                Licence activée avec succès ! Redirection...
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Machine ID Section */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-700">
                    Étape 1 : Votre ID Machine
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  Envoyez cet ID Machine à votre fournisseur pour recevoir votre clé de licence
                </p>
                <div className="flex gap-2">
                  <Input
                    value={machineId}
                    readOnly
                    className="font-mono text-sm bg-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyMachineId}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Copié dans le presse-papiers !
                  </p>
                )}
              </div>

              {/* License Key Input Section */}
              <form onSubmit={handleActivate} className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="licenseKey" className="text-sm font-semibold text-gray-700">
                    Étape 2 : Entrez votre clé de licence
                  </Label>
                  <p className="text-sm text-gray-600">
                    Entrez la clé de licence fournie par votre fournisseur
                  </p>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="licenseKey"
                      type="text"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      placeholder="IGOODAR-xxxxxxxxxx-xxxx"
                      className="pl-10 font-mono text-sm"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 text-lg"
                  disabled={loading || !licenseKey.trim()}
                >
                  {loading ? 'Activation en cours...' : 'Activer la licence'}
                </Button>
              </form>

              {/* Help Section */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Besoin d'aide ? Contactez votre fournisseur pour assistance
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Copyright Footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-sm text-gray-500">
          © 2025 Igoodar. Tous droits réservés. Logiciel propriétaire.
        </p>
      </div>
    </div>
  );
}

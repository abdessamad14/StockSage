/**
 * Update Notification Component
 * 
 * Displays a prominent notification when a new app version is available
 * Allows users to download the update or dismiss the notification
 */

import { useState } from 'react';
import { Download, X, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppUpdate } from '@/hooks/use-app-update';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UpdateNotification() {
  const { hasUpdate, versionInfo, currentVersion, latestVersion, downloadUpdate, dismiss } = useAppUpdate();
  const [showDialog, setShowDialog] = useState(true);

  // Don't render if no update available
  if (!hasUpdate || !versionInfo) {
    return null;
  }

  const handleDownload = () => {
    downloadUpdate();
    // Keep dialog open so user knows download started
  };

  const handleDismiss = () => {
    dismiss();
    setShowDialog(false);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Nouvelle Version Disponible !
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Version {latestVersion} est maintenant disponible
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Version Info */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Version actuelle</p>
              <p className="text-lg font-semibold">{currentVersion}</p>
            </div>
            <div className="text-gray-400">→</div>
            <div>
              <p className="text-sm text-gray-500">Nouvelle version</p>
              <p className="text-lg font-semibold text-blue-600">{latestVersion}</p>
            </div>
          </div>

          {/* Critical Update Warning */}
          {versionInfo.critical && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Mise à jour critique</strong> - Il est fortement recommandé d'installer cette version.
              </AlertDescription>
            </Alert>
          )}

          {/* Changelog */}
          {versionInfo.changelog && versionInfo.changelog.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-sm text-gray-700">Nouveautés :</h4>
              <ul className="space-y-1.5">
                {versionInfo.changelog.map((change, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Release Date */}
          <p className="text-xs text-gray-500 text-center">
            Date de sortie: {new Date(versionInfo.releaseDate).toLocaleDateString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!versionInfo.critical && (
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Plus tard
            </Button>
          )}
          <Button
            onClick={handleDownload}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger la mise à jour
          </Button>
        </DialogFooter>

        {/* Installation Instructions */}
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-800">
            <strong>Instructions :</strong> Après téléchargement, fermez l'application actuelle et lancez le nouveau installateur. Vos données seront préservées.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}


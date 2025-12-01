// PWA Service Worker Registration with update detection
export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service worker registered:', registration);
          
          // Check for updates every 60 seconds
          setInterval(() => {
            registration.update();
          }, 60000);
          
          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[PWA] New service worker found, installing...');
            
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, show update prompt
                console.log('[PWA] New version available, prompting user to reload...');
                showUpdatePrompt();
              }
            });
          });
        })
        .catch((registrationError) => {
          console.log('[PWA] Service worker registration failed:', registrationError);
        });
    });
    
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Controller changed, new service worker activated');
    });
  }
};

// Show update notification
const showUpdatePrompt = () => {
  // Don't show if already showing
  if (document.getElementById('pwa-update-banner')) return;
  
  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-xl z-[9999] flex items-center space-x-4 animate-in slide-in-from-top';
  banner.innerHTML = `
    <div class="flex items-center space-x-3">
      <svg class="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
      </svg>
      <span class="font-medium">Nouvelle version disponible !</span>
    </div>
    <button id="pwa-reload-btn" class="bg-white text-blue-600 px-4 py-1.5 rounded font-medium hover:bg-blue-50 transition-colors">
      Actualiser
    </button>
  `;
  
  document.body.appendChild(banner);
  
  document.getElementById('pwa-reload-btn')?.addEventListener('click', () => {
    window.location.reload();
  });
};

// PWA Install Prompt
let deferredPrompt: any;

export const initPWAPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button or banner
    showInstallPromotion();
  });
};

export const showInstallPromotion = () => {
  // Create install banner if not exists
  if (!document.getElementById('pwa-install-banner')) {
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'fixed top-16 left-4 right-4 bg-primary text-white p-3 rounded-lg shadow-lg z-50 flex items-center justify-between';
    banner.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
        </svg>
        <span class="text-sm font-medium">Install igoodar App</span>
      </div>
      <div class="flex items-center space-x-2">
        <button id="pwa-install-btn" class="bg-white text-primary px-3 py-1 rounded text-sm font-medium">Install</button>
        <button id="pwa-dismiss-btn" class="text-white/80 hover:text-white">×</button>
      </div>
    `;
    
    document.body.appendChild(banner);
    
    // Add event listeners
    document.getElementById('pwa-install-btn')?.addEventListener('click', installPWA);
    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', dismissInstallPromotion);
    
    // Auto dismiss after 10 seconds
    setTimeout(dismissInstallPromotion, 10000);
  }
};

export const installPWA = async () => {
  if (deferredPrompt) {
    // Show the prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // Clear the deferredPrompt variable
    deferredPrompt = null;
    // Hide the install promotion
    dismissInstallPromotion();
  }
};

export const dismissInstallPromotion = () => {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.remove();
  }
};

// Check if app is installed
export const isAppInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

// Add to home screen detection
export const detectMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

# iGoodar Merchant App Setup Guide

This guide provides step-by-step instructions to install, configure, and run the iGoodar Merchant Mobile App, including how to properly configure the app to communicate with your backend server.

## Prerequisites

- Node.js (v16 or newer)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app installed on your mobile device
- Access to the iGoodar Stock backend server

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd igoodar-stock/mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Configuration

The mobile app needs to connect to your iGoodar Stock backend server. There are two ways to configure this connection:

### Option 1: Configure at runtime (Recommended)

1. Start the app
2. Tap the settings gear icon in the top-right corner of the Home screen
3. Enter your server's IP address in the "Server IP Address" field
4. Tap "Save Connection Settings"

### Option 2: Pre-configure the app (Development)

1. Open `app/config/config.ts`
2. Modify the `getServerIP()` function:
   ```typescript
   const getServerIP = (): string => {
     // Update this default IP address to match your server
     return 'http://192.168.1.xxx:5000'; // Replace with your server's IP
   };
   ```

## Running the App

### Development Mode

```bash
# Start the Expo development server
npm start
```

This will display a QR code that you can scan with your mobile device using the Expo Go app.

### Running on a specific platform

```bash
# Run on Android
npm run android

# Run on iOS (Mac only)
npm run ios
```

## Connecting to the Backend

### Local Development

When running the backend locally:
1. Ensure both your mobile device and development computer are on the same network
2. Find your development computer's local IP address:
   ```bash
   # On macOS/Linux
   ifconfig | grep "inet "
   
   # On Windows
   ipconfig
   ```
3. Use this IP address in the app's settings

### Replit Deployment

When using Replit to host your backend:
1. Navigate to your Replit project
2. Copy the URL shown in the browser (e.g., `https://your-repl-name.replit.app`)
3. Use this URL in the app's settings screen (the app will automatically use the correct port)

## Troubleshooting Connection Issues

If you're having trouble connecting to the backend:

1. **Check network access**:
   - Ensure your mobile device and server are on the same network
   - Verify that your server allows incoming connections on port 5000
   - Make sure your server isn't blocked by a firewall

2. **Verify server is running**:
   - Test the server URL in a browser to confirm it's accessible
   - Try `http://<ip-address>:5000/api/user` to check if the API is responding

3. **Check app logs**:
   - Enable developer mode in the app settings
   - Review connection logs for detailed error information

## Common Issues

### "Network Error" when trying to login
- Make sure the backend is running
- Verify that you've entered the correct IP address
- Check that your mobile device can reach the server (try opening the URL in a browser on your phone)

### App can connect but authentication fails
- Ensure your backend database has the user credentials you're trying to use
- Check that the authentication routes are working on the backend (`/api/login`)

### "Unable to resolve host" error
- Make sure you're using an IP address, not just "localhost" (which only works on emulators, not physical devices)
- Try using a fully qualified URL with protocol: `http://192.168.1.xxx:5000`
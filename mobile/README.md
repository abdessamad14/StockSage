# iGoodar Merchant Mobile App

A mobile application for merchants to place orders directly from their smartphones. This app complements the main iGoodar Stock system, allowing merchants to manage orders on the go.

## Features

- **Authentication**: Secure login for authorized merchants
- **Browse Products**: View all products with search and filter capabilities 
- **Supplier Management**: Access supplier information for easy ordering
- **Order Creation**: Create new orders for suppliers with a detailed product selection interface
- **Order History**: Track and monitor order status

## Installation and Setup

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- Android Studio (for Android development) or Xcode (for iOS development)

### Setting Up the Development Environment

1. Install Expo CLI globally:
   ```bash
   npm install -g expo-cli
   ```

2. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```

3. Configure API URL:
   - Open `app/api/api.ts`
   - Update the `baseURL` to point to your iGoodar Stock backend server

### Running the App

#### Development Mode

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

#### Building for Production

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

## Integration with iGoodar Stock

This mobile app communicates with the main iGoodar Stock backend system using REST APIs. It shares the same authentication system and data models.

### Key Integration Points:

1. **Authentication**: Uses the same session-based auth as the main system
2. **Order Management**: Syncs with the main system's order database
3. **Product Catalog**: Accesses the same product inventory data
4. **User Permissions**: Respects the merchant role permissions defined in the main system

## Customization

You can customize the app by:

1. Modifying the theme colors in `App.tsx`
2. Adding new screens to the navigation stack
3. Enhancing API capabilities in the `api` directory
4. Updating the logo and branding assets in the `assets` directory

## Troubleshooting

- **Connection Issues**: Ensure the backend URL is correctly configured and accessible
- **Login Problems**: Verify that the user has merchant permissions in the main system
- **Build Errors**: Make sure all dependencies are correctly installed

## License

This software is part of the iGoodar Stock system and is subject to the same licensing terms.
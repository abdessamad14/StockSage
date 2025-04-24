# iGoodar Merchant App

A simple mobile application that allows merchants to login and create orders for customers.

## Features

- Authentication with username and password
- Server IP configuration for flexible deployment
- Customer selection
- Product search and filtering
- Order management with quantity adjustments
- Order submission

## Technical Stack

- React Native with Expo 50
- React Navigation for screen navigation
- Axios for API requests
- Expo Secure Store for secure local storage

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app installed on your mobile device

### Installation

1. Clone the repository
2. Navigate to the project directory: `cd mobile`
3. Install dependencies: `npm install`
4. Start the Expo development server: `npm start`
5. Scan the QR code with the Expo Go app on your device

### Configuration

When launching the app for the first time, you'll need to:

1. Tap "Configure Server" on the login screen
2. Enter your iGoodar Stock server IP address (e.g., 192.168.1.100)
3. Provide your login credentials
4. The app will connect to your backend system

## Usage

### Login Screen

- Enter username and password
- Optionally configure the server IP address

### Order Screen

- Select a customer from the horizontal list
- Search for products by name or barcode
- Tap a product to add it to your order
- Adjust quantities using the + and - buttons
- Review your order summary
- Submit the order when ready

## Note

This app is designed to work with the iGoodar Stock backend system and requires a running instance of that system to function properly.
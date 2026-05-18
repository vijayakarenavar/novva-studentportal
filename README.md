# Student Portal - React Native App

This is a React Native mobile application for students, built with Expo.

## Features

- **Authentication**
  - Student Login
  - Student Registration
  - Forgot Password (OTP verification)
  - Change Password
  
- **Dashboard**
  - View attendance percentage
  - View enrolled courses count
  - View notifications count
  
- **Attendance**
  - View all attendance records
  - Pull to refresh
  
- **Profile Management**
  - View personal details
  - Edit name and email
  
- **Notifications**
  - View all notifications
  - Unread indicator

## Tech Stack

- React Native / Expo
- React Navigation v7
- Axios for API calls
- React Context for state management

## Backend API

Base URL: `https://edu-novaa.in/api`

Endpoints used:
- POST `/auth/login` - Login
- POST `/auth/register` - Register
- POST `/auth/forgot-password` - Request OTP
- POST `/auth/verify-otp` - Verify OTP
- POST `/auth/reset-password` - Reset password
- GET `/auth/me` - Get current user
- POST `/auth/logout` - Logout
- GET `/attendance` - Get attendance records
- GET `/notifications` - Get notifications
- PUT `/auth/update-profile` - Update profile

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run on device/emulator**
   ```bash
   # Start Expo dev server
   npm start
   
   # Run on Android
   npm run android
   
   # Run on iOS
   npm run ios
   
   # Run in web browser
   npm run web
   ```

3. **Build for production** (if needed)
   ```bash
   npx expo build:android
   npx expo build:ios
   ```

## Project Structure

```
src/
├── constants/theme.js       # Colors, sizes, fonts
├── context/AuthContext.js   # Authentication state
├── navigation/
│   └── AppNavigator.js      # Main app navigation
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── ForgotPasswordScreen.js
│   │   └── OTPVerifyScreen.js
│   ├── dashboard/
│   │   └── DashboardScreen.js
│   ├── attendance/
│   │   └── AttendanceScreen.js
│   ├── profile/
│   │   └── ProfileScreen.js
│   └── notifications/
│       └── NotificationsScreen.js
└── services/
    └── api.js              # Axios configuration
```

## Notes

- The app uses **httpOnly cookies** for authentication
- All API calls automatically include cookies via axios
- UI follows Material Design inspired colors
- Dark mode / light mode not yet implemented

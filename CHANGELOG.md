# APK Fix Manifest - fix/apk-crash

## Fixes Applied

### 1. Crash Prevention
- **Added ErrorBoundary** (`src/components/ErrorBoundary.js`) — wraps the entire app to catch unhandled React errors and show a recovery screen instead of crashing.
- **Wrapped NavigationContainer with ErrorBoundary** in `App.js` — ensures any navigation error doesn't crash the entire app.

### 2. Navigation Crash Fixes (fix/apk-crash)
- **LoginScreen.js** — Wrapped `navigation.navigate("ChangePassword")` in try/catch. Previously, if the `ChangePassword` screen wasn't registered in the navigator, the app would force-close with a "route not found" error.
- **ForgotPasswordScreen.js** — Wrapped `navigation.navigate("OTPVerify", { email })` in try/catch. This route isn't registered in `AppNavigator.js`; navigating to it without handling would crash the app.
- **PaymentCancel.js** — Wrapped `navigation.navigate("Support")` in try/catch and redirected to `Profile` screen with a fallback alert. The `Support` route doesn't exist.

### 3. Network Error Handling
- **AuthContext.js** — Network errors (ECONNABORTED, ENOTFOUND, ETIMEDOUT) during token verification no longer force-logout the user. Previously, any non-401 error (including temporary network issues) would clear the user's session. Now only true 401 responses clear the token; network errors keep the session alive for retry.
- **api.js** — Removed `withCredentials: true` from axios instance. This flag causes CORS/policy issues on native Android and can lead to unhandled crashes when making API calls. Authorization is now sent exclusively via the Bearer token header.

### 4. Play Store Build Configuration
- **eas.json** — Fixed production build type to `app-bundle` (required by Google Play). Removed the custom `gradleCommand` override. Removed `buildType: "apk"` from preview builds.
- **app.json** — Incremented `versionCode` from 2 to 3. Added `privacyPolicyUrl` and `termsOfServiceUrl` in the `extra` config (required by Play Store before submission).

### 5. Dependency Notes
- `@react-native-async-storage/async-storage` v2.2.0 is used across web and native — ✅ Compatible.
- `expo-secure-store` v15.0.8 is used for token storage on native — ✅ Secure storage configured in `app.json`.
- `react-native-razorpay` v3.0.0 has a fallback browser-based payment path — ✅ The native module failure path is handled gracefully.

## Build & Deploy Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Verify Build
```bash
npx expo prebuild --clean
npx expo run:android
```

### 3. Build AAB for Play Store
```bash
eas build --platform android --profile production
```

### 4. Submit to Play Store
```bash
eas submit --platform android --profile production
```

### 5. Play Store Testing Checklist
- [ ] App installs and launches successfully
- [ ] Login works without crash
- [ ] Forgot Password flow doesn't crash (no OTPVerify screen yet — shows alert)
- [ ] Payment flow opens Razorpay or falls back to browser
- [ ] Navigation between Home ↔ Timetable ↔ Profile works
- [ ] Logout and re-login preserves user session on network errors
- [ ] Splash screen displayed correctly

## Notes for Google Play Console

### What's New Description
> Fixed app crashes on navigation and payment screens. Improved error handling to prevent force-close scenarios. Users will now see friendly error messages instead of app crashes.

### Release Notes
- Fixed crash when navigating from login screen
- Fixed crash on forgot-password and payment-cancel screens
- Improved network error handling — no more unexpected logouts
- More stable payment gateway integration

## Play Store Compliance
- Target SDK: Auto-managed by Expo SDK 54 (compliant with Google Play target API policy)
- Min SDK: Auto-managed (currently 24, compliant)
- Permissions: Only INTERNET requested and declared
- Content rating: To be set in Play Console (target: Everyone / Teen based on college app)
- Privacy policy URL: https://edu-novaa.in/privacy (update to your actual URL)
- Terms of service URL: https://edu-novaa.in/terms (update to your actual URL)

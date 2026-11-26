# Firebase Setup & Android Studio Testing Guide (Move Better Physio)

Supabase has been completely removed from this project (`supabase/` folder, Retrofit Supabase APIs, email/password screens, and `SUPABASE_URL` / `SUPABASE_ANON_KEY` configs are gone).

## Step 1: Firebase Console Setup
1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project** (e.g. `MoveBetterPhysio`).
2. Click the **Android icon** to register your app:
   - **Android package name:** `com.movebetter.physio`
   - **App nickname:** `Move Better Physio`
   - **Debug signing certificate SHA-1:** (Get this from Android Studio → Gradle tab → `MoveBetterPhysio` → `Tasks` → `android` → `signingReport`, and add both **SHA-1** and **SHA-256** in Firebase Project Settings → General → Your apps).
3. Download **`google-services.json`** and paste it into:
   `android-app/app/google-services.json`

## Step 2: Enable Phone OTP Authentication
1. In Firebase Console, go to **Build → Authentication → Get started**.
2. Open the **Sign-in method** tab → click **Phone** → toggle **Enable** → **Save**.
3. *(Optional for fast testing without SMS quota)* Under **Phone numbers for testing**, add a test number like `+91 9876543210` with test OTP `123456`.

## Step 3: Enable Cloud Firestore Database
1. Go to **Build → Firestore Database → Create database**.
2. Choose **Start in test mode** (or apply the security rules below) and select `asia-south1` (Mumbai) region.
3. Recommended Firestore Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 4: Run & Test in Android Studio
1. Extract this ZIP and open the **`android-app`** folder in Android Studio.
2. Verify `android-app/app/google-services.json` is placed properly.
3. Click **Sync Project with Gradle Files** (ensure Gradle JDK is set to JBR 17 / Android Studio Embedded JDK).
4. Connect your Samsung phone (USB Debugging ON) or start an Emulator with Google Play Services, and click **Run (▶)**.
5. Enter your name & mobile number → tap **Send OTP** → enter the 6-digit OTP → verify that you land on **HomeScreen** and a new document appears in Firebase **Firestore → `users` collection**.

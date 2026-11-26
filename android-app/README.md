# Move Better Physio — Android (Firebase Phone OTP + Cloud Firestore)

Native Android app for **Move Better Physiotherapy Clinic** migrated completely from Supabase to **Firebase Authentication (Phone OTP)** and **Cloud Firestore**.

## Stack
- Kotlin, Jetpack Compose + Material 3, Navigation Compose, ViewModel + StateFlow
- **Firebase Authentication** (Phone Number SMS OTP + Auto-retrieval + Resend Timer)
- **Cloud Firestore** (`users/{uid}` collection storing `uid`, `phoneNumber`, `fullName`, `role`, `createdAt`, `lastLoginAt`)
- EncryptedSharedPreferences backed by Android Keystore for offline session caching
- minSdk 24, target/compile SDK 35

## Quick Setup
1. Create a Firebase project at https://console.firebase.google.com/
2. Add an Android app with package name: `com.movebetter.physio`
3. Add your Debug SHA-1 & SHA-256 keys in Firebase Project Settings.
4. Download `google-services.json` and place it inside `android-app/app/google-services.json`.
5. Enable **Authentication → Sign-in method → Phone** and **Firestore Database** in Firebase Console.
6. Open `android-app` in Android Studio, sync Gradle, and run on your phone/emulator.

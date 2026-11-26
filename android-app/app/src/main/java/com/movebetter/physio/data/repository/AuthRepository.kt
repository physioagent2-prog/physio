package com.movebetter.physio.data.repository

import android.app.Activity
import com.google.firebase.FirebaseException
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.movebetter.physio.data.storage.SessionStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

data class UserProfile(
    val uid: String,
    val phoneNumber: String,
    val fullName: String
)

sealed class OtpSendResult {
    data class CodeSent(
        val verificationId: String,
        val resendToken: PhoneAuthProvider.ForceResendingToken?
    ) : OtpSendResult()

    data class AutoVerified(val user: UserProfile) : OtpSendResult()
    data class Failure(val message: String) : OtpSendResult()
}

sealed class AuthResult {
    data class Success(val user: UserProfile) : AuthResult()
    data class Failure(val message: String) : AuthResult()
}

interface AuthGateway {
    fun sendOtp(
        phoneNumber: String,
        fullName: String,
        activity: Activity,
        resendToken: PhoneAuthProvider.ForceResendingToken?,
        onResult: (OtpSendResult) -> Unit
    )

    suspend fun verifyOtp(
        verificationId: String,
        otpCode: String,
        fullName: String
    ): AuthResult

    suspend fun restoreSession(): UserProfile?
    suspend fun logout()
}

class FirebaseAuthRepository(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    private val store: SessionStore
) : AuthGateway {

    override fun sendOtp(
        phoneNumber: String,
        fullName: String,
        activity: Activity,
        resendToken: PhoneAuthProvider.ForceResendingToken?,
        onResult: (OtpSendResult) -> Unit
    ) {
        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                // Auto-retrieval or instant verification on supported Android devices
                auth.signInWithCredential(credential)
                    .addOnSuccessListener { authResult ->
                        val firebaseUser = authResult.user
                        if (firebaseUser == null) {
                            onResult(OtpSendResult.Failure("Authentication succeeded, but user details were missing."))
                            return@addOnSuccessListener
                        }
                        val resolvedPhone = firebaseUser.phoneNumber ?: phoneNumber
                        syncUserToFirestore(
                            uid = firebaseUser.uid,
                            phoneNumber = resolvedPhone,
                            fullName = fullName,
                            onComplete = { profile ->
                                onResult(OtpSendResult.AutoVerified(profile))
                            },
                            onError = { msg ->
                                onResult(OtpSendResult.Failure(msg))
                            }
                        )
                    }
                    .addOnFailureListener { e ->
                        onResult(OtpSendResult.Failure(mapFirebaseError(e)))
                    }
            }

            override fun onVerificationFailed(e: FirebaseException) {
                onResult(OtpSendResult.Failure(mapFirebaseError(e)))
            }

            override fun onCodeSent(
                verificationId: String,
                token: PhoneAuthProvider.ForceResendingToken
            ) {
                onResult(OtpSendResult.CodeSent(verificationId, token))
            }
        }

        val optionsBuilder = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(phoneNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)

        if (resendToken != null) {
            optionsBuilder.setForceResendingToken(resendToken)
        }

        PhoneAuthProvider.verifyPhoneNumber(optionsBuilder.build())
    }

    override suspend fun verifyOtp(
        verificationId: String,
        otpCode: String,
        fullName: String
    ): AuthResult = withContext(Dispatchers.IO) {
        try {
            val credential = PhoneAuthProvider.getCredential(verificationId, otpCode.trim())
            val result = auth.signInWithCredential(credential).await()
            val firebaseUser = result.user
                ?: return@withContext AuthResult.Failure("Could not retrieve user profile after verification.")

            val phone = firebaseUser.phoneNumber.orEmpty()
            val profile = upsertUserDocument(firebaseUser.uid, phone, fullName)
            store.save(profile.uid, profile.phoneNumber, profile.fullName)
            AuthResult.Success(profile)
        } catch (e: Exception) {
            AuthResult.Failure(mapFirebaseError(e))
        }
    }

    override suspend fun restoreSession(): UserProfile? = withContext(Dispatchers.IO) {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            store.clear()
            return@withContext null
        }

        val cached = store.read()
        val phone = currentUser.phoneNumber ?: cached?.phoneNumber.orEmpty()

        return@withContext try {
            val doc = firestore.collection("users").document(currentUser.uid).get().await()
            val dbName = doc.getString("fullName").orEmpty()
            val resolvedName = dbName.ifBlank { cached?.fullName.orEmpty() }
            store.save(currentUser.uid, phone, resolvedName)
            UserProfile(currentUser.uid, phone, resolvedName)
        } catch (_: Exception) {
            // Fallback to encrypted local session if offline
            UserProfile(
                uid = currentUser.uid,
                phoneNumber = phone,
                fullName = cached?.fullName.orEmpty()
            )
        }
    }

    override suspend fun logout() = withContext(Dispatchers.IO) {
        try {
            auth.signOut()
        } finally {
            store.clear()
        }
    }

    private suspend fun upsertUserDocument(
        uid: String,
        phoneNumber: String,
        providedName: String
    ): UserProfile {
        val userRef = firestore.collection("users").document(uid)
        val snapshot = userRef.get().await()
        val existingName = snapshot.getString("fullName").orEmpty()
        val finalName = providedName.trim().ifBlank { existingName }

        val data = hashMapOf<String, Any>(
            "uid" to uid,
            "phoneNumber" to phoneNumber,
            "fullName" to finalName,
            "role" to (snapshot.getString("role") ?: "patient"),
            "lastLoginAt" to FieldValue.serverTimestamp()
        )
        if (!snapshot.exists()) {
            data["createdAt"] = FieldValue.serverTimestamp()
        }

        userRef.set(data, SetOptions.merge()).await()
        return UserProfile(uid = uid, phoneNumber = phoneNumber, fullName = finalName)
    }

    private fun syncUserToFirestore(
        uid: String,
        phoneNumber: String,
        fullName: String,
        onComplete: (UserProfile) -> Unit,
        onError: (String) -> Unit
    ) {
        val userRef = firestore.collection("users").document(uid)
        userRef.get()
            .addOnSuccessListener { snapshot ->
                val existingName = snapshot.getString("fullName").orEmpty()
                val finalName = fullName.trim().ifBlank { existingName }
                val data = hashMapOf<String, Any>(
                    "uid" to uid,
                    "phoneNumber" to phoneNumber,
                    "fullName" to finalName,
                    "role" to (snapshot.getString("role") ?: "patient"),
                    "lastLoginAt" to FieldValue.serverTimestamp()
                )
                if (!snapshot.exists()) {
                    data["createdAt"] = FieldValue.serverTimestamp()
                }
                userRef.set(data, SetOptions.merge())
                    .addOnSuccessListener {
                        store.save(uid, phoneNumber, finalName)
                        onComplete(UserProfile(uid, phoneNumber, finalName))
                    }
                    .addOnFailureListener { e ->
                        onError(mapFirebaseError(e))
                    }
            }
            .addOnFailureListener { e ->
                onError(mapFirebaseError(e))
            }
    }

    private fun mapFirebaseError(e: Exception): String {
        val msg = e.message.orEmpty().lowercase()
        return when {
            e is FirebaseAuthInvalidCredentialsException && msg.contains("verification code") ->
                "Invalid OTP entered. Please check the 6-digit code and try again."
            e is FirebaseAuthInvalidCredentialsException ->
                "Invalid phone number format. Include country code (e.g. +919876543210)."
            e is FirebaseTooManyRequestsException || msg.contains("too many requests") || msg.contains("quota") ->
                "Too many OTP requests from this device/number. Please wait a while and try again."
            e is FirebaseNetworkException || msg.contains("network") ->
                "No internet connection. Please check your network and try again."
            msg.contains("session-expired") || msg.contains("expired") ->
                "This OTP has expired. Tap 'Resend OTP' to request a new code."
            msg.contains("app-not-authorized") || msg.contains("sha-1") || msg.contains("missing-client-identifier") ->
                "Firebase verification failed. Ensure SHA-1 & SHA-256 fingerprints and google-services.json are configured in Firebase Console."
            else ->
                e.localizedMessage ?: "Authentication failed. Please try again."
        }
    }
}

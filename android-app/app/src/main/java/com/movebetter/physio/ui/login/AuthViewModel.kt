package com.movebetter.physio.ui.login

import androidx.lifecycle.ViewModel
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.UserProfileChangeRequest
import com.movebetter.physio.data.repository.AuthGateway
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class AuthUiState(
    val loading: Boolean = false,
    val busy: Boolean = false,
    val authenticated: Boolean = false,
    val fullName: String = "",
    val email: String = "",
    val phoneNumber: String = "",
    val error: String? = null,
    val notice: String? = null
)

class AuthViewModel(
    @Suppress("UNUSED_PARAMETER") private val repository: AuthGateway? = null
) : ViewModel() {

    private val auth: FirebaseAuth = FirebaseAuth.getInstance()

    private val _state = MutableStateFlow(buildInitialState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    private fun buildInitialState(): AuthUiState {
        val user = auth.currentUser
        return if (user != null) {
            val resolvedName = user.displayName?.takeIf { it.isNotBlank() }
                ?: user.email?.substringBefore("@")
                ?: "Doctor"
            AuthUiState(
                loading = false,
                authenticated = true,
                fullName = resolvedName,
                email = user.email ?: "",
                phoneNumber = user.phoneNumber ?: ""
            )
        } else {
            AuthUiState(loading = false, authenticated = false)
        }
    }

    fun signInWithEmail(email: String, password: String) {
        val cleanEmail = email.trim()
        if (cleanEmail.isBlank() || password.isBlank()) {
            _state.value = _state.value.copy(
                error = "Please enter both email and password.",
                notice = null
            )
            return
        }

        _state.value = _state.value.copy(busy = true, error = null, notice = null)

        auth.signInWithEmailAndPassword(cleanEmail, password)
            .addOnSuccessListener { result ->
                val user = result.user
                val resolvedName = user?.displayName?.takeIf { it.isNotBlank() }
                    ?: user?.email?.substringBefore("@")
                    ?: "Doctor"

                _state.value = AuthUiState(
                    loading = false,
                    busy = false,
                    authenticated = true,
                    fullName = resolvedName,
                    email = user?.email ?: cleanEmail,
                    phoneNumber = user?.phoneNumber ?: ""
                )
            }
            .addOnFailureListener { e ->
                _state.value = _state.value.copy(
                    busy = false,
                    error = e.localizedMessage ?: "Login failed. Check your email and password."
                )
            }
    }

    fun signUpWithEmail(fullName: String, email: String, password: String) {
        val cleanName = fullName.trim()
        val cleanEmail = email.trim()

        if (cleanName.isBlank()) {
            _state.value = _state.value.copy(error = "Please enter your full name.", notice = null)
            return
        }
        if (cleanEmail.isBlank() || password.length < 6) {
            _state.value = _state.value.copy(
                error = "Enter a valid email and a password of at least 6 characters.",
                notice = null
            )
            return
        }

        _state.value = _state.value.copy(busy = true, error = null, notice = null)

        auth.createUserWithEmailAndPassword(cleanEmail, password)
            .addOnSuccessListener { result ->
                val user = result.user
                val profileUpdates = UserProfileChangeRequest.Builder()
                    .setDisplayName(cleanName)
                    .build()

                user?.updateProfile(profileUpdates)?.addOnCompleteListener {
                    user.sendEmailVerification()
                    auth.signOut()
                    _state.value = AuthUiState(
                        loading = false,
                        busy = false,
                        authenticated = false,
                        notice = "Account created! Verification link sent to $cleanEmail. Verify and Sign In."
                    )
                }
            }
            .addOnFailureListener { e ->
                _state.value = _state.value.copy(
                    busy = false,
                    error = e.localizedMessage ?: "Failed to create account."
                )
            }
    }

    fun sendPasswordReset(email: String) {
        val cleanEmail = email.trim()
        if (cleanEmail.isBlank()) {
            _state.value = _state.value.copy(
                error = "Enter your email address first to reset password.",
                notice = null
            )
            return
        }

        _state.value = _state.value.copy(busy = true, error = null, notice = null)

        auth.sendPasswordResetEmail(cleanEmail)
            .addOnSuccessListener {
                _state.value = _state.value.copy(
                    busy = false,
                    notice = "Password reset link sent to $cleanEmail."
                )
            }
            .addOnFailureListener { e ->
                _state.value = _state.value.copy(
                    busy = false,
                    error = e.localizedMessage ?: "Could not send reset email."
                )
            }
    }

    fun clearMessages() {
        _state.value = _state.value.copy(error = null, notice = null)
    }

    fun logout() {
        auth.signOut()
        _state.value = AuthUiState(loading = false, authenticated = false)
    }
}
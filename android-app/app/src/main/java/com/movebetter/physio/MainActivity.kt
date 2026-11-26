package com.movebetter.physio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.movebetter.physio.data.repository.AuthGateway
import com.movebetter.physio.di.ServiceLocator
import com.movebetter.physio.ui.home.HomeScreen
import com.movebetter.physio.ui.login.AuthViewModel
import com.movebetter.physio.ui.login.LoginScreen
import com.movebetter.physio.ui.theme.MoveBetterTheme
import com.movebetter.physio.ui.theme.Navy
import com.movebetter.physio.ui.theme.SurfaceSoft

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = true
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightNavigationBars = true

        val repository = ServiceLocator.repository(applicationContext)
        setContent {
            MoveBetterTheme {
                val vm: AuthViewModel = viewModel(factory = AuthVmFactory(repository))
                val state by vm.state.collectAsState()
                val nav = rememberNavController()

                LaunchedEffect(state.loading, state.authenticated) {
                    if (!state.loading) {
                        val destination = if (state.authenticated) "home" else "login"
                        nav.navigate(destination) {
                            popUpTo(nav.graph.id) { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                }

                Surface(Modifier.fillMaxSize(), color = SurfaceSoft) {
                    if (state.loading) {
                        Box(
                            Modifier
                                .fillMaxSize()
                                .background(SurfaceSoft),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = Navy, strokeWidth = 3.dp)
                        }
                    } else {
                        NavHost(
                            navController = nav,
                            startDestination = if (state.authenticated) "home" else "login",
                            modifier = Modifier.fillMaxSize()
                        ) {
                            composable("login") {
                                LoginScreen(
                                    state = state,
                                    onSignIn = vm::signInWithEmail,
                                    onSignUp = vm::signUpWithEmail,
                                    onForgotPassword = vm::sendPasswordReset,
                                    onClear = vm::clearMessages
                                )
                            }
                            composable("home") {
                                HomeScreen(
                                    fullName = state.fullName,
                                    phoneNumber = state.email.ifBlank { state.phoneNumber },
                                    onLogout = vm::logout
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private class AuthVmFactory(private val repository: AuthGateway) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T =
        AuthViewModel(repository) as T
}
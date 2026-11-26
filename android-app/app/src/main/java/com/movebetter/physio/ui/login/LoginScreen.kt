package com.movebetter.physio.ui.login

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movebetter.physio.ui.components.GradientButton
import com.movebetter.physio.ui.components.LogoMark
import com.movebetter.physio.ui.theme.*

@Composable
fun LoginScreen(
    state: AuthUiState,
    onSignIn: (email: String, password: String) -> Unit,
    onSignUp: (fullName: String, email: String, password: String) -> Unit,
    onForgotPassword: (email: String) -> Unit,
    onClear: () -> Unit
) {
    var isSignUpMode by remember { mutableStateOf(false) }
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    val scroll = rememberScrollState()

    Box(
        Modifier
            .fillMaxSize()
            .background(SurfaceSoft)
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(scroll)
                .imePadding()
        ) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(275.dp)
                    .background(Brush.linearGradient(listOf(Navy, MidBlue, Cyan)))
            ) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .padding(start = 28.dp, end = 28.dp, top = 42.dp),
                    horizontalAlignment = Alignment.Start
                ) {
                    LogoMark()
                    Spacer(Modifier.height(20.dp))
                    Text("Move Better", color = White, fontSize = 30.sp, fontWeight = FontWeight.Bold)
                    Text("Physiotherapy Clinic", color = White, fontSize = 21.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(7.dp))
                    Text(
                        "Move Better. Live Better.",
                        color = White.copy(alpha = .85f),
                        fontSize = 14.sp,
                        letterSpacing = .3.sp
                    )
                }
                androidx.compose.foundation.Canvas(
                    Modifier
                        .fillMaxWidth()
                        .height(40.dp)
                        .align(Alignment.BottomCenter)
                ) {
                    val p = androidx.compose.ui.graphics.Path().apply {
                        moveTo(0f, size.height * .42f)
                        cubicTo(
                            size.width * .24f, size.height * 1.25f,
                            size.width * .62f, -size.height * .2f,
                            size.width, size.height * .48f
                        )
                        lineTo(size.width, size.height)
                        lineTo(0f, size.height)
                        close()
                    }
                    drawPath(p, SurfaceSoft)
                }
            }

            AnimatedVisibility(
                visible = true,
                enter = fadeIn() + slideInVertically(initialOffsetY = { it / 7 })
            ) {
                Card(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .offset(y = (-15).dp),
                    shape = RoundedCornerShape(26.dp),
                    colors = CardDefaults.cardColors(containerColor = White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 9.dp)
                ) {
                    Column(Modifier.padding(horizontal = 22.dp, vertical = 26.dp)) {
                        Text(
                            if (isSignUpMode) "Create Account" else "Welcome Back",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            color = Navy
                        )
                        Spacer(Modifier.height(5.dp))
                        Text(
                            if (isSignUpMode) "Register your clinic practitioner account."
                            else "Sign in with your registered email and password.",
                            color = Muted,
                            fontSize = 13.sp
                        )
                        Spacer(Modifier.height(20.dp))

                        if (isSignUpMode) {
                            OutlinedTextField(
                                value = fullName,
                                onValueChange = { fullName = it; onClear() },
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("Full Name") },
                                leadingIcon = { Icon(Icons.Default.Person, null, tint = MidBlue) },
                                singleLine = true,
                                shape = RoundedCornerShape(14.dp),
                                keyboardOptions = KeyboardOptions(
                                    capitalization = KeyboardCapitalization.Words,
                                    keyboardType = KeyboardType.Text
                                ),
                                colors = fieldColors(),
                                enabled = !state.busy
                            )
                            Spacer(Modifier.height(14.dp))
                        }

                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it; onClear() },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Email Address") },
                            leadingIcon = { Icon(Icons.Default.Email, null, tint = MidBlue) },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            colors = fieldColors(),
                            enabled = !state.busy
                        )
                        Spacer(Modifier.height(14.dp))

                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it; onClear() },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Password") },
                            leadingIcon = { Icon(Icons.Default.Lock, null, tint = MidBlue) },
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                        contentDescription = "Toggle password visibility",
                                        tint = Muted
                                    )
                                }
                            },
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            colors = fieldColors(),
                            enabled = !state.busy
                        )

                        if (!isSignUpMode) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.End
                            ) {
                                TextButton(
                                    onClick = { onForgotPassword(email) },
                                    enabled = !state.busy,
                                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        "Forgot Password?",
                                        color = MidBlue,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        } else {
                            Spacer(Modifier.height(12.dp))
                        }

                        if (state.error != null) {
                            Spacer(Modifier.height(6.dp))
                            Text(state.error, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                        }
                        if (state.notice != null) {
                            Spacer(Modifier.height(6.dp))
                            Text(state.notice, color = MidBlue, fontSize = 12.sp)
                        }

                        Spacer(Modifier.height(16.dp))
                        GradientButton(
                            text = if (isSignUpMode) "Sign Up" else "Sign In",
                            loading = state.busy,
                            enabled = email.isNotBlank() && password.isNotBlank() && (!isSignUpMode || fullName.isNotBlank()),
                            onClick = {
                                if (isSignUpMode) {
                                    onSignUp(fullName, email, password)
                                } else {
                                    onSignIn(email, password)
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(Modifier.height(12.dp))
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                if (isSignUpMode) "Already have an account?" else "Don't have an account?",
                                color = Muted,
                                fontSize = 13.sp
                            )
                            TextButton(
                                onClick = {
                                    isSignUpMode = !isSignUpMode
                                    onClear()
                                },
                                enabled = !state.busy
                            ) {
                                Text(
                                    if (isSignUpMode) "Sign In" else "Sign Up",
                                    color = MidBlue,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                            }
                        }

                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Secured by Firebase Authentication",
                            color = Muted,
                            fontSize = 11.sp,
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        )
                    }
                }
            }

            Text(
                "MOVE BETTER  •  LIVE BETTER",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 0.dp, bottom = 22.dp),
                color = Muted.copy(alpha = .75f),
                fontSize = 10.sp,
                letterSpacing = 1.5.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Cyan,
    focusedLabelColor = MidBlue,
    cursorColor = Cyan,
    unfocusedBorderColor = Color(0xFFD9E4EA),
    focusedContainerColor = White,
    unfocusedContainerColor = White
)
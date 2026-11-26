package com.movebetter.physio.ui.theme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
private val Scheme = lightColorScheme(primary = Navy, onPrimary = White, secondary = Cyan, onSecondary = Navy, background = SurfaceSoft, onBackground = Ink, surface = White, onSurface = Ink, error = androidx.compose.ui.graphics.Color(0xFFB3261E))
@Composable fun MoveBetterTheme(content: @Composable () -> Unit) { MaterialTheme(colorScheme = Scheme, typography = AppTypography, content = content) }

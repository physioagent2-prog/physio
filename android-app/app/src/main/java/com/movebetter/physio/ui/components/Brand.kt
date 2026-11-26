package com.movebetter.physio.ui.components
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.movebetter.physio.ui.theme.*
@Composable fun LogoMark(modifier: Modifier = Modifier, compact: Boolean = false) {
    Box(modifier.size(if (compact) 42.dp else 58.dp).background(Navy, RoundedCornerShape(if (compact) 12.dp else 17.dp)), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Text("MB", color = Cyan, fontSize = if (compact) 15.sp else 20.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 18.sp)
            Text("PT", color = White, fontSize = if (compact) 9.sp else 11.sp, fontWeight = FontWeight.Bold, lineHeight = 12.sp)
        }
    }
}
@Composable fun GradientButton(text: String, loading: Boolean, enabled: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    androidx.compose.material3.Button(onClick = onClick, enabled = enabled && !loading, modifier = modifier.height(56.dp), shape = RoundedCornerShape(16.dp), colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MidBlue, disabledContainerColor = MidBlue.copy(alpha = .5f)), contentPadding = PaddingValues(0.dp)) {
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Navy, MidBlue, Cyan)), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
            if (loading) androidx.compose.material3.CircularProgressIndicator(color = White, strokeWidth = 2.dp, modifier = Modifier.size(22.dp)) else Text(text, color = White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
    }
}

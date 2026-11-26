package com.movebetter.physio.data.storage

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

data class StoredUserSession(
    val uid: String,
    val phoneNumber: String,
    val fullName: String
)

class SessionStore(context: Context) {
    private val key = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "secure_firebase_session",
        key,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun read(): StoredUserSession? {
        val uid = prefs.getString("uid", null) ?: return null
        val phone = prefs.getString("phone", null) ?: return null
        val name = prefs.getString("name", "") ?: ""
        return StoredUserSession(uid, phone, name)
    }

    fun save(uid: String, phoneNumber: String, fullName: String) {
        prefs.edit()
            .putString("uid", uid)
            .putString("phone", phoneNumber)
            .putString("name", fullName)
            .apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }
}

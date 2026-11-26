package com.movebetter.physio.di

import android.content.Context
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.movebetter.physio.data.repository.AuthGateway
import com.movebetter.physio.data.repository.FirebaseAuthRepository
import com.movebetter.physio.data.storage.SessionStore

object ServiceLocator {
    fun repository(context: Context): AuthGateway {
        val auth = FirebaseAuth.getInstance()
        val firestore = FirebaseFirestore.getInstance()
        val store = SessionStore(context.applicationContext)
        return FirebaseAuthRepository(auth, firestore, store)
    }
}

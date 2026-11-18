package com.ysftech.elementblocks

import android.content.Context
import android.content.SharedPreferences

class GameStorage(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveData(key: String, jsonValue: String) {
        if (key.isBlank()) return
        prefs.edit().putString(key, jsonValue).apply()
    }

    fun loadData(key: String): String {
        if (key.isBlank()) return ""
        return prefs.getString(key, "") ?: ""
    }

    fun removeData(key: String) {
        if (key.isBlank()) return
        prefs.edit().remove(key).apply()
    }

    fun clearAll() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val PREFS_NAME = "element_blocks_game_storage"
    }
}

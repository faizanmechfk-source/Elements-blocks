package com.ysftech.elementblocks

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

data class SettingsState(
    val soundEnabled: Boolean = true,
    val musicEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
    val hapticsEnabled: Boolean = true
)

class GameSettings(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun load(): SettingsState {
        return SettingsState(
            soundEnabled = prefs.getBoolean(KEY_SOUND, true),
            musicEnabled = prefs.getBoolean(KEY_MUSIC, true),
            vibrationEnabled = prefs.getBoolean(KEY_VIBRATION, true),
            hapticsEnabled = prefs.getBoolean(KEY_HAPTICS, true)
        )
    }

    fun save(state: SettingsState) {
        prefs.edit()
            .putBoolean(KEY_SOUND, state.soundEnabled)
            .putBoolean(KEY_MUSIC, state.musicEnabled)
            .putBoolean(KEY_VIBRATION, state.vibrationEnabled)
            .putBoolean(KEY_HAPTICS, state.hapticsEnabled)
            .apply()
    }

    fun updateFromJson(jsonStr: String): SettingsState {
        return try {
            val obj = JSONObject(jsonStr)
            val current = load()
            val updated = SettingsState(
                soundEnabled = obj.optBoolean("soundEnabled", current.soundEnabled),
                musicEnabled = obj.optBoolean("musicEnabled", current.musicEnabled),
                vibrationEnabled = obj.optBoolean("vibrationEnabled", current.vibrationEnabled),
                hapticsEnabled = obj.optBoolean("hapticsEnabled", current.hapticsEnabled)
            )
            save(updated)
            updated
        } catch (_: Exception) {
            load()
        }
    }

    fun toJsonString(): String {
        val state = load()
        return JSONObject().apply {
            put("soundEnabled", state.soundEnabled)
            put("musicEnabled", state.musicEnabled)
            put("vibrationEnabled", state.vibrationEnabled)
            put("hapticsEnabled", state.hapticsEnabled)
        }.toString()
    }

    companion object {
        private const val PREFS_NAME = "element_blocks_settings"
        private const val KEY_SOUND = "sound_enabled"
        private const val KEY_MUSIC = "music_enabled"
        private const val KEY_VIBRATION = "vibration_enabled"
        private const val KEY_HAPTICS = "haptics_enabled"
    }
}

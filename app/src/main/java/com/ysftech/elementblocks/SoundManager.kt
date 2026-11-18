package com.ysftech.elementblocks

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

class SoundManager(
    context: Context,
    private val gameSettings: GameSettings
) {
    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        manager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    fun triggerVibration(type: String) {
        val settings = gameSettings.load()
        val isHapticEvent = type == "tap" || type == "pickup" || type == "place"
        if (isHapticEvent && !settings.hapticsEnabled) return
        if (!isHapticEvent && !settings.vibrationEnabled) return

        val vib = vibrator ?: return
        if (!vib.hasVibrator()) return

        try {
            when (type) {
                "tap" -> vibrateOneShot(vib, 12L, 70)
                "pickup" -> vibrateOneShot(vib, 16L, 95)
                "place" -> vibrateOneShot(vib, 22L, 120)
                "invalid" -> vibrateWaveform(vib, longArrayOf(0, 28, 35, 28), intArrayOf(0, 150, 0, 150))
                "clear" -> vibrateOneShot(vib, 45L, 190)
                "combo" -> vibrateWaveform(vib, longArrayOf(0, 35, 30, 55), intArrayOf(0, 180, 0, 240))
                "explosion" -> vibrateWaveform(vib, longArrayOf(0, 60, 25, 90), intArrayOf(0, 240, 0, 255))
                "lightning" -> vibrateWaveform(vib, longArrayOf(0, 25, 20, 45, 20, 35), intArrayOf(0, 200, 0, 255, 0, 180))
                "achievement" -> vibrateWaveform(vib, longArrayOf(0, 30, 40, 30, 40, 60), intArrayOf(0, 160, 0, 200, 0, 255))
                "gameover" -> vibrateWaveform(vib, longArrayOf(0, 70, 50, 110), intArrayOf(0, 180, 0, 140))
                else -> vibrateOneShot(vib, 18L, 100)
            }
        } catch (_: SecurityException) {
            // Gracefully ignore if device blocks vibration
        } catch (_: Exception) {
            // Gracefully ignore hardware edge cases
        }
    }

    private fun vibrateOneShot(vib: Vibrator, durationMs: Long, amplitude: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vib.vibrate(VibrationEffect.createOneShot(durationMs, amplitude.coerceIn(1, 255)))
        } else {
            @Suppress("DEPRECATION")
            vib.vibrate(durationMs)
        }
    }

    private fun vibrateWaveform(vib: Vibrator, timings: LongArray, amplitudes: IntArray) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vib.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
        } else {
            @Suppress("DEPRECATION")
            vib.vibrate(timings, -1)
        }
    }
}

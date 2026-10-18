package dev.rohitsingh.bol.keyboard

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import android.inputmethodservice.InputMethodService
import android.widget.Button
import android.widget.TextView
import dev.rohitsingh.bol.R
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

class BolInputMethodService : InputMethodService() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val recording = AtomicBoolean(false)
    private var audioRecord: AudioRecord? = null
    private var statusView: TextView? = null
    private var micButton: Button? = null

    override fun onCreateInputView(): android.view.View {
        val view = layoutInflater.inflate(R.layout.bol_keyboard, null)
        statusView = view.findViewById(R.id.bol_status)
        micButton = view.findViewById(R.id.bol_mic)
        micButton?.setOnClickListener {
            if (recording.get()) {
                recording.set(false)
            } else {
                startRecording()
            }
        }
        setStatus("Tap Speak. Bol inserts the text into this field.")
        return view
    }

    override fun onDestroy() {
        recording.set(false)
        audioRecord?.release()
        audioRecord = null
        super.onDestroy()
    }

    private fun startRecording() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            setStatus("Open Bol and allow the microphone, then come back.")
            openHostApp()
            return
        }
        val server = readServerUrl()
        if (server == null) {
            setStatus("Open Bol once so this keyboard knows your server address.")
            openHostApp()
            return
        }

        val sampleRate = 16000
        val channel = AudioFormat.CHANNEL_IN_MONO
        val encoding = AudioFormat.ENCODING_PCM_16BIT
        val minBuffer = AudioRecord.getMinBufferSize(sampleRate, channel, encoding)
        if (minBuffer <= 0) {
            setStatus("This phone could not open the microphone.")
            return
        }

        val recorder = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            sampleRate,
            channel,
            encoding,
            minBuffer * 2,
        )
        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            recorder.release()
            setStatus("This phone could not open the microphone.")
            return
        }

        audioRecord = recorder
        recording.set(true)
        micButton?.text = "Stop"
        setStatus("Listening…")
        recorder.startRecording()

        Thread {
            val pcm = ByteArrayOutputStream()
            val buffer = ByteArray(minBuffer)
            val maxBytes = sampleRate * 2 * 30
            while (recording.get() && pcm.size() < maxBytes) {
                val read = recorder.read(buffer, 0, buffer.size)
                if (read > 0) {
                    pcm.write(buffer, 0, read)
                }
            }
            try {
                recorder.stop()
            } catch (_: IllegalStateException) {
            }
            recorder.release()
            if (audioRecord === recorder) {
                audioRecord = null
            }
            val wav = wavBytes(pcm.toByteArray(), sampleRate)
            mainHandler.post {
                micButton?.text = "Speak"
                setStatus("Transcribing…")
            }
            try {
                val text = postAudio(server, wav)
                mainHandler.post { insertText(text) }
            } catch (error: Exception) {
                mainHandler.post {
                    setStatus(error.message ?: "Transcription failed.")
                }
            }
        }.start()
    }

    private fun insertText(text: String) {
        if (text.isBlank()) {
            setStatus("No words came back. Try again.")
            return
        }
        val connection = currentInputConnection
        if (connection == null) {
            setStatus("Tap a text field, then speak again.")
            return
        }
        connection.commitText(text, 1)
        setStatus("Inserted.")
    }

    private fun readServerUrl(): String? {
        val file = File(filesDir, "bol-server-url.txt")
        if (!file.exists()) {
            return null
        }
        val value = file.readText().trim().trimEnd('/')
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            return null
        }
        return value
    }

    private fun postAudio(server: String, wav: ByteArray): String {
        val connection = (URL("$server/v1/transcribe").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            connectTimeout = 15_000
            readTimeout = 30_000
            setRequestProperty("Content-Type", "audio/wav")
        }
        connection.outputStream.use { it.write(wav) }
        val code = connection.responseCode
        val body = (if (code in 200..299) connection.inputStream else connection.errorStream)
            .bufferedReader()
            .use { it.readText() }
        val json = JSONObject(body)
        if (code !in 200..299) {
            throw IllegalStateException(json.optString("error", "Transcription failed."))
        }
        return json.optString("text")
    }

    private fun openHostApp() {
        val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(intent)
    }

    private fun setStatus(message: String) {
        statusView?.text = message
    }

    private fun wavBytes(pcm: ByteArray, sampleRate: Int): ByteArray {
        val header = ByteArray(44)
        val total = 36 + pcm.size
        header[0] = 'R'.code.toByte()
        header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte()
        header[3] = 'F'.code.toByte()
        writeInt(header, 4, total)
        header[8] = 'W'.code.toByte()
        header[9] = 'A'.code.toByte()
        header[10] = 'V'.code.toByte()
        header[11] = 'E'.code.toByte()
        header[12] = 'f'.code.toByte()
        header[13] = 'm'.code.toByte()
        header[14] = 't'.code.toByte()
        header[15] = ' '.code.toByte()
        writeInt(header, 16, 16)
        header[20] = 1
        header[21] = 0
        header[22] = 1
        header[23] = 0
        writeInt(header, 24, sampleRate)
        writeInt(header, 28, sampleRate * 2)
        header[32] = 2
        header[33] = 0
        header[34] = 16
        header[35] = 0
        header[36] = 'd'.code.toByte()
        header[37] = 'a'.code.toByte()
        header[38] = 't'.code.toByte()
        header[39] = 'a'.code.toByte()
        writeInt(header, 40, pcm.size)
        return header + pcm
    }

    private fun writeInt(target: ByteArray, offset: Int, value: Int) {
        target[offset] = (value and 0xff).toByte()
        target[offset + 1] = (value shr 8 and 0xff).toByte()
        target[offset + 2] = (value shr 16 and 0xff).toByte()
        target[offset + 3] = (value shr 24 and 0xff).toByte()
    }
}

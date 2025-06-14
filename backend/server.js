// FINAL DEPLOYMENT VERSION of server.js
console.log("!!! --- V3: DEPLOYMENT READY SERVER CODE --- !!!");

const express = require('express');
const cors = require('cors');
const { SpeechClient } = require('@google-cloud/speech'); // Only STT client is needed now
const formidable = require('formidable');
const fs = require('fs');
const { Buffer } = require('buffer'); // Explicitly require Buffer

const app = express();
const port = process.env.PORT || 3000;

// Initialize STT client (it will use service account credentials)
const sttClient = new SpeechClient();

// --- DYNAMIC CORS CONFIGURATION ---
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

// --- TEXT-TO-SPEECH ENDPOINT (using fetch and API Key) ---
app.post('/synthesize-speech', async (req, res) => {
  const { text, lang } = req.body;

  if (!text || !lang) {
    return res.status(400).send('Text and language are required.');
  }

  const request = {
    input: { text: text },
    voice: { languageCode: lang, ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    // We use the TTS REST API with an API Key stored in environment variables
    const ttsResponse = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_CLOUD_TTS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      return res.status(ttsResponse.status).send(`Google Cloud TTS API Error: ${errorText}`);
    }

    const responseData = await ttsResponse.json();
    const audioBuffer = Buffer.from(responseData.audioContent, 'base64');
    res.set('Content-Type', 'audio/mpeg').send(audioBuffer);

  } catch (error) {
    console.error('Backend TTS: Server error:', error);
    res.status(500).send('Internal server error during speech synthesis.');
  }
});

// --- SPEECH-TO-TEXT ENDPOINT (using Node SDK and Service Account) ---
app.post('/transcribe-speech', async (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
        // ... (your existing /transcribe-speech logic is perfect, no changes needed here) ...
        if (err) {
            console.error('Form parsing error:', err);
            return res.status(400).send('Invalid form data.');
        }

        try {
            const audioFile = files.audio?.[0];
            const lang = fields.lang?.[0];

            if (!audioFile) return res.status(400).send('No audio file provided.');
            if (!lang) return res.status(400).send('Language code not provided.');

            const audioBytes = await fs.promises.readFile(audioFile.filepath);

            const request = {
                config: {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: 48000,
                    languageCode: lang,
                    enableAutomaticPunctuation: true
                },
                audio: {
                    content: audioBytes.toString('base64')
                }
            };

            const [response] = await sttClient.recognize(request);
            const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');
            res.json({ transcript: transcription });
        } catch (error) {
            console.error('Backend STT: Server error during transcription:', error);
            res.status(500).send(`Internal server error during transcription: ${error.message}`);
        } finally {
            const tempFilePath = files?.audio?.[0]?.filepath;
            if (tempFilePath) {
                fs.promises.unlink(tempFilePath).catch(e => console.error("Error deleting temp file:", e));
            }
        }
    });
});

app.listen(port, () => {
  console.log(`✅ Backend server listening at http://localhost:${port}`);
});
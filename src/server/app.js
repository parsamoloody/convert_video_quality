const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Serve converted videos from the 'converted_videos' directory
// app.use('/videos', express.static(path.join(__dirname, 'converted_videos')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads/" });

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Track conversion progress
let conversionProgress = {};

// Simulate upload progress (since real-time upload progress tracking is complex)
function getUploadProgress(folderName) {
  return (
    conversionProgress[folderName] || {
      upload: 0,
      720: { progress: 0 },
      480: { progress: 0 },
    }
  );
}
app.post("/upload", upload.single("videoFile"), (req, res) => {
  const folderName = req.body.folderName;
  const videoPath = req.file.path;
  const folderPath = path.join(__dirname, "../result", folderName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const uploadedVideoPath = path.join(
    folderPath,
    `${Date.now()}video_1080p.mp4`
  );
  const output720p = path.join(folderPath, `${Date.now()}video_720p.mp4`);
  const output480p = path.join(folderPath, `${Date.now()}video_480p.mp4`);

  fs.renameSync(videoPath, uploadedVideoPath);

  // Store initial progress
  conversionProgress[folderName] = {
    upload: 100,
    720: { progress: 0 },
    480: { progress: 0 },
  };
  //    720
  ffmpeg(uploadedVideoPath)
    .output(output720p)
    .videoCodec("libx264")
    .size("1280x720")
    .on("progress", function (progress) {
      conversionProgress[folderName][720].progress = Math.round(
        progress.percent
      );
    })
    .on("end", function () {
      conversionProgress[folderName][720].progress = 100;
    })
    .run();

  //    480
  ffmpeg(uploadedVideoPath)
    .output(output480p)
    .videoCodec("libx264")
    .size("854x480")
    .on("progress", function (progress) {
      conversionProgress[folderName][480].progress = Math.round(
        progress.percent
      );
    })
    .on("end", function () {
      conversionProgress[folderName][480].progress = 100;
    })
    .run();

  res.send(`
        Video upload and conversion started. 
        
    `);
});

app.get("/progress/:folderName", (req, res) => {
  const folderName = req.params.folderName;
  res.json(getUploadProgress(folderName));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

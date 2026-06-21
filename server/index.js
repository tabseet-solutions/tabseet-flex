import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRoots } from "./lib/library.js";
import { cleanupOrphanedFlips } from "./lib/media.js";
import directoriesRouter from "./routes/directories.js";
import browseRouter from "./routes/browse.js";
import libraryRouter from "./routes/library.js";
import videoRouter from "./routes/video.js";
import progressRouter from "./routes/progress.js";
import flipsRouter from "./routes/flips.js";
import duplicatesRouter from "./routes/duplicates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4400;

const app = express();
app.use(express.json());

app.use("/api/directories", directoriesRouter);
app.use("/api/browse", browseRouter);
app.use("/api/library", libraryRouter);
app.use("/api/video", videoRouter);
app.use("/api/progress", progressRouter);
app.use("/api/flips", flipsRouter);
app.use("/api/duplicates", duplicatesRouter);

const webDist = path.join(__dirname, "..", "web", "dist");
app.use(express.static(webDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(webDist, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

await cleanupOrphanedFlips((await getRoots()).map((r) => r.path));

app.listen(PORT, () => {
  console.log(`Tabseet Flex listening on port ${PORT}`);
});

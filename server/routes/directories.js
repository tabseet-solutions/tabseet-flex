import { Router } from "express";
import { getRoots, addRoot, removeRoot } from "../lib/library.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await getRoots());
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { path: dirPath } = req.body || {};
    if (!dirPath) return res.status(400).json({ error: "path is required" });
    res.json(await addRoot(dirPath));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/", async (req, res, next) => {
  try {
    const dirPath = req.query.path;
    if (!dirPath) return res.status(400).json({ error: "path is required" });
    res.json(await removeRoot(String(dirPath)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

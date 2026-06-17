import { Router } from "express";
import { browse } from "../lib/library.js";
import { MEDIA_BASE } from "../lib/paths.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const target = req.query.path ? String(req.query.path) : MEDIA_BASE;
    res.json(await browse(target));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

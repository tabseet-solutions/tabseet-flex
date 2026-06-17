import { Router } from "express";
import { getProgress, setProgress } from "../lib/library.js";

const router = Router();

router.get("/:id", async (req, res, next) => {
  try {
    res.json(await getProgress(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { position, duration } = req.body || {};
    if (typeof position !== "number" || typeof duration !== "number") {
      return res.status(400).json({ error: "position and duration must be numbers" });
    }
    await setProgress(req.params.id, position, duration);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

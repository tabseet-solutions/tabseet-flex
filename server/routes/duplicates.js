import { Router } from "express";
import { findDuplicates, resolveDuplicate } from "../lib/duplicates.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await findDuplicates());
  } catch (err) {
    next(err);
  }
});

router.post("/resolve", async (req, res, next) => {
  try {
    const { keepId, deleteIds } = req.body || {};
    res.json(await resolveDuplicate(keepId, deleteIds));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

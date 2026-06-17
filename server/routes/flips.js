import { Router } from "express";
import { listFlipJobs } from "../lib/media.js";

const router = Router();

router.get("/", (req, res) => {
  res.json(listFlipJobs());
});

export default router;

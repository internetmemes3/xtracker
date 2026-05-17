import { Router, Request, Response } from "express";
import * as rules from "./rules";
import { getStreamStatus } from "./stream";
import { supabase } from "./supabase";

export const router = Router();

// ── Accounts ────────────────────────────────────────────────────────────

router.get("/accounts", async (_req: Request, res: Response) => {
  try {
    const accounts = await rules.listAccounts();
    res.json({ data: accounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/accounts", async (req: Request, res: Response) => {
  try {
    const { username, keywords } = req.body;
    if (!username || typeof username !== "string") {
      res.status(400).json({ error: "username is required" });
      return;
    }
    const account = await rules.addAccount(
      username,
      Array.isArray(keywords) ? keywords : []
    );
    res.status(201).json({ data: account });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/accounts/:id", async (req: Request, res: Response) => {
  try {
    await rules.removeAccount(req.params.id as string);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/accounts/:id/keywords", async (req: Request, res: Response) => {
  try {
    const { keywords } = req.body;
    if (!Array.isArray(keywords)) {
      res.status(400).json({ error: "keywords must be an array" });
      return;
    }
    const account = await rules.updateKeywords(req.params.id as string, keywords);
    res.json({ data: account });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Rules (live from X API) ─────────────────────────────────────────────

router.get("/rules", async (_req: Request, res: Response) => {
  try {
    const activeRules = await rules.getActiveRules();
    res.json({ data: activeRules });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Posts ────────────────────────────────────────────────────────────────

router.get("/posts", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stream Status ───────────────────────────────────────────────────────

router.get("/stream/status", (_req: Request, res: Response) => {
  res.json({ data: getStreamStatus() });
});

// ── Stream Logs ─────────────────────────────────────────────────────────

router.get("/stream/logs", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const { data, error } = await supabase
      .from("stream_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

"use strict";

const router = require("express").Router();
const axios = require("axios");
const db = require("../../db/index");
const discord = require("../../components/tools/discord");

const stmtGetAll = db.prepare("SELECT key, value, updated_at FROM settings");
const stmtGet = db.prepare("SELECT key, value, updated_at FROM settings WHERE key = ?");
const stmtUpsert = db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES (@key, @value, strftime('%s','now'))
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = strftime('%s','now')
`);

const providers = require("../../components/providers");

// GET /api/settings
router.get("/", (_req, res) => {
    const rows = stmtGetAll.all();
    const settings = {};
    for (const row of rows) {
        settings[row.key] = row.value;
    }
    res.json({
        settings,
        updated_at: rows.length ? Math.max(...rows.map((r) => r.updated_at)) : null,
    });
});

// GET /api/settings/providers
router.get("/providers", (_req, res) => {
    res.json({
        providers: providers.listProviders(),
        active: providers.getActiveProviderName(),
    });
});

// PATCH /api/settings or POST /api/settings
const updateSettingsHandler = (req, res) => {
    const updates = req.body;
    if (!updates || typeof updates !== "object") {
        return res.status(400).json({ error: "Body must be an object with key-value settings" });
    }

    const allowedKeys = [
        "default_provider",
        "llm_provider",
        "ollama_base_url",
        "default_model",
        "deepseek_api_key",
        "deepseek_base_url",
        "deepseek_model",
        "discord_webhook_url",
        "searxng_url",
        "search_provider",
        "deep_research_enabled",
        "agent_mode_enabled",
        "system_prompt",
        "brain_enabled",
    ];

    const updatedKeys = [];
    const runTransaction = db.transaction(() => {
        for (const [key, value] of Object.entries(updates)) {
            if (allowedKeys.includes(key)) {
                stmtUpsert.run({ key, value: String(value) });
                updatedKeys.push(key);
            }
        }
    });

    runTransaction();

    // Return new merged state
    const rows = stmtGetAll.all();
    const settings = {};
    for (const row of rows) {
        settings[row.key] = row.value;
    }

    res.json({ success: true, updatedKeys, settings });
};

router.patch("/", updateSettingsHandler);
router.post("/", updateSettingsHandler);

// POST /api/settings/test-ollama
router.post("/test-ollama", async (req, res) => {
    try {
        const result = await providers.testProvider("ollama", req.body);
        res.json(result);
    } catch (err) {
        res.status(502).json({
            ok: false,
            url: req.body?.url,
            error: err.message,
        });
    }
});

// POST /api/settings/test-deepseek
router.post("/test-deepseek", async (req, res) => {
    try {
        const result = await providers.testProvider("deepseek", req.body);
        res.json(result);
    } catch (err) {
        res.status(502).json({
            ok: false,
            error: err.message,
        });
    }
});

// POST /api/settings/test-discord
router.post("/test-discord", async (req, res) => {
    const webhookUrl = req.body.webhookUrl;
    try {
        await discord.sendNotification({
            webhookUrl,
            title: "Marnie Test Notification",
            body: "Your Discord webhook has been successfully configured and verified in Marnie AI Workspace!",
            level: "success",
            username: "Marnie System",
        });
        res.json({ ok: true, message: "Test alert sent successfully to Discord!" });
    } catch (err) {
        res.status(err.status || 500).json({ ok: false, error: err.message });
    }
});

module.exports = router;

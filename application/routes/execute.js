const { Router } = require('express');
const { runCode } = require('../services/codeRunner');
const Snippet = require('../models/Snippet');
const { executionLimiter } = require('../middleware/rateLimiter');

const router = Router();

/**
 * POST /api/execute
 * Body: { code: string, snippetId?: string }
 *
 * Executes the code in a sandboxed VM and returns the captured output.
 */
router.post('/', executionLimiter, (req, res, next) => {
  try {
    const { code, snippetId } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "code" field.' });
    }

    if (code.length > 50_000) {
      return res.status(400).json({ error: 'Code too large (max 50 KB).' });
    }

    const result = runCode(code);

    // Persist execution log
    Snippet.logExecution({
      snippetId: snippetId || null,
      code,
      output: result.output.join('\n'),
      error: result.error,
      durationMs: result.durationMs,
    });

    // Bump the snippet's run counter
    if (snippetId) {
      Snippet.incrementRunCount(snippetId);
    }

    res.json({
      success: !result.error,
      output: result.output,
      error: result.error,
      durationMs: result.durationMs,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

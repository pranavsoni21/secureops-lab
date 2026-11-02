const { Router } = require('express');
const Snippet = require('../models/Snippet');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = Router();
router.use(apiLimiter);

// ---- List / Search --------------------------------------------------------
router.get('/', (req, res, next) => {
  try {
    const { search, tag, favorites, sortBy, order } = req.query;
    const snippets = Snippet.findAll({
      search,
      tag,
      favoritesOnly: favorites === 'true',
      sortBy,
      order,
    });
    res.json(snippets);
  } catch (err) {
    next(err);
  }
});

// ---- Stats ----------------------------------------------------------------
router.get('/stats', (_req, res, next) => {
  try {
    res.json(Snippet.getStats());
  } catch (err) {
    next(err);
  }
});

// ---- Single snippet -------------------------------------------------------
router.get('/:id', (req, res, next) => {
  try {
    const snippet = Snippet.findById(req.params.id);
    if (!snippet) return res.status(404).json({ error: 'Snippet not found.' });
    res.json(snippet);
  } catch (err) {
    next(err);
  }
});

// ---- Execution history for a snippet --------------------------------------
router.get('/:id/history', (req, res, next) => {
  try {
    const history = Snippet.getExecutionHistory(req.params.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// ---- Create ---------------------------------------------------------------
router.post('/', (req, res, next) => {
  try {
    const { title, description, code, language, tags } = req.body;
    if (!title || !code) {
      return res.status(400).json({ error: '"title" and "code" are required.' });
    }
    const snippet = Snippet.create({ title, description, code, language, tags });
    res.status(201).json(snippet);
  } catch (err) {
    next(err);
  }
});

// ---- Update ---------------------------------------------------------------
router.put('/:id', (req, res, next) => {
  try {
    const existing = Snippet.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Snippet not found.' });
    const updated = Snippet.update(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ---- Toggle favorite ------------------------------------------------------
router.patch('/:id/favorite', (req, res, next) => {
  try {
    const updated = Snippet.toggleFavorite(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Snippet not found.' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ---- Delete ---------------------------------------------------------------
router.delete('/:id', (req, res, next) => {
  try {
    const deleted = Snippet.delete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Snippet not found.' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

import { pool } from '../db/index.js';
import { validationResult } from 'express-validator';

export async function getBudgets(req, res) {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const { rows } = await pool.query(
      'SELECT * FROM budgets WHERE user_id=$1 AND month=$2',
      [req.userId, month]
    );
    res.json({ budgets: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function upsertBudget(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { category, amount, month } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO budgets (user_id, category, amount, month)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, category, month)
       DO UPDATE SET amount = EXCLUDED.amount
       RETURNING *`,
      [req.userId, category, amount, month]
    );
    res.json({ budget: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteBudget(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM budgets WHERE id=$1 AND user_id=$2',
      [id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Budget not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

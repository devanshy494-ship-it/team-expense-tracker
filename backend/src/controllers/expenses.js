import { pool } from '../db/index.js';
import { validationResult } from 'express-validator';

export async function getExpenses(req, res) {
  const { month, category } = req.query;
  try {
    let query = 'SELECT * FROM expenses WHERE user_id = $1';
    const params = [req.userId];
    let idx = 2;

    if (month) {
      query += ` AND to_char(date, 'YYYY-MM') = $${idx++}`;
      params.push(month);
    }
    if (category) {
      query += ` AND category = $${idx++}`;
      params.push(category);
    }
    query += ' ORDER BY date DESC, created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json({ expenses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addExpense(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, amount, category, date, note } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO expenses (user_id, name, amount, category, date, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.userId, name.trim(), amount, category, date, note?.trim() || '']
    );
    res.status(201).json({ expense: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateExpense(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id } = req.params;
  const { name, amount, category, date, note } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE expenses SET name=$1, amount=$2, category=$3, date=$4, note=$5
       WHERE id=$6 AND user_id=$7 RETURNING *`,
      [name.trim(), amount, category, date, note?.trim() || '', id, req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Expense not found' });
    res.json({ expense: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteExpense(req, res) {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM expenses WHERE id=$1 AND user_id=$2',
      [id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStats(req, res) {
  const { month } = req.query;
  const monthStr = month || new Date().toISOString().slice(0, 7);
  try {
    const [totals, monthly, categoryBreakdown, last6] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE user_id=$1', [req.userId]),
      pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id=$1 AND to_char(date,'YYYY-MM')=$2`, [req.userId, monthStr]),
      pool.query(`SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id=$1 AND to_char(date,'YYYY-MM')=$2 GROUP BY category ORDER BY total DESC`, [req.userId, monthStr]),
      pool.query(`SELECT to_char(date,'YYYY-MM') as month, COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id=$1 AND date >= NOW() - INTERVAL '6 months' GROUP BY month ORDER BY month ASC`, [req.userId]),
    ]);

    res.json({
      allTime: { total: parseFloat(totals.rows[0].total), count: parseInt(totals.rows[0].count) },
      thisMonth: { total: parseFloat(monthly.rows[0].total), month: monthStr },
      categoryBreakdown: categoryBreakdown.rows,
      last6Months: last6.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function exportCSV(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT name, amount, category, date, note FROM expenses WHERE user_id=$1 ORDER BY date DESC',
      [req.userId]
    );
    const header = 'Name,Amount,Category,Date,Note\n';
    const csv = header + rows.map(r =>
      `"${r.name.replace(/"/g, '""')}",${r.amount},"${r.category}","${r.date}","${(r.note||'').replace(/"/g,'""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

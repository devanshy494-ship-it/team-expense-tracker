import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import styles from './Dashboard.module.css';

const CATS = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];
const CAT_COLORS = {
  Food: '#ff6b6b', Transport: '#72c2ff', Shopping: '#ff72c2',
  Bills: '#ffc272', Entertainment: '#c272ff', Other: '#72ffc2'
};
const CAT_EMOJI = {
  Food: '🍔', Transport: '🚗', Shopping: '🛍️',
  Bills: '💡', Entertainment: '🎬', Other: '📦'
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: 'Food', amount: '' });
  const [form, setForm] = useState({ name: '', amount: '', category: 'Food', date: format(new Date(), 'yyyy-MM-dd'), note: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Midnight date reset
  useEffect(() => {
    const scheduleReset = () => {
      const n = new Date();
      const ms = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n;
      return setTimeout(() => {
        setForm(f => ({ ...f, date: format(new Date(), 'yyyy-MM-dd') }));
        scheduleReset();
      }, ms);
    };
    const t = scheduleReset();
    return () => clearTimeout(t);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [expRes, statsRes, budgetRes] = await Promise.all([
        api.get('/expenses', { params: { month } }),
        api.get('/expenses/stats', { params: { month } }),
        api.get('/budgets', { params: { month } }),
      ]);
      setExpenses(expRes.data.expenses);
      setStats(statsRes.data);
      setBudgets(budgetRes.data.budgets);
    } catch (err) {
      showToast('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) return setFormError('Name is required');
    if (!form.amount || +form.amount <= 0) return setFormError('Enter a valid amount');
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, { ...form, amount: +form.amount });
        showToast('Expense updated');
        setEditingId(null);
      } else {
        await api.post('/expenses', { ...form, amount: +form.amount });
        showToast('Expense added');
      }
      setForm({ name: '', amount: '', category: 'Food', date: format(new Date(), 'yyyy-MM-dd'), note: '' });
      fetchAll();
    } catch (err) {
      setFormError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/expenses/${id}`);
      showToast('Removed');
      fetchAll();
    } catch { showToast('Failed to delete'); }
  }

  function startEdit(exp) {
    setEditingId(exp.id);
    setForm({ name: exp.name, amount: exp.amount, category: exp.category, date: exp.date.slice(0, 10), note: exp.note || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleExport() {
    try {
      const res = await api.get('/expenses/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'expenses.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('Export failed'); }
  }

  async function handleUpsertBudget(e) {
    e.preventDefault();
    try {
      await api.post('/budgets', { ...budgetForm, amount: +budgetForm.amount, month });
      showToast('Budget saved');
      setShowBudgetModal(false);
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed');
    }
  }

  async function handleDeleteBudget(id) {
    try {
      await api.delete(`/budgets/${id}`);
      fetchAll();
      showToast('Budget removed');
    } catch { showToast('Failed'); }
  }

  // Filtered + sorted list
  const filtered = expenses
    .filter(e => filter === 'All' || e.category === filter)
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    });

  const getBudgetForCat = (cat) => budgets.find(b => b.category === cat);
  const getSpentForCat = (cat) => {
    if (!stats) return 0;
    const row = stats.categoryBreakdown?.find(r => r.category === cat);
    return row ? parseFloat(row.total) : 0;
  };

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadSpinner} />
    </div>
  );

  return (
    <div className={styles.wrap}>
      {/* Topbar */}
      <header className={styles.header}>
        <div className={styles.logo}>Expense<span>IQ</span></div>
        <div className={styles.headerRight}>
          <div className={styles.clock}>
            <span className={styles.clockDate}>{format(now, 'EEE, dd MMM yyyy')}</span>
            <span className={styles.clockTime}>{format(now, 'HH:mm:ss')}</span>
          </div>
          <button className={styles.iconBtn} onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <div className={styles.userChip}>
            <span className={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</span>
            <span className={styles.userName}>{user?.name}</span>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </header>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Total all-time</div>
          <div className={styles.statVal}>${stats?.allTime?.total?.toFixed(2) || '0.00'}</div>
          <div className={styles.statSub}>{stats?.allTime?.count || 0} expenses</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>
            {format(now, 'MMMM yyyy')}
          </div>
          <div className={styles.statVal}>${stats?.thisMonth?.total?.toFixed(2) || '0.00'}</div>
          <div className={styles.statSub}>{format(now, 'EEEE, dd MMM · HH:mm')}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Top category</div>
          <div className={styles.statVal} style={{ fontSize: '18px' }}>
            {stats?.categoryBreakdown?.[0]
              ? `${CAT_EMOJI[stats.categoryBreakdown[0].category]} ${stats.categoryBreakdown[0].category}`
              : '—'}
          </div>
          <div className={styles.statSub}>
            {stats?.categoryBreakdown?.[0] ? `$${parseFloat(stats.categoryBreakdown[0].total).toFixed(2)} spent` : ''}
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Avg per expense</div>
          <div className={styles.statVal}>
            ${stats?.allTime?.count ? (stats.allTime.total / stats.allTime.count).toFixed(2) : '0.00'}
          </div>
          <div className={styles.statSub}>average</div>
        </div>
      </div>

      <div className={styles.cols}>
        {/* Left column */}
        <div className={styles.leftCol}>
          {/* Add/Edit form */}
          <div className={styles.panel}>
            <div className={styles.panelTitle}>
              {editingId ? '✏ Edit expense' : '+ Add expense'}
              {editingId && (
                <button className={styles.cancelEdit} onClick={() => {
                  setEditingId(null);
                  setForm({ name: '', amount: '', category: 'Food', date: format(new Date(), 'yyyy-MM-dd'), note: '' });
                }}>Cancel</button>
              )}
            </div>
            <form onSubmit={handleAddExpense} noValidate>
              <div className={styles.field}>
                <label>Name</label>
                <input type="text" placeholder="Coffee, Uber, Netflix…"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label>Amount ($)</label>
                  <input type="number" placeholder="0.00" min="0.01" step="0.01"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Date</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className={styles.field}>
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATS.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Note (optional)</label>
                <input type="text" placeholder="Add a note…" maxLength={300}
                  value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              {formError && <div className={styles.formError}>{formError}</div>}
              <button type="submit" className={styles.btnAdd} disabled={submitting}>
                {submitting ? <span className={styles.spinner} /> : (editingId ? 'Update expense' : 'Add expense')}
              </button>
            </form>
          </div>

          {/* Breakdown */}
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Breakdown · {format(now, 'MMMM')}</div>
            {stats?.categoryBreakdown?.length ? (
              stats.categoryBreakdown.map(row => {
                const total = stats.thisMonth.total;
                const pct = total > 0 ? (row.total / total * 100).toFixed(0) : 0;
                const budget = getBudgetForCat(row.category);
                const spent = parseFloat(row.total);
                const over = budget && spent > parseFloat(budget.amount);
                return (
                  <div key={row.category} className={styles.brkRow}>
                    <div className={styles.brkLabel} style={{ color: CAT_COLORS[row.category] }}>
                      {CAT_EMOJI[row.category]} {row.category}
                    </div>
                    <div className={styles.brkTrack}>
                      <div className={styles.brkFill}
                        style={{ width: `${pct}%`, background: over ? '#ff6b6b' : CAT_COLORS[row.category] }} />
                      {budget && (
                        <div className={styles.brkBudgetMark}
                          style={{ left: `${Math.min(100, parseFloat(budget.amount) / (total || 1) * 100).toFixed(0)}%` }} />
                      )}
                    </div>
                    <div className={styles.brkAmt}>
                      ${spent.toFixed(2)}
                      {budget && <span className={over ? styles.brkOver : styles.brkUnder}>/{parseFloat(budget.amount).toFixed(0)}</span>}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className={styles.empty}>No spending this month.</p>
            )}
          </div>

          {/* Budgets */}
          <div className={styles.panel}>
            <div className={styles.panelTitle}>
              Budgets
              <button className={styles.smallBtn} onClick={() => setShowBudgetModal(true)}>+ Set budget</button>
            </div>
            {budgets.length ? budgets.map(b => (
              <div key={b.id} className={styles.budgetRow}>
                <span>{CAT_EMOJI[b.category]} {b.category}</span>
                <span>${parseFloat(b.amount).toFixed(2)}/mo</span>
                <button className={styles.delSmall} onClick={() => handleDeleteBudget(b.id)}>✕</button>
              </div>
            )) : <p className={styles.empty}>No budgets set.</p>}
          </div>
        </div>

        {/* Right column */}
        <div className={styles.rightCol}>
          {/* Chart */}
          {stats?.last6Months?.length > 0 && (
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Last 6 months</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.last6Months} barSize={28}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={50}
                    tickFormatter={v => `$${v}`} />
                  <Tooltip
                    formatter={v => [`$${parseFloat(v).toFixed(2)}`, 'Spent']}
                    contentStyle={{ background: 'var(--surface)', border: '0.5px solid var(--border2)', borderRadius: '8px', fontSize: '12px' }}
                    cursor={{ fill: 'var(--border)' }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {stats.last6Months.map((entry, i) => (
                      <Cell key={i} fill={entry.month === month ? 'var(--neon)' : 'var(--surface2)'}
                        stroke={entry.month === month ? 'var(--neon)' : 'var(--border2)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Expense list */}
          <div className={styles.panel}>
            <div className={styles.panelTitle}>
              Expenses
              <div className={styles.listActions}>
                <input className={styles.searchInput} type="search" placeholder="Search…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="name">Name</option>
                </select>
                <button className={styles.smallBtn} onClick={handleExport} title="Export CSV">↓ CSV</button>
              </div>
            </div>

            {/* Month picker */}
            <div className={styles.monthRow}>
              <input type="month" className={styles.monthPicker} value={month}
                onChange={e => setMonth(e.target.value)} />
            </div>

            {/* Filter pills */}
            <div className={styles.pills}>
              {['All', ...CATS].map(c => (
                <button key={c} className={`${styles.pill} ${filter === c ? styles.pillOn : ''}`}
                  onClick={() => setFilter(c)}>
                  {c !== 'All' ? `${CAT_EMOJI[c]} ` : ''}{c}
                </button>
              ))}
            </div>

            <div className={styles.list}>
              {filtered.length === 0 ? (
                <div className={styles.emptyState}>
                  <div>💸</div>
                  <p>{search ? 'No results found.' : 'No expenses here.'}</p>
                </div>
              ) : filtered.map(e => {
                const budget = getBudgetForCat(e.category);
                const spent = getSpentForCat(e.category);
                const over = budget && spent > parseFloat(budget.amount);
                return (
                  <div key={e.id} className={styles.item}>
                    <div className={styles.dot} style={{ background: CAT_COLORS[e.category] }} />
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{e.name}</div>
                      <div className={styles.itemMeta}>
                        {e.category} · {format(parseISO(e.date), 'dd MMM yyyy')}
                        {e.note && <span className={styles.itemNote}> · {e.note}</span>}
                      </div>
                    </div>
                    <div className={styles.itemAmt} style={{ color: over ? '#ff6b6b' : CAT_COLORS[e.category] }}>
                      ${parseFloat(e.amount).toFixed(2)}
                    </div>
                    <button className={styles.editBtn} onClick={() => startEdit(e)} aria-label="Edit">✎</button>
                    <button className={styles.delBtn} onClick={() => handleDelete(e.id)} aria-label="Delete">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Budget modal */}
      {showBudgetModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBudgetModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Set monthly budget</div>
            <form onSubmit={handleUpsertBudget} noValidate>
              <div className={styles.field}>
                <label>Category</label>
                <select value={budgetForm.category} onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))}>
                  {CATS.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Monthly limit ($)</label>
                <input type="number" placeholder="200.00" min="0.01" step="0.01"
                  value={budgetForm.amount} onChange={e => setBudgetForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className={styles.modalBtns}>
                <button type="button" className={styles.modalCancel} onClick={() => setShowBudgetModal(false)}>Cancel</button>
                <button type="submit" className={styles.btnAdd}>Save budget</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

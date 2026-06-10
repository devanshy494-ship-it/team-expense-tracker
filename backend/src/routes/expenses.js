import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { getExpenses, addExpense, updateExpense, deleteExpense, getStats, exportCSV } from '../controllers/expenses.js';

const router = Router();

const VALID_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];

const expenseValidators = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name required (max 100 chars)'),
  body('amount').isFloat({ min: 0.01, max: 999999 }).withMessage('Amount must be between 0.01 and 999999'),
  body('category').isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  body('date').isDate().withMessage('Valid date required'),
  body('note').optional().isLength({ max: 300 }).withMessage('Note max 300 chars'),
];

router.use(authenticate);

router.get('/', getExpenses);
router.get('/stats', getStats);
router.get('/export', exportCSV);
router.post('/', expenseValidators, addExpense);
router.put('/:id', expenseValidators, updateExpense);
router.delete('/:id', deleteExpense);

export default router;

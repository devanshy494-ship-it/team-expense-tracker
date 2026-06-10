import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { getBudgets, upsertBudget, deleteBudget } from '../controllers/budgets.js';

const router = Router();

const VALID_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Other'];

const budgetValidators = [
  body('category').isIn(VALID_CATEGORIES).withMessage('Invalid category'),
  body('amount').isFloat({ min: 0.01, max: 999999 }).withMessage('Invalid amount'),
  body('month').matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must be YYYY-MM'),
];

router.use(authenticate);
router.get('/', getBudgets);
router.post('/', budgetValidators, upsertBudget);
router.delete('/:id', deleteBudget);

export default router;

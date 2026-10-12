require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const { Book, Loan, Reservation, Note } = require('./models');

const DAY = 864e5, RATE = 2, MAX_LOANS = 3, LOAN_DAYS = 14, RENEW_DAYS = 7;
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shelfmark';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------
const wrap = fn => (req, res, next) => fn(req, res).catch(next);
const fail = (status, message) => Object.assign(new Error(message), { status });
const validId = id => typeof id === 'string' && mongoose.isValidObjectId(id);
const str = v => String(v ?? '').trim();
const fineFor = loan => {
  const days = Math.ceil(((loan.returnedAt || Date.now()) - loan.dueAt) / DAY);
  return days > 0 ? days * RATE : 0;
};
const availableCopies = async book =>
  book.copies - await Loan.countDocuments({ book: book._id, returnedAt: null });

// ---------- books ----------
app.get('/api/data', wrap(async (req, res) => {
  const [books, loans, reservations, notes] = await Promise.all([
    Book.find().sort('codeNo'), Loan.find(), Reservation.find().sort('createdAt'), Note.find().sort('createdAt')
  ]);
  res.json({ books, loans, reservations, notes });
}));

app.post('/api/books', wrap(async (req, res) => {
  const title = str(req.body.title), author = str(req.body.author);
  if (!title || !author) throw fail(400, 'Enter both a title and an author.');
  const last = await Book.findOne().sort('-codeNo');
  const book = await Book.create({
    title, author,
    category: str(req.body.category) || 'General',
    copies: Math.max(1, parseInt(req.body.copies) || 1),
    codeNo: (last ? last.codeNo : 1000) + 1
  });
  res.status(201).json(book);
}));

app.delete('/api/books/:id', wrap(async (req, res) => {
  if (!validId(req.params.id)) throw fail(400, 'Invalid book id.');
  if (await Loan.exists({ book: req.params.id, returnedAt: null }))
    throw fail(409, 'Cannot remove: copies are on loan.');
  await Book.findByIdAndDelete(req.params.id);
  await Reservation.deleteMany({ book: req.params.id });
  res.json({ ok: true });
}));

// ---------- borrow / return / renew ----------
app.post('/api/loans', wrap(async (req, res) => {
  const user = str(req.body.user), bookId = req.body.bookId;
  if (!user || !validId(bookId)) throw fail(400, 'Missing member name or book.');
  const active = await Loan.find({ user, returnedAt: null });
  if (active.length >= MAX_LOANS) throw fail(409, `Limit reached: you can borrow ${MAX_LOANS} books at a time.`);
  if (active.some(l => fineFor(l) > 0)) throw fail(409, 'Return your overdue books before borrowing more.');
  if (active.some(l => String(l.book) === bookId)) throw fail(409, 'You have already borrowed this book.');
  const book = await Book.findById(bookId);
  if (!book) throw fail(404, 'Book not found.');
  if (await availableCopies(book) < 1) throw fail(409, 'No copies available right now.');
  const loan = await Loan.create({ user, book: book._id, dueAt: new Date(Date.now() + LOAN_DAYS * DAY) });
  await Reservation.deleteMany({ user, book: book._id });
  res.status(201).json(loan);
}));

app.post('/api/loans/:id/return', wrap(async (req, res) => {
  const loan = validId(req.params.id) && await Loan.findById(req.params.id);
  if (!loan) throw fail(404, 'Loan not found.');
  if (loan.returnedAt) throw fail(409, 'This book was already returned.');
  loan.returnedAt = new Date();
  await loan.save();
  // notify the first member waiting for this book
  const next = await Reservation.findOneAndDelete({ book: loan.book }, { sort: { createdAt: 1 } });
  if (next) {
    const book = await Book.findById(loan.book);
    await Note.create({ user: next.user, message: `"${book.title}" is now available. Borrow it before someone else does.` });
  }
  res.json({ fine: fineFor(loan) });
}));

app.post('/api/loans/:id/renew', wrap(async (req, res) => {
  const loan = validId(req.params.id) && await Loan.findById(req.params.id);
  if (!loan || loan.returnedAt) throw fail(404, 'Active loan not found.');
  if (loan.renewed) throw fail(409, 'This book was already renewed once.');
  if (loan.dueAt < Date.now()) throw fail(409, 'Overdue books cannot be renewed.');
  if (await Reservation.exists({ book: loan.book })) throw fail(409, 'Another member has reserved this book.');
  loan.dueAt = new Date(loan.dueAt.getTime() + RENEW_DAYS * DAY);
  loan.renewed = true;
  await loan.save();
  res.json(loan);
}));

// ---------- reservations ----------
app.post('/api/reservations', wrap(async (req, res) => {
  const user = str(req.body.user), bookId = req.body.bookId;
  if (!user || !validId(bookId)) throw fail(400, 'Missing member name or book.');
  const book = await Book.findById(bookId);
  if (!book) throw fail(404, 'Book not found.');
  if (await availableCopies(book) > 0) throw fail(409, 'Copies are available. You can borrow it now.');
  if (await Reservation.exists({ user, book: book._id })) throw fail(409, 'You already reserved this book.');
  res.status(201).json(await Reservation.create({ user, book: book._id }));
}));

// ---------- demo data ----------
async function seed() {
  await Promise.all([Book.deleteMany(), Loan.deleteMany(), Reservation.deleteMany(), Note.deleteMany()]);
  const rows = [
    ['Wings of Fire', 'A.P.J. Abdul Kalam', 'Biography', 3], ['The Alchemist', 'Paulo Coelho', 'Fiction', 2],
    ['Clean Code', 'Robert C. Martin', 'Technology', 2], ['Introduction to Algorithms', 'Cormen et al.', 'Technology', 1],
    ['Sapiens', 'Yuval Noah Harari', 'History', 2], ['The Guide', 'R.K. Narayan', 'Fiction', 2],
    ['Atomic Habits', 'James Clear', 'Self-help', 3], ["You Don't Know JS", 'Kyle Simpson', 'Technology', 2],
    ['Discovery of India', 'Jawaharlal Nehru', 'History', 1], ['Malgudi Days', 'R.K. Narayan', 'Fiction', 2]
  ];
  const books = await Book.insertMany(rows.map(([title, author, category, copies], i) =>
    ({ title, author, category, copies, codeNo: 1001 + i })));
  const at = d => new Date(Date.now() + d * DAY);
  // [member, book number, issued (days from now), due, returned]
  const loans = [
    ['Demo Student', 1, -20, -6, null], ['Demo Student', 3, -3, 11, null], ['Ravi', 7, -5, 9, null],
    ['Ravi', 2, -30, -16, -18], ['Anu', 7, -25, -11, -12], ['Anu', 3, -22, -8, -9], ['Ravi', 4, -2, 12, null]
  ];
  await Loan.insertMany(loans.map(([user, b, s, d, r]) => ({
    user, book: books[b - 1]._id, issuedAt: at(s), dueAt: at(d), returnedAt: r === null ? null : at(r)
  })));
}
app.post('/api/reset', wrap(async (req, res) => { await seed(); res.json({ ok: true }); }));

// ---------- errors ----------
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') err.status = 400;
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error.' });
});

// ---------- start ----------
mongoose.connect(MONGODB_URI).then(async () => {
  console.log('MongoDB connected');
  if (!await Book.countDocuments()) { await seed(); console.log('Demo data added'); }
  app.listen(PORT, () => console.log(`Shelfmark running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});

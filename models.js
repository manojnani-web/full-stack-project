const mongoose = require('mongoose');
const { Schema } = mongoose;

const Book = mongoose.model('Book', new Schema({
  title:    { type: String, required: true, trim: true, maxlength: 120 },
  author:   { type: String, required: true, trim: true, maxlength: 80 },
  category: { type: String, default: 'General', trim: true, maxlength: 40 },
  copies:   { type: Number, default: 1, min: 1 },
  codeNo:   { type: Number, required: true, unique: true }   // shown as LIB-<codeNo>
}, { timestamps: true }));

const Loan = mongoose.model('Loan', new Schema({
  user:       { type: String, required: true, index: true },
  book:       { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  issuedAt:   { type: Date, default: Date.now },
  dueAt:      { type: Date, required: true },
  returnedAt: { type: Date, default: null },
  renewed:    { type: Boolean, default: false }
}));

const Reservation = mongoose.model('Reservation', new Schema({
  user:      { type: String, required: true, index: true },
  book:      { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  createdAt: { type: Date, default: Date.now }
}));

const Note = mongoose.model('Note', new Schema({
  user:      { type: String, required: true, index: true },
  message:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}));

module.exports = { Book, Loan, Reservation, Note };

// models/db.js — Wrapper async do sqlite3
import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.resolve('data/edumetrics.db');

const dbInstance = new sqlite3.Database(DB_PATH);

export const db = {
  run: (sql, params = []) => new Promise((resolve, reject) => {
    dbInstance.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  }),

  get: (sql, params = []) => new Promise((resolve, reject) => {
    dbInstance.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  }),

  all: (sql, params = []) => new Promise((resolve, reject) => {
    dbInstance.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  }),

  exec: (sql) => new Promise((resolve, reject) => {
    dbInstance.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  }),

  close: () => new Promise((resolve, reject) => {
    dbInstance.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  }),
};

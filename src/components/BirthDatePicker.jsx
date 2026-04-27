import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

const HEBREW_MONTHS = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'
];

const ERR_TOO_OLD = 'תאריך לא תקין: יש לבחור תאריך לא מוקדם מ-01/2016';
const ERR_FUTURE = 'תאריך לא תקין: אין לבחור תאריך עתידי';

// component expects value as MM/YYYY or empty string
export default function BirthDatePicker({ value, onChange }) {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!value) {
      setMonth('');
      setYear('');
      setError('');
      return;
    }
    const parts = String(value).split('/');
    if (parts.length === 2) {
      const [m, y] = parts;
      setMonth(m.padStart(2, '0'));
      setYear(String(y));
    } else {
      setMonth('');
      setYear('');
    }
    setError('');
  }, [value]);

  const current = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, []);

  const years = useMemo(() => {
    const minYear = 2016;
    const maxYear = current.year;
    const result = [];
    for (let y = maxYear; y >= minYear; y--) result.push(String(y));
    return result;
  }, [current.year]);

  function emit(nextMonth, nextYear) {
    if (!nextMonth || !nextYear) {
      onChange?.('');
      return;
    }
    const m = String(nextMonth).padStart(2, '0');
    const y = String(nextYear);
    const numericMonth = Number(m);
    const numericYear = Number(y);

    // validation: not earlier than 01/2016
    if (numericYear < 2016 || (numericYear === 2016 && numericMonth < 1)) {
      setError(ERR_TOO_OLD);
      onChange?.('');
      return;
    }

    // validation: not in future
    if (numericYear > current.year || (numericYear === current.year && numericMonth > current.month)) {
      setError(ERR_FUTURE);
      onChange?.('');
      return;
    }

    setError('');
    onChange?.(`${m}/${y}`);
  }

  function onChangeMonth(e) {
    const next = e.target.value;
    setMonth(next);
    emit(next, year);
  }

  function onChangeYear(e) {
    const next = e.target.value;
    setYear(next);
    emit(month, next);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-sm text-slate-700 mb-1">חודש</label>
        <select className="w-full p-2 border rounded" value={month} onChange={onChangeMonth}>
          <option value="">בחר חודש</option>
          {HEBREW_MONTHS.map((m, idx) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-slate-700 mb-1">שנה</label>
        <select className="w-full p-2 border rounded" value={year} onChange={onChangeYear}>
          <option value="">בחר שנה</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {error && <p className="col-span-2 text-sm text-red-700 mt-2">{error}</p>}
    </div>
  );
}
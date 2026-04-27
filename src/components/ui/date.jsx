import { useMemo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const HEBREW_MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

export function DateInput({ value, onChange, className, ...props }) {
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
    // accept MM/YYYY or DD/MM/YYYY
    const parts = String(value).split('/');
    if (parts.length === 2) {
      const [m, y] = parts;
      setMonth(String(m).padStart(2, '0'));
      setYear(String(y));
    } else if (parts.length === 3) {
      // DD/MM/YYYY
      const [, m, y] = parts;
      setMonth(String(m).padStart(2, '0'));
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
      setError('תאריך לא תקין: יש לבחור תאריך לא מוקדם מ-01/2016');
      onChange?.('');
      return;
    }

    // validation: not in future
    if (numericYear > current.year || (numericYear === current.year && numericMonth > current.month)) {
      setError('תאריך לא תקין: אין לבחור תאריך עתידי');
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
    <div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <select
          className={cn(
            'w-full h-12 sm:h-14 rounded-xl border border-slate-200 bg-gradient-to-l from-slate-50 to-blue-50 px-3 sm:px-4 text-sm sm:text-base outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all',
            className
          )}
          value={month}
          onChange={onChangeMonth}
          {...props}
        >
          <option value="">חודש</option>
          {HEBREW_MONTHS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          className={cn(
            'w-full h-12 sm:h-14 rounded-xl border border-slate-200 bg-gradient-to-l from-slate-50 to-blue-50 px-3 sm:px-4 text-sm sm:text-base outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all',
            className
          )}
          value={year}
          onChange={onChangeYear}
        >
          <option value="">שנה</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs sm:text-sm text-red-700 mt-2">{error}</p>}
    </div>
  );
}

export default DateInput;

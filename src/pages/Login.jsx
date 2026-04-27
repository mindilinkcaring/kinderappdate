import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ERR_NON_DIGIT = 'מספר טלפון לא תקין: יש להזין ספרות בלבד ללא מקפים או סימנים מיוחדים.';
const ERR_NOT_ZERO = 'מספר טלפון לא תקין: המספר חייב להתחיל בספרה 0';
const ERR_LENGTH = 'מספר טלפון לא תקין: יש להזין בדיוק 10 ספרות';

function validatePhone(value) {
  if (/\D/.test(value)) return ERR_NON_DIGIT;
  if (value.length > 0 && value[0] !== '0') return ERR_NOT_ZERO;
  if (value.length !== 10) return ERR_LENGTH;
  return '';
}

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  function onChange(e) {
    // allow only digits to be entered programmatically - but keep what user types
    const next = e.target.value.replace(/[^0-9]/g, '');
    setPhone(next);
    // validate on typing: show most relevant error first
    // check non-digit first is already handled by replace, but we still keep message if user pasted invalid chars
    if (/\D/.test(e.target.value)) {
      setError(ERR_NON_DIGIT);
      return;
    }
    // first digit rule
    if (next.length > 0 && next[0] !== '0') {
      setError(ERR_NOT_ZERO);
      return;
    }
    // length rule (only show when length !== 10)
    if (next.length !== 10) {
      setError(ERR_LENGTH);
      return;
    }
    setError('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    // final validation in the same priority order
    if (/\D/.test(phone)) {
      setError(ERR_NON_DIGIT);
      return;
    }
    if (phone.length === 0 || phone[0] !== '0') {
      setError(ERR_NOT_ZERO);
      return;
    }
    if (phone.length !== 10) {
      setError(ERR_LENGTH);
      return;
    }

    setError('');
    // On success navigate to search page with phone as personId
    const params = new URLSearchParams({ personId: phone, kindergarten: 'גן תמר' });
    navigate(`/Details?${params.toString()}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">כניסה</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label className="block text-sm sm:text-base text-slate-700 font-medium">מספר טלפון</label>
              <Input value={phone} onChange={onChange} inputMode="numeric" placeholder="05XXXXXXXX" />
              {error && <p className="mt-2 text-xs sm:text-sm text-red-700">{error}</p>}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" className="w-full sm:w-auto bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600 text-white text-base sm:text-lg font-semibold">כניסה</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

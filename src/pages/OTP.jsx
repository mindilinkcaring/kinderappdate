import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export default function OTP() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const personId = searchParams.get('personId');
  const kindergarten = searchParams.get('kindergarten');

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!personId || !kindergarten) {
      navigate('/GanTamar', { replace: true });
      return;
    }
    sendOtp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!personId || !kindergarten) return null;

  async function sendOtp() {
    setSending(true);
    setError('');
    setSent(false);
    try {
      const res = await fetch('/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: personId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'שגיאה בשליחת SMS');
      } else {
        setSent(true);
      }
    } catch {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (code.length !== 4) {
      setError('יש להזין קוד בן 4 ספרות');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const res = await fetch('/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: personId, code })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'הקוד שהוזן שגוי');
        return;
      }
      const params = new URLSearchParams({ personId, kindergarten });
      navigate(`/Details?${params.toString()}`);
    } catch {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-8 flex items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <ShieldCheck className="h-5 sm:h-6 w-5 sm:w-6" />
            אימות קוד חד פעמי
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-1">
            {sending ? 'שולח קוד אימות...' : sent ? `הקוד נשלח ל-${personId}` : 'הזן/י את הקוד בן 4 ספרות שנשלח אליך'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
            <Input
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, '').slice(0, 4));
                setError('');
              }}
              inputMode="numeric"
              placeholder="1234"
              disabled={sending || verifying}
              className="text-center text-xl sm:text-3xl tracking-[0.35em] font-bold"
            />
            {error && <Alert className="border-red-200 bg-red-50 text-red-700 text-xs sm:text-sm">{error}</Alert>}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
              <Button
                type="button"
                className="bg-white border border-slate-200 text-slate-700 text-xs sm:text-base font-semibold"
                onClick={() => navigate(-1)}
                disabled={verifying}
              >
                חזרה
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600 text-white text-xs sm:text-base font-semibold"
                disabled={sending || verifying || code.length !== 4}
              >
                {verifying ? 'מאמת...' : 'אימות והמשך'}
              </Button>
            </div>
            <Button
              type="button"
              variant="link"
              className="w-full text-slate-500 text-xs sm:text-sm"
              onClick={sendOtp}
              disabled={sending || verifying}
            >
              {sending ? 'שולח...' : 'שלח קוד מחדש'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

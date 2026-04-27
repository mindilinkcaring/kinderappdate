import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const PHONE_REGEX = /^0\d{9}$/;

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kindergarten = searchParams.get('kindergarten');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!kindergarten) {
      navigate('/GanTamar', { replace: true });
    }
  }, [kindergarten, navigate]);

  function onSubmit(event) {
    event.preventDefault();
    if (!PHONE_REGEX.test(phone)) {
      setError('יש להזין מספר נייד תקין (10 ספרות)');
      return;
    }

    const params = new URLSearchParams({
      personId: phone,
      kindergarten
    });
    navigate(`/OTP?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Phone className="h-5 sm:h-6 w-5 sm:w-6" />
            עדכון פרטי ילדים
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-1">
            {kindergarten ? `גן: ${kindergarten}` : 'מעביר לגן ברירת מחדל...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label className="block text-sm sm:text-base text-slate-700 font-medium">מספר נייד רשום</label>
              <Input
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value.replace(/\D/g, '').slice(0, 10));
                  setError('');
                }}
                inputMode="numeric"
                placeholder="05XXXXXXXX"
              />
            </div>
            {error && <Alert className="border-red-200 bg-red-50 text-red-700 text-xs sm:text-sm">{error}</Alert>}
            <Button className="w-full bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600 text-white text-base sm:text-lg font-semibold py-3 sm:py-4" type="submit">
              המשך לאימות
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
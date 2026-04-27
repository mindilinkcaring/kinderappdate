import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GanTamar() {
  const navigate = useNavigate();

  function goToSearch() {
    navigate('/Search?kindergarten=גן תמר');
  }

  function goToLogin() {
    navigate('/Login');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-md">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl">גן תמר</CardTitle>
          <CardDescription className="text-sm sm:text-base mt-1">
            ברוכים הבאים למערכת עדכון פרטי ילדים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <Button
            onClick={goToSearch}
            className="w-full bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600 text-white text-base font-semibold py-3"
          >
            עדכון פרטי ילד/ה
          </Button>
          <Button
            onClick={goToLogin}
            className="w-full bg-white border border-slate-200 text-slate-600 text-sm font-medium"
          >
            כניסת צוות
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoaderCircle, Plus, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DateInput from '@/components/ui/date';
import { invokeSearchPerson, invokeUpdatePerson } from '@/api/functionsClient';

const HIDDEN_FIELDS = ['תאריך עדכון', 'קובץ חיסונים', 'מסלן', 'מספר פנימי'];

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

// convert legacy English values from the sheet into the new Hebrew labels
function normalizeGender(value) {
  if (value === 'M') return 'זכר';
  if (value === 'F') return 'נקבה';
  return value;
}

function getHeaderKey(header) {
  const normalized = String(header || '').replace(/\s+/g, ' ').trim();
  if (normalized === 'טלפון ההורה' || normalized === 'טלפון הורה') {
    return 'טלפון ההורה';
  }
  if (normalized === 'שם המסגרת החינוכית' || normalized === 'שם המסגרת') {
    return 'שם המסגרת החינוכית';
  }
  return normalized;
}

function isParentPhoneHeader(header) {
  return getHeaderKey(header) === 'טלפון ההורה';
}

function isKindergartenHeader(header) {
  return getHeaderKey(header) === 'שם המסגרת החינוכית';
}

function isGenderHeader(header) {
  if (!header) return false;
  const normalized = String(header).trim();
  return normalized === 'מין' || normalized.includes('מין') || normalized.includes('מגדר');
}
export default function Details() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const personId = searchParams.get('personId');
  const kindergarten = searchParams.get('kindergarten');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [headers, setHeaders] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentViewed, setConsentViewed] = useState(false);

  useEffect(() => {
    if (!personId || !kindergarten) {
      navigate('/GanTamar', { replace: true });
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        const result = await invokeSearchPerson({ personId, kindergarten });

        if (result?.error) {
          setError(result.error);
          return;
        }

        const incomingHeaders = Array.isArray(result?.headers) ? result.headers : [];
        setHeaders(incomingHeaders);

        if (Array.isArray(result?.matches) && result.matches.length > 0) {
          setRecords(
            result.matches.map((match) => ({
              rowIndex: match.rowIndex,
              data: {
                ...match.data,
                'טלפון ההורה': normalizePhone(match?.data?.['טלפון ההורה'] || personId),
                'שם המסגרת החינוכית': kindergarten || match?.data?.['שם המסגרת החינוכית'] || '',
                // coerce old gender values to hebrew options
                'מין': normalizeGender(match?.data?.['מין'])
              }
            }))
          );
        } else {
          setRecords([
            {
              data: {
                ...Object.fromEntries(incomingHeaders.map((header) => [header, ''])),
                'טלפון ההורה': normalizePhone(personId),
                'שם המסגרת החינוכית': kindergarten || ''
              }
            }
          ]);
        }
      } catch {
        setError('בעיית חיבור, נסה שוב');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [kindergarten, navigate, personId]);

  const visibleHeaders = useMemo(() => {
    const seen = new Set();
    const filtered = [];

    for (const header of headers) {
      if (HIDDEN_FIELDS.includes(header)) continue;
      const key = getHeaderKey(header);
      if (seen.has(key)) continue;
      seen.add(key);
      filtered.push(header);
    }

    return filtered.sort((a, b) => {
      if (isParentPhoneHeader(a) && !isParentPhoneHeader(b)) return -1;
      if (!isParentPhoneHeader(a) && isParentPhoneHeader(b)) return 1;
      if (isKindergartenHeader(a) && !isKindergartenHeader(b)) return -1;
      if (!isKindergartenHeader(a) && isKindergartenHeader(b)) return 1;
      return 0;
    });
  }, [headers]);

  const formHeaders = useMemo(() => {
    if (visibleHeaders.length > 0) return visibleHeaders;
    return ['טלפון ההורה', 'שם המסגרת החינוכית', 'שם הילד/ה', 'תאריך לידה', 'מין', 'קבוצת גיל', 'אישור הורים'];
  }, [visibleHeaders]);

  function updateField(childIndex, field, value) {
    setRecords((current) => {
      const next = [...current];
      // ensure the child entry exists
      if (!next[childIndex]) next[childIndex] = { data: {} };
      if (!next[childIndex].data) next[childIndex].data = {};
      next[childIndex] = {
        ...next[childIndex],
        data: {
          ...next[childIndex].data,
          [field]: value,
          'טלפון ההורה': normalizePhone(personId),
          'שם המסגרת החינוכית': kindergarten
        }
      };
      return next;
    });
  }

  function addChild() {
    const emptyData = Object.fromEntries(headers.map((header) => [header, '']));
    emptyData['טלפון ההורה'] = normalizePhone(personId);
    emptyData['שם המסגרת החינוכית'] = kindergarten;
    setRecords((current) => {
      const next = [...current, { data: emptyData }];
      setActiveIndex(next.length - 1);
      return next;
    });
    setSuccess('');
    setError('');
  }

  function validate() {
    const data = records[activeIndex]?.data || {};
    const childNameHeader = formHeaders.find((h) => h.includes('שם הילד'));
    if (childNameHeader && !String(data[childNameHeader] || '').trim()) return 'יש להזין שם ילד/ה';
    const birthHeader = formHeaders.find((h) => h === 'תאריך לידה');
    if (birthHeader && !String(data[birthHeader] || '').trim()) return 'יש להזין תאריך לידה';
    const genderHeader = formHeaders.find((h) => isGenderHeader(h));
    if (genderHeader && !String(data[genderHeader] || '').trim()) return 'יש לבחור מין';
    return null;
  }

  async function onSubmit() {
    if (!records[activeIndex]) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const payload = {
        rowIndex: records[activeIndex].rowIndex,
        data: {
          ...records[activeIndex].data,
          'טלפון ההורה': normalizePhone(personId),
          'שם המסגרת החינוכית': kindergarten
        },
        headers
      };

      const result = await invokeUpdatePerson(payload);
      if (result?.error) {
        setError(result.error);
        return;
      }

      setRecords((current) => {
        const next = [...current];
        next[activeIndex] = {
          ...next[activeIndex],
          rowIndex: result?.rowIndex ?? next[activeIndex].rowIndex
        };
        return next;
      });

      setSuccess('הפרטים נשמרו בהצלחה');
    } catch {
      setError('בעיית חיבור, נסה שוב');
    } finally {
      setSaving(false);
    }
  }

  function backToSearch() {
    const params = new URLSearchParams({
      kindergarten: kindergarten || 'גן תמר'
    });
    navigate(`/Search?${params.toString()}`);
  }

  function renderField(header, value, childIndex) {
    if (isParentPhoneHeader(header)) {
      return <Input value={normalizePhone(value || personId)} inputMode="numeric" disabled />;
    }

    if (isKindergartenHeader(header)) {
      return <Input value={kindergarten || value || ''} disabled />;
    }

    if (header === 'תאריך לידה') {
      // use native date picker that edits full DD/MM/YYYY
      return <DateInput value={value || ''} onChange={(next) => updateField(childIndex, header, next)} />;
    }

    if (isGenderHeader(header)) {
      return (
        <Select value={String(value || '')} onChange={(event) => updateField(childIndex, header, event.target.value)}>
          <option value="">בחר/י</option>
          <option value="זכר">זכר</option>
          <option value="נקבה">נקבה</option>
        </Select>
      );
    }

    if (header === 'קבוצת גיל') {
      return (
        <Select value={String(value || '')} onChange={(event) => updateField(childIndex, header, event.target.value)}>
          <option value="">בחר/י</option>
          <option value="מעורב בוגרים">מעורב בוגרים</option>
          <option value="תינוקות">תינוקות</option>
        </Select>
      );
    }

    if (header === 'אישור הורים') {
      const checked = String(value).toLowerCase() === 'true';
      return (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
          <Button className="bg-white border border-slate-200 text-slate-700" onClick={() => setConsentDialogOpen(true)}>
            צפייה בטופס הסכמה
          </Button>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => {
                if (next && !consentViewed) {
                  setError('יש לצפות בקובץ ההסכמה לפני סימון האישור');
                  return;
                }
                updateField(childIndex, header, next ? 'true' : 'false');
              }}
            />
            <span className="text-sm text-slate-700">מאשר/ת הסכמת הורים</span>
          </div>
        </div>
      );
    }

    return (
      <Input
        value={value || ''}
        onChange={(event) => updateField(childIndex, header, event.target.value)}
        inputMode={header.includes('טלפון') ? 'numeric' : undefined}
      />
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-8 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-700">
          <LoaderCircle className="h-5 w-5 animate-spin" /> טוען פרטים...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-4 md:p-8">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">עדכון פרטים</CardTitle>
          <CardDescription className="text-sm sm:text-base mt-1">{kindergarten}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {error && <Alert className="border-red-200 bg-red-50 text-red-700 text-xs sm:text-sm">{error}</Alert>}
          {success && <Alert className="border-green-200 bg-gradient-to-l from-green-50 to-emerald-50 text-green-800 text-xs sm:text-sm">{success}</Alert>}

          <Tabs>
            <TabsList className="w-full flex gap-1 sm:gap-2 overflow-x-auto">
              {records.map((record, index) => {
                const childNameHeader = formHeaders.find((h) => h.includes('שם הילד'));
                const childName = childNameHeader ? String(record?.data?.[childNameHeader] || '').trim() : '';
                return (
                  <TabsTrigger
                    key={index}
                    isActive={index === activeIndex}
                    onClick={() => { setActiveIndex(index); setConsentViewed(false); }}
                    className="text-xs sm:text-sm whitespace-nowrap"
                  >
                    {childName || `ילד/ה ${index + 1}`}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <TabsContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {formHeaders.map(
                  (header) => (
                    <div key={header} className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-slate-700">{header}</label>
                      {renderField(header, records[activeIndex]?.data?.[header], activeIndex)}
                    </div>
                  )
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <Button className="w-full sm:flex-1 bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold" onClick={backToSearch}>
              חזרה לחיפוש
            </Button>
            <Button className="w-full sm:flex-1 bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold" onClick={addChild}>
              <Plus className="h-4 w-4 ml-1" />
              הוסף ילד.ה
            </Button>
            <Button
              className="w-full sm:flex-1 bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-semibold"
              onClick={onSubmit}
              disabled={saving}
            >
              <Save className="h-4 w-4 ml-1" />
              {saving ? 'שומר...' : 'שמור פרטים'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>טופס הסכמה הורים</DialogTitle>
          </DialogHeader>
          <iframe title="טופס הסכמה" src="/consent.pdf" className="w-full h-[65vh] rounded-lg border border-slate-200" />
          <div className="mt-3 flex justify-end">
            <Button
              className="bg-gradient-to-l from-blue-600 via-indigo-600 to-purple-600 text-white"
              onClick={() => {
                setConsentViewed(true);
                setConsentDialogOpen(false);
              }}
            >
              קראתי והבנתי
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
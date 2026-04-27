import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GanHanasichHakatan() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/Search?kindergarten=גן הנסיך הקטן', { replace: true });
  }, [navigate]);

  return null;
}
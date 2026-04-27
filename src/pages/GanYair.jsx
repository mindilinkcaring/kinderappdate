import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GanYair() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/Search?kindergarten=גן יאיר', { replace: true });
  }, [navigate]);

  return null;
}
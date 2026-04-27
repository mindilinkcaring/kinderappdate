import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GanMaya() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/Search?kindergarten=גן מאיה', { replace: true });
  }, [navigate]);

  return null;
}
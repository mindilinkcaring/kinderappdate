import { Navigate, Route, Routes } from 'react-router-dom';
import Search from '@/pages/Search';
import OTP from '@/pages/OTP';
import Details from '@/pages/Details';
import GanTamar from '@/pages/GanTamar';
import GanHanasichHakatan from '@/pages/GanHanasichHakatan';
import GanMaya from '@/pages/GanMaya';
import GanYair from '@/pages/GanYair';
import Login from '@/pages/Login';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/GanTamar" replace />} />
      <Route path="/Search" element={<Search />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/OTP" element={<OTP />} />
      <Route path="/Details" element={<Details />} />
      <Route path="/GanTamar" element={<GanTamar />} />
      <Route path="/GanHanasichHakatan" element={<GanHanasichHakatan />} />
      <Route path="/GanMaya" element={<GanMaya />} />
      <Route path="/GanYair" element={<GanYair />} />
      <Route path="*" element={<Navigate to="/GanTamar" replace />} />
    </Routes>
  );
}
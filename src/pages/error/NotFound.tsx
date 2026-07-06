import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { ApexLogo } from '../../components/ui/ApexLogo';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex flex-col justify-center items-center px-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="flex justify-center mb-2">
          <ApexLogo variant="large" />
        </div>
        <span className="text-[120px] font-black text-brand-blue/15 leading-none block">404</span>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-800">Page Not Found</h1>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            The page you are looking for does not exist or has been relocated to another workspace.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-4 py-2 border rounded-xl font-bold text-xs bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs hover:bg-brand-darkBlue shadow"
          >
            <Home className="h-4 w-4" />
            Command Center
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

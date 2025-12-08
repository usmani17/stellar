import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-sandstorm-s50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/accounts" className="text-h1100 font-bold text-forest-f60">
                Stellar
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/accounts"
                className="inline-flex items-center px-1 pt-1 text-h800 font-medium text-forest-f60 hover:text-forest-f40 border-b-2 border-transparent hover:border-forest-f40"
              >
                Accounts
              </Link>
              <Link
                to="/channels"
                className="inline-flex items-center px-1 pt-1 text-h800 font-medium text-forest-f60 hover:text-forest-f40 border-b-2 border-transparent hover:border-forest-f40"
              >
                Channels
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-h700 text-forest-f30 mr-4">
              {user.first_name} {user.last_name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};


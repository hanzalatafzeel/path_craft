import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Target, 
  CheckSquare, 
  Calendar, 
  BarChart3 
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <aside className="bg-white w-64 min-h-screen shadow-sm border-r border-gray-200">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
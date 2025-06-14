
import React from 'react';
import { APP_NAME, Icons } from '../../constants';
import GradientText from '../common/GradientText';

const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 bg-surface/70 backdrop-blur-lg shadow-md h-20 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-center md:justify-start h-full">
          <div className="flex items-center flex-col md:flex-row">
             <Icons.Eye className="text-3xl text-primary mb-1 md:mb-0 md:mr-2" /> {/* Adjusted for Material Symbols */}
            <GradientText
              className="text-3xl font-bold pb-0.5" 
              from="from-indigo-500"   
              via="via-purple-500"     
              to="to-fuchsia-500"      
            >
              {APP_NAME}
            </GradientText>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
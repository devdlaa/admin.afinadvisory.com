'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  CheckSquare, 
  CheckCheck, 
  Lock, 
  Mail, 
  BellOff, 
  Trash2, 
  LogOut 
} from 'lucide-react';
import styles from './Dropdown.module.scss';

const iconMap = {
  CheckSquare,
  CheckCheck,
  Lock,
  Mail,
  BellOff,
  Trash2,
  LogOut,
};

const Dropdown = ({ options, onSelect, align = 'left', trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionId) => {
    onSelect(optionId);
    setIsOpen(false);
  };

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <div onClick={handleTriggerClick}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className={`${styles.dropdownMenu} ${styles[align]}`}>
          {options.map((option) => {
            const IconComponent = iconMap[option.icon];
            return (
              <button
                key={option.id}
                className={styles.dropdownItem}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option.id);
                }}
              >
                {IconComponent && <IconComponent size={18} />}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
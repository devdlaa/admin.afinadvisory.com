import { useState } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';
import styles from './Avatar.module.scss';

const Avatar = ({ 
  src, 
  alt = 'User avatar', 
  size = 40,
  fallbackText = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Get initials from alt text or fallbackText
  const getInitials = () => {
    const text = fallbackText || alt;
    return text
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div 
      className={styles.avatar} 
      style={{ width: size, height: size }}
    >
      {isLoading && !hasError && <div className={styles.skeleton} />}
      
      {!hasError && src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={styles.image}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      ) : (
        <div className={styles.fallback}>
          {fallbackText || alt ? (
            <span 
              className={styles.initials}
              style={{ fontSize: size * 0.4 }}
            >
              {getInitials()}
            </span>
          ) : (
            <User size={size * 0.5} strokeWidth={1.5} />
          )}
        </div>
      )}
    </div>
  );
};

export default Avatar;
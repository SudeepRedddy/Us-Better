import { motion } from 'framer-motion';

interface AvatarProps {
  type: 'male' | 'female';
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isWinner?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-lg',
  md: 'w-14 h-14 text-2xl',
  lg: 'w-20 h-20 text-4xl',
  xl: 'w-28 h-28 text-5xl',
};

export const Avatar = ({ type, avatarUrl, size = 'md', className = '', isWinner = false }: AvatarProps) => {
  const emoji = type === 'male' ? '👨' : '👩';
  const hasPhoto = avatarUrl && avatarUrl.length > 0;
  
  return (
    <motion.div
      className={`relative rounded-full flex items-center justify-center shadow-soft overflow-hidden ${
        hasPhoto ? 'bg-muted' : type === 'male' ? 'bg-sage-light' : 'bg-coral-light'
      } ${sizeClasses[size]} ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isWinner && (
        <motion.span 
          className="absolute -top-2 -right-1 text-xl z-10"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
        >
          
        </motion.span>
      )}
      {hasPhoto ? (
        <img 
          src={avatarUrl} 
          alt="Profile" 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <span 
        role="img" 
        aria-label={type === 'male' ? 'Male avatar' : 'Female avatar'}
        className={hasPhoto ? 'hidden' : ''}
      >
        {emoji}
      </span>
    </motion.div>
  );
};
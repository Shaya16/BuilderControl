import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function ResetToRoot() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

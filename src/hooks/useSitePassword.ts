import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

export function useSitePassword() {
  const [isSitePasswordVerified, setIsSitePasswordVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSitePasswordStatus();
  }, []);

  const checkSitePasswordStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/site-password/status');
      const result = await response.json();
      
      setIsSitePasswordVerified(result.verified || false);
    } catch (error) {
      console.error('Site password status check failed:', error);
      setIsSitePasswordVerified(false);
    } finally {
      setIsChecking(false);
    }
  };

  const verifySitePassword = () => {
    setIsSitePasswordVerified(true);
  };

  // Force a status recheck (useful for navigation)
  const recheckStatus = () => {
    setIsChecking(true);
    checkSitePasswordStatus();
  };

  const clearSitePassword = async () => {
    try {
      await apiRequest('POST', '/api/site-password/logout');
    } catch (error) {
      console.error('Site password logout failed:', error);
    } finally {
      setIsSitePasswordVerified(false);
    }
  };

  return {
    isSitePasswordVerified,
    isChecking,
    verifySitePassword,
    clearSitePassword,
    refreshStatus: checkSitePasswordStatus,
    recheckStatus
  };
}
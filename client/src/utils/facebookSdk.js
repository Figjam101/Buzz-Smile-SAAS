const loadScript = (src, id) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'));
    if (document.getElementById(id)) return resolve();
    const js = document.createElement('script');
    js.id = id;
    js.async = true;
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    js.onload = () => resolve();
    js.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    const fjs = document.getElementsByTagName('script')[0];
    fjs.parentNode.insertBefore(js, fjs);
  });
};

export const initFacebookSDK = async () => {
  const appId = process.env.REACT_APP_FB_APP_ID || process.env.REACT_APP_FACEBOOK_APP_ID || '';
  const version = process.env.REACT_APP_FB_API_VERSION || 'v19.0';

  if (!appId) {
    throw new Error('Missing REACT_APP_FB_APP_ID');
  }

  await loadScript('https://connect.facebook.net/en_US/sdk.js', 'facebook-jssdk');

  return new Promise((resolve) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version,
      });
      resolve();
    };
    if (window.FB && typeof window.FB.init === 'function') {
      window.FB.init({ appId, cookie: true, xfbml: false, version });
      resolve();
    }
  });
};

export const loginWithFacebook = async (scope = 'public_profile,email,pages_show_list,pages_manage_posts,pages_read_engagement,business_management') => {
  if (typeof window === 'undefined' || !window.FB) {
    throw new Error('Facebook SDK not initialized');
  }
  return new Promise((resolve, reject) => {
    window.FB.login((response) => {
      if (response && response.authResponse) {
        resolve(response.authResponse);
      } else {
        reject(new Error('Facebook login failed'));
      }
    }, { scope });
  });
};

export const getLoginStatus = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.FB) return resolve(null);
    window.FB.getLoginStatus((response) => resolve(response));
  });
};
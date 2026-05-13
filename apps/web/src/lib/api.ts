var NESTJS_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/graphql', '') : 'http://localhost:4000';

var FRIENDLY_ERRORS: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Invalid email or password.',
  403: 'Access denied. You do not have permission.',
  404: 'Not found. The requested resource does not exist.',
  409: 'This email is already registered. Try logging in.',
  422: 'Please check your input and try again.',
  429: 'Too many attempts. Please wait a moment.',
  500: 'Something went wrong. Please try again.',
  502: 'Server is temporarily unavailable. Please try again.',
  503: 'Service is temporarily down. Please try again later.',
};

function getUserFriendlyMessage(status: number, serverMessage?: string): string {
  if (serverMessage && serverMessage.indexOf('rate') !== -1) return 'Too many attempts. Please wait a moment.';
  if (serverMessage && serverMessage.indexOf('already') !== -1) return 'This email is already registered. Try logging in.';
  return FRIENDLY_ERRORS[status] || 'Something went wrong. Please try again.';
}

async function request(method: string, path: string, body?: any) {
  var headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    var res = await fetch(NESTJS_URL + path, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      var data;
      try { data = await res.json(); } catch (_) { data = {}; }
      throw new ApiError(data.error || getUserFriendlyMessage(res.status), res.status, data);
    }
    var data = await res.json();
    return data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    if (err.message === 'Failed to fetch' || (err.name === 'TypeError' && err.message.indexOf('fetch') !== -1)) {
      throw new ApiError('Unable to connect. Please check your internet connection.', 0);
    }
    throw new ApiError(getUserFriendlyMessage(500), 500);
  }
}

class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export var api = {
  register: (email: string, password: string, displayName: string) =>
    request('POST', '/auth/register', { email, password, displayName }),

  login: (email: string, password: string) =>
    request('POST', '/auth/login', { email, password }),

  refresh: () =>
    request('POST', '/auth/refresh'),

  validate: () => request('GET', '/auth/me'),

  logout: () => request('POST', '/auth/logout'),

  forgotPassword: (email: string) =>
    request('POST', '/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    request('POST', '/auth/reset-password', { token, newPassword }),

  changePassword: (email: string, currentPassword: string, newPassword: string) =>
    request('POST', '/auth/change-password', { email, currentPassword, newPassword }),
};

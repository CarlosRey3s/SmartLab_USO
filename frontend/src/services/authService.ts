import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/api/auth`;

export interface LoginResponse {
  token: string;
  user: {
    id: string; // uuid
    nombres: string;
    apellidos: string;
    rol: 'administrador' | 'estudiante' | 'docente' | 'coordinador' | 'supervisor';
    correo: string;
  };
}

const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Error al iniciar sesión');
  }

  return data.data; // { token, user }
};

const loginMicrosoft = async (accessToken: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/microsoft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accessToken })
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 404 && data.status === 'incomplete_profile') {
      // Lanzamos un error especial que capturaremos en el frontend
      const error: any = new Error('Perfil incompleto');
      error.isNewUser = true;
      throw error;
    }
    throw new Error(data.message || 'Error al iniciar sesión con Microsoft');
  }

  return data.data; // { token, user }
};

const registerMicrosoft = async (accessToken: string, expediente: string, rol: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/microsoft-register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ accessToken, expediente, rol })
  });

  const data = await response.json();

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Error al completar el registro con Microsoft');
  }

  return data.data; // { token, user }
};

export const authService = {
  login,
  loginMicrosoft,
  registerMicrosoft,
};

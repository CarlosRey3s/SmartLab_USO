const API_URL = 'http://localhost:4000/api/auth';

export interface LoginResponse {
  token: string;
  user: {
    id: string; // uuid
    nombres: string;
    apellidos: string;
    rol: 'administrador' | 'estudiante' | 'docente' | 'coordinador';
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

export const authService = {
  login,
};

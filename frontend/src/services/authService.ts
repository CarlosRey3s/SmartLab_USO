const API_URL = 'http://localhost:4000/api/auth';

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    nombres: string;
    apellidos: string;
    rol: 'admin' | 'estudiante' | 'docente';
    correo: string;
  };
}

const login = async (email: string, password: string, role: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, role }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw { response: { data: errorData } }; // Simular estructura de error de axios
  }

  return response.json();
};

export const authService = {
  login,
};

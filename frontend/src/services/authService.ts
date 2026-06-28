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
  // Mock de login funcional
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Validaciones básicas de prueba
      if (email === 'admin@uso.edu.sv' && password === '123456') {
        resolve({
          token: 'mock-jwt-token-admin',
          user: { id: 1, nombres: 'Astrid', apellidos: 'Admin', rol: 'admin', correo: email }
        });
      } else if (email === 'estudiante@uso.edu.sv' && password === '123456') {
        resolve({
          token: 'mock-jwt-token-estudiante',
          user: { id: 2, nombres: 'Juan', apellidos: 'Estudiante', rol: 'estudiante', correo: email }
        });
      } else if (email === 'docente@uso.edu.sv' && password === '123456') {
        resolve({
          token: 'mock-jwt-token-docente',
          user: { id: 3, nombres: 'Maria', apellidos: 'Docente', rol: 'docente', correo: email }
        });
      } else {
        // Fallback genérico para cualquier otra prueba que hagan si escogen un rol
        resolve({
          token: 'mock-jwt-token-generic',
          user: { 
            id: 99, 
            nombres: 'Usuario', 
            apellidos: 'Prueba', 
            rol: role as 'admin' | 'estudiante' | 'docente', 
            correo: email 
          }
        });
      }
    }, 800); // Simulamos retraso de red
  });
};

export const authService = {
  login,
};

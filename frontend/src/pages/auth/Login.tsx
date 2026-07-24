import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../config/authConfig";
import "../../css/login.css";

interface FormErrors {
  email?: string;
  password?: string;
}

/* ══════════════════════════════════════
   BOOK SHELVES — paleta USO
   Verdes oscuros + toques amarillo
══════════════════════════════════════ */
const SHELVES: { height: number; color: string; width: number }[][] = [
  [
    { height: 72, color: "#0e4a38", width: 18 },
    { height: 88, color: "#1a6356", width: 22 },
    { height: 60, color: "#0b3528", width: 14 },
    { height: 82, color: "#22806B", width: 20 },
    { height: 68, color: "#155c47", width: 16 },
    { height: 90, color: "#0a2e22", width: 24 },
    { height: 58, color: "#1e7060", width: 13 },
    { height: 78, color: "#0d4030", width: 19 },
    { height: 85, color: "#2a8870", width: 21 },
    { height: 65, color: "#0b3828", width: 15 },
    { height: 92, color: "#195e4c", width: 23 },
    { height: 70, color: "#e8b520", width: 17 }, /* amarillo accent */
    { height: 80, color: "#0e4a38", width: 20 },
    { height: 62, color: "#1a6356", width: 14 },
    { height: 88, color: "#22806B", width: 22 },
    { height: 55, color: "#0b3528", width: 12 },
    { height: 76, color: "#155c47", width: 18 },
    { height: 83, color: "#0a2e22", width: 20 },
    { height: 67, color: "#1e7060", width: 16 },
  ],
  [
    { height: 80, color: "#0d4030", width: 20 },
    { height: 65, color: "#195e4c", width: 15 },
    { height: 88, color: "#0e4a38", width: 22 },
    { height: 72, color: "#22806B", width: 18 },
    { height: 58, color: "#0b3528", width: 13 },
    { height: 90, color: "#1a6356", width: 24 },
    { height: 76, color: "#155c47", width: 19 },
    { height: 62, color: "#0a2e22", width: 14 },
    { height: 84, color: "#c9a200", width: 21 }, /* amarillo dark */
    { height: 69, color: "#1e7060", width: 16 },
    { height: 78, color: "#0e4a38", width: 20 },
    { height: 55, color: "#22806B", width: 12 },
    { height: 86, color: "#195e4c", width: 22 },
    { height: 73, color: "#0d4030", width: 18 },
    { height: 61, color: "#0b3528", width: 14 },
    { height: 92, color: "#1a6356", width: 24 },
    { height: 66, color: "#155c47", width: 16 },
    { height: 79, color: "#0a2e22", width: 19 },
  ],
  [
    { height: 85, color: "#1e7060", width: 21 },
    { height: 68, color: "#0e4a38", width: 16 },
    { height: 92, color: "#22806B", width: 23 },
    { height: 74, color: "#0b3528", width: 18 },
    { height: 60, color: "#FACB4B", width: 14 }, /* amarillo full */
    { height: 88, color: "#0a2e22", width: 24 },
    { height: 72, color: "#155c47", width: 17 },
    { height: 56, color: "#1a6356", width: 13 },
    { height: 82, color: "#0d4030", width: 20 },
    { height: 77, color: "#195e4c", width: 19 },
    { height: 63, color: "#22806B", width: 15 },
    { height: 90, color: "#0e4a38", width: 22 },
    { height: 70, color: "#1e7060", width: 17 },
    { height: 84, color: "#0b3528", width: 21 },
    { height: 58, color: "#e8b520", width: 13 }, /* amarillo */
    { height: 80, color: "#155c47", width: 20 },
    { height: 66, color: "#0d4030", width: 16 },
    { height: 87, color: "#1a6356", width: 22 },
    { height: 73, color: "#0a2e22", width: 18 },
  ],
];

/* Dust particles */
const DUST = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  size: 1 + Math.random() * 2.5,
  top: `${5 + Math.random() * 85}%`,
  left: `${5 + Math.random() * 90}%`,
  dx: `${-10 + Math.random() * 20}px`,
  dy: `${-30 - Math.random() * 50}px`,
  duration: `${8 + Math.random() * 14}s`,
  delay: `${-Math.random() * 15}s`,
  opacity: 0.3 + Math.random() * 0.7,
}));

/* ══════════════════════════════════════
   ICONS
══════════════════════════════════════ */
function UserIcon() {
  return (
    <svg viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8.5 7.5a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M2 15c0-3.314 2.91-5.5 6.5-5.5S15 11.686 15 15" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3.5" y="7.5" width="10" height="7" rx="1.5" />
      <path d="M5.5 7.5V5.5a3 3 0 016 0v2" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 8.5S3.8 3 8.5 3 16 8.5 16 8.5 13.2 14 8.5 14 1 8.5 1 8.5z" />
      <circle cx="8.5" cy="8.5" r="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2l13 13M7 6.1A3 3 0 0110.9 10M5.5 4.5C3 5.8 1 8.5 1 8.5s2.8 5.5 7.5 5.5c1.5 0 2.9-.4 4-1.1M11.8 11.9C14.2 10.5 16 8.5 16 8.5S13.2 3 8.5 3" />
    </svg>
  );
}



/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Estados para el registro con Microsoft (cuando el usuario es nuevo)
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [msAccessToken, setMsAccessToken] = useState("");
  const [newExpediente, setNewExpediente] = useState("");
  const [newRol, setNewRol] = useState("estudiante");

  const { instance, inProgress, accounts } = useMsal();
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  // Como React puede volver a ejecutar hooks, guardamos si ya lo intentamos
  const [hasProcessedMsLogin, setHasProcessedMsLogin] = useState(false);

  // Computar si es correo administrador
  const userEmail = accounts[0]?.username?.toLowerCase() || "";
  const isAdminEmail = [
    'pg21i04001@usonsonate.edu.sv',
    'rc21i04001@usonsonate.edu.sv',
    'dm18i04001@usonsonate.edu.sv'
  ].includes(userEmail);

  // Forzar el rol en base al correo
  useEffect(() => {
    if (showProfileForm) {
      if (isAdminEmail) setNewRol("administrador");
      else if (newRol === "administrador") setNewRol("estudiante");
    }
  }, [showProfileForm, isAdminEmail]);

  useEffect(() => {
    if (inProgress === "none" && accounts.length > 0 && !hasProcessedMsLogin) {
      setHasProcessedMsLogin(true);
      const account = accounts[0];
      setLoading(true);
      
      instance.acquireTokenSilent({
        scopes: ["User.Read", "profile", "email"],
        account: account
      }).then(res => {
        procesarLogin(res.accessToken);
      }).catch(err => {
        console.error(err);
        setServerError("Error al obtener credenciales de Microsoft.");
        setLoading(false);
      });
    }

    function procesarLogin(token: string) {
      authService.loginMicrosoft(token)
        .then(data => {
          authLogin(data.user, data.token);
          redirectUser(data.user.rol);
        })
        .catch(error => {
           if (error.isNewUser) {
             setMsAccessToken(token);
             setShowProfileForm(true);
           } else {
             setServerError(error.message);
           }
           setLoading(false);
        });
    }
  }, [inProgress, accounts, instance, hasProcessedMsLogin, authLogin]);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!email.trim())
      e.email = "El correo es requerido";
    else if (!/\S+@\S+\.\S+/.test(email))
      e.email = "Formato de correo inválido";
    if (!password)
      e.password = "La contraseña es requerida";
    else if (password.length < 6)
      e.password = "Mínimo 6 caracteres";
    return e;
  };

  const redirectUser = (rol: string) => {
    if (rol === 'administrador') {
      navigate('/admin/dashboard');
    } else if (rol === 'coordinador' || rol === 'supervisor') {
      navigate('/admin/dashboard');
    } else if (rol === 'docente') {
      navigate('/docente/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    
    setErrors({});
    setServerError(null);
    setLoading(true);

    try {
      // Llamada real al backend sin importar el rol gráfico que haya seleccionado
      const data = await authService.login(email, password);
      authLogin(data.user, data.token);
      redirectUser(data.user.rol);
    } catch (error: any) {
      console.error('Error en login:', error);
      setServerError(error.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      setLoading(true);
      setServerError(null);
      // Usamos redirect para evitar bloqueos de popups y desincronización
      await instance.loginRedirect(loginRequest);
    } catch (e: any) {
      console.error("Error completo de MSAL:", e);
      setServerError("Error al iniciar conexión con Microsoft: " + (e.message || "Error desconocido"));
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpediente.trim()) {
      setServerError("El expediente es obligatorio");
      return;
    }
    setServerError(null);
    setLoading(true);
    try {
       const data = await authService.registerMicrosoft(msAccessToken, newExpediente, newRol);
       authLogin(data.user, data.token);
       redirectUser(data.user.rol);
    } catch (error: any) {
       setServerError(error.message);
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="login-root">

      {/* ══ LEFT: Form panel ══ */}
      <section className="login-left">
        <div className="login-form-wrap">

          {/* Amarillo accent bar */}
          <div className="login-accent-bar" />

          <h1 className="login-heading">Acceder</h1>
          <p className="login-desc">
            Ingresa tus credenciales para acceder al sistema de laboratorios.
          </p>

          {serverError && (
            <p className="login-error-msg server-error" role="alert" style={{ textAlign: 'center', marginBottom: '15px', color: '#ff4d4f' }}>
              {serverError}
            </p>
          )}

          {showProfileForm ? (
            <form onSubmit={handleCompleteProfile} noValidate>
              <h3 className="login-welcome" style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Completar Perfil</h3>
              <p className="login-desc" style={{ marginBottom: '1.2rem' }}>
                Tu correo fue verificado con Microsoft. Por favor, completa estos datos para finalizar el registro.
              </p>

              <label className="login-field-label-top" htmlFor="login-expediente">Expediente</label>
              <div className="login-input-wrap">
                <input
                  id="login-expediente"
                  className="login-input"
                  type="text"
                  placeholder="ej. AA123456"
                  value={newExpediente}
                  onChange={e => setNewExpediente(e.target.value)}
                  required
                />
              </div>

              <label className="login-field-label-top" htmlFor="login-rol">Rol</label>
              {isAdminEmail ? (
                <div className="login-input-wrap">
                  <p className="login-input" style={{ backgroundColor: 'var(--c-surface)', cursor: 'not-allowed', display: 'flex', alignItems: 'center', opacity: 0.7 }}>
                    Administrador (Pre-aprobado)
                  </p>
                </div>
              ) : (
                <div className="login-input-wrap">
                  <select
                    id="login-rol"
                    className="login-input"
                    value={newRol}
                    onChange={e => setNewRol(e.target.value)}
                  >
                    <option value="estudiante">Estudiante</option>
                    <option value="docente">Docente</option>
                    <option value="coordinador">Coordinador</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </div>
              )}

              <button type="submit" className={`login-submit${loading ? " loading" : ""}`} disabled={loading}>
                {loading && <span className="login-spinner" />}
                {loading ? "Registrando..." : "Completar Registro"}
              </button>
              
              <button 
                type="button" 
                onClick={() => setShowProfileForm(false)} 
                className="login-submit" 
                style={{ background: 'transparent', color: 'var(--c-text-soft)', marginTop: '10px', border: '1px solid var(--c-border)' }}
              >
                Cancelar
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate>
                {/* Email */}
                <label className="login-field-label-top" htmlFor="login-email">
                  Nombre de usuario
                </label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><UserIcon /></span>
                  <input
                    id="login-email"
                    className={`login-input${errors.email ? " has-error" : ""}`}
                    type="email"
                    placeholder="correo@universidad.edu.sv"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(v => ({ ...v, email: undefined }));
                    }}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <p className="login-error-msg" role="alert">{errors.email}</p>
                )}

                {/* Password */}
                <label className="login-field-label-top" htmlFor="login-password">
                  Contraseña
                </label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><LockIcon /></span>
                  <input
                    id="login-password"
                    className={`login-input${errors.password ? " has-error" : ""}`}
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(v => ({ ...v, password: undefined }));
                    }}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPwd(v => !v)}
                    aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {errors.password && (
                  <p className="login-error-msg" role="alert">{errors.password}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  className={`login-submit${loading ? " loading" : ""}`}
                  disabled={loading}
                >
                  {loading && <span className="login-spinner" />}
                  {loading ? "Verificando..." : "Acceder"}
                </button>
              </form>

              <div className="login-divider"></div>

              <div className="login-sso-section">
                <p className="login-sso-text">Identifíquese usando su cuenta en:</p>
                <button
                  type="button"
                  className="login-ms-btn"
                  onClick={handleMicrosoftLogin}
                  disabled={loading}
                >
                  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                  Microsoft
                </button>
              </div>
            </>
          )}

          <div className="login-forgot">
            <a href="#">Aviso de Cookies</a>
          </div>

          <p className="login-footer">
            ¿Problemas? <a href="mailto:soporte@uso.edu.sv">Contactar soporte</a>
          </p>
        </div>
      </section>

      {/* ══ RIGHT: Dark academia panel ══ */}
      <div className="login-right" aria-hidden="true">

        {/* Amarillo badge */}
        <div className="login-right-badge">USO · Sistema</div>

        {/* Dust particles — amarillo */}
        <div className="login-dust">
          {DUST.map(p => (
            <span
              key={p.id}
              className="login-dust-p"
              style={{
                width:  `${p.size}px`,
                height: `${p.size}px`,
                top:    p.top,
                left:   p.left,
                opacity: p.opacity,
                "--dx": p.dx,
                "--dy": p.dy,
                animationDuration: p.duration,
                animationDelay:    p.delay,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Central quote */}
        <div className="login-right-content">
          <div className="login-right-ring">
            <div className="login-right-ring-inner">
              {/* Logo hex — verde + amarillo */}
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <path d="M30 8L50 20V40L30 52L10 40V20L30 8Z"
                  stroke="rgba(250,203,75,0.45)" strokeWidth="1.2" />
                <circle cx="30" cy="30" r="8"
                  fill="rgba(34,128,107,0.15)" stroke="rgba(250,203,75,0.55)" strokeWidth="1.2" />
                <line x1="30" y1="8"  x2="30" y2="22" stroke="rgba(250,203,75,0.3)" strokeWidth="1"/>
                <line x1="30" y1="38" x2="30" y2="52" stroke="rgba(250,203,75,0.3)" strokeWidth="1"/>
                <line x1="10" y1="20" x2="22" y2="26" stroke="rgba(34,128,107,0.4)"  strokeWidth="1"/>
                <line x1="38" y1="34" x2="50" y2="40" stroke="rgba(34,128,107,0.4)"  strokeWidth="1"/>
                <line x1="50" y1="20" x2="38" y2="26" stroke="rgba(34,128,107,0.4)"  strokeWidth="1"/>
                <line x1="22" y1="34" x2="10" y2="40" stroke="rgba(34,128,107,0.4)"  strokeWidth="1"/>
              </svg>
            </div>
          </div>
          <p className="login-right-quote">
            "El conocimiento es la llave que abre todas las puertas."
          </p>
          <span className="login-right-sub">Sistema Universitario · Laboratorios</span>
        </div>

        {/* CSS Book shelves */}
        <div className="login-books">
          {SHELVES.map((shelf, si) => (
            <div className="login-shelf" key={si}>
              {shelf.map((book, bi) => (
                <div
                  key={bi}
                  className="login-book"
                  style={{
                    width:  `${book.width}px`,
                    height: `${book.height}px`,
                    background: book.color,
                    boxShadow: `inset -2px 0 4px rgba(0,0,0,0.35), inset 1px 0 2px rgba(250,203,75,0.06)`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
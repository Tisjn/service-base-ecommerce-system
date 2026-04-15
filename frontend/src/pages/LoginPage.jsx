import { useState } from "react";
import axios from "axios";
import "./LoginPage.css";

function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      const response = await axios.post("http://localhost:8080/auth/login", {
        name: name,
        password: password,
      });
      console.log(name, password);

      const token = response.data.token;

      // ✅ lưu token
      localStorage.setItem("token", token);

      alert("Login thành công!");
      console.log("Token:", token);
    } catch (error) {
      alert("Sai tài khoản hoặc mật khẩu!");
      console.error(error);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-label="Login card">
        <div className="login-card__panel">
          <div className="login-card__header">
            <p className="login-card__eyebrow">Secure access</p>
            <h1 className="login-card__title">Welcome Back</h1>
            <p className="login-card__subtitle">
              Secure access to your architectural concierge dashboard.
            </p>
          </div>

          <form className="login-form" onSubmit={(e) => e.preventDefault()}>
            <div className="login-form__group">
              <label htmlFor="username">Email address</label>
              <input
                id="username"
                type="text"
                placeholder="name@company.com"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="login-form__group">
              <label htmlFor="password">Password</label>
              <div className="login-form__password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="login-form__row">
              <label className="login-form__checkbox">
                <input type="checkbox" /> Keep me signed in
              </label>
              <a className="login-form__link" href="#">
                Forgot password?
              </a>
            </div>

            <button className="login-button" onClick={handleLogin}>
              Sign In →
            </button>

            <div className="login-divider">
              <span className="login-divider__line"></span>
              <span className="login-divider__text">Or continue with</span>
              <span className="login-divider__line"></span>
            </div>

            <div className="social-login">
              <button type="button" className="social-button">
                <span>G</span>
                Google
              </button>
              <button type="button" className="social-button">
                <span></span>
                Apple
              </button>
            </div>
          </form>
        </div>

        <div className="login-card__footer">
          <span>By signing in, you agree to our Terms and Privacy Policy.</span>
          <a href="#">Create Account</a>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;

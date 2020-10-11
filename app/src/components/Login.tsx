import axios from "axios";
import React from "react";

const Login = () => {
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [error, setError] = React.useState<string>();

    const handleLogin = async () => {
        const payload = {username: email, password};
        try {
            await axios.post('http://localhost:8000/user/login', payload);
        } catch(err) {
            setError('login failed, try again');
        }
    }

  return (
    <div>
      <h1>Login to Aspecto Demo App</h1>
      <div>
        <label>Email:</label>
        <input
          type="text"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="text"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
        />
      </div>
      <button type="submit" onClick={handleLogin}>Login</button>
      <br />
      { error && <p>{error}</p>}
    </div>
  );
};

export default Login;

import axios from "axios";
import React, { useContext } from "react";
import { Button, Input, InputLabel, Typography } from "@material-ui/core";
import { User } from '../context/UserContext';

interface Props {
  setUser: (user: User) => void;
}

const Login: React.FC<Props> = ({setUser}) => {
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [error, setError] = React.useState<string>();

  const handleLogin = async () => {
    const payload = { username: email, password };
    try {
      const res = await axios.post("http://localhost:8000/user/login", payload);
      setUser({
        token: res.data.token,
      });
    } catch (err) {
      setError("login failed, try again");
    }
  };

  return (
    <div>
      <h1>Login to Aspecto Demo App</h1>
      <div>
        <InputLabel>Email:</InputLabel>
        <Input
          type="text"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
        />
      </div>
      <div>
        <InputLabel>Password:</InputLabel>
        <Input
          type="text"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
        />
      </div>
      <Button type="submit" onClick={handleLogin}>
        Login
      </Button>
      <br />
      {error && <p>{error}</p>}
    </div>
  );
};

export default Login;

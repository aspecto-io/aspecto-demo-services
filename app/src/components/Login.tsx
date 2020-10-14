import axios from "axios";
import React from "react";
import {
  Avatar,
  Button,
  Container,
  makeStyles,
  TextField,
  Typography,
} from "@material-ui/core";
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import { User } from "../context/UserContext";

interface Props {
  setUser: (user: User) => void;
}

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
  },
  demoHint: {
    color: "#aaaaaa",
    fontSize: "0.75rem",
  },
  form: {
    width: '100%',
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

const Login: React.FC<Props> = ({ setUser }) => {
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [error, setError] = React.useState<string>();

  const classes = useStyles();

  const handleLogin = async (event: any) => {
    event.preventDefault();
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
    <Container component="main" maxWidth="xs">
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" color="primary">
          Sign in
        </Typography>
        <form noValidate className={classes.form} onSubmit={handleLogin}>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
          <Typography className={classes.demoHint}>
            Demo default email is "wikipedia-demo@aspecto.io"
          </Typography>
          <TextField
            variant="outlined"
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            id="password"
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
          <Typography className={classes.demoHint}>
            Demo default password is "Aspecto123"
          </Typography>
          <Button
            type="submit"
            className={classes.submit}
            fullWidth
            variant="contained"
            color="primary"
          >
            Sign In
          </Button>

          {error && <Typography>{error}</Typography>}
        </form>
      </div>
    </Container>
  );
};

export default Login;

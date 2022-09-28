import React, { useState } from "react";
import Login from "./components/Login";
import Main from "./components/Main";
import UserContext, { User } from "./context/UserContext";
import CssBaseline from '@material-ui/core/CssBaseline';


function App() {
  const [user, setUser] = useState<User>({});

  return (
    <div className="App">
      <CssBaseline />
      <UserContext.Provider value={user}>
        {user.token ? <Main /> : <Login setUser={setUser} />}
      </UserContext.Provider>
    </div>
  );
}

export default App;

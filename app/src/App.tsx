import React, { useContext, useState } from "react";
import "./App.css";
import Login from "./components/Login";
import Scraper from "./components/Scraper";
import SearchResults from "./components/SearchResults";
import UserContext, {User} from "./context/UserContext";

function App() {
  const [user, setUser] = useState<User>({});

  return (
    <div className="App">
      <header className="App-header">
        <h1>Aspecto Demo Application</h1>
      </header>
      <UserContext.Provider value={user}>
        <main>
          {!user.token && <Login setUser={setUser} />}
          {user.token && <Scraper />}
          {/* <SearchResults /> */}
        </main>
      </UserContext.Provider>
    </div>
  );
}

export default App;

import React from "react";
import "./App.css";
import Login from "./components/Login";
import Scraper from "./components/Scraper";
import SearchResults from "./components/SearchResults";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Aspecto Demo Application</h1>
      </header>
      <main>
        <Login />
        <Scraper />
        <SearchResults />
      </main>
    </div>
  );
}

export default App;

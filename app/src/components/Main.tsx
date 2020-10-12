import { AppBar, Toolbar, Typography } from "@material-ui/core";
import React from "react";
import Scraper from "./Scraper";

const Main = () => {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography noWrap>Aspecto Demo Application</Typography>{" "}
        </Toolbar>
      </AppBar>
      <Scraper />
    </>
  );
};

export default Main;

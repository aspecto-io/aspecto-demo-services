import {
  AppBar,
  Drawer,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  makeStyles,
  Toolbar,
  Typography,
} from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import SearchIcon from "@material-ui/icons/Search";
import MenuBook from "@material-ui/icons/MenuBook";
import React, { useState } from "react";
import Scraper from "./Scraper";
import SearchResults from "./SearchResults";

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
    },
    content: {
        flexGrow: 1,
        height: '100vh',
        overflow: 'auto',
        paddingTop: theme.spacing(4),
        paddingBottom: theme.spacing(4),
    }
}));

const Main = () => {
    const classes = useStyles();
  const [openPage, setOpenPage] = useState<string>("search");

  return (
    <div className={classes.root}>
      {/* <AppBar position="">
        <Toolbar>
          <IconButton color="inherit" aria-label="open drawer">
            <MenuIcon />
          </IconButton>
          <Typography noWrap>Aspecto Demo Application</Typography>{" "}
        </Toolbar>
      </AppBar> */}
      <Drawer variant="permanent" open style={{ width: 200 }}>
        <ListItem button onClick={() => setOpenPage("search")}>
          <ListItemIcon>
            <SearchIcon />
          </ListItemIcon>
          <ListItemText primary="Search" />
        </ListItem>
        <ListItem button onClick={() => setOpenPage("articles")}>
          <ListItemIcon>
            <MenuBook />
          </ListItemIcon>
          <ListItemText primary="Articles" />
        </ListItem>
      </Drawer>
      <main className={classes.content}>
        {openPage === "search" && <Scraper />}
        {openPage === "articles" && <SearchResults />}
      </main>
    </div>
  );
};

export default Main;

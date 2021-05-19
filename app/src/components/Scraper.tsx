import React, { useContext } from "react";
import axios from "axios";
import UserContext from "../context/UserContext";
import {
  Button,
  Container,
  TextField,
  Typography,
} from "@material-ui/core";

const Scraper = () => {
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [actionResult, setActionResult] = React.useState<string | undefined>();
  const user = useContext(UserContext);

  const startScraping = async (event: any) => {
    event.preventDefault();
    axios
      .post(`http://localhost:8001/${searchTerm}?token=${user.token}`)
      .then(() => {
          setSearchTerm("");
          setActionResult(`Successfully started scraping wikipedia for term "${searchTerm}"`);
        })
      .catch((err) => {
          setActionResult(err.message);
      });
  };

  return (
    <Container maxWidth="xs">
      <Typography variant="h4"> Search Wikipedia </Typography>
      <Typography>
        Add a search term on wikipedia articles. <br /> 
        Results will be fetched from wikipedia and visible in the "Articles" page
      </Typography>
      <form onSubmit={startScraping}>
        <TextField
          variant="outlined"
          margin="normal"
          required
          fullWidth
          id="searchTerm"
          label="Search Term"
          name="search term"
          autoComplete="search term"
          autoFocus
          onChange={(e) => setSearchTerm(e.target.value)}
          value={searchTerm}
        />
        <Button type="submit" variant="contained" color="primary">
          Start Scraping
        </Button>
      </form>
      {actionResult && <Typography>{actionResult}</Typography>}
    </Container>
  );
};

export default Scraper;

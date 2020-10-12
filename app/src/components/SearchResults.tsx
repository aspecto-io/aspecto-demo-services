import React from "react";
import axios from "axios";
import { Container, Grid, List, ListItem, Typography } from "@material-ui/core";

interface Article {
  id: string;
  title: string;
}

const SearchResults = () => {
  const [articles, setArticles] = React.useState<Article[] | undefined>();
  const [selectedArticle, setSelectedArticle] = React.useState<Article>();
  const [selectedArticleId, setSelectedArticleId] = React.useState<string>();

  React.useEffect(() => {
    try {
      axios
        .get("http://localhost:8002/article?token=123456")
        .then((res) => {
          setArticles(
            res.data.map((article: any) => ({
              id: article["_id"],
              title: article.title,
            }))
          );
        })
        .catch((err) => {
          console.log(err);
        });
    } catch (err) {
      console.log(err);
    }
  }, []);

  React.useEffect(() => {
    setSelectedArticle(undefined);
    if(!selectedArticleId) return;
    axios
      .get(`http://localhost:8002/article/${selectedArticleId}?token=123456`)
      .then((res) => {
        setSelectedArticle({
          id: res.data._id,
          title: res.data.title,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }, [selectedArticleId]);

  return (
    <Grid container>
      <Grid item xs={6}>
        <Typography variant="h3">Articles</Typography>
        {articles === undefined ? (
          <p>loading...</p>
        ) : (
          <div>
            <Typography>Total articles: {articles.length}</Typography>
            <List dense>
              {articles.map((article) => (
                <ListItem
                  key={article.id}
                  button
                  onClick={() => setSelectedArticleId(article.id)}
                >
                  {article.title}
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </Grid>
      {selectedArticle && (
        <Grid item xs={6}>
          {console.log(selectedArticle)}          
          <Typography variant="h4">{selectedArticle.title}</Typography>
          Id: {selectedArticle.id}
        </Grid>
      )}
    </Grid>
  );
};

export default SearchResults;

import React from "react";
import axios from "axios";
import { List, ListItem, Typography } from "@material-ui/core";

interface Article {
  id: string;
  title: string;
}

const SearchResults = () => {
  const [articles, setArticles] = React.useState<Article[] | undefined>();

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

  return (
    <div>
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
                onClick={() => console.log(article.id)}
              >
                {article.title}
              </ListItem>
            ))}
          </List>
        </div>
      )}
    </div>
  );
};

export default SearchResults;

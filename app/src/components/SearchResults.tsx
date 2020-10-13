import React, { useContext } from "react";
import axios from "axios";
import {
  Grid,
  Link,
  List,
  ListItem,
  makeStyles,
  Typography,
} from "@material-ui/core";
import { Rating } from "@material-ui/lab";
import UserContext, { User } from "../context/UserContext";

interface Article {
  id: string;
  title: string;
  pageId: number;
  rating?: number;
}

const useStyles = makeStyles((theme) => ({
  section: {
    height: "100%",
  },
}));

const fetchSelectedArticle = (
  token: string,
  selectedArticleId: string | undefined,
  setSelectedArticle: (article: Article | undefined) => void
) => {
  setSelectedArticle(undefined);
  if (!selectedArticleId) return;
  axios
    .get(`http://localhost:8002/article/${selectedArticleId}?token=${token}`)
    .then((res) => {
      setSelectedArticle({
        id: res.data._id,
        title: res.data.title,
        pageId: res.data.pageId,
        rating: res.data.rating,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

const SearchResults = () => {
  const classes = useStyles();

  const user: User = useContext(UserContext);
  const [articles, setArticles] = React.useState<Article[] | undefined>();
  const [selectedArticle, setSelectedArticle] = React.useState<Article>();
  const [selectedArticleId, setSelectedArticleId] = React.useState<string>();

  React.useEffect(() => {
    try {
      axios
        .get(`http://localhost:8002/article?token=${user.token}`)
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
  }, [user.token]);

  React.useEffect(
    () => fetchSelectedArticle(user.token!, selectedArticleId, setSelectedArticle),
    [selectedArticleId, user.token]
  ); 

  const setRatingForArticle = (articleId: string, newRating: number | null) => {
    axios
      .post(`http://localhost:8002/article/${articleId}/rating?token=123456`, {
        rating: newRating,
      })
      .then((res) => {
        console.log("rating set successfully");
        fetchSelectedArticle(user.token!, selectedArticleId, setSelectedArticle);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <Grid container style={{ height: "100%", overflow: "hidden" }}>
      <Grid
        item
        xs={6}
        className={classes.section}
        style={{ overflowX: "hidden", overflowY: "scroll", height: "100%" }}
      >
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
          <Typography variant="h5">{selectedArticle.title}</Typography>
          <div>
            <Link
              href={`https://en.wikipedia.org/?curid=${selectedArticle.pageId}`}
              target="_blank"
            >
              View on Wikipedia
            </Link>
          </div>
          <div>
            <Typography>Set your rating for this article:</Typography>{" "}
            <Rating
              value={selectedArticle.rating}
              onChange={(event, newValue) =>
                setRatingForArticle(selectedArticle.id, newValue)
              }
            />
          </div>
        </Grid>
      )}
    </Grid>
  );
};

export default SearchResults;

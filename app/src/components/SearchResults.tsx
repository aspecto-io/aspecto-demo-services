import React from "react";
import axios from "axios";

interface Article {
    id: string;
    title: string;
}

const SearchResults = () => {
  const [articles, setArticles] = React.useState<Article[]>();

  React.useEffect(() => {
      try {
      axios
        .get("http://localhost:8002/article?token=123456")
        .then((res) => {
            setArticles(res.data.map( (article: any) => ({id: article['_id'], title: article.title})))
        })
        .catch(err => {
            console.log(err);
        });
    } catch (err) {
      console.log(err);
    }
  }, []);

  return (
    <div>
        {articles === undefined ? <p>loading...</p> : <ul>{articles.map(article => <li key={article.id}>{article.title}</li>)}</ul>}
        
    </div>
  );
};

export default SearchResults;

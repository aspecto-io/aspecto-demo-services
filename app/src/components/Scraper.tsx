import React, { useContext } from 'react';
import axios from 'axios';
import UserContext from '../context/UserContext';

const Scraper = () => {

    const [searchTerm, setSearchTerm] = React.useState<string>("");
    const user = useContext(UserContext);

    const startScraping = async () => {

        try {
            await axios.post(`http://localhost:8001/poll/${searchTerm}?token=${user.token}`);
        } catch(err) {
            console.log(err);
        }
    }

    return (
        <div>
            <div>
                <p>Use this form to initiate scraping on wikipedia. </p>
            <label>Search Term:</label><input type="text" value={searchTerm} onChange={ (e) => setSearchTerm(e.target.value)} />

            </div>
            <button onClick={startScraping}>Start Scraping</button>
        </div>
    )
}

export default Scraper;
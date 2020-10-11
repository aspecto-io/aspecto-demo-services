import React from 'react';
import axios from 'axios';

const Scraper = () => {

    const [searchTerm, setSearchTerm] = React.useState<string>("");

    const startScraping = async () => {

        try {
            await axios.post(`http://localhost:8001/poll/${searchTerm}?token=123456`);
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
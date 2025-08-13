import fs from 'fs';
import path from 'path';
import https from 'https';

/** 
 * fetchDataset
 * Fetches a dataset from the Hugging Face API using the provided token.
 * @param {string} token - The Hugging Face API token for authorization.
 * @param {string} dataset - The dataset name (e.g., "lmsys/lmsys-chat-1m").
 * @param {string} config - The dataset configuration (e.g., "default").
 * @param {string} split - The dataset split (e.g., "train").
 * @param {number} offset - The starting offset for rows.
 * @param {number} length - The number of rows to fetch.
 * @return {Promise<object>} - The fetched dataset rows as a JSON object.
 **/
async function fetchDataset(token, dataset, config, split, offset, length) {
    const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=${encodeURIComponent(config)}&split=${encodeURIComponent(split)}&offset=${offset}&length=${length}`;

    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };

        https.get(url, options, (res) => {
            let data = '';

            // Collect data chunks
            res.on('data', (chunk) => {
                data += chunk;
            });

            // Resolve the promise when the response ends
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    if (parsedData.error) {
                        reject(new Error(parsedData.error));
                    } else {
                        resolve(parsedData);
                    }
                } catch (error) {
                    reject(new Error('Failed to parse JSON response'));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/** 
 * downloadDataset
 * Downloads the dataset in chunks and saves it to the data folder.
 **/
async function downloadDataset() {
    const HF_TOKEN = process.env.HF_TOKEN;
    const DATASET = "lmsys/lmsys-chat-1m";
    const CONFIG = "default";
    const SPLIT = "train";
    const CHUNK_SIZE = 100; // Number of rows to fetch per request
    const TOTAL_ROWS = 10000; // Total number of rows to fetch
    const OUTPUT_DIR = path.resolve("data/lmsys-chat-1m");

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    for (let offset = 9099; offset < TOTAL_ROWS; offset += CHUNK_SIZE) {
        try {
            console.log(`Fetching rows ${offset} to ${offset + CHUNK_SIZE - 1}...`);
            const data = await fetchDataset(HF_TOKEN, DATASET, CONFIG, SPLIT, offset, CHUNK_SIZE);

            // Save the fetched data to a file
            const filePath = path.join(OUTPUT_DIR, `rows_${offset}_${offset + CHUNK_SIZE - 1}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Saved rows ${offset} to ${offset + CHUNK_SIZE - 1} to ${filePath}`);
        } catch (error) {
            console.error(`Error fetching rows ${offset} to ${offset + CHUNK_SIZE - 1}:`, error.message);
        }
    }

    console.log("Download complete");
}

downloadDataset().catch(console.error);
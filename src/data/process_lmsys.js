import path from 'path';
import fs from 'fs';
import parquet from 'parquetjs-lite';
import stringify from 'csv-stringify';

async function process() {
    const dir = path.resolve("data/lmsys-chat-1m");
    const out = fs.createWriteStream("data/lmsys.csv");
    const csv = stringify({ header: true, columns: ["prompt", "response"] });

    csv.pipe(out);
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".parquet"));

    for (const file of files) {
        console.log("Reading", file);
        const reader = await parquet.ParquetReader.openFile(path.join(dir, file));
        const cursor = reader.getCursor();
        let record;
        while ((record = await cursor.next())) {
            // Assuming each record has conversation in JSON: list of messages
            const msgs = JSON.parse(record.conversation);
            const userPrompt = msgs.find(m => m.role === "user")?.content;
            const assistantResp = msgs.find(m => m.role === "assistant")?.content;
            if (userPrompt && assistantResp) {
                csv.write({ prompt: userPrompt.trim(), response: assistantResp.trim() });
            }
        }
        await reader.close();
    }

    csv.end();
    console.log("Processed & saved to data/lmsys.csv");
}

process().catch(console.error);

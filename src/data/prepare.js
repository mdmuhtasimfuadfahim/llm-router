import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify';

function analyzeComplexity(text) {
    const content = (text || "").toLowerCase();
    const length = content.length;

    const technicalTerms = [
        'algorithm', 'optimization', 'complexity', 'big-o', 'data structure',
        'machine learning', 'neural network', 'database', 'sql', 'programming',
        'code', 'function', 'class', 'bug', 'debug', 'api', 'framework',
        'architecture', 'design pattern', 'scalability', 'performance',
        'security', 'encryption', 'blockchain', 'cryptocurrency', 'ai',
        'deep learning', 'tensorflow', 'pytorch', 'javascript', 'python',
        'java', 'c++', 'react', 'node', 'docker', 'kubernetes', 'aws',
        'cloud', 'microservices', 'devops', 'ci/cd', 'git', 'version control'
    ];

    const reasoningTerms = [
        'explain', 'analyze', 'compare', 'evaluate', 'prove', 'derive',
        'step-by-step', 'reasoning', 'logic', 'theorem', 'mathematical',
        'formula', 'equation', 'calculate', 'solve', 'optimize'
    ];

    const creativeTerms = [
        'creative', 'story', 'poem', 'write', 'generate', 'brainstorm',
        'imagine', 'design', 'create', 'compose', 'draft', 'essay'
    ];

    const advancedTerms = [
        'distributed systems', 'consensus algorithm', 'byzantine fault',
        'microservices architecture', 'event sourcing', 'cqrs', 'cap theorem',
        'compiler', 'garbage collector', 'memory fragmentation', 'neural network from scratch',
        'backpropagation', 'vanishing gradients', 'mapreduce', 'fault tolerance',
        'blockchain consensus', 'scalability trilemma', 'lambda calculus',
        'type inference', 'generational collection'
    ];

    let technicalScore = 0;
    let reasoningScore = 0;
    let creativeScore = 0;
    let advancedScore = 0;

    technicalTerms.forEach(term => {
        if (content.includes(term)) technicalScore++;
    });

    reasoningTerms.forEach(term => {
        if (content.includes(term)) reasoningScore++;
    });

    creativeTerms.forEach(term => {
        if (content.includes(term)) creativeScore++;
    });

    advancedTerms.forEach(term => {
        if (content.includes(term)) advancedScore += 2;
    });

    let lengthScore = 0;
    if (length > 800) lengthScore = 3;
    else if (length > 400) lengthScore = 2;
    else if (length > 150) lengthScore = 1;

    const questionWords = ['how', 'why', 'what', 'when', 'where', 'which'];
    const hasQuestion = questionWords.some(word => content.includes(word));
    const multipleQuestions = (content.match(/\?/g) || []).length > 1;

    const complexWords = ['implement', 'design', 'build', 'create', 'develop', 'optimize'];
    const hasComplexAction = complexWords.some(word => content.includes(word));

    let totalScore = technicalScore * 1.5 + reasoningScore * 1.2 + creativeScore * 0.8 + advancedScore * 2 + lengthScore;

    if (multipleQuestions) totalScore += 1.5;
    if (hasComplexAction) totalScore += 1;
    if (!hasQuestion && length < 30) totalScore = Math.max(0, totalScore - 2);

    if (totalScore >= 6) return 2;
    if (totalScore >= 3) return 1;
    return 0;
}

async function processLMSYSData() {
    const dataDir = path.resolve("./data/lmsys-chat-1m");
    const outputPath = "./data/training_data.csv";

    if (!fs.existsSync(dataDir)) {
        console.error("LMSYS data directory not found:", dataDir);
        return;
    }

    if (!fs.existsSync("./data")) {
        fs.mkdirSync("./data", { recursive: true });
    }

    const csvOutput = fs.createWriteStream(outputPath);
    const csvStringify = stringify({ header: true, columns: ["text", "label"] });
    csvStringify.pipe(csvOutput);

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    console.log(`Processing ${files.length} files...`);

    let processedCount = 0;
    let labelCounts = { 0: 0, 1: 0, 2: 0 };

    for (const file of files) {
        console.log(`Processing ${file}...`);

        try {
            const filePath = path.join(dataDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');

            if (!fileContent.trim()) {
                console.log(`Skipping empty file: ${file}`);
                continue;
            }

            const data = JSON.parse(fileContent);

            if (data.rows && Array.isArray(data.rows)) {
                for (const row of data.rows) {
                    if (row.row && row.row.conversation) {
                        try {
                            let conversation;

                            if (typeof row.row.conversation === 'string') {
                                conversation = JSON.parse(row.row.conversation);
                            } else if (Array.isArray(row.row.conversation)) {
                                conversation = row.row.conversation;
                            } else {
                                continue;
                            }

                            if (!Array.isArray(conversation)) continue;

                            const userMessages = conversation.filter(msg =>
                                msg && msg.role === 'user' && msg.content && typeof msg.content === 'string'
                            );

                            for (const userMsg of userMessages) {
                                const content = userMsg.content.trim();
                                if (content.length > 10 && content.length < 2000) {
                                    const label = analyzeComplexity(content);
                                    labelCounts[label]++;

                                    const cleanedText = content
                                        .replace(/\n/g, ' ')
                                        .replace(/\r/g, ' ')
                                        .replace(/"/g, '""')
                                        .replace(/\s+/g, ' ')
                                        .trim();

                                    csvStringify.write({
                                        text: cleanedText,
                                        label: label
                                    });
                                    processedCount++;

                                    if (processedCount % 1000 === 0) {
                                        console.log(`Processed ${processedCount} samples... Labels: 0:${labelCounts[0]}, 1:${labelCounts[1]}, 2:${labelCounts[2]}`);
                                    }
                                }
                            }
                        } catch (parseError) {
                            continue;
                        }
                    }
                }
            } else {
                console.log(`No valid rows found in ${file}`);
            }
        } catch (fileError) {
            console.error(`Error processing ${file}:`, fileError.message);
            continue;
        }
    }

    csvStringify.end();

    return new Promise((resolve) => {
        csvOutput.on('finish', () => {
            console.log(`Processing complete! Generated ${processedCount} training samples in ${outputPath}`);
            console.log(`Label distribution - Simple (0): ${labelCounts[0]}, Medium (1): ${labelCounts[1]}, Hard (2): ${labelCounts[2]}`);
            resolve(processedCount);
        });
    });
}

processLMSYSData().catch(console.error);
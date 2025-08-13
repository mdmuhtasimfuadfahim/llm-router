# Node LLM Router (AWS-friendly)

A minimal Node.js implementation of a **cost-aware LLM router** with Redis caching and an optional TF.js classifier. 
Designed to sit behind API Gateway/Lambda or run directly on ECS/EKS.

## Features
- Routes easy prompts to a **cheap** model (default: `gpt-3.5-turbo`) and complex ones to a **strong** model (`gpt-4o`).
- **Redis/Valkey cache** for responses (fallback: in-memory).
- **Cost estimator** based on a simple token counter + configurable price table.
- **TF.js classifier** you can train on CSV (`text,label`) and hot-load in the server.
- Dataset prep scaffold.

## Quickstart

```bash
cd node-llm-router
npm install
npm run prepare:data          # writes data/sample.csv
npm run train data/sample.csv # trains a tiny classifier and saves ./model
npm run dev                   # starts server on :8080
curl -X POST :8080/chat -H 'content-type: application/json' -d '{"prompt":"Explain Big-O of quicksort"}'
```

### Configure
Edit `.env`:
```
OPENAI_API_KEY=...
REDIS_URL=redis://localhost:6379  # or ElastiCache endpoint
LOW_MODEL=gpt-3.5-turbo
HIGH_MODEL=gpt-4o
CACHE_TTL_SECONDS=3600
PRICES_JSON={"gpt-3.5-turbo":{"in":0.0005,"out":0.0015},"gpt-4o":{"in":0.005,"out":0.015}}
```

## Datasets
Transform public chat datasets (e.g., LMSYS Arena, ShareGPT, LMSYS-Chat-1M) into `text,label` where `label ∈ {0,1}` (0=simple,1=complex).
Use `src/data/prepare.js` as a template to build your converter.
Train the router via TF.js: `npm run train path/to/your.csv`.

## AWS Notes
- **Serving**: run `src/server.js` on Lambda (via `@vendia/serverless-express`) or as a container on ECS/EKS.
- **Caching**: use **Amazon ElastiCache Serverless (Redis/Valkey)** for managed cache.
- **GPU lane**: if you add an OSS model served via vLLM on EKS, point a third lane in `server.js` at your internal endpoint.
- **Training**: route classifier training to **SageMaker** with Spot + S3 checkpoints (separate job).
- **Autoscaling**: for EKS, use **Karpenter** for GPU Spot provisioning; add HPA on latency/QPS.

## File structure
```
src/
  server.js           # Express API + router
  cache.js            # Redis + memory fallback
  cost.js             # token-based cost estimate
  classifier/
    train.js          # TF.js training (CSV -> model/)
    infer.js          # runtime classify (model or heuristic)
  data/
    prepare.js        # dataset prep scaffold (writes data/sample.csv)
data/
  sample.csv
model/                # created after you run npm run train
```

## License
MIT
